/**
 * Round 1542: NFL Front Office season lines, the credit of every touchdown and
 * sack of a told game, and the season's awards. The NFL's binding of the
 * shared lines (src/lib/foSeasonStats.ts) and the shared close
 * (src/lib/foSeasonClose.ts), shaped on the NBA's (src/lib/nbaSeasonStats.ts).
 *
 * WHO SCORED. A told final (src/lib/frontOfficeGameDay.ts, nflTell) is split
 * into each side's scoring drives exactly as the Game Day tile splits it:
 * nflDrivePair on the story's own stream (src/lib/gameLaws/nflDrives.ts,
 * gmStoryKey). So the touchdowns credited here are the touchdowns the tile
 * shows. Every credit is then drawn from a stream keyed to the game,
 * `${key}|credit`, in a fixed order (home touchdowns, away touchdowns, home
 * sacks, away sacks): no draw from the engine's generator, no Math.random, no
 * clock. The same game credits the same men for ever.
 *   THE POOL is the men the engine counts as starters when the week was
 *   played, read with its own unitStarters: QB1, the five skill starters and
 *   the six defensive starters. Injured men are not starters. The line, the
 *   bench, the practice squad and the free agents never record anything.
 *   A TOUCHDOWN is a pass from QB1 or a run. The pass chance climbs with QB1's
 *   rating; the catcher is a skill starter drawn by slot (WR, TE, RB) times a
 *   usage that climbs with rating; a run is a back's or the quarterback's.
 *   A side with nobody to take a touchdown leaves it unclaimed: it counts for
 *   the club and on nobody's line.
 *   SACKS are tries against the other side's line, each landing more often the
 *   more the pass rush outrates the blockers, credited to a defender by slot
 *   and usage. Whole sacks only.
 *   FIELD GOALS AND SAFETIES are the club's: there is no kicker or punter on
 *   these rosters (src/lib/frontOffice.ts, DEPTH_GROUPS), so nobody is named.
 *
 * THE SAVE lives inside the league, the NBA's shape: `stats` (one season of
 * lines, the club line and his games' credits) and `awards` (the history). A
 * season's block opens at the press of its Week 1 and nowhere else, so a save
 * from before this round keeps no lines until its next Week 1. Lines are the
 * regular season's; a playoff game of his is credited for the tile alone.
 *
 * THE AWARDS, each a stated rule over the regular season's totals:
 *   MVP: touchdowns he threw, ran in or caught, plus half his sacks, plus 10
 *     times his club's winning share.
 *   Offensive Rookie of the Year: touchdowns he threw, ran in or caught, among
 *     first year men drafted in this save.
 *   Defensive Rookie of the Year: sacks, among first year men drafted in this
 *     save.
 * Ties go to more games, then the id. A rookie award needs at least one.
 * They are named in src/lib/nflSeasonAwards.ts, which rides in the career kit
 * with the season's verdict, so the page does not carry the close.
 *
 * Every number is this save's sim season, never a real statistic, and the
 * names are the save's rosters: nothing built on these lines quotes anybody.
 * Every number of the rules below is THIS SIM'S OWN.
 */
import type { GmPlayer, GmTeamState, LeagueState } from './frontOffice';
import { DEF_POS, DEF_SLOTS, OL_SLOTS, REPLACEMENT_OVR, SKILL_POS, SKILL_SLOTS, unitStarters } from './frontOffice';
import type { FoSeasonStats, FoStatLine } from './foSeasonStats';
import {
  type FoExpandedStats, type FoSavedStats, type FoStatsCodec,
  foClubGame, foExpand, foLineAdd, foLineGame, foOpenLine, foReadSaved,
} from './foStatsCodec';
import { FO_HISTORY_CAP } from './foSeasonClose';
import { keyedRng } from './keyedRng';
import { gmStoryKey, type ToldGame } from './gmGameScore';
import { nflDrivePair } from './gameLaws/nflDrives';

