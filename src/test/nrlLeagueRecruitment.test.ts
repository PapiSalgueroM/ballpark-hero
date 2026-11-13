import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlLeagueRecruitmentPreview,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { createNrlSeason, NRL_ROLES, reduceNrlSeason } from '@/lib/nrlManager';

const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const toggle = (state: NrlCareerState, enabled = true) => reduceNrlCareer(state, {
  type: 'setLeagueRecruitment', year: state.season.year, clubId: state.season.clubId, enabled,
});
function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
}

describe('NRL offseason league recruitment', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)(
    'previews and commits deterministic rival second years without changing the %i club or next roster identities',
    (year, clubId) => {
      const initial = createNrlCareer(clubId, 4, year);
      expect(toggle(initial)).toBe(initial);
      expect(nrlLeagueRecruitmentPreview(initial)).toBeNull();
      const complete = finish(initial);
      const ordinary = start(complete);
      const before = JSON.stringify(complete);
      const preview = nrlLeagueRecruitmentPreview(complete)!;
      expect(preview.length).toBeGreaterThan(0);
      expect(preview.every(deal => deal.clubId !== clubId)).toBe(true);
      expect(new Set(preview.map(deal => deal.clubId)).size).toBe(preview.length);
      expect(JSON.stringify(complete)).toBe(before);
      const opted = toggle(complete);
      expect(opted.leagueRecruitment).toBe(true);
      expect(opted.season).toBe(complete.season);
      expect(opted.players).toBe(complete.players);
      expect(opted.finance).toBe(complete.finance);
      expect(read(opted)).toEqual(opted);
      expect(JSON.stringify(toggle(opted, false))).toBe(before);
      const rolled = start(read(opted)!);
      expect(rolled.leagueRecruitment).toBeUndefined();
      expect(rolled.history.at(-1)?.leagueRecruitment).toEqual(preview);
      expect(rolled.season).toEqual(ordinary.season);
      expect(rolled.finance).toEqual(ordinary.finance);
      expect(nrlCareerSquad(rolled)).toEqual(nrlCareerSquad(ordinary));
      const extendedIds = new Set(preview.map(deal => deal.playerId));
      expect(rolled.players).toEqual(ordinary.players.map(player => extendedIds.has(player.id)
        ? { ...player, contract: { ...player.contract!, endYear: year + 2 } } : player));
      expect(read(rolled)).toEqual(rolled);
      expect(start(opted)).toEqual(rolled);
      const following = start(finish(rolled));
      for (const { playerId, clubId: signingClubId, annualSalary } of preview) {
        expect(following.players.find(player => player.id === playerId)?.contract).toMatchObject({
          clubId: signingClubId, startYear: year + 1, endYear: year + 2, salary: annualSalary,
        });
      }
      for (const club of nrlSeasonPlan(year + 2).clubs) {
        const asClub = { ...following, season: { ...following.season, clubId: club.id } };
        const squad = following.players.filter(player => player.contract?.clubId === club.id);
        expect(squad).toHaveLength(30);
        expect(new Set(squad.map(player => player.role))).toEqual(new Set(NRL_ROLES));
        expect(nrlCareerCap(asClub).available).toBeGreaterThanOrEqual(0);
      }
      expect(read(following)).toEqual(following);
    },
  );

  it('excludes the takeover destination, preserves the outgoing squad and rejects an invalid receipt', () => {
    const completed = finish(createNrlCareer('storm', 4));
    const target = nrlLeagueRecruitmentPreview(completed)![0].clubId;
    const move = { type: 'startNextSeason', move: { fromYear: 2026, clubId: target } } as const;
    const plain = reduceNrlCareer(completed, move);
    const preview = nrlLeagueRecruitmentPreview(completed, target)!;
    const rolled = reduceNrlCareer(toggle(completed), move);
    expect(rolled.history[0].leagueRecruitment).toEqual(preview);
    expect(preview.every(deal => !['storm', target].includes(deal.clubId))).toBe(true);
    expect(rolled.players.filter(player => player.contract?.clubId === 'storm' || player.contract?.clubId === target))
      .toEqual(plain.players.filter(player => player.contract?.clubId === 'storm' || player.contract?.clubId === target));
    const receipt = rolled.history[0];
    const [deal] = receipt.leagueRecruitment!;
    expect(read({ ...rolled, history: [{ ...receipt, leagueRecruitment: [{ ...deal, clubId: target }] }] })).toBeNull();
    expect(read({ ...rolled, history: [{ ...receipt, leagueRecruitment: [{ ...deal, annualSalary: deal.annualSalary + 1 }] }] })).toBeNull();
    expect(read({ ...rolled, history: [{ ...receipt, leagueRecruitment: [deal, deal] }] })).toBeNull();
    expect(read(rolled)).toEqual(rolled);
    const retired = reduceNrlCareer(toggle(completed), { type: 'retireCareer', year: 2026, clubId: 'storm' });
    expect(retired.leagueRecruitment).toBeUndefined();
    expect(nrlLeagueRecruitmentPreview(retired)).toBeNull();
    expect(read(retired)).toEqual(retired);

    let legacy = createNrlSeason('storm', 4);
    while (legacy.phase !== 'complete') legacy = reduceNrlSeason(legacy, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(nrlLeagueRecruitmentPreview(imported)).toBeNull();
    expect(toggle(imported)).toBe(imported);
    expect(readNrlCareerSave(JSON.stringify({ ...completed, leagueRecruitment: false }))).toBeNull();
  });
});
