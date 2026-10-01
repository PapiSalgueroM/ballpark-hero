import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
import {
  buildRivalries, enableProgramLayer, openProgramOffseason, recordProgramRound, rivalOf, sosTable,
  staffEdges, staffPayroll, strengthOfSchedule, windowFire, windowHire,
  type Coordinator, type ProgramSport, type ProgramStaff, type RivalKind, type RivalryResult, type Rivalry,
  type SlateGame, type StaffRole, type StaffWindow,
} from './collegeProgram';
/**
 * CBB Dynasty engine (2026-08-05). College basketball sibling of
 * cfbDynasty.ts. Real programs, fully fictional generated players (class
 * years FR-SR), so no real athlete's likeness appears anywhere.
 *
 * 40 real programs across six groups: ACC, SEC, Big Ten, Big 12, Big East
 * and a Mid-Major bucket built for Cinderella runs. Prestige is editorial.
 *
 * Season: 10 rounds of two games (20-game-shaped), single-elimination
 * conference tournaments (top four per group), then a 32-team national
 * tournament: six tournament champions auto-bid, 26 at-larges, straight
 * seeding, five rounds from the Round of 32 to the title. The engine
 * tracks the lowest seed to crash the Final Four for Cinderella headlines.
 *
 * College hoops flavor: elite freshmen are ONE-AND-DONE (88+ overall
 * declares after year one), the portal never sleeps, and a National Player
 * of the Year is crowned once per fictional career.
 *
 * Round 823: the program layer CFB Dynasty got in Round 728, bound here
 * through src/lib/collegeProgram.ts rather than written again. Two assistants
 * (offense and defense, generated people) each move their end of the floor
 * by at most 3 rating points and are paid out of the program budget before
 * NIL; the last round's league night is rivalry night; and the committee
 * reads strength of schedule. A save from before it has none of the new
 * fields and plays exactly as it did (scripts/simCbbStaff.mjs holds that to
 * a digest), then picks the layer up when its offseason closes.
 */

export type CbbPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type CbbClass = 'FR' | 'SO' | 'JR' | 'SR';

export interface CbbSchool {
  id: string;
  name: string;
  color: string;
  prestige: number;
  conf: 'ACC' | 'SEC' | 'B1G' | 'B12' | 'BE' | 'MM';
}

