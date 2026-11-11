import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { UsSeasonCentreOpen } from '@/components/us-career/season/UsSeasonCentreHost';
import { recordActivity } from '@/lib/completions';
import { keyedRng } from '@/lib/keyedRng';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { declineMarketExtension, openMarketExtension } from '@/lib/usCareerMarket';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));

const WATCH_SPORTS: [string, UsCareerSport][] = [['NBA', NBA_CAREER_SPORT], ['NFL', NFL_CAREER_SPORT], ['MLB', MLB_CAREER_SPORT]];
const SPORTS: [string, UsCareerSport][] = [...WATCH_SPORTS, ['NHL', NHL_CAREER_SPORT]];
const OTHER = 'us-career-stale-play-unrelated';

function seed(sport: UsCareerSport) {
  const rng = keyedRng('stale play fixture');
  const pos = sport.create.defaultPos;
  const career = sport.startCareer('Two Tabs', pos, sport.create.archetypes[pos][0], rng, null, 'now');
  career.contractYears = 3;
  const teamQuality = sport.rollTeamQuality(null, rng);
  sport.assignRole(career, teamQuality, rng);
  localStorage.setItem(sport.saveKey, JSON.stringify({ c: career, phase: 'season', teamQuality, coach: null }));
  localStorage.setItem(OTHER, 'held');
}

function mount(sport: UsCareerSport) {
  const open = vi.fn();
  const ready = vi.fn(async () => true);
  const view = render(<MemoryRouter><UsSeasonCentreOpen.Provider value={{ open, ready }}>
    <UsCareerBoard sport={sport} />
  </UsSeasonCentreOpen.Provider></MemoryRouter>);
  return {
    open, ready,
    play: () => within(view.container).getByRole('button', { name: /Play the \d{4} season/ }),
    watch: () => within(view.container).getByRole('button', { name: /watch the \d{4} season game by game/ }),
  };
}

async function expectHeld(sport: UsCareerSport, current: string | null) {
  expect(localStorage.getItem(sport.saveKey) === current, 'exact newer career bytes remain').toBe(true);
  expect(localStorage.getItem(OTHER)).toBe('held');
  expect(recordActivity).toHaveBeenCalledTimes(1);
  const notice = await screen.findByRole('alertdialog');
  expect(within(notice).getByRole('button', { name: 'Reload' })).toBeEnabled();
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordActivity).mockClear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it.each(SPORTS)('%s stale Play keeps the committed season before activity or simulation', async (_, sport) => {
  seed(sport);
  const a = mount(sport), b = mount(sport);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current tab'));
  fireEvent.click(a.play());
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.seasons).toHaveLength(1);

  const draws = vi.spyOn(Math, 'random').mockImplementation(keyedRng('older tab'));
  draws.mockClear();
  fireEvent.click(b.play());
  await expectHeld(sport, current);
  expect(draws).not.toHaveBeenCalled();
  expect(b.open).not.toHaveBeenCalled();
});

it.each(WATCH_SPORTS)('%s Watch opens the current played row and leaves the viewer closed when stale', async (_, sport) => {
  seed(sport);
  const a = mount(sport), b = mount(sport);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current watch'));
  await act(async () => { fireEvent.click(a.watch()); });
  const current = localStorage.getItem(sport.saveKey);
  const { c: saved } = JSON.parse(current!);
  expect(saved.seasons).toHaveLength(1);
  expect(a.ready).toHaveBeenCalledTimes(1);
  expect(a.open).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ row: saved.seasons[0] }));

  const draws = vi.spyOn(Math, 'random').mockImplementation(keyedRng('older watch'));
  draws.mockClear();
  await act(async () => { fireEvent.click(b.watch()); });
  await expectHeld(sport, current);
  expect(b.ready).toHaveBeenCalledTimes(1);
  expect(b.open).not.toHaveBeenCalled();
  expect(draws).not.toHaveBeenCalled();
});

it.each([false, true])('adopts the market decline for Play only with an unchanged career (diverged: %s)', async diverged => {
  const sport = NBA_CAREER_SPORT;
  seed(sport);
  const disk = JSON.parse(localStorage.getItem(sport.saveKey)!);
  disk.c.contractYears = 1;
  const talk = openMarketExtension(disk.c, sport.slug, sport.buildExtension(disk.c, keyedRng('extension')));
  localStorage.setItem(sport.saveKey, JSON.stringify({ ...disk, phase: 'extension', contractTalk: talk }));
  const view = mount(sport);

  const career = diverged ? { ...disk.c, morale: disk.c.morale - 1 } : disk.c;
  const current = JSON.stringify({ ...disk, c: career, contractTalk: declineMarketExtension(talk) });
  localStorage.setItem(sport.saveKey, current);
  fireEvent.click(screen.getByRole('button', { name: /play the year out/i }));
  expect(localStorage.getItem(sport.saveKey) === current).toBe(true);
  fireEvent.click(view.play());
  if (diverged) {
    expect(localStorage.getItem(sport.saveKey) === current).toBe(true);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  } else {
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  }
});
