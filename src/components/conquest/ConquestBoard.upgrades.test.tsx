import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { TEAM_MAP } from '@/data/conquestData';
import { POWERUPS } from '@/data/conquestPowerups';
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
  SUPABASE_URL: 'https://nfl-upgrades-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));
function fixture(overrides: Partial<ReturnType<typeof useConquest>> = {}) {
  const game = {
    phase: 'ready', turn: 3, territories: { MO: 'KC', NY: 'BUF' },
    rosters: { KC: TEAM_MAP.get('KC')!.players!.map(player => player.name), BUF: TEAM_MAP.get('BUF')!.players!.map(player => player.name) },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(), invincibleTeams: new Set(),
    teamUpgrades: {}, battleUpgrades: {}, powerupUnavailableReason: null,
    teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null, freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: 'BUF', defendingTeam: 'KC', direction: 'E', battleResult: { winner: 'KC', loser: 'BUF', winScore: 24, loseScore: 17 },
    stealModalOpen: false, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: null, freeAgencyCooldownRemaining: 0, freeAgencyActionReady: false, freeAgencyPool: () => [],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => false, startBattle: vi.fn(), reset: vi.fn(), usePowerupNow: vi.fn(), savePowerupForLater: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
  return game;
}
function cells(title: string, name: string) {
  const roster = within(screen.getByText(title).parentElement!);
  return within(roster.getByRole('row', { name: new RegExp(name) })).getAllByRole('cell').map(cell => cell.textContent);
}
function pending() {
  return fixture({ phase: 'powerup_received', teamUpgrades: { KC: TEAM_MAP.get('KC')!.players![0].name },
    pendingPowerup: { teamId: 'KC', powerup: POWERUPS.find(power => power.id === 'upgrade')! },
    powerupUnavailableReason: 'Chiefs already have an upgrade queued for their next battle.' });
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

describe('NFL owner upgrade display', () => {
  it('shows every queued owner with the selected player', () => {
    const game = fixture({ teamUpgrades: { KC: 'Patrick Mahomes', BUF: 'Josh Allen' } });
    render(<ConquestBoard />);
    const banners = screen.queryAllByText(/boosted to 99 OVR for/).map(node => node.textContent);
    check(banners.length === 2 && Object.entries(game.teamUpgrades).every(([id, player]) => banners.some(text => text?.includes(player) && text.includes(`${TEAM_MAP.get(id)!.name}'s next battle`))), 'QUEUE: each queued player is paired with its own team');
  });
  it.each([['KC', "Chiefs's Roster"], ['BUF', "Bills's Roster"]])('shows the consumed battle snapshot for %s', (id, title) => {
    const player = TEAM_MAP.get(id)!.players![0];
    fixture({ stealModalOpen: true, battleUpgrades: { [id]: player.name } });
    render(<ConquestBoard />);
    const row = cells(title, player.name);
    check(row[0]!.includes('⬆️') && row[1] === player.position && row[2] === '99' && row[3] === player.keyStat, `SNAPSHOT: ${id} shows its consumed boost with original card metadata`);
    const otherId = id === 'KC' ? 'BUF' : 'KC', other = TEAM_MAP.get(otherId)!.players![0];
    const otherRow = cells(`${TEAM_MAP.get(otherId)!.name}'s Roster`, other.name);
    check(!otherRow[0]!.includes('⬆️') && otherRow[2] === String(other.overall), `ISOLATION: ${id} does not boost the other team's roster`);
  });
  it('keeps queued boosts out of the prior battle roster', () => {
    fixture({ stealModalOpen: true, teamUpgrades: { KC: 'Patrick Mahomes', BUF: 'Josh Allen' }, battleUpgrades: {} });
    render(<ConquestBoard />);
    for (const id of ['KC', 'BUF']) {
      const player = TEAM_MAP.get(id)!.players![0], row = cells(`${TEAM_MAP.get(id)!.name}'s Roster`, player.name);
      check(!row[0]!.includes('⬆️') && row[2] === String(player.overall), 'PRIOR BATTLE: pending upgrades do not rewrite either old roster');
    }
  });
  it('explains and blocks a duplicate owner upgrade', () => {
    const game = pending(); render(<ConquestBoard />);
    const dialog = within(screen.getByRole('dialog', { name: /Power-Up Found/ }));
    check(dialog.queryByRole('status')?.textContent === game.powerupUnavailableReason, 'DUPLICATE REASON: the pending card explains why use is unavailable');
    const use = dialog.getByRole('button', { name: /Use Now/ });
    check(use.hasAttribute('disabled'), 'DUPLICATE LOCK: Use Now cannot replace the queued owner upgrade');
    fireEvent.click(use);
    check(vi.mocked(game.usePowerupNow).mock.calls.length === 0, 'DUPLICATE ACTION: disabled Use Now does not dispatch');
  });
  it('keeps saving and dismissal available for a duplicate card', () => {
    const game = pending(); render(<ConquestBoard />);
    const dialog = screen.getByRole('dialog', { name: /Power-Up Found/ }), ui = within(dialog);
    const save = ui.getByRole('button', { name: /Save for Later/ });
    check(!save.hasAttribute('disabled'), 'DUPLICATE SAVE: a deferred duplicate can still be banked');
    fireEvent.click(save); fireEvent.click(ui.getByRole('button', { name: 'Close' })); fireEvent.keyDown(dialog, { key: 'Escape' });
    check(vi.mocked(game.savePowerupForLater).mock.calls.length === 3, 'DUPLICATE EXITS: Save, Close and Escape retain the duplicate card');
  });
  it('explains team-specific lifetime and independent queues', () => {
    render(<ConquestHowToPlay open onOpenChange={() => {}} />);
    check(screen.getAllByRole('listitem').some(item => /Upgrade:.*that team's next actual battle/.test(item.textContent || '')), 'HELP OWNER: the boost lasts until its owner actually battles');
    check(!!screen.queryByText(/Neutral claims and other teams.*keep.*queued.*Different teams.*own upgrades/), 'HELP PRESERVE: neutral claims and unrelated teams preserve separate upgrades');
    check(!!screen.queryByText(/already has an upgrade queued.*Save for Later/), 'HELP DUPLICATE: a second owner upgrade can be saved');
  });
});
