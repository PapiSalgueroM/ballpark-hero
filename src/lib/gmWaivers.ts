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

   "Worst record" is the league's own measure: winning percentage in the
   NFL, the NBA and MLB, the share of possible points in the NHL, where an
   overtime loss is worth a point (CBA 13.19). Before a club has played this
   season, the previous season's final standing orders the wire, which is
   what every league does in its offseason and on opening day; the farm
   keeps that standing on each club (gmFarm.ts closeSeason).

   scripts/simGmFarm.mjs checks the order, that claims happen at all on real
   engine leagues, and that a claimed man never returns. Its control
   removes the claim step below and the waiver check must go red. */

/** The least the wire needs to know about a club. */
export interface WaiverClub {
  abbr: string;
  wins: number;
  /** Regulation losses (every loss outside the NHL). */
  losses: number;
  /** NHL: overtime and shootout losses, a point each. */
  otLosses?: number;
  /** Last season's final standing on the same measure, when the farm kept one. */
  prev?: number;
}

/** How a league measures a record for the wire. */
export type ClaimBasis = 'winPct' | 'pointsPct';

/** Winning share, wins over games played, 0.5 before a club has played. An NHL overtime loss is a game. */
export const winPct = (c: Pick<WaiverClub, 'wins' | 'losses' | 'otLosses'>): number => {
  const g = c.wins + c.losses + (c.otLosses ?? 0);
  return g > 0 ? c.wins / g : 0.5;
};

/** NHL: points earned over points possible (two a win, one an overtime loss), 0.5 before a club has played. */
export const pointsPct = (c: Pick<WaiverClub, 'wins' | 'losses' | 'otLosses'>): number => {
  const g = c.wins + c.losses + (c.otLosses ?? 0);
  return g > 0 ? (2 * c.wins + (c.otLosses ?? 0)) / (2 * g) : 0.5;
};

/** The record the wire reads this season. */
export const standing = (c: WaiverClub, basis: ClaimBasis): number => (basis === 'pointsPct' ? pointsPct(c) : winPct(c));

/**
 * The claim order: every club but the one exposing him, worst record first.
 * Ties go to the lower winning share (the NHL's first tie break after
 * points; the same thing elsewhere), then to last season's final standing
 * (MLB's own tie break), then fewer wins, then the abbreviation, so the
 * order never depends on object key order. Before anybody has played every
 * club stands at .500, so last season's standing decides the whole order,
 * which is the leagues' offseason and opening day rule. A new league has no
 * last season, so there the abbreviation decides: the game's own fallback.
 */
export function claimOrder<C extends WaiverClub>(clubs: C[], fromAbbr: string, basis: ClaimBasis = 'winPct'): C[] {
  const last = (c: C) => c.prev ?? 0.5;
  return clubs
    .filter(c => c.abbr !== fromAbbr)
    .sort((a, b) => standing(a, basis) - standing(b, basis) || winPct(a) - winPct(b) || last(a) - last(b) || a.wins - b.wins || a.abbr.localeCompare(b.abbr));
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
export function runWaivers<C extends WaiverClub>(clubs: C[], fromAbbr: string, wants: (c: C) => boolean, basis: ClaimBasis = 'winPct'): WaiverResult<C> {
  const order = claimOrder(clubs, fromAbbr, basis);
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
