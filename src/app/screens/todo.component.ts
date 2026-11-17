import {
  Component, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { goalColor } from '../core/goalColor';
import { todayLocalISO, addDaysLocalISO } from '../core/date';
import type { Goal, Task } from '../core/types';

function humanDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (iso === todayLocalISO()) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.scss',
})
export class TodoComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private store   = inject(StoreService);
  private destroy = inject(DestroyRef);

  // ── Route → date ─────────────────────────────────────────────────────────
  readonly dateParam = signal<string>('');

  readonly date = computed(() => {
    const p = this.dateParam();
    return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : todayLocalISO();
  });

  readonly isToday = computed(() => this.date() === todayLocalISO());
  readonly isPast  = computed(() => this.date() < todayLocalISO());

  // ── State ─────────────────────────────────────────────────────────────────
  readonly loading        = signal(true);
  readonly busy           = signal(false);
  readonly markedGoalIds  = signal<Set<string>>(new Set());
  readonly tasks          = signal<Task[]>([]);
  readonly taskLog        = signal<Task[]>([]);
  readonly carryTasks     = signal<Task[]>([]);
  readonly taskInput      = signal('');
  readonly doneOpen       = signal(false);

  // ── Goals ─────────────────────────────────────────────────────────────────
  readonly activeGoals = computed(() =>
    this.store.goals().filter((g) => g.state === 'active'),
  );

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly activeTasks = computed(() =>
    [...this.tasks()].sort((a, b) => a.order - b.order),
  );

  readonly dateLabel = computed(() => humanDate(this.date()));

  // ── Drag state ────────────────────────────────────────────────────────────
  readonly dragItemIndex  = signal<number | null>(null);
  readonly dragOverIndex  = signal<number | null>(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => {
        const p = params['date'] ?? '';
        this.dateParam.set(p);
        this.load(this.date());
      });
  }

  async load(date: string): Promise<void> {
    this.loading.set(true);
    const [log, tasks, taskLog] = await Promise.all([
      this.store.readLog(date).catch(() => null),
      this.store.listTasks(date).catch(() => [] as Task[]),
      this.store.listTaskLog(date).catch(() => [] as Task[]),
    ]);
    if (!this.store.goalsLoaded()) await this.store.loadGoals();
    this.markedGoalIds.set(new Set((log?.events ?? []).map((e) => e.goalId)));
    this.tasks.set(tasks);
    this.taskLog.set(taskLog);
    if (this.isToday()) {
      const yesterday = addDaysLocalISO(date, -1);
      const ylog = await this.store.listTasks(yesterday).catch(() => [] as Task[]);
      this.carryTasks.set(ylog.filter((t) => !t.done && !t.carriedFrom));
    } else {
      this.carryTasks.set([]);
    }
    this.loading.set(false);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  prevDay(): void {
    this.router.navigate(['/todo', addDaysLocalISO(this.date(), -1)]);
  }

  nextDay(): void {
    this.router.navigate(['/todo', addDaysLocalISO(this.date(), 1)]);
  }

  goToday(): void {
    this.router.navigate(['/todo']);
  }

  // ── Goal toggle ───────────────────────────────────────────────────────────

  async toggleGoal(goal: Goal): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const date = this.date();
    const event = { verb: 'tap', goalId: goal.id, payload: '' };
    try {
      if (this.markedGoalIds().has(goal.id)) {
        await this.store.deleteLogEvent(date, event);
        this.markedGoalIds.update((s) => { const n = new Set(s); n.delete(goal.id); return n; });
      } else {
        await this.store.appendLog(date, event);
        this.markedGoalIds.update((s) => { const n = new Set(s); n.add(goal.id); return n; });
      }
    } catch {}
    this.busy.set(false);
  }

  // ── Task add ──────────────────────────────────────────────────────────────

  async handleAddTask(title: string): Promise<void> {
    const t = title.trim();
    if (!t || this.busy()) return;
    this.busy.set(true);
    this.taskInput.set('');
    try {
      const task = await this.store.addTask(this.date(), t);
      this.tasks.update((ts) => [...ts, task]);
    } catch {}
    this.busy.set(false);
  }

  onTaskInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleAddTask(this.taskInput());
    }
  }

  // ── Task toggle ───────────────────────────────────────────────────────────

  async toggleTask(task: Task): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const updated = await this.store.setTaskDone(task.id, !task.done);
      if (updated.done) {
        this.tasks.update((ts) => ts.filter((t) => t.id !== task.id));
        this.taskLog.update((ts) => [updated, ...ts]);
      } else {
        this.taskLog.update((ts) => ts.filter((t) => t.id !== task.id));
        this.tasks.update((ts) => [...ts, updated]);
      }
    } catch {}
    this.busy.set(false);
  }

  // ── Carry forward ─────────────────────────────────────────────────────────

  async handleCarry(task: Task): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const carried = await this.store.carryTask(task.id, this.date());
      this.carryTasks.update((ts) => ts.filter((t) => t.id !== task.id));
      this.tasks.update((ts) => [...ts, carried]);
    } catch {}
    this.busy.set(false);
  }

  dismissCarry(task: Task): void {
    this.carryTasks.update((ts) => ts.filter((t) => t.id !== task.id));
  }

  // ── Drag reorder ──────────────────────────────────────────────────────────

  onDragStart(index: number): void {
    this.dragItemIndex.set(index);
  }

  onDragEnter(index: number): void {
    this.dragOverIndex.set(index);
  }

  async onDragEnd(): Promise<void> {
    const from = this.dragItemIndex();
    const to   = this.dragOverIndex();
    this.dragItemIndex.set(null);
    this.dragOverIndex.set(null);
    if (from === null || to === null || from === to) return;

    const list = [...this.activeTasks()];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    this.tasks.set(list);

    try {
      await this.store.reorderTasks(this.date(), list.map((t) => t.id));
    } catch {}
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  goalColor(goal: Goal | undefined): string { return goalColor(goal); }

  goalById(id: string | null): Goal | undefined {
    if (!id) return undefined;
    return this.store.goals().find((g) => g.id === id);
  }

  isMarked(goalId: string): boolean {
    return this.markedGoalIds().has(goalId);
  }

  formatDoneTime(isoOrNull: string | null): string {
    if (!isoOrNull) return '';
    const d = new Date(isoOrNull);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}
