import { NBA_TEAMS } from '@/data/conquestDataNba';

/**
 * NBA Front Office engine (2026-08-05). Basketball sibling of
 * src/lib/frontOffice.ts, built over the hand-curated real rosters in
 * conquestDataNba.ts (about ten real players per team with overalls that
 * were reviewed during the NBA Conquest build). All contracts and moves
 * are explicitly fictional. Season model: 20 rounds, each simulating a
 * 4-game stretch, an 82-game-shaped record, the modern play-in for seeds
 * 7 to 10, then best-of-7 series simulated round by round.
 */

export const NBA_CAP_BASE = 155; // $M, rises 7% per season
export const NBA_ROUNDS = 20;
export const GAMES_PER_ROUND = 4;

export const EAST = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NYK', 'ORL', 'PHI', 'TOR', 'WAS'];
export const WEST = ['DAL', 'DEN', 'GSW', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NOP', 'OKC', 'PHX', 'POR', 'SAC', 'SAS', 'UTA'];

export type NbaPos = 'G' | 'F' | 'C';

export interface NbaGmPlayer {
  id: string;
  name: string;
  pos: NbaPos;
  age: number;
  ovr: number;
  salary: number;
  years: number;
  out: number; // rounds remaining injured
  pot: number;
}

export interface NbaGmTeam {
  abbr: string;
  players: NbaGmPlayer[];
  wins: number;
  losses: number;
  picks: number[];
}

export interface NbaLeague {
  season: number;
  cap: number;
  teams: Record<string, NbaGmTeam>;
  freeAgents: NbaGmPlayer[];
  round: number; // 1..NBA_ROUNDS
  champions: { season: number; team: string }[];
}

let nbaId = 0;
function fid(): string { nbaId += 1; return `n${nbaId}`; }

function normPos(p: string): NbaPos {
  const c = p[0];
  return c === 'G' ? 'G' : c === 'C' ? 'C' : 'F';
}

export function nbaSalaryFor(ovr: number): number {
  return Math.round(Math.max(2, (ovr - 68) * 2.1 - 4) * 10) / 10;
}

/** Ages are editorial (no birth dates in the source data): stars get primes. */
function ageFor(ovr: number, rng: () => number): number {
  if (ovr >= 93) return 25 + Math.floor(rng() * 7);
  if (ovr >= 85) return 24 + Math.floor(rng() * 9);
  return 22 + Math.floor(rng() * 12);
}

export function initNbaLeague(rng: () => number = Math.random): NbaLeague {
  const teams: Record<string, NbaGmTeam> = {};
  for (const t of NBA_TEAMS) {
    const players: NbaGmPlayer[] = (t.players ?? []).map(p => {
      const age = ageFor(p.overall, rng);
      return {
        id: fid(),
        name: p.name,
        pos: normPos(p.position),
        age,
        ovr: p.overall,
        salary: nbaSalaryFor(p.overall),
        years: age <= 25 ? 4 : age <= 29 ? 3 : 2,
        out: 0,
        pot: age <= 24 ? Math.min(99, p.overall + 3 + Math.floor(rng() * 6)) : p.overall,
      };
    });
    teams[t.id] = { abbr: t.id, players, wins: 0, losses: 0, picks: [1, 2] };
  }
  return {
    season: 2026,
    cap: NBA_CAP_BASE,
    teams,
    freeAgents: initialFaPool(rng),
    round: 1,
    champions: [],
  };
}

const FA_FIRST = ['Marcus', 'Devon', 'Tyrese', 'Jalen', 'Keon', 'Andre', 'Malik', 'Cole', 'Isaiah', 'Trey'];
const FA_LAST = ['Vance', 'Holiday', 'Whitmore', 'Castleton', 'Reeves', 'Okonkwo', 'Marchand', 'Bellamy', 'Strother', 'Quinn'];
export function nbaGenName(rng: () => number): string {
  return `${FA_FIRST[Math.floor(rng() * FA_FIRST.length)]} ${FA_LAST[Math.floor(rng() * FA_LAST.length)]}`;
}

function initialFaPool(rng: () => number): NbaGmPlayer[] {
  const out: NbaGmPlayer[] = [];
  const POS: NbaPos[] = ['G', 'G', 'F', 'F', 'C'];
  for (let i = 0; i < 10; i++) {
    const ovr = 72 + Math.floor(rng() * 10);
    out.push({
      id: fid(), name: nbaGenName(rng), pos: POS[i % POS.length],
      age: 26 + Math.floor(rng() * 8), ovr, salary: nbaSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  }
  return out;
}

export function nbaCapUsed(t: NbaGmTeam): number {
  return Math.round(t.players.reduce((s, p) => s + p.salary, 0) * 10) / 10;
}
export function nbaCapRoom(t: NbaGmTeam, cap: number): number {
  return Math.round((cap - nbaCapUsed(t)) * 10) / 10;
}

/** Strength: best five 72%, next three 28%; injured players excluded. */
export function nbaStrength(t: NbaGmTeam): number {
  const healthy = [...t.players].filter(p => p.out === 0).sort((a, b) => b.ovr - a.ovr);
  const five = healthy.slice(0, 5);
  const bench = healthy.slice(5, 8);
  const fiveAvg = five.length ? five.reduce((s, p) => s + p.ovr, 0) / five.length : 65;
  const benchAvg = bench.length ? bench.reduce((s, p) => s + p.ovr, 0) / bench.length : 65;
  return fiveAvg * 0.72 + benchAvg * 0.28;
}

export function nbaWinProb(a: NbaGmTeam, b: NbaGmTeam): number {
  const gap = nbaStrength(a) - nbaStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 12));
}

export interface RoundReport {
  myWins: number;
  myLosses: number;
  notes: string[];
}

/** Simulate one round: every team plays GAMES_PER_ROUND against random peers. */
export function simRound(league: NbaLeague, myTeam: string, rng: () => number): RoundReport {
  const abbrs = Object.keys(league.teams);
  const notes: string[] = [];
  let myW = 0, myL = 0;
  // injuries tick down; new ones roll
  for (const t of Object.values(league.teams)) {
    for (const p of t.players) {
      if (p.out > 0) p.out -= 1;
      else if (rng() < 0.02) {
        p.out = 1 + Math.floor(rng() * 3);
        if (t.abbr === myTeam) notes.push(`🚑 ${p.name} is out ${p.out} round${p.out === 1 ? '' : 's'}.`);
      }
    }
  }
  for (const abbr of abbrs) {
    const me = league.teams[abbr];
    for (let g = 0; g < GAMES_PER_ROUND; g++) {
      let opp = abbrs[Math.floor(rng() * abbrs.length)];
      if (opp === abbr) opp = abbrs[(abbrs.indexOf(abbr) + 1) % abbrs.length];
      const them = league.teams[opp];
      // each matchup is counted once from the home side only: half rate
      if (rng() < 0.5) continue;
      const p = nbaWinProb(me, them);
      if (rng() < p) { me.wins += 1; them.losses += 1; if (abbr === myTeam) myW += 1; if (opp === myTeam) myL += 1; }
      else { me.losses += 1; them.wins += 1; if (abbr === myTeam) myL += 1; if (opp === myTeam) myW += 1; }
    }
  }
  return { myWins: myW, myLosses: myL, notes };
}

export function nbaStandings(league: NbaLeague, conf?: 'East' | 'West'): NbaGmTeam[] {
  const pool = Object.values(league.teams).filter(t =>
    !conf || (conf === 'East' ? EAST.includes(t.abbr) : WEST.includes(t.abbr)));
  return pool.sort((a, b) => b.wins - a.wins || a.losses - b.losses || nbaStrength(b) - nbaStrength(a));
}

export interface SeriesResult { name: string; home: string; away: string; homeWins: number; awayWins: number; winner: string }

function playSeries(name: string, home: NbaGmTeam, away: NbaGmTeam, rng: () => number, toWins = 4): SeriesResult {
  const p = nbaWinProb(home, away);
  let hw = 0, aw = 0;
  while (hw < toWins && aw < toWins) {
    if (rng() < p) hw += 1; else aw += 1;
  }
  return { name, home: home.abbr, away: away.abbr, homeWins: hw, awayWins: aw, winner: hw === toWins ? home.abbr : away.abbr };
}

/** Play-in (7-10) then three rounds per conference, then the Finals. */
export function runNbaPlayoffs(league: NbaLeague, rng: () => number): { series: SeriesResult[]; champion: string } {
  const series: SeriesResult[] = [];
  const confWinners: string[] = [];
  for (const conf of ['East', 'West'] as const) {
    const table = nbaStandings(league, conf).map(t => t.abbr);
    // play-in: 7v8 (winner = 7 seed), 9v10, loser78 vs winner910 for 8 seed
    const g78 = playSeries(`${conf} Play-In 7v8`, league.teams[table[6]], league.teams[table[7]], rng, 1);
    const g910 = playSeries(`${conf} Play-In 9v10`, league.teams[table[8]], league.teams[table[9]], rng, 1);
    const loser78 = g78.winner === table[6] ? table[7] : table[6];
    const g8 = playSeries(`${conf} Play-In final`, league.teams[loser78], league.teams[g910.winner], rng, 1);
    series.push(g78, g910, g8);
    const seeds = [table[0], table[1], table[2], table[3], table[4], table[5], g78.winner, g8.winner];
    const r1 = [
      playSeries(`${conf} R1`, league.teams[seeds[0]], league.teams[seeds[7]], rng),
      playSeries(`${conf} R1`, league.teams[seeds[3]], league.teams[seeds[4]], rng),
      playSeries(`${conf} R1`, league.teams[seeds[2]], league.teams[seeds[5]], rng),
      playSeries(`${conf} R1`, league.teams[seeds[1]], league.teams[seeds[6]], rng),
    ];
    series.push(...r1);
    const sf = [
      playSeries(`${conf} Semis`, league.teams[r1[0].winner], league.teams[r1[1].winner], rng),
      playSeries(`${conf} Semis`, league.teams[r1[2].winner], league.teams[r1[3].winner], rng),
    ];
    series.push(...sf);
    const cf = playSeries(`${conf} Finals`, league.teams[sf[0].winner], league.teams[sf[1].winner], rng);
    series.push(cf);
    confWinners.push(cf.winner);
  }
  const finals = playSeries('NBA Finals', league.teams[confWinners[0]], league.teams[confWinners[1]], rng);
  series.push(finals);
  return { series, champion: finals.winner };
}

// GM moves (same rules as the NFL engine, basketball economics)
export function nbaRelease(t: NbaGmTeam, fas: NbaGmPlayer[], id: string): boolean {
  const i = t.players.findIndex(p => p.id === id);
  if (i < 0 || t.players.length <= 8) return false;
  const [p] = t.players.splice(i, 1);
  fas.push({ ...p, years: 1 });
  return true;
}

export function nbaSign(t: NbaGmTeam, fas: NbaGmPlayer[], id: string, cap: number): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || t.players.length >= 15) return false;
  const p = fas[i];
  if (nbaCapRoom(t, cap) < p.salary) return false;
  fas.splice(i, 1);
  t.players.push(p);
  return true;
}

