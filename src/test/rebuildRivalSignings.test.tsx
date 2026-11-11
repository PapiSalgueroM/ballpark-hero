import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getEnrichment } from '@/data/footleEnrichment';
import { useRebuild } from '@/hooks/useRebuild';
import type { RebuildClub } from '@/lib/fetchRebuild';
import { buildMarket, type MarketRow } from '@/lib/rebuildDeck';
import { sell } from '@/lib/rebuildLoop';
import { applyMove, REBUILD_SAVE_KEY, toSave, type RebuildMove } from '@/lib/rebuildSave';
import { activeRun, createTable, openWindow, pickClub } from '@/lib/rebuildTable';
import { normalizePosition } from '@/lib/squadDeal';
import type { Player } from '@/types/game';
import marketFixture from '../../scripts/data/rebuildMarket.json';
import squadsFixture from '../../scripts/data/rebuildSquads.json';

type MarketTuple = [string, string, number, string, string, number];
type SquadTuple = [string, string, number, number];
const rows: MarketRow[] = (marketFixture.rows as MarketTuple[]).map(([
  player_name, position, age, nationality, club, market_value_usd,
]) => ({ player_name, position, age, nationality, club, market_value_usd }));
const clubs: RebuildClub[] = squadsFixture.clubs.map(c => ({
  club: c.club, tier: c.tier as RebuildClub['tier'], squadSize: c.squad.length, squadValueM: 0,
}));
const squadOf = (club: string): Player[] => {
  const squad = squadsFixture.clubs.find(c => c.club === club)!.squad as SquadTuple[];
  return squad.flatMap(([name, rawPosition, age, usd]) => {
    const position = normalizePosition(rawPosition);
    return position ? [{ name, position, age, club, marketValue: Math.max(1, Math.round(usd / 1_000_000)),
      league: getEnrichment(name, club).league, nationality: 'Unknown', goals: 0, assists: 0, kitNumber: 0,
      difficulty: 'easy' as const }] : [];
  });
};
const marketFromRows = (pool: MarketRow[], club: string) => buildMarket(pool, club, (n, c) => getEnrichment(n, c).league);
let pool = rows;

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/fetchRebuild', () => ({
  fetchRebuildClubs: async () => clubs,
  fetchClubSquad: async (club: string) => squadOf(club),
  fetchMarketRows: async () => pool,
  marketFromRows: (data: MarketRow[], club: string) => marketFromRows(data, club),
}));

beforeEach(() => { localStorage.clear(); pool = rows; });
afterEach(() => { cleanup(); localStorage.clear(); });

function saveFinishedWindow(club: string, lose?: string): string {
  const picked = pickClub(createTable(['human']), clubs.find(c => c.club === club)!, clubs);
  const table = openWindow(picked, { squads: new Map([[club, squadOf(club)]]),
    markets: new Map([[club, marketFromRows(pool, club)]]), preset: 'none' }, clubs);
  const moves: RebuildMove[] = [];
  let run = activeRun(table)!;
  const move = (action: RebuildMove) => {
    const next = applyMove(run, action);
    expect(next, `legal ${action.k} action`).not.toBe(run);
    run = next;
    moves.push(action);
  };

  move({ k: 'finance', i: 0 });
  move({ k: 'toManager' });
  move({ k: 'manager', id: 'caretaker' });
  for (let i = 0; i < 11; i++) {
    move({ k: 'spin' });
    const incumbent = run.spun === null ? null : run.baseXi[run.spun];
    if (lose && incumbent && !(lose in run.lost) && sell(run).deal?.offers.some(p => p.name === lose)) {
      move({ k: 'sell' });
      move({ k: 'offer', name: lose });
      expect(run.war?.rivalIdx).toBe(1);
      move({ k: 'walk' });
      move({ k: 'clearWar' });
      move({ k: 'forty' });
    } else move({ k: incumbent ? 'keep' : 'forty' });
  }
  if (lose) expect(run.lost[lose]).toBe(1);
  move({ k: 'whistle' });
  if (run.verdict) move({ k: 'accept' });
  expect(run.phase).toBe('done');
  const bytes = JSON.stringify(toSave({ table: { ...table, seats: [{ ...table.seats[0], run }] }, moves: [moves] }, 'none'));
  localStorage.setItem(REBUILD_SAVE_KEY, bytes);
  return bytes;
}

it('gives both rivals distinct signings when a finished solo window reloads', async () => {
  const bytes = saveFinishedWindow('Real Madrid');
  const { result } = renderHook(() => useRebuild());
  await waitFor(() => expect(result.current.season).toBeTruthy());
  const [first, second] = result.current.rivals!;
  expect(first).toMatchObject({ club: { club: 'Manchester City' }, signings: ['Lamine Yamal', 'Harry Kane', 'Cristiano Ronaldo'] });
  expect(second).toMatchObject({ club: { club: 'Arsenal FC' } });
  expect(second.signings).toContain('Erling Haaland');
  expect(second.signings.filter(name => first.signings.includes(name))).toEqual([]);
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);
});

it('reserves a player won by the second rival before the first shops', async () => {
  pool = rows.filter(row => row.player_name === 'Marcus Rashford');
  const bytes = saveFinishedWindow('Manchester City', 'Marcus Rashford');
  const { result } = renderHook(() => useRebuild());
  await waitFor(() => expect(result.current.season).toBeTruthy());
  const [first, second] = result.current.rivals!;
  expect(first).toMatchObject({ club: { club: 'Liverpool FC' }, signings: [] });
  expect(second).toMatchObject({ club: { club: 'Tottenham Hotspur' }, signings: ['Marcus Rashford'] });
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);
});
