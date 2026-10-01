import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
import {
  buildRivalries, chargePayroll, fireCoordinator, genStaff, hireCoordinator, rivalOf, rivalrySwing,
  staffCandidates, staffCarousel, staffEdges, staffPayroll, strengthOfSchedule,
  type Coordinator, type ProgramStaff, type RivalKind, type Rivalry, type StaffRole,
} from './collegeProgram';
/**
 * CFB Dynasty engine (2026-08-05). The college pillar of the sim suite.
 *
 * Real schools (a curated 40-program subset of the post-2024 realignment:
 * SEC and Big Ten at full flagship strength, ACC and Big 12 cores, and a
 * Group of Five bucket) with editorial prestige ratings. Every PLAYER is
 * fictional by design: rosters, recruits and transfers are generated names
 * with class years, so no real athlete's likeness is used anywhere.
 *
 * Season model: 12 rounds of one game each (4 cross-conference, then 8
 * conference games), conference championship games, then the real 12-team
 * College Football Playoff: the five conference champions auto-qualify,
 * seven at-larges fill the field, straight seeding by ranking (the 2025
 * format), byes for the top four, single elimination to the title.
 *
 * Offseason: classes advance (FR to SR), seniors graduate, elite juniors
 * declare early, a 2-to-5-star recruiting board with scouting error and an
 * NIL budget that scales with prestige and success, plus a transfer portal.
 */

export type CfbPos = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'K';
export type CfbClass = 'FR' | 'SO' | 'JR' | 'SR';

export interface CfbSchool {
  id: string;
  name: string;
  color: string;
  prestige: number; // 60-97 editorial
  conf: 'SEC' | 'B1G' | 'ACC' | 'B12' | 'G5';
}

/** Curated subset, post-2024 realignment memberships (Texas and Oklahoma in
 *  the SEC; USC, UCLA, Oregon and Washington in the Big Ten; Cal, Stanford
 *  and SMU in the ACC; Utah, Arizona and Colorado in the Big 12). */
export const CFB_SCHOOLS: CfbSchool[] = [
  // SEC (12)
  { id: 'ALA', name: 'Alabama', color: '#9E1B32', prestige: 95, conf: 'SEC' },
  { id: 'UGA', name: 'Georgia', color: '#BA0C2F', prestige: 96, conf: 'SEC' },
  { id: 'TEX', name: 'Texas', color: '#BF5700', prestige: 94, conf: 'SEC' },
  { id: 'OU', name: 'Oklahoma', color: '#841617', prestige: 88, conf: 'SEC' },
  { id: 'LSU', name: 'LSU', color: '#461D7C', prestige: 91, conf: 'SEC' },
  { id: 'TENN', name: 'Tennessee', color: '#FF8200', prestige: 89, conf: 'SEC' },
  { id: 'AUB', name: 'Auburn', color: '#0C2340', prestige: 84, conf: 'SEC' },
  { id: 'FLA', name: 'Florida', color: '#0021A5', prestige: 85, conf: 'SEC' },
  { id: 'A&M', name: 'Texas A&M', color: '#500000', prestige: 86, conf: 'SEC' },
  { id: 'MISS', name: 'Ole Miss', color: '#CE1126', prestige: 87, conf: 'SEC' },
  { id: 'MIZZ', name: 'Missouri', color: '#F1B82D', prestige: 82, conf: 'SEC' },
  { id: 'SCAR', name: 'South Carolina', color: '#73000A', prestige: 81, conf: 'SEC' },
  // Big Ten (12)
  { id: 'OSU', name: 'Ohio State', color: '#BB0000', prestige: 96, conf: 'B1G' },
  { id: 'MICH', name: 'Michigan', color: '#00274C', prestige: 92, conf: 'B1G' },
  { id: 'ORE', name: 'Oregon', color: '#154733', prestige: 93, conf: 'B1G' },
  { id: 'PSU', name: 'Penn State', color: '#041E42', prestige: 91, conf: 'B1G' },
  { id: 'USC', name: 'USC', color: '#990000', prestige: 87, conf: 'B1G' },
  { id: 'WASH', name: 'Washington', color: '#4B2E83', prestige: 84, conf: 'B1G' },
  { id: 'UCLA', name: 'UCLA', color: '#2D68C4', prestige: 78, conf: 'B1G' },
  { id: 'WISC', name: 'Wisconsin', color: '#C5050C', prestige: 81, conf: 'B1G' },
  { id: 'IOWA', name: 'Iowa', color: '#FFCD00', prestige: 82, conf: 'B1G' },
  { id: 'NEB', name: 'Nebraska', color: '#E41C38', prestige: 80, conf: 'B1G' },
  { id: 'IND', name: 'Indiana', color: '#990000', prestige: 79, conf: 'B1G' },
  { id: 'MSU', name: 'Michigan State', color: '#18453B', prestige: 77, conf: 'B1G' },
  // ACC (8)
  { id: 'CLEM', name: 'Clemson', color: '#F56600', prestige: 89, conf: 'ACC' },
  { id: 'FSU', name: 'Florida State', color: '#782F40', prestige: 85, conf: 'ACC' },
  { id: 'MIA', name: 'Miami', color: '#F47321', prestige: 86, conf: 'ACC' },
  { id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'ACC' },
  { id: 'UNC', name: 'North Carolina', color: '#7BAFD4', prestige: 78, conf: 'ACC' },
  { id: 'LOU', name: 'Louisville', color: '#AD0000', prestige: 79, conf: 'ACC' },
  { id: 'SMU', name: 'SMU', color: '#0033A0', prestige: 80, conf: 'ACC' },
  { id: 'VT', name: 'Virginia Tech', color: '#630031', prestige: 76, conf: 'ACC' },
  // Big 12 (8)
  { id: 'UTAH', name: 'Utah', color: '#CC0000', prestige: 82, conf: 'B12' },
  { id: 'KSU', name: 'Kansas State', color: '#512888', prestige: 80, conf: 'B12' },
  { id: 'OKST', name: 'Oklahoma State', color: '#FF7300', prestige: 78, conf: 'B12' },
  { id: 'TCU', name: 'TCU', color: '#4D1979', prestige: 79, conf: 'B12' },
  { id: 'BAY', name: 'Baylor', color: '#154734', prestige: 77, conf: 'B12' },
  { id: 'ASU', name: 'Arizona State', color: '#8C1D40', prestige: 78, conf: 'B12' },
  { id: 'COL', name: 'Colorado', color: '#CFB87C', prestige: 79, conf: 'B12' },
  { id: 'ISU', name: 'Iowa State', color: '#C8102E', prestige: 76, conf: 'B12' },
  // Group of Five (4, compressed bucket)
  { id: 'BSU', name: 'Boise State', color: '#0033A0', prestige: 78, conf: 'G5' },
  { id: 'MEM', name: 'Memphis', color: '#003087', prestige: 72, conf: 'G5' },
  { id: 'TUL', name: 'Tulane', color: '#006747', prestige: 71, conf: 'G5' },
  { id: 'UNLV', name: 'UNLV', color: '#B10202', prestige: 69, conf: 'G5' },
];

