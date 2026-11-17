import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { StoreService } from '../services/store.service';
import { InsightCardComponent } from '../components/insight-card.component';
import { getStreaks, getProgress } from '../core/streaks';
import { generateInsights } from '../core/insights';
import { goalColor } from '../core/goalColor';
import { todayLocalISO, addDaysLocalISO } from '../core/date';
import type { Goal, Log, InsightQuestion } from '../core/types';

// ── Helper functions ────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86_400_000);
}

function firstMarkDate(goalId: string, logs: Log[]): string | null {
  let earliest: string | null = null;
  for (const log of logs) {
    if (log.events.some((e) => e.goalId === goalId)) {
      if (!earliest || log.date < earliest) earliest = log.date;
    }
  }
  return earliest;
}

// ── Stat types ──────────────────────────────────────────────────────────────

export interface StatBlock {
  label: string;
  value: string | number;
  accent?: string | null;
}

export interface GoalStat {
  goal: Goal;
  color: string;
  stats: StatBlock[];
  markedThisYear: number;
  target: number | null;
  progressPercent: number | null;
  daysFollowing: number | null;
  firstDate: string | null;
  longestEnded: string | null;
  currentStreak: number;
  longestStreak: number;
}

const YEAR = new Date().getFullYear();

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [InsightCardComponent],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.scss',
})
export class InsightsComponent implements OnInit {
  private store = inject(StoreService);

  readonly loading = signal(true);
  private rawLogs  = signal<Log[]>([]);

  readonly todayISO  = todayLocalISO();
  readonly yearFrom  = `${YEAR}-01-01`;
  readonly yearTo    = `${YEAR}-12-31`;

  // Dismissed IDs, persisted to localStorage
  readonly dismissedIds = signal<Set<string>>((() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed-insights') || '[]')); }
    catch { return new Set(); }
  })());

  readonly activeGoals = computed<Goal[]>(() =>
    this.store.goals().filter((g) => g.state === 'active'),
  );

  readonly goalStats = computed<GoalStat[]>(() => {
    const logs  = this.rawLogs();
    const today = this.todayISO;

    return this.activeGoals().map((goal) => {
      const target = typeof goal.target === 'number' ? goal.target : null;
      // dayTarget for getProgress: days marked in year / target days
      const streaks = getStreaks(goal.id, logs, today);
      const progress = getProgress(goal.id, logs, target ?? undefined);
      const first = firstMarkDate(goal.id, logs);
      const daysFollowing = first ? daysBetween(first, today) : null;

      const longestEnded =
        streaks.longestTo && streaks.longest > 0 && streaks.current < streaks.longest
          ? addDaysLocalISO(streaks.longestTo, 1)
          : null;

      const color = goalColor(goal);

      const stats: StatBlock[] = [
        { label: 'Current streak', value: streaks.current, accent: streaks.current > 0 ? color : null },
        { label: 'Longest streak', value: streaks.longest },
        { label: 'Marked this year', value: progress.marked },
        ...(target !== null ? [{ label: 'Target', value: target }] : []),
      ];

      return {
        goal,
        color,
        stats,
        markedThisYear: progress.marked,
        target,
        progressPercent: progress.percent,
        daysFollowing,
        firstDate: first,
        longestEnded,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      };
    });
  });

  readonly aiQuestions = computed<InsightQuestion[]>(() =>
    generateInsights({ goals: this.activeGoals(), logs: this.rawLogs(), today: this.todayISO }),
  );

  readonly activeInsight = computed<InsightQuestion | null>(() =>
    this.aiQuestions().find((q) => !this.dismissedIds().has(q.id)) ?? null,
  );

  async ngOnInit(): Promise<void> {
    if (!this.store.goalsLoaded()) await this.store.loadGoals();
    const logs = await this.store.readLogsInRange({ from: this.yearFrom, to: this.yearTo });
    this.rawLogs.set(logs);
    this.loading.set(false);
  }

  dismissInsight(id: string): void {
    this.dismissedIds.update((s) => {
      const next = new Set(s);
      next.add(id);
      try { localStorage.setItem('dismissed-insights', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  shortDate = shortDate;

  goalColor(g: Goal): string { return goalColor(g); }

  trackById(_: number, item: GoalStat): string { return item.goal.id; }
  trackByStat(_: number, s: StatBlock): string { return s.label; }
}
