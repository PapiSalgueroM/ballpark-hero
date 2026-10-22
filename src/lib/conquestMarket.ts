/* Round 1547: who a Conquest team can sign, one rule for the NFL and NBA arcades.

   Two flows sign players. The Free Agency panel is the market: every man left
   on a fallen team's final roster who is not on a team still standing, so a
   player stolen in battle hits the market again if the team that stole him
   falls too. A franchise legend or a retired great never hits that market
   (neverOnMarket): he is a retired man, and "hit the market when the Bears
   fell" would make him a free agent again. The Sign a Player power up is the
   same market plus the sport's retired greats (src/data/conquestPowerups.ts),
   each dealt as retired with the last season he played.

   Until this round both flows also dealt hand typed lists of "free agents":
   the power up offered a man who died in 2021 and men retired for years, and
   the NBA arcade dealt the NFL list. A status claim about a real person goes
   stale the day after it is typed, so neither flow makes one now: the only
   status a market candidate carries is the game's own (his team fell), and a
   retired great's line is two sourced and does not change.

   Pure, no React, nothing at module scope: useConquest.ts and useConquestNba.ts
   both call it, and scripts/simConquestPeople.mjs runs it directly. */

export interface MarketCard {
  name: string;
  position: string;
  overall: number;
}

export interface MarketCandidate extends MarketCard {
  blurb: string;
}

export interface SigningCard extends MarketCard {
  lastSeason?: string;
}

export interface MarketState {
  rosters: Record<string, string[]>;
  alive: string[];
  eliminated: string[];
  cardOf: (name: string) => MarketCard | { position: string; overall: number };
  /** Retired men who can sit on a roster in a run but never hit the market. */
  neverOnMarket: ReadonlySet<string>;
}

/** Franchise legends and retired greats, less anyone who is also on a team's own player table (an active man who is
    also a franchise's legend, such as a star still playing for another club, keeps his place in the market). */
export function retiredNames(
  legends: Record<string, { name: string }>,
  retiredGreats: readonly { name: string }[],
  onATeamTable: (name: string) => boolean,
): Set<string> {
  const out = new Set<string>();
  for (const l of Object.values(legends)) if (!onATeamTable(l.name)) out.add(l.name);
  for (const g of retiredGreats) if (!onATeamTable(g.name)) out.add(g.name);
  return out;
}

/** The power up dialog's length, as before this round. */
export const SIGNING_LIST_MAX = 30;

function onAliveRosters(rosters: Record<string, string[]>, alive: string[]): Set<string> {
  const names = new Set<string>();
  for (const id of alive) for (const n of rosters[id] || []) names.add(n);
  return names;
}

/** Every player of a fallen team's final roster who is on no team still standing, best first. */
export function fallenTeamMarket(state: MarketState, teamNameOf: (teamId: string) => string): MarketCandidate[] {
  const taken = onAliveRosters(state.rosters, state.alive);
  const seen = new Set<string>();
  const out: MarketCandidate[] = [];
  for (const id of state.eliminated) {
    const teamName = teamNameOf(id);
    for (const name of state.rosters[id] || []) {
      if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;
      seen.add(name);
      const card = state.cardOf(name);
      out.push({ name, position: card.position, overall: card.overall, blurb: `Hit the market when the ${teamName} fell` });
    }
  }
  return out.sort((a, b) => b.overall - a.overall);
}

/** The Sign a Player power up's list: the sport's retired greats plus the fallen teams' players, minus anyone on a standing roster, best first. */
export function signingList(state: MarketState, retiredGreats: readonly (MarketCard & { lastSeason: string })[]): SigningCard[] {
  const taken = onAliveRosters(state.rosters, state.alive);
  const out: SigningCard[] = retiredGreats
    .filter(g => !taken.has(g.name))
    .map(g => ({ name: g.name, position: g.position, overall: g.overall, lastSeason: g.lastSeason }));
  const seen = new Set(out.map(c => c.name));
  for (const id of state.eliminated) {
    for (const name of state.rosters[id] || []) {
      if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;
      seen.add(name);
      const card = state.cardOf(name);
      out.push({ name, position: card.position, overall: card.overall });
    }
  }
  return out.sort((a, b) => b.overall - a.overall).slice(0, SIGNING_LIST_MAX);
}
