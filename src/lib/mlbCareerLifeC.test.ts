/* Round 919: MLB life deck C. The words a card shows are computed from the
   effect it applies, and these tests pin the pieces that do that, plus the
   gates the brief asked for (position group, era, role, age). */
import { describe, it, expect } from 'vitest';
import {
  MLB_LIFE_C, applyMlbLifeCFx, mlbLifeCChip, buildMlbLifeCCard, getMlbLifeEventsC,
} from './mlbCareerLifeC';
import { getMlbLifeEventsA } from './mlbCareerLifeA';
import { MLB_ARCHETYPES, startMlbCareer } from './mlbMyCareer';
import type { MlbCareerPos, MlbCareerState } from './mlbMyCareer';

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function career(pos: MlbCareerPos, patch: Partial<MlbCareerState> = {}, seasons = 3, eraId?: string): MlbCareerState {
  const c = startMlbCareer('Test Player', pos, MLB_ARCHETYPES[pos][0], seeded(7), null, eraId);
  for (let i = 0; i < seasons; i++) {
    c.seasons.push({
      year: c.year + i, team: c.team, age: c.age + i, ovr: c.ovr, games: 140,
      awards: [], teamResult: 'Missed October', salary: c.salary,
    });
  }
  c.year += seasons;
  c.age += seasons;
  return Object.assign(c, { morale: 50, fanbase: 50, health: 60, ovr: 75, pot: 92, netWorth: 5 }, patch);
}

const idsFor = (c: MlbCareerState) => getMlbLifeEventsC(c, () => 0.5).map(e => e.id);
const GROUP_IDS = (c: MlbCareerState) => idsFor(c).filter(id => /^mlbC_(sp|rp|c|if|of|dh)_/.test(id));

describe('the catalog', () => {
  it('is 36 cards with unique mlbC_ ids, three options each, and every tag filled', () => {
    expect(MLB_LIFE_C).toHaveLength(36);
    expect(new Set(MLB_LIFE_C.map(d => d.id)).size).toBe(36);
    for (const d of MLB_LIFE_C) {
      expect(d.id.startsWith('mlbC_')).toBe(true);
      expect(d.options).toHaveLength(3);
      expect(d.cooldown).toBeGreaterThan(0);
      expect(['position', 'rookie', 'veteran', 'bench', 'rules']).toContain(d.category);
    }
  });

  it('spends its cards where the brief asked', () => {
    const count = (cat: string) => MLB_LIFE_C.filter(d => d.category === cat).length;
    expect(count('position')).toBe(18);
    expect(count('rookie')).toBe(4);
    expect(count('veteran')).toBe(4);
    expect(count('bench')).toBe(3);
    expect(count('rules')).toBe(7);
  });

  it('carries the tags onto the built card', () => {
    const def = MLB_LIFE_C.find(d => d.id === 'mlbC_rule_optioned')!;
    const ev = buildMlbLifeCCard(def, career('SS'));
    expect(ev.category).toBe('rules');
    expect(ev.cooldown).toBe(2);
    expect(ev.story).toBe('options');
  });

  it('never uses an em or en dash', () => {
    const words = JSON.stringify(MLB_LIFE_C.map(d => [d.title, d.body, d.options])) +
      MLB_LIFE_C.map(d => buildMlbLifeCCard(d, career('SP')).body).join(' ');
    expect(/[\u2013\u2014]/.test(words)).toBe(false);
  });
});

describe('gates', () => {
  it('gives each position group its own three cards and nobody else\'s', () => {
    const want: Record<string, string> = {
      SP: 'sp', RP: 'rp', C: 'c', '1B': 'if', '2B': 'if', '3B': 'if', SS: 'if', LF: 'of', CF: 'of', RF: 'of', DH: 'dh',
    };
    for (const [pos, group] of Object.entries(want)) {
      const ids = GROUP_IDS(career(pos as MlbCareerPos));
      expect(ids).toHaveLength(3);
      for (const id of ids) expect(id.startsWith(`mlbC_${group}_`)).toBe(true);
    }
  });

  it('holds the three batter card for 2020 in a 2004 career', () => {
    expect(idsFor(career('RP', { year: 2010 }, 3, 'y2004'))).not.toContain('mlbC_rp_three_batter');
    expect(idsFor(career('RP', { year: 2019 }, 3, 'y2004'))).not.toContain('mlbC_rp_three_batter');
    expect(idsFor(career('RP', { year: 2020 }, 3, 'y2004'))).toContain('mlbC_rp_three_batter');
    expect(idsFor(career('RP'))).toContain('mlbC_rp_three_batter');
  });

  it('holds deck A\'s pitch clock card for 2023 in a 2004 career', () => {
    const a = (c: MlbCareerState) => getMlbLifeEventsA(c, () => 0.99).map(e => e.id);
    expect(a(career('SS', { year: 2012 }, 3, 'y2004'))).not.toContain('mlbA_pitch_clock');
    expect(a(career('SS', { year: 2022 }, 3, 'y2004'))).not.toContain('mlbA_pitch_clock');
    expect(a(career('SS', { year: 2023 }, 3, 'y2004'))).toContain('mlbA_pitch_clock');
    expect(a(career('SS'))).toContain('mlbA_pitch_clock');
  });

  it('deals the bench cards to a bench player only, and never to a reliever', () => {
    const bench = (c: MlbCareerState) => idsFor(c).filter(id => id.startsWith('mlbC_bench_'));
    expect(bench(career('LF', { role: 'starter' }))).toHaveLength(0);
    expect(bench(career('LF', { role: 'backup' }, 5))).toHaveLength(3);
    expect(bench(career('SP', { role: 'backup' }, 5))).toHaveLength(3);
    expect(bench(career('RP', { role: 'backup' }, 5))).toHaveLength(0);
  });

  it('keeps rookie cards to the first two years and veteran cards to the old', () => {
    const has = (c: MlbCareerState, cat: string) => getMlbLifeEventsC(c, () => 0.5).some(e => e.category === cat);
    expect(has(career('2B', {}, 1), 'rookie')).toBe(true);
    expect(has(career('2B', {}, 4), 'rookie')).toBe(false);
    expect(has(career('2B', { age: 26 }, 4), 'veteran')).toBe(false);
    expect(has(career('2B', { age: 34 }, 10), 'veteran')).toBe(true);
  });

  it('draws nothing from rng', () => {
    const boom = () => { throw new Error('deck C must not draw'); };
    expect(() => getMlbLifeEventsC(career('C'), boom)).not.toThrow();
  });
});