export const CFB_SCHOOL_MAP = new Map(CFB_SCHOOLS.map(s => [s.id, s]));
export const CFB_CONFS = ['SEC', 'B1G', 'ACC', 'B12', 'G5'] as const;
export const CFB_ROUNDS = 12;
export const CONF_GAMES_START = 5; // rounds 5-12 are conference play

/** Round 728: the state each school is in, copied from src/data/colleges.ts
 *  (one row per school, each with its IPEDS unit id) and held against it by
 *  scripts/simCfbStaff.mjs, so rivalry week can pair in-state schools without
 *  this engine pulling the whole college quiz table into its chunk. SMU and
 *  Tulane are not in that table, so they have no state here and are never
 *  called an in-state game. */
export const CFB_SCHOOL_STATES: Record<string, string> = {
  ALA: 'Alabama', AUB: 'Alabama', UGA: 'Georgia', TEX: 'Texas', 'A&M': 'Texas', OU: 'Oklahoma',
  LSU: 'Louisiana', TENN: 'Tennessee', FLA: 'Florida', MISS: 'Mississippi', MIZZ: 'Missouri',
  SCAR: 'South Carolina', OSU: 'Ohio', MICH: 'Michigan', ORE: 'Oregon', PSU: 'Pennsylvania',
  USC: 'California', WASH: 'Washington', UCLA: 'California', WISC: 'Wisconsin', IOWA: 'Iowa',
  NEB: 'Nebraska', IND: 'Indiana', MSU: 'Michigan', CLEM: 'South Carolina', FSU: 'Florida',
  MIA: 'Florida', ND: 'Indiana', UNC: 'North Carolina', LOU: 'Kentucky', VT: 'Virginia',
  UTAH: 'Utah', KSU: 'Kansas', OKST: 'Oklahoma', TCU: 'Texas', BAY: 'Texas', ASU: 'Arizona',
  COL: 'Colorado', ISU: 'Iowa', BSU: 'Idaho', MEM: 'Tennessee', UNLV: 'Nevada',
};

/** Round 728: the last regular season week is rivalry week. */
export const CFB_RIVALRY_ROUND = 12;
/** A rivalry won by this many points or more swings the most. */
export const CFB_RIVAL_FULL_MARGIN = 21;
/** Points a game per point of coordinator edge, his unit against theirs. */
export const CFB_POINTS_PER_EDGE = 1.5;

let rivalryCache: Rivalry[] | null = null;
/** Every school's rivalry week opponent. Built on first use rather than at
 *  module scope, the house rule for anything computed from an import. */
