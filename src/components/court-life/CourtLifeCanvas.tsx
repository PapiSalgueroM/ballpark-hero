import { useEffect, useRef, type MutableRefObject } from 'react';
import type { CourtMatch } from '@/lib/courtLife';
import { drawCourtLife } from '@/lib/courtLifeRender';

export function CourtLifeCanvas({ matchRef, drawRef }: {
  matchRef: MutableRefObject<CourtMatch | null>;
  drawRef: MutableRefObject<(() => void) | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = () => {
      const match = matchRef.current;
      if (!match) return;
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(box.width * ratio), height = Math.round(box.height * ratio);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const frame = drawCourtLife(context, match, box.width, box.height, motion.matches);
      canvas.dataset.courtFrame = JSON.stringify(frame);
      canvas.dataset.courtTick = String(match.tick);
    };
    drawRef.current = draw;
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    motion.addEventListener('change', draw);
    draw();
    return () => { resize.disconnect(); motion.removeEventListener('change', draw); if (drawRef.current === draw) drawRef.current = null; };
  }, [matchRef, drawRef]);
  return <canvas ref={canvasRef} data-court-canvas tabIndex={0} role="img" aria-label="Basketball court. Move with the arrows or W A S D. Use J to shoot or jump, K to pass, call or steal, and L to sprint or guard."
    className="block aspect-[1.7] w-full rounded-xl bg-[#172d3b] outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background" />;
}
