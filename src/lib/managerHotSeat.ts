/**
 * Round 719: Manager Hot Seat, the short leash (master spec section 143).
 *
 * The spec's whole idea is three meters, board, fans and the dressing room,
 * and one poor run ending the job. This is that idea as a separate short game,
 * and it is NOT a second engine. The club, its squad, its league, its
 * fixtures, every match, the board's confidence, the fan mood, the talks and
 * the press room all come from src/lib/clubManager.ts and
 * src/lib/clubManagerMeters.ts unchanged, imported and driven the way the
 * Club Manager page drives them. What is new here is only the frame:
 *
 *   1. THE TAKEOVER. A real club from REAL_LEAGUES starts an ordinary engine
 *      season and the engine plays its first league weeks on its own, the
 *      previous (unnamed) manager's weeks. The job opens after whichever of
 *      league weeks 6 to 14 left the club on its worst run of form, so the
 *      crisis is one the simulated season really produced, not a line of copy.
 *   2. THE LEASH. The board drops to 30 out of 100 and names a points target
 *      for the next five league games, read off those five fixtures (home or
 *      away, and how strong each opponent is against your XI). Cup and
 *      European games in between still get played and still move the meters,
 *      but only league points count toward the target.
 *   3. THE VERDICT. Hit the target and you keep the job. Miss it by a single
 *      point with the fans singing and they buy you the job anyway. Anything
 *      else is the sack, and if the board meter reaches zero first (the
 *      engine's own sacking line) you are gone on the spot.
 *
 * DETERMINISM. The engine draws from Math.random. Every engine call made here
 * runs inside withSeed, which swaps in a seeded stream for the length of that
 * one synchronous call and puts the real one back after. So every OUTCOME of a
 * run (the club, the takeover week, the table, the target, each score, each
 * meter, the verdict) is a function of its seed and the choices made, which
 * is what lets the daily be the same club, the same week and the same target
 * for everyone, and lets an unfinished run be rebuilt after a refresh from
 * nothing but the seed and the list of choices. Each match draws from the
 * stream for its own match number rather than for the choice, so two players
 * who make different calls on the same day face the same dice and the
 * difference is the calls. What is NOT replayed byte for byte: the engine
 * stamps a few of its own ids (youth intake, scout reports, press questions)
 * with Date.now(), so a replay carries different id strings from the original
 * run. Nothing here reads an id (the press is answered by option index), so
 * the outcomes match and the ids do not, and scripts/simManagerHotSeat.mjs
 * section 3 holds the outcome half of that.
 *
 * THE SHARED ENGINE'S SESSION STATE. clubManager.ts keeps two module level
 * registrations, the active save's custom club and its league memberships,
 * and a Club Manager save open in the same tab owns them. Every engine call
 * made here runs through onStaticWorld, which registers the static world for
 * the length of the call and puts back whatever the tab had, so a hot seat
 * run never takes a Club Manager save's registration away and never plays
 * inside its pyramid. Section 4 of the same harness holds that.
 *
 * Nothing here invents a fact about a real club or person. The previous
 * manager has no name, the manager is you, the opposition dugouts are the
 * engine's generated names, and every number on screen is the engine's.
 */
import {
  REAL_LEAGUES,
  answerPress,
  clubDefFor,
  cupProgressRank,
  engineRegistrations,
  fixtureFor,
  isPartialClub,
  leaguePosition,
  matchEdge,
  nextFixture,
  objectiveStatuses,
  playNextEntry,
  playableClubs,
  registerCustomClub,
  registerLeagueOverrides,
  resolveXI,
  restoreEngineRegistrations,
  saveCareer,
  startCareer,
  uclProgressRank,
  type CareerState,
  type Competition,
  type FormResult,
  type Mentality,
  type PressQuestion,
  type TalkTone,
} from '@/lib/clubManager';
import { FAN_SINGING, boardMeter, fanMeter, type Meter, type MeterTone } from '@/lib/clubManagerMeters';
import type { SeasonHandover } from '@/lib/clubManagerScore';
import { dailyIndex, dailyPrngSeed } from '@/lib/dateUtils';
import DAILY_CLUB_POOL from '@/data/dailyClubPool.json';

/* ---------------- the numbers ---------------- */

