import { useEffect, useState } from "react";

/* Round 1107: the confetti, lifted word for word out of
   src/components/soccer-career/CareerFx.tsx (Round 54), which now re-exports
   it, so the five sports that import it from that path changed nothing.
   CSS keyframes (animate-confetti-fall, tailwind.config.ts) driving a handful
   of spans. No canvas, no library, no random draw: the scatter comes from the
   piece index. It renders nothing for a visitor who asked for less motion. */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CONFETTI_COLORS = ["#FBBF24", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#A855F7", "#FFFFFF"];

/** Falling confetti burst. Absolutely positioned inside a relative parent. */
export const Confetti = ({ pieces = 40, gold = false }: { pieces?: number; gold?: boolean }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setOn(true);
  }, []);
  if (!on) return null;

  const palette = gold ? ["#FBBF24", "#F59E0B", "#FDE68A", "#FFFFFF"] : CONFETTI_COLORS;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
      {Array.from({ length: pieces }).map((_, i) => {
        // Deterministic-ish spread from the index so pieces never clump
        const left = ((i * 37) % 100);
        const delay = ((i * 13) % 22) / 10;
        const duration = 2.4 + ((i * 7) % 14) / 10;
        const size = 5 + ((i * 5) % 6);
        const color = palette[i % palette.length];
        return (
          <span
            key={i}
            className="absolute top-0 animate-confetti-fall"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 1.6}px`,
              backgroundColor: color,
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
};
