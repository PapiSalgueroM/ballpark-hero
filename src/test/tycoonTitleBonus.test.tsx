import './dailyReload/mocks';
import { act, cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import {
  deserializeTycoon, DIVISIONS, leagueShape, newLeague, newTycoon, serializeTycoon, tick, TYCOON_SAVE_KEY, type TycoonState,
} from '@/lib/stadiumTycoon';

const now = Date.UTC(2026, 10, 11, 5);
const summit = DIVISIONS.length - 1;
const frameMs = 1_401;
const noGoal = () => 0.999999;

function beforeTitle(division: number) {
  let state: TycoonState = { ...newTycoon(now), bestDivision: division, league: newLeague(0, division, 0) };
  const matchdays = leagueShape(division).matchdays;
  for (let day = 0; day < matchdays; day += 1) {
    let roll = 0;
    // Score once in the first minute and hold the 1-0 lead.
    const advance = day === matchdays - 1 ? 124.600001 : 126.000001;
    const { state: played } = tick(state, advance, () => roll++ === 0 ? 0 : noGoal());
    state = played;
  }
  expect(state.league?.matchday).toBe(matchdays - 1);
  expect(state.minute).toBe(89);
  expect(state.goalsFor).toBe(1);
  expect(state.goalsAgainst).toBe(0);
  return state;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it.each([
  { caseName: 'promotion into The Summit', division: summit - 1, eventKind: 'promoted', wording: 'promotion bonus, every payout scaled up from here' },
  { caseName: 'a title while already in The Summit', division: summit, eventKind: 'title', wording: 'title bonus' },
])('celebrates $caseName with the correct bonus and durable result', ({ division, eventKind, wording }) => {
  const raw = serializeTycoon(beforeTitle(division), now);
  const loaded = deserializeTycoon(raw, now);
  if (!loaded) throw new Error('Fixture did not round-trip');
  const settled = tick(loaded, frameMs / 1000, noGoal);
  expect(settled.state.league?.division).toBe(summit);
  expect(settled.state.league?.season).toBe(1);
  const event = settled.events.find(event => event.kind === eventKind && event.amount !== undefined);
  if (!event?.label || !event.amount) throw new Error('Fixture did not win its bonus');
  expect(event.amount).toBeLessThan(10_000);

  let frame: FrameRequestCallback | undefined;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(Math, 'random').mockImplementation(noGoal);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = undefined; });
  localStorage.setItem(TYCOON_SAVE_KEY, raw);
  const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  if (!frame) throw new Error('Stadium match clock did not start');
  clock.mockReturnValue(now + frameMs);
  act(() => { frame?.(frameMs); });

  const card = view.container.querySelector<HTMLElement>('[data-promotion-card]');
  if (!card) throw new Error('The final did not show the celebration');
  const celebration = within(card);
  expect(celebration.getByText(event.label)).toBeVisible();
  const displayedBonus = celebration.getByText(/^\+\$/).textContent;
  const saved = serializeTycoon(settled.state, now + frameMs);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(saved);
  fireEvent.click(celebration.getByRole('button', { name: 'Continue' }));
  expect(view.container.querySelector('[data-promotion-card]')).toBeNull();
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(saved);
  expect(displayedBonus).toBe(`+$${event.amount.toLocaleString('en-US')} ${wording}`);
});
