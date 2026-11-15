import { NHL_TEAMS } from '@/data/conquestDataNhl';
import { NHL_ALIGNMENTS, NHL_CLOCK, NHL_FORMULA_84, NHL_SCORING } from '@/data/usSeasonLedgerNhl';
import type { UsShape } from '@/data/usLeagueShape';
import { keyedRng } from '@/lib/keyedRng';
import { shuffled } from '@/lib/keyedShuffle';
import { NHL_CAREER_PLAYOFF_RESULTS } from '@/lib/nhlMyCareer';
import { slateOf } from '@/lib/usSeasonShape';
import type { DerivedGame, DerivedSeason, SeasonEvent } from './core';
import { poissonDraw } from './law';
import type { NhlSeasonViewer, UsSeasonCtx } from './us';

const UNNAMED = 'another team';
const MINUTES = NHL_CLOCK.periods * NHL_CLOCK.minutes;
const MAX_POINTS_PER_GAME = 5;
const MAX_SHOTS = 70;

type GameFixture = Pick<DerivedGame, 'opp' | 'home'>;

function deal(team: string, year: number, eraId: string | undefined, length: number, rng: () => number) {
  const alignment = NHL_ALIGNMENTS.find(row => row.from <= year && (row.to === null || row.to >= year));
  const divisions = alignment?.divisions ?? [];
  const all = new Set(divisions.flatMap(d => d.teams));
  const division = divisions.find(d => d.teams.includes(team));
  const formula = NHL_FORMULA_84;
  if ((eraId === undefined || eraId === 'now') && year >= formula.from && length === formula.games
      && division?.conf && all.size === NHL_TEAMS.length && NHL_TEAMS.every(club => all.has(club.id))) {
    const rivals = division.teams.filter(id => id !== team);
    const conference = divisions.filter(d => d !== division && d.conf === division.conf).flatMap(d => d.teams);
    const other = divisions.filter(d => d.conf !== division.conf).flatMap(d => d.teams);
    if (rivals.length === formula.division.opponents && conference.length === formula.conference.opponents && other.length === formula.other.opponents) {
      const order = [team, ...rivals, ...conference, ...other];
      const extraHomes = new Set(shuffled(conference, rng).slice(0, formula.conference.twiceAtHome));
      const fixtures: GameFixture[] = order.slice(1).flatMap((id, index) => {
        const [games, homes] = rivals.includes(id) ? [formula.division.games, formula.division.home]
          : conference.includes(id) ? [formula.conference.games, extraHomes.has(id) ? 2 : 1]
            : [formula.other.games, formula.other.home];
        return Array.from({ length: games }, (_, i) => ({ opp: index + 1, home: i < homes }));
      });
      const shape: UsShape = {
        formula: { kind: 'nhl84' },
        divisions: divisions.flatMap(d => d.conf ? [{ ...d, conf: d.conf }] : []),
      };
      return { fixtures: shuffled(fixtures, rng), shape, order, divSlots: rivals.length, confSlots: rivals.length + conference.length };
    }
  }
  const fixtures = Array.from({ length }, (_, i) => ({ opp: i + 1, home: i < Math.floor(length / 2) }));
  return { fixtures: shuffled(fixtures, rng), shape: null, order: [], divSlots: 0, confSlots: 0 };
}

