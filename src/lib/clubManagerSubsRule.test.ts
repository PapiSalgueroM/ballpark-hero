import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CM_SUBS_FIVE_FROM, CM_SUBS_LAW_FROM, CM_SUBS_PARTIAL, subsLeagueBase, subsRuleFor } from '@/lib/clubManagerSubsRule';
import { ERA_LEAGUES, REAL_LEAGUES } from '@/lib/clubManager';

const ledger = JSON.parse(readFileSync(path.join(process.cwd(), 'scripts/data/cmSubsRuleSources.json'), 'utf8')) as {
  rows: { league: string; fiveFrom: number }[];
  partial: { leagues: string[] };
};

/* Round 1331: the substitution rule by league and season, and its ledger. */

const FIVE = { subs: 5, stops: 3, partial: false };
const FIVE_IDS = CM_SUBS_FIVE_FROM.map(r => r[0]);
const THREE = { subs: 3, stops: null, partial: false };

describe('subsRuleFor', () => {
  it('reads every real league id and every era league id', () => {
    for (const l of REAL_LEAGUES) {
      const base = subsLeagueBase(l.id);
      expect(base).toBe(l.id);
      const known = FIVE_IDS.includes(base) || CM_SUBS_PARTIAL.includes(base);
      expect(known, l.id).toBe(true);
    }
    for (const leagues of Object.values(ERA_LEAGUES)) {
      for (const l of leagues) {
        const base = subsLeagueBase(l.id);
        expect(REAL_LEAGUES.some(r => r.id === base), l.id).toBe(true);
        expect(FIVE_IDS.includes(base), l.id).toBe(true);
      }
    }
  });

  it('plays three with no limit in 2005 and 2015 everywhere', () => {
    for (const id of [...FIVE_IDS, ...CM_SUBS_PARTIAL]) {
      expect(subsRuleFor(id, 2005)).toEqual(THREE);
      expect(subsRuleFor(id, 2015)).toEqual(THREE);
      expect(subsRuleFor(id, 2019)).toEqual(THREE);
    }
  });

  it('gives the big four five from 2020-21 and the Premier League three until 2022-23', () => {
    for (const id of ['laliga', 'seriea', 'bundesliga', 'ligue1']) expect(subsRuleFor(id, 2020)).toEqual(FIVE);
    expect(subsRuleFor('premier', 2020)).toEqual(THREE);
    expect(subsRuleFor('premier', 2021)).toEqual(THREE);
    expect(subsRuleFor('premier', 2022)).toEqual(FIVE);
    expect(subsRuleFor('premier', 2026)).toEqual(FIVE);
    expect(subsRuleFor('championship', 2026)).toEqual(FIVE);
  });

  it('keeps partial leagues and unknown ids at three, marked partial from 2020', () => {
    for (const id of CM_SUBS_PARTIAL) {
      expect(subsRuleFor(id, 2026)).toEqual({ subs: 3, stops: null, partial: true });
      expect(FIVE_IDS.includes(id)).toBe(false);
    }
    expect(subsRuleFor('nowhere', 2026).partial).toBe(true);
    expect(subsRuleFor('nowhere', CM_SUBS_LAW_FROM - 1).partial).toBe(false);
  });

  it('names the same rows as its ledger', () => {
    const rows = Object.fromEntries(ledger.rows.map(r => [r.league, r.fiveFrom]));
    expect(rows).toEqual(Object.fromEntries(CM_SUBS_FIVE_FROM));
    expect([...ledger.partial.leagues].sort()).toEqual([...CM_SUBS_PARTIAL].sort());
  });
});
