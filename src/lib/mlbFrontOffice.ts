/* Round 829: every club's real 26, generated in the repo from MLB's own Stats
   API record (scripts/genMlbFrontOfficeRoster.mjs). The 13 man file this used
   to read stays for the MLB gauntlet draft, which has its own measured bands. */
import { MLB_FO_ROSTERS_2026 } from '@/data/mlbFoRosters2026';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';
/* Round 531: the tax line comes from one sourced file, never a bare literal here. */
import { MLB_CBT_THRESHOLD_2026 } from './leagueCaps';
import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
/* Round 631: dead money and the no way back rule, shared by the four GM sims. */
import { type CutLedger, cutPlayer, payrollWithDeadCap, rollDeadCap, rosterFullRefusal, signRefusal, tradeRefusal } from './frontOfficeCuts';

/**
 * MLB Front Office engine (2026-08-05). Baseball sibling of the NFL and NBA
 * GM engines. Since Round 829 a new league deals every club its real 26 from
 * MLB's own public StatsAPI, rated off real 2026 stats (see
 * src/data/mlbFoRosters2026.ts for the full derivation); a save from before
 * keeps the 13 man rosters and the 9 to 16 limits it was built on. Every
 * salary, contract and transaction the engine produces is explicitly fictional.
 *
 * Season model: 27 rounds of 6 games (162-game-shaped). Playoffs follow the
 * real MLB format per league: three division winners seeded 1-3 plus three
 * wild cards, byes for the top two, best-of-3 Wild Card round (3v6, 4v5),
 * best-of-5 Division Series, best-of-7 LCS and World Series.
 *
 * The budget line is modeled on the real CBA luxury tax threshold
 * ($244M for 2026); the game treats it as a hard payroll line.
 */

export const MLB_TAX_BASE = MLB_CBT_THRESHOLD_2026; // $M, the 2026 competitive balance tax line; the 3% rise per season in game is the game's own assumption, see leagueCaps.ts
export const MLB_ROUNDS = 27;
export const MLB_GAMES_PER_ROUND = 6;

export const AL_EAST = ['BAL', 'BOS', 'NYY', 'TBR', 'TOR'];
export const AL_CENTRAL = ['CHW', 'CLE', 'DET', 'KCR', 'MIN'];
export const AL_WEST = ['ATH', 'HOU', 'LAA', 'SEA', 'TEX'];
export const NL_EAST = ['ATL', 'MIA', 'NYM', 'PHI', 'WSN'];
export const NL_CENTRAL = ['CHC', 'CIN', 'MIL', 'PIT', 'STL'];
export const NL_WEST = ['ARI', 'COL', 'LAD', 'SDP', 'SFG'];
export const AL = [...AL_EAST, ...AL_CENTRAL, ...AL_WEST];
export const NL = [...NL_EAST, ...NL_CENTRAL, ...NL_WEST];
export const MLB_DIVISIONS: { name: string; teams: string[] }[] = [
  { name: 'AL East', teams: AL_EAST },
  { name: 'AL Central', teams: AL_CENTRAL },
  { name: 'AL West', teams: AL_WEST },
  { name: 'NL East', teams: NL_EAST },
  { name: 'NL Central', teams: NL_CENTRAL },
  { name: 'NL West', teams: NL_WEST },
];

export type MlbPos = string; // C 1B 2B 3B SS LF CF RF OF DH SP RP CL

export interface MlbGmPlayer {
  id: string;
  name: string;
  pos: MlbPos;
  age: number;
  ovr: number;
  salary: number;
  years: number;
  out: number; // rounds remaining on the injured list
  pot: number;
  /** Round 829: his opening rating rests on thin 2026 numbers. Optional, so older saves read as not. */
  partial?: boolean;
}

/* Round 631: CutLedger is the optional deadCap and releasedThisSeason pair,
   so every league saved before this round keeps loading and reads as empty. */
export interface MlbGmTeam extends CutLedger {
  abbr: string;
  players: MlbGmPlayer[];
  wins: number;
  losses: number;
  picks: number[];
  /** Round 829: 26 on a club dealt its full roster. Absent on a save from
      before, which keeps the 13 man rules (mlbRosterMin and mlbRosterMax). */
  depth?: number;
}

