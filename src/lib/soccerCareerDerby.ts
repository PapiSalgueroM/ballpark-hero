/* Round 1012: club rivalries and derby days in Soccer Career.

   A player asked for team rivalries. The real pairs live in one table both
   soccer games read (src/data/clubRivalries.ts); this module is what is
   particular to Soccer Career, its season shape:

   - DETECTION (seasonDerbies): a derby is on in a season when a sourced pair
     names your club, the other club is in your league in the game's own world
     that year (adjustClubsForYear, so a club not founded yet never shows),
     and the league's meetings per season are verified for that year. No dice.
   - RESULT (resolveSeasonDerbies): each meeting is drawn from keyedRng, keyed
     off the season and the rival, so the game's main Math.random stream does
     not move by one call. The meeting model itself (playDerbyMeeting) takes
     only two strength numbers, home or away and a generator, so another
     sport's career can bind it later without Soccer Career's club data.
   - SWING (applySeasonDerbies): the only mutation. Popularity and morale move
     by a small, clamped amount per derby you played. The season rating is
     not touched.

   Derby goals are a subset of the season's goals, never extra. A Derby Hero
   (your goal won a derby) is derived from the seasons, never stored in the
   awards list, so the Hall of Fame ballot count and the corruption arc's
   "hand the trophy back" read exactly what they read before this round.

   Nothing here is real history: the game keeps every club in its league
   every year, so a derby can be played in a season the real rival was down a
   division. The copy says the derbies are played in your career's league.

   Imports: types only from the engine, so there is no runtime cycle. */
import { keyedRng } from "./keyedRng";
import { adjustClubsForYear } from "./careerEras";
import { eliteInYear } from "./soccerCareerLeague";
import { CLUB_RIVALRIES, SC_CLUB_CANON, type RivalryKind } from "../data/clubRivalries";
import type { CareerState, ClubData, SeasonRecord } from "./soccerCareerEngine";

/** One league meeting with the rival, from your club's side. */
export interface DerbyMeeting {
  home: boolean;
  /** Your club's goals. */
  gf: number;
  /** The rival's goals. */
  ga: number;
  /** You played in it. */
  played: boolean;
  /** Your goals in it, 0 when you did not play. */
  goals: number;
  /** Your goal was the one that put your club ahead for good. */
  won?: true;
}

export interface SeasonDerby {
  /** The rival under its Soccer Career name. */
  rival: string;
  name: string;
  kind: RivalryKind;
  meetings: DerbyMeeting[];
}

/* ─── Meetings per season, verified ───
   League meetings between two clubs of the same top flight, keyed by the
   season's START year (the game prints season Y as Y/Y+1), the same shape
   and the same rule as LEAGUE_SIZES in soccerCareerLeague.ts: a league or a
   year not listed claims nothing, so no derby is played there. Seasons after
   the latest one read keep the latest window.

   CADENCE_SOURCES_PENDING */
interface CadenceWindow { from: number; to?: number; meetings: number }
export const DERBY_CADENCE: Record<string, CadenceWindow[]> = {
};

/** League meetings per season between two clubs of that league in the
 *  season starting in `year`, or null when that is not verified. */
export function derbyMeetings(league: string, year: number): number | null {
  const windows = DERBY_CADENCE[league];
  if (!windows) return null;
  for (const w of windows) {
    if (year >= w.from && (w.to === undefined || year <= w.to)) return w.meetings;
  }
  return null;
}

/** The canonical name of a Soccer Career club (the spelling the shared table
 *  uses). Exact match only. */
export function canonClub(scName: string): string {
  return SC_CLUB_CANON[scName] ?? scName;
}

export interface DetectedDerby { rival: string; name: string; kind: RivalryKind }

/** DETECTION. The derbies your club plays in the season starting in `year`,
 *  rivals listed under their Soccer Career names, in table order. Pure. */
