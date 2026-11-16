import { Component, Input, computed, signal } from '@angular/core';
import { CATS, RADIUS } from '../core/tokens';

@Component({
  selector: 'app-orb',
  standalone: true,
  template: `
    <div [style.width.px]="box" [style.height.px]="box"
         style="display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <div [class.orb-breathe]="!dormant"
           [style.width.px]="innerSize"
           [style.height.px]="innerSize"
           [style.border-radius]="RADIUS.blob"
           [style.background]="gradient()"
           [style.opacity]="dormant ? 0.45 : 1"
           [style.view-transition-name]="viewTransitionName || null">
      </div>
    </div>
  `,
})
export class OrbComponent {
  @Input() cat = '';
  @Input() momentum = 0;
  @Input() dormant = false;
  @Input() color = '';
  @Input() size = 60;
  @Input() viewTransitionName = '';

  readonly RADIUS = RADIUS;

  get box() { return this.size; }
  get innerSize() { return this.size * 0.88; }

  gradient() {
    const c = this.color || CATS[this.cat]?.color || '#ccc';
    return `radial-gradient(circle at 35% 30%, ${c}, ${c}99 80%)`;
  }
}
