import { strict as assert } from 'node:assert';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { TEAM_MAP } from '@/data/conquestData';
import { FREE_AGENTS } from '@/data/conquestPowerups';
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
  SUPABASE_URL: 'https://nfl-legends-ui.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, key) { return boundary.deny(`backend:${String(key)}`); } }),
}));
function fixture(overrides: Partial<ReturnType<typeof useConquest>> & { legendPlayers?: ReadonlySet<string> } = {}) {
  const game = {
    phase: 'steal', turn: 3, territories: { MO: 'KC', NY: 'BUF' }, rosters: { KC: [], BUF: [] },
    eliminated: [], gameLog: [], visiblePlays: [], powerupStates: new Set(), invincibleTeams: new Set(),
    teamUpgrades: {}, battleUpgrades: {}, legendPlayers: new Set<string>(), powerupUnavailableReason: null,
    teamSavedPowerups: {}, pendingPowerup: null, powerupUseType: null, freeAgentList: [], stealCandidates: [], animStartTime: 0,
    attackingTeam: 'KC', defendingTeam: 'BUF', direction: 'E', battleResult: { winner: 'KC', loser: 'BUF', winScore: 24, loseScore: 17 },
    stealModalOpen: true, pendingBattleApply: null, targetState: null, territoryStolenState: null, boxScore: null,
    favoriteTeam: null, freeAgencyCooldownRemaining: 0, freeAgencyActionReady: false, freeAgencyPool: () => [],
    aliveTeams: () => ['KC', 'BUF'], getTeamTerritoryCount: () => 1, powerRankings: () => [],
    canSignFreeAgent: () => false, startBattle: vi.fn(), reset: vi.fn(), stealPlayer: vi.fn(), chooseUpgradePlayer: vi.fn(), ...overrides,
  } as ReturnType<typeof useConquest>;
  vi.mocked(useConquest).mockReturnValue(game);
  return game;
}
function cells(id: string, name: string) {
  const roster = within(screen.getByText(`${TEAM_MAP.get(id)!.name}'s Roster`).parentElement!);
  return within(roster.getByRole('row', { name: new RegExp(name) })).getAllByRole('cell').map(cell => cell.textContent);
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

describe('NFL earned legend cards', () => {
  it.each([['MIN', 'Adrian Peterson'], ['SEA', 'Marshawn Lynch']])('keeps the ordinary same-name pool card on %s', (id, name) => {
    const player = FREE_AGENTS.find(player => player.name === name)!;
    fixture({ battleResult: { winner: id, loser: 'BUF', winScore: 24, loseScore: 17 }, rosters: { [id]: [name], BUF: [] } });
    render(<ConquestBoard />);
    check(JSON.stringify(cells(id, name)) === JSON.stringify([name, player.position, String(player.overall), '-']), `POOL: ${id} does not turn a signed name into an earned legend`);
  });
  it.each([['KC', 'Adrian Peterson'], ['BUF', 'Marshawn Lynch']])('keeps the earned legend card after transfer to %s', (id, name) => {
    fixture({ rosters: { KC: [], BUF: [], [id]: [name] }, legendPlayers: new Set([name]) });
    render(<ConquestBoard />);
    const row = cells(id, name);
    check(row[0] === `🐐${name}` && row[1] === 'RB' && row[2] === '99' && row[3] === 'Legend', `TRANSFER: ${id} keeps earned legend identity and metadata`);
  });
  it('shows the earned legend in the losing roster choice', () => {
    const name = 'Adrian Peterson', game = fixture({ rosters: { KC: [], BUF: [name] }, legendPlayers: new Set([name]) });
    render(<ConquestBoard />);
    const button = screen.getByRole('button', { name: new RegExp(name) });
    check(button.textContent === `${name}RB · 99 OVR · Legend`, 'STEAL CARD: the offered earned legend retains its card');
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.stealPlayer).mock.calls) === JSON.stringify([[name]]), 'STEAL ACTION: the offered legend name reaches the hook');
  });
  it('shows the earned legend in the upgrade choice', () => {
    const name = 'Marshawn Lynch', game = fixture({ phase: 'powerup_use', stealModalOpen: false, powerupUseType: 'upgrade', powerupTeam: 'KC', rosters: { KC: [name], BUF: [] }, legendPlayers: new Set([name]) });
    render(<ConquestBoard />);
    const button = screen.getByRole('button', { name: new RegExp(name) });
    check(button.textContent === `${name}RB · 99 OVR`, 'UPGRADE CARD: the owner earned legend keeps its rating in the picker');
    fireEvent.click(button);
    check(JSON.stringify(vi.mocked(game.chooseUpgradePlayer).mock.calls) === JSON.stringify([[name]]), 'UPGRADE ACTION: the selected legend name reaches the hook');
  });
  it('keeps a temporary upgrade distinct from an earned legend', () => {
    const name = 'Adrian Peterson';
    fixture({ battleResult: { winner: 'MIN', loser: 'BUF', winScore: 24, loseScore: 17 }, rosters: { MIN: [name], BUF: [] }, battleUpgrades: { MIN: name } });
    render(<ConquestBoard />);
    check(JSON.stringify(cells('MIN', name)) === JSON.stringify([`⬆️${name}`, 'RB', '99', '-']), 'TEMPORARY: a battle boost does not create permanent legend identity');
  });
  it('preserves an ordinary pool card after transfer', () => {
    const name = 'Adrian Peterson', player = FREE_AGENTS.find(player => player.name === name)!;
    fixture({ rosters: { KC: [name], BUF: [] } });
    render(<ConquestBoard />);
    check(JSON.stringify(cells('KC', name)) === JSON.stringify([name, player.position, String(player.overall), '-']), 'ORDINARY TRANSFER: the unearned card keeps its existing pool rating');
  });
  it('explains earned legend transfers and unavailable cards', () => {
    render(<ConquestHowToPlay open onOpenChange={() => {}} />);
    check(screen.getAllByRole('listitem').some(item => /Legend:.*99 OVR for this run.*follows the player/.test(item.textContent || '')), 'HELP TRANSFER: an earned legend card follows its player for the run');
    check(!!screen.queryByText(/already on a surviving roster.*cannot be used yet.*Save for Later.*ordinary pool does not make them a legend/), 'HELP DUPLICATE: an unavailable card can be saved and ordinary signings stay ordinary');
  });
});
