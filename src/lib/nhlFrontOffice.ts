import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';
import type { NhlOpeningRating, NhlOpeningRatingEvidence } from '@/data/nhlOpeningRatings';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';
/* Round 531: the cap comes from one sourced file, never a bare literal here. */
import { NHL_UPPER_LIMIT_2026_27 } from './leagueCaps';
import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
/* Round 851: a booked, balanced schedule, shared with the NBA and MLB. */
import { type FoSchedule, buildFoSchedule, foPlayRound } from './foSchedule';
/* Round 631: dead money and the no way back rule, shared by the four GM sims. */
import { type CutLedger, cutPlayer, payrollWithDeadCap, rollDeadCap, rosterFullRefusal, signRefusal, tradeRefusal } from './frontOfficeCuts';

/**
 * NHL Front Office engine (2026-08-05). Hockey sibling of the NFL, NBA and
 * MLB GM engines, built over the existing curated roster snapshot (see
 * src/data/nhlFoPlayers.ts). New careers can apply original simulation
 * estimates from a versioned 2024-25 and 2025-26 regular-season model.
 * Defensive and goalie proxies remain partial. Every salary, contract
 * and transaction the engine produces is explicitly fictional.
 *
 * Season model: 20 rounds of 4 games (80 games a club, booked by foSchedule since Round 851) with real NHL points
 * (2 for a win, 1 for an overtime loss; about a quarter of losses go to OT).
 * Playoffs follow the real divisional format: top three per division plus
 * two wild cards per conference, bracketed inside each division, all rounds
 * best-of-7, ending in the Stanley Cup Final.
 *
 * The cap is modeled on the real announced 2026-27 upper limit ($104M),
 * rising about 9% per season as in the current CBA memo.
 */

export const NHL_CAP_BASE = NHL_UPPER_LIMIT_2026_27; // $M, the published 2026-27 upper limit; the 9% rise per season in game is the game's own assumption, see leagueCaps.ts
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
  /** Original simulation estimate, retained as this player develops or moves. */
  openingRatingEvidence?: NhlOpeningRatingEvidence;
}

/** Selected ratings for this simulation, not full NHL lines or ice time. */
export interface NhlContributors {
  forwards: string[];
  defense: string[];
  goalie: string | null;
}

/* Round 631: CutLedger is the optional deadCap and releasedThisSeason pair,
   so every league saved before this round keeps loading and reads as empty. */
export interface NhlGmTeam extends CutLedger {
  abbr: string;
  players: NhlGmPlayer[];
  wins: number;
  losses: number;   // regulation losses
  otLosses: number; // worth a point
  picks: number[];
  contributors?: NhlContributors;
}

