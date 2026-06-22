"use client";

import { useEffect, useRef } from "react";

interface Blob {
  bx: number; // base x as fraction of canvas width (top-right quadrant)
  by: number; // base y as fraction of canvas height
  sx: number; // oscillation speed x
  sy: number; // oscillation speed y
  px: number; // phase offset x (radians)
  py: number; // phase offset y (radians)
  ax: number; // amplitude x as fraction of canvas width
  ay: number; // amplitude y as fraction of canvas height
  r: number;  // radius in px
  r1: number; // red channel
  g1: number; // green channel
  b1: number; // blue channel
  alpha: number; // center opacity
}

const BLOBS: Blob[] = [
  { bx: 0.78, by: 0.07, sx: 0.38, sy: 0.31, px: 0.0, py: 1.10, ax: 0.08, ay: 0.06, r: 420, r1: 29,  g1: 158, b1: 117, alpha: 0.38 },
  { bx: 0.94, by: 0.04, sx: 0.22, sy: 0.44, px: 2.4, py: 0.80, ax: 0.05, ay: 0.09, r: 360, r1: 55,  g1: 138, b1: 221, alpha: 0.32 },
  { bx: 0.70, by: 0.20, sx: 0.55, sy: 0.28, px: 1.7, py: 3.20, ax: 0.09, ay: 0.07, r: 300, r1: 93,  g1: 202, b1: 165, alpha: 0.26 },
  { bx: 0.88, by: 0.17, sx: 0.41, sy: 0.60, px: 0.5, py: 2.10, ax: 0.06, ay: 0.10, r: 280, r1: 29,  g1: 158, b1: 117, alpha: 0.24 },
  { bx: 0.82, by: 0.33, sx: 0.30, sy: 0.37, px: 3.0, py: 1.50, ax: 0.07, ay: 0.05, r: 340, r1: 55,  g1: 138, b1: 221, alpha: 0.20 },
  { bx: 0.65, by: 0.10, sx: 0.48, sy: 0.52, px: 1.2, py: 0.40, ax: 0.06, ay: 0.08, r: 260, r1: 93,  g1: 202, b1: 165, alpha: 0.18 },
];

export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let start = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(timestamp: number) {
      if (!canvas || !ctx) return;
      if (!start) start = timestamp;
      const t = (timestamp - start) / 1000;

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      for (const b of BLOBS) {
        const x = b.bx * W + Math.sin(t * b.sx + b.px) * b.ax * W;
        const y = b.by * H + Math.cos(t * b.sy + b.py) * b.ay * H;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        grad.addColorStop(0, `rgba(${b.r1},${b.g1},${b.b1},${b.alpha})`);
        grad.addColorStop(1, `rgba(${b.r1},${b.g1},${b.b1},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vertical fade: transparent at top → opaque toward bottom
      const vOverlay = ctx.createLinearGradient(0, 0, 0, H);
      vOverlay.addColorStop(0.00, "rgba(6,6,8,0)");
      vOverlay.addColorStop(0.18, "rgba(6,6,8,0.15)");
      vOverlay.addColorStop(0.45, "rgba(6,6,8,0.88)");
      vOverlay.addColorStop(1.00, "rgba(6,6,8,1)");
      ctx.fillStyle = vOverlay;
      ctx.fillRect(0, 0, W, H);

      // Horizontal fade: transparent on right → dark on left, keeps glow in corner
      const hOverlay = ctx.createLinearGradient(W, 0, 0, 0);
      hOverlay.addColorStop(0.00, "rgba(6,6,8,0)");
      hOverlay.addColorStop(0.30, "rgba(6,6,8,0.15)");
      hOverlay.addColorStop(0.60, "rgba(6,6,8,0.82)");
      hOverlay.addColorStop(1.00, "rgba(6,6,8,0.95)");
      ctx.fillStyle = hOverlay;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
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
