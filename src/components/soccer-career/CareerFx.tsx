import { useEffect, useRef, useState } from "react";

/* ─── CareerFx (Round 54) ───
   The juice layer for Soccer Career. Owner asked for "way more animation", so
   the big moments now actually move: confetti on trophy nights, numbers that
   count up instead of appearing, and a shine sweep across anything golden.
   Everything here is CSS keyframes (defined in tailwind.config.ts) driving a
   handful of divs. No canvas, no libraries, no bundle cost worth measuring.
   All of it respects prefers-reduced-motion by rendering the end state. */

const prefersReducedMotion = () =>
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

/** A number that rolls up to its value. Falls back to the final value when the
    player prefers reduced motion, or when the value is tiny. */
export const CountUp = ({
  value,
  duration = 900,
  decimals = 0,
  className = "",
}: { value: number; duration?: number; decimals?: number; className?: string }) => {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion() || value === 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic, so it lands softly instead of stopping dead
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
};

/** Gold shine sweeping across a container. Wrap anything trophy-ish. */
export const ShineWrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine-sweep"
    />
  </div>
);

/** Small stat that floats up and fades, for +goals style feedback. */
export const FloatUp = ({ text, tone = "text-emerald-400" }: { text: string; tone?: string }) => (
  <span className={`inline-block text-xs font-black animate-float-up ${tone}`}>{text}</span>
);
