import { describe, expect, it } from 'vitest';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlAcademyReports, nrlCareerCap, nrlCareerMarket, nrlCareerSquad, nrlContractOffer,
  nrlRecruitmentBrief, readNrlCareerSave, reduceNrlCareer,
} from '@/lib/nrlCareer';

describe('NRL recruitment brief', () => {
  it.each([2026, 2027] as const)('shows position cover and deterministic external options in %i without writing the career', year => {
    const state = createNrlCareer(year === 2026 ? 'storm' : 'bears', 17, year);
    const role = 'Fullback';
    const before = JSON.stringify(state);
    const brief = nrlRecruitmentBrief(state, role)!;
    expect(brief.year).toBe(year + 1);
    const signedAtRole = nrlCareerSquad(state, year + 1).filter(player => player.role === role);
    expect(brief.signed).toHaveLength(signedAtRole.length);
    expect(brief.signed).toEqual(expect.arrayContaining(signedAtRole));
    const market = nrlCareerMarket(state).filter(entry => entry.kind !== 'renewal' && entry.player.role === role);
    expect(brief.targets).toHaveLength(3);
    for (const { entry, quote } of brief.targets) {
      expect(market).toContainEqual(entry);
      expect(quote).toEqual(nrlContractOffer(state, entry.player.id, entry.askingSalary, 1));
    }
    const first = brief.targets.find(item => item.quote.ok)!.entry;
    const signed = reduceNrlCareer(state, { type: 'offerContract', playerId: first.player.id, salary: first.askingSalary, years: 1 });
    const updated = nrlRecruitmentBrief(signed, role)!;
    expect(updated.signed.some(player => player.id === first.player.id)).toBe(true);
    expect(updated.targets.some(item => item.entry.player.id === first.player.id)).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps pending academy names private and shows actual cap refusals on ready academy and external options', () => {
    const start = createNrlCareer('panthers', 41);
    const role = 'Hooker';
    const pending = reduceNrlCareer(start, { type: 'scoutAcademy', role });
    expect(nrlRecruitmentBrief(pending, role)?.academy).toBeNull();
    let state = reduceNrlCareer(pending, { type: 'advance' });
    const academy = nrlAcademyReports(state)[0].player!;
    expect(nrlRecruitmentBrief(state, role)?.academy).toMatchObject({ player: academy, quote: { ok: true } });
    const market = nrlCareerMarket(state).filter(entry => entry.startYear === 2027).sort((a, b) => a.askingSalary - b.askingSalary);
    for (const entry of market) {
      if (nrlCareerCap(state, 2027).slots === 30) break;
      state = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 1 });
    }
    const blocked = nrlRecruitmentBrief(state, role)!;
    expect(blocked.academy?.quote).toEqual({ ok: false, reason: 'The 2027 squad already has 30 contracts.' });
    expect(blocked.targets.length).toBeGreaterThan(0);
    expect(blocked.targets.every(({ quote }) => quote.ok === false && /30 contracts/.test(quote.reason))).toBe(true);
  });

  it('honours a cap shortfall and closes when there is no next season', () => {
    const state = createNrlCareer('storm', 17);
    const before = nrlRecruitmentBrief(state, 'Fullback')!;
    const space = nrlCareerCap(state, 2027);
    const entry = before.targets.find(({ quote }) => quote.ok)!.entry;
    const filled = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id,
      salary: space.available + space.minimumSalary, years: 1 });
    expect(filled).not.toBe(state);
    const after = nrlRecruitmentBrief(filled, 'Fullback')!;
    expect(after.targets.some(({ quote }) => quote.ok === false && /salary cap/.test(quote.reason))).toBe(true);
    expect(nrlRecruitmentBrief({ ...state, season: { ...state.season, year: NRL_LAST_YEAR } }, 'Fullback')).toBeNull();
    expect(nrlRecruitmentBrief({ ...state, retired: true }, 'Fullback')).toBeNull();
  });

  it.each([['storm', 2026], ['bears', 2027]] as const)('shows trained cover for returning players at %s', (clubId, year) => {
    let state = createNrlCareer(clubId, 17, year);
    const signed = new Set(nrlCareerSquad(state, year + 1).map(player => player.id));
    const candidates = state.season.squad.filter(player => player.role === 'Five-eighth');
    const trainee = candidates.find(player => signed.has(player.id)) ?? candidates[0];
    if (!signed.has(trainee.id)) {
      const renewal = nrlCareerMarket(state).find(entry => entry.kind === 'renewal' && entry.player.id === trainee.id)!;
      state = reduceNrlCareer(state, { type: 'offerContract', playerId: trainee.id, salary: renewal.askingSalary, years: 1 });
    }
    expect(nrlCareerSquad(state, year + 1).some(player => player.id === trainee.id)).toBe(true);
    const role = 'Halfback';
    const pending = reduceNrlCareer(state, { type: 'startPositionTraining', playerId: trainee.id, role, year, clubId, round: state.season.round });
    expect(pending.positionTraining?.role).toBe(role);
    expect(nrlRecruitmentBrief(pending, role)?.cover).toEqual([]);
    let trained = pending;
    for (let i = 0; i < 4; i++) trained = reduceNrlCareer(trained, { type: 'advance' });
    const bytes = JSON.stringify(trained);
    const brief = nrlRecruitmentBrief(trained, role)!;
    expect(brief.cover.map(player => player.id)).toEqual([trainee.id]);
    expect(nrlRecruitmentBrief(readNrlCareerSave(bytes)!, role)?.cover).toEqual(brief.cover);
    expect(brief.signed.some(player => player.id === trainee.id)).toBe(false);
    expect(brief.cover[0].secondaryRole).toBe(role);
    const left = { ...trained, players: trained.players.map(player => player.id === trainee.id
      ? { ...player, contract: { ...player.contract!, endYear: year }, futureContract: null } : player) };
    expect(nrlRecruitmentBrief(left, role)?.cover).toEqual([]);
    expect(JSON.stringify(trained)).toBe(bytes);
  });
});
