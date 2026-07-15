import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValueGuess } from '@/hooks/useGuessTransferValue';

/**
 * Warm/cold feedback for Guess The Value (owner spec 2026-07-08: "red should
 * be for warmer and blue for colder; ur current guess on top and then all the
 * guesses from hottest to coolest below").
 *
 * The colour is a CONTINUOUS scale of proximity, not fixed buckets: guesses
 * just outside the 5% win threshold render blazing red, fading through orange
 * and gold as the distance grows, then switching to the cold side (sky blue
 * to deep blue) past 40% off. The warm and cold ramps are interpolated
 * separately on purpose — a single ramp would sweep through green mid-scale,
 * and green means "correct" everywhere else in the app.
 */

const fmtUsd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

type Hsl = [number, number, number];

/** Warm ramp, pctOff 0.05 (win threshold) -> 0.40. */
const WARM_STOPS: [number, Hsl][] = [
  [0.05, [0, 88, 45]], // blazing red
  [0.14, [16, 90, 47]],
  [0.26, [32, 92, 45]], // orange
  [0.4, [43, 90, 42]], // gold
];

/** Cold ramp, pctOff 0.40 -> 1.00+. */
const COLD_STOPS: [number, Hsl][] = [
  [0.4, [203, 72, 46]], // sky blue
  [0.65, [214, 70, 40]],
  [1.0, [224, 72, 30]], // deep blue
];

function lerpStops(stops: [number, Hsl][], p: number): Hsl {
  const clamped = Math.min(Math.max(p, stops[0][0]), stops[stops.length - 1][0]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (clamped <= p1) {
      const t = p1 === p0 ? 0 : (clamped - p0) / (p1 - p0);
      return [
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

/** Background colour for a non-correct guess, by fractional distance from truth. */
export function heatColor(pctOff: number): string {
  const [h, s, l] = pctOff <= 0.4 ? lerpStops(WARM_STOPS, pctOff) : lerpStops(COLD_STOPS, pctOff);
  return `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
}

/** Inline style for a guess row/card. Correct guesses use the theme's bg-correct classes instead. */
export function heatStyle(g: ValueGuess): CSSProperties | undefined {
  if (g.isCorrect) return undefined;
  // Dark text on the gold band (hue ~38-60) for contrast; white everywhere else.
  const onGold = g.pctOff > 0.3 && g.pctOff <= 0.4;
  return { backgroundColor: heatColor(g.pctOff), color: onGold ? 'hsl(35 100% 10%)' : '#fff' };
}

export function closenessLabel(g: ValueGuess): string {
  if (g.isCorrect) return '🎯 Bullseye';
  if (g.pctOff <= 0.12) return '🔥 Blazing';
  if (g.pctOff <= 0.22) return '♨️ Hot';
  if (g.pctOff <= 0.4) return '🌤️ Warm';
  if (g.pctOff <= 0.65) return '❄️ Cool';
  if (g.pctOff <= 1.0) return '🧊 Cold';
  return '🥶 Freezing';
}

/**
 * The current guess, pinned on top with the big warm/cold treatment:
 * oversized value, heat label, and an explicit too-high/too-low arrow.
 */
export function LatestGuessCard({ g }: { g: ValueGuess }) {
  const blazing = !g.isCorrect && g.pctOff <= 0.12;
  return (
    <div
      className={cn(
        'rounded-2xl px-5 py-5 text-center shadow-xl animate-in fade-in zoom-in-95 duration-300',
        g.isCorrect && 'bg-correct text-correct-foreground',
      )}
      style={{
        ...heatStyle(g),
        boxShadow: blazing ? '0 0 36px hsl(0 88% 50% / 0.5)' : undefined,
      }}
    >
      <div className="text-3xl md:text-4xl font-bold font-display tracking-tight">{fmtUsd(g.value)}</div>
      <div className="text-xl md:text-2xl font-bold mt-1">{closenessLabel(g)}</div>
      {!g.isCorrect && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-sm font-semibold opacity-95">
          {g.direction === 'higher' ? (
            <>
              <ArrowUp className="w-5 h-5" /> Too low, aim higher
            </>
          ) : (
            <>
              <ArrowDown className="w-5 h-5" /> Too high, aim lower
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Every guess so far, sorted hottest to coldest, each on the heat scale. */
export function GuessHistory({ guesses, latest }: { guesses: ValueGuess[]; latest: ValueGuess }) {
  const sorted = [...guesses].sort((a, b) => a.pctOff - b.pctOff);
  return (
    <div className="space-y-1.5">
      {sorted.map((g, i) => (
        <div
          key={`${g.value}-${i}`}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm',
            g.isCorrect && 'bg-correct text-correct-foreground',
          )}
          style={heatStyle(g)}
        >
          <span className="w-6 shrink-0 text-xs font-bold opacity-80">#{i + 1}</span>
          <span className="font-semibold flex-1 min-w-0 truncate">{fmtUsd(g.value)}</span>
          {g === latest && (
            <span className="shrink-0 text-[9px] uppercase tracking-wider font-bold bg-black/25 rounded-full px-2 py-0.5">
              Latest
            </span>
          )}
          <span className="font-semibold shrink-0 hidden sm:inline">{closenessLabel(g)}</span>
          <span className="inline-flex items-center gap-1 font-semibold shrink-0">
            {g.direction === 'exact' ? (
              <>
                <Check className="w-4 h-4" /> Exact
              </>
            ) : g.direction === 'higher' ? (
              <>
                <ArrowUp className="w-4 h-4" /> Higher
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4" /> Lower
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
