import { createHash } from 'node:crypto';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getEnrichment } from '@/data/footleEnrichment';
import { useRebuild } from '@/hooks/useRebuild';
import type { RebuildClub } from '@/lib/fetchRebuild';
import { buildMarket, type MarketRow } from '@/lib/rebuildDeck';
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
let unavailableClub: string | null = null;
let unavailableReads = 0;

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/fetchRebuild', () => ({
  fetchRebuildClubs: async () => clubs,
  fetchClubSquad: async (club: string) => {
    if (club !== unavailableClub) return squadOf(club);
    unavailableReads++;
    return [];
  },
  fetchMarketRows: async () => rows,
  marketFromRows: (data: MarketRow[], club: string) => marketFromRows(data, club),
}));

beforeEach(() => {
  localStorage.clear();
  unavailableClub = null;
  unavailableReads = 0;
});
afterEach(() => { cleanup(); localStorage.clear(); });

function saveFinishedWindow(club: string): string {
  const picked = pickClub(createTable(['human']), clubs.find(c => c.club === club)!, clubs);
  const table = openWindow(picked, { squads: new Map([[club, squadOf(club)]]),
    markets: new Map([[club, marketFromRows(rows, club)]]), preset: 'none' }, clubs);
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
    move({ k: incumbent ? 'keep' : 'forty' });
  }
  move({ k: 'whistle' });
  if (run.verdict) move({ k: 'accept' });
  expect(run.phase).toBe('done');
  const bytes = JSON.stringify(toSave({ table: { ...table, seats: [{ ...table.seats[0], run }] }, moves: [moves] }, 'none'));
  localStorage.setItem(REBUILD_SAVE_KEY, bytes);
  return bytes;
}

it.each(['Manchester City', 'Arsenal FC'])('waits for the real %s squad before simulating the season', async club => {
  const bytes = saveFinishedWindow('Real Madrid');
  unavailableClub = club;
  const { result } = renderHook(() => useRebuild());
  await waitFor(() => {
    expect(unavailableReads).toBe(1);
    expect(result.current.rivalsLoading).toBe(false);
  });
  expect(result.current.phase).toBe('done');
  expect(result.current.season).toBeNull();
  expect(result.current.rivals).toBeNull();
  expect(result.current.seasonFailed).toBe(true);
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);

  act(() => result.current.retrySeason());
  await waitFor(() => expect(unavailableReads).toBe(2));
  expect(result.current.seasonFailed).toBe(true);
  expect(result.current.season).toBeNull();
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);

  unavailableClub = null;
  act(() => result.current.retrySeason());
  await waitFor(() => expect(result.current.season).toBeTruthy());
  expect(result.current.seasonFailed).toBe(false);
  expect(result.current.rivals?.map(rival => [rival.club.club, rival.startRating])).toEqual([
    ['Manchester City', expect.any(Number)],
    ['Arsenal FC', expect.any(Number)],
  ]);
  expect(result.current.rivals?.every(rival => rival.startRating > 0)).toBe(true);
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);
});

it('keeps the healthy season and both rival results byte for byte', async () => {
  const bytes = saveFinishedWindow('Real Madrid');
  const { result } = renderHook(() => useRebuild());
  await waitFor(() => expect(result.current.season).toBeTruthy());
  const outcome = JSON.stringify({ season: result.current.season, rivals: result.current.rivals });
  const digest = createHash('sha256').update(outcome).digest('hex');
  expect(digest).toBe('f9790f3306e6424b1756d27d9c9cbab11505844c3591bb7e40caf98c74bbeb4c');
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(bytes);
});