export function seasonDerbies(input: { club: string; league: string; year: number; clubs: ClubData[] }): DetectedDerby[] {
  const { club, league, year, clubs } = input;
  if (derbyMeetings(league, year) === null) return [];
  const canon = canonClub(club);
  const world = adjustClubsForYear(clubs, year);
  const out: DetectedDerby[] = [];
  for (const row of CLUB_RIVALRIES) {
    if (row.a !== canon && row.b !== canon) continue;
    const other = row.a === canon ? row.b : row.a;
    const rival = world.find(c => c.name !== club && canonClub(c.name) === other && c.league === league);
    if (!rival) continue;
    out.push({ rival: rival.name, name: row.name, kind: row.kind });
  }
  return out;
}

/* ─── The meeting model ───
   A club's strength is 5 minus its tier that year, plus half a point when the
   era aware elite rule (eliteInYear) counts it elite. The win chance moves
   with the strength gap, home or away, and a title season; the draw share is
   fixed; a loss is what is left. P_MAX leaves every meeting a real chance of
   a loss. Bands for every constant are measured in simCareerDerbies. */
export const DERBY_BASE_WIN = 0.36;
export const DERBY_TIER_STEP = 0.10;
export const DERBY_HOME = 0.06;
export const DERBY_TITLE_NUDGE = 0.08;
export const DERBY_P_MIN = 0.08;
export const DERBY_P_MAX = 0.66;
export const DERBY_DRAW = 0.27;

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One meeting's scoreline from two strengths. Sport neutral: no club data. */
export function playDerbyMeeting(rng: () => number, myStr: number, theirStr: number, home: boolean, titleSeason: boolean): { gf: number; ga: number } {
  const pWin = clampN(
    DERBY_BASE_WIN + DERBY_TIER_STEP * (myStr - theirStr) + (home ? DERBY_HOME : -DERBY_HOME) + (titleSeason ? DERBY_TITLE_NUDGE : 0),
    DERBY_P_MIN, DERBY_P_MAX,
  );
  const r = rng();
  if (r < pWin || r >= pWin + DERBY_DRAW) {
    const top = 1 + Math.floor(rng() * 3);
    const low = Math.floor(rng() * top);
    return r < pWin ? { gf: top, ga: low } : { gf: low, ga: top };
  }
  const g = Math.floor(rng() * 3);
  return { gf: g, ga: g };
}

function clubStrength(clubs: ClubData[], name: string, year: number, elite: readonly string[]): number {
  const c = clubs.find(x => x.name === name);
  const tier = c ? c.tier : 4;
  return 5 - tier + (eliteInYear(elite, name, year) ? 0.5 : 0);
}

export interface DerbyResolveInput {
  club: string;
  league: string;
  year: number;
  /** The unadjusted club list; the year's tiers are applied here. */
  clubs: ClubData[];
  /** The engine's elite list, passed in so this module never reads the engine. */
  elite: readonly string[];
  position: string;
  apps: number;
  leagueApps: number;
  goals: number;
  leagueTitle: boolean;
  seedKey: string;
}

/** RESULT. Every derby of the season, drawn only from keyedRng(seedKey + '|'
 *  + rival), so the main Math.random stream never moves. */
export function resolveSeasonDerbies(input: DerbyResolveInput): SeasonDerby[] {
  const found = seasonDerbies(input);
  const meetings = derbyMeetings(input.league, input.year);
  if (found.length === 0 || meetings === null) return [];
  const world = adjustClubsForYear(input.clubs, input.year);
  const myStr = clubStrength(world, input.club, input.year, input.elite);
  const isGK = input.position === "GK";
  const q = clampN(input.goals / Math.max(input.apps, 1) / 1.6, 0, 0.6);
  let goalsLeft = isGK ? 0 : Math.max(0, input.goals);
  const resolved: SeasonDerby[] = [];
  for (const d of found) {
    const rng = keyedRng(`${input.seedKey}|${d.rival}`);
    const theirStr = clubStrength(world, d.rival, input.year, input.elite);
    const homeFirst = rng() < 0.5;
    const list: DerbyMeeting[] = [];
    for (let i = 0; i < meetings; i += 1) {
      const home = (i % 2 === 0) === homeFirst;
      const played = rng() < input.leagueApps / 38;
      const { gf, ga } = playDerbyMeeting(rng, myStr, theirStr, home, input.leagueTitle);
      let goals = 0;
      let won = false;
      for (let k = 1; k <= gf; k += 1) {
        const mine = rng() < q;
        if (!played || !mine || goalsLeft <= 0) continue;
        goals += 1;
        goalsLeft -= 1;
        if (gf > ga && k === ga + 1) won = true;
      }
      const m: DerbyMeeting = { home, gf, ga, played, goals };
      if (won) m.won = true;
      list.push(m);
    }
    resolved.push({ rival: d.rival, name: d.name, kind: d.kind, meetings: list });
  }
  return resolved;
}

