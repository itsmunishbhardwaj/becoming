import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { advanceGoal } from '../core/rounds';
import { momentum } from '../core/adherence';
import { generateInsights } from '../core/insights';
import { todayLocalISO } from '../core/date';
import type { InsightQuestion } from '../core/types';
import type { Log } from '../core/types';
import { GoalCardComponent, type EnrichedGoal } from '../components/goal-card.component';
import { InsightCardComponent } from '../components/insight-card.component';
import { LogBlobComponent } from '../components/log-blob.component';
import { LogSheetComponent } from '../components/log-sheet.component';
import { MiniYearGridComponent } from '../components/mini-year-grid.component';

const YEAR = new Date().getFullYear();

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [RouterLink, GoalCardComponent, InsightCardComponent, LogBlobComponent, LogSheetComponent, MiniYearGridComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class GoalsComponent implements OnInit {
  readonly store = inject(StoreService);

  readonly loaded       = this.store.goalsLoaded;
  readonly rawLogs      = signal<Log[]>([]);
  readonly sheetOpen    = signal(false);
  readonly dismissedIds = signal<Set<string>>(this.loadDismissed());

  readonly today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  readonly todayISO     = todayLocalISO();
  readonly yearFrom     = `${YEAR}-01-01`;
  readonly currentMonth = this.todayISO.slice(0, 7);

  readonly enriched = computed<EnrichedGoal[]>(() => {
    const logs = this.rawLogs();
    return this.store.goals().map((g) => ({
      ...g,
      momentum: momentum({ goal: g, logs, asOf: this.todayISO }),
      headline: {
        n: logs.filter((l) => l.events.some((e) => e.goalId === g.id)).length,
        unit: 'days marked',
      },
    }));
  });

  readonly insights = computed<InsightQuestion[]>(() =>
    generateInsights({ goals: this.store.goals(), logs: this.rawLogs(), today: this.todayISO }),
  );

  readonly activeInsight = computed<InsightQuestion | null>(() =>
    this.insights().find((q) => !this.dismissedIds().has(q.id)) ?? null,
  );

  readonly showIntro = signal(
    typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  constructor() {
    if (this.showIntro()) setTimeout(() => this.showIntro.set(false), 3700);
  }

  async ngOnInit(): Promise<void> {
    if (!this.loaded()) await this.store.loadGoals();
    await this.advanceAndLoad();
  }

  private async advanceAndLoad(): Promise<void> {
    const today = this.todayISO;
    for (const g of this.store.goals()) {
      const { goal: next, changed } = advanceGoal(g, today);
      if (changed) this.store.saveGoal(next).catch(() => {});
    }
    const logs = await this.store.readLogsInRange({ from: this.yearFrom, to: today });
    this.rawLogs.set(logs);
  }

  async onDelete(id: string): Promise<void> {
    await this.store.deleteGoal(id);
  }

  async onSaved(): Promise<void> {
    const logs = await this.store.readLogsInRange({ from: this.yearFrom, to: this.todayISO });
    this.rawLogs.set(logs);
  }

  dismissInsight(id: string): void {
    this.dismissedIds.update((s) => {
      const next = new Set(s);
      next.add(id);
      try { localStorage.setItem('becoming.insights.seen', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  private loadDismissed(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem('becoming.insights.seen') ?? '[]')); }
    catch { return new Set(); }
  }
}
