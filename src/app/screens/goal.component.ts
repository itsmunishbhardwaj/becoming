import {
  Component, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { goalColor } from '../core/goalColor';
import { momentum, dailyAdherence } from '../core/adherence';
import { planDayTap } from '../core/dayTap';
import { todayLocalISO, addDaysLocalISO } from '../core/date';
import { daysInMonth, isoAtDay } from '../core/calendarMonth';
import type { Goal, Log, AdherenceStatus } from '../core/types';
import { MonthBlockComponent } from '../components/month-block.component';

@Component({
  selector: 'app-goal',
  standalone: true,
  imports: [RouterLink, MonthBlockComponent],
  templateUrl: './goal.component.html',
  styleUrl: './goal.component.scss',
})
export class GoalComponent implements OnInit {
  readonly store  = inject(StoreService);
  private route   = inject(ActivatedRoute);
  readonly router = inject(Router);
  private destroy = inject(DestroyRef);

  readonly today = todayLocalISO();
  readonly emptySet = new Set<string>();

  // ── State ────────────────────────────────────────────────────────────────
  readonly goal = signal<Goal | null | undefined>(undefined);
  readonly logs = signal<Log[]>([]);

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly calMonthInfo = computed(() => {
    const [y, m] = this.today.split('-').map(Number);
    return { y, m: m - 1 };
  });

  readonly calMonthEndISO = computed(() => {
    const { y, m } = this.calMonthInfo();
    return isoAtDay(y, m, daysInMonth(y, m) - 1);
  });

  readonly catHue = computed(() => goalColor(this.goal() ?? undefined));

  readonly goalMomentum = computed(() => {
    const g = this.goal();
    if (!g) return 0;
    return momentum({ goal: g, logs: this.logs(), asOf: this.today });
  });

  readonly miniAdherenceMaps = computed<Record<string, Record<string, AdherenceStatus>>>(() => {
    const g = this.goal();
    if (!g) return {};
    const { y, m } = this.calMonthInfo();
    const monthStart = isoAtDay(y, m, 0);
    return {
      [g.id]: dailyAdherence({ goal: g, logs: this.logs(), from: monthStart, to: this.calMonthEndISO() }),
    };
  });

  readonly recentEvents = computed(() => {
    const g = this.goal();
    if (!g) return [];
    const evts: { date: string; verb: string; payload?: string; time?: string; durationMin?: number }[] = [];
    for (const log of this.logs()) {
      for (const e of log.events) {
        if (e.goalId === g.id) evts.push({ date: log.date, ...e });
      }
    }
    return evts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  });

  readonly notesTimeline = computed(() => {
    const g = this.goal();
    if (!g) return [];
    const notes: { date: string; text: string }[] = [];
    for (const log of this.logs()) {
      const noteText = log.notes?.[g.id];
      if (noteText?.trim()) notes.push({ date: log.date, text: noteText });
    }
    return notes.sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly currentRound = computed(() => {
    const g = this.goal();
    if (!g) return null;
    return g.rounds?.[g.currentRound - 1] ?? null;
  });

  readonly totalEvents = computed(() => {
    const g = this.goal();
    if (!g) return 0;
    let count = 0;
    for (const log of this.logs()) {
      if (log.events.some((e) => e.goalId === g.id)) count++;
    }
    return count;
  });

  // ── Orb gradient (mirrors goal-card style) ───────────────────────────────
  readonly orbGradient = computed(() => {
    const c = this.catHue();
    return `radial-gradient(circle at 35% 30%, ${c}, ${c}99 80%)`;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    if (!this.store.goalsLoaded()) await this.store.loadGoals();

    this.route.params
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(async (params) => {
        const id = params['id'] ?? '';
        const g = this.store.goals().find((x) => x.id === id) ?? null;
        this.goal.set(g);
        if (g) await this.refreshLogs();
      });
  }

  async refreshLogs(): Promise<void> {
    const g = this.goal();
    if (!g) return;
    const start = addDaysLocalISO(this.today, -365);
    const l = await this.store.readLogsInRange({ from: start, to: this.calMonthEndISO() });
    this.logs.set(l);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatTarget(goal: Goal, r: { targetValue: unknown }): string {
    if (typeof goal.baseline === 'string') return `wake by ${r.targetValue}`;
    if ((goal.baseline as { intervalDays?: number } | null)?.intervalDays != null) {
      return `every ${(r.targetValue as { intervalDays: number }).intervalDays}d`;
    }
    return 'one tap per day';
  }

  formatEvent(evt: { verb: string; time?: string; durationMin?: number; payload?: string }): string {
    if (evt.verb === 'wake' && evt.time) return `wake ${evt.time}`;
    if (evt.verb === 'session') {
      if (evt.time && evt.durationMin != null) return `session ${evt.time} · ${evt.durationMin}min`;
      if (evt.durationMin != null) return `session ${evt.durationMin}min`;
    }
    return evt.payload || evt.verb;
  }

  humanDay(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  async updateGoalTime(timeStr: string): Promise<void> {
    const g = this.goal();
    if (!g) return;
    const next = { ...g, goalTime: timeStr || null };
    this.goal.set(next);
    try {
      await this.store.saveGoal(next);
    } catch {
      this.goal.set(g);
    }
  }

  onTimeChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateGoalTime(value);
  }

  async handleMiniDayTap(iso: string): Promise<void> {
    const g = this.goal();
    if (!g) return;
    const existingEvent = this.logs().find((l) => l.date === iso)?.events.find((e) => e.goalId === g.id);
    const plan = planDayTap({ goal: g, dateISO: iso, existingEvent });
    if (!plan) return;
    if (plan.type === 'delete') {
      await this.store.deleteLogEvent(iso, plan.event);
    } else {
      await this.store.appendLog(iso, plan.event);
    }
    await this.refreshLogs();
  }

  expandToCalendar(): void {
    const g = this.goal();
    if (!g) return;
    const { y, m } = this.calMonthInfo();
    const calYyyymm = `${y}-${String(m + 1).padStart(2, '0')}`;
    this.router.navigate(['/month', calYyyymm], { queryParams: { pen: g.id } });
  }
}
