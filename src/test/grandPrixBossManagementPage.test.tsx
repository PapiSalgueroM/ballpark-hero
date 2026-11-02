import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ComponentType, ReactNode } from 'react';
import type { useGrandPrixBoss } from '@/hooks/useGrandPrixBoss';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer, type GrandPrixOrder, type GrandPrixSetup } from '@/lib/grandPrixBoss';

// Real engine fixtures; the established public hook/chrome boundary is mocked.
// These component decisions do not claim storage, provider or route coverage.
const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: ReturnType<typeof useGrandPrixBoss>;
let Page: ComponentType | null = null;
beforeAll(async () => {
  expect(fs.existsSync(pageFile), 'GP_MANAGEMENT_ACTUAL_PAGE_FOUNDATION').toBe(true);
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(/* @vite-ignore */ pathToFileURL(pageFile).href)).default;
  expect(Page, 'GP_MANAGEMENT_PAGE_MODULE_FOUNDATION').toBeTypeOf('function');
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
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const own = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function read(raw: unknown): GrandPrixCareer {
  const bytes = JSON.stringify(raw), result = validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_MANAGEMENT_READER_INPUT_HELD').toBe(bytes);
  expect(result.ok, 'GP_MANAGEMENT_READER_FOUNDATION').toBe(true);
  if (!result.ok) throw new Error('Unreachable rejected fixture');
  return result.state;
}
function reprice(state: GrandPrixCareer) {
  // Explicit legacy quote-cache boundary, not a hand-edited affordability flag.
  return read({ ...clone(state), marketOffers: undefined, nextSeasonPlan: undefined });
}
function move(state: GrandPrixCareer, action: GrandPrixAction): GrandPrixCareer {
  const bytes = JSON.stringify(state), result = applyAction(state, action);
  expect(JSON.stringify(state), 'GP_MANAGEMENT_ENGINE_INPUT_HELD').toBe(bytes);
  expect(result.ok, 'GP_MANAGEMENT_ENGINE_ACTION_FOUNDATION:' + action.type).toBe(true);
  if (!result.ok) throw new Error('Unreachable refused fixture action');
  expect(read(result.state), 'GP_MANAGEMENT_COMMITTED_READER_FOUNDATION').toEqual(result.state);
  return result.state;
}
function playReview(initial: GrandPrixCareer): GrandPrixCareer {
  let state = initial;
  for (let round = 0; round < 12; round++) {
    state = move(state, { type: 'qualify', expectedRevision: state.revision });
    const setups = own(state).map<GrandPrixSetup>(driver => ({ driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium' }));
    state = move(state, { type: 'startRace', expectedRevision: state.revision, setups });
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
    if (round < 11) state = move(state, { type: 'continue', expectedRevision: state.revision });
  }
  expect(state.phase, 'GP_MANAGEMENT_REVIEW_FOUNDATION').toBe('seasonReview');
  expect(state.results, 'GP_MANAGEMENT_TWELVE_REAL_RESULTS_FOUNDATION').toHaveLength(12);
  expect(state.nextSeasonPlan, 'GP_MANAGEMENT_REAL_PLAN_FOUNDATION').not.toBeNull();
  return state;
}
function expiringReview() {
  const state = clone(createCareer(291)), seats = own(state);
  expect(seats).toHaveLength(2);
  // A labelled reader-admitted term fixture; all races and prices remain real engine outcomes.
  seats[0].contract!.years = 1; seats[1].contract!.years = 2;
  return playReview(reprice(state));
}
function richReview() {
  const state = clone(createCareer(291)), seats = own(state);
  state.cash = 50_000_000;
  state.reserved += state.calendar.length * (1_000_000 - seats[1].contract!.wagePerRace);
  seats[0].contract!.years = 2; seats[1].contract!.years = 2;
  seats[1].contract!.wagePerRace = 1_000_000;
  return playReview(reprice(state));
}
function firstSigning(state: GrandPrixCareer): Offer {
  const offer = state.marketOffers.find(value => value.outgoingDriverId !== value.incomingDriverId && value.affordable);
  expect(offer, 'GP_MANAGEMENT_AFFORDABLE_OFFER_FOUNDATION').toBeDefined();
  return offer!;
}
function frame() {
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual page module unavailable');
  return <MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>;
}
function show(state: GrandPrixCareer): View {
  current.career = state;
  return render(frame());
}
function publish(view: View, state: GrandPrixCareer) { current.career = state; view.rerender(frame()); }
function open(name: 'Drivers' | 'Next race' | 'History') { fireEvent.click(screen.getByRole('button', { name })); }
function choose(offer: Offer) {
  fireEvent.change(screen.getByLabelText('Seat to change'), { target: { value: offer.outgoingDriverId } });
  fireEvent.change(screen.getByLabelText('Incoming driver'), { target: { value: offer.incomingDriverId } });
}
function buttonDisabled(button: HTMLElement) {
  expect(button instanceof HTMLButtonElement, 'GP_MANAGEMENT_NATIVE_BUTTON_FOUNDATION').toBe(true);
  return (button as HTMLButtonElement).disabled;
}
function assertOffer(offer: Offer) {
  const values = { 'gp-offer-wage': money(offer.wagePerRace), 'gp-offer-signing-fee': money(offer.signingFee), 'gp-offer-buyout': money(offer.buyout),
    'gp-offer-total-fee': money(offer.totalFee), 'gp-offer-reserved': money(offer.reserveAfter), 'gp-offer-term': `${offer.years} season${offer.years === 1 ? '' : 's'}`, 'gp-offer-start': 'Year ' + offer.startsSeason };
  for (const [id, value] of Object.entries(values)) expect(screen.getByTestId(id).textContent).toBe(value);
}

describe('Grand Prix Boss management decisions and saved seasons', { timeout: 120000 }, () => {
  it('GP_MANAGEMENT_SIGN: displays an actual offer and dispatches its IDs and current revision', () => {
    const state = read(createCareer(291)), offer = firstSigning(state), before = JSON.stringify(state);
    show(state);
    expect(screen.getAllByRole('button'), 'GP_MANAGEMENT_SIX_TILES_PLUS_HELP_FOUNDATION').toHaveLength(7);
    open('Drivers');
    expect(screen.getByRole('heading', { name: 'Your two seats' })).toBeDefined();
    const action = screen.queryByRole('button', { name: 'Sign driver' });
    expect(action, 'GP_PAGE_MARKET_SIGN_MISSING').not.toBeNull();
    choose(offer); assertOffer(offer);
    expect(buttonDisabled(action!)).toBe(false);
    fireEvent.click(action!);
    expect(dispatch.mock.calls).toEqual([[{ type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId, expectedRevision: state.revision }]]);
    expect(JSON.stringify(state)).toBe(before);
    expect(screen.getByTestId('gp-offer-total-fee').textContent).toBe(money(offer.totalFee));
  });

  it('GP_MANAGEMENT_RENEW: exposes a real next-year renewal without charging it again in the plan', () => {
    const state = expiringReview(), offer = state.marketOffers.find(value => value.outgoingDriverId === value.incomingDriverId);
    expect(offer, 'GP_MANAGEMENT_EXPIRING_RENEWAL_FOUNDATION').toBeDefined();
    const driver = state.drivers.find(value => value.id === offer!.outgoingDriverId)!;
    expect(offer!.affordable, 'GP_MANAGEMENT_FUNDED_RENEWAL_FOUNDATION').toBe(true);
    const view = show(state); open('Drivers');
    const action = screen.queryByRole('button', { name: 'Renew ' + driver.name });
    expect(action, 'GP_PAGE_MARKET_RENEW_MISSING').not.toBeNull();
    const detail = within(screen.getByTestId('gp-renewal-' + driver.id));
    expect(detail.getByText(money(offer!.signingFee))).toBeDefined();
    expect(detail.getByText(money(offer!.wagePerRace))).toBeDefined();
    expect(detail.getByText('1 season')).toBeDefined();
    expect(detail.getByText('Year ' + offer!.startsSeason)).toBeDefined();
    expect(buttonDisabled(action!)).toBe(false);
    current.moved = true; view.rerender(frame());
    expect(buttonDisabled(screen.getByRole('button', { name: 'Renew ' + driver.name }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Renew ' + driver.name })); expect(dispatch).not.toHaveBeenCalled();
    current.moved = false; current.status = 'unreadable'; view.rerender(frame());
    expect(buttonDisabled(screen.getByRole('button', { name: 'Renew ' + driver.name }))).toBe(true);
    current.status = 'ready'; view.rerender(frame());
    fireEvent.click(screen.getByRole('button', { name: 'Renew ' + driver.name }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'renewDriver', driverId: driver.id, expectedRevision: state.revision }]]);
    const renewed = move(state, { type: 'renewDriver', driverId: driver.id, expectedRevision: state.revision });
    expect(renewed.nextSeasonPlan!.totalRenewalFee).toBe(state.nextSeasonPlan!.totalRenewalFee - offer!.signingFee);
    publish(view, renewed);
    expect(screen.queryByRole('button', { name: 'Renew ' + driver.name })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to team' })); open('Next race');
    expect(screen.getByTestId('gp-next-renewal-fee').textContent).toBe(money(renewed.nextSeasonPlan!.totalRenewalFee));
    expect(renewed.drivers.find(value => value.id === driver.id)!.contract).toMatchObject({ years: 1, startsSeason: state.season + 1, wagePerRace: offer!.wagePerRace });
  });

  it('GP_MANAGEMENT_NEXT_YEAR: shows the actual plan and advances only after the hook publishes it', async () => {
    const state = expiringReview(), plan = state.nextSeasonPlan!, before = JSON.stringify(state), view = show(state);
    expect(plan.affordable, 'GP_MANAGEMENT_FUNDED_YEAR_FOUNDATION').toBe(true);
    open('Next race');
    const action = screen.queryByRole('button', { name: 'Start next season' });
    expect(action, 'GP_PAGE_NEXT_SEASON_MISSING').not.toBeNull();
    for (const [id, value] of Object.entries({ 'gp-next-sponsor': plan.sponsor, 'gp-next-renewal-fee': plan.totalRenewalFee, 'gp-next-reserved': plan.nextReserved, 'gp-next-cash-after': plan.cashAfter, 'gp-season-end-cash': state.cash })) expect(screen.getByTestId(id).textContent).toBe(money(value));
    fireEvent.click(action!);
    expect(dispatch.mock.calls).toEqual([[{ type: 'startNextSeason', expectedRevision: state.revision }]]);
    expect(JSON.stringify(state)).toBe(before);
    expect(screen.queryByRole('button', { name: 'Start next season' })).not.toBeNull();
    const advanced = move(state, { type: 'startNextSeason', expectedRevision: state.revision });
    publish(view, advanced);
    expect(screen.getByRole('button', { name: 'Run qualifying' })).toBeDefined();
    expect(screen.getByText(/Round 1 of 12/)).toBeDefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to team' }));
    expect(screen.getByText('Year ' + advanced.season + ', round 1')).toBeDefined();
    expect(advanced.cash).toBe(plan.cashAfter); expect(advanced.reserved).toBe(plan.nextReserved);
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    const help = screen.getByRole('dialog', { name: 'How to play Grand Prix Boss' });
    for (const word of [/sponsor/i, /automatic renew/i, /saved seasons/i, /next season/i]) expect(help.textContent).toMatch(word);
    expect(within(help).getByText('A two-driver example')).toBeDefined();
    fireEvent.keyDown(help, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'How to play Grand Prix Boss' })).toBeNull());
  });

  it('GP_MANAGEMENT_GUARDS: refuses unfunded and protected decisions and holds a rejected transition', async () => {
    const initial = createCareer(291), unfunded = reprice({ ...initial, cash: initial.reserved });
    const unavailable = unfunded.marketOffers.filter(value => value.outgoingDriverId !== value.incomingDriverId);
    expect(unavailable.length, 'GP_MANAGEMENT_NONEMPTY_OFFER_FOUNDATION').toBeGreaterThan(0);
    expect(unavailable.every(value => !value.affordable), 'GP_MANAGEMENT_UNFUNDED_OFFER_FOUNDATION').toBe(true);
    let view = show(unfunded); open('Drivers');
    const sign = screen.queryByRole('button', { name: 'Sign driver' });
    expect(sign, 'GP_PAGE_MANAGEMENT_GUARDS_MISSING').not.toBeNull();
    expect(buttonDisabled(sign!)).toBe(true); fireEvent.click(sign!); expect(dispatch).not.toHaveBeenCalled();
    view.unmount();
    const ended = richReview(), plan = ended.nextSeasonPlan!, required = plan.nextReserved - plan.sponsor + plan.totalRenewalFee;
    expect(required, 'GP_MANAGEMENT_POSITIVE_CASH_BOUNDARY_FOUNDATION').toBeGreaterThan(0);
    const short = reprice({ ...ended, cash: required - 1 });
    expect(short.nextSeasonPlan!.affordable).toBe(false);
    view = show(short); open('Next race');
    const next = screen.getByRole('button', { name: 'Start next season' });
    expect(buttonDisabled(next)).toBe(true); fireEvent.click(next); expect(dispatch).not.toHaveBeenCalled();
    const exact = reprice({ ...ended, cash: required });
    expect(exact.nextSeasonPlan!.affordable).toBe(true);
    current.moved = true; publish(view, exact);
    expect(buttonDisabled(screen.getByRole('button', { name: 'Start next season' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start next season' })); expect(dispatch).not.toHaveBeenCalled();
    view.unmount(); current.moved = false;
    const funded = expiringReview(), fundedOffer = firstSigning(funded);
    view = show(funded); open('Drivers'); choose(fundedOffer);
    expect(buttonDisabled(screen.getByRole('button', { name: 'Sign driver' }))).toBe(false);
    current.moved = true; view.rerender(frame());
    expect(buttonDisabled(screen.getByRole('button', { name: 'Sign driver' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sign driver' })); expect(dispatch).not.toHaveBeenCalled();
    current.moved = false; current.status = 'unreadable'; view.rerender(frame());
    expect(buttonDisabled(screen.getByRole('button', { name: 'Sign driver' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Back to team' })); open('Next race');
    expect(buttonDisabled(screen.getByRole('button', { name: 'Start next season' }))).toBe(true);
    current.status = 'ready'; view.rerender(frame()); dispatch.mockReturnValue(false);
    const before = JSON.stringify(funded);
    fireEvent.click(screen.getByRole('button', { name: 'Start next season' }));
    expect(dispatch.mock.calls).toEqual([[{ type: 'startNextSeason', expectedRevision: funded.revision }]]);
    expect(JSON.stringify(funded)).toBe(before);
    expect(screen.getByRole('button', { name: 'Start next season' })).toBeDefined();
    expect(screen.getByTestId('gp-next-cash-after').textContent).toBe(money(funded.nextSeasonPlan!.cashAfter));
    fireEvent.click(screen.getByRole('button', { name: 'Back to team' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next race' })));
  });

  it('GP_MANAGEMENT_HISTORY: reads archived champions and races with honest legacy coverage', () => {
    const ended = expiringReview(), archived = move(ended, { type: 'startNextSeason', expectedRevision: ended.revision });
    expect(archived.history, 'GP_MANAGEMENT_ARCHIVE_FOUNDATION').toHaveLength(1);
    const saved = clone(archived.history[0]), changed = clone(archived);
    // Synthetic active-roster successor, matching B's admitted history boundary, not a C retirement claim.
    const oldId = saved.driverChampion.driverId, successor = changed.drivers.find(driver => driver.id === oldId)!;
    successor.id = 'gp-fixture-current-successor'; successor.name = 'Fixture Current Successor';
    changed.driverStandings.find(row => row.driverId === oldId)!.driverId = successor.id;
    const state = reprice(changed), before = JSON.stringify(state);
    expect(state.history[0]).toEqual(saved);
    expect(state.drivers.some(driver => driver.id === oldId)).toBe(false);
    const view = show(state); open('History');
    const season = screen.queryByRole('button', { name: 'Season ' + saved.season });
    expect(season, 'GP_PAGE_ARCHIVED_HISTORY_MISSING').not.toBeNull();
    fireEvent.click(season!);
    expect(screen.getByTestId('gp-archive-driver-champion').textContent).toContain(saved.driverChampion.name);
    expect(screen.getByTestId('gp-archive-driver-points').textContent).toBe(String(saved.driverChampion.points));
    expect(screen.getByTestId('gp-archive-team-champion').textContent).toContain(saved.constructorChampion.name);
    expect(screen.getByTestId('gp-archive-team-points').textContent).toBe(String(saved.constructorChampion.points));
    expect(screen.getByTestId('gp-archive-end-cash').textContent).toBe(money(saved.endCash));
    for (const area of ['power', 'aero', 'reliability'] as const) expect(screen.getByTestId('gp-archive-' + area).textContent).toBe(String(saved.finalCar[area]));
    for (const race of saved.races) {
      const text = screen.getByTestId('gp-archive-race-' + race.roundId).textContent!;
      expect(text).toContain(race.trackName); expect(text).toContain(money(race.teamPrize)); expect(text).toContain(money(race.operatingCost));
      for (const driver of race.drivers) expect(text).toContain(driver.name + ': ' + (driver.status === 'retired' ? 'retired' : 'P' + driver.position) + ', ' + driver.points + ' pts');
    }
    expect(screen.getByTestId('gp-history-total-seasons').textContent).toBe(String(state.careerTotals.archivedSeasons));
    expect(screen.getByTestId('gp-history-driver-titles').textContent).toBe(String(state.careerTotals.driverTitles));
    expect(screen.getByTestId('gp-history-team-titles').textContent).toBe(String(state.careerTotals.constructorTitles));
    expect(JSON.stringify(state)).toBe(before); expect(dispatch).not.toHaveBeenCalled();
    view.unmount();
    // Synthetic older missing-ledger shape, not fourteen claimed played seasons.
    const olderRaw = { ...createCareer(291), season: 14, history: undefined, careerTotals: undefined, marketOffers: undefined, nextSeasonPlan: undefined };
    for (const driver of olderRaw.drivers) delete (driver as unknown as Record<string, unknown>).focus;
    for (const team of olderRaw.teams) delete (team as unknown as Record<string, unknown>).baselineCar;
    const legacy = read(olderRaw);
    expect(legacy.careerTotals).toMatchObject({ archivedSeasons: 0, sinceSeason: 14, earlierSeasonsUnknown: true });
    show(legacy); open('History');
    expect(screen.getByTestId('gp-history-coverage').textContent).toBe('Recorded since year 14. Earlier seasons are unknown.');
    expect(screen.getByTestId('gp-history-total-seasons').textContent).toBe('0');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('GP_MANAGEMENT_REVIEW_CARDS: preserves actual finished participants after a paid review signing', () => {
    const ended = expiringReview(), offer = firstSigning(ended), outgoing = ended.drivers.find(driver => driver.id === offer.outgoingDriverId)!;
    expect(ended.race!.entries.some(value => value.driverId === outgoing.id && value.teamId === ended.teamId), 'GP_MANAGEMENT_OLD_PARTICIPANT_FOUNDATION').toBe(true);
    const state = move(ended, { type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId, expectedRevision: ended.revision });
    const historical = state.race!.entries.filter(value => value.teamId === state.teamId), expectedNames = historical.map(value => state.drivers.find(driver => driver.id === value.driverId)!.name);
    expect(historical).toHaveLength(2);
    expect(own(state).some(driver => driver.id === outgoing.id)).toBe(false);
    const view = show(state); open('Next race');
    const names = screen.getAllByRole('heading', { level: 4 }).map(node => node.textContent);
    expect([...names].sort(), 'GP_PAGE_HISTORICAL_RACE_PARTICIPANTS_WRONG').toEqual([...expectedNames].sort());
    const result = state.results.find(row => row.roundId === state.race!.roundId)!;
    for (const entry of historical) {
      const name = state.drivers.find(driver => driver.id === entry.driverId)!.name, card = screen.getByRole('heading', { name, level: 4 }).closest('section')!;
      const classified = result.classification.find(row => row.driverId === entry.driverId)!;
      expect(within(card).getByText(classified.status === 'retired' ? 'Retired' : 'P' + classified.position)).toBeDefined();
      expect(within(card).queryByText('Not qualified')).toBeNull();
    }
    const incomingName = state.drivers.find(driver => driver.id === offer.incomingDriverId)!.name;
    expect(screen.queryByRole('heading', { name: incomingName, level: 4 })).toBeNull();
    const next = move(state, { type: 'startNextSeason', expectedRevision: state.revision }), qualified = move(next, { type: 'qualify', expectedRevision: next.revision });
    publish(view, qualified);
    expect(screen.getAllByRole('heading', { level: 4 }).map(node => node.textContent).sort()).toEqual(own(qualified).map(driver => driver.name).sort());
    for (const driver of own(qualified)) expect(screen.getByLabelText('Tyres for ' + driver.name)).toBeDefined();
    expect(screen.queryByRole('heading', { name: outgoing.name, level: 4 })).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
