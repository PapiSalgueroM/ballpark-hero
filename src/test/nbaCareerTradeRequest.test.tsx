import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { nbaEraTeamIds, nbaRosterPriorityBoost, nbaRollTeamQuality, requestNbaRosterPriority, simNbaSeason, type NbaCareerState } from '@/lib/nbaMyCareer';
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

  it.each([['now', true], ['y2004', false]] as const)('saves one real free agency contact in %s', (era, offered) => {
    const before = makeCareer(era);
    before.contractYears = 0;
    before.ovr = 69;
    install(before);
    const market = open();
    fireEvent.click(market.getByRole('button', { name: `Play the ${before.year} season` }));
    const initial = read().contractTalk;
    const stale = open();
    const offeredTeams = new Set(initial.window.offers.map((offer: { team: string }) => offer.team));
    const target = nbaEraTeamIds(era).find(team => {
      const roll = keyedRng(`nba-free-agent-contact:${summerCareerKey(before)}:${before.year}:${team}`)();
      return !offeredTeams.has(team) && (roll < 0.15) === offered;
    })!;
    expect(target).toBeTruthy();
    const marketBox = within(market.container);
    const selection = marketBox.getByRole('combobox', { name: 'Choose a franchise' });
    expect(within(selection).getAllByRole('option').slice(1).map(option => (option as HTMLOptionElement).value).sort()).toEqual([...nbaEraTeamIds(era)].sort());
    fireEvent.change(selection, { target: { value: target } });
    fireEvent.click(marketBox.getByRole('button', { name: 'Contact franchise' }));
    const after = read().contractTalk.window;
    expect(after.offers.slice(0, initial.window.offers.length)).toEqual(initial.window.offers);
    expect(after.contact).toEqual({ team: target, offered });
    if (offered) expect(after.offers.at(-1)).toMatchObject({ team: target, incumbent: false, pushed: false, gone: false });
    else expect(after.offers).toEqual(initial.window.offers);
    const saved = localStorage.getItem(sport.saveKey);
    const staleBox = within(stale.container);
    const second = nbaEraTeamIds(era).find(team => team !== target && !offeredTeams.has(team));
    fireEvent.change(staleBox.getByRole('combobox', { name: 'Choose a franchise' }), { target: { value: second } });
    fireEvent.click(staleBox.getByRole('button', { name: 'Contact franchise' }));
    expect(staleBox.getByText(offered ? /sent an offer/ : /passed on making an offer/)).toBeVisible();
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    stale.unmount();
    market.unmount();
    const restored = open();
    expect(restored.getByText(offered ? /sent an offer/ : /passed on making an offer/)).toBeVisible();
    expect(restored.queryByRole('combobox', { name: 'Choose a franchise' })).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    if (offered) {
      fireEvent.click(restored.container.querySelector<HTMLButtonElement>(`[data-fa-sign="${after.offers.length - 1}"]`)!);
      fireEvent.click(restored.getByRole('button', { name: 'Confirm signing' }));
      expect(read().c).toMatchObject({ team: target, salary: after.offers.at(-1).salary, contractYears: after.offers.at(-1).years });
    }
  });

  it('banks one roster priority against the same club and feeds the actual next season', () => {
    const c = makeCareer();
    const raw = install(c, 78);
    const view = open();
    fireEvent.click(view.getByRole('button', { name: 'Request roster investment' }));
    expect(view.getByText(/78 to 81/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Keep current plan' }));
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);
    fireEvent.click(view.getByRole('button', { name: 'Request roster investment' }));
    fireEvent.click(view.getByRole('button', { name: 'Bring investment forward' }));
    const saved = read();
    expect(saved).toMatchObject({ teamQuality: 81, c: {
      team: c.team, salary: c.salary, earnings: c.earnings, seasons: c.seasons,
      rosterPriority: { year: c.year, team: c.team, before: 78, boost: 3 },
    } });
    view.unmount();
    const restored = open();
    expect(restored.getByText(/Roster quality rose from 78 to 81/)).toBeVisible();
    expect(restored.queryByRole('button', { name: 'Request roster investment' })).toBeNull();
    const next = structuredClone(saved.c);
    sport.campBattle(next, 81, () => 0.51);
    const simulated = sport.simSeason(next, 81, () => 0.51, true).line;
    vi.spyOn(Math, 'random').mockReturnValue(0.51);
    fireEvent.click(restored.getByRole('button', { name: `Play the ${c.year} season` }));
    expect(read().c.seasons.at(-1)).toEqual(simulated);
    const ordinary = structuredClone(c);
    sport.campBattle(ordinary, 78, () => 0.51);
    const originalLine = sport.simSeason(ordinary, 78, () => 0.51, true).line;
    expect([simulated.clubWins, simulated.ppg]).not.toEqual([originalLine.clubWins, originalLine.ppg]);
  });

  it('undoes exactly one quality investment at the next same club reset without changing its draw', () => {
    const c = makeCareer();
    expect(requestNbaRosterPriority(c, 78)).toBe(81);
    expect(requestNbaRosterPriority(c, 81)).toBeNull();
    sport.simSeason(c, 81, () => 0.51, true);
    c.year++;
    const rng = vi.fn(() => 0.75);
    expect(nbaRollTeamQuality(81, rng, c)).toBe(nbaRollTeamQuality(78, () => 0.75));
    expect(rng).toHaveBeenCalledTimes(1);
    expect(c.rosterPriority).toBeUndefined();
    expect(nbaRollTeamQuality(81, () => 0.75, c)).toBe(84);

    expect(nbaRosterPriorityBoost(c, 94)).toBe(1);
    expect(nbaRosterPriorityBoost(c, 95)).toBe(0);
    expect(requestNbaRosterPriority(c, 64)).toBe(67);
    c.year++;
    expect(nbaRollTeamQuality(67, () => 0, c)).toBe(64);
    const other = nbaEraTeamIds(c.eraId).find(team => team !== c.team)!;
    c.team = other;
    expect(nbaRosterPriorityBoost(c, 78)).toBe(0);
  });

  it('removes a preseason roster investment from the old club if a release opens its market', () => {
    const c = makeCareer();
    install(c, 78);
    const view = open();
    fireEvent.click(view.getByRole('button', { name: 'Request roster investment' }));
    fireEvent.click(view.getByRole('button', { name: 'Bring investment forward' }));
    fireEvent.click(view.getByRole('button', { name: 'Request a release' }));
    fireEvent.click(view.getByRole('button', { name: 'Send request' }));
    const released = read();
    expect(released.c.rosterPriority).toBeUndefined();
    expect(released.contractTalk.window.offers[0].quality).toBe(78);
    expect(released.teamQuality).toBe(78);
  });
});
