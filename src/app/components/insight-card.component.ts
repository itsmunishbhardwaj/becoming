import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { InsightQuestion } from '../core/types';

@Component({
  selector: 'app-insight-card',
  standalone: true,
  styles: [`
    :host { display: block; }
    .insight-card {
      background: linear-gradient(135deg, #EFEAF6 0%, #EDF1EA 100%);
      border: 1px solid var(--paper-line);
      border-radius: 18px 23px 17px 22px;
      padding: 17px 20px;
      font-family: var(--font-sans);
    }
    .kicker {
      font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase;
      color: var(--paper-dim); font-weight: 500; margin-bottom: 8px;
    }
    p { font-size: 14.5px; line-height: 1.6; color: var(--paper-ink); margin: 0 0 12px; }
    .pills { display: flex; gap: 8px; }
    button {
      background: var(--paper-card); border: 1px solid var(--paper-line);
      border-radius: 999px; padding: 8px 15px;
      font-size: 12.5px; font-family: var(--font-sans);
      color: var(--paper-ink); cursor: pointer;
    }
  `],
  template: `
    @if (question) {
      <div class="insight-card">
        <div class="kicker">{{ question.kicker.toUpperCase() }}</div>
        <p>{{ question.text }}</p>
        <div class="pills">
          <button (click)="answer.emit({ id: question!.id, choice: 'yes' })">{{ question.yes.label }}</button>
          <button (click)="answer.emit({ id: question!.id, choice: 'no' })">{{ question.no.label }}</button>
        </div>
      </div>
    }
  `,
})
export class InsightCardComponent {
  @Input() question: InsightQuestion | null = null;
  @Output() answer = new EventEmitter<{ id: string; choice: 'yes' | 'no' }>();
}
