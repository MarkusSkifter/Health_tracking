"use client";

import { useEffect, useRef } from "react";

interface Blob {
  bx: number;
  by: number;
  r: number;
  r1: number;
  g1: number;
  b1: number;
  alpha: number;
}

const BLOBS: Blob[] = [
  { bx: 0.78, by: 0.07, r: 420, r1: 29,  g1: 158, b1: 117, alpha: 0.38 },
  { bx: 0.94, by: 0.04, r: 360, r1: 55,  g1: 138, b1: 221, alpha: 0.32 },
  { bx: 0.70, by: 0.20, r: 300, r1: 93,  g1: 202, b1: 165, alpha: 0.26 },
  { bx: 0.88, by: 0.17, r: 280, r1: 29,  g1: 158, b1: 117, alpha: 0.24 },
  { bx: 0.82, by: 0.33, r: 340, r1: 55,  g1: 138, b1: 221, alpha: 0.20 },
  { bx: 0.65, by: 0.10, r: 260, r1: 93,  g1: 202, b1: 165, alpha: 0.18 },
];

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

      for (const b of BLOBS) {
        const x = b.bx * W;
        const y = b.by * H;
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
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    }

    resize();
    window.addEventListener("resize", resize);

    return () => {
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
