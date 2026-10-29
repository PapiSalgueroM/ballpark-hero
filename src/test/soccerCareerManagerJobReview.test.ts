import { describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { advanceReviewedManagerSeason, quoteManagerJob, readManagerJobReview, resolveManagerJob, setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { manager, pending, seeded, withoutReview } from './helpers/managerJobReviewFixtures';
const clubs = E.FALLBACK_CLUBS;
const money = (state: CareerState) => (state as CareerState & { money?: unknown }).money;
function equalRun(actual: ReturnType<typeof seeded<CareerState>>, expected: ReturnType<typeof seeded<CareerState>>) {
  expect(actual.value).toStrictEqual(expected.value);
  expect(serializeSoccerCareerSave(actual.value)).toBe(serializeSoccerCareerSave(expected.value));
  expect(actual.draws).toEqual(expected.draws); expect(actual.next).toBe(expected.next);
}
function restored(state: CareerState) {
  const raw = serializeSoccerCareerSave(state), parsed = parseSoccerCareerSave(raw);
  expect(isSoccerCareerSave(parsed)).toBe(true);
  return seeded(400, () => E.repairCareer(parsed as CareerState)).value;
}
describe('manager job review authority', () => {
  it('absent false and malformed optional preferences preserve canonical state save and every draw', () => {
    for (const metadata of [undefined, false, null, {}, { version: 1, enabled: false }, { version: 9, enabled: true }]) {
      const state = manager() as CareerState & { managerJobReview?: unknown };
      if (metadata !== undefined) state.managerJobReview = metadata;
      const before = structuredClone(state);
      equalRun(seeded(22, () => advanceReviewedManagerSeason(structuredClone(state), clubs)),
        seeded(22, () => E.advanceManagerSeason(structuredClone(state), clubs)));
      expect(state).toStrictEqual(before);
    }
  });
  it('stages only the actual completed poach and preserves all draws national flags money and table', () => {
    const input = setManagerJobReview(manager(), clubs, true), before = structuredClone(input);
    const expected = seeded(22, () => E.advanceManagerSeason(structuredClone(input), clubs));
    const actual = seeded(22, () => advanceReviewedManagerSeason(input, clubs));
    const move = readManagerJobReview(actual.value, clubs)?.pending;
    expect(move).toBeDefined(); expect(move!.to.club).toBe(expected.value.managerState!.club);
    expect(actual.value.managerState!.club).toBe(input.managerState!.club);
    expect(actual.value.managerState!.season).toBe(expected.value.managerState!.season);
    expect(actual.value.managerState!.nationalTeamOffer).toBe(expected.value.managerState!.nationalTeamOffer);
    expect(actual.value.managerState!.managingNationalTeam).toBe(expected.value.managerState!.managingNationalTeam);
    expect(actual.value.managerState!.seasonResults[0].table).toStrictEqual(expected.value.managerState!.seasonResults[0].table);
    expect(money(actual.value)).toStrictEqual(money(expected.value)); expect(actual.value.netWorth).toBe(expected.value.netWorth);
    expect(actual.draws).toEqual(expected.draws); expect(actual.next).toBe(expected.next);
    expect(input).toStrictEqual(before);
  });
  it('accept restores the exact canonical employment era row text and full completed season', () => {
    const input = setManagerJobReview(manager(), clubs, true);
    const canonical = seeded(22, () => E.advanceManagerSeason(structuredClone(input), clubs)).value;
    const state = seeded(22, () => advanceReviewedManagerSeason(input, clubs)).value;
    const quote = quoteManagerJob(state, clubs)!;
    const actual = seeded(7, () => resolveManagerJob(state, clubs, quote, 'accept'));
    expect(withoutReview(actual.value)).toStrictEqual(withoutReview(canonical));
    expect(serializeSoccerCareerSave(withoutReview(actual.value))).toBe(serializeSoccerCareerSave(withoutReview(canonical)));
    expect(actual.draws).toHaveLength(0); expect(readManagerJobReview(actual.value, clubs)?.pending).toBeUndefined();
    expect(actual.value.events).not.toContainEqual(expect.stringContaining('Decision pending'));
  });
  it('stay preserves the completed season and records a declined move without a false hire claim', () => {
    const state = pending(), move = readManagerJobReview(state, clubs)!.pending!;
    const before = structuredClone(state), actual = seeded(9, () => resolveManagerJob(state, clubs, quoteManagerJob(state, clubs)!, 'stay'));
    const next = actual.value;
    expect(next.managerState!.club).toBe(move.from.club); expect(next.managerState!.clubTier).toBe(move.from.clubTier);
    expect(next.managerState!.seasonResults[move.rowIndex].result).toContain('Stayed with '+move.from.club);
    expect(next.managerState!.seasonResults[move.rowIndex].tier).toBe(move.from.clubTier);
    expect(next.events[move.eventIndex]).toContain('instead of joining '+move.to.club);
    expect(next.events[move.eventIndex]).not.toContain(' And HIRED by ');
    expect(next.managerState!.seasonResults[move.rowIndex].table).toStrictEqual(before.managerState!.seasonResults[move.rowIndex].table);
    expect(money(next)).toStrictEqual(money(before)); expect(next.netWorth).toBe(before.netWorth);
    expect(next.managerState!.nationalTeamOffer).toBe(before.managerState!.nationalTeamOffer);
    expect(actual.draws).toHaveLength(0); expect(state).toStrictEqual(before);
  });
  it('pending choices block another season and mode changes with zero draws', () => {
    const state = pending();
    expect(readManagerJobReview(state, clubs)?.pending).toBeDefined();
    const actual = seeded(1, () => [advanceReviewedManagerSeason(state, clubs), setManagerJobReview(state, clubs, false)]);
    expect(actual.value).toEqual([state, state]); expect(actual.value.every(row => row === state)).toBe(true);
    expect(actual.draws).toHaveLength(0);
  });
  it('stale and duplicate choice requests leave the current state untouched without random work', () => {
    const state = pending(), quote = quoteManagerJob(state, clubs)!;
    const changed = structuredClone(state);
    const actual = seeded(1, () => resolveManagerJob(changed, clubs, quote, 'accept'));
    expect(actual.value).toBe(changed); expect(actual.draws).toHaveLength(0);
    const accepted = resolveManagerJob(state, clubs, quote, 'accept');
    const duplicate = seeded(2, () => resolveManagerJob(accepted, clubs, quote, 'accept'));
    expect(duplicate.value).toBe(accepted); expect(duplicate.draws).toHaveLength(0);
  });
  it('a current quote preserves cash phone and appended events made after the approach', () => {
    const state = pending(), deposited = E.applyMoneyAction(state, { t: 'deposit', amount: 0.1 }).state;
    expect(deposited).not.toBe(state); expect(deposited.netWorth).not.toBe(state.netWorth);
    expect(money(deposited)).not.toStrictEqual(money(state));
    const current = { ...deposited, events: [...deposited.events, 'Test-only simulated phone transaction'] };
    const actual = seeded(3, () => resolveManagerJob(current, clubs, quoteManagerJob(current, clubs)!, 'accept'));
    expect(actual.value.netWorth).toBe(current.netWorth);
    expect(actual.value.events[actual.value.events.length - 1]).toBe('Test-only simulated phone transaction');
    expect(money(actual.value)).toStrictEqual(money(current)); expect(actual.draws).toHaveLength(0);
  });
  it('same-name ambiguous and changed pools keep the actual canonical season without guessing, and a missing source still asks', () => {
    const input = setManagerJobReview(manager(), clubs, true);
    const canonical = seeded(22, () => E.advanceManagerSeason(structuredClone(input), clubs)).value;
    const target = clubs.find(row => row.name === canonical.managerState!.club)!;
    for (const pool of [[...clubs, { ...target }]]) {
      equalRun(seeded(22, () => advanceReviewedManagerSeason(structuredClone(input), pool)),
        seeded(22, () => E.advanceManagerSeason(structuredClone(input), pool)));
    }
    /* Release BS fix BS-sc419-1: a source club the pool does not hold (a job taken off the market) is
       still asked about, because Stay restores the stored from tuple; only the destination needs the pool. */
    const missing = clubs.filter(row => row.name !== input.managerState!.club);
    const canonicalMissing = seeded(22, () => E.advanceManagerSeason(structuredClone(input), missing)).value;
    const reviewedMissing = seeded(22, () => advanceReviewedManagerSeason(structuredClone(input), missing)).value;
    expect(readManagerJobReview(reviewedMissing, missing)?.pending?.to.club).toBe(canonicalMissing.managerState!.club);
    expect(reviewedMissing.managerState!.club).toBe(input.managerState!.club);
    const state = pending(), ambiguous = [...clubs, { ...target }];
    expect(readManagerJobReview(state, ambiguous)).toBeNull();
    expect(quoteManagerJob(state, ambiguous)).toBeNull();
  });
  it('old poached departure without a fresh club change never manufactures a pending approach', () => {
    const input = setManagerJobReview(manager(), clubs, true);
    input.managerState = { ...input.managerState!, departure: 'poached' };
    let compared = 0;
    for (let seed = 1; seed <= 64; seed++) {
      const expected = seeded(seed, () => E.advanceManagerSeason(structuredClone(input), clubs));
      if (expected.value.managerState!.club !== input.managerState!.club) continue;
      equalRun(seeded(seed, () => advanceReviewedManagerSeason(structuredClone(input), clubs)), expected); compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });
  it('a club promoted above its original data tier still stages its actual earned approach', () => {
    const input = setManagerJobReview(manager(), clubs, true);
    input.managerState = { ...input.managerState!, clubTier: 2, promotions: 2 };
    expect(clubs.find(club => club.name === input.managerState!.club)!.tier).toBe(3);
    let witness: { seed: number; run: ReturnType<typeof seeded<CareerState>> } | undefined;
    for (let seed = 1; seed <= 1024; seed++) {
      const run = seeded(seed, () => E.advanceManagerSeason(structuredClone(input), clubs));
      const ms = run.value.managerState!, row = ms.seasonResults[ms.seasonResults.length - 1];
      if (ms.club !== input.managerState.club && ms.clubTier < 2 && ms.departure === 'poached'
        && ms.promotions === input.managerState.promotions && (row.playerPos === 3 || row.playerPos === 4)) { witness = { seed, run }; break; }
    }
    expect(witness).toBeDefined();
    const actual = seeded(witness!.seed, () => advanceReviewedManagerSeason(structuredClone(input), clubs));
    expect(readManagerJobReview(actual.value, clubs)?.pending?.from.clubTier).toBe(2);
    expect(actual.draws).toEqual(witness!.run.draws); expect(actual.next).toBe(witness!.run.next);
    const accepted = resolveManagerJob(actual.value, clubs, quoteManagerJob(actual.value, clubs)!, 'accept');
    expect(withoutReview(accepted)).toStrictEqual(withoutReview(witness!.run.value));
    const stayed = resolveManagerJob(actual.value, clubs, quoteManagerJob(actual.value, clubs)!, 'stay');
    expect(stayed.managerState!.club).toBe(input.managerState.club); expect(stayed.managerState!.clubTier).toBe(2);
    expect(stayed.managerState!.promotions).toBe(input.managerState.promotions);
  });
  it('non-poach seasons retain full canonical results and random stream across actual outcomes', () => {
    const input = setManagerJobReview(manager(), clubs, true);
    let compared = 0;
    for (let seed = 1; seed <= 64; seed++) {
      const expected = seeded(seed, () => E.advanceManagerSeason(structuredClone(input), clubs));
      if (expected.value.managerState!.club !== input.managerState!.club) continue;
      equalRun(seeded(seed, () => advanceReviewedManagerSeason(structuredClone(input), clubs)), expected); compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });
  it('an opted-in unemployed season remains the canonical market money and random outcome', async () => {
    await E.loadManagerMarket();
    const input = setManagerJobReview(manager(), clubs, true);
    input.managerState = { ...input.managerState!, unemployed: true, seasonsOut: 1, departure: 'sacked' };
    equalRun(seeded(51, () => advanceReviewedManagerSeason(structuredClone(input), clubs)),
      seeded(51, () => E.advanceManagerSeason(structuredClone(input), clubs)));
  });
  it('official save parse repair retains pending and resolved choices in small and packed histories', () => {
    for (const mode of ['small', 'history', 'whole']) {
      let state = pending();
      if (mode === 'history') state = { ...state, seasons: [...state.seasons.slice(0, -1), ...Array.from({ length: 120 }, (_, i) => ({ ...state.seasons[0], story: 'Test-only stored detail '+i+' '+('x'.repeat(900)) })), ...state.seasons.slice(-1)] };
      if (mode === 'whole') { const padded = { ...state, fixturePadding: Array.from({ length: 22000 }, (_, i) => i.toString(36)).join('|') }; state = padded; }
      const encoded = JSON.parse(serializeSoccerCareerSave(state));
      if (mode === 'history') expect(encoded.seasons.format).toBe('lz-string-utf16');
      if (mode === 'whole') expect(encoded.seasons.format).toBe('lz-string-utf16-career');
      const saved = restored(state);
      expect(readManagerJobReview(saved, clubs)?.pending?.to.club).toBe(readManagerJobReview(state, clubs)?.pending?.to.club);
      const accepted = resolveManagerJob(saved, clubs, quoteManagerJob(saved, clubs)!, 'accept');
      expect(readManagerJobReview(restored(accepted), clubs)?.pending).toBeUndefined();
      expect(restored(accepted).managerState).toStrictEqual(accepted.managerState);
      const stayed = resolveManagerJob(saved, clubs, quoteManagerJob(saved, clubs)!, 'stay');
      expect(restored(stayed).managerState).toStrictEqual(stayed.managerState);
    }
  });
  it('malformed or out-of-phase pending metadata cannot resolve or erase current money', () => {
    const state = pending() as CareerState & { managerJobReview?: unknown };
    const record = structuredClone(state.managerJobReview) as { pending: { season: number; to: { club: string } } };
    for (const bad of [{ ...record, pending: null }, { ...record, pending: { ...record.pending, season: -1 } },
      { ...record, pending: { ...record.pending, to: { ...record.pending.to, club: 'Not a recorded destination' } } }]) {
      const current = { ...state, managerJobReview: bad };
      expect(readManagerJobReview(current, clubs)).toBeNull();
      const actual = seeded(5, () => resolveManagerJob(current, clubs, { source: current, season: 3, destination: 'Man City' }, 'accept'));
      expect(actual.value).toBe(current); expect(actual.value.netWorth).toBe(state.netWorth); expect(actual.draws).toHaveLength(0);
    }
    const ended = { ...state, phase: 'retired' as const };
    expect(quoteManagerJob(ended, clubs)).toBeNull();
  });
});
