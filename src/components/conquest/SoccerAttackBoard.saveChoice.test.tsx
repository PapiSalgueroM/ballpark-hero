/** Round 540: real Soccer Attack save choices with queued browser-lock fixtures.
 * Generated maps, engine transitions, save parsing and Board actions stay real.
 * Only local jsdom storage, lock scheduling and a quota refusal are controlled.
 */
import assert from 'node:assert/strict';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, it, vi } from 'vitest';
import SoccerAttackBoard from '@/components/conquest/SoccerAttackBoard';
import { makeSoccerAttackSetup } from '@/data/soccerAttack';
import { advanceAttack, createAttack, parseAttackSave } from '@/lib/conquestAttack';
import { ATTACK_SAVE_KEY } from '@/lib/conquestAttackSave';

const boundary = vi.hoisted(() => ({ faults: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  boundary.faults.push('backend'); throw new Error('Unexpected Attack save-choice backend access');
} }) }));
const contexts = ['intro-damaged', 'intro-failed', 'active-damaged', 'active-failed'] as const;
type Context = typeof contexts[number];
let tail: Promise<unknown>;
let request: (name: string, work: () => unknown) => Promise<unknown>;
let release: (() => void) | undefined;
function check(value: unknown, message: string): void { assert.ok(value, message); }
const panel = (container: HTMLElement) => container.querySelector<HTMLElement>('section[aria-live="polite"]')!;
async function tap(button: HTMLElement) { await act(async () => { fireEvent.click(button); }); }
async function holdLock() {
  void request(`${ATTACK_SAVE_KEY}-write`, () => new Promise<void>(resolve => { release = resolve; }));
  await act(async () => { await Promise.resolve(); });
}
async function unlock() { await act(async () => { release?.(); await tail; }); release = undefined; }
function targetState() {
  const state = advanceAttack(advanceAttack(createAttack(makeSoccerAttackSetup(9))));
  check(state.phase === 'target' && parseAttackSave(state), 'SETUP: real seed-nine target passes the save parser');
  return state;
}
function refuseNextWrite() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('Synthetic quota refusal'); });
}
async function prepare(context: Context) {
  const initial = context.startsWith('active') ? targetState() : null;
  if (initial) localStorage.setItem(ATTACK_SAVE_KEY, JSON.stringify(initial));
  if (context === 'intro-damaged') localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
  const view = render(<SoccerAttackBoard />), scope = within(view.container);
  if (context === 'active-damaged') {
    localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: ATTACK_SAVE_KEY, newValue: '{broken' })); });
  }
  if (context.endsWith('failed')) {
    refuseNextWrite();
    await tap(scope.getByRole('button', { name: initial ? 'Play attack' : 'Start Attack' }));
  }
  const label = context === 'intro-damaged' ? 'Play without saving'
    : context === 'active-damaged' ? 'Continue without saving' : 'Play this run without saving';
  const begin = context.endsWith('damaged') ? 'Replace damaged save' : 'Retry save';
  return { view, scope, label, begin, initial };
}

beforeEach(() => {
  localStorage.clear(); tail = Promise.resolve(); release = undefined;
  request = (_name, work) => { const result = tail.then(work); tail = result.catch(() => undefined); return result; };
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    matches: query.includes('reduced-motion'), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  }) });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => { (array as Uint32Array)[0] = 88; return array; });
  const deny = (name: string): never => { boundary.faults.push(name); throw new Error(name); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  vi.spyOn(console, 'error').mockImplementation((...args) => boundary.faults.push(args.map(String).join(' ')));
});
afterEach(async () => {
  await unlock(); cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'locks');
  check(boundary.faults.length === 0, 'BOUNDARY: no backend transport or runtime faults');
});

