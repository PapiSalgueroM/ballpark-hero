import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';

/**
 * NHL Front Office engine (2026-08-05). Hockey sibling of the NFL, NBA and
 * MLB GM engines, built over real 2026-27 rosters pulled from the NHL's own
 * public API with overalls derived from real 2025-26 stats (see
 * src/data/nhlFoPlayers.ts). Every salary, contract and transaction the
 * engine produces is explicitly fictional.
 *
 * Season model: 20 rounds of 4 games (82-game-shaped) with real NHL points
 * (2 for a win, 1 for an overtime loss; about a quarter of losses go to OT).
 * Playoffs follow the real divisional format: top three per division plus
 * two wild cards per conference, bracketed inside each division, all rounds
 * best-of-7, ending in the Stanley Cup Final.
 *
 * The cap is modeled on the real announced 2026-27 upper limit ($104M),
 * rising about 9% per season as in the current CBA memo.
 */

export const NHL_CAP_BASE = 104; // $M, announced 2026-27 upper limit
export const NHL_FO_ROUNDS = 20;
export const NHL_GAMES_PER_ROUND = 4;

export const ATLANTIC = ['BOS', 'BUF', 'DET', 'FLA', 'MTL', 'OTT', 'TBL', 'TOR'];
export const METRO = ['CAR', 'CBJ', 'NJD', 'NYI', 'NYR', 'PHI', 'PIT', 'WSH'];
export const CENTRAL = ['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'UTA', 'WPG'];
export const PACIFIC = ['ANA', 'CGY', 'EDM', 'LAK', 'SEA', 'SJS', 'VAN', 'VGK'];
export const EASTERN = [...ATLANTIC, ...METRO];
export const WESTERN = [...CENTRAL, ...PACIFIC];
export const NHL_FO_DIVISIONS: { name: string; teams: string[] }[] = [
  { name: 'Atlantic', teams: ATLANTIC },
  { name: 'Metropolitan', teams: METRO },
  { name: 'Central', teams: CENTRAL },
  { name: 'Pacific', teams: PACIFIC },
];

export type NhlPos = 'C' | 'W' | 'D' | 'G';

export interface NhlGmPlayer {
  id: string;
  name: string;
  pos: NhlPos;
  age: number;
  ovr: number;
  salary: number;
  years: number;
  out: number; // rounds remaining injured
  pot: number;
}

export interface NhlGmTeam {
  abbr: string;
  players: NhlGmPlayer[];
  wins: number;
  losses: number;   // regulation losses
  otLosses: number; // worth a point
  picks: number[];
}

export interface NhlLeague {
  season: number;
  cap: number;
  teams: Record<string, NhlGmTeam>;
  freeAgents: NhlGmPlayer[];
  round: number; // 1..NHL_FO_ROUNDS
  champions: { season: number; team: string }[];
}

let nhlId = 0;
function fid(): string { nhlId += 1; return `h${nhlId}`; }

export function nhlPoints(t: NhlGmTeam): number {
  return t.wins * 2 + t.otLosses;
}

export function nhlSalaryFor(ovr: number): number {
  return Math.round(Math.max(0.7, (ovr - 70) * 0.4) * 10) / 10;
}

export function initNhlLeague(rng: () => number = Math.random): NhlLeague {
  const teams: Record<string, NhlGmTeam> = {};
  for (const [abbr, seeds] of Object.entries(NHL_FO_ROSTERS)) {
    const players: NhlGmPlayer[] = seeds.map(s => ({
      id: fid(),
      name: s.name,
      pos: s.pos as NhlPos,
      age: s.age,
      ovr: s.ovr,
      salary: nhlSalaryFor(s.ovr),
      years: s.age <= 24 ? 4 : s.age <= 29 ? 3 : 2,
      out: 0,
      pot: s.age <= 23 ? Math.min(99, s.ovr + 3 + Math.floor(rng() * 6)) : s.ovr,
    }));
    teams[abbr] = { abbr, players, wins: 0, losses: 0, otLosses: 0, picks: [1, 2] };
  }
  return {
    season: 2026,
    cap: NHL_CAP_BASE,
    teams,
    freeAgents: initialFaPool(rng),
    round: 1,
    champions: [],
  };
}

const FA_FIRST = ['Anders', 'Miro', 'Brady', 'Ilya', 'Cole', 'Juuso', 'Marek', 'Liam', 'Dmitri', 'Nolan'];
const FA_LAST = ['Lindqvist', 'Kovac', 'Tremblay', 'Sorokin', 'Bergeron', 'Halonen', 'Novak', 'Gallagher', 'Fedorov', 'Byfield'];
export function nhlGenName(rng: () => number): string {
  return `${FA_FIRST[Math.floor(rng() * FA_FIRST.length)]} ${FA_LAST[Math.floor(rng() * FA_LAST.length)]}`;
}

function initialFaPool(rng: () => number): NhlGmPlayer[] {
  const out: NhlGmPlayer[] = [];
  const POS: NhlPos[] = ['C', 'W', 'W', 'D', 'D', 'G', 'C', 'W', 'D', 'W'];
  for (let i = 0; i < 10; i++) {
    const ovr = 72 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: nhlGenName(rng), pos: POS[i % POS.length],
      age: 26 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  }
  return out;
}

export function nhlCapUsed(t: NhlGmTeam): number {
  return Math.round(t.players.reduce((s, p) => s + p.salary, 0) * 10) / 10;
}
export function nhlCapRoom(t: NhlGmTeam, cap: number): number {
  return Math.round((cap - nhlCapUsed(t)) * 10) / 10;
}

/** Strength: top six forwards 50%, top four D 30%, best goalie 20%. */
export function nhlStrength(t: NhlGmTeam): number {
  const healthy = t.players.filter(p => p.out === 0);
  const fwd = healthy.filter(p => p.pos === 'C' || p.pos === 'W').sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  const d = healthy.filter(p => p.pos === 'D').sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const g = healthy.filter(p => p.pos === 'G').sort((a, b) => b.ovr - a.ovr).slice(0, 1);
  const avg = (xs: NhlGmPlayer[], fallback: number) =>
    xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : fallback;
  return avg(fwd, 62) * 0.5 + avg(d, 62) * 0.3 + avg(g, 62) * 0.2;
}

export function nhlWinProb(a: NhlGmTeam, b: NhlGmTeam): number {
  const gap = nhlStrength(a) - nhlStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 14));
}

