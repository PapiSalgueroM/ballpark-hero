import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { openMarketFreeAgency, type UsCareerMarketTalk } from '@/lib/usCareerMarket';
import { nbaEraTeamIds, nbaTeamLabelOf } from '@/lib/nbaMyCareer';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Waiver Fixture',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));

const waiverName = 'Request a waiver';

function fictionalCareer(sport: UsCareerSport, morale: number, contractYears: number) {
  const pos = sport.create.defaultPos;
  const career = sport.startCareer('Waiver Fixture', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), 'now');
  career.morale = morale;
  career.contractYears = contractYears;
  career.ovr = 85;
  career.role = 'starter';
  return career;
}

function mountSeason(sport: UsCareerSport, morale: number) {
  const career = fictionalCareer(sport, morale, 2);
  const saved = JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null });
  localStorage.setItem(sport.saveKey, saved);
  const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
  expect(view.getByRole('button', { name: `Play the ${career.year} season` })).toBeTruthy();
  expect(localStorage.getItem(sport.saveKey)).toBe(saved);
  return view;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NBA My Career voluntary waiver', () => {
  it('offers the waiver request on an eligible unhappy NBA season hub', () => {
    const view = mountSeason(NBA_CAREER_SPORT, 54);
    expect(view.queryByRole('button', { name: waiverName }), 'NBA_WAIVER_REQUEST_MISSING_ELIGIBLE').not.toBeNull();
  });

  it('keeps the request off the NBA hub at morale 55', () => {
    const view = mountSeason(NBA_CAREER_SPORT, 55);
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
  });

  it('keeps the request off an unhappy NFL hub', () => {
    const view = mountSeason(NFL_CAREER_SPORT, 54);
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
  });

  it('restores ordinary NBA free agency with its incumbent offer', () => {
    const sport = NBA_CAREER_SPORT;
    const career = fictionalCareer(sport, 54, 0);
    const window = sport.buildFaWindow(career, 80, () => 0.6);
    expect(window.offers.filter(offer => offer.incumbent).map(offer => offer.team)).toEqual([career.team]);
    const contractTalk = openMarketFreeAgency(career, sport.slug, window);
    const saved = JSON.stringify({ c: career, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk });
    localStorage.setItem(sport.saveKey, saved);
    const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
    const market = view.container.querySelector('[data-fa-window]');
    expect(market?.querySelectorAll('[data-fa-offer]')).toHaveLength(window.offers.length);
    expect(market?.querySelector('[data-fa-offer="0"]')?.textContent).toContain('Your team');
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
  });
});

type WaiverCareer = UsCareerCore & { waiver?: { year: number; team: string } };
type CareerSave = {
  c: WaiverCareer;
  phase: string;
  teamQuality: number;
  coach: null;
  contractTalk?: UsCareerMarketTalk;
};

const keepContractName = 'Keep my contract';
const confirmWaiverName = 'Confirm waiver';
const mountNba = () => render(<MemoryRouter><UsCareerBoard sport={NBA_CAREER_SPORT} /></MemoryRouter>);
type NbaView = ReturnType<typeof mountNba>;

function seedWaiverHub(eraId = 'now', ovr = 85, withHistory = false) {
  const sport = NBA_CAREER_SPORT;
  const pos = sport.create.defaultPos;
  const career = sport.startCareer('Waiver Fixture', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), eraId);
  career.morale = 54;
  career.contractYears = 2;
  career.ovr = ovr;
  career.role = 'starter';
  if (withHistory) {
    const previous = structuredClone(career);
    const { line } = sport.simSeason(previous, 80, () => 0.6);
    career.seasons = [line];
    career.year += 1;
    career.age += 1;
  }
  const bytes = JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return { career, bytes, view: mountNba() };
}

function savedNbaBytes() {
  const bytes = localStorage.getItem(NBA_CAREER_SPORT.saveKey);
  if (bytes === null) throw new Error('Expected the saved NBA career');
  return bytes;
}