export interface NhlLeague {
  ratingModelVersion?: string;
  draftAffordabilityVersion?: string;
  season: number;
  cap: number;
  teams: Record<string, NhlGmTeam>;
  freeAgents: NhlGmPlayer[];
  round: number; // 1..NHL_FO_ROUNDS
  champions: { season: number; team: string }[];
  /** Round 851: this season's fixtures, "HOME-AWAY" per round (foSchedule.ts).
      Optional: a league saved before the round finishes that season the old
      way and is booked at its next summer. */
  schedule?: FoSchedule;
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
const fid = makeIdMinter('h');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureNhlLeagueIds(lg: NhlLeague, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  return ensureLeagueEntityIds(fid, lg as never, ...loose);
}

export function nhlPoints(t: NhlGmTeam): number {
  return t.wins * 2 + t.otLosses;
}

export const NHL_RATING_MODEL_VERSION = 'nhl-multiyear-candidate-v2-economy-flat-v1';
export const NHL_DRAFT_AFFORDABILITY_VERSION = 'nhl-flat-nextcap-ai-v1';
const NHL_PRICE_FACTOR = 1.3199808744620938;

export function nhlSalaryFor(ovr: number, version?: string): number {
  const originalAsk = Math.round(Math.max(0.7, (ovr - 70) * 0.4) * 10) / 10;
  return version === NHL_RATING_MODEL_VERSION
    ? Math.round((0.7 + NHL_PRICE_FACTOR * Math.max(0, originalAsk - 0.7)) * 10) / 10
    : originalAsk;
}

export function initNhlLeague(rng: () => number = Math.random, opening?: Record<string, Record<string, NhlOpeningRating>>): NhlLeague {
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
  const league: NhlLeague = {
    season: 2026,
    cap: NHL_CAP_BASE,
    teams,
    /* Round 211: dealt against the names already on the rosters. */
    freeAgents: initialFaPool(rng, leagueNames({ teams, freeAgents: [] })),
    round: 1,
    champions: [],
  };
  league.schedule = nhlBookSeason(league, rng);
  if (opening !== undefined) {
    // This exact version pins the reviewed 2024-25 and 2025-26 regular-season window.
    const clubs = Object.keys(NHL_FO_ROSTERS);
    if (!opening || typeof opening !== 'object' || Array.isArray(opening) || Object.keys(opening).length !== clubs.length || Object.keys(opening).some(abbr => !clubs.includes(abbr))) {
      throw new Error('Opening NHL ratings do not match this roster.');
    }
    for (const [abbr, seeds] of Object.entries(NHL_FO_ROSTERS)) {
      const group = opening[abbr], keys = seeds.map(s => `${s.name}|${s.pos}`);
      if (!group || typeof group !== 'object' || Array.isArray(group) || Object.keys(group).length !== keys.length || Object.keys(group).some(key => !keys.includes(key))) {
        throw new Error('Opening NHL ratings do not match this roster.');
      }
      for (const source of seeds) {
        const rating = group[`${source.name}|${source.pos}`], e = rating?.evidence;
        const basis = source.pos === 'D' ? 'offense-usage-proxy' : source.pos === 'G' ? 'save-rate-proxy' : 'offensive-production';
        if (!rating || !Number.isInteger(rating.ovr) || rating.ovr < 0 || rating.ovr > 99 ||
            !Number.isFinite(rating.salary) || rating.salary < 0.7 || Math.abs(rating.salary * 10 - Math.round(rating.salary * 10)) > 1e-9 ||
            !e || Object.keys(e).sort().join('|') !== 'basis|modelVersion|openingOvr|originKey|partial' ||
            e.modelVersion !== NHL_RATING_MODEL_VERSION || e.originKey !== `${abbr}|${source.name}|${source.pos}` ||
            e.openingOvr !== rating.ovr || typeof e.partial !== 'boolean' || ![basis, 'unmeasured-prior'].includes(e.basis) ||
            ((source.pos === 'D' || source.pos === 'G' || e.basis === 'unmeasured-prior') && !e.partial)) {
          throw new Error('Opening NHL ratings do not match this roster.');
        }
      }
      const openingBudget = Math.round(Object.values(group).reduce((sum, p) => sum + p.salary, 0) * 10);
      if (openingBudget !== Math.round(nhlCapUsed(league.teams[abbr]) * 10)) throw new Error('Opening NHL ratings do not match this roster.');
    }
    for (const [abbr, team] of Object.entries(league.teams)) for (const player of team.players) {
      const rating = opening[abbr][`${player.name}|${player.pos}`], evidence = rating.evidence;
      const headroom = Math.max(0, player.pot - player.ovr);
      player.ovr = rating.ovr;
      player.salary = rating.salary;
      player.pot = Math.min(99, rating.ovr + headroom);
      player.openingRatingEvidence = {
        modelVersion: evidence.modelVersion, originKey: evidence.originKey,
        openingOvr: evidence.openingOvr, basis: evidence.basis, partial: evidence.partial,
      };
    }
    for (const fa of league.freeAgents) fa.salary = nhlSalaryFor(fa.ovr, NHL_RATING_MODEL_VERSION);
    league.ratingModelVersion = NHL_RATING_MODEL_VERSION;
    league.draftAffordabilityVersion = NHL_DRAFT_AFFORDABILITY_VERSION;
  }
  return league;
}

/** Round 851: every club plays NHL_FO_ROUNDS x NHL_GAMES_PER_ROUND games, half at home. */
export function nhlBookSeason(league: NhlLeague, rng: () => number): FoSchedule {
  return buildFoSchedule(Object.keys(league.teams), NHL_FO_ROUNDS, NHL_GAMES_PER_ROUND, rng);
}

/* Round 211: widened from 10x10 to 28x28. A hundred possible people is
   not enough to deal a fourteen man free agent pool out of: the same man
   turned up twice in about a third of new leagues. Every pairing below is
   enumerated against the real-name wall by simInventedNames on each suite
   run, so nothing goes in here without that harness agreeing. */
const FA_FIRST = [
  'Anders', 'Miro', 'Brady', 'Ilya', 'Cole', 'Juuso', 'Marek', 'Liam', 'Dmitri', 'Nolan',
  'Tuukka', 'Rasmus', 'Emil', 'Kasper', 'Lucas', 'Nikita', 'Oskar', 'Petteri', 'Rurik', 'Sten',
  'Torsten', 'Ulf', 'Valter', 'Wilhelm', 'Aleks', 'Bjorn', 'Casper', 'Eino',
];
/* Round 199: 'Sorokin' left this bank. With the Ilya above it, it produced
   a real NHL goaltender, and these free agents are invented men. */
const FA_LAST = [
  'Lindqvist', 'Kovac', 'Tremblay', 'Vasko', 'Bergeron', 'Halonen', 'Novak', 'Gallagher', 'Fedorov', 'Byfield',
  'Ahlberg', 'Brannstrom', 'Cederholm', 'Dahlstrom', 'Eklund', 'Forsell', 'Grahn', 'Hjalmarsen', 'Ivarsson', 'Jokela',
  'Karlstrom', 'Lehtinen', 'Mikkola', 'Nyholm', 'Ostberg', 'Palmgren', 'Ranta', 'Sjodin',
];
/**
 * Round 211: a name nobody in this league already has when a book is
 * passed. Optional so harnesses and any caller wanting a plausible string
 * still work; every caller inside the engine passes one.
 */
export function nhlGenName(rng: () => number, taken?: Set<string>): string {
  if (taken) return uniqueName(rng, FA_FIRST, FA_LAST, taken);
  return `${FA_FIRST[Math.floor(rng() * FA_FIRST.length)]} ${FA_LAST[Math.floor(rng() * FA_LAST.length)]}`;
}

function initialFaPool(rng: () => number, taken: Set<string>): NhlGmPlayer[] {
  const out: NhlGmPlayer[] = [];
  const POS: NhlPos[] = ['C', 'W', 'W', 'D', 'D', 'G', 'C', 'W', 'D', 'W'];
  for (let i = 0; i < 10; i++) {
    const ovr = 72 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: nhlGenName(rng, taken), pos: POS[i % POS.length],
      age: 26 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr),
      years: 1 + Math.floor(rng() * 2), out: 0, pot: ovr,
    });
  }
  return out;
}

