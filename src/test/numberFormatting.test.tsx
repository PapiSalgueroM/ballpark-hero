import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formatNumber } from '@/lib/formatNumber';
import ResultMoment from '@/components/game/ResultMoment';
import { GuestScoreBanner } from '@/components/game/GuestScoreBanner';
import PostGameStats from '@/components/game/PostGameStats';
import CareerSeasonReview from '@/components/us-career/CareerSeasonReview';
import CareerSeasonComparison from '@/components/us-career/CareerSeasonComparison';
import ClubManagerCareerPanel from '@/components/club-manager/ClubManagerCareerPanel';
import { nflStatLine, nbaStatLine, mlbStatLine, nhlStatLine, countOf } from '@/lib/usCareerStatLine';
import { bucketEdges, beatPercent, standingFromScores } from '@/lib/dailyStanding';
import { bankTrainingRating } from '@/lib/careerTraining';
import { makeReviewCareer, reviewFixtures, reviewSports } from '@/test/fixtures/careerSeasonReview1008';
import type { CareerState } from '@/lib/clubManager';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: null as unknown }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/lib/completions', () => ({ peekCurrentPlayerName: () => 'Formatting Fixture' }));

const BASELINE = 'unchanged engine training and standing preserve numeric state';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const allStorage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const env = () => ({ storage: allStorage(), rngCalls: vi.mocked(Math.random).mock.calls.length,
  writes: clone(vi.mocked(Storage.prototype.setItem).mock.calls), removals: clone(vi.mocked(Storage.prototype.removeItem).mock.calls) });
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = {}) {
  console.log('NUMBER_FORMAT_RECORD|' + JSON.stringify({ id, actual, expected, evidence }));
  expect(actual, id).toEqual(expected);
}
function held(id: string, before: ReturnType<typeof env>, value: unknown, bytes: string) {
  check(id, { environment: env(), input: JSON.stringify(value) }, { environment: before, input: bytes });
}
const fixture = (slug: string, pos: string) => makeReviewCareer(reviewFixtures.find(row => row.slug === slug && row.pos === pos)!);
const stats = (root: HTMLElement) => Object.fromEntries([...root.querySelectorAll('[data-season-stat]')].map(node => [node.getAttribute('data-season-stat'), node.querySelector('dd')?.textContent]));
const comparisons = (root: HTMLElement) => Object.fromEntries([...root.querySelectorAll('[data-season-compare-stat]')].map(node => [node.getAttribute('data-season-compare-stat'),
  ['first', 'second', 'delta'].map(side => node.querySelector(`[data-compare-${side}]`)?.textContent)]));
const click = (root: HTMLElement, selector: string) => { const node = root.querySelector(selector); check('actual control exists: ' + selector, !!node, true); fireEvent.click(node!); };

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('formatting-save', '{"year":2032,"yards":12345,"rate":0.91}');
  mocks.user = null; mocks.rpc.mockReset();
  vi.spyOn(Date, 'now').mockReturnValue(1791374400000);
  vi.spyOn(Math, 'random').mockReturnValue(.37);
  vi.spyOn(Storage.prototype, 'setItem'); vi.spyOn(Storage.prototype, 'removeItem');
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it(BASELINE, () => {
  const career = fixture('nfl', 'QB'), before = clone(career), environment = env();
  const trained = { ...clone(career), ovr: bankTrainingRating(70, 90, 80).ovr };
  const buckets = [{ label: 'Upper', min: 11, max: 20 }, { label: 'Lower', min: 0, max: 10 }];
  const scores = Array.from({ length: 19 }, (_, i) => i + 1), raw = clone(scores);
  const standing = standingFromScores(scores, 20, buckets)!;
  check(BASELINE, { trained, career, scores, standing, edges: bucketEdges(buckets), percent: beatPercent(standing), environment: env() }, {
    trained: { ...before, ovr: 72 }, career: before, scores: raw,
    standing: { players: 20, below: 19, median: 10.5, top: 20, counts: [10, 10] }, edges: [0, 11], percent: 100, environment,
  });
});

