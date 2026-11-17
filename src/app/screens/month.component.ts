import {
  Component, inject, signal, computed, effect, OnInit, DestroyRef, HostListener,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { dailyAdherence } from '../core/adherence';
import { planDayTap } from '../core/dayTap';
import { projectedDates as computeProjectedDates } from '../core/projection';
import { todayLocalISO } from '../core/date';
import { classifySwipe } from '../core/swipe';
import { centroidOf, distanceOf, classifyPinch } from '../core/pinchGesture';
import type { Goal, Log, AdherenceStatus, LogEvent } from '../core/types';
import { MonthBlockComponent } from '../components/month-block.component';
import { PenChipsComponent } from '../components/pen-chips.component';

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function parseYYYYMM(raw: string): { year: string; monthIdx: number } | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = m[1];
  const monthIdx = parseInt(m[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return { year, monthIdx };
}

function monthRangeISO(year: string, monthIdx: number): { from: string; to: string } {
  const mm = String(monthIdx + 1).padStart(2, '0');
  const lastDay = new Date(+year, monthIdx + 1, 0).getDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

function offsetMonth(year: string, monthIdx: number, delta: number): string {
  const d = new Date(+year, monthIdx + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Component({
  selector: 'app-month',
  standalone: true,
  imports: [RouterLink, MonthBlockComponent, PenChipsComponent],
  templateUrl: './month.component.html',
  styleUrl: './month.component.scss',
})
export class MonthComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private store   = inject(StoreService);
  private destroy = inject(DestroyRef);

  readonly todayISO = todayLocalISO();

  // ── Parsed route param ─────────────────────────────────────────────────
  readonly year      = signal<string>(new Date().getFullYear().toString());
  readonly monthIdx  = signal<number>(new Date().getMonth());

  get monthName() { return MONTHS_FULL[this.monthIdx()]; }

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

  // ── Adherence ──────────────────────────────────────────────────────────
  readonly adherenceMaps = computed<Record<string, Record<string, AdherenceStatus>>>(() => {
    const { from, to } = monthRangeISO(this.year(), this.monthIdx());
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
    const { from, to } = monthRangeISO(this.year(), this.monthIdx());
    const dates = computeProjectedDates({ goal: p, from, to });
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

  // ── Slide animation ────────────────────────────────────────────────────
  readonly slideClass = signal<'month-slide-next' | 'month-slide-prev' | ''>('');

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
        const raw = params['month'] ?? params['yyyymm'] ?? '';
        const parsed = parseYYYYMM(raw);
        if (parsed) {
          this.year.set(parsed.year);
          this.monthIdx.set(parsed.monthIdx);
        } else {
          const now = new Date();
          this.year.set(now.getFullYear().toString());
          this.monthIdx.set(now.getMonth());
        }
        // Pick up pen from query param on first load
        const penQ = this.route.snapshot.queryParamMap.get('pen');
        if (penQ && !this.penId()) this.penId.set(penQ);

        await this.refreshLogs();
      });
  }

  private async refreshLogs(): Promise<void> {
    const { from, to } = monthRangeISO(this.year(), this.monthIdx());
    const ls = await this.store.readLogsInRange({ from, to });
    this.rawLogs.set(ls);
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  navigate(delta: -1 | 1): void {
    this.slideClass.set(delta === 1 ? 'month-slide-next' : 'month-slide-prev');
    setTimeout(() => this.slideClass.set(''), 220);
    const next = offsetMonth(this.year(), this.monthIdx(), delta);
    const q = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/month', next], { queryParams: q });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  this.navigate(-1);
    if (e.key === 'ArrowRight') this.navigate(1);
  }

  // ── View pills ─────────────────────────────────────────────────────────

  goToCalendar(): void {
    const q = this.penId() ? { pen: this.penId() } : {};
    this.router.navigate(['/calendar'], { queryParams: q });
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

  onMonthOpen(_idx: number): void {
    // already on this month — no-op
  }

  // ── Week pill click → /week/:sundayISO ─────────────────────────────────

  onWeekPillClick(sundayISO: string): void {
    this.router.navigate(['/week', sundayISO]);
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
    const dx = t.clientX - this.swipe.x0;
    const dy = t.clientY - this.swipe.y0;
    const dtMs = Date.now() - this.swipe.t0;
    this.swipe = null;
    const dir = classifySwipe({ dx, dy, dtMs });
    if (dir === 'next') this.navigate(1);
    else if (dir === 'prev') this.navigate(-1);
  }

  // ── Pinch → navigate out ───────────────────────────────────────────────

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
      // pinch-out → go to /calendar
      const q = this.penId() ? { pen: this.penId() } : {};
      this.router.navigate(['/calendar'], { queryParams: q });
      return;
    }

    // pinch-in → find week pill under centroid → /week/:sundayISO
    const c = centroidOf(pts);
    const pills = document.querySelectorAll<HTMLElement>('[data-week-pill]');
    let found: string | null = null;
    for (const el of pills) {
      const r = el.getBoundingClientRect();
      if (c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom) {
        found = el.getAttribute('data-week-pill');
        break;
      }
    }
    if (found) this.router.navigate(['/week', found]);
  }

  onPinchEnd(e: PointerEvent): void {
    if (!this.pinch?.ptrs.has(e.pointerId)) return;
    this.pinch.ptrs.delete(e.pointerId);
    if (this.pinch.ptrs.size === 0) this.pinch = null;
  }
}