/** The roster's cap hits plus this season's dead money (Round 631). */
export function nhlCapUsed(t: NhlGmTeam): number {
  return payrollWithDeadCap(t.players, t);
}
export function nhlCapRoom(t: NhlGmTeam, cap: number): number {
  return Math.round((cap - nhlCapUsed(t)) * 10) / 10;
}

function contributorsShape(value: unknown): value is NhlContributors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || !['forwards', 'defense', 'goalie'].every(key => Object.prototype.hasOwnProperty.call(record, key))) return false;
  return Array.isArray(record.forwards) && record.forwards.every(id => typeof id === 'string')
    && Array.isArray(record.defense) && record.defense.every(id => typeof id === 'string')
    && (record.goalie === null || typeof record.goalie === 'string');
}

function sameContributors(a: NhlContributors, b: NhlContributors): boolean {
  return a.goalie === b.goalie && a.forwards.length === b.forwards.length && a.defense.length === b.defense.length
    && a.forwards.every(id => b.forwards.includes(id)) && b.forwards.every(id => a.forwards.includes(id))
    && a.defense.every(id => b.defense.includes(id)) && b.defense.every(id => a.defense.includes(id));
}

/** Keep valid preferences, then fill unavailable slots by the original rating order. */
export function nhlContributors(t: NhlGmTeam): NhlContributors {
  const healthy = t.players.filter(p => p.out === 0);
  const preference = contributorsShape(t.contributors) ? t.contributors : null;
  const select = (ids: string[], players: NhlGmPlayer[], count: number): string[] => {
    const selected: string[] = [];
    const available = Math.min(count, players.length);
    for (const id of ids) {
      if (selected.length >= available) break;
      if (!selected.includes(id) && players.some(p => p.id === id)) selected.push(id);
    }
    for (const p of [...players].sort((a, b) => b.ovr - a.ovr)) {
      if (selected.length >= available) break;
      if (!selected.includes(p.id)) selected.push(p.id);
    }
    return selected;
  };
  return {
    forwards: select(preference?.forwards ?? [], healthy.filter(p => p.pos === 'C' || p.pos === 'W'), 6),
    defense: select(preference?.defense ?? [], healthy.filter(p => p.pos === 'D'), 4),
    goalie: select(preference?.goalie ? [preference.goalie] : [], healthy.filter(p => p.pos === 'G'), 1)[0] ?? null,
  };
}

