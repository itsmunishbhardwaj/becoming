import {
  Component, inject, signal, computed, effect, OnInit, DestroyRef, HostListener,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../services/store.service';
import { dailyAdherence } from '../core/adherence';
import { planDayTap } from '../core/dayTap';
import { projectedDates as projectedDatesCore } from '../core/projection';
import { todayLocalISO, addDaysLocalISO } from '../core/date';
import { classifySwipe } from '../core/swipe';
import { distanceOf, centroidOf, classifyPinch } from '../core/pinchGesture';
import type { Goal, Log, AdherenceStatus, LogEvent } from '../core/types';
import { PenChipsComponent } from '../components/pen-chips.component';
import { DayCellComponent } from '../components/day-cell.component';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function sundayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function fmtRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const startMon = MONTHS_SHORT[sm - 1];
  const endMon   = MONTHS_SHORT[em - 1];
  if (sm === em && sy === ey) {
    return `${startMon} ${sd} – ${ed}, ${sy}`;
  }
  return `${startMon} ${sd} – ${endMon} ${ed}, ${ey}`;
}

function offsetWeek(anchor: string, delta: -1 | 1): string {
  return addDaysLocalISO(anchor, delta * 7);
}

function isoToYYYYMMDD(iso: string): string {
  return iso.replace(/-/g, '');
}

function yyyymmddToISO(raw: string): string {
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  // already ISO or partial
  return raw;
}