export const NFL_STAT_COLS = ['ptd', 'rtd', 'ctd', 'sk'] as const;
export type NflStatCol = typeof NFL_STAT_COLS[number];
/** Round 1566: the NFL's binding of the shared save shape (src/lib/foStatsCodec.ts): its four columns, no starts kept
 *  apart (the pool is the starters), and a club's touchdowns, field goals and safeties. */
export const NFL_CODEC: FoStatsCodec = { cols: NFL_STAT_COLS, gs: false, clubCols: ['td', 'fg', 'sf'] };

/** The pass chance of a touchdown: this at a quarterback rated NFL_PASS_PIVOT, plus NFL_PASS_SLOPE a point above it, kept inside NFL_PASS_RANGE. */
export const NFL_PASS_BASE = 0.55;
export const NFL_PASS_SLOPE = 0.01;
export const NFL_PASS_PIVOT = 75;
export const NFL_PASS_RANGE: readonly [number, number] = [0.35, 0.75];
/** Who catches a touchdown pass and who runs one in, by slot (times usage). */
export const NFL_CATCH_WEIGHT: Readonly<Record<string, number>> = { WR: 1, TE: 0.7, RB: 0.35 };
/* Round 1542, step 2's tuning: a receiver or a tight end runs one in now and then (an end around), so a club whose
   quarterback and backs are all hurt still has somebody to take a touchdown. The brief's first tuning (backs and the
   quarterback alone) left 3 to 11 touchdowns a seed set unclaimed on the fleet, where the brief holds it at zero. */
export const NFL_RUN_WEIGHT: Readonly<Record<string, number>> = { RB: 1, QB: 0.15, WR: 0.04, TE: 0.04 };
/** Usage: 1 at a rating of NFL_USAGE_PIVOT, NFL_USAGE_SLOPE a point either side, never under NFL_USAGE_FLOOR. */
export const NFL_USAGE_PIVOT = 72;
export const NFL_USAGE_SLOPE = 0.06;
export const NFL_USAGE_FLOOR = 0.4;
/** Sacks: NFL_SACK_TRIES tries a game, each landing at NFL_SACK_BASE plus NFL_SACK_SLOPE a point of rush over block, inside NFL_SACK_RANGE. */
export const NFL_SACK_TRIES = 8;
export const NFL_SACK_BASE = 0.28;
export const NFL_SACK_SLOPE = 0.01;
export const NFL_SACK_RANGE: readonly [number, number] = [0.1, 0.5];
/** A side with no lineman blocks at this (teamStrength's own floor); a side with no rusher rushes at REPLACEMENT_OVR. */
export const NFL_BLOCK_FLOOR = 64;
export const NFL_SACK_WEIGHT: Readonly<Record<string, number>> = { DL: 1, LB: 0.6, DB: 0.15 };
/** What the MVP score adds per unit of the club's winning share. */
export const NFL_MVP_WIN_WEIGHT = 10;

const clamp = (x: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, x));
export const nflUsage = (ovr: number): number => Math.max(NFL_USAGE_FLOOR, 1 + NFL_USAGE_SLOPE * (ovr - NFL_USAGE_PIVOT));
export const nflPassChance = (qbOvr: number): number => clamp(NFL_PASS_BASE + NFL_PASS_SLOPE * (qbOvr - NFL_PASS_PIVOT), NFL_PASS_RANGE);
export const nflSackChance = (rush: number, block: number): number => clamp(NFL_SACK_BASE + NFL_SACK_SLOPE * (rush - block), NFL_SACK_RANGE);

/* ------------------------------------------------------------------ the save */

/** One touchdown on the tile: [the passer's name or null for a run, the scorer's name]. Names, not ids, so a man cut or retired later still reads. */
export type NflCredit = [string | null, string];
/** A man's season for one club as the save keeps it: [name, position, games, thrown, run in, caught, sacks], and a 1
 *  at the end for a first year man drafted in this save. Games are games started (he was in the pool). */
export type NflSavedLine = [string, string, number, number, number, number, number] | [string, string, number, number, number, number, number, 1];
/** A club's regular season as the save keeps it: [games, wins, points for, points against, touchdowns, field goals, safeties]. */
export type NflSavedClub = [number, number, number, number, number, number, number];

