/* Round 1216, a one time comparison (never committed): one digest over all 22 sampled frames of every chance of the
   200 REAL half feeds (own goals at the engine's real one in 32) that is NOT an own goal. Run once on this round's
   motion.tsx and once on the base's: the two digests must be the same. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import { actionFrame } from '@/components/pitch-motion/motion';
import { stagePitchInput } from '@/components/club-manager/LiveSimScreen';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const FIVE_CLUBS = [
  { seed: 110101, club: 'Aston Villa' }, { seed: 110102, club: 'Real Madrid' }, { seed: 110103, club: 'Lyon' },
  { seed: 110104, club: 'Ajax' }, { seed: 110105, club: 'Celtic' },
] as const;
beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(seeded(603)); });
afterEach(() => { vi.restoreAllMocks(); });
const FRAME_FIELDS = ['mine', 'theirs', 'ball', 'holderKey', 'poses', 'action', 'net', 'netPulse', 'phase'] as const;

describe('Round 1216 plain comparison', () => {
  it('digests every frame of every chance that is not an own goal', () => {
    let hash = 0x811c9dc5;
    const feedText = (text: string) => { for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); } };
    let compared = 0, aside = 0, frames = 0, halves = 0;
    for (const { seed, club } of FIVE_CLUBS) {
      vi.mocked(Math.random).mockImplementation(seeded(seed));
      let career: CareerState = startCareer(club);
      delete career.realLeagueFixtures;
      let matches = 0;
      const half = (c: CareerState, stage: 'first' | 'second') => {
        halves++;
        const cap = stage === 'first' ? 45 : 90;
        const stop = cap + ((cap === 45 ? c.live!.added?.h1 : c.live!.added?.h2) ?? 0);
        const plan = pitchPlan(stagePitchInput(c, c.live!, null, stage, stage === 'first' ? 0 : 46, 0, stop));
        plan.actions.forEach((a, n) => {
          if ((a.event as LiveFeedEvent).og) { aside++; return; }
          compared++;
          const captured = pitchScene(plan, a.at - .05);
          for (let s = 0; s < 22; s++) {
            const frame = actionFrame(captured, { event: a.event, key: `chance${n}`, at: a.at }, s * .05) as unknown as Record<string, unknown>;
            frames++;
            feedText(JSON.stringify(Object.fromEntries(FRAME_FIELDS.map(field => [field, frame[field]])), (_key, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));
          }
        });
      };
      for (let guard = 0; guard < 400 && matches < 20; guard++) {
        const next = playNextEntry(career);
        career = next.state;
        if (next.kind === 'seasonOver' || career.sacked) break;
        if (next.kind !== 'halftime' || !career.live) continue;
        half(career, 'first');
        const second = startSecondHalf(career)!;
        half(second, 'second');
        career = resumeMatch(second).state;
        matches++;
      }
    }
    console.log(`[1216 plain] halves ${halves}, chances compared ${compared}, own goals set aside ${aside}, frames ${frames}, digest ${(hash >>> 0).toString(16).padStart(8, '0')}`);
    expect(compared).toBeGreaterThanOrEqual(2000);
  }, 600000);
});
