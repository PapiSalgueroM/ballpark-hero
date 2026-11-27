import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import MatchdayDirector from '@/components/tycoon/MatchdayDirector';
import { campaigns, earnedContracts, forecast, openingGround, openingShift, playSeason, readDirectorSeason, winningScore, type Campaign, type Shift } from '@/lib/matchdayDirector';

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

const winningOrders = (index: number) => scenarios[index][1].map(([price, gates, project]) => ({ price, gates, project }));

it('keeps only the best legal winning orders per contract and ignores corrupt cabinet entries', () => {
  const community = winningOrders(0), cup = winningOrders(1);
  const lowerCrowd = community.map((s, i) => i === 5 ? { ...s, gates: 2 } : s);
  const lowerCash = cup.map((s, i) => i === 4 ? { ...s, gates: 2 } : s);
  expect(readDirectorSeason(JSON.stringify({ campaign: 'cup', shifts: lowerCash }))).not.toBeNull();
  expect(winningScore('community', lowerCrowd)).toBeLessThan(710);
  expect(winningScore('community', lowerCrowd)).toBeGreaterThanOrEqual(680);
  expect(winningScore('cup', lowerCash)).toBeLessThan(1865);
  expect(winningScore('cup', lowerCash)).toBeGreaterThanOrEqual(1700);
  const cabinet = { community, cup };
  expect(earnedContracts({ campaign: 'community', shifts: lowerCrowd, cabinet })).toEqual(cabinet);
  expect(earnedContracts({ campaign: 'cup', shifts: lowerCash, cabinet })).toEqual(cabinet);
  expect(earnedContracts({ campaign: 'community', shifts: community, cabinet: { community: lowerCrowd, cup } })).toEqual(cabinet);
  expect(earnedContracts({ campaign: 'cup', shifts: cup, cabinet: { community, cup: lowerCash } })).toEqual(cabinet);
  for (const bogus of [null, 9000, { admitted: 9999 }, community.slice(1), Array(6).fill(openingShift),
    Array(6).fill({ price: 'community', project: 'gate', gates: 0 })]) {
    const active = { campaign: 'community', shifts: community.slice(0, 3) };
    expect(readDirectorSeason(JSON.stringify({ ...active, cabinet: { community: bogus, cup, other: cup } })))
      .toEqual({ ...active, cabinet: { cup } });
  }
});

it('carries an old winning season through a loss, a new Cup win and a reload', () => {
  const key = 'dukb-matchday-director-v1';
  const community = winningOrders(0), cup = winningOrders(1);
  localStorage.setItem(key, JSON.stringify({ campaign: 'community', shifts: community }));
  let view = render(<MatchdayDirector />);
  expect(screen.getByText('710 fans')).toBeInTheDocument();
  const play = (shifts: Shift[]) => shifts.forEach((s, i) => {
    fireEvent.change(screen.getByLabelText('Tickets'), { target: { value: s.price } });
    fireEvent.change(screen.getByLabelText('Crew assignment'), { target: { value: String(s.gates) } });
    fireEvent.change(screen.getByLabelText('Ground investment'), { target: { value: s.project } });
    fireEvent.click(screen.getByRole('button', { name: 'Play fixture ' + (i + 1) }));
    if (i < 5) fireEvent.click(screen.getByRole('button', { name: 'Plan fixture ' + (i + 2) }));
  });
  fireEvent.click(screen.getByRole('button', { name: /Start Community season/ }));
  play(Array(6).fill(openingShift));
  expect(screen.getByText(/contract needs both targets/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(key)!).cabinet).toEqual({ community });
  fireEvent.click(screen.getByRole('button', { name: /Start Cup run/ }));
  play(cup);
  expect(screen.getByText(/wins the contract/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(key)!).cabinet).toEqual({ community, cup });
  fireEvent.click(screen.getByRole('button', { name: /Start Community season/ }));
  view.unmount();
  view = render(<MatchdayDirector />);
  fireEvent.click(screen.getByText('Signed contracts'));
  expect(screen.getByText('710 fans')).toBeVisible();
  expect(screen.getByText('$1,865')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Play fixture 1' })).toBeInTheDocument();
});
