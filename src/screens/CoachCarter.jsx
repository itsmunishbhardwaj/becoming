import { useEffect, useState, useRef, useCallback } from "react";
import { PAPER, FONT, TYPE, RADIUS } from "../tokens.js";
import { listGoals, listContracts, saveContract, retireContract } from "../data/store.js";
import { getSession } from "../lib/auth.js";
import { goalColor } from "../lib/goalColor.js";
import { todayLocalISO } from "../lib/date.js";
import PageWrapper from "../components/PageWrapper.jsx";
import { StaggerList, StaggerItem } from "../components/StaggerList.jsx";
import { SkeletonBlock, SkeletonList } from "../components/Skeleton.jsx";

function longDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function shortDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function CoachCarter() {
  const [goals, setGoals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [userName, setUserName] = useState("");
  const [view, setView] = useState("main"); // "main" | "compose" | "read"
  const [composingForGoal, setComposingForGoal] = useState(null);
  const [readingContract, setReadingContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [gs, cs, session] = await Promise.all([
      listGoals(),
      listContracts(),
      getSession(),
    ]);
    const active = gs.filter((g) => g.state === "active");
    setGoals(active);
    setContracts(cs);
    if (active.length > 0) setSelectedGoalId(active[0].id);
    const meta = session?.user?.user_metadata;
    setUserName(meta?.full_name || meta?.name || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || null;
  const goalContract = selectedGoal
    ? contracts.find((c) => c.goalId === selectedGoalId && !c.retiredAt)
    : null;

  async function handleRetire(id) {
    await retireContract(id);
    setContracts((prev) => prev.map((c) => c.id === id ? { ...c, retiredAt: new Date().toISOString() } : c));
  }

  async function handleSaveContract(partial) {
    const saved = await saveContract({ ...partial, goalId: composingForGoal.id });
    setContracts((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
    setView("read");
    setReadingContract(saved);
  }

  if (loading) {
    return (
      <PageWrapper style={pageStyle}>
        <div style={containerStyle}>
          <SkeletonBlock height={48} width={280} radius={6} style={{ marginBottom: 32 }} />
          <SkeletonBlock height={12} width={60} radius={6} style={{ marginBottom: 10 }} />
          <SkeletonBlock height={44} width={220} radius={999} style={{ marginBottom: 28 }} />
          <SkeletonBlock height={12} width={120} radius={6} style={{ marginBottom: 10 }} />
          <SkeletonBlock height={80} />
          <div style={{ height: 20 }} />
          <SkeletonList count={3} rowHeight={48} gap={2} />
        </div>
      </PageWrapper>
    );
  }

  if (view === "compose" && composingForGoal) {
    return (
      <ContractComposer
        goal={composingForGoal}
        userName={userName}
        existingContract={goalContract}
        onSave={handleSaveContract}
        onCancel={() => setView("main")}
      />
    );
  }

  if (view === "read" && readingContract) {
    const goal = goals.find((g) => g.id === readingContract.goalId);
    return (
      <ContractReader
        contract={readingContract}
        goal={goal}
        userName={userName}
        onRetire={async () => {
          await handleRetire(readingContract.id);
          setView("main");
          setReadingContract(null);
        }}
        onBack={() => { setView("main"); setReadingContract(null); }}
      />
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────

  return (
    <PageWrapper style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>Coach Carter</h1>

        {/* Goal picker */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionKicker}>Goal</div>
          {goals.length === 0 ? (
            <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, marginTop: 10 }}>
              No active goals. Add one first.
            </p>
          ) : (
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              style={selectStyle}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </section>

        {/* Plan placeholder */}
        {selectedGoal && (
          <section style={{ marginBottom: 32 }}>
            <div style={sectionKicker}>Breakdown plan</div>
            <div style={planPlaceholder}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: PAPER.faint, fontFamily: FONT.sans, marginBottom: 10 }}>
                Intake → Classify → Baseline → Gap → Ramp → Ratify → Execute/Gate → Adapt
              </div>
              <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: TYPE.ambition, color: PAPER.dim, margin: 0 }}>
                Plan not built yet.
              </p>
            </div>
          </section>
        )}

        {/* Contract for selected goal */}
        {selectedGoal && (
          <section style={{ marginBottom: 40 }}>
            <div style={sectionKicker}>Contract</div>
            <div style={{ marginTop: 10 }}>
              {goalContract ? (
                <div style={contractRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: TYPE.body, color: PAPER.ink, fontFamily: FONT.sans }}>
                      {goalContract.signedAt ? "Signed contract" : "Draft contract"}
                    </div>
                    <div style={{ fontSize: TYPE.meta, color: PAPER.faint, fontFamily: FONT.sans, marginTop: 2 }}>
                      {goalContract.signedAt ? `Signed ${shortDate(goalContract.signedAt.slice(0, 10))}` : `Created ${shortDate(goalContract.createdAt.slice(0, 10))}`}
                    </div>
                  </div>
                  <button
                    onClick={() => { setReadingContract(goalContract); setView("read"); }}
                    style={viewContractBtn}
                    className="press"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleRetire(goalContract.id)}
                    style={retireBtn}
                    className="press"
                  >
                    Retire
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setComposingForGoal(selectedGoal); setView("compose"); }}
                  style={signBtn}
                  className="press"
                >
                  Sign a contract for this goal
                </button>
              )}
            </div>
          </section>
        )}

        {/* All contracts list */}
        {contracts.length > 0 && (
          <section>
            <div style={sectionKicker}>All contracts</div>
            <StaggerList style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
              {contracts.map((c) => {
                const g = goals.find((g) => g.id === c.goalId);
                const color = g ? goalColor(g) : PAPER.faint;
                const retired = !!c.retiredAt;
                return (
                  <StaggerItem key={c.id}>
                  <button
                    onClick={() => { setReadingContract(c); setView("read"); }}
                    className="press"
                    style={{ ...allContractRow, opacity: retired ? 0.45 : 1 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: TYPE.body, color: PAPER.ink, fontFamily: FONT.sans, textAlign: "left" }}>
                      {g?.name || "Unknown goal"}
                    </span>
                    <span style={{ fontSize: TYPE.meta, color: PAPER.faint, fontFamily: FONT.sans }}>
                      {retired ? "Retired · " : c.signedAt ? "Signed · " : "Draft · "}
                      {shortDate((c.signedAt || c.createdAt).slice(0, 10))}
                    </span>
                  </button>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}

// ── Contract composer ──────────────────────────────────────────────────────

function ContractComposer({ goal, userName, onSave, onCancel }) {
  const today = todayLocalISO();
  const [action, setAction] = useState("");
  const [byDate, setByDate] = useState("");
  const [terms, setTerms] = useState("");
  const [signing, setSigning] = useState(false);
  const [capturedSvg, setCapturedSvg] = useState(null);
  const [saving, setSaving] = useState(false);

  const color = goalColor(goal);
  const ambition = goal.ambition?.trim() || "";
  const commitText = `I will ${action || "___"} by ${byDate || "___"}.`;
  const canSign = action.trim() && byDate.trim();

  async function handleConfirmSign() {
    if (!capturedSvg) return;
    setSaving(true);
    try {
      await onSave({
        change: `I will ${action.trim()} by ${byDate.trim()}.`,
        terms: terms.trim(),
        signatureSvg: capturedSvg,
        signedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper style={pageStyle}>
      <div style={{ ...containerStyle, maxWidth: 640 }}>
        <button onClick={onCancel} style={backBtn} className="press">← Coach Carter</button>

        {/* Document preview */}
        <ContractDocument
          goal={goal}
          color={color}
          userName={userName}
          today={today}
          ambition={ambition}
          commitText={commitText}
          terms={terms}
          signedAt={null}
          signatureSvg={null}
          editable
          action={action}
          byDate={byDate}
          onActionChange={setAction}
          onByDateChange={setByDate}
          onTermsChange={setTerms}
        />

        {/* Sign button / Signature canvas */}
        {!signing ? (
          <button
            onClick={() => setSigning(true)}
            disabled={!canSign}
            className="press"
            style={{ ...signBtn, marginTop: 24, opacity: canSign ? 1 : 0.4 }}
          >
            Sign this contract
          </button>
        ) : (
          <div style={{ marginTop: 24 }}>
            <div style={sectionKicker}>Draw your signature</div>
            <SignatureCanvas onCapture={setCapturedSvg} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={handleConfirmSign}
                disabled={!capturedSvg || saving}
                className="press"
                style={{ ...signBtn, opacity: capturedSvg && !saving ? 1 : 0.4 }}
              >
                {saving ? "Saving…" : "Confirm signature"}
              </button>
              <button onClick={() => { setSigning(false); setCapturedSvg(null); }} style={cancelBtn} className="press">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

// ── Contract reader ────────────────────────────────────────────────────────

function ContractReader({ contract, goal, userName, onRetire, onBack }) {
  const color = goal ? goalColor(goal) : PAPER.faint;
  const ambition = goal?.ambition?.trim() || "";
  const today = todayLocalISO();

  return (
    <PageWrapper style={pageStyle}>
      <style>{`
        @media print {
          .grain, .vellum-mist, [class*="nav"], nav { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .contract-print-hide { display: none !important; }
          .contract-document-wrap {
            margin: 0 !important;
            padding: 32px 48px !important;
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            border-radius: 0 !important;
          }
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      <div style={{ ...containerStyle, maxWidth: 640 }}>
        <div className="contract-print-hide" style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <button onClick={onBack} style={backBtn} className="press">← Coach Carter</button>
          <button onClick={() => window.print()} style={printBtn} className="press">Print this contract</button>
          {!contract.retiredAt && (
            <button onClick={onRetire} style={retireBtn} className="press">Retire</button>
          )}
        </div>

        <ContractDocument
          goal={goal}
          color={color}
          userName={userName}
          today={contract.signedAt ? contract.signedAt.slice(0, 10) : today}
          ambition={ambition}
          commitText={contract.change}
          terms={contract.terms}
          signedAt={contract.signedAt}
          signatureSvg={contract.signatureSvg}
          editable={false}
        />
      </div>
    </PageWrapper>
  );
}

// ── Contract document (shared render) ─────────────────────────────────────

function ContractDocument({
  goal, color, userName, today, ambition, commitText, terms,
  signedAt, signatureSvg, editable,
  action, byDate, onActionChange, onByDateChange, onTermsChange,
}) {
  const displayName = userName || "the Undersigned";

  return (
    <div className="contract-document-wrap" style={docWrap}>
      {/* Header */}
      <div style={docHeader}>
        <div style={docBrand}>BECOMING</div>
        <div style={docHrule} />
        <div style={docTitle}>Contract of Personal Commitment</div>
        <div style={docDate}>Date of execution: {longDate(today)}</div>
      </div>

      <div style={docHrule} />

      {/* Parties */}
      <div style={docSection}>
        <p style={docBody}>
          <strong>BETWEEN:</strong>
        </p>
        <p style={docBody}>
          {displayName}, hereinafter referred to as{" "}
          <em>"the Undersigned"</em>
        </p>
        <p style={docBody}>
          <strong>AND:</strong>
        </p>
        <p style={docBody}>
          The Undersigned's future self, hereinafter referred to as{" "}
          <em>"the Intended"</em>
        </p>
      </div>

      <div style={docHrule} />

      {/* Whereas */}
      {ambition && (
        <>
          <div style={docSection}>
            <p style={docBody}>
              WHEREAS the Undersigned has declared the intention to become:
            </p>
            <blockquote style={{ ...docQuote, borderLeftColor: color }}>
              {ambition}
            </blockquote>
          </div>
          <div style={docHrule} />
        </>
      )}

      {/* Article I — Commitment */}
      <div style={docSection}>
        <div style={docArticleTitle}>Article I — The Commitment</div>
        <p style={docBody}>
          The Undersigned hereby commits to the following change:
        </p>
        {editable ? (
          <div style={commitFields}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...docBody, margin: 0, flexShrink: 0 }}>I will</span>
              <input
                type="text"
                placeholder="describe the action"
                value={action}
                onChange={(e) => onActionChange(e.target.value)}
                style={commitInput}
              />
              <span style={{ ...docBody, margin: 0, flexShrink: 0 }}>by</span>
              <input
                type="text"
                placeholder="e.g. 1 March 2027"
                value={byDate}
                onChange={(e) => onByDateChange(e.target.value)}
                style={{ ...commitInput, maxWidth: 180 }}
              />
            </div>
            <div style={{ ...docQuote, borderLeftColor: color, marginTop: 12, color: PAPER.dim }}>
              {commitText}
            </div>
          </div>
        ) : (
          <blockquote style={{ ...docQuote, borderLeftColor: color }}>
            {commitText}
          </blockquote>
        )}
      </div>

      <div style={docHrule} />

      {/* Article II — Terms */}
      <div style={docSection}>
        <div style={docArticleTitle}>Article II — The Terms</div>
        <p style={docBody}>
          The Undersigned agrees to the following terms and conditions:
        </p>
        {editable ? (
          <textarea
            placeholder="Write your terms here — what you will do, how often, what counts as keeping your word."
            value={terms}
            onChange={(e) => onTermsChange(e.target.value)}
            rows={5}
            style={termsTextarea}
          />
        ) : (
          <blockquote style={{ ...docQuote, borderLeftColor: color, whiteSpace: "pre-wrap" }}>
            {terms || "(No terms specified.)"}
          </blockquote>
        )}
      </div>

      <div style={docHrule} />

      {/* Article III — Acknowledgment */}
      <div style={docSection}>
        <div style={docArticleTitle}>Article III — Acknowledgment</div>
        <p style={docBody}>
          The Undersigned acknowledges that this commitment is made freely, without coercion,
          and with full understanding that the only party who can hold them to it is themselves.
        </p>
        <p style={docBody}>
          The Undersigned further acknowledges that failure to honour this commitment carries no
          penalty other than the knowledge that they did not do what they said they would do.
        </p>
      </div>

      <div style={docHrule} />

      {/* Signature block */}
      <div style={docSection}>
        <p style={docBody}>
          IN WITNESS WHEREOF, the Undersigned has executed this Contract of Personal
          Commitment on the date first written above.
        </p>

        <div style={{ marginTop: 24 }}>
          {signatureSvg ? (
            <div style={{ marginBottom: 4 }}>
              <img
                src={`data:image/svg+xml;base64,${btoa(signatureSvg)}`}
                alt="Signature"
                style={{ width: "100%", maxWidth: 360, height: 90, objectFit: "contain", display: "block" }}
              />
            </div>
          ) : (
            <div style={sigLine} />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <span style={{ ...docBody, margin: 0, fontSize: 12 }}>
              <strong>Print name:</strong> {displayName}
            </span>
            <span style={{ ...docBody, margin: 0, fontSize: 12 }}>
              <strong>Date:</strong> {signedAt ? longDate(signedAt.slice(0, 10)) : longDate(today)}
            </span>
          </div>
        </div>
      </div>

      <div style={docHrule} />

      {/* Footer */}
      <div style={docFooter}>
        <div style={footerBrand}>Becoming</div>
        <div style={footerTagline}>"You said you would. Now do it."</div>
      </div>
    </div>
  );
}

// ── Signature canvas ───────────────────────────────────────────────────────

function SignatureCanvas({ onCapture }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const paths = useRef([]);
  const currentPath = useRef(null);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) * scaleX).toFixed(1),
      y: ((clientY - rect.top) * scaleY).toFixed(1),
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = getPos(e);
    currentPath.current = `M ${x} ${y}`;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    currentPath.current += ` L ${x} ${y}`;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PAPER.ink;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPath.current) {
      paths.current.push(currentPath.current);
      currentPath.current = null;
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    paths.current = [];
    onCapture(null);
  }

  function capture() {
    if (paths.current.length === 0) return;
    const canvas = canvasRef.current;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">${paths.current.map((d) => `<path d="${d}" stroke="${PAPER.ink}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    onCapture(svg);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={520}
        height={110}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        style={{
          display: "block",
          width: "100%",
          maxWidth: 520,
          height: 110,
          border: `1px solid ${PAPER.line}`,
          borderRadius: RADIUS.r1,
          background: PAPER.card,
          cursor: "crosshair",
          touchAction: "none",
        }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={clear} style={cancelBtn}>Clear</button>
        <button onClick={capture} style={signBtn}>Use this signature</button>
      </div>
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
  maxWidth: 720,
  margin: "0 auto",
};

const h1Style = {
  fontFamily: FONT.serif,
  fontWeight: 300,
  fontSize: "clamp(36px, 6vw, 56px)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: PAPER.ink,
  margin: "0 0 32px",
};

const sectionKicker = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.faint,
  fontWeight: 500,
  fontFamily: FONT.sans,
  marginBottom: 8,
};

const selectStyle = {
  padding: "9px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  outline: "none",
  cursor: "pointer",
  minWidth: 220,
};

const planPlaceholder = {
  background: PAPER.panel,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r2,
  padding: "16px 20px",
};

const contractRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r1,
  padding: "14px 16px",
};

const allContractRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: PAPER.card,
  border: `1px solid ${PAPER.line}`,
  borderRadius: RADIUS.r2,
  padding: "12px 16px",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
};

const signBtn = {
  padding: "10px 22px",
  borderRadius: RADIUS.pill,
  border: "none",
  background: PAPER.ink,
  color: PAPER.bg,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  cursor: "pointer",
};

const viewContractBtn = {
  padding: "7px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: 13,
  cursor: "pointer",
};

const retireBtn = {
  padding: "7px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: "transparent",
  color: PAPER.faint,
  fontFamily: FONT.sans,
  fontSize: 13,
  cursor: "pointer",
};

const printBtn = {
  padding: "7px 14px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.dim,
  fontFamily: FONT.sans,
  fontSize: 13,
  cursor: "pointer",
};

const backBtn = {
  background: "none",
  border: "none",
  fontFamily: FONT.sans,
  fontSize: 13,
  color: PAPER.dim,
  cursor: "pointer",
  padding: "0",
};

const cancelBtn = {
  padding: "9px 18px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.card,
  color: PAPER.dim,
  fontFamily: FONT.sans,
  fontSize: TYPE.body,
  cursor: "pointer",
};

// ── Document styles ─────────────────────────────────────────────────────────

const docWrap = {
  background: PAPER.card,
  border: `1px solid ${PAPER.cardBorder}`,
  borderRadius: RADIUS.r1,
  padding: "40px 44px",
  marginTop: 24,
  fontFamily: FONT.sans,
  boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.05)",
};

const docHeader = {
  textAlign: "center",
  marginBottom: 24,
};

const docBrand = {
  fontFamily: FONT.serif,
  fontWeight: 600,
  fontSize: 22,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: PAPER.ink,
  marginBottom: 10,
};

const docTitle = {
  fontFamily: FONT.sans,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: PAPER.dim,
  marginTop: 10,
};

const docDate = {
  fontFamily: FONT.sans,
  fontSize: 12,
  color: PAPER.faint,
  marginTop: 8,
};

const docHrule = {
  borderTop: `1px solid ${PAPER.line}`,
  margin: "20px 0",
};

const docSection = {
  marginBottom: 4,
};

const docArticleTitle = {
  fontFamily: FONT.sans,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: PAPER.ink,
  marginBottom: 10,
};

const docBody = {
  fontFamily: FONT.sans,
  fontSize: 13.5,
  lineHeight: 1.75,
  color: PAPER.ink,
  margin: "0 0 10px",
};

const docQuote = {
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: 15,
  lineHeight: 1.65,
  color: PAPER.ink,
  borderLeft: "3px solid",
  margin: "12px 0",
  paddingLeft: 16,
};

const commitFields = {
  marginTop: 10,
};

const commitInput = {
  flex: 1,
  minWidth: 120,
  padding: "6px 12px",
  borderRadius: RADIUS.pill,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.panel,
  color: PAPER.ink,
  fontFamily: FONT.serif,
  fontStyle: "italic",
  fontSize: 14,
  outline: "none",
};

const termsTextarea = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: RADIUS.r1,
  border: `1px solid ${PAPER.line}`,
  background: PAPER.panel,
  color: PAPER.ink,
  fontFamily: FONT.sans,
  fontSize: 13.5,
  lineHeight: 1.65,
  resize: "vertical",
  outline: "none",
  marginTop: 8,
};

const sigLine = {
  width: "80%",
  maxWidth: 320,
  borderBottom: "1.5px solid",
  borderColor: PAPER.ink,
  marginBottom: 4,
  paddingBottom: 2,
  height: 56,
};

const docFooter = {
  textAlign: "center",
  paddingTop: 8,
};

const footerBrand = {
  fontFamily: FONT.serif,
  fontWeight: 300,
  fontSize: 13,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: PAPER.faint,
  marginBottom: 4,
};

const footerTagline = {
  fontFamily: FONT.sans,
  fontStyle: "italic",
  fontSize: 11,
  color: PAPER.faint,
  letterSpacing: "0.04em",
};
