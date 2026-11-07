import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import MissingXi from '@/pages/MissingXi';
import { normalizeName } from '@/lib/playerSearch';
import type { ActivePuzzle } from '@/lib/missingXi';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const io = vi.hoisted(() => ({
  rng: [] as any[], selectors: [] as any[], transport: [] as any[], unexpected: [] as any[],
  storageOps: [] as any[], completions: [] as any[], renders: [] as any[], results: [] as any[],
  actions: [] as any[], daily: null as any, pending: 0,
}));
vi.mock('@/lib/missingXi', async original => {
  const actual = await original<typeof import('@/lib/missingXi')>();
  const copy = (value: unknown) => JSON.parse(JSON.stringify(value));
  const observe = (kind: string, fn: (...args: any[]) => ActivePuzzle, args: any[]) => {
    const rngStart = io.rng.length;
    const value = fn(...args);
    io.selectors.push({ kind, at: Date.now(), args: copy(args), result: copy(value), rngStart, rngEnd: io.rng.length });
    return value;
  };
  return { ...actual,
    pickDailyPuzzle: (...args: Parameters<typeof actual.pickDailyPuzzle>) => observe('daily', actual.pickDailyPuzzle, args),
    pickUnlimitedPuzzle: (...args: Parameters<typeof actual.pickUnlimitedPuzzle>) => observe('unlimited', actual.pickUnlimitedPuzzle, args),
  };
});
vi.mock('@/hooks/useDailyPuzzle', async original => {
  const actual = await original<typeof import('@/hooks/useDailyPuzzle')>();
  return { ...actual, useDailyPuzzle: (options: any) => {
    const value = actual.useDailyPuzzle(options);
    io.daily = JSON.parse(JSON.stringify({
      puzzle: value.puzzle, guesses: value.guesses, gameStatus: value.gameStatus,
      isLoading: value.isLoading, todayStr: value.todayStr, puzzleIndex: value.puzzleIndex,
      functions: ['addGuess', 'takeNewerSave', 'getCurrentProgress', 'reset'],
    }));
    io.renders.push({ at: Date.now(), daily: JSON.parse(JSON.stringify(io.daily)) });
    return value;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    const steps: any[] = [];
    const refuse = (reason: string) => { io.unexpected.push({ table, steps: [...steps], reason, at: Date.now() }); throw Error(reason); };
    if (table !== 'player_market_values') return refuse('Unexpected Missing XI transport table: ' + table);
    const query: any = {
      then: (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
        const expectedSelect = 'player_name, market_value_usd, year, club, nationality, position, age, person_key';
        const names = steps.map(step => step.method);
        const direct = names.join(',') === 'select,ilike,order,order,order,limit,abortSignal';
        const pool = names.join(',') === 'select,order,order,order,limit,abortSignal';
        if (!direct && !pool) return refuse('Unexpected player search method sequence');
        if (steps[0].args[0] !== expectedSelect) return refuse('Unexpected player search projection');
        const orderStart = direct ? 2 : 1;
        const wanted = [['market_value_usd', { ascending: false }], ['year', { ascending: false }], ['player_name', { ascending: true }]];
        if (JSON.stringify(steps.slice(orderStart, orderStart + 3).map(step => step.args)) !== JSON.stringify(wanted)) return refuse('Unexpected player search order');
        if (steps[orderStart + 3].args[0] !== (direct ? 200 : 1000)) return refuse('Unexpected player search limit');
        if (direct && (steps[1].args[0] !== 'name_folded' || typeof steps[1].args[1] !== 'string' || !/^%.+%$/.test(steps[1].args[1]))) return refuse('Unexpected folded search predicate');
        const signal = steps[steps.length - 1].signal as AbortSignal;
        const response = { data: [], error: null };
        const entry = { at: Date.now(), table, steps: steps.map(({ method, args }) => ({ method, args })), signalAbortedAtStart: signal.aborted, settledAt: null as number | null, signalAbortedAtEnd: null as boolean | null, signalEvents: [] as any[], response };
        signal.addEventListener('abort', () => entry.signalEvents.push({ at: Date.now(), type: 'abort' }), { once: true });
        io.transport.push(entry); io.pending += 1;
        return Promise.resolve(response).then(value => {
          entry.settledAt = Date.now(); entry.signalAbortedAtEnd = signal.aborted; io.pending -= 1;
          return yes(value);
        }, no);
      },
    };
    for (const method of ['select', 'ilike', 'order', 'limit', 'abortSignal']) query[method] = (...args: any[]) => {
      steps.push(method === 'abortSignal' ? { method, args: [{ abortSignal: true, aborted: args[0].aborted }], signal: args[0] } : { method, args: JSON.parse(JSON.stringify(args)) });
      return query;
    };
    for (const method of ['insert', 'upsert', 'update', 'delete', 'rpc']) query[method] = () => refuse('No backend mutation authorized');
    return query;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('@/lib/completions', () => ({
  recordCompletion: (...args: unknown[]) => { io.completions.push({ at: Date.now(), args }); return Promise.resolve(); },
  getCurrentPlayerName: () => 'Fixture Unit Player',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra, title, subtitle }: { children: ReactNode; headerExtra: ReactNode; title: string; subtitle: string }) =>
    <main><h1>{title}</h1><p>{subtitle}</p>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/ResultScreen', () => ({
  ResultScreen: (props: any) => {
    io.results.push({
      at: Date.now(), won: props.won, outcomeEmoji: props.outcomeEmoji, headline: props.headline,
      statRow: props.statRow, emojiGrid: props.emojiGrid, share: props.share,
      playAgainLabel: props.playAgainLabel, onPlayAgainCallable: typeof props.onPlayAgain === 'function',
    });
    return <section role="status"><h2>{props.headline}</h2><div>{props.statLine}</div>
      <dl>{props.statRow.map((row: any) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
      <pre>{props.emojiGrid}</pre><button onClick={props.onPlayAgain}>{props.playAgainLabel}</button>{props.playNext}</section>;
  },
}));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const last = <T,>(rows: T[]): T | undefined => rows[rows.length - 1];
const cases: any[] = [];
let current: any;
let mounted: RenderResult | null = null;
let nativeGetItem: (key: string) => string | null;
const fixedTime = new Date('2026-11-06T17:00:00.000Z');
const stored = (area: Storage = localStorage) => Object.fromEntries(Object.keys(area).sort().map(key => [key, nativeGetItem.call(area, key)]));
const find = (name: string) => mounted ? within(mounted.container).queryByRole('button', { name }) as HTMLButtonElement | null : null;
const actualPuzzle = (mode: string): ActivePuzzle | null => last(io.selectors.filter(row => row.kind === mode))?.result ?? null;
async function settle(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); for (let i = 0; i < 6; i++) await Promise.resolve(); });
}
function page() {
  const container = mounted?.container ?? null, buttons = container ? [...container.querySelectorAll<HTMLButtonElement>('button')] : [];
  const daily = find('📅 Daily'), unlimited = find('∞ Unlimited');
  const mode = daily?.classList.contains('bg-background') ? 'daily' : unlimited?.classList.contains('bg-background') ? 'unlimited' : null;
  const input = container?.querySelector<HTMLInputElement>('input[role="combobox"]') ?? null;
  const result = container?.querySelector<HTMLElement>('section[role="status"]') ?? null;
  return {
    html: container?.innerHTML ?? null, bodyHTML: document.body.innerHTML, text: container?.textContent ?? null,
    mode, phase: result ? 'revealed' : find('Lock in guess') ? 'playing' : 'unmounted-or-loading',
    puzzle: mode ? actualPuzzle(mode) : null,
    controls: Object.fromEntries(['📅 Daily', '∞ Unlimited', 'Give up', 'Yes, reveal it', 'Keep playing', 'Lock in guess', 'Play Unlimited', 'New Lineup'].map(name => {
      const button = buttons.find(row => row.textContent?.trim() === name);
      return [name, { present: !!button, disabled: button?.disabled ?? null, html: button?.outerHTML ?? null }];
    })),
    input: input ? { value: input.value, disabled: input.disabled, expanded: input.getAttribute('aria-expanded'), controls: input.getAttribute('aria-controls'), html: input.outerHTML } : null,
    options: container ? [...container.querySelectorAll('[role="option"]')].map(row => ({ text: row.textContent, html: row.outerHTML })) : [],
    messages: container ? [...container.querySelectorAll('p, span')].map(row => row.textContent).filter(text => text?.startsWith('Already tried:') || text?.startsWith('Guess ') || text?.includes('You already tried that name.') || text?.startsWith('💡')) : [],
    result: result ? { html: result.outerHTML, text: result.textContent, props: last(io.results) ?? null } : null,
  };
}
function capture(label: string) {
  const value = copy({
    label, at: Date.now(), clock: { now: Date.now(), fakeTimers: vi.getTimerCount() }, page: page(),
    daily: io.daily, storage: stored(), sessionStorage: stored(sessionStorage), storageOps: io.storageOps, globalRNG: io.rng,
    selectors: io.selectors, transport: io.transport, unexpectedTransport: io.unexpected, pendingResponses: io.pending,
    completions: io.completions, renders: io.renders, results: io.results, actions: io.actions,
    focus: { tag: document.activeElement?.tagName ?? null, text: document.activeElement?.textContent ?? null, html: document.activeElement?.outerHTML ?? null },
  });
  current.frames.push(value); return value;
}
async function click(name: string) {
  const button = find(name);
  io.actions.push({ kind: 'click', at: Date.now(), name, available: !!button, disabled: button?.disabled ?? null });
  if (!button || button.disabled) throw Error('Unavailable public Missing XI button: ' + name);
  await act(async () => { fireEvent.click(button); }); await settle();
}
async function oldYes() {
  const button = find('Yes, reveal it');
  io.actions.push({ kind: 'old-confirmation-opportunity', at: Date.now(), name: 'Yes, reveal it', available: !!button, disabled: button?.disabled ?? null });
  if (button) { await act(async () => { fireEvent.click(button); }); await settle(); }
}
async function mount(prefix = '') {
  mounted = render(<HelmetProvider><MemoryRouter initialEntries={['/missing-xi']}><MissingXi /></MemoryRouter></HelmetProvider>);
  await settle(); capture(prefix + 'mounted-help');
  const letsPlay = within(document.body).queryByRole('button', { name: "Let's Play!" });
  io.actions.push({ kind: 'help-dismiss', at: Date.now(), name: "Let's Play!", available: !!letsPlay });
  if (letsPlay) { await act(async () => { fireEvent.click(letsPlay); }); await settle(); }
  capture(prefix + 'ready');
}
async function select(name: string, label: string) {
  const input = mounted?.container.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) throw Error('No actual Missing XI combobox');
  io.actions.push({ kind: 'type', at: Date.now(), name });
  await act(async () => { input.focus(); fireEvent.change(input, { target: { value: name } }); });
  await settle(201); capture(label + '-searched');
  const options = [...mounted!.container.querySelectorAll<HTMLButtonElement>('button[role="option"]')];
  const option = options.find(row => normalizeName(row.textContent) === normalizeName(name));
  const selectedName = option?.textContent?.trim() ?? null;
  io.actions.push({ kind: 'select-option', at: Date.now(), name: selectedName, requestedName: name, available: !!option, html: option?.outerHTML ?? null });
  if (!option) throw Error('No actual local roster option: ' + name);
  await act(async () => { fireEvent.pointerDown(option); }); await settle(); capture(label + '-picked'); return selectedName!;
}
function wrongName(puzzle: ActivePuzzle) {
  const rejected = new Set([puzzle.candidate.name, ...(puzzle.candidate.aliases ?? [])].map(normalizeName));
  const name = puzzle.lineup.slots.find(slot => !rejected.has(normalizeName(slot.name)))?.name;
  if (!name) throw Error('No distinct held roster player for actual miss');
  return name;
}
async function miss(label: string) {
  const puzzle = page().puzzle; if (!puzzle) throw Error('No actual dealt puzzle');
  const name = wrongName(puzzle);
  const selectedName = await select(name, label); await click('Lock in guess'); capture(label + '-missed'); return selectedName;
}
async function win(label: string) {
  const puzzle = page().puzzle; if (!puzzle) throw Error('No actual dealt puzzle');
  await select(puzzle.candidate.name, label); await click('Lock in guess'); return capture(label + '-won');
}
async function closeCase() {
  await settle(); capture('before-teardown');
  mounted?.unmount(); mounted = null; await settle(); capture('after-teardown');
  current.closed = true;
}
const observation = (frame: any) => ({
  page: frame.page, daily: frame.daily, storage: frame.storage, sessionStorage: frame.sessionStorage,
  globalRNG: frame.globalRNG, selectors: frame.selectors, transport: frame.transport,
  unexpectedTransport: frame.unexpectedTransport, pendingResponses: frame.pendingResponses,
  completions: frame.completions, results: frame.results,
});
beforeEach(() => {
  cleanup(); mounted = null; localStorage.clear(); sessionStorage.clear(); localStorage.setItem('missing-xi-unrelated', 'held');
  consumeRestoredFinish('missing-xi');
  for (const key of ['rng', 'selectors', 'transport', 'unexpected', 'storageOps', 'completions', 'renders', 'results', 'actions'] as const) io[key].length = 0;
  io.daily = null; io.pending = 0;
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(fixedTime);
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = 0.3141592653589793;
    io.rng.push({ index: io.rng.length, at: Date.now(), value }); return value;
  });
  nativeGetItem = Storage.prototype.getItem;
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
    const original = Storage.prototype[method] as (...args: any[]) => any;
    vi.spyOn(Storage.prototype, method).mockImplementation(function (this: Storage, ...args: any[]) {
      const result = original.apply(this, args);
      io.storageOps.push({ at: Date.now(), area: this === localStorage ? 'local' : this === sessionStorage ? 'session' : 'other', method, args, result: result === undefined ? { undefined: true } : result });
      return result;
    } as any);
  }
});
afterEach(async () => {
  if (current && !current.closed) { await settle(); capture('interrupted-before-teardown'); mounted?.unmount(); mounted = null; await settle(); capture('interrupted-after-teardown'); }
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); current = null;
});
afterAll(() => {
  const output = process.env.MISSING_XI_CONFIRMATION_RAW;
  if (!output) return;
  if (!isAbsolute(output)) throw Error('MISSING_XI_CONFIRMATION_RAW must be absolute');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({
    version: 1, scope: 'Missing XI public confirmation ownership, actual curated selectors and unit clock only',
    limits: ['No native input/geometry or backend-write credit.', 'Full public Page HTML and actual daily/selector observations, private Unlimited action state is not exported.', 'Global RNG is complete, actual selector ranges are separate. No lineup/data override.', 'Prior lineup-view test has no RAW writer and remains report-only.'],
    cases,
  }));
});
function begin(key: string, title: string) { current = { key, title, frames: [], closed: false }; cases.push(current); capture('before-mount'); }