export const CBB_SCHOOLS: CbbSchool[] = [
  // ACC (6)
  { id: 'DUKE', name: 'Duke', color: '#003087', prestige: 95, conf: 'ACC' },
  { id: 'UNC', name: 'North Carolina', color: '#7BAFD4', prestige: 93, conf: 'ACC' },
  { id: 'UVA', name: 'Virginia', color: '#232D4B', prestige: 84, conf: 'ACC' },
  { id: 'LOU', name: 'Louisville', color: '#AD0000', prestige: 84, conf: 'ACC' },
  { id: 'CUSE', name: 'Syracuse', color: '#F76900', prestige: 80, conf: 'ACC' },
  { id: 'NCST', name: 'NC State', color: '#CC0000', prestige: 79, conf: 'ACC' },
  // SEC (7)
  { id: 'UK', name: 'Kentucky', color: '#0033A0', prestige: 93, conf: 'SEC' },
  { id: 'AUB', name: 'Auburn', color: '#0C2340', prestige: 90, conf: 'SEC' },
  { id: 'FLA', name: 'Florida', color: '#0021A5', prestige: 90, conf: 'SEC' },
  { id: 'BAMA', name: 'Alabama', color: '#9E1B32', prestige: 89, conf: 'SEC' },
  { id: 'TENN', name: 'Tennessee', color: '#FF8200', prestige: 88, conf: 'SEC' },
  { id: 'ARK', name: 'Arkansas', color: '#9D2235', prestige: 84, conf: 'SEC' },
  { id: 'A&M', name: 'Texas A&M', color: '#500000', prestige: 82, conf: 'SEC' },
  // Big Ten (7)
  { id: 'PUR', name: 'Purdue', color: '#CEB888', prestige: 89, conf: 'B1G' },
  { id: 'MSU', name: 'Michigan State', color: '#18453B', prestige: 88, conf: 'B1G' },
  { id: 'UCLA', name: 'UCLA', color: '#2D68C4', prestige: 86, conf: 'B1G' },
  { id: 'ILL', name: 'Illinois', color: '#E84A27', prestige: 85, conf: 'B1G' },
  { id: 'MICH', name: 'Michigan', color: '#00274C', prestige: 84, conf: 'B1G' },
  { id: 'IU', name: 'Indiana', color: '#990000', prestige: 84, conf: 'B1G' },
  { id: 'WISC', name: 'Wisconsin', color: '#C5050C', prestige: 83, conf: 'B1G' },
  // Big 12 (7)
  { id: 'KU', name: 'Kansas', color: '#0051BA', prestige: 94, conf: 'B12' },
  { id: 'HOU', name: 'Houston', color: '#C8102E', prestige: 92, conf: 'B12' },
  { id: 'BAY', name: 'Baylor', color: '#154734', prestige: 87, conf: 'B12' },
  { id: 'ISU', name: 'Iowa State', color: '#C8102E', prestige: 86, conf: 'B12' },
  { id: 'TTU', name: 'Texas Tech', color: '#CC0000', prestige: 85, conf: 'B12' },
  { id: 'ZONA', name: 'Arizona', color: '#AB0520', prestige: 88, conf: 'B12' },
  { id: 'BYU', name: 'BYU', color: '#002E5D', prestige: 82, conf: 'B12' },
  // Big East (7)
  { id: 'UCONN', name: 'UConn', color: '#000E2F', prestige: 94, conf: 'BE' },
  { id: 'NOVA', name: 'Villanova', color: '#00205B', prestige: 85, conf: 'BE' },
  { id: 'CREI', name: 'Creighton', color: '#005CA9', prestige: 85, conf: 'BE' },
  { id: 'MARQ', name: 'Marquette', color: '#003366', prestige: 85, conf: 'BE' },
  { id: 'SJU', name: "St. John's", color: '#BA0C2F', prestige: 84, conf: 'BE' },
  { id: 'XAV', name: 'Xavier', color: '#0C2340', prestige: 81, conf: 'BE' },
  { id: 'BUT', name: 'Butler', color: '#13294B', prestige: 78, conf: 'BE' },
  // Mid-Majors (6): the Cinderella pipeline
  { id: 'ZAGA', name: 'Gonzaga', color: '#041E42', prestige: 90, conf: 'MM' },
  { id: 'SDSU', name: 'San Diego State', color: '#A6192E', prestige: 83, conf: 'MM' },
  { id: 'SMC', name: "Saint Mary's", color: '#06315B', prestige: 82, conf: 'MM' },
  { id: 'MEM', name: 'Memphis', color: '#003087', prestige: 81, conf: 'MM' },
  { id: 'DAY', name: 'Dayton', color: '#CE1141', prestige: 80, conf: 'MM' },
  { id: 'VCU', name: 'VCU', color: '#F8B800', prestige: 79, conf: 'MM' },
];

export const CBB_SCHOOL_MAP = new Map(CBB_SCHOOLS.map(s => [s.id, s]));
export const CBB_CONFS = ['ACC', 'SEC', 'B1G', 'B12', 'BE', 'MM'] as const;
export const CBB_ROUNDS = 10;
export const CBB_GAMES_PER_ROUND = 2;
export const DANCE_SIZE = 32;

/** Round 823: the state each school is in, copied from src/data/colleges.ts
 *  (one row per school, each with its IPEDS unit id) and held against it by
 *  scripts/simCbbStaff.mjs, so rivalry night can pair in-state schools
 *  without this engine pulling the whole college quiz table into its chunk.
 *  Thirteen programs are not in that table (Virginia, NC State, Texas Tech,
 *  UConn, Villanova, Creighton, Marquette, St. John's, Xavier, Butler,
 *  Saint Mary's, Dayton and VCU), so they have no state here and are never
 *  called an in-state game. */
export const CBB_SCHOOL_STATES: Record<string, string> = {
  DUKE: 'North Carolina', UNC: 'North Carolina', LOU: 'Kentucky', CUSE: 'New York',
  UK: 'Kentucky', AUB: 'Alabama', FLA: 'Florida', BAMA: 'Alabama', TENN: 'Tennessee', ARK: 'Arkansas', 'A&M': 'Texas',
  PUR: 'Indiana', MSU: 'Michigan', UCLA: 'California', ILL: 'Illinois', MICH: 'Michigan', IU: 'Indiana', WISC: 'Wisconsin',
  KU: 'Kansas', HOU: 'Texas', BAY: 'Texas', ISU: 'Iowa', ZONA: 'Arizona', BYU: 'Utah',
  ZAGA: 'Washington', SDSU: 'California', MEM: 'Tennessee',
};

