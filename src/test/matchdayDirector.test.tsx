import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import MatchdayDirector from '@/components/tycoon/MatchdayDirector';
import { campaigns, forecast, openingGround, openingShift, playSeason, readDirectorSeason, type Campaign, type Shift } from '@/lib/matchdayDirector';

afterEach(() => { cleanup(); localStorage.clear(); });

const scenarios: [Campaign, [Shift['price'], number, Shift['project']][], number, number][] = [
  ['community', [['standard', 2, 'gate'], ['community', 3, 'hold'], ['premium', 3, 'gate'], ['standard', 3, 'hold'], ['premium', 2, 'gate'], ['standard', 4, 'kiosk']], 710, 1172],
  ['cup', [['standard', 3, 'kiosk'], ['community', 3, 'kiosk'], ['premium', 4, 'kiosk'], ['premium', 3, 'gate'], ['premium', 3, 'gate'], ['premium', 2, 'hold']], 591, 1865],
];
it.each(scenarios)('finishes the %s campaign from legal paid orders with balanced receipts', (campaign, orders, admitted, cash) => {
  const shifts = orders.map(([price, gates, project]) => ({ price, gates, project }));
  const season = { campaign, shifts };
  expect(readDirectorSeason(JSON.stringify(season))).toEqual(season);
  let previousCash = 300;
  for (const row of playSeason(season)) {
    expect(row.cost).toBeLessThanOrEqual(previousCash);
    expect(row.next.cash).toBe(previousCash + row.receipts - row.cost - row.operatingCost);
    expect(row.admitted + row.turnedAway).toBe(row.crowd);
    previousCash = row.next.cash;
  }
  expect(playSeason(season)[5].next).toMatchObject({ admitted, cash });
  expect(admitted).toBeGreaterThanOrEqual(campaigns[campaign].target);
  expect(cash).toBeGreaterThanOrEqual(campaigns[campaign].reserve);
  const unattended = playSeason({ campaign, shifts: Array(6).fill(openingShift) })[5].next;
  expect(unattended.admitted).toBeLessThan(campaigns[campaign].target);
});

it('charges permanent construction once, and gives each fixture its own gate and meal demand', () => {
  const opening = forecast('community', 0, openingGround, openingShift);
  expect(opening).toMatchObject({ admitted: 66, meals: 34, cost: 0, operatingCost: 200 });
  const build = forecast('community', 0, openingGround, { ...openingShift, project: 'gate' });
  expect(build.cost).toBe(220);
  const family = forecast('community', 1, build.next, openingShift);
  expect(family).toMatchObject({ gateCapacity: 82, cost: 0, fixture: { mealRate: 75 } });
  const noGate = forecast('community', 1, opening.next, openingShift);
  expect(family.gateCapacity - noGate.gateCapacity).toBe(26);
});

it('rejects overspending, unknown campaigns and corrupt staff records', () => {
  const overdrawn = Array(2).fill({ price: 'community', gates: 0, project: 'gate' });
  for (const s of [{ campaign: 'cup', shifts: overdrawn }, { campaign: 'toString', shifts: [] },
    { campaign: 'cup', shifts: [{ ...openingShift, gates: 1.5 }] }, { campaign: 'cup', shifts: Array(7).fill(openingShift) }]) {
    expect(readDirectorSeason(JSON.stringify(s))).toBeNull();
  }
});

it('keeps a preview free, stores one settled fixture and adopts a newer tab before booking', () => {
  const key = 'dukb-matchday-director-v1';
  render(<MatchdayDirector />);
  fireEvent.click(screen.getByRole('button', { name: /Start Community season/ }));
  fireEvent.change(screen.getByLabelText('Ground investment'), { target: { value: 'gate' } });
  expect(JSON.parse(localStorage.getItem(key)!).shifts).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Play fixture 1' }));
  expect(JSON.parse(localStorage.getItem(key)!).shifts).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Play fixture 2' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Plan fixture 2' }));
  const ahead = { campaign: 'community', shifts: [{ ...openingShift, project: 'gate' }, openingShift] };
  localStorage.setItem(key, JSON.stringify(ahead));
  fireEvent.click(screen.getByRole('button', { name: 'Play fixture 2' }));
  expect(localStorage.getItem(key)).toEqual(JSON.stringify(ahead));
  expect(screen.getByRole('button', { name: 'Play fixture 3' })).toBeInTheDocument();
  expect(screen.getByText(/Another tab/)).toBeInTheDocument();
});
