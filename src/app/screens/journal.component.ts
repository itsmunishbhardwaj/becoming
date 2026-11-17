import {
  Component, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { goalColor } from '../core/goalColor';
import { todayLocalISO } from '../core/date';
import type { Goal, JournalEntry } from '../core/types';

const PROMPTS = [
  { key: 'highlight', label: 'Highlight of the day' },
  { key: 'remember',  label: 'Something to remember' },
];

function formatEntryDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const DRAFT_KEY = 'journal-draft';

interface DraftData {
  text: string;
  prompt: string | null;
  date: string;
  goalIds: string[];
}

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss',
})
export class JournalComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private store   = inject(StoreService);
  private destroy = inject(DestroyRef);

  readonly PROMPTS = PROMPTS;

  // ── Composer state ────────────────────────────────────────────────────────
  readonly text        = signal('');
  readonly activePrompt = signal<string | null>(null);
  readonly date        = signal(todayLocalISO());
  readonly goalIds     = signal<string[]>([]);
  readonly saving      = signal(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  readonly filterGoalId  = signal<string>('');
  readonly filterPrompt  = signal<string>('');

  // ── Entries ───────────────────────────────────────────────────────────────
  readonly entries    = signal<JournalEntry[]>([]);
  readonly loading    = signal(true);

  // ── Expand / confirm-delete ───────────────────────────────────────────────
  private expandedIds    = signal<Set<string>>(new Set());
  private confirmingIds  = signal<Set<string>>(new Set());

  // ── Goals ─────────────────────────────────────────────────────────────────
  readonly goals       = this.store.goals;
  readonly goalsLoaded = this.store.goalsLoaded;

  readonly activeGoals = computed(() =>
    this.goals().filter((g) => g.state === 'active'),
  );

  // ── Filtered entries ──────────────────────────────────────────────────────
  readonly filteredEntries = computed(() => {
    const gid = this.filterGoalId();
    const p   = this.filterPrompt();
    return this.entries().filter((e) => {
      if (gid && !e.goalIds.includes(gid)) return false;
      if (p   && e.prompt !== p)           return false;
      return true;
    });
  });

  readonly hasFilters = computed(() =>
    !!this.filterGoalId() || !!this.filterPrompt(),
  );

  // ── Debounce handle ───────────────────────────────────────────────────────
  private draftTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    if (!this.goalsLoaded()) await this.store.loadGoals();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => {
        const qGoal = params['goal'] as string | undefined;
        if (qGoal) {
          this.goalIds.set([qGoal]);
        } else {
          this.restoreDraft();
        }
      });

    await this.loadEntries();
  }

  private restoreDraft(): void {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft: DraftData = JSON.parse(raw);
      this.text.set(draft.text ?? '');
      this.activePrompt.set(draft.prompt ?? null);
      this.date.set(draft.date ?? todayLocalISO());
      this.goalIds.set(draft.goalIds ?? []);
    } catch {}
  }

  private scheduleDraftSave(): void {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.persistDraft(), 800);
  }

  private persistDraft(): void {
    try {
      const d: DraftData = {
        text:    this.text(),
        prompt:  this.activePrompt(),
        date:    this.date(),
        goalIds: this.goalIds(),
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  }

  private clearDraft(): void {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }

  private async loadEntries(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.store.listJournal({});
      this.entries.set(list);
    } catch {}
    this.loading.set(false);
  }

  // ── Composer handlers ─────────────────────────────────────────────────────

  onTextChange(value: string): void {
    this.text.set(value);
    this.scheduleDraftSave();
  }

  togglePrompt(key: string): void {
    this.activePrompt.update((p) => (p === key ? null : key));
    this.scheduleDraftSave();
  }

  onDateChange(value: string): void {
    this.date.set(value);
    this.scheduleDraftSave();
  }

  toggleGoalTag(id: string): void {
    this.goalIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    this.scheduleDraftSave();
  }

  async save(): Promise<void> {
    if (!this.text().trim() || this.saving()) return;
    this.saving.set(true);
    try {
      const entry = await this.store.saveJournal({
        date:    this.date(),
        text:    this.text().trim(),
        prompt:  this.activePrompt(),
        goalIds: this.goalIds(),
      });
      this.entries.update((es) => [entry, ...es]);
      this.text.set('');
      this.activePrompt.set(null);
      this.date.set(todayLocalISO());
      this.goalIds.set([]);
      this.clearDraft();
    } catch {}
    this.saving.set(false);
  }

  // ── Entry actions ─────────────────────────────────────────────────────────

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: string): void {
    this.expandedIds.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isConfirming(id: string): boolean {
    return this.confirmingIds().has(id);
  }

  startDelete(id: string): void {
    this.confirmingIds.update((s) => { const n = new Set(s); n.add(id); return n; });
  }

  cancelDelete(id: string): void {
    this.confirmingIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  async confirmDelete(id: string): Promise<void> {
    try {
      await this.store.deleteJournal(id);
      this.entries.update((es) => es.filter((e) => e.id !== id));
      this.confirmingIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch {}
  }

  clearFilters(): void {
    this.filterGoalId.set('');
    this.filterPrompt.set('');
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  goalById(id: string): Goal | undefined {
    return this.goals().find((g) => g.id === id);
  }

  goalColor(goal: Goal | undefined): string {
    return goalColor(goal);
  }

  formatDate(iso: string): string {
    return formatEntryDate(iso);
  }

  promptLabel(key: string | null): string {
    if (!key) return '';
    return PROMPTS.find((p) => p.key === key)?.label ?? key;
  }

  isLong(text: string): boolean {
    return text.length > 220 || text.split('\n').length > 3;
  }
}
