import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureAcademy, loadCareer, promoteProspect, SAVE_KEY, saveCareer, sellValue, startCareer,
} from '@/lib/clubManager';
import type { CareerState, Prospect } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const NOW = Date.UTC(2032, 7, 1);

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('cm-academy-economics-baseline'));
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  saveFence.release(SAVE_KEY);
  vi.restoreAllMocks();
});

function fixture(over: Partial<Prospect> = {}) {
  const career = startCareer('Excelsior');
  ensureAcademy(career);
  const prospect: Prospect = {
    id: 'academy-economics-prospect', name: 'Academy Economics Fixture', position: 'CM',
    age: 17, rating: 76, potential: 89, lowGuess: 80, highGuess: 92,
    source: 'Academy', flag: '', fee: 2.4, season: career.season, ...over,
  };
  career.academy!.prospects = [prospect];
  career.budget = 100;
  expect(career.squad.length, 'CM_ACADEMY_ECONOMICS_FIXTURE_NEEDS_SENIOR_ROOM').toBeLessThan(30);
  return { career, prospect };
}

function promoted(career: CareerState, prospect: Prospect) {
  const next = promoteProspect(career, prospect.id);
  expect(next, 'CM_ACADEMY_ECONOMICS_LEGAL_PROMOTION_MUST_SUCCEED').not.toBeNull();
  const player = next!.squad.find(p => !career.squad.some(old => old.id === p.id));
  expect(player, 'CM_ACADEMY_ECONOMICS_PROMOTION_MUST_ADD_ONE_PLAYER').toBeDefined();
  expect(next!.squad).toHaveLength(career.squad.length + 1);
  return { next: next!, player: player! };
}

describe('Club Manager academy first professional contract', { timeout: 120000 }, () => {
  // Literal oracles read the existing market scale independently: shown76 at17 means level82,
  // value18.9m; the normal stored-value wage rounds to30k and the ordinary sale price to17m.
  it('CM_ACADEMY_ELITE_TERMS: prices a strong teenager on the same market scale as the squad', () => {
    const { career, prospect } = fixture();
    const { player } = promoted(career, prospect);
    expect(player.wage, 'CM_ACADEMY_ELITE_WAGE_MUST_NOT_USE_LEGACY_RAW_CURVE').toBe(30);
    expect(player.value, 'CM_ACADEMY_ELITE_VALUE_MUST_USE_MARKET_SCALE').toBe(18.9);
    expect(sellValue(player), 'CM_ACADEMY_ELITE_SALE_MUST_USE_STORED_MARKET_VALUE').toBe(17);
  });

  it.each([
    { tag: 'scouted', source: 'Brazil', age: 17, rating: 70, value: 6.4, wage: 14, sale: 5.8 },
    { tag: 'developing', source: 'Academy', age: 18, rating: 60, value: 1.1, wage: 4, sale: 1 },
    { tag: 'older-prospect', source: 'Academy', age: 22, rating: 76, value: 9.2, wage: 18, sale: 8.3 },
    { tag: 'floor', source: 'Academy', age: 15, rating: 40, value: 0.2, wage: 1, sale: 0.3 },
  ])('CM_ACADEMY_MARKET_TERMS:$tag uses ability and age instead of one flat youth price', row => {
    const { career, prospect } = fixture({ source: row.source, age: row.age, rating: row.rating });
    const { player } = promoted(career, prospect);
    expect(player.value, 'CM_ACADEMY_PROSPECT_VALUE_MUST_USE_MARKET_SCALE:' + row.tag).toBe(row.value);
    expect(player.wage, 'CM_ACADEMY_PROSPECT_WAGE_MUST_FOLLOW_VALUE:' + row.tag).toBe(row.wage);
    expect(sellValue(player), 'CM_ACADEMY_PROSPECT_SALE_MUST_FOLLOW_VALUE:' + row.tag).toBe(row.sale);
  });

  it('CM_ACADEMY_PROMOTION_PRESERVES_PLAYER: keeps the prospect and charges its displayed fee once', () => {
    const { career, prospect } = fixture();
    const before = JSON.stringify(career), squad = clone(career.squad);
    const { next, player } = promoted(career, prospect);
    expect(player).toMatchObject({
      name: prospect.name, position: prospect.position, age: prospect.age, rating: prospect.rating,
      potential: prospect.potential, academyGrad: true, isYouth: false, contractYears: 4,
    });
    expect(next.budget).toBe(97.6);
    expect(next.academy!.prospects).toHaveLength(0);
    expect(next.academyGraduates).toBe((career.academyGraduates ?? 0) + 1);
    expect(next.squad.filter(p => p.id !== player.id)).toEqual(squad);
    expect(JSON.stringify(career)).toBe(before);
    expect(promoteProspect(next, prospect.id)).toBeNull();
  });

  it('CM_ACADEMY_PROMOTION_REFUSALS: keeps funds and both rosters when signing is unavailable', () => {
    const { career, prospect } = fixture();
    const poor = { ...clone(career), budget: 2.3 };
    const full = clone(career);
    while (full.squad.length < 30) {
      full.squad.push({ ...full.squad[0], id: 'economics-capacity-' + full.squad.length });
    }
    for (const [input, id] of [[poor, prospect.id], [full, prospect.id], [career, 'missing']] as const) {
      const before = JSON.stringify(input);
      expect(promoteProspect(input, id)).toBeNull();
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it('CM_ACADEMY_PROMOTION_RNG: adding economic terms consumes no extra gameplay draws', () => {
    const { career, prospect } = fixture();
    const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('cm-academy-economics-promotion'));
    random.mockClear();
    const { player } = promoted(career, prospect);
    expect(player.academyGrad).toBe(true);
    expect(random.mock.calls).toHaveLength(0);
  });

  it('CM_ACADEMY_SAVED_CONTRACT: opening an older save preserves its signed salary and clauses', () => {
    const { career, prospect } = fixture();
    const { next, player } = promoted(career, prospect);
    delete player.value;
    player.wage = 106;
    player.releaseClause = 120;
    player.contractYears = 3;
    player.signedTerms = { years: 4, wage: 106, role: 'prospect', season: next.season };
    expect(saveCareer(next), 'CM_ACADEMY_OLD_CONTRACT_FIXTURE_MUST_SAVE').toBe(true);
    const loaded = loadCareer();
    expect(loaded, 'CM_ACADEMY_OLD_CONTRACT_FIXTURE_MUST_REOPEN').not.toBeNull();
    const kept = loaded!.squad.find(p => p.id === player.id)!;
    expect(kept).toBeDefined();
    expect(kept.value).toBeUndefined();
    expect(kept.wage).toBe(106);
    expect(kept.releaseClause).toBe(120);
    expect(kept.contractYears).toBe(3);
    expect(kept.signedTerms).toEqual(player.signedTerms);
  });
});