export interface NhlRoundReport {
  myWins: number;
  myLosses: number;
  myOtLosses: number;
  notes: string[];
}

export function simNhlRound(league: NhlLeague, myTeam: string, rng: () => number): NhlRoundReport {
  const abbrs = Object.keys(league.teams);
  const notes: string[] = [];
  let myW = 0, myL = 0, myOtl = 0;
  for (const t of Object.values(league.teams)) {
    for (const p of t.players) {
      if (p.out > 0) p.out -= 1;
      else if (rng() < 0.022) {
        p.out = 1 + Math.floor(rng() * 3);
        if (t.abbr === myTeam) notes.push(`🚑 ${p.name} is out ${p.out} round${p.out === 1 ? '' : 's'}.`);
      }
    }
  }
  const loseGame = (loser: NhlGmTeam, isMe: boolean) => {
    if (rng() < 0.25) { loser.otLosses += 1; if (isMe) myOtl += 1; }
    else { loser.losses += 1; if (isMe) myL += 1; }
  };
  for (const abbr of abbrs) {
    const me = league.teams[abbr];
    for (let g = 0; g < NHL_GAMES_PER_ROUND; g++) {
      let opp = abbrs[Math.floor(rng() * abbrs.length)];
      if (opp === abbr) opp = abbrs[(abbrs.indexOf(abbr) + 1) % abbrs.length];
      const them = league.teams[opp];
      if (rng() < 0.5) continue;
      const p = nhlWinProb(me, them);
      if (rng() < p) {
        me.wins += 1; if (abbr === myTeam) myW += 1;
        loseGame(them, opp === myTeam);
      } else {
        them.wins += 1; if (opp === myTeam) myW += 1;
        loseGame(me, abbr === myTeam);
      }
    }
  }
  return { myWins: myW, myLosses: myL, myOtLosses: myOtl, notes };
}

export function nhlFoStandings(league: NhlLeague, group?: string[]): NhlGmTeam[] {
  const pool = Object.values(league.teams).filter(t => !group || group.includes(t.abbr));
  return pool.sort((a, b) =>
    nhlPoints(b) - nhlPoints(a) || b.wins - a.wins || nhlStrength(b) - nhlStrength(a));
}

export interface NhlSeriesResult { name: string; home: string; away: string; homeWins: number; awayWins: number; winner: string }