/** League games on the leash. */
export const HOT_SEAT_LEASH = 5;
/** Where the board's confidence sits the day you walk in. */
export const HOT_SEAT_BOARD_START = 30;
/** The league weeks the job can open after (the worst run in this window). */
export const HOT_SEAT_TAKEOVER_MIN = 6;
export const HOT_SEAT_TAKEOVER_MAX = 14;
/** While the engine plays the weeks before you, the old manager is kept in a
 *  job: a sacking there would end the season before you arrive. */
const PREVIOUS_MANAGER_FLOOR = 20;
/** Miss the target by this many points with the fans singing and they save you. */
export const HOT_SEAT_REPRIEVE_GAP = 1;
/** The fan meter reading that counts as singing, the meters module's own line. */
export const HOT_SEAT_REPRIEVE_FANS = FAN_SINGING;

/**
 * The board's target, per league fixture, from the engine's match edge.
 * An ordinary Saturday sits at an edge of 7 in this engine (the EDGE_LEVEL
 * the team talk reads, measured over 1,572 fixtures), so the board asks
 * TARGET_BASE points for an ordinary game and TARGET_PER_POINT more or less
 * per point of edge above or below that, inside the clamp. The numbers are a
 * design call (an ordinary game asks for a shade over a point and a half,
 * so five of them ask for eight, a clean sweep always clears the clamp) and
 * scripts/simManagerHotSeat.mjs is what holds them to their job: it measures
 * that the target rises with the club's own strength, that a manager who
 * reads the room keeps the job more often than one who talks past it, and
 * that neither arm always survives or never does. Change a number here and
 * that harness is the check, with its bands and their headroom in its header.
 */
export const TARGET_EDGE_LEVEL = 7;
export const TARGET_BASE = 1.6;
export const TARGET_PER_POINT = 0.07;
export const TARGET_MIN = 0.4;
export const TARGET_MAX = 2.6;

/* ---------------- seeded engine calls ---------------- */

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two numbers folded into one seed, so step n of seed s has its own stream. */
export function mixSeed(a: number, b: number): number {
  let h = (a ^ Math.imul((b + 0x9e3779b9) | 0, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Runs one synchronous engine call on a seeded Math.random and restores the
 * real one after, whatever happens. JavaScript runs this to the end before
 * anything else on the page gets a turn, so nothing else ever sees the swap.
 */
export function withSeed<T>(seed: number, fn: () => T): T {
  const saved = Math.random;
  Math.random = mulberry32(seed >>> 0);
  try {
    return fn();
  } finally {
    Math.random = saved;
  }
}

/**
 * Runs one synchronous stretch of engine calls on the static world (no
 * custom club, the real league memberships) and puts back whatever the tab
 * had registered, whatever happens. A tab with nothing registered, which is
 * every tab without a Club Manager save open, pays nothing: the swap is
 * skipped rather than busting the engine's def cache twice per call.
 */
export function onStaticWorld<T>(fn: () => T): T {
  const had = engineRegistrations();
  const swap = had.custom !== null || had.overrides !== null;
  if (!swap) return fn();
  registerCustomClub(null);
  registerLeagueOverrides(null);
  try {
    return fn();
  } finally {
    restoreEngineRegistrations(had);
  }
}

/* ---------------- the clubs ---------------- */

export interface HotSeatClub { club: string; leagueId: string; leagueName: string }

let poolCache: HotSeatClub[] | null = null;

/**
 * Round 1044: one line of src/data/dailyClubPool.json, the dailies' club
 * ledger. A join line puts a club in the pool from an Eastern day on; a leave
 * line (no leagueName, no from) closes that club's latest open join line in
 * the same league from its `until` day on. The file is append only and only
 * scripts/genDailyClubPool.mjs writes it.
 */
export type DailyPoolLine =
  | { club: string; leagueId: string; leagueName: string; from: string }
  | { club: string; leagueId: string; until: string };

export interface DailyPoolEntry extends HotSeatClub {
  from: string;
  /** The first Eastern day the club is out, or null while nothing closed it. */
  until: string | null;
}

/** Every join line of the ledger, in file order, with the day a later leave line closed it. */
export function dailyPoolEntries(lines: readonly DailyPoolLine[]): DailyPoolEntry[] {
  const out: DailyPoolEntry[] = [];
  for (const l of lines) {
    if ('from' in l) {
      out.push({ club: l.club, leagueId: l.leagueId, leagueName: l.leagueName, from: l.from, until: null });
      continue;
    }
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].club === l.club && out[i].leagueId === l.leagueId && out[i].until === null) {
        out[i].until = l.until;
        break;
      }
    }
  }
  return out;
}