/** Round 823: the last round's league night is rivalry night. */
export const CBB_RIVALRY_ROUND = CBB_ROUNDS;
/** A rivalry won by this many points or more swings the most. Measured over
 *  2,000 rivalry games (Round 823), the median margin is 18 and the top
 *  quarter starts at 26, so 25 keeps the full swing for a real blowout. */
export const CBB_RIVAL_FULL_MARGIN = 25;
/** Points a game per point of assistant edge, his end against theirs. */
export const CBB_POINTS_PER_EDGE = 1.5;
/** How much the committee weighs strength of schedule: the same as the eye test. */
export const CBB_SOS_WEIGHT = 0.8;

let rivalryCache: Rivalry[] | null = null;
/** Every school's rivalry night opponent. Built on first use rather than at
 *  module scope, the house rule for anything computed from an import. */
export function cbbRivalries(): Rivalry[] {
  if (!rivalryCache) rivalryCache = buildRivalries(CBB_SCHOOLS, CBB_SCHOOL_STATES);
  return rivalryCache;
}
export function cbbRivalOf(id: string): { rival: string; kind: RivalKind; state?: string } | null {
  return rivalOf(cbbRivalries(), id);
}

/** Round 823: basketball's descriptor for the shared program glue. The chairs
 *  are the two ends of the floor, so the notes call them that. */
export const CBB_PROGRAM: ProgramSport = {
  schools: CBB_SCHOOLS,
  rivalFullMargin: CBB_RIVAL_FULL_MARGIN,
  rivalOf: cbbRivalOf,
  roleTitle: { OC: 'offensive assistant', DC: 'defensive assistant' },
  chairName: { OC: 'offense', DC: 'defense' },
};

export interface CbbPlayer {
  id: string;
  name: string;
  pos: CbbPos;
  cls: CbbClass;
  ovr: number;
  pot: number;
  stars: number;
}

export interface CbbTeam {
  id: string;
  players: CbbPlayer[];
  wins: number;
  losses: number;
  confChamp: boolean; // won the conference tournament
  /* Round 823, all optional: a save from before it has none of them and
     plays exactly as it did (scripts/simCbbStaff.mjs holds that to a digest). */
  staff?: ProgramStaff;
  /** Strength points carried out of rivalry night into March, reset each offseason. */
  morale?: number;
  /** Everyone this team has played in the regular season, the games in its record. */
  opps?: string[];
}

/** Round 823: my rivalry night result, kept until the offseason spends its recruiting swing. */
export type CbbRivalryResult = RivalryResult;
/** Round 823: one line of my schedule. */
export type CbbSlateGame = SlateGame;
/** Round 823: the offseason hiring window, open for one season's offseason. */
export type CbbStaffWindow = StaffWindow;

