/* Round 920: NHL life deck C. The words a card shows are computed from the
   effect it applies, and these tests pin the pieces that do that, plus the
   gates the brief asked for (position, era, role, the letter and clause
   flags decks A and B leave behind). */
import { describe, it, expect } from 'vitest';
import {
  NHL_LIFE_C, applyNhlLifeCFx, nhlLifeCChip, buildNhlLifeCCard, getNhlLifeEventsC,
} from './nhlCareerLifeC';
import { NHL_ARCHETYPES, startNhlCareer } from './nhlMyCareer';
import { getNhlLifeEventsA } from './nhlCareerLifeA';
import { nhlWaiverExempt, nhlWaiverRequired } from './nhlCareerWaivers';
import type { NhlCareerPos, NhlCareerState } from './nhlMyCareer';

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function career(pos: NhlCareerPos, patch: Partial<NhlCareerState> = {}, seasons = 3, eraId?: string): NhlCareerState {
  const c = startNhlCareer('Test Player', pos, NHL_ARCHETYPES[pos][0], seeded(7), null, eraId);
  for (let i = 0; i < seasons; i++) {
    c.seasons.push({
      year: c.year + i, team: c.team, age: c.age + i, ovr: c.ovr, games: 80,
      goals: 10, assists: 15, points: 25, awards: [], teamResult: 'Missed the playoffs', salary: c.salary,
    });
  }
  return Object.assign(c, { morale: 50, fanbase: 50, health: 60, ovr: 76, pot: 92, netWorth: 5, age: 24, contractYears: 2 }, patch);
}

const idsFor = (c: NhlCareerState) => getNhlLifeEventsC(c, () => 0.5).map(e => e.id);
const defOf = (id: string) => NHL_LIFE_C.find(d => d.id === id)!;

describe('the catalog', () => {
  it('is 36 cards with unique nhlC_ ids, three options each, and every tag filled', () => {
    expect(NHL_LIFE_C).toHaveLength(36);
    expect(new Set(NHL_LIFE_C.map(d => d.id)).size).toBe(36);
    for (const d of NHL_LIFE_C) {
      expect(d.id.startsWith('nhlC_')).toBe(true);
      expect(d.options).toHaveLength(3);
      expect(d.cooldown).toBeGreaterThan(0);
      expect(['position', 'rookie', 'veteran', 'bench', 'rules']).toContain(d.category);
    }
  });

  it('spends its cards where the brief asked', () => {
    const count = (cat: string) => NHL_LIFE_C.filter(d => d.category === cat).length;
    expect(count('position')).toBe(14);
    expect(count('rookie')).toBe(4);
    expect(count('veteran')).toBe(4);
    expect(count('bench')).toBe(4);
    expect(count('rules')).toBe(10);
  });

  it('carries the tags onto the built card', () => {
    const ev = buildNhlLifeCCard(defOf('nhlC_rule_waiver_claim'), career('C'));
    expect(ev.category).toBe('rules');
    expect(ev.cooldown).toBe(99);
    expect(ev.story).toBe('waivers');
  });
});

