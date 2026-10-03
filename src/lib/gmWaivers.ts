/* Round 944: THE WAIVER WIRE, one claim order for the four GM sims.

   A man a club exposes (an MLB man out of options, an NHL man past his
   exemption, an NFL man on his way to the practice squad) is offered to
   every other club, worst record first, the order each league uses (sources
   in gmFarm.ts FARM_RULES claimOrder). The first club that wants him and
   has room takes him and his contract. He is gone for good: the club that
   lost him has his id on its lost list, and waiverReturnRefusal is the one
   sentence every path that could hand him back must ask. Waivers are not
   loans. A man nobody claims has cleared, and his sport sends him where
   it sends a cleared man (back to the tier, or the free agent pool).

   scripts/simGmFarm.mjs checks the order, that claims happen at all on real
   engine leagues, and that a claimed man never returns. Its control
   removes the claim step below and the waiver check must go red. */

/** The least the wire needs to know about a club. */
export interface WaiverClub {
  abbr: string;
  wins: number;
  losses: number;
}

/** Winning share, 0.5 before a club has played. */
export const winPct = (c: Pick<WaiverClub, 'wins' | 'losses'>): number => {
  const g = c.wins + c.losses;
  return g > 0 ? c.wins / g : 0.5;
};

/**
 * The claim order: every club but the one exposing him, worst record first.
 * Ties go to fewer wins, then by abbreviation so the order never depends on
 * object key order. (The leagues break ties on last season's record, which
 * the engines do not keep; this is the game's own tie break.)
 */
export function claimOrder<C extends WaiverClub>(clubs: C[], fromAbbr: string): C[] {
  return clubs
    .filter(c => c.abbr !== fromAbbr)
    .sort((a, b) => winPct(a) - winPct(b) || a.wins - b.wins || a.abbr.localeCompare(b.abbr));
}

export interface WaiverResult<C> {
  /** The club that claimed him, or null when he cleared. */
  claimer: C | null;
  /** The order the wire was offered in, for the screen. */
  order: string[];
}

/**
 * Offer one man around the league. `wants` is each club's decision (room
 * and need, the sport's rule); the first club in the claim order that wants
 * him gets him. The caller moves him and records the loss with recordLoss.
 */
export function runWaivers<C extends WaiverClub>(clubs: C[], fromAbbr: string, wants: (c: C) => boolean): WaiverResult<C> {
  const order = claimOrder(clubs, fromAbbr);
  const claimer = order.find(c => wants(c)) ?? null;
  return { claimer, order: order.map(c => c.abbr) };
}

/** The losing club remembers him for good. */
export function recordLoss(lost: string[], playerId: string): void {
  if (!lost.includes(playerId)) lost.push(playerId);
}

/** Why this club cannot take this man back, or null. Every path that could return a claimed man asks it. */
export function waiverReturnRefusal(lost: readonly string[] | undefined, playerId: string): string | null {
  if ((lost ?? []).includes(playerId)) return 'You lost him on waivers. Waivers are not loans, so he is not coming back.';
  return null;
}