export interface CbbState {
  season: number;
  teams: Record<string, CbbTeam>;
  round: number;
  myTeam: string;
  nil: number;
  titles: { season: number; team: string }[];
  myTitles: number;
  seasonsPlayed: number;
  poyWinners: string[];
  /** Round 823: present once the program layer (staff, rivalry night,
   *  strength of schedule) is on. Absent means the pre-823 game, untouched. */
  depth?: number;
  lastRivalry?: CbbRivalryResult | null;
  mySlate?: CbbSlateGame[];
  staffWindow?: CbbStaffWindow | null;
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
const fid = makeIdMinter('b');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureCbbIds(lg: CbbState, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  return ensureLeagueEntityIds(fid, lg as never, ...loose);
}

const FIRST = ['Jalen', 'Zion', 'Cooper', 'Tre', 'DeAndre', 'Boogie', 'Kellan', 'Marcus', 'Ty', 'Isaiah', 'Jett', 'Duncan', 'Ace', 'Miles', 'Quincy', 'Reed', 'Silas', 'Trey', 'Vance', 'Zeke'];
const LAST = ['Abernathy', 'Bright', 'Calloway', 'Dupree', 'Eastwood', 'Fenwick', 'Grimes', 'Holloway', 'Ivey', 'Jasper', 'Kingsley', 'Lockhart', 'Mabrey', 'Northcutt', 'Overton', 'Pryor', 'Quarles', 'Ridley', 'Sessoms', 'Thurman'];
export function cbbGenName(rng: () => number): string {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

const ROSTER_SHAPE: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'SG', 'SF', 'PF'];
const CLASSES: CbbClass[] = ['FR', 'SO', 'JR', 'SR'];

function clampi(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function starsFor(prestige: number, rng: () => number): number {
  const roll = rng() * 100 + (prestige - 80);
  return roll > 91 ? 5 : roll > 68 ? 4 : roll > 32 ? 3 : 2;
}

export function initCbb(myTeam: string, rng: () => number = Math.random, opts: { depth?: boolean } = {}): CbbState {
  const st = initCbbLegacy(myTeam, rng);
  /* Round 823: every draw the pre-823 start made is made first and in the
     same order, so a legacy start is the same league it always was. */
  if (opts.depth) cbbEnableDepth(st, rng);
  return st;
}

/**
 * Round 823: switch the program layer on. Every program gets an offensive and
 * a defensive assistant at its own level, and the season log starts. A new
 * dynasty does this at the start; a save from before Round 823 does it when
 * its offseason closes, so the season it was in the middle of finishes
 * exactly as it would have.
 */
export function cbbEnableDepth(st: CbbState, rng: () => number): void {
  enableProgramLayer(st, CBB_PROGRAM, rng);
}

function initCbbLegacy(myTeam: string, rng: () => number): CbbState {
  const teams: Record<string, CbbTeam> = {};
  for (const s of CBB_SCHOOLS) {
    const players: CbbPlayer[] = ROSTER_SHAPE.map(pos => {
      const stars = starsFor(s.prestige, rng);
      const cls = CLASSES[Math.floor(rng() * 4)];
      const base = s.prestige - 13 + stars * 1.7 + (cls === 'FR' ? -1 : cls === 'SO' ? 0 : cls === 'JR' ? 1 : 2);
      const ovr = clampi(Math.round(base + rng() * 6 - 3), 55, 96);
      return { id: fid(), name: cbbGenName(rng), pos, cls, ovr, pot: clampi(ovr + (4 - CLASSES.indexOf(cls)) * 2 + Math.floor(rng() * 6), ovr, 99), stars };
    });
    teams[s.id] = { id: s.id, players, wins: 0, losses: 0, confChamp: false };
  }
  return { season: 2026, teams, round: 1, myTeam, nil: cbbNilFor(CBB_SCHOOL_MAP.get(myTeam)!.prestige, 0), titles: [], myTitles: 0, seasonsPlayed: 0, poyWinners: [] };
}

/** The rotation on its own: the top five carry three quarters of it. */
function cbbRotation(t: CbbTeam): number {
  const sorted = [...t.players].sort((a, b) => b.ovr - a.ovr);
  const five = sorted.slice(0, 5);
  const bench = sorted.slice(5, 8);
  const avg = (xs: CbbPlayer[], f: number) => (xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : f);
  return avg(five, 60) * 0.75 + avg(bench, 60) * 0.25;
}

export function cbbStrength(t: CbbTeam): number {
  /* Round 823: half of each assistant's edge (each end of the floor is half
     the game) and the morale rivalry night carries into March. Both are
     absent on a pre-823 save, which therefore rates exactly as it did. */
  const staff = t.staff ? staffEdges(t.staff) : null;
  const staffPart = staff ? (staff.off + staff.def) / 2 : 0;
  return cbbRotation(t) + staffPart + (t.morale ?? 0);
}

/** Round 823: each end of the floor. Everybody plays both ends, so both start
 *  from the rotation and each assistant moves his end by at most
 *  STAFF_UNIT_EDGE_MAX; the team (before morale) is the two ends averaged. */
export function cbbUnits(t: CbbTeam): { off: number; def: number; offEdge: number; defEdge: number } {
  const base = cbbRotation(t);
  const e = staffEdges(t.staff);
  return { off: base + e.off, def: base + e.def, offEdge: e.off, defEdge: e.def };
}

export function cbbWinProb(a: CbbTeam, b: CbbTeam): number {
  const gap = cbbStrength(a) - cbbStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 6.5)); // one bad night can still end a season
}

export interface CbbGame { home: string; away: string; hs: number; as: number; winner: string; rivalry?: boolean }

function hoopsScore(win: boolean, rng: () => number): number {
  return win ? 68 + Math.floor(rng() * 26) : 52 + Math.floor(rng() * 24);
}