export function cfbRivalries(): Rivalry[] {
  if (!rivalryCache) rivalryCache = buildRivalries(CFB_SCHOOLS, CFB_SCHOOL_STATES);
  return rivalryCache;
}
export function cfbRivalOf(id: string): { rival: string; kind: RivalKind; state?: string } | null {
  return rivalOf(cfbRivalries(), id);
}

export interface CfbPlayer {
  id: string;
  name: string;
  pos: CfbPos;
  cls: CfbClass;
  ovr: number;
  pot: number;
  stars: number; // recruiting pedigree 2-5
}

export interface CfbTeam {
  id: string;
  players: CfbPlayer[];
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  champion: boolean; // won its conference this season
  /* Round 728, all optional: a save from before it has none of them and
     plays exactly as it did (scripts/simCfbStaff.mjs holds that to a digest). */
  staff?: ProgramStaff;
  /** Strength points carried out of rivalry week into December, reset each offseason. */
  morale?: number;
  /** Everyone this team has played this season, conference title game included. */
  opps?: string[];
}

/** Round 728: my rivalry week result, kept until the offseason spends its recruiting swing. */
export interface CfbRivalryResult {
  season: number;
  opp: string;
  us: number;
  them: number;
  won: boolean;
  kind: RivalKind;
  state?: string;
  /** Signed: plus for the winner, minus for the loser. */
  morale: number;
  recruit: number;
}

/** Round 728: one line of my schedule. */
export interface CfbSlateGame {
  round: number;
  opp: string;
  home: boolean;
  us: number;
  them: number;
  won: boolean;
  conference: boolean;
  rivalry: boolean;
}

/** Round 728: the offseason hiring window, open for one season's offseason. */
export interface CfbStaffWindow {
  season: number;
  /** The whole program budget for the cycle, before the staff were paid. */
  budget: number;
  market: Coordinator[];
}

