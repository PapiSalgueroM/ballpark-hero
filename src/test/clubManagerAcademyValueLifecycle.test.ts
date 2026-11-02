import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureAcademy, loadCareer, promoteProspect, SAVE_KEY, saveCareer, sellValue,
  startCareer, startNextSeason,
} from '@/lib/clubManager';
import type { Prospect } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('cm-academy-value-lifecycle'));
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2032, 7, 1));
});
afterEach(() => {
  saveFence.release(SAVE_KEY);
  vi.restoreAllMocks();
});

function fixture(rating = 76) {
  const career = startCareer('Excelsior');
  ensureAcademy(career);
  const prospect: Prospect = {
    id: 'academy-value-lifecycle', name: 'Academy Value Lifecycle Fixture', position: 'CM',
    age: 17, rating, potential: 95, lowGuess: 85, highGuess: 95,
    source: 'Academy', flag: '', fee: 1.2, season: career.season,
  };
  career.academy!.prospects = [prospect];
  career.budget = 100;
  const next = promoteProspect(career, prospect.id);
  expect(next, 'CM_ACADEMY_LIFECYCLE_LEGAL_PROMOTION').not.toBeNull();
  const player = next!.squad.find(p => p.name === prospect.name)!;
  expect(player, 'CM_ACADEMY_LIFECYCLE_PROMOTED_PLAYER').toBeDefined();
  return { career: next!, player };
}

describe('Club Manager academy market value lifecycle', { timeout: 120000 }, () => {
  it('CM_ACADEMY_MARKET_SAVE: keeps the quoted value, wage and sale after a real save and reload', () => {
    const { career, player } = fixture();
    expect(saveCareer(career), 'CM_ACADEMY_MARKET_SAVE_MUST_WRITE').toBe(true);
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(raw.squad.find((p: { id: string }) => p.id === player.id)).toMatchObject({ value: 18.9, wage: 30 });
    const loaded = loadCareer();
    expect(loaded, 'CM_ACADEMY_MARKET_SAVE_MUST_REOPEN').not.toBeNull();
    const reopened = loaded!.squad.find(p => p.id === player.id)!;
    expect(reopened).toMatchObject({ value: 18.9, wage: 30, academyGrad: true });
    expect(sellValue(reopened)).toBe(17);
  });

  it.each([
    { rating: 60, value: 1.1, wage: 4 },
    { rating: 70, value: 6.4, wage: 14 },
    { rating: 76, value: 18.9, wage: 30 },
  ])('CM_ACADEMY_MARKET_GROWTH:$rating increases stored value with actual summer development', row => {
    const { career, player } = fixture(row.rating);
    expect(player).toMatchObject({ value: row.value, wage: row.wage });
    player.apps = 34;
    vi.mocked(Math.random).mockImplementation(keyedRng('cm-academy-value-growth|' + row.rating));
    const next = startNextSeason(career);
    const grown = next.squad.find(p => p.id === player.id)!;
    expect(grown, 'CM_ACADEMY_MARKET_GROWTH_MUST_KEEP_THE_YOUNG_PLAYER').toBeDefined();
    const improvement = grown.rating - player.rating;
    expect(improvement, 'CM_ACADEMY_MARKET_GROWTH_FIXTURE_MUST_ACTUALLY_DEVELOP').toBeGreaterThan(0);
    expect(grown.age).toBe(player.age + 1);
    // Existing stored values gain20percent per rating point. This reads the actual earned
    // improvement independently instead of comparing two calls to the value helper.
    expect(grown.value, 'CM_ACADEMY_MARKET_GROWTH_MUST_USE_STORED_VALUE')
      .toBe(Math.max(0.2, Math.round(row.value * Math.pow(1.2, improvement) * 10) / 10));
    expect(grown.value).toBeGreaterThan(row.value);
    expect(grown.wage, 'CM_ACADEMY_MARKET_GROWTH_MUST_KEEP_THE_SIGNED_WAGE').toBe(row.wage);
    expect(grown.contractYears).toBe(player.contractYears! - 1);
  });
});
