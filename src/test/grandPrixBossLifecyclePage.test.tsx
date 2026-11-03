import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import type { ComponentType, ReactNode } from 'react';
import type { useGrandPrixBoss } from '@/hooks/useGrandPrixBoss';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer, type GrandPrixOrder, type GrandPrixSetup } from '@/lib/grandPrixBoss';

// Actual C reader and actions. Only the public hook and unrelated chrome are mocked.
// Help storage sentinels are component observations, not a persistence or browser proof.
const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: ReturnType<typeof useGrandPrixBoss>;
let Page: ComponentType | null = null;
beforeAll(async () => {
  expect(fs.existsSync(pageFile), 'GP_C_PAGE_ACTUAL_MODULE_FOUNDATION').toBe(true);
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(/* @vite-ignore */ pathToFileURL(pageFile).href)).default;
  expect(Page, 'GP_C_PAGE_COMPONENT_FOUNDATION').toBeTypeOf('function');
});
beforeEach(() => {
  cleanup(); localStorage.clear();
  localStorage.setItem('rules-gate-seen:/grand-prix-boss', '1');
  start.mockClear(); dispatch.mockReset().mockReturnValue(true); reload.mockClear();
  current = { career: null, status: 'ready', message: '', moved: false, start, dispatch, reload };
});
afterEach(() => cleanup());