export interface MlbLeague {
  season: number;
  cap: number; // luxury tax line
  teams: Record<string, MlbGmTeam>;
  freeAgents: MlbGmPlayer[];
  round: number; // 1..MLB_ROUNDS
  champions: { season: number; team: string }[];
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
const fid = makeIdMinter('m');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureMlbLeagueIds(lg: MlbLeague, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  return ensureLeagueEntityIds(fid, lg as never, ...loose);
}

export function isPitcher(p: { pos: string }): boolean {
  return p.pos === 'SP' || p.pos === 'RP' || p.pos === 'CL';
}

export function mlbSalaryFor(ovr: number): number {
  return Math.round(Math.max(0.7, (ovr - 70) * 0.84) * 10) / 10;
}

/* Round 829: the full rosters. A club dealt its real 26 carries this depth
   mark and the 22 to 28 limits; a save from before carries no mark and keeps
   9 to 16. 28 is the real September limit, so a signing or a draftee does
   not force a DFA first. */
export const MLB_DEPTH = 26;
export const MLB_LEGACY_ROSTER_MIN = 9;
export const MLB_LEGACY_ROSTER_MAX = 16;
/* Round 829: depth deals. Priced at the game's own scale, 26 real men put six
   clubs over the tax line on opening day (the Dodgers at $300.3M against
   $244M), so a club's 13 the sim reads sign at the scale and the other 13
   start on depth deals at the scale's floor. When a deal runs out he re-signs
   at his rating's price like anybody else. Measured: every opening payroll
   then sits between $120M and $230M. */
export const MLB_DEPTH_SALARY = 0.7;

export function initMlbLeague(rng: () => number = Math.random): MlbLeague {
  const teams: Record<string, MlbGmTeam> = {};
  for (const [abbr, seeds] of Object.entries(MLB_FO_ROSTERS_2026)) {
    const units = mlbStrengthUnits({ players: seeds.map((s, i) => ({ i, pos: s.pos, ovr: s.ovr, out: 0 })) });
    const core = new Set([...units.bats, ...units.rot, ...units.pen].map(u => u.i));
    const players: MlbGmPlayer[] = seeds.map((s, i) => ({
      id: fid(),
      name: s.name,
      pos: s.pos,
      age: s.age,
      ovr: s.ovr,
      salary: core.has(i) ? mlbSalaryFor(s.ovr) : MLB_DEPTH_SALARY,
      years: s.age <= 25 ? 4 : s.age <= 30 ? 3 : 2,
      out: 0,
      pot: s.age <= 24 ? Math.min(99, s.ovr + 3 + Math.floor(rng() * 6)) : s.ovr,
      ...(s.partial ? { partial: true } : {}),
    }));
    teams[abbr] = { abbr, players, wins: 0, losses: 0, picks: [1, 2], depth: MLB_DEPTH };
  }
  return {
    season: 2026,
    cap: MLB_TAX_BASE,
    teams,
    /* Round 211: dealt against the names already on the rosters. */
    freeAgents: initialFaPool(rng, leagueNames({ teams, freeAgents: [] })),
    round: 1,
    champions: [],
  };
}

/* Round 211: widened from 10x10 to 28x28. A hundred possible people is
   not enough to deal a fourteen man free agent pool out of: the same man
   turned up twice in about a third of new leagues. Every pairing below is
   enumerated against the real-name wall by simInventedNames on each suite
   run, so nothing goes in here without that harness agreeing. */
const FA_FIRST = [
  'Luis', 'Marcus', 'Tanner', 'Yohan', 'Brooks', 'Dai', 'Ramon', 'Cole', 'Ezra', 'Trey',
  'Emilio', 'Wyatt', 'Hideki', 'Rafa', 'Deacon', 'Brandt', 'Nico', 'Sol', 'Bennett', 'Kip',
  'Ronan', 'Tavi', 'Marek', 'Osvaldo', 'Junior', 'Case', 'Wilmer', 'Tomas',
];
const FA_LAST = [
  'Villar', 'Hollis', 'Okada', 'Reyes', 'Calloway', 'Barrero', 'Whitfield', 'Nakamura', 'Prieto', 'Sandoval',
  'Escalante', 'Bingham', 'Ferraro', 'Achterberg', 'Delgadillo', 'Kestrel', 'Mabry', 'Novotny', 'Quintero', 'Rademacher',
  'Sturdivant', 'Tillery', 'Urrutia', 'Vandegrift', 'Wexler', 'Yamashiro', 'Zaragoza', 'Ballinger',
];
/**
 * Round 211: a name nobody in this league already has when a book is
 * passed. Optional so harnesses and any caller wanting a plausible string
 * still work; every caller inside the engine passes one.
 */
export function mlbGenName(rng: () => number, taken?: Set<string>): string {
  if (taken) return uniqueName(rng, FA_FIRST, FA_LAST, taken);
  return `${FA_FIRST[Math.floor(rng() * FA_FIRST.length)]} ${FA_LAST[Math.floor(rng() * FA_LAST.length)]}`;
}

function initialFaPool(rng: () => number, taken: Set<string>): MlbGmPlayer[] {
  const out: MlbGmPlayer[] = [];
  const POS = ['SP', 'RP', 'C', '1B', 'SS', 'OF', 'OF', '3B', 'SP', 'DH'];
  for (let i = 0; i < 10; i++) {
    const ovr = 72 + Math.floor(rng() * 10);
    out.push({
      id: fid(), name: mlbGenName(rng, taken), pos: POS[i % POS.length],
      age: 27 + Math.floor(rng() * 7), ovr, salary: mlbSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  }
  return out;
}

/** Payroll against the tax line, plus this season's dead money (Round 631). */
export function mlbCapUsed(t: MlbGmTeam): number {
  return payrollWithDeadCap(t.players, t);
}
export function mlbCapRoom(t: MlbGmTeam, cap: number): number {
  return Math.round((cap - mlbCapUsed(t)) * 10) / 10;
}

/** Round 829: the men the strength reads, best healthy first: 8 bats, 3
    starters, 2 relievers. Lifted out of mlbStrength unchanged so the roster
    screen and the opening payroll read the same men the sim does. A bench
    man counts only when he is better than a starter or a starter is hurt. */
export function mlbStrengthUnits<T extends { pos: string; ovr: number; out: number }>(t: { players: T[] }): { bats: T[]; rot: T[]; pen: T[] } {
  const healthy = t.players.filter(p => p.out === 0);
  const bats = healthy.filter(p => !isPitcher(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 8);
  const rot = healthy.filter(p => p.pos === 'SP').sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  const pen = healthy.filter(p => p.pos === 'RP' || p.pos === 'CL').sort((a, b) => b.ovr - a.ovr).slice(0, 2);
  return { bats, rot, pen };
}

/** Round 829: the ids of the men the sim plays right now. */
export function mlbSimReads(t: { players: MlbGmPlayer[] }): string[] {
  const u = mlbStrengthUnits(t);
  return [...u.bats, ...u.rot, ...u.pen].map(p => p.id);
}

/** Strength: lineup 55%, rotation 33%, bullpen 12%; IL players excluded. */
export function mlbStrength(t: MlbGmTeam): number {
  const { bats, rot, pen } = mlbStrengthUnits(t);
  const avg = (xs: MlbGmPlayer[], fallback: number) =>
    xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : fallback;
  return avg(bats, 62) * 0.55 + avg(rot, 62) * 0.33 + avg(pen, 62) * 0.12;
}

/** Baseball is the high-variance sport: even great teams sit near .600. */
export function mlbWinProb(a: MlbGmTeam, b: MlbGmTeam): number {
  const gap = mlbStrength(a) - mlbStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 25));
}

export interface MlbRoundReport {
  myWins: number;
  myLosses: number;
  notes: string[];
}

/* Round 829: a number in [0, 1) from a round's draw, a man's name and a salt,
   so his injury roll is his own. murmur3's finaliser on an FNV style mix.
   The name and not the id: an id carries a random per page load stamp
   (entityIds.ts), so the same seed would roll different injuries on every
   load, and a name is already one to a man in a league (Round 211). */
function unitHash(seed: number, key: string, salt: number): number {
  let h = (seed ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* Round 829: the injury pass for a league dealt full rosters. The old pass
   drew from the shared stream once per man, so thirteen extra bench men
   shifted every roll after them and every game after that: adding a man
   who never plays changed results. Here the round takes one draw, and each
   man's roll comes from that draw and his own name. Same odds as before
   (2.5 percent a round, out 1 to 4 rounds). Saves from before this round
   keep the old pass, so they play exactly as they did. */
function rollDepthInjuries(league: MlbLeague, myTeam: string, rng: () => number, notes: string[]): void {
  const roundSeed = Math.floor(rng() * 4294967296);
  for (const t of Object.values(league.teams)) {
    for (const p of t.players) {
      if (p.out > 0) { p.out -= 1; continue; }
      if (unitHash(roundSeed, p.name, 1) < 0.025) {
        p.out = 1 + Math.floor(unitHash(roundSeed, p.name, 2) * 4);
        if (t.abbr === myTeam) notes.push(`🚑 ${p.name} hits the IL for ${p.out} round${p.out === 1 ? '' : 's'}.`);
      }
    }
  }
}

export function simMlbRound(league: MlbLeague, myTeam: string, rng: () => number): MlbRoundReport {
  const abbrs = Object.keys(league.teams);
  const notes: string[] = [];
  let myW = 0, myL = 0;
  const deep = Object.values(league.teams).some(t => !!t.depth);
  if (deep) rollDepthInjuries(league, myTeam, rng, notes);
  else {
    for (const t of Object.values(league.teams)) {
      for (const p of t.players) {
        if (p.out > 0) p.out -= 1;
        else if (rng() < 0.025) {
          p.out = 1 + Math.floor(rng() * 4);
          if (t.abbr === myTeam) notes.push(`🚑 ${p.name} hits the IL for ${p.out} round${p.out === 1 ? '' : 's'}.`);
        }
      }
    }
  }
  for (const abbr of abbrs) {
    const me = league.teams[abbr];
    for (let g = 0; g < MLB_GAMES_PER_ROUND; g++) {
      let opp = abbrs[Math.floor(rng() * abbrs.length)];
      if (opp === abbr) opp = abbrs[(abbrs.indexOf(abbr) + 1) % abbrs.length];
      const them = league.teams[opp];
      if (rng() < 0.5) continue;
      const p = mlbWinProb(me, them);
      if (rng() < p) { me.wins += 1; them.losses += 1; if (abbr === myTeam) myW += 1; if (opp === myTeam) myL += 1; }
      else { me.losses += 1; them.wins += 1; if (abbr === myTeam) myL += 1; if (opp === myTeam) myW += 1; }
    }
  }
  return { myWins: myW, myLosses: myL, notes };
}

export function mlbStandings(league: MlbLeague, group?: string[]): MlbGmTeam[] {
  const pool = Object.values(league.teams).filter(t => !group || group.includes(t.abbr));
  return pool.sort((a, b) => b.wins - a.wins || a.losses - b.losses || mlbStrength(b) - mlbStrength(a));
}

/** Real MLB seeding per league: division winners 1-3, wild cards 4-6. */
export function mlbLeagueSeeds(league: MlbLeague, al: boolean): string[] {
  const divs = al ? [AL_EAST, AL_CENTRAL, AL_WEST] : [NL_EAST, NL_CENTRAL, NL_WEST];
  const winners = divs
    .map(d => mlbStandings(league, d)[0])
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const winnerIds = new Set(winners.map(t => t.abbr));
  const wildcards = mlbStandings(league, al ? AL : NL)
    .filter(t => !winnerIds.has(t.abbr))
    .slice(0, 3);
  return [...winners, ...wildcards].map(t => t.abbr);
}

export interface MlbSeriesResult { name: string; home: string; away: string; homeWins: number; awayWins: number; winner: string }

function playMlbSeries(name: string, home: MlbGmTeam, away: MlbGmTeam, rng: () => number, toWins: number): MlbSeriesResult {
  const p = mlbWinProb(home, away);
  let hw = 0, aw = 0;
  while (hw < toWins && aw < toWins) {
    if (rng() < p) hw += 1; else aw += 1;
  }
  return { name, home: home.abbr, away: away.abbr, homeWins: hw, awayWins: aw, winner: hw === toWins ? home.abbr : away.abbr };
}

/** Wild Card (Bo3) with byes for 1-2, LDS (Bo5), LCS (Bo7), World Series (Bo7). */
export function runMlbPlayoffs(league: MlbLeague, rng: () => number): { series: MlbSeriesResult[]; champion: string } {
  const series: MlbSeriesResult[] = [];
  const pennants: string[] = [];
  for (const al of [true, false]) {
    const tag = al ? 'AL' : 'NL';
    const s = mlbLeagueSeeds(league, al);
    const T = (i: number) => league.teams[s[i]];
    const wc1 = playMlbSeries(`${tag} Wild Card 3v6`, T(2), T(5), rng, 2);
    const wc2 = playMlbSeries(`${tag} Wild Card 4v5`, T(3), T(4), rng, 2);
    series.push(wc1, wc2);
    const lds1 = playMlbSeries(`${tag}DS`, T(0), league.teams[wc2.winner], rng, 3);
    const lds2 = playMlbSeries(`${tag}DS`, T(1), league.teams[wc1.winner], rng, 3);
    series.push(lds1, lds2);
    const lcs = playMlbSeries(`${tag}CS`, league.teams[lds1.winner], league.teams[lds2.winner], rng, 4);
    series.push(lcs);
    pennants.push(lcs.winner);
  }
  const ws = playMlbSeries('World Series', league.teams[pennants[0]], league.teams[pennants[1]], rng, 4);
  series.push(ws);
  return { series, champion: ws.winner };
}

// ---- GM moves ----
/* Round 631: a DFA is not free. Half his salary stays on this season's
   payroll as dead money, a quarter on next season's if he had years left, and
   this club cannot sign him back until the offseason. The rule lives in
   src/lib/frontOfficeCuts.ts, once, for all four GM sims; measured before it,
   Corbin Carroll at 21.8M with four years left took the room from 75.3 to
   97.1 and straight back to 75.3 on a one year deal. */
/** Round 631: the roster floor and ceiling. The board greys DFA and Sign at them.
    Round 829: these are a full roster club's; a club from an older save keeps
    MLB_LEGACY_ROSTER_MIN and MLB_LEGACY_ROSTER_MAX. Read them through
    mlbRosterMin and mlbRosterMax, which know which club is which. */
export const MLB_ROSTER_MIN = 22;
export const MLB_ROSTER_MAX = 28;
export const mlbRosterMin = (t: { depth?: number }): number => (t.depth ? MLB_ROSTER_MIN : MLB_LEGACY_ROSTER_MIN);
export const mlbRosterMax = (t: { depth?: number }): number => (t.depth ? MLB_ROSTER_MAX : MLB_LEGACY_ROSTER_MAX);

export function mlbRelease(t: MlbGmTeam, fas: MlbGmPlayer[], id: string): boolean {
  const floor = mlbRosterMin(t);
  return cutPlayer(t, fas, id, floor);
}

export function mlbSign(t: MlbGmTeam, fas: MlbGmPlayer[], id: string, cap: number): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || rosterFullRefusal(t, mlbRosterMax(t))) return false;
  /* Round 631: the same refusal the board shows beside the greyed button. */
  if (signRefusal(t, id)) return false;
  const p = fas[i];
  if (mlbCapRoom(t, cap) < p.salary) return false;
  fas.splice(i, 1);
  t.players.push(p);
  return true;
}

export function mlbTradeValue(p: MlbGmPlayer): number {
  const posW = p.pos === 'SP' ? 1.25 : p.pos === 'CL' ? 1.05 : p.pos === 'C' || p.pos === 'SS' ? 1.1 : 1;
  const ageW = Math.max(0.5, 1.3 - Math.max(0, p.age - 26) * 0.055);
  return p.ovr * posW * ageW;
}

export function mlbTrade(
  my: MlbGmTeam, their: MlbGmTeam, myId: string, theirId: string, sweeten: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= mlbRosterMin(my) || their.players.length <= mlbRosterMin(their)) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
  // Round 82: salary matching so payroll-heavy teams can still swap contracts
  const fitsMe = mlbCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = mlbCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  const pickV = sweeten && my.picks.length ? 13 : 0;
  if (mlbTradeValue(mine) + pickV < mlbTradeValue(theirs) * 1.07) return 'rejected';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question, so this enforces only the hard
   rules, roster floor and salary matching, exactly mlbTrade's, and
   moves the agreed pick when the package includes one. */
export function mlbExecuteTalksTrade(
  my: MlbGmTeam, their: MlbGmTeam, myId: string, theirId: string, addPick: boolean, cap: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= mlbRosterMin(my) || their.players.length <= mlbRosterMin(their)) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
  if (addPick && !my.picks.length) return 'invalid';
  const fitsMe = mlbCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = mlbCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) { their.picks.push(my.picks.pop()!); }
  return 'done';
}

