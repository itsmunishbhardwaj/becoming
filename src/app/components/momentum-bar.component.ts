import { Component, Input } from '@angular/core';
import { CATS } from '../core/tokens';

@Component({
  selector: 'app-momentum-bar',
  standalone: true,
  template: `
    <div style="height:4px;border-radius:2px;background:var(--paper-trough);overflow:hidden;margin-top:14px">
      <div [style.width]="(momentum * 100) + '%'"
           [style.height.%]="100"
           [style.border-radius.px]="2"
           [style.background]="fill()"
           style="transition:width 400ms cubic-bezier(0.23,1,0.32,1)">
      </div>
    </div>
  `,
})
export class MomentumBarComponent {
  @Input() cat = '';
  @Input() momentum = 0;
  @Input() dormant = false;
  @Input() color = '';

  fill() {
    const c = this.color || CATS[this.cat]?.color || '#ccc';
    return this.dormant
      ? `${c}44`
      : `linear-gradient(90deg, ${c}99, ${c})`;
  }
}