/** The dailies' pool on an Eastern day: the join lines live that day, in file order. */
export function dailyPoolOn(lines: readonly DailyPoolLine[], date: string): HotSeatClub[] {
  return dailyPoolEntries(lines)
    .filter(e => e.from <= date && (e.until === null || date < e.until))
    .map(({ club, leagueId, leagueName }) => ({ club, leagueId, leagueName }));
}

const LEDGER = DAILY_CLUB_POOL.lines as DailyPoolLine[];
/* The ledger's first day. A date before it (a device clock reset to 1970 or
   2000) reads the founding pool instead of an empty one, which would leave
   both dailies nothing to pick and throw on the pick. */
const LEDGER_FIRST = LEDGER.reduce((a, l) => ('from' in l && l.from < a ? l.from : a), '9999-12-31');
let ledgerCache: { date: string; pool: HotSeatClub[] } | null = null;

/**
 * With a date: the clubs the dailies deal from on that Eastern day, read from
 * the committed ledger, src/data/dailyClubPool.json, never from the engine.
 * Until Round 1044 the dailies dealt from the live list below, so any change
 * to the leagues or to the partial list changed its length and re-dealt every
 * day, today and the archive included. The ledger only ever gains lines, each
 * dated after the day it ships, so a day once dealt stays dealt.
 *
 * Without a date: every real club the engine can run with full data, the
 * REAL_LEAGUES clubs it has a def for less the ones its roster bake marks as
 * partial (CM_PARTIAL), in league order then the engine's own stature order.
 * That is free play's list, and what scripts/genDailyClubPool.mjs compares
 * the ledger against.
 */
export function hotSeatPool(date?: string): HotSeatClub[] {
  if (date !== undefined) {
    if (ledgerCache?.date !== date) ledgerCache = { date, pool: dailyPoolOn(LEDGER, date < LEDGER_FIRST ? LEDGER_FIRST : date) };
    return ledgerCache.pool;
  }
  if (poolCache) return poolCache;
  /* On the static world, or a Club Manager save's promoted club would join
     the daily's pool in that one tab and shift everybody else's pick. */
  const out = onStaticWorld(() => {
    const list: HotSeatClub[] = [];
    for (const league of REAL_LEAGUES) {
      for (const c of playableClubs(league.id)) {
        if (isPartialClub(c.name)) continue;
        list.push({ club: c.name, leagueId: league.id, leagueName: league.name });
      }
    }
    return list;
  });
  poolCache = out;
  return out;
}

export function hotSeatLeagues(): { id: string; name: string }[] {
  const ids = new Set(hotSeatPool().map(c => c.leagueId));
  return REAL_LEAGUES.filter(l => ids.has(l.id)).map(l => ({ id: l.id, name: l.name }));
}

/** Today's hot seat: one club and one seed for everybody, keyed on the Eastern day. */
export function dailyHotSeat(date: string): HotSeatSetup & { leagueName: string } {
  const pool = hotSeatPool(date);
  const pick = pool[Math.max(0, Math.min(pool.length - 1, dailyIndex(date, pool.length)))];
  return { club: pick.club, leagueName: pick.leagueName, seed: mixSeed(dailyPrngSeed(date), 719), daily: date };
}

/* ---------------- the run ---------------- */

export interface HotSeatSetup {
  club: string;
  seed: number;
  /** The Eastern day this is the daily for, or absent in free play. */
  daily?: string;
}

export type HotSeatAction =
  | { t: 'match'; m: Mentality; talk: TalkTone | null }
  | { t: 'press'; i: number };

export interface HotSeatMatch {
  competition: Competition;
  compLabel: string;
  opponent: string;
  home: boolean | null;
  myGoals: number;
  oppGoals: number;
  res: FormResult;
  /** A league game, so it counts toward the target. */
  counts: boolean;
  /** What the penalty shootout decided, when one was needed. */
  pens: boolean;
  board: number;
  boardDelta: number;
  fans: number;
  morale: number;
  events: string[];
}

export interface TakeoverInfo {
  position: number;
  clubs: number;
  expectation: number;
  played: number;
  points: number;
  form: FormResult[];
  /** The league week the job opened after. */
  week: number;
  /** Round 956: the calendar entry the job opened on, so the handover can
   *  tell the previous manager's post from yours. */
  calendarWeek: number;
}

export type VerdictKind = 'survived' | 'reprieve' | 'sacked' | 'boardSacked';

