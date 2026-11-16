import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { Goal } from '../core/types';
import { goalColor } from '../core/goalColor';

const HOLD_MS = 500;

@Component({
  selector: 'app-pen-chips',
  standalone: true,
  templateUrl: './pen-chips.component.html',
  styleUrl: './pen-chips.component.scss',
})
export class PenChipsComponent {
  @Input() goals: Goal[] = [];
  @Input() penId: string | null = null;
  @Input() penDayCount: ((g: Goal) => number) | null = null;

  @Output() pick = new EventEmitter<string | null>();
  @Output() holdStart = new EventEmitter<string>();
  @Output() holdEnd = new EventEmitter<void>();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private fired = false;

  goalColor(g: Goal) { return goalColor(g); }

  gradient(g: Goal) {
    const c = goalColor(g);
    return `radial-gradient(circle at 35% 30%, ${c}, ${c}99 80%)`;
  }

  isPen(g: Goal) { return this.penId === g.id; }
  isDimmed(g: Goal) { return !!this.penId && this.penId !== g.id; }

  days(g: Goal) {
    return this.isPen(g) && this.penDayCount ? this.penDayCount(g) : 0;
  }

  startPress(id: string) {
    this.fired = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.fired = true;
      this.holdStart.emit(id);
    }, HOLD_MS);
  }

  endPress() {
    if (this.timer) clearTimeout(this.timer);
    if (this.fired) this.holdEnd.emit();
  }

  onChipClick(g: Goal) {
    if (this.fired) { this.fired = false; return; }
    this.pick.emit(this.isPen(g) ? null : g.id);
  }
}