/** Invalid or unchanged choices leave this team and its saved state untouched. */
export function nhlSetContributors(t: NhlGmTeam, value: unknown): boolean {
  if (!contributorsShape(value)) return false;
  const healthy = t.players.filter(p => p.out === 0);
  const ids = [...value.forwards, ...value.defense, ...(value.goalie === null ? [] : [value.goalie])];
  if (new Set(ids).size !== ids.length) return false;
  if (value.forwards.length !== Math.min(6, healthy.filter(p => p.pos === 'C' || p.pos === 'W').length)
    || value.defense.length !== Math.min(4, healthy.filter(p => p.pos === 'D').length)
    || (value.goalie === null ? 0 : 1) !== Math.min(1, healthy.filter(p => p.pos === 'G').length)) return false;
  if (!value.forwards.every(id => healthy.some(p => p.id === id && (p.pos === 'C' || p.pos === 'W')))
    || !value.defense.every(id => healthy.some(p => p.id === id && p.pos === 'D'))
    || (value.goalie !== null && !healthy.some(p => p.id === value.goalie && p.pos === 'G'))) return false;
  if (sameContributors(value, nhlContributors(t))) return false;
  t.contributors = { forwards: [...value.forwards], defense: [...value.defense], goalie: value.goalie };
  return true;
}

export function nhlResetContributors(t: NhlGmTeam): boolean {
  if (!Object.prototype.hasOwnProperty.call(t, 'contributors')) return false;
  delete t.contributors;
  return true;
}

/** Legacy and automatic teams never acquire an override through repair. */
export function repairNhlContributors(t: NhlGmTeam): boolean {
  if (!Object.prototype.hasOwnProperty.call(t, 'contributors')) return false;
  if (!contributorsShape(t.contributors)) return nhlResetContributors(t);
  const effective = nhlContributors(t);
  if (sameContributors(t.contributors, effective)) return false;
  t.contributors = effective;
  return true;
}

/** Strength: top six forwards 50%, top four D 30%, best goalie 20%. */
export function nhlStrength(t: NhlGmTeam): number {
  const healthy = t.players.filter(p => p.out === 0);
  const selection = t.contributors === undefined ? null : nhlContributors(t);
  const fwd = selection ? selection.forwards.map(id => healthy.find(p => p.id === id)!) : healthy.filter(p => p.pos === 'C' || p.pos === 'W').sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  const d = selection ? selection.defense.map(id => healthy.find(p => p.id === id)!) : healthy.filter(p => p.pos === 'D').sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const g = selection ? selection.goalie === null ? [] : [healthy.find(p => p.id === selection.goalie)!] : healthy.filter(p => p.pos === 'G').sort((a, b) => b.ovr - a.ovr).slice(0, 1);
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
    repairNhlContributors(t);
  }
  const loseGame = (loser: NhlGmTeam, isMe: boolean) => {
    if (rng() < 0.25) { loser.otLosses += 1; if (isMe) myOtl += 1; }
    else { loser.losses += 1; if (isMe) myL += 1; }
  };
  /* Round 851: the round's booked games (foSchedule.ts); a league saved mid
     season before the round finishes that season the old way. */
  foPlayRound(league, abbrs, NHL_GAMES_PER_ROUND, rng, (abbr, opp) => {
    const me = league.teams[abbr];
    const them = league.teams[opp];
    const p = nhlWinProb(me, them);
    if (rng() < p) {
      me.wins += 1; if (abbr === myTeam) myW += 1;
      loseGame(them, opp === myTeam);
    } else {
      them.wins += 1; if (opp === myTeam) myW += 1;
      loseGame(me, abbr === myTeam);
    }
  }, () => nhlBookSeason(league, rng));
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
/* Round 631: waiving a man is not free. Half his cap hit stays on this
   season's cap as dead money, a quarter on next season's if he had years
   left, and this club cannot sign him back until the offseason. The rule
   lives in src/lib/frontOfficeCuts.ts, once, for all four GM sims; measured
   before it, Leo Carlsson at 9.6M with four years left took the space from
   19.6 to 29.2 and straight back to 19.6 on a one year deal. */
