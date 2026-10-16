import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_CLUBS, initCareer, type CareerState, type RandomEvent } from '@/lib/soccerCareerEngine';
import { getLifeEvents } from '@/lib/soccerCareerLife';
import { soccerEventChoiceConsequence } from '@/lib/soccerCareerContracts';

const PREVIEWS = [
  { id: 227, index: 0,
    saved: '40%: they won it all (+€2M). 60%: they folded (-€300k more)',
    expected: '40%: they won it all (Net worth +€2M, Followers +500k). 60%: they folded (Net worth -€300k)' },
  { id: 230, index: 0,
    saved: 'Science! The curse saga continues next season',
    expected: 'Morale -3, the curse saga continues next season' },
  { id: 230, index: 1,
    saved: 'Morale +5, sponsor mildly concerned, the video goes viral',
    expected: 'Morale +5, Followers +400k, sponsor mildly concerned' },
  { id: 232, index: 0,
    saved: '60%: it passes, Legacy +8. 40%: rejected 5 votes to 4, ouch',
    expected: '60%: Integrity +8, Morale +8. 40%: Morale -5' },
] as const;

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function withRandom<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}
function career(): CareerState {
  return withRandom(0.99, () => {
    const stats = { pace: 84, shooting: 84, passing: 84, dribbling: 84, defending: 84, physical: 84, reflexes: 84 };
    const initial = initCareer('Choice Preview Fixture', 'England', 'CM', '2020s', stats, 84, 2020, FALLBACK_CLUBS, null, 90);
    return { ...initial, phase: 'playing', age: 28, retired: false, personality: 'professor', agentId: 'self',
      overall: 84, netWorth: 10, morale: 60, socialMediaFollowers: 1, integrityBonus: 5,
      lifeFlags: { esports: 1 }, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2 }, events: ['Prepared fictional choice context'] };
  });
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = withRandom(0.99, () => getLifeEvents(state).filter(event => event.id === id));
  expect(matches, `actual Life card ${id} must be available`).toHaveLength(1);
  return matches[0];
}

describe('Soccer Career Life choice previews', () => {
  for (const { id, index, saved, expected } of PREVIEWS) {
    it(`fresh choice preview ${id}:${index}`, () => {
      expect(card(career(), id).choices[index].consequence).toBe(expected);
    });

    it(`restored choice preview ${id}:${index}`, () => {
      const state = career(), event = card(state, id);
      event.choices[index].consequence = saved;
      const restored = json({ ...state, phase: 'random_events', pendingEvents: [event] });
      const choice = restored.pendingEvents[0].choices[index];
      expect(choice.apply).toBeUndefined();
      expect(soccerEventChoiceConsequence(restored, id, index, choice.consequence)).toBe(expected);
    });
  }

  const outcomes: { name: string; id: number; index: number; roll?: number; changes: Partial<CareerState> }[] = [
    { name: 'esports win below the 40 percent boundary', id: 227, index: 0, roll: 0.399999,
      changes: { netWorth: 12, socialMediaFollowers: 1.5, lifeFlags: { esports: 2 } } },
    { name: 'esports loss at the 40 percent boundary', id: 227, index: 0, roll: 0.4,
      changes: { netWorth: 9.7, lifeFlags: { esports: 2 } } },
    { name: 'keeping the boots costs three morale', id: 230, index: 0,
      changes: { morale: 57, lifeFlags: { esports: 1, cursedBoots: 1 } } },
    { name: 'burning the boots adds morale and followers', id: 230, index: 1,
      changes: { morale: 65, socialMediaFollowers: 1.4 } },
    { name: 'statue success below the 60 percent boundary', id: 232, index: 0, roll: 0.599999,
      changes: { integrityBonus: 13, morale: 68 } },
    { name: 'statue rejection at the 60 percent boundary', id: 232, index: 0, roll: 0.6,
      changes: { morale: 55 } },
  ];
  for (const { name, id, index, roll, changes } of outcomes) {
    it(`existing choice effect: ${name}`, () => {
      const state = career(), event = card(state, id), before = json(state);
      const random = vi.spyOn(Math, 'random').mockReturnValue(roll ?? 0.99);
      try {
        const after = event.choices[index].apply(state);
        expect(random).toHaveBeenCalledTimes(roll === undefined ? 0 : 1);
        expect(after.events.slice(0, before.events.length)).toEqual(before.events);
        expect(after.events).toHaveLength(before.events.length + 1);
        expect(after.events[after.events.length - 1].trim().length).toBeGreaterThan(0);
        if (roll !== undefined) {
          expect(after.chanceWheel).toEqual(id === 227
            ? { title: 'Esports Season Results', chance: 0.4, roll, hit: 'Your team wins',
              miss: 'The organisation folds', result: roll < 0.4, seen: false }
            : { title: 'The Statue Vote', chance: 0.6, roll, hit: 'Statue vote passes',
              miss: 'Statue vote fails', result: roll < 0.6, seen: false });
        } else expect(after.chanceWheel).toEqual(before.chanceWheel);
        expect(json(after)).toEqual(json({ ...before, ...changes,
          events: after.events, ...(roll === undefined ? {} : { chanceWheel: after.chanceWheel }) }));
      } finally { random.mockRestore(); }
    });
  }

  it('unknown events preserve their saved consequence', () => {
    expect(soccerEventChoiceConsequence(career(), 999999, 0, 'Saved future choice')).toBe('Saved future choice');
  });

  it('untouched sibling choices preserve their saved consequence', () => {
    const state = career(), saved = card(state, 227).choices[1].consequence;
    expect(saved).toBe('Net worth +€500k back, you never find out how they did');
    expect(soccerEventChoiceConsequence(state, 227, 1, saved)).toBe(saved);
  });

  it('unknown choice indices preserve their saved consequence', () => {
    expect(soccerEventChoiceConsequence(career(), 230, 99, 'Saved extra option')).toBe('Saved extra option');
  });

  it('caption reads leave the save and random stream untouched', () => {
    const state = career(), before = JSON.stringify(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Caption lookup must not draw'); });
    try {
      for (const { id, index, saved } of PREVIEWS) soccerEventChoiceConsequence(state, id, index, saved);
      expect(random).not.toHaveBeenCalled();
      expect(JSON.stringify(state)).toBe(before);
    } finally { random.mockRestore(); }
  });
});