export function nbaTradeValue(p: NbaGmPlayer): number {
  const ageW = Math.max(0.5, 1.3 - Math.max(0, p.age - 24) * 0.055);
  return p.ovr * ageW;
}

export function nbaTrade(
  my: NbaGmTeam, their: NbaGmTeam, myId: string, theirId: string, sweeten: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  // Round 82: NBA style salary matching. Over-cap teams can still trade when
  // the money roughly lines up (the old room-only check made every trade
  // between capped-out rosters invalid, which killed the whole trade screen).
  const fitsMe = nbaCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = nbaCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  const pickV = sweeten && my.picks.length ? 12 : 0;
  if (nbaTradeValue(mine) + pickV < nbaTradeValue(theirs) * 1.07) return 'rejected';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question, so this enforces only the hard
   rules, roster floor and salary matching, exactly nbaTrade's, and
   moves the agreed pick when the package includes one. */
export function nbaExecuteTalksTrade(
  my: NbaGmTeam, their: NbaGmTeam, myId: string, theirId: string, addPick: boolean, cap: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  if (addPick && !my.picks.length) return 'invalid';
  const fitsMe = nbaCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = nbaCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) { their.picks.push(my.picks.pop()!); }
  return 'done';
}

export interface NbaProspect { id: string; name: string; pos: NbaPos; age: number; grade: number; trueOvr: number }

