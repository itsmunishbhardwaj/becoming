import {
  Component, inject, signal, computed, OnInit, ElementRef, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { AuthService } from '../services/auth.service';
import { goalColor } from '../core/goalColor';
import { todayLocalISO } from '../core/date';
import type { Goal, Contract } from '../core/types';

@Component({
  selector: 'app-coach-carter',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './coach-carter.component.html',
  styleUrl: './coach-carter.component.scss',
})
export class CoachCarterComponent implements OnInit {
  readonly store = inject(StoreService);
  readonly auth  = inject(AuthService);

  @ViewChild('sigCanvas', { static: false })
  sigCanvas?: ElementRef<HTMLCanvasElement>;

  // ── view state ──────────────────────────────────────────────────────────
  readonly view              = signal<'main' | 'compose' | 'read'>('main');
  readonly loading           = signal(true);
  readonly goals             = signal<Goal[]>([]);
  readonly contracts         = signal<Contract[]>([]);
  readonly selectedGoalId    = signal<string>('');
  readonly userName          = signal('');
  readonly composingForGoal  = signal<Goal | null>(null);
  readonly readingContract   = signal<Contract | null>(null);

  // ── compose signals ─────────────────────────────────────────────────────
  readonly composingAction  = signal('');
  readonly composingByDate  = signal('');
  readonly composingTerms   = signal('');
  readonly signing          = signal(false);
  readonly capturedSvg      = signal<string | null>(null);
  readonly savingContract   = signal(false);

  // ── computed ─────────────────────────────────────────────────────────────
  readonly selectedGoal = computed<Goal | null>(() =>
    this.goals().find(g => g.id === this.selectedGoalId()) ?? null,
  );

  readonly goalContract = computed<Contract | null>(() => {
    const id = this.selectedGoalId();
    if (!id) return null;
    return this.contracts().find(c => c.goalId === id && !c.retiredAt) ?? null;
  });

  readonly activeGoals = computed<Goal[]>(() =>
    this.goals().filter(g => g.state === 'active' || g.state === 'drift'),
  );

  // ── signature canvas state ───────────────────────────────────────────────
  drawing = false;
  signaturePaths: string[] = [];
  currentPath = '';

  // ── lifecycle ────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    if (!this.store.goalsLoaded()) await this.store.loadGoals();
    this.goals.set(this.store.goals());

    const session = this.auth.session();
    const meta = session?.user?.user_metadata;
    this.userName.set(meta?.['full_name'] || meta?.['name'] || '');

    try {
      const cs = await this.store.listContracts();
      this.contracts.set(cs);
    } catch { /* ignore */ } finally {
      this.loading.set(false);
    }

    if (this.activeGoals().length > 0 && !this.selectedGoalId()) {
      this.selectedGoalId.set(this.activeGoals()[0].id);
    }
  }

  // ── navigation ───────────────────────────────────────────────────────────
  openCompose(goal: Goal): void {
    this.composingForGoal.set(goal);
    this.composingAction.set('');
    this.composingByDate.set(todayLocalISO());
    this.composingTerms.set('');
    this.signing.set(false);
    this.capturedSvg.set(null);
    this.signaturePaths = [];
    this.currentPath = '';
    this.view.set('compose');
  }

  openRead(contract: Contract): void {
    this.readingContract.set(contract);
    this.view.set('read');
  }

  backToMain(): void {
    this.view.set('main');
    this.composingForGoal.set(null);
    this.readingContract.set(null);
    this.signing.set(false);
    this.capturedSvg.set(null);
    this.signaturePaths = [];
    this.currentPath = '';
  }

  // ── retire ───────────────────────────────────────────────────────────────
  async retireContract(contract: Contract): Promise<void> {
    await this.store.retireContract(contract.id);
    this.contracts.update(cs =>
      cs.map(c => c.id === contract.id ? { ...c, retiredAt: new Date().toISOString() } : c),
    );
    this.backToMain();
  }

  // ── signature canvas ─────────────────────────────────────────────────────
  startDraw(e: PointerEvent): void {
    e.preventDefault();
    this.drawing = true;
    const { x, y } = this.getCanvasPos(e);
    this.currentPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    const ctx = this.sigCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  drawSig(e: PointerEvent): void {
    if (!this.drawing) return;
    e.preventDefault();
    const { x, y } = this.getCanvasPos(e);
    this.currentPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    const ctx = this.sigCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2a2015';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  endDraw(): void {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.currentPath) {
      this.signaturePaths.push(this.currentPath);
      this.currentPath = '';
    }
  }

  clearSig(): void {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    this.signaturePaths = [];
    this.capturedSvg.set(null);
  }

  captureSig(): void {
    if (!this.signaturePaths.length) return;
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return;
    const paths = this.signaturePaths
      .map(d => `<path d="${d}" stroke="#2a2015" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">${paths}</svg>`;
    this.capturedSvg.set(svg);
  }

  getCanvasPos(e: PointerEvent): { x: number; y: number } {
    const canvas = this.sigCanvas?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  async handleConfirmSign(): Promise<void> {
    const svg = this.capturedSvg();
    if (!svg || !this.composingForGoal()) return;
    this.savingContract.set(true);
    try {
      const saved = await this.store.saveContract({
        goalId: this.composingForGoal()!.id,
        change: `I will ${this.composingAction().trim()} by ${this.composingByDate().trim()}.`,
        terms: this.composingTerms().trim(),
        signatureSvg: svg,
        signedAt: new Date().toISOString(),
      });
      this.contracts.update(cs => [saved, ...cs.filter(c => c.id !== saved.id)]);
      this.readingContract.set(saved);
      this.view.set('read');
    } finally {
      this.savingContract.set(false);
    }
  }

  // ── utilities ────────────────────────────────────────────────────────────
  goalColor(goal: Goal | null | undefined): string {
    return goalColor(goal);
  }

  goalById(id: string): Goal | undefined {
    return this.goals().find(g => g.id === id);
  }

  contractGoal(contract: Contract): Goal | undefined {
    return this.goalById(contract.goalId);
  }

  longDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  shortDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  todayLong(): string {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  activeContractsForGoal(goalId: string): Contract[] {
    return this.contracts().filter(c => c.goalId === goalId && !c.retiredAt);
  }

  allActiveContracts(): Contract[] {
    return this.contracts().filter(c => !c.retiredAt);
  }

  svgDataUrl(svg: string): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  printContract(): void {
    window.print();
  }

  trackByGoalId(_i: number, g: Goal): string { return g.id; }
  trackByContractId(_i: number, c: Contract): string { return c.id; }
}
