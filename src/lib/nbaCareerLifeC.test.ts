/* Round 918: NBA life deck C. The words a card shows are computed from the
   effect it applies, and these tests pin the pieces that do that, plus the
   gates the brief asked for (position, era, role, age). */
import { describe, it, expect } from 'vitest';
import {
  NBA_LIFE_C, applyNbaLifeCFx, nbaLifeCChip, buildNbaLifeCCard, getNbaLifeEventsC,
} from './nbaCareerLifeC';
import { NBA_ARCHETYPES, startNbaCareer, nbaEraTeamIds } from './nbaMyCareer';
import type { NbaCareerPos, NbaCareerState } from './nbaMyCareer';

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function career(pos: NbaCareerPos, patch: Partial<NbaCareerState> = {}, seasons = 3, eraId?: string): NbaCareerState {
  const c = startNbaCareer('Test Player', pos, NBA_ARCHETYPES[pos][0], seeded(7), null, eraId);
  for (let i = 0; i < seasons; i++) {
    c.seasons.push({
      year: c.year + i, team: c.team, age: c.age + i, ovr: c.ovr, games: 78,
      ppg: 12, rpg: 4, apg: 3, awards: [], teamResult: 'Missed the playoffs', salary: c.salary,
    });
  }
  return Object.assign(c, { morale: 50, fanbase: 50, health: 60, ovr: 75, pot: 92, netWorth: 5 }, patch);
}

const idsFor = (c: NbaCareerState) => getNbaLifeEventsC(c, () => 0.5).map(e => e.id);
const allNba = (c: NbaCareerState) => { c.seasons[c.seasons.length - 1].awards.push('All-NBA'); return c; };

describe('the catalog', () => {
  it('is 36 cards with unique nbaC_ ids, three options each, and every tag filled', () => {
    expect(NBA_LIFE_C).toHaveLength(36);
    expect(new Set(NBA_LIFE_C.map(d => d.id)).size).toBe(36);
    for (const d of NBA_LIFE_C) {
      expect(d.id.startsWith('nbaC_')).toBe(true);
      expect(d.options).toHaveLength(3);
      expect(d.cooldown).toBeGreaterThan(0);
      expect(['position', 'rookie', 'veteran', 'bench', 'rules']).toContain(d.category);
    }
  });

  it('spends its cards where the brief asked', () => {
    const count = (cat: string) => NBA_LIFE_C.filter(d => d.category === cat).length;
    expect(count('position')).toBe(15);
    expect(count('rookie')).toBe(5);
    expect(count('veteran')).toBe(5);
    expect(count('bench')).toBe(4);
    expect(count('rules')).toBe(7);
  });

  it('carries the tags onto the built card', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_rule_g_league')!;
    const ev = buildNbaLifeCCard(def, career('PG'));
    expect(ev.category).toBe('rules');
    expect(ev.cooldown).toBe(2);
    expect(ev.story).toBe('gLeague');
  });
});

