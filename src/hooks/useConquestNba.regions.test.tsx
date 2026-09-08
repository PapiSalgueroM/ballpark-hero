import { strict as assert } from 'node:assert';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquestNba } from '@/hooks/useConquestNba';
import { NBA_STATES } from '@/data/usStatesPaths';
import { INITIAL_TERRITORIES_NBA } from '@/data/conquestDataNba';

const boundary = vi.hoisted(() => ({
  unexpected: [] as string[],
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://nba-regions-fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, member) { return boundary.deny(`backend:${String(member)}`); } }),
}));

let visible: Set<string>;
let expected: Record<string, string | null>;
const entries = (value: Record<string, unknown>) => Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
const exactMap = (value: Record<string, unknown>) => JSON.stringify(entries(value)) === JSON.stringify(entries(expected));
const check = (ok: boolean, message: string) => assert.ok(ok, message);
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mount = (seed: number) => {
  vi.mocked(Math.random).mockImplementation(rng(seed));
  return renderHook(() => useConquestNba());
};
const complete = (result: ReturnType<typeof mount>['result']) => {
  act(() => vi.advanceTimersByTime(10_000));
  act(() => result.current.skipToResult());
  act(() => result.current.skipSteal());
};

beforeEach(() => {
  boundary.unexpected.length = 0;
  vi.useFakeTimers(); vi.spyOn(Math, 'random');
  vi.stubGlobal('fetch', () => boundary.deny('transport:fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { boundary.deny('transport:xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('transport:websocket'); } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => boundary.deny('storage:setItem'));
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => boundary.deny('storage:removeItem'));
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => boundary.deny('storage:clear'));
  visible = new Set(NBA_STATES.map(state => state.id));
  expected = Object.fromEntries(NBA_STATES.map(state => [state.id, INITIAL_TERRITORIES_NBA[state.id] || null]));
});
afterEach(() => {
  cleanup();
  const unexpected = [...boundary.unexpected];
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(unexpected.length === 0, 'BOUNDARY: no backend, transport or browser storage writes');
});

describe('NBA Arcade visible territory state', () => {
  it('initializes exactly the rendered regions with their configured owners', () => {
    const { result } = mount(1);
    check(exactMap(result.current.territories), 'INITIAL: territory keys and owners match the rendered NBA map');
  });
  it('restores the exact visible map after a completed turn and reset', () => {
    const { result } = mount(0);
    act(() => result.current.startBattle()); complete(result);
    check(result.current.turn === 1, 'SETUP: one real turn completed before reset');
    act(() => result.current.reset());
    check(exactMap(result.current.territories) && result.current.turn === 0 && result.current.phase === 'ready',
      'RESET: completed game restores only configured visible regions');
  });
  it('places initial powers only on rendered unowned regions', () => {
    const { result } = mount(2);
    const neutral = [...visible].filter(id => expected[id] === null);
    check([...result.current.powerupStates].every(id => visible.has(id) && expected[id] === null)
      && (neutral.length > 0 || result.current.powerupStates.size === 0),
    'POWERS: initial locations belong to visible neutral regions');
  });
  it('never targets or claims invisible territory through real seeded turns', () => {
    const invisible: string[] = [];
    let completed = 0, battles = 0;
    for (let seed = 0; seed < 24; seed += 1) {
      const { result, unmount } = mount(seed);
      act(() => result.current.startBattle());
      const target = result.current.targetState;
      if (target && !visible.has(target)) invisible.push(`seed ${seed} target ${target}`);
      complete(result);
      if (result.current.turn === 1) completed += 1;
      if (result.current.battleResult) battles += 1;
      for (const [id, owner] of Object.entries(result.current.territories)) {
        if (owner && !visible.has(id)) invisible.push(`seed ${seed} claimed ${id}`);
      }
      unmount(); vi.clearAllTimers();
    }
    check(completed === 24 && battles > 0, 'SETUP: all seeded turns complete and exercise real battles');
    if (invisible.length) console.log(`Invisible turn evidence: ${invisible.join(', ')}`);
    check(invisible.length === 0, 'TURNS: real targeting and ownership stay on rendered regions');
  });
  it('preserves both empires when a real away attacker loses', () => {
    let exercised = false;
    for (let seed = 0; seed < 100 && !exercised; seed += 1) {
      const { result, unmount } = mount(seed);
      act(() => result.current.startBattle());
      act(() => vi.advanceTimersByTime(10_000));
      const attacker = result.current.attackingTeam, battle = result.current.battleResult;
      if (attacker && battle?.loser === attacker) {
        const before = JSON.stringify(entries(result.current.territories));
        act(() => result.current.skipToResult()); act(() => result.current.skipSteal());
        check(JSON.stringify(entries(result.current.territories)) === before
          && !result.current.eliminated.includes(attacker)
          && !!result.current.gameLog.at(-1)?.score.includes('away raid repelled'),
        'AWAY LOSS: repelled attacker and defender keep all prior territory');
        exercised = true;
      }
      unmount(); vi.clearAllTimers();
    }
    check(exercised, 'SETUP: seeded simulation produces an actual away loss');
  });
});
