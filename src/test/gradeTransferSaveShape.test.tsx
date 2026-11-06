import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { useGradeTransfer } from '@/hooks/useGradeTransfer';
import GradeTransfer from '@/pages/GradeTransfer';
import { GRADES, type Grade, type TransferCase } from '@/lib/fetchTransferGrades';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const io = vi.hoisted(() => ({
  current: null as ReturnType<typeof import('@/hooks/useGradeTransfer').useGradeTransfer> | null,
  rows: [] as Record<string, unknown>[], transport: [] as any[], draws: [] as number[],
  operationErrors: [] as { label: string; name: string; error: string }[],
  boundaries: [] as { label: string; key: string; bytes: string | null }[], completion: vi.fn(),
}));
vi.mock('@/hooks/useGradeTransfer', async original => {
  const actual = await original<typeof import('@/hooks/useGradeTransfer')>();
  return { ...actual, useGradeTransfer: () => { const value = actual.useGradeTransfer(); io.current = value; return value; } };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    if (!['transfer_grade_pool', 'transfer_grade_votes'].includes(table)) throw Error('Unexpected transfer fixture table: ' + table);
    const steps: { method: string; args: unknown[] }[] = [];
    const query: any = { then: (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
      const inserted = steps.some(step => step.method === 'insert');
      const response = { data: table === 'transfer_grade_pool' ? JSON.parse(JSON.stringify(io.rows))
        : inserted ? null : [{ grade: 'A' }, { grade: 'B' }, { grade: 'A' }], error: null };
      io.transport.push({ table, steps: JSON.parse(JSON.stringify(steps)), response });
      return Promise.resolve(response).then(yes, no);
    } };
    for (const method of ['select', 'gte', 'order', 'range', 'eq', 'insert']) query[method] = (...args: unknown[]) => {
      steps.push({ method, args }); return query;
    };
    return query;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const POOL: TransferCase[] = Array.from({ length: 5 }, (_, i) => ({
  playerName: 'Fixture Transfer ' + (i + 1), nationality: 'Fixture Nation', position: 'Forward',
  fromClub: 'Fixture Origin ' + (i + 1), toClub: 'Fixture Destination ' + (i + 1), moveYear: 2000 + i,
  valueAtMove: 50 - i, valueAfter: (50 - i) * 2, pctChange: 100, actualGrade: 'A',
}));
const TITLES = {
  gradesObject: 'GTT_SAVE_GRADES_OBJECT recovers a non-array save before the actual grade callback can throw',
  indexNegative: 'GTT_SAVE_INDEX_NEGATIVE recovers a negative index instead of rendering no transfer card',
  indexFraction: 'GTT_SAVE_INDEX_FRACTION recovers a fractional index instead of rendering no transfer card',
  indexString: 'GTT_SAVE_INDEX_STRING recovers a string index before Next concatenates an unusable index',
  gradeItem: 'GTT_SAVE_GRADE_ITEM refuses an invalid stored grade instead of showing an invented reveal and score',
  missing: 'GTT_SAVE_MISSING keeps fresh play save vote crowd and reload behavior',
  corrupt: 'GTT_SAVE_CORRUPT_JSON keeps the existing malformed JSON fallback and subsequent save',
  short: 'GTT_SAVE_SHORT keeps empty and shorter valid arrays without padding their writes',
  partial: 'GTT_SAVE_PARTIAL keeps a valid partial save and records its actual finish once',
  revealed: 'GTT_SAVE_REVEALED keeps a valid revealed card and ignores a repeated grade',
  finished: 'GTT_SAVE_FINISHED keeps finished saves and suppresses completion on each reload',
} as const;
type Key = keyof typeof TITLES;
let activeCase: Key | null = null, view: RenderResult | null = null;
const raw = {
  version: 1, unitClock: '2026-11-06T12:00:00Z',
  scope: 'Actual Grade the Transfer Hook/Page/Board, fetchTransferGrades/fetchAllRows, date selection, scoring and completion-restoration logic. Only fictional Supabase transport and external auth/navigation/SEO/recording boundaries are substituted. Malformed storage is a unit boundary fixture, never a native injection claim.',
  fictionalPool: POOL, cases: {} as Record<string, { title: string; frames: unknown[] }>,
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const flush = async () => { await act(async () => {}); };
const current = () => { if (!io.current) throw Error('Transfer fixture Hook not mounted'); return io.current; };
const savedKey = () => 'grade-transfer-' + getTodayET();
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
function install(label: string, value: unknown, rawBytes = false) {
  if (value === undefined) localStorage.removeItem(savedKey());
  else localStorage.setItem(savedKey(), rawBytes ? String(value) : JSON.stringify(value));
  io.boundaries.push({ label, key: savedKey(), bytes: localStorage.getItem(savedKey()) });
}
function capture(label: string) {
  if (!activeCase || !view) throw Error('Transfer capture case/view missing');
  const h = current(), scope = within(view.container);
  const value = clone({
    label, state: { loading: h.loading, rounds: h.rounds, index: h.index, current: h.current,
      status: h.status, score: h.score, exact: h.exact, shareText: h.shareText },
    storage: storage(), savedBytes: localStorage.getItem(savedKey()), boundaries: io.boundaries,
    draws: io.draws, transport: io.transport, operationErrors: io.operationErrors, completions: io.completion.mock.calls,
    page: { html: view.container.innerHTML, text: view.container.textContent,
      gradeButtons: GRADES.filter(grade => scope.queryByRole('button', { name: grade }) !== null),
      buttons: scope.queryAllByRole('button').map(button => button.textContent?.trim()),
      transferHeadings: scope.queryAllByRole('heading', { level: 2 }).map(heading => heading.textContent) },
  });
  (raw.cases[activeCase] ??= { title: TITLES[activeCase], frames: [] }).frames.push(value); return value;
}
async function mount(label: string) {
  io.current = null; view = render(<GradeTransfer />); await flush();
  expect(current().loading, 'Real transfer pool settles').toBe(false);
  expect(current().rounds, 'Real parser supplies all five fictional transfers').toHaveLength(5);
  expect(new Set(current().rounds.map(round => round.tc.playerName)), 'Actual daily selection has five distinct fixture names')
    .toEqual(new Set(POOL.map(tc => tc.playerName)));
  return capture(label + '-restored');
}
function unmount() { view?.unmount(); view = null; io.current = null; }
async function gradeButton(grade: Grade) {
  if (!view) throw Error('Transfer Page missing');
  fireEvent.click(within(view.container).getByRole('button', { name: grade })); await flush();
}
async function nextButton(name = 'Next transfer') {
  if (!view) throw Error('Transfer Page missing');
  fireEvent.click(within(view.container).getByRole('button', { name })); await flush();
}
async function attemptGrade(label: string, grade: Grade) {
  try { act(() => current().grade(grade)); }
  catch (error) {
    io.operationErrors.push({ label, name: error instanceof Error ? error.name : typeof error, error: String(error) });
  }
  await flush();
}
function fresh(frame: ReturnType<typeof capture>, title: string) {
  expect(frame.state.index, title + ' first index').toBe(0);
  expect(frame.state.current, title + ' actual first transfer').toEqual(frame.state.rounds[0]);
  expect(frame.state.status, title + ' first card is playable').toBe('grading');
  expect(frame.state.score, title + ' no invented points').toBe(0);
  expect(frame.state.exact, title).toBe(0); expect(frame.state.shareText, title).toBe('');
  expect(frame.state.rounds.map(round => round.userGrade), title).toEqual(Array(5).fill(null));
  expect(frame.page.gradeButtons, title + ' real grade controls are present').toEqual(GRADES);
  expect(frame.savedBytes, title + ' read leaves the supplied storage bytes intact').toBe(frame.boundaries[frame.boundaries.length - 1]?.bytes);
}
function vote(count: number, grade: Grade, tc: TransferCase, title: string, records = io.transport) {
  const votes = records.filter(row => row.table === 'transfer_grade_votes' && row.steps.some((step: any) => step.method === 'insert'));
  expect(votes, title + ' exact vote count').toHaveLength(count);
  expect(votes[count - 1].steps, title + ' unchanged vote payload').toEqual([{ method: 'insert', args: [{
    player_name: tc.playerName, move_year: tc.moveYear, to_club: tc.toClub, grade,
  }] }]);
  const crowds = records.filter(row => row.table === 'transfer_grade_votes' && row.steps.some((step: any) => step.method === 'select'));
  expect(crowds, title + ' one crowd query per vote').toHaveLength(count);
  expect(crowds[count - 1].steps, title + ' unchanged crowd query').toEqual([
    { method: 'select', args: ['grade'] }, { method: 'eq', args: ['player_name', tc.playerName] },
    { method: 'eq', args: ['move_year', tc.moveYear] },
  ]);
}
const crowd = { counts: { A: 2, B: 1, C: 0, D: 0, F: 0 }, total: 3, mode: 'A' };
const users = (frame: ReturnType<typeof capture>) => frame.state.rounds.map(round => round.userGrade);
beforeEach(async () => {
  await flush(); vi.clearAllMocks(); localStorage.clear(); consumeRestoredFinish('grade-transfer');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  io.current = null; io.transport = []; io.draws = []; io.operationErrors = []; io.boundaries = []; view = null; activeCase = null;
  localStorage.setItem('grade-transfer-unrelated', 'held');
  io.rows = POOL.map(tc => ({
    player_name: tc.playerName, nationality: tc.nationality, position: tc.position, from_club: tc.fromClub, to_club: tc.toClub,
    move_year: tc.moveYear, value_at_move: tc.valueAtMove, value_after: tc.valueAfter, pct_change: tc.pctChange, actual_grade: tc.actualGrade,
  }));
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
});
afterEach(() => {
  if (activeCase && io.current && view) capture('teardown-settled');
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.GRADE_TRANSFER_SAVE_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('GRADE_TRANSFER_SAVE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Grade the Transfer saved payload boundary', () => {
  it(TITLES.gradesObject, async () => {
    activeCase = 'gradesObject'; install('object', { grades: {}, index: 0 }); const before = await mount('object');
    await attemptGrade('object-grade', 'A'); const after = capture('object-grade-attempt');
    expect(after.operationErrors, TITLES.gradesObject + ' actual callback remains usable').toEqual([]);
    fresh(before, TITLES.gradesObject); expect(after.state.status, TITLES.gradesObject).toBe('revealed');
    expect(after.state.score, TITLES.gradesObject).toBe(100); vote(1, 'A', before.state.rounds[0].tc, TITLES.gradesObject);
  });
  for (const [key, index] of [['indexNegative', -1], ['indexFraction', 0.5]] as const) it(TITLES[key], async () => {
    activeCase = key; install(key, { grades: Array(5).fill(null), index }); const before = await mount(key);
    await attemptGrade(key + '-grade', 'A'); const after = capture(key + '-grade-attempt');
    fresh(before, TITLES[key]); expect(after.operationErrors, TITLES[key]).toEqual([]);
    expect(after.state.status, TITLES[key]).toBe('revealed'); expect(after.state.score, TITLES[key]).toBe(100);
    vote(1, 'A', before.state.rounds[0].tc, TITLES[key]);
  });
  it(TITLES.indexString, async () => {
    activeCase = 'indexString'; install('string', { grades: Array(5).fill(null), index: '0' }); const before = await mount('indexString');
    await gradeButton('A'); const graded = capture('indexString-after-grade'); await nextButton(); const after = capture('indexString-after-next');
    fresh(before, TITLES.indexString); expect(graded.state.status, TITLES.indexString).toBe('revealed');
    expect(after.state.index, TITLES.indexString + ' numeric Next').toBe(1);
    expect(after.state.current, TITLES.indexString).toEqual(after.state.rounds[1]); expect(after.page.gradeButtons, TITLES.indexString).toEqual(GRADES);
    expect(JSON.parse(after.savedBytes!), TITLES.indexString).toEqual({ grades: ['A', null, null, null, null], index: 1 });
    vote(1, 'A', before.state.rounds[0].tc, TITLES.indexString);
  });
  it(TITLES.gradeItem, async () => {
    activeCase = 'gradeItem'; install('invalid-item', { grades: ['Z', null, null, null, null], index: 0 }); const before = await mount('gradeItem');
    await attemptGrade('invalid-item-grade', 'A'); const after = capture('gradeItem-grade-attempt');
    fresh(before, TITLES.gradeItem); expect(after.state.status, TITLES.gradeItem).toBe('revealed');
    expect(after.state.current?.userGrade, TITLES.gradeItem).toBe('A'); expect(after.state.score, TITLES.gradeItem).toBe(100);
    vote(1, 'A', before.state.rounds[0].tc, TITLES.gradeItem);
  });
  for (const key of ['missing', 'corrupt'] as const) it(TITLES[key], async () => {
    activeCase = key; install(key, key === 'missing' ? undefined : '{broken', true); const before = await mount(key);
    await gradeButton('A'); const graded = capture(key + '-after-grade'); await nextButton(); const advanced = capture(key + '-after-next');
    unmount(); const reloaded = await mount(key + '-reload');
    fresh(before, TITLES[key]); expect(before.savedBytes, TITLES[key] + ' no read rewrite').toBe(key === 'missing' ? null : '{broken');
    expect(graded.state.current?.crowd, TITLES[key]).toEqual(crowd); expect(graded.state.score, TITLES[key]).toBe(100);
    expect(advanced.state.index, TITLES[key]).toBe(1); expect(advanced.state.status, TITLES[key]).toBe('grading');
    expect(JSON.parse(advanced.savedBytes!), TITLES[key]).toEqual({ grades: ['A', null, null, null, null], index: 1 });
    expect(reloaded.savedBytes, TITLES[key] + ' literal saved bytes reload').toBe(advanced.savedBytes);
    expect(users(reloaded), TITLES[key]).toEqual(['A', null, null, null, null]); expect(reloaded.state.index, TITLES[key]).toBe(1);
    expect([reloaded.state.status, reloaded.state.score, reloaded.state.exact, reloaded.state.shareText], TITLES[key]).toEqual(['grading', 100, 1, '']);
    expect(reloaded.state.rounds.every(round => round.crowd === null), TITLES[key] + ' crowds remain transient').toBe(true);
    vote(1, 'A', before.state.rounds[0].tc, TITLES[key]); expect(io.completion, TITLES[key]).not.toHaveBeenCalled();
  });
  it(TITLES.short, async () => {
    activeCase = 'short'; const observations = [];
    for (const [label, grades] of [['short-empty', []], ['short-pair', [null, null]]] as const) {
      install(label, { grades, index: 0 }); const before = await mount(label);
      await gradeButton('A'); const graded = capture(label + '-after-grade'); await nextButton(); const advanced = capture(label + '-after-next');
      observations.push({ label, grades, before, graded, advanced }); if (label === 'short-empty') unmount();
    }
    for (const [i, observation] of observations.entries()) {
      const { grades, before, graded, advanced } = observation, expected = grades.length === 0 ? ['A'] : ['A', null];
      fresh(before, TITLES.short); expect(before.savedBytes, TITLES.short + ' exact short bytes').toBe(JSON.stringify({ grades, index: 0 }));
      expect(JSON.parse(graded.savedBytes!), TITLES.short + ' do not pad a valid legacy array').toEqual({ grades: expected, index: 0 });
      expect(JSON.parse(advanced.savedBytes!), TITLES.short).toEqual({ grades: expected, index: 1 });
      expect([advanced.state.index, advanced.state.status, advanced.state.score, advanced.state.exact], TITLES.short).toEqual([1, 'grading', 100, 1]);
      expect(graded.state.current?.crowd, TITLES.short).toEqual(crowd); vote(i + 1, 'A', before.state.rounds[0].tc, TITLES.short, graded.transport);
    }
    expect(io.completion, TITLES.short).not.toHaveBeenCalled();
  });
  it(TITLES.partial, async () => {
    activeCase = 'partial'; const bytes = '{ "grades": ["A","B","C","D",null], "index": 4 }';
    install('partial', bytes, true); const before = await mount('partial'); await gradeButton('F'); const graded = capture('partial-after-grade');
    await nextButton('See result'); const finished = capture('partial-after-finish'); unmount(); const reloaded = await mount('partial-reload');
    expect(before.savedBytes, TITLES.partial + ' literal partial bytes held on read').toBe(bytes);
    expect([before.state.index, before.state.status, before.state.score, before.state.exact], TITLES.partial).toEqual([4, 'grading', 150, 1]);
    expect(before.state.current, TITLES.partial).toEqual(before.state.rounds[4]); expect(users(before), TITLES.partial).toEqual(['A', 'B', 'C', 'D', null]);
    expect([graded.state.status, graded.state.score, graded.state.exact], TITLES.partial).toEqual(['revealed', 150, 1]);
    expect(graded.state.current?.crowd, TITLES.partial).toEqual(crowd); expect(finished.state.status, TITLES.partial).toBe('finished');
    expect(JSON.parse(finished.savedBytes!), TITLES.partial).toEqual({ grades: ['A', 'B', 'C', 'D', 'F'], index: 5 });
    expect([reloaded.state.index, reloaded.state.status, reloaded.state.score, reloaded.state.exact], TITLES.partial).toEqual([5, 'finished', 150, 1]);
    expect(reloaded.savedBytes, TITLES.partial).toBe(finished.savedBytes); expect(reloaded.state.shareText, TITLES.partial).toBe(finished.state.shareText);
    vote(1, 'F', before.state.rounds[4].tc, TITLES.partial);
    expect(io.completion.mock.calls, TITLES.partial + ' real finish once, restored finish not again').toEqual([['/grade-transfer', 150, 'Fixture Manager', 1]]);
  });
  it(TITLES.revealed, async () => {
    activeCase = 'revealed'; const bytes = '{ "grades": ["B",null,null,null,null], "index": 0 }';
    install('revealed', bytes, true); const before = await mount('revealed'); await attemptGrade('revealed-repeat', 'F');
    const ignored = capture('revealed-ignored-repeat'); await nextButton(); const after = capture('revealed-after-next');
    expect(before.savedBytes, TITLES.revealed).toBe(bytes);
    expect([before.state.index, before.state.status, before.state.score, before.state.exact], TITLES.revealed).toEqual([0, 'revealed', 50, 0]);
    expect(before.page.gradeButtons, TITLES.revealed).toEqual([]); expect(before.page.buttons, TITLES.revealed).toContain('Next transfer');
    expect(ignored.state, TITLES.revealed + ' repeated grade is a full no-op').toEqual(before.state);
    expect(ignored.storage, TITLES.revealed).toEqual(before.storage); expect(ignored.transport, TITLES.revealed).toEqual(before.transport);
    expect(JSON.parse(after.savedBytes!), TITLES.revealed).toEqual({ grades: ['B', null, null, null, null], index: 1 });
    expect([after.state.index, after.state.status, after.state.score, after.state.exact], TITLES.revealed).toEqual([1, 'grading', 50, 0]);
    expect(io.transport.filter(row => row.table === 'transfer_grade_votes'), TITLES.revealed).toEqual([]); expect(io.completion, TITLES.revealed).not.toHaveBeenCalled();
  });
  it(TITLES.finished, async () => {
    activeCase = 'finished'; const observations = [];
    for (const index of [5, 7]) {
      const bytes = '{ "grades": ["A","B","C","D","F"], "index": ' + index + ' }';
      install('finished-' + index, bytes, true); const before = await mount('finished' + index); unmount();
      const reloaded = await mount('finished' + index + '-reload'); observations.push({ index, bytes, before, reloaded });
      if (index === 5) unmount();
    }
    for (const { index, bytes, before, reloaded } of observations) {
      expect([before.state.index, before.state.status, before.state.score, before.state.exact], TITLES.finished).toEqual([index, 'finished', 150, 1]);
      expect(before.state.current, TITLES.finished).toBeNull(); expect(users(before), TITLES.finished).toEqual(['A', 'B', 'C', 'D', 'F']);
      expect(before.savedBytes, TITLES.finished + ' literal finished bytes held').toBe(bytes);
      expect(reloaded.state, TITLES.finished + ' complete finished state reloads').toEqual(before.state); expect(reloaded.savedBytes, TITLES.finished).toBe(bytes);
      expect(before.page.buttons, TITLES.finished).toEqual(['Share result']); expect(before.page.gradeButtons, TITLES.finished).toEqual([]);
      expect(before.state.shareText, TITLES.finished).toBe('Grade the Transfer, 2026-11-06\n🟩🟨🟥🟥🟥\n1/5 spot on · 150 pts\ndouknowball.com/grade-transfer');
    }
    expect(io.transport.filter(row => row.table === 'transfer_grade_votes'), TITLES.finished).toEqual([]);
    expect(io.completion, TITLES.finished + ' restored finish guard consumes every reload').not.toHaveBeenCalled();
  });
});
