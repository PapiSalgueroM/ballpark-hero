import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { CONQUEST_FREE_AGENCY_POOL_NBA } from '@/data/conquestDataNba';
import { useConquestNba } from '@/hooks/useConquestNba';
import ConquestBoardNba from './ConquestBoardNba';
import { ConquestHowToPlayNba } from './ConquestHowToPlayNba';

vi.mock('@/hooks/useConquestNba', () => ({ useConquestNba: vi.fn() }));
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
  SUPABASE_URL: 'https://free-agency-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));

function fixture(overrides: Partial<ReturnType<typeof useConquestNba>> = {}) {
  const game = {
    phase: 'ready', turn: 3, territories: { MA: 'BOS', IL: 'CHI' }, rosters: { BOS: [], CHI: [] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(),
    invincibleTeams: new Set(), legendPlayers: new Set(), teamUpgrades: {}, battleUpgrades: {},
    teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null, powerupUnavailableReason: null,
    freeAgentList: [], availablePowerupTerritories: [], animStartTime: 0,
    attackingTeam: null, defendingTeam: null, direction: null, battleResult: null,
    stealModalOpen: false, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: 'BOS', freeAgencyCooldownRemaining: 0,
    availableFreeAgencyCandidates: [CONQUEST_FREE_AGENCY_POOL_NBA[0]],
    aliveTeams: () => ['BOS', 'CHI'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => true, setFavoriteTeam: vi.fn(), signFreeAgencyCandidate: vi.fn(),
    startBattle: vi.fn(), reset: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquestNba>;
  vi.mocked(useConquestNba).mockReturnValue(game);
  return game;
}
function panel() {
  const summary = screen.getByText('✍️ Free Agency', { selector: 'summary' });
  fireEvent.click(summary);
  return within(summary.closest('details')!);
}
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

describe('NBA free agency panel', () => {
  it('keeps a controlled live-team picker after choosing a favorite', () => {
    const game = fixture();
    const view = render(<ConquestBoardNba />);
    const ui = panel(), picker = ui.queryByRole('combobox', { name: 'Pick your team' }) as HTMLSelectElement | null;
    check(!!picker && picker.value === 'BOS', 'PICKER: chosen favorite retains its controlled selector');
    check(JSON.stringify([...picker!.options].map(option => option.value).sort()) === JSON.stringify(['', 'BOS', 'CHI']), 'ALIVE: picker offers only surviving teams');
    fireEvent.change(picker!, { target: { value: 'CHI' } });
    check(JSON.stringify(vi.mocked(game.setFavoriteTeam).mock.calls) === JSON.stringify([['CHI']]), 'CHANGE: picker dispatches the new favorite');
    vi.mocked(useConquestNba).mockReturnValue({ ...game, favoriteTeam: 'CHI' });
    view.rerender(<ConquestBoardNba />);
    check((ui.getByRole('combobox', { name: 'Pick your team' }) as HTMLSelectElement).value === 'CHI', 'CONTROLLED: picker follows the current favorite');
    vi.mocked(useConquestNba).mockReturnValue({ ...game, favoriteTeam: 'BOS' });
    view.rerender(<ConquestBoardNba />);
    check((ui.getByRole('combobox', { name: 'Pick your team' }) as HTMLSelectElement).value === 'BOS', 'CONTROLLED: picker follows the current favorite');
  });
  it('clears an eliminated favorite and offers a replacement', () => {
    fixture({ favoriteTeam: 'LAL', eliminated: ['LAL'] });
    render(<ConquestBoardNba />);
    const ui = panel(), picker = ui.queryByRole('combobox') as HTMLSelectElement | null;
    check(!!picker && picker.value === '' && !!ui.queryByText(/Lakers have been eliminated/), 'ELIMINATED: old favorite clears with a visible recovery notice');
    check(ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), 'ELIMINATED SIGN: choose a surviving favorite before signing');
  });
  it.each(['animating', 'battle', 'powerup_received', 'gameover'] as const)('locks team changes and signing during %s', phase => {
    fixture({ phase });
    render(<ConquestBoardNba />);
    const ui = panel(), picker = ui.getByRole('combobox');
    check(picker.hasAttribute('disabled') && ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), `PHASE: ${phase} locks both free-agency actions`);
    check(!!ui.queryByText(phase === 'gameover' ? /run is finished/ : /Finish this turn/), `STATUS: ${phase} explains why signing is locked`);
  });
  it('shows remaining settled battles without enabling an early signing', () => {
    fixture({ freeAgencyCooldownRemaining: 2 });
    render(<ConquestBoardNba />);
    const ui = panel();
    check(!!ui.queryByText('Available after 2 more settled battles.') && ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), 'COOLDOWN: remaining settled battles keep signing disabled');
  });
  it('offers only supplied candidates and signs the selected entry', () => {
    const game = fixture();
    render(<ConquestBoardNba />);
    const ui = panel(), candidate = game.availableFreeAgencyCandidates[0];
    const buttons = ui.queryAllByRole('button', { name: /^Sign / });
    check(buttons.length === 1 && buttons[0].getAttribute('aria-label') === `Sign ${candidate.name} for Celtics`, 'CANDIDATES: only the hook-approved pool is offered');
    check(!!ui.queryByText('Arcade player pool. Availability follows the rosters in this run.'), 'COPY: availability describes the simulated run');
    fireEvent.click(buttons[0]);
    check(JSON.stringify(vi.mocked(game.signFreeAgencyCandidate).mock.calls) === JSON.stringify([[candidate]]), 'SIGN: selected candidate reaches the guarded hook action');
  });
  it('keeps team selection usable when the available pool is empty', () => {
    fixture({ availableFreeAgencyCandidates: [] });
    render(<ConquestBoardNba />);
    const ui = panel();
    check(ui.queryAllByRole('button', { name: /^Sign / }).length === 0 && !!ui.queryByText(/No players from this Arcade pool are available/)
      && !ui.getByRole('combobox').hasAttribute('disabled'), 'EMPTY: no stale candidates and an active team picker remain');
  });
  it('explains the signing cost and shared cooldown in the guide', () => {
    render(<ConquestHowToPlayNba open onOpenChange={() => {}} />);
    check(!!screen.queryByText(/settle 3 battles to unlock a signing.*lowest-rated in-game player.*Changing teams does not reset the cooldown/), 'HELP: guide explains waiver and the shared three-battle cooldown');
  });
});
