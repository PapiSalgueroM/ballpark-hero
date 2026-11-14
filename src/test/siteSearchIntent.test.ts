import { describe, expect, it } from 'vitest';
import { browseAll, searchSite } from '@/lib/siteSearch';

const paths = (phrase: string) => searchSite(phrase).map(result => result.game.path);

describe('game search for common intent phrases', () => {
  it.each([
    ['manage an nfl team', '/front-office'],
    ['nfl management', '/front-office'],
    ['manage an afl team', '/aussie-rules-manager'],
    ['manage a rugby league team', '/nrl-team-manager'],
    ['build a stadium', '/stadium-tycoon'],
    ['stadium builder', '/stadium-tycoon'],
    ['soccer career mode', '/soccer-career'],
    ['basketball career mode', '/nba-my-career'],
  ])('finds %s without another sport leaking in', (phrase, path) => {
    expect(paths(phrase)).toEqual([path]);
    expect(searchSite(phrase.toUpperCase() + '?')[0].game.path).toBe(path);
  });

  it('finds the full and correct sport for American football', () => {
    const result = searchSite('American football');
    const expected = browseAll().filter(row => row.category === 'Pro Football');
    expect(expected.length).toBeGreaterThan(10);
    expect(result.map(row => row.game.path).sort()).toEqual(expected.map(row => row.game.path).sort());
  });

  it('suggests the player careers for a generic career intent, in the same order with a cap', () => {
    const expected = ['/soccer-career', '/nba-my-career', '/nfl-my-career', '/mlb-my-career', '/nhl-my-career'];
    for (const phrase of ['career mode', 'career sims']) {
      expect(paths(phrase)).toEqual(expected);
      expect(searchSite(phrase, { limit: 2 }).map(row => row.game.path)).toEqual(expected.slice(0, 2));
    }
  });

  it('keeps normal title and typo results and misses unrelated or mixed-code phrasing', () => {
    expect(searchSite('NFL Front Office')[0]).toMatchObject({ game: { path: '/front-office' }, matchedOn: 'label' });
    expect(searchSite('stadum tycoon')[0].game.path).toBe('/stadium-tycoon');
    for (const phrase of ['stadium builder fixtures', 'American football rugby league', 'tennis career mode', '*(']) {
      expect(paths(phrase)).toEqual([]);
    }
    expect(paths('')).toEqual(browseAll().map(row => row.game.path));
  });
});