/**
 * Round 823: the score of a game whose winner is already decided, with the
 * program layer on. Each side's points move by CBB_POINTS_PER_EDGE for every
 * point its offensive assistant's edge beats the other side's defensive
 * assistant's. The loser always ends at least one possession behind (1 to 3
 * points, drawn): when the shifted scores leave him closer than that, level
 * or ahead, the LOSER comes down to it, never the winner up: raising
 * the winner looked equivalent in Round 728 and is not, because a better
 * coach could then score fewer points in a game he won. Every game makes the
 * same three draws whatever the scores, so a different assistant never
 * reshuffles the rest of the season.
 */
function depthScores(home: CbbTeam, away: CbbTeam, homeWins: boolean, rng: () => number): [number, number] {
  const h = staffEdges(home.staff);
  const a = staffEdges(away.staff);
  const hs = Math.max(0, Math.round(hoopsScore(homeWins, rng) + CBB_POINTS_PER_EDGE * (h.off - a.def)));
  const as = Math.max(0, Math.round(hoopsScore(!homeWins, rng) + CBB_POINTS_PER_EDGE * (a.off - h.def)));
  const finish = 1 + Math.floor(rng() * 3);
  return homeWins ? [hs, Math.max(0, Math.min(as, hs - finish))] : [Math.max(0, Math.min(hs, as - finish)), as];
}

function playGame(aId: string, bId: string, st: CbbState, rng: () => number, record = true): CbbGame {
  const a = st.teams[aId], b = st.teams[bId];
  const p = cbbWinProb(a, b);
  const aWins = rng() < p;
  let hs: number, as2: number;
  if (st.depth) {
    [hs, as2] = depthScores(a, b, aWins, rng);
  } else {
    /* The pre-823 shape, verbatim, draws and quirks included. */
    hs = hoopsScore(aWins, rng); as2 = hoopsScore(!aWins, rng);
    if (aWins && hs <= as2) hs = as2 + 1 + Math.floor(rng() * 8);
    if (!aWins && as2 <= hs) as2 = hs + 1 + Math.floor(rng() * 8);
  }
  const g: CbbGame = { home: aId, away: bId, hs, as: as2, winner: aWins ? aId : bId };
  if (record) {
    st.teams[g.winner].wins += 1;
    st.teams[g.winner === aId ? bId : aId].losses += 1;
  }
  return g;
}

/** One round: every program plays two games, one in-conference, one cross.
 *  Round 823: with the program layer on, the last round is rivalry night. */
export function simCbbRound(st: CbbState, rng: () => number): { games: CbbGame[]; myGames: CbbGame[] } {
  const games: CbbGame[] = [];
  if (st.depth && st.round === CBB_RIVALRY_ROUND) {
    playRivalryNight(st, rng, games);
  } else {
    for (const inConf of [true, false]) {
      const paired = new Set<string>();
      for (const s of CBB_SCHOOLS) {
        if (paired.has(s.id)) continue;
        const candidates = CBB_SCHOOLS.filter(o =>
          o.id !== s.id && !paired.has(o.id) && (inConf ? o.conf === s.conf : o.conf !== s.conf));
        const opp = candidates.length
          ? candidates[Math.floor(rng() * candidates.length)]
          : CBB_SCHOOLS.find(o => o.id !== s.id && !paired.has(o.id));
        if (!opp) continue;
        paired.add(s.id); paired.add(opp.id);
        games.push(playGame(s.id, opp.id, st, rng));
      }
    }
  }
  /* Round 823: the season log and the rivalry swing, the shared copy. */
  if (st.depth) recordProgramRound(st, games, CBB_PROGRAM);
  return { games, myGames: games.filter(g => g.home === st.myTeam || g.away === st.myTeam) };
}

/**
 * Round 823: the last round with the program layer on. The league night is
 * rivalry night: every program plays its rival whatever league he is in,
 * home court alternating by season the way a series does. The cross-country
 * game is then drawn for everybody before any of it is played, so a draw that
 * hands somebody his rival a second time can be untangled: that game swaps
 * opponents with another one, and since every school has exactly one rival
 * the swap can never make a new rival pair.
 */
