/**
 * Round 824: NBA Front Office season lines and awards.
 *
 * WHAT A LINE IS. The engine decides every game with one draw against the
 * home side's win probability (simRound in nbaFrontOffice.ts). This file
 * turns that same game into a box score without taking a single draw from
 * the league's generator: the score and the split come from a generator
 * seeded from the deciding draw itself (foBoxRng), so results, injuries and
 * everything after them are exactly what they were before lines existed.
 *
 *   The score. A club scores NBA_TEAM_POINTS in an even game; the two
 *   clubs' total wobbles about twice that. The margin comes from how clearly
 *   the draw fell: a draw just under the win probability is a one point
 *   game, a draw near zero is a blowout. The winner always outscores the
 *   loser, by at least one.
 *   The men. The eight men nbaStrength counts (chosen starters and bench,
 *   or the best healthy eight automatically) play on fixed slot minutes.
 *   Points split by minutes times a usage that climbs with rating, rebounds
 *   and blocks lean to bigs, assists and steals to guards, each with a game
 *   to game wobble. foSplit hands out whole numbers that add up exactly, so
 *   every man's points sum to his club's points in every game.
 *
 * These are this save's simulated seasons. The rosters carry real players'
 * names, so the board labels every line and award as the save's own sim
 * season, never as real statistics, and nothing here quotes anybody.
 *
 * THE AWARDS, each a stated rule over the lines and the standings. To
 * qualify a man must play four in five of an average club's games
 * (NBA_AWARD_GAMES_SHARE), the same bar the leaders tables use.
 *   MVP: points plus rebounds plus assists a game, plus 20 times his club's
 *     winning share (a .600 club adds 12).
 *   All-League First Team: the five best by the MVP score, any position.
 *   Rookie of the Year: points plus rebounds plus assists a game, among men
 *     drafted in this league and in their first season.
 *   Defensive Player of the Year: steals plus blocks plus half his rebounds
 *     a game, among men whose club allowed fewer points a game than the
 *     league did on average.
 *   Sixth Man of the Year: points a game, among men who started fewer than
 *     half the games they played.
 * Ties go to more games, then to the id, so a season always names the same
 * man. No qualified man, no award, and the screen says so.
 * Round 1103: the three scores (MVP, production, defence) live in
 * awardDecision.ts and are shared with NBA My Career. Who qualifies stays here.
 */
import { nbaDefenseValue, nbaMvpValue, nbaProduction } from './awardDecision';
import type { NbaGmPlayer, NbaGmTeam, NbaLeague } from './nbaFrontOffice';
import { NBA_ROTATION_MINUTES, nbaRotation as teamRotation, nbaRotationSlots } from './nbaRotation';
import {
  type FoSeasonStats, type FoStatLine,
  foBoxRng, foLeaders, foMinGames, foPerGame, foPickAward, foRankAward, foSeasonPlayers, foSplit,
} from './foSeasonStats';

export const NBA_STAT_COLS = ['pts', 'reb', 'ast', 'stl', 'blk'] as const;
export type NbaStatCol = typeof NBA_STAT_COLS[number];

export { NBA_ROTATION_MINUTES } from './nbaRotation';
/** A club's points in an even game. The game's own tuning, not a real league figure. */
export const NBA_TEAM_POINTS = 113;
/** Games a man must play to qualify, as a share of an average club's games. */
export const NBA_AWARD_GAMES_SHARE = 0.8;
/** What the MVP score adds per unit of the club's winning share. */
export const NBA_MVP_WIN_WEIGHT = 20;

/** The same healthy starter and bench order the strength calculation uses. */
export function nbaRotation(t: NbaGmTeam): NbaGmPlayer[] {
  return teamRotation(t);
}

export interface NbaBoxMan {
  id: string; name: string; pos: string; starter: boolean; rookie: boolean;
  pts: number; reb: number; ast: number; stl: number; blk: number;
}
export interface NbaBoxSide { team: string; pts: number; reb: number; ast: number; stl: number; blk: number; men: NbaBoxMan[] }
export interface NbaBox { home: NbaBoxSide; away: NbaBoxSide; margin: number }

