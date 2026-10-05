import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import CareerSeasonReview from '@/components/us-career/CareerSeasonReview';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { recordCompletion } from '@/lib/completions';
import { makeReviewCareer, reviewFixtures, reviewSave, reviewSports } from '@/test/fixtures/careerSeasonReview1008';
import type { ReviewFixture } from '@/test/fixtures/careerSeasonReview1008';
import type { UsCareerCore } from '@/lib/usCareerSport';

const boards: Record<string, ComponentType> = { nba: NbaMyCareerBoard, nfl: NflMyCareerBoard, mlb: MlbMyCareerBoard, nhl: NhlMyCareerBoard };
const field = (name: string) => document.querySelector(`[data-season-${name}]`)?.textContent;
const stats = () => Object.fromEntries([...document.querySelectorAll('[data-season-stat]')].map(el => [el.getAttribute('data-season-stat'), el.querySelector('dd')?.textContent]));
function click(name: string | RegExp) {
  const button = screen.queryByRole('button', { name });
  expect(button, `button ${name} exists`).not.toBeNull();
  fireEvent.click(button!);
}
function choose(index: number) {
  const tile = document.querySelector(`[data-season-tile="${index}"]`);
  expect(tile, `saved season ${index} is selectable`).not.toBeNull();
  fireEvent.click(tile!);
  expect(document.querySelector('[data-season-review]')).toHaveAttribute('data-season-review', String(index));
}
function mountReview(fixture: ReviewFixture, career = makeReviewCareer(fixture)) {
  const back = vi.fn();
  return { ...render(<CareerSeasonReview career={career} sport={reviewSports[fixture.slug]} onBack={back} backLabel="Back to career" />), back, career };
}
function assertPosition(fixture: ReviewFixture) {
  const { unmount } = mountReview(fixture);
  choose(1);
  expect(field('games')).toBe(String(fixture.games));
  expect(document.querySelector('[data-season-games]')?.parentElement?.querySelector('dt')?.textContent).toBe(fixture.gamesLabel);
  click('Regular season');
  expect(stats()).toEqual(fixture.regular);
  click('Postseason');
  expect(stats()).toEqual(fixture.postseason);
  unmount();
}
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockReturnValue(.37);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('saved career season review', () => {
  it('shows the saved NBA regular and postseason values separately', () => {
    reviewFixtures.filter(f => f.slug === 'nba').forEach(assertPosition);
  });
  it('shows NFL passing and defensive stats for their saved positions', () => {
    reviewFixtures.filter(f => f.slug === 'nfl').forEach(assertPosition);
  });
  it('distinguishes MLB batting starts and relief appearances from saved stats', () => {
    reviewFixtures.filter(f => f.slug === 'mlb').forEach(assertPosition);
  });
  it('distinguishes NHL attackers defenders and goalies in both season phases', () => {
    reviewFixtures.filter(f => f.slug === 'nhl').forEach(assertPosition);
  });
  it('compares saved seasons exactly and returns focus to the selected year', () => {
    const { career, back, unmount } = mountReview(reviewFixtures[0]);
    expect(document.activeElement?.getAttribute('data-season-tile')).toBe('2');
    expect([...document.querySelectorAll('[data-season-tile]')].map(el => el.getAttribute('data-season-tile'))).toEqual(['2', '1', '0']);
    choose(1);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: '2032 season' }));
    expect(field('ovr')).toBe('84');
    expect(field('ovr-change')).toBe('13 higher');
    expect(field('games')).toBe('76');
    expect(field('games-change')).toBe('4 higher');
    expect(field('age')).toBe('25');
    expect(field('pay')).toBe('$12.75M');
    expect(field('result')).toBe('Fixture conference final');
    expect(field('awards')).toBe('Fixture All-Star, Fixture Sportsmanship');
    expect(screen.queryByText('Changes compared with your 2030 season.')).not.toBeNull();
    click('Back to seasons');
    expect(document.activeElement?.getAttribute('data-season-tile')).toBe('1');
    choose(2);
    expect(field('ovr-change')).toBe('2 lower');
    expect(field('games-change')).toBe('1 lower');
    expect(field('awards')).toBe('No awards that season');
    click('Back to seasons');
    choose(0);
    expect(field('ovr-change')).toBe('No earlier season');
    expect(field('games-change')).toBe('No earlier season');
    click('Back to seasons');
    click('Back to career');
    expect(back).toHaveBeenCalledTimes(1);
    expect(career.seasons[1].ovr).toBe(84);
    unmount();
    career.seasons[1] = { ...career.seasons[0] };
    mountReview(reviewFixtures[0], career);
    expect(screen.queryAllByRole('button', { name: 'Review 2030 season' })).toHaveLength(2);
    choose(1);
    expect(field('ovr-change')).toBe('Unchanged');
    expect(field('games-change')).toBe('Unchanged');
  });
  it('keeps missing legacy fields honest and records real zero values', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture);
    const older = career.seasons[0] as unknown as Record<string, unknown>;
    const row = career.seasons[1] as unknown as Record<string, unknown>;
    delete older.ovr;
    for (const key of ['ovr', 'games', 'age', 'salary', 'awards', 'teamResult', 'ppg', 'rpg', 'poGames', 'poPpg', 'poRpg', 'poApg']) delete row[key];
    row.apg = 0;
    const before = JSON.stringify(career);
    const { unmount } = mountReview(fixture, career);
    choose(1);
    for (const key of ['ovr', 'games', 'age', 'pay', 'result', 'awards']) expect(field(key)).toBe('Not recorded');
    expect(field('ovr-change')).toBe('Change not recorded');
    expect(field('games-change')).toBe('Change not recorded');
    click('Regular season');
    expect(stats()).toEqual({ 'Points per game': 'Not recorded', 'Rebounds per game': 'Not recorded', 'Assists per game': '0' });
    click('Postseason');
    expect(stats()).toEqual({ Games: 'Not recorded', 'Points per game': 'Not recorded', 'Rebounds per game': 'Not recorded', 'Assists per game': 'Not recorded' });
    expect(document.body.textContent).not.toMatch(/undefined|NaN|null/);
    expect(JSON.stringify(career)).toBe(before);
    unmount();
    career.seasons = [];
    mountReview(fixture, career);
    expect(screen.queryByText('No seasons on the books yet. Go play one.')).not.toBeNull();
    expect(document.querySelectorAll('[data-season-tile]')).toHaveLength(0);
    expect(document.activeElement).toBe(screen.queryByRole('button', { name: 'Back to career' }));
  });
  it('shows suspended seasons without inventing regular or postseason performances', () => {
    for (const slug of Object.keys(boards)) {
      const fixture = reviewFixtures.find(f => f.slug === slug)!;
      const career = makeReviewCareer(fixture);
      Object.assign(career.seasons[1], { teamResult: 'SUSPENDED', games: 0, salary: 0, awards: [] });
      const { unmount } = mountReview(fixture, career);
      choose(1);
      expect(field('result')).toBe('SUSPENDED');
      expect(field('games')).toBe('0');
      expect(field('pay')).toBe('$0M');
      click('Regular season');
      expect(stats()).toEqual({ Season: 'Suspended, no season played' });
      click('Postseason');
      expect(stats()).toEqual({ Postseason: 'Not played during this suspended season' });
      unmount();
    }
  });
  it('opens each live Career Log and returns without saves draws or completion calls', async () => {
    for (const slug of Object.keys(boards)) {
      const fixture = reviewFixtures.find(f => f.slug === slug)!, Board = boards[slug], sport = reviewSports[slug];
      const bytes = reviewSave(makeReviewCareer(fixture));
      localStorage.setItem(sport.saveKey, bytes);
      let view = render(<MemoryRouter><Board /></MemoryRouter>);
      await screen.findByRole('button', { name: /Career Log/ }, { timeout: 20000 });
      const writes = vi.spyOn(Storage.prototype, 'setItem'), removes = vi.spyOn(Storage.prototype, 'removeItem');
      vi.mocked(Math.random).mockClear();
      click(/Career Log/);
      await screen.findByRole('group', { name: 'Choose a season' }, { timeout: 20000 });
      expect(document.querySelector('[data-career-season-review]')).not.toBeNull();
      choose(1);
      expect(field('ovr')).toBe('84');
      click('Regular season');
      expect(stats()).toEqual(fixture.regular);
      click('Back to seasons');
      click('Back to career');
      expect(document.activeElement).toBe(screen.queryByRole('button', { name: /Career Log/ }));
      expect(Math.random).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      expect(removes).not.toHaveBeenCalled();
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
      view.unmount();
      view = render(<MemoryRouter><Board /></MemoryRouter>);
      await screen.findByRole('button', { name: /Career Log/ }, { timeout: 20000 });
      click(/Career Log/);
      await screen.findByRole('group', { name: 'Choose a season' }, { timeout: 20000 });
      choose(1);
      expect(field('ovr')).toBe('84');
      expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
      expect(writes).not.toHaveBeenCalled();
      expect(recordCompletion).not.toHaveBeenCalled();
      view.unmount(); writes.mockRestore(); removes.mockRestore();
    }
  }, 60000);
  it('reviews retired careers and restores the retirement opener without paying again', async () => {
    for (const slug of Object.keys(boards)) {
      const fixture = reviewFixtures.find(f => f.slug === slug)!, Board = boards[slug], sport = reviewSports[slug];
      const career = makeReviewCareer(fixture, true), bytes = reviewSave(career);
      localStorage.setItem(sport.saveKey, bytes);
      const { unmount } = render(<MemoryRouter><Board /></MemoryRouter>);
      await screen.findByText(`${career.name} retires`, undefined, { timeout: 20000 });
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      vi.mocked(Math.random).mockClear();
      click('Review seasons');
      await screen.findByRole('group', { name: 'Choose a season' }, { timeout: 20000 });
      expect(document.querySelector('[data-career-season-review]')).not.toBeNull();
      choose(1);
      click('Postseason');
      expect(stats()).toEqual(fixture.postseason);
      click('Back to seasons');
      click('Back to retirement');
      expect(screen.queryByText(`${career.name} retires`)).not.toBeNull();
      expect(document.activeElement).toBe(screen.queryByRole('button', { name: 'Review seasons' }));
      expect(Math.random).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
      unmount(); writes.mockRestore();
    }
  }, 60000);
  it('restores existing retirement legacy and exact save bytes without another completion', async () => {
    for (const slug of Object.keys(boards)) {
      const fixture = reviewFixtures.find(f => f.slug === slug)!, Board = boards[slug], sport = reviewSports[slug];
      const career: UsCareerCore = makeReviewCareer(fixture, true), bytes = reviewSave(career), legacy = sport.legacyOf(career);
      localStorage.setItem(sport.saveKey, bytes);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      for (let open = 0; open < 2; open++) {
        const { unmount } = render(<MemoryRouter><Board /></MemoryRouter>);
        await screen.findByText(`${career.name} retires`, undefined, { timeout: 20000 });
        expect(screen.queryByText(legacy.verdict)).not.toBeNull();
        for (const bullet of legacy.bullets) expect(document.body.textContent).toContain(bullet);
        expect(document.body.textContent).toContain(`Legacy ${legacy.score}`);
        expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
        expect(writes).not.toHaveBeenCalled();
        expect(recordCompletion).not.toHaveBeenCalled();
        unmount();
      }
      writes.mockRestore();
    }
  }, 60000);
});