export interface CfbState {
  season: number;
  teams: Record<string, CfbTeam>;
  round: number; // 1..CFB_ROUNDS
  myTeam: string;
  nil: number; // my NIL budget for the next recruiting cycle
  natties: { season: number; team: string }[];
  myTitles: number;
  seasonsPlayed: number;
  heismanWinners: string[];
  /** Round 728: present once the program layer (staff, rivalry week,
   *  strength of schedule) is on. Absent means the pre-728 game, untouched. */
  depth?: number;
  lastRivalry?: CfbRivalryResult | null;
  mySlate?: CfbSlateGame[];
  staffWindow?: CfbStaffWindow | null;
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
const fid = makeIdMinter('c');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureCfbIds(lg: CfbState, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  return ensureLeagueEntityIds(fid, lg as never, ...loose);
}

const FIRST = ['Jaylen', 'Cade', 'Marcus', 'Deuce', 'Bryce', 'Trey', 'Xavier', 'Knox', 'Amari', 'Judd', 'Tyce', 'Rocco', 'Dax', 'Malachi', 'Beau', 'Kingston', 'Zeke', 'Landry', 'Colt', 'Rex'];
const LAST = ['Whitfield', 'Broussard', 'Callahan', 'Okafor', 'Ledoux', 'Maddox', 'Prather', 'Stallworth', 'Vann', 'Hollins', 'Beaumont', 'Rucker', 'Tatum', 'Winslow', 'Crowder', 'Delgado', 'Fontaine', 'Granger', 'Huxley', 'McCrae'];
export function cfbGenName(rng: () => number): string {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

const ROSTER_SHAPE: CfbPos[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'DB', 'DB'];
const CLASSES: CfbClass[] = ['FR', 'SO', 'JR', 'SR'];

function starsFor(prestige: number, rng: () => number): number {
  const roll = rng() * 100 + (prestige - 78);
  return roll > 92 ? 5 : roll > 70 ? 4 : roll > 35 ? 3 : 2;
}

export function initCfb(myTeam: string, rng: () => number = Math.random, opts: { depth?: boolean } = {}): CfbState {
  const st = initCfbLegacy(myTeam, rng);
  /* Round 728: every draw the pre-728 start made is made first and in the
     same order, so a legacy start is the same league it always was. */
  if (opts.depth) cfbEnableDepth(st, rng);
  return st;
}

/**
 * Round 728: switch the program layer on. Every program gets an offensive
 * and a defensive coordinator at its own level, and the season log starts.
 * A new dynasty does this at the start; a save from before Round 728 does it
 * when its offseason closes, so the season it was in the middle of finishes
 * exactly as it would have.
 */
export function cfbEnableDepth(st: CfbState, rng: () => number): void {
  if (st.depth) return;
  for (const s of CFB_SCHOOLS) {
    const t = st.teams[s.id];
    if (!t) continue;
    if (!t.staff) t.staff = genStaff(rng, s.prestige, s.id, st.season);
    t.morale = 0;
    t.opps = [];
  }
  st.depth = 1;
  st.mySlate = [];
  st.lastRivalry = null;
  st.staffWindow = null;
}

function initCfbLegacy(myTeam: string, rng: () => number): CfbState {
  const teams: Record<string, CfbTeam> = {};
  for (const s of CFB_SCHOOLS) {
    const players: CfbPlayer[] = ROSTER_SHAPE.map(pos => {
      const stars = starsFor(s.prestige, rng);
      const cls = CLASSES[Math.floor(rng() * 4)];
      const base = s.prestige - 14 + stars * 1.6 + (cls === 'FR' ? -2 : cls === 'SO' ? 0 : cls === 'JR' ? 2 : 3);
      const ovr = clampi(Math.round(base + rng() * 6 - 3), 55, 95);
      return { id: fid(), name: cfbGenName(rng), pos, cls, ovr, pot: clampi(ovr + (4 - CLASSES.indexOf(cls)) * 2 + Math.floor(rng() * 5), ovr, 99), stars };
    });
    teams[s.id] = { id: s.id, players, wins: 0, losses: 0, confWins: 0, confLosses: 0, champion: false };
  }
  return { season: 2026, teams, round: 1, myTeam, nil: nilBudgetFor(CFB_SCHOOL_MAP.get(myTeam)!.prestige, 0), natties: [], myTitles: 0, seasonsPlayed: 0, heismanWinners: [] };
}

function clampi(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

export function cfbStrength(t: CfbTeam): number {
  const sorted = [...t.players].sort((a, b) => b.ovr - a.ovr);
  const top = sorted.slice(0, 8);
  const depth = sorted.slice(8, 12);
  const avg = (xs: CfbPlayer[], f: number) => (xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : f);
  const qb = t.players.filter(p => p.pos === 'QB').sort((a, b) => b.ovr - a.ovr)[0];
  /* Round 728: half of each coordinator's unit edge (each unit is about half
     the team) and the morale rivalry week carries into December. Both are
     absent on a pre-728 save, which therefore rates exactly as it did. */
  const staff = t.staff ? staffEdges(t.staff) : null;
  const staffPart = staff ? (staff.off + staff.def) / 2 : 0;
  return avg(top, 60) * 0.6 + avg(depth, 60) * 0.2 + (qb ? qb.ovr : 60) * 0.2 + staffPart + (t.morale ?? 0);
}

const OFFENSE: CfbPos[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'K'];

/** Round 728: each side of the ball, its players' average plus what its
 *  coordinator moves it by (never more than STAFF_UNIT_EDGE_MAX). */
export function cfbUnits(t: CfbTeam): { off: number; def: number; offEdge: number; defEdge: number } {
  const avg = (xs: CfbPlayer[]) => (xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : 60);
  const e = staffEdges(t.staff);
  return {
    off: avg(t.players.filter(p => OFFENSE.includes(p.pos))) + e.off,
    def: avg(t.players.filter(p => !OFFENSE.includes(p.pos))) + e.def,
    offEdge: e.off,
    defEdge: e.def,
  };
}

export function cfbWinProb(a: CfbTeam, b: CfbTeam): number {
  const gap = cfbStrength(a) - cfbStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 9)); // college blowout variance: steeper than pro
}

export interface CfbGame { home: string; away: string; hs: number; as: number; winner: string; conference: boolean; rivalry?: boolean }

function scoreFor(win: boolean, rng: () => number): number {
  return win ? 24 + Math.floor(rng() * 32) : 3 + Math.floor(rng() * 25);
}

/**
 * The score of a game whose winner is already decided. The pre-728 shape is
 * kept verbatim for a legacy save, draws and quirks included. With the
 * program layer on, each side's points move by CFB_POINTS_PER_EDGE for every
 * point its offensive coordinator's edge beats the other side's defensive
 * coordinator's, and the winner always has more points than the loser.
 *
 * When the shifted scores would leave the loser level or ahead, the LOSER
 * comes down to a field goal behind, never the winner up. Raising the winner
 * looked equivalent and is not: a better coordinator could then score fewer
 * points in a game he won (his side lands one point clear instead of being
 * lifted three clear), which simCfbStaff caught in 17 of 42,000 games.
 */
function resolveScores(st: CfbState, home: CfbTeam, away: CfbTeam, homeWins: boolean, rng: () => number): [number, number] {
  if (!st.depth) {
    let hs = scoreFor(homeWins, rng);
    const as = scoreFor(!homeWins, rng);
    if (hs === as) hs += 3;
    return [hs, as];
  }
  const h = staffEdges(home.staff);
  const a = staffEdges(away.staff);
  const hs = Math.max(0, Math.round(scoreFor(homeWins, rng) + CFB_POINTS_PER_EDGE * (h.off - a.def)));
  const as = Math.max(0, Math.round(scoreFor(!homeWins, rng) + CFB_POINTS_PER_EDGE * (a.off - h.def)));
  return homeWins ? [hs, Math.max(0, Math.min(as, hs - 3))] : [Math.max(0, Math.min(hs, as - 3)), as];
}

function playCfbGame(st: CfbState, homeId: string, awayId: string, rng: () => number): { hs: number; as: number; winner: string } {
  const home = st.teams[homeId];
  const away = st.teams[awayId];
  const homeWins = rng() < cfbWinProb(home, away);
  const [hs, as] = resolveScores(st, home, away, homeWins, rng);
  return { hs, as, winner: homeWins ? homeId : awayId };
}

/** One round: every school plays one game. Rounds 1-4 cross-conference, 5-12
 *  in-conference, except that with the program layer on, week 12 is rivalry
 *  week and every school plays its rival whatever conference he is in. */
export function simCfbRound(st: CfbState, rng: () => number): { games: CfbGame[]; myGame: CfbGame | null } {
  const conference = st.round >= CONF_GAMES_START;
  const games: CfbGame[] = [];
  const pool = [...CFB_SCHOOLS];
  const paired = new Set<string>();
  const play = (homeId: string, awayId: string, rivalry: boolean) => {
    paired.add(homeId); paired.add(awayId);
    const r = playCfbGame(st, homeId, awayId, rng);
    const isConf = CFB_SCHOOL_MAP.get(homeId)!.conf === CFB_SCHOOL_MAP.get(awayId)!.conf;
    const g: CfbGame = { home: homeId, away: awayId, hs: r.hs, as: r.as, winner: r.winner, conference: isConf };
    if (rivalry) g.rivalry = true;
    games.push(g);
    const w = st.teams[g.winner];
    const l = st.teams[g.winner === g.home ? g.away : g.home];
    w.wins += 1; l.losses += 1;
    if (isConf) { w.confWins += 1; l.confLosses += 1; }
  };
  if (st.depth && st.round === CFB_RIVALRY_ROUND) {
    /* Home field alternates by season, the way a series does. */
    for (const r of cfbRivalries()) {
      if (!st.teams[r.a] || !st.teams[r.b]) continue;
      if (st.season % 2 === 0) play(r.a, r.b, true); else play(r.b, r.a, true);
    }
  }
  for (const s of pool) {
    if (paired.has(s.id)) continue;
    const candidates = pool.filter(o =>
      o.id !== s.id && !paired.has(o.id) && (conference ? o.conf === s.conf : o.conf !== s.conf));
    const opp = candidates.length
      ? candidates[Math.floor(rng() * candidates.length)]
      : pool.find(o => o.id !== s.id && !paired.has(o.id));
    if (!opp) continue;
    play(s.id, opp.id, false);
  }
  if (st.depth) recordCfbRound(st, games);
  const myGame = games.find(g => g.home === st.myTeam || g.away === st.myTeam) ?? null;
  return { games, myGame };
}

/** Round 728: the season log (who played whom, for strength of schedule, and
 *  my own slate) plus the swing every rivalry result carries. */
function recordCfbRound(st: CfbState, games: CfbGame[]): void {
  for (const g of games) {
    const home = st.teams[g.home];
    const away = st.teams[g.away];
    (home.opps ??= []).push(g.away);
    (away.opps ??= []).push(g.home);
    let swing: { morale: number; recruit: number } | null = null;
    if (g.rivalry) {
      swing = rivalrySwing(Math.abs(g.hs - g.as), CFB_RIVAL_FULL_MARGIN);
      st.teams[g.winner].morale = swing.morale;
      st.teams[g.winner === g.home ? g.away : g.home].morale = -swing.morale;
    }
    if (g.home !== st.myTeam && g.away !== st.myTeam) continue;
    const home_ = g.home === st.myTeam;
    const us = home_ ? g.hs : g.as;
    const them = home_ ? g.as : g.hs;
    const opp = home_ ? g.away : g.home;
    const won = g.winner === st.myTeam;
    (st.mySlate ??= []).push({ round: st.round, opp, home: home_, us, them, won, conference: g.conference, rivalry: !!g.rivalry });
    if (swing) {
      const rival = cfbRivalOf(st.myTeam);
      st.lastRivalry = {
        season: st.season, opp, us, them, won,
        kind: rival?.kind ?? 'generated', state: rival?.state,
        morale: won ? swing.morale : -swing.morale,
        recruit: won ? swing.recruit : -swing.recruit,
      };
    }
  }
}

/** Round 728: a team's strength of schedule, the average strength of the
 *  opponents it has actually played, or null before it has played anyone. */
export function cfbSos(st: CfbState, id: string): number | null {
  return strengthOfSchedule(st.teams[id]?.opps, oid => cfbStrength(st.teams[oid]));
}

/** Every team's strength of schedule and where it ranks, hardest first. */
export function cfbSosTable(st: CfbState): Map<string, { sos: number; rank: number }> {
  const str = new Map(Object.values(st.teams).map(t => [t.id, cfbStrength(t)]));
  const rows = Object.values(st.teams)
    .map(t => ({ id: t.id, sos: strengthOfSchedule(t.opps, oid => str.get(oid) ?? 60) }))
    .filter((r): r is { id: string; sos: number } => r.sos !== null)
    .sort((a, b) => b.sos - a.sos);
  return new Map(rows.map((r, i) => [r.id, { sos: r.sos, rank: i + 1 }]));
}

/** Poll ranking: wins first, then strength. Round 728: with the program
 *  layer on, a tie on record goes to the resume, who you played plus how good
 *  you look, half and half. The Playoff's at-large picks come off this list. */
export function cfbRankings(st: CfbState): CfbTeam[] {
  if (!st.depth) {
    return Object.values(st.teams).sort((a, b) =>
      b.wins - a.wins || a.losses - b.losses || cfbStrength(b) - cfbStrength(a));
  }
  const str = new Map(Object.values(st.teams).map(t => [t.id, cfbStrength(t)]));
  const resume = new Map(Object.values(st.teams).map(t => [
    t.id, (strengthOfSchedule(t.opps, oid => str.get(oid) ?? 60) ?? str.get(t.id)!) + str.get(t.id)!,
  ]));
  return Object.values(st.teams).sort((a, b) =>
    b.wins - a.wins || a.losses - b.losses || resume.get(b.id)! - resume.get(a.id)!);
}

export function confStandings(st: CfbState, conf: string): CfbTeam[] {
  return Object.values(st.teams)
    .filter(t => CFB_SCHOOL_MAP.get(t.id)!.conf === conf)
    .sort((a, b) => b.confWins - a.confWins || a.confLosses - b.confLosses || b.wins - a.wins || cfbStrength(b) - cfbStrength(a));
}

export interface CfbPlayoffGame { name: string; home: string; away: string; hs: number; as: number; winner: string }

/** Conference title games, then the real 12-team CFP (5 champs + 7 at-large, straight seeding, byes for 1-4). */
export function runCfbPostseason(st: CfbState, rng: () => number): { ccgs: CfbPlayoffGame[]; bracket: CfbPlayoffGame[]; champion: string; field: string[] } {
  const ccgs: CfbPlayoffGame[] = [];
  const champs: string[] = [];
  for (const conf of CFB_CONFS) {
    const table = confStandings(st, conf);
    const a = table[0], b = table[1];
    const { hs, as: as2, winner } = playCfbGame(st, a.id, b.id, rng);
    const aWins = winner === a.id;
    ccgs.push({ name: `${conf} Championship`, home: a.id, away: b.id, hs, as: as2, winner });
    st.teams[winner].wins += 1; st.teams[aWins ? b.id : a.id].losses += 1;
    st.teams[winner].champion = true;
    champs.push(winner);
    /* Round 728: the title game is on both resumes before the field is picked. */
    if (st.depth) { (a.opps ??= []).push(b.id); (b.opps ??= []).push(a.id); }
  }
  const ranked = cfbRankings(st).map(t => t.id);
  const champSet = new Set(champs);
  const atLarge = ranked.filter(id => !champSet.has(id)).slice(0, 7);
  const field = ranked.filter(id => champSet.has(id) || atLarge.includes(id)).slice(0, 12);
  const seed = (i: number) => st.teams[field[i]];

  const bracket: CfbPlayoffGame[] = [];
  const play = (name: string, hi: number, lo: string): string => {
    const home = seed(hi);
    const away = st.teams[lo];
    const { hs, as: as2, winner } = playCfbGame(st, home.id, away.id, rng);
    bracket.push({ name, home: home.id, away: away.id, hs, as: as2, winner });
    return winner;
  };
  // First round: 5v12 6v11 7v10 8v9 (1-4 byes)
  const r1 = [
    play('CFP First Round', 4, field[11]),
    play('CFP First Round', 5, field[10]),
    play('CFP First Round', 6, field[9]),
    play('CFP First Round', 7, field[8]),
  ];
  // Quarterfinals: 1 vs winner(8v9), 2 vs winner(7v10), 3 vs winner(6v11), 4 vs winner(5v12)
  const qf = [
    play('CFP Quarterfinal', 0, r1[3]),
    play('CFP Quarterfinal', 1, r1[2]),
    play('CFP Quarterfinal', 2, r1[1]),
    play('CFP Quarterfinal', 3, r1[0]),
  ];
  const sf1 = playPair('CFP Semifinal', qf[0], qf[3], st, rng, bracket);
  const sf2 = playPair('CFP Semifinal', qf[1], qf[2], st, rng, bracket);
  const champion = playPair('National Championship', sf1, sf2, st, rng, bracket);
  return { ccgs, bracket, champion, field };
}

function playPair(name: string, aId: string, bId: string, st: CfbState, rng: () => number, out: CfbPlayoffGame[]): string {
  const { hs, as: as2, winner } = playCfbGame(st, aId, bId, rng);
  out.push({ name, home: aId, away: bId, hs, as: as2, winner });
  return winner;
}

export interface HeismanFinalist { name: string; team: string; pos: CfbPos; score: number }

/** Heisman: offensive skill players on winning teams, best score wins. */
export function heismanRace(st: CfbState, rng: () => number): HeismanFinalist[] {
  const finalists: HeismanFinalist[] = [];
  const past = new Set(st.heismanWinners ?? []);
  for (const t of Object.values(st.teams)) {
    for (const p of t.players) {
      if (p.pos !== 'QB' && p.pos !== 'RB' && p.pos !== 'WR') continue;
      if (past.has(p.name)) continue; // one Heisman per fictional legend
      const score = p.ovr * 1.2 + t.wins * 2.4 + (p.pos === 'QB' ? 6 : 0) + rng() * 10;
      finalists.push({ name: p.name, team: t.id, pos: p.pos, score: Math.round(score * 10) / 10 });
    }
  }
  return finalists.sort((a, b) => b.score - a.score).slice(0, 4);
}

// ---- Recruiting + portal ----

export interface CfbRecruit { id: string; name: string; pos: CfbPos; stars: number; grade: number; trueOvr: number; nilAsk: number }

export function nilBudgetFor(prestige: number, winsLastSeason: number): number {
  return Math.round(40 + (prestige - 70) * 2.2 + winsLastSeason * 3);
}

export function cfbRecruitClass(rng: () => number, size = 18): CfbRecruit[] {
  const POS: CfbPos[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'DB', 'DB'];
  const out: CfbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const starRoll = rng() * 100;
    const stars = starRoll > 93 ? 5 : starRoll > 72 ? 4 : starRoll > 34 ? 3 : 2;
    const trueOvr = 54 + stars * 5 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: cfbGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      stars,
      grade: clampi(trueOvr + Math.floor(rng() * 9) - 4, 50, 92),
      trueOvr,
      nilAsk: stars * 9 + Math.floor(rng() * 8),
    });
  }
  return out.sort((a, b) => b.stars - a.stars || b.grade - a.grade);
}

