import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlAcademyFacilityQuote, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance, nrlFinanceForecast,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, type NrlRole } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const install = (state: NrlCareerState) => reduceNrlCareer(state, {
  type: 'upgradeAcademy', year: state.season.year, clubId: state.season.clubId, round: state.season.round,
});
const scout = (state: NrlCareerState, role: NrlRole) => reduceNrlCareer(state, { type: 'scoutAcademy', role });
const saved = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const next = (state: NrlCareerState, clubId?: string) => reduceNrlCareer(state, {
  type: 'startNextSeason', move: clubId ? { fromYear: state.season.year, clubId } : undefined,
});

function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
}

describe('NRL Academy facilities', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('charges %s club cash once and helps only new reports from the next round', (year, clubId) => {
    const initial = createNrlCareer(clubId, 39, year);
    const old = JSON.stringify(initial);
    expect(JSON.stringify(saved(initial))).toBe(old);
    expect(nrlAcademyFacilityQuote(initial)).toMatchObject({ installed: false, active: false, cost: 600_000, reason: null });

    const pending = scout(initial, 'Hooker');
    const purchased = install(pending);
    expect(purchased.finance.academyUpgradeRound).toBe(1);
    expect(nrlAcademyFacilityQuote(purchased)).toMatchObject({ installed: true, active: false });
    expect(install(purchased)).toBe(purchased);
    expect(nrlCareerFinance(purchased).cash).toBe(nrlCareerFinance(initial).cash - 600_000);
    expect(nrlCareerCap(purchased)).toEqual(nrlCareerCap(initial));
    expect(purchased.season).toBe(initial.season);
    expect(purchased.players).toBe(initial.players);
    expect(nrlAcademyReports(advance(purchased))).toEqual(nrlAcademyReports(advance(pending)));
    expect(nrlAcademyReports(advance(scout(install(initial), 'Hooker')))).toEqual(nrlAcademyReports(advance(pending)));
    expect(saved(purchased)).toEqual(purchased);

    const upgraded = advance(scout(advance(purchased), 'Fullback'));
    const ordinary = advance(scout(advance(pending), 'Fullback'));
    const standardReport = nrlAcademyReports(ordinary)[1].player!;
    const betterReport = nrlAcademyReports(upgraded)[1].player!;
    expect(nrlAcademyFacilityQuote(upgraded)).toMatchObject({ installed: true, active: true });
    expect(betterReport).toEqual({ ...standardReport, potential: Math.min(90, standardReport.potential + 3) });
    expect(betterReport.potential).toBeGreaterThan(standardReport.potential);
    expect(upgraded.season).toEqual(ordinary.season);
    expect(nrlAcademyOffer(upgraded, betterReport.id)).toEqual(nrlAcademyOffer(ordinary, standardReport.id));
    expect(saved(upgraded)).toEqual(upgraded);
  });

  it('applies the established 90 potential cap to the same fictional prospect', () => {
    const state = createNrlCareer('panthers', 349);
    const ordinary = advance(scout(advance(state), 'Right Wing'));
    const improved = advance(scout(advance(install(state)), 'Right Wing'));
    const base = nrlAcademyReports(ordinary)[0].player!;
    const funded = nrlAcademyReports(improved)[0].player!;
    expect(base.potential).toBe(88);
    expect(funded).toEqual({ ...base, potential: 90 });
    const withFacility = advance(install(state));
    const ready = reduceNrlCareer(withFacility, { type: 'scoutAcademy', role: 'Right Wing', priority: 'ready' });
    const ceiling = reduceNrlCareer(withFacility, { type: 'scoutAcademy', role: 'Right Wing', priority: 'ceiling' });
    expect(ready.academy?.[0]?.player).toEqual({ ...funded, rating: funded.rating + 2, potential: 88 });
    expect(ceiling.academy?.[0]?.player).toEqual({ ...funded, rating: funded.rating - 2, potential: 90 });
    expect(saved(ready)).toEqual(ready);
    expect(saved(ceiling)).toEqual(ceiling);
  });

  it('keeps the purchase with its club through rollover, a move and a return', () => {
    const closed = finish(install(createNrlCareer('storm', 5)));
    expect(closed.history[0].finance?.academyUpgradeRound).toBe(1);
    expect(saved(closed)).toEqual(closed);
    const stayed = next(closed);
    expect(stayed.finance.academyUpgradeRound).toBeUndefined();
    expect(stayed.finance.openingCash).toBe(nrlCareerFinance(closed).cash);
    expect(nrlAcademyFacilityQuote(stayed)).toMatchObject({ installed: true, active: true });
    expect(install(stayed)).toBe(stayed);

    const perth = next(closed, 'bears');
    expect(perth.finance.openingCash).toBe(2_500_000);
    expect(nrlAcademyFacilityQuote(perth)).toMatchObject({ installed: false, active: false, reason: null });
    const returned = next(finish(perth), 'storm');
    expect(returned.finance.openingCash).toBe(nrlCareerFinance(closed).cash);
    expect(nrlAcademyFacilityQuote(returned)).toMatchObject({ installed: true, active: true });
    expect(saved(returned)).toEqual(returned);
    expect(saved({ ...returned, finance: { ...returned.finance, academyUpgradeRound: 1 } })).toBeNull();
  });

  it('replays same-round coaching and facility spending in either order', () => {
    const state = createNrlCareer('storm', 39);
    const medical = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'upgradeMedical', level: 2 });
    const hire = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'hireCoach', role: 'attack', year: 2026, round: 1 });
    const first = medical(hire(install(state)));
    const last = install(hire(medical(state)));
    expect(first).toEqual(last);
    expect(last.finance).toMatchObject({ academyUpgradeRound: 1, coachHire: { round: 1 }, medicalUpgrades: [{ level: 2, round: 1 }] });
    expect(saved(first)).toEqual(first);
    expect(saved(last)).toEqual(last);
    expect(nrlFinanceForecast(last)!.cashNow).toBe(nrlFinanceForecast(hire(medical(state)))!.cashNow - 600_000);
  });

  it('refuses stale, live, imported and unaffordable purchases and rejects invalid book entries', () => {
    const state = createNrlCareer('storm', 5);
    expect(reduceNrlCareer(state, { type: 'upgradeAcademy', year: 2027, clubId: 'storm', round: 1 })).toBe(state);
    expect(reduceNrlCareer(state, { type: 'upgradeAcademy', year: 2026, clubId: 'bears', round: 1 })).toBe(state);
    const secondRound = advance(state);
    expect(reduceNrlCareer(secondRound, { type: 'upgradeAcademy', year: 2026, clubId: 'storm', round: 1 })).toBe(secondRound);
    const live = reduceNrlCareer(state, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(install(live)).toBe(live);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 5)))!;
    expect(install(legacy)).toBe(legacy);
    const poor = { ...state, finance: { ...state.finance, openingCash: 599_999 } };
    expect(nrlAcademyFacilityQuote(poor).reason).toMatch(/needs more cash/);
    expect(install(poor)).toBe(poor);
    const reserved = { ...state, finance: { ...state.finance, openingCash: 900_000, coachHire: { role: 'attack' as const, round: 1, paidRounds: 0 } } };
    expect(nrlCareerFinance(reserved).cash).toBeGreaterThan(600_000);
    expect(nrlAcademyFacilityQuote(reserved).reason).toMatch(/assistant.*wages/);
    expect(install(reserved)).toBe(reserved);
    expect(saved({ ...state, finance: { ...state.finance, academyUpgradeRound: 2 } })).toBeNull();
    expect(saved({ ...legacy, finance: { ...legacy.finance, academyUpgradeRound: 1 } })).toBeNull();
    const completed = finish(state);
    expect(install(completed)).toBe(completed);
    let last = state;
    while (last.season.round < 31) last = advance(last);
    const latePurchase = install(last);
    expect(nrlAcademyFacilityQuote(latePurchase)).toMatchObject({ installed: true, active: false });
    expect(nrlAcademyFacilityQuote(next(advance(latePurchase)))).toMatchObject({ installed: true, active: true });
  });
});
