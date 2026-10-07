import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
import { seasonHighs } from '@/lib/usCareerSeasonReview';
import { answerSummerCard, summerCardAt } from '@/lib/usCareerSummer';
import { makeReviewCareer, reviewFixtures, reviewSave, reviewSports } from '@/test/fixtures/careerSeasonReview1008';
import type { ReviewFixture } from '@/test/fixtures/careerSeasonReview1008';
import type { UsCareerCore } from '@/lib/usCareerSport';

const boards: Record<string, ComponentType> = { nba: NbaMyCareerBoard, nfl: NflMyCareerBoard, mlb: MlbMyCareerBoard, nhl: NhlMyCareerBoard };
const field = (name: string) => document.querySelector(`[data-season-${name}]`)?.textContent;
// Literal display-only overlays. The original numeric fixtures and saved text remain untouched.
const groupedReviewDisplay = (value: string) => ({ '4123': '4,123', '4312': '4,312', '1281': '1,281', '1142': '1,142', '1122': '1,122', '1023': '1,023' } as Record<string, string>)[value] ?? value;
const stats = () => Object.fromEntries([...document.querySelectorAll('[data-season-stat]')].map(el => [el.getAttribute('data-season-stat'), el.querySelector('dd')?.textContent]));
const comparisons = () => Object.fromEntries([...document.querySelectorAll('[data-season-compare-stat]')].map(el => [el.getAttribute('data-season-compare-stat'),
  ['first', 'second', 'delta'].map(side => el.querySelector(`[data-compare-${side}]`)?.textContent)]));
