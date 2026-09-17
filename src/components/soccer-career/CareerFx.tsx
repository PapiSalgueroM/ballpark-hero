import { useEffect, useState } from "react";

/* ─── CareerFx (Round 54) ───
   The juice layer for Soccer Career. Owner asked for "way more animation", so
   the big moments now actually move: confetti on trophy nights and a shine
   sweep across anything golden (the counting numbers left in Round 530).
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

/* ─── Round 628 ───
   Added for Fight Career, kept here rather than in a fight folder because this
   file is already the site's effects module: five sports import it from this
   path. A second copy under another folder is how the same bug gets fixed
   twice, which is the thing the one engine rule exists to stop. */

/**
 * A bar that drains. `value` is 0 to 100 and the width is transitioned, so
 * handing it a new number per round animates the drop rather than cutting to
 * it. Colour follows the number, because a red bar at 12 reads across a room
 * and "12" does not.
 */
export const ConditionBar = ({
  value,
  label,
  align = "left",
}: { value: number; label: string; align?: "left" | "right" }) => {
  const v = Math.max(0, Math.min(100, value));
  const tone = v <= 0 ? "bg-destructive" : v < 25 ? "bg-destructive" : v < 55 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-0 flex-1">
      <div className={`flex items-baseline gap-1.5 text-[11px] ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(v)}</span>
      </div>
      <div className={`mt-1 h-2 overflow-hidden rounded-full bg-muted ${align === "right" ? "flex justify-end" : ""}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${tone}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
};

/**
 * One brief flash over a container, for the moment something lands. It is
 * keyed by the caller (a round number), so remounting is what replays it.
 * Reduced motion gets nothing at all rather than a flash held still, which
 * would be a permanent coloured box over the screen.
 *
 * It starts OFF and only switches on in the effect, the same way Confetti
 * does. The first version started on and switched itself off for reduced
 * motion inside the effect, but the reveal tick is a timeout, so the browser
 * could paint the flash for a frame before that effect ran: exactly the
 * flash reduced motion is promised it never gets.
 */
export const HitFlash = ({ tone = "bg-emerald-400/30" }: { tone?: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 420);
    return () => window.clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 animate-hit-flash rounded-md ${tone}`}
    />
  );
};