type View = ReturnType<typeof render>;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const money = (value: number) => '€' + value.toLocaleString('en-US');
const own = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function read(raw: unknown): GrandPrixCareer {
  const before = JSON.stringify(raw), result = validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_C_PAGE_READER_HOLDS_INPUT').toBe(before);
  expect(result.ok, 'GP_C_PAGE_ACTUAL_READER_FOUNDATION').toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused C page fixture');
  return result.state;
}
function move(state: GrandPrixCareer, action: GrandPrixAction): GrandPrixCareer {
  const before = JSON.stringify(state), result = applyAction(state, action);
  expect(JSON.stringify(state), 'GP_C_PAGE_ENGINE_HOLDS_INPUT').toBe(before);
  expect(result.ok, 'GP_C_PAGE_LEGAL_ACTION_FOUNDATION:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused C page action');
  expect(result.state.revision).toBe(state.revision + 1);
  expect(read(result.state), 'GP_C_PAGE_CANONICAL_RESULT_FOUNDATION').toEqual(result.state);
  return result.state;
}
function beginRace(grid: GrandPrixCareer) {
  const setups = own(grid).map<GrandPrixSetup>(driver => ({ driverId: driver.id, pace: 'balanced', compound: grid.race!.weather === 'wet' ? 'wet' : 'medium' }));
  return move(grid, { type: 'startRace', expectedRevision: grid.revision, setups });
}
function finishRace(initial: GrandPrixCareer) {
  let state = initial;
  while (state.phase === 'race') {
    const orders = own(state).map<GrandPrixOrder>(driver => {
      const entry = state.race!.entries.find(value => value.driverId === driver.id)!;
      let pitTo: GrandPrixOrder['pitTo'];
      if (state.race!.lap > 0 && entry.status === 'running') {
        if (state.race!.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
        else if (state.race!.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
        else if (entry.tyreWear > 58) pitTo = state.race!.weather === 'wet' ? 'wet' : 'hard';
      }
      return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
    });
    state = move(state, { type: 'raceInterval', expectedRevision: state.revision, orders });
  }
  return state;
}
function review(initial: GrandPrixCareer) {
  let state = initial;
  while (state.phase !== 'seasonReview') {
    expect(state.phase, 'GP_C_PAGE_NEXT_ROUND_FOUNDATION').toBe('preRace');
    const grid = move(state, { type: 'qualify', expectedRevision: state.revision });
    state = finishRace(beginRace(grid));
    if (state.phase === 'raceResult') state = move(state, { type: 'continue', expectedRevision: state.revision });
  }
  expect(state.results, 'GP_C_PAGE_TWELVE_ACTUAL_RESULTS_FOUNDATION').toHaveLength(12);
  expect(state.nextSeasonPlan, 'GP_C_PAGE_ACTUAL_PLAN_FOUNDATION').not.toBeNull();
  expect(state.nextSeasonPlan!.affordable, 'GP_C_PAGE_FUNDED_PLAN_FOUNDATION').toBe(true);
  return state;
}
function oldStarter(paid = false) {
  const bytes = fs.readFileSync(path.resolve('src/test/fixtures/grandPrixBossV5Starter.json'));
  expect(createHash('sha256').update(bytes).digest('hex'), 'GP_C_PAGE_CAPTURED_V5_PIN').toBe('cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028');
  const original = JSON.parse(bytes.toString('utf8')) as GrandPrixCareer, raw = clone(original);
  expect(raw.drivers.every(driver => !Object.prototype.hasOwnProperty.call(driver, 'focus')), 'GP_C_PAGE_GENUINE_OLD_DRIVER_SHAPE').toBe(true);
  expect(raw.teams.every(team => !Object.prototype.hasOwnProperty.call(team, 'baselineCar')), 'GP_C_PAGE_GENUINE_OLD_CAR_SHAPE').toBe(true);
  expect(raw.history).toBeUndefined(); expect(raw.careerTotals).toBeUndefined();
  const seats = own(raw); expect(seats).toHaveLength(2);
  // Labelled old-save fixture edits before its first C read. All other captured fields stay held.
  for (const driver of seats) { driver.age = paid ? 50 : 39; driver.contract!.years = 1; }
  if (paid) seats[0].contract!.years = 3;
  const restored = clone(raw);
  for (const driver of own(restored)) {
    const held = original.drivers.find(value => value.id === driver.id)!;
    driver.age = held.age; driver.contract!.years = held.contract!.years;
    if (Object.prototype.hasOwnProperty.call(held.contract, 'startsSeason')) driver.contract!.startsSeason = held.contract!.startsSeason;
    else delete driver.contract!.startsSeason;
  }
  expect(restored, 'GP_C_PAGE_LABELLED_OLD_FIXTURE_WHOLE_INVERSE').toEqual(original);
  const admitted = read(raw);
  expect(admitted.drivers.every(driver => driver.focus !== undefined)).toBe(true);
  expect(admitted.teams.every(team => team.baselineCar !== undefined)).toBe(true);
  expect(admitted.history).toEqual([]); expect(admitted.careerTotals.sinceSeason).toBe(1);
  return admitted;
}
function honoredReview() {
  const completed = review(oldStarter(true)), raw = clone(completed), seat = own(raw)[1];
  expect(raw.phase, 'GP_C_PAGE_FUTURE_TERM_REVIEW_FOUNDATION').toBe('seasonReview');
  const priorStarts = seat.contract!.startsSeason;
  // Labelled existing-paid contract timing at review, not an unperformed renewal payment.
  seat.contract!.startsSeason = raw.season + 1;
  raw.marketOffers = undefined; raw.nextSeasonPlan = undefined;
  const restored = clone(raw);
  own(restored)[1].contract!.startsSeason = priorStarts;
  restored.marketOffers = clone(completed.marketOffers); restored.nextSeasonPlan = clone(completed.nextSeasonPlan);
  expect(restored, 'GP_C_PAGE_REVIEW_TERM_LAB_WHOLE_INVERSE').toEqual(completed);
  const admitted = read(raw);
  expect(admitted.teams).toEqual(completed.teams); expect(admitted.history).toEqual(completed.history);
  expect(admitted.careerTotals).toEqual(completed.careerTotals);
  expect(admitted.drivers.map(driver => driver.focus)).toEqual(completed.drivers.map(driver => driver.focus));
  return admitted;
}
function frame() {
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual C page module unavailable');
  return <MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>;
}
function show(state: GrandPrixCareer) { current.career = state; return render(frame()); }
function publish(view: View, state: GrandPrixCareer) { current.career = state; view.rerender(frame()); }
function open(name: 'Drivers' | 'Next race' | 'Finances') { fireEvent.click(screen.getByRole('button', { name })); }
function back() { fireEvent.click(screen.getByRole('button', { name: 'Back to team' })); }
function focusControl(name: string) { return screen.getByRole('combobox', { name: 'Development focus for ' + name }) as HTMLSelectElement; }
function disabled(node: HTMLElement) {
  expect(node instanceof HTMLButtonElement || node instanceof HTMLSelectElement, 'GP_C_PAGE_NATIVE_CONTROL_FOUNDATION').toBe(true);
  return (node as HTMLButtonElement | HTMLSelectElement).disabled;
}
function assertPlan(state: GrandPrixCareer) {
  const plan = state.nextSeasonPlan!;
  for (const [id, value] of Object.entries({ 'gp-season-end-cash': state.cash, 'gp-next-sponsor': plan.sponsor,
    'gp-next-renewal-fee': plan.totalRenewalFee, 'gp-next-replacement-fee': plan.totalReplacementFee,
    'gp-next-reserved': plan.nextReserved, 'gp-next-cash-after': plan.cashAfter })) expect(screen.getByTestId(id).textContent).toBe(money(value));
}
function assertReplacementRows(state: GrandPrixCareer) {
  const container = screen.getByTestId('gp-seat-replacements'), plan = state.nextSeasonPlan!;
  for (const row of plan.seatReplacements) {
    const departing = state.drivers.find(driver => driver.id === row.departingDriverId)!;
    const detail = within(within(container).getByTestId('gp-seat-replacement-' + departing.id));
    for (const value of [departing.name, row.rookie.name, 'Age ' + row.rookie.age, 'Potential ' + row.rookie.potential,
      'Pace ' + row.rookie.skills.pace, 'Consistency ' + row.rookie.skills.consistency, 'Tyre care ' + row.rookie.skills.tyreCare, 'Wet ' + row.rookie.skills.wet,
      'Fee ' + money(row.signingFee), 'Wage ' + money(row.rookie.contract!.wagePerRace) + ' per race',
      row.rookie.contract!.years + ' season from year ' + row.rookie.contract!.startsSeason]) expect(detail.getByText(value, { exact: true })).toBeDefined();
  }
  expect(within(container).getAllByTestId(/^gp-seat-replacement-/)).toHaveLength(plan.seatReplacements.length);
}

describe('Grand Prix Boss C management page decisions', { timeout: 180000 }, () => {
  it('GP_C_PAGE_FOCUS: dispatches free owned focus choices only in actual engine windows', async () => {
    const initial = read(createCareer(291)), [driver] = own(initial), initialBytes = JSON.stringify(initial);
    const change: GrandPrixAction = { type: 'setDriverFocus', driverId: driver.id, focus: 'pace', expectedRevision: initial.revision };
    const changed = move(initial, change), grid = move(changed, { type: 'qualify', expectedRevision: changed.revision });
    const racing = beginRace(grid), result = finishRace(racing), roundTwo = move(result, { type: 'continue', expectedRevision: result.revision });
    const completed = review(changed), reviewChange: GrandPrixAction = { type: 'setDriverFocus', driverId: driver.id, focus: 'consistency', expectedRevision: completed.revision };
    const reviewed = move(completed, reviewChange);
    for (const state of [grid, racing, result, roundTwo]) {
      const before = JSON.stringify(state);
      expect(applyAction(state, { type: 'setDriverFocus', driverId: driver.id, focus: 'wet', expectedRevision: state.revision }), 'GP_C_PAGE_CLOSED_WINDOW_FOUNDATION').toEqual({ ok: false, reason: 'phase' });
      expect(JSON.stringify(state)).toBe(before);
    }
    const view = show(initial); open('Drivers');
    const control = screen.queryByRole('combobox', { name: 'Development focus for ' + driver.name });
    expect(control, 'GP_C_PAGE_FOCUS_CONTROL_MISSING').not.toBeNull();
    expect(screen.getAllByRole('combobox', { name: /^Development focus for / })).toHaveLength(2);
    for (const seat of own(initial)) {
      const select = focusControl(seat.name);
      expect([...select.options].map(option => option.value)).toEqual(['balanced', 'pace', 'consistency', 'tyreCare', 'wet']);
      expect(select.value).toBe(seat.focus); expect(disabled(select)).toBe(false);
    }
    const foreign = initial.drivers.find(row => row.contract?.teamId !== initial.teamId)!;
    expect(screen.queryByRole('combobox', { name: 'Development focus for ' + foreign.name })).toBeNull();
    dispatch.mockReturnValue(false); fireEvent.change(control!, { target: { value: 'pace' } });
    expect(dispatch.mock.calls).toEqual([[change]]);
    await waitFor(() => expect(focusControl(driver.name).value).toBe('balanced'));
    expect(JSON.stringify(initial)).toBe(initialBytes); expect(initial.cash).toBe(changed.cash); expect(initial.seed).toBe(changed.seed);
    dispatch.mockClear(); dispatch.mockReturnValue(true);
    fireEvent.change(focusControl(driver.name), { target: { value: 'pace' } });
    expect(dispatch.mock.calls).toEqual([[change]]); expect(focusControl(driver.name).value).toBe('balanced');
    publish(view, changed); expect(focusControl(driver.name).value).toBe('pace');
    for (const protectedStatus of ['moved', 'unreadable'] as const) {
      current.moved = protectedStatus === 'moved'; current.status = protectedStatus === 'unreadable' ? 'unreadable' : 'ready'; publish(view, changed);
      dispatch.mockClear(); expect(disabled(focusControl(driver.name))).toBe(true);
      fireEvent.change(focusControl(driver.name), { target: { value: 'wet' } }); expect(dispatch).not.toHaveBeenCalled();
      expect(focusControl(driver.name).value).toBe('pace');
    }
    current.moved = false; current.status = 'ready';
    for (const state of [grid, racing, result, roundTwo]) {
      publish(view, state); dispatch.mockClear();
      expect(disabled(focusControl(driver.name))).toBe(true); expect(focusControl(driver.name).value).toBe('pace');
      fireEvent.change(focusControl(driver.name), { target: { value: 'wet' } }); expect(dispatch).not.toHaveBeenCalled();
    }
    publish(view, completed); dispatch.mockClear(); expect(disabled(focusControl(driver.name))).toBe(false);
    fireEvent.change(focusControl(driver.name), { target: { value: 'consistency' } });
    expect(dispatch.mock.calls).toEqual([[reviewChange]]); expect(focusControl(driver.name).value).toBe('pace');
    publish(view, reviewed); expect(focusControl(driver.name).value).toBe('consistency');
    expect(reviewed.cash).toBe(completed.cash); expect(reviewed.seed).toBe(completed.seed); expect(reviewed.results).toEqual(completed.results);
    expect(JSON.stringify(initial)).toBe(initialBytes);
  });

  it('GP_C_PAGE_REPLACEMENTS: displays canonical prospects and publishes the exact next-year transaction', () => {
    const completed = review(oldStarter()), plan = completed.nextSeasonPlan!, oldSeats = own(completed), before = JSON.stringify(completed);
    expect(plan.seatReplacements, 'GP_C_PAGE_TWO_RETIRING_SEATS_FOUNDATION').toHaveLength(2);
    expect(plan.seatReplacements.map(row => row.departingDriverId).sort()).toEqual(oldSeats.map(driver => driver.id).sort());
    const advanced = move(completed, { type: 'startNextSeason', expectedRevision: completed.revision });
    expect(advanced.cash).toBe(plan.cashAfter); expect(advanced.reserved).toBe(plan.nextReserved);
    expect(advanced.history[0].team.drivers.map(driver => driver.driverId).sort()).toEqual(oldSeats.map(driver => driver.id).sort());
    for (const row of plan.seatReplacements) expect(advanced.drivers.find(driver => driver.id === row.rookie.id)).toEqual(row.rookie);
    const honored = honoredReview();
    expect(honored.nextSeasonPlan!.seatReplacements, 'GP_C_PAGE_PAID_TERMS_FOUNDATION').toEqual([]);
    const paidNext = move(honored, { type: 'startNextSeason', expectedRevision: honored.revision });
    expect(own(paidNext).map(driver => driver.id).sort()).toEqual(own(honored).map(driver => driver.id).sort());
    const view = show(completed); open('Next race');
    expect(screen.queryByTestId('gp-seat-replacements'), 'GP_C_PAGE_REPLACEMENT_DISCLOSURE_MISSING').not.toBeNull();
    assertReplacementRows(completed); assertPlan(completed);
    const action = screen.getByRole('button', { name: 'Start next season' }); expect(disabled(action)).toBe(!plan.affordable);
    dispatch.mockReturnValue(false); fireEvent.click(action);
    expect(dispatch.mock.calls).toEqual([[{ type: 'startNextSeason', expectedRevision: completed.revision }]]);
    assertReplacementRows(completed); assertPlan(completed); expect(JSON.stringify(completed)).toBe(before);
    current.moved = true; view.rerender(frame()); dispatch.mockClear();
    expect(disabled(screen.getByRole('button', { name: 'Start next season' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start next season' })); expect(dispatch).not.toHaveBeenCalled();
    current.moved = false; current.status = 'unreadable'; view.rerender(frame());
    expect(disabled(screen.getByRole('button', { name: 'Start next season' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start next season' })); expect(dispatch).not.toHaveBeenCalled();
    current.status = 'ready'; dispatch.mockReturnValue(true); view.rerender(frame());
    fireEvent.click(screen.getByRole('button', { name: 'Start next season' }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'startNextSeason', expectedRevision: completed.revision }]]);
    assertReplacementRows(completed); expect(screen.queryByRole('button', { name: 'Run qualifying' })).toBeNull();
    publish(view, advanced); expect(screen.getByRole('button', { name: 'Run qualifying' })).toBeDefined();
    for (const rookie of own(advanced)) expect(screen.getByRole('heading', { name: rookie.name, level: 4 })).toBeDefined();
    for (const departed of oldSeats) expect(screen.queryByRole('heading', { name: departed.name, level: 4 })).toBeNull();
    back(); open('Finances');
    expect(screen.getByText(money(plan.cashAfter), { exact: true })).toBeDefined(); expect(screen.getByText(money(plan.nextReserved), { exact: true })).toBeDefined();
    back(); publish(view, honored); open('Next race'); assertPlan(honored);
    expect(screen.queryAllByTestId(/^gp-seat-replacement-/)).toHaveLength(0);
    expect(screen.queryByText('Fee ' + money(plan.seatReplacements[0].signingFee), { exact: true })).toBeNull();
    expect(JSON.stringify(completed)).toBe(before);
  });

  it('GP_C_PAGE_RULES: explains lifecycle decisions in real first and reopened rules without changing the team', async () => {
    const state = review(oldStarter()), before = JSON.stringify(state);
    const key = 'grand-prix-boss-save-v1', fence = 'dukb-fence:' + key;
    const saved = JSON.stringify({ schemaVersion: 1, career: state, completedSeasons: [state.season] });
    localStorage.setItem(key, saved); localStorage.setItem(fence, '7');
    localStorage.removeItem('rules-gate-seen:/grand-prix-boss');
    show(state);
    let help = await screen.findByRole('dialog', { name: 'How to play Grand Prix Boss' });
    expect(help.textContent, 'GP_C_PAGE_LIFECYCLE_GUIDANCE_MISSING').toMatch(/development focus/i);
    const assertRules = (dialog: HTMLElement) => {
      const text = dialog.textContent!;
      for (const phrase of [/development focus/i, /before (?:the )?first qualifying/i, /after the season/i,
        /paid terms (?:stay|remain) honored/i, /retirement/i, /prospect/i, /replacement fee/i, /reserve/i]) expect(text).toMatch(phrase);
      expect(within(dialog).getByText('A two-driver example', { exact: true })).toBeDefined();
      const worked = within(dialog).getByText('A retirement replacement example', { exact: true }).parentElement;
      for (const phrase of [/quoted prospect/i, /replacement fee/i, /reserve/i]) expect(worked?.textContent).toMatch(phrase);
    };
    assertRules(help); expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(within(help).getByRole('button', { name: "Let's Play!" }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'How to play Grand Prix Boss' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'How to play' })));
    open('Next race'); assertPlan(state); assertReplacementRows(state);
    expect(disabled(screen.getByRole('button', { name: 'Start next season' }))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    help = screen.getByRole('dialog', { name: 'How to play Grand Prix Boss' }); assertRules(help);
    fireEvent.keyDown(help, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'How to play Grand Prix Boss' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'How to play' })));
    expect(JSON.stringify(state)).toBe(before); expect(current.career!.seed).toBe(state.seed);
    expect(localStorage.getItem(key)).toBe(saved); expect(localStorage.getItem(fence)).toBe('7');
    expect(dispatch).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
  });
});
