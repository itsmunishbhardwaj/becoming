import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { Goal, AdherenceStatus } from '../core/types';
import { DayCellComponent, type TipData } from './day-cell.component';

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['S','M','T','W','T','F','S'];

@Component({
  selector: 'app-month-block',
  standalone: true,
  imports: [DayCellComponent],
  templateUrl: './month-block.component.html',
  styleUrl: './month-block.component.scss',
})
export class MonthBlockComponent {
  @Input() year = new Date().getFullYear().toString();
  @Input() monthIdx = 0;
  @Input() goals: Goal[] = [];
  @Input() adherenceMaps: Record<string, Record<string, AdherenceStatus>> = {};
  @Input() focus: Goal | null = null;
  @Input() pen: Goal | null = null;
  @Input() todayISO = '';
  @Input() showHalo = false;
  @Input() blobScale = 1;
  @Input() projectedDates: Set<string> | null = null;
  @Input() showWeekPills = false;

  @Output() dayTap      = new EventEmitter<string>();
  @Output() dayOpen     = new EventEmitter<string>();
  @Output() monthOpen   = new EventEmitter<number>();
  @Output() setTip      = new EventEmitter<TipData | null>();
  @Output() weekPillClick = new EventEmitter<string>();

  readonly dow = DOW;
  readonly emptySet = new Set<string>();

  get name()   { return MONTHS_FULL[this.monthIdx]; }
  get short()  { return MONTHS_SHORT[this.monthIdx]; }

  get leadCount(): number {
    return new Date(+this.year, this.monthIdx, 1).getDay();
  }

  get weeks(): { cells: { iso: string; dayIdx: number }[]; sundayISO: string }[] {
    const count = new Date(+this.year, this.monthIdx + 1, 0).getDate();
    const lead = this.leadCount;
    const totalSlots = Math.ceil((lead + count) / 7) * 7;
    const weeks: { cells: { iso: string; dayIdx: number }[]; sundayISO: string }[] = [];
    for (let r = 0; r < totalSlots / 7; r++) {
      const cells: { iso: string; dayIdx: number }[] = [];
      let sundayISO = '';
      for (let c = 0; c < 7; c++) {
        const i = r * 7 + c - lead;
        if (i < 0 || i >= count) { cells.push({ iso: '', dayIdx: -1 }); continue; }
        const mm = String(this.monthIdx + 1).padStart(2, '0');
        const dd = String(i + 1).padStart(2, '0');
        const iso = `${this.year}-${mm}-${dd}`;
        if (c === 0) sundayISO = iso;
        cells.push({ iso, dayIdx: i });
      }
      if (!sundayISO) {
        // find first real cell's sunday
        const first = cells.find((x) => x.iso);
        if (first) {
          const d = new Date(first.iso + 'T00:00:00');
          d.setDate(d.getDate() - d.getDay());
          sundayISO = d.toISOString().slice(0, 10);
        }
      }
      weeks.push({ cells, sundayISO });
    }
    return weeks;
  }

  // Flat list for calendar view (no week pills)
  get leadBlanks(): number[] {
    return Array.from({ length: this.leadCount }, (_, i) => i);
  }
  get dayCells(): { iso: string; dayIdx: number }[] {
    const count = new Date(+this.year, this.monthIdx + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const mm = String(this.monthIdx + 1).padStart(2, '0');
      const dd = String(i + 1).padStart(2, '0');
      return { iso: `${this.year}-${mm}-${dd}`, dayIdx: i };
    });
  }
}