describe('Missing XI round-owned give-up confirmation', () => {

  it('preserves current-round cancel same-mode progress and a genuine Daily finish across restore', async () => {
    begin('currentRound', 'preserves current-round cancel same-mode progress and a genuine Daily finish across restore');
    await mount();
    const wrong = await miss('daily-first');
    const missed = last<any>(current.frames);
    await select(wrong, 'daily-duplicate'); await click('Lock in guess');
    const duplicate = capture('duplicate-rejected');
    await click('Give up'); const armed = capture('current-daily-armed');
    await click('📅 Daily'); const same = capture('same-mode-still-armed');
    await click('Keep playing'); const kept = capture('current-round-kept');
    const won = await win('daily-second');
    await click('📅 Daily'); const sameFinish = capture('same-mode-finished');
    mounted!.unmount(); mounted = null; await settle(); capture('finished-unmounted');
    await mount('restored-'); const restored = last<any>(current.frames);
    await closeCase();

    expect([won.daily.gameStatus, won.page.result?.props.statRow, won.completions.map((row: any) => row.args)],
      'MX_CONFIRM_CURRENT_ROUND_PRESERVED').toEqual(['won', [{ label: 'Score', value: 70 }], [['/missing-xi', 70, 'Fixture Unit Player', 1]]]);
    expect(missed.daily.guesses).toEqual([{ t: 'miss', name: wrong }]);
    expect(duplicate.daily.guesses).toEqual(missed.daily.guesses);
    expect(duplicate.page.messages).toContain('You already tried that name.');
    expect(duplicate.page.input.value).toBe(wrong);
    expect(duplicate.page.controls['Lock in guess'].disabled).toBe(false);
    expect(armed.page.controls['Yes, reveal it'].present).toBe(true);
    expect(same.page.controls['Yes, reveal it'].present).toBe(true);
    expect(observation(same)).toEqual(observation(armed));
    expect(observation(kept)).toEqual(observation(duplicate));
    expect(won.daily.guesses).toEqual([{ t: 'miss', name: wrong }, { t: 'won' }]);
    expect(won.page.result.props.emojiGrid.split('\n').slice(1)).toEqual(['🟥🟩⬜', 'Solved in 2/3']);
    expect(sameFinish.storage).toEqual(won.storage);
    expect(restored.storage).toEqual(won.storage);
    expect(restored.page.result).toEqual(sameFinish.page.result);
    expect(restored.completions).toEqual(won.completions);
    expect(restored.daily.guesses).toEqual(won.daily.guesses);
    expect(restored.selectors.filter((row: any) => row.kind === 'unlimited')).toHaveLength(0);
    expect(restored.unexpectedTransport).toEqual([]);
    expect(restored.pendingResponses).toBe(0);
  });

  it('preserves ordinary same-round confirmations scoring and fresh Unlimited lineups', async () => {
    begin('normalConfirmation', 'preserves ordinary same-round confirmations scoring and fresh Unlimited lineups');
    await mount();
    await click('Give up'); capture('daily-ordinary-armed');
    await click('Yes, reveal it'); const dailyLost = capture('daily-ordinary-lost');
    await click('Play Unlimited'); const firstUnlimited = capture('ordinary-unlimited-start');
    const unlimitedWon = await win('unlimited-first');
    await click('New Lineup'); const next = capture('ordinary-new-lineup');
    const wrong = await miss('unlimited-first-miss');
    await click('Give up'); capture('unlimited-ordinary-armed');
    await click('Yes, reveal it'); const unlimitedLost = capture('unlimited-ordinary-lost');
    await click('📅 Daily'); const returned = capture('ordinary-finished-daily-return');
    await closeCase();

    expect([dailyLost.daily.gameStatus, dailyLost.page.result?.props.statRow, unlimitedWon.page.result?.props.statRow, unlimitedLost.page.result?.props.statRow],
      'MX_CONFIRM_NORMAL_CONFIRMATIONS_PRESERVED').toEqual(['lost', [{ label: 'Score', value: 0 }], [{ label: 'Score', value: 100 }], [{ label: 'Score', value: 0 }]]);
    expect(dailyLost.daily.guesses).toEqual([{ t: 'give' }]);
    expect(dailyLost.completions.map((row: any) => row.args)).toEqual([['/missing-xi', 0, 'Fixture Unit Player', 0]]);
    expect(firstUnlimited.page.mode).toBe('unlimited');
    expect(firstUnlimited.page.phase).toBe('playing');
    expect(unlimitedWon.page.result.props.won).toBe(true);
    expect(unlimitedWon.page.result.props.emojiGrid.split('\n').slice(1)).toEqual(['🟩⬜⬜', 'Solved in 1/3']);
    expect(next.page.mode).toBe('unlimited'); expect(next.page.phase).toBe('playing');
    expect(next.page.messages).toContain('Guess 1 of 3');
    expect(next.selectors.filter((row: any) => row.kind === 'unlimited')).toHaveLength(2);
    for (const draw of next.selectors.filter((row: any) => row.kind === 'unlimited')) expect(draw.rngEnd - draw.rngStart).toBe(2);
    expect(unlimitedLost.page.result.props.won).toBe(false);
    expect(unlimitedLost.page.result.props.emojiGrid.split('\n').slice(1)).toEqual(['🟥⬜⬜', 'Missed it']);
    expect(unlimitedLost.page.result.text).toContain('The missing player was ' + next.page.puzzle.candidate.name);
    expect(wrong).not.toBe(next.page.puzzle.candidate.name);
    expect(unlimitedLost.storage).toEqual(dailyLost.storage);
    expect(unlimitedLost.completions).toEqual(dailyLost.completions);
    expect(returned.storage).toEqual(dailyLost.storage);
    expect(returned.page.result?.html).toEqual(dailyLost.page.result?.html);
    expect(returned.completions).toEqual(dailyLost.completions);
    expect(returned.unexpectedTransport).toEqual([]); expect(returned.pendingResponses).toBe(0);
  });

  it('keeps an old Daily confirmation from ending the newly entered Unlimited round', async () => {
    begin('dailyToUnlimited', 'keeps an old Daily confirmation from ending the newly entered Unlimited round');
    await mount();
    const wrong = await miss('daily-progress');
    const earnedProgress = last<any>(current.frames);
    await click('Give up'); const armed = capture('old-daily-armed');
    await click('∞ Unlimited'); const entered = capture('new-unlimited-current');
    await oldYes(); const after = capture('old-daily-confirmation-opportunity');
    await closeCase();

    expect(after.page.phase, 'MX_CONFIRM_DAILY_TO_UNLIMITED').toBe('playing');
    expect(after.page.mode).toBe('unlimited');
    expect(after.page.controls['Give up'].present).toBe(true);
    expect(after.page.controls['Yes, reveal it'].present).toBe(false);
    expect(armed.page.controls['Yes, reveal it'].present).toBe(true);
    expect(entered.page.mode).toBe('unlimited');
    expect(entered.selectors.filter((row: any) => row.kind === 'unlimited')).toHaveLength(1);
    expect(after.daily.guesses).toEqual([{ t: 'miss', name: wrong }]);
    expect(after.daily.gameStatus).toBe('playing');
    expect(after.storage).toEqual(earnedProgress.storage);
    expect(after.completions).toEqual([]);
    expect(after.page.result).toBeNull();
    expect(after.unexpectedTransport).toEqual([]); expect(after.pendingResponses).toBe(0);
  });

  it('keeps an old Unlimited confirmation from prematurely losing the unfinished Daily', async () => {
    begin('unlimitedToDaily', 'keeps an old Unlimited confirmation from prematurely losing the unfinished Daily');
    await mount();
    const wrong = await miss('daily-progress');
    const progress = last<any>(current.frames);
    await click('∞ Unlimited'); capture('unlimited-current');
    await click('Give up'); const armed = capture('old-unlimited-armed');
    await click('📅 Daily'); const returned = capture('unfinished-daily-current');
    await oldYes(); const after = capture('old-unlimited-confirmation-opportunity');
    await closeCase();

    expect(after.daily.gameStatus, 'MX_CONFIRM_UNLIMITED_TO_DAILY').toBe('playing');
    expect(after.page.mode).toBe('daily'); expect(after.page.phase).toBe('playing');
    expect(after.daily.guesses).toEqual([{ t: 'miss', name: wrong }]);
    expect(after.storage).toEqual(progress.storage);
    expect(after.completions).toEqual([]);
    expect(after.page.result).toBeNull();
    expect(armed.page.controls['Yes, reveal it'].present).toBe(true);
    expect(returned.daily.guesses).toEqual(progress.daily.guesses);
    expect(returned.page.puzzle).toEqual(progress.page.puzzle);
    expect(after.page.controls['Give up'].present).toBe(true);
    expect(after.page.controls['Yes, reveal it'].present).toBe(false);
    expect(after.unexpectedTransport).toEqual([]); expect(after.pendingResponses).toBe(0);
  });
});
