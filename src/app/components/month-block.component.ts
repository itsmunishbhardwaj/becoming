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

  @Output() dayTap  = new EventEmitter<string>();
  @Output() dayOpen = new EventEmitter<string>();
  @Output() monthOpen = new EventEmitter<number>();
  @Output() setTip  = new EventEmitter<TipData | null>();

  readonly dow = DOW;

  get name()   { return MONTHS_FULL[this.monthIdx]; }
  get short()  { return MONTHS_SHORT[this.monthIdx]; }
  get leadBlanks(): number[] {
    return Array.from({ length: new Date(+this.year, this.monthIdx, 1).getDay() }, (_, i) => i);
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
