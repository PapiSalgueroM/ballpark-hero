/**
 * An NBA Conquest Arcade attack is an away raid.
 *
 * A failed attacker keeps its existing territory and the defender keeps its
 * own territory. Only a defender that loses at home can be conquered. The
 * test walks a fixed seed sequence until the real simulator produces an away
 * loss, then checks the map transition that follows it.
 */
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConquestNba } from '@/hooks/useConquestNba';
import ConquestBoardNba from '@/components/conquest/ConquestBoardNba';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('NBA Conquest Arcade territory resolution', () => {
  it('repels a losing attacker without deleting its empire', () => {
    let exercised = false;

    for (let seed = 0; seed < 100 && !exercised; seed += 1) {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const { result, unmount } = renderHook(() => useConquestNba());

      act(() => result.current.startBattle());
      act(() => vi.advanceTimersByTime(10_000));

      const attacker = result.current.attackingTeam;
      const defender = result.current.defendingTeam;
      const battle = result.current.battleResult;
      if (!attacker || !defender || !battle || battle.loser !== attacker) {
        unmount();
        vi.clearAllTimers();
        continue;
      }

      const attackerBefore = result.current.getTeamTerritoryCount(attacker);
      const defenderBefore = result.current.getTeamTerritoryCount(defender);
      expect(attackerBefore).toBeGreaterThan(0);
      expect(defenderBefore).toBeGreaterThan(0);

      act(() => result.current.skipToResult());
      act(() => result.current.skipSteal());

      expect(result.current.getTeamTerritoryCount(attacker)).toBe(attackerBefore);
      expect(result.current.getTeamTerritoryCount(defender)).toBe(defenderBefore);
      expect(result.current.eliminated).not.toContain(attacker);
      expect(result.current.gameLog.at(-1)?.score).toContain('away raid repelled');
      exercised = true;
      unmount();
    }

    expect(exercised).toBe(true);
  });

  it('tells the player that the failed away raid was repelled', () => {
    let sawRepelledCopy = false;

    for (let seed = 0; seed < 100 && !sawRepelledCopy; seed += 1) {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const view = render(<ConquestBoardNba />);

      fireEvent.click(screen.getByRole('button', { name: /Start Conquest/i }));
      act(() => vi.advanceTimersByTime(10_000));
      const skip = screen.queryByRole('button', { name: /Skip to result/i });
      if (skip) {
        fireEvent.click(skip);
        sawRepelledCopy = screen.queryByText(/Raid repelled:/i) !== null;
        if (sawRepelledCopy) {
          expect(screen.queryByText(/eliminated, all territory conquered/i)).not.toBeInTheDocument();
        }
      }

      view.unmount();
      vi.clearAllTimers();
    }

    expect(sawRepelledCopy).toBe(true);
  });
});
