import type { ImperialismSport, ImperialismTeam, ImperialismGameSpec } from '@/lib/imperialismEngine';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';
import { NFL_TEAMS, STATE_GEO_COORDS, INITIAL_TERRITORIES } from '@/data/conquestData';
import { NBA_TEAMS, INITIAL_TERRITORIES_NBA } from '@/data/conquestDataNba';
import { MLB_TEAMS, INITIAL_TERRITORIES_MLB } from '@/data/conquestDataMlb';
import { NHL_TEAMS, INITIAL_TERRITORIES_NHL } from '@/data/conquestDataNhl';

/**
 * Round 476: the four US conquest maps as DATA for the shared engine.
 *
 * src/lib/imperialism.ts, imperialismNba.ts, imperialismMlb.ts and
 * imperialismNhl.ts were four copies of one engine, and the four
 * ImperialismBoard*.tsx components were four copies of one screen. Round 459
 * proved the shared pair carries a sport (soccer runs on it); this file is
 * the other four sports expressed the same way, and the eight copies are
 * gone. Everything here is what genuinely differs per sport: the clubs and
 * their strengths, the opening map, the round count and labels, the scoreline
 * shape, and the nouns. Every number below is the one its old engine used, so
 * no sport's balance moved when it changed engine.
 */

const teamsOf = (
  list: { id: string; name: string; city: string; overall: number }[],
): ImperialismTeam[] => list.map(t => ({ id: t.id, name: t.name, city: t.city, overall: t.overall }));

/* ─────────────────────────── NFL ───────────────────────────
   Real stadium coordinates (to ~0.1 degree), moved verbatim from
   src/lib/imperialism.ts. Shared-market pairs are nudged apart slightly so
   states-level Voronoi still gives both a home: LAC leans toward its San
   Diego heritage, NYG toward inland Jersey. */
export const STADIUM_COORDS: Record<string, { lat: number; lon: number }> = {
  KC: { lat: 39.05, lon: -94.48 },
  BUF: { lat: 42.77, lon: -78.79 },
  PHI: { lat: 39.9, lon: -75.17 },
  BAL: { lat: 39.28, lon: -76.62 },
  CIN: { lat: 39.1, lon: -84.52 },
  CLE: { lat: 41.51, lon: -81.7 },
  PIT: { lat: 40.45, lon: -80.02 },
  HOU: { lat: 29.68, lon: -95.41 },
  IND: { lat: 39.76, lon: -86.16 },
  JAX: { lat: 30.32, lon: -81.64 },
  TEN: { lat: 36.17, lon: -86.77 },
  DEN: { lat: 39.74, lon: -105.02 },
  LV: { lat: 36.09, lon: -115.18 },
  LAC: { lat: 33.2, lon: -117.4 },
  LAR: { lat: 33.95, lon: -118.34 },
  NE: { lat: 42.09, lon: -71.26 },
  NYJ: { lat: 40.81, lon: -74.07 },
  NYG: { lat: 40.6, lon: -74.6 },
  MIA: { lat: 25.96, lon: -80.24 },
  DAL: { lat: 32.75, lon: -97.09 },
  WAS: { lat: 38.91, lon: -76.86 },
  CHI: { lat: 41.86, lon: -87.62 },
  DET: { lat: 42.34, lon: -83.05 },
  GB: { lat: 44.5, lon: -88.06 },
  MIN: { lat: 44.97, lon: -93.26 },
  ATL: { lat: 33.75, lon: -84.4 },
  CAR: { lat: 35.23, lon: -80.85 },
  NO: { lat: 29.95, lon: -90.08 },
  TB: { lat: 27.98, lon: -82.5 },
  ARI: { lat: 33.53, lon: -112.26 },
  SEA: { lat: 47.6, lon: -122.33 },
  SF: { lat: 37.4, lon: -121.97 },
};

