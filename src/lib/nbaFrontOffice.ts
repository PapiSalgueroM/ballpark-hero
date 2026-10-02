import { NBA_TEAMS } from '@/data/conquestDataNba';
import type { NbaOpeningRating, NbaOpeningRatingEvidence } from '@/data/nbaOpeningRatings';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';
/* Round 531: the cap comes from one sourced file, never a bare literal here. */
import { NBA_SALARY_CAP_2026_27 } from './leagueCaps';
import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
/* Round 631: dead money and the no way back rule, shared by the four GM sims. */
import { type CutLedger, cutPlayer, payrollWithDeadCap, rollDeadCap, rosterFullRefusal, signRefusal, tradeRefusal } from './frontOfficeCuts';
/* Round 722: the luxury tax, the aprons and the tip off roster floor, sourced in one file. */
import {
  NBA_TIPOFF_MIN, NBA_MIN_CONTRACT, nbaTaxLine, nbaFirstApron, nbaSecondApron, nbaTaxBill, nbaIsRepeater,
  nbaCalibrateTaxScale, type NbaTaxEntry,
} from './nbaLuxuryTax';
export { NBA_TIPOFF_MIN, NBA_MIN_CONTRACT, nbaTaxLine, nbaFirstApron, nbaSecondApron, nbaTaxBill } from './nbaLuxuryTax';
/* Round 824: season lines and awards. The stats file imports only types from
   this one, so there is no cycle at run time. */
import { type FoSeasonStats, foNewSeasonStats } from './foSeasonStats';
import { type NbaSeasonAwards, nbaBoxScore, nbaRecordBox, nbaLiveStats } from './nbaSeasonStats';
import { nbaRotationSlots, nbaReconcileRotation } from './nbaRotation';
/* Round 851: a booked, balanced schedule, shared with MLB and the NHL. */
import { type FoSchedule, buildFoSchedule, foPlayRound } from './foSchedule';

/**
 * NBA Front Office engine (2026-08-05). Basketball sibling of
 * src/lib/frontOffice.ts, built over the hand-curated real rosters in
 * conquestDataNba.ts (about ten real players per team with overalls that
 * were reviewed during the NBA Conquest build). All contracts and moves
 * are explicitly fictional. Season model: 20 rounds, each simulating a
 * 4-game stretch, an 82-game-shaped record, the modern play-in for seeds
 * 7 to 10, then best-of-7 series simulated round by round.
 */

export const NBA_CAP_BASE = NBA_SALARY_CAP_2026_27; // $M; the 7% rise per season in game is the game's own assumption, see leagueCaps.ts
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
  /* Round 824, both optional so every saved man loads unchanged. */
  /** The season a man drafted in this league debuts, which makes him a rookie that season. */
  rookieSeason?: number;
  /** This save's awards, newest last, e.g. "2027 MVP". A sim season's, never a real one. */
  awards?: string[];
  /** Original opening simulation estimate, retained through this saved career. */
  openingRatingEvidence?: NbaOpeningRatingEvidence;
}

/* Round 631: CutLedger is the optional deadCap and releasedThisSeason pair,
   so every league saved before this round keeps loading and reads as empty. */
export interface NbaGmTeam extends CutLedger {
  abbr: string;
  players: NbaGmPlayer[];
  /** Preferred starter and bench slots; healthy cover does not erase injured preferences. */
  rotation?: string[];
  wins: number;
  losses: number;
  picks: number[];
  /* Round 722: the tax ledger. Both optional, so every league saved before
     this round loads and reads as a club that has never paid tax. */
  /** The last four seasons' assessments, newest last; the repeater rule reads them. */
  taxHistory?: NbaTaxEntry[];
  /** The bill assessed at the last season close, $M. Ownership takes it out of this season's room. */
  taxDue?: number;
}

