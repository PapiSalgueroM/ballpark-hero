import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NBA_TEAM_MAP, NBA_TEAMS } from '@/data/conquestDataNba';
import { POWERUPS, type PowerupId } from '@/data/conquestPowerups';
import { useConquestNba } from '@/hooks/useConquestNba';
import ConquestBoardNba from './ConquestBoardNba';
import { ConquestHowToPlayNba } from './ConquestHowToPlayNba';

vi.mock('@/hooks/useConquestNba', () => ({ useConquestNba: vi.fn() }));
vi.mock('./ConquestRegionMap', () => ({ default: () => null, useOwnerTakeover: () => null }));

let owner: (typeof NBA_TEAMS)[number];
let other: (typeof NBA_TEAMS)[number];
let ownerPlayer: (typeof NBA_TEAMS)[number]['players'][number];
let otherPlayer: (typeof NBA_TEAMS)[number]['players'][number];
const check = (ok: boolean, message: string) => assert.ok(ok, message);
const boundary = vi.hoisted(() => ({
  unexpected: [] as string[],
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://nba-power-ui-fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, member) { return boundary.deny(`backend:${String(member)}`); } }),
}));
const power = (id: PowerupId) => POWERUPS.find(candidate => candidate.id === id)!;

function fixture(overrides: Partial<ReturnType<typeof useConquestNba>> = {}) {
  const game = {
    phase: 'ready', turn: 1, territories: { MA: 'BOS', IL: 'CHI' },
    rosters: { BOS: [ownerPlayer.name], CHI: [otherPlayer.name] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: {},
    invincibleTeams: new Set<string>(), legendPlayers: new Set<string>(), teamUpgrades: {}, battleUpgrades: {},
    teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null,
    powerupUnavailableReason: null, freeAgentList: [], availablePowerupTerritories: [],
    animStartTime: 0, attackingTeam: 'CHI', defendingTeam: 'BOS', direction: 'E',
    battleResult: null, stealModalOpen: false, pendingBattleApply: null,
    targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: null, freeAgencyCooldownRemaining: 0, availableFreeAgencyCandidates: [],
    aliveTeams: () => ['BOS', 'CHI'], getTeamTerritoryCount: () => 1,
    powerRankings: () => [], canSignFreeAgent: () => false,
    startBattle: vi.fn(), useSavedPowerup: vi.fn(), usePowerupNow: vi.fn(),
    savePowerupForLater: vi.fn(), cancelPowerupUse: vi.fn(), signFreeAgent: vi.fn(),
    chooseUpgradePlayer: vi.fn(), choosePowerupTerritory: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useConquestNba>;
  vi.mocked(useConquestNba).mockReturnValue(game);
  return game;
}

beforeEach(() => {
  owner = NBA_TEAM_MAP.get('BOS')!;
  other = NBA_TEAM_MAP.get('CHI')!;
  ownerPlayer = owner.players[0];
  otherPlayer = other.players[0];
  boundary.unexpected.length = 0;
  vi.stubGlobal('fetch', () => boundary.deny('transport:fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { boundary.deny('transport:xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('transport:websocket'); } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => boundary.deny('storage:setItem'));
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => boundary.deny('storage:removeItem'));
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => boundary.deny('storage:clear'));
});

afterEach(() => {
  cleanup();
  const unexpected = [...boundary.unexpected];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  check(unexpected.length === 0, 'BOUNDARY: no backend, transport or browser storage writes');
});

