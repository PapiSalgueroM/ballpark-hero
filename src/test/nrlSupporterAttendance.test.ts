import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlFinanceForecast, nrlSupporterAttendance, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const raw = JSON.stringify;
const read = (state: NrlCareerState) => readNrlCareerSave(raw(state));
const setAttendance = (state: NrlCareerState, enabled: boolean) =>
  reduceNrlCareer(state, { type: 'setSupporterAttendance', year: state.season.year, clubId: state.season.clubId, enabled });

describe('NRL supporter attendance', () => {
  it.each([[2026, 'broncos', 13], [2027, 'bears', 1]] as const)('forecasts and settles the optional attendance book without drifting matches in %s', (year, clubId, seed) => {
    const original = createNrlCareer(clubId, seed, year);
    const ticket = reduceNrlCareer(original, { type: 'setTicketTier', year, round: 1, tier: 'value' });
    const enabled = setAttendance(ticket, true);
    expect(enabled?.finance.supporterAttendance).toBe(true);
    expect(raw(setAttendance(enabled, false))).toBe(raw(ticket));
    expect(nrlSupporterAttendance(enabled)).toMatchObject({ form: [], adjustment: 6000 });
    expect(nrlFinanceForecast(enabled)!.gateLow).toBeLessThan(nrlFinanceForecast(ticket)!.gateLow);
    expect(nrlFinanceForecast(enabled)!.gateHigh).toBeGreaterThan(nrlFinanceForecast(ticket)!.gateHigh);
    expect(raw(read(enabled))).toBe(raw(enabled));
    let managed = enabled;
    let control = ticket;
    while (managed.season.phase !== 'complete') {
      const prior = managed;
      managed = advance(managed);
      const base = control;
      control = advance(control);
      expect(managed.season).toEqual(control.season);
      expect(managed.players).toEqual(control.players);
      const round = prior.season.round;
      const results = managed.season.results.filter(result => result.round === round);
      const home = results.some(match => match.homeId === clubId && match.tieId !== 'GF');
      const delta = managed.finance.gateReceipts - prior.finance.gateReceipts - (control.finance.gateReceipts - base.finance.gateReceipts);
      expect(delta).toBe(home ? nrlSupporterAttendance(prior).adjustment : 0);
    }
    if (year === 2026) {
      expect(managed.season.results.find(match => match.tieId === 'PF2')?.homeId).toBe(clubId);
      expect(managed.season.results.some(match => match.tieId === 'GF' && [match.homeId, match.awayId].includes(clubId))).toBe(true);
    }
    expect(raw(read(managed))).toBe(raw(managed));
    const next = reduceNrlCareer(managed, { type: 'startNextSeason' });
    expect(next.finance.supporterAttendance).toBeUndefined();
    expect(next.history[0].attendanceForm).toMatch(/^[WDL]+$/);
    expect(raw(read(next))).toBe(raw(next));
    const prior = next.history[0];
    const forged = { ...next, history: [{ ...prior, finance: { ...prior.finance!,
      gateReceipts: prior.finance!.gateReceipts + 6000, cash: prior.finance!.cash + 6000, profit: prior.finance!.profit + 6000 } }] };
    expect(read(forged)).toBeNull();
    expect(read({ ...next, history: [{ ...prior, attendanceForm: undefined }] })).toBeNull();
  });

  it('refuses an imported season, an already started round and stale season assumptions', () => {
    const start = createNrlCareer('broncos', 1);
    const priced = reduceNrlCareer(start, { type: 'setTicketTier', year: 2026, round: 1, tier: 'premium' });
    const progressed = advance(priced);
    expect(setAttendance(progressed, true)).toBe(progressed);
    expect(read({ ...progressed, finance: { ...progressed.finance, supporterAttendance: true } })).toBeNull();
    const half = reduceNrlCareer(start, { type: 'startLive' });
    expect(setAttendance(half, true)).toBe(half);
    const legacy = readNrlCareerSave(raw(createNrlSeason('broncos', 1)))!;
    expect(setAttendance(legacy, true)).toBe(legacy);
    expect(reduceNrlCareer(start, { type: 'setSupporterAttendance', clubId: 'broncos', year: 2027, enabled: true })).toBe(start);
  });

  it('replays actual opted cash after a live reload and a guarded fast-forward without changing fixtures', () => {
    const state = createNrlCareer('broncos', 11);
    const planned = setAttendance(state, true);
    const half = reduceNrlCareer(planned, { type: 'startLive' });
    expect(raw(read(half))).toBe(raw(half));
    const after = reduceNrlCareer(read(half)!, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' });
    expect(raw(after)).toBe(raw(advance(planned)));
    const args = { year: 2026, clubId: 'broncos', round: 2, through: 5 };
    const fast = runNrlFastForward(after, args);
    const base = runNrlFastForward(advance(state), args);
    expect(fast.state.season).toEqual(base.state.season);
    expect(fast.state.players).toEqual(base.state.players);
    expect(fast.stop).toBe(base.stop);
    expect(raw(read(fast.state))).toBe(raw(fast.state));
  });
});
