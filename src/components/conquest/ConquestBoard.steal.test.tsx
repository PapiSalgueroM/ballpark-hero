import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
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
  SUPABASE_URL: 'https://nfl-steal-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));
function fixture(overrides: Partial<ReturnType<typeof useConquest>> & { stealActionReady?: boolean; canStealPlayer?: (name: string) => boolean; canSkipSteal?: boolean } = {}) {
  const stats = { passingQb: 'Fixture quarterback', passingComp: 0, passingAtt: 0, passingYds: 0, passingTds: 0, passingInts: 0,
    rushingName: 'Fixture runner', rushingCarries: 0, rushingYds: 0, rushingTds: 0, receivingName: 'Fixture receiver', receivingCatches: 0, receivingYds: 0, receivingTds: 0, defenseName: 'Fixture defender', defenseStat: '0 sacks' };
  const simulation = { winner: 'att', plays: [], finalAttScore: 24, finalDefScore: 17, boxScore: { attStats: stats, defStats: stats } };
  const result = { winner: 'KC', loser: 'BUF', winScore: 24, loseScore: 17, simulation };
  const game = {
    phase: 'battle', turn: 0, territories: { MO: 'KC', NY: 'BUF' }, rosters: { KC: ['Patrick Mahomes'], BUF: ['Josh Allen', 'Patrick Mahomes'] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(), invincibleTeams: new Set(),
    teamUpgrades: {}, battleUpgrades: {}, legendPlayers: new Set(), powerupUnavailableReason: null,
    teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null, freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: 'KC', defendingTeam: 'BUF', direction: 'E', battleResult: result, boxScore: simulation.boxScore,
    stealModalOpen: false, pendingBattleApply: { attacker: 'KC', defender: 'BUF', result }, playerConfirmed: null,
    stealActionReady: true, canStealPlayer: (name: string) => name === 'Josh Allen', canSkipSteal: true,
    favoriteTeam: null, freeAgencyCooldownRemaining: 0, freeAgencyActionReady: false, freeAgencyPool: () => [],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => false, startBattle: vi.fn(), reset: vi.fn(), stealPlayer: vi.fn(), skipSteal: vi.fn(), openStealModal: vi.fn(), closeStealModal: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
  return game;
}
beforeEach(() => {
  boundary.started = true; boundary.calls.length = 0;
  vi.stubGlobal('fetch', () => boundary.deny('transport:fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { boundary.deny('transport:xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('transport:websocket'); } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => boundary.deny('storage:setItem'));
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => boundary.deny('storage:removeItem'));
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => boundary.deny('storage:clear'));
});
afterEach(() => {
  cleanup(); const calls = [...boundary.imports, ...boundary.calls];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  check(calls.length === 0, 'BOUNDARY: no backend, transport or browser storage writes');
});

