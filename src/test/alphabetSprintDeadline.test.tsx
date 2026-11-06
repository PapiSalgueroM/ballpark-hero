import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import AlphabetSprint from '@/pages/AlphabetSprint';
import * as sprint from '@/lib/alphabetSprint';

const io = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[], transport: [] as any[], unknownTransport: [] as unknown[],
  draws: [] as number[], intervals: [] as { id: number; delay: number; registeredAt: number; firedAt: number[] }[],
  clock: [] as Record<string, unknown>[], completion: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    if (table !== 'player_market_values_dedup') throw Error('Unexpected sprint fixture table: ' + table);
    const row = { table, calls: [] as unknown[], startedAt: Date.now(), settledAt: null as number | null, response: null as unknown };
    io.transport.push(row);
    const query: any = {};
    for (const method of ['select', 'eq', 'gt', 'order', 'range']) query[method] = (...args: unknown[]) => {
      row.calls.push({ method, args }); return query;
    };
    query.then = (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
      const exact = [
        { method: 'select', args: ['player_name, nationality, club, market_value_usd'] },
        { method: 'eq', args: ['year', 2026] },
        { method: 'gt', args: ['market_value_usd', 0] },
        { method: 'order', args: ['player_name', { ascending: true }] },
        { method: 'range', args: [0, 999] },
      ];
      if (JSON.stringify(row.calls) !== JSON.stringify(exact)) throw Error('Unexpected sprint fixture query: ' + JSON.stringify(row.calls));
      const response = { data: io.rows.map(value => ({ ...value })), error: null };
      row.settledAt = Date.now(); row.response = response;
      return Promise.resolve(response).then(yes, no);
    };
    return query;
  } },
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/components/FlagImg', () => ({ FlagImg: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const BASE = Date.parse('2026-11-06T12:00:00Z');
const BEST_KEY = 'alphabet_sprint_best_v1';
const TITLES = {
  ordinary: 'ALPHABET_PREDEADLINE_PRESERVE keeps real spelling resolution scoring skips and an ordinary Classic finish',
  finish: 'ALPHABET_FINISH_REPLAY_PRESERVE keeps real pool exhaustion same-pace replay and separate mode bests',
  lateSubmit: 'ALPHABET_LATE_SUBMIT rejects a valid answer after the elapsed deadline and closes on earned points',
  lateSkip: 'ALPHABET_LATE_SKIP refuses an elapsed-deadline Skip without another draw or reset',
  delayedTimeout: 'ALPHABET_DELAYED_TIMEOUT settles the first delivered callback after expiry exactly once at earned points',
  elapsedTick: 'ALPHABET_ELAPSED_TICK displays elapsed remaining time after one delayed predeadline callback',
} as const;
type Key = keyof typeof TITLES;
type Tap = { mock: { calls: unknown[][]; results: { type: string; value?: unknown }[] } };
const FIXTURE = (['A', 'B'] as const).flatMap(letter => Array.from({ length: 25 }, (_, index) => ({
  letter,
  row: { player_name: `Fixture ${letter}${String(index).padStart(2, '0')} ${index < 2 ? (letter === 'A' ? 'Aster' : 'Bramble') : (letter === 'A' ? 'Amber' : 'Beryl') + String(index).padStart(2, '0')}`,
    nationality: 'Fixture Nation', club: 'Fixture Club', market_value_usd: 1_000_000 + index },
})));
const raw = {
  version: 1, unitClock: '2026-11-06T12:00:00Z',
  scope: 'Actual AlphabetSprint Page, alphabetSprint library, fetchSprintPool/fetchAllRows, row mapping, playable letters, draws, guess resolver and scoring. Fifty expressly fictional transport rows only. Library spies pass through without replacement behavior. Peripheral UI and completion boundary are mocked. Fake Date, interval delivery, RNG and localStorage are unit instrumentation only; no native, provider, real-player or backend-write claim.',
  fixtureRows: FIXTURE.map(value => value.row),
  cases: {} as Record<string, { title: string; frames: unknown[] }>,
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let view: RenderResult | null = null, activeCase: Key | null = null, closed = false;
let drawTap: Tap, resolveTap: Tap, pointsTap: Tap, clearTap: Tap, storageTap: Tap;
const flush = async () => { await act(async () => {}); };
const store = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const resultOf = (tap: Tap, index: number) => {
  const result = tap.mock.results[index];
  return result?.type === 'return' ? result.value ?? null : { type: result?.type ?? 'pending', error: String(result?.value ?? '') };
};
function drawCalls() {
  return drawTap.mock.calls.map((args, index) => ({
    pool: (args[0] as sprint.SprintPlayer[]).map(player => ({ ...player })),
    used: [...args[1] as Set<string>], playable: [...args[2] as Set<string>], lastLetter: args[3], result: resultOf(drawTap, index),
  }));
}
function usedAtLastDraw() {
  const args = drawTap.mock.calls[drawTap.mock.calls.length - 1];
  return args ? [...args[1] as Set<string>].sort() : [];
}
function input() { return within(view!.container).getByRole('textbox', { name: "Type a player's full name or surname" }) as HTMLInputElement; }
function letter() { return input().parentElement!.parentElement!.querySelector('.text-7xl')!.textContent!.trim(); }
function capture(label: string) {
  if (!activeCase) throw Error('Alphabet fixture has no active case');
  const main = view?.container.querySelector('main#dukb-main') ?? null;
  const box = main?.querySelector<HTMLInputElement>('input[aria-label="Type a player\'s full name or surname"]') ?? null;
  const replay = main ? [...main.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Run it back') : null;
  const phase = !main ? 'unmounted' : box ? 'running' : replay ? 'done' : [...main.querySelectorAll('button')].some(button => /^Start \d+s run$/.test(button.textContent?.trim() || '')) ? 'idle' : 'boot-or-error';
  const panel = box?.parentElement?.parentElement ?? replay?.parentElement?.parentElement ?? null;
  const top = box ? panel?.firstElementChild : null;
  const scoreNode = top?.children[2] ?? null;
  const heading = phase === 'done' ? panel?.querySelector('h2')?.textContent?.trim() ?? null : null;
  const namedNames = phase === 'done' ? [...panel!.querySelectorAll('span.rounded-full')].map(node => node.textContent!.trim()) : [];
  const namedCountText = box ? [...panel!.querySelectorAll('span')].map(node => node.textContent?.trim() || '').find(text => /^\d+ named$/.test(text)) : null;
  const active = document.activeElement as HTMLElement | null;
  const value = clone({
    label, clock: { now: Date.now(), iso: new Date().toISOString(), operations: io.clock, timers: vi.getTimerCount(), intervals: io.intervals, clears: clearTap.mock.calls },
    page: { phase, score: box ? Number(scoreNode?.firstChild?.textContent ?? '') : heading ? Number(/(\d+) pts/.exec(heading)?.[1] ?? NaN) : null,
      namedCount: box ? Number(namedCountText?.split(' ')[0] ?? NaN) : phase === 'done' ? namedNames.length : null,
      namedNames, seconds: box ? Number(top?.children[0].textContent?.trim().replace(/s$/, '')) : null,
      streak: box ? Number(top?.children[1].querySelector('span')?.textContent) : null,
      lastGain: box ? scoreNode?.querySelector('span')?.textContent?.trim() ?? null : null,
      letter: box ? panel?.querySelector('.text-7xl')?.textContent?.trim() ?? null : null,
      input: box?.value ?? null, inputDisabled: box?.disabled ?? null,
      submitDisabled: box ? [...panel!.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Submit')?.disabled ?? null : null,
      feedback: box ? [...panel!.querySelectorAll('p')].map(node => node.textContent?.trim()).filter(Boolean) : [],
      resultHeading: heading, shareLine: phase === 'done' ? panel?.querySelector('pre')?.textContent ?? null : null,
      buttons: main ? [...main.querySelectorAll('button')].map(button => ({ text: button.textContent?.trim(), disabled: button.disabled })) : [],
      html: view?.container.innerHTML ?? null, text: main?.textContent ?? null },
    focus: { tag: active?.tagName ?? null, id: active?.id ?? null, role: active?.getAttribute('role') ?? null,
      label: active?.getAttribute('aria-label') ?? null, value: active instanceof HTMLInputElement ? active.value : null, inputIsActive: !!box && box === active },
    storage: store(), storageWrites: storageTap.mock.calls, draws: io.draws, usedAtLastDraw: usedAtLastDraw(),
    library: { draws: drawCalls(), resolutions: resolveTap.mock.calls.map((args, index) => ({ letter: args[1], input: args[2], used: [...args[3] as Set<string>], result: resultOf(resolveTap, index) })),
      points: pointsTap.mock.calls.map((args, index) => ({ streak: args[0], result: resultOf(pointsTap, index) })) },
    transport: io.transport, unknownTransport: io.unknownTransport, completions: io.completion.mock.calls,
  });
  (raw.cases[activeCase] ??= { title: TITLES[activeCase], frames: [] }).frames.push(value);
  return value;
}
async function mountPage() { view = render(<AlphabetSprint />); await flush(); }
async function start(mode: 'relaxed' | 'classic' | 'insane') {
  const [name, seconds] = mode === 'relaxed' ? ['Relaxed', 75] : mode === 'insane' ? ['Insane', 20] : ['Classic', 45];
  fireEvent.click(within(view!.container).getByRole('button', { name: new RegExp('^' + name + '\\b') }));
  fireEvent.click(within(view!.container).getByRole('button', { name: 'Start ' + seconds + 's run' })); await flush();
}
async function type(value: string) { fireEvent.change(input(), { target: { value } }); await flush(); }
async function submit(value: string, enter = false) {
  await type(value);
  if (enter) fireEvent.keyDown(input(), { key: 'Enter', code: 'Enter' });
  else fireEvent.click(within(view!.container).getByRole('button', { name: 'Submit' }));
  await flush();
}
function availableName() {
  const used = new Set(usedAtLastDraw()), current = letter();
  const value = FIXTURE.find(candidate => candidate.letter === current && !used.has(candidate.row.player_name));
  if (!value) throw Error('No fictional unused name on public letter ' + current);
  return value.row.player_name;
}
async function earnFive() { for (let index = 0; index < 5; index++) await submit(availableName(), index % 2 === 0); }
const fired = () => io.intervals.reduce((count, interval) => count + interval.firedAt.length, 0);
function jumpTo(offset: number) {
  const before = Date.now(), callbacks = fired(); vi.setSystemTime(BASE + offset);
  io.clock.push({ kind: 'setSystemTime-without-delivery', before, after: Date.now(), callbacksBefore: callbacks, callbacksAfter: fired() });
}
async function deliver(milliseconds: number) {
  const before = Date.now(), callbacks = fired();
  await act(async () => { vi.advanceTimersByTime(milliseconds); }); await flush();
  io.clock.push({ kind: 'advanceTimersByTime', milliseconds, before, after: Date.now(), callbacksBefore: callbacks, callbacksAfter: fired() });
}
async function closeCase() {
  await flush(); capture('teardown-before'); cleanup(); await flush(); view = null; capture('teardown-after'); closed = true;
}
function bestOf(frame: ReturnType<typeof capture>) { return JSON.parse(frame.storage[BEST_KEY] || '{}'); }

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); localStorage.setItem('alphabet-unrelated', 'held');
  localStorage.setItem(BEST_KEY, JSON.stringify({ relaxed: 2, classic: 2, insane: 2 }));
  vi.useFakeTimers(); vi.setSystemTime(BASE); view = null; activeCase = null; closed = false;
  io.rows = FIXTURE.map(value => ({ ...value.row })).sort((a, b) => a.player_name.localeCompare(b.player_name));
  io.transport = []; io.unknownTransport = []; io.draws = []; io.intervals = []; io.clock = [];
  drawTap = vi.spyOn(sprint, 'drawLetter'); resolveTap = vi.spyOn(sprint, 'resolveSprintGuess'); pointsTap = vi.spyOn(sprint, 'pointsFor');
  clearTap = vi.spyOn(window, 'clearInterval'); storageTap = vi.spyOn(Storage.prototype, 'setItem');
  const schedule = window.setInterval.bind(window);
  vi.spyOn(window, 'setInterval').mockImplementation((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (typeof handler !== 'function') throw Error('Unexpected non-function interval in Alphabet fixture');
    const interval = { id: 0, delay: delay ?? 0, registeredAt: Date.now(), firedAt: [] as number[] };
    const id = schedule(() => { interval.firedAt.push(Date.now()); handler(...args); }, delay);
    interval.id = Number(id); io.intervals.push(interval); return id;
  });
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
  vi.stubGlobal('fetch', vi.fn((...args: unknown[]) => { io.unknownTransport.push(args.map(String)); throw Error('Unexpected unbounded fetch in fictional Alphabet fixture'); }));
});
afterEach(async () => {
  if (activeCase && !closed) await closeCase();
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.ALPHABET_DEADLINE_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('ALPHABET_DEADLINE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Alphabet Sprint elapsed deadline ownership', () => {
  it(TITLES.ordinary, async () => {
    activeCase = 'ordinary'; await mountPage(); capture('ordinary-idle');
    await start('classic'); const started = capture('ordinary-start');
    await submit('Fixture impossible surname'); const miss = capture('ordinary-miss');
    await submit('Aster', true); const ambiguous = capture('ordinary-ambiguous');
    await submit('Fixture A00 Aster'); await submit('Fixture B00 Bramble', true);
    await submit('Fixture A00 Aster'); const duplicate = capture('ordinary-used-name-miss');
    await submit('Fixture A01 Aster', true); await submit('Bramble'); await submit('Fixture A02 Amber02', true);
    const earned = capture('ordinary-earned-five');
    await type('Fixture unfinished draft'); fireEvent.click(within(view!.container).getByRole('button', { name: 'Skip letter' })); await flush();
    const skipped = capture('ordinary-skip');
    await submit('Fixture A03 Amber03'); const resetPick = capture('ordinary-reset-streak-pick');
    await deliver(1000); const tick = capture('ordinary-one-second');
    await deliver(44000); const done = capture('ordinary-timeout');
    await deliver(5000); const stable = capture('ordinary-timeout-stable');
    fireEvent.click(within(view!.container).getByRole('button', { name: 'Change pace' })); await flush();
    const idle = capture('ordinary-return-to-pace'); await closeCase();

    expect([started.page.phase, started.page.seconds, started.page.score, started.page.namedCount, started.page.letter, started.focus.inputIsActive], TITLES.ordinary + ' genuine Classic start').toEqual(['running', 45, 0, 0, 'A', true]);
    expect([miss.page.score, miss.page.namedCount, miss.draws.length], TITLES.ordinary + ' a real miss keeps score names and draw order').toEqual([0, 0, 1]);
    expect(miss.page.feedback, TITLES.ordinary + ' current miss remains actionable').toEqual(['That doesn\'t match an unused "A" surname. Check the spelling or skip.']);
    expect(ambiguous.page.feedback, TITLES.ordinary + ' ambiguous surname asks for a full name').toEqual(['Which one? Type the full name.']);
    expect([ambiguous.page.score, ambiguous.page.namedCount, ambiguous.draws.length], TITLES.ordinary + ' ambiguity consumes nothing').toEqual([0, 0, 1]);
    expect(ambiguous.page.text, TITLES.ordinary + ' ambiguity does not list fictional answers').not.toContain('Fixture A00 Aster');
    expect([duplicate.page.score, duplicate.page.namedCount, duplicate.draws.length], TITLES.ordinary + ' used full name cannot score twice').toEqual([2, 2, 3]);
    expect([earned.page.score, earned.page.namedCount, earned.page.streak, earned.page.lastGain, earned.page.letter, earned.draws.length], TITLES.ordinary + ' five actual answers earn the fifth-pick bonus').toEqual([6, 5, 5, '+2', 'B', 6]);
    expect([skipped.page.score, skipped.page.namedCount, skipped.page.streak, skipped.page.lastGain, skipped.page.input, skipped.page.letter, skipped.draws.length], TITLES.ordinary + ' ordinary Skip spends one draw and resets only the live streak').toEqual([6, 5, 0, null, '', 'A', 7]);
    expect(skipped.usedAtLastDraw, TITLES.ordinary + ' Skip keeps all used names').toEqual(earned.usedAtLastDraw);
    expect([resetPick.page.score, resetPick.page.namedCount, resetPick.page.streak, resetPick.page.lastGain, resetPick.draws.length], TITLES.ordinary + ' next real pick starts a fresh streak').toEqual([7, 6, 1, '+1', 8]);
    expect([tick.page.seconds, tick.page.score, tick.focus.inputIsActive], TITLES.ordinary + ' normal countdown and focus remain').toEqual([44, 7, true]);
    expect([done.page.phase, done.page.score, done.page.namedCount], TITLES.ordinary + ' normal timeout closes the earned score').toEqual(['done', 7, 6]);
    expect(done.page.namedNames, TITLES.ordinary + ' result lists the actual six named players in order').toEqual(['Fixture A00 Aster', 'Fixture B00 Bramble', 'Fixture A01 Aster', 'Fixture B01 Bramble', 'Fixture A02 Amber02', 'Fixture A03 Amber03']);
    expect(bestOf(done), TITLES.ordinary + ' new best changes only Classic').toEqual({ relaxed: 2, classic: 7, insane: 2 });
    expect(done.completions, TITLES.ordinary + ' ordinary timeout records exactly one earned completion').toEqual([['/alphabet-sprint', 7, 'Fixture Manager']]);
    expect([stable.storage, stable.draws, stable.completions], TITLES.ordinary + ' settled run does not draw save or complete again').toEqual([done.storage, done.draws, done.completions]);
    expect([idle.page.phase, bestOf(idle), idle.completions], TITLES.ordinary + ' Change pace preserves earned best and completion').toEqual(['idle', { relaxed: 2, classic: 7, insane: 2 }, done.completions]);
    expect(done.storage['alphabet-unrelated'], TITLES.ordinary + ' unrelated save held').toBe('held');
  });

  it(TITLES.finish, async () => {
    activeCase = 'finish'; await mountPage(); capture('finish-idle');
    await start('insane'); const started = capture('finish-insane-start');
    for (let index = 0; index < 49; index++) await submit(availableName(), index % 2 === 0);
    const beforeLast = capture('finish-before-final-name');
    await submit(availableName(), true); const exhausted = capture('finish-pool-exhausted');
    await deliver(1000); const exhaustedStable = capture('finish-exhaustion-stable');
    fireEvent.click(within(view!.container).getByRole('button', { name: 'Run it back' })); await flush();
    const replay = capture('finish-same-pace-replay');
    await submit(availableName()); const replayEarned = capture('finish-replay-earned-one');
    await deliver(20000); const replayDone = capture('finish-replay-timeout');
    await deliver(5000); const replayStable = capture('finish-replay-stable');
    fireEvent.click(within(view!.container).getByRole('button', { name: 'Change pace' })); await flush();
    const idle = capture('finish-change-pace');
    await start('relaxed'); const relaxed = capture('finish-relaxed-start');
    await submit(availableName(), true); const relaxedEarned = capture('finish-relaxed-earned-one');
    await deliver(75000); const relaxedDone = capture('finish-relaxed-timeout');
    await deliver(5000); const relaxedStable = capture('finish-relaxed-stable'); await closeCase();

    expect([started.page.phase, started.page.seconds, started.page.score], TITLES.finish + ' real Insane mode starts at twenty').toEqual(['running', 20, 0]);
    expect([beforeLast.page.phase, beforeLast.page.seconds, beforeLast.page.score, beforeLast.page.namedCount], TITLES.finish + ' forty-nine real names leave one final answer').toEqual(['running', 20, 58, 49]);
    expect([exhausted.page.phase, exhausted.page.score, exhausted.page.namedCount, exhausted.draws.length], TITLES.finish + ' actual fifty-player exhaustion ends at sixty without a spare draw').toEqual(['done', 60, 50, 50]);
    expect([...exhausted.page.namedNames].sort(), TITLES.finish + ' every result name came through actual resolution').toEqual(FIXTURE.map(value => value.row.player_name).sort());
    expect(exhausted.usedAtLastDraw, TITLES.finish + ' actual exhausted draw sees all fifty used names').toEqual(FIXTURE.map(value => value.row.player_name).sort());
    expect(bestOf(exhausted), TITLES.finish + ' exhaustion saves only the selected pace best').toEqual({ relaxed: 2, classic: 2, insane: 60 });
    expect(exhausted.completions, TITLES.finish + ' exhaustion completes once at earned sixty').toEqual([['/alphabet-sprint', 60, 'Fixture Manager']]);
    expect([exhaustedStable.storage, exhaustedStable.draws, exhaustedStable.completions], TITLES.finish + ' exhaustion is settled once').toEqual([exhausted.storage, exhausted.draws, exhausted.completions]);
    expect([replay.page.phase, replay.page.seconds, replay.page.score, replay.page.namedCount, replay.page.streak, replay.page.input, replay.usedAtLastDraw, replay.draws.length], TITLES.finish + ' Run it back uses current Insane pace and fresh progress').toEqual(['running', 20, 0, 0, 0, '', [], 51]);
    expect([replayEarned.page.score, replayEarned.page.namedCount, replayEarned.page.streak], TITLES.finish + ' replay accepts a previously exhausted name again').toEqual([1, 1, 1]);
    expect([replayDone.page.phase, replayDone.page.score, replayDone.page.namedCount, bestOf(replayDone)], TITLES.finish + ' ordinary replay timeout preserves the higher best').toEqual(['done', 1, 1, { relaxed: 2, classic: 2, insane: 60 }]);
    expect(replayDone.completions, TITLES.finish + ' replay owns one additional completion').toEqual([['/alphabet-sprint', 60, 'Fixture Manager'], ['/alphabet-sprint', 1, 'Fixture Manager']]);
    expect([replayStable.storage, replayStable.draws, replayStable.completions], TITLES.finish + ' replay settlement is stable').toEqual([replayDone.storage, replayDone.draws, replayDone.completions]);
    expect([idle.page.phase, relaxed.page.phase, relaxed.page.seconds, relaxed.page.score, relaxed.page.namedCount], TITLES.finish + ' Change pace starts an independent Relaxed run').toEqual(['idle', 'running', 75, 0, 0]);
    expect([relaxedEarned.page.score, relaxedEarned.page.namedCount], TITLES.finish + ' Relaxed still accepts a real predeadline name').toEqual([1, 1]);
    expect([relaxedDone.page.phase, relaxedDone.page.score, bestOf(relaxedDone)], TITLES.finish + ' lower Relaxed score keeps each pace best').toEqual(['done', 1, { relaxed: 2, classic: 2, insane: 60 }]);
    expect(relaxedDone.completions, TITLES.finish + ' exactly three finished runs recorded').toEqual([['/alphabet-sprint', 60, 'Fixture Manager'], ['/alphabet-sprint', 1, 'Fixture Manager'], ['/alphabet-sprint', 1, 'Fixture Manager']]);
    expect([relaxedStable.storage, relaxedStable.draws, relaxedStable.completions], TITLES.finish + ' final result remains settled').toEqual([relaxedDone.storage, relaxedDone.draws, relaxedDone.completions]);
    expect(relaxedDone.storageWrites, TITLES.finish + ' only the earned exhaustion new best writes storage').toEqual([[BEST_KEY, JSON.stringify({ relaxed: 2, classic: 2, insane: 60 })]]);
  });

  it(TITLES.lateSubmit, async () => {
    activeCase = 'lateSubmit'; await mountPage(); capture('late-submit-idle');
    await start('insane'); capture('late-submit-start');
    await earnFive(); const earned = capture('late-submit-earned-five');
    await type(availableName()); capture('late-submit-prepared-input');
    jumpTo(20500); const suspended = capture('late-submit-clock-elapsed');
    fireEvent.click(within(view!.container).getByRole('button', { name: 'Submit' })); await flush();
    const attempted = capture('late-submit-attempt');
    await deliver(20000); const done = capture('late-submit-eventual-result');
    await deliver(5000); const stable = capture('late-submit-settled-stable'); await closeCase();

    expect([attempted.page.score, attempted.page.namedCount], TITLES.lateSubmit + ' late valid submission cannot add earned points or a name').toEqual([6, 5]);
    expect(attempted.usedAtLastDraw, TITLES.lateSubmit + ' late valid submission cannot add a used name').toEqual(earned.usedAtLastDraw);
    expect(attempted.draws, TITLES.lateSubmit + ' late valid submission cannot consume another actual draw').toEqual(earned.draws);
    expect([earned.page.score, earned.page.namedCount, earned.page.streak, suspended.page.seconds, suspended.clock.now], TITLES.lateSubmit + ' actual earned prefix and withheld timer delivery').toEqual([6, 5, 5, 20, BASE + 20500]);
    expect(suspended.clock.intervals.flatMap(interval => interval.firedAt), TITLES.lateSubmit + ' wall clock advances without firing the interval').toEqual([]);
    expect([done.page.phase, done.page.score, done.page.namedCount, bestOf(done)], TITLES.lateSubmit + ' eventual finish saves only the legitimate earned result').toEqual(['done', 6, 5, { relaxed: 2, classic: 2, insane: 6 }]);
    expect(done.completions, TITLES.lateSubmit + ' eventual completion excludes late points and records once').toEqual([['/alphabet-sprint', 6, 'Fixture Manager']]);
    expect([stable.storage, stable.draws, stable.completions], TITLES.lateSubmit + ' stale elapsed run cannot complete or save again').toEqual([done.storage, done.draws, done.completions]);
  });

  it(TITLES.lateSkip, async () => {
    activeCase = 'lateSkip'; await mountPage(); capture('late-skip-idle');
    await start('insane'); capture('late-skip-start');
    await earnFive(); const earned = capture('late-skip-earned-five');
    await type('Fixture unfinished draft'); const prepared = capture('late-skip-prepared-input');
    jumpTo(20500); capture('late-skip-clock-elapsed');
    fireEvent.click(within(view!.container).getByRole('button', { name: 'Skip letter' })); await flush();
    const attempted = capture('late-skip-attempt');
    await deliver(20000); const done = capture('late-skip-eventual-result');
    await deliver(5000); const stable = capture('late-skip-settled-stable'); await closeCase();

    expect(attempted.draws, TITLES.lateSkip + ' late Skip cannot consume a new actual letter draw').toEqual(earned.draws);
    expect([attempted.page.score, attempted.page.namedCount, attempted.usedAtLastDraw], TITLES.lateSkip + ' late Skip keeps earned points names and used players').toEqual([6, 5, earned.usedAtLastDraw]);
    if (attempted.page.phase === 'running') expect([attempted.page.streak, attempted.page.lastGain, attempted.page.input, attempted.page.letter], TITLES.lateSkip + ' an unchanged visible run keeps its live streak draft and target').toEqual([prepared.page.streak, prepared.page.lastGain, prepared.page.input, prepared.page.letter]);
    expect([done.page.phase, done.page.score, done.page.namedCount, bestOf(done)], TITLES.lateSkip + ' eventual finish retains the legitimate prefix').toEqual(['done', 6, 5, { relaxed: 2, classic: 2, insane: 6 }]);
    expect(done.completions, TITLES.lateSkip + ' delayed Skip does not invent a second run completion').toEqual([['/alphabet-sprint', 6, 'Fixture Manager']]);
    expect([stable.storage, stable.draws, stable.completions], TITLES.lateSkip + ' final saved result remains stable').toEqual([done.storage, done.draws, done.completions]);
  });

  it(TITLES.delayedTimeout, async () => {
    activeCase = 'delayedTimeout'; await mountPage(); capture('delayed-timeout-idle');
    await start('insane'); capture('delayed-timeout-start');
    await earnFive(); const earned = capture('delayed-timeout-earned-five');
    jumpTo(20500); const suspended = capture('delayed-timeout-clock-elapsed');
    await deliver(1000); const delivered = capture('delayed-timeout-one-callback');
    await deliver(19000); const done = capture('delayed-timeout-eventual-result');
    await deliver(5000); const stable = capture('delayed-timeout-settled-stable'); await closeCase();

    expect(delivered.page.phase, TITLES.delayedTimeout + ' one actually delivered callback after the deadline must finish the run').toBe('done');
    expect([suspended.clock.intervals.flatMap(interval => interval.firedAt).length, delivered.clock.intervals.flatMap(interval => interval.firedAt).length], TITLES.delayedTimeout + ' exactly one delayed real interval callback is delivered').toEqual([0, 1]);
    expect([delivered.page.score, delivered.page.namedCount, delivered.completions], TITLES.delayedTimeout + ' first overdue delivery records only the earned prefix once').toEqual([6, 5, [['/alphabet-sprint', 6, 'Fixture Manager']]]);
    expect([delivered.usedAtLastDraw, delivered.draws], TITLES.delayedTimeout + ' timer delivery cannot manufacture a name or draw').toEqual([earned.usedAtLastDraw, earned.draws]);
    expect([done.page.phase, done.page.score, bestOf(done), done.completions], TITLES.delayedTimeout + ' eventual result remains exactly the earned settlement').toEqual(['done', 6, { relaxed: 2, classic: 2, insane: 6 }, [['/alphabet-sprint', 6, 'Fixture Manager']]]);
    expect([stable.storage, stable.draws, stable.completions], TITLES.delayedTimeout + ' extra timer delivery cannot save or record again').toEqual([done.storage, done.draws, done.completions]);
  });

  it(TITLES.elapsedTick, async () => {
    activeCase = 'elapsedTick'; await mountPage(); capture('elapsed-tick-idle');
    await start('classic'); capture('elapsed-tick-start');
    await earnFive(); const earned = capture('elapsed-tick-earned-five');
    jumpTo(10000); const suspended = capture('elapsed-tick-clock-advanced');
    await deliver(1000); const delivered = capture('elapsed-tick-one-callback');
    await deliver(34000); const atDeadline = capture('elapsed-tick-declared-deadline');
    await deliver(10000); const done = capture('elapsed-tick-eventual-result');
    await deliver(5000); const stable = capture('elapsed-tick-settled-stable'); await closeCase();

    expect(delivered.page.seconds, TITLES.elapsedTick + ' eleven elapsed seconds leave thirty-four of the forty-five second run').toBe(34);
    expect([suspended.clock.now, delivered.clock.now, suspended.clock.intervals.flatMap(interval => interval.firedAt).length, delivered.clock.intervals.flatMap(interval => interval.firedAt).length], TITLES.elapsedTick + ' actual unit wall clock and single delayed callback are explicit').toEqual([BASE + 10000, BASE + 11000, 0, 1]);
    expect([delivered.page.phase, delivered.page.score, delivered.page.namedCount, delivered.usedAtLastDraw, delivered.draws], TITLES.elapsedTick + ' elapsed countdown does not touch earned progress or draw order').toEqual(['running', 6, 5, earned.usedAtLastDraw, earned.draws]);
    expect([atDeadline.page.phase, atDeadline.page.score, atDeadline.completions], TITLES.elapsedTick + ' nominal elapsed deadline closes exactly once').toEqual(['done', 6, [['/alphabet-sprint', 6, 'Fixture Manager']]]);
    expect([done.page.phase, done.page.score, bestOf(done), done.completions], TITLES.elapsedTick + ' eventual Classic result retains only earned six').toEqual(['done', 6, { relaxed: 2, classic: 6, insane: 2 }, [['/alphabet-sprint', 6, 'Fixture Manager']]]);
    expect([stable.storage, stable.draws, stable.completions], TITLES.elapsedTick + ' settled elapsed result stays stable').toEqual([done.storage, done.draws, done.completions]);
  });
});
