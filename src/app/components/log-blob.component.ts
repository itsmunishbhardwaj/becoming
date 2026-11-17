import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-log-blob',
  standalone: true,
  styles: [`
    button {
      position: fixed;
      right: max(22px, calc(env(safe-area-inset-right) + 16px));
      bottom: max(22px, calc(env(safe-area-inset-bottom) + 16px));
      width: 54px; height: 54px;
      border-radius: 67% 33% 52% 48% / 42% 58% 35% 65%;
      background: linear-gradient(135deg, var(--paper-card) 0%, var(--paper-panel) 100%);
      border: 1px solid var(--paper-line);
      box-shadow: 0 6px 20px rgba(0,0,0,0.08);
      color: var(--paper-ink);
      font-size: 27px; font-family: var(--font-sans); font-weight: 300;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
  `],
  template: `<button aria-label="log your day" (click)="clicked.emit()">+</button>`,
})
export class LogBlobComponent {
  @Output() clicked = new EventEmitter<void>();
}