export function nbaDraftClass(rng: () => number, size = 24): NbaProspect[] {
  const POS: NbaPos[] = ['G', 'G', 'F', 'F', 'C'];
  const out: NbaProspect[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 70 + Math.floor(rng() * 18);
    out.push({
      id: fid(), name: nbaGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      age: 19 + Math.floor(rng() * 3),
      grade: Math.max(66, Math.min(94, trueOvr + Math.floor(rng() * 9) - 4)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function nbaProspectToPlayer(pr: NbaProspect, rng: () => number): NbaGmPlayer {
  return {
    id: fid(), name: pr.name, pos: pr.pos, age: pr.age, ovr: pr.trueOvr,
    salary: Math.max(3, Math.round((pr.trueOvr - 62) * 0.4 * 10) / 10),
    years: 4, out: 0,
    pot: Math.min(99, pr.trueOvr + 4 + Math.floor(rng() * 9)),
  };
}

export function nbaOffseason(league: NbaLeague, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(league.teams)) {
    const keep: NbaGmPlayer[] = [];
    for (const p of t.players) {
      p.age += 1;
      p.out = 0;
      if (p.age <= 24 && p.ovr < p.pot) p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 3));
      else if (p.age >= 32) p.ovr = Math.max(64, p.ovr - (1 + Math.floor(rng() * 2) + (p.age >= 36 ? 2 : 0)));
      if (p.age >= 36 && (p.ovr <= 74 || rng() < 0.35)) { notes.push(`👋 ${p.name} retires.`); continue; }
      p.years -= 1;
      if (p.years <= 0) {
        p.years = p.age <= 26 ? 4 : p.age <= 30 ? 3 : 2;
        p.salary = nbaSalaryFor(p.ovr);
        if (p.ovr < 80 && rng() < 0.45) { league.freeAgents.push({ ...p, years: 1 }); continue; }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0; t.losses = 0; t.picks = [1, 2];
    while (t.players.length < 9) {
      const ovr = 70 + Math.floor(rng() * 7);
      t.players.push({
        id: fid(), name: nbaGenName(rng),
        pos: (['G', 'F', 'C'] as NbaPos[])[t.players.length % 3],
        age: 23 + Math.floor(rng() * 8), ovr, salary: nbaSalaryFor(ovr),
        years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
      });
    }
  }
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 32) fa.ovr = Math.max(64, fa.ovr - 1); }
  league.cap = Math.round(league.cap * 1.07);
  league.season += 1;
  league.round = 1;
  return notes;
}
