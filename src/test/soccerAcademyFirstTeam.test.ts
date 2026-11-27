import { afterEach, describe, expect, it, vi } from 'vitest';
import { acceptOffer, advanceProSeason, advanceYouthYear, calcAppearances, FALLBACK_CLUBS, initCareer, repairCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { withFirstTeamTraining } from '@/lib/soccerCareerAcademy';

const clubs = FALLBACK_CLUBS;
const attrs = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
const resume = (state: CareerState) => repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(state, 1)) as CareerState);
const last = (state: CareerState) => state.seasons[state.seasons.length - 1];
function start() {
  vi.spyOn(Math, 'random').mockReturnValue(0.57);
  return initCareer('Academy Test', 'England', 'ST', '2020s', attrs, 62, 2020, clubs, null);
}
const graduate = (state: CareerState, book = false) => advanceYouthYear(resume(book ? { ...state, academyPlacementBooked: true } : state), clubs, true);
const sign = (state: CareerState, home: boolean) => resume(acceptOffer(state, state.pendingOffers.find(o => Boolean(o.isHomegrown) === home)!));
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career academy first-team training', () => {
  it('can be cancelled without changing an old-format youth save or spending either matchday', () => {
    const legacy = repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(start(), 0)) as CareerState);
    const cancelled = withFirstTeamTraining(resume(withFirstTeamTraining(legacy, true)), false);
    expect(serializeSoccerCareerSave(cancelled, 1)).toBe(serializeSoccerCareerSave(resume(legacy), 1));
    expect(graduate(cancelled)).toEqual(graduate(legacy));
    const senior = sign(graduate(legacy), true);
    expect(withFirstTeamTraining(senior, true)).toBe(senior);
  });
  it('trades two youth games, preserves growth and offers, and retains the unsigned placement on reload', () => {
    const player = start(), normal = graduate(player), placement = resume(graduate(player, true));
    expect(last(placement).apps).toBe(last(normal).apps - 2);
    expect(placement.overall).toBe(normal.overall);
    expect(last(placement).academyReport).toEqual(last(normal).academyReport);
    expect(placement.pendingOffers).toEqual(normal.pendingOffers);
    expect(last(placement).academyPlacement).toEqual({ club: player.academyClubName });
    expect(placement.academyPlacementBooked).toBeUndefined();
    expect(last(normal).academyPlacement).toBeUndefined();
  });
  it('turns staying into extra real senior league games, records the debut and expires next year', () => {
    const player = start(), normal = sign(graduate(player), true), unsigned = graduate(player, true), signed = sign(unsigned, true);
    expect(last(unsigned).academyPlacement?.signedWith).toBeUndefined();
    expect(last(signed).academyPlacement?.signedWith).toBe(signed.currentClub);
    const debut = resume(advanceProSeason(signed, clubs, true)), ordinary = advanceProSeason(normal, clubs, true);
    expect(last(debut).academySelectionPlaces).toBe(3);
    expect(last(debut).leagueApps).toBe(last(ordinary).leagueApps! + 3);
    expect(last(debut).leagueApps).toBeLessThanOrEqual(last(debut).apps);
    expect(calcAppearances(debut.overall, debut.currentClubTier, debut.age, debut).academySelectionPlaces).toBeUndefined();
  });
  it('records signing elsewhere, and cannot grant the place on a later return or loan', () => {
    const player = start(), placement = graduate(player, true), away = sign(placement, false), home = sign(placement, true);
    expect(last(away).academyPlacement).toEqual({ club: player.academyClubName, signedWith: away.currentClub });
    const loan = { parentClub: home.currentClub, parentCountry: home.currentClubCountry, parentTier: home.currentClubTier, parentLeague: home.currentLeague, parentColor: home.currentClubColor };
    for (const state of [away, { ...away, currentClub: home.currentClub }, { ...home, loan }]) {
      expect(calcAppearances(state.overall, state.currentClubTier, state.age, state).academySelectionPlaces).toBeUndefined();
    }
  });
  it('adds no appearances above the league ceiling and lets suspension reduce the actual debut', () => {
    const player = start(), signed = sign(graduate(player, true), true);
    vi.mocked(Math.random).mockReturnValue(0.99);
    const full = calcAppearances(99, signed.currentClubTier, signed.age, signed);
    expect(full.academySelectionPlaces).toBe(0);
    expect(full.leagueApps).toBe(38);
    vi.mocked(Math.random).mockReturnValue(0.57);
    const debut = last(advanceProSeason(resume(signed), clubs, true));
    const suspended = last(advanceProSeason(resume({ ...signed, pendingSuspensionMatches: 2 }), clubs, true));
    expect(suspended.academySelectionPlaces).toBe(debut.academySelectionPlaces);
    expect(suspended.suspensionMatches).toBe(2);
    expect(suspended.leagueApps).toBe(debut.leagueApps! - 2);
  });
  it('charges no youth games if the academy club cannot offer a senior deal', () => {
    const player = start(), remaining = clubs.filter(c => c.name !== player.academyClubName);
    const normal = advanceYouthYear(resume(player), remaining, true);
    const booked = advanceYouthYear(resume({ ...player, academyPlacementBooked: true }), remaining, true);
    expect(booked.pendingOffers.some(o => o.isHomegrown)).toBe(false);
    expect(last(booked)).toEqual(last(normal));
    expect(booked.academyPlacementBooked).toBeUndefined();
  });
});
