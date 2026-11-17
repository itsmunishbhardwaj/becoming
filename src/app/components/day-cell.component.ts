import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import type { Goal, AdherenceStatus } from '../core/types';
import { goalColor } from '../core/goalColor';
import { BlobComponent } from './blob.component';

interface BlobMark {
  g: Goal;
  status: string;
  op: number;
  color: string;
  cx: number;
  cy: number;
  seed: number;
  big: boolean;
}

export interface TipData {
  month: string; day: number; iso: string;
  marks: { g: Goal; status: string }[];
}

@Component({
  selector: 'app-day-cell',
  standalone: true,
  imports: [BlobComponent],
  templateUrl: './day-cell.component.html',
})
export class DayCellComponent implements OnChanges {
  @Input() monthIdx = 0;
  @Input() monthName = '';
  @Input() dayIdx = 0;
  @Input() isoDate = '';
  @Input() goals: Goal[] = [];
  @Input() adherenceMaps: Record<string, Record<string, AdherenceStatus>> = {};
  @Input() focus: Goal | null = null;
  @Input() pen: Goal | null = null;
  @Input() isToday = false;
  @Input() showHalo = false;
  @Input() blobScale = 1;
  @Input() hideDayNumber = false;
  @Input() viewTransitionId = '';
  @Input() projectedDates: Set<string> = new Set();

  @Output() toggle = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();
  @Output() setTip = new EventEmitter<TipData | null>();

  readonly size = 26;
  readonly c = 13;
  readonly Math = Math;

  marks: BlobMark[] = [];
  hasContent = false;
  showText = false;

  ngOnChanges(): void {
    const c = this.c;
    const visible = this.pen ? this.goals.filter((g) => g.id === this.pen!.id) : this.goals;
    const raw = visible.map((g) => {
      const map = this.adherenceMaps[g.id] || {};
      const status = (map[this.isoDate] || 'none') as AdherenceStatus | 'projected';
      const isProjected = (status === 'none' || status === 'clean')
        && g.id === this.pen?.id && this.projectedDates.has(this.isoDate);
      return { g, status: isProjected ? 'projected' : status };
    }).filter(({ status }) => status !== 'none' && status !== 'clean');

    this.marks = raw.map(({ g, status }, i) => {
      const ang = (i / Math.max(raw.length, 1)) * Math.PI * 2 + i;
      const off = raw.length > 1 ? 2 : 0;
      const faded = this.focus && g.id !== this.focus.id;
      const op = status === 'projected' ? 0.1
        : (faded ? 0.15 : 1) * (status === 'soft' ? 0.55 : 0.85);
      return {
        g, status, op,
        color: goalColor(g),
        cx: c + Math.cos(ang) * off,
        cy: c + Math.sin(ang) * off,
        seed: (this.dayIdx + 1) + i * 31,
        big: raw.length === 1,
      };
    });

    this.hasContent = this.marks.length > 0;
    this.showText = !this.hasContent && !this.hideDayNumber;
  }

  emitTip(): void {
    this.setTip.emit({
      month: this.monthName, day: this.dayIdx + 1, iso: this.isoDate,
      marks: this.marks.map(({ g, status }) => ({ g, status })),
    });
  }

  onDblClick(e: MouseEvent): void {
    e.stopPropagation();
    this.open.emit();
  }
}