/** Round 631: the roster floor and ceiling. The board greys Waive and Sign at them. */
export const NHL_ROSTER_MIN = 8;
export const NHL_ROSTER_MAX = 15;

export function nhlRelease(t: NhlGmTeam, fas: NhlGmPlayer[], id: string, version?: string): boolean {
  const released = cutPlayer(t, fas, id, NHL_ROSTER_MIN);
  if (released) {
    repairNhlContributors(t);
    if (version === NHL_RATING_MODEL_VERSION) {
      const p = fas.find(p => p.id === id)!;
      p.salary = nhlSalaryFor(p.ovr, version);
    }
  }
  return released;
}

export function nhlSign(t: NhlGmTeam, fas: NhlGmPlayer[], id: string, cap: number, version?: string): boolean {
  const i = fas.findIndex(p => p.id === id);
  if (i < 0 || rosterFullRefusal(t, NHL_ROSTER_MAX)) return false;
  /* Round 631: the same refusal the board shows beside the greyed button. */
  if (signRefusal(t, id)) return false;
  const p = fas[i];
  const ask = version === NHL_RATING_MODEL_VERSION ? nhlSalaryFor(p.ovr, version) : p.salary;
  if (nhlCapRoom(t, cap) < ask) return false;
  fas.splice(i, 1);
  if (version === NHL_RATING_MODEL_VERSION) p.salary = ask;
  t.players.push(p);
  repairNhlContributors(t);
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
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
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
  repairNhlContributors(my); repairNhlContributors(their);
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
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirId) || tradeRefusal(their, myId)) return 'invalid';
  if (addPick && !my.picks.length) return 'invalid';
  const fitsMe = nhlCapRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = nhlCapRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myId);
  their.players = their.players.filter(p => p.id !== theirId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) { their.picks.push(my.picks.pop()!); }
  repairNhlContributors(my); repairNhlContributors(their);
  return 'done';
}

export interface NhlProspect { id: string; name: string; pos: NhlPos; age: number; grade: number; trueOvr: number }