@Component({
  selector: 'app-week',
  standalone: true,
  imports: [PenChipsComponent, DayCellComponent],
  templateUrl: './week.component.html',
  styleUrl: './week.component.scss',
})
export class WeekComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private store   = inject(StoreService);
  private destroy = inject(DestroyRef);

  readonly todayISO = todayLocalISO();

  // ── Route param → anchor (Sunday ISO) ─────────────────────────────────
  readonly anchor = signal<string>(sundayOf(this.todayISO));
  readonly viewSwitcherOpen = signal(false);

  // ── Data ───────────────────────────────────────────────────────────────
  readonly goals       = this.store.goals;
  readonly goalsLoaded = this.store.goalsLoaded;
  private rawLogs      = signal<Log[]>([]);

  // ── Pen ────────────────────────────────────────────────────────────────
  readonly penId = signal<string | null>(null);

  readonly pen = computed(() => {
    const id = this.penId();
    return id ? (this.goals().find((g) => g.id === id) ?? null) : null;
  });

  // ── Week range ─────────────────────────────────────────────────────────
  readonly weekEnd = computed(() => addDaysLocalISO(this.anchor(), 6));

  readonly weekLabel = computed(() => fmtRange(this.anchor(), this.weekEnd()));

  // ── Days array ────────────────────────────────────────────────────────
  readonly days = computed(() => {
    const a = this.anchor();
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysLocalISO(a, i);
      const num = parseInt(iso.slice(8), 10);
      return { iso, letter: DAY_LETTERS[i], num };
    });
  });

  // ── Adherence ──────────────────────────────────────────────────────────
  readonly adherenceMaps = computed<Record<string, Record<string, AdherenceStatus>>>(() => {
    const from = this.anchor();
    const to   = this.weekEnd();
    return Object.fromEntries(
      this.goals().map((g) => [
        g.id,
        dailyAdherence({ goal: g, logs: this.rawLogs(), from, to }),
      ]),
    );
  });

  readonly penDays = computed(() => {
    const p = this.pen();
    if (!p) return 0;
    const map = this.adherenceMaps()[p.id] ?? {};
    return Object.values(map).filter((s) => s === 'hit' || s === 'soft').length;
  });

  // ── Projected dates ────────────────────────────────────────────────────
  readonly projectedSet = computed<Set<string> | null>(() => {
    const p = this.pen();
    if (!p?.endDate) return null;
    const from = this.anchor();
    const to   = this.weekEnd();
    const dates = projectedDatesCore({ goal: p, from, to });
    return new Set(dates);
  });

  // ── penEventByDate ─────────────────────────────────────────────────────
  readonly penEventByDate = computed<Record<string, LogEvent>>(() => {
    const p = this.pen();
    if (!p) return {};
    const out: Record<string, LogEvent> = {};
    for (const l of this.rawLogs()) {
      const evt = l.events.find((e) => e.goalId === p.id);
      if (evt) out[l.date] = evt;
    }
    return out;
  });

  readonly emptySet = new Set<string>();

  // ── Slide animation ────────────────────────────────────────────────────
  readonly slideClass = signal<'week-slide-next' | 'week-slide-prev' | ''>('');

  // ── Swipe gesture state ────────────────────────────────────────────────
  private swipe: { x0: number; y0: number; t0: number } | null = null;

  // ── Pinch gesture state ────────────────────────────────────────────────
  private pinch: {
    ptrs: Map<number, { x: number; y: number }>;
    initDist: number | null;
    startMs: number | null;
    fired: boolean;
  } | null = null;

  constructor() {
    effect(() => {
      const id = this.penId();
      if (id && !this.goals().some((g) => g.id === id)) this.penId.set(null);
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.goalsLoaded()) await this.store.loadGoals();

    this.route.params
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(async (params) => {
        const raw = params['week'] ?? '';
        const iso = raw.length === 8 ? yyyymmddToISO(raw) : raw;
        const sun = iso ? sundayOf(iso) : sundayOf(this.todayISO);
        this.anchor.set(sun);

        const penQ = this.route.snapshot.queryParamMap.get('pen');
        if (penQ && !this.penId()) this.penId.set(penQ);

        await this.refreshLogs();
      });
  }

  private async refreshLogs(): Promise<void> {
    const ls = await this.store.readLogsInRange({ from: this.anchor(), to: this.weekEnd() });
    this.rawLogs.set(ls);
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  navigate(delta: -1 | 1): void {
    this.slideClass.set(delta === 1 ? 'week-slide-next' : 'week-slide-prev');
    setTimeout(() => this.slideClass.set(''), 220);
    const next = offsetWeek(this.anchor(), delta);
    const q = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/week', isoToYYYYMMDD(next)], { queryParams: q });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  this.navigate(-1);
    if (e.key === 'ArrowRight') this.navigate(1);
  }

  // ── View switcher ──────────────────────────────────────────────────────

  toggleViewSwitcher(): void {
    this.viewSwitcherOpen.update((v) => !v);
  }

  goToCalendar(): void {
    const q = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/calendar'], { queryParams: q });
    this.viewSwitcherOpen.set(false);
  }

  goToMonth(): void {
    const iso = this.anchor();
    const ym  = iso.slice(0, 7); // "YYYY-MM"
    const q   = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/month', ym], { queryParams: q });
    this.viewSwitcherOpen.set(false);
  }

  goToDay(): void {
    this.router.navigate(['/day', this.todayISO]);
    this.viewSwitcherOpen.set(false);
  }

  // ── Day tap ────────────────────────────────────────────────────────────

  async onDayTap(iso: string): Promise<void> {
    const p = this.pen();
    if (!p) return;
    const existing = this.penEventByDate()[iso] ?? null;
    const plan = planDayTap({ goal: p, dateISO: iso, existingEvent: existing });
    if (!plan) return;
    if (plan.type === 'delete') {
      await this.store.deleteLogEvent(iso, plan.event);
    } else {
      await this.store.appendLog(iso, plan.event);
    }
    await this.refreshLogs();
  }

  async onDayOpen(iso: string): Promise<void> {
    await this.router.navigate(['/day', iso]);
  }

  // ── Pen chips ──────────────────────────────────────────────────────────

  onPenPick(id: string | null): void {
    this.penId.set(id);
  }

  penDayCount = (g: Goal): number => {
    const map = this.adherenceMaps()[g.id] ?? {};
    return Object.values(map).filter((s) => s === 'hit' || s === 'soft').length;
  };

  // ── Swipe ──────────────────────────────────────────────────────────────

  onTouchStart(e: TouchEvent): void {
    const t = e.changedTouches[0];
    this.swipe = { x0: t.clientX, y0: t.clientY, t0: Date.now() };
  }

  onTouchEnd(e: TouchEvent): void {
    if (!this.swipe) return;
    const t = e.changedTouches[0];
    const dx   = t.clientX - this.swipe.x0;
    const dy   = t.clientY - this.swipe.y0;
    const dtMs = Date.now() - this.swipe.t0;
    this.swipe = null;
    const dir = classifySwipe({ dx, dy, dtMs });
    if (dir === 'next') this.navigate(1);
    else if (dir === 'prev') this.navigate(-1);
  }

  // ── Pinch ──────────────────────────────────────────────────────────────

  onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    if (!this.pinch) this.pinch = { ptrs: new Map(), initDist: null, startMs: null, fired: false };
    this.pinch.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...this.pinch.ptrs.values()];
    if (pts.length === 2) {
      this.pinch.initDist = distanceOf(pts as [{ x: number; y: number }, { x: number; y: number }]);
      this.pinch.startMs  = Date.now();
    }
  }

  onPointerMove(e: PointerEvent): void {
    const s = this.pinch;
    if (!s?.ptrs.has(e.pointerId)) return;
    s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.fired || !s.initDist) return;
    const pts = [...s.ptrs.values()];
    if (pts.length < 2) return;
    const ratio   = distanceOf(pts as [{ x: number; y: number }, { x: number; y: number }]) / s.initDist;
    const elapsed = Date.now() - (s.startMs ?? 0);
    const dir     = classifyPinch({ ratio, elapsed });
    if (!dir) return;
    s.fired = true;

    if (dir === 'out') {
      // pinch-out → go to month view for this week's month
      this.goToMonth();
      return;
    }

    // pinch-in → find day cell under centroid → /day/:iso
    const c = centroidOf(pts);
    const cells = document.querySelectorAll<HTMLElement>('[data-day-iso]');
    let found: string | null = null;
    for (const el of cells) {
      const r = el.getBoundingClientRect();
      if (c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom) {
        found = el.getAttribute('data-day-iso');
        break;
      }
    }
    if (found) this.router.navigate(['/day', found]);
  }

  onPinchEnd(e: PointerEvent): void {
    if (!this.pinch?.ptrs.has(e.pointerId)) return;
    this.pinch.ptrs.delete(e.pointerId);
    if (this.pinch.ptrs.size === 0) this.pinch = null;
  }
}
