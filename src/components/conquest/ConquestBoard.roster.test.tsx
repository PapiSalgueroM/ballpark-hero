import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { CONQUEST_FREE_AGENCY_POOL, TEAM_MAP } from '@/data/conquestData';
import { FREE_AGENTS, TEAM_LEGENDS } from '@/data/conquestPowerups';
import { useConquest } from '@/hooks/useConquest';
import ConquestBoard from './ConquestBoard';

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
  SUPABASE_URL: 'https://nfl-roster-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));

function fixture(overrides: Partial<ReturnType<typeof useConquest>> = {}) {
  const game = {
    phase: 'steal', turn: 3, territories: { MO: 'KC', NY: 'BUF' }, rosters: { KC: [], BUF: [] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(),
    invincibleTeams: new Set(), teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null,
    freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: 'KC', defendingTeam: 'BUF', direction: 'E', battleResult: { winner: 'KC', loser: 'BUF', winScore: 24, loseScore: 17 },
    stealModalOpen: true, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: 'KC', freeAgencyCooldownRemaining: 0, freeAgencyActionReady: false,
    freeAgencyPool: () => [CONQUEST_FREE_AGENCY_POOL[0]],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => true, setFavoriteTeam: vi.fn(), signFreeAgencyCandidate: vi.fn(),
    startBattle: vi.fn(), reset: vi.fn(), stealPlayer: vi.fn(), chooseUpgradePlayer: vi.fn(), closeStealModal: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
  return game;
}
function roster(title: string) {
  return within(screen.getByText(title).parentElement!);
}
function rowCells(title: string, name: string) {
  const row = roster(title).getByRole('row', { name: new RegExp(name) });
  return within(row).getAllByRole('cell').map(cell => cell.textContent);
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
describe('NFL acquired roster cards', () => {
  it.each([['KC', "Chiefs's Roster"], ['BUF', "Bills's Roster"]])('shows transferred roster metadata for %s', (teamId, title) => {
    const player = TEAM_MAP.get('GB')!.players!.find(player => player.name === 'Micah Parsons')!;
    fixture({ rosters: { KC: [], BUF: [], [teamId]: [player.name] } });
    render(<ConquestBoard />);
    check(JSON.stringify(rowCells(title, player.name)) === JSON.stringify([player.name, player.position, String(player.overall), player.keyStat]), `ROSTER: ${teamId} keeps transferred position, rating and key stat`);
  });
  it('retains original cards, own legends and queued upgrade display', () => {
    const player = TEAM_MAP.get('KC')!.players![0], legend = TEAM_LEGENDS.KC;
    fixture({ rosters: { KC: [player.name, legend.name], BUF: [] }, upgradedPlayer: player.name });
    render(<ConquestBoard />);
    const original = rowCells("Chiefs's Roster", player.name), legendCells = rowCells("Chiefs's Roster", legend.name);
    check(original[0]!.includes('⬆️') && original[1] === player.position && original[2] === '99' && original[3] === player.keyStat, 'ORIGINAL: owner card and queued upgrade display remain intact');
    check(legendCells[0]!.includes('🐐') && legendCells[1] === legend.position && legendCells[2] === '99' && legendCells[3] === 'Legend', 'LEGEND: own-team legend presentation keeps its priority');
  });
  it('shows pool-only metadata without inventing a key stat', () => {
    const player = FREE_AGENTS.find(player => player.name === 'Earl Thomas')!;
    fixture({ rosters: { KC: [player.name], BUF: [] } });
    render(<ConquestBoard />);
    check(JSON.stringify(rowCells("Chiefs's Roster", player.name)) === JSON.stringify([player.name, player.position, String(player.overall), '-']), 'POOL: a pool-only player has a card with an unknown key-stat fallback');
  });
  it('keeps the unknown-player fallback in the roster and picker', () => {
    fixture({ rosters: { KC: [], BUF: ['Unknown roster fixture'] } });
    render(<ConquestBoard />);
    check(JSON.stringify(rowCells("Bills's Roster", 'Unknown roster fixture')) === JSON.stringify(['Unknown roster fixture', '-', '-', '-']), 'UNKNOWN: missing cards retain explicit roster fallbacks');
    const button = screen.getByRole('button', { name: /Unknown roster fixture/ });
    check(button.textContent === 'Unknown roster fixture', 'UNKNOWN PICKER: missing cards keep the original name-only option');
  });
  it('shows transferred metadata in the steal picker and dispatches its name', () => {
    const player = TEAM_MAP.get('GB')!.players!.find(player => player.name === 'Micah Parsons')!;
    const game = fixture({ rosters: { KC: [], BUF: [player.name] } });
    render(<ConquestBoard />);
    const button = screen.getByRole('button', { name: new RegExp(player.name) });
    check(button.textContent === `${player.name}${player.position} · ${player.overall} OVR · ${player.keyStat}`, 'STEAL: transferred candidate retains position, rating and key stat');
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.stealPlayer).mock.calls) === JSON.stringify([[player.name]]), 'STEAL ACTION: selected acquired name reaches the hook');
  });
  it('shows transferred metadata in the upgrade picker and dispatches its name', () => {
    const player = TEAM_MAP.get('GB')!.players!.find(player => player.name === 'Micah Parsons')!;
    const game = fixture({ phase: 'powerup_use', stealModalOpen: false, powerupUseType: 'upgrade', powerupTeam: 'KC', rosters: { KC: [player.name], BUF: [] } });
    render(<ConquestBoard />);
    const button = screen.getByRole('button', { name: new RegExp(player.name) });
    check(button.textContent === `${player.name}${player.position} · ${player.overall} OVR`, 'UPGRADE: transferred candidate retains position and rating');
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.chooseUpgradePlayer).mock.calls) === JSON.stringify([[player.name]]), 'UPGRADE ACTION: selected acquired name reaches the hook');
  });
});
