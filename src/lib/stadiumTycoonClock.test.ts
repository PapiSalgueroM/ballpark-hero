import { describe, expect, it, vi } from 'vitest';

import { deserializeTycoon, newTycoon, serializeTycoon, tick } from '@/lib/stadiumTycoon';

describe('Stadium Tycoon match clock', () => {
  it('advances one minute only after seven 0.2 second live ticks', () => {
    const roll = vi.fn(() => 1);
    let state = newTycoon(0);

    for (let i = 0; i < 6; i += 1) state = tick(state, 0.2, roll).state;
    expect(state.minute).toBe(0);
    expect(roll).not.toHaveBeenCalled();

    state = tick(state, 0.2, roll).state;
    expect(state.minute).toBe(1);
    expect(roll).toHaveBeenCalledTimes(2);
  });

  it('loads a save from before the fractional clock with no elapsed match time', () => {
    const oldSave = JSON.parse(serializeTycoon(newTycoon(0), 1000));
    delete oldSave.matchElapsedSec;
    oldSave.minute = 12;

    const loaded = deserializeTycoon(JSON.stringify(oldSave), 2000);

    expect(loaded?.minute).toBe(12);
    expect(loaded?.matchElapsedSec).toBe(0);
  });
});
