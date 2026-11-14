import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractOffer, nrlRecruitmentPlan, reduceNrlCareer,
  type NrlCareerMarketEntry, type NrlCareerState,
} from '@/lib/nrlCareer';

function apply(career: NrlCareerState, entry: NrlCareerMarketEntry, years: number, annual = entry.askingSalary) {
  return reduceNrlCareer(career, { type: 'offerContract', playerId: entry.player.id, years, salary: annual });
}

describe('NRL recruitment planning', () => {
  it('shows which individually valid deal crosses the combined cap, with exact allowed totals', () => {
    const initial = createNrlCareer('broncos', 1, 2026);
    const market = nrlCareerMarket(initial);
    const renewal = market.find(entry => entry.player.id === 'broncos-4-0')!;
    const available = nrlCareerCap(initial, 2027);
    const busy = apply(initial, renewal, 1, available.available + available.minimumSalary - 600000);
    const first = nrlCareerMarket(busy).find(entry => entry.player.id === 'nrl-storm-2026-9')!;
    const second = nrlCareerMarket(busy).find(entry => entry.player.id === 'nrl-storm-2026-3')!;
    const saved = [first, second].reduce((career, entry) => reduceNrlCareer(career, {
      type: 'setShortlist', year: 2026, playerId: entry.player.id, saved: true,
    }), busy);
    const bytes = JSON.stringify(saved);
    expect(nrlContractOffer(saved, first.player.id, first.askingSalary, 2).ok).toBe(true);
    expect(nrlContractOffer(saved, second.player.id, second.askingSalary, 3).ok).toBe(true);
    const plan = nrlRecruitmentPlan(saved, [{ playerId: first.player.id, years: 2 }, { playerId: second.player.id, years: 3 }]);
    expect(plan.offers.map(row => row.quote)).toEqual([
      nrlContractOffer(saved, first.player.id, first.askingSalary, 2),
      { ok: false, reason: 'This offer exceeds the 2027 salary cap.' },
    ]);
    const signed = apply(saved, first, 2);
    expect(plan.seasons).toEqual([2027, 2028, 2029].map(year => ({ before: nrlCareerCap(saved, year), after: nrlCareerCap(signed, year) })));
    expect(plan.seasons[0].before.available).toBe(600000);
    expect(plan.seasons[0].after.available).toBe(85000);
    expect(JSON.stringify(saved)).toBe(bytes);

    const reversed = nrlRecruitmentPlan(saved, [{ playerId: second.player.id, years: 3 }, { playerId: first.player.id, years: 2 }]);
    expect(reversed.offers.map(row => row.quote.ok)).toEqual([true, false]);
    expect(reversed.seasons[0].after.available).toBe(160000);
  });

  it('honours the selected renewal term and starting year instead of moving its existing deal', () => {
    const initial = createNrlCareer('bears', 38, 2027);
    const market = nrlCareerMarket(initial);
    const renewal = market.find(entry => entry.kind === 'renewal' && entry.startYear === 2030
      && nrlContractOffer(initial, entry.player.id, entry.askingSalary, 4).ok)!;
    const elsewhere = market.find(entry => entry.kind !== 'renewal')!;
    const plan = nrlRecruitmentPlan(initial, [
      { playerId: renewal.player.id, years: 4 }, { playerId: renewal.player.id, years: 1 }, { playerId: elsewhere.player.id, years: 1 },
    ]);
    expect(plan.offers.map(row => row.quote.ok)).toEqual([true, false, false]);
    expect(plan.seasons.at(-1)?.after.year).toBe(2033);
    const signed = apply(initial, renewal, 4);
    expect(plan.seasons.map(row => row.after)).toEqual(plan.seasons.map(row => nrlCareerCap(signed, row.after.year)));
    expect(plan.seasons.find(row => row.after.year === 2029)?.after).toEqual(nrlCareerCap(initial, 2029));
  });
});
