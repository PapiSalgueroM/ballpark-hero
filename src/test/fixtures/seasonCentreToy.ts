/* Round 1048: a fixed soccer shaped season and viewer model for
   src/test/seasonCentreWords.test.tsx. The season is derived by the real
   core from a toy table sport (the one src/test/seasonCore.test.ts proves the
   core on), and the model carries the words the soccer binding gives the
   shared viewer (src/components/soccer-career/SoccerSeasonCentre.tsx), so
   the markup recorded from it is what a soccer season looks like in the
   viewer without a career, a club list or a save. Nothing here is imported
   by the site. */
import {
  deriveSeason, ownRowRounds, roundRobinRounds,
  type DerivedGame, type DerivedSeason, type Frame, type SeasonEvent, type SeasonSport, type StatTotal, type TeamTarget,
} from '@/lib/season/core';
import { LAW, goalLambda, poissonDraw } from '@/lib/season/law';
import { soccerEventDisagreements, soccerEvents } from '@/lib/season/soccerEvents';
import type { CentreModel, CentreSport } from '@/components/season-centre/SeasonCentre';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';

export interface ToyRow {
  mode: 'table' | 'results';
  teams: number;
  finish: number;
  title?: boolean;
  apps: number;
  played: number;
  goals: number;
  assists: number;
  rating: number;
  yellow: number;
  seed: string;
}

const RULE = { win: 3, draw: 1, loss: 0 };