/* THE BLOCK IS KEPT SMALL. A full roster league already opens near the NFL save budget (simNflFullRosters.mjs,
   700K; the man's opening rating evidence alone is about a third of it), and the NBA's old line shape (FoStatLine,
   named fields) cost about 68K a season there: the board's real save on the recap went from 660K to 728K. So the save
   keeps lines as short arrays, nested by club then man (about 28K a season). Since Round 1566 that is every sport's
   save shape (src/lib/foStatsCodec.ts, NFL_CODEC above), and nflFoStats is the shared expand. */
export interface NflSeasonStats extends FoSavedStats {
  /** By club, then by man id: his line for the games he played for that club. */
  lines: Record<string, Record<string, NflSavedLine>>;
  /** Every club's regular season. */
  clubs: Record<string, NflSavedClub>;
  /** His games only, regular and playoff, by the game's key: [the home side's credits, the away side's], in draw order. */
  plays: Record<string, [NflCredit[], NflCredit[]]>;
}

/** The block spelled out as the shared lines, the shared expand (foExpand) with the NFL's columns: one FoStatLine a
 *  man and club, keyed `${team}|${id}`, gs equal to g; the club totals; and each club's [touchdowns, field goals,
 *  safeties]. A fresh object: nothing written to it reaches the save. */
export function nflFoStats(s: NflSeasonStats): FoExpandedStats {
  return foExpand(NFL_CODEC, s);
}

export interface NflAwardPick { id: string; name: string; team: string; pos: string; g: number; ptd: number; rtd: number; ctd: number; sk: number }
export interface NflSeasonAwards {
  season: number;
  mvp: NflAwardPick | null;
  oroy: NflAwardPick | null;
  droy: NflAwardPick | null;
  /** A first year man drafted in this save was in the league that season (false in a save's first season). */
  rookies: boolean;
}
export type NflAwardKey = 'mvp' | 'oroy' | 'droy';
export const NFL_AWARD_KEYS: readonly NflAwardKey[] = ['mvp', 'oroy', 'droy'];

/** The award's name, as it is written on a man's card. */
export const NFL_AWARD_LABEL: Record<NflAwardKey, string> = {
  mvp: 'MVP',
  oroy: 'Offensive Rookie of the Year',
  droy: 'Defensive Rookie of the Year',
};
/** The stated rule, as the card and the page's "?" say it. */
export const NFL_AWARD_RULE: Record<NflAwardKey, string> = {
  mvp: `touchdowns he threw, ran in or caught, plus half his sacks, plus ${NFL_MVP_WIN_WEIGHT} times his club's winning share`,
  oroy: 'touchdowns he threw, ran in or caught, among first year men drafted in this save',
  droy: 'sacks, among first year men drafted in this save',
};

/* ------------------------------------------------------------------ the credit */

/** The men who can record anything in a game: QB1, the five skill starters, the six defensive starters. */
export interface NflPool { qb: GmPlayer | null; skill: GmPlayer[]; def: GmPlayer[] }
export function nflPool(team: GmTeamState): NflPool {
  const [qb] = unitStarters(team, ['QB'], 1);
  return { qb: qb ?? null, skill: unitStarters(team, SKILL_POS, SKILL_SLOTS), def: unitStarters(team, DEF_POS, DEF_SLOTS) };
}
export const nflPoolMen = (p: NflPool): GmPlayer[] => [...(p.qb ? [p.qb] : []), ...p.skill, ...p.def];

/** One man drawn by weight from `u` in [0, 1); null when nobody weighs anything. */
function drawBy(men: GmPlayer[], weight: (m: GmPlayer) => number, u: number): GmPlayer | null {
  const ws = men.map(m => Math.max(0, weight(m)));
  const sum = ws.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return null;
  let x = u * sum;
  let last: GmPlayer | null = null;
  for (let i = 0; i < men.length; i += 1) {
    if (ws[i] <= 0) continue;
    last = men[i];
    x -= ws[i];
    if (x < 0) return men[i];
  }
  return last;
}