describe('gates', () => {
  it('gives each position only its own position cards', () => {
    const own: Record<NhlCareerPos, string> = { G: 'g', D: 'd', C: 'c', LW: 'w', RW: 'w' };
    for (const p of ['G', 'D', 'C', 'LW', 'RW'] as NhlCareerPos[]) {
      const ids = idsFor(career(p, { ovr: 80 })).filter(id => /^nhlC_(g|d|c|w)_/.test(id));
      expect(ids.length).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(id.startsWith(`nhlC_${own[p]}_`)).toBe(true);
    }
  });

  it('waits for each rule\'s season in a 2006-07 career, and shows it today', () => {
    const cases: [string, NhlCareerPos, Partial<NhlCareerState>, number][] = [
      ['nhlC_rule_ahl_assignment', 'C', { ovr: 74, age: 20 }, 1],
      ['nhlC_rule_entry_level_bonuses', 'C', { draftPick: 10 }, 1],
      ['nhlC_rule_waiver_claim', 'LW', { ovr: 76 }, 4],
      ['nhlC_rule_conditioning_loan', 'D', { health: 60 }, 4],
      ['nhlC_rule_retained_salary', 'C', { age: 30, ovr: 80 }, 6],
      ['nhlC_rule_three_on_three', 'RW', {}, 2],
      ['nhlC_rule_coach_challenge', 'RW', {}, 2],
    ];
    for (const [id, p, patch, yrs] of cases) {
      const from = id.includes('three_on_three') || id.includes('coach_challenge') ? 2015 : 2013;
      expect(idsFor(career(p, patch, yrs))).toContain(id);
      expect(idsFor(career(p, { ...patch, year: from - 1 }, yrs, 'y2006'))).not.toContain(id);
      expect(idsFor(career(p, { ...patch, year: from }, yrs, 'y2006'))).toContain(id);
    }
  });

  it('keeps the offer sheet in both eras, for an expiring young player only', () => {
    const rfa = { contractYears: 0, age: 24, ovr: 80 };
    expect(idsFor(career('C', rfa, 4))).toContain('nhlC_rule_offer_sheet');
    expect(idsFor(career('C', { ...rfa, year: 2010 }, 4, 'y2006'))).toContain('nhlC_rule_offer_sheet');
    expect(idsFor(career('C', { ...rfa, contractYears: 2 }, 4))).not.toContain('nhlC_rule_offer_sheet');
    expect(idsFor(career('C', { ...rfa, age: 29 }, 4))).not.toContain('nhlC_rule_offer_sheet');
    /* the boundary itself: restricted through 26, unrestricted at 27 */
    expect(idsFor(career('C', { ...rfa, age: 26 }, 4))).toContain('nhlC_rule_offer_sheet');
    expect(idsFor(career('C', { ...rfa, age: 27 }, 4))).not.toContain('nhlC_rule_offer_sheet');
  });

  it('keeps the entry level bonuses for a top 40 pick, never an undrafted signing (draftPick 0)', () => {
    expect(idsFor(career('C', { draftPick: 40 }, 1))).toContain('nhlC_rule_entry_level_bonuses');
    expect(idsFor(career('C', { draftPick: 41 }, 1))).not.toContain('nhlC_rule_entry_level_bonuses');
    expect(idsFor(career('C', { draftPick: 0 }, 1))).not.toContain('nhlC_rule_entry_level_bonuses');
  });

  it('reads the letter and clause flags decks A and B leave behind', () => {
    expect(idsFor(career('D', { ovr: 80, lifeFlags: { alternate: 1 } }, 4))).toContain('nhlC_rule_wear_the_a');
    expect(idsFor(career('D', { ovr: 80, lifeFlags: { alternate: 1, captain: 1 } }, 4))).not.toContain('nhlC_rule_wear_the_a');
    expect(idsFor(career('D', { ovr: 80 }, 4))).not.toContain('nhlC_rule_no_trade_list');
    expect(idsFor(career('D', { ovr: 80, lifeFlags: { tenTeamList: 1 } }, 4))).toContain('nhlC_rule_no_trade_list');
  });

  it('stops the offer sheet at six seasons, when a seventh would make him unrestricted', () => {
    const rfa = { contractYears: 0, age: 25, ovr: 80 };
    expect(idsFor(career('C', rfa, 6))).toContain('nhlC_rule_offer_sheet');
    expect(idsFor(career('C', rfa, 7))).not.toContain('nhlC_rule_offer_sheet');
  });

  it('asks one waiver question for decks A and C, by games and by years', () => {
    const games = (c: NhlCareerState, n: number) => { for (const s of c.seasons) s.games = n; return c; };
    /* A skater is exempt under 160 games, a goalie under 80. */
    expect(nhlWaiverExempt(games(career('C', {}, 1), 80))).toBe(true);
    expect(nhlWaiverExempt(games(career('C', {}, 2), 80))).toBe(false);
    expect(nhlWaiverRequired(games(career('C', {}, 2), 80))).toBe(true);
    expect(nhlWaiverExempt(games(career('G', {}, 1), 60))).toBe(true);
    expect(nhlWaiverRequired(games(career('G', {}, 2), 60))).toBe(true);
    /* Years run out even without the games. */
    expect(nhlWaiverRequired(games(career('C', {}, 5), 20))).toBe(true);
    expect(nhlWaiverRequired(games(career('C', {}, 4), 20))).toBe(false);
    expect(nhlWaiverRequired(games(career('G', {}, 5), 10))).toBe(false);
    expect(nhlWaiverRequired(games(career('G', {}, 6), 10))).toBe(true);
    /* The 2005 agreement was not read twice: nothing before 2013-14. */
    expect(nhlWaiverRequired(games(career('C', { year: 2012 }, 3, 'y2006'), 80))).toBe(false);
    expect(nhlWaiverRequired(games(career('C', { year: 2013 }, 3, 'y2006'), 80))).toBe(true);
  });

  it('never tells one player he needs waivers and does not', () => {
    for (const pos of ['C', 'D', 'G'] as NhlCareerPos[]) {
      for (let yrs = 1; yrs <= 6; yrs++) {
        for (const g of [20, 60, 82]) {
          const c = career(pos, { ovr: 74, age: 20 }, yrs);
          for (const s of c.seasons) s.games = g;
          const a = getNhlLifeEventsA(c, () => 0.5).map(e => e.id);
          const both = a.includes('nhlA_waiver_wire') && idsFor(c).includes('nhlC_rule_ahl_assignment');
          expect(both).toBe(false);
        }
      }
    }
  });

  it('leaves the timeout out of the coach\'s challenge, which no longer needs one', () => {
    const ev = buildNhlLifeCCard(defOf('nhlC_rule_coach_challenge'), career('RW', {}, 2));
    expect(ev.body).not.toMatch(/timeout/i);
  });

  it('shows the press box and the fourth line to a backup skater only', () => {
    const bench = (c: NhlCareerState) => idsFor(c).filter(id => id.startsWith('nhlC_bench_'));
    expect(bench(career('C', { role: 'starter' }))).toHaveLength(0);
    expect(bench(career('C', { role: 'backup' }))).toEqual(['nhlC_bench_press_box', 'nhlC_bench_fourth_line']);
    expect(bench(career('G', { role: 'backup' }))).toEqual(['nhlC_bench_backup_goalie']);
  });
});

