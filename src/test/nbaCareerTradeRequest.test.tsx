import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { nbaEraTeamIds, simNbaSeason, type NbaCareerState } from '@/lib/nbaMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import { summerCareerKey } from '@/lib/usCareerSummer';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NBA_CAREER_SPORT;
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!);
const makeCareer = (eraId = 'now', granted = true) => {
  const c = sport.startCareer('Fixture Trade Player', 'PG', sport.create.archetypes.PG[0], keyedRng(eraId), defaultAppearance(), eraId);
  const { line } = simNbaSeason(c, 75, keyedRng('first NBA year'));
  sport.progress(c, keyedRng('first NBA winter'), line.seasonRating);
  expect(c.seasons).toHaveLength(1);
  // Stage the normal season hub after finishing the summer prompts.
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  c.contractYears = 3;
  c.morale = 70;
  for (let salt = 0; ; salt++) {
    c.summerSalt = String(salt);
    if ((keyedRng(`nba-trade-request:${summerCareerKey(c)}:${c.year}`)() < 0.5) === granted) return c;
  }
};
const install = (c: NbaCareerState, teamQuality = 75) => {
  const raw = JSON.stringify({ c, phase: 'season', teamQuality, coach: null });
  localStorage.setItem(sport.saveKey, raw);
  return raw;
};
const open = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
const ask = (view: ReturnType<typeof open>) => within(view.container).getByRole('button', { name: 'Request a trade' });
const releaseReceipt = (view: ReturnType<typeof open>) => [...view.container.querySelectorAll('[role="status"]')]
  .find(node => /^Release (granted|declined)/.test(node.textContent ?? ''));
const confirm = (view: ReturnType<typeof open>) => {
  fireEvent.click(ask(view));
  const dialog = within(view.getByRole('alertdialog', { name: 'Request a trade?' }));
  return dialog.getByRole('button', { name: 'Send request' });
};

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('standing NBA trade request', () => {
  it.each(['now', 'y2004'])('grants and keeps the exact contract on an eligible %s career', era => {
    const before = makeCareer(era);
    const raw = install(before);
    const view = open();
    fireEvent.click(ask(view));
    expect(view.getByText(/50% chance/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Keep playing' }));
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);

    fireEvent.click(confirm(view));
    const after = read().c as NbaCareerState;
    expect(after.team).not.toBe(before.team);
    expect(nbaEraTeamIds(era)).toContain(after.team);
    expect(after).toMatchObject({ salary: before.salary, contractYears: before.contractYears, seasons: before.seasons, year: before.year, fanbase: 44 });
    expect(ask(view)).toBeDisabled();
    const receipt = localStorage.getItem(sport.saveKey);
    view.unmount();
    const restored = open();
    expect(restored.getByText(/Trade request granted/)).toBeVisible();
    expect(ask(restored)).toBeDisabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(receipt);
    fireEvent.click(restored.getByRole('button', { name: `Play the ${before.year} season` }));
    expect(read().c.seasons.at(-1)).toMatchObject({ team: after.team, year: before.year, salary: before.salary });
  });

  it('keeps a denied ruling and rejects a stale second tab without changing the saved bytes', () => {
    const raw = install(makeCareer('now', false));
    const first = open(), stale = open();
    fireEvent.click(confirm(first));
    expect(within(first.container).getByText(/Trade request declined/)).toBeVisible();
    const staleConfirm = confirm(stale);
    const receipt = localStorage.getItem(sport.saveKey);
    expect(read()).toMatchObject({ c: { team: JSON.parse(raw).c.team }, teamQuality: 75 });
    fireEvent.click(staleConfirm);
    expect(localStorage.getItem(sport.saveKey)).toBe(receipt);
    expect(within(stale.container).getByText(/Trade request declined/)).toBeVisible();
    expect(ask(stale)).toBeDisabled();
  });

  it('leaves an expiring or unsigned deal to the existing contract decisions', () => {
    const c = makeCareer();
    c.contractYears = 1;
    install(c);
    const view = open();
    expect(view.queryByRole('button', { name: 'Request a trade' })).toBeNull();
    expect(view.getByRole('button', { name: `Play the ${c.year} season` })).toBeEnabled();
  });

  it('adopts the new team before an older tab can book the season for the former team', () => {
    const before = makeCareer();
    install(before);
    const first = open(), stale = open();
    fireEvent.click(confirm(first));
    const saved = localStorage.getItem(sport.saveKey);
    fireEvent.click(within(stale.container).getByRole('button', { name: `Play the ${before.year} season` }));
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    expect(within(stale.container).getByText(/Trade request granted/)).toBeVisible();
    expect(read().c.seasons).toHaveLength(1);
  });

  it('opens the existing free-agent market after release and pays the exact new deal after playing', () => {
    const before = makeCareer();
    const raw = install(before);
    const view = open(), stale = open();
    const withinView = within(view.container);
    fireEvent.click(withinView.getByRole('button', { name: 'Request a release' }));
    const dialog = within(view.getByRole('alertdialog', { name: 'Request a release?' }));
    expect(dialog.getByText(/Keep salary you already earned/)).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Keep playing' }));
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);

    fireEvent.click(withinView.getByRole('button', { name: 'Request a release' }));
    fireEvent.click(view.getByRole('button', { name: 'Send request' }));
    const released = read();
    expect(released.phase).toBe('freeagency');
    expect(released.c).toMatchObject({ salary: 0, contractYears: 0, earnings: before.earnings, netWorth: before.netWorth, seasons: before.seasons, year: before.year });
    expect(released.contractTalk).toMatchObject({ kind: 'freeagency', context: { year: before.year, contractYears: 0, salary: 0 } });
    expect(releaseReceipt(view)).toHaveTextContent(/Release granted/);

    const bytes = localStorage.getItem(sport.saveKey);
    fireEvent.click(confirm(stale));
    expect(releaseReceipt(stale)).toHaveTextContent(/Release granted/);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    stale.unmount();
    view.unmount();
    const restored = open();
    expect(releaseReceipt(restored)).toHaveTextContent(/Release granted/);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    const offer = released.contractTalk.window.offers[1];
    const offerButton = restored.container.querySelector<HTMLButtonElement>('[data-fa-sign="1"]')!;
    expect(offerButton).toBeEnabled();
    fireEvent.click(offerButton);
    fireEvent.click(restored.getByRole('button', { name: 'Confirm signing' }));

    expect(read().c).toMatchObject({ team: offer.team, salary: offer.salary, contractYears: offer.years, earnings: before.earnings });
    expect(restored.getByRole('button', { name: 'Request a trade' })).toBeDisabled();
    expect(restored.getByRole('button', { name: 'Request a release' })).toBeDisabled();
    fireEvent.click(restored.getByRole('button', { name: `Play the ${before.year} season` }));
    const played = read().c;
    expect(played.seasons.at(-1)).toMatchObject({ team: offer.team, year: before.year, salary: offer.salary });
    expect(played.earnings).toBeCloseTo(before.earnings + offer.salary, 10);
  });

  it('declines a release once and keeps the signed club and contract', () => {
    const before = makeCareer('now', false);
    install(before);
    const view = open();
    fireEvent.click(view.getByRole('button', { name: 'Request a release' }));
    fireEvent.click(view.getByRole('button', { name: 'Send request' }));
    expect(read()).toMatchObject({ phase: 'season', teamQuality: 75, c: {
      team: before.team, salary: before.salary, contractYears: before.contractYears, earnings: before.earnings, morale: before.morale - 4,
    } });
    expect(releaseReceipt(view)).toHaveTextContent(/Release declined/);
    expect(ask(view)).toBeDisabled();
  });
});
