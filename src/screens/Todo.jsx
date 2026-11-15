import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PAPER, FONT, TYPE, RADIUS, SPACE } from "../tokens.js";
import {
  listGoals, readLog, appendLog, deleteLogEvent,
  listTasks, addTask, setTaskDone, reorderTasks, carryTask, listTaskLog,
} from "../data/store.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO, addDaysLocalISO } from "../lib/date.js";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function humanDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const isToday = iso === todayLocalISO();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function Todo() {
  const { date: paramDate } = useParams();
  const navigate = useNavigate();
  const date = (paramDate && ISO_RE.test(paramDate)) ? paramDate : todayLocalISO();
  const isToday = date === todayLocalISO();
  const isPast = date < todayLocalISO();

  const [goals, setGoals] = useState([]);
  const [markedGoalIds, setMarkedGoalIds] = useState(new Set());
  const [tasks, setTasks] = useState([]);
  const [taskLog, setTaskLog] = useState([]);
  const [carryTasks, setCarryTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [doneOpen, setDoneOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // drag state
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [gs, log, ts, tl] = await Promise.all([
      listGoals(),
      readLog(date).catch(() => null),
      listTasks(date).catch(() => []),
      listTaskLog(date).catch(() => []),
    ]);
    setGoals(gs.filter((g) => g.state === "active"));
    setMarkedGoalIds(new Set(
      (log?.events || []).map((e) => e.goalId)
    ));
    setTasks(ts);
    setTaskLog(tl);

    // carry-forward: undone tasks from yesterday, only when viewing today
    if (isToday) {
      const yesterday = addDaysLocalISO(date, -1);
      const ylog = await listTasks(yesterday).catch(() => []);
      setCarryTasks(ylog.filter((t) => !t.done && !t.carriedFrom));
    } else {
      setCarryTasks([]);
    }
    setLoading(false);
  }, [date, isToday]);

  useEffect(() => { load(); }, [load]);

  function navDate(delta) {
    const next = addDaysLocalISO(date, delta);
    navigate(`/todo/${next}`);
  }

  async function toggleGoal(goal) {
    const isMarked = markedGoalIds.has(goal.id);
    setBusy(true);
    try {
      if (isMarked) {
        await deleteLogEvent(date, { verb: "tap", goalId: goal.id, payload: "" });
        setMarkedGoalIds((prev) => { const s = new Set(prev); s.delete(goal.id); return s; });
      } else {
        await appendLog(date, { verb: "tap", goalId: goal.id, payload: "" });
        setMarkedGoalIds((prev) => new Set([...prev, goal.id]));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    const title = taskInput.trim();
    if (!title) return;
    setTaskInput("");
    const task = await addTask(date, title).catch(() => null);
    if (task) setTasks((prev) => [...prev, task]);
  }

  async function toggleTask(task) {
    const updated = await setTaskDone(task.id, !task.done).catch(() => null);
    if (!updated) return;
    if (updated.done) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setTaskLog((prev) => [...prev, updated]);
    } else {
      setTaskLog((prev) => prev.filter((t) => t.id !== task.id));
      setTasks((prev) => [...prev, updated].sort((a, b) => a.order - b.order));
    }
  }

  async function handleCarry(task) {
    const carried = await carryTask(task.id, date).catch(() => null);
    setCarryTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (carried) setTasks((prev) => [...prev, carried]);
  }

  function dismissCarry(id) {
    setCarryTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // drag-to-reorder
  function onDragStart(i) { dragItem.current = i; }
  function onDragEnter(i) { dragOver.current = i; }
  async function onDragEnd() {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null; dragOver.current = null; return;
    }
    const reordered = [...tasks];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, moved);
    dragItem.current = null; dragOver.current = null;
    setTasks(reordered);
    await reorderTasks(date, reordered.map((t) => t.id)).catch(() => {});
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: PAPER.faint, marginTop: 60, fontFamily: FONT.sans, fontSize: TYPE.body }}>Loading…</p>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => !t.done);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* Date switcher */}
        <div style={switcherRow}>
          <button onClick={() => navDate(-1)} style={navBtn} aria-label="Previous day">‹</button>
          <span style={dateLabel}>{humanDate(date)}</span>
          <button onClick={() => navDate(1)} style={navBtn} aria-label="Next day">›</button>
          {!isToday && (
            <button onClick={() => navigate("/todo")} style={todayBtn}>Today</button>
          )}
        </div>

        {/* Carry-forward banner */}
        {carryTasks.length > 0 && (
          <div style={carryBanner}>
            <div style={{ fontSize: 10, color: PAPER.dim, fontFamily: FONT.sans, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              From yesterday
            </div>
            {carryTasks.map((t) => (
              <div key={t.id} style={carryRow}>
                <span style={{ flex: 1, fontSize: TYPE.body, color: PAPER.dim, fontFamily: FONT.sans }}>{t.title}</span>
                <button onClick={() => handleCarry(t)} style={carryYesBtn}>Carry forward</button>
                <button onClick={() => dismissCarry(t.id)} style={carryNoBtn}>Dismiss</button>
              </div>
            ))}
          </div>
        )}

        {/* Goals section */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionKicker}>Goals for today</div>

          {goals.length === 0 ? (
            <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, marginTop: 16 }}>
              No active goals. Add one from Goals.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
              {goals.map((g) => {
                const marked = markedGoalIds.has(g.id);
                const color = goalColor(g);
                return (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    color={color}
                    marked={marked}
                    disabled={busy || (isPast && !isToday && date !== todayLocalISO())}
                    onToggle={() => toggleGoal(g)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <div style={divider} />

        {/* Own tasks section */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionKicker}>Own tasks</div>

          <form onSubmit={handleAddTask} style={{ marginTop: 10, marginBottom: 14, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Add a task for today…"
              style={taskInputStyle}
            />
            <button type="submit" style={addTaskBtn} disabled={!taskInput.trim()}>Add</button>
          </form>

          {activeTasks.length === 0 && taskLog.length === 0 ? (
            <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, marginTop: 8 }}>
              Nothing on the list. Add a goal or a task, or just log something in the journal.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {activeTasks.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  goals={goals}
                  onToggle={() => toggleTask(t)}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          )}
        </section>

        {/* Done section */}
        {taskLog.length > 0 && (
          <section>
            <button
              onClick={() => setDoneOpen((v) => !v)}
              style={doneToggle}
              aria-expanded={doneOpen}
            >
              <span style={sectionKickerInline}>Done on this day</span>
              <span style={{ color: PAPER.faint, fontSize: 12 }}>{taskLog.length} · {doneOpen ? "▲" : "▼"}</span>
            </button>
            {doneOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                {taskLog.map((t) => (
                  <div key={t.id} style={doneRow}>
                    <span style={checkboxDone}>✓</span>
                    <span style={{ flex: 1, fontSize: TYPE.body, color: PAPER.faint, fontFamily: FONT.sans, textDecoration: "line-through" }}>{t.title}</span>
                    {t.doneAt && (
                      <span style={{ fontSize: 11, color: PAPER.faint, fontFamily: FONT.sans }}>
                        {new Date(t.doneAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function GoalRow({ goal, color, marked, disabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px",
        background: marked ? `${color}18` : PAPER.card,
        border: `1px solid ${marked ? color + "44" : PAPER.line}`,
        borderRadius: RADIUS.r1,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: 6,
        border: `2px solid ${marked ? color : PAPER.line}`,
        background: marked ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
      }}>
        {marked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
      </span>
      <span style={{
        width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: FONT.serif, fontSize: TYPE.goalName * 0.9,
        color: marked ? PAPER.dim : PAPER.ink,
        flex: 1,
        textDecoration: marked ? "none" : "none",
      }}>
        {goal.name}
      </span>
    </button>
  );
}

function TaskRow({ task, goals, onToggle, draggable, onDragStart, onDragEnter, onDragEnd }) {
  const linkedGoal = goals.find((g) => g.id === task.goalId);
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: PAPER.card,
        border: `1px solid ${PAPER.line}`,
        borderRadius: RADIUS.r2,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <span style={{ cursor: "pointer", display: "flex", alignItems: "center" }} onClick={onToggle}>
        <span style={{
          width: 20, height: 20, borderRadius: 6,
          border: `2px solid ${PAPER.line}`,
          background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }} />
      </span>
      <span style={{ flex: 1, fontSize: TYPE.body, color: PAPER.ink, fontFamily: FONT.sans }}>
        {task.title}
      </span>
      {linkedGoal && (
        <span style={{
          fontSize: 11, color: PAPER.faint, fontFamily: FONT.sans,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: goalColor(linkedGoal) }} />
          {linkedGoal.name}
        </span>
      )}
      {task.dueTime && (
        <span style={{ fontSize: 11, color: PAPER.faint, fontFamily: FONT.sans }}>{task.dueTime}</span>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: "100vh",
  background: PAPER.bg,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  padding: "clamp(28px, 4vw, 56px) clamp(20px, 4vw, 64px) 120px",
};

const containerStyle = {
  maxWidth: 680,
  margin: "0 auto",
};

const switcherRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 32,
  marginTop: 8,
};

const navBtn = {
  background: "none",
  border: "none",
  fontSize: 22,
  color: PAPER.dim,
  cursor: "pointer",
  padding: "0 4px",
  lineHeight: 1,
  fontFamily: FONT.sans,
};

const dateLabel = {
  fontSize: 20,
  fontFamily: FONT.serif,
  fontWeight: 600,
  color: PAPER.ink,
  letterSpacing: "-0.01em",
  flex: 1,
  textAlign: "center",
};

const todayBtn = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.dim,
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.pill,
  padding: "5px 12px",
  cursor: "pointer",
};

const sectionKicker = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontWeight: 500,
  fontFamily: FONT.sans,
  marginBottom: 2,
};

const sectionKickerInline = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontWeight: 500,
  fontFamily: FONT.sans,
};

const divider = {
  height: 1,
  background: PAPER.line,
  margin: "24px 0",
};

const taskInputStyle = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  outline: "none",
};

const addTaskBtn = {
  padding: "10px 18px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  cursor: "pointer",
};

const carryBanner = {
  background: PAPER.panel,
  borderRadius: RADIUS.r1,
  padding: "14px 16px",
  marginBottom: 24,
};

const carryRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingTop: 8,
};

const carryYesBtn = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.affirmInk,
  background: PAPER.affirm,
  border: `1px solid ${PAPER.affirmLine}`,
  borderRadius: RADIUS.pill,
  padding: "5px 10px",
  cursor: "pointer",
};

const carryNoBtn = {
  fontSize: 12,
  fontFamily: FONT.sans,
  color: PAPER.faint,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "5px 4px",
};

const doneToggle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0",
  marginBottom: 2,
};

const doneRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  background: PAPER.panel,
  borderRadius: RADIUS.r2,
};

const checkboxDone = {
  width: 20,
  height: 20,
  borderRadius: 6,
  background: PAPER.line,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  color: PAPER.faint,
  flexShrink: 0,
};
