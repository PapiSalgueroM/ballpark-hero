import { describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import { answerMessage } from '@/lib/clubManager';
import {
  DECK, DESK_CAP, SITUATION_RATE, answerDecision, buildSituation, deskOf,
  situationCard, type DeckCard, type DeskEffect,
} from '@/lib/clubManagerDecisions';

/* These are simulated unit fixtures, not additional real player data. The
 * browser proof separately obtains its context fields from played careers. */
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const player = (id: string, extra: Partial<CMPlayer> = {}): CMPlayer => ({
  id, name: `Fixture player ${id}`, position: 'CM', rating: 70, age: 24,
  fitness: 90, morale: 65, injuryWeeks: 0, suspendedMatches: 0,
  isYouth: false, seasonGoals: 0, seasonAssists: 0, apps: 8,
  lastTen: [1, 1, 1, 1, 1], ...extra,
});
const career = (extra: Partial<CareerState> = {}): CareerState => ({
  clubName: 'Fixture Town', season: 2, week: 12, budget: 40.123,
  boardConfidence: 60, sacked: false, form: ['W', 'W', 'W'],
  squad: [player('a'), player('b')], xiIds: ['a'],
  press: { mood: 50, pending: null, lastWeek: 0, answered: 0, ducked: 0, nextFire: 0, nextSharpen: 0 },
  inbox: [], decisions: [], ...extra,
} as unknown as CareerState);

const move = (meter: 'board' | 'press' | 'morale', delta: number): DeskEffect => ({ kind: 'move', meter, delta });
const none: DeskEffect = { kind: 'none' };
type Contract = {
  id: string;
  effects: DeskEffect[];
  positive: () => CareerState;
  negative: Array<[string, () => CareerState]>;
  context: (state: CareerState, card: ReturnType<typeof buildSituation>) => void;
};
const contracts: Contract[] = [
  {
    id: 'poorRun', effects: [move('board', 3), move('press', 3), none],
    positive: () => career({ form: ['W', 'L', 'L'] }),
    negative: [
      ['fewer than three results', () => career({ form: ['L', 'L'] })],
      ['only one loss in the last three', () => career({ form: ['L', 'L', 'W', 'D'] })],
      ['no press meter', () => career({ form: ['W', 'L', 'L'], press: undefined })],
    ],
    context: (_state, card) => expect(card.text).toMatch(/(?:two|2).*loss|lost.*(?:two|2)/i),
  },
  {
    id: 'boardPressure', effects: [move('board', 3), move('press', 3), none],
    positive: () => career({ boardConfidence: 34 }),
    negative: [
      ['the boundary is not under 35', () => career({ boardConfidence: 35 })],
      ['healthy board', () => career({ boardConfidence: 80 })],
      ['no press meter', () => career({ boardConfidence: 34, press: undefined })],
    ],
    context: (state, card) => expect(card.text).toContain(String(state.boardConfidence)),
  },
  {
    id: 'pressPressure', effects: [move('press', 4), move('board', 3), none],
    positive: () => career({ press: { ...career().press!, mood: 34 } }),
    negative: [
      ['the boundary is not under 35', () => career({ press: { ...career().press!, mood: 35 } })],
      ['healthy press', () => career()],
      ['missing press', () => career({ press: undefined })],
    ],
    context: (state, card) => expect(card.text).toContain(String(state.press!.mood)),
  },
  {
    id: 'injurySupport', effects: [move('morale', 6), move('board', 2), none],
    positive: () => career({ squad: [player('a', { injuryWeeks: 2, morale: 74 }), player('b')] }),
    negative: [
      ['no recorded injury', () => career({ squad: [player('a', { morale: 30 })] })],
      ['morale is not under 75', () => career({ squad: [player('a', { injuryWeeks: 2, morale: 75 })] })],
      ['nobody remains in squad', () => career({ squad: [] })],
    ],
    context: (state, card) => {
      expect(card.playerId).toBe('a');
      expect(card.text).toContain(state.squad[0].name);
      expect(card.text).toContain(String(state.squad[0].injuryWeeks));
    },
  },
  {
    id: 'academyStepUp', effects: [move('morale', 6), move('board', 2), none],
    positive: () => career({ squad: [player('a', { academyGrad: true, apps: 1, morale: 82 }), player('b')] }),
    negative: [
      ['not an academy graduate', () => career({ squad: [player('a', { apps: 1 })] })],
      ['no first-team appearance yet', () => career({ squad: [player('a', { academyGrad: true, apps: 0 })] })],
      ['past the first three appearances', () => career({ squad: [player('a', { academyGrad: true, apps: 4 })] })],
      ['old save without appearances', () => career({ squad: [player('a', { academyGrad: true, apps: undefined })] })],
    ],
    context: (state, card) => {
      expect(card.playerId).toBe('a');
      expect(card.text).toContain(state.squad[0].name);
      expect(card.text).toContain(String(state.squad[0].apps));
    },
  },
  {
    id: 'minutesCheck', effects: [move('morale', 6), move('board', 2), none],
    positive: () => career({ squad: [player('a', { lastTen: [0, 0, 0.2, 0.2, 1], morale: 69 }), player('b')] }),
    negative: [
      ['too little history', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0] })] })],
      ['share exactly 0.3', () => career({ squad: [player('a', { lastTen: [1, 0.5, 0, 0, 0] })] })],
      ['morale exactly 70', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0, 0], morale: 70 })] })],
      ['unavailable injured player', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0, 0], injuryWeeks: 1 })] })],
      ['unavailable suspended player', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0, 0], suspendedMatches: 1 })] })],
      ['loan player', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0, 0], onLoan: true })] })],
      ['youth placeholder', () => career({ squad: [player('a', { lastTen: [0, 0, 0, 0, 0], isYouth: true })] })],
    ],
    context: (state, card) => {
      expect(card.playerId).toBe('a');
      expect(card.text).toContain(state.squad[0].name);
      expect(card.text).toContain(String(state.squad[0].lastTen!.length));
    },
  },
];