export const nflCatchWeight = (m: GmPlayer): number => (NFL_CATCH_WEIGHT[m.pos] ?? 0) * nflUsage(m.ovr);
export const nflRunWeight = (m: GmPlayer): number => (NFL_RUN_WEIGHT[m.pos] ?? 0) * nflUsage(m.ovr);
export const nflSackWeight = (m: GmPlayer): number => (NFL_SACK_WEIGHT[m.pos] ?? 0) * nflUsage(m.ovr);

/** One man as a credit names him. */
export interface NflMan { id: string; name: string }
const man = (p: GmPlayer): NflMan => ({ id: p.id, name: p.name });

export interface NflSideCredit {
  team: string;
  pool: NflPool;
  /** The side's scoring drives, the tile's own split. */
  tds: number;
  fgs: number;
  safeties: number;
  /** One a touchdown credited, in draw order: a pass names its passer, a run has none. */
  credits: { passer: NflMan | null; scorer: NflMan }[];
  /** Touchdowns nobody in the pool could take. */
  unclaimed: number;
  /** Sacks by the man's id. */
  sacks: Record<string, number>;
  /** Sacks landed, whether or not a defender was there to take them. */
  sackTries: number;
}
export interface NflGameCredit { key: string; home: NflSideCredit; away: NflSideCredit }

/** The fields of a told game the credit reads. */
export type NflToldGame = Pick<ToldGame, 'key' | 'home' | 'away' | 'homeScore' | 'awayScore'>;

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const mean = (xs: number[], none: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : none);

/**
 * Who scored and who sacked in one told game. Pure: reads the rosters as they
 * stand (call it with the rosters the game was played with), writes nothing.
 * Null when a club is not in the league or the final has no drive list (the
 * law never tells one; nothing is recorded for it).
 */
export function nflCreditGame(told: NflToldGame, teams: Record<string, GmTeamState>): NflGameCredit | null {
  if (!told || typeof told.key !== 'string' || !has(teams, told.home) || !has(teams, told.away) || told.home === told.away) return null;
  const pair = nflDrivePair(told.homeScore, told.awayScore, keyedRng(gmStoryKey(told)));
  if (!pair) return null;
  const rng = keyedRng(`${told.key}|credit`);
  const sides = ([[told.home, pair[0]], [told.away, pair[1]]] as const).map(([team, d]): NflSideCredit => ({
    team, pool: nflPool(teams[team]), tds: d.tds.length, fgs: d.fgs, safeties: d.safeties,
    credits: [], unclaimed: 0, sacks: {}, sackTries: 0,
  }));
  /* the touchdowns, home side first: two draws each, whoever takes it */
  for (const s of sides) {
    const receivers = s.pool.skill.filter(m => nflCatchWeight(m) > 0);
    const runners = [...s.pool.skill, ...(s.pool.qb ? [s.pool.qb] : [])].filter(m => nflRunWeight(m) > 0);
    for (let i = 0; i < s.tds; i += 1) {
      const kind = rng();
      const who = rng();
      const catcher = s.pool.qb && kind < nflPassChance(s.pool.qb.ovr) ? drawBy(receivers, nflCatchWeight, who) : null;
      const runner = catcher ? null : drawBy(runners, nflRunWeight, who);
      if (catcher && s.pool.qb) s.credits.push({ passer: man(s.pool.qb), scorer: man(catcher) });
      else if (runner) s.credits.push({ passer: null, scorer: man(runner) });
      else s.unclaimed += 1;
    }
  }
  /* the sacks, home side's rush first, against the other side's line */
  sides.forEach((s, i) => {
    const line = unitStarters(teams[sides[1 - i].team], ['OL'], OL_SLOTS);
    const rush = mean(s.pool.def.filter(m => m.pos === 'DL' || m.pos === 'LB').map(m => m.ovr), REPLACEMENT_OVR);
    const chance = nflSackChance(rush, mean(line.map(m => m.ovr), NFL_BLOCK_FLOOR));
    for (let t = 0; t < NFL_SACK_TRIES; t += 1) if (rng() < chance) s.sackTries += 1;
    for (let k = 0; k < s.sackTries; k += 1) {
      const by = drawBy(s.pool.def, nflSackWeight, rng());
      if (by) s.sacks[by.id] = (s.sacks[by.id] ?? 0) + 1;
    }
  });
  return { key: told.key, home: sides[0], away: sides[1] };
}