export const TOY: SeasonSport<ToyRow, null> = {
  id: 'toy',
  seasonKey: r => `words|${r.seed}|${r.mode}|${r.teams}|${r.finish}|${r.goals}|${r.apps}`,
  frame: r => ({ mode: r.mode, teams: r.teams, games: 2 * (r.teams - 1), rule: r.mode === 'table' ? RULE : null }),
  fixtures: f => (f.mode === 'table' ? roundRobinRounds(f.teams) : ownRowRounds(f.teams)),
  target: (r): TeamTarget => (r.mode === 'table'
    ? { kind: 'finish', finish: r.finish, title: !!r.title, champion: r.title ? 'mine' : 'other' }
    : { kind: 'none' }),
  fixed: () => [],
  availability: r => ({ played: r.played, block: 0, severe: false }),
  totals: (r): StatTotal[] => [
    { key: 'goals', kind: 'sum', total: r.goals, perGameCap: 4, teamFor: true },
    { key: 'assists', kind: 'sum', total: r.assists, perGameCap: 3, teamFor: true },
    { key: 'rating', kind: 'mean', mean: r.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },
    { key: 'yellow', kind: 'sum', total: r.yellow, perGameCap: 1, distinct: 'card' },
  ],
  apps: r => r.apps,
  score: (edge, home, rng) => [
    poissonDraw(goalLambda(edge, home ? LAW.home : LAW.away), rng),
    poissonDraw(goalLambda(-edge, home ? LAW.away : LAW.home), rng),
  ],
  strengths: (frame: Frame, target: TeamTarget, _slotOf, _ctx, rng) => {
    const n = frame.teams;
    const ladder = Array.from({ length: n }, (_, i) => 85 - (20 * i) / Math.max(1, n - 1));
    const finish = target.kind === 'finish' ? target.finish : Math.ceil(n / 2);
    const out = new Array(n).fill(0);
    out[0] = ladder[finish - 1];
    const rest = ladder.filter((_, i) => i !== finish - 1);
    const slots = Array.from({ length: n - 1 }, (_, i) => i + 1);
    for (let i = slots.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    slots.forEach((s, i) => { out[s] = rest[i]; });
    return out;
  },
  meanBase: (_k, g) => 6.4 + (g.line.goals ?? 0) * 0.7 + (g.line.assists ?? 0) * 0.4 + (g.us > g.them ? 0.3 : g.us < g.them ? -0.3 : 0),
  subChance: () => 0.1,
  labels: slots => slots.map(s => ({ name: s.slot === 0 ? 'Northfield' : s.slot % 3 === 0 ? 'another club' : `Club ${s.slot}`, named: s.slot === 0 || s.slot % 3 !== 0, key: `s${s.slot}` })),
  events: soccerEvents,
  check: (_r, _c, s) => soccerEventDisagreements(s, []),
  words: { round: 'Matchday', title: 'Season Centre', unnamed: 'another club' },
};

export const TABLE_ROW: ToyRow = { mode: 'table', teams: 6, finish: 3, apps: 12, played: 9, goals: 5, assists: 2, rating: 7.1, yellow: 2, seed: 'words' };
export const RESULTS_ROW: ToyRow = { ...TABLE_ROW, mode: 'results', seed: 'words-res' };

/* The soccer binding's words, as SoccerSeasonCentre.tsx hands them over. */
export const SOCCER_HELP: HelpWords = {
  title: 'How the Season Centre works',
  intro: ['Your season was played the moment you pressed Next Season. This is that same season, match by match, so nothing here can change it.'],
  controls: '▶ plays the next matchday. ⏭ goes straight to the end.',
  examples: [{ head: 'A matchday', body: 'Matchday 12: you win 2-1 at home and score in the 67th minute, rated 7.6.' }],
  footnote: 'Clubs level on points are split by goal difference, then goals scored.',
};

function eventWords(e: SeasonEvent, us: string, them: string): string {
  if (e.kind === 'goal') return e.side === 'us' ? (e.mine ? '⚽ You score!' : `⚽ Goal, ${us}`) : `⚽ Goal, ${them}`;
  if (e.kind === 'assist') return '🅰️ You set it up';
  if (e.kind === 'yellow') return '🟨 You go in the book';
  if (e.kind === 'on') return '🔁 You come on';
  return '🔁 You come off';
}

export const SOCCER_SHAPED: CentreSport = {
  clock: { length: 90, label: minute => `${minute}'`, words: eventWords },
  fixed: { badge: 'DERBY', poster: 'Derby day', recordSoFar: 'Your derby record so far', recordPlayed: 'Derbies you played' },
  missed: why => (why === 'injured' ? 'Not in the squad: injured' : why === 'suspended' ? 'Suspended' : 'Not in the matchday squad'),
  lineOf: (g: DerivedGame) => {
    const bits: string[] = [];
    if ((g.line.goals ?? 0) > 0) bits.push(`⚽ ${g.line.goals}`);
    if ((g.line.assists ?? 0) > 0) bits.push(`🅰️ ${g.line.assists}`);
    if ((g.line.yellow ?? 0) > 0) bits.push('🟨');
    return { bits, alarm: null };
  },
  markOf: g => g.line.rating ?? 0,
  soFar: so => [
    ['Played', String(so.apps)],
    ['Goals', String(so.goals ?? 0)],
    ['Assists', String(so.assists ?? 0)],
    ['Rating', so.apps ? ((so.rating ?? 0) / so.apps).toFixed(1) : '-'],
  ],
  half: so => `First half: ${so.apps} games, ${so.goals ?? 0} goals, ${so.assists ?? 0} assists`,
  bucket: b => `Cups and other games: ${b.apps} apps, ${b.line.goals ?? 0} goals, ${b.line.assists ?? 0} assists`,
};

/** The soccer shaped model for a derived toy season (the shape buildModel gives the viewer). */
export function soccerShapedModel(row: ToyRow, s: DerivedSeason): CentreModel {
  return {
    season: s,
    words: TOY.words,
    names: s.labels.map(l => (l.named ? l.name : TOY.words.unnamed)),
    occasion: {},
    header: { club: 'Northfield', seasonLabel: '2026/27', league: 'Toy League', loanFrom: null },
    frameLine: s.mode === 'table' ? `${s.teams} clubs · ${s.games.length} matchdays · 3 points for a win` : null,
    lastSeason: 'Last season: 3rd with Northfield',
    resultsWhy: s.mode === 'table' ? null : 'Results only: the game does not have a verified table for this league that season.',
    derbyBefore: { w: 0, d: 0, l: 0 },
    review: {
      tiles: [['Apps', String(row.apps)], ['Goals', String(row.goals)], ['Assists', String(row.assists)], ['Avg rating', row.rating.toFixed(1)]],
      finishLine: s.mode === 'table' ? `Finished 3rd of ${s.teams} in the Toy League` : null,
      championLine: null, trophies: ['🏆 Cup'], title: false, notes: ['👟 A note line.'],
    },
    sport: SOCCER_SHAPED,
    help: SOCCER_HELP,
    momentKey: `centre|${s.key}`,
  };
}

export function toySeason(row: ToyRow): DerivedSeason {
  const s = deriveSeason(TOY, row, null);
  if (!s) throw new Error(`seasonCentreToy: the ${row.mode} row did not derive`);
  return s;
}
