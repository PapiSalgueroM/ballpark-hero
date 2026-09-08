/** Round 533: declared starting-map fixture, not a naturally reached endgame.
 * Real map geometry, team cards, hook transitions and reward actions are retained.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { TEAM_MAP } from '@/data/conquestData';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';

const boundary = vi.hoisted(() => ({ faults: [] as string[] }));
vi.mock('@/data/conquestData', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestData')>();
  const { TERRITORY_ADJACENCY: geometry } = await import('@/lib/conquestMapGeometry');
  const initial = Object.fromEntries(Object.keys(geometry).filter(id => id !== 'PA_W').map(id => [id, id === 'MD' ? 'WAS' : 'CIN']));
  return { ...actual, INITIAL_TERRITORIES: initial };
});
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    actual.getRandomPowerup();
    return actual.POWERUPS.find(power => power.id === 'territory_steal')!;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  boundary.faults.push('backend'); throw new Error('Unexpected final-power backend access');
} }) }));
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0);
  const deny = (label: string): never => { boundary.faults.push(label); throw new Error(label); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  assert.ok(boundary.faults.length === 0, 'BOUNDARY: no runtime transport storage or backend faults');
});

it('earns and resolves the final territory power from a declared legal starting map', () => {
  const view = renderHook(() => useConquest());
  const initial = view.result.current;
  assert.deepEqual(initial.aliveTeams().sort(), ['CIN', 'WAS']);
  assert.ok(initial.territories.PA_W === null && initial.territories.MD === 'WAS'
    && initial.getTeamTerritoryCount('WAS') === 1 && initial.powerupStates.has('PA_W')
    && TERRITORY_ADJACENCY.PA_W.includes('MD'), 'SETUP: the declared map has one marked neutral and one adjacent final enemy state');
  assert.deepEqual(initial.rosters.CIN, TEAM_MAP.get('CIN')!.players!.map(player => player.name));
  act(() => view.result.current.startBattle());
  assert.ok(view.result.current.phase === 'animating' && view.result.current.targetState === 'PA_W', 'SETUP: the actual map turn targets the marked neutral region');
  act(() => vi.advanceTimersByTime(10000));
  assert.ok(view.result.current.turn === 1 && view.result.current.territories.PA_W === 'CIN'
    && view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.teamId === 'CIN'
    && view.result.current.pendingPowerup.powerup.id === 'territory_steal' && !view.result.current.battleResult,
  'EARNED: the real neutral claim awards its territory power to CIN');
  act(() => view.result.current.savePowerupForLater());
  act(() => view.result.current.useSavedPowerup('CIN', 0));
  act(() => view.result.current.usePowerupNow());
  assert.deepEqual(view.result.current.stealCandidates.map(candidate => candidate.stateId), ['MD']);
  const choose = view.result.current.stealTerritoryTarget, before = view.result.current.gameLog.length;
  act(() => { choose('MD'); choose('MD'); });
  assert.ok(view.result.current.phase === 'gameover' && view.result.current.aliveTeams().length === 1
    && view.result.current.aliveTeams()[0] === 'CIN' && view.result.current.territories.MD === 'CIN'
    && !view.result.current.pendingPowerup, 'VICTORY: the actual final territory choice ends the fixture run immediately');
  assert.ok(view.result.current.eliminated.filter(id => id === 'WAS').length === 1
    && view.result.current.gameLog.length === before + 1 && view.result.current.gameLog[view.result.current.gameLog.length - 1]?.defender === 'powerup',
  'FINAL ONCE: the final territory choice records one elimination and one power action');
  act(() => vi.advanceTimersByTime(2000));
  assert.ok(view.result.current.phase === 'gameover' && view.result.current.territoryStolenState === null,
    'FINAL TIMER: animation cleanup preserves the completed game');
  console.log('DECLARED MAP FIXTURE: 1 real neutral claim, 1 earned and banked power, MD claimed from WAS, CIN wins immediately and after timer cleanup; not a natural endgame witness');
});
