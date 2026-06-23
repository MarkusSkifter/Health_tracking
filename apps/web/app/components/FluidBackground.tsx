"use client";

import { useEffect, useRef } from "react";

/* Ambient topographic field — faint elevation contours anchored in the
   upper-right, evoking the terrain endurance athletes train on. Static,
   low-contrast, and faded out before it reaches the content. */

const INK = "6,6,8";

// A contour ring's radius wobbles with angle via summed harmonics, so the
// nested rings read like real elevation lines rather than plain circles.
function ringRadius(base: number, angle: number, seed: number): number {
  return (
    base +
    Math.sin(angle * 2 + seed) * (base * 0.06) +
    Math.sin(angle * 3 + seed * 1.7) * (base * 0.04) +
    Math.cos(angle * 5 + seed * 0.5) * (base * 0.02)
  );
}

export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Summit sits just off the top-right corner.
      const cx = W * 0.92;
      const cy = H * 0.02;
      const maxR = Math.max(W, H) * 0.62;
      const rings = 16;

      for (let r = 0; r < rings; r++) {
        const t = r / (rings - 1);
        const base = maxR * (0.12 + t * 0.88);
        // Inner rings (the summit) lean signal-green; outer rings cool to steel.
        const green = t < 0.5;
        const rgb = green ? "29,158,117" : "55,138,221";
        const alpha = 0.05 * (1 - t * 0.55);

        ctx.beginPath();
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const rad = ringRadius(base, a, r * 1.3);
          const x = cx + Math.cos(a) * rad;
          const y = cy + Math.sin(a) * rad;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Vertical fade — keep contours faint up top, fully dark below.
      const vOverlay = ctx.createLinearGradient(0, 0, 0, H);
      vOverlay.addColorStop(0.0, `rgba(${INK},0.10)`);
      vOverlay.addColorStop(0.22, `rgba(${INK},0.45)`);
      vOverlay.addColorStop(0.5, `rgba(${INK},0.9)`);
      vOverlay.addColorStop(1.0, `rgba(${INK},1)`);
      ctx.fillStyle = vOverlay;
      ctx.fillRect(0, 0, W, H);

      // Horizontal fade — let the field breathe on the right, dark on the left.
      const hOverlay = ctx.createLinearGradient(W, 0, 0, 0);
      hOverlay.addColorStop(0.0, `rgba(${INK},0)`);
      hOverlay.addColorStop(0.45, `rgba(${INK},0.55)`);
      hOverlay.addColorStop(1.0, `rgba(${INK},0.92)`);
      ctx.fillStyle = hOverlay;
      ctx.fillRect(0, 0, W, H);
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
