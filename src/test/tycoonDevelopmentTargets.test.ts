import { describe, expect, it } from 'vitest';
import * as stadium from '@/lib/stadiumTycoon';
import * as academy from '@/lib/wonderkidFactory';

const now = 1_700_000_000_000;

describe('Stadium Tycoon expansion targets', () => {
  it('records an expansion only after the chosen number of stand levels opens', () => {
    const fresh = { ...stadium.newTycoon(now), money: 1000 };
    expect(stadium.updateExpansionTarget).toBeTypeOf('function');
    const selected = stadium.updateExpansionTarget(fresh, 2);
    expect(selected.expansionTarget).toBe(2);
    expect(stadium.updateExpansionTarget(selected, 'claim')).toBe(selected);

    const first = stadium.buy(selected, 'stands');
    expect(stadium.capacity(first)).toBe(160);
    expect(stadium.updateExpansionTarget(first, 'claim')).toBe(first);

    const second = stadium.buy(first, 'stands');
    expect(stadium.capacity(second)).toBe(200);
    const claimed = stadium.updateExpansionTarget(second, 'claim');
    expect(claimed).toEqual({ ...second, expansionTarget: undefined, expansionTargetsCompleted: 1 });
    expect(stadium.updateExpansionTarget(claimed, 'claim')).toBe(claimed);
    expect(stadium.deserializeTycoon(stadium.serializeTycoon(claimed, now), now)?.expansionTargetsCompleted).toBe(1);
    const nextTarget = stadium.updateExpansionTarget(claimed, 1);
    const sold = stadium.prestige({ ...nextTarget, lifetime: stadium.prestigeThreshold(nextTarget) }, now);
    expect(sold.expansionTarget).toBeUndefined();
    expect(sold.expansionTargetsCompleted).toBe(1);
  });

  it('keeps a prepaid expansion pending until both matchdays settle', () => {
    const target = stadium.updateExpansionTarget(stadium.newTycoon(now), 1);
    const quote = stadium.standsConstructionQuote(target)!;
    const prepaid = stadium.bookStandsConstruction(target, target.rep, quote.opensAfterMatch, quote.cost);
    expect(prepaid.money).toBe(16);
    expect(stadium.updateExpansionTarget(prepaid, 'claim')).toBe(prepaid);
    const afterOne = stadium.playAwayMatchdays(prepaid, 1, () => 1).state;
    expect(stadium.updateExpansionTarget(afterOne, 'claim')).toBe(afterOne);
    const opened = stadium.playAwayMatchdays(afterOne, 1, () => 1).state;
    expect(stadium.capacity(opened)).toBe(160);
    expect(stadium.updateExpansionTarget(opened, 'claim').expansionTargetsCompleted).toBe(1);
  });

  it('uses recorded league crowds and preserves optional fields on old saves', () => {
    const fresh = stadium.newTycoon(now);
    expect(stadium.recordedLeagueCrowd).toBeTypeOf('function');
    const base = fresh.league!;
    const previous = { ...base, results: [{ day: 1, gf: 2, ga: 1, attendance: 80 }] };
    const current = { ...base, results: [{ day: 1, gf: 1, ga: 1 }, { day: 2, gf: 0, ga: 0, attendance: 120 }] };
    expect(stadium.recordedLeagueCrowd({ ...fresh, lastCompletedLeague: previous, league: current })).toEqual({ average: 100, matches: 2 });
    expect(stadium.recordedLeagueCrowd(fresh)).toBeNull();
    expect(stadium.deserializeTycoon(stadium.serializeTycoon(fresh, now), now)).not.toHaveProperty('expansionTarget');
  });
});

function trainingSave() {
  const state = academy.newFactory(now, 1);
  state.prospects = [
    { id: 1, name: 'Test Keeper', nation: 'England', pos: 'GK', age: 17, ageClock: 0, rating: 48.9, potential: 70 },
    { id: 2, name: 'Test Forward', nation: 'England', pos: 'FW', age: 18, ageClock: 0, rating: 61, potential: 75 },
  ];
  state.nextId = 3;
  return state;
}

describe('Wonderkid Factory training targets', () => {
  it('credits the selected prospect crossing the actual rating target once', () => {
    expect(academy.updateDevelopmentTarget).toBeTypeOf('function');
    const state = trainingSave();
    const selected = academy.updateDevelopmentTarget(state, 1);
    expect(selected.developmentTarget).toEqual({ id: 1, rating: 49 });
    expect(academy.updateDevelopmentTarget(selected, 'claim')).toBe(selected);
    expect(academy.setCoachingFocus(selected, 1)).toBe(true);
    expect(academy.startShowcase(selected)).toBe(true);
    const reload = academy.deserialize(academy.serialize(selected), now)!;
    expect(reload.developmentTarget).toEqual({ id: 1, rating: 49 });
    academy.tick(reload, 1);
    expect(reload.prospects[0].rating).toBeGreaterThanOrEqual(49);

    const claimed = academy.updateDevelopmentTarget(reload, 'claim');
    expect(claimed).toEqual({ ...reload, developmentTarget: undefined, developmentTargetsCompleted: 1 });
    expect(academy.updateDevelopmentTarget(claimed, 'claim')).toBe(claimed);
    const nextTarget = academy.updateDevelopmentTarget(claimed, 2);
    nextTarget.lifetime = academy.REGIONS[0].goal;
    expect(academy.moveUp(nextTarget)).toBe(true);
    expect(nextTarget.developmentTarget).toBeUndefined();
    expect(nextTarget.developmentTargetsCompleted).toBe(1);
  });

  it('drops an unfinished target when the player leaves and loads old saves normally', () => {
    expect(academy.updateDevelopmentTarget).toBeTypeOf('function');
    const state = trainingSave();
    const selected = academy.updateDevelopmentTarget(state, 1);
    expect(academy.sellProspect(selected, 1)).not.toBeNull();
    expect(selected.developmentTarget).toBeUndefined();
    expect(academy.updateDevelopmentTarget(selected, 'claim')).toBe(selected);
    expect(academy.deserialize(academy.serialize(state), now)).not.toHaveProperty('developmentTarget');
  });
});