describe('NFL pending battle steal controls', () => {
  it('dispatches the eligible loser choice for the shown winner', () => {
    const game = fixture({ stealModalOpen: true }); render(<ConquestBoard />);
    const dialog = within(screen.getByRole('dialog', { name: /Steal a Player/ }));
    check(!!dialog.queryByText(/Choose a player to add to Chiefs/), 'RECIPIENT: the picker names the current battle winner');
    const button = dialog.getByRole('button', { name: /Josh Allen/ });
    check(!button.hasAttribute('disabled'), 'ELIGIBLE: the permitted losing-roster player can be selected');
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.stealPlayer).mock.calls) === JSON.stringify([['Josh Allen']]), 'CHOICE: the selected eligible name reaches the hook');
  });
  it('disables a displayed player the hook cannot accept', () => {
    const game = fixture({ stealModalOpen: true }); render(<ConquestBoard />);
    const button = screen.getByRole('button', { name: /Patrick Mahomes/ });
    check(button.hasAttribute('disabled'), 'INELIGIBLE: a displayed inadmissible name is disabled');
    fireEvent.click(button);
    check(vi.mocked(game.stealPlayer).mock.calls.length === 0, 'INELIGIBLE ACTION: the disabled option does not dispatch');
  });
  it('does not reopen a picker for an inactive pending battle', () => {
    fixture({ stealActionReady: false }); render(<ConquestBoard />);
    check(!screen.queryByRole('button', { name: /Choose Your Player/ }), 'OPEN GUARD: an inactive battle cannot reopen the picker');
  });
  it('hides a stale open modal when the battle is inactive', () => {
    fixture({ stealModalOpen: true, stealActionReady: false }); render(<ConquestBoard />);
    check(!screen.queryByRole('dialog', { name: /Steal a Player/ }), 'MODAL GUARD: a stale open flag cannot expose inactive choices');
  });
  it('offers Continue when no losing-roster player is eligible', () => {
    const game = fixture({ canStealPlayer: () => false }); render(<ConquestBoard />);
    const button = screen.queryByRole('button', { name: 'Continue →' });
    check(!!button && !screen.queryByRole('button', { name: /Choose Your Player/ }), 'EMPTY CHOICES: no eligible name has a visible Continue exit');
    fireEvent.click(button!);
    check(vi.mocked(game.skipSteal).mock.calls.length === 1, 'CONTINUE ACTION: the empty-choice exit settles through the hook');
  });
  it('does not offer Continue without settlement permission', () => {
    fixture({ rosters: { KC: ['Patrick Mahomes'], BUF: [] }, canStealPlayer: () => false, canSkipSteal: false }); render(<ConquestBoard />);
    check(!screen.queryByRole('button', { name: 'Continue →' }), 'CONTINUE GUARD: empty choices alone cannot bypass settlement permission');
  });
  it('keeps Continue hidden when a player can be selected', () => {
    fixture(); render(<ConquestBoard />);
    check(!screen.queryByRole('button', { name: 'Continue →' }) && !!screen.queryByRole('button', { name: /Choose Your Player/ }), 'PICK FIRST: eligible choices keep the player selection flow');
  });
  it('shows confirmation while all further steal controls are closed', () => {
    fixture({ playerConfirmed: 'Josh Allen', stealActionReady: false, canSkipSteal: false, stealModalOpen: true }); render(<ConquestBoard />);
    check(!!screen.queryByText(/Josh Allen acquired!/) && !screen.queryByRole('dialog', { name: /Steal a Player/ }) && !screen.queryByRole('button', { name: /Choose Your Player|Continue →|Next Battle/ }), 'CONFIRMATION: the selected player is shown without another settlement action');
  });
  it('keeps Close and Escape connected to box-score review and reopening', () => {
    const game = fixture({ stealModalOpen: true }), view = render(<ConquestBoard />);
    const dialog = screen.getByRole('dialog', { name: /Steal a Player/ });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' })); fireEvent.keyDown(dialog, { key: 'Escape' });
    check(vi.mocked(game.closeStealModal).mock.calls.length === 2, 'DISMISS: Close and Escape preserve the box-score review action');
    vi.mocked(useConquest).mockReturnValue({ ...game, stealModalOpen: false }); view.rerender(<ConquestBoard />);
    fireEvent.click(screen.getByRole('button', { name: /Choose Your Player/ }));
    check(vi.mocked(game.openStealModal).mock.calls.length === 1 && vi.mocked(game.skipSteal).mock.calls.length === 0, 'REOPEN: reviewing the score can reopen the same unspent choice');
  });
  it('explains reviewing and finishing a player choice', () => {
    render(<ConquestHowToPlay open onOpenChange={() => {}} />);
    check(!!screen.queryByText(/Close the picker.*box score.*reopen.*choose one player/i), 'HELP REVIEW: closing and reopening preserves one player choice');
    check(!!screen.queryByText(/no eligible players.*Continue.*finish the battle/i), 'HELP CONTINUE: empty choices have an explained finish action');
  });
});