export function nhlDraftClass(rng: () => number, size = 24, taken: Set<string> = new Set()): NhlProspect[] {
  const POS: NhlPos[] = ['C', 'W', 'W', 'D', 'D', 'G'];
  const out: NhlProspect[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 69 + Math.floor(rng() * 18);
    out.push({
      id: fid(), name: nhlGenName(rng, taken), pos: POS[Math.floor(rng() * POS.length)],
      age: 18 + Math.floor(rng() * 3),
      grade: Math.max(65, Math.min(93, trueOvr + Math.floor(rng() * 9) - 4)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function nhlProspectToPlayer(pr: NhlProspect, rng: () => number, version?: string): NhlGmPlayer {
  return {
    id: fid(), name: pr.name, pos: pr.pos, age: pr.age, ovr: pr.trueOvr,
    salary: version === NHL_RATING_MODEL_VERSION ? nhlSalaryFor(pr.trueOvr, version) : Math.max(0.8, Math.round((pr.trueOvr - 66) * 0.15 * 10) / 10),
    years: 3, out: 0,
    pot: Math.min(99, pr.trueOvr + 4 + Math.floor(rng() * 9)),
  };
}

/** Current simulation rights have round tokens, without a future-year ledger. */
export function nhlDraftCapital(team: Pick<NhlGmTeam, 'picks'>): number | null {
  return Array.isArray(team.picks) && team.picks.length <= (EASTERN.length + WESTERN.length) * 2
    && Array.from(team.picks).every(pick => pick === 1 || pick === 2) ? team.picks.length : null;
}

export function nhlConsumeDraftPick(team: Pick<NhlGmTeam, 'picks'>): boolean {
  const count = nhlDraftCapital(team);
  if (count == null || count === 0) return false;
  team.picks.shift();
  return true;
}

/** Existing scouting order with a known-version next-cap commitment check. */
export function nhlAiDraftPicks(league: NhlLeague, remaining: NhlProspect[], order: string[], rng: () => number) {
  const guarded = league.ratingModelVersion === NHL_RATING_MODEL_VERSION && league.draftAffordabilityVersion === NHL_DRAFT_AFFORDABILITY_VERSION;
  const eligible = [...new Set(order)].filter(abbr => league.teams[abbr] && (nhlDraftCapital(league.teams[abbr]) ?? 0) > 0).slice(0, 5);
  if (!guarded) {
    const aiTakes = remaining.slice(0, eligible.length);
    const picks = aiTakes.map((prospect, i) => {
      const team = league.teams[eligible[i]], player = nhlProspectToPlayer(prospect, rng, league.ratingModelVersion);
      nhlConsumeDraftPick(team);
      team.players.push(player);
      return { team: team.abbr, prospect, player };
    });
    return { remaining: remaining.filter(p => !aiTakes.includes(p)), picks, skipped: 0, substituted: 0, guarded };
  }
  const available = [...remaining], picks: { team: string; prospect: NhlProspect; player: NhlGmPlayer }[] = [];
  const nextCap = Math.round(league.cap * 1.09);
  let skipped = 0, substituted = 0;
  for (const abbr of eligible) {
    if (available.length === 0) break;
    const team = league.teams[abbr];
    const index = available.findIndex(p => nhlSalaryFor(p.trueOvr, league.ratingModelVersion) <= nhlCapRoom(team, nextCap));
    if (index < 0) { skipped++; continue; }
    const prospect = available[index], player = nhlProspectToPlayer(prospect, rng, league.ratingModelVersion);
    if (index > 0) substituted++;
    nhlConsumeDraftPick(team);
    team.players.push(player); available.splice(index, 1); picks.push({ team: team.abbr, prospect, player });
  }
  return { remaining: available, picks, skipped, substituted, guarded };
}

export function nhlOffseason(league: NhlLeague, rng: () => number, userTeam?: string): string[] {
  const notes: string[] = [];
  /* Round 211: one name book for the whole offseason. */
  const taken = leagueNames(league);
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
        p.salary = nhlSalaryFor(p.ovr, league.ratingModelVersion);
        if (p.ovr < 80 && rng() < 0.45) { league.freeAgents.push({ ...p, years: 1 }); continue; }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0; t.losses = 0; t.otLosses = 0; t.picks = [1, 2];
    rollDeadCap(t);
    replenishNhlRoster(t, rng, taken, league.ratingModelVersion);
    repairNhlContributors(t);
  }
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (const fa of league.freeAgents) { fa.age += 1; if (fa.age >= 32) fa.ovr = Math.max(63, fa.ovr - 1); if (league.ratingModelVersion === NHL_RATING_MODEL_VERSION) fa.salary = nhlSalaryFor(fa.ovr, league.ratingModelVersion); }
  if (typeof userTeam === 'string' && Object.prototype.hasOwnProperty.call(league.teams, userTeam)) {
    let released = false;
    for (const t of Object.values(league.teams)) {
      if (t.abbr === userTeam) continue;
      while (t.players.length > NHL_ROSTER_MAX) {
        const selected = nhlContributors(t);
        const protectedIds = new Set([...selected.forwards, ...selected.defense, ...(selected.goalie === null ? [] : [selected.goalie])]);
        const down = t.players.filter(p => !protectedIds.has(p.id))
          .sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];
        if (!down || !nhlRelease(t, league.freeAgents, down.id, league.ratingModelVersion)) break;
        released = true;
      }
    }
    if (released) league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  }
  league.cap = Math.round(league.cap * 1.09);
  league.season += 1;
  league.round = 1;
  /* Round 851: the new season's fixtures, for an old save too. */
  league.schedule = nhlBookSeason(league, rng);
  return notes;
}

/** Keep every club playable: at least 5 forwards, 3 D, 1 goalie, 10 players. */
export function replenishNhlRoster(t: NhlGmTeam, rng: () => number, taken: Set<string> = new Set(), version?: string): void {
  const add = (pos: NhlPos) => {
    const ovr = 69 + Math.floor(rng() * 7);
    t.players.push({
      id: fid(), name: nhlGenName(rng, taken), pos,
      age: 23 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr, version),
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
    const ask = best ? league.ratingModelVersion === NHL_RATING_MODEL_VERSION ? nhlSalaryFor(best.ovr, league.ratingModelVersion) : best.salary : 0;
    if (best && nhlCapRoom(t, league.cap) >= ask && t.players.length < 15) {
      nhlSign(t, league.freeAgents, best.id, league.cap, league.ratingModelVersion);
    }
  }
}
