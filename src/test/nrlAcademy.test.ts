import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { NRL_ROLES } from '@/lib/nrlManager';
import {
  createNrlCareer, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerMarket, nrlCareerSquad,
  nrlContractOffer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const scout = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'scoutAcademy', role: 'Hooker' });
const finish = (initial: NrlCareerState) => {
  let state = initial;
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};

describe('NRL Manager Academy', () => {
  it('saves one pending role and reveals its deterministic report after a bye without changing the match simulation', () => {
    const plan = nrlSeasonPlan(2026);
    const teams = new Set(plan.draw[0].flat());
    const club = plan.clubs.find(candidate => !teams.has(candidate.id))!;
    const state = createNrlCareer(club.id, 91);
    const assigned = scout(state);
    expect(assigned).not.toBe(state);
    expect(assigned.season).toBe(state.season);
    expect(nrlAcademyReports(assigned)).toEqual([{ role: 'Hooker', startedRound: 1, status: 'scouting', player: null }]);
    expect(reduceNrlCareer(assigned, { type: 'scoutAcademy', role: 'Fullback' })).toBe(assigned);
    const candidateId = assigned.academy![0].player.id;
    expect(nrlAcademyOffer(assigned, candidateId)).toMatchObject({ ok: false });
    expect(reduceNrlCareer(assigned, { type: 'promoteAcademy', playerId: candidateId })).toBe(assigned);
    const resumed = readNrlCareerSave(JSON.stringify(assigned))!;
    expect(resumed).toEqual(assigned);
    const next = advance(resumed);
    expect(next.season).toEqual(advance(state).season);
    expect(nrlAcademyReports(next)[0]).toMatchObject({ status: 'ready', player: { id: candidateId, role: 'Hooker' } });
    expect(nrlAcademyReports(advance(scout(state)))).toEqual(nrlAcademyReports(next));
    expect(scout(next)).toBe(next);
    expect(nrlCareerMarket(next).some(entry => entry.player.id === candidateId)).toBe(false);
  });

  it('reserves exactly one next-year slot and brings the promoted player into the squad on rollover', () => {
    const state = advance(scout(createNrlCareer('panthers', 41)));
    const player = nrlAcademyReports(state)[0].player!;
    const nextYear = state.season.year + 1;
    const cap = nrlCareerCap(state, nextYear);
    expect(nrlAcademyOffer(state, player.id)).toMatchObject({
      ok: true, contract: { clubId: 'panthers', startYear: nextYear, endYear: nextYear, salary: cap.minimumSalary },
    });
    const promote = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'promoteAcademy', playerId: player.id });
    const promoted = promote(state);
    expect(promote(promoted)).toBe(promoted);
    expect(nrlCareerCap(promoted)).toEqual(nrlCareerCap(state));
    expect(nrlCareerCap(promoted, nextYear)).toMatchObject({ slots: cap.slots + 1, committed: cap.committed + cap.minimumSalary, available: cap.available });
    expect(nrlCareerSquad(promoted).some(member => member.id === player.id)).toBe(false);
    expect(nrlAcademyReports(promoted)[0].status).toBe('signed');
    expect(readNrlCareerSave(JSON.stringify(promoted))).toEqual(promoted);
    const completed = finish(promoted);
    expect(completed.season).toEqual(finish(state).season);
    const next = reduceNrlCareer(completed, { type: 'startNextSeason' });
    expect(next.season.year).toBe(nextYear);
    expect(nrlAcademyReports(next)).toEqual([]);
    expect(nrlCareerSquad(next).find(member => member.id === player.id)).toMatchObject({
      name: player.name, role: player.role, contract: { clubId: 'panthers', salary: cap.minimumSalary },
    });
    expect(nrlCareerSquad(next)).toHaveLength(30);
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  });

  it('applies the same Top 30 limit to Academy promotions and outside recruits', () => {
    let state = advance(scout(createNrlCareer('panthers', 41)));
    const player = nrlAcademyReports(state)[0].player!;
    const nextYear = state.season.year + 1;
    const offers = nrlCareerMarket(state).filter(entry => entry.startYear === nextYear).sort((a, b) => a.askingSalary - b.askingSalary);
    for (const entry of offers) {
      if (nrlCareerCap(state, nextYear).slots === 30) break;
      state = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 1 });
    }
    expect(nrlCareerCap(state, nextYear).slots).toBe(30);
    const unsigned = nrlCareerMarket(state).find(entry => entry.startYear === nextYear)!;
    expect(nrlAcademyOffer(state, player.id)).toEqual(nrlContractOffer(state, unsigned.player.id, unsigned.askingSalary, 1));
    expect(nrlAcademyOffer(state, player.id)).toMatchObject({ ok: false, reason: 'The 2027 squad already has 30 contracts.' });
    expect(reduceNrlCareer(state, { type: 'promoteAcademy', playerId: player.id })).toBe(state);
  });

  it('reserves the last place for a missing role and allows an Academy player who fills it', () => {
    let state = reduceNrlCareer(finish(createNrlCareer('panthers', 41)), { type: 'startNextSeason' });
    const nextYear = state.season.year + 1;
    const roles = new Set(state.players.filter(player => player.contract?.clubId === 'panthers'
      && player.contract.endYear >= nextYear).map(player => player.role));
    const needed = NRL_ROLES.find(role => !roles.has(role))!;
    const covered = NRL_ROLES.find(role => roles.has(role))!;
    state = advance(reduceNrlCareer(state, { type: 'scoutAcademy', role: covered }));
    const offers = nrlCareerMarket(state).filter(entry => entry.startYear === nextYear && entry.player.role !== needed)
      .sort((a, b) => Number(roles.has(a.player.role)) - Number(roles.has(b.player.role)) || a.askingSalary - b.askingSalary);
    for (const entry of offers) {
      if (nrlCareerCap(state, nextYear).slots === 29) break;
      state = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 1 });
    }
    expect(nrlCareerCap(state, nextYear).slots).toBe(29);
    const existingRole = nrlAcademyReports(state)[0].player!;
    expect(nrlAcademyOffer(state, existingRole.id)).toEqual({ ok: false, reason: 'Keep enough 2028 squad places to cover every starting position.' });
    state = advance(reduceNrlCareer(state, { type: 'scoutAcademy', role: needed }));
    const positionalFit = nrlAcademyReports(state)[1].player!;
    expect(nrlAcademyOffer(state, positionalFit.id)).toMatchObject({ ok: true });
    const promoted = reduceNrlCareer(state, { type: 'promoteAcademy', playerId: positionalFit.id });
    expect(nrlCareerCap(promoted, nextYear).slots).toBe(30);
    expect(readNrlCareerSave(JSON.stringify(promoted))).toEqual(promoted);
  });

  it('opens a report completed on the final advance and discards unsigned reports after rollover', () => {
    let state = createNrlCareer('bears', 13, 2027);
    while (state.season.round < 31) state = advance(state);
    const final = advance(scout(state));
    expect(final.season.phase).toBe('complete');
    expect(nrlAcademyReports(final)[0].status).toBe('ready');
    const prospect = nrlAcademyReports(final)[0].player!;
    const next = reduceNrlCareer(final, { type: 'startNextSeason' });
    expect(nrlAcademyReports(next)).toEqual([]);
    expect(next.players.some(player => player.id === prospect.id)).toBe(false);
    expect(readNrlCareerSave(JSON.stringify(final))).toEqual(final);
  });

  it('reads old v2 payloads with no reports and rejects a duplicate or an early promoted report', () => {
    const old = createNrlCareer('panthers', 10);
    expect(readNrlCareerSave(JSON.stringify(old))).toEqual(old);
    const pending = scout(old);
    const report = pending.academy![0];
    expect(readNrlCareerSave(JSON.stringify({ ...pending, academy: [report, report] }))).toBeNull();
    const player = { ...report.player, futureContract: { clubId: 'panthers', startYear: 2027, endYear: 2027, salary: 145_000 } };
    expect(readNrlCareerSave(JSON.stringify({ ...pending, players: [...pending.players, player] }))).toBeNull();
  });
});