export interface NbaLeague {
  season: number;
  cap: number;
  teams: Record<string, NbaGmTeam>;
  freeAgents: NbaGmPlayer[];
  round: number; // 1..NBA_ROUNDS
  champions: { season: number; team: string }[];
  /**
   * Round 722: the tax lines' scale, set from this league's own payrolls
   * (nbaCalibrateLeagueTax, sources in nbaLuxuryTax.ts). A new league gets it
   * at creation. Optional, because a league saved before the round has none:
   * that league plays out its current season with no tax at all (no
   * projection, no bill at close, no apron rule) and is calibrated at its
   * next summer, so nobody is billed for a season that started untaxed.
   */
  taxScale?: number;
  /**
   * Round 824: this season's player lines and club totals (nbaSeasonStats.ts).
   * Optional: a league saved before the round keeps no lines for the season
   * it was saved in and starts keeping them at its next summer, the way it
   * met the tax.
   */
  stats?: FoSeasonStats;
  /** Round 824: every closed season's awards, oldest first. */
  awards?: NbaSeasonAwards[];
  /**
   * Round 851: this season's fixtures, one list of "HOME-AWAY" games per round
   * (foSchedule.ts). Optional: a league saved before the round finishes the
   * season it was saved in the old way and is booked at its next summer.
   */
  schedule?: FoSchedule;
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
const fid = makeIdMinter('n');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureNbaLeagueIds(lg: NbaLeague, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  const repaired = ensureLeagueEntityIds(fid, lg as never, ...loose);
  for (const t of Object.values(lg.teams)) nbaReconcileRotation(t);
  return repaired;
}

function normPos(p: string): NbaPos {
  const c = p[0];
  return c === 'G' ? 'G' : c === 'C' ? 'C' : 'F';
}

/** The game's own cap rise each summer, see leagueCaps.ts. */
export const NBA_CAP_RISE = 1.07;
/** Next season's cap, the one a contract signed this summer counts against. */
export function nbaNextCap(cap: number): number {
  return Math.round(cap * NBA_CAP_RISE);
}

/**
 * Round 824: what one dollar of the opening season's pay is worth in a season
 * whose cap is `cap`. Before this round every new deal was priced in 2026-27
 * money forever while the cap and the tax line rose 7% a season, so payrolls
 * fell behind the line and the tax faded: clubs over it ran five, then three
 * or four, then nought to two, then nought or one. Every contract signed,
 * drafted or re-signed from this round on is priced in the money of the
 * season it starts in, so payrolls rise with the line. Contracts already on
 * the books keep their number; a save from before the round loads unchanged
 * and its new deals are priced this way from its next signing on.
 */
export function nbaPayScale(cap: number): number {
  return cap / NBA_CAP_BASE;
}

/** A new deal for a man of this rating, in the money of a season whose cap is `cap` (the opening cap when omitted). */
export function nbaSalaryFor(ovr: number, cap: number = NBA_CAP_BASE): number {
  return Math.round(Math.max(2, (ovr - 68) * 2.1 - 4) * nbaPayScale(cap) * 10) / 10;
}

/** Round 824: the minimum deal in a season whose cap is `cap`. NBA_MIN_CONTRACT is the opening season's. */
export function nbaMinContract(cap: number = NBA_CAP_BASE): number {
  return Math.round(NBA_MIN_CONTRACT * nbaPayScale(cap) * 10) / 10;
}

/** Ages are editorial (no birth dates in the source data): stars get primes. */
function ageFor(ovr: number, rng: () => number): number {
  if (ovr >= 93) return 25 + Math.floor(rng() * 7);
  if (ovr >= 85) return 24 + Math.floor(rng() * 9);
  return 22 + Math.floor(rng() * 12);
}

export function initNbaLeague(rng: () => number = Math.random, opening?: Record<string, Record<string, NbaOpeningRating>>): NbaLeague {
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
  const league: NbaLeague = {
    season: 2026,
    cap: NBA_CAP_BASE,
    teams,
    /* Round 211: dealt against the names already on the rosters. */
    freeAgents: initialFaPool(rng, leagueNames({ teams, freeAgents: [] })),
    round: 1,
    champions: [],
    /* Round 824: lines kept from the first tip off. */
    stats: foNewSeasonStats(2026),
  };
  /* Round 722: the tax lines are set from this league's own payrolls. */
  nbaCalibrateLeagueTax(league);
  league.schedule = nbaBookSeason(league, rng);
  // Finish the original constructor first so ages, terms, draws and fixtures stay held.
  if (opening) {
    for (const seed of NBA_TEAMS) {
      for (const source of seed.players ?? []) {
        const rating = opening[seed.id]?.[`${source.name}|${source.position}`];
        const evidence = rating?.evidence;
        if (!rating || !Number.isInteger(rating.ovr) || rating.ovr < 0 || rating.ovr > 99 ||
            !Number.isFinite(rating.salary) || rating.salary < NBA_MIN_CONTRACT ||
            !evidence || evidence.originKey !== `${seed.id}|${source.name}|${source.position}` ||
            evidence.openingOvr !== rating.ovr || evidence.partial !== true ||
            typeof evidence.modelVersion !== 'string' || !evidence.modelVersion ||
            !['box-score-proxy', 'prior-only', 'unmeasured-prior'].includes(evidence.basis)) {
          throw new Error('Opening NBA ratings do not match this roster.');
        }
        const player = league.teams[seed.id].players.find(p => p.name === source.name)!;
        const headroom = Math.max(0, player.pot - player.ovr);
        player.ovr = rating.ovr;
        player.salary = rating.salary;
        player.pot = Math.min(99, rating.ovr + headroom);
        player.openingRatingEvidence = {
          modelVersion: evidence.modelVersion, originKey: evidence.originKey,
          openingOvr: evidence.openingOvr, basis: evidence.basis, partial: evidence.partial,
        };
      }
    }
  }
  return league;
}

/** Round 851: every club plays NBA_ROUNDS x GAMES_PER_ROUND games, half at home. */
export function nbaBookSeason(league: NbaLeague, rng: () => number): FoSchedule {
  return buildFoSchedule(Object.keys(league.teams), NBA_ROUNDS, GAMES_PER_ROUND, rng);
}

/**
 * Round 722: what a club will carry at tip off. A club short of the floor is
 * filled on the minimum there, so the shortfall is counted at that price.
 */
export function nbaTipOffPayroll(t: NbaGmTeam, cap: number = NBA_CAP_BASE): number {
  return Math.round((nbaCapUsed(t) + nbaMinContract(cap) * Math.max(0, NBA_TIPOFF_MIN - t.players.length)) * 10) / 10;
}

/**
 * Round 722: set the league's tax scale from every club's tip off payroll at
 * the league's current cap (the rule and its real world aims are in
 * nbaLuxuryTax.ts). Called at creation and, for a league saved before the
 * round, once at the end of its next summer.
 */
export function nbaCalibrateLeagueTax(league: NbaLeague): void {
  const payrolls = Object.values(league.teams).map(t => nbaTipOffPayroll(t, league.cap));
  league.taxScale = nbaCalibrateTaxScale(payrolls, league.cap);
}

/* Round 211: widened from 10x10 to 28x28. A hundred possible people is
   not enough to deal a fourteen man free agent pool out of: the same man
   turned up twice in about a third of new leagues. Every pairing below is
   enumerated against the real-name wall by simInventedNames on each suite
   run, so nothing goes in here without that harness agreeing. */
const FA_FIRST = [
  'Marcus', 'Devon', 'Tyrese', 'Jalen', 'Keon', 'Andre', 'Malik', 'Cole', 'Isaiah', 'Trey',
  'Amari', 'Bryce', 'Dashawn', 'Emory', 'Jaylen', 'Kobi', 'Lamar', 'Marquis', 'Naz', 'Omari',
  'Quentin', 'Rondell', 'Sekou', 'Tarik', 'Vontae', 'Zaire', 'Corey', 'Damon',
];
const FA_LAST = [
  'Vance', 'Holiday', 'Whitmore', 'Castleton', 'Reeves', 'Okonkwo', 'Marchand', 'Bellamy', 'Strother', 'Quinn',
  'Ashgrove', 'Beaudry', 'Coltrane', 'Danforth', 'Eastwick', 'Fairweather', 'Grissom', 'Halverson', 'Isley', 'Jarreau',
  'Kingman', 'Lockridge', 'Maplewood', 'Northcutt', 'Oakhurst', 'Pemberton', 'Ridgeway', 'Stallworth',
];
/**
 * Round 211: a name nobody in this league already has when a book is
 * passed. Optional so harnesses and any caller wanting a plausible string
 * still work; every caller inside the engine passes one.
 */
export function nbaGenName(rng: () => number, taken?: Set<string>): string {
  if (taken) return uniqueName(rng, FA_FIRST, FA_LAST, taken);
  return `${FA_FIRST[Math.floor(rng() * FA_FIRST.length)]} ${FA_LAST[Math.floor(rng() * FA_LAST.length)]}`;
}

function initialFaPool(rng: () => number, taken: Set<string>): NbaGmPlayer[] {
  const out: NbaGmPlayer[] = [];
  const POS: NbaPos[] = ['G', 'G', 'F', 'F', 'C'];
  for (let i = 0; i < 10; i++) {
    const ovr = 72 + Math.floor(rng() * 10);
    out.push({
      id: fid(), name: nbaGenName(rng, taken), pos: POS[i % POS.length],
      age: 26 + Math.floor(rng() * 8), ovr, salary: nbaSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  }
  return out;
}

/** The roster's salaries plus this season's dead money (Round 631). */
export function nbaCapUsed(t: NbaGmTeam): number {
  return payrollWithDeadCap(t.players, t);
}
/**
 * Room under the cap, less the tax cheque ownership wrote at the last season
 * close (Round 722): the bill comes out of this season's spending, so a club
 * that paid tax has that much less to sign with. Zero on every save written
 * before the round and on every club that stayed under the line.
 */
export function nbaCapRoom(t: NbaGmTeam, cap: number): number {
  return Math.round((cap - nbaCapUsed(t) - (t.taxDue ?? 0)) * 10) / 10;
}

/** What the cap panel and the hub say about the tax, all season, as a projection off today's payroll. */
export interface NbaTaxView {
  payroll: number;
  line: number;
  /** Payroll less the line, negative when under it. */
  over: number;
  /** The bill the payroll would draw if the season closed today. */
  bill: number;
  repeater: boolean;
  firstApron: number;
  secondApron: number;
  aboveFirst: boolean;
  aboveSecond: boolean;
  /** Last season's bill, held back from this season's room. */
  due: number;
  /** A league saved before Round 722 that has not had its summer yet: no tax this season. */
  pending?: boolean;
}

export function nbaTaxView(t: NbaGmTeam, league: Pick<NbaLeague, 'cap' | 'season' | 'taxScale'>): NbaTaxView {
  const payroll = nbaCapUsed(t);
  const scale = league.taxScale;
  if (scale == null) {
    return {
      payroll, line: 0, over: 0, bill: 0, repeater: false,
      firstApron: 0, secondApron: 0, aboveFirst: false, aboveSecond: false, due: t.taxDue ?? 0, pending: true,
    };
  }
  const line = nbaTaxLine(league.cap, scale);
  const repeater = nbaIsRepeater(t.taxHistory, league.season);
  const firstApron = nbaFirstApron(league.cap, scale);
  const secondApron = nbaSecondApron(league.cap, scale);
  return {
    payroll, line, over: Math.round((payroll - line) * 10) / 10,
    bill: nbaTaxBill(payroll, league.cap, repeater, scale), repeater,
    firstApron, secondApron, aboveFirst: payroll > firstApron, aboveSecond: payroll > secondApron,
    due: t.taxDue ?? 0,
  };
}

/** Strength: five starters 72%, three bench players 28%; injured players excluded. */
export function nbaStrength(t: NbaGmTeam): number {
  const slots = nbaRotationSlots(t);
  const five = slots.slice(0, 5).filter((p): p is NbaGmPlayer => !!p);
  const bench = slots.slice(5, 8).filter((p): p is NbaGmPlayer => !!p);
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

/** Simulate one round: every team plays its GAMES_PER_ROUND booked games. */
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
  /* Round 824: the season's lines, when the league is keeping them this season. */
  const stats = nbaLiveStats(league);
  /* Round 851: the round's booked games (foSchedule.ts), every club exactly
     GAMES_PER_ROUND of them; a league saved mid season before the round
     finishes that season the old way. */
  foPlayRound(league, abbrs, GAMES_PER_ROUND, rng, (abbr, opp, k) => {
    const me = league.teams[abbr];
    const them = league.teams[opp];
    const p = nbaWinProb(me, them);
    /* Round 824: the deciding draw is kept so the box score can be read off
       it. Still exactly one draw, so every result is what it always was. */
    const draw = rng();
    const homeWon = draw < p;
    if (homeWon) { me.wins += 1; them.losses += 1; if (abbr === myTeam) myW += 1; if (opp === myTeam) myL += 1; }
    else { me.losses += 1; them.wins += 1; if (abbr === myTeam) myL += 1; if (opp === myTeam) myW += 1; }
    if (stats) nbaRecordBox(stats, nbaBoxScore(me, them, homeWon, draw, p, league.round * 1000 + k, league.season));
  }, () => nbaBookSeason(league, rng));
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
/* Round 631: waiving a man is not free. Half his salary stays on this
   season's cap as dead money, a quarter on next season's if he had years
   left, and this team cannot sign him back until the offseason. The rule
   lives in src/lib/frontOfficeCuts.ts, once, for all four GM sims; measured
   before it, waiving Nikola Jokic at 61.1M freed the whole 61.1, and only
   Denver's own cap position stopped the re-sign, never a rule. */
/** Round 631: the roster floor and ceiling. The board greys Waive and Sign at them. */
export const NBA_ROSTER_MIN = 8;
export const NBA_ROSTER_MAX = 15;

export function nbaRelease(t: NbaGmTeam, fas: NbaGmPlayer[], id: string): boolean {
  const released = cutPlayer(t, fas, id, NBA_ROSTER_MIN);
  if (released) nbaReconcileRotation(t);
  return released;
}

export function nbaSign(t: NbaGmTeam, fas: NbaGmPlayer[], id: string, cap: number): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || rosterFullRefusal(t, NBA_ROSTER_MAX)) return false;
  /* Round 631: the same refusal the board shows beside the greyed button. */
  if (signRefusal(t, id)) return false;
  const p = fas[i];
  if (nbaCapRoom(t, cap) < p.salary) return false;
  fas.splice(i, 1);
  t.players.push(p);
  nbaReconcileRotation(t);
  return true;
}

export function nbaTradeValue(p: NbaGmPlayer): number {
  const ageW = Math.max(0.5, 1.3 - Math.max(0, p.age - 24) * 0.055);
  return p.ovr * ageW;
}

/**
 * Whether `receiver` may take `incoming` in for `outgoing` under the money
 * rules. Round 82: NBA style salary matching, so over-cap teams can still
 * trade when the money roughly lines up (the old room-only check made every
 * trade between capped-out rosters invalid, which killed the whole trade
 * screen). Round 722: the apron rule on top. A club whose payroll after the
 * deal sits above the first apron may take back no more salary than it sends
 * out, which is the rule the 2023 agreement put on apron teams from 2024-25
 * (sources in nbaLuxuryTax.ts). Both trade paths and the Trade Finder ask
 * this one function, so the three can never disagree. `taxScale` is the
 * league's (NbaLeague.taxScale); without one, a league saved before the round
 * and not yet calibrated, there is no apron this season.
 */
export function nbaSalaryFits(receiver: NbaGmTeam, outgoing: NbaGmPlayer, incoming: NbaGmPlayer, cap: number, taxScale?: number): boolean {
  const after = nbaCapUsed(receiver) - outgoing.salary + incoming.salary;
  if (taxScale != null && after > nbaFirstApron(cap, taxScale)) return incoming.salary <= outgoing.salary;
  return nbaCapRoom(receiver, cap) + outgoing.salary >= incoming.salary || incoming.salary <= outgoing.salary * 1.5 + 5;
}

/** Round 722: the one line the trade screen shows a club the apron rule binds on, or null. */
export function nbaApronNote(t: NbaGmTeam, cap: number, taxScale?: number): string | null {
  if (taxScale == null) return null;
  const payroll = nbaCapUsed(t);
  const first = nbaFirstApron(cap, taxScale), second = nbaSecondApron(cap, taxScale);
  if (payroll > second) return `Over the second apron ($${second}M): any trade must send out at least as much salary as it brings back.`;
  if (payroll > first) return `Over the first apron ($${first}M): any trade must send out at least as much salary as it brings back.`;
  return null;
}

export function nbaTrade(
  my: NbaGmTeam, their: NbaGmTeam, myId: string, theirId: string, sweeten: boolean, cap: number, taxScale?: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
  if (!nbaSalaryFits(my, mine, theirs, cap, taxScale) || !nbaSalaryFits(their, theirs, mine, cap, taxScale)) return 'invalid';
  const pickV = sweeten && my.picks.length ? 12 : 0;
  if (nbaTradeValue(mine) + pickV < nbaTradeValue(theirs) * 1.07) return 'rejected';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }
  nbaReconcileRotation(my); nbaReconcileRotation(their);
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question, so this enforces only the hard
   rules, roster floor and salary matching, exactly nbaTrade's, and
   moves the agreed pick when the package includes one. */
export function nbaExecuteTalksTrade(
  my: NbaGmTeam, their: NbaGmTeam, myId: string, theirId: string, addPick: boolean, cap: number, taxScale?: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myId);
  const theirs = their.players.find(p => p.id === theirId);
  if (!mine || !theirs || my.players.length <= 8 || their.players.length <= 8) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
  if (addPick && !my.picks.length) return 'invalid';
  if (!nbaSalaryFits(my, mine, theirs, cap, taxScale) || !nbaSalaryFits(their, theirs, mine, cap, taxScale)) return 'invalid';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) { their.picks.push(my.picks.pop()!); }
  nbaReconcileRotation(my); nbaReconcileRotation(their);
  return 'done';
}

