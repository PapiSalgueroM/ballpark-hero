import React, { type ComponentType } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choosePostRetirement, FALLBACK_CLUBS, getCareerTotals, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData, PostRetirementChoice } from '@/lib/soccerCareerEngine';

type Props = {
  career: CareerState;
  clubs: ClubData[];
  totals: ReturnType<typeof getCareerTotals>;
  onPostRetirement?: (choice: PostRetirementChoice, ownerClub?: string) => void;
  onChoice?: (choice: PostRetirementChoice, ownerClub?: string) => void;
};
let cards: Record<string, ComponentType<Props>>;
let disposeOwnedObserver: (() => void) | undefined;
beforeAll(async () => {
  let file = process.env.SC_COACHING_START_OBSERVER;
  if (!file) {
    const { buildSoccerCoachingStartObserver } = await import('../../scripts/qa/buildSoccerCoachingStartObserver.mjs');
    const built = await buildSoccerCoachingStartObserver();
    file = built.file;
    disposeOwnedObserver = built.dispose;
  }
  cards = createRequire(import.meta.url)(file);
  if (typeof cards.RetirementCeremonyCard !== 'function' || typeof cards.PostRetirementCard !== 'function') {
    throw new Error('Actual existing retirement card exports are required');
  }
}, 60_000);
afterAll(() => { disposeOwnedObserver?.(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const consumers = [
  { name: 'ceremony', exportName: 'RetirementCeremonyCard', phase: 'retirement_ceremony' as const },
  { name: 'direct retirement', exportName: 'PostRetirementCard', phase: 'post_retirement' as const },
];
function retired(phase: CareerState['phase']): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing recorded complete career ere is required');
  const input = structuredClone(saved.state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34;
  const state = manualRetire(input);
  state.phase = phase; state.managerState = null; state.postRetirementChoice = null;
  state.lifeFlags = { ...(state.lifeFlags ?? {}), coachingBadges: 3 };
  return state;
}
function seeded<T>(seed: number, action: () => T) {
  const random = Math.random, now = Date.now, draws: number[] = [];
  let n = seed >>> 0;
  const draw = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = () => { const value = draw(); draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { const value = action(); const next = draw(); return { value, draws, next }; }
  finally { Math.random = random; Date.now = now; }
}
function mount(spec: typeof consumers[number], career: CareerState, choose: Props['onChoice']) {
  const Card = cards[spec.exportName];
  render(<Card career={career} clubs={FALLBACK_CLUBS} totals={getCareerTotals(career.seasons)}
    onChoice={choose} onPostRetirement={choose} />);
}

describe('actual existing Soccer Career retirement consumers', () => {
  for (const spec of consumers) {
    it(spec.name + ' reviewed coursework opens the prepared manager chooser', async () => {
      const career = retired(spec.phase), before = JSON.stringify(career), ordinary = vi.fn();
      mount(spec, career, ordinary);
      fireEvent.click(screen.getByRole('button', { name: /Use coaching coursework/ }));
      expect(await screen.findByRole('heading', { name: 'Choose your first club' })).toBeTruthy();
      expect(ordinary).not.toHaveBeenCalled();
      expect(JSON.stringify(career)).toBe(before);
    });
    it(spec.name + ' usual manager entry preserves full state and random stream', () => {
      const career = retired(spec.phase), before = JSON.stringify(career);
      const expected = seeded(7319, () => choosePostRetirement(structuredClone(career), 'manager', FALLBACK_CLUBS));
      let committed: CareerState | undefined;
      const ordinary = vi.fn((choice: PostRetirementChoice, ownerClub?: string) => {
        committed = choosePostRetirement(career, choice, FALLBACK_CLUBS, ownerClub);
      });
      mount(spec, career, ordinary);
      const actual = seeded(7319, () => {
        fireEvent.click(screen.getByRole('button', { name: /Become a Manager/ }));
        return committed;
      });
      expect(ordinary).toHaveBeenCalledTimes(1);
      expect(ordinary).toHaveBeenCalledWith('manager');
      expect(actual.value).toStrictEqual(expected.value);
      expect(JSON.stringify(actual.value)).toBe(JSON.stringify(expected.value));
      expect(actual.draws).toEqual(expected.draws);
      expect(actual.draws).toHaveLength(1);
      expect(actual.next).toBe(expected.next);
      expect(JSON.stringify(career)).toBe(before);
    });
  }
});