const POS_REB: Record<string, number> = { G: 0.75, F: 1.4, C: 2.2 };
const POS_AST: Record<string, number> = { G: 2.2, F: 1.0, C: 0.6 };
const POS_STL: Record<string, number> = { G: 1.3, F: 1.0, C: 0.7 };
const POS_BLK: Record<string, number> = { G: 0.35, F: 1.0, C: 2.6 };
const usage = (ovr: number): number => Math.max(0.5, 1 + (ovr - 72) * 0.1);

function boxSide(t: NbaGmTeam, pts: number, r: () => number, season: number): NbaBoxSide {
  /* The original no-healthy emergency box still puts its eight best on the floor. */
  const slots = nbaRotationSlots(t);
  const rotation = slots.some(p => !!p) ? slots : [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, NBA_ROTATION_MINUTES.length);
  const playing = rotation.flatMap((player, slot) => player ? [{ player, slot }] : []);
  const rot = playing.map(p => p.player);
  const mins = playing.map(p => NBA_ROTATION_MINUTES[p.slot]);
  const wobble = () => 0.55 + 0.9 * r();
  const reb = 40 + Math.floor(r() * 9);
  const ast = 22 + Math.floor(r() * 9);
  const stl = 5 + Math.floor(r() * 6);
  const blk = 3 + Math.floor(r() * 5);
  const ptsS = foSplit(pts, rot.map((p, i) => mins[i] * usage(p.ovr) * wobble()));
  const rebS = foSplit(reb, rot.map((p, i) => mins[i] * (POS_REB[p.pos] ?? 1) * (0.8 + (p.ovr - 70) / 50) * wobble()));
  const astS = foSplit(ast, rot.map((p, i) => mins[i] * (POS_AST[p.pos] ?? 1) * usage(p.ovr) * wobble()));
  const stlS = foSplit(stl, rot.map((p, i) => mins[i] * (POS_STL[p.pos] ?? 1) * wobble()));
  const blkS = foSplit(blk, rot.map((p, i) => mins[i] * (POS_BLK[p.pos] ?? 1) * wobble()));
  return {
    team: t.abbr, pts, reb, ast, stl, blk,
    men: rot.map((p, i) => ({
      id: p.id, name: p.name, pos: p.pos, starter: playing[i].slot < 5, rookie: p.rookieSeason === season,
      pts: ptsS[i], reb: rebS[i], ast: astS[i], stl: stlS[i], blk: blkS[i],
    })),
  };
}

/**
 * The box score of one game the engine has already decided. `draw` is the
 * number it drew against `p`, the home side's win probability, so
 * homeWon === draw < p. `salt` tells the games of one round apart.
 */
export function nbaBoxScore(
  home: NbaGmTeam, away: NbaGmTeam, homeWon: boolean, draw: number, p: number, salt: number, season: number,
): NbaBox {
  const r = foBoxRng(draw, salt);
  /* How clearly the draw fell on the winner's side, 0 to 1. */
  const d = homeWon ? (p - draw) / Math.max(p, 1e-9) : (draw - p) / Math.max(1 - p, 1e-9);
  const margin = 1 + Math.floor(Math.pow(Math.min(1, Math.max(0, d)), 1.4) * 24);
  const total = 2 * NBA_TEAM_POINTS + Math.round((r() + r() + r() - 1.5) * 16);
  const loser = Math.round((total - margin) / 2);
  const winner = loser + margin;
  const h = boxSide(home, homeWon ? winner : loser, r, season);
  const a = boxSide(away, homeWon ? loser : winner, r, season);
  return { home: h, away: a, margin };
}

const blankLine = (m: NbaBoxMan, team: string): FoStatLine => ({
  id: m.id, name: m.name, team, pos: m.pos, g: 0, gs: 0,
  tot: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
  ...(m.rookie ? { rookie: true } : {}),
});

/** Add one game to the season's lines and club totals. */
export function nbaRecordBox(stats: FoSeasonStats, box: NbaBox): void {
  for (const [side, other] of [[box.home, box.away], [box.away, box.home]] as const) {
    const club = stats.teams[side.team] ?? { g: 0, w: 0, pts: 0, opp: 0 };
    club.g += 1; club.pts += side.pts; club.opp += other.pts;
    if (side.pts > other.pts) club.w += 1;
    stats.teams[side.team] = club;
    for (const m of side.men) {
      const key = `${side.team}|${m.id}`;
      const line = stats.lines[key] ?? blankLine(m, side.team);
      line.g += 1;
      if (m.starter) line.gs += 1;
      for (const c of NBA_STAT_COLS) line.tot[c] = (line.tot[c] ?? 0) + m[c];
      line.name = m.name;
      stats.lines[key] = line;
    }
  }
}

