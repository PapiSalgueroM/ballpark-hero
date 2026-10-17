/**
 * Round 1340: how Club Manager's match day screens put two clubs side by side.
 *
 * One rule, the engine's own. playMyMatch writes every report home side first
 * with `const iAmHome = fx.home !== false; // neutral finals list us first`
 * (src/lib/clubManager.ts), so a scoreboard that reads like football names the
 * home side first and, on a neutral ground, my club first. Every screen takes
 * the order from here and never decides it for itself. Pure: no imports, no
 * clock, no draw.
 */

/**
 * True when my club is drawn first: at home or on a neutral ground. `undefined`
 * (a fixture or live match saved before the field existed) answers true, which
 * is what every screen printed before this round.
 */
export function myClubFirst(home: boolean | null | undefined): boolean {
  return home !== false;
}

/** The pair in the order the screen draws it: home side first. */
export function inFixtureOrder<T>(home: boolean | null | undefined, mine: T, theirs: T): [T, T] {
  return myClubFirst(home) ? [mine, theirs] : [theirs, mine];
}

/**
 * The same rule read off a finished report, which the engine already wrote
 * home first: my club is first exactly when it is the report's home side.
 */
export function mineFirstOfReport(report: { home: string }, clubName: string): boolean {
  return report.home === clubName;
}
