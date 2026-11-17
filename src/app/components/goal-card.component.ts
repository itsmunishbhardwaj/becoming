import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Goal } from '../core/types';
import { goalColor } from '../core/goalColor';

export interface EnrichedGoal extends Goal {
  momentum?: number;
  headline?: { n: number; unit: string };
}

const ORB_DELAYS = ['0s', '-2.1s', '-4.4s', '-1.6s', '-3.2s', '-5.7s', '-1.0s', '-3.9s'];

@Component({
  selector: 'app-goal-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.scss',
})
export class GoalCardComponent {
  @Input() goal!: EnrichedGoal;
  @Input() index = 0;

  get color() { return goalColor(this.goal); }
  get dormant() { return this.goal.state === 'dormant' || this.goal.state === 'completed'; }
  get momentum() { return this.goal.momentum ?? 0; }
  get orbDelay() { return this.dormant ? '0s' : ORB_DELAYS[this.index % ORB_DELAYS.length]; }
  get gradient() {
    const c = this.color;
    return `radial-gradient(circle at 35% 30%, ${c}, ${c}99 80%)`;
  }
}
