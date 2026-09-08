import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { CONQUEST_FREE_AGENCY_POOL, TEAM_MAP, NFL_TEAMS } from '@/data/conquestData';
import { POWERUPS, type PowerupId } from '@/data/conquestPowerups';
import { useConquest } from '@/hooks/useConquest';
import ConquestBoard from './ConquestBoard';
import { ConquestHowToPlay } from './ConquestHowToPlay';

vi.mock('@/hooks/useConquest', () => ({ useConquest: vi.fn() }));
vi.mock('./ConquestRegionMap', () => ({ default: () => null, useOwnerTakeover: () => null }));
const check = (ok: boolean, message: string) => assert.ok(ok, message);
const boundary = vi.hoisted(() => ({
  calls: [] as string[], imports: [] as string[], started: false,
  deny(message: string): never {
    if (!this.started) this.imports.push(message);
    this.calls.push(message); throw new Error(message);
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://nfl-powers-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));

function fixture(overrides: Partial<ReturnType<typeof useConquest>> = {}) {
  const game = {
    phase: 'ready', turn: 3, territories: { MO: 'KC', NY: 'BUF' }, rosters: { KC: [TEAM_MAP.get('KC')!.players![0].name], BUF: [TEAM_MAP.get('BUF')!.players![0].name] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(),
    invincibleTeams: new Set(), teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null,
    teamUpgrades: {}, battleUpgrades: {}, powerupUnavailableReason: null,
    freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: 'BUF', defendingTeam: 'KC', direction: 'E', battleResult: null,
    stealModalOpen: false, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: 'KC', freeAgencyCooldownRemaining: 0, freeAgencyActionReady: false,
    freeAgencyPool: () => [CONQUEST_FREE_AGENCY_POOL[0]],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => true, setFavoriteTeam: vi.fn(), signFreeAgencyCandidate: vi.fn(),
    startBattle: vi.fn(), reset: vi.fn(), useSavedPowerup: vi.fn(), usePowerupNow: vi.fn(), savePowerupForLater: vi.fn(), cancelPowerupUse: vi.fn(), signFreeAgent: vi.fn(), chooseUpgradePlayer: vi.fn(), stealTerritoryTarget: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
  return game;
}
const power = (id: PowerupId) => POWERUPS.find(power => power.id === id)!;
beforeEach(() => {
  boundary.started = true;
  boundary.calls.length = 0;
  vi.stubGlobal('fetch', () => boundary.deny('transport:fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { boundary.deny('transport:xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('transport:websocket'); } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => boundary.deny('storage:setItem'));
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => boundary.deny('storage:removeItem'));
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => boundary.deny('storage:clear'));
});
afterEach(() => {
  cleanup();
  const calls = [...boundary.imports, ...boundary.calls];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  check(calls.length === 0, 'BOUNDARY: no backend, transport or browser storage writes');
});

describe('NFL power controls', () => {
  it('reopens the chosen saved owner and slot', () => {
    const game = fixture({ teamSavedPowerups: { KC: [power('legend'), power('upgrade')] } });
    render(<ConquestBoard />);
    const button = screen.queryByRole('button', { name: `Open Chiefs saved ${power('upgrade').label}, slot 2` });
    check(!!button && !!screen.queryByText(/Saved powers last for this run/), 'SAVED: saved powers have named usable controls and run-only copy');
    fireEvent.click(button!);
    check(JSON.stringify(vi.mocked(game.useSavedPowerup).mock.calls) === JSON.stringify([['KC', 1]]), 'SAVED ACTION: the selected owner and slot reach the hook');
  });
  it.each([
    ['battle', { phase: 'battle' }], ['gameover', { phase: 'gameover' }],
    ['pending card', { phase: 'ready', pendingPowerup: { teamId: 'KC', powerup: { id: 'legend', label: 'Legend', icon: '', description: '' } } }],
    ['pending picker', { phase: 'ready', powerupUseType: 'upgrade' }],
  ] as const)('locks saved controls during %s', (label, state) => {
    fixture({ ...state, teamSavedPowerups: { KC: [power('upgrade')] } });
    render(<ConquestBoard />);
    const button = screen.queryByRole('button', { name: /Open Chiefs saved/ });
    check(!!button && button.hasAttribute('disabled'), `LOCK: ${label} blocks saved power use`);
    check(!screen.queryByRole('button', { name: /Start Conquest|Next Battle/ }), `TURN LOCK: ${label} blocks starting another turn`);
  });
  it('keeps saved powers reachable for every surviving team', () => {
    const game = fixture({ aliveTeams: () => NFL_TEAMS.map(team => team.id), teamSavedPowerups: Object.fromEntries(NFL_TEAMS.map(team => [team.id, [power('upgrade')]])) });
    render(<ConquestBoard />);
    for (const team of NFL_TEAMS) {
      const button = screen.queryByRole('button', { name: `Open ${team.name} saved ${power('upgrade').label}, slot 1` });
      check(!!button, 'TEAMS: every surviving team has a reachable saved control');
      fireEvent.click(button!);
    }
    check(vi.mocked(game.useSavedPowerup).mock.calls.length === NFL_TEAMS.length, 'TEAM ACTIONS: all surviving saved owners can be opened');
  });
  it('offers the correct award recipient and saves on dismissal', () => {
    const game = fixture({ phase: 'powerup_received', pendingPowerup: { teamId: 'KC', powerup: power('upgrade') }, teamSavedPowerups: { KC: [power('legend'), power('free_agent')] } });
    render(<ConquestBoard />);
    const dialog = screen.getByRole('dialog', { name: /Power-Up Found!/ }), ui = within(dialog);
    check(!!ui.queryByText('Chiefs') && !!ui.queryByText(/oldest will be replaced/), 'AWARD: the owner and oldest-slot replacement are visible');
    fireEvent.click(ui.getByRole('button', { name: /Use Now/ }));
    check(vi.mocked(game.usePowerupNow).mock.calls.length === 1, 'USE: Use Now dispatches the pending power');
    fireEvent.click(ui.getByRole('button', { name: /Save for Later/ }));
    fireEvent.click(ui.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    check(vi.mocked(game.savePowerupForLater).mock.calls.length === 3, 'DISMISS: Save, Close and Escape each bank the pending card');
  });
  it.each([
    ['free_agent', /Sign a Free Agent/, /No offered players/],
    ['upgrade', /Upgrade a Player/, /No roster players/],
    ['territory_steal', /Steal a Territory/, /No bordering states/],
  ] as const)('provides safe exits for the empty %s picker', (id, title, empty) => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: id, powerupTeam: 'KC', pendingPowerup: { teamId: 'KC', powerup: power(id) }, rosters: { KC: [], BUF: [] } });
    render(<ConquestBoard />);
    const dialog = screen.getByRole('dialog', { name: title }), ui = within(dialog);
    check(!!ui.queryByText(empty), `EMPTY: ${id} explains the empty picker`);
    const description = document.getElementById(dialog.getAttribute('aria-describedby') || '');
    check(!!description?.textContent?.includes('Chiefs'), `RECIPIENT: ${id} describes the power owner`);
    const back = ui.queryByRole('button', { name: 'Back to Power' });
    check(!!back, `BACK: ${id} has a return to the card`);
    fireEvent.click(back!); fireEvent.click(ui.getByRole('button', { name: 'Close' })); fireEvent.keyDown(dialog, { key: 'Escape' });
    check(vi.mocked(game.cancelPowerupUse).mock.calls.length === 3, `EXIT: ${id} preserves the card through Back, Close and Escape`);
  });
  it('submits the offered free agent', () => {
    const player = TEAM_MAP.get('BUF')!.players![0];
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'free_agent', powerupTeam: 'KC', pendingPowerup: { teamId: 'KC', powerup: power('free_agent') }, freeAgentList: [player] });
    render(<ConquestBoard />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(player.name) }));
    check(JSON.stringify(vi.mocked(game.signFreeAgent).mock.calls) === JSON.stringify([[player.name]]), 'AGENT: the offered player reaches the power action');
  });
  it('upgrades the power owner rather than the current attacker', () => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'upgrade', powerupTeam: 'KC', pendingPowerup: { teamId: 'KC', powerup: power('upgrade') } });
    render(<ConquestBoard />);
    const ui = within(screen.getByRole('dialog', { name: /Upgrade a Player/ }));
    check(!ui.queryByRole('button', { name: new RegExp(game.rosters.BUF[0]) }), 'OWNER: upgrade candidates belong to the power owner');
    fireEvent.click(ui.getByRole('button', { name: new RegExp(game.rosters.KC[0]) }));
    check(JSON.stringify(vi.mocked(game.chooseUpgradePlayer).mock.calls) === JSON.stringify([[game.rosters.KC[0]]]), 'UPGRADE: the selected owner player reaches the action');
  });
  it('submits the offered bordering state', () => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'territory_steal', powerupTeam: 'KC', pendingPowerup: { teamId: 'KC', powerup: power('territory_steal') }, stealCandidates: [{ stateId: 'NY', stateName: 'New York', ownerId: 'BUF' }] });
    render(<ConquestBoard />);
    fireEvent.click(screen.getByRole('button', { name: /New York.*Bills/ }));
    check(JSON.stringify(vi.mocked(game.stealTerritoryTarget).mock.calls) === JSON.stringify([['NY']]), 'TERRITORY: the offered bordering state reaches the action');
  });
  it('preserves both optional random-choice actions', () => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'upgrade', powerupTeam: 'KC', pendingPowerup: { teamId: 'KC', powerup: power('upgrade') } });
    const view = render(<ConquestBoard />);
    fireEvent.click(screen.getByRole('button', { name: /Random player/ }));
    check(JSON.stringify(vi.mocked(game.chooseUpgradePlayer).mock.calls) === JSON.stringify([[]]), 'RANDOM PLAYER: random choice keeps its existing action');
    vi.mocked(useConquest).mockReturnValue({ ...game, powerupUseType: 'territory_steal' }); view.rerender(<ConquestBoard />);
    fireEvent.click(screen.getByRole('button', { name: /Auto-pick for me/ }));
    check(JSON.stringify(vi.mocked(game.stealTerritoryTarget).mock.calls) === JSON.stringify([[]]), 'RANDOM STATE: random state keeps its existing action');
  });
  it('explains earning, banking and returning to powers', () => {
    render(<ConquestHowToPlay open onOpenChange={() => {}} />);
    check(!!screen.queryByText(/marked neutral state.*2 saved powers per team.*oldest/), 'HELP BANK: instructions explain the original earning rule and saved capacity');
    check(!!screen.queryByText(/Back to Power.*Closing a picker.*Closing the power card/), 'HELP EXIT: instructions explain both dismissal paths');
    check(!!screen.queryByText(/For example.*Upgrade.*Save.*between turns/), 'HELP EXAMPLE: the saved power flow has a worked example');
  });
});
