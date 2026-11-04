import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ComponentType, ReactNode } from 'react';
import type { useGrandPrixBoss } from '@/hooks/useGrandPrixBoss';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer, type GrandPrixDriver } from '@/lib/grandPrixBoss';

// Real Page and engine; only the public hook and established page chrome are held.
// Fictional attribute variants exercise disclosure, not save or driver calibration.
const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: ReturnType<typeof useGrandPrixBoss>;
let Page: ComponentType | null = null;

beforeAll(async () => {
  expect(fs.existsSync(pageFile), 'GP_DECISION_ACTUAL_PAGE_FOUNDATION').toBe(true);
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(/* @vite-ignore */ pathToFileURL(pageFile).href)).default;
  expect(Page, 'GP_DECISION_ACTUAL_PAGE_MODULE_FOUNDATION').toBeTypeOf('function');
});
beforeEach(() => {
  cleanup(); localStorage.clear();
  localStorage.setItem('rules-gate-seen:/grand-prix-boss', '1');
  start.mockClear(); dispatch.mockReset().mockReturnValue(true); reload.mockClear();
  current = { career: null, status: 'ready', message: '', moved: false, start, dispatch, reload };
});
afterEach(() => cleanup());

type View = ReturnType<typeof render>;
type Offer = GrandPrixCareer['marketOffers'][number];
const money = (value: number) => '€' + value.toLocaleString('en-US');
const own = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function read(raw: unknown): GrandPrixCareer {
  const bytes = JSON.stringify(raw), result = validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_DECISION_READER_INPUT_HELD').toBe(bytes);
  expect(result.ok, 'GP_DECISION_CANONICAL_FIXTURE_FOUNDATION').toBe(true);
  if (!result.ok) throw new Error('Unreachable rejected decision fixture');
  return result.state;
}
function refresh(raw: GrandPrixCareer): GrandPrixCareer {
  const bytes = JSON.stringify(raw), driver = own(raw)[0];
  const result = applyAction(raw, { type: 'setDriverFocus', driverId: driver.id,
    focus: driver.focus === 'pace' ? 'balanced' : 'pace', expectedRevision: raw.revision });
  expect(JSON.stringify(raw), 'GP_DECISION_FIXTURE_ACTION_INPUT_HELD').toBe(bytes);
  expect(result.ok, 'GP_DECISION_FREE_FOCUS_REFRESH_FOUNDATION').toBe(true);
  if (!result.ok) throw new Error('Unreachable refused fixture refresh');
  return read(result.state);
}
function fixture(): GrandPrixCareer {
  const raw = createCareer(291), available = raw.drivers.filter(driver => driver.contract === null);
  expect(available.length, 'GP_DECISION_TWO_CANDIDATES_FOUNDATION').toBeGreaterThanOrEqual(2);
  raw.cash = 50_000_000;
  Object.assign(available[0], { age: 19, potential: 92, skills: { pace: 71, consistency: 66, tyreCare: 58, wet: 51 } });
  Object.assign(available[1], { age: 31, potential: 79, skills: { pace: 71, consistency: 88, tyreCare: 82, wet: 91 } });
  // Labelled component lab: the existing free action recomputes all market fields.
  return refresh(raw);
}
function offerFor(state: GrandPrixCareer, outgoingId: string, incomingId: string): Offer {
  const offer = state.marketOffers.find(row => row.outgoingDriverId === outgoingId && row.incomingDriverId === incomingId);
  expect(offer, 'GP_DECISION_ACTUAL_OFFER_FOUNDATION').toBeDefined();
  return offer!;
}
function frame() {
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual decision Page unavailable');
  return <MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>;
}
function show(state: GrandPrixCareer): View {
  current.career = state;
  const view = render(frame());
  fireEvent.click(screen.getByRole('button', { name: 'Drivers' }));
  return view;
}
function select(offer: Offer) {
  fireEvent.change(screen.getByLabelText('Seat to change'), { target: { value: offer.outgoingDriverId } });
  fireEvent.change(screen.getByLabelText('Incoming driver'), { target: { value: offer.incomingDriverId } });
}
function assertQuote(offer: Offer) {
  const expected = { 'gp-offer-wage': money(offer.wagePerRace), 'gp-offer-signing-fee': money(offer.signingFee),
    'gp-offer-buyout': money(offer.buyout), 'gp-offer-total-fee': money(offer.totalFee), 'gp-offer-reserved': money(offer.reserveAfter),
    'gp-offer-term': offer.years + ' season', 'gp-offer-start': 'Year ' + offer.startsSeason };
  for (const [id, text] of Object.entries(expected)) expect(screen.getByTestId(id).textContent).toBe(text);
}
function assertProfile(driver: GrandPrixDriver, other: GrandPrixDriver) {
  const profile = screen.queryByRole('region', { name: 'Incoming driver profile' });
  expect(profile !== null, 'GP_DECISION_INCOMING_PROFILE_REQUIRED').toBe(true);
  const walker = document.createTreeWalker(profile!, NodeFilter.SHOW_TEXT), parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
  const text = parts.join(' ').replace(/\s+/g, ' ');
  expect(text, 'GP_DECISION_SELECTED_NAME').toContain(driver.name);
  expect(text, 'GP_DECISION_OTHER_CANDIDATE_NOT_SHOWN').not.toContain(other.name);
  const fields = [['Age', driver.age], ['Potential', driver.potential], ['Pace', driver.skills.pace],
    ['Consistency', driver.skills.consistency], ['Tyre care', driver.skills.tyreCare], ['Wet', driver.skills.wet]] as const;
  for (const [label, value] of fields) expect(text, 'GP_DECISION_SELECTED_' + label).toMatch(new RegExp('\\b' + label + '\\s*' + value + '\\b', 'i'));
  expect((profile!.compareDocumentPosition(screen.getByTestId('gp-offer-wage')) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    'GP_DECISION_PROFILE_BEFORE_QUOTE').toBe(true);
}

describe('Grand Prix Boss incoming-driver decision information', () => {
  it('GP_DECISION_PROFILE: discloses the selected candidate before the quote across available and unfunded views', () => {
    const state = fixture(), seats = own(state), [first, second] = state.drivers.filter(driver => driver.contract === null);
    const firstOffer = offerFor(state, seats[0].id, first.id), before = JSON.stringify(state);
    expect(firstOffer.affordable, 'GP_DECISION_FUNDED_OFFER_FOUNDATION').toBe(true);
    show(state);
    expect((screen.getByLabelText('Incoming driver') as HTMLSelectElement).value).toBe(first.id);
    assertQuote(firstOffer);
    assertProfile(first, second);
    const changed = offerFor(state, seats[0].id, second.id);
    select(changed); assertQuote(changed); assertProfile(second, first);
    const otherSeat = offerFor(state, seats[1].id, second.id);
    select(otherSeat); assertQuote(otherSeat); assertProfile(second, first);
    expect(dispatch).not.toHaveBeenCalled(); expect(JSON.stringify(state)).toBe(before);
    cleanup();
    const unfunded = refresh({ ...state, cash: state.reserved });
    const refused = offerFor(unfunded, seats[0].id, first.id), unfundedBytes = JSON.stringify(unfunded);
    expect(refused.affordable, 'GP_DECISION_UNFUNDED_OFFER_FOUNDATION').toBe(false);
    show(unfunded); select(refused); assertQuote(refused); assertProfile(first, second);
    expect((screen.getByRole('button', { name: 'Sign driver' }) as HTMLButtonElement).disabled).toBe(true);
    expect(dispatch).not.toHaveBeenCalled(); expect(JSON.stringify(unfunded)).toBe(unfundedBytes);
  });

  it('GP_DECISION_SIGN: preserves the selected fee and action until the hook publishes the actual engine result', () => {
    const state = fixture(), seats = own(state), incoming = state.drivers.filter(driver => driver.contract === null)[1];
    const offer = offerFor(state, seats[1].id, incoming.id), before = JSON.stringify(state);
    const view = show(state); select(offer); assertQuote(offer);
    fireEvent.click(screen.getByRole('button', { name: 'Sign driver' }));
    const action: GrandPrixAction = { type: 'signDriver', outgoingDriverId: seats[1].id, incomingDriverId: incoming.id, expectedRevision: state.revision };
    expect(dispatch.mock.calls).toEqual([[action]]);
    expect(JSON.stringify(state)).toBe(before); assertQuote(offer);
    expect(screen.queryByRole('heading', { name: incoming.name + ', ' + incoming.age })).toBeNull();
    const result = applyAction(state, action);
    expect(result.ok, 'GP_DECISION_ACTUAL_SIGN_FOUNDATION').toBe(true);
    if (!result.ok) throw new Error('Unreachable refused signing');
    expect(result.state.cash).toBe(state.cash - offer.totalFee);
    expect(read(result.state)).toEqual(result.state); expect(JSON.stringify(state)).toBe(before);
    current.career = result.state; view.rerender(frame());
    expect(screen.getByRole('heading', { name: incoming.name + ', ' + incoming.age })).toBeDefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('GP_DECISION_LOCKED: preserves quotes and refuses signing while the saved team is protected', () => {
    const state = fixture(), seats = own(state), incoming = state.drivers.find(driver => driver.contract === null)!;
    const offer = offerFor(state, seats[0].id, incoming.id), before = JSON.stringify(state);
    for (const protection of [{ status: 'ready' as const, moved: true }, { status: 'unreadable' as const, moved: false }]) {
      current.status = protection.status; current.moved = protection.moved;
      show(state); assertQuote(offer);
      for (const label of ['Seat to change', 'Incoming driver']) expect((screen.getByLabelText(label) as HTMLSelectElement).disabled).toBe(true);
      const sign = screen.getByRole('button', { name: 'Sign driver' }) as HTMLButtonElement;
      expect(sign.disabled).toBe(true); fireEvent.click(sign);
      expect(dispatch).not.toHaveBeenCalled(); expect(JSON.stringify(state)).toBe(before);
      cleanup();
    }
  });

  it('GP_DECISION_CLOSED: offers no incoming profile or signing action after actual qualifying closes the market', () => {
    const state = fixture(), before = JSON.stringify(state);
    const result = applyAction(state, { type: 'qualify', expectedRevision: state.revision });
    expect(result.ok, 'GP_DECISION_ACTUAL_QUALIFY_FOUNDATION').toBe(true);
    if (!result.ok) throw new Error('Unreachable refused qualifying');
    const closed = read(result.state);
    expect(closed.phase).toBe('grid'); expect(closed.marketOffers).toEqual([]);
    show(closed);
    expect(screen.queryByRole('region', { name: 'Incoming driver profile' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign driver' })).toBeNull();
    expect(screen.queryByLabelText('Incoming driver')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled(); expect(JSON.stringify(state)).toBe(before);
  });
});