describe('the words are the effect', () => {
  it('reports what really moved after the clamps, and nothing that did not', () => {
    const c = career('C', { morale: 98, health: 3, ovr: 80, pot: 80 });
    const line = applyNhlLifeCFx(c, { morale: 5, health: -6, rating: 2, fanbase: 4 });
    expect(c.morale).toBe(100);
    expect(c.health).toBe(0);
    expect(c.ovr).toBe(81);
    expect(line).toBe('Rating +1 to 81, morale +2, fanbase +4, health -3.');
    expect(applyNhlLifeCFx(career('C', { ovr: 93, pot: 92 }), { rating: 2 })).toBe('');
  });

  it('pays money in the career\'s own era', () => {
    const now = career('C', { earnings: 0, netWorth: 0 });
    expect(applyNhlLifeCFx(now, { earned: 0.5 })).toBe('Earned 0.5M.');
    const then = career('C', { earnings: 0, netWorth: 0 }, 3, 'y2006');
    expect(applyNhlLifeCFx(then, { earned: 0.5, netWorth: -0.1 })).toBe('Earned 0.21M, net worth -0.04M.');
    expect(then.earnings).toBe(0.21);
    expect(then.netWorth).toBe(0.17);
  });

  it('writes the chip from the same data', () => {
    expect(nhlLifeCChip({ fx: { rating: 1, morale: -2 } })).toBe('rating up, morale down');
    expect(nhlLifeCChip({ fx: { netWorth: -0.1 }, move: 'claim' })).toBe('money out, new team');
    expect(nhlLifeCChip({ fx: {} })).toBe('no change');
  });

  it('moves a claimed player and leaves his contract alone', () => {
    const c = career('LW', { ovr: 76, salary: 1.4, contractYears: 2 }, 4);
    const ev = buildNhlLifeCCard(defOf('nhlC_rule_waiver_claim'), c);
    /* option 0 is the gamble; 0.99 loses it, which is the claim branch, and
       the second draw picks the new club. */
    const draws = [0.99, 0.1];
    const before = c.team;
    const line = ev.options[0].apply(c, () => draws.shift() ?? 0.5);
    expect(c.team).not.toBe(before);
    expect(line).toContain('Claimed by');
    expect(c.salary).toBe(1.4);
    expect(c.contractYears).toBe(2);
    expect(ev.options[0].effect).toBe('Could go either way: rating up, morale down, or morale down, new team');
  });

  it('bumps deck A\'s letter flag when you take the C', () => {
    const c = career('D', { ovr: 80, lifeFlags: { alternate: 1 } }, 4);
    buildNhlLifeCCard(defOf('nhlC_rule_wear_the_a'), c).options[0].apply(c, () => 0.5);
    expect(c.lifeFlags).toEqual({ alternate: 1, captain: 1 });
  });
});