/* ─── Reading a saved season ───
   Seasons from before this round have no derbies, and a hand edited or
   damaged save can carry anything. Every reader goes through here, and any
   malformed entry gives an empty list rather than a half drawn line. */
const KINDS: readonly string[] = ["derby", "rivalry"];
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 100;

function readMeeting(m: unknown): DerbyMeeting | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (typeof o.home !== "boolean" || typeof o.played !== "boolean") return null;
  if (!isCount(o.gf) || !isCount(o.ga) || !isCount(o.goals)) return null;
  if (o.won !== undefined && o.won !== true) return null;
  const out: DerbyMeeting = { home: o.home, gf: o.gf, ga: o.ga, played: o.played, goals: o.goals };
  if (o.won === true) out.won = true;
  return out;
}

export function readSeasonDerbies(season: unknown): SeasonDerby[] {
  if (!season || typeof season !== "object") return [];
  const raw = (season as { derbies?: unknown }).derbies;
  if (!Array.isArray(raw)) return [];
  const read: SeasonDerby[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") return [];
    const o = d as Record<string, unknown>;
    if (typeof o.rival !== "string" || !o.rival || typeof o.name !== "string" || !o.name) return [];
    if (typeof o.kind !== "string" || !KINDS.includes(o.kind) || !Array.isArray(o.meetings) || o.meetings.length === 0) return [];
    const meetings: DerbyMeeting[] = [];
    for (const m of o.meetings) {
      const ok = readMeeting(m);
      if (!ok) return [];
      meetings.push(ok);
    }
    read.push({ rival: o.rival, name: o.name, kind: o.kind as RivalryKind, meetings });
  }
  return read;
}

/** Your derby record over the meetings you played. Derived, never stored. */
export interface DerbyRecord { played: number; w: number; d: number; l: number; goals: number; heroes: number }

export function derbyRecord(derbies: SeasonDerby[]): DerbyRecord {
  const r: DerbyRecord = { played: 0, w: 0, d: 0, l: 0, goals: 0, heroes: 0 };
  for (const x of derbies) {
    for (const m of x.meetings) {
      if (!m.played) continue;
      r.played += 1;
      if (m.gf > m.ga) r.w += 1; else if (m.gf < m.ga) r.l += 1; else r.d += 1;
      r.goals += m.goals;
      if (m.won) r.heroes += 1;
    }
  }
  return r;
}

/** A Derby Hero season: your goal won at least one derby. */
export function isDerbyHeroSeason(season: unknown): boolean {
  return derbyRecord(readSeasonDerbies(season)).heroes > 0;
}

/** Derby Hero seasons over a career, derived from the seasons. */
export function derbyHeroSeasons(seasons: readonly unknown[]): number {
  return seasons.filter(isDerbyHeroSeason).length;
}

/** The career's derby record, summed from the seasons. */
export function careerDerbyRecord(seasons: readonly unknown[]): DerbyRecord {
  const all: SeasonDerby[] = [];
  for (const s of seasons) all.push(...readSeasonDerbies(s));
  return derbyRecord(all);
}

/* ─── Words ─── narrated, never a quote from a real person. */

/** "the North London derby", but "El Clasico" and "Der Klassiker" as they are. */
export function theName(name: string): string {
  return /^(El|Der|Le|La|O|Il|Lo|Les) /.test(name) ? name : `the ${name}`;
}