function playRivalryNight(st: CbbState, rng: () => number, games: CbbGame[]): void {
  for (const r of cbbRivalries()) {
    if (!st.teams[r.a] || !st.teams[r.b]) continue;
    const g = st.season % 2 === 0 ? playGame(r.a, r.b, st, rng) : playGame(r.b, r.a, st, rng);
    g.rivalry = true;
    games.push(g);
  }
  const paired = new Set<string>();
  const pairs: [string, string][] = [];
  for (const s of CBB_SCHOOLS) {
    if (paired.has(s.id)) continue;
    const candidates = CBB_SCHOOLS.filter(o => o.id !== s.id && !paired.has(o.id) && o.conf !== s.conf);
    const opp = candidates.length
      ? candidates[Math.floor(rng() * candidates.length)]
      : CBB_SCHOOLS.find(o => o.id !== s.id && !paired.has(o.id));
    if (!opp) continue;
    paired.add(s.id); paired.add(opp.id);
    pairs.push([s.id, opp.id]);
  }
  for (let i = 0; i < pairs.length && pairs.length > 1; i += 1) {
    const [a, b] = pairs[i];
    if (cbbRivalOf(a)?.rival !== b) continue;
    const j = i === 0 ? 1 : 0;
    const [c, d] = pairs[j];
    pairs[i] = [a, d];
    pairs[j] = [c, b];
  }
  for (const [home, away] of pairs) games.push(playGame(home, away, st, rng));
}

/** Round 823: a team's strength of schedule, the average strength of the
 *  opponents it has actually played this regular season, or null before it
 *  has played anyone. */
export function cbbSos(st: CbbState, id: string): number | null {
  return strengthOfSchedule(st.teams[id]?.opps, oid => cbbStrength(st.teams[oid]));
}

/** Every team's strength of schedule and where it ranks, hardest first. */
export function cbbSosTable(st: CbbState): Map<string, { sos: number; rank: number }> {
  return sosTable(st, cbbStrength);
}

/** Committee score: record first, but the eye test (strength) matters. */
function seedScore(t: CbbTeam): number {
  return t.wins * 1.6 + cbbStrength(t) * 0.8;
}

/** The committee's list, which seeds March and hands out its 26 at-large
 *  bids. Round 823: with the program layer on it reads who you played too,
 *  weighed the same as the eye test, so of two teams on the same record and
 *  the same strength the tougher schedule goes first. Before anyone has
 *  played, a team's own strength stands in for its schedule. */
export function cbbRankings(st: CbbState): CbbTeam[] {
  if (!st.depth) return Object.values(st.teams).sort((a, b) => seedScore(b) - seedScore(a));
  const str = new Map(Object.values(st.teams).map(t => [t.id, cbbStrength(t)]));
  const score = new Map(Object.values(st.teams).map(t => {
    const own = str.get(t.id)!;
    const sos = strengthOfSchedule(t.opps, oid => str.get(oid) ?? 60) ?? own;
    return [t.id, t.wins * 1.6 + own * 0.8 + sos * CBB_SOS_WEIGHT];
  }));
  return Object.values(st.teams).sort((a, b) => score.get(b.id)! - score.get(a.id)!);
}

export function cbbConfStandings(st: CbbState, conf: string): CbbTeam[] {
  return Object.values(st.teams)
    .filter(t => CBB_SCHOOL_MAP.get(t.id)!.conf === conf)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || cbbStrength(b) - cbbStrength(a));
}

export interface CbbBracketGame { name: string; home: string; away: string; hs: number; as: number; winner: string; homeSeed: number; awaySeed: number }

export interface MarchResult {
  confFinals: CbbGame[];
  autoBids: string[];
  field: string[];             // 32 ids in seed order
  bracket: CbbBracketGame[];   // 31 games
  champion: string;
  cinderella: { team: string; seed: number } | null; // lowest seed in the Final Four (seed 5+)
  myExit: string;              // round name of my exit or 'Champions' or 'Missed the field'
}

