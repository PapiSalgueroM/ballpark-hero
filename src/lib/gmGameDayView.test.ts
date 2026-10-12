/**
 * Round 1307: every word and number on the Game Day tile, held to the law.
 *
 * The finals are real ones: the quick path's own for 600 decided fixtures
 * (three chances, both winners), read from both sides. Nothing here is a
 * snapshot: each string is compared with what the law's own function says
 * for the story `gameStory` tells, and each number with a sum this file
 * does itself.
 */
import { describe, it, expect } from 'vitest';
import { fixtureLine, gameDayClock, gameDayView, logChips, standingLine } from './gmGameDayView';
import { gameStory } from './gmGameDay';
import { makeGmLastGame, quickGame, type GmLastGame } from './gmGameScore';
import { NFL_SCORE_LAW } from './gameLaws/nflScore';
import { NFL_GAME_DAY, NFL_MAX_SCORE, nflShapeWords } from './gameLaws/nflGameDay';
import { NFL_STORY_LAW, nflClockLabel } from './gameLaws/nfl';

const NAMES: Record<string, string> = { SEA: 'Seahawks', ARI: 'Cardinals' };
const name = (id: string) => NAMES[id] ?? id;

function finals(): GmLastGame[] {
  const out: GmLastGame[] = [];
  for (let i = 0; i < 600; i += 1) {
    const homeWon = i % 2 === 0;
    const pHome = [0.3, 0.5, 0.7][i % 3];
    const told = quickGame(NFL_SCORE_LAW, { key: `2026|w${1 + (i % 17)}|SEA|ARI|view-${i}`, home: 'SEA', away: 'ARI', decided: { homeWon, pHome } });
    const last = told && makeGmLastGame(told, `w${1 + (i % 17)}`);
    if (last) out.push(last);
  }
  return out;
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('gameDayView', () => {
  const games = finals();

  it('has finals to read: the law told every one of the 600', () => {
    expect(games.length).toBe(600);
  });

  it('prints the saved final from his side, and the periods add up to it, from both sides', () => {
    for (const g of games) {
      for (const club of ['SEA', 'ARI']) {
        const v = gameDayView(NFL_GAME_DAY, g, club, name);
        const home = club === g.home;
        expect(v.us).toBe(club);
        expect(v.them).toBe(home ? g.away : g.home);
        expect(v.home).toBe(home);
        expect(v.final).toEqual({ us: home ? g.homeScore : g.awayScore, them: home ? g.awayScore : g.homeScore });
        expect(v.won).toBe(g.winner === club);
        expect(v.where).toBe(g.where);
        expect(v.line).not.toBeNull();
        expect(v.line!.names).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
        expect(sum(v.line!.us)).toBe(v.final.us);
        expect(sum(v.line!.them)).toBe(v.final.them);
      }
    }
  });

  it('every sentence is the law\'s own for the story the told path tells', () => {
    const shapes = new Map<string, number>();
    let plays = 0;
    for (const g of games) {
      const v = gameDayView(NFL_GAME_DAY, g, 'SEA', name);
      const story = gameStory(NFL_GAME_DAY, g, g.home === 'SEA' ? 'home' : 'away')!;
      shapes.set(story.shape, (shapes.get(story.shape) ?? 0) + 1);
      const winner = v.won ? 'Seahawks' : 'Cardinals';
      const loser = v.won ? 'Cardinals' : 'Seahawks';
      expect(v.shape).toBe(nflShapeWords(story.shape, winner, loser));
      expect(v.game).toEqual(story.game);
      /* one to three plays, in the order of the clock, one of them the go ahead that stood */
      expect(v.deciding.length).toBeGreaterThanOrEqual(1);
      expect(v.deciding.length).toBeLessThanOrEqual(3);
      expect(v.deciding.filter(p => p.decided).length).toBe(1);
      const ordered = [...story.deciding].sort((a, b) => a.min - b.min);
      expect(v.deciding.map(p => p.clock)).toEqual(ordered.map(e => nflClockLabel(e.min)));
      ordered.forEach((e, i) => {
        plays += 1;
        expect(v.deciding[i].text).toBe(NFL_STORY_LAW.line(e, e.side === 'us' ? 'Seahawks' : 'Cardinals'));
        expect(v.deciding[i].decided).toBe(e === story.goAhead);
        /* the score after it, his club first, summed here from the game's own plays up to that minute */
        let us = 0, them = 0;
        for (const x of story.game.events) if (x.min <= e.min) { if (x.side === 'us') us += x.pts ?? 0; else them += x.pts ?? 0; }
        expect(v.deciding[i].after).toBe(`${us}-${them}`);
      });
      /* the go ahead that stood left the winner in front */
      const [a, b] = v.deciding.find(p => p.decided)!.after.split('-').map(Number);
      expect(v.won ? a > b : b > a).toBe(true);
    }
    console.log(`gmGameDayView: shapes over 600 finals: ${[...shapes].map(([k, n]) => `${k} ${n}`).join(', ')}; ${plays} deciding plays read`);
    for (const s of ['rout', 'comeback', 'late', 'wire', 'trade']) expect(shapes.get(s) ?? 0).toBeGreaterThan(0);
  });

  it('no line of a play or a shape holds a quotation mark or names anybody but the two clubs', () => {
    for (const g of games) {
      const v = gameDayView(NFL_GAME_DAY, g, 'ARI', id => `<${id}>`);
      for (const text of [v.shape!, ...v.deciding.map(p => p.text)]) {
        expect(text).not.toMatch(/["“”]/);
        expect(text.replace(/<SEA>|<ARI>/g, '')).not.toMatch(/[<>]/);
        expect(text).toMatch(/<SEA>|<ARI>/);
      }
    }
  });

  it('a final the law will not tell shows the final alone', () => {
    const over: GmLastGame = { v: 1, key: 'over', where: 'w2', home: 'SEA', away: 'ARI', homeScore: NFL_MAX_SCORE + 1, awayScore: 10, winner: 'SEA' };
    const v = gameDayView(NFL_GAME_DAY, over, 'ARI', name);
    expect(v.final).toEqual({ us: 10, them: NFL_MAX_SCORE + 1 });
    expect(v.won).toBe(false);
    expect(v.line).toBeNull();
    expect(v.shape).toBeNull();
    expect(v.deciding).toEqual([]);
    expect(v.game).toBeNull();
  });
});

describe('the fixed patterns', () => {
  it('standingLine says his seed of the table, or that he is outside, and nothing about who goes through', () => {
    expect(standingLine({ table: 'AFC', seed: 1, seeds: 7 })).toBe('AFC: 1st seed of 7 as it stands.');
    expect(standingLine({ table: 'AFC', seed: 2, seeds: 7 })).toBe('AFC: 2nd seed of 7 as it stands.');
    expect(standingLine({ table: 'NFC', seed: 3, seeds: 7 })).toBe('NFC: 3rd seed of 7 as it stands.');
    expect(standingLine({ table: 'NFC', seed: 7, seeds: 7 })).toBe('NFC: 7th seed of 7 as it stands.');
    expect(standingLine({ table: 'East', seed: 11, seeds: 12 })).toBe('East: 11th seed of 12 as it stands.');
    expect(standingLine({ table: 'NFC', seed: null, seeds: 7 })).toBe('NFC: outside the 7 seeds as it stands.');
    for (const seed of [1, 4, 7, null]) expect(standingLine({ table: 'AFC', seed, seeds: 7 })).not.toMatch(/go through|qualif|clinch|top 7/i);
  });

  it('fixtureLine and logChips read as written', () => {
    expect(fixtureLine({ label: 'Titans', home: false })).toBe('at Titans');
    expect(fixtureLine({ label: 'Titans', home: true })).toBe('home to Titans');
    const log: GmLastGame[] = [
      { v: 1, key: 'a', where: 'w1', home: 'SEA', away: 'ARI', homeScore: 27, awayScore: 20, winner: 'SEA' },
      { v: 1, key: 'b', where: 'w2', home: 'ARI', away: 'SEA', homeScore: 24, awayScore: 13, winner: 'ARI' },
    ];
    expect(logChips(log, 'SEA')).toEqual([
      { key: 'a', where: 'w1', won: true, text: 'W 27-20' },
      { key: 'b', where: 'w2', won: false, text: 'L 13-24' },
    ]);
    expect(logChips(log, 'ARI').map(c => c.text)).toEqual(['L 20-27', 'W 24-13']);
    expect(logChips([], 'SEA')).toEqual([]);
  });

  it('gameDayClock is the law\'s clock, and a play is told about the club that made it', () => {
    const clock = gameDayClock(NFL_GAME_DAY, n => n.slice(0, 3).toUpperCase());
    const c = NFL_STORY_LAW.clock;
    expect(clock.length).toBe(c.length);
    expect(clock.label(16)).toBe(c.label(16));
    expect([clock.start, clock.end, clock.endShort, clock.labelClass]).toEqual([c.start, c.end, c.endShort, c.labelClass]);
    expect(clock.short!('Seahawks')).toBe('SEA');
    const td = { min: 20, kind: 'td', side: 'us' as const, pts: 7 };
    expect(clock.words(td, 'Seahawks', 'Cardinals')).toBe(NFL_STORY_LAW.line(td, 'Seahawks'));
    expect(clock.words({ ...td, side: 'them' }, 'Seahawks', 'Cardinals')).toBe(NFL_STORY_LAW.line(td, 'Cardinals'));
    expect(gameDayClock(NFL_GAME_DAY).short).toBeUndefined();
  });
});
