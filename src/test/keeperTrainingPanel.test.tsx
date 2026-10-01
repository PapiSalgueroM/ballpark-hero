/* Round 784: the training panel says the stat the engine actually pays.

   keeperTraining.test.ts holds the engine's mapping. This file holds the
   words on the screen against it, because the review of 2026-10-01 found the
   panel could say one thing while the engine paid another and every test
   stayed green: hard coding the keeper's Cone Slalom tile back to Dribbling
   left 33 of 33 green, and First Touch told a keeper it trained Dribbling
   while paying the stat his attribute screen calls Penalty Saving.

   Nothing here reads the panel's own labels to build the expectation. For
   each tile it banks a session through the engine, finds the stat that moved,
   and looks that stat up on the attribute screen for the position
   (attrTreeFor). The tile has to say that family's name. So a tile, the
   engine and the attribute screen can only agree or go red together. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import { applyDrillResult } from '@/lib/careerDrills';
import { applyTrainingResult, type CareerState, type TrainingDrill } from '@/lib/soccerCareerEngine';
import { attrTreeFor } from '@/lib/soccerCareerAttributes';

const career = (position: string) => ({
  position, overall: 70, potential: 80, potentialEarned: 0,
  seasons: [{ year: 2031 }], trainingSeasonYear: 2030,
  statBoostNextSeason: {}, morale: 50, events: [],
} as unknown as CareerState);

const draw = (position: string, available = true) => render(
  <TrainingPanel career={career(position)} available={available} onComplete={vi.fn()} onDrill={vi.fn()} onClose={vi.fn()} />,
);

/** The attribute screen's name for whatever a banked session moved. */
function paidFamily(position: string, after: CareerState): string {
  const moved = Object.entries(after.statBoostNextSeason).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k);
  expect(moved, `${position}: a strong session should move exactly one stat, moved ${moved.join(', ') || 'none'}`).toHaveLength(1);
  const family = attrTreeFor(position).find(f => f.key === moved[0]);
  expect(family, `${position}: the engine paid ${moved[0]}, which the attribute screen does not show`).toBeDefined();
  return family!.label;
}

const TILES: Array<{ drill: TrainingDrill; tile: (gk: boolean) => string }> = [
  { drill: 'dribbling', tile: () => 'Cone Slalom' },
  { drill: 'pace', tile: () => 'Sprint Burst' },
  { drill: 'shooting', tile: gk => (gk ? 'Shot Stopping' : 'Penalty Placement') },
  { drill: 'passing', tile: () => 'Passing Gates' },
];

afterEach(() => { cleanup(); });

describe('the training panel names the stat the engine pays', () => {
  for (const position of ['GK', 'ST', 'CB', 'CM']) {
    it(`${position}: every session tile says the attribute screen's name for what it pays`, () => {
      const view = draw(position);
      for (const { drill, tile } of TILES) {
        const want = paidFamily(position, applyTrainingResult(career(position), drill, 90));
        const button = view.getByRole('button', { name: new RegExp(tile(position === 'GK')) });
        expect(within(button).getByText(/^Trains /).textContent, `${position} ${tile(position === 'GK')}`).toBe(`Trains ${want}`);
      }
    });

    it(`${position}: the First Touch tile says the attribute screen's name for what it pays`, () => {
      const view = draw(position, false);
      const want = paidFamily(position, applyDrillResult(career(position), 'firsttouch', 9));
      const line = view.container.querySelector('[data-first-touch-trains]');
      expect(line?.textContent).toContain(`Trains ${want}.`);
      if (position === 'GK') expect(want).toBe('Positioning');
      else expect(want).toBe('Dribbling');
    });
  }

  it('a keeper reads the keeper rule, and every stat it names is one his drills pay', () => {
    const view = draw('GK');
    const rule = view.container.querySelector('[data-training-keeper-rule]');
    expect(rule).not.toBeNull();
    const paid = new Set(TILES.map(({ drill }) => paidFamily('GK', applyTrainingResult(career('GK'), drill, 90))));
    paid.add(paidFamily('GK', applyDrillResult(career('GK'), 'firsttouch', 9)));
    for (const label of paid) expect(rule!.textContent, `the keeper rule never mentions ${label}`).toContain(label);
    /* and it names nothing the drills do not pay: every keeper family on the
       attribute screen it mentions must be in the paid set */
    for (const family of attrTreeFor('GK')) {
      if (rule!.textContent!.includes(family.label)) expect(paid.has(family.label), `the keeper rule names ${family.label}, which no drill pays`).toBe(true);
    }
  });

  it('an outfield player gets no keeper rule', () => {
    for (const position of ['ST', 'CB', 'CM']) {
      const view = draw(position);
      expect(view.container.querySelector('[data-training-keeper-rule]')).toBeNull();
      cleanup();
    }
  });

  it("the First Touch rules and result speak the keeper's word too", () => {
    const view = draw('GK', false);
    fireEvent.click(view.getByRole('button', { name: /First Touch Read the gate/ }));
    expect(view.getByText(/50 earns \+1 Positioning, 80 earns \+2/)).toBeVisible();
    expect(view.queryByText(/\+1 Dribbling/)).toBeNull();
  });
});