/** Conference tournaments (top four, semis + final), then the 32-team Dance. */
export function runMarch(st: CbbState, rng: () => number): MarchResult {
  const confFinals: CbbGame[] = [];
  const autoBids: string[] = [];
  for (const conf of CBB_CONFS) {
    const top4 = cbbConfStandings(st, conf).slice(0, 4);
    const semi1 = playGame(top4[0].id, top4[3].id, st, rng, false);
    const semi2 = playGame(top4[1].id, top4[2].id, st, rng, false);
    const final = playGame(semi1.winner, semi2.winner, st, rng, false);
    confFinals.push(final);
    st.teams[final.winner].confChamp = true;
    autoBids.push(final.winner);
  }
  const ranked = cbbRankings(st).map(t => t.id);
  const bidSet = new Set(autoBids);
  const atLarge = ranked.filter(id => !bidSet.has(id)).slice(0, DANCE_SIZE - autoBids.length);
  const field = ranked.filter(id => bidSet.has(id) || atLarge.includes(id)).slice(0, DANCE_SIZE);
  const seedOf = new Map(field.map((id, i) => [id, i + 1]));

  const bracket: CbbBracketGame[] = [];
  const ROUND_NAMES = ['Round of 32', 'Sweet 16', 'Elite Eight', 'Final Four', 'National Championship'];
  // straight seeding: 1v32, 2v31... reseeded each round is NOT how it works; use fixed bracket pairing 1v32 etc, winners meet 1/32 vs 16/17 style
  let alive = [...field]; // in seed order
  let roundIdx = 0;
  while (alive.length > 1) {
    const next: string[] = [];
    const n = alive.length;
    for (let i = 0; i < n / 2; i++) {
      const aId = alive[i];
      const bId = alive[n - 1 - i];
      const g = playGame(aId, bId, st, rng, false);
      bracket.push({
        name: ROUND_NAMES[Math.min(roundIdx, ROUND_NAMES.length - 1)],
        home: aId, away: bId, hs: g.hs, as: g.as, winner: g.winner,
        homeSeed: seedOf.get(aId)!, awaySeed: seedOf.get(bId)!,
      });
      next.push(g.winner);
    }
    // keep bracket integrity: winners ordered by their original seed
    next.sort((x, y) => seedOf.get(x)! - seedOf.get(y)!);
    alive = next;
    roundIdx += 1;
  }
  const champion = alive[0];

  const finalFour = bracket.filter(g => g.name === 'Final Four').flatMap(g => [
    { team: g.home, seed: g.homeSeed }, { team: g.away, seed: g.awaySeed },
  ]);
  const lowest = finalFour.sort((a, b) => b.seed - a.seed)[0] ?? null;
  const cinderella = lowest && lowest.seed >= 10 ? lowest : null;

  let myExit = 'Missed the field';
  if (field.includes(st.myTeam)) {
    if (champion === st.myTeam) myExit = 'Champions';
    else {
      const lost = bracket.find(g => g.winner !== st.myTeam && (g.home === st.myTeam || g.away === st.myTeam));
      myExit = lost ? `Out in the ${lost.name}` : 'Out early';
    }
  }
  return { confFinals, autoBids, field, bracket, champion, cinderella, myExit };
}

export interface PoyFinalist { name: string; team: string; pos: CbbPos; score: number }

export function poyRace(st: CbbState, rng: () => number): PoyFinalist[] {
  const past = new Set(st.poyWinners ?? []);
  const out: PoyFinalist[] = [];
  for (const t of Object.values(st.teams)) {
    for (const p of t.players) {
      if (past.has(p.name)) continue;
      const score = p.ovr * 1.3 + t.wins * 1.6 + rng() * 8;
      out.push({ name: p.name, team: t.id, pos: p.pos, score: Math.round(score * 10) / 10 });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

// ---- Recruiting ----

export interface CbbRecruit { id: string; name: string; pos: CbbPos; stars: number; grade: number; trueOvr: number; nilAsk: number }

export function cbbNilFor(prestige: number, winsLastSeason: number): number {
  return Math.round(36 + (prestige - 72) * 2.2 + winsLastSeason * 1.6);
}

export function cbbRecruitClass(rng: () => number, size = 14): CbbRecruit[] {
  const POS: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
  const out: CbbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const roll = rng() * 100;
    const stars = roll > 92 ? 5 : roll > 70 ? 4 : roll > 32 ? 3 : 2;
    const trueOvr = 56 + stars * 5 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: cbbGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      stars, grade: clampi(trueOvr + Math.floor(rng() * 9) - 4, 50, 94), trueOvr,
      nilAsk: stars * 8 + Math.floor(rng() * 7),
    });
  }
  return out.sort((a, b) => b.stars - a.stars || b.grade - a.grade);
}