describe('gates', () => {
  it('gives every position exactly its own three cards', () => {
    for (const p of ['PG', 'SG', 'SF', 'PF', 'C'] as NbaCareerPos[]) {
      const ids = idsFor(career(p, { ovr: 80 })).filter(id => /^nbaC_(pg|sg|sf|pf|c)_/.test(id));
      expect(ids).toHaveLength(3);
      for (const id of ids) expect(id.startsWith(`nbaC_${p.toLowerCase()}_`)).toBe(true);
    }
  });

  it('keeps the modern rules out of the 2003-04 era', () => {
    const modernOnly = ['nbaC_rule_g_league', 'nbaC_rule_two_way_kid', 'nbaC_rule_national_tv', 'nbaC_rule_award_games', 'nbaC_sg_shot_diet'];
    const young = { ovr: 74, role: 'backup' as const };
    const star = { ovr: 88, health: 70 };
    const now = [...idsFor(career('SG', young, 2)), ...idsFor(allNba(career('SG', star, 5)))];
    const then = [...idsFor(career('SG', young, 2, 'y2004')), ...idsFor(allNba(career('SG', star, 5, 'y2004')))];
    for (const id of modernOnly) {
      expect(now).toContain(id);
      expect(then).not.toContain(id);
    }
    /* The rule that did exist in 2003-04 stays in both. */
    expect(idsFor(career('SG', { ovr: 80, contractYears: 2 }, 4, 'y2004'))).toContain('nbaC_rule_salary_match');
  });

  it('calls you a star for the national TV rule only after an All-NBA year in the last three', () => {
    const has = (c: NbaCareerState) => idsFor(c).includes('nbaC_rule_national_tv');
    expect(has(career('SG', { ovr: 92 }, 5))).toBe(false);
    expect(has(allNba(career('SG', { ovr: 78 }, 5)))).toBe(true);
    const old = career('SG', { ovr: 92 }, 5);
    old.seasons[0].awards.push('All-NBA');
    expect(has(old)).toBe(false);
    expect(has(allNba(career('SG', { ovr: 92, role: 'backup' }, 5)))).toBe(false);
    /* The edges of the window: three seasons back is in, four back is out. */
    const threeBack = career('SG', { ovr: 78 }, 5);
    threeBack.seasons[2].awards.push('All-NBA');
    expect(has(threeBack)).toBe(true);
    const fourBack = career('SG', { ovr: 78 }, 5);
    fourBack.seasons[1].awards.push('All-NBA');
    expect(has(fourBack)).toBe(false);
  });

  it('holds the G League assignment to the first three seasons', () => {
    expect(idsFor(career('PF', { ovr: 74 }, 3))).toContain('nbaC_rule_g_league');
    expect(idsFor(career('PF', { ovr: 74 }, 4))).not.toContain('nbaC_rule_g_league');
  });

  it('shows bench cards to a backup only, and veteran cards to a veteran only', () => {
    const bench = (ids: string[]) => ids.filter(id => id.startsWith('nbaC_bench_'));
    const vet = (ids: string[]) => ids.filter(id => id.startsWith('nbaC_vet_'));
    expect(bench(idsFor(career('C', { role: 'backup', ovr: 78 })))).toHaveLength(4);
    expect(bench(idsFor(career('C', { role: 'starter', ovr: 78 })))).toHaveLength(0);
    expect(bench(idsFor(career('C', { ovr: 78 })))).toHaveLength(0);
    expect(vet(idsFor(career('C', { age: 33 }, 10)))).toHaveLength(5);
    expect(vet(idsFor(career('C', { age: 26 }, 4)))).toHaveLength(0);
  });

  it('draws nothing from rng', () => {
    let calls = 0;
    getNbaLifeEventsC(career('SF', { age: 33, role: 'backup' }, 10), () => { calls++; return 0.5; });
    expect(calls).toBe(0);
  });
});