it('complete numeric tokens keep signs precision and trailing zeroes', () => {
  const values: (number | string)[] = [0, 999, 1000, 1234567, -12345.6789, '1234567.8900', '+1234567.000', '-0001234.0500', '0.00100', '1234.5678901234', '-0.00', '0000'];
  const before = env(), bytes = JSON.stringify(values);
  check('complete numeric tokens', values.map(formatNumber), ['0', '999', '1,000', '1,234,567', '-12,345.6789', '1,234,567.8900', '+1,234,567.000', '-0,001,234.0500', '0.00100', '1,234.5678901234', '-0.00', '0,000'], { values });
  held('helper is display only', before, values, bytes);
});

it('partial numeric text slash currency and nonfinite tokens pass through', () => {
  const values: (number | string)[] = ['1234/5000', '$1234.50', '2032 season', '1,234', ' 1234 ', '.1234', '1234.', '1e6', '+', '', Infinity, -Infinity, NaN];
  check('opaque tokens', values.map(formatNumber), ['1234/5000', '$1234.50', '2032 season', '1,234', ' 1234 ', '.1234', '1234.', '1e6', '+', '', 'Infinity', '-Infinity', 'NaN']);
});

it('ResultMoment groups primitive scores and sizes the displayed token', () => {
  const cases = [[1000, '1,000', 'text-3xl'], [100000, '100,000', 'text-2xl'], ['+1234.00', '+1,234.00', 'text-2xl'], ['1234567.00', '1,234,567.00', 'text-xl'], ['9/9', '9/9', 'text-4xl']] as const;
  const before = env(), outputs = [];
  for (const [score, text, size] of cases) {
    const view = render(<ResultMoment outcome="win" gamePath="/nba-my-career" score={score} />);
    const node = view.container.querySelector('[data-result-score]');
    outputs.push({ text: node?.textContent, sizes: [...(node?.classList ?? [])].filter(token => /^text-(4xl|3xl|2xl|xl)$/.test(token)) });
    view.unmount();
  }
  check('actual result tokens and size classes', outputs, cases.map(([, text, size]) => ({ text, sizes: [size] })));
  check('result presentation has no persistence or RNG', env(), before);
});

it('ResultMoment preserves ReactNode markup and missing-score behavior', () => {
  const view = render(<ResultMoment outcome="close" gamePath="/soccer-career" score={<strong data-custom-score="">1234 / 5000</strong>} />);
  check('actual custom score', { text: view.container.querySelector('[data-result-score]')?.textContent, strong: !!view.container.querySelector('[data-result-score] > strong[data-custom-score]'), size: view.container.querySelector('[data-result-score]')?.classList.contains('text-3xl') }, { text: '1234 / 5000', strong: true, size: true });
  view.rerender(<ResultMoment outcome="close" gamePath="/soccer-career" score={null} badge="OK" />);
  check('missing score', !!view.container.querySelector('[data-result-score]'), false);
});

it('GuestScoreBanner groups the actual score without changing guest eligibility', () => {
  const before = env(), view = render(<GuestScoreBanner score={12345.67} />);
  check('guest score', view.container.querySelector('p')?.textContent, 'You scored 12,345.67! 🎉');
  mocks.user = { id: 'signed-in-fixture' }; view.rerender(<GuestScoreBanner score={12345.67} />);
  check('signed-in banner remains hidden', view.container.textContent, '');
  check('guest display holds save and RNG', env(), before);
});

