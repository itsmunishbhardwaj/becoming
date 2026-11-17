import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, OnInit, AfterViewInit, signal, computed,
} from '@angular/core';

const SIZE = 220;
const RING_INNER = 62;
const RING_OUTER = 98;
const RING_CENTER = (RING_INNER + RING_OUTER) / 2;

const SHADES = [
  { s: 28, l: 88 }, { s: 40, l: 76 }, { s: 50, l: 63 },
  { s: 62, l: 52 }, { s: 68, l: 42 }, { s: 70, l: 32 },
];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return [f(0), f(8), f(4)];
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToHue(hex: string): number | null {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  let h: number;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function hexToShadeIdx(hex: string): number {
  if (!hex || hex.length < 7) return 2;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const l = ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
  let best = 2, bestDist = Infinity;
  SHADES.forEach((sh, i) => {
    const dist = Math.abs(sh.l - l);
    if (dist < bestDist) { bestDist = dist; best = i; }
  });
  return best;
}

@Component({
  selector: 'app-color-wheel',
  standalone: true,
  template: `
    <!-- Scrim -->
    <div class="cw-scrim" (click)="closed.emit()"></div>

    <!-- Panel -->
    <div class="cw-panel">
      <div class="cw-header">
        <span class="cw-label">Color</span>
        <button type="button" class="cw-close" (click)="closed.emit()">Close</button>
      </div>

      <div class="cw-wheel-wrap"
           (pointerdown)="onPointerDown($event)"
           (pointermove)="onPointerMove($event)"
           (pointerup)="onPointerUp()">
        <canvas #canvas class="cw-canvas" aria-label="Color wheel — drag to pick a hue"></canvas>

        <!-- Center preview -->
        <div class="cw-center-preview" [style.background]="previewHex()"></div>

        <!-- Selector dot -->
        <div class="cw-dot"
             [style.transform]="'translate(' + (dotX() - 10) + 'px, ' + (dotY() - 10) + 'px)'">
        </div>
      </div>

      <!-- Shade swatches -->
      <div class="cw-shades">
        @for (sh of SHADES; track $index; let i = $index) {
          <button type="button"
                  class="cw-shade"
                  [class.cw-shade--sel]="i === shadeIdx()"
                  [style.background]="shadeHex(i)"
                  (click)="shadeIdx.set(i)">
          </button>
        }
      </div>

      <!-- Confirm -->
      <button type="button" class="cw-confirm"
              [style.background]="previewHex()"
              [style.color]="confirmTextColor()"
              (click)="confirm()">
        Use this color
      </button>
    </div>
  `,
  styles: [`
    .cw-scrim {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.22);
      z-index: 999;
    }
    .cw-panel {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      background: rgba(235,235,235,0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 22px;
      padding: 14px 18px 18px;
      width: 256px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
      font-family: var(--font-sans);
    }
    .cw-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .cw-label {
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--paper-faint);
      font-weight: 500;
    }
    .cw-close {
      padding: 3px 11px;
      border-radius: 5px;
      background: var(--paper-line);
      border: none;
      cursor: pointer;
      font-size: 11px;
      color: var(--paper-dim);
      font-family: var(--font-sans);
    }
    .cw-wheel-wrap {
      position: relative;
      width: 220px;
      height: 220px;
      touch-action: none;
      user-select: none;
      cursor: crosshair;
    }
    .cw-canvas { display: block; }
    .cw-center-preview {
      position: absolute;
      left: 110px; top: 110px;
      transform: translate(-50%, -50%);
      width: 87px; height: 87px;
      border-radius: 50%;
      border: 2.5px solid rgba(255,255,255,0.7);
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      pointer-events: none;
      transition: background 60ms;
    }
    .cw-dot {
      position: absolute;
      left: 0; top: 0;
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 1px 8px rgba(0,0,0,0.28);
      pointer-events: none;
    }
    .cw-shades {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: center;
    }
    .cw-shade {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: none;
      padding: 0;
      cursor: pointer;
      outline: none;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
      transition: box-shadow 100ms;
    }
    .cw-shade--sel {
      box-shadow: 0 0 0 2.5px #fff, 0 0 0 4.5px var(--paper-ink);
    }
    .cw-confirm {
      margin-top: 12px;
      width: 100%;
      padding: 10px 0;
      border-radius: 11px;
      border: none;
      cursor: pointer;
      font-size: 12.5px;
      font-family: var(--font-sans);
      font-weight: 600;
      letter-spacing: 0.05em;
      transition: background 60ms, color 60ms;
    }
  `],
})
export class ColorWheelComponent implements AfterViewInit {
  @Input() set value(v: string) {
    this._hue.set(hexToHue(v) ?? 215);
    this.shadeIdx.set(hexToShadeIdx(v));
  }

  @Output() colorChange = new EventEmitter<string>();
  @Output() closed      = new EventEmitter<void>();

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly SHADES = SHADES;
  readonly SIZE = SIZE;

  readonly _hue      = signal(215);
  readonly shadeIdx  = signal(2);

  readonly previewHex = computed(() =>
    hslToHex(this._hue(), SHADES[this.shadeIdx()].s, SHADES[this.shadeIdx()].l)
  );

  readonly dotX = computed(() => SIZE / 2 + RING_CENTER * Math.cos((this._hue() * Math.PI) / 180));
  readonly dotY = computed(() => SIZE / 2 + RING_CENTER * Math.sin((this._hue() * Math.PI) / 180));

  readonly confirmTextColor = computed(() =>
    SHADES[this.shadeIdx()].l < 52 ? 'rgba(255,255,255,0.92)' : '#2B2B2B'
  );

  private dragging = false;

  ngAfterViewInit(): void {
    this.drawWheel();
  }

  shadeHex(i: number): string {
    return hslToHex(this._hue(), SHADES[i].s, SHADES[i].l);
  }

  confirm(): void {
    this.colorChange.emit(this.previewHex());
    this.closed.emit();
  }

  onPointerDown(e: PointerEvent): void {
    const h = this.hueFromPointer(e);
    if (h === null) return;
    this.dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this._hue.set(h);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const h = this.hueFromPointer(e);
    if (h !== null) this._hue.set(h);
  }

  onPointerUp(): void { this.dragging = false; }

  private hueFromPointer(e: PointerEvent): number | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - SIZE / 2;
    const dy = e.clientY - rect.top  - SIZE / 2;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < RING_INNER * 0.5 || r > RING_OUTER * 1.3) return null;
    return ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  }

  private drawWheel(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const phys = Math.round(SIZE * dpr);
    canvas.width = phys;
    canvas.height = phys;
    canvas.style.width  = SIZE + 'px';
    canvas.style.height = SIZE + 'px';

    const img = ctx.createImageData(phys, phys);
    const d = img.data;
    const cx = phys / 2, cy = phys / 2;
    const innerPx = RING_INNER * dpr;
    const outerPx = RING_OUTER * dpr;
    const feather = 2.5 * dpr;

    for (let py = 0; py < phys; py++) {
      for (let px = 0; px < phys; px++) {
        const ddx = px - cx, ddy = py - cy;
        const r = Math.sqrt(ddx * ddx + ddy * ddy);
        if (r < innerPx - feather || r > outerPx + feather) continue;

        const h = ((Math.atan2(ddy, ddx) * 180) / Math.PI + 360) % 360;
        const [rv, gv, bv] = hslToRgb(h, 62, 56);

        let alpha = 255;
        if (r < innerPx + feather) alpha = Math.round(255 * (r - (innerPx - feather)) / (feather * 2));
        if (r > outerPx - feather) alpha = Math.round(255 * ((outerPx + feather) - r) / (feather * 2));
        alpha = Math.max(0, Math.min(255, alpha));

        const idx = (py * phys + px) * 4;
        d[idx] = rv; d[idx + 1] = gv; d[idx + 2] = bv; d[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}
