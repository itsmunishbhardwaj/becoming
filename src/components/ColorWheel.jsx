import { useEffect, useRef, useState, useCallback } from "react";
import { PAPER, FONT, RADIUS } from "../tokens.js";

const SIZE = 220;
const RING_INNER = 62;
const RING_OUTER = 98;
const RING_CENTER = (RING_INNER + RING_OUTER) / 2;

// 6 intensity presets — same hue, light → dark
const SHADES = [
  { s: 28, l: 88 },
  { s: 40, l: 76 },
  { s: 50, l: 63 },
  { s: 62, l: 52 },
  { s: 68, l: 42 },
  { s: 70, l: 32 },
];

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return [f(0), f(8), f(4)];
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToHue(hex) {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function hexToShadeIdx(hex) {
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

export default function ColorWheel({ value, onChange, onClose }) {
  const canvasRef = useRef(null);
  const [hue, setHue] = useState(() => hexToHue(value) ?? 215);
  const [shadeIdx, setShadeIdx] = useState(() => hexToShadeIdx(value));
  const dragging = useRef(false);

  const previewHex = hslToHex(hue, SHADES[shadeIdx].s, SHADES[shadeIdx].l);

  // Draw single smooth hue ring once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !ctx.createImageData) return;

    const dpr = window.devicePixelRatio || 1;
    const phys = Math.round(SIZE * dpr);
    canvas.width = phys;
    canvas.height = phys;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";

    const img = ctx.createImageData(phys, phys);
    const d = img.data;
    const cx = phys / 2, cy = phys / 2;
    const innerPx = RING_INNER * dpr;
    const outerPx = RING_OUTER * dpr;
    const feather = 2.5 * dpr;

    for (let py = 0; py < phys; py++) {
      for (let px = 0; px < phys; px++) {
        const dx = px - cx, dy = py - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < innerPx - feather || r > outerPx + feather) continue;

        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const [rv, gv, bv] = hslToRgb(h, 62, 56);

        let alpha = 255;
        if (r < innerPx + feather) alpha = Math.round(255 * (r - (innerPx - feather)) / (feather * 2));
        if (r > outerPx - feather) alpha = Math.round(255 * ((outerPx + feather) - r) / (feather * 2));
        alpha = Math.max(0, Math.min(255, alpha));

        const i = (py * phys + px) * 4;
        d[i] = rv; d[i + 1] = gv; d[i + 2] = bv; d[i + 3] = alpha;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, []);

  const hueFromPointer = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dx = clientX - rect.left - SIZE / 2;
    const dy = clientY - rect.top - SIZE / 2;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < RING_INNER * 0.5 || r > RING_OUTER * 1.3) return null;
    return ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  }, []);

  const onPointerDown = useCallback((e) => {
    const h = hueFromPointer(e.clientX, e.clientY);
    if (h === null) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHue(h);
  }, [hueFromPointer]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const h = hueFromPointer(e.clientX, e.clientY);
    if (h !== null) setHue(h);
  }, [hueFromPointer]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const confirm = useCallback(() => {
    onChange?.(previewHex);
    onClose?.();
  }, [onChange, previewHex, onClose]);

  const angle = (hue * Math.PI) / 180;
  const dotX = SIZE / 2 + RING_CENTER * Math.cos(angle);
  const dotY = SIZE / 2 + RING_CENTER * Math.sin(angle);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.22)", zIndex: 999 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        background: "rgba(235,235,235,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 22,
        padding: "14px 18px 18px",
        width: SIZE + 36,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        fontFamily: FONT.sans,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{
            fontSize: 10, letterSpacing: "0.22em",
            textTransform: "uppercase", color: PAPER.faint, fontWeight: 500,
          }}>
            Color
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "3px 11px", borderRadius: 5,
              background: PAPER.line, border: "none",
              cursor: "pointer", fontSize: 11,
              color: PAPER.dim, fontFamily: FONT.sans,
            }}
          >
            Close
          </button>
        </div>

        {/* Wheel */}
        <div style={{ position: "relative", width: SIZE, height: SIZE }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: "crosshair", display: "block", touchAction: "none", userSelect: "none" }}
            aria-label="Color wheel — drag to pick a hue"
          />

          {/* Center preview */}
          <div style={{
            position: "absolute", left: SIZE / 2, top: SIZE / 2,
            transform: "translate(-50%, -50%)",
            width: RING_INNER * 1.4, height: RING_INNER * 1.4,
            borderRadius: "50%",
            background: previewHex,
            border: `2.5px solid rgba(255,255,255,0.7)`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            pointerEvents: "none",
            transition: "background 0.06s",
          }} />

          {/* Selector dot */}
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: 20, height: 20, borderRadius: "50%",
            transform: `translate(${dotX - 10}px, ${dotY - 10}px)`,
            background: hslToHex(hue, 62, 56),
            border: "3px solid #fff",
            boxShadow: "0 1px 8px rgba(0,0,0,0.28)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Shade swatches — same hue, 6 intensities */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          {SHADES.map((sh, i) => {
            const hex = hslToHex(hue, sh.s, sh.l);
            const sel = i === shadeIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setShadeIdx(i)}
                aria-pressed={sel}
                style={{
                  width: 32, height: 32,
                  borderRadius: RADIUS.blob,
                  background: hex,
                  border: "none", padding: 0, cursor: "pointer", outline: "none",
                  boxShadow: sel
                    ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${PAPER.ink}`
                    : `inset 0 0 0 1px rgba(0,0,0,0.08)`,
                  transition: "box-shadow 0.1s",
                }}
              />
            );
          })}
        </div>

        {/* Confirm */}
        <button
          type="button"
          onClick={confirm}
          style={{
            marginTop: 12, width: "100%",
            padding: "10px 0",
            borderRadius: 11,
            background: previewHex,
            border: "none", cursor: "pointer",
            fontSize: 12.5, fontFamily: FONT.sans, fontWeight: 600,
            color: SHADES[shadeIdx].l < 52 ? "rgba(255,255,255,0.92)" : PAPER.ink,
            letterSpacing: "0.05em",
            transition: "background 0.06s, color 0.06s",
          }}
        >
          Use this color
        </button>
      </div>
    </>
  );
}
