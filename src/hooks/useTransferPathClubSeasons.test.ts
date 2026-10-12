import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { useTransferPath } from '@/hooks/useTransferPath';

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({
  fetchTransferPathPuzzles: vi.fn(async () => [{
    id: 'tpa-770', playerA: 'Trent Alexander-Arnold', playerB: 'Victor Osimhen',
    minSteps: 3, hint: 'Two middle men at least.',
    europe: { minSteps: 3, hint: 'Two middle men at least.' },
  }]),
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchCareerPlayers).mockResolvedValue([]);
});

async function start(rule: 'classic' | 'europe') {
  const rendered = renderHook(() => useTransferPath());
  await waitFor(() => expect(rendered.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  act(() => rendered.result.current.switchToUnlimited());
  if (rule === 'europe') act(() => rendered.result.current.setRule(rule));
  expect(rendered.result.current.puzzle.id).toBe('tpa-770');
  expect(rendered.result.current.chain).toEqual(['Trent Alexander-Arnold']);
  return rendered;
}

describe('Transfer Path verified club seasons', () => {
  for (const source of ['fallback', 'fetched'] as const) {
    for (const rule of ['classic', 'europe'] as const) {
      it(`accepts the reported Trent and Mbappe link with ${source} careers under ${rule}`, async () => {
        const before = JSON.stringify(careerPlayers);
        if (source === 'fetched') vi.mocked(fetchCareerPlayers).mockResolvedValue(careerPlayers);
        const rendered = await start(rule);
        let move: ReturnType<typeof rendered.result.current.addPlayer>;
        act(() => { move = rendered.result.current.addPlayer('Kylian Mbappé'); });
        expect(move!).toEqual({ ok: true, club: 'Real Madrid' });
        expect(rendered.result.current.chain.slice(0, 2)).toEqual(['Trent Alexander-Arnold', 'Kylian Mbappé']);
        expect(rendered.result.current.connections[1]).toBe('Real Madrid');
        expect(JSON.stringify(careerPlayers)).toBe(before);
        console.log(`TRANSFER_PATH_VERIFIED_LINK ${source} ${rule} ${JSON.stringify(move!)}`);
      });
    }
  }

  it('keeps Trent Liverpool teammates valid', async () => {
    const rendered = await start('classic');
    let move: ReturnType<typeof rendered.result.current.addPlayer>;
    act(() => { move = rendered.result.current.addPlayer('Mohamed Salah'); });
    expect(move!).toEqual({ ok: true, club: 'Liverpool' });
  });
});
