import { useEffect, useRef } from 'react';
import type { PackTier } from '@/lib/fetchPackPool';

const COLORS: Record<PackTier, string[]> = {
  superstar: ['#c084fc', '#f472b6', '#eab308', '#ffffff'],
  star: ['#eab308', '#facc15', '#fde68a', '#ffffff'],
  quality: ['#34d399', '#6ee7b7', '#a7f3d0', '#ffffff'],
  squad: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#ffffff'],
  fringe: ['#a8a29e', '#d6d3d1', '#e7e5e4', '#ffffff'],
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

function det(i: number, seed: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface WalkoutBurstProps {
  active: boolean;
  tier: PackTier;
  seed: number;
}

/**
 * Canvas particle burst on the pack reveal. requestAnimationFrame only, cleaned
 * up on unmount. Deterministic positions from seed so a discarded render cannot
 * reshuffle the burst.
 */
export function WalkoutBurst({ active, tier, seed }: WalkoutBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 240;
    const h = parent?.clientHeight || 320;
    canvas.width = w;
    canvas.height = h;

    const palette = COLORS[tier];
    const count = tier === 'superstar' ? 48 : tier === 'star' ? 36 : 24;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const a = det(i, seed) * Math.PI * 2;
      const speed = 1.4 + det(i * 3, seed) * 3.6;
      return {
        x: w / 2,
        y: h / 2,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.2,
        life: 1,
        size: 2 + det(i * 9, seed) * 3,
        color: palette[i % palette.length],
      };
    });

    let raf = 0;
    let running = true;
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.018;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [active, tier, seed]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden
    />
  );
}