export interface HotSeatVerdict {
  kind: VerdictKind;
  points: number;
  target: number;
  leaguePlayed: number;
  matches: number;
}

export interface HotSeatRun {
  setup: HotSeatSetup;
  state: CareerState;
  takeover: TakeoverInfo;
  target: number;
  leash: number;
  leaguePlayed: number;
  points: number;
  /** Engine calls made since the takeover. The seeds come from the match
   *  and action counts, not from this, so a press answer never shifts the
   *  dice of the matches after it. */
  step: number;
  log: HotSeatMatch[];
  actions: HotSeatAction[];
  verdict: HotSeatVerdict | null;
}

/** Points a result is worth in a league table. */
const PTS: Record<FormResult, number> = { W: 3, D: 1, L: 0 };

function formOf(s: CareerState): FormResult[] {
  return (Array.isArray(s.form) ? s.form : []).filter((r): r is FormResult => r === 'W' || r === 'D' || r === 'L').slice(-5);
}

function formPoints(form: FormResult[]): number {
  return form.reduce((a, r) => a + PTS[r], 0);
}

function myRow(s: CareerState) {
  return s.table.find(r => r.club === s.clubName);
}

function leagueRounds(s: CareerState): number {
  return s.calendar.filter(e => e.type === 'league').length;
}

/** League games my club has played this season, off its own table row. */
export function leagueGamesPlayed(s: CareerState): number {
  const r = myRow(s);
  return r ? (r.w ?? 0) + (r.d ?? 0) + (r.l ?? 0) : 0;
}

/**
 * The board's target for the next `leash` league games, read off those
 * fixtures: for each, the engine's edge for the game (your XI's match
 * strength as it stands, plus the venue, less the opponent's strength) turned
 * into the points an ordinary board would ask of it. Always at least one
 * point a game below a clean sweep, so a run of wins always clears it.
 */
export function boardTarget(s: CareerState, leash: number): number {
  const fx = nextFixture(s);
  /* Your side's strength as the engine will read it at kick off, recovered
     from the next match's edge, which is the one number the engine exports
     for exactly this. */
  const edgeNext = matchEdge(s);
  let mine: number | null = null;
  if (fx.kind === 'match' && edgeNext !== null) {
    const venue = fx.home === true ? 3 : fx.home === false ? -1.5 : 0;
    mine = edgeNext - venue + fx.oppStrength;
  }
  let total = 0;
  let counted = 0;
  for (let w = s.week; w < s.calendar.length && counted < leash; w++) {
    const entry = s.calendar[w];
    if (entry.type !== 'league') continue;
    const f = fixtureFor(s, entry);
    if (!f) continue;
    counted += 1;
    const opp = s.clubStrengths[f.opponent];
    if (mine === null || typeof opp !== 'number') { total += TARGET_BASE; continue; }
    const venue = f.home === true ? 3 : f.home === false ? -1.5 : 0;
    const rel = mine + venue - opp - TARGET_EDGE_LEVEL;
    total += Math.max(TARGET_MIN, Math.min(TARGET_MAX, TARGET_BASE + TARGET_PER_POINT * rel));
  }
  const games = Math.max(1, counted);
  return Math.max(1, Math.min(3 * games - 1, Math.round(total)));
}

/** Plays calendar entries that are not my matches (the transfer window) until a match is next. */
function skipToMatch(run: HotSeatRun): void {
  let guard = 0;
  while (guard++ < 10) {
    const fx = nextFixture(run.state);
    if (fx.kind !== 'window') return;
    const r = withSeed(mixSeed(run.setup.seed, 5000 + run.log.length * 16 + guard), () => playNextEntry(run.state, { skipHalftime: true, noCoach: true }));
    run.step += 1;
    run.state = r.state;
  }
}

/**
 * Round 956 review fix: what the previous manager had banked when the job
 * opened, in the shape Club Manager stamps on its own takeovers (its
 * handoverFrom in clubManagerCalendar.ts, which is private, so the same five
 * readings are taken here through the same exported engine calls). Club
 * Manager's season score subtracts it, so the weeks the engine played before
 * you arrived are not scored as yours. Section 5 of the harness holds it to
 * the takeover's own numbers and to Club Manager's own record check.
 */