/** The season's lines when this league is keeping them for the season it is in, else null. */
export function nbaLiveStats(league: Pick<NbaLeague, 'stats' | 'season'>): FoSeasonStats | null {
  return league.stats && league.stats.season === league.season ? league.stats : null;
}

/* ------------------------------------------------------------------ awards */

export interface NbaAwardPick {
  id: string; name: string; team: string; pos: string; g: number;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
}
export interface NbaSeasonAwards {
  season: number;
  /** The games a man needed to qualify that season. */
  minGames: number;
  mvp: NbaAwardPick | null;
  roy: NbaAwardPick | null;
  dpoy: NbaAwardPick | null;
  sixth: NbaAwardPick | null;
  allLeague: NbaAwardPick[];
}
export type NbaAwardKey = 'mvp' | 'roy' | 'dpoy' | 'sixth' | 'allLeague';

/** The award's name, as it is written on a man's card. */
export const NBA_AWARD_LABEL: Record<NbaAwardKey, string> = {
  mvp: 'MVP',
  roy: 'Rookie of the Year',
  dpoy: 'Defensive Player of the Year',
  sixth: 'Sixth Man of the Year',
  allLeague: 'All-League First Team',
};
/** The stated rule, as the screen and the guide say it. */
export const NBA_AWARD_RULE: Record<NbaAwardKey, string> = {
  mvp: 'points plus rebounds plus assists a game, plus 20 times his club\'s winning share',
  allLeague: 'the five best by the MVP score, any position',
  roy: 'points plus rebounds plus assists a game, among first year men drafted in this league',
  dpoy: 'steals plus blocks plus half his rebounds a game, among men whose club allowed fewer points than the league average',
  sixth: 'points a game, among men who started fewer than half the games they played',
};

const pick = (p: FoStatLine): NbaAwardPick => ({
  id: p.id, name: p.name, team: p.team, pos: p.pos, g: p.g,
  ppg: foPerGame(p, 'pts'), rpg: foPerGame(p, 'reb'), apg: foPerGame(p, 'ast'), spg: foPerGame(p, 'stl'), bpg: foPerGame(p, 'blk'),
});

/** A club's winning share this regular season, 0 when it has played nobody. */
function winShare(league: Pick<NbaLeague, 'teams'>, abbr: string): number {
  const t = league.teams[abbr];
  const g = t ? t.wins + t.losses : 0;
  return g > 0 ? t.wins / g : 0;
}

/** The MVP score, the rule above. Exported so the harness can rank by it. */
export function nbaMvpScore(league: Pick<NbaLeague, 'teams'>, p: FoStatLine): number {
  return nbaMvpValue(nbaProduction(foPerGame(p, 'pts'), foPerGame(p, 'reb'), foPerGame(p, 'ast')), winShare(league, p.team), NBA_MVP_WIN_WEIGHT);
}
export const nbaProductionScore = (p: FoStatLine): number => nbaProduction(foPerGame(p, 'pts'), foPerGame(p, 'reb'), foPerGame(p, 'ast'));
export const nbaDefenseScore = (p: FoStatLine): number => nbaDefenseValue(foPerGame(p, 'stl'), foPerGame(p, 'blk'), foPerGame(p, 'reb'));

/**
 * The season's awards from its lines, by the rules in the header, or null
 * when the league is not keeping lines for the season it is in (a save from
 * before this round, still in the season it was saved in). Pure: nothing is
 * written anywhere.
 */