/* ------------------------------------------------------------------ the record */

/** The season's lines when this league is keeping them for the season it is in, else null. */
export function nflLiveStats(league: Pick<LeagueState, 'stats' | 'season'>): NflSeasonStats | null {
  return league.stats && league.stats.season === league.season ? league.stats : null;
}

/** A fresh block for a season: no lines, no clubs, no plays. */
export function nflNewStats(season: number): NflSeasonStats {
  return { season, lines: {}, clubs: {}, plays: {} };
}

const creditsOf = (s: NflSideCredit): NflCredit[] => s.credits.map(c => [c.passer ? c.passer.name : null, c.scorer.name]);
/** Add to a saved line's column, through the shared shape (3 thrown, 4 run in, 5 caught, 6 sacks). */
const bump = (line: NflSavedLine, col: NflStatCol, n = 1) => foLineAdd(NFL_CODEC, line, col, n);

/**
 * Add one told game to the league's live block. `regular`: a regular season
 * game, which goes into the lines and the club's season; a playoff game
 * (false) writes his credits for the tile and nothing else. His games (`my`
 * home or away) keep their credits under the game's key. Records nothing on
 * a league with no live block. True when the game was recorded.
 */
export function nflRecordGame(lg: LeagueState, told: NflToldGame, my: string, regular: boolean): boolean {
  const stats = nflLiveStats(lg);
  if (!stats) return false;
  const c = nflCreditGame(told, lg.teams);
  if (!c) return false;
  if (regular) {
    for (const [s, pts, opp] of [[c.home, told.homeScore, told.awayScore], [c.away, told.awayScore, told.homeScore]] as const) {
      foClubGame(NFL_CODEC, stats, s.team, pts, opp, [s.tds, s.fgs, s.safeties]);
      const men = stats.lines[s.team] ?? (stats.lines[s.team] = {});
      for (const m of nflPoolMen(s.pool)) {
        foLineGame(NFL_CODEC, foOpenLine(NFL_CODEC, stats, s.team, m.id, m.name, m.pos, m.rookieSeason === lg.season), true);
      }
      for (const cr of s.credits) {
        if (cr.passer) { bump(men[cr.passer.id], 'ptd'); bump(men[cr.scorer.id], 'ctd'); }
        else bump(men[cr.scorer.id], 'rtd');
      }
      for (const [id, n] of Object.entries(s.sacks)) bump(men[id], 'sk', n);
    }
  }
  if (told.home === my || told.away === my) stats.plays[told.key] = [creditsOf(c.home), creditsOf(c.away)];
  return true;
}

/**
 * Record a week of told regular season games. The block opens here, at the
 * press of a season's Week 1 when the league holds no lines for its season,
 * and nowhere else; opening drops last season's lines and plays and keeps the
 * award history. Returns how many games were recorded.
 */
export function nflRecordWeek(lg: LeagueState, told: readonly NflToldGame[], my: string): number {
  if (lg.week === 1 && !nflLiveStats(lg)) lg.stats = nflNewStats(lg.season);
  if (!nflLiveStats(lg)) return 0;
  let n = 0;
  for (const g of told) if (nflRecordGame(lg, g, my, true)) n += 1;
  return n;
}

/** His game's credits for the tile: null when the league kept none for it. */
export function nflPlaysFor(lg: Pick<LeagueState, 'stats' | 'season'> | null | undefined, key: string): { home: NflCredit[]; away: NflCredit[] } | null {
  const p = lg?.stats?.plays;
  if (!p || !has(p, key)) return null;
  return { home: p[key][0], away: p[key][1] };
}

