import {
  Component, inject, signal, computed, OnInit, AfterViewInit,
  DestroyRef, ViewChild, ElementRef,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { StoreService } from '../services/store.service';
import { addDaysLocalISO, todayLocalISO } from '../core/date';
import { goalColor } from '../core/goalColor';
import type { Goal, Log, LogEvent } from '../core/types';

interface GoalSlot {
  goal: Goal;
  event: LogEvent | null;
  top: number;
  height: number;
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_SHORT  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/** Build the grid of days (with leading nulls) for a given year/month. */
function buildMiniGrid(y: number, m: number): (number | null)[] {
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isoToYMD(iso: string): { y: number; m: number; d: number } {
  const [y, mo, d] = iso.split('-').map(Number);
  return { y, m: mo - 1, d };
}

function ymdToISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function offsetMiniMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const dt = new Date(y, m + delta, 1);
  return { y: dt.getFullYear(), m: dt.getMonth() };
}

@Component({
  selector: 'app-day',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './day.component.html',
  styleUrl: './day.component.scss',
})
export class DayComponent implements OnInit, AfterViewInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private store   = inject(StoreService);
  private destroy = inject(DestroyRef);
  private bp      = inject(BreakpointObserver);

  readonly todayISO = todayLocalISO();

  // ── Responsive ────────────────────────────────────────────────────────────
  readonly desktop = toSignal(
    this.bp.observe('(min-width: 768px)').pipe(map((s) => s.matches)),
    { initialValue: typeof window !== 'undefined' && window.innerWidth >= 768 },
  );

  // ── Sidebar state ─────────────────────────────────────────────────────────
  readonly sidebarOpen = signal(true);

  // ── Route date ────────────────────────────────────────────────────────────
  readonly date = signal<string>(this.todayISO);

  readonly dateLabel = computed(() => {
    const { y, m, d } = isoToYMD(this.date());
    const dt = new Date(y, m, d);
    return `${DOW_LABELS[dt.getDay()]}, ${MONTH_NAMES[m]} ${d}, ${y}`;
  });

  readonly weekdayLabel = computed(() => {
    const { y, m, d } = isoToYMD(this.date());
    return DOW_LABELS[new Date(y, m, d).getDay()];
  });

  readonly dayNumber = computed(() => isoToYMD(this.date()).d);

  readonly isToday = computed(() => this.date() === this.todayISO);

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly goals       = this.store.goals;
  readonly goalsLoaded = this.store.goalsLoaded;

  readonly activeGoals = computed(() => this.goals().filter((g) => g.state === 'active'));

  private rawLog = signal<Log | null>(null);

  readonly events = computed<LogEvent[]>(() => this.rawLog()?.events ?? []);

  readonly notes = computed<Record<string, string>>(() => this.rawLog()?.notes ?? {});

  // ── Sidebar tabs ──────────────────────────────────────────────────────────
  readonly activeTab = signal<'logged' | 'notes' | 'add'>('logged');

  // ── Time grid ─────────────────────────────────────────────────────────────
  readonly HOURS = Array.from({length: 24}, (_, i) => i);
  readonly PX_PER_MIN = 1; // 60px per hour

  // Active goals that have a scheduled time
  readonly scheduledGoals = computed(() =>
    this.activeGoals().filter(g => !!g.goalTime)
  );

  // One slot per scheduled goal — ghost when unlogged, filled when logged
  readonly goalSlots = computed<GoalSlot[]>(() =>
    this.scheduledGoals().map(goal => {
      const event = this.events().find(e => e.goalId === goal.id) ?? null;
      const [h, m] = goal.goalTime!.split(':').map(Number);
      return {
        goal,
        event,
        top:    (h * 60 + m) * this.PX_PER_MIN,
        height: Math.max(44, (event?.durationMin ?? 60) * this.PX_PER_MIN),
      };
    })
  );

  // Logged timed events for goals that have no scheduled goalTime
  private readonly scheduledGoalIds = computed(() =>
    new Set(this.scheduledGoals().map(g => g.id))
  );

  readonly orphanTimedEvents = computed(() =>
    this.events().filter(e => !!e.time && !this.scheduledGoalIds().has(e.goalId))
  );

  readonly timedEvents   = computed(() => this.events().filter(e => !!e.time));
  readonly untimedEvents = computed(() =>
    this.events().filter(e => !e.time && !this.scheduledGoalIds().has(e.goalId))
  );

  private readonly nowMinutes = signal(this.calcNowMinutes());

  readonly currentTimeTop = computed(() => this.nowMinutes() * this.PX_PER_MIN);

  @ViewChild('timeScroll') private timeScrollRef?: ElementRef<HTMLElement>;

  // ── Mini calendar ─────────────────────────────────────────────────────────
  readonly miniCalMonth = signal<{ y: number; m: number }>({
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
  });

  readonly miniCalGrid = computed(() => {
    const { y, m } = this.miniCalMonth();
    return buildMiniGrid(y, m);
  });

  readonly miniCalLabel = computed(() => {
    const { y, m } = this.miniCalMonth();
    return `${MONTH_NAMES[m]} ${y}`;
  });

  readonly dowShort = DOW_SHORT;

  // ── View switcher ─────────────────────────────────────────────────────────
  readonly viewSwitcherOpen = signal(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    if (!this.goalsLoaded()) await this.store.loadGoals();

    // Update current-time marker every minute.
    const timer = setInterval(() => this.nowMinutes.set(this.calcNowMinutes()), 60_000);
    this.destroy.onDestroy(() => clearInterval(timer));

    this.route.params
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(async (params) => {
        const raw = params['date'] ?? '';
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : this.todayISO;
        this.date.set(iso);

        const { y, m } = isoToYMD(iso);
        this.miniCalMonth.set({ y, m });

        await this.refreshLog();
        setTimeout(() => this.scrollToNow());
      });
  }

  ngAfterViewInit(): void {
    this.scrollToNow();
  }

  private async refreshLog(): Promise<void> {
    const log = await this.store.readLog(this.date());
    this.rawLog.set(log);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  goalColor(g: Goal | null | undefined): string { return goalColor(g); }

  private calcNowMinutes(): number {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }

  private scrollToNow(): void {
    const el = this.timeScrollRef?.nativeElement;
    if (!el) return;
    const target = this.isToday()
      ? Math.max(0, this.currentTimeTop() - 90)
      : 7 * 60 - 30; // show 7 AM minus 30min context
    el.scrollTop = target;
  }

  hourLabel(h: number): string {
    if (h === 0)  return '';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  }

  eventTop(e: LogEvent): number {
    if (!e.time) return 0;
    const [h, m] = e.time.split(':').map(Number);
    return (h * 60 + m) * this.PX_PER_MIN;
  }

  eventHeight(e: LogEvent): number {
    return Math.max(28, (e.durationMin ?? 60) * this.PX_PER_MIN);
  }

  eventBg(goal: Goal | undefined): string {
    const hex = goalColor(goal);
    if (!hex.startsWith('#') || hex.length < 7) return 'rgba(0,0,0,0.08)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.14)`;
  }

  slotBg(goal: Goal, logged: boolean): string {
    const hex = goalColor(goal);
    if (!hex.startsWith('#') || hex.length < 7) return logged ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.18)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return logged
      ? `rgba(${r},${g},${b},0.80)`
      : `rgba(${r},${g},${b},0.22)`;
  }

  slotTextColor(goal: Goal, logged: boolean): string {
    const hex = goalColor(goal);
    if (!hex.startsWith('#') || hex.length < 7) return logged ? '#fff' : '#2B2B2B';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (logged) {
      return (r * 0.299 + g * 0.587 + b * 0.114) > 165 ? '#2B2B2B' : '#fff';
    }
    // Unlogged: dark ink, slightly tinted toward the goal color
    return '#2B2B2B';
  }

  slotTimeRange(slot: GoalSlot): string {
    const [h, m] = slot.goal.goalTime!.split(':').map(Number);
    const start = slot.goal.goalTime!;
    const dur = slot.event?.durationMin ?? 60;
    const endTotal = h * 60 + m + dur;
    const eh = Math.floor(endTotal / 60) % 24;
    const em = endTotal % 60;
    const end = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    return `${start} – ${end}`;
  }

  goalById(id: string): Goal | undefined {
    return this.goals().find((g) => g.id === id);
  }

  eventsForGoal(goalId: string): LogEvent[] {
    return this.events().filter((e) => e.goalId === goalId);
  }

  noteForGoal(goalId: string): string {
    return this.notes()[goalId] ?? '';
  }

  eventLabel(e: LogEvent): string {
    const parts: string[] = [e.verb];
    if (e.time)        parts.push(e.time);
    if (e.durationMin) parts.push(`${e.durationMin}m`);
    if (e.payload)     parts.push(e.payload);
    return parts.join(' · ');
  }

  miniCellISO(d: number | null): string | null {
    if (d === null) return null;
    const { y, m } = this.miniCalMonth();
    return ymdToISO(y, m, d);
  }

  miniCellIsSelected(d: number | null): boolean {
    if (d === null) return false;
    return this.miniCellISO(d) === this.date();
  }

  miniCellIsToday(d: number | null): boolean {
    if (d === null) return false;
    return this.miniCellISO(d) === this.todayISO;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToday(): void {
    this.router.navigate(['/day', this.todayISO]);
  }

  prevDay(): void {
    this.router.navigate(['/day', addDaysLocalISO(this.date(), -1)]);
  }

  nextDay(): void {
    this.router.navigate(['/day', addDaysLocalISO(this.date(), 1)]);
  }

  miniCalPrev(): void {
    const { y, m } = this.miniCalMonth();
    this.miniCalMonth.set(offsetMiniMonth(y, m, -1));
  }

  miniCalNext(): void {
    const { y, m } = this.miniCalMonth();
    this.miniCalMonth.set(offsetMiniMonth(y, m, 1));
  }

  navigateToMiniDay(d: number | null): void {
    if (d === null) return;
    const iso = this.miniCellISO(d);
    if (iso) this.router.navigate(['/day', iso]);
  }

  goToYear(): void {
    this.router.navigate(['/calendar']);
    this.viewSwitcherOpen.set(false);
  }

  goToMonth(): void {
    const { y, m } = isoToYMD(this.date());
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    this.router.navigate(['/month', ym]);
    this.viewSwitcherOpen.set(false);
  }

  goToWeek(): void {
    const d = new Date(this.date() + 'T00:00:00');
    const sundayISO = addDaysLocalISO(this.date(), -d.getDay());
    this.router.navigate(['/week', sundayISO]);
    this.viewSwitcherOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleViewSwitcher(): void {
    this.viewSwitcherOpen.update((v) => !v);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async toggleSlot(slot: GoalSlot): Promise<void> {
    if (slot.event) {
      await this.store.deleteLogEvent(this.date(), slot.event);
    } else {
      const event: LogEvent = {
        verb: 'done',
        goalId: slot.goal.id,
        time: slot.goal.goalTime ?? undefined,
        durationMin: 60,
      };
      await this.store.appendLog(this.date(), event);
    }
    await this.refreshLog();
  }

  async deleteEvent(event: LogEvent): Promise<void> {
    await this.store.deleteLogEvent(this.date(), event);
    await this.refreshLog();
  }

  async addDefaultEvent(goal: Goal): Promise<void> {
    const baseline = goal.baseline as string | { intervalDays: number } | null;
    const event: LogEvent = typeof baseline === 'string'
      ? { verb: 'wake', time: '07:00', goalId: goal.id }
      : (baseline as { intervalDays?: number } | null)?.intervalDays != null
        ? { verb: 'session', durationMin: 10, goalId: goal.id }
        : { verb: 'done', goalId: goal.id };
    await this.store.appendLog(this.date(), event);
    await this.refreshLog();
  }

  async saveNote(goalId: string, value: string): Promise<void> {
    await this.store.saveNote(this.date(), goalId, value);
    await this.refreshLog();
  }

  onNoteBlur(goalId: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.saveNote(goalId, value);
  }
}