it('PostGameStats groups counts and scores while retaining numeric RPC arguments', async () => {
  const raw = { players: 2345, below: 1234, median: 1234.5, top: 9876, bucket_counts: [1234, 1111] };
  mocks.rpc.mockResolvedValue({ data: raw, error: null });
  const setup = env();
  // React initializes its async task queue with one random probe before this component mounts.
  await act(async () => {});
  const ready = env();
  check('standing async harness preserves storage', { storage: ready.storage, writes: ready.writes, removals: ready.removals },
    { storage: setup.storage, writes: setup.writes, removals: setup.removals }, { rngSetup: { before: setup.rngCalls, after: ready.rngCalls } });
  const before = env(), frozen = JSON.stringify(raw), buckets = [{ label: 'High', min: 2000, max: 9999 }, { label: 'Low', min: 0, max: 1999 }];
  const view = render(<PostGameStats gameSlug="formatting-fixture" userScore={4567.4} isVisible buckets={buckets} />);
  await act(async () => { await Promise.resolve(); });
  const panel = view.container.querySelector('[data-testid="daily-standing"]');
  check('standing visible values', { present: !!panel, text: panel?.textContent?.replace(/\s+/g, ' ').trim(), rpc: mocks.rpc.mock.calls }, {
    present: true, text: "📊 Today's board · 2,345 playersYou beat 53% of players todayHigh1,111Low1,234You 4,567Median 1,235Top 9,876",
    rpc: [['daily_score_standing', { p_game: 'formatting-fixture', p_edges: [0, 2000], p_score: 4567, p_player: 'Formatting Fixture' }]],
  }, { raw, buckets });
  held('standing source counts are unchanged', before, raw, frozen);
});

it('US stat lines group counts and retain exact existing rate precision and saved prose', () => {
  const qb = { ...fixture('nfl', 'QB').seasons[1], passYds: 12345, passTd: 1234, ints: 2 };
  const sp = { ...fixture('mlb', 'SP').seasons[1], so: 1234, era: 3.2 };
  const bat = { ...fixture('mlb', 'CF').seasons[1], avg: .28, rbi: 1234 };
  const goalie = { ...fixture('nhl', 'G').seasons[1], wins: 1234, svpct: .91 };
  const nba = { ...fixture('nba', 'PG').seasons[1], ppg: 24.6, rpg: 6.2, apg: 8.1 }, inputs = { qb, sp, bat, goalie, nba }, before = env(), bytes = JSON.stringify(inputs);
  check('actual four-sport lines', [nflStatLine(qb, 'QB'), mlbStatLine(sp, 'SP'), mlbStatLine(bat, 'CF'), nhlStatLine(goalie, 'G'), nbaStatLine(nba)],
    ['12,345 yds, 1,234 TD, 2 INT', '16-7, 3.20 ERA, 1,234 K', '.280, 29 HR, 1,234 RBI', '1,234 W, .910 SV%', '24.6 ppg, 6.2 rpg, 8.1 apg']);
  // countOf is also called while engines create saved postseason prose. Its old precision stays.
  check('saved prose helper remains unchanged', countOf(1234.56789, 'count', 'counts'), '1,234.568 counts');
  held('stat lines preserve complete season objects', before, inputs, bytes);
});

it('US review groups counts and money but leaves year age and rating untouched', () => {
  const career = fixture('nfl', 'QB');
  Object.assign(career.seasons[0], { games: 12 }); Object.assign(career.seasons[1], { games: 1234, salary: 1234.5, year: 2032, age: 25, ovr: 84 });
  const before = env(), bytes = JSON.stringify(career), view = render(<CareerSeasonReview career={career} sport={reviewSports.nfl} onBack={() => undefined} backLabel="Back" />);
  click(view.container, '[data-season-tile="1"]');
  check('actual overview leaves', Object.fromEntries(['games', 'games-change', 'pay', 'ovr', 'age'].map(key => [key, view.container.querySelector(`[data-season-${key}]`)?.textContent])),
    { games: '1,234', 'games-change': '1,222 higher', pay: '$1,234.5M', ovr: '84', age: '25' });
  check('actual season year', view.container.querySelector('#career-season-title')?.textContent, '2032 season');
  held('overview keeps full saved state', before, career, bytes);
});

it('US review regular values highs and original saved text remain truthful', () => {
  const career = fixture('nfl', 'QB'); Object.assign(career.seasons[1], { passYds: 12345, poLine: '12345 yds, 6 TD, 1 INT' });
  const before = env(), bytes = JSON.stringify(career), view = render(<CareerSeasonReview career={career} sport={reviewSports.nfl} onBack={() => undefined} backLabel="Back" />);
  click(view.container, '[data-season-tile="1"]'); click(view.container, '[data-season-tab="Regular season"]');
  check('actual review yards', stats(view.container), { 'Passing yards': '12,345', 'Passing touchdowns': '31', 'Interceptions thrown': '8' });
  click(view.container, '[data-season-tab="Postseason"]');
  check('saved postseason prose remains exact', stats(view.container), { Games: '3', Performance: '12345 yds, 6 TD, 1 INT' });
  fireEvent.click(view.getByRole('button', { name: 'Back to seasons' })); click(view.container, '[data-season-highs-open]'); click(view.container, '[data-season-highs-stat="Passing yards"]');
  check('actual saved high', view.container.querySelector('[data-season-highs-value]')?.textContent, '12,345');
  held('review and highs preserve the complete save', before, career, bytes);
});

