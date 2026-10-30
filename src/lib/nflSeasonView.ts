/**
 * Round 1542: every word and table the NFL season card prints, decided here
 * (src/components/front-office/NflSeasonStats.tsx draws them). Only the card
 * reads this file, so it rides in the card's own chunk and never in the
 * board's: the press needs the recorder (src/lib/nflSeasonStats.ts), not the
 * leaders, the award details or the history's sentences.
 *
 * Every line here is this save's sim season: the card's note says so on every
 * tab, the history says "Sim seasons", and no line quotes anybody.
 */
import { foRankAward, foSeasonPlayers } from './foSeasonStats';
import { foClosedSeason } from './foSeasonClose';
import {
  NFL_AWARD_KEYS, NFL_AWARD_LABEL, NFL_AWARD_RULE, NFL_STAT_COLS, nflFoStats, nflLiveStats,
  type NflAwardPick, type NflSeasonAwards, type NflStatCol,
} from './nflSeasonStats';
import type { LeagueState } from './frontOffice';

/** The NBA card's note with NFL in its place (NbaFrontOfficeBoard.tsx, SIM_NOTE). */
export const NFL_SIM_NOTE = "Sim season: every line and award here comes from this save's games, not real NFL stats.";
export const NFL_STAT_HEADS = ['PTD', 'RTD', 'CTD', 'SK'] as const;
export const NFL_LEADER_TABLES: readonly [string, NflStatCol][] = [['TD passes', 'ptd'], ['Rushing TDs', 'rtd'], ['Sacks', 'sk']];
export const NFL_EMPTY_AWARDS = 'Awards are named when the season closes, after the playoffs. Leaders has the season so far.';
/** A rookie box with nobody to name, in a save's first season (no class drafted in it yet). */
export const NFL_NO_CLASS = 'rookie awards start with the first class drafted in this save';
/** A rookie box with nobody to name in any later season: what the code knows, since a class drafted before this save
 *  kept lines (a save that took them between its draft and Week 1) carries no first year mark. */
export const NFL_NO_ROOKIES = 'no first year man this season was drafted while this save kept lines';
/** Under the history when the save holds seasons from before its first lined one. */
export const NFL_HISTORY_GAP = 'Seasons before the first one here were played before lines were kept.';
/** The row of a season sat out (the brief's ruling R1: it keeps no lines and its row says so). */
export const NFL_SAT_OUT = 'No lines were kept for a season you sat out.';

export interface NflLeaderRow { id: string; name: string; team: string; g: number; value: number }

/** The leaders of the season so far by totals: the best `n` men with more than none, ties to more games, then the id. */
export function nflLeaders(lg: Pick<LeagueState, 'stats' | 'season'>, n = 3): Record<'ptd' | 'rtd' | 'sk', NflLeaderRow[]> | null {
  const stats = nflLiveStats(lg);
  if (!stats) return null;
  const men = foSeasonPlayers(nflFoStats(stats));
  const rows = (col: NflStatCol) => foRankAward(men.filter(p => (p.tot[col] ?? 0) > 0), p => p.tot[col] ?? 0)
    .slice(0, n).map(p => ({ id: p.id, name: p.name, team: p.team, g: p.g, value: p.tot[col] ?? 0 }));
  return { ptd: rows('ptd'), rtd: rows('rtd'), sk: rows('sk') };
}

export interface NflTeamLine { id: string; name: string; pos: string; g: number; values: number[]; rookie: boolean }
/** One club's lines this season, for the games each man played for it: the most touchdowns and sacks first. */
export function nflTeamLines(lg: Pick<LeagueState, 'stats' | 'season'>, abbr: string): NflTeamLine[] {
  const stats = nflLiveStats(lg);
  if (!stats) return [];
  return Object.values(nflFoStats(stats).lines)
    .filter(l => l.team === abbr && l.g > 0)
    .map(l => ({ id: l.id, name: l.name, pos: l.pos, g: l.g, values: NFL_STAT_COLS.map(c => l.tot[c] ?? 0), rookie: !!l.rookie }))
    .sort((a, b) => b.values.reduce((x, y) => x + y, 0) - a.values.reduce((x, y) => x + y, 0) || b.g - a.g || a.id.localeCompare(b.id));
}

