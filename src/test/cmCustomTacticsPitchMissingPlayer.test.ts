import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stagePitchInput } from '@/components/club-manager/LiveSimScreen';
import {
  FORMATIONS, engineRegistrations, playNextEntry, restoreEngineRegistrations,
  slotPosition, startCareer,
} from '@/lib/clubManager';
import type { CareerState, LiveMatch } from '@/lib/clubManager';

let registrations: ReturnType<typeof engineRegistrations>, random: ReturnType<typeof vi.spyOn>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const stream = (initial: number) => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};
beforeEach(() => {
  registrations = engineRegistrations(); localStorage.clear();
  random = vi.spyOn(Math, 'random').mockImplementation(stream(301));
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
});
afterEach(() => { restoreEngineRegistrations(registrations); vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager custom pitch with an actual missing player', () => {
  it('keeps the surviving custom-point indexes after an actual middle-slot red card or injury', () => {
    const base = startCareer('Missing Slot Lab', 'now', {
      name: 'Missing Slot Lab', leagueId: 'premier', stadium: 'Slot Ground',
      budgetTier: 'small', quality: 72, replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'MS' },
    });
    let found: { career: CareerState; live: LiveMatch; id: string; minute: number; kind: string; index: number; seed: number } | null = null;
    for (let attempt = 1; attempt <= 80 && !found; attempt++) {
      random.mockImplementation(stream(8000 + attempt));
      const result = playNextEntry(copy(base)), live = result.state.live;
      if (!live || result.kind !== 'halftime') continue;
      const departures = [
        ...(live.h1Cards ?? []).filter(card => card.kind === 'red').map(card => ({ id: card.id, minute: card.minute, kind: 'red' })),
        ...(live.h1Injuries ?? []).map(injury => ({ id: injury.id, minute: injury.minute, kind: 'injury' })),
      ];
      for (const departure of departures) {
        if (!departure.id || departure.minute > 43) continue;
        const index = live.startXi.indexOf(departure.id);
        if (index < 1 || index > 9) continue;
        const input = stagePitchInput(result.state, live, null, 'first', departure.minute + 1, undefined, 45);
        if (!input.mine.some(figure => Number(figure.key.slice(1)) > index)) continue;
        found = { career: result.state, live, id: departure.id, minute: departure.minute, kind: departure.kind, index, seed: 8000 + attempt };
        break;
      }
    }
    expect(found, 'CM_CUSTOM_STAGE_REAL_MIDDLE_DEPARTURE_FOUND').not.toBeNull();
    if (!found) throw new Error('No actual middle-slot departure was found within the bounded fixture search');
    const { career, live, index, id, minute, kind, seed } = found;
    const formationIndex = live.formationIndex!, formation = FORMATIONS[formationIndex];
    const points = formation.slots.map((_, i) => ({ x: 6 + i * 8, y: 8 + i * 7 }));
    const shape = { v: 1, formationIndex, points };
    // Only the saved-position metadata is synthetic. The departure and on-pitch lineup came from the real engine.
    Object.assign(live, { positionRules: 1, customShape: shape,
      kickoffShape: { formationIndex, duties: [...live.duties!], customShape: copy(shape) } });
    const before = JSON.stringify({ career, live });
    random.mockClear();
    const input = stagePitchInput(career, live, null, 'first', minute + 1, undefined, 45);
    const survivor = input.mine.find(figure => Number(figure.key.slice(1)) > index);
    expect(survivor, 'CM_CUSTOM_STAGE_SURVIVING_LATER_SLOT').toBeDefined();
    const survivorIndex = Number(survivor!.key.slice(1)), slot = formation.slots[survivorIndex];
    const expected = slotPosition(slot, live.mentality, points[survivorIndex]);
    const compacted = slotPosition(slot, live.mentality, points[survivorIndex - 1]);
    const receipt = {
      case: 'middle-departure', fixture: 'Real fictional-club match and real red card or injury; explicit synthetic custom coordinates only',
      seed, departure: { id, index, minute, kind }, survivor: { key: survivor!.key, index: survivorIndex, actual: survivor!.slot },
      expected, compacted, onPitchKeys: input.mine.map(figure => figure.key),
      inputHeld: JSON.stringify({ career, live }) === before, randomDraws: random.mock.calls.length,
    };
    const out = process.env.CM_CUSTOM_STAGE_MISSING_RAW;
    if (out) {
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, 'middle-departure.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    }
    console.info('CM_CUSTOM_STAGE_MISSING ' + JSON.stringify(receipt));
    expect(input.mine.some(figure => figure.key === 'm' + index), 'CM_CUSTOM_STAGE_DEPARTED_SLOT_ABSENT').toBe(false);
    expect(survivorIndex).toBeGreaterThan(index); expect(expected).not.toEqual(compacted);
    expect(JSON.stringify({ career, live })).toBe(before); expect(random).not.toHaveBeenCalled();
    expect(survivor!.slot, 'CM_CUSTOM_STAGE_MIDDLE_SLOT_POINTS').toEqual(expected);
  }, 120000);
});