function readWaiverMarket(career: WaiverCareer, bytes = savedNbaBytes()) {
  const saved: CareerSave = JSON.parse(bytes);
  expect(saved.phase).toBe('freeagency');
  expect(saved.c.waiver).toEqual({ year: career.year, team: career.team });
  expect(saved.c.contractYears).toBe(0);
  expect(saved.c.salary).toBe(0);
  expect(saved.c.team).toBe(career.team);
  const talk = saved.contractTalk;
  if (talk?.kind !== 'freeagency') throw new Error('Expected the saved outside-offer market');
  expect(talk.context).toMatchObject({ sport: 'nba', year: career.year, team: career.team, contractYears: 0, salary: 0 });
  const offers = talk.window.offers;
  const teams = nbaEraTeamIds(career.eraId);
  expect(offers.filter(offer => !offer.gone).length).toBeGreaterThan(0);
  expect(new Set(offers.map(offer => offer.team)).size).toBe(offers.length);
  expect(offers.every(offer => !offer.incumbent && offer.team !== career.team &&
    teams.includes(offer.team) && offer.label === nbaTeamLabelOf(offer.team, career.eraId))).toBe(true);
  return { saved, talk, offers };
}

function preservedSeason(career: WaiverCareer) {
  const { name, year, age, eraId, seasons, headlines, retirement, retired, earnings, netWorth } = career;
  return { name, year, age, eraId, seasons, headlines, retirement, retired, earnings, netWorth };
}

function boardButton(view: NbaView, name: string) {
  return within(view.container).getByRole('button', { name });
}

function openWaiver(view: NbaView) {
  fireEvent.click(boardButton(view, waiverName));
  return screen.getByRole('button', { name: confirmWaiverName });
}

function confirmRelease(view: NbaView) {
  fireEvent.click(openWaiver(view));
}

function marketAction(view: NbaView, action: 'sign' | 'push', index: number) {
  const button = view.container.querySelector<HTMLButtonElement>('[data-fa-' + action + '="' + index + '"]');
  if (!button || button.disabled) throw new Error('Expected the live public market ' + action + ' control');
  fireEvent.click(button);
}

function watchCareerWrites(refuse: () => boolean) {
  const key = NBA_CAREER_SPORT.saveKey;
  const writes: string[] = [];
  const real = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(this: Storage, target: string, bytes: string) {
    if (target === key) {
      writes.push(bytes);
      if (refuse()) throw new DOMException('full', 'QuotaExceededError');
    }
    return real.call(this, target, bytes);
  });
  return writes;
}