function takeoverStamp(s: CareerState): SeasonHandover {
  const row = myRow(s);
  return {
    pts: row ? row.pts : 0,
    played: leagueGamesPlayed(s),
    cupRank: cupProgressRank(s).rank,
    euroRank: uclProgressRank(s).rank,
    objectivesDone: objectiveStatuses(s).filter(o => o.status === 'done').map(o => o.objective.id),
    wonLeague: s.trophies.some(t => t.season === s.season && t.name === 'League Title'),
  };
}

/** Which of Club Manager's three takeover points (28, 50 and 72 percent of
 *  the season) the job opened nearest, by league games played. With the
 *  stamp above in place Club Manager reads this only for its badge. */
function midSeasonEntryOf(s: CareerState): NonNullable<CareerState['midSeasonStart']> {
  const share = leagueGamesPlayed(s) / Math.max(1, leagueRounds(s));
  return share < 0.39 ? 'autumn' : share < 0.61 ? 'newYear' : 'runIn';
}

/**
 * Opens the job: the engine's season up to the worst run of form in league
 * weeks 6 to 14, the board dropped to 30 and the target named. Heavy (about
 * twenty engine calls), so the page runs it once per run and never in render.
 */
export function startHotSeat(setup: HotSeatSetup): HotSeatRun {
  return onStaticWorld(() => startOnStaticWorld(setup));
}

function startOnStaticWorld(setup: HotSeatSetup): HotSeatRun {
  /* startCareer itself registers the static world for a real club; the
     onStaticWorld wrapper is what hands a Club Manager save's registrations
     back once this returns. */
  let s = withSeed(mixSeed(setup.seed, 0), () => startCareer(setup.club));
  /* Release AT: a hot seat day never plays the real fixture list. Round 1184 binds the real 2026/27
     Premier League list to any new original Premier League career, and startCareer above is one. Left on,
     the weeks this function plays to find the crisis were another season: five of 120 daily dates dealt a
     different job (Nottingham Forest on 2026-10-27 went from 6th after 11 games to 12th after 6), and a
     free play run in flight was rebuilt against other opponents by replayHotSeat. The key comes off
     before the first week is played, so every date deals what it dealt before Round 1184, and the
     career handed to Club Manager (handoverState) says generated fixtures, which is how the day was
     played. scripts/simDailyDeals.mjs holds the deals and its bind control puts this line back out. */
  delete s.realLeagueFixtures;
  const rounds = leagueRounds(s);
  const lastWeek = Math.max(HOT_SEAT_TAKEOVER_MIN, Math.min(HOT_SEAT_TAKEOVER_MAX, rounds - HOT_SEAT_LEASH - 1));
  let best: { state: CareerState; formPts: number; week: number } | null = null;
  let call = 1;
  let guard = 0;
  while (guard++ < 60) {
    const played = leagueGamesPlayed(s);
    if (played >= lastWeek) break;
    const r = withSeed(mixSeed(setup.seed, call), () => playNextEntry(s, { skipHalftime: true, noCoach: true }));
    call += 1;
    s = r.state;
    if (r.kind === 'seasonOver') break;
    if (s.sacked || s.boardConfidence < PREVIOUS_MANAGER_FLOOR) {
      s = { ...s, sacked: false, boardConfidence: Math.max(PREVIOUS_MANAGER_FLOOR, s.boardConfidence) };
    }
    const now = leagueGamesPlayed(s);
    if (r.kind === 'match' && r.report?.competition === 'league' && now >= HOT_SEAT_TAKEOVER_MIN) {
      const fp = formPoints(formOf(s));
      /* The worst run wins; a tie goes to the later week, the deeper crisis. */
      if (!best || fp <= best.formPts) best = { state: s, formPts: fp, week: now };
    }
  }
  const chosen = best ?? { state: s, formPts: formPoints(formOf(s)), week: leagueGamesPlayed(s) };
  const taken: CareerState = {
    ...chosen.state,
    boardConfidence: HOT_SEAT_BOARD_START,
    sacked: false,
    teamTalk: null,
    /* Round 956 review fix: this is a takeover, so it wears Club Manager's
       takeover stamp (Round 633) from the day you walk in. Nothing in a match
       reads either field; Club Manager's season score and its "took over mid
       season" badge do, once the career is carried on there. */
    midSeasonStart: midSeasonEntryOf(chosen.state),
    handover: takeoverStamp(chosen.state),
  };
  const row = myRow(taken);
  const def = clubDefFor(taken.clubName);
  const run: HotSeatRun = {
    setup,
    state: taken,
    takeover: {
      position: leaguePosition(taken),
      clubs: taken.table.length,
      expectation: def.expectation,
      played: leagueGamesPlayed(taken),
      points: row ? row.pts : 0,
      form: formOf(taken),
      week: chosen.week,
      calendarWeek: taken.week,
    },
    target: 0,
    leash: HOT_SEAT_LEASH,
    leaguePlayed: 0,
    points: 0,
    step: 0,
    log: [],
    actions: [],
    verdict: null,
  };
  skipToMatch(run);
  run.target = boardTarget(run.state, run.leash);
  return run;
}