function click(name: string | RegExp) {
  const button = screen.queryByRole('button', { name });
  expect(button, `button ${name} exists`).not.toBeNull();
  fireEvent.click(button!);
}
function clickHigh(label: string) {
  const button = document.querySelector(`[data-season-highs-stat="${label}"]`);
  expect(button, `season high ${label} exists`).not.toBeNull();
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
  expect(stats()).toEqual(Object.fromEntries(Object.entries(fixture.regular).map(([label, value]) => [label, groupedReviewDisplay(value)])));
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
  it('finds saved season highs from the correct positive field for every position', () => {
    const cases: [string, string[], string, string, number, string][] = [
      ['nba', ['PG', 'SG', 'SF', 'PF', 'C'], 'Points per game', 'ppg', 28.4, 'Games'],
      ['nfl', ['QB'], 'Passing yards', 'passYds', 4312, 'Games'],
      ['nfl', ['RB'], 'Rushing yards', 'rushYds', 1281, 'Games'],
      ['nfl', ['WR', 'TE'], 'Receiving yards', 'recYds', 1142, 'Games'],
      ['nfl', ['LB'], 'Tackles', 'tackles', 118, 'Games'],
      ['nfl', ['CB'], 'Interceptions', 'picks', 7, 'Games'],
      ['nfl', ['EDGE'], 'Sacks', 'sacks', 16.5, 'Games'],
      ['nfl', ['K'], 'Field goals made', 'fgMade', 33, 'Games'],
      ['mlb', ['SP'], 'Wins', 'wins', 19, 'Starts'],
      ['mlb', ['RP'], 'Saves', 'saves', 38, 'Appearances'],
      ['mlb', ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], 'Home runs', 'hr', 41, 'Games'],
      ['nhl', ['G'], 'Wins', 'wins', 39, 'Games'],
      ['nhl', ['C', 'LW', 'RW', 'D'], 'Points', 'points', 91, 'Games'],
    ];
    for (const [slug, positions, label, key, value, gamesLabel] of cases) for (const pos of positions) {
      const fixture = { ...(reviewFixtures.find(row => row.slug === slug && row.pos === pos) ?? reviewFixtures.find(row => row.slug === slug))!, pos }, career = makeReviewCareer(fixture);
      career.seasons.forEach((season, index) => Object.assign(season, { [key]: [value - 2, value, value - 1][index] }));
      const before = JSON.stringify(career);
      expect(seasonHighs(career, reviewSports[slug]), `${slug} ${pos} saved highs`).toEqual([
        { label: 'Season OVR', value: '84', indices: [1] },
        { label: gamesLabel, value: String(fixture.games), indices: [1] },
        { label, value: groupedReviewDisplay(String(value)), indices: [1] },
      ]);
      expect(JSON.stringify(career)).toBe(before);
    }
  });
  it('keeps every tied original index latest first and compares raw high values before formatting', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture), sport = reviewSports.nba;
    career.seasons.forEach(season => Object.assign(season, { year: 2032, ovr: 84, games: 76, ppg: 24.61 }));
    expect(seasonHighs(career, sport)).toEqual([
      { label: 'Season OVR', value: '84', indices: [2, 1, 0] },
      { label: 'Games', value: '76', indices: [2, 1, 0] },
      { label: 'Points per game', value: '24.61', indices: [2, 1, 0] },
    ]);
    Object.assign(career.seasons[1], { ppg: 24.64 });
    const roundedSport = { ...sport, reviewStats: (...args: Parameters<typeof sport.reviewStats>) => {
      const detail = sport.reviewStats(...args);
      return { ...detail, regularValues: detail.regularValues.map(stat => stat.label === 'Points per game'
        ? { ...stat, value: stat.numeric!.raw!.toFixed(1) } : stat) };
    } };
    expect(seasonHighs(career, roundedSport)[2]).toEqual({ label: 'Points per game', value: '24.6', indices: [1] });
  });
  it('keeps zero highs while excluding missing nonfinite and suspended seasons', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture), sport = reviewSports.nba;
    Object.assign(career.seasons[0], { ovr: 99, games: 99, ppg: 99, teamResult: 'SUSPENDED' });
    Object.assign(career.seasons[1], { ovr: 0, games: undefined, ppg: 0 });
    Object.assign(career.seasons[2], { ovr: NaN, games: Infinity, ppg: undefined });
    expect(seasonHighs(career, sport)).toEqual([
      { label: 'Season OVR', value: '0', indices: [1] },
      { label: 'Games', value: 'Not recorded', indices: [] },
      { label: 'Points per game', value: '0', indices: [1] },
    ]);
    let view = mountReview(fixture, career); click('Season highs');
    clickHigh('Games');
    expect(document.querySelector('[data-season-highs-value]')?.textContent).toBe('Not recorded');
    expect(screen.queryByRole('combobox', { name: 'High season' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open season' })).toBeNull();
    clickHigh('Points per game');
    expect(document.querySelector('[data-season-highs-value]')?.textContent).toBe('0');
    expect((screen.getByRole('combobox', { name: 'High season' }) as HTMLSelectElement).value).toBe('1');
    view.unmount();
    career.seasons.forEach(season => { season.teamResult = 'SUSPENDED'; });
    expect(seasonHighs(career, sport)).toEqual([
      { label: 'Season OVR', value: 'Not recorded', indices: [] },
      { label: 'Games', value: 'Not recorded', indices: [] },
      { label: 'Points per game', value: 'Not recorded', indices: [] },
    ]);
    view = mountReview(fixture, career); click('Season highs');
    expect(document.querySelector('[data-season-highs-value]')?.textContent).toBe('Not recorded');
    expect(screen.queryByRole('combobox', { name: 'High season' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open season' })).toBeNull();
    view.unmount();
  });
  it('opens the original tied high season and restores each navigation focus', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture);
    career.seasons[2].year = career.seasons[1].year;
    const bytes = JSON.stringify(career), view = mountReview(fixture, career);
    click('Season highs');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Season highs' }));
    expect([...document.querySelectorAll('[data-season-highs-stat]')].map(el => el.getAttribute('data-season-highs-stat'))).toEqual(['Season OVR', 'Games', 'Points per game']);
    expect(document.querySelector('[data-season-highs-stat="Season OVR"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-season-highs-value]')?.textContent).toBe('84');
    expect((screen.getByRole('combobox', { name: 'High season' }) as HTMLSelectElement).value).toBe('1');
    clickHigh('Points per game');
    const select = screen.getByRole('combobox', { name: 'High season' }) as HTMLSelectElement;
    expect([...select.options].map(option => [option.value, option.textContent])).toEqual([
      ['2', '2032 (#3)'], ['1', '2032 (#2)'], ['0', '2030 (#1)'],
    ]);
    expect(select.value).toBe('2');
    fireEvent.change(select, { target: { value: '0' } });
    click('Open season');
    expect(document.querySelector('[data-career-season-highs]')).toBeNull();
    expect(document.querySelector('[data-season-review]')?.getAttribute('data-season-review')).toBe('0');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: '2030 season' }));
    expect(field('ovr')).toBe('71');
    click('Back to seasons');
    expect(document.activeElement?.getAttribute('data-season-tile')).toBe('0');
    click('Season highs'); clickHigh('Games'); click('Back to seasons');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Season highs' }));
    click('Season highs');
    expect(document.querySelector('[data-season-highs-stat="Season OVR"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.stringify(career)).toBe(bytes); view.unmount();
    for (const count of [0, 1]) {
      const shortCareer = makeReviewCareer(fixture); shortCareer.seasons = shortCareer.seasons.slice(0, count);
      const shortView = mountReview(fixture, shortCareer);
      expect(screen.queryByRole('button', { name: 'Season highs' }) !== null).toBe(count === 1);
      if (count === 1) {
        click('Season highs');
        expect((screen.getByRole('combobox', { name: 'High season' }) as HTMLSelectElement).value).toBe('0');
        click('Open season');
        expect(document.querySelector('[data-season-review]')?.getAttribute('data-season-review')).toBe('0');
      }
      shortView.unmount();
    }
  });
  it('compares distinct original season indices and returns focus to Compare seasons', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture);
    career.seasons[2].year = career.seasons[1].year;
    const bytes = JSON.stringify(career), view = mountReview(fixture, career);
    click('Compare seasons');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Compare seasons' }));
    const first = screen.getByRole('combobox', { name: 'First season' }), second = screen.getByRole('combobox', { name: 'Second season' });
    expect((first as HTMLSelectElement).value).toBe('1'); expect((second as HTMLSelectElement).value).toBe('2');
    expect([...first.querySelectorAll('option')].map(option => option.value)).toEqual(['1', '0']);
    expect([...second.querySelectorAll('option')].map(option => option.value)).toEqual(['2', '0']);
    expect(comparisons()).toEqual({ 'Season OVR': ['84', '82', '-2'], Games: ['76', '75', '-1'], 'Age that season': ['25', '26', '+1'], 'Season salary': ['$12.75M', '$14M', '+$1.25M'] });
    fireEvent.change(first, { target: { value: '0' } }); fireEvent.change(second, { target: { value: '1' } });
    expect(comparisons()['Season OVR']).toEqual(['71', '84', '+13']);
    click('Regular season');
    expect(screen.queryByRole('button', { name: 'Postseason' })).toBeNull();
    click('Back to seasons');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Compare seasons' }));
    click('Compare seasons');
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'First season' })).toHaveValue('1');
    expect(JSON.stringify(career)).toBe(bytes);
    view.unmount();
    for (const count of [0, 1]) {
      const shortCareer = makeReviewCareer(fixture); shortCareer.seasons = shortCareer.seasons.slice(0, count);
      const shortView = mountReview(fixture, shortCareer);
      expect(screen.queryByRole('button', { name: 'Compare seasons' })).toBeNull(); shortView.unmount();
    }
  });
  it('compares every saved position field in its existing units without postseason prose', () => {
    const extraNfl: Pick<ReviewFixture, 'pos' | 'fields' | 'regular'>[] = [
      { pos: 'RB', fields: { rushYds: 1122, rushTd: 12, rec: 31, recYds: 211 }, regular: { 'Rushing yards': '1122', 'Rushing touchdowns': '12', Receptions: '31', 'Receiving yards': '211' } },
      ...['WR', 'TE'].map(pos => ({ pos, fields: { rec: 71, recYds: 1023, recTd: 9 }, regular: { Receptions: '71', 'Receiving yards': '1023', 'Receiving touchdowns': '9' } })),
      { pos: 'LB', fields: { tackles: 114, sacks: 4.5, picks: 3 }, regular: { Tackles: '114', Sacks: '4.5', Interceptions: '3' } },
      { pos: 'CB', fields: { picks: 4, passDef: 17, tackles: 43 }, regular: { Interceptions: '4', 'Passes defended': '17', Tackles: '43' } },
      { pos: 'K', fields: { fgMade: 29, fgAtt: 32, longFg: 58 }, regular: { 'Field goals made': '29', 'Field goals attempted': '32', 'Longest field goal': '58' } },
    ];
    for (const fixture of [...reviewFixtures, ...extraNfl.map(fixture => ({ ...fixture, slug: 'nfl', games: 16, gamesLabel: 'Games', postseason: {} }))]) {
      const view = mountReview(fixture); click('Compare seasons');
      expect(comparisons()[fixture.gamesLabel]).toEqual([String(fixture.games), String(fixture.games - 1), '-1']);
      click('Regular season');
      expect(comparisons()).toEqual(Object.fromEntries(Object.entries(fixture.regular).map(([label, value]) => [label,
        [groupedReviewDisplay(value), groupedReviewDisplay(value), label === 'ERA' ? '0.00' : ['Batting average', 'On base percentage', 'Save percentage'].includes(label) ? '0.000' : '0']])));
      expect(screen.queryByRole('button', { name: 'Postseason' })).toBeNull();
      expect(document.querySelector('[data-career-season-comparison]')?.textContent).not.toContain('Fixture conference final');
      view.unmount();
    }
  });
  it('subtracts raw saved rates before rounding and keeps neutral reversed changes', () => {
    const fixture = reviewFixtures.find(f => f.slug === 'mlb' && f.pos === 'CF')!, career = makeReviewCareer(fixture);
    Object.assign(career.seasons[1], { avg: .2866, obp: .3606 });
    Object.assign(career.seasons[2], { avg: .2874, obp: .3614 });
    const view = mountReview(fixture, career); click('Compare seasons'); click('Regular season');
    expect(comparisons()['Batting average']).toEqual(['0.287', '0.287', '+0.001']);
    expect(comparisons()['On base percentage']).toEqual(['0.361', '0.361', '+0.001']);
    fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Second season' }), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), { target: { value: '2' } });
    expect(comparisons()['Batting average']).toEqual(['0.287', '0.287', '-0.001']);
    expect(document.body.textContent).not.toMatch(/better|worse/);
    view.unmount();
    const pitcher = reviewFixtures.find(f => f.slug === 'mlb' && f.pos === 'SP')!, pitching = makeReviewCareer(pitcher);
    Object.assign(pitching.seasons[1], { era: 3.204 }); Object.assign(pitching.seasons[2], { era: 3.196 });
    mountReview(pitcher, pitching); click('Compare seasons'); click('Regular season');
    expect(comparisons().ERA).toEqual(['3.20', '3.20', '-0.01']);
  });
  it('keeps missing zero and suspended comparison values distinct', () => {
    const fixture = reviewFixtures[0], career = makeReviewCareer(fixture);
    const older = career.seasons[1] as unknown as Record<string, unknown>;
    delete older.ppg; older.rpg = 0;
    Object.assign(career.seasons[2], { ppg: 0, rpg: 0 });
    let view = mountReview(fixture, career); click('Compare seasons'); click('Regular season');
    expect(comparisons()['Points per game']).toEqual(['Not recorded', '0', 'Not recorded']);
    expect(comparisons()['Rebounds per game']).toEqual(['0', '0', '0']);
    view.unmount();
    career.seasons[1].teamResult = 'SUSPENDED';
    const bytes = JSON.stringify(career);
    view = mountReview(fixture, career); click('Compare seasons'); click('Regular season');
    expect(comparisons()['Points per game']).toEqual(['Not played', '0', 'Not played']);
    expect(comparisons()['Assists per game']).toEqual(['Not played', '8.1', 'Not played']);
    expect(JSON.stringify(career)).toBe(bytes); view.unmount();
    career.seasons[2].teamResult = 'SUSPENDED';
    mountReview(fixture, career); click('Compare seasons'); click('Regular season');
    expect(Object.values(comparisons())).toEqual(Array.from({ length: 3 }, () => ['Not played', 'Not played', 'Not played']));
  });
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
      click('Season highs');
      expect(document.querySelector('[data-season-highs-value]')?.textContent).toBe('84');
      const highMetric = document.querySelectorAll('[data-season-highs-stat]')[2];
      expect(highMetric).toBeTruthy(); fireEvent.click(highMetric);
      fireEvent.change(screen.getByRole('combobox', { name: 'High season' }), { target: { value: '0' } });
      click('Open season');
      expect(field('ovr')).toBe('71');
      click('Back to seasons');
      expect(document.activeElement?.getAttribute('data-season-tile')).toBe('0');
      click('Season highs'); click('Back to seasons');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Season highs' }));
      click('Compare seasons');
      expect(comparisons()['Season OVR']).toEqual(['84', '82', '-2']);
      click('Regular season');
      fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), { target: { value: '0' } });
      click('Back to seasons');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Compare seasons' }));
      choose(1);
      expect(field('ovr')).toBe('84');
      click('Regular season');
      expect(stats()).toEqual(Object.fromEntries(Object.entries(fixture.regular).map(([label, value]) => [label, groupedReviewDisplay(value)])));
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
  it('opens Career Log during a pending choice and restores that exact choice', async () => {
    const fixture = reviewFixtures[0], sport = reviewSports.nba, career = makeReviewCareer(fixture);
    career.age = 27;
    delete career.rival;
    localStorage.setItem(sport.saveKey, reviewSave(career));
    render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
    await screen.findByRole('button', { name: /Play the 2034 season/ });
    click(/Play the 2034 season/);
    click('Continue');
    const event = document.querySelector('[data-career-event]');
    expect(event, 'An ordinary pending choice is available after the played season').not.toBeNull();
    const eventId = event!.getAttribute('data-career-event'), eventText = event!.textContent;
    const bytes = localStorage.getItem(sport.saveKey)!;
    expect(JSON.parse(bytes).phase).toBe('event');
    expect(JSON.parse(bytes).c.seasons).toHaveLength(4);
    // React initializes its async act task queue with one random draw before the measured review.
    await act(async () => {});
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    vi.mocked(Math.random).mockClear();
    await act(async () => { click(/Career Log/); });
    expect(document.querySelector('[data-career-season-review]'), 'Career Log opens while the ordinary choice stays pending').not.toBeNull();
    choose(1);
    expect(field('ovr')).toBe('84');
    click('Back to seasons');
    click('Back to career');
    const restored = document.querySelector('[data-career-event]');
    expect(restored?.getAttribute('data-career-event')).toBe(eventId);
    expect(restored?.textContent).toBe(eventText);
    expect(document.activeElement).toBe(screen.queryByRole('button', { name: /Career Log/ }));
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(writes).not.toHaveBeenCalled();
    expect(Math.random).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
    const saved = JSON.parse(bytes);
    /* Round 1038: the pending choice is card 1 of the summer the save holds,
       rebuilt from the save. Answering it moves the save to the next card
       (team quality is rolled only after the last). */
    const expectedCareer = JSON.parse(bytes).c;
    const expectedEvent = summerCardAt(expectedCareer, sport, 0)!;
    expect(expectedEvent.id).toBe(eventId);
    const expectedChoiceRng = vi.fn(() => .37);
    const { next } = answerSummerCard(expectedCareer, sport, expectedEvent, 0, expectedChoiceRng);
    const expectedQuality = next ? saved.teamQuality : sport.rollTeamQuality(saved.teamQuality, expectedChoiceRng);
    fireEvent.click(restored!.querySelector('button')!);
    expect(document.querySelector('[data-career-event]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(sport.saveKey)!)).toEqual({
      ...saved, c: expectedCareer, phase: next ? 'event' : 'season', teamQuality: expectedQuality,
    });
    expect(expectedCareer.seasons).toHaveLength(4);
    expect(Math.random).toHaveBeenCalledTimes(expectedChoiceRng.mock.calls.length);
    expect(writes).toHaveBeenCalledTimes(1);
  });
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