describe('NBA My Career waiver decisions and saved markets', () => {
  it('cancels a waiver confirmation without a draw or save write and returns focus', async () => {
    const { bytes, career, view } = seedWaiverHub();
    const opener = boardButton(view, waiverName);
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const writes = watchCareerWrites(() => false);
    opener.focus();
    openWaiver(view);
    expect(savedNbaBytes()).toBe(bytes);
    fireEvent.click(screen.getByRole('button', { name: keepContractName }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(screen.queryByRole('button', { name: confirmWaiverName })).toBeNull();
    expect(boardButton(view, 'Play the ' + career.year + ' season')).toBeTruthy();
    expect(savedNbaBytes()).toBe(bytes);
    expect(draws).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it('keeps the unplayed historical year and record across release, reload and signing', () => {
    const { career, bytes, view } = seedWaiverHub('y2004', 85, true);
    expect(career.seasons).toHaveLength(1);
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const writes = watchCareerWrites(() => false);
    confirmRelease(view);
    const releasedBytes = savedNbaBytes();
    const released = readWaiverMarket(career);
    expect(releasedBytes).not.toBe(bytes);
    expect(writes).toEqual([releasedBytes]);
    expect(draws).toHaveBeenCalled();
    expect(preservedSeason(released.saved.c)).toEqual(preservedSeason(career));
    expect(view.container.querySelectorAll('[data-fa-offer]')).toHaveLength(released.offers.length);
    expect(within(view.container).queryByRole('button', { name: 'Play the ' + career.year + ' season' })).toBeNull();

    view.unmount();
    draws.mockClear();
    const reloaded = mountNba();
    expect(savedNbaBytes()).toBe(releasedBytes);
    expect(draws).not.toHaveBeenCalled();
    expect(reloaded.container.querySelectorAll('[data-fa-offer]')).toHaveLength(released.offers.length);
    const selected = released.offers[0];
    marketAction(reloaded, 'sign', 0);
    expect(savedNbaBytes()).toBe(releasedBytes);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm signing' }));
    const signed: CareerSave = JSON.parse(savedNbaBytes());
    expect(signed.phase).toBe('season');
    expect(signed.c.waiver).toBeUndefined();
    expect(signed.contractTalk).toBeUndefined();
    expect([signed.c.team, signed.c.salary, signed.c.contractYears]).toEqual([selected.team, selected.salary, selected.years]);
    expect(preservedSeason(signed.c)).toEqual(preservedSeason(career));
    expect(reloaded.container.querySelector('[data-fa-window]')).toBeNull();
    expect(boardButton(reloaded, 'Play the ' + career.year + ' season')).toBeTruthy();
  });

  it('stale hub Play and a stale open confirmation cannot overwrite a newer saved release', () => {
    const { career, bytes, view } = seedWaiverHub();
    const stalePlay = mountNba();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(view);
    const releasedBytes = savedNbaBytes();
    readWaiverMarket(career);
    const writes = watchCareerWrites(() => false);
    draws.mockClear();
    fireEvent.click(boardButton(stalePlay, 'Play the ' + career.year + ' season'));
    expect(savedNbaBytes()).toBe(releasedBytes);
    expect(writes).toEqual([]);
    expect(draws).not.toHaveBeenCalled();

    view.unmount();
    stalePlay.unmount();
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, bytes);
    const staleConfirm = mountNba();
    const confirm = openWaiver(staleConfirm);
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, releasedBytes);
    writes.length = 0;
    draws.mockClear();
    fireEvent.click(confirm);
    expect(savedNbaBytes()).toBe(releasedBytes);
    expect(writes).toEqual([]);
    expect(draws).not.toHaveBeenCalled();
  });

  it('does not let a second tab sign a consumed waiver market', () => {
    const { career, view } = seedWaiverHub();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(view);
    const { offers } = readWaiverMarket(career);
    expect(offers.length).toBeGreaterThan(1);
    const stale = mountNba();
    marketAction(view, 'sign', 0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm signing' }));
    const signedBytes = savedNbaBytes();
    const signed: CareerSave = JSON.parse(signedBytes);
    expect(signed.c.team).toBe(offers[0].team);
    expect(signed.c.waiver).toBeUndefined();
    expect(signed.contractTalk).toBeUndefined();

    const writes = watchCareerWrites(() => false);
    draws.mockClear();
    marketAction(stale, 'sign', 1);
    const confirm = screen.queryByRole('button', { name: 'Confirm signing' });
    if (confirm) fireEvent.click(confirm);
    expect(savedNbaBytes()).toBe(signedBytes);
    expect(writes).toEqual([]);
    expect(draws).not.toHaveBeenCalled();
  });

  it('retries a refused release save with the exact prepared market and no redraw', () => {
    const { career, bytes, view } = seedWaiverHub();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    let refuse = true;
    const writes = watchCareerWrites(() => refuse);
    confirmRelease(view);
    expect(savedNbaBytes()).toBe(bytes);
    expect(writes).toHaveLength(1);
    const [prepared] = writes;
    expect(preservedSeason(readWaiverMarket(career, prepared).saved.c)).toEqual(preservedSeason(career));
    expect(view.container.querySelector('[data-fa-window]')).not.toBeNull();
    const retry = boardButton(view, 'Retry save');
    refuse = false;
    draws.mockClear();
    fireEvent.click(retry);
    expect(writes).toEqual([prepared, prepared]);
    expect(savedNbaBytes()).toBe(prepared);
    expect(draws).not.toHaveBeenCalled();
    expect(within(view.container).queryByRole('button', { name: 'Retry save' })).toBeNull();
  });

  it('cannot retry a refused release over a newer saved release from another tab', () => {
    const { career, bytes, view: pending } = seedWaiverHub();
    const other = mountNba();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    let refuse = true;
    const writes = watchCareerWrites(() => refuse);
    confirmRelease(pending);
    expect(savedNbaBytes()).toBe(bytes);
    expect(writes).toHaveLength(1);
    readWaiverMarket(career, writes[0]);
    refuse = false;
    draws.mockReturnValue(0.4);
    confirmRelease(other);
    const newerBytes = savedNbaBytes();
    readWaiverMarket(career, newerBytes);
    expect(newerBytes).not.toBe(writes[0]);
    expect(writes).toHaveLength(2);
    draws.mockClear();
    fireEvent.click(boardButton(pending, 'Retry save'));
    expect(savedNbaBytes()).toBe(newerBytes);
    expect(writes).toHaveLength(2);
    expect(draws).not.toHaveBeenCalled();
  });

  it('refuses a malformed waiver offer and rebuilds only outside offers on deliberate reopen', () => {
    const { career, view } = seedWaiverHub();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(view);
    const { saved, offers } = readWaiverMarket(career);
    offers[0] = { ...offers[0], team: career.team, label: nbaTeamLabelOf(career.team, career.eraId), incumbent: true };
    const invalidBytes = JSON.stringify(saved);
    view.unmount();
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, invalidBytes);
    draws.mockClear();
    const reloaded = mountNba();
    expect(reloaded.container.querySelector('[data-fa-window]')).toBeNull();
    expect(savedNbaBytes()).toBe(invalidBytes);
    expect(draws).not.toHaveBeenCalled();

    fireEvent.click(boardButton(reloaded, 'Reopen waiver offers'));
    const recovered = readWaiverMarket(career);
    expect(preservedSeason(recovered.saved.c)).toEqual(preservedSeason(career));
    expect(reloaded.container.querySelectorAll('[data-fa-offer]')).toHaveLength(recovered.offers.length);
    expect(draws).toHaveBeenCalled();
  });

  it('keeps the last outside offer available after negotiation and restores the spent push', () => {
    const { career, view } = seedWaiverHub('now', 68);
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(view);
    const opened = readWaiverMarket(career);
    expect(opened.offers).toHaveLength(1);
    draws.mockReturnValue(0.99);
    marketAction(view, 'push', 0);
    const pushedBytes = savedNbaBytes();
    const pushed = readWaiverMarket(career);
    expect(pushed.offers).toEqual([{ ...opened.offers[0], pushed: true, gone: false }]);
    expect(pushed.talk.wheel).toMatchObject({ result: 'held', seen: false });
    view.unmount();
    draws.mockClear();
    const reloaded = mountNba();
    expect(reloaded.container.querySelector('[data-market-wheel]')).not.toBeNull();
    expect(savedNbaBytes()).toBe(pushedBytes);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the offers' }));
    expect(readWaiverMarket(career).talk.wheel).toMatchObject({ result: 'held', seen: true });
    expect(reloaded.container.querySelector<HTMLButtonElement>('[data-fa-push="0"]')?.disabled).toBe(true);
    expect(reloaded.container.querySelector<HTMLButtonElement>('[data-fa-sign="0"]')?.disabled).toBe(false);
    expect(draws).not.toHaveBeenCalled();
  });
});

type RevisionSave = CareerSave & { c: { waiverCount?: number } };

describe('NBA My Career waiver revision and offer admission', () => {
  it('protects a newer signed waiver career from a stale hub initially at morale 55', () => {
    const { career, bytes, view } = seedWaiverHub();
    view.unmount();
    const healthy: CareerSave = JSON.parse(bytes);
    healthy.c.morale = 55;
    const healthyBytes = JSON.stringify(healthy);
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, healthyBytes);
    const staleHealthy = mountNba();
    expect(within(staleHealthy.container).queryByRole('button', { name: waiverName })).toBeNull();
    expect(savedNbaBytes()).toBe(healthyBytes);

    localStorage.setItem(NBA_CAREER_SPORT.saveKey, bytes);
    const newer = mountNba();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(newer);
    const released = readWaiverMarket(career);
    const releaseSave: RevisionSave = JSON.parse(savedNbaBytes());
    expect(releaseSave.c.waiverCount).toBe(1);
    marketAction(newer, 'sign', 0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm signing' }));
    const signedBytes = savedNbaBytes();
    const signed: RevisionSave = JSON.parse(signedBytes);
    expect(signed.phase).toBe('season');
    expect(signed.c.morale).toBeGreaterThanOrEqual(55);
    expect(signed.c.team).toBe(released.offers[0].team);
    expect(signed.c.waiver).toBeUndefined();
    expect(signed.c.waiverCount).toBe(1);
    expect(signed.contractTalk).toBeUndefined();

    const writes = watchCareerWrites(() => false);
    draws.mockClear();
    fireEvent.click(boardButton(staleHealthy, 'Play the ' + career.year + ' season'));
    expect(savedNbaBytes()).toBe(signedBytes);
    expect(writes).toEqual([]);
    expect(draws).not.toHaveBeenCalled();
  });

  it('keeps the exact pending release through a transient read refusal on Retry save', () => {
    const { career, bytes, view } = seedWaiverHub();
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    let refuseWrite = true;
    const writes = watchCareerWrites(() => refuseWrite);
    confirmRelease(view);
    expect(savedNbaBytes()).toBe(bytes);
    expect(writes).toHaveLength(1);
    const [prepared] = writes;
    readWaiverMarket(career, prepared);
    refuseWrite = false;

    const realRead = Storage.prototype.getItem;
    const key = NBA_CAREER_SPORT.saveKey;
    let refuseRead = false;
    let refusedReads = 0;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function read(this: Storage, target: string) {
      if (target === key && refuseRead) {
        refusedReads += 1;
        throw new DOMException('temporarily unreadable', 'SecurityError');
      }
      return realRead.call(this, target);
    });
    const retry = boardButton(view, 'Retry save');
    refuseRead = true;
    draws.mockClear();
    fireEvent.click(retry);
    refuseRead = false;
    expect(refusedReads).toBeGreaterThan(0);
    expect(savedNbaBytes()).toBe(bytes);
    expect(writes).toEqual([prepared]);
    expect(draws).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-fa-window]')).not.toBeNull();

    fireEvent.click(boardButton(view, 'Retry save'));
    expect(savedNbaBytes()).toBe(prepared);
    expect(writes).toEqual([prepared, prepared]);
    expect(draws).not.toHaveBeenCalled();
    expect(within(view.container).queryByRole('button', { name: 'Retry save' })).toBeNull();
  });

  it('rejects a well-shaped out-of-era waiver offer and recovers historical outside offers', () => {
    const { career, view } = seedWaiverHub('y2004');
    const draws = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    confirmRelease(view);
    const { saved, offers } = readWaiverMarket(career);
    const eraTeams = nbaEraTeamIds(career.eraId);
    const outOfEra = nbaEraTeamIds('now').find(team => !eraTeams.includes(team));
    if (!outOfEra) throw new Error('Expected a modern-only team for the saved offer control');
    offers[0] = { ...offers[0], team: outOfEra, label: nbaTeamLabelOf(outOfEra, 'now') };
    expect(offers[0].incumbent).toBe(false);
    expect(offers[0].team).not.toBe(career.team);
    const invalidBytes = JSON.stringify(saved);
    view.unmount();
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, invalidBytes);

    draws.mockClear();
    const reloaded = mountNba();
    expect(savedNbaBytes()).toBe(invalidBytes);
    expect(reloaded.container.querySelector('[data-fa-window]')).toBeNull();
    expect(draws).not.toHaveBeenCalled();
    fireEvent.click(boardButton(reloaded, 'Reopen waiver offers'));
    const recovered = readWaiverMarket(career);
    expect(recovered.offers.some(offer => offer.team === outOfEra)).toBe(false);
    expect(preservedSeason(recovered.saved.c)).toEqual(preservedSeason(career));
    expect(reloaded.container.querySelectorAll('[data-fa-offer]')).toHaveLength(recovered.offers.length);
    expect(draws).toHaveBeenCalled();
  });
});
