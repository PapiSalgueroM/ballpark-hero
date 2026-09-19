import { MLB_FO_ROSTERS } from '@/data/mlbFoPlayers';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';
/* Round 531: the tax line comes from one sourced file, never a bare literal here. */
import { MLB_CBT_THRESHOLD_2026 } from './leagueCaps';
import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
/* Round 631: dead money and the no way back rule, shared by the four GM sims. */
import { type CutLedger, cutPlayer, payrollWithDeadCap, rollDeadCap, rosterFullRefusal, signRefusal, tradeRefusal } from './frontOfficeCuts';

/**
 * MLB Front Office engine (2026-08-05). Baseball sibling of the NFL and NBA
 * GM engines, built over real 2026 40-man rosters pulled from MLB's own
 * public StatsAPI with overalls derived from real 2025 stats (see
 * src/data/mlbFoPlayers.ts for the full derivation). Every salary, contract
 * and transaction the engine produces is explicitly fictional.
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
}

/* Round 631: CutLedger is the optional deadCap and releasedThisSeason pair,
   so every league saved before this round keeps loading and reads as empty. */
export interface MlbGmTeam extends CutLedger {
  abbr: string;
  players: MlbGmPlayer[];
  wins: number;
  losses: number;
  picks: number[];
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

export function initMlbLeague(rng: () => number = Math.random): MlbLeague {
  const teams: Record<string, MlbGmTeam> = {};
  for (const [abbr, seeds] of Object.entries(MLB_FO_ROSTERS)) {
    const players: MlbGmPlayer[] = seeds.map(s => ({
      id: fid(),
      name: s.name,
      pos: s.pos,
      age: s.age,
      ovr: s.ovr,
      salary: mlbSalaryFor(s.ovr),
      years: s.age <= 25 ? 4 : s.age <= 30 ? 3 : 2,
      out: 0,
      pot: s.age <= 24 ? Math.min(99, s.ovr + 3 + Math.floor(rng() * 6)) : s.ovr,
    }));
    teams[abbr] = { abbr, players, wins: 0, losses: 0, picks: [1, 2] };
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

/** Strength: lineup 55%, rotation 33%, bullpen 12%; IL players excluded. */
export function mlbStrength(t: MlbGmTeam): number {
  const healthy = t.players.filter(p => p.out === 0);
  const bats = healthy.filter(p => !isPitcher(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 8);
  const rot = healthy.filter(p => p.pos === 'SP').sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  const pen = healthy.filter(p => p.pos === 'RP' || p.pos === 'CL').sort((a, b) => b.ovr - a.ovr).slice(0, 2);
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

export function simMlbRound(league: MlbLeague, myTeam: string, rng: () => number): MlbRoundReport {
  const abbrs = Object.keys(league.teams);
  const notes: string[] = [];
  let myW = 0, myL = 0;
  for (const t of Object.values(league.teams)) {
    for (const p of t.players) {
      if (p.out > 0) p.out -= 1;
      else if (rng() < 0.025) {
        p.out = 1 + Math.floor(rng() * 4);
        if (t.abbr === myTeam) notes.push(`🚑 ${p.name} hits the IL for ${p.out} round${p.out === 1 ? '' : 's'}.`);
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
/** Round 631: the roster floor and ceiling. The board greys DFA and Sign at them. */
export const MLB_ROSTER_MIN = 9;
export const MLB_ROSTER_MAX = 16;

export function mlbRelease(t: MlbGmTeam, fas: MlbGmPlayer[], id: string): boolean {
  return cutPlayer(t, fas, id, MLB_ROSTER_MIN);
}

export function mlbSign(t: MlbGmTeam, fas: MlbGmPlayer[], id: string, cap: number): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || rosterFullRefusal(t, MLB_ROSTER_MAX)) return false;
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
  if (!mine || !theirs || my.players.length <= 9 || their.players.length <= 9) return 'invalid';
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
  if (!mine || !theirs || my.players.length <= 9 || their.players.length <= 9) return 'invalid';
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

export function mlbOffseason(league: MlbLeague, rng: () => number): string[] {
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
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 33) fa.ovr = Math.max(63, fa.ovr - 1); }
  league.cap = Math.round(league.cap * 1.03);
  league.season += 1;
  league.round = 1;
  return notes;
}

/** Keep every club playable: at least 6 bats, 3 SP, 2 relievers, 11 players. */
export function replenishMlbRoster(t: MlbGmTeam, rng: () => number, taken: Set<string> = new Set()): void {
  const add = (pos: string) => {
    const ovr = 69 + Math.floor(rng() * 7);
    t.players.push({
      id: fid(), name: mlbGenName(rng, taken), pos,
      age: 24 + Math.floor(rng() * 8), ovr, salary: mlbSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  };
  while (t.players.filter(p => !isPitcher(p)).length < 6) add(['C', '1B', 'SS', 'OF'][Math.floor(rng() * 4)]);
  while (t.players.filter(p => p.pos === 'SP').length < 3) add('SP');
  while (t.players.filter(p => p.pos === 'RP' || p.pos === 'CL').length < 2) add('RP');
  while (t.players.length < 11) add(rng() < 0.5 ? 'OF' : 'RP');
}

/** Light AI roster churn for the 29 CPU clubs. */
export function mlbAiMoves(league: MlbLeague, myTeam: string, rng: () => number): void {
  const cpu = Object.values(league.teams).filter(t => t.abbr !== myTeam);
  for (const t of cpu) {
    if (rng() > 0.25 || !league.freeAgents.length) continue;
    const best = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
    if (best && mlbCapRoom(t, league.cap) >= best.salary && t.players.length < 16) {
      mlbSign(t, league.freeAgents, best.id, league.cap);
    }
  }
}