function playNhlSeries(name: string, home: NhlGmTeam, away: NhlGmTeam, rng: () => number): NhlSeriesResult {
  const p = nhlWinProb(home, away);
  let hw = 0, aw = 0;
  while (hw < 4 && aw < 4) {
    if (rng() < p) hw += 1; else aw += 1;
  }
  return { name, home: home.abbr, away: away.abbr, homeWins: hw, awayWins: aw, winner: hw === 4 ? home.abbr : away.abbr };
}

/**
 * Real divisional bracket per conference: top 3 in each division, two wild
 * cards; the better division winner draws WC2. Division semifinals and
 * finals, conference final, Stanley Cup Final. All best-of-7.
 */
export function runNhlFoPlayoffs(league: NhlLeague, rng: () => number): { series: NhlSeriesResult[]; champion: string } {
  const series: NhlSeriesResult[] = [];
  const confChamps: string[] = [];
  for (const conf of [
    { name: 'Eastern', divs: [{ name: 'Atlantic', teams: ATLANTIC }, { name: 'Metropolitan', teams: METRO }], all: EASTERN },
    { name: 'Western', divs: [{ name: 'Central', teams: CENTRAL }, { name: 'Pacific', teams: PACIFIC }], all: WESTERN },
  ]) {
    const divTables = conf.divs.map(d => nhlFoStandings(league, d.teams));
    const top3Ids = new Set(divTables.flatMap(t => t.slice(0, 3).map(x => x.abbr)));
    const wilds = nhlFoStandings(league, conf.all).filter(t => !top3Ids.has(t.abbr)).slice(0, 2);
    // order the two division winners: better one faces WC2
    const winnersOrdered = [divTables[0][0], divTables[1][0]]
      .sort((a, b) => nhlPoints(b) - nhlPoints(a) || b.wins - a.wins);
    const wcFor = new Map<string, NhlGmTeam>();
    wcFor.set(winnersOrdered[0].abbr, wilds[1] ?? divTables[0][2]);
    wcFor.set(winnersOrdered[1].abbr, wilds[0] ?? divTables[1][2]);
    const divWinners: string[] = [];
    for (const [di, d] of conf.divs.entries()) {
      const table = divTables[di];
      const one = table[0];
      const semi1 = playNhlSeries(`${d.name} Semi`, one, wcFor.get(one.abbr)!, rng);
      const semi2 = playNhlSeries(`${d.name} Semi`, table[1], table[2], rng);
      const dFinal = playNhlSeries(`${d.name} Final`, league.teams[semi1.winner], league.teams[semi2.winner], rng);
      series.push(semi1, semi2, dFinal);
      divWinners.push(dFinal.winner);
    }
    const cf = playNhlSeries(`${conf.name} Final`, league.teams[divWinners[0]], league.teams[divWinners[1]], rng);
    series.push(cf);
    confChamps.push(cf.winner);
  }
  const cup = playNhlSeries('Stanley Cup Final', league.teams[confChamps[0]], league.teams[confChamps[1]], rng);
  series.push(cup);
  return { series, champion: cup.winner };
}

// ---- GM moves ----
export function nhlRelease(t: NhlGmTeam, fas: NhlGmPlayer[], id: string): boolean {
  const i = t.players.findIndex(p => p.id === id);
  if (i < 0 || t.players.length <= 8) return false;
  const [p] = t.players.splice(i, 1);
  fas.push({ ...p, years: 1 });
  return true;
}

export function nhlSign(t: NhlGmTeam, fas: NhlGmPlayer[], id: string, cap: number): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || t.players.length >= 15) return false;
  const p = fas[i];
  if (nhlCapRoom(t, cap) < p.salary) return false;
  fas.splice(i, 1);
  t.players.push(p);
  return true;
}

export function nhlTradeValue(p: NhlGmPlayer): number {
  const posW = p.pos === 'C' ? 1.12 : p.pos === 'D' ? 1.08 : p.pos === 'G' ? 1.05 : 1;
  const ageW = Math.max(0.5, 1.3 - Math.max(0, p.age - 24) * 0.055);
  return p.ovr * posW * ageW;
}