/** The average morale of the XI the engine will send out, 0 to 100. */
export function xiMorale(s: CareerState): number {
  const xi = resolveXI(s).filter((p): p is NonNullable<typeof p> => !!p);
  const men = xi.length ? xi : s.squad;
  if (!men.length) return 0;
  return men.reduce((a, p) => a + p.morale, 0) / men.length;
}

export interface HotSeatMeters { board: Meter; fans: Meter; morale: Meter }

export function moraleMeter(s: CareerState): Meter {
  const value = Math.max(0, Math.min(100, xiMorale(s)));
  const tone: MeterTone = value >= 70 ? 'good' : value >= 50 ? 'mid' : 'bad';
  const band = value >= 70 ? 'Up for it' : value >= 50 ? 'Flat' : 'Heads down';
  return { value, shown: Math.round(value), band, tone };
}

export function hotSeatMeters(s: CareerState): HotSeatMeters {
  return { board: boardMeter(s), fans: fanMeter(s), morale: moraleMeter(s) };
}

/** The question on your desk, if the press have one. */
export function pendingPress(run: HotSeatRun): PressQuestion | null {
  return run.verdict ? null : run.state.press?.pending ?? null;
}

function settle(run: HotSeatRun): void {
  if (run.verdict) return;
  const base = { points: run.points, target: run.target, leaguePlayed: run.leaguePlayed, matches: run.log.length };
  if (run.state.sacked || boardMeter(run.state).value <= 0) {
    run.verdict = { kind: 'boardSacked', ...base };
    return;
  }
  if (run.points >= run.target) {
    run.verdict = { kind: 'survived', ...base };
    return;
  }
  if (run.leaguePlayed < run.leash) {
    /* Out of reach before the leash runs out is still the sack, and waiting
       for the last game would only make you play out a decided job. */
    const left = run.leash - run.leaguePlayed;
    if (run.points + 3 * left < run.target - HOT_SEAT_REPRIEVE_GAP) run.verdict = { kind: 'sacked', ...base };
    return;
  }
  const fans = fanMeter(run.state).value;
  if (run.target - run.points <= HOT_SEAT_REPRIEVE_GAP && fans >= HOT_SEAT_REPRIEVE_FANS) {
    run.verdict = { kind: 'reprieve', ...base };
    return;
  }
  run.verdict = { kind: 'sacked', ...base };
}

function cloneRun(run: HotSeatRun): HotSeatRun {
  return { ...run, log: [...run.log], actions: [...run.actions], takeover: { ...run.takeover } };
}

/**
 * Plays your next match with the shape and the talk you picked, through the
 * engine's own playNextEntry, then walks past any window to the next match
 * and settles the verdict if the leash has run out. Never mutates the input.
 */
export function playHotSeatMatch(prev: HotSeatRun, mentality: Mentality, talk: TalkTone | null): HotSeatRun {
  if (prev.verdict) return prev;
  return onStaticWorld(() => playOnStaticWorld(prev, mentality, talk));
}