describe('the words are the effect', () => {
  it('reports what really moved after the clamps', () => {
    const c = career('SS', { morale: 98, health: 3, ovr: 80, pot: 81 });
    const line = applyMlbLifeCFx(c, { morale: 5, health: -9, rating: 3 });
    expect(c.morale).toBe(100);
    expect(c.health).toBe(0);
    expect(c.ovr).toBe(82);
    expect(line).toBe('Rating +2 to 82, morale +2, health -3.');
  });

  it('never lowers a rating with a raise, and says nothing when nothing moved', () => {
    const c = career('SS', { ovr: 90, pot: 85 });
    expect(applyMlbLifeCFx(c, { rating: 2 })).toBe('');
    expect(c.ovr).toBe(90);
  });

  it('pays money in the era\'s own dollars', () => {
    const now = career('SP', { netWorth: 1, earnings: 2 });
    expect(applyMlbLifeCFx(now, { earned: 1.2 })).toBe('Earned 1.2M.');
    expect(now.earnings).toBe(3.2);
    expect(now.netWorth).toBe(2.2);
    const old = career('SP', { netWorth: 1, earnings: 2 }, 3, 'y2004');
    expect(applyMlbLifeCFx(old, { earned: 1.2, netWorth: -0.3 })).toBe('Earned 0.52M, net worth -0.13M.');
    expect(old.earnings).toBe(2.52);
    expect(old.netWorth).toBe(1.39);
  });

  it('writes the chip from the same data', () => {
    expect(mlbLifeCChip({ fx: { rating: 2, morale: -3 } })).toBe('rating up, morale down');
    expect(mlbLifeCChip({ fx: { fanbase: 2, netWorth: -0.1 } })).toBe('fans up, money out');
    expect(mlbLifeCChip({ fx: { morale: 3 }, trade: true })).toBe('morale up, new team');
    expect(mlbLifeCChip({ fx: {} })).toBe('no change');
  });

  it('a sure option says exactly what it did, and a gamble names both ways', () => {
    const def = MLB_LIFE_C.find(d => d.id === 'mlbC_rule_arbitration')!;
    const c = career('3B', { contractYears: 2 });
    const ev = buildMlbLifeCCard(def, c);
    expect(ev.options[0].effect).toBe('Could go either way: morale up, money in, or morale down');
    expect(ev.options[1].effect).toBe('Morale up, money in');
    const before = c.earnings;
    const line = ev.options[1].apply(c, () => 0.5);
    expect(line.endsWith('Morale +3, earned 0.6M.')).toBe(true);
    expect(c.morale).toBe(53);
    expect(Math.round((c.earnings - before) * 100) / 100).toBe(0.6);
  });

  it('a trade moves the team inside the era and leaves the contract alone', () => {
    const def = MLB_LIFE_C.find(d => d.id === 'mlbC_bench_out_of_options')!;
    const c = career('LF', { role: 'backup', salary: 2.5, contractYears: 3 }, 5, 'y2004');
    const from = c.team;
    const line = buildMlbLifeCCard(def, c).options[0].apply(c, () => 0.3);
    expect(c.team).not.toBe(from);
    expect(line).toMatch(/Traded to /);
    expect(c.salary).toBe(2.5);
    expect(c.contractYears).toBe(3);
    expect(['MON', 'ANA', 'FLA', 'TBD', 'OAK', 'CLV', 'NYY', 'BOS', 'BAL', 'TOR', 'MIN', 'CHW', 'DET', 'KCR', 'TEX', 'SEA',
      'ATL', 'PHI', 'NYM', 'STL', 'HOU', 'CHC', 'CIN', 'PIT', 'MIL', 'LAD', 'SFG', 'SDP', 'COL', 'ARI']).toContain(c.team);
  });
});