export function cfbPortalPool(rng: () => number, size = 8): CfbRecruit[] {
  const POS: CfbPos[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
  const out: CfbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 70 + Math.floor(rng() * 16);
    out.push({
      id: fid(), name: cfbGenName(rng), pos: POS[i % POS.length],
      stars: trueOvr >= 82 ? 4 : 3,
      grade: trueOvr, // portal players have real tape: no scouting error
      trueOvr,
      nilAsk: Math.round((trueOvr - 62) * 1.4),
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function signRecruit(st: CfbState, r: CfbRecruit, cls: CfbClass, rng: () => number): boolean {
  if (st.nil < r.nilAsk) return false;
  st.nil -= r.nilAsk;
  st.teams[st.myTeam].players.push({
    id: fid(), name: r.name, pos: r.pos, cls,
    ovr: r.trueOvr, pot: clampi(r.trueOvr + 5 + Math.floor(rng() * 8), r.trueOvr, 99),
    stars: r.stars,
  });
  return true;
}

/**
 * Round 728: the offseason opens. The program budget for the cycle is the
 * old NIL formula (prestige plus last season's wins) plus whatever rivalry
 * week swung it by. The coaching carousel turns (AI programs refill their
 * chairs; a chair of mine that empties stays empty for me to fill), the
 * staff are paid off the top, and what is left is the NIL pot for the
 * class. A legacy save just gets the old budget. Runs once per offseason:
 * a second call for the same season changes nothing.
 */
export function cfbOpenOffseason(st: CfbState, rng: () => number): string[] {
  const school = CFB_SCHOOL_MAP.get(st.myTeam)!;
  const base = nilBudgetFor(school.prestige, st.teams[st.myTeam].wins);
  if (!st.depth) { st.nil = base; return []; }
  if (st.staffWindow && st.staffWindow.season === st.season) return [];
  const notes: string[] = [];
  const rivalry = st.lastRivalry && st.lastRivalry.season === st.season ? st.lastRivalry : null;
  const budget = Math.max(0, base + (rivalry?.recruit ?? 0));
  if (rivalry) {
    notes.push(rivalry.won
      ? `🔥 Beating ${CFB_SCHOOL_MAP.get(rivalry.opp)?.name ?? rivalry.opp} is worth ${rivalry.recruit} more budget points on the trail.`
      : `🧊 Losing to ${CFB_SCHOOL_MAP.get(rivalry.opp)?.name ?? rivalry.opp} costs ${-rivalry.recruit} budget points on the trail.`);
  }
  for (const s of CFB_SCHOOLS) {
    const t = st.teams[s.id];
    if (!t) continue;
    if (!t.staff) t.staff = genStaff(rng, s.prestige, s.id, st.season);
    const mine = s.id === st.myTeam;
    const gone = staffCarousel(rng, t.staff, { prestige: s.prestige, wins: t.wins, losses: t.losses, mine, season: st.season, idPrefix: s.id });
    if (!mine) continue;
    for (const g of gone) {
      notes.push(g.why === 'poached'
        ? `📋 Your ${g.role === 'OC' ? 'offensive' : 'defensive'} coordinator ${g.who.name} (${g.who.rating}) took a head coaching job. The chair is open.`
        : `📋 ${g.who.name} is gone. The ${g.role} chair is open.`);
    }
  }
  const myStaff = st.teams[st.myTeam].staff!;
  const { left, walked } = chargePayroll(budget, myStaff);
  for (const w of walked) {
    notes.push(`💸 The budget could not cover ${w.name} (${w.role}, ${w.salary} a season), so he walked.`);
  }
  st.nil = left;
  st.staffWindow = { season: st.season, budget, market: staffCandidates(rng, school.prestige, st.season) };
  return notes;
}

/** Round 728: hire off the offseason market, only while its window is open.
 *  The man already in that chair goes and his money comes back first. */
export function cfbHireCoordinator(st: CfbState, candidateId: string): boolean {
  const win = st.staffWindow;
  const staff = st.teams[st.myTeam]?.staff;
  if (!st.depth || !win || win.season !== st.season || !staff) return false;
  const cand = win.market.find(c => c.id === candidateId);
  if (!cand) return false;
  if (!hireCoordinator(st, staff, cand)) return false;
  win.market = win.market.filter(c => c.id !== candidateId);
  return true;
}

/** Round 728: let a coordinator go while the window is open. His salary goes back into the pot. */
export function cfbFireCoordinator(st: CfbState, role: StaffRole): Coordinator | null {
  const win = st.staffWindow;
  const staff = st.teams[st.myTeam]?.staff;
  if (!st.depth || !win || win.season !== st.season || !staff) return null;
  return fireCoordinator(st, staff, role);
}

/** Round 728: what the staff costs this season. */
export function cfbPayroll(st: CfbState): number {
  return staffPayroll(st.teams[st.myTeam]?.staff);
}

/** Offseason: classes advance, seniors graduate, elite juniors declare, everyone develops, AI reloads. */
export function cfbOffseason(st: CfbState, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(st.teams)) {
    const prestige = CFB_SCHOOL_MAP.get(t.id)!.prestige;
    const keep: CfbPlayer[] = [];
    for (const p of t.players) {
      if (p.cls === 'SR') {
        if (t.id === st.myTeam) notes.push(`🎓 ${p.name} (${p.pos}) graduates.`);
        continue;
      }
      if (p.cls === 'JR' && p.ovr >= 88 && rng() < 0.6) {
        if (t.id === st.myTeam) notes.push(`🏈 ${p.name} (${p.pos}, ${p.ovr}) declares for the draft.`);
        continue;
      }
      const grow = p.cls === 'FR' ? 3 + Math.floor(rng() * 4) : p.cls === 'SO' ? 2 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3);
      p.ovr = clampi(Math.min(p.pot, p.ovr + grow), 55, 99);
      p.cls = p.cls === 'FR' ? 'SO' : p.cls === 'SO' ? 'JR' : 'SR';
      keep.push(p);
    }
    t.players = keep;
    /* AI reload: fill back to 12 with freshmen scaled to prestige.
       ROUND 426: TOP UP THE POSITIONS THE ROSTER IS MISSING. This used to read
       ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length], which indexes by how
       many players the team happens to have while filling. The skill positions
       are the FIRST five entries of ROSTER_SHAPE, so any team that kept five or
       more players could only ever draw index 5 and up: linemen and defenders.
       Seniors graduate and elite juniors declare every offseason, so quarterbacks,
       backs and receivers drained away season after season and were never
       replaced. By the fifth season no team on the board had a QB, RB or WR,
       heismanRace found nobody eligible and came back empty, and the [0] index in
       the board threw and bricked the save (part one of this round).
       Subtracting what the roster already has from a copy of ROSTER_SHAPE fills
       the actual holes instead. The rng draws are unchanged in count and order,
       so this only moves which position a freshman plays. */
    const need = [...ROSTER_SHAPE];
    for (const p of t.players) {
      const i = need.indexOf(p.pos);
      if (i !== -1) need.splice(i, 1);
    }
    while (t.players.length < 12) {
      const stars = starsFor(prestige, rng);
      const ovr = clampi(prestige - 16 + stars * 1.6 + Math.floor(rng() * 5), 55, 90);
      t.players.push({
        id: fid(), name: cfbGenName(rng),
        pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],
        cls: 'FR', ovr, pot: clampi(ovr + 6 + Math.floor(rng() * 7), ovr, 99), stars,
      });
    }
    t.wins = 0; t.losses = 0; t.confWins = 0; t.confLosses = 0; t.champion = false;
    /* Round 728: a new season's log, and rivalry week's morale is spent. */
    if (st.depth) { t.opps = []; t.morale = 0; }
  }
  if (st.depth) st.mySlate = [];
  st.season += 1;
  st.round = 1;
  return notes;
}