describe('the words are the effect', () => {
  it('reports what moved, in order, with the rating it landed on', () => {
    const c = career('PG');
    const line = applyNbaLifeCFx(c, { rating: 2, morale: 5, health: -4 });
    expect(line).toBe('Rating +2 to 77, morale +5, health -4.');
    expect([c.ovr, c.morale, c.health]).toEqual([77, 55, 56]);
  });

  it('reports the clamped move, and says nothing about a stat that could not move', () => {
    const c = career('PG', { morale: 98, fanbase: 100 });
    expect(applyNbaLifeCFx(c, { morale: 7, fanbase: 4 })).toBe('Morale +2.');
    expect(applyNbaLifeCFx(c, { fanbase: 4 })).toBe('');
  });

  it('keeps growth inside the potential headroom and never lowers a rating with a raise', () => {
    const capped = career('PG', { ovr: 80, pot: 80 });
    expect(applyNbaLifeCFx(capped, { rating: 2 })).toBe('Rating +1 to 81.');
    const over = career('PG', { ovr: 84, pot: 80 });
    expect(applyNbaLifeCFx(over, { rating: 2 })).toBe('');
    expect(over.ovr).toBe(84);
  });

  it('pays money in the era the career is in', () => {
    const now = career('PG', { netWorth: 5, earnings: 10 });
    expect(applyNbaLifeCFx(now, { netWorth: -0.5 })).toBe('Net worth -0.5M.');
    expect(now.netWorth).toBe(4.5);
    expect(now.earnings).toBe(10);
    const then = career('PG', { netWorth: 5, earnings: 10 }, 3, 'y2004');
    expect(applyNbaLifeCFx(then, { netWorth: -1 })).toBe('Net worth -0.31M.');
    expect(then.netWorth).toBe(4.69);
  });

  it('writes the chip from the same data', () => {
    const c = career('PG');
    expect(nbaLifeCChip({ fx: { rating: 2, health: -4 } }, c)).toBe('rating up, health down');
    expect(nbaLifeCChip({ fx: { netWorth: -0.2, fanbase: 3 } }, c)).toBe('fans up, money out');
    expect(nbaLifeCChip({ fx: { morale: -4 }, move: 'trade' }, c)).toBe('morale down, fans down, new team');
    expect(nbaLifeCChip({ fx: {} }, c)).toBe('no change');
    /* Written on a copy: the save itself does not move. */
    expect([c.ovr, c.morale, c.fanbase, c.health, c.netWorth]).toEqual([75, 50, 50, 60, 5]);
  });

  it('does not promise a stat that is already at its limit', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_rookie_wall')!;
    const fresh = career('PG', { health: 100 }, 1);
    const ev = buildNbaLifeCCard(def, fresh);
    expect(ev.options[0].effect).toBe('Money out');
    expect(ev.options[1].effect).toBe('Morale up');
    expect(ev.options[0].apply(fresh, () => 0.5)).toContain('Net worth -0.2M.');
    expect(fresh.health).toBe(100);
    const sore = career('PG', { health: 80 }, 1);
    expect(buildNbaLifeCCard(def, sore).options[0].effect).toBe('Health up, money out');
    const ceiling = career('PG', { ovr: 81, pot: 80 });
    expect(nbaLifeCChip({ fx: { rating: 2, morale: 3 } }, ceiling)).toBe('morale up');
  });

  it('starts the fans over in the new city, the way decks A and B do', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_rule_salary_match')!;
    const star = career('SF', { fanbase: 90, contractYears: 3 }, 5);
    const quiet = career('SF', { fanbase: 30, contractYears: 3 }, 5);
    expect(buildNbaLifeCCard(def, star).options[0].effect).toBe('Morale down, fans down, new team');
    expect(buildNbaLifeCCard(def, quiet).options[0].effect).toBe('Morale down, fans up, new team');
    expect(buildNbaLifeCCard(def, star).options[0].apply(star, seeded(5))).toContain('fanbase -46');
    expect(star.fanbase).toBe(44);
  });

  it('keeps a 2003-04 trade inside the 2003-04 league', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_rule_salary_match')!;
    const era = nbaEraTeamIds('y2004');
    for (let s = 1; s <= 60; s++) {
      const c = career('SF', { contractYears: 3 }, 5, 'y2004');
      buildNbaLifeCCard(def, c).options[0].apply(c, seeded(s));
      expect(era).toContain(c.team);
    }
  });

  it('moves the player and leaves the contract alone on the salary matching trade', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_rule_salary_match')!;
    const c = career('SF', { contractYears: 3, salary: 12 }, 5);
    const before = c.team;
    const ev = buildNbaLifeCCard(def, c);
    expect(ev.options[0].effect).toBe('Morale down, fans down, new team');
    const log = ev.options[0].apply(c, seeded(3));
    expect(c.team).not.toBe(before);
    expect(log).toContain('Traded to ');
    expect([c.salary, c.contractYears]).toEqual([12, 3]);
  });

  it('says both ways a gamble can go on the button', () => {
    const def = NBA_LIFE_C.find(d => d.id === 'nbaC_pg_play_sheet')!;
    const ev = buildNbaLifeCCard(def, career('PG'));
    expect(ev.options[0].effect).toBe('Could go either way: rating up, morale up, or morale down, fans down');
    const win = career('PG');
    expect(ev.options[0].apply(win, () => 0.1)).toContain('Rating +2 to 77, morale +5.');
    const lose = career('PG');
    expect(ev.options[0].apply(lose, () => 0.9)).toContain('Morale -6, fanbase -3.');
  });
});
