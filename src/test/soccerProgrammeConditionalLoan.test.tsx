import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SoccerCareerProgramme from '@/components/soccer-career/SoccerCareerProgramme';
import * as E from '@/lib/soccerCareerEngine';
import { chooseProgramme, cancelProgramme, settleSoccerProgramme, completeProgrammeLoanBuy } from '@/lib/soccerCareerProgramme';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const choose = (career: E.CareerState, minimum: 18 | 26) => chooseProgramme(career, 'loan', minimum === 18 ? 'buy_18' : 'buy_26');
const parent = () => E.FALLBACK_CLUBS.find(club => club.country === 'England' && club.tier === 1)!;
const borrower = (tier: number) => E.FALLBACK_CLUBS.find(club => club.country === 'England' && club.tier === tier && club.name !== parent().name)!;

function row(career: E.CareerState, year: number, leagueApps: number, apps = leagueApps + 2): E.SeasonRecord {
  return { year, age: career.age + 1, club: career.currentClub, clubCountry: career.currentClubCountry, clubTier: career.currentClubTier,
    apps, leagueApps, goals: 2, assists: 1, cleanSheets: 0, yellowCards: 1, redCards: 0, rating: 7.2, ovr: career.overall,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    onLoanFrom: career.loan?.parentClub };
}
function initial(overall = 75, tier = 3): E.CareerState {
  const c = E.initCareer('Loan Review Fixture', 'England', 'ST', '2020-24',
    { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall },
    overall, 2020, E.FALLBACK_CLUBS, null, 99);
  Object.assign(c, { agentId: 'self', age: 25, primeType: 'normal', peakOverall: overall, startingOverall: overall,
    rival: null, rivalCreated: true, pendingEvents: [], pendingNews: [], internationalCareer: false,
    intStats: { ...c.intStats, isRetired: true }, weeklyWage: 12000, morale: 70, netWorth: 2, totalEarnings: 4 });
  const signed = E.acceptOffer(c, { club: parent(), contractYears: 4, wage: 12000, transferFee: 0 });
  signed.seasons = [row(signed, 2024, 24, 26)];
  signed.seasons[0].age = 25; delete signed.seasons[0].onLoanFrom;
  return clone(E.acceptLoan(signed, { club: borrower(tier), contractYears: 1, wage: 12000, transferFee: 0, isLoan: true }));
}
/** Exact boundary rows are declared fictional records, settled by the real public programme helper. */
function sealed(career: E.CareerState, minimum: 18 | 26, leagueApps: number, settings: { missing?: boolean; severe?: boolean; apps?: number } = {}) {
  const state = clone(choose(career, minimum));
  const record = row(state, state.seasons.at(-1)!.year + 1, leagueApps, settings.apps);
  if (settings.missing) delete record.leagueApps;
  if (settings.severe) { record.injurySevere = true; record.apps = 0; record.leagueApps = 0; record.goals = 0; record.assists = 0; }
  state.age = record.age; state.seasons = [...state.seasons, record];
  settleSoccerProgramme(state, record);
  return state;
}
function held(career: E.CareerState) { return { career: clone(career), calls: vi.mocked(Math.random).mock.calls.length }; }
function raw(name: string, career: E.CareerState, before: ReturnType<typeof held>, observations: Record<string, unknown>) {
  const value = { case: name, observations: { inputHeld: isDeepStrictEqual(career, before.career), ...observations } };
  if (process.env.SC_LOAN_APPEARANCE_RAW) {
    mkdirSync(process.env.SC_LOAN_APPEARANCE_RAW, { recursive: true });
    writeFileSync(join(process.env.SC_LOAN_APPEARANCE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  expect(career).toEqual(before.career);
  expect(localStorage.getItem('loan-review-unrelated')).toBe('held');
}
function reload(career: E.CareerState): E.CareerState {
  const bytes = serializeSoccerCareerSave(career); localStorage.setItem('soccerCareerSave', bytes);
  const next = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  expect(isSoccerCareerSave(next)).toBe(true); expect(next).toEqual(clone(career)); return next;
}
function play(career: E.CareerState) {
  const tape: number[] = [];
  vi.mocked(Math.random).mockImplementation(() => { tape.push(0.5); return 0.5; });
  return { value: E.advanceProSeason(clone(career), E.FALLBACK_CLUBS), tape };
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('loan-review-unrelated', 'held');
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-04T12:00:00.000Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Soccer programme conditional loan', () => {
  it('chooses an 18 appearance condition through the native plan and completes the actual recorded loan season then reloads', () => {
    const c = initial(), before = held(c); let current = c; const changed = vi.fn();
    function App() {
      const [career, setCareer] = useState(c);
      return <SoccerCareerProgramme career={career} onChange={next => { current = next; changed(next); setCareer(next); }} onClose={() => undefined} />;
    }
    const view = render(<App />), help = document.body.textContent ?? '';
    fireEvent.click(view.getByRole('button', { name: 'See my plans' }));
    fireEvent.click(view.getByRole('button', { name: /Loan option to stay/ }));
    const button = view.queryByRole('button', { name: 'Choose Stay after 18 league appearances' });
    const detail = document.body.textContent ?? '';
    if (button) fireEvent.click(button);
    const queued = reload(current), actionDraws = vi.mocked(Math.random).mock.calls.length - before.calls;
    cleanup();
    const actual = play(queued), reference = play(chooseProgramme(c, 'loan', 'buy')), loaded = reload(actual.value);
    const last = loaded.seasons.at(-1)!, receipt = last.programme;
    raw('native-season', c, before, { available: !!button, help, detail, queued, actionDraws, callbacks: changed.mock.calls.length,
      after: loaded, actualTape: actual.tape, unconditionalReference: reference.value, referenceTape: reference.tape });
    expect([!!button, changed.mock.calls.length, loaded.currentClub, loaded.loan, loaded.contractYearsLeft, loaded.weeklyWage,
      receipt?.choices.loan ?? null], 'SC_LOAN_CONDITIONAL_NATIVE').toEqual([true, 1, borrower(3).name, null, 2, 12000, 'buy_18']);
    expect(Number.isSafeInteger(last.leagueApps) && last.leagueApps! >= 18 && last.leagueApps! <= last.apps).toBe(true);
    expect(/18/.test(detail) && /league/.test(detail) && /return|parent/i.test(help + detail)).toBe(true);
    expect(actionDraws).toBe(0); expect(actual.tape.length).toBeGreaterThan(0);
    expect(actual.tape).toEqual(reference.tape);
    const comparison = (value: E.CareerState) => {
      const result = clone(value);
      for (const receipt of [result.programme?.receipts.at(-1), result.seasons.at(-1)?.programme, result.pendingSummary?.programme]) {
        if (receipt) { receipt.choices.loan = '<agreement mode>'; receipt.outcomes.loan = '<agreement outcome>'; }
      }
      return result;
    };
    expect(comparison(loaded)).toEqual(comparison(reference.value));
    expect(loaded.programme?.receipts.at(-1)).toEqual(receipt);
    expect(loaded.seasons.slice(0, -1)).toEqual(c.seasons);
  });

  it('uses literal 18 and 26 league appearance boundaries rather than total appearances when sealing and completing', () => {
    const c = initial(), before = held(c);
    const values = ([{ minimum: 18, leagueApps: 18, apps: 20, complete: true }, { minimum: 18, leagueApps: 17, apps: 19, complete: false },
      { minimum: 26, leagueApps: 26, apps: 28, complete: true }, { minimum: 26, leagueApps: 25, apps: 27, complete: false },
      { minimum: 18, leagueApps: 18.5, apps: 20, complete: false }, { minimum: 18, leagueApps: 21, apps: 20, complete: false }] as const).map(test => {
      const state = sealed(c, test.minimum, test.leagueApps, { apps: test.apps }), saved = reload(state), beforeComplete = clone(saved);
      const completed = completeProgrammeLoanBuy(saved, borrower(3));
      return { ...test, ready: beforeComplete.programme?.loanBuy?.ready ?? false, completed,
        record: beforeComplete.seasons.at(-1), after: saved, unchangedOnRefusal: isDeepStrictEqual(saved, beforeComplete) };
    });
    raw('literal-boundaries', c, before, { values, drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect(values.map(value => [value.ready, value.completed]), 'SC_LOAN_CONDITIONAL_BOUNDARIES')
      .toEqual([[true, true], [false, false], [true, true], [false, false], [false, false], [false, false]]);
    for (const value of values) {
      expect(value.record?.programme?.choices.loan).toBe(value.minimum === 18 ? 'buy_18' : 'buy_26');
      expect(value.record?.leagueApps).toBe(value.leagueApps); expect(value.record?.apps).toBe(value.apps);
      if (value.complete) {
        expect([value.after.currentClub, value.after.loan, value.after.contractYearsLeft, value.after.weeklyWage])
          .toEqual([borrower(3).name, null, 2, 12000]);
      } else expect(value.unchangedOnRefusal).toBe(true);
    }
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('keeps the real parent return after a shortfall and records an honest missing or interrupted review', () => {
    const c = initial(65, 2), before = held(c);
    const actual = play(choose(c, 26)), loaded = reload(actual.value), last = loaded.seasons.at(-1)!;
    const outcome = last.programme?.outcomes.loan ?? '';
    const unavailable = [{ name: 'missing', settings: { missing: true } }, { name: 'interrupted', settings: { severe: true } }]
      .map(test => {
        const state = sealed(c, 26, 26, test.settings), prior = clone(state);
        const completed = completeProgrammeLoanBuy(state, borrower(2));
        return { name: test.name, completed, held: isDeepStrictEqual(state, prior), record: prior.seasons.at(-1),
          ready: prior.programme?.loanBuy?.ready ?? false };
      });
    raw('return-and-unavailable', c, before, { after: loaded, tape: actual.tape, unavailable });
    expect([loaded.currentClub, loaded.loan, last.programme?.choices.loan ?? null, Number.isSafeInteger(last.leagueApps)
      && last.leagueApps! < 26 && last.leagueApps! >= 0, /26/.test(outcome), outcome.includes(String(last.leagueApps)),
      /not met|shortfall|below/i.test(outcome)], 'SC_LOAN_CONDITIONAL_RETURN')
      .toEqual([parent().name, null, 'buy_26', true, true, true, true]);
    expect(last.club).toBe(borrower(2).name); expect(last.onLoanFrom).toBe(parent().name);
    expect(last.leagueApps! <= last.apps).toBe(true);
    expect(loaded.weeklyWage).toBe(c.weeklyWage);
    for (const value of unavailable) {
      expect([value.completed, value.held, value.ready]).toEqual([false, true, false]);
      expect(value.record?.programme?.choices.loan).toBe('buy_26');
      expect(/26|interrupted|unavailable|missing/i.test(value.record?.programme?.outcomes.loan ?? '')).toBe(true);
    }
  });

  it('rechecks the matching sealed record and receipt before signing and cannot complete the same agreement twice', () => {
    const c = initial(), before = held(c), valid = sealed(c, 18, 26);
    const sourceReady = valid.programme?.loanBuy?.ready === true;
    const sourceTag = valid.programme?.loanBuy ? Reflect.get(valid.programme.loanBuy, 'minimumLeagueApps') : undefined;
    const mutations: [string, (state: E.CareerState) => void][] = [
      ['missing conditional tag', state => { Reflect.deleteProperty(state.programme!.loanBuy!, 'minimumLeagueApps'); }],
      ['unknown conditional tag', state => { Object.assign(state.programme!.loanBuy!, { minimumLeagueApps: 99 }); }],
      ['null conditional tag', state => { Object.assign(state.programme!.loanBuy!, { minimumLeagueApps: null }); }],
      ['mismatched conditional tag', state => { Object.assign(state.programme!.loanBuy!, { minimumLeagueApps: 26 }); }],
      ['legacy choice with conditional tag', state => {
        state.programme!.receipts.at(-1)!.choices.loan = 'buy'; state.seasons.at(-1)!.programme!.choices.loan = 'buy';
      }],
      ['missing record receipt', state => { delete state.seasons.at(-1)!.programme; }],
      ['missing ledger receipt', state => { state.programme!.receipts = []; }],
      ['different record choice', state => { state.seasons.at(-1)!.programme!.choices.loan = 'buy_26'; }],
      ['late shortfall', state => { state.seasons.at(-1)!.leagueApps = 17; }],
      ['fractional appearances', state => { state.seasons.at(-1)!.leagueApps = 18.5; }],
      ['more league than total', state => { state.seasons.at(-1)!.leagueApps = state.seasons.at(-1)!.apps + 1; }],
      ['missing league data', state => { delete state.seasons.at(-1)!.leagueApps; }],
      ['stale year', state => { state.programme!.loanBuy!.year -= 1; }],
      ['different parent', state => { state.programme!.loanBuy!.parent = borrower(2).name; }],
      ['interrupted ledger', state => { state.programme!.receipts.at(-1)!.status = 'interrupted'; }],
    ];
    const values = mutations.map(([name, mutate]) => {
      const state = clone(valid); if (sourceReady) mutate(state);
      const prior = clone(state), completed = completeProgrammeLoanBuy(state, borrower(3));
      const unreadable = name === 'unknown conditional tag' || name === 'null conditional tag';
      const editHeld = !unreadable || (choose(state, 18) === state && cancelProgramme(state, 'loan') === state);
      return { name, completed, held: isDeepStrictEqual(state, prior), editHeld, before: prior, after: state };
    });
    const signed = reload(valid), first = completeProgrammeLoanBuy(signed, borrower(3)), firstState = clone(signed);
    const second = completeProgrammeLoanBuy(signed, borrower(3));
    raw('sealed-proof', c, before, { sourceReady, sourceTag: sourceTag ?? null, values, first, second, firstState, afterRepeat: signed,
      drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect([sourceReady, sourceTag ?? null, first, second], 'SC_LOAN_CONDITIONAL_PROOF').toEqual([true, 18, true, false]);
    expect(values.map(value => [value.completed, value.held, value.editHeld])).toEqual(values.map(() => [false, true, true]));
    expect(signed).toEqual(firstState); expect([signed.currentClub, signed.loan, signed.contractYearsLeft, signed.weeklyWage])
      .toEqual([borrower(3).name, null, 2, 12000]);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('refuses unavailable and unreadable choices without signing deleting metadata or spending a draw', () => {
    const initialState = initial();
    const variants = [
      ['no loan', { loan: null }],
      ['retired', { retired: true }],
      ['wrong phase', { phase: 'transfer_window' }],
      ['future programme', { programme: { version: 2, receipts: [] } }],
      ['malformed programme', { programme: { version: 1, receipts: 'unreadable' } }],
    ] as const;
    const states = variants.map(([name, change]) => ({ name, state: Object.assign(clone(initialState), change) }));
    const c = initialState, before = held(c);
    const values = states.map(({ name, state }) => {
      const prior = clone(state), chosen = choose(state, 18), cancelled = cancelProgramme(state, 'loan');
      return { name, sameChoice: chosen === state, sameCancel: cancelled === state,
        held: isDeepStrictEqual(state, prior), after: chosen };
    });
    raw('refused-state', c, before, { values, drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect(values.map(value => [value.sameChoice, value.sameCancel, value.held])).toEqual(values.map(() => [true, true, true]));
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('retains the complete ordinary season outputs and draw tapes for no choice and unconditional permanent moves', () => {
    const c = initial(), before = held(c);
    const ordinary = play(c), ordinaryAgain = play(c);
    const chosen = chooseProgramme(c, 'loan', 'buy'), paid = play(chosen), paidAgain = play(chosen);
    const cancelled = cancelProgramme(chosen, 'loan'), cancelledOutcome = play(cancelled);
    const legacy = clone(chosen), record = row(legacy, legacy.seasons.at(-1)!.year + 1, 28, 30);
    legacy.age = record.age; legacy.seasons = [...legacy.seasons, record]; settleSoccerProgramme(legacy, record);
    delete record.programme; legacy.programme!.receipts = [];
    const receiptLessReady = clone(legacy), legacyAt = vi.mocked(Math.random).mock.calls.length;
    const legacyCompleted = completeProgrammeLoanBuy(legacy, borrower(3)), legacyOnce = clone(legacy);
    const legacyRepeated = completeProgrammeLoanBuy(legacy, borrower(3)), legacyDraws = vi.mocked(Math.random).mock.calls.length - legacyAt;
    raw('legacy-default', c, before, { receiptLessReady, legacyCompleted, legacyRepeated, legacyOnce, legacyAfter: legacy, legacyDraws, ordinary: ordinary.value, ordinaryTape: ordinary.tape,
      unconditional: paid.value, unconditionalTape: paid.tape, cancelled: cancelledOutcome.value,
      cancelledTape: cancelledOutcome.tape });
    expect([receiptLessReady.programme?.loanBuy?.ready, legacyCompleted, legacyRepeated, legacyDraws]).toEqual([true, true, false, 0]);
    expect(Object.prototype.hasOwnProperty.call(receiptLessReady.programme?.loanBuy, 'minimumLeagueApps')).toBe(false);
    expect(legacy).toEqual(legacyOnce);
    expect([legacy.currentClub, legacy.loan, legacy.contractYearsLeft, legacy.weeklyWage]).toEqual([borrower(3).name, null, 2, 12000]);
    expect(ordinary.value).toEqual(ordinaryAgain.value); expect(ordinary.tape).toEqual(ordinaryAgain.tape);
    expect(paid.value).toEqual(paidAgain.value); expect(paid.tape).toEqual(paidAgain.tape);
    expect([ordinary.value.currentClub, ordinary.value.loan, ordinary.value.weeklyWage])
      .toEqual([parent().name, null, 12000]);
    expect([paid.value.currentClub, paid.value.loan, paid.value.contractYearsLeft, paid.value.weeklyWage])
      .toEqual([borrower(3).name, null, 2, 12000]);
    expect(cancelledOutcome.value.currentClub).toBe(parent().name); expect(cancelledOutcome.value.loan).toBeNull();
    expect(cancelledOutcome.value.programme?.receipts.at(-1)?.choices.loan).toBeUndefined();
    expect(ordinary.tape.length).toBeGreaterThan(0); expect(paid.tape.length).toBeGreaterThan(0);
    expect(reload(ordinary.value)).toEqual(ordinary.value); expect(reload(paid.value)).toEqual(paid.value);
    expect(chosen.loan).toEqual(c.loan); expect(chosen.currentClub).toBe(c.currentClub);
    expect([chosen.weeklyWage, chosen.contractYearsLeft, chosen.netWorth, chosen.totalEarnings])
      .toEqual([c.weeklyWage, c.contractYearsLeft, c.netWorth, c.totalEarnings]);
  });
});