export function nbaSeasonAwards(league: Pick<NbaLeague, 'stats' | 'season' | 'teams'>): NbaSeasonAwards | null {
  const stats = nbaLiveStats(league);
  if (!stats) return null;
  const minGames = foMinGames(stats, NBA_AWARD_GAMES_SHARE);
  const qualified = foSeasonPlayers(stats).filter(p => p.g >= minGames);
  const clubs = Object.entries(stats.teams);
  const leagueAllowed = clubs.length ? clubs.reduce((s, [, c]) => s + (c.g ? c.opp / c.g : 0), 0) / clubs.length : 0;
  const stingy = new Set(clubs.filter(([, c]) => c.g > 0 && c.opp / c.g < leagueAllowed).map(([a]) => a));
  const mvpRank = foRankAward(qualified, p => nbaMvpScore(league, p));
  const mvp = mvpRank[0] ?? null;
  const roy = foPickAward(qualified.filter(p => p.rookie), nbaProductionScore);
  const dpoy = foPickAward(qualified.filter(p => stingy.has(p.team)), nbaDefenseScore);
  const sixth = foPickAward(qualified.filter(p => p.gs * 2 < p.g), p => foPerGame(p, 'pts'));
  return {
    season: stats.season, minGames,
    mvp: mvp ? pick(mvp) : null,
    roy: roy ? pick(roy) : null,
    dpoy: dpoy ? pick(dpoy) : null,
    sixth: sixth ? pick(sixth) : null,
    allLeague: mvpRank.slice(0, 5).map(pick),
  };
}

/** Every award a season handed out, as [key, man] pairs, the All-League five each counted. */
export function nbaAwardList(a: NbaSeasonAwards): [NbaAwardKey, NbaAwardPick][] {
  const out: [NbaAwardKey, NbaAwardPick][] = [];
  for (const k of ['mvp', 'roy', 'dpoy', 'sixth'] as const) { const m = a[k]; if (m) out.push([k, m]); }
  for (const m of a.allLeague) out.push(['allLeague', m]);
  return out;
}

/**
 * Close the season's lines: name the awards, add them to the league's
 * history and write each one on the man's card (rosters and the free agent
 * pool both, since a man can be waived after the deadline he played to).
 * Once per season: a season already in the history is returned as it was and
 * nothing is written twice, the Round 431 rule that a season closes once.
 * Returns null for a season the league was not keeping lines for.
 */
export function nbaCloseSeasonStats(league: NbaLeague): NbaSeasonAwards | null {
  const done = (league.awards ?? []).find(a => a.season === league.season);
  if (done) return done;
  const awards = nbaSeasonAwards(league);
  if (!awards) return null;
  league.awards = [...(league.awards ?? []), awards].slice(-40);
  const men = new Map<string, NbaGmPlayer>();
  for (const t of Object.values(league.teams)) for (const p of t.players) men.set(p.id, p);
  for (const p of league.freeAgents) if (!men.has(p.id)) men.set(p.id, p);
  for (const [k, m] of nbaAwardList(awards)) {
    const man = men.get(m.id);
    if (man) man.awards = [...(man.awards ?? []), `${awards.season} ${NBA_AWARD_LABEL[k]}`];
  }
  return awards;
}

/* ----------------------------------------------------------------- views */

export interface NbaLeaderRow { id: string; name: string; team: string; g: number; value: number }
/** The leaders tables the close screen draws: the best `n` qualified men in points, rebounds and assists a game. */
export function nbaLeaders(league: Pick<NbaLeague, 'stats' | 'season'>, n = 3): { minGames: number; pts: NbaLeaderRow[]; reb: NbaLeaderRow[]; ast: NbaLeaderRow[] } | null {
  const stats = nbaLiveStats(league);
  if (!stats) return null;
  const minGames = foMinGames(stats, NBA_AWARD_GAMES_SHARE);
  const players = foSeasonPlayers(stats);
  const rows = (col: NbaStatCol) => foLeaders(players, col, n, minGames).map(p => ({ id: p.id, name: p.name, team: p.team, g: p.g, value: foPerGame(p, col) }));
  return { minGames, pts: rows('pts'), reb: rows('reb'), ast: rows('ast') };
}

export interface NbaTeamLine { id: string; name: string; pos: string; g: number; gs: number; ppg: number; rpg: number; apg: number; rookie: boolean }
/** One club's lines this season, for the games each man played for it, most points a game first. */
export function nbaTeamLines(league: Pick<NbaLeague, 'stats' | 'season'>, abbr: string): NbaTeamLine[] {
  const stats = nbaLiveStats(league);
  if (!stats) return [];
  return Object.values(stats.lines)
    .filter(l => l.team === abbr && l.g > 0)
    .map(l => ({ id: l.id, name: l.name, pos: l.pos, g: l.g, gs: l.gs, ppg: foPerGame(l, 'pts'), rpg: foPerGame(l, 'reb'), apg: foPerGame(l, 'ast'), rookie: !!l.rookie }))
    .sort((a, b) => b.ppg - a.ppg || b.g - a.g || a.id.localeCompare(b.id));
}
