/**
 * useViewport — pan + zoom state for the tree canvas.
 *
 * World-to-screen contract:
 *
 *   screen_x = world_x * scale + x
 *   world_x  = (screen_x - x) / scale
 *
 * Zoom is anchored on the cursor: after applying ``factor``, the
 * world point under the cursor remains under the cursor — the
 * standard Mathematica/Figma feel rather than "zoom into top-left".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** Sprint-12 viewport tuning.
 *
 * The Sprint-7 defaults (zoom 0.0015, pan 1:1, max-scale 3x) felt
 * sluggish on large v3 trees. The user explicitly asked for higher
 * sensitivity. Bumps:
 *
 *  - ``WHEEL_SENSITIVITY``: 0.0015 -> 0.0040 (~2.7x snappier)
 *  - ``PAN_GAIN``: 1.0 -> 1.4 (drag traverses more screen per pixel)
 *  - ``MIN_SCALE``: 0.2 -> 0.15 (more zoom-out room for 200+ node trees)
 *  - ``MAX_SCALE``: 3.0 -> Infinity (zoom in arbitrarily for inspection)
 */
const MIN_SCALE = 0.15;
const MAX_SCALE = Number.POSITIVE_INFINITY;
const WHEEL_SENSITIVITY = 0.0040;
/** Pan-delta gain — screen-space mouse delta multiplied by this before
 * being applied to the viewport translation. > 1 means dragging feels
 * faster than 1:1. */
const PAN_GAIN = 1.4;
/** Pixels of motion before a pointerdown counts as a drag rather
 * than a click. Tuned so single-click selection still feels snappy. */
export const DRAG_THRESHOLD_PX = 4;

interface UseViewportOpts {
  /** Element the viewport drives. We attach native listeners here so
   * we can use ``passive: false`` on the wheel handler — React's
   * synthetic events forbid preventDefault on passive listeners. */
  containerRef: React.RefObject<HTMLElement>;
}

export function useViewport({ containerRef }: UseViewportOpts) {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Pan drag state — kept in a ref because mid-drag we update many
  // times per frame and don't want a render storm.
  const panRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startVx: number;
    startVy: number;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startVx: 0,
    startVy: 0,
  });

  // ----- Wheel -----------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setViewport((vp) => {
        const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
        const newScale = clamp(vp.scale * factor, MIN_SCALE, MAX_SCALE);
        if (newScale === vp.scale) return vp;
        // Keep the world point under the cursor stationary.
        // world coords of cursor (pre-zoom): (cx - vp.x) / vp.scale
        // We want: (cx - newX) / newScale === (cx - vp.x) / vp.scale
        // => newX = cx - newScale / vp.scale * (cx - vp.x)
        const ratio = newScale / vp.scale;
        const newX = cx - ratio * (cx - vp.x);
        const newY = cy - ratio * (cy - vp.y);
        return { x: newX, y: newY, scale: newScale };
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef]);

  // ----- Pan -------------------------------------------------------

  const beginPan = useCallback((clientX: number, clientY: number) => {
    panRef.current.active = true;
    panRef.current.startClientX = clientX;
    panRef.current.startClientY = clientY;
    setViewport((vp) => {
      panRef.current.startVx = vp.x;
      panRef.current.startVy = vp.y;
      return vp;
    });
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!panRef.current.active) return;
      const dx = (e.clientX - panRef.current.startClientX) * PAN_GAIN;
      const dy = (e.clientY - panRef.current.startClientY) * PAN_GAIN;
      setViewport((vp) => ({
        ...vp,
        x: panRef.current.startVx + dx,
        y: panRef.current.startVy + dy,
      }));
    };
    const onUp = () => {
      panRef.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // ----- Fit-to-content -------------------------------------------

  const fitTo = useCallback(
    (bbox: { width: number; height: number }, padding = 32) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (bbox.width === 0 || bbox.height === 0) return;
      const sx = (rect.width - 2 * padding) / bbox.width;
      const sy = (rect.height - 2 * padding) / bbox.height;
      const scale = clamp(Math.min(sx, sy, 1), MIN_SCALE, MAX_SCALE);
      // Center the bbox in the viewport.
      const x = (rect.width - bbox.width * scale) / 2;
      const y = (rect.height - bbox.height * scale) / 2;
      setViewport({ x, y, scale });
    },
    [containerRef],
  );

  /** Center the viewport on a world coordinate without changing scale. */
  const centerOnWorld = useCallback(
    (wx: number, wy: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setViewport((vp) => ({
        ...vp,
        x: rect.width / 2 - wx * vp.scale,
        y: rect.height / 2 - wy * vp.scale,
      }));
    },
    [containerRef],
  );

  return {
    viewport,
    setViewport,
    beginPan,
    isPanning: () => panRef.current.active,
    fitTo,
    centerOnWorld,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