function eligible(card: DeckCard, state: CareerState): boolean {
  return card.fits(state) && (!card.who || !!card.who(state));
}
const withoutDesk = (state: CareerState): unknown => {
  const copy = clone(state);
  delete copy.decisions;
  return copy;
};
const rounded = (number: number): number => Math.round(number * 10) / 10;

function checkAnswer(state: CareerState, definition: DeckCard, index: number): void {
  const card = buildSituation(state, definition);
  const before = { ...state, decisions: [card] };
  const inputBytes = JSON.stringify(before);
  const after = answerMessage(before, card.id, index);
  expect(JSON.stringify(before)).toBe(inputBytes);
  expect(after).toEqual(answerDecision(before, card.id, index));
  const effect = card.options[index].effect;
  const expected = clone(before);
  let actualDelta = 0;
  if (effect.kind === 'move') {
    if (effect.meter === 'board') {
      expected.boardConfidence = Math.min(100, Math.max(1, before.boardConfidence + effect.delta));
      actualDelta = rounded(expected.boardConfidence - before.boardConfidence);
    } else if (effect.meter === 'press') {
      expected.press!.mood = Math.min(100, Math.max(0, before.press!.mood + effect.delta));
      actualDelta = rounded(expected.press!.mood - before.press!.mood);
    } else if (effect.meter === 'morale') {
      const playerBefore = before.squad.find(player => player.id === card.playerId)!;
      const playerAfter = expected.squad.find(player => player.id === card.playerId)!;
      playerAfter.morale = Math.min(99, Math.max(5, playerBefore.morale + effect.delta));
      actualDelta = rounded(playerAfter.morale - playerBefore.morale);
    } else {
      expected.budget = Math.round((before.budget + effect.delta) * 1000) / 1000;
      actualDelta = rounded(expected.budget - before.budget);
    }
  }
  expect(withoutDesk(after)).toEqual(withoutDesk(expected));
  const resolved = deskOf(after).find(item => item.id === card.id)!;
  expect(resolved.options).toEqual([]);
  expect(resolved.resolved).toBeTruthy();
  if (effect.kind === 'none') expect(resolved.resolved).toBe('Noted. Nothing changed.');
  if (effect.kind === 'move') expect(resolved.resolved).toContain(`${actualDelta > 0 ? '+' : ''}${actualDelta}`);
  expect(answerMessage(after, card.id, index)).toBe(after);
  expect(answerMessage(after, card.id, 999)).toBe(after);
  expect(answerMessage(before, card.id, -1)).toBe(before);
  expect(answerMessage(before, card.id, 999)).toBe(before);
}

