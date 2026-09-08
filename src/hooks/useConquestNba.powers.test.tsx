/** Round 527: real seeded battles and hook transitions, with test-only small maps.
 * NBA names, ratings and simulation stay real. Only the initial visible map,
 * empty recruitment data and randomly selected reward are fixture-controlled.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquestNba } from '@/hooks/useConquestNba';
import { NBA_TEAM_MAP, TEAM_LEGENDS_NBA, CONQUEST_FREE_AGENCY_POOL_NBA } from '@/data/conquestDataNba';
import { PowerupId } from '@/data/conquestPowerups';
import * as battleLib from '@/lib/conquestBattleNba';

const fixture = vi.hoisted(() => ({
  map: null as Record<string, string> | null, emptyPlayers: false,
  power: 'invincibility' as string, draws: 0,
}));
vi.mock('@/data/conquestDataNba', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestDataNba')>();
  return { ...actual,
    INITIAL_TERRITORIES_NBA: new Proxy(actual.INITIAL_TERRITORIES_NBA, {
      get(target, key) { return fixture.map ? fixture.map[String(key)] : Reflect.get(target, key); },
    }),
    NBA_TEAM_MAP: new Proxy(actual.NBA_TEAM_MAP, { get(target, key) {
      if (key === 'get') return (id: string) => {
        const team = target.get(id);
        return fixture.emptyPlayers && team ? { ...team, players: [] } : team;
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } }),
  };
});
vi.mock('@/data/usStatesPaths', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/usStatesPaths')>();
  return { ...actual, NBA_STATES: new Proxy(actual.NBA_STATES, { get(target, key) {
    const rows = fixture.map ? target.filter(row => Object.prototype.hasOwnProperty.call(fixture.map!, row.id)) : target;
    const value = Reflect.get(rows, key, rows);
    return typeof value === 'function' ? value.bind(rows) : value;
  } }) };
});
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    fixture.draws += 1;
    const power = actual.POWERUPS.find(item => item.id === fixture.power);
    if (!power) throw new Error('Unknown power fixture');
    return power;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, { get() { throw new Error('Unexpected backend access'); } }),
}));

const MAP = { IL: 'CHI', MI: 'DET', WI: 'MIL', MA: 'BOS', NY: 'NYK', PA_E: 'PHI', CA_S: 'LAL', CA_NW: 'GSW' };
const THREE = { IL: 'CHI', MI: 'DET', WI: 'MIL' };
function check(condition: unknown, message: string) { assert.ok(condition, message); }
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
type Game = ReturnType<typeof useConquestNba>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
type SimArgs = Parameters<typeof battleLib.simulateDetailedBattleNba>;
let simulator: typeof battleLib.simulateDetailedBattleNba;
let calls: { args: SimArgs; seed: number; offset: number; result: battleLib.BattleSimulation }[];
let battleSeed = 0, randomOffset = 0;
let faults: string[];
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function mount(map: Record<string, string> | null = MAP): View {
  fixture.map = map; vi.mocked(Math.random).mockImplementation(seeded(42));
  return renderHook(() => useConquestNba());
}
function dispose(view: View) { view.unmount(); vi.clearAllTimers(); }
function battle(view: View, owner: string, seed = 1, reverse = false) {
  check(view.result.current.phase === 'ready', 'SETUP: battle starts from ready');
  const alive = view.result.current.aliveTeams(), index = alive.indexOf(owner);
  check(index >= 0, 'SETUP: selected attacker is alive');
  const random = seeded(seed); let count = 0;
  battleSeed = seed; randomOffset = 0;
  vi.mocked(Math.random).mockImplementation(() => {
    count += 1;
    if (count === 1) return (index + 0.25) / alive.length;
    if (count <= 8) return reverse ? 0.01 : 0.99;
    randomOffset += 1; return random();
  });
  act(() => view.result.current.startBattle());
  act(() => vi.advanceTimersByTime(10_000));
  check(view.result.current.battleResult && view.result.current.attackingTeam === owner, 'SETUP: real selected battle ran');
  act(() => view.result.current.skipToResult());
  return view.result.current.battleResult!;
}
function settle(view: View) { act(() => view.result.current.skipSteal()); }
function award(view: View, power: PowerupId, owner = 'CHI') {
  fixture.power = power;
  for (let seed = 0; seed < 100; seed += 1) {
    const result = battle(view, owner, seed); settle(view);
    if (result.winner === owner) {
      check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.teamId === owner,
        'SETUP: real nonfinal conquest supplied the selected reward');
      return result;
    }
  }
  throw new Error('Seeded setup never won a conquest');
}
function shieldScenario(attackingShield: boolean) {
  for (let seed = 0; seed < 80; seed += 1) {
    const view = mount(THREE); award(view, 'invincibility');
    act(() => view.result.current.usePowerupNow());
    const enemy = view.result.current.aliveTeams().find(id => id !== 'CHI')!;
    const result = battle(view, attackingShield ? 'CHI' : enemy, seed);
    if (result.loser === 'CHI') return { view, result, enemy };
    dispose(view);
  }
  throw new Error('Seeded shield setup never produced the required loss');
}
function playerPoints(sim: battleLib.BattleSimulation, team: 'att' | 'def', name: string) {
  const stats = team === 'att' ? sim.boxScore.attStats : sim.boxScore.defStats;
  return stats.passingQb === name ? stats.passingYds : stats.rushingName === name ? stats.rushingYds : stats.receivingName === name ? stats.receivingYds : undefined;
}

beforeEach(() => {
  fixture.map = null; fixture.emptyPlayers = false; fixture.power = 'invincibility'; fixture.draws = 0;
  faults = []; calls = []; vi.useFakeTimers(); vi.spyOn(Math, 'random');
  simulator = battleLib.simulateDetailedBattleNba;
  vi.spyOn(battleLib, 'simulateDetailedBattleNba').mockImplementation((...args) => {
    const seed = battleSeed, offset = randomOffset;
    const result = simulator(...args);
    calls.push({ args: structuredClone(args), seed, offset, result });
    return result;
  });
  const deny = (label: string): never => { faults.push(label); throw new Error(label); };
  vi.stubGlobal('fetch', () => deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { deny('Unexpected WebSocket'); } });
  for (const key of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, key).mockImplementation(() => deny(`Unexpected storage ${key}`));
  vi.spyOn(console, 'error').mockImplementation((...args) => { faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(faults.length === 0, `BOUNDARY: no transport, storage, or runtime faults (${faults.join('; ')})`);
});

describe('NBA conquest visible power outcomes', () => {
  it('awards one visible power after a real nonfinal attacker conquest', () => {
    const view = mount(null); vi.mocked(Math.random).mockImplementation(seeded(5));
    // The baseline seed includes initial map setup draws, so restart with it.
    dispose(view); vi.mocked(Math.random).mockImplementation(seeded(5));
    const game = renderHook(() => useConquestNba());
    act(() => game.result.current.startBattle()); act(() => vi.advanceTimersByTime(10_000));
    const result = game.result.current.battleResult!;
    check(result?.winner === game.result.current.attackingTeam, 'SETUP: seed 5 is an attacker win');
    const before = game.result.current.getTeamTerritoryCount(result.winner);
    act(() => game.result.current.skipToResult());
    const skip = game.result.current.skipSteal;
    act(() => { skip(); skip(); });
    check(game.result.current.phase === 'powerup_received' && game.result.current.pendingPowerup?.teamId === result.winner
      && game.result.current.getTeamTerritoryCount(result.winner) > before && game.result.current.eliminated.includes(result.loser)
      && game.result.current.turn === 1 && fixture.draws === 1, 'ACQUISITION: conquest awards exactly one visible winner-owned power');
  });

  it('awards no power or territory for a losing away attack', () => {
    let found = false;
    for (let seed = 0; seed < 40 && !found; seed += 1) {
      const view = mount(THREE), before = { ...view.result.current.territories }, draws = fixture.draws;
      const result = battle(view, 'CHI', seed);
      if (result.loser !== 'CHI') { dispose(view); continue; }
      settle(view);
      check(view.result.current.phase === 'ready' && !view.result.current.pendingPowerup && fixture.draws === draws
        && same(before, view.result.current.territories), 'AWAY: repelled attacks change no territory and award no power');
      found = true; dispose(view);
    }
    check(found, 'SETUP: actual away loss exercised');
  });

  it('keeps two saved powers and reopens only one card with stale inputs rejected', () => {
    const view = mount();
    for (const power of ['invincibility', 'legend', 'upgrade'] as PowerupId[]) {
      award(view, power); const save = view.result.current.savePowerupForLater;
      act(() => { save(); save(); });
    }
    check(same(view.result.current.teamSavedPowerups.CHI?.map(item => item.id), ['legend', 'upgrade']),
      'INVENTORY: two slots replace the oldest reward without duplicate saves');
    const reopen = view.result.current.useSavedPowerup;
    act(() => { reopen('CHI', 0); reopen('CHI', 0); });
    check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.powerup.id === 'legend'
      && same(view.result.current.teamSavedPowerups.CHI.map(item => item.id), ['upgrade']),
      'REOPEN: one saved reward becomes a visible card exactly once');
    const start = view.result.current.startBattle;
    act(() => { start(); view.result.current.useSavedPowerup('CHI', 0); });
    check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.powerup.id === 'legend',
      'READY: unresolved rewards reject battle starts and saved-card reopening');
    act(() => view.result.current.savePowerupForLater());
    check(same(view.result.current.teamSavedPowerups.CHI.map(item => item.id), ['upgrade', 'legend']),
      'RESAVE: a reopened power can return to its inventory');
  });

  it('recruits only eligible eliminated NBA players for the saved reward owner', () => {
    const view = mount(); award(view, 'free_agent');
    act(() => view.result.current.savePowerupForLater());
    // A second team wins a separate battle before CHI reopens its card.
    award(view, 'invincibility', 'BOS'); act(() => view.result.current.savePowerupForLater());
    check(view.result.current.attackingTeam === 'BOS' && view.result.current.aliveTeams().includes('CHI'), 'SETUP: next attacker differs from saved owner');
    act(() => view.result.current.useSavedPowerup('CHI', 0)); act(() => view.result.current.usePowerupNow());
    const game = view.result.current, active = new Set(game.aliveTeams().flatMap(id => game.rosters[id]));
    const eligible = new Set(game.eliminated.flatMap(id => NBA_TEAM_MAP.get(id)?.players?.map(player => player.name) || []));
    check(game.phase === 'powerup_use' && game.pendingPowerup?.teamId === 'CHI' && game.freeAgentList.length > 0
      && game.freeAgentList.every(player => eligible.has(player.name) && !active.has(player.name)),
      'FREEPOOL: selection keeps the recipient and offers only unclaimed eliminated NBA players');
    const player = game.freeAgentList[0].name, before = { ...game.rosters }, sign = game.signFreeAgent;
    act(() => sign('Synthetic invalid candidate'));
    check(same(before, view.result.current.rosters) && view.result.current.phase === 'powerup_use', 'INVALID: unknown recruits cannot spend or change a reward');
    act(() => { sign(player); sign(player); });
    check(view.result.current.rosters.CHI.filter(name => name === player).length === 1
      && same(before.BOS, view.result.current.rosters.BOS) && view.result.current.phase === 'ready' && !view.result.current.pendingPowerup,
      'RECIPIENT: one recruit joins the saved owner even when another team attacked last');
  });

  it('protects one home loss without spending a shield on an away loss', () => {
    const away = shieldScenario(true), beforeAway = { ...away.view.result.current.territories }, awayDraws = fixture.draws;
    settle(away.view);
    check(away.view.result.current.invincibleTeams.has('CHI') && same(beforeAway, away.view.result.current.territories)
      && fixture.draws === awayDraws && !away.view.result.current.pendingPowerup,
      'SHIELD AWAY: a losing away raid leaves its shield intact and earns no reward');
    dispose(away.view);
    const home = shieldScenario(false), beforeHome = { ...home.view.result.current.territories }, homeDraws = fixture.draws;
    settle(home.view);
    check(!home.view.result.current.invincibleTeams.has('CHI') && same(beforeHome, home.view.result.current.territories)
      && home.view.result.current.phase === 'ready' && fixture.draws === homeDraws && !home.view.result.current.pendingPowerup,
      'SHIELD HOME: one losing defense spends its shield and prevents conquest and reward');
  });

  it('keeps upgrades for their owners and passes both selections to their next battle', () => {
    const view = mount(); award(view, 'upgrade'); act(() => view.result.current.usePowerupNow());
    const chiPlayer = NBA_TEAM_MAP.get('CHI')!.players!.find(player => player.position.includes('G'))!.name;
    act(() => view.result.current.chooseUpgradePlayer('Synthetic invalid candidate'));
    check(view.result.current.phase === 'powerup_use' && !view.result.current.teamUpgrades.CHI, 'UPGRADE INVALID: unknown roster names cannot consume an upgrade');
    act(() => view.result.current.chooseUpgradePlayer(chiPlayer));
    award(view, 'upgrade', 'BOS'); act(() => view.result.current.usePowerupNow());
    const bosPlayer = NBA_TEAM_MAP.get('BOS')!.players!.find(player => player.position.includes('G'))!.name;
    act(() => view.result.current.chooseUpgradePlayer(bosPlayer));
    check(view.result.current.teamUpgrades.CHI === chiPlayer && view.result.current.teamUpgrades.BOS === bosPlayer,
      'UPGRADE OWNERS: a second team keeps its own selection without erasing the first');
    battle(view, 'LAL', 3, true);
    check(!['CHI', 'BOS'].includes(view.result.current.defendingTeam!) && view.result.current.teamUpgrades.CHI === chiPlayer
      && view.result.current.teamUpgrades.BOS === bosPlayer, 'UPGRADE LIFETIME: unrelated battles preserve both upgrades');
    settle(view); if (view.result.current.pendingPowerup) act(() => view.result.current.savePowerupForLater());
    battle(view, 'CHI', 7);
    const call = calls.at(-1)!;
    check(call.args[7]?.CHI === chiPlayer && !view.result.current.teamUpgrades.CHI && view.result.current.teamUpgrades.BOS === bosPlayer,
      'UPGRADE BATTLE: the next owner battle receives and consumes only its selected boost');
    const random = seeded(call.seed); for (let index = 0; index < call.offset; index += 1) random();
    vi.mocked(Math.random).mockImplementation(random);
    const baselineArgs = [...call.args] as SimArgs; baselineArgs[4] = null; baselineArgs[5] = null; baselineArgs[7] = {};
    const baseline = simulator(...baselineArgs);
    check(playerPoints(call.result, 'att', chiPlayer) !== playerPoints(baseline, 'att', chiPlayer),
      'UPGRADE EFFECT: the selected player changes the real seeded box score');
  });

  it('applies a selected upgrade while its owner defends and then consumes it', () => {
    const view = mount(THREE); award(view, 'upgrade'); act(() => view.result.current.usePowerupNow());
    const player = NBA_TEAM_MAP.get('CHI')!.players!.find(item => item.position.includes('G'))!.name;
    act(() => view.result.current.chooseUpgradePlayer(player));
    const enemy = view.result.current.aliveTeams().find(id => id !== 'CHI')!;
    battle(view, enemy, 8);
    const call = calls.at(-1)!;
    check(call.args[1] === 'CHI' && call.args[7]?.CHI === player && !view.result.current.teamUpgrades.CHI,
      'UPGRADE DEFENSE: a defender receives and consumes its own selected boost');
    const random = seeded(call.seed); for (let index = 0; index < call.offset; index += 1) random();
    vi.mocked(Math.random).mockImplementation(random);
    const baselineArgs = [...call.args] as SimArgs; baselineArgs[7] = {};
    const baseline = simulator(...baselineArgs);
    check(playerPoints(call.result, 'def', player) !== playerPoints(baseline, 'def', player),
      'UPGRADE DEFENSE EFFECT: the defending player changes the real seeded box score');
  });

  it('applies both selected upgrades in the same real simulated battle', () => {
    const view = mount();
    const chi = NBA_TEAM_MAP.get('CHI')!.players!.find(item => item.position.includes('G'))!.name;
    const bos = NBA_TEAM_MAP.get('BOS')!.players!.find(item => item.position.includes('G'))!.name;
    let attackerGain = 0, defenderGain = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      vi.mocked(Math.random).mockImplementation(seeded(seed));
      const baseline = simulator('CHI', 'BOS', view.result.current.territories, view.result.current.rosters, null, null, undefined, {});
      vi.mocked(Math.random).mockImplementation(seeded(seed));
      const upgraded = simulator('CHI', 'BOS', view.result.current.territories, view.result.current.rosters, null, null, undefined, { CHI: chi, BOS: bos });
      attackerGain += playerPoints(upgraded, 'att', chi)! - playerPoints(baseline, 'att', chi)!;
      defenderGain += playerPoints(upgraded, 'def', bos)! - playerPoints(baseline, 'def', bos)!;
    }
    console.log(`BOTH UPGRADES: mean player point gains ${attackerGain / 40}, ${defenderGain / 40}`);
    check(attackerGain / 40 > 2 && defenderGain / 40 > 2, 'UPGRADE BOTH: both selected players improve in paired real simulations');
  });

  it('keeps ordinary NBA players distinct from activated legends across teams', () => {
    const duran = NBA_TEAM_MAP.get('HOU')!.players!.find(player => player.name === 'Kevin Durant')!;
    const lebron = CONQUEST_FREE_AGENCY_POOL_NBA.find(player => player.name === 'LeBron James')!;
    check(battleLib.getNbaRosterPlayer(duran.name, 'OKC', new Set())?.overall === duran.overall
      && battleLib.getNbaRosterPlayer(lebron.name, 'CLE', new Set())?.overall === lebron.overall,
      'LEGEND ORDINARY: a familiar franchise name alone cannot turn an ordinary player into a legend');
    const activated = new Set([duran.name, lebron.name]);
    check(battleLib.getNbaRosterPlayer(duran.name, 'CHI', activated)?.overall === 99
      && battleLib.getNbaRosterPlayer(lebron.name, 'BOS', activated)?.overall === 99,
      'LEGEND TRANSFER: explicit activation preserves legend strength after a roster transfer');
  });
  it('adds a franchise legend once and ignores replayed use clicks', () => {
    const view = mount(); award(view, 'legend');
    const legend = TEAM_LEGENDS_NBA.CHI.name, use = view.result.current.usePowerupNow;
    act(() => { use(); use(); });
    check(view.result.current.rosters.CHI.filter(name => name === legend).length === 1 && view.result.current.phase === 'ready' && view.result.current.legendPlayers.has(legend),
      'LEGEND: the existing franchise great joins once');
    award(view, 'legend'); act(() => view.result.current.usePowerupNow());
    check(view.result.current.rosters.CHI.filter(name => name === legend).length === 1, 'LEGEND REPEAT: a second reward cannot duplicate a roster legend');
    act(() => view.result.current.reset());
    check(view.result.current.legendPlayers.size === 0, 'LEGEND RESET: a fresh game clears activated legend metadata');
  });

  it('steals one chosen eligible region and rejects stale or invalid choices', () => {
    const view = mount(); award(view, 'territory_steal'); act(() => view.result.current.usePowerupNow());
    const { availablePowerupTerritories: choices, territories: before } = view.result.current;
    check(choices.length > 0 && choices.every(id => before[id] && before[id] !== 'CHI'), 'SETUP: enemy region choices exist');
    const chosen = choices[0], former = before[chosen]!, choose = view.result.current.choosePowerupTerritory;
    act(() => { choose('Synthetic invalid state'); choose('IL'); });
    check(same(before, view.result.current.territories) && view.result.current.phase === 'powerup_use', 'TERRITORY INVALID: only advertised enemy regions can be selected');
    act(() => { choose(chosen); choose(chosen); }); act(() => vi.advanceTimersByTime(2000));
    const changed = Object.keys(before).filter(id => before[id] !== view.result.current.territories[id]);
    check(same(changed, [chosen]) && view.result.current.territories[chosen] === 'CHI'
      && (Object.values(before).filter(owner => owner === former).length !== 1 || view.result.current.eliminated.includes(former)),
      'TERRITORY: the chosen region changes owner once and updates elimination');
  });

  it('removes a queued upgrade when its owner loses its final region to a power', () => {
    const view = mount({ PA_E: 'CHI', NJ_N: 'DET', NJ_S: 'MIL', DE: 'BOS', NY: 'NYK', MD: 'PHI', VA: 'LAL', WV: 'GSW' });
    award(view, 'territory_steal'); act(() => view.result.current.savePowerupForLater());
    award(view, 'territory_steal'); act(() => view.result.current.savePowerupForLater());
    award(view, 'upgrade', 'LAL'); act(() => view.result.current.usePowerupNow());
    const player = view.result.current.rosters.LAL[0];
    act(() => view.result.current.chooseUpgradePlayer(player));
    check(view.result.current.aliveTeams().includes('CHI') && view.result.current.getTeamTerritoryCount('LAL') === 2, 'SETUP: another owner holds two regions and an upgrade');
    for (let index = 0; index < 2; index += 1) {
      act(() => view.result.current.useSavedPowerup('CHI', 0)); act(() => view.result.current.usePowerupNow());
      const choice = view.result.current.availablePowerupTerritories.find(id => view.result.current.territories[id] === 'LAL');
      check(choice, 'SETUP: remaining upgraded enemy region is nearby');
      act(() => view.result.current.choosePowerupTerritory(choice));
      if (index === 0) check(view.result.current.teamUpgrades.LAL === player, 'ELIMINATION SURVIVAL: losing one region keeps a living owner upgrade');
    }
    check(view.result.current.getTeamTerritoryCount('LAL') === 0 && view.result.current.eliminated.includes('LAL') && !view.result.current.teamUpgrades.LAL,
      'ELIMINATION UPGRADE: taking the final region removes its owner queued upgrade');
  });
  it('lets empty selections return to the card and save without losing the power', () => {
    const view = mount({ IL: 'CHI', WI: 'MIL', CA_S: 'LAL' }); award(view, 'territory_steal');
    act(() => view.result.current.usePowerupNow());
    check(view.result.current.phase === 'powerup_use' && view.result.current.availablePowerupTerritories.length === 0, 'SETUP: distant remaining owner has no nearby region');
    act(() => view.result.current.cancelPowerupUse());
    check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.powerup.id === 'territory_steal', 'CANCEL: an unavailable choice returns its original reward card');
    act(() => view.result.current.savePowerupForLater());
    check(view.result.current.teamSavedPowerups.CHI.length === 1, 'CANCEL SAVE: the unspent reward can still be saved');
    dispose(view);
    const empty = mount(); award(empty, 'free_agent'); fixture.emptyPlayers = true;
    act(() => empty.result.current.usePowerupNow());
    check(empty.result.current.phase === 'powerup_use' && empty.result.current.freeAgentList.length === 0, 'EMPTY NBA: no eligible NBA data means no invented candidates');
    act(() => empty.result.current.cancelPowerupUse()); act(() => empty.result.current.savePowerupForLater());
    check(empty.result.current.teamSavedPowerups.CHI.length === 1, 'EMPTY SAVE: empty recruitment returns an unspent card');
  });

  it('finishes the map after a territory steal or battle without another reward', () => {
    const view = mount(THREE); award(view, 'territory_steal'); act(() => view.result.current.usePowerupNow());
    const choice = view.result.current.availablePowerupTerritories[0];
    check(choice, 'SETUP: final enemy is nearby');
    act(() => view.result.current.choosePowerupTerritory(choice)); act(() => vi.advanceTimersByTime(2000));
    check(view.result.current.phase === 'gameover' && view.result.current.aliveTeams().length === 1 && !view.result.current.pendingPowerup,
      'STEAL VICTORY: taking the final region ends the game');
    dispose(view);
    let exercised = false;
    for (let seed = 0; seed < 50 && !exercised; seed += 1) {
      const final = mount({ IL: 'CHI', WI: 'MIL' }), draws = fixture.draws, result = battle(final, 'CHI', seed);
      if (result.winner !== 'CHI') { dispose(final); continue; }
      settle(final);
      check(final.result.current.phase === 'gameover' && final.result.current.aliveTeams().length === 1
        && !final.result.current.pendingPowerup && fixture.draws === draws, 'FINAL REWARD: final conquests end without another reward');
      exercised = true; dispose(final);
    }
    check(exercised, 'SETUP: final attacker victory exercised');
  });

  it('cancels a confirmed player steal when the game resets', () => {
    const view = mount();
    let result = battle(view, 'CHI', 0);
    for (let seed = 1; result.winner !== 'CHI' && seed < 100; seed += 1) { settle(view); result = battle(view, 'CHI', seed); }
    check(result.winner === 'CHI', 'SETUP: attacker win awaits player choice');
    const player = view.result.current.rosters[result.loser][0];
    act(() => view.result.current.stealPlayer(player));
    check(view.result.current.playerConfirmed === player, 'SETUP: deferred player steal started');
    act(() => view.result.current.reset());
    const before = JSON.stringify({ rosters: view.result.current.rosters, territories: view.result.current.territories });
    act(() => vi.advanceTimersByTime(3000));
    check(view.result.current.phase === 'ready' && view.result.current.turn === 0 && !view.result.current.pendingPowerup
      && before === JSON.stringify({ rosters: view.result.current.rosters, territories: view.result.current.territories }),
      'RESET: deferred steals cannot mutate the fresh game');
  });

  it('cancels pending player-steal work when the hook unmounts', () => {
    const view = mount();
    let result = battle(view, 'CHI', 0);
    for (let seed = 1; result.winner !== 'CHI' && seed < 100; seed += 1) { settle(view); result = battle(view, 'CHI', seed); }
    act(() => view.result.current.stealPlayer(view.result.current.rosters[result.loser][0]));
    check(vi.getTimerCount() > 0, 'SETUP: confirmed steal has pending work');
    view.unmount();
    check(vi.getTimerCount() === 0, 'UNMOUNT: deferred player steals are canceled');
  });
});
