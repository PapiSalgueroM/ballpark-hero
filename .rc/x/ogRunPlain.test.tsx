/* Round 1216 review (lens RUN), a one time comparison, never committed. Stricter than the builder's:
   other clubs and seeds, the WHOLE frame as JSON (every key in its order, undefined kept, no rounding), the
   drawn markup of the surface and of every figure, and lines that carry og where it must be ignored (a penalty,
   a direct free kick, a kind that is not a goal). Run on this round's tree and on the base's tree: one digest. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import { actionFrame, LivePitchPlayer } from '@/components/pitch-motion/motion';
import { PitchSurface } from '@/components/pitch-motion/PitchSurface';
import { stagePitchInput } from '@/components/club-manager/LiveSimScreen';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const CLUBS = [
  { seed: 880001, club: 'Everton' }, { seed: 880002, club: 'Barcelona' }, { seed: 880003, club: 'Arsenal' },
  { seed: 880004, club: 'Ajax' }, { seed: 880005, club: 'Newcastle United' }, { seed: 880006, club: 'Real Madrid' },
] as const;
beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(seeded(909)); });
afterEach(() => { vi.restoreAllMocks(); });

describe('Round 1216 review: plain comparison, strict', () => {
  it('digests every frame and its markup of every chance that is not an own goal', () => {
    let frameHash = 0x811c9dc5, markHash = 0x811c9dc5;
    const eat = (hash: number, text: string) => { for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); } return hash; };
    const whole = (value: unknown) => JSON.stringify(value, (_key, v) => (v === undefined ? '__UNDEFINED__' : v));
    let compared = 0, aside = 0, frames = 0, halves = 0, flagged = 0, marks = 0, matchesAll = 0;
    const kinds: Record<string, number> = {};
    for (const { seed, club } of CLUBS) {
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
          const e = a.event as LiveFeedEvent;
          if (e.og && e.kind === 'goal' && !e.penalty && !e.freeKick) { aside++; return; }
          compared++;
          kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
          const captured = pitchScene(plan, a.at - .05);
          /* The line as it is, and the same line carrying og where the part must ignore it. */
          const lines = [a.event];
          if (e.kind !== 'goal' || e.penalty || e.freeKick) { lines.push({ ...a.event, og: true } as typeof a.event); flagged++; }
          lines.forEach((event, which) => {
            for (let s = 0; s < 22; s++) {
              const frame = actionFrame(captured, { event, key: `chance${n}`, at: a.at }, s * .05);
              frames++;
              frameHash = eat(frameHash, whole(frame));
              if (which === 0 && s % 3 !== 0) continue;
              marks++;
              markHash = eat(markHash, renderToStaticMarkup(
                <PitchSurface frame={frame}>
                  {[...frame.mine, ...frame.theirs].map(p => <LivePitchPlayer key={p.key} color="#123456" keeper={!!p.keeper} pose={frame.poses[p.key]} />)}
                </PitchSurface>));
            }
          });
        });
      };
      for (let guard = 0; guard < 400 && matches < 18; guard++) {
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
      matchesAll += matches;
    }
    const hex = (hash: number) => (hash >>> 0).toString(16).padStart(8, '0');
    console.log(`[run plain] matches ${matchesAll}, halves ${halves}, chances compared ${compared} (${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ')}), lines also read with og on them ${flagged}, own goals set aside ${aside}, frames ${frames}, markups ${marks}, digest frames ${hex(frameHash)} markup ${hex(markHash)}`);
    expect(compared).toBeGreaterThanOrEqual(1500);
    expect(flagged).toBeGreaterThanOrEqual(1000);
  }, 900000);
});