/* ------------------------------------------------------------------ awards */

/** Touchdowns he threw, ran in or caught. */
export const nflTouchdowns = (p: Pick<FoStatLine, 'tot'>): number => (p.tot.ptd ?? 0) + (p.tot.rtd ?? 0) + (p.tot.ctd ?? 0);
/** A club's winning share this regular season from the block's own club totals, 0 when it has played nobody. */
export function nflWinShare(stats: FoSeasonStats, team: string): number {
  const t = has(stats.teams, team) ? stats.teams[team] : null;
  return t && t.g > 0 ? t.w / t.g : 0;
}
/** The MVP score, the rule in the header. Exported so the harness can rank by it. */
export const nflMvpScore = (stats: FoSeasonStats, p: FoStatLine): number => nflTouchdowns(p) + (p.tot.sk ?? 0) / 2 + NFL_MVP_WIN_WEIGHT * nflWinShare(stats, p.team);

/** Every man in the league, wherever he is: the rosters, the practice squads, the free agents, in that order. */
export function nflEveryMan(lg: Pick<LeagueState, 'teams' | 'freeAgents'>): GmPlayer[][] {
  const teams = Object.values(lg.teams);
  return [...teams.map(t => t.players), ...teams.map(t => t.practice ?? []), lg.freeAgents ?? []];
}

/* The season's awards (nflSeasonAwards) and the once close (nflCloseSeasonStats) are src/lib/nflSeasonAwards.ts's:
   they run at the press that ends the season, which waits for the career kit, so they ride in the kit, not the page. */

/** Every award a season handed out, as [key, man] pairs. */
export function nflAwardList(a: NflSeasonAwards): [NflAwardKey, NflAwardPick][] {
  const out: [NflAwardKey, NflAwardPick][] = [];
  for (const k of NFL_AWARD_KEYS) { const m = a[k]; if (m) out.push([k, m]); }
  return out;
}

/**
 * Stamp the first year of men just drafted: each pick's man of that name on
 * that club gains `rookieSeason` (draft names are unique in a league: the
 * class is drawn against every name in it). Returns how many it found.
 */
export function nflMarkRookies(lg: Pick<LeagueState, 'teams'>, picks: readonly { team: string; playerName: string }[], season: number): number {
  let found = 0;
  for (const pk of picks) {
    const team = has(lg.teams, pk.team) ? lg.teams[pk.team] : null;
    const p = team ? [...team.players].reverse().find(m => m.name === pk.playerName && m.rookieSeason === undefined) : null;
    if (p) { p.rookieSeason = season; found += 1; }
  }
  return found;
}

/* ------------------------------------------------------------------ readers */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';

const readCredit = (c: unknown): boolean => Array.isArray(c) && c.length === 2 && (c[0] === null || isText(c[0])) && isText(c[1]);

/** A saved block that reads whole, or null: the shared shape with the NFL's columns (foReadSaved: a line is two words,
 *  then five counts, then a 1 for a first year man or nothing; a club is seven counts), and the plays. Never throws. */
export function readNflStats(v: unknown): NflSeasonStats | null {
  try {
    if (!foReadSaved(NFL_CODEC, v) || !isObj((v as unknown as Record<string, unknown>).plays)) return null;
    const plays = (v as unknown as { plays: Record<string, unknown> }).plays;
    if (!Object.values(plays).every(p => Array.isArray(p) && p.length === 2 && p.every(side => Array.isArray(side) && side.every(readCredit)))) return null;
    return v as unknown as NflSeasonStats;
  } catch {
    return null;
  }
}

function readPick(v: unknown): boolean {
  if (v === null) return true;
  return isObj(v) && isText(v.id) && isText(v.name) && isText(v.team) && isText(v.pos) && [v.g, v.ptd, v.rtd, v.ctd, v.sk].every(isCount);
}

