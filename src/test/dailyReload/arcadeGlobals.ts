/**
 * The two globals an arcade driver has to freeze, shared by the Free Kick and
 * Buzzer Beater rows because both games run on the same engine.
 *
 * Round 445. Both freeze animation, never the game itself, for the same reason
 * minefield.driver shortens its reveal timeout.
 *
 *   matchMedia is stubbed to report prefers-reduced-motion. That is a real
 *   supported path rather than a fiction: useArcadeFlight settles the round in
 *   the same tick under reduced motion instead of flying for most of a second.
 *   Ten of those would blow vitest's five second budget on their own, and
 *   exercising the reduced motion path is worth having anyway.
 *
 *   A short setInterval does not schedule, which freezes the power bar's
 *   sweep. React batches the mouse down and the mouse up into one render so
 *   the sweep should never start, but if it ever did the released power would
 *   depend on how long the machine took, and assertion 2 compares two runs
 *   byte for byte. Belt and braces on a real flake.
 *
 * Every round therefore goes at the power the board opens with, which is
 * deterministic and is nowhere near right for most of the ten, so a run
 * finishes with a low honest score. These rows prove the record survives a
 * refresh and is never paid twice; scripts/simFreeKick.mjs and
 * scripts/simBuzzerBeater.mjs prove the games are worth playing.
 */
export function freezeArcadeGlobals(): () => void {
  const realMatch = window.matchMedia;
  const stubMatch = ((query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  window.matchMedia = stubMatch;

  const realInterval = window.setInterval;
  const frozen = ((handler: TimerHandler, ms?: number, ...rest: unknown[]) =>
    (typeof ms === 'number' && ms <= 40 ? 0 : realInterval(handler, ms, ...rest))) as typeof window.setInterval;
  window.setInterval = frozen;

  return () => {
    if (window.matchMedia === stubMatch) window.matchMedia = realMatch;
    if (window.setInterval === frozen) window.setInterval = realInterval;
  };
}