for (const context of contexts) it(`locks unsaved choice during ${context} save and preserves idle fallback`, async () => {
  const { view, scope, label, begin, initial } = await prepare(context);
  const originalRaw = localStorage.getItem(ATTACK_SAVE_KEY);
  check(!(scope.getByRole('button', { name: label }) as HTMLButtonElement).disabled,
    `IDLE: ${context} unsaved choice is available`);
  await holdLock(); await tap(scope.getByRole('button', { name: begin }));
  const disabled = (scope.getByRole('button', { name: label }) as HTMLButtonElement).disabled;
  // A second write refusal releases the pending choice for an ordinary local run.
  refuseNextWrite(); await unlock();
  const fallback = scope.getAllByRole('button', { name: label })[0] as HTMLButtonElement;
  check(!fallback.disabled, 'IDLE RETRY: unsaved choice reopens after an unavailable write');
  const seedCalls = vi.mocked(crypto.getRandomValues).mock.calls.length;
  await tap(fallback);
  check(!!scope.queryByText('Unsaved session', { exact: true }), 'UNSAVED: idle fallback visibly enters local play');
  check(localStorage.getItem(ATTACK_SAVE_KEY) === originalRaw, 'BYTES: choosing local play preserves the original save');
  check(vi.mocked(crypto.getRandomValues).mock.calls.length === seedCalls, 'SEED: local fallback does not generate a replacement run');
  const expected = context === 'active-failed' ? advanceAttack(initial!) : initial ?? createAttack(makeSoccerAttackSetup(88));
  const labelAfter = expected.phase === 'recap' ? 'Continue' : expected.phase === 'target' ? 'Play attack' : 'Spin team wheel';
  check(!!within(panel(view.container)).queryByRole('button', { name: labelAfter }),
    'EXACT MOVE: local play reveals the same pending phase');
  if (expected.lastResult) {
    const result = expected.lastResult, winner = expected.teams.find(team => team.id === result.winner)!.name;
    const loser = expected.teams.find(team => team.id === result.loser)!.name;
    const text = panel(view.container).textContent!;
    check(text.includes(`${winner} beat ${loser}`) && result.capturedPlayers.every(player => text.includes(player.name)),
      'EXACT RECAP: local play retains the real winner and captured players');
  }
  check(disabled, `WORKING CHOICE: ${context} unsaved option locks while a save is pending`);
});

it('rejects a same-event Retry and unsaved click before React disables the button', async () => {
  const { scope } = await prepare('intro-failed'); await holdLock();
  const retry = scope.getByRole('button', { name: 'Retry save' });
  const fallback = scope.getByRole('button', { name: 'Play this run without saving' });
  let native = 0; fallback.addEventListener('click', () => native++);
  await act(async () => { retry.click(); fallback.click(); });
  const prematurelyUnsaved = !!scope.queryByText('Unsaved session', { exact: true });
  check(native === 1, 'SETUP: second native click reaches the old enabled DOM');
  await unlock();
  check(!prematurelyUnsaved && !scope.queryByText('Unsaved session', { exact: true }),
    'SYNCHRONOUS GUARD: pending Retry rejects the same-event unsaved transition');
});

it('keeps queued Retry ownership when another board commits a confirmed restart', async () => {
  const target = targetState(); localStorage.setItem(ATTACK_SAVE_KEY, JSON.stringify(target));
  const first = render(<SoccerAttackBoard />), second = render(<SoccerAttackBoard />);
  const own = within(first.container), other = within(second.container);
  refuseNextWrite(); await tap(within(panel(first.container)).getByRole('button', { name: 'Play attack' }));
  await holdLock();
  await tap(other.getByRole('button', { name: 'Start new Attack' }));
  await tap(own.getByRole('button', { name: 'Retry save' }));
  await tap(own.getByRole('button', { name: 'Play this run without saving' }));
  const duringUnsaved = !!own.queryByText('Unsaved session', { exact: true });
  await unlock();
  const latest = JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!);
  check(latest.setup.seed === 88 && latest.revision === 0 && latest.phase === 'team',
    'SETUP: other board actually commits its new generated run');
  check(!duringUnsaved && !own.queryByText('Unsaved session', { exact: true }),
    'QUEUED CHOICE: a pending retry cannot enter local play before its conflict resolves');
  check(!!within(panel(first.container)).queryByRole('button', { name: 'Spin team wheel' })
    && !!own.queryByRole('status')?.textContent?.includes('another tab'),
  'CONFLICT: the current board restores the latest committed restart');
  console.log('REAL QUEUE', JSON.stringify({ priorSeed: target.setup.seed, priorRevision: target.revision,
    latestSeed: latest.setup.seed, latestRevision: latest.revision, duringUnsaved }));
});