it('US comparison groups signed large deltas and keeps selector years exact', () => {
  const career = fixture('nfl', 'QB'); Object.assign(career.seasons[1], { passYds: 1234, passTd: 2345, ints: 2 }); Object.assign(career.seasons[2], { passYds: 4567, passTd: 1111, ints: 2 });
  const before = env(), bytes = JSON.stringify(career), view = render(<CareerSeasonComparison career={career} sport={reviewSports.nfl} onBack={() => undefined} />);
  check('comparison year options', [...view.getByRole('combobox', { name: 'First season' }).querySelectorAll('option')].map(node => node.textContent), ['2032 (#2)', '2030 (#1)']);
  click(view.container, '[data-season-compare-tab="Regular season"]');
  check('actual signed count comparison', comparisons(view.container), { 'Passing yards': ['1,234', '4,567', '+3,333'], 'Passing touchdowns': ['2,345', '1,111', '-1,234'], 'Interceptions thrown': ['2', '2', '0'] });
  held('comparison leaves complete saves unchanged', before, career, bytes);
});

it('US comparison preserves two and three decimal places including zero deltas', () => {
  const outcomes = [];
  for (const [slug, pos, label, key, a, b] of [['mlb', 'SP', 'ERA', 'era', 3.2, 4.2], ['mlb', 'CF', 'Batting average', 'avg', .28, .28], ['nhl', 'G', 'Save percentage', 'svpct', .91, .92]] as const) {
    const career = fixture(slug, pos); Object.assign(career.seasons[1], { [key]: a }); Object.assign(career.seasons[2], { [key]: b });
    const before = env(), bytes = JSON.stringify(career), view = render(<CareerSeasonComparison career={career} sport={reviewSports[slug]} onBack={() => undefined} />);
    click(view.container, '[data-season-compare-tab="Regular season"]'); outcomes.push({ label, values: comparisons(view.container)[label] });
    held('fixed precision retains save: ' + label, before, career, bytes); view.unmount();
  }
  check('actual fixed rate comparison', outcomes, [{ label: 'ERA', values: ['3.20', '4.20', '+1.00'] }, { label: 'Batting average', values: ['0.280', '0.280', '0.000'] }, { label: 'Save percentage', values: ['0.910', '0.920', '+0.010'] }]);
});

it('manager count leaves group records and tournaments without changing season identifiers', () => {
  // Deliberate display stress fixture, not a claim that these counts came from natural play.
  const career = { sacked: true, manager: undefined, nationJob: { nation: 'England', since: 2032, played: 1234, won: 1000, lastResult: null, lastYear: null },
    careerStats: { played: 10000, wins: 1234, draws: 2345, losses: 6421 }, trophies: Array.from({ length: 1000 }, () => ({})) } as unknown as CareerState;
  const noop = () => undefined, g = { resignNation: noop, acceptNation: noop, answerApproach: noop, applyJob: noop, joinNow: noop, joinSummer: noop, updateManager: noop };
  const before = env(), bytes = JSON.stringify(career), view = render(<ClubManagerCareerPanel c={career} g={g} nationOffer={null} />);
  const text = view.container.textContent ?? '';
  check('actual manager count leaves', { nation: view.container.querySelector('[data-nation-job] p')?.textContent, record: text.includes('1,234W 2,345D 6,421L'), trophies: [...view.container.querySelectorAll('div')].some(node => node.textContent === '1,000'), winRate: text.includes('12%') },
    { nation: 'In charge since season 2032. 1,234 tournaments taken charge of, 1,000 won.', record: true, trophies: true, winRate: true });
  held('manager panel preserves all input and storage bytes', before, career, bytes);
});
