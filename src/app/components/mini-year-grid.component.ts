import { Component, Input, computed, signal } from '@angular/core';
import { goalColor } from '../core/goalColor';
import { todayLocalISO } from '../core/date';
import type { Goal, Log } from '../core/types';

interface Cell { iso: string | null; color: string | null; future: boolean }

@Component({
  selector: 'app-mini-year-grid',
  standalone: true,
  template: `
    <div class="grid">
      @for (week of weeks(); track $index) {
        <div class="col">
          @for (cell of week; track $index) {
            <div class="cell"
                 [style.background]="cell.color || 'var(--paper-track)'"
                 [style.opacity]="cell.color ? 0.8 : (cell.future ? 0.35 : 0.6)">
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; margin-top: 16px; }
    .grid { display: grid; grid-template-columns: repeat(53, 1fr); gap: 2px; }
    .col  { display: flex; flex-direction: column; gap: 2px; }
    .cell { width: 100%; aspect-ratio: 1; border-radius: 1px; }
  `],
})
export class MiniYearGridComponent {
  private _logs = signal<Log[]>([]);
  private _goals = signal<Goal[]>([]);

  @Input() set logs(v: Log[])  { this._logs.set(v); }
  @Input() set goals(v: Goal[]) { this._goals.set(v); }

  readonly weeks = computed<Cell[][]>(() => {
    const year = new Date().getFullYear();
    const today = todayLocalISO();
    const yearFrom = `${year}-01-01`;
    const goals = this._goals();
    const logs = this._logs();

    const dateColors: Record<string, string> = {};
    for (const log of logs) {
      if (log.date < yearFrom || log.date > today) continue;
      for (const evt of log.events) {
        if (!dateColors[log.date]) {
          const g = goals.find((goal) => goal.id === evt.goalId);
          if (g) dateColors[log.date] = goalColor(g);
        }
      }
    }

    const startDow = new Date(year, 0, 1).getDay();
    return Array.from({ length: 53 }, (_, w) =>
      Array.from({ length: 7 }, (_, d): Cell => {
        const offset = w * 7 + d - startDow;
        const dt = new Date(year, 0, 1 + offset);
        if (dt.getFullYear() !== year) return { iso: null, color: null, future: false };
        const iso = `${year}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (iso > today) return { iso, color: null, future: true };
        return { iso, color: dateColors[iso] ?? null, future: false };
      }),
    );
  });
}
