/* Round 1308: the NFL front office's bind to a postseason played a round at
   a time (src/lib/frontOfficePostseason.ts). Played a round at a time with
   `nflPlayTie`, the bracket IS the one press postseason (runPlayoffs, then
   every game told by the law under its round's name): the same games, the
   same told finals, the same log entries key for key, the same records after
   and the generator left in the same place, with the desk's edges and
   without. scripts/simGmGameDay.mjs sections 11 to 13 hold the same over the
   whole fleet. */
import { describe, expect, it } from 'vitest';
import { conferenceSeeds, initLeague, runPlayoffs, simGame, type GmGame, type LeagueState, type PlayoffRound } from '@/lib/frontOffice';
import { nflGameKey, nflTell } from '@/lib/frontOfficeGameDay';
import { NFL_POSTSEASON, nflPlayTie, nflRoundsOf } from '@/lib/frontOfficePostseason';
import { bracketChampion, openBracket, playBracketAll, playBracketWeek, type GmBracketSave } from '@/lib/gmBracket';
import type { GmLastGame } from '@/lib/gmGameScore';
import { NFL_BRACKET } from '@/data/gmBrackets/nfl';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** A seeded league played to the end of Week 17, every game as the engine made it. */
function season(seed: number): LeagueState {
  const rng = lehmer(seed);
  const lg = initLeague(rng);
  for (let w = 1; w <= 17; w += 1) { for (const g of lg.schedule[w - 1]) simGame(g, lg.teams, rng); if (w < 17) lg.week += 1; }
  return lg;
}
const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const records = (lg: LeagueState) => Object.keys(lg.teams).sort().map(a => `${a} ${lg.teams[a].wins}-${lg.teams[a].losses}`).join(',');
/** A desk's strength points for a few clubs, made up here: the bind must hand them to the game and to the telling alike. */
const edgesOf = (lg: LeagueState): Record<string, number> => Object.fromEntries(Object.keys(lg.teams).sort().filter((_, i) => i % 5 === 0).map((a, i) => [a, i % 2 ? -1.5 : 2.5]));

/** The one press path: runPlayoffs on a copy, then every game told under its round's name, as the board does it. */
function onePress(lg0: LeagueState, seed: number, edges?: Record<string, number>) {
  const lg = copy(lg0);
  const rng = lehmer(seed);
  const { rounds, champion } = runPlayoffs(lg.teams, rng, edges);
  const told = rounds.map(r => ({ name: r.name, told: r.games.map(g => nflTell(g, lg.teams, lg.season, r.name, edges)) }));
  const toldRounds: PlayoffRound[] = told.map(r => ({ name: r.name, games: r.told.map(t => t.game) }));
  return { lg, rounds, toldRounds, champion, lasts: told.flatMap(r => r.told.map(t => t.last)), next: rng() };
}

/** The bracket path: four presses, the save through JSON between them, or all at once. */
function bracketPath(lg0: LeagueState, seed: number, mode: 'weeks' | 'all', edges?: Record<string, number>) {
  const lg = copy(lg0);
  const rng = lehmer(seed);
  const sink: GmLastGame[] = [];
  const play = nflPlayTie(lg.teams, rng, lg.season, edges, sink);
  let save: GmBracketSave = openBracket(NFL_BRACKET, lg.season, NFL_POSTSEASON.seeds(lg));
  const afterPress: string[] = [];
  if (mode === 'all') save = playBracketAll(NFL_BRACKET, save, play);
  else for (let press = 0; press < 4; press += 1) { save = copy(playBracketWeek(NFL_BRACKET, save, play)); afterPress.push(records(lg)); }
  return { lg, save, sink, afterPress, champion: bracketChampion(NFL_BRACKET, save), next: rng() };
}