function whole(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function rate(saves: number, shots: number): string {
  return shots ? (saves / shots).toFixed(3) : '-';
}

/* The save only has a rounded SV%. The shots and saves below show one
 * coherent reconstruction of that rate and the displayed goals against. */
function fitGoalieShots(games: DerivedGame[], savedRate: number, rng: () => number): boolean {
  const starts = games.filter(g => g.played);
  const goals = starts.reduce((n, g) => n + g.them, 0);
  const minShots = goals + starts.length;
  const maxShots = starts.length * MAX_SHOTS;
  const saved = savedRate.toFixed(3);
  const shots = Math.min(maxShots, Math.max(minShots, Math.round(goals / (1 - savedRate))));
  if (!goals || rate(shots - goals, shots) !== saved) return false;

  const weights = starts.map(() => 0.72 + 0.56 * rng());
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  const remaining = shots - minShots;
  const fractions = weights.map(weight => remaining * weight / weightTotal);
  const assigned = fractions.map(value => Math.floor(value));
  let extra = remaining - assigned.reduce((total, value) => total + value, 0);
  const sorted = fractions.map((value, i) => ({ i, rest: value - assigned[i] })).sort((a, b) => b.rest - a.rest);
  for (const { i } of sorted) {
    if (extra === 0) break;
    assigned[i]++;
    extra--;
  }
  starts.forEach((game, index) => {
    game.line.saves = 1 + assigned[index];
    game.line.shots = game.line.saves + game.them;
  });
  return true;
}

function goalsFor(game: DerivedGame, rng: () => number): SeasonEvent[] {
  const goal = (side: SeasonEvent['side'], kind: string): SeasonEvent =>
    ({ side, kind, pts: 1, min: 1 + Math.floor(rng() * MINUTES) });
  return [
    ...Array.from({ length: game.us }, (_, i) => goal('us', i < (game.line.goals ?? 0) ? 'scored'
      : i < (game.line.points ?? 0) ? 'assisted' : 'goal')),
    ...Array.from({ length: game.them }, () => goal('them', 'goal')),
  ].sort((a, b) => a.min - b.min);
}

function scoreGames(fixtures: readonly GameFixture[], lines: Record<string, number>[], played: Set<number>, wins: Set<number>, scoring: number, rng: () => number) {
  return fixtures.map(({ opp, home }, i): DerivedGame => {
    const won = wins.has(i);
    const below = Math.min(6, poissonDraw(scoring - 0.65, rng));
    const margin = rng() < 0.66 ? 1 : rng() < 0.82 ? 2 : 3;
    const personalFloor = lines[i].points ?? 0;
    const us = Math.max(personalFloor, won ? below + margin : below);
    const them = won ? below : Math.max(us + 1, below + margin);
    return {
      md: i + 1, opp, home, us, them, fixed: false, played: played.has(i),
      started: played.has(i), line: { ...lines[i] }, events: [],
    };
  });
}

function percentLine(so: Record<string, number>) {
  return rate(so.saves ?? 0, so.shots ?? 0);
}

export const NHL_SEASON: NhlSeasonViewer = {
  slug: 'nhl',
  league: 'NHL',
  seasonLabel: year => year + '-' + String(year + 1).slice(-2),
  results: NHL_CAREER_PLAYOFF_RESULTS,
  prepare(career, row, labelOf) {
    if (row.slate !== undefined && typeof row.slate !== 'number') return null;
    const length = slateOf('nhl', { slate: row.slate as number | undefined });
    const goalie = career.pos === 'G';
    if (!whole(length, NHL_FORMULA_84.games) || length === 0 || !whole(row.games, length) || row.games === 0
        || row.teamResult === 'SUSPENDED' || !Number.isInteger(row.year) || typeof row.team !== 'string' || !row.team) return null;
    const goals = row.goals, assists = row.assists, goalieWins = row.wins, savePercentage = row.svpct;
    if (goalie ? !whole(goalieWins, row.games) || typeof savePercentage !== 'number' || !Number.isFinite(savePercentage)
      || savePercentage <= 0 || savePercentage >= 1
      : !whole(goals, row.games * MAX_POINTS_PER_GAME) || !whole(assists, row.games * MAX_POINTS_PER_GAME)
        || goals + assists > row.games * MAX_POINTS_PER_GAME || (row.points !== undefined && row.points !== goals + assists)) return null;
    const key = JSON.stringify(['nhl-center', career.name, career.eraId, career.pos, row.year, row.team, length, row.games,
      row.teamResult, goalie ? [goalieWins, savePercentage] : [goals, assists]]);
    const rng = keyedRng(key);
    const { fixtures, order, shape, divSlots, confSlots } = deal(row.team, row.year, career.eraId, length, rng);
    const indices = shuffled(Array.from({ length }, (_, i) => i), rng);
    const starts = indices.slice(0, row.games);
    const played = new Set(starts);
    const lines = fixtures.map((): Record<string, number> => ({}));
    const depth = NHL_CAREER_PLAYOFF_RESULTS.indexOf(row.teamResult);
    const target = Math.round(length * ((depth < 0 ? 0.43 : 0.54 + 0.028 * depth) + (rng() - 0.5) * 0.08));
    let wins: Set<number>;
    if (goalie && typeof goalieWins === 'number') {
      const winOut = Math.max(0, target - goalieWins);
      wins = new Set([...starts.slice(0, goalieWins), ...indices.slice(row.games, row.games + winOut)]);
      for (const i of starts) lines[i].goalieWin = Number(wins.has(i));
    } else {
      wins = new Set(shuffled(indices, rng).slice(0, target));
      const slots = shuffled(starts.flatMap(i => Array<number>(MAX_POINTS_PER_GAME).fill(i)), rng);
      for (let n = 0; n < Number(goals) + Number(assists); n++) {
        const line = lines[slots[n]];
        const field = n < Number(goals) ? 'goals' : 'assists';
        line[field] = (line[field] ?? 0) + 1;
      }
      for (const i of starts) {
        const line = lines[i];
        line.goals ??= 0;
        line.assists ??= 0;
        line.points = line.goals + line.assists;
      }
    }
    const scoring = (NHL_SCORING[career.eraId ?? 'now'] ?? NHL_SCORING.now).inPlay;
    let games = scoreGames(fixtures, lines, played, wins, scoring, rng);
    if (goalie && typeof savePercentage === 'number') {
      let matched = fitGoalieShots(games, savePercentage, rng);
      for (let attempt = 0; attempt < 3 && !matched; attempt++) {
        games = scoreGames(fixtures, lines, played, wins, scoring, rng);
        matched = fitGoalieShots(games, savePercentage, rng);
      }
      if (!matched) return null;
    }
    for (const game of games) game.events = goalsFor(game, rng);
    const teamLabel = labelOf(row.team, career.eraId);
    const names = shape ? order.map(id => labelOf(id, career.eraId)) : [teamLabel, ...Array<string>(length).fill(UNNAMED)];
    const ctx: UsSeasonCtx = {
      name: career.name, pos: career.pos, eraId: career.eraId, team: row.team, teamLabel, year: row.year, length,
      shape, order, names, divSlots, confSlots,
    };
    const season: DerivedSeason = {
      key, mode: 'record', rule: null, teams: names.length, games,
      labels: names.map((name, i) => ({ name, named: !!shape || i === 0, key: shape ? order[i] : i === 0 ? row.team : 'u' + i })),
      rounds: [], bucket: null, clinch: null, target: { kind: 'none' }, attempt: 0, repairs: 0,
    };
    return { ctx, season };
  },
  view: {
    words: { round: 'Game', title: 'Season Center', unnamed: UNNAMED },
    copy: {
      start: '▶ Drop the puck', lastBadge: 'LAST GAME', lastHead: 'Last game', lastBody: () => 'The last game of the regular season.',
      best: 'Best game', bestSoFar: 'Best so far', scope: 'Regular season. Season totals come from your save.',
      soFarHead: 'Season so far', tie: 'T', list: 'Schedule', side: 'Record',
    },
    clock: { length: MINUTES, label: min => 'P' + Math.min(NHL_CLOCK.periods, Math.floor(Math.max(0, min - 1) / NHL_CLOCK.minutes) + 1)
      + ' ' + (min === 0 ? 0 : (min - 1) % NHL_CLOCK.minutes + 1) + ':00', start: 'Puck drop.', end: 'Final', endShort: 'FINAL' },
    eventWords: (event, us, them) => event.kind === 'scored' ? 'You score.'
      : event.kind === 'assisted' ? 'You assist on a goal for ' + us + '.'
        : (event.side === 'us' ? us : them) + ' score.',
    missed: () => 'Did not play',
    lineOf: (game, pos) => pos === 'G' ? [game.line.goalieWin ? 'Goalie win' : 'Goalie loss', game.line.saves + '/' + game.line.shots + ' saves']
      : [game.line.goals + ' G', game.line.assists + ' A'],
    markOf: (game, pos) => pos === 'G' ? (game.line.saves ?? 0) + (game.line.goalieWin ?? 0) * 5 : game.line.points ?? 0,
    markChip: (game, pos) => pos === 'G' ? rate(game.line.saves, game.line.shots) + ' SV%' : game.line.points + ' PTS',
    markText: (game, pos) => pos === 'G' ? game.line.saves + ' saves' : game.line.points + ' points',
    soFar: (so, pos) => pos === 'G' ? [['Starts', String(so.apps)], ['Wins', String(so.goalieWin ?? 0)], ['SV%', percentLine(so)]]
      : [['Played', String(so.apps)], ['Goals', String(so.goals ?? 0)], ['Assists', String(so.assists ?? 0)], ['Points', String(so.points ?? 0)]],
    half: (so, pos) => pos === 'G' ? 'First half · ' + so.apps + ' starts · ' + (so.goalieWin ?? 0) + ' wins · ' + percentLine(so) + ' SV%'
      : 'First half · ' + so.apps + ' appearances · ' + (so.points ?? 0) + ' points',
    tileLabels: { 'Save percentage': 'SV%' },
    help: (named, opponent) => ({
      title: 'How the Season Center works',
      intro: ['Watch the regular season one game at a time. Scores, playing dates and individual game lines are simulated from your saved totals.',
        named ? 'The opponents and home and away counts follow the verified schedule formula.' : 'Your saved schedule length is used. Opponents are unnamed.'],
      controls: 'Drop the puck, pick a viewing speed, or skip to the season review. Open a completed fixture for its match report.',
      examples: [
        { head: 'A skater’s line', body: 'In a simulated 4 to 2 win over ' + (opponent ?? UNNAMED) + ', one goal and two assists gives you three points.' },
        { head: 'A goalie’s line', body: 'If you make 27 saves on 30 shots, the report shows .900. Your saved save percentage is matched over all reconstructed shots, so it is weighted by shots.' },
      ],
      footnote: 'Game scores, shots and saves are recreated. The regular-season totals stay on your career and watching never plays the season again.',
    }),
  },
};