export function nhlTrade(
  my: NhlGmTeam, their: NhlGmTeam, myId: string, theirId: string, sweeten: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  // Round 82: salary matching so cap-strapped teams can still swap contracts
  const fitsMe = nhlCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = nhlCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  const pickV = sweeten && my.picks.length ? 12 : 0;
  if (nhlTradeValue(mine) + pickV < nhlTradeValue(theirs) * 1.07) return 'rejected';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question, so this enforces only the hard
   rules, roster floor and salary matching, exactly nhlTrade's, and
   moves the agreed pick when the package includes one. */
export function nhlExecuteTalksTrade(
  my: NhlGmTeam, their: NhlGmTeam, myId: string, theirId: string, addPick: boolean, cap: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  if (addPick && !my.picks.length) return 'invalid';
  const fitsMe = nhlCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = nhlCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) { their.picks.push(my.picks.pop()!); }
  return 'done';
}

export interface NhlProspect { id: string; name: string; pos: NhlPos; age: number; grade: number; trueOvr: number }

export function nhlDraftClass(rng: () => number, size = 24): NhlProspect[] {
  const POS: NhlPos[] = ['C', 'W', 'W', 'D', 'D', 'G'];
  const out: NhlProspect[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 69 + Math.floor(rng() * 18);
    out.push({
      id: fid(), name: nhlGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      age: 18 + Math.floor(rng() * 3),
      grade: Math.max(65, Math.min(93, trueOvr + Math.floor(rng() * 9) - 4)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function nhlProspectToPlayer(pr: NhlProspect, rng: () => number): NhlGmPlayer {
  return {
    id: fid(), name: pr.name, pos: pr.pos, age: pr.age, ovr: pr.trueOvr,
    salary: Math.max(0.8, Math.round((pr.trueOvr - 66) * 0.15 * 10) / 10),
    years: 3, out: 0,
    pot: Math.min(99, pr.trueOvr + 4 + Math.floor(rng() * 9)),
  };
}

export function nhlOffseason(league: NhlLeague, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(league.teams)) {
    const keep: NhlGmPlayer[] = [];
    for (const p of t.players) {
      p.age += 1;
      p.out = 0;
      const declineAge = p.pos === 'G' ? 34 : 31;
      if (p.age <= 23 && p.ovr < p.pot) p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 3));
      else if (p.age >= declineAge) p.ovr = Math.max(63, p.ovr - (1 + Math.floor(rng() * 2) + (p.age >= 37 ? 2 : 0)));
      if (p.age >= 38 && (p.ovr <= 74 || rng() < 0.38)) { notes.push(`👋 ${p.name} retires.`); continue; }
      p.years -= 1;
      if (p.years <= 0) {
        p.years = p.age <= 25 ? 4 : p.age <= 29 ? 3 : 2;
        p.salary = nhlSalaryFor(p.ovr);
        if (p.ovr < 80 && rng() < 0.45) { league.freeAgents.push({ ...p, years: 1 }); continue; }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0; t.losses = 0; t.otLosses = 0; t.picks = [1, 2];
    replenishNhlRoster(t, rng);
  }
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 32) fa.ovr = Math.max(63, fa.ovr - 1); }
  league.cap = Math.round(league.cap * 1.09);
  league.season += 1;
  league.round = 1;
  return notes;
}

/** Keep every club playable: at least 5 forwards, 3 D, 1 goalie, 10 players. */
export function replenishNhlRoster(t: NhlGmTeam, rng: () => number): void {
  const add = (pos: NhlPos) => {
    const ovr = 69 + Math.floor(rng() * 7);
    t.players.push({
      id: fid(), name: nhlGenName(rng), pos,
      age: 23 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  };
  while (t.players.filter(p => p.pos === 'C' || p.pos === 'W').length < 5) add(rng() < 0.4 ? 'C' : 'W');
  while (t.players.filter(p => p.pos === 'D').length < 3) add('D');
  while (t.players.filter(p => p.pos === 'G').length < 1) add('G');
  while (t.players.length < 10) add('W');
}

/** Light AI roster churn for the 31 CPU clubs. */
export function nhlAiMoves(league: NhlLeague, myTeam: string, rng: () => number): void {
  const cpu = Object.values(league.teams).filter(t => t.abbr !== myTeam);
  for (const t of cpu) {
    if (rng() > 0.25 || !league.freeAgents.length) continue;
    const best = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
    if (best && nhlCapRoom(t, league.cap) >= best.salary && t.players.length < 15) {
      nhlSign(t, league.freeAgents, best.id, league.cap);
    }
  }
}