/** A saved award history that reads whole (every season once, at most FO_HISTORY_CAP of them), or null. Never throws. */
export function readNflAwards(v: unknown): NflSeasonAwards[] | null {
  try {
    if (!Array.isArray(v) || v.length > FO_HISTORY_CAP) return null;
    const seen = new Set<number>();
    for (const a of v) {
      if (!isObj(a) || !Number.isInteger(a.season) || seen.has(a.season as number) || typeof a.rookies !== 'boolean') return null;
      if (!readPick(a.mvp) || !readPick(a.oroy) || !readPick(a.droy)) return null;
      seen.add(a.season as number);
    }
    return v as NflSeasonAwards[];
  } catch {
    return null;
  }
}

/**
 * On load, BEFORE anything else reads the league or a restore path writes the
 * stored save back: a block, a history, a man's awards or first year that does
 * not read whole is deleted from the league object itself, so no path saves
 * it again (the next save drops it). Never throws; returns how many it dropped.
 */
export function nflCleanSave(lg: LeagueState): number {
  let dropped = 0;
  try {
    if (lg.stats !== undefined && !readNflStats(lg.stats)) { delete lg.stats; dropped += 1; }
    if (lg.awards !== undefined && !readNflAwards(lg.awards)) { delete lg.awards; dropped += 1; }
    for (const list of nflEveryMan(lg)) {
      for (const p of list) {
        if (!isObj(p)) continue;
        if (p.awards !== undefined && !(Array.isArray(p.awards) && p.awards.every(isText))) { delete p.awards; dropped += 1; }
        if (p.rookieSeason !== undefined && !Number.isInteger(p.rookieSeason)) { delete p.rookieSeason; dropped += 1; }
      }
    }
  } catch {
    /* a league that does not read is the save validator's to refuse, not this reader's */
  }
  return dropped;
}

/** A man's awards for his card, or nothing when they do not read. */
export const nflAwardsOf = (p: { awards?: unknown }): string[] => (Array.isArray(p.awards) && p.awards.every(isText) ? p.awards : []);

/* ------------------------------------------------------------------ the page's "?" */

/** The rules of the season numbers for the page's "?", the worked example computed from the rules themselves. Build it inside a component, never at module scope. */
export function nflStatsHelp(): string[] {
  const share = (ovr: number) => Math.round(nflPassChance(ovr) * 100);
  const odds = Number((nflUsage(85) / nflUsage(NFL_USAGE_PIVOT)).toFixed(2));
  return [
    "Who scored: every touchdown of a game goes to one of the club's starters that week. It is a pass from the quarterback or a run, and the better the quarterback the more of them he throws. A pass is caught by one of the five skill starters, receivers most often, then tight ends, then backs, the better rated more often. A run is a back's, now and then the quarterback's, and once in a long while a receiver's. Injured men, the line and the bench never score.",
    "Sacks come from the pass rush against the other side's line: the better the rushers are rated against the blockers, the more of them land. A sack goes to one of the defensive starters, linemen most often, then linebackers, then defensive backs, the better rated more often. Field goals and safeties count for the club, because kickers and punters are not on these rosters.",
    `The season's leaders (touchdown passes, rushing touchdowns, sacks) are in Standings. When the season closes this save names, from the regular season's lines, an ${NFL_AWARD_LABEL.mvp} (${NFL_AWARD_RULE.mvp}), an ${NFL_AWARD_LABEL.oroy} (${NFL_AWARD_RULE.oroy}) and a ${NFL_AWARD_LABEL.droy} (${NFL_AWARD_RULE.droy}). A rookie award needs at least one, and ties go to more games played. Playoff games are not in the lines or the awards.`,
    "Every line and award is this save's sim season, not real NFL stats. A save from before season lines starts keeping them at its next Week 1.",
    `For example: a quarterback rated 85 throws ${share(85)} of every 100 of his club's touchdowns and one rated 70 throws ${share(70)}, and a receiver rated 85 is ${odds} times as likely to catch one as a receiver rated ${NFL_USAGE_PIVOT} in the same slot.`,
  ];
}
