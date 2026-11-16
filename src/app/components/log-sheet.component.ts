import { Component, Input, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { LlmService } from '../services/llm.service';
import { todayLocalISO } from '../core/date';
import { goalColor } from '../core/goalColor';
import { parseLogSmart } from '../core/logParserLLM';
import type { Goal, LogEvent } from '../core/types';

function routeEvent(evt: LogEvent, goals: Goal[]): Goal | null {
  if (evt.verb === 'wake') {
    return goals.find((g) => typeof g.baseline === 'string' && (g.state === 'active' || g.state === 'drift')) ?? null;
  }
  if (evt.verb === 'session') {
    return goals.find((g) => (g.baseline as { intervalDays?: number } | null)?.intervalDays != null && (g.state === 'active' || g.state === 'drift')) ?? null;
  }
  return null;
}

@Component({
  selector: 'app-log-sheet',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './log-sheet.component.html',
  styleUrl: './log-sheet.component.scss',
})
export class LogSheetComponent {
  private store = inject(StoreService);
  private llm   = inject(LlmService);

  @Input() set open(v: boolean) {
    this._open.set(v);
    if (v) { this.text.set(''); this.saving.set(false); this.error.set(null); this.loadGoals(); }
  }
  get open() { return this._open(); }

  @Output() close  = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  private _open  = signal(false);
  readonly text  = signal('');
  readonly goals = signal<Goal[]>([]);
  readonly parsed = signal<LogEvent[]>([]);
  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  goalColor(g: Goal) { return goalColor(g); }

  routedGoal(evt: LogEvent) { return routeEvent(evt, this.goals()); }

  onTextChange(v: string): void {
    this.text.set(v);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.reparse(), 350);
  }

  private async loadGoals(): Promise<void> {
    const gs = await this.store.readLogsInRange({ from: '2000-01-01', to: todayLocalISO() })
      .then(() => this.store.goals());
    this.goals.set(gs.length ? gs : this.store.goals());
  }

  private async reparse(): Promise<void> {
    const { chat, configured } = this.llm;
    const events = await parseLogSmart({
      text: this.text(),
      goals: this.goals(),
      llmChat: configured() ? chat.bind(this.llm) : undefined,
      isConfigured: () => configured(),
    }).catch(() => []);
    this.parsed.set(events);
  }

  async save(): Promise<void> {
    if (!this.text().trim()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const today = todayLocalISO();
      const events = this.parsed();
      if (events.length > 0) {
        for (const evt of events) {
          await this.store.appendLog(today, evt);
        }
      } else {
        await this.store.appendLog(today, { verb: 'note', raw: this.text().trim(), goalId: '' } as unknown as LogEvent);
      }
      this.saved.emit();
      this.close.emit();
    } catch (e) {
      this.error.set('Could not save — try again.');
      this.saving.set(false);
    }
  }
}
