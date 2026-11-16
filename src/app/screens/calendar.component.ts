import {
  Component, inject, signal, computed, effect, OnInit
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreService } from '../services/store.service';
import { dailyAdherence } from '../core/adherence';
import { todayLocalISO } from '../core/date';
import { goalColor } from '../core/goalColor';
import { centroidOf, distanceOf, classifyPinch } from '../core/pinchGesture';
import type { Goal, Log, AdherenceStatus } from '../core/types';
import { MonthBlockComponent } from '../components/month-block.component';
import type { TipData } from '../components/day-cell.component';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink, MonthBlockComponent, DatePipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnInit {
  private router = inject(Router);
  private store  = inject(StoreService);

  readonly year       = new Date().getFullYear().toString();
  readonly yearFrom   = `${this.year}-01-01`;
  readonly yearTo     = `${this.year}-12-31`;
  readonly todayISO   = todayLocalISO();
  readonly monthIdxs  = Array.from({ length: 12 }, (_, i) => i);

  readonly goals       = this.store.goals;
  readonly goalsLoaded = this.store.goalsLoaded;

  private rawLogs = signal<Log[]>([]);
  readonly penId       = signal<string | null>(null);
  readonly tip         = signal<TipData | null>(null);
  readonly todayMarked = signal(false);

  readonly pen = computed(() => {
    const id = this.penId();
    return id ? (this.goals().find((g) => g.id === id) ?? null) : null;
  });

  readonly adherenceMaps = computed<Record<string, Record<string, AdherenceStatus>>>(() => {
    const logs = this.rawLogs();
    return Object.fromEntries(
      this.goals().map((g) => [
        g.id,
        dailyAdherence({ goal: g, logs, from: this.yearFrom, to: this.yearTo }),
      ]),
    );
  });

  readonly totalMarkedDays = computed(() => {
    const days = new Set<string>();
    for (const [, map] of Object.entries(this.adherenceMaps())) {
      for (const [d, s] of Object.entries(map)) {
        if (s === 'hit' || s === 'soft') days.add(d);
      }
    }
    return days.size;
  });

  readonly penDays = computed(() => {
    const p = this.pen();
    if (!p) return 0;
    const map = this.adherenceMaps()[p.id] ?? {};
    return Object.values(map).filter((s) => s === 'hit' || s === 'soft').length;
  });

  readonly penColor = computed(() => {
    const p = this.pen();
    return p ? goalColor(p) : null;
  });

  readonly penEventByDate = computed<Record<string, import('../core/types').LogEvent>>(() => {
    const p = this.pen();
    if (!p) return {};
    const out: Record<string, import('../core/types').LogEvent> = {};
    for (const l of this.rawLogs()) {
      const evt = l.events.find((e) => e.goalId === p.id);
      if (evt) out[l.date] = evt;
    }
    return out;
  });

  private pinch: {
    ptrs: Map<number, { x: number; y: number }>;
    initDist: number | null;
    startMs: number | null;
    fired: boolean;
  } | null = null;

  constructor() {
    // Drop pen if its goal is removed
    effect(() => {
      const id = this.penId();
      if (id && !this.goals().some((g) => g.id === id)) this.penId.set(null);
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.goalsLoaded()) await this.store.loadGoals();
    await this.refreshLogs();
  }

  private async refreshLogs(): Promise<void> {
    const ls = await this.store.readLogsInRange({ from: this.yearFrom, to: this.yearTo });
    this.rawLogs.set(ls);
  }

  goalColor(g: Goal) { return goalColor(g); }

  togglePen(g: Goal): void {
    this.penId.update((id) => (id === g.id ? null : g.id));
  }

  async onDayTap(iso: string): Promise<void> {
    const p = this.pen();
    if (!p) return;

    // Cadence goals: skip scheduled days (they auto-log)
    if ((p.baseline as { intervalDays?: number } | null)?.intervalDays != null) {
      const { isScheduledDay } = await import('../core/goalTypes/cadence');
      const round = p.rounds.find((r) => iso >= r.startDate && iso <= r.endDate);
      if (round && isScheduledDay({ date: iso, currentRound: round })) return;
    }

    const existing = this.penEventByDate()[iso];
    if (existing) {
      await this.store.deleteLogEvent(iso, existing);
    } else {
      const baseline = p.baseline as string | { intervalDays: number } | null;
      const event = typeof baseline === 'string'
        ? { verb: 'wake', time: '07:00', goalId: p.id }
        : baseline?.intervalDays != null
          ? { verb: 'session', durationMin: 10, goalId: p.id }
          : { verb: 'done', goalId: p.id };
      await this.store.appendLog(iso, event as import('../core/types').LogEvent);
    }
    await this.refreshLogs();
  }

  async onDayOpen(iso: string): Promise<void> {
    await this.router.navigate(['/day', iso]);
  }

  onMonthOpen(monthIdx: number): void {
    const q = this.penId() ? { pen: this.penId() } : {};
    const mm = String(monthIdx + 1).padStart(2, '0');
    this.router.navigate(['/month', `${this.year}-${mm}`], { queryParams: q });
  }

  onTodayClick(): void {
    this.todayMarked.update((v) => !v);
  }

  monthIdx(i: number) { return i; }

  // ── Pinch-to-zoom → navigate to month ──────────────────────────────────

  onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    if (!this.pinch) this.pinch = { ptrs: new Map(), initDist: null, startMs: null, fired: false };
    this.pinch.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...this.pinch.ptrs.values()];
    if (pts.length === 2) {
      this.pinch.initDist = distanceOf(pts as [{ x: number; y: number }, { x: number; y: number }]);
      this.pinch.startMs = Date.now();
    }
  }

  onPointerMove(e: PointerEvent): void {
    const s = this.pinch;
    if (!s?.ptrs.has(e.pointerId)) return;
    s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.fired || !s.initDist) return;
    const pts = [...s.ptrs.values()];
    if (pts.length < 2) return;
    const ratio = distanceOf(pts as [{ x: number; y: number }, { x: number; y: number }]) / s.initDist;
    const elapsed = Date.now() - (s.startMs ?? 0);
    const dir = classifyPinch({ ratio, elapsed });
    if (dir !== 'in') return;
    s.fired = true;
    const c = centroidOf(pts);
    // Find the month under the pinch centroid
    const cells = document.querySelectorAll<HTMLElement>('[data-iso]');
    let found: string | null = null;
    for (const el of cells) {
      const r = el.getBoundingClientRect();
      if (c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom) {
        found = el.getAttribute('data-iso'); break;
      }
    }
    const mm = found
      ? found.slice(0, 7)
      : `${this.year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const q = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/month', mm], { queryParams: q });
  }

  onPinchEnd(e: PointerEvent): void {
    if (!this.pinch?.ptrs.has(e.pointerId)) return;
    this.pinch.ptrs.delete(e.pointerId);
    if (this.pinch.ptrs.size === 0) this.pinch = null;
  }
}
