/* Round 784: a keeper's training drills move keeper attributes.

   A player reported on 2026-09-23 that Soccer Career's training options
   (pace, passing, dribbling) are outfield skills even when you are in goal.
   They were right: the Round 81 drills mapped by drill name alone, so a
   goalkeeper's Cone Slalom paid dribbling, which his own attribute screen
   calls Penalty Saving, and the panel told him it trained Dribbling.

   The drills keep their names. What they move depends on the position:
   for a keeper the slalom is footwork and trains Positioning (the defending
   family), the sprint trains Sweeping Speed (pace), the gates train
   Distribution (passing) and shot stopping trains Reflexes. The labels are
   the keeper tree's own family names, so the panel, the event line and the
   attribute screen say the same word. Outfield players are untouched.

   On the pre 784 engine the GK slalom case fails (dribbling paid, not
   defending) and trainingStatFor does not exist. */
import { describe, it, expect } from 'vitest';
import { applyTrainingResult, trainingStatFor, type CareerState, type TrainingDrill } from '@/lib/soccerCareerEngine';
import { attrTreeFor } from '@/lib/soccerCareerAttributes';

const DRILLS: TrainingDrill[] = ['dribbling', 'pace', 'passing', 'shooting'];

function state(position: string): CareerState {
  return {
    position,
    seasons: [{ year: 2031 }],
    statBoostNextSeason: {},
    morale: 50,
    events: [],
  } as unknown as CareerState;
}

describe('keeper training drills', () => {
  it('a keeper slalom pays Positioning (defending), not dribbling', () => {
    const out = applyTrainingResult(state('GK'), 'dribbling', 90);
    expect(out.statBoostNextSeason.defending).toBe(2);
    expect(out.statBoostNextSeason.dribbling).toBeUndefined();
    expect(out.events[out.events.length - 1]).toContain('+2 Positioning');
  });

  it('the keeper sprint, gates and shot stopping pay his own attributes with keeper names', () => {
    const pace = applyTrainingResult(state('GK'), 'pace', 85);
    expect(pace.statBoostNextSeason.pace).toBe(2);
    expect(pace.events[0]).toContain('+2 Sweeping Speed');
    const passing = applyTrainingResult(state('GK'), 'passing', 60);
    expect(passing.statBoostNextSeason.passing).toBe(1);
    expect(passing.events[0]).toContain('+1 Distribution');
    const shooting = applyTrainingResult(state('GK'), 'shooting', 80);
    expect(shooting.statBoostNextSeason.reflexes).toBe(2);
    expect(shooting.statBoostNextSeason.shooting).toBeUndefined();
    expect(shooting.events[0]).toContain('+2 Reflexes');
  });

  it('outfield players still train the outfield attribute the drill is named for', () => {
    for (const position of ['ST', 'CB', 'CM', 'LW']) {
      const dribbling = applyTrainingResult(state(position), 'dribbling', 90);
      expect(dribbling.statBoostNextSeason.dribbling).toBe(2);
      expect(dribbling.statBoostNextSeason.defending).toBeUndefined();
      const shooting = applyTrainingResult(state(position), 'shooting', 90);
      expect(shooting.statBoostNextSeason.shooting).toBe(2);
      expect(shooting.statBoostNextSeason.reflexes).toBeUndefined();
    }
  });

  it('every drill label is the family name the attribute screen shows for that position', () => {
    for (const position of ['GK', 'ST', 'CB']) {
      const families = attrTreeFor(position);
      for (const drill of DRILLS) {
        const { stat, label } = trainingStatFor(position, drill);
        const family = families.find(f => f.key === stat);
        expect(family, `${position} ${drill} moves ${stat}, which is not a family on the attribute screen`).toBeDefined();
        expect(label).toBe(family!.label);
      }
    }
  });

  it('a keeper gets one session a season, whichever drill he picks', () => {
    const first = applyTrainingResult(state('GK'), 'dribbling', 90);
    const again = applyTrainingResult(first, 'pace', 90);
    expect(again).toBe(first);
    expect(again.statBoostNextSeason.pace).toBeUndefined();
  });

  it('a rough session pays nothing and says so, for a keeper too', () => {
    const out = applyTrainingResult(state('GK'), 'dribbling', 20);
    expect(out.statBoostNextSeason.defending).toBeUndefined();
    expect(out.events[0]).toContain('no gains');
  });
});