function playOnStaticWorld(prev: HotSeatRun, mentality: Mentality, talk: TalkTone | null): HotSeatRun {
  const run = cloneRun(prev);
  run.actions.push({ t: 'match', m: mentality, talk });
  skipToMatch(run);
  const before = run.state.boardConfidence;
  const ready: CareerState = { ...run.state, mentality, teamTalk: talk };
  /* The nth match of the job draws stream n, whatever was said in between. */
  const r = withSeed(mixSeed(run.setup.seed, 1000 + run.log.length), () => playNextEntry(ready, { skipHalftime: true, noCoach: true }));
  run.step += 1;
  run.state = r.state;
  if (r.kind === 'match' && r.report) {
    const rep = r.report;
    const home = rep.home === run.state.clubName;
    const myGoals = home ? rep.homeGoals : rep.awayGoals;
    const oppGoals = home ? rep.awayGoals : rep.homeGoals;
    const res: FormResult = rep.won ? 'W' : rep.drawn ? 'D' : 'L';
    const counts = rep.competition === 'league';
    if (counts) {
      run.leaguePlayed += 1;
      run.points += PTS[res];
    }
    const m = hotSeatMeters(run.state);
    run.log.push({
      competition: rep.competition,
      compLabel: rep.compLabel,
      opponent: home ? rep.away : rep.home,
      home: rep.home === run.state.clubName ? true : rep.away === run.state.clubName ? false : null,
      myGoals,
      oppGoals,
      res,
      counts,
      pens: rep.decidedBy === 'pens',
      board: m.board.value,
      boardDelta: run.state.boardConfidence - before,
      fans: m.fans.value,
      morale: m.morale.value,
      events: Array.isArray(rep.events) ? rep.events.slice(0, 4) : [],
    });
  }
  if (r.kind === 'seasonOver') {
    /* A season that ran out under you ends the leash where it stands. */
    run.leash = run.leaguePlayed;
  }
  settle(run);
  if (!run.verdict) skipToMatch(run);
  return run;
}

/** Answers the question on your desk through the engine's answerPress. */
export function answerHotSeatPress(prev: HotSeatRun, optionIdx: number): HotSeatRun {
  const q = pendingPress(prev);
  if (!q || !q.options[optionIdx]) return prev;
  const run = cloneRun(prev);
  run.actions.push({ t: 'press', i: optionIdx });
  run.state = onStaticWorld(() => withSeed(mixSeed(run.setup.seed, 3000 + run.actions.length), () => answerPress(run.state, optionIdx)));
  run.step += 1;
  return run;
}

/**
 * A run rebuilt from its seed and its choices, which is how a refresh picks
 * up where it left off. A choice that no longer fits (an old save meeting a
 * changed engine) stops the replay there rather than inventing a different
 * one, so the run is always one the player really made.
 */
export function replayHotSeat(setup: HotSeatSetup, actions: HotSeatAction[]): HotSeatRun {
  let run = startHotSeat(setup);
  for (const a of actions) {
    if (run.verdict) break;
    if (a.t === 'match') run = playHotSeatMatch(run, a.m, a.talk);
    else {
      const next = answerHotSeatPress(run, a.i);
      if (next === run) break;
      run = next;
    }
  }
  return run;
}

/** What the next match is, for the pre match card. */
export function upcoming(run: HotSeatRun) {
  const fx = nextFixture(run.state);
  if (fx.kind !== 'match') return null;
  return { ...fx, counts: fx.competition === 'league' };
}

/** The honest one line brief on the club you are walking into, from the engine's numbers only. */
export function crisisLine(t: TakeoverInfo): string {
  const wins = t.form.filter(r => r === 'W').length;
  const losses = t.form.filter(r => r === 'L').length;
  const place = ordinal(t.position);
  const want = ordinal(Math.min(t.clubs, Math.max(1, Math.round(t.expectation))));
  const run = t.form.length
    ? `${wins === 0 ? 'No wins' : wins === 1 ? 'One win' : `${wins} wins`} and ${losses === 1 ? 'one defeat' : `${losses} defeats`} in the last ${t.form.length}.`
    : '';
  const table = t.position > Math.round(t.expectation)
    ? `${place} after ${t.played} league games, and the board expect ${want}.`
    : `${place} after ${t.played} league games, and the board want more than the last few weeks.`;
  return `${table} ${run}`.trim();
}

