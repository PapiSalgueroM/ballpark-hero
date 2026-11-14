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
  it.each([[2026, 'panthers', 1, null], [2027, 'bears', 3, 'tigers']] as const)('makes a released %i academy prospect available to the existing next-year market', (year, clubId, seed, destination) => {
    const initial = createNrlCareer(clubId, seed, year);
    const assigned = reduceNrlCareer(initial, { type: 'scoutAcademy', role: 'Hooker', priority: 'ready' });
    const { player } = assigned.academy![0];
    const action = { type: 'releaseAcademyProspect', year, clubId, playerId: player.id } as const;
    const regular = advance(assigned);
    expect(reduceNrlCareer(regular, action)).toBe(regular);
    const extra = reduceNrlCareer(regular, { type: 'scoutAcademy', role: 'Fullback' });
    const completed = finish(extra);
    const released = reduceNrlCareer(completed, action);
    expect(released).toBeDefined();
    expect(nrlAcademyReports(released)[0].status).toBe('released');
    expect(released.players).toBe(completed.players);
    expect(nrlCareerCap(released, year + 1)).toEqual(nrlCareerCap(completed, year + 1));
    expect(nrlAcademyOffer(released, player.id).ok).toBe(false);
    expect(reduceNrlCareer(released, action)).toBe(released);
    expect(reduceNrlCareer(released, { ...action, playerId: extra.academy![1].player.id })).toBe(released);
    const invalid = { ...released, academy: released.academy!.map(report => ({ ...report, released: true })) };
    expect(readNrlCareerSave(JSON.stringify(invalid))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...regular, academy: released.academy!.slice(0, 1) }))).toBeNull();
    const promoted = reduceNrlCareer(completed, { type: 'promoteAcademy', playerId: player.id });
    expect(promoted).not.toBe(completed);
    expect(reduceNrlCareer(promoted, action)).toBe(promoted);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(released)))).toBe(JSON.stringify(released));
    const control = reduceNrlCareer(completed, { type: 'startNextSeason' });
    expect(control.players.some(row => row.id === player.id)).toBe(false);
    const next = reduceNrlCareer(released, { type: 'startNextSeason' });
    const settled = next.players.find(row => row.id === player.id)!;
    expect(settled).toMatchObject({ id: player.id, name: player.name, role: player.role, age: player.age + 1,
      rating: player.rating, potential: player.potential });
    expect(settled.contract?.clubId ?? null).toBe(destination);
    const marketEntry = nrlCareerMarket(next).find(entry => entry.player.id === player.id);
    expect(marketEntry?.kind).toBe(destination ? 'rival' : 'freeAgent');
    if (destination) {
      expect(settled.contract).toMatchObject({ startYear: year + 1, endYear: year + 1, salary: 180000 });
      const rivalsCap = nrlCareerCap({ ...next, season: { ...next.season, clubId: destination } });
      expect(rivalsCap.slots).toBe(30);
      expect(rivalsCap.available).toBeGreaterThanOrEqual(0);
    }
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  });

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

  it.each([[2026, 'panthers'], [2027, 'bears']] as const)('applies two alternate scouting briefs and preserves a promotion in %i', (year, clubId) => {
    const initial = createNrlCareer(clubId, 41, year);
    const defaultAssignment = scout(initial);
    const ready = reduceNrlCareer(initial, { type: 'scoutAcademy', role: 'Hooker', priority: 'ready' });
    const ceiling = reduceNrlCareer(initial, { type: 'scoutAcademy', role: 'Hooker', priority: 'ceiling' });
    const base = defaultAssignment.academy![0];
    expect(base).not.toHaveProperty('priority');
    for (const [state, priority, rating, potential] of [
      [ready, 'ready', base.player.rating + 2, base.player.potential - 2],
      [ceiling, 'ceiling', base.player.rating - 2, Math.min(90, base.player.potential + 2)],
    ] as const) {
      expect(state.season).toBe(initial.season);
      expect(state.players).toBe(initial.players);
      expect(state.finance).toBe(initial.finance);
      expect(state.academy?.[0]).toEqual({ startedRound: 1, priority, player: { ...base.player, rating, potential } });
      expect(nrlAcademyReports(state)[0]).toMatchObject({ status: 'scouting', priority, player: null });
      expect(readNrlCareerSave(JSON.stringify(state))).toEqual(state);
      expect(reduceNrlCareer(state, { type: 'scoutAcademy', role: 'Fullback', priority })).toBe(state);
      const reportReady = advance(state);
      expect(nrlAcademyReports(reportReady)[0]).toMatchObject({ status: 'ready', priority, player: { rating, potential } });
      expect(reduceNrlCareer(reportReady, { type: 'scoutAcademy', role: 'Hooker', priority })).toBe(reportReady);
      expect(reportReady.season).toEqual(advance(defaultAssignment).season);
      const playerId = base.player.id;
      const promoted = reduceNrlCareer(reportReady, { type: 'promoteAcademy', playerId });
      expect(nrlAcademyReports(promoted)[0].status).toBe('signed');
      expect(readNrlCareerSave(JSON.stringify(promoted))).toEqual(promoted);
      const next = reduceNrlCareer(finish(promoted), { type: 'startNextSeason' });
      expect(nrlCareerSquad(next).find(row => row.id === playerId)).toMatchObject({
        name: base.player.name, rating, potential, contract: { startYear: year + 1, endYear: year + 1, salary: nrlSeasonPlan(year + 1).minimumSalary },
      });
      expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
    }
  });

  it('rejects false assignment priorities and inconsistent deterministic rating or potential figures', () => {
    const initial = createNrlCareer('panthers', 41);
    const assigned = reduceNrlCareer(initial, { type: 'scoutAcademy', role: 'Hooker', priority: 'ready' });
    const report = assigned.academy![0];
    expect(readNrlCareerSave(JSON.stringify({ ...assigned, academy: [{ ...report, priority: 'ceiling' }] }))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...assigned, academy: [{ ...report, priority: 'invalid' }] }))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...assigned, academy: [{ ...report, player: { ...report.player, potential: report.player.potential + 1 } }] }))).toBeNull();
  });

  it('replays prepared reports when an earlier prospect signs after a later scout assignment', () => {
    const initial = createNrlCareer('panthers', 41);
    const first = advance(scout(initial));
    const second = advance(reduceNrlCareer(first, { type: 'scoutAcademy', role: 'Fullback', priority: 'ceiling' }));
    const firstId = nrlAcademyReports(second)[0].player!.id;
    const signed = reduceNrlCareer(second, { type: 'promoteAcademy', playerId: firstId });
    expect(readNrlCareerSave(JSON.stringify(signed))).toEqual(signed);
  });
});
