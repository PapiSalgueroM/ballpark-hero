/* Round 1107: the career moment kit's own styles, mounted by every scene (the
   kit assumes no host has them).

   Four keyframes, only where the site had no shared part:
     cmoRollOut  the number's old value leaves upward
     cmoRollIn   the number's new value arrives from below
     cmoInk      the signing line draws left to right
     cmoRing     one ring leaves the award's rosette
   Everything else a scene moves with is a class the site already has
   (cm-rise, cm-slam, cm-tick-in from CelebrationStyles; VictoryMoment's cup).
   Transforms and opacity only, on boxes whose size is fixed from the first
   frame, so a scene never moves the page.

   Rules this block keeps, each one fenced by a harness:
   - The reduced motion rule NAMES all four animated classes
     (scripts/simRevealMoments.mjs section 1b fails on one it does not name).
     The old number and the ring are gone under it, animation and all.
   - VictoryMoment's still and waiting forms are written with
     animation-duration, animation-delay and animation-play-state, never the
     shorthand, so they are not read as new animated classes. Every one of
     the cup's keyframes ends on its settled look, so a duration of almost
     nothing lands it there (the trick src/index.css uses for reduced motion).
   - A still or quiet number wears cmo-num-final (layout) and never
     cmo-num-new (the arrival).
   - The scene's colour (the custom property set on its root) is used as a
     solid background-color or border-color and nowhere else: never inside a
     gradient, never in a pattern, never as text (a navy on the dark theme
     would vanish). scripts/simCareerMoments.mjs S3 holds it.
   - No transition anywhere. The button's hover is a brightness step. */
export function CareerMomentStyles() {
  return (
    <style>{`
      .cmo { position: relative; }
      .cmo-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background-color: var(--cmo-ink); }
      .cmo-row { display: flex; align-items: center; gap: 12px; }
      .cmo-row > .cmo-copy:only-child { flex: 0 1 auto; }
      .cmo-stack .cmo-row { flex-direction: column; text-align: center; gap: 6px; }
      .cmo-stack .victory-moment { flex-direction: column; }
      .cmo-art { position: relative; flex: 0 0 56px; width: 56px; height: 56px; display: grid; place-items: center; overflow: hidden; }
      .cmo-copy { min-width: 0; flex: 1 1 auto; overflow-wrap: anywhere; }
      .cmo-copy > * + * { margin-top: 2px; }
      .cmo-stack .cmo-copy { text-align: center; }
      .cmo-stack .cmo-copy > * + * { margin-top: 6px; }
      .cmo-count { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: 8px; }
      .cmo-num { position: relative; display: inline-grid; place-items: center; height: 48px; max-width: 100%; padding: 0 16px; overflow: hidden; border-radius: 9999px; border: 2px solid; border-color: var(--cmo-ink); }
      .cmo-num-final { display: block; white-space: nowrap; }
      .cmo-num-old { position: absolute; inset: 0; display: grid; place-items: center; white-space: nowrap; animation: cmoRollOut 320ms ease-in both; }
      .cmo-num-new { opacity: 0; animation: cmoRollIn 360ms cubic-bezier(.2,.8,.3,1) both; }
      .cmo-ink-line { display: block; height: 2px; margin-top: 8px; border-radius: 2px; background-color: var(--cmo-ink); transform-origin: left center; }
      .cmo-ink { animation: cmoInk 450ms ease-out both; }
      .cmo-ring { position: absolute; inset: 10px; border-radius: 9999px; border: 2px solid; border-color: var(--cmo-ink); opacity: 0; pointer-events: none; animation: cmoRing 900ms ease-out both; }
      .cmo-ticks { margin-top: 8px; }
      .cmo-done { display: block; width: 100%; height: 44px; margin-top: 10px; border-radius: 8px; }
      @keyframes cmoRollOut { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100%); } }
      @keyframes cmoRollIn { 0% { opacity: 0; transform: translateY(100%); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes cmoInk { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
      @keyframes cmoRing { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.55); } }
      .cmo-still .victory-cup, .cmo-still .victory-ribbons, .cmo-still .victory-rays, .cmo-still .victory-shadow, .cmo-still .victory-moment::before { animation-duration: 0.001ms; animation-delay: 0s; }
      .cmo-wait .victory-cup, .cmo-wait .victory-ribbons, .cmo-wait .victory-rays, .cmo-wait .victory-shadow, .cmo-wait .victory-moment::before { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) {
        .cmo-num-new, .cmo-ink { animation: none; opacity: 1; transform: none; }
        .cmo-num-old, .cmo-ring { animation: none; display: none; }
      }
    `}</style>
  );
}