function dist2(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = aLat - bLat;
  const dLon = (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  return dLat * dLat + dLon * dLon;
}

/** Voronoi seeding: every renderable territory to its nearest stadium, with
 *  every team guaranteed its own home region so nobody spawns landless. */
export function seedNflEmpires(): Record<string, string> {
  const out: Record<string, string> = {};
  const stateIds = Object.keys(STATE_GEO_COORDS).filter(id => id in TERRITORY_ADJACENCY);
  for (const sid of stateIds) {
    const c = STATE_GEO_COORDS[sid];
    let best = NFL_TEAMS[0].id;
    let bd = Infinity;
    for (const t of NFL_TEAMS) {
      const s = STADIUM_COORDS[t.id];
      if (!s) continue;
      const d = dist2(c.lat, c.lon, s.lat, s.lon);
      if (d < bd) { bd = d; best = t.id; }
    }
    out[sid] = best;
  }
  for (const [sid, team] of Object.entries(INITIAL_TERRITORIES)) {
    if (sid in TERRITORY_ADJACENCY) out[sid] = team;
  }
  return out;
}

export const NFL_IMPERIALISM: ImperialismSport = {
  key: 'nfl',
  teams: teamsOf(NFL_TEAMS),
  seed: seedNflEmpires,
  regularRounds: 18,
  playoffLabels: ['Quarterfinals', 'Semifinals', 'Imperial Championship'],
  roundNoun: 'Week',
  teamNoun: 'team',
  regionNoun: 'state',
  regionShort: 'st',
  homeEdge: 2,
  gapScale: 22,
  tieBreakWindow: 0.045,
  score: {
    pair: rng => {
      const winner = 17 + Math.floor(rng() * 25); // 17-41
      const margin = 1 + Math.floor(rng() * 24);  // 1-24
      return [winner, Math.max(0, winner - margin)];
    },
    tieBreak: w => w - 3,
    tieBreakLabel: 'OT',
  },
  copy: {
    eraseTail: 'in one afternoon',
    quiet: '🧊 A quiet week: no empires changed hands in a big way.',
  },
};

export const NFL_CONQUEST_GAME: ImperialismGameSpec = {
  name: 'NFL Imperialism',
  path: '/conquest',
  gameId: 'conquest-imperialism',
  pitch: "The map starts as a true imperialism split: every state belongs to its nearest stadium. Every week, winners conquer the loser's ENTIRE empire. Wiped-out teams keep playing, and one win takes it all back. Ride your team to the end, call their games, and pray.",
};

/* ─────────────────────────── NBA ─────────────────────────── */
export const NBA_IMPERIALISM: ImperialismSport = {
  key: 'nba',
  teams: teamsOf(NBA_TEAMS),
  /* INITIAL_TERRITORIES_NBA already assigns EVERY rendered territory to its
     nearest arena (hand-tuned 2026-07-10, including the finer TX and CA
     splits and the Toronto-gets-Vermont ruling), so the start is that map. */
  seed: () => ({ ...INITIAL_TERRITORIES_NBA }),
  regularRounds: 14,
  playoffLabels: ['Quarterfinals', 'Semifinals', 'Imperial Finals'],
  roundNoun: 'Round',
  teamNoun: 'team',
  regionNoun: 'territory',
  regionShort: 'terr',
  homeEdge: 2.5,
  gapScale: 20,
  tieBreakWindow: 0.04,
  score: {
    pair: rng => {
      const winner = 102 + Math.floor(rng() * 34); // 102-135
      const margin = 1 + Math.floor(rng() * 24);   // 1-24
      return [winner, winner - margin];
    },
    tieBreak: (w, rng) => w - (1 + Math.floor(rng() * 4)),
    tieBreakLabel: 'OT',
  },
  copy: {
    eraseTail: 'in one night',
    quiet: '🧊 A quiet night around the league: no empires moved in a big way.',
  },
};

export const NBA_CONQUEST_GAME: ImperialismGameSpec = {
  name: 'NBA Imperialism',
  path: '/conquest-nba',
  gameId: 'conquest-nba-imperialism',
  pitch: "The map starts as a true imperialism split: every territory belongs to its nearest NBA arena. Every round, winners conquer the loser's ENTIRE empire. Wiped-out teams keep playing, and one win takes it all back. Ride your team to the end, call their games, and pray.",
};

/* ─────────────────────────── MLB ─────────────────────────── */
export const MLB_IMPERIALISM: ImperialismSport = {
  key: 'mlb',
  teams: teamsOf(MLB_TEAMS),
  seed: () => ({ ...INITIAL_TERRITORIES_MLB }),
  regularRounds: 14,
  playoffLabels: ['Division Round', 'Pennant Round', 'Imperial World Series'],
  roundNoun: 'Round',
  teamNoun: 'team',
  regionNoun: 'territory',
  regionShort: 'terr',
  homeEdge: 1.5,
  gapScale: 26,
  tieBreakWindow: 0.05,
  score: {
    pair: rng => {
      const winner = 2 + Math.floor(rng() * 9); // 2-10
      const margin = 1 + Math.floor(rng() * Math.min(6, winner)); // 1-6, capped by winner
      return [winner, Math.max(0, winner - margin)];
    },
    tieBreak: w => w - 1, // extra innings: a one-run game by definition
    tieBreakLabel: 'OT',
  },
  copy: {
    eraseTail: 'in one night at the yard',
    quiet: '🧊 A quiet night around the league: no empires moved in a big way.',
  },
};

export const MLB_CONQUEST_GAME: ImperialismGameSpec = {
  name: 'MLB Imperialism',
  path: '/conquest-mlb',
  gameId: 'conquest-mlb-imperialism',
  pitch: "The map starts as a true imperialism split: every territory belongs to its nearest MLB park. Every round, winners conquer the loser's ENTIRE empire. Wiped-out teams keep playing, and one win takes it all back. Two clubs start as THE INVADERS with no land at all: Toronto from across the border and San Diego, boxed out of the map's California splits. Ride your team to the end, call their games, and pray.",
};

/* ─────────────────────────── NHL ─────────────────────────── */
export const NHL_IMPERIALISM: ImperialismSport = {
  key: 'nhl',
  teams: teamsOf(NHL_TEAMS),
  seed: () => ({ ...INITIAL_TERRITORIES_NHL }),
  regularRounds: 16,
  playoffLabels: ['Quarterfinals', 'Semifinals', 'Imperial Cup Final'],
  roundNoun: 'Round',
  teamNoun: 'team',
  regionNoun: 'territory',
  regionShort: 'terr',
  homeEdge: 2,
  gapScale: 22,
  tieBreakWindow: 0.055,
  score: {
    pair: rng => {
      const winner = 2 + Math.floor(rng() * 6); // 2-7
      const margin = 1 + Math.floor(rng() * Math.min(4, winner)); // 1-4, capped by winner
      return [winner, Math.max(0, winner - margin)];
    },
    tieBreak: w => w - 1, // sudden death: a one-goal game by definition
    tieBreakLabel: 'OT',
  },
  copy: {
    eraseTail: 'in one night',
    quiet: '🧊 A quiet night around the league: no empires moved in a big way.',
  },
};

export const NHL_CONQUEST_GAME: ImperialismGameSpec = {
  name: 'NHL Imperialism',
  path: '/conquest-nhl',
  gameId: 'conquest-nhl-imperialism',
  pitch: "The map starts as a true imperialism split: every territory belongs to its nearest NHL rink. Every round, winners conquer the loser's ENTIRE empire. Wiped-out teams keep playing, and one win takes it all back. Five clubs with no US territory of their own (Toronto, Ottawa, Edmonton, Vancouver, Buffalo) start as THE INVADERS: landless, dangerous, one win from an empire. Ride your team to the end, call their games, and pray.",
};