/** A club's field goals and safeties this regular season, or null with no lines. */
export function nflClubKicks(lg: Pick<LeagueState, 'stats' | 'season'>, abbr: string): { td: number; fg: number; sf: number } | null {
  const live = nflLiveStats(lg);
  const c = live ? nflFoStats(live).club[abbr] : undefined;
  return c ? { td: c[0], fg: c[1], sf: c[2] } : null;
}

/** An award winner's line in words: "31 TD thrown, 3 run in", "14 sacks". */
export function nflAwardDetail(p: NflAwardPick): string {
  const bits = [
    p.ptd ? `${p.ptd} TD thrown` : '', p.rtd ? `${p.rtd} run in` : '', p.ctd ? `${p.ctd} caught` : '',
    p.sk ? `${p.sk} sack${p.sk === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return bits.length ? bits.join(', ') : `${p.g} games`;
}

/** The three award boxes of a season: its winners, or none, each with its stated rule. `champions`: the league's, to
 *  tell a save's first season (no season closed before it, so no class drafted yet) from a later one. */
export function nflAwardBoxes(a: NflSeasonAwards, myTeam: string, champions: readonly { season: number }[] = []): { label: string; rule: string; winners: { id: string; name: string; team: string; detail: string; mine: boolean }[] }[] {
  const none = champions.some(c => c.season < a.season) ? NFL_NO_ROOKIES : NFL_NO_CLASS;
  return NFL_AWARD_KEYS.map(k => {
    const m = a[k];
    const rookie = k !== 'mvp';
    return {
      label: NFL_AWARD_LABEL[k],
      rule: rookie && !a.rookies ? `${NFL_AWARD_RULE[k]}; ${none}` : NFL_AWARD_RULE[k],
      winners: m ? [{ id: m.id, name: m.name, team: m.team, detail: nflAwardDetail(m), mine: m.team === myTeam }] : [],
    };
  });
}

/** The season's awards when it has closed, from the history. */
export const nflClosedAwards = (lg: Pick<LeagueState, 'awards' | 'season'>): NflSeasonAwards | null => foClosedSeason(lg.awards, lg.season);

/**
 * The award history, newest first, as one line a season, and how many awards his club won in it. A season the league
 * closed (it has a champion) after the first season here, with no awards of its own, is a season sat out: lines open
 * only at a Week 1 press and every lined season closes with an entry, while a year hosted away pushes its champion
 * and keeps no lines. Its row says so. `before` is whether the save holds closed seasons from before the first one here.
 */
export function nflHistoryRows(lg: Pick<LeagueState, 'awards' | 'champions'>, myTeam: string): { rows: { season: number; text: string }[]; ours: number; before: boolean } {
  const history = lg.awards ?? [];
  const champOf = (season: number) => lg.champions.find(c => c.season === season)?.team;
  let ours = 0;
  const rows = history.map(a => {
    const champ = champOf(a.season);
    const bits = [champ ? `Champions ${champ}` : null];
    for (const k of NFL_AWARD_KEYS) {
      const m = a[k];
      if (m && m.team === myTeam) ours += 1;
      bits.push(m ? `${NFL_AWARD_LABEL[k]} ${m.name} (${m.team})` : null);
    }
    return { season: a.season, text: bits.filter(Boolean).join(' · ') };
  });
  const first = history.length ? Math.min(...history.map(a => a.season)) : Infinity;
  const named = new Set(history.map(a => a.season));
  const away = [...new Set(lg.champions.map(c => c.season))].filter(s => s > first && !named.has(s));
  for (const season of away) rows.push({ season, text: [`Champions ${champOf(season)}`, NFL_SAT_OUT].join(' · ') });
  rows.sort((a, b) => b.season - a.season);
  return { rows, ours, before: lg.champions.some(c => c.season < first) };
}
