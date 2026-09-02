import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/careerPlayers', () => ({
  careerPlayers: [
    {
      name: 'Alpha',
      nationality: 'Testland',
      position: 'ST',
      career: [{ season: '2020-2021', club: 'Club A', goals: 0, assists: 0, appearances: 1, marketValue: 1 }],
    },
    {
      name: 'Bridge',
      nationality: 'Testland',
      position: 'CM',
      career: [
        { season: '2020-2021', club: 'Club A', goals: 0, assists: 0, appearances: 1, marketValue: 1 },
        { season: '2021-2022', club: 'Club B', goals: 0, assists: 0, appearances: 1, marketValue: 1 },
      ],
    },
    {
      name: 'Target',
      nationality: 'Testland',
      position: 'ST',
      career: [{ season: '2022-2023', club: 'Club C', goals: 0, assists: 0, appearances: 1, marketValue: 1 }],
    },
  ],
}));

vi.mock('@/data/transferPathPuzzles', () => ({
  default: [
    { id: 'mock-1', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: 'Use Bridge.' },
    { id: 'mock-2', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: 'Use Bridge.' },
  ],
}));

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: vi.fn(async () => []) }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const hookPath = process.env.TRANSFER_PATH_HOOK;
const { useTransferPath } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useTransferPath');

beforeEach(() => {
  localStorage.clear();
});

async function startedUnlimited() {
  const rendered = renderHook(() => useTransferPath());
  await waitFor(() => expect(rendered.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));

  act(() => rendered.result.current.switchToUnlimited());
  let validMove: ReturnType<typeof rendered.result.current.addPlayer>;
  act(() => {
    validMove = rendered.result.current.addPlayer('Bridge');
  });
  expect(validMove!).toEqual({ ok: true, club: 'Club A' });
  expect(rendered.result.current.chain).toEqual(['Alpha', 'Bridge']);
  return rendered;
}

describe('useTransferPath repeated players', () => {
  it('keeps a valid move and rejects repeating the start', async () => {
    const rendered = await startedUnlimited();
    const chainBeforeDuplicate = [...rendered.result.current.chain];
    const connectionsBeforeDuplicate = [...rendered.result.current.connections];
    let duplicateResult: ReturnType<typeof rendered.result.current.addPlayer>;
    act(() => {
      duplicateResult = rendered.result.current.addPlayer('Alpha');
    });
    if (process.env.TRANSFER_PATH_HOOK) {
      console.log(`CONTROL_OBSERVED_RESULT ${JSON.stringify(duplicateResult)}`);
      console.log(`CONTROL_OBSERVED_CHAIN ${JSON.stringify(rendered.result.current.chain)}`);
    }

    expect({
      result: duplicateResult!,
      chain: rendered.result.current.chain,
      connections: rendered.result.current.connections,
    }).toEqual({
      result: { ok: false, club: null, reason: 'duplicate' },
      chain: chainBeforeDuplicate,
      connections: connectionsBeforeDuplicate,
    });
  });

  it('rejects a repeated player case-insensitively', async () => {
    const rendered = await startedUnlimited();
    expect(rendered.result.current.addPlayer('aLpHa')).toEqual({ ok: false, club: null, reason: 'duplicate' });
    expect(rendered.result.current.chain).toEqual(['Alpha', 'Bridge']);
  });
});
