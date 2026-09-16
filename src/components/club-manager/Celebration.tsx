/* Round 423: decoration, so it simply does not run for somebody who
           asked for less motion. It carries no content and is aria-hidden
           already, so removing it loses the visitor nothing. This lives in
           ConfettiBurst's OWN styles rather than the shared block because the
           burst is used in places that never mount CelebrationStyles. */

/**
 * Round 147: shared celebration pieces for Club Manager, the animation pass
 * he asked for twice ("Add more animation especially to the idle game...
 * and all the games"). Same technique as Stadium Tycoon's confetti: pure
 * CSS keyframes, deterministic positions so renders are stable, transforms
 * and opacity only so the no-scroll rule cannot be broken by a celebration.
 */

/** Deterministic [0,1) from an index, so confetti never reshuffles mid-fall. */
function det(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PIECE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#facc15'];

/**
 * Round 530: the animation delay for the i-th line of a staggered list, as
 * the CSS string an inline style wants ("0.82s"). The defaults are Round
 * 186's season curtain timings, so every feed, bullet list and chip row on
 * the site ticks at the same pace. Rounded to the millisecond so two builders
 * doing the same arithmetic land on the same string.
 */
export function revealDelay(i: number, start = 0.6, step = 0.22): string {
  return `${Math.round((start + i * step) * 1000) / 1000}s`;
}

/**
 * Round 530 review: where a run of `count` staggered rows finishes, in seconds,
 * so a second run can start after the first without its caller writing the
 * pace out by hand. Rebuild chained three blocks this way with the step typed
 * into the page five times over, which is the one thing the kit exists to stop:
 * change the step here and those blocks would have landed on top of each other.
 * Returns a number, not a CSS string, because it is a start to pass back in.
 */
export function revealAfter(count: number, start = 0.6, step = 0.22): number {
  return Math.round((start + count * step) * 1000) / 1000;
}

/**
 * A one-shot confetti burst that fills its nearest positioned ancestor.
 * Give it a changing `seed` to re-fire; same seed, same fall, every render.
 */
export function ConfettiBurst({ seed = 1, count = 30 }: { seed?: number; count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const k = i + seed * 97;
        return (
          <span
            key={i}
            className="absolute -top-2 w-1.5 h-2.5 cm-confetti"
            style={{
              left: `${4 + det(k) * 92}%`,
              backgroundColor: PIECE_COLORS[i % PIECE_COLORS.length],
              animationDuration: `${1.1 + det(k * 3) * 1.2}s`,
              animationDelay: `${det(k * 7) * 0.35}s`,
              transform: `rotate(${Math.floor(det(k * 13) * 360)}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes cmConfettiFall {
          0% { opacity: 0; transform: translateY(-10px) rotate(0deg); }
          8% { opacity: 1; }
          100% { opacity: 0; transform: translateY(240px) rotate(560deg); }
        }
        .cm-confetti { animation-name: cmConfettiFall; animation-timing-function: ease-in; animation-fill-mode: forwards; }

        @media (prefers-reduced-motion: reduce) {
          .cm-confetti { display: none; }
        }
      `}</style>
    </div>
  );
}

/* Round 530 review, for anyone putting one of these classes on a control:
   cm-rise, cm-slam and cm-tick-in all fill forwards, and an animated value
   outranks a normal author rule for the same property. So a hover or a
   conditional state that changes opacity or transform on the SAME element is
   dead once the animation has run. Two ways out, both in the tree already:
   put the class on a wrapper and keep the control as its child (GmPressCard,
   FreeAgencyPanel), or change a property the keyframes never touch (the
   Continue buttons lift with brightness rather than opacity). */
export { CelebrationStyles } from './CelebrationStyles';