function resultLetter(m: DerbyMeeting): string {
  return m.gf > m.ga ? "W" : m.gf < m.ga ? "L" : "D";
}

/** The season log line for one rival. */
export function derbyLogLine(d: SeasonDerby): string {
  const parts = d.meetings.map(m => `${resultLetter(m)} ${m.gf}-${m.ga} ${m.home ? "at home" : "away"}${m.played ? "" : " (you missed it)"}`);
  return `🔥 ${d.name} against ${d.rival}: ${parts.join(", ")}.`;
}

/** The season summary line for one rival. */
export function derbySummaryLine(d: SeasonDerby): string {
  const parts = d.meetings.map(m => `${resultLetter(m)} ${m.gf}-${m.ga} (${m.home ? "H" : "A"}${m.played ? "" : ", missed"})`);
  const played = d.meetings.filter(m => m.played);
  const goals = played.reduce((n, m) => n + m.goals, 0);
  const tail = played.length === 0
    ? (d.meetings.length === 1 ? "You missed it." : "You missed them.")
    : goals > 0 ? `You scored ${goals}.` : "No goal for you.";
  return `🔥 ${d.name} vs ${d.rival}: ${parts.join(", ")}. ${tail}`;
}

/* ─── The swing ───
   Per derby you played: a win is +2 popularity and +2 morale, a loss -2 and
   -2, a draw nothing; a Derby Hero season adds +2 popularity once. The
   season's derby total is clamped to the bands below before the usual 0 to
   100 clamp. For scale, the old "Derby Hero!" random event (now "Late
   Winner!") is +10 popularity. Popularity feeds sponsorship and event gates,
   morale feeds the life events, the money events and the paper's tone; the
   season rating is not touched. simCareerDerbies section 6 bands the effect. */
export const DERBY_WIN_POP = 2;
export const DERBY_WIN_MORALE = 2;
export const DERBY_LOSS_POP = -2;
export const DERBY_LOSS_MORALE = -2;
export const DERBY_HERO_POP = 2;
export const DERBY_POP_MIN = -4;
export const DERBY_POP_MAX = 6;
export const DERBY_MORALE_MIN = -4;
export const DERBY_MORALE_MAX = 4;

/** The ONLY mutation: the bounded swing and the season log lines. */
export function applySeasonDerbies(s: CareerState, season: SeasonRecord): void {
  const derbies = readSeasonDerbies(season);
  if (derbies.length === 0) return;
  let pop = 0;
  let mor = 0;
  for (const d of derbies) {
    for (const m of d.meetings) {
      if (!m.played) continue;
      if (m.gf > m.ga) { pop += DERBY_WIN_POP; mor += DERBY_WIN_MORALE; }
      else if (m.gf < m.ga) { pop += DERBY_LOSS_POP; mor += DERBY_LOSS_MORALE; }
    }
    s.events.push(derbyLogLine(d));
    if (d.meetings.some(m => m.won)) s.events.push(`🔥 Your goal won ${theName(d.name)}. Derby Hero.`);
  }
  if (derbyRecord(derbies).heroes > 0) pop += DERBY_HERO_POP;
  pop = clampN(pop, DERBY_POP_MIN, DERBY_POP_MAX);
  mor = clampN(mor, DERBY_MORALE_MIN, DERBY_MORALE_MAX);
  s.popularity = clampN(s.popularity + pop, 0, 100);
  s.morale = clampN(s.morale + mor, 0, 100);
}

/** The phone's fans: the latest season's first derby you played, as wins and
 *  losses against that rival, or undefined when there was none. */
export function latestDerbyFacts(seasons: readonly unknown[]): { won: number; lost: number; rival: string } | undefined {
  const last = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  for (const d of readSeasonDerbies(last)) {
    const r = derbyRecord([d]);
    if (r.played > 0) return { won: r.w, lost: r.l, rival: d.rival };
  }
  return undefined;
}
