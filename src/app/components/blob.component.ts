import { Component, Input, OnChanges, NO_ERRORS_SCHEMA } from '@angular/core';

function dropletPath(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const rng = (i: number) => {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };
  const tilt       = rng(0) * Math.PI * 2;
  const tipSpread  = 0.68 + rng(1) * 0.28;
  const bodyRatio  = 0.44 + rng(2) * 0.14;
  const widthMul   = 0.88 + rng(3) * 0.24;
  const elongation = 0.88 + rng(4) * 0.28;
  const w = rx * widthMul;
  const h = ry * elongation;
  const tipY   = -h;
  const bodyY  = -h + h * bodyRatio * 2;
  const bottomY = h * 0.52;
  const pts: [number, number][] = [[0, tipY], [-w, bodyY], [0, bottomY], [w, bodyY]];
  const cps: [number, number][] = [
    [-w * tipSpread, tipY + (bodyY - tipY) * 0.28], [-w, tipY + (bodyY - tipY) * 0.42],
    [-w, bodyY + (bottomY - bodyY) * 0.72], [-w * 0.38, bottomY],
    [w * 0.38, bottomY], [w, bodyY + (bottomY - bodyY) * 0.72],
    [w, tipY + (bodyY - tipY) * 0.42], [w * tipSpread, tipY + (bodyY - tipY) * 0.28],
  ];
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const tx = ([x, y]: [number, number]) => `${(cx + x * cos - y * sin).toFixed(2)} ${(cy + x * sin + y * cos).toFixed(2)}`;
  return [
    `M ${tx(pts[0])}`,
    `C ${tx(cps[0])}, ${tx(cps[1])}, ${tx(pts[1])}`,
    `C ${tx(cps[2])}, ${tx(cps[3])}, ${tx(pts[2])}`,
    `C ${tx(cps[4])}, ${tx(cps[5])}, ${tx(pts[3])}`,
    `C ${tx(cps[6])}, ${tx(cps[7])}, ${tx(pts[0])}`,
    'Z',
  ].join(' ');
}

@Component({
  selector: '[appBlob]',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <defs>
      <radialGradient [id]="gradId" gradientUnits="userSpaceOnUse"
                      [attr.cx]="gx" [attr.cy]="gy" [attr.r]="gr">
        <stop offset="0%"  [attr.stop-color]="color" stop-opacity="1" />
        <stop offset="80%" [attr.stop-color]="color" stop-opacity="0.58" />
      </radialGradient>
    </defs>
    <path [attr.d]="path" [attr.fill]="'url(#' + gradId + ')'"
          [attr.opacity]="opacity ?? 0.90" />
  `,
})
export class BlobComponent implements OnChanges {
  @Input() cx = 0;
  @Input() cy = 0;
  @Input() color = '#ccc';
  @Input() seed = 0;
  @Input() big = false;
  @Input() opacity: number | null = null;
  @Input() scale = 1;

  gradId = '';
  path = '';
  gx = 0; gy = 0; gr = 0;

  ngOnChanges(): void {
    const rx = (this.big ? 11.0 : 8.5) * this.scale;
    const ry = (this.big ? 10.5 : 8.0) * this.scale;
    this.gradId = `blob-g-${this.seed}-${this.color.replace(/[^a-z0-9]/gi, '')}`;
    this.gx = this.cx - rx * 0.3;
    this.gy = this.cy - ry * 0.4;
    this.gr = Math.max(rx, ry) * 1.45;
    this.path = dropletPath(this.cx, this.cy, rx, ry, this.seed);
  }
}