describe('NBA Arcade power controls', () => {
  it('opens the selected saved slot for its owner between battles', () => {
    const game = fixture({ teamSavedPowerups: { BOS: [power('upgrade'), power('free_agent')] } });
    render(<ConquestBoardNba />);
    expect(screen.getByText(/Saved powers last for this run/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: `Open ${owner.name} saved ${power('free_agent').label}, slot 2` });
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.useSavedPowerup).mock.calls) === JSON.stringify([['BOS', 1]]), 'SAVED: opens the selected owner and slot');
  });

  it('does not reopen saved powers while a battle runs', () => {
    const game = fixture({ phase: 'battle', teamSavedPowerups: { BOS: [power('upgrade')] } });
    render(<ConquestBoardNba />);
    const button = screen.getByRole('button', { name: /Open Celtics saved/ });
    check(button.hasAttribute('disabled'), 'PHASE: saved controls are disabled during battle');
    fireEvent.click(button);
    expect(game.useSavedPowerup).not.toHaveBeenCalled();
  });

  it('keeps saved powers reachable for every surviving team', () => {
    const game = fixture({
      aliveTeams: () => NBA_TEAMS.map(team => team.id),
      teamSavedPowerups: Object.fromEntries(NBA_TEAMS.map(team => [team.id, [power('upgrade')]])),
    });
    render(<ConquestBoardNba />);
    for (const team of NBA_TEAMS) {
      fireEvent.click(screen.getByRole('button', { name: `Open ${team.name} saved ${power('upgrade').label}, slot 1` }));
      check(JSON.stringify(vi.mocked(game.useSavedPowerup).mock.lastCall) === JSON.stringify([team.id, 0]), 'TEAMS: every surviving team can open its saved power');
    }
    expect(game.useSavedPowerup).toHaveBeenCalledTimes(NBA_TEAMS.length);
  });

  it('explains unavailable powers and the oldest replacement before saving', () => {
    const game = fixture({
      phase: 'powerup_received', pendingPowerup: { teamId: 'BOS', powerup: power('invincibility') },
      teamSavedPowerups: { BOS: [power('legend'), power('free_agent')] },
      powerupUnavailableReason: 'This team already has a shield.',
    });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog', { name: /Team Power/ });
    expect(dialog).toHaveAccessibleDescription(/for Celtics/);
    expect(within(dialog).getByRole('status')).toHaveTextContent('already has a shield');
    check(within(dialog).getByRole('button', { name: /Use Now/ }).hasAttribute('disabled'), 'UNAVAILABLE: power use remains disabled until available');
    check(!!within(dialog).queryByText(/Saving this one replaces the oldest/), 'CAPACITY: warn before replacing the oldest saved power');
    fireEvent.click(within(dialog).getByRole('button', { name: /Save for Later/ }));
    expect(game.savePowerupForLater).toHaveBeenCalledOnce();
    expect(game.usePowerupNow).not.toHaveBeenCalled();
  });

  it('uses the pending owner roster for upgrade selection', () => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'upgrade', pendingPowerup: { teamId: 'BOS', powerup: power('upgrade') } });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog', { name: 'Choose a Player to Upgrade' });
    expect(dialog).toHaveAccessibleDescription(/Celtics/);
    check(!within(dialog).queryByRole('button', { name: new RegExp(otherPlayer.name) })
      && !!within(dialog).queryByRole('button', { name: new RegExp(ownerPlayer.name) }), 'OWNER: only the pending owner roster is offered for upgrade');
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(ownerPlayer.name) }));
    check(JSON.stringify(vi.mocked(game.chooseUpgradePlayer).mock.calls) === JSON.stringify([[ownerPlayer.name]]), 'UPGRADE PICK: selected owner player reaches the power action');
  });

  it('signs the selected offered NBA player', () => {
    const game = fixture({
      phase: 'powerup_use', powerupUseType: 'free_agent',
      pendingPowerup: { teamId: 'BOS', powerup: power('free_agent') },
      freeAgentList: [otherPlayer],
    });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog', { name: 'Sign a Free Agent' });
    expect(dialog).toHaveAccessibleDescription(/Celtics/);
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(otherPlayer.name) }));
    check(JSON.stringify(vi.mocked(game.signFreeAgent).mock.calls) === JSON.stringify([[otherPlayer.name]]), 'SIGN: selected offered player reaches the power action');
  });

  it('offers only eligible territories and submits the selected region', () => {
    const game = fixture({
      phase: 'powerup_use', powerupUseType: 'territory_steal',
      pendingPowerup: { teamId: 'BOS', powerup: power('territory_steal') },
      availablePowerupTerritories: ['IL'],
    });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog', { name: 'Choose a Territory to Take' });
    expect(within(dialog).queryByRole('button', { name: /Massachusetts/ })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Illinois.*Bulls/ }));
    check(JSON.stringify(vi.mocked(game.choosePowerupTerritory).mock.calls) === JSON.stringify([['IL']]), 'TERRITORY: selected eligible region reaches the power action');
  });

  it.each([
    ['free_agent', /No eliminated NBA players are available/],
    ['upgrade', /no player to upgrade/],
    ['territory_steal', /No nearby enemy territory is available/],
  ] as const)('keeps an exit when %s has no choices', (id, message) => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: id, pendingPowerup: { teamId: 'BOS', powerup: power(id) }, rosters: { BOS: [], CHI: [] } });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(message)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to Power' }));
    check(vi.mocked(game.cancelPowerupUse).mock.calls.length === 1, `EMPTY: ${id} has an active way back to its card`);
  });

  it('returns to the pending card when the selector is closed', () => {
    const game = fixture({ phase: 'powerup_use', powerupUseType: 'upgrade', pendingPowerup: { teamId: 'BOS', powerup: power('upgrade') } });
    render(<ConquestBoardNba />);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    check(vi.mocked(game.cancelPowerupUse).mock.calls.length === 1, 'CLOSE: closing the selector returns to its card');
  });

  it('shows separate waiting upgrades for their respective teams', () => {
    fixture({ teamUpgrades: { BOS: ownerPlayer.name, CHI: otherPlayer.name } });
    render(<ConquestBoardNba />);
    check(!!screen.queryByText(`${ownerPlayer.name}: in-game 99 OVR for ${owner.name}'s next battle, home or away`, { exact: false })
      && !!screen.queryByText(`${otherPlayer.name}: in-game 99 OVR for ${other.name}'s next battle, home or away`, { exact: false }), 'UPGRADES: show every waiting owner and player');
  });

  it('shows each teams consumed battle upgrade on its own result roster', () => {
    fixture({
      phase: 'battle', stealModalOpen: true,
      battleResult: { winner: 'BOS', loser: 'CHI', winScore: 100, loseScore: 90 },
      battleUpgrades: { BOS: ownerPlayer.name, CHI: otherPlayer.name },
    });
    render(<ConquestBoardNba />);
    const dialog = screen.getByRole('dialog', { name: /Steal a Player/ });
    for (const team of [owner, other]) {
      const roster = within(dialog).getByText(`${team.name}'s Roster`).parentElement!;
      check(!!within(roster).queryByText('99'), 'BATTLE: both consumed upgrades appear on the correct result rosters');
    }
  });

  it('explains earning, banking and replaying a power in the help dialog', () => {
    const close = vi.fn();
    render(<ConquestHowToPlayNba open onOpenChange={close} />);
    expect(screen.getByText(/successful conquest earns the attacker one random power/)).toBeInTheDocument();
    check(!!screen.queryByText(/Save it, tap the saved arrow between battles, tap Use Now/), 'HELP: worked example covers reopening and using a saved power');
    expect(screen.getByText(/Other teams' battles do not use it/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start Conquering/ }));
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
  });
});
import { strict as assert } from 'node:assert';