export function cbbPortalPool(rng: () => number, size = 7): CbbRecruit[] {
  const POS: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'SG', 'PF'];
  const out: CbbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 72 + Math.floor(rng() * 15);
    out.push({
      id: fid(), name: cbbGenName(rng), pos: POS[i % POS.length],
      stars: trueOvr >= 83 ? 4 : 3, grade: trueOvr, trueOvr,
      nilAsk: Math.round((trueOvr - 64) * 1.3),
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function cbbSignRecruit(st: CbbState, r: CbbRecruit, cls: CbbClass, rng: () => number): boolean {
  if (st.nil < r.nilAsk) return false;
  st.nil -= r.nilAsk;
  st.teams[st.myTeam].players.push({
    id: fid(), name: r.name, pos: r.pos, cls,
    ovr: r.trueOvr, pot: clampi(r.trueOvr + 5 + Math.floor(rng() * 9), r.trueOvr, 99),
    stars: r.stars,
  });
  return true;
}

/**
 * Round 823: the offseason opens, through the shared glue. The program budget
 * is the old NIL formula (prestige plus last season's wins) plus whatever
 * rivalry night swung it by; the coaching carousel turns; the two assistants
 * are paid off the top; what is left is the NIL pot. A legacy save just gets
 * the old budget, exactly what the board used to set. Runs once per
 * offseason.
 */
export function cbbOpenOffseason(st: CbbState, rng: () => number): string[] {
  const school = CBB_SCHOOL_MAP.get(st.myTeam)!;
  return openProgramOffseason(st, rng, CBB_PROGRAM, cbbNilFor(school.prestige, st.teams[st.myTeam].wins));
}

/** Round 823: hire an assistant off the offseason market while its window is open. */
export function cbbHireCoordinator(st: CbbState, candidateId: string): boolean {
  return windowHire(st, candidateId);
}

/** Round 823: let an assistant go while the window is open. His salary goes back into the pot. */
export function cbbFireCoordinator(st: CbbState, role: StaffRole): Coordinator | null {
  return windowFire(st, role);
}

/** Round 823: what the two assistants cost this season. */
export function cbbPayroll(st: CbbState): number {
  return staffPayroll(st.teams[st.myTeam]?.staff);
}

/** Offseason: one-and-dones leave, seniors graduate, classes advance, AI reloads. */
export function cbbOffseason(st: CbbState, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(st.teams)) {
    const prestige = CBB_SCHOOL_MAP.get(t.id)!.prestige;
    const keep: CbbPlayer[] = [];
    for (const p of t.players) {
      if (p.cls === 'FR' && p.ovr >= 88 && rng() < 0.85) {
        if (t.id === st.myTeam) notes.push(`🎓 One-and-done: ${p.name} (${p.pos}, ${p.ovr}) is off to the pros after one season.`);
        continue;
      }
      if (p.cls === 'SR') {
        if (t.id === st.myTeam) notes.push(`👋 ${p.name} (${p.pos}) graduates.`);
        continue;
      }
      if ((p.cls === 'SO' || p.cls === 'JR') && p.ovr >= 90 && rng() < 0.55) {
        if (t.id === st.myTeam) notes.push(`🏀 ${p.name} (${p.pos}, ${p.ovr}) declares for the draft.`);
        continue;
      }
      const grow = p.cls === 'FR' ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 3);
      p.ovr = clampi(Math.min(p.pot, p.ovr + grow), 55, 99);
      p.cls = p.cls === 'FR' ? 'SO' : p.cls === 'SO' ? 'JR' : 'SR';
      keep.push(p);
    }
    t.players = keep;
    /* Round 426 part four: top up the positions the roster is MISSING, the
       fix the CFB engine got in part two. Indexing ROSTER_SHAPE by how many
       players a team happens to have meant a team keeping five or more could
       only ever draw index 5 and up (SG, SF, PF), so point guards and centers
       drained out of every AI roster: measured over 20 seeds, 39 or 40 of the
       40 teams had no PG after five offseasons. Nothing crashed here, because
       poyRace has no position filter, but the roster tab showed teams with no
       point guard and no center. The rng draws are unchanged in count and
       order, so this only moves which position a freshman plays. */
    const need = [...ROSTER_SHAPE];
    for (const p of t.players) {
      const i = need.indexOf(p.pos);
      if (i !== -1) need.splice(i, 1);
    }
    while (t.players.length < 8) {
      const stars = starsFor(prestige, rng);
      const ovr = clampi(prestige - 15 + stars * 1.7 + Math.floor(rng() * 5), 55, 92);
      t.players.push({
        id: fid(), name: cbbGenName(rng),
        pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],
        cls: 'FR', ovr, pot: clampi(ovr + 6 + Math.floor(rng() * 8), ovr, 99), stars,
      });
    }
    t.wins = 0; t.losses = 0; t.confChamp = false;
    /* Round 823: a new season's log, and rivalry night's morale is spent. */
    if (st.depth) { t.opps = []; t.morale = 0; }
  }
  if (st.depth) st.mySlate = [];
  st.season += 1;
  st.round = 1;
  return notes;
}