describe('NFL_POSTSEASON', () => {
  const lg = season(1308);
  it('is the data\'s bracket from 2020 on, the engine\'s own seeds, and Week 18', () => {
    expect(NFL_POSTSEASON.formatFor(2026)).toBe(NFL_BRACKET);
    expect(NFL_POSTSEASON.formatFor(2019)).toBeNull();
    expect(NFL_POSTSEASON.bracketPeriod).toBe(18);
    expect(NFL_POSTSEASON.seeds(lg)).toEqual([...conferenceSeeds(lg.teams, 'AFC'), ...conferenceSeeds(lg.teams, 'NFC')]);
  });

  it('accepts the engine\'s seeds and refuses a list the league could not have made', () => {
    const seeds = NFL_POSTSEASON.seeds(lg);
    expect(NFL_POSTSEASON.seedsOk(seeds, lg)).toBe(true);
    const swapped = [...seeds.slice(7), ...seeds.slice(0, 7)];
    const mixed = [seeds[7], ...seeds.slice(1, 7), seeds[0], ...seeds.slice(8)];
    /* the conferences swapped or mixed, thirteen, a club twice, a word that is no club, and fifteen with a club the engine left out */
    const outsider = Object.keys(lg.teams).find(a => !seeds.includes(a))!;
    const bad = [swapped, mixed, seeds.slice(0, 13), [...seeds.slice(0, 13), seeds[0]], [...seeds.slice(0, 13), 'constructor'], [...seeds.slice(0, 13), 'NOPE'], [...seeds, outsider]];
    for (const s of bad) expect(NFL_POSTSEASON.seedsOk(s, lg), s.join(',')).toBe(false);
    const isClub = NFL_POSTSEASON.isClub(lg);
    expect(isClub(seeds[0])).toBe(true);
    expect(isClub('constructor')).toBe(false);
    expect(isClub('NOPE')).toBe(false);
  });
});

describe('nflPlayTie and nflRoundsOf: the bracket path is the one press path', () => {
  for (const [seed, withEdges] of [[1308, false], [1309, true], [4242, false], [77, true]] as const) {
    it(`season ${seed}${withEdges ? ', with the desk\'s edges' : ''}: game for game, key for key, draw for draw`, () => {
      const lg = season(seed);
      const regular = records(lg);
      const edges = withEdges ? edgesOf(lg) : undefined;
      const one = onePress(lg, seed + 1, edges);
      for (const mode of ['weeks', 'all'] as const) {
        const b = bracketPath(lg, seed + 1, mode, edges);
        /* the recap's rounds, told: the very objects the one press path saves, name for name and game for game */
        expect(JSON.stringify(nflRoundsOf(NFL_BRACKET, b.save)), mode).toBe(JSON.stringify(one.toldRounds));
        expect(b.champion).toBe(one.champion);
        /* the sink holds every game in play order as the log entry the one press path makes, keys and all */
        expect(b.sink, mode).toEqual(one.lasts);
        expect(b.sink.map(x => x.key)).toEqual(one.rounds.flatMap(r => r.games.map(g => nflGameKey(lg.season, r.name, g))));
        /* the generator is left where the engine leaves it, and no record moves, after any press */
        expect(b.next).toBe(one.next);
        expect(records(b.lg)).toBe(regular);
        for (const after of b.afterPress) expect(after).toBe(regular);
      }
    });
  }

  it('names the seven rounds as runPlayoffs does, in its order', () => {
    const lg = season(9);
    const one = onePress(lg, 10);
    const b = bracketPath(lg, 10, 'all');
    const names = ['AFC Wild Card', 'NFC Wild Card', 'AFC Divisional', 'NFC Divisional', 'AFC Championship', 'NFC Championship', 'Super Bowl'];
    expect(one.rounds.map(r => r.name)).toEqual(names);
    expect(nflRoundsOf(NFL_BRACKET, b.save).map(r => r.name)).toEqual(names);
    expect(nflRoundsOf(NFL_BRACKET, b.save).map(r => r.games.length)).toEqual([3, 3, 2, 2, 1, 1, 1]);
    expect(nflRoundsOf(NFL_BRACKET, b.save).every(r => r.games.every((g: GmGame) => g.week === 0))).toBe(true);
  });

  it('a bracket part played gives the rounds played so far, and an unplayed one none', () => {
    const lg = season(31);
    const open = openBracket(NFL_BRACKET, lg.season, NFL_POSTSEASON.seeds(lg));
    expect(nflRoundsOf(NFL_BRACKET, open)).toEqual([]);
    const sink: GmLastGame[] = [];
    const one = playBracketWeek(NFL_BRACKET, open, nflPlayTie(copy(lg).teams, lehmer(5), lg.season, undefined, sink));
    expect(nflRoundsOf(NFL_BRACKET, one).map(r => r.name)).toEqual(['AFC Wild Card', 'NFC Wild Card']);
    expect(sink.map(x => x.where)).toEqual(['AFC Wild Card', 'AFC Wild Card', 'AFC Wild Card', 'NFC Wild Card', 'NFC Wild Card', 'NFC Wild Card']);
  });
});
