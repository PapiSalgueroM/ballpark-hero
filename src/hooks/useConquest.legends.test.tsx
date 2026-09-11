/** Round 535: declared legal initial ownership, real rosters and hook actions.
 * All rendered regions begin with MIN (or SEA), except BUF NY, optional KC MO,
 * and marked neutral ND/SD. Nothing injects mid-run state or replaces a battle.
 * Reward kinds and RNG inputs are controlled; the real engine is observed only.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { DIRECTIONS, STATE_POSITIONS } from '@/data/conquestData';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';
import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';
import type { simulateDetailedBattle } from '@/lib/conquestBattle';

type EngineCall = { args: Parameters<typeof simulateDetailedBattle>; result: ReturnType<typeof simulateDetailedBattle> };
const fixture = vi.hoisted(() => ({ owner: 'MIN', power: 'legend',
  faults: [] as string[], calls: [] as EngineCall[], initial: null as Record<string, string | null> | null }));
vi.mock('@/data/conquestData', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestData')>();
  return { ...actual, get INITIAL_TERRITORIES() { return fixture.initial ?? actual.INITIAL_TERRITORIES; } };
});
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    actual.getRandomPowerup(); return actual.POWERUPS.find(power => power.id === fixture.power)!;
  } };
});
vi.mock('@/lib/conquestBattle', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/conquestBattle')>();
  return { ...actual, simulateDetailedBattle: (...args: Parameters<typeof simulateDetailedBattle>) => {
    const result = actual.simulateDetailedBattle(...args); fixture.calls.push({ args, result }); return result;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  fixture.faults.push('backend'); throw new Error('Unexpected NFL legends backend access');
} }) }));
type Game = ReturnType<typeof useConquest>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string): void { assert.ok(value, message); }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function snapshot(game: Game) { return JSON.stringify({ phase: game.phase, turn: game.turn,
  rosters: game.rosters, marked: [...game.legendPlayers], pending: game.pendingPowerup,
  saved: game.teamSavedPowerups, log: game.gameLog, eliminated: game.eliminated }); }
function mount(neutrals = ['ND'], owner = 'MIN', third = false) {
  fixture.owner = owner;
  fixture.initial = Object.fromEntries(STATE_POSITIONS.map(state => [state.id,
    !(state.id in TERRITORY_ADJACENCY) || neutrals.includes(state.id) ? null
      : state.id === 'NY' ? 'BUF' : third && state.id === 'MO' ? 'KC' : owner]));
  return renderHook(() => useConquest());
}
function start(view: View, team: string, direction = .9, rest = .9) {
  check(view.result.current.phase === 'ready' && !view.result.current.pendingPowerup, 'SETUP: an actual map turn starts idle');
  const alive = view.result.current.aliveTeams(); check(alive.includes(team), 'SETUP: the chosen actual attacker is alive');
  const draws: number[] = [];
  [...DIRECTIONS].sort(() => { draws.push(direction); return direction - .5; });
  vi.mocked(Math.random).mockImplementation(() => rest).mockReturnValueOnce((alive.indexOf(team) + .5) / alive.length);
  for (const draw of draws) vi.mocked(Math.random).mockReturnValueOnce(draw);
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
}
function finish(view: View) {
  act(() => view.result.current.skipToResult());
  check(view.result.current.pendingBattleApply, 'SETUP: the actual battle reached its result');
  act(() => view.result.current.skipSteal());
}
function earn(view: View, power = 'legend') {
  fixture.power = power; start(view, fixture.owner, .1, .1);
  check(view.result.current.pendingPowerup?.teamId === fixture.owner
    && view.result.current.pendingPowerup.powerup.id === power && !view.result.current.battleResult,
  'SETUP: the owner earns the requested reward from a real marked neutral claim');
}
function activate(view: View) { earn(view); act(() => view.result.current.usePowerupNow()); }
function ordinary(view: View, name = 'Adrian Peterson') {
  earn(view, 'free_agent'); act(() => view.result.current.usePowerupNow());
  const offer = view.result.current.freeAgentList.find(player => player.name === name);
  check(offer, 'SETUP: the actual free-agent reward offers the existing pool identity');
  act(() => view.result.current.signFreeAgent(name)); return offer!;
}
function transfer(view: View, name = 'Adrian Peterson') {
  start(view, fixture.owner); const result = view.result.current.battleResult;
  check(result?.loser === fixture.owner && result.winner !== fixture.owner, 'SETUP: a real away defeat gives the opponent a steal');
  const recipient = result!.winner;
  act(() => view.result.current.skipToResult()); act(() => view.result.current.openStealModal());
  act(() => view.result.current.stealPlayer(name)); act(() => vi.advanceTimersByTime(1200));
  check(!view.result.current.rosters[fixture.owner].includes(name) && view.result.current.rosters[recipient].includes(name),
    'SETUP: the actual steal moves the selected existing player between owners');
  return recipient;
}
function blocked(view: View, label: string) {
  const before = snapshot(view.result.current);
  check(view.result.current.powerupUnavailableReason === 'This player is already on an active roster or unavailable. Save this legend power for later.',
    `${label} REASON: an active same-name identity makes the earned legend card unavailable`);
  act(() => view.result.current.usePowerupNow());
  check(snapshot(view.result.current) === before && view.result.current.phase === 'powerup_received',
    `${label} CARD: blocked use preserves the earned card and all roster identities`);
  act(() => view.result.current.savePowerupForLater());
  check(view.result.current.teamSavedPowerups[fixture.owner]?.length === 1 && !view.result.current.pendingPowerup,
    `${label} SAVE: the blocked earned legend card remains bankable`);
}
beforeEach(() => {
  fixture.initial = null; fixture.calls.length = 0; fixture.power = 'legend';
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(.5);
  const deny = (name: string): never => { fixture.faults.push(name); throw new Error(name); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  vi.spyOn(console, 'error').mockImplementation((...args) => fixture.faults.push(args.map(String).join(' ')));
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(fixture.faults.length === 0, 'BOUNDARY: no runtime transport storage or backend faults');
});

describe('NFL earned legend identity', () => {
  it('keeps both ordinary franchise pool cards unmarked at their shipped ratings', () => {
    for (const [owner, name, rating] of [['MIN', 'Adrian Peterson', 80], ['SEA', 'Marshawn Lynch', 79]] as const) {
      const view = mount(['ND'], owner), offer = ordinary(view, name);
      check(offer.overall === rating, 'ORDINARY OFFER: a reward pool card keeps its ordinary rating on its matching franchise');
      const card = getNflRosterPlayer(name, owner, view.result.current.legendPlayers);
      check(card?.overall === rating && card.keyStat === '' && view.result.current.legendPlayers.size === 0,
        'ORDINARY IDENTITY: acquiring a same-name pool player does not activate a legend');
      start(view, owner); const call = fixture.calls[fixture.calls.length - 1];
      check(call.args[8] instanceof Set && call.args[8].size === 0 && call.args[3][owner].includes(name),
        'ORDINARY ENGINE: an actual battle receives explicit empty legend identity with the acquired roster');
      view.unmount(); vi.clearAllTimers();
    }
  });

  it('keeps an earned legend card saveable when its owner already has the ordinary player', () => {
    const view = mount(['ND', 'SD']); ordinary(view); earn(view); blocked(view, 'OWN ORDINARY');
    check(!view.result.current.legendPlayers.has('Adrian Peterson'), 'BLOCKED MARKER: blocked same-name redemption cannot promote an ordinary player');
  });

  it('blocks an earned legend when the ordinary same-name player moved to another active team', () => {
    const view = mount(['ND', 'SD']); ordinary(view); const recipient = transfer(view); earn(view); blocked(view, 'OTHER ORDINARY');
    check(getNflRosterPlayer('Adrian Peterson', recipient, view.result.current.legendPlayers)?.overall === 80,
      'FOREIGN ORDINARY: a blocked franchise reward leaves the opponent ordinary card at 80');
  });

  it('registers one successful earned legend and preserves a second same-owner reward', () => {
    const view = mount(['ND', 'SD']); earn(view);
    const use = view.result.current.usePowerupNow, before = view.result.current.gameLog.length;
    act(() => { use(); use(); });
    check(same([...view.result.current.legendPlayers], ['Adrian Peterson']) && view.result.current.rosters.MIN.filter(name => name === 'Adrian Peterson').length === 1
      && view.result.current.gameLog.length === before + 1, 'ACTIVATE ONCE: one earned card records one real legend identity and roster addition');
    const card = getNflRosterPlayer('Adrian Peterson', 'MIN', view.result.current.legendPlayers);
    check(card?.overall === 99 && card.keyStat === 'Legend', 'ACTIVATED CARD: an actually registered legend has its 99 card');
    earn(view); blocked(view, 'OWN LEGEND');
    check(same([...view.result.current.legendPlayers], ['Adrian Peterson']), 'DUPLICATE MARKER: saving another reward leaves the original legend identity intact');
  });

  it('preserves an earned legend through a real steal and forwards its new owner to the engine', () => {
    const view = mount(['ND', 'SD']); activate(view); const recipient = transfer(view);
    const card = getNflRosterPlayer('Adrian Peterson', recipient, view.result.current.legendPlayers);
    check(card?.overall === 99 && card.keyStat === 'Legend' && view.result.current.legendPlayers.has('Adrian Peterson'),
      'TRANSFER IDENTITY: an actually earned legend retains its 99 identity after a real player steal');
    start(view, recipient); const call = fixture.calls[fixture.calls.length - 1];
    check(call.args[8]?.has('Adrian Peterson') && call.args[3][recipient].includes('Adrian Peterson')
      && same(view.result.current.battleResult?.simulation, call.result),
    'TRANSFER ENGINE: the new owner actual simulation receives the earned legend marker and unchanged real result');
    finish(view); earn(view); blocked(view, 'OTHER LEGEND');
  });

  it('retains eliminated legend identity in both released-player offer paths', () => {
    const view = mount(['ND', 'SD'], 'MIN', true); activate(view); const recipient = transfer(view);
    start(view, 'MIN', .9, .1);
    check(view.result.current.battleResult?.winner === 'MIN' && view.result.current.battleResult.loser === recipient,
      'SETUP: the same real matchup now gives MIN a home-territory conquest');
    finish(view);
    check(view.result.current.eliminated.includes(recipient) && view.result.current.aliveTeams().length === 2,
      'SETUP: the stolen legend owner is eliminated while another actual opponent remains');
    check(view.result.current.legendPlayers.has('Adrian Peterson'), 'ELIMINATED IDENTITY: losing all territory does not erase an earned run identity');
    const other = view.result.current.aliveTeams().find(id => id !== 'MIN')!;
    act(() => view.result.current.setFavoriteTeam(other));
    check(view.result.current.freeAgencyPool().find(player => player.name === 'Adrian Peterson')?.overall === 99,
      'RELEASED DOCK: the eliminated owner releases the actual earned 99 card into docked free agency');
    earn(view, 'free_agent'); act(() => view.result.current.usePowerupNow());
    const offer = view.result.current.freeAgentList.find(player => player.name === 'Adrian Peterson');
    check(offer?.overall === 99, 'RELEASED REWARD: an earned signing reward offers the same retained 99 identity');
    act(() => view.result.current.signFreeAgent('Adrian Peterson'));
    check(view.result.current.rosters.MIN.includes('Adrian Peterson') && view.result.current.legendPlayers.has('Adrian Peterson'),
      'RELEASED SIGN: the released legend can rejoin an active roster with its earned identity');
  });

  it('keeps an acquired legend when docked signing waives the actual weakest ordinary player', () => {
    const view = mount(); activate(view); const recipient = transfer(view);
    for (let n = 0; n < 2; n++) { start(view, recipient); finish(view); }
    act(() => view.result.current.setFavoriteTeam(recipient));
    act(() => view.result.current.signFreeAgencyCandidate(view.result.current.freeAgencyPool()[0]));
    check(view.result.current.rosters[recipient].includes('Adrian Peterson'), 'SETUP: the first actual signing removes a weaker ordinary player');
    for (let n = 0; n < 3; n++) { start(view, recipient); finish(view); }
    const before = [...view.result.current.rosters[recipient]], marked = view.result.current.legendPlayers;
    const weakest = [...before].sort((a, b) => getNflRosterPlayer(a, recipient, marked)!.overall - getNflRosterPlayer(b, recipient, marked)!.overall)[0];
    check(weakest !== 'Adrian Peterson' && getNflRosterPlayer(weakest, recipient, marked)!.overall > 80
      && view.result.current.canSignFreeAgent(), 'SETUP: three more actual battles unlock signing with every ordinary player above the incorrect 80 fallback');
    const offer = view.result.current.freeAgencyPool()[0]; act(() => view.result.current.signFreeAgencyCandidate(offer));
    check(view.result.current.rosters[recipient].includes('Adrian Peterson') && !view.result.current.rosters[recipient].includes(weakest)
      && view.result.current.legendPlayers.has('Adrian Peterson'), 'WAIVER IDENTITY: canonical earned 99 metadata keeps the legend and waives the actual weakest player');
  });

  it('clears run identities on reset without reviving an older earned-card callback', () => {
    const view = mount(); earn(view); const oldUse = view.result.current.usePowerupNow;
    act(() => oldUse()); check(view.result.current.legendPlayers.has('Adrian Peterson'), 'SETUP: an actual earned identity exists before reset');
    act(() => view.result.current.reset());
    check(view.result.current.legendPlayers.size === 0 && !view.result.current.rosters.MIN.includes('Adrian Peterson'),
      'RESET IDENTITY: a fresh run clears earned legend metadata with its acquired roster');
    const reset = snapshot(view.result.current); act(() => oldUse());
    check(snapshot(view.result.current) === reset, 'RESET STALE: an older earned-card callback cannot restore a cleared legend');
  });
});
