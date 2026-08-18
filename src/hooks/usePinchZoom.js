import { useRef, useCallback } from "react";
import { centroidOf, distanceOf, classifyPinch } from "../lib/pinchGesture.js";

// onZoom({ direction: "in"|"out", centroid: {x,y} }) fires once per gesture.
// Returns { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, scaleStyle }
// where scaleStyle is a live CSS transform to apply during the pinch.
export function usePinchZoom({ onZoom, cellRefs = null }) {
  const state = useRef(null); // { ptrs: Map<id,{x,y}>, initDist, startMs, fired, scaleEl }
  const scaleRef = useRef(null); // element to scale during gesture

  const getTwo = (ptrs) => {
    const vals = [...ptrs.values()];
    return vals.length >= 2 ? [vals[0], vals[1]] : null;
  };

  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== "touch") return;
    // Ignore taps on interactive ancestors
    if (e.target.closest("button,a,textarea,input")) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (!state.current) {
      state.current = { ptrs: new Map(), initDist: null, startMs: null, fired: false };
    }
    state.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const two = getTwo(state.current.ptrs);
    if (two) {
      state.current.initDist = distanceOf(two);
      state.current.startMs = Date.now();
      state.current.fired = false;
    }
  }, [onZoom]);

  const onPointerMove = useCallback((e) => {
    if (!state.current?.ptrs.has(e.pointerId)) return;
    state.current.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const s = state.current;
    if (s.fired || !s.initDist) return;

    const two = getTwo(s.ptrs);
    if (!two) return;

    const ratio = distanceOf(two) / s.initDist;
    const elapsed = Date.now() - s.startMs;

    // Visual feedback: clamp scale on the shell element
    if (scaleRef.current) {
      const clamped = Math.min(1.4, Math.max(0.8, ratio));
      scaleRef.current.style.transform = `scale(${clamped})`;
      scaleRef.current.style.transition = "none";
    }

    const dir = classifyPinch({ ratio, elapsed });
    if (!dir) return;
    s.fired = true;

    const centroid = centroidOf(two);
    onZoom?.({ direction: dir, centroid });
  }, [onZoom]);

  const _end = useCallback((e) => {
    if (!state.current?.ptrs.has(e.pointerId)) return;
    state.current.ptrs.delete(e.pointerId);
    if (state.current.ptrs.size < 2) {
      // Reset visual scale
      if (scaleRef.current) {
        scaleRef.current.style.transform = "";
        scaleRef.current.style.transition = "";
      }
      if (state.current.ptrs.size === 0) state.current = null;
      else {
        state.current.initDist = null;
        state.current.startMs = null;
      }
    }
  }, []);

  return {
    scaleRef,
    onPointerDown,
    onPointerMove,
    onPointerUp: _end,
    onPointerCancel: _end,
  };
}