export function ordinal(n: number): string {
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suf}`;
}

export const VERDICT_WORDS: Record<VerdictKind, { title: string; line: string }> = {
  survived: { title: 'You keep the job', line: 'Target hit. The board stop looking at other managers, for now.' },
  reprieve: { title: 'The fans saved you', line: 'One point short, but the ground was singing and the board did not fancy the backlash.' },
  sacked: { title: 'Sacked', line: 'Target missed. Somebody else gets the keys on Monday.' },
  boardSacked: { title: 'Sacked on the spot', line: 'The board meter hit zero before the leash ran out.' },
};

/** The share line, numbers only. */
export function shareText(run: HotSeatRun): string {
  const v = run.verdict;
  const dots = run.log.filter(m => m.counts).map(m => (m.res === 'W' ? '🟩' : m.res === 'D' ? '🟨' : '🟥')).join('');
  const head = run.setup.daily ? `Manager Hot Seat ${run.setup.daily}` : 'Manager Hot Seat';
  const verdict = v ? VERDICT_WORDS[v.kind].title : 'In the dugout';
  return `${head}\n${run.state.clubName}: ${verdict}\n${run.points} of ${run.target} points ${dots}`;
}

/* ---------------- Round 956: carry on in Club Manager ---------------- */

/*
 * A hot seat run IS a Club Manager career: run.state was built by startCareer
 * and every match was played by playNextEntry. So a manager who keeps the job
 * can keep it for real. The state goes across exactly as it stands (the
 * table, the squad, the form, the calendar, the board's confidence) through
 * Club Manager's own saveCareer, and Club Manager opens it with its own
 * loadCareer like any other save. Nothing is rebuilt or topped up here, which
 * is the point: the season you saved is the season you carry on.
 *
 * Club Manager keeps one career per device under one key, so a save already
 * there is never replaced without the player saying so.
 * scripts/simManagerHotSeat.mjs section 5 holds all of it.
 */

/** Club Manager's save key. clubManager.ts does not export its own copy, so
 *  section 5 of the harness proves this one is the key saveCareer writes. */
const CLUB_MANAGER_SAVE_KEY = 'dukb-club-manager-save';

/** Only a manager still in the job can carry on in it. */
export function canCarryOn(run: HotSeatRun): boolean {
  const kind = run.verdict?.kind;
  return (kind === 'survived' || kind === 'reprieve') && !run.state.sacked;
}

export interface ExistingClubManagerSave {
  /** The club on the save, or null when the save cannot be read. */
  club: string | null;
  season: number | null;
}

/**
 * The Club Manager career already on this device, or null when there is none.
 * Read raw rather than through loadCareer, which registers the save's custom
 * club and league memberships as it opens it. Anything at the key counts as a
 * save, even one that cannot be read, so the answer errs toward asking.
 */
export function existingClubManagerSave(): ExistingClubManagerSave | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CLUB_MANAGER_SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { clubName?: unknown; season?: unknown } | null;
    return {
      club: p && typeof p.clubName === 'string' ? p.clubName : null,
      season: p && typeof p.season === 'number' && Number.isFinite(p.season) ? p.season : null,
    };
  } catch {
    return { club: null, season: null };
  }
}

/** The career Club Manager receives: the run's state as it stands, copied so
 *  nothing the page does to the run afterwards can reach the save. The one
 *  thing left behind is the previous manager's post: messages dated before
 *  the job opened were his, the way Club Manager's own takeovers clear them. */
export function handoverState(run: HotSeatRun): CareerState {
  const copy = JSON.parse(JSON.stringify(run.state)) as CareerState;
  const from = run.takeover.calendarWeek;
  if (Array.isArray(copy.inbox)) copy.inbox = copy.inbox.filter(m => !(typeof m.week === 'number' && m.week < from));
  return copy;
}

export interface CarryOnSummary {
  position: number;
  clubs: number;
  points: number;
  leaguePlayed: number;
  /** The board as the meter on the same screen prints it. */
  board: number;
  /** The meter's own words for that number and its tone. */
  boardBand: string;
  boardTone: MeterTone;
  /** True when a transfer window, not a match, is the next thing on the calendar. */
  windowFirst: boolean;
}

/** Where the career stands as it goes across, off the engine's own table, for the offer card. */
export function carryOnSummary(run: HotSeatRun): CarryOnSummary {
  const s = run.state;
  const board = boardMeter(s);
  return {
    position: onStaticWorld(() => leaguePosition(s)),
    clubs: s.table.length,
    points: myRow(s)?.pts ?? 0,
    leaguePlayed: leagueGamesPlayed(s),
    board: board.shown,
    boardBand: board.band,
    boardTone: board.tone,
    windowFirst: onStaticWorld(() => nextFixture(s)).kind === 'window',
  };
}

export type CarryOnResult = 'saved' | 'confirm' | 'refused' | 'failed';

/**
 * Hands the run to Club Manager. 'refused' when the manager was sacked,
 * 'confirm' when a Club Manager career is already saved and the player has
 * not said to replace it (nothing is written), 'failed' when the browser
 * refused the write, 'saved' when Club Manager will open this career next.
 */
export function carryOnInClubManager(run: HotSeatRun, opts: { replace: boolean }): CarryOnResult {
  if (!canCarryOn(run)) return 'refused';
  if (!opts.replace && existingClubManagerSave() !== null) return 'confirm';
  return saveCareer(handoverState(run)) ? 'saved' : 'failed';
}
