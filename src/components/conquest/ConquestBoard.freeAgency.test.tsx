import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { CONQUEST_FREE_AGENCY_POOL } from '@/data/conquestData';
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
  SUPABASE_URL: 'https://free-agency-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));

function fixture(overrides: Partial<ReturnType<typeof useConquest>> = {}) {
  const game = {
    phase: 'ready', turn: 3, territories: { MO_W: 'KC', NY_W: 'BUF' }, rosters: { KC: [], BUF: [] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(),
    invincibleTeams: new Set(), teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null,
    freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: null, defendingTeam: null, direction: null, battleResult: null,
    stealModalOpen: false, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: 'KC', freeAgencyCooldownRemaining: 0, freeAgencyActionReady: true,
    freeAgencyPool: () => [CONQUEST_FREE_AGENCY_POOL[0]],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => true, setFavoriteTeam: vi.fn(), signFreeAgencyCandidate: vi.fn(),
    startBattle: vi.fn(), reset: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
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

describe('NFL free agency panel', () => {
  it('offers only surviving teams before choosing a favorite', () => {
    const game = fixture({ favoriteTeam: null });
    render(<ConquestBoard />);
    const ui = panel(), picker = ui.getByRole('combobox', { name: 'Pick your team' }) as HTMLSelectElement;
    check(JSON.stringify([...picker.options].map(option => option.value).sort()) === JSON.stringify(['', 'BUF', 'KC']), 'ALIVE: picker offers only surviving teams');
    fireEvent.change(picker, { target: { value: 'BUF' } });
    check(JSON.stringify(vi.mocked(game.setFavoriteTeam).mock.calls) === JSON.stringify([['BUF']]), 'PICK: selector dispatches the chosen favorite');
  });
  it('preserves the favorite badge and Change team flow', () => {
    const game = fixture();
    const view = render(<ConquestBoard />);
    const ui = panel();
    check(!!ui.queryByText('Kansas City Chiefs') && !ui.queryByRole('combobox'), 'BADGE: chosen favorite retains the compact team badge');
    fireEvent.click(ui.getByRole('button', { name: /Change team/ }));
    check(JSON.stringify(vi.mocked(game.setFavoriteTeam).mock.calls) === JSON.stringify([[null]]), 'CHANGE: Change team clears the favorite');
    vi.mocked(useConquest).mockReturnValue({ ...game, favoriteTeam: null });
    view.rerender(<ConquestBoard />);
    check(!!ui.queryByRole('combobox', { name: 'Pick your team' }) && !ui.queryByRole('button', { name: /Change team/ }), 'RETURN: clearing the favorite returns to the picker');
  });
  it('recovers an eliminated favorite through Change team', () => {
    fixture({ favoriteTeam: 'ATL', eliminated: ['ATL'] });
    render(<ConquestBoard />);
    const ui = panel();
    check(!!ui.queryByText('Your team was eliminated. Use Change team to pick a surviving team.')
      && !ui.getByRole('button', { name: /Change team/ }).hasAttribute('disabled'), 'ELIMINATED: a visible notice and Change team offer recovery');
    check(ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), 'ELIMINATED SIGN: eliminated favorites cannot receive a signing');
  });
  it.each([
    ['animating', { phase: 'animating' }],
    ['battle', { phase: 'battle' }],
    ['steal', { phase: 'steal' }],
    ['gameover', { phase: 'gameover' }],
    ['pending power', { phase: 'ready', pendingPowerup: { teamId: 'KC', powerup: { id: 'invincibility', label: 'Shield', icon: '', description: '' } } }],
    ['power picker', { phase: 'ready', powerupUseType: 'upgrade' }],
  ] as const)('locks all signing controls for %s', (label, state) => {
    const game = fixture({ ...state, freeAgencyActionReady: false });
    const view = render(<ConquestBoard />);
    const ui = panel();
    check(ui.getByRole('button', { name: /Change team/ }).hasAttribute('disabled')
      && ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), `LOCK: ${label} disables Change and Sign`);
    check(!!ui.queryByText(state.phase === 'gameover' ? /run is finished/ : /Finish this turn/), `STATUS: ${label} explains the lock`);
    vi.mocked(useConquest).mockReturnValue({ ...game, favoriteTeam: null });
    view.rerender(<ConquestBoard />);
    check(ui.getByRole('combobox', { name: 'Pick your team' }).hasAttribute('disabled'), `SELECT LOCK: ${label} disables the team picker`);
  });
  it('shows remaining settled battles without enabling an early signing', () => {
    fixture({ freeAgencyCooldownRemaining: 2 });
    render(<ConquestBoard />);
    const ui = panel();
    check(!!ui.queryByText('Available after 2 more settled battles.') && ui.getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), 'COOLDOWN: remaining settled battles keep signing disabled');
  });
  it('honors hook denial even when the visible cooldown is clear', () => {
    fixture({ canSignFreeAgent: () => false });
    render(<ConquestBoard />);
    check(panel().getAllByRole('button', { name: /^Sign / }).every(button => button.hasAttribute('disabled')), 'HOOK GATE: the guarded hook retains final signing eligibility');
  });
  it('offers the dynamic pool and signs the selected entry for its recipient', () => {
    const candidates = [CONQUEST_FREE_AGENCY_POOL[0], { ...CONQUEST_FREE_AGENCY_POOL[1], blurb: 'Hit the market when the Falcons fell' }];
    const game = fixture({ freeAgencyPool: () => candidates });
    render(<ConquestBoard />);
    const ui = panel(), buttons = ui.queryAllByRole('button', { name: /^Sign / });
    check(buttons.length === 2 && buttons[1].getAttribute('aria-label') === `Sign ${candidates[1].name} for Chiefs`, 'CANDIDATES: only the supplied pool is offered with its recipient');
    check(!!ui.queryByText('Hit the market when the Falcons fell'), 'DYNAMIC: simulated eliminated-team notes remain visible');
    check(!!ui.queryByText('Arcade player pool. Availability follows the rosters in this run.'), 'COPY: availability describes the simulated run');
    fireEvent.click(buttons[1]);
    check(JSON.stringify(vi.mocked(game.signFreeAgencyCandidate).mock.calls) === JSON.stringify([[candidates[1]]]), 'SIGN: selected candidate reaches the guarded hook action');
  });
  it('keeps Change team usable when the pool is empty', () => {
    fixture({ freeAgencyPool: () => [] });
    render(<ConquestBoard />);
    const ui = panel();
    check(ui.queryAllByRole('button', { name: /^Sign / }).length === 0 && !!ui.queryByText('No players from this Arcade pool are available.')
      && !ui.getByRole('button', { name: /Change team/ }).hasAttribute('disabled'), 'EMPTY: no stale candidates and an active Change team remain');
  });
  it('explains the signing cost and shared cooldown in the guide', () => {
    render(<ConquestHowToPlay open onOpenChange={() => {}} />);
    check(!!screen.queryByText(/settle 3 battles to unlock a signing.*lowest-rated in-game player.*\+2 team-rating bonus.*rating caps.*queued upgrade.*waived.*Changing teams does not reset the cooldown.*pending power/), 'HELP: guide explains waiver, capped bonus and the shared three-battle cooldown');
    check(!!screen.queryByText(/after your third settled battle.*3 more settled battles.*neutral state does not count/), 'EXAMPLE: guide distinguishes battles from neutral claims');
  });
});