export interface MlbProspect { id: string; name: string; pos: MlbPos; age: number; grade: number; trueOvr: number }

export function mlbDraftClass(rng: () => number, size = 24, taken: Set<string> = new Set()): MlbProspect[] {
  const POS = ['SP', 'SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF'];
  const out: MlbProspect[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 69 + Math.floor(rng() * 18);
    out.push({
      id: fid(), name: mlbGenName(rng, taken), pos: POS[Math.floor(rng() * POS.length)],
      age: 18 + Math.floor(rng() * 4),
      grade: Math.max(65, Math.min(93, trueOvr + Math.floor(rng() * 9) - 4)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function mlbProspectToPlayer(pr: MlbProspect, rng: () => number): MlbGmPlayer {
  return {
    id: fid(), name: pr.name, pos: pr.pos, age: pr.age, ovr: pr.trueOvr,
    salary: Math.max(0.8, Math.round((pr.trueOvr - 66) * 0.25 * 10) / 10),
    years: 4, out: 0,
    pot: Math.min(99, pr.trueOvr + 4 + Math.floor(rng() * 9)),
  };
}

/* Round 829 review: THE CUT DOWN TO 28, the shape Round 828 gave the NFL's
   53. A full roster club the draft took over MLB_ROSTER_MAX releases, before
   the season starts, its lowest rated men the sim does not play until it is
   at 28. A real cut, through cutPlayer like every other: the man goes to the
   pool, half his salary stays on the line as dead money, and he cannot come
   back this season. The side carrying more than its 13 (hitters or pitchers)
   gives a man up before the other loses any, and the cut never takes a club
   below two catchers, nine hitters, five starters or five relievers. A save
   from before this round has no depth mark and is never cut. */
const MLB_SIDE_SHARE = 13;
export function mlbCutDownToMax(t: MlbGmTeam, freeAgents: MlbGmPlayer[]): { team: string; player: string; pos: string }[] {
  const out: { team: string; player: string; pos: string }[] = [];
  if (!t.depth) return out;
  while (t.players.length > mlbRosterMax(t)) {
    const roster = [...t.players];
    const reads = new Set(mlbSimReads(t));
    const n = (f: (p: MlbGmPlayer) => boolean) => roster.reduce((s, p) => s + (f(p) ? 1 : 0), 0);
    const isRp = (p: MlbGmPlayer) => p.pos === 'RP' || p.pos === 'CL';
    const counts = { c: n(p => p.pos === 'C'), bats: n(p => !isPitcher(p)), sp: n(p => p.pos === 'SP'), pen: n(isRp) };
    const keepsSpine = (p: MlbGmPlayer) =>
      !(p.pos === 'C' && counts.c <= 2) && !(!isPitcher(p) && counts.bats <= 9)
      && !(p.pos === 'SP' && counts.sp <= 5) && !(isRp(p) && counts.pen <= 5);
    const spare = roster.filter(p => !reads.has(p.id) && keepsSpine(p));
    const pitchersOver = roster.length - counts.bats > MLB_SIDE_SHARE;
    const hittersOver = counts.bats > MLB_SIDE_SHARE;
    const crowded = spare.filter(p => (isPitcher(p) ? pitchersOver : hittersOver));
    const down = (crowded.length ? crowded : spare)
      .sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];
    if (!down || !cutPlayer(t, freeAgents, down.id, mlbRosterMin(t))) break;
    out.push({ team: t.abbr, player: down.name, pos: down.pos });
  }
  return out;
}

/** Round 829 review: how many men a full roster club must DFA before it may
    play, 0 when it is at or under its ceiling. The board holds Play on it. */
export function mlbOverLimit(t: MlbGmTeam): number {
  return t.depth ? Math.max(0, t.players.length - mlbRosterMax(t)) : 0;
}

/* userTeam: the club whose cut down is the GM's own. The board passes it and
   holds Play until he has DFA'd to 28 himself; every other club is cut here. */
export function mlbOffseason(league: MlbLeague, rng: () => number, userTeam?: string): string[] {
  const notes: string[] = [];
  /* Round 211: one name book for the whole offseason, so the men who
     arrive to fill rosters cannot duplicate each other or anybody left. */
  const taken = leagueNames(league);
  for (const t of Object.values(league.teams)) {
    const keep: MlbGmPlayer[] = [];
    for (const p of t.players) {
      p.age += 1;
      p.out = 0;
      if (p.age <= 25 && p.ovr < p.pot) p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 3));
      else if (p.age >= 33) p.ovr = Math.max(63, p.ovr - (1 + Math.floor(rng() * 2) + (p.age >= 37 ? 2 : 0)));
      if (p.age >= 38 && (p.ovr <= 74 || rng() < 0.4)) { notes.push(`👋 ${p.name} retires.`); continue; }
      p.years -= 1;
      if (p.years <= 0) {
        p.years = p.age <= 27 ? 4 : p.age <= 31 ? 3 : 2;
        p.salary = mlbSalaryFor(p.ovr);
        if (p.ovr < 80 && rng() < 0.45) { league.freeAgents.push({ ...p, years: 1 }); continue; }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0; t.losses = 0; t.picks = [1, 2];
    rollDeadCap(t);
    replenishMlbRoster(t, rng, taken);
  }
  /* Round 829 review: the cut down to 28, last, once the draft, the
     departures and the refill have all landed. The pool is trimmed after it,
     so the men cut compete for its 30 places like everybody else. */
  for (const t of Object.values(league.teams)) if (t.abbr !== userTeam) mlbCutDownToMax(t, league.freeAgents);
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 33) fa.ovr = Math.max(63, fa.ovr - 1); }
  league.cap = Math.round(league.cap * 1.03);
  league.season += 1;
  league.round = 1;
  return notes;
}

/** Keep every club playable: at least 6 bats, 3 SP, 2 relievers, 11 players.
    Round 829: a full roster club keeps a real one's spine instead: nine bats,
    a five man rotation, a pen of five, and the 22 man floor. */
export function replenishMlbRoster(t: MlbGmTeam, rng: () => number, taken: Set<string> = new Set()): void {
  const add = (pos: string) => {
    const ovr = 69 + Math.floor(rng() * 7);
    t.players.push({
      id: fid(), name: mlbGenName(rng, taken), pos,
      age: 24 + Math.floor(rng() * 8), ovr, salary: mlbSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  };
  const [bats, starters, pen, floor] = t.depth ? [9, 5, 5, MLB_ROSTER_MIN] : [6, 3, 2, 11];
  while (t.players.filter(p => !isPitcher(p)).length < bats) add(['C', '1B', 'SS', 'OF'][Math.floor(rng() * 4)]);
  while (t.players.filter(p => p.pos === 'SP').length < starters) add('SP');
  while (t.players.filter(p => p.pos === 'RP' || p.pos === 'CL').length < pen) add('RP');
  while (t.players.length < floor) add(rng() < 0.5 ? 'OF' : 'RP');
}

/** Light AI roster churn for the 29 CPU clubs. */
export function mlbAiMoves(league: MlbLeague, myTeam: string, rng: () => number): void {
  const cpu = Object.values(league.teams).filter(t => t.abbr !== myTeam);
  for (const t of cpu) {
    if (rng() > 0.25 || !league.freeAgents.length) continue;
    const best = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
    if (best && mlbCapRoom(t, league.cap) >= best.salary && t.players.length < mlbRosterMax(t)) {
      mlbSign(t, league.freeAgents, best.id, league.cap);
    }
  }
}