describe('Club Manager recorded-context decision depth', () => {
  it('preserves the seven existing card identities and desk limits', () => {
    const old = ['promoShoot', 'investorsNight', 'quietWord', 'schoolVisit', 'columnist', 'spareFunds', 'finesKitty'];
    for (const id of old) expect(DECK.filter(card => card.id === id)).toHaveLength(1);
    expect(DESK_CAP).toBe(6);
    expect(SITUATION_RATE).toBe(0.3);
  });

  for (const contract of contracts) {
    /* On the unchanged baseline these six assertions fail specifically at
     * catalog absence, before any new effect or setup receives credit. */
    it(`${contract.id}: recorded eligibility, exact options, saved effects and one answer`, () => {
      const matching = DECK.filter(card => card.id === contract.id);
      expect(matching, `Missing recorded context ${contract.id}`).toHaveLength(1);
      const definition = matching[0];
      const state = contract.positive();
      expect(eligible(definition, state)).toBe(true);
      for (const [reason, negative] of contract.negative) expect(eligible(definition, negative()), reason).toBe(false);
      expect(definition.options.map(option => option.effect)).toEqual(contract.effects);
      const card = buildSituation(state, definition);
      contract.context(state, card);
      expect(card.from).not.toMatch(/Fixture player/);
      expect(card.text).not.toMatch(/[\u2013\u2014"]|\bundefined\b|\bNaN\b/);
      expect(card.options[card.options.length - 1]?.effect.kind).toBe('none');
      card.options.forEach((_, index) => checkAnswer(state, definition, index));

      const bounded = clone(state);
      bounded.boardConfidence = 99;
      if (bounded.press) bounded.press.mood = 99;
      for (const player of bounded.squad) player.morale = 98;
      /* The selected player is kept on the already offered card. No claim is
       * made that a now healthy player would receive a new support card. */
      const offered = buildSituation(state, definition);
      for (let index = 0; index < offered.options.length; index++) {
        const before = { ...bounded, decisions: [offered] };
        const after = answerDecision(before, offered.id, index);
        const effect = offered.options[index].effect;
        if (effect.kind !== 'move') continue;
        const delta = effect.meter === 'board' ? after.boardConfidence - before.boardConfidence
          : effect.meter === 'press' ? after.press!.mood - before.press!.mood
            : after.squad.find(player => player.id === offered.playerId)!.morale - 98;
        expect(deskOf(after)[0].resolved).toContain(`+${rounded(delta)}`);
      }

      const random = vi.spyOn(Math, 'random');
      try {
        let offeredNaturally = false;
        for (let week = 1; week <= 600; week++) {
          const probe = { ...state, week };
          const first = situationCard(probe, []);
          expect(situationCard(probe, [])).toEqual(first);
          if (first?.deckId === contract.id) offeredNaturally = true;
        }
        expect(offeredNaturally, 'Deterministic offer gate can actually select this eligible card').toBe(true);
        expect(random).not.toHaveBeenCalled();
      } finally { random.mockRestore(); }
    });
  }
});
