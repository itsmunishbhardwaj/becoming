import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { CATS } from '../core/tokens';
import { autoPickColor } from '../core/goalColor';
import { todayLocalISO } from '../core/date';
import { buildRounds } from '../core/goalTypes/simple';
import type { Goal } from '../core/types';
import { ColorWheelComponent } from '../components/color-wheel.component';

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'goal';
}

function endOfYearISO(): string {
  return `${new Date().getFullYear()}-12-31`;
}

@Component({
  selector: 'app-quick-create',
  standalone: true,
  imports: [FormsModule, ColorWheelComponent],
  templateUrl: './quick-create.component.html',
  styleUrl: './quick-create.component.scss',
})
export class QuickCreateComponent implements OnInit {
  private store = inject(StoreService);
  private router = inject(Router);

  readonly CATS = CATS;
  readonly catKeys = Object.keys(CATS);

  name = signal('');
  cat = signal(Object.keys(CATS)[0]);
  colorMode = signal<string>('auto');
  wheelOpen = signal(false);
  endDate = signal(endOfYearISO());
  timeMode = signal<'none' | 'allday' | 'specific'>('none');
  goalTime = signal('');
  ambition = signal('');
  error = signal('');
  saving = signal(false);

  ngOnInit(): void {
    if (!this.store.goalsLoaded()) {
      this.store.loadGoals();
    }
  }

  selectColor(color: string): void {
    this.colorMode.set(color);
  }

  selectAuto(): void {
    this.colorMode.set('auto');
  }

  previewColor(): string {
    if (this.colorMode() === 'auto') {
      return autoPickColor(this.store.goals(), this.cat());
    }
    return this.colorMode();
  }

  async onSubmit(): Promise<void> {
    const n = this.name().trim();
    if (!n) {
      this.error.set('Goal name is required.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    try {
      const startDate = todayLocalISO();
      const end = this.endDate() || endOfYearISO();
      const rounds = buildRounds(null, null, startDate, end);
      const color =
        this.colorMode() === 'auto'
          ? autoPickColor(this.store.goals(), this.cat())
          : this.colorMode();

      const goal: Goal = {
        id: slugify(n),
        name: n,
        cat: this.cat(),
        color,
        type: 'tracker',
        state: 'active',
        baseline: null,
        target: null,
        endDate: end,
        currentRound: 1,
        createdAt: startDate,
        ambition: this.ambition().trim() || n,
        rounds,
        howWeGetThere: '',
        indicators: { right: [], wrong: [], stall: [] },
        goalTime: this.timeMode() === 'allday' ? 'allday' : (this.timeMode() === 'specific' ? this.goalTime() || null : null),
      };

      await this.store.saveGoal(goal);
      this.router.navigate(['/']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Something went wrong.');
      this.saving.set(false);
    }
  }
}
