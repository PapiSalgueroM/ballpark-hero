import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { NFL_TEAMS } from '@/data/conquestData';

const boundary = vi.hoisted(() => ({ faults: [] as string[] }));
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    actual.getRandomPowerup();
    return actual.POWERUPS.find(power => power.id === 'free_agent')!;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  boundary.faults.push('Unexpected backend access');
  throw new Error('Unexpected backend access');
} }) }));
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
  const deny = (message: string): never => { boundary.faults.push(message); throw new Error(message); };
  vi.stubGlobal('fetch', () => deny('Unexpected fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('Unexpected XMLHttpRequest'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('Unexpected WebSocket'); } });
  for (const key of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, key).mockImplementation(() => deny('Unexpected storage ' + key));
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  assert.ok(boundary.faults.length === 0, `BOUNDARY: ${boundary.faults.join('; ')}`);
});

it('offers the canonical card when a real elimination releases a duplicate pool name', () => {
  const view = renderHook(() => useConquest());
  let turns = 0, battles = 0;
  for (; turns < 32 && !view.result.current.eliminated.includes('NE'); turns += 1) {
    act(() => view.result.current.startBattle());
    act(() => vi.advanceTimersByTime(10000));
    if (view.result.current.battleResult?.simulation) {
      battles += 1;
      act(() => view.result.current.skipToResult());
      assert.ok(view.result.current.pendingBattleApply, 'SETUP: a real battle reached its result');
      act(() => view.result.current.skipSteal());
    }
    if (view.result.current.pendingPowerup) act(() => view.result.current.savePowerupForLater());
  }
  assert.ok(view.result.current.eliminated.includes('NE') && battles > 0, 'SETUP: real battles eliminated New England within the turn limit');
  const owner = view.result.current.aliveTeams().find(id => view.result.current.teamSavedPowerups[id]?.some(power => power.id === 'free_agent'));
  assert.ok(owner, 'SETUP: a surviving team earned and saved a real free-agent reward');
  const index = view.result.current.teamSavedPowerups[owner!].findIndex(power => power.id === 'free_agent');
  act(() => view.result.current.setFavoriteTeam(owner!));
  const docked = view.result.current.freeAgencyPool().find(player => player.name === 'Stefon Diggs');
  assert.ok(docked?.position === 'WR' && docked.overall === 86, 'DOCKED: the released team card retains WR and 86 OVR');
  act(() => view.result.current.useSavedPowerup(owner!, index));
  act(() => view.result.current.usePowerupNow());
  const game = view.result.current;
  assert.ok(game.phase === 'powerup_use' && game.powerupTeam === owner && game.powerupUseType === 'free_agent', 'SETUP: the earned reward opens for its real recipient');
  const offer = game.freeAgentList.find(player => player.name === 'Stefon Diggs');
  assert.ok(offer?.position === 'WR' && offer.overall === 86, 'OFFER: the reward advertises the canonical WR 86 card instead of the duplicate 88 card');
  const active = new Set(game.aliveTeams().flatMap(id => game.rosters[id]));
  assert.ok(game.freeAgentList.length > 0 && game.freeAgentList.every(player => !active.has(player.name)), 'ELIGIBLE: no currently active player appears in the reward pool');
  const original = NFL_TEAMS.find(team => team.id === 'NE')!.players!.find(player => player.name === 'Stefon Diggs')!;
  assert.ok(original.overall === offer!.overall && original.position === offer!.position, 'CARD: the advertised offer matches the unchanged original card');
  act(() => view.result.current.signFreeAgent(offer!.name));
  assert.ok(view.result.current.rosters[owner!].filter(name => name === offer!.name).length === 1 && view.result.current.phase === 'ready', 'SIGNED: the real reward adds the advertised player to its recipient');
  console.log(`OFFER WITNESS: seed29, ${turns} turns, ${battles} real battles, recipient ${owner}, Stefon Diggs WR86`);
});
