import { describe, expect, it } from 'vitest';
import {
  momentRound, momentSeed, momentSetup, momentShotRng, packMomentInput, settleMoment,
} from '@/lib/season/soccerMoments';
import type { WallShotSetup } from '@/lib/careerDrills';

describe('rules-2 Wall Shot declared synthetic moment contexts', () => {
  it('finds a legal real goal and a real miss, then replays the packed input in every tested context', { timeout: 120000 }, () => {
    const witnesses: Array<{ key: string; md: number; id: number; stakes: number; seed: number; round: number; input: number[]; stars: number }> = [];
    const byRound: Record<number, number> = {};
    for (let i = 0; i < 120; i += 1) {
      const key = 'wallshot-rules2-synthetic|' + i;
      const md = 1 + i % 38;
      const id = i % 12;
      const stakes = (i % 11) / 10;
      const seed = momentSeed(key, md, id);
      const round = momentRound(stakes);
      const legacySetup = momentSetup('wallshot', seed, round) as WallShotSetup;
      const setup = { ...legacySetup, wallShotRules: 2 as const };
      const play = (input: readonly number[]) => {
        // Select with the unmarked setup, exactly as old saved moments do.
        const realStream = momentShotRng(key, md, id, legacySetup);
        let draws = 0;
        const packed = packMomentInput(input);
        const result = settleMoment('wallshot', setup, packed, () => { draws += 1; return realStream(); });
        expect(draws, 'WALL_MOMENT_V2_FOUR_DRAW_SETTLEMENT_' + i).toBe(4);
        return { input: packed, result };
      };
      const miss = play([0, 0.8, 0.3, 0]);
      expect(miss.result.won, 'WALL_MOMENT_V2_ACTUAL_MISS_' + i).toBe(false);
      expect(miss.result.stars, 'WALL_MOMENT_V2_MISS_ZERO_STARS_' + i).toBe(0);
      let goal: ReturnType<typeof play> | null = null;
      search: for (const power of [0.5, 0.6, 0.7, 0.8]) {
        for (const y of [0.65, 0.8, 0.95]) {
          for (const x of [-0.9, -0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
            const candidate = play([x, y, power, 0]);
            if (candidate.result.won) { goal = candidate; break search; }
          }
        }
      }
      expect(goal, 'WALL_MOMENT_V2_REAL_SCORING_ROUTE_' + i).not.toBeNull();
      if (!goal) throw new Error('Unreachable after the owned scoring-route assertion');
      expect(goal.result.stars >= 1 && goal.result.stars <= 3, 'WALL_MOMENT_V2_REAL_GOAL_STARS_' + i).toBe(true);
      const replay = play(JSON.parse(JSON.stringify(goal.input)) as number[]);
      expect(replay, 'WALL_MOMENT_V2_PACKED_STREAM_REPLAY_' + i).toEqual(goal);
      expect(play(miss.input), 'WALL_MOMENT_V2_MISS_REPLAY_' + i).toEqual(miss);
      witnesses.push({ key, md, id, stakes, seed, round, input: goal.input, stars: goal.result.stars });
      byRound[round] = (byRound[round] ?? 0) + 1;
    }
    expect(witnesses, 'WALL_MOMENT_V2_ALL_DECLARED_CONTEXTS').toHaveLength(120);
    expect(Object.keys(byRound).map(Number).sort((a, b) => a - b), 'WALL_MOMENT_V2_ALL_STAKES_ROUNDS').toEqual([2, 3, 4, 5, 6, 7]);
    console.info('WALL_MOMENT_V2_VIABILITY ' + JSON.stringify({
      scope: '120 declared synthetic keyed contexts, not every actual offered season worldwide',
      contexts: witnesses.length, byRound, witnesses,
    }));
  });
});

