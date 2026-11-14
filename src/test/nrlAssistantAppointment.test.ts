import { expect, it } from 'vitest';
import { createNrlCareer, nrlCoachQuote, nrlCoachTactics, nrlCoachSpend, nrlOfferAssistantQuote, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerState } from '@/lib/nrlCareer';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const play = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = play(state);
  return state;
}

it.each([[2026, 'storm', 'bears'], [2027, 'storm', 'chiefs']] as const)(
  'brings the same qualified tactical assistant on an earned %i club offer',
  (year, clubId, destinationId) => {
    const opening = createNrlCareer(clubId, 4, year);
    const hired = reduceNrlCareer(opening, { type: 'hireCoach', role: 'attack', year, round: 1 });
    const enrolled = reduceNrlCareer(hired, { type: 'startCoachCourse', year, clubId, round: 1 });
    expect(enrolled.finance.coachCourseRound).toBe(1);
    const ended = finish(enrolled);
    const acceptance = { type: 'acceptOffseasonJob', year, clubId, destinationId } as const;
    expect(nrlOfferAssistantQuote(ended, destinationId)).toBeNull();
    const offered = reduceNrlCareer(ended, { ...acceptance, type: 'applyForOffseasonJob' });
    const current = nrlCoachQuote(offered).current!;
    const terms = nrlOfferAssistantQuote(offered, destinationId)!;
    expect(terms.name).toBe(current.name);
    expect(terms.reason).toBeNull();
    expect(terms.reservedWages).toBeGreaterThan(0);
    expect(read(offered)).toEqual(offered);

    const ordinary = reduceNrlCareer(offered, acceptance);
    const joined = reduceNrlCareer(offered, { ...acceptance, bringAssistant: true });
    expect(joined.players).toEqual(ordinary.players);
    expect(joined.season).toEqual(ordinary.season);
    expect(joined.finance.openingCash).toBe(ordinary.finance.openingCash);
    expect(joined.history.at(-1)?.appointment).toEqual(ordinary.history.at(-1)?.appointment);
    expect(ordinary.history.at(-1)?.coachRetained).toBeUndefined();
    expect(ordinary.finance.coachHire).toBeUndefined();
    expect(joined.history.at(-1)?.coachRetained).toBe(true);
    expect(joined.finance.coachHire).toEqual({ role: 'attack', round: 1, paidRounds: 0, retained: true, qualified: true });
    expect(nrlCoachQuote(joined).current).toEqual(current);
    expect(nrlCoachTactics(joined.finance)).toEqual({ coachRole: 'attack', coachBonus: 3 });
    expect(nrlCoachSpend(joined.finance)).toEqual({ signingFee: 0, wages: 0 });
    expect(nrlCoachSpend(play(joined).finance)).toEqual({ signingFee: 0, wages: 18_000 });
    expect(read(joined)).toEqual(joined);
    expect(read(play(joined))).toEqual(play(joined));
    expect(reduceNrlCareer(ended, { ...acceptance, bringAssistant: true })).toBe(ended);
    expect(reduceNrlCareer(offered, { ...acceptance, year: year - 1, bringAssistant: true })).toBe(offered);
    expect(reduceNrlCareer(offered, { ...acceptance, destinationId: 'knights', bringAssistant: true })).toBe(offered);
    expect(reduceNrlCareer(joined, { ...acceptance, bringAssistant: true })).toBe(joined);
    const corrupted = { ...joined, history: [...joined.history.slice(0, -1), { ...joined.history.at(-1)!, appointment: undefined }] };
    expect(read(corrupted)).toBeNull();
  },
);

it('uses the extra point in the actual match and cannot carry the same extension again', () => {
  const year = 2026, clubId = 'dolphins', destinationId = 'bears';
  const initial = createNrlCareer(clubId, 1, year);
  const hired = reduceNrlCareer(initial, { type: 'hireCoach', role: 'attack', year, round: 1 });
  const enrolled = reduceNrlCareer(hired, { type: 'startCoachCourse', year, clubId, round: 1 });
  const ended = finish(enrolled);
  const offered = reduceNrlCareer(ended, { type: 'applyForOffseasonJob', year, clubId, destinationId });
  const accept = { type: 'acceptOffseasonJob', year, clubId, destinationId } as const;
  const ordinary = reduceNrlCareer(offered, accept);
  const newHire = reduceNrlCareer(ordinary, { type: 'hireCoach', role: 'attack', year: year + 1, round: 1 });
  const incoming = reduceNrlCareer(offered, { ...accept, bringAssistant: true });
  const withAttack = (state: NrlCareerState) => play(reduceNrlCareer(state, { type: 'setTactic', tactic: 'attack' }));
  const score = (state: NrlCareerState) => {
    const match = withAttack(state).season.results.find(row => row.playerScoring)!;
    return [match.homeScore, match.awayScore];
  };
  expect(score(ordinary)).toEqual([22, 10]);
  expect(score(newHire)).toEqual([22, 10]);
  expect(score(incoming)).toEqual([22, 16]);

  const next = finish(incoming);
  expect(read(next)).toEqual(next);
  const nextOffer = reduceNrlCareer(next, { type: 'applyForOffseasonJob', year: year + 1, clubId: destinationId, destinationId: 'chiefs' });
  const nextAccept = { type: 'acceptOffseasonJob', year: year + 1, clubId: destinationId, destinationId: 'chiefs' } as const;
  expect(nrlOfferAssistantQuote(nextOffer, 'chiefs')).toBeNull();
  expect(reduceNrlCareer(nextOffer, { ...nextAccept, bringAssistant: true })).toBe(nextOffer);
  const joined = reduceNrlCareer(nextOffer, nextAccept);
  expect(joined.finance.coachHire).toBeUndefined();
  expect(joined.history[0].coachRetained).toBe(true);
  expect(read(joined)).toEqual(joined);
});