export interface NbaProspect { id: string; name: string; pos: NbaPos; age: number; grade: number; trueOvr: number }

export function nbaDraftClass(rng: () => number, size = 24, taken: Set<string> = new Set()): NbaProspect[] {
  const POS: NbaPos[] = ['G', 'G', 'F', 'F', 'C'];
  const out: NbaProspect[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 70 + Math.floor(rng() * 18);
    out.push({
      id: fid(), name: nbaGenName(rng, taken), pos: POS[Math.floor(rng() * POS.length)],
      age: 19 + Math.floor(rng() * 3),
      grade: Math.max(66, Math.min(94, trueOvr + Math.floor(rng() * 9) - 4)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

/**
 * Round 824: the season a draft class signs into. The draft runs at the close
 * of a season, so its rookie deals count against next season's cap and are
 * priced in that season's money, and the rookies debut that season.
 */
export interface NbaSigning { cap: number; season: number }
export function nbaDraftSigning(league: Pick<NbaLeague, 'cap' | 'season'>): NbaSigning {
  return { cap: nbaNextCap(league.cap), season: league.season + 1 };
}

/* Round 824: `signing` prices the rookie deal and marks the debut season (the
   rookie of the year race reads it). Without it the deal is priced in the
   opening season's money and the man is not marked, which is what every
   caller got before the round. */
export function nbaProspectToPlayer(pr: NbaProspect, rng: () => number, signing?: NbaSigning): NbaGmPlayer {
  const scale = signing ? nbaPayScale(signing.cap) : 1;
  return {
    id: fid(), name: pr.name, pos: pr.pos, age: pr.age, ovr: pr.trueOvr,
    salary: Math.round(Math.max(3, Math.round((pr.trueOvr - 62) * 0.4 * 10) / 10) * scale * 10) / 10,
    years: 4, out: 0,
    pot: Math.min(99, pr.trueOvr + 4 + Math.floor(rng() * 9)),
    ...(signing ? { rookieSeason: signing.season } : {}),
  };
}

/* Round 722: the end of bench. A man on the minimum, one year, no upside:
   what the league hands a short roster at tip off and what a CPU club fills
   its fourteen with. Rated under the pool's worst, so he never displaces a
   real player from the eight who decide games. */
function nbaMinimumMan(rng: () => number, taken: Set<string>, slot: number, cap: number): NbaGmPlayer {
  const ovr = 66 + Math.floor(rng() * 6);
  return {
    id: fid(), name: nbaGenName(rng, taken),
    pos: (['G', 'F', 'C'] as NbaPos[])[slot % 3],
    /* Round 824: the minimum of the season he signs into. */
    age: 23 + Math.floor(rng() * 9), ovr, salary: nbaMinContract(cap),
    years: 1, out: 0, pot: ovr,
  };
}

/**
 * Round 722: why this club cannot tip off, or null. Fifteen standard
 * contracts is the in season ceiling (sources in nbaLuxuryTax.ts), and the
 * draft can leave a club above it, so the Play button waits on a waiver.
 * The shared cuts flow (frontOfficeCuts.ts) is how the waiver happens.
 */
export function nbaTipOffRefusal(t: NbaGmTeam): string | null {
  if (t.players.length > NBA_ROSTER_MAX) {
    return `${t.players.length} under contract. Waive down to ${NBA_ROSTER_MAX} before tip off.`;
  }
  return null;
}

export interface NbaTipOff {
  /** The men each club was handed on minimum deals, by abbr. Clubs already at the floor are absent. */
  filled: Record<string, NbaGmPlayer[]>;
  /** Clubs above the ceiling, untouched: they cannot start the season. */
  refused: string[];
}

/**
 * Round 722: the season cannot tip off below fourteen standard contracts.
 * The GM's club (myTeam) short of the floor is filled from the pool, lowest
 * rated first (the men nobody wanted), each signed for one year on the
 * minimum; when the pool runs dry the league generates the rest. Every other
 * club short of the floor is handed generated minimum men, the same men the
 * CPU summer fill signs in nbaOffseason, because the pool is the GM's market
 * for the season: filling the CPU clubs from it handed the whole ten man pool
 * of every new league to the first three clubs in table order on the minimum
 * and left the GM nobody to sign. A club above fifteen is refused and left
 * exactly as it was. Called by the board once, before the first round of a
 * season, and by the harness.
 */
export function nbaTipOff(league: NbaLeague, rng: () => number, myTeam?: string): NbaTipOff {
  const filled: Record<string, NbaGmPlayer[]> = {};
  const refused: string[] = [];
  const taken = leagueNames(league);
  for (const t of Object.values(league.teams)) {
    if (nbaTipOffRefusal(t)) { refused.push(t.abbr); continue; }
    const added: NbaGmPlayer[] = [];
    const fromPool = t.abbr === myTeam;
    while (t.players.length < NBA_TIPOFF_MIN) {
      /* Round 631's rule holds here too: a man this club let go this season does not come back by the side door. */
      const pool = fromPool ? league.freeAgents.filter(p => !signRefusal(t, p.id)).sort((a, b) => a.ovr - b.ovr) : [];
      let man: NbaGmPlayer;
      if (pool.length) {
        league.freeAgents.splice(league.freeAgents.indexOf(pool[0]), 1);
        man = { ...pool[0], salary: nbaMinContract(league.cap), years: 1 };
      } else {
        man = nbaMinimumMan(rng, taken, t.players.length, league.cap);
      }
      t.players.push(man);
      added.push(man);
    }
    if (added.length) filled[t.abbr] = added;
    nbaReconcileRotation(t);
  }
  return { filled, refused };
}

/** One club's assessment at season close, with the club on it. */
export interface NbaTaxAssessment extends NbaTaxEntry { team: string }

/**
 * Round 722: the tax is assessed once, at season close, on the payroll as it
 * stands (roster salaries plus dead money, the number the tax counts in the
 * real league too). Each club's entry joins its history, the last four are
 * kept because that is the repeater window, and the bill becomes taxDue,
 * which nbaCapRoom holds back from next season's room. A season already in
 * the history is not assessed twice: the Round 431 rule that a season closes
 * once applies to the cheque as much as to the games. A league with no scale
 * yet (saved before the round, still in the season it was saved in) is not
 * assessed at all: that season started without a tax, so it closes without one.
 */
export function nbaAssessTax(league: NbaLeague): NbaTaxAssessment[] {
  const out: NbaTaxAssessment[] = [];
  const scale = league.taxScale;
  if (scale == null) return out;
  for (const t of Object.values(league.teams)) {
    const history = t.taxHistory ?? [];
    let entry = history.find(e => e.season === league.season);
    if (!entry) {
      const payroll = nbaCapUsed(t);
      const repeater = nbaIsRepeater(history, league.season);
      entry = { season: league.season, payroll, line: nbaTaxLine(league.cap, scale), bill: nbaTaxBill(payroll, league.cap, repeater, scale), repeater };
      t.taxHistory = [...history, entry].filter(e => e.season > league.season - 4);
      t.taxDue = entry.bill;
    }
    out.push({ team: t.abbr, ...entry });
  }
  return out;
}

/**
 * The summer. Round 722 added `myTeam`: the GM's own club is left to its GM
 * (no fill, no trim, no tax driven walk outs), every other club is run by a
 * CPU front office that fills to fourteen, trims to fifteen and steers under
 * the tax. Callers that pass no team (the harnesses) get the CPU treatment
 * on every club, which is what they got before.
 */
export function nbaOffseason(league: NbaLeague, rng: () => number, myTeam?: string): string[] {
  const notes: string[] = [];
  /* Round 211: one name book for the whole offseason, so the men who
     arrive to fill rosters cannot duplicate each other or anybody left. */
  const taken = leagueNames(league);
  /* Round 722: next season's cap, under whose tax line a CPU club that just
     wrote a cheque, or would write one at today's payroll, steers. */
  const nextCap = nbaNextCap(league.cap);
  for (const t of Object.values(league.teams)) {
    const cpu = t.abbr !== myTeam;
    /* Round 722: a CPU club facing a cheque stops re-signing its depth: an
       expiring man outside the best five walks. The steer is driven by the
       bill, not the line, so a tax with no teeth steers nobody. The user's
       club is never steered; the GM pays or sheds himself. */
    const taxAverse = cpu && ((t.taxDue ?? 0) > 0 || (league.taxScale != null
      && nbaTaxBill(nbaCapUsed(t), nextCap, nbaIsRepeater(t.taxHistory, league.season + 1), league.taxScale) > 0));
    const core = new Set([...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 5).map(p => p.id));
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
        /* Round 824: the new deal starts next season, so it is priced in next season's money. */
        p.salary = nbaSalaryFor(p.ovr, nextCap);
        if (taxAverse && !core.has(p.id)) { league.freeAgents.push({ ...p, years: 1 }); continue; }
        if (p.ovr < 80 && rng() < 0.45) { league.freeAgents.push({ ...p, years: 1 }); continue; }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0; t.losses = 0; t.picks = [1, 2];
    /* Round 722: a CPU club above fifteen waives its lowest rated man, through
       the shared cut (dead money and all) and before the ledger rolls, so the
       summer still ends with a clean release list on every club. */
    if (cpu) {
      while (t.players.length > NBA_ROSTER_MAX) {
        const worst = [...t.players].sort((a, b) => a.ovr - b.ovr)[0];
        if (!cutPlayer(t, league.freeAgents, worst.id, NBA_ROSTER_MIN)) break;
      }
    }
    rollDeadCap(t);
    /* Round 722: a CPU club fills to the fourteen man floor on minimum deals
       here; the GM's club is filled at tip off, from the pool, after he has
       had the summer to sign whom he likes. */
    if (cpu) {
      while (t.players.length < NBA_TIPOFF_MIN) t.players.push(nbaMinimumMan(rng, taken, t.players.length, nextCap));
    }
    nbaReconcileRotation(t);
  }
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  /* Round 824: a free agent's ask is a deal he has not signed yet, so each
     summer it is set again for his rating in next season's money. Without
     this the pool kept asking opening season prices while the cap rose. */
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 32) fa.ovr = Math.max(64, fa.ovr - 1); fa.salary = nbaSalaryFor(fa.ovr, nextCap); }
  league.cap = nextCap;
  league.season += 1;
  league.round = 1;
  /* Round 824: a clean sheet of lines for the new season. A league saved
     before the round starts keeping them here, at its first summer. */
  league.stats = foNewSeasonStats(league.season);
  /* Round 722: a league saved before the round gets its tax lines here, at
     its first summer, from the payrolls it will tip off with. A calibrated
     league keeps its scale, and its lines rise with the cap. */
  if (league.taxScale == null) nbaCalibrateLeagueTax(league);
  /* Round 851: the new season's fixtures, for an old save too. */
  league.schedule = nbaBookSeason(league, rng);
  return notes;
}
