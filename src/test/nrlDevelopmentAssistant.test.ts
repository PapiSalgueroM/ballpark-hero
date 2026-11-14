import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCoachQuote, nrlDevelopmentAssistantProgress, nrlOppositionReport,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench } from '@/lib/nrlManager';

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const hire = (career: NrlCareerState) => reduceNrlCareer(career, {
  type: 'hireCoach', role: 'development', year: career.season.year, clubId: career.season.clubId, round: career.season.round,
});
const next = (career: NrlCareerState, clubId?: string) => reduceNrlCareer(career, {
  type: 'startNextSeason', move: clubId ? { fromYear: career.season.year, clubId } : undefined,
});
const read = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));

function until(career: NrlCareerState, done: (state: NrlCareerState) => boolean) {
  while (!done(career) && career.season.phase !== 'complete') career = advance(career);
  return career;
}

const finish = (career: NrlCareerState) => until(career, ({ season }) => season.phase === 'complete');
const progress = (career: NrlCareerState) => nrlDevelopmentAssistantProgress(career);

function ownResults(career: NrlCareerState) {
  const { clubId, results } = career.season;
  return results.filter(result => [result.homeId, result.awayId].includes(clubId));
}

describe('NRL development assistant', () => {
  it('retains the same development assistant with a fresh appearance count and the existing potential ceiling', () => {
    const completed = finish(hire(createNrlCareer('storm', 5)));
    const pending = reduceNrlCareer(completed, { type: 'setCoachRetention', enabled: true, year: 2026, clubId: 'storm' });
    const retained = next(read(pending)!);
    expect(nrlCoachQuote(retained).current).toEqual(nrlCoachQuote(completed).current);
    expect(retained.history[0].coachDevelopment).toEqual(next(completed).history[0].coachDevelopment);
    expect(progress(retained).length).toBeGreaterThan(0);
    expect(progress(retained).every(row => row.apps === 0)).toBe(true);
    const second = finish(retained);
    const third = next(second);
    expect(third.history[1].coachDevelopment?.length).toBeLessThanOrEqual(3);
    expect(third.players.every(player => player.rating <= player.potential)).toBe(true);
    expect(read(third)).toEqual(third);
  });

  it.each([[2026, 'storm'], [2027, 'bears']] as const)('uses the existing season hire and salary reserve in %s', (year, clubId) => {
    const initial = createNrlCareer(clubId, 39, year);
    const quote = nrlCoachQuote(initial);
    expect(quote.candidates.map(candidate => candidate.role)).toEqual(['attack', 'defense', 'development']);
    expect(new Set(quote.candidates.map(candidate => candidate.name)).size).toBe(3);
    expect(quote.developmentReason).toBeNull();
    const hired = hire(initial);
    expect(hired.finance.coachHire).toEqual({ role: 'development', round: 1, paidRounds: 0 });
    expect(nrlCoachQuote(hired).current).toEqual(quote.candidates[2]);
    expect(hire(hired)).toBe(hired);
    expect(hired.season).toBe(initial.season);
    expect(nrlCareerCap(hired)).toEqual(nrlCareerCap(initial));
    expect(nrlCareerFinance(hired).cash).toBe(nrlCareerFinance(initial).cash - 120_000);
    expect(nrlOppositionReport(hired)).toEqual(nrlOppositionReport(initial));
    expect(read(hired)).toEqual(hired);
    const live = reduceNrlCareer(hired, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(live.season.live).toEqual(reduceNrlCareer(initial, { type: 'startLive' }).season.live);
    expect(read(live)).toEqual(live);
    const settled = advance(hired);
    expect(settled.season).toEqual(advance(initial).season);
    expect(settled.finance.coachHire?.paidRounds).toBe(1);
    expect(nrlCareerFinance(settled).cash).toBe(nrlCareerFinance(advance(initial)).cash - 138_000);
    expect(read(settled)).toEqual(settled);
  });

  it('uses actual first-grade appearances since the hire, including used reserves but not listed reserves', () => {
    const initial = createNrlCareer('storm', 5);
    const beforeHire = until(initial, ({ season }) => season.round === 8);
    const hired = hire(beforeHire);
    expect(progress(hired).every(row => row.apps === 0)).toBe(true);
    const finished = finish(hired);
    const eligible = progress(finished);
    expect(eligible.length).toBeGreaterThan(3);
    for (const row of eligible) {
      const matches = ownResults(finished).filter(result => !result.finalsRound && result.round >= 8);
      expect(row.apps).toBe(matches.filter(result => result.playerScoring?.starters.includes(row.id)
        || result.benchUsed?.includes(row.id)).length);
      expect(finished.players.find(player => player.id === row.id)!.age).toBeLessThanOrEqual(23);
    }
    const usedAndUnused = advance(hire(initial));
    const first = ownResults(usedAndUnused)[0];
    expect(progress(usedAndUnused).some(row => first.benchUsed?.includes(row.id) && row.apps === 1)).toBe(true);
    expect(progress(usedAndUnused).some(row => nrlBench(initial.season).includes(row.id) && !first.benchUsed?.includes(row.id) && row.apps === 0)).toBe(true);
  });

  it('gives the first three eligible returning players one point after eight appearances and carries their ratings into rollover', () => {
    const original = createNrlCareer('storm', 5);
    let hired = hire(original);
    while ((hired.ratingReview?.assistant?.length ?? 0) < 3 && hired.season.phase === 'regular') {
      const previous = hired;
      hired = advance(hired);
      for (const id of hired.ratingReview?.assistant ?? []) {
        if (previous.ratingReview?.assistant?.includes(id)) continue;
        const prior = previous.players.find(player => player.id === id)!;
        expect(hired.players.find(player => player.id === id)?.rating).toBe(prior.rating + 1);
        expect(progress(hired).find(player => player.id === id)?.apps).toBeGreaterThanOrEqual(8);
      }
    }
    const earned = hired.ratingReview?.assistant ?? [];
    expect(earned).toHaveLength(3);
    expect(hired.season.phase).toBe('regular');
    const finished = finish(hired);
    const boosted = next(read(finished)!);
    expect(boosted.history[0].coachDevelopment).toEqual(earned);
    const finalRatings = new Map(finished.players.map(player => [player.id, player.rating]));
    expect(boosted.players.every(player => !finalRatings.has(player.id) || player.rating === finalRatings.get(player.id))).toBe(true);
    expect(boosted.players.every(player => player.rating <= player.potential)).toBe(true);
    expect(boosted.finance.coachHire).toBeUndefined();
    expect(next(boosted)).toBe(boosted);
    expect(read(boosted)).toEqual(boosted);
    const moved = next(finished, 'bears');
    expect(moved.history[0].coachDevelopment).toEqual(earned);
    expect(moved.season.squad.every(player => !earned.includes(player.id))).toBe(true);
    expect(read(moved)).toEqual(moved);
    const forged = { ...boosted, history: [{ ...boosted.history[0], coachDevelopment: ['unknown-player'] }] };
    expect(read(forged)).toBeNull();
    const early = { ...finished, history: [{ ...finished.history[0], coachDevelopment: earned }] };
    expect(read(early)).toBeNull();
  });

  it('shares the youth focus ceiling and preserves the existing focus receipt', () => {
    const initial = createNrlCareer('storm', 39);
    const focus = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'setDevelopmentFocus', focus: 'youth' });
    const normal = next(finish(focus(initial)));
    const trained = next(finish(focus(hire(initial))));
    expect(trained.players).toEqual(normal.players);
    expect(trained.history[0].development).toEqual(normal.history[0].development);
    expect(trained.history[0].coachDevelopment).toEqual([]);
    expect(read(trained)).toEqual(trained);
    const earned = next(finish(hire(initial))).history[0].coachDevelopment!;
    expect(earned.length).toBeGreaterThan(0);
    const forged = { ...trained, history: [{ ...trained.history[0], coachDevelopment: ['unknown-player'] }] };
    expect(read(forged)).toBeNull();
  });

  it('allows exactly eight remaining own regular fixtures and refuses an invalid late, live or imported hire', () => {
    const initial = createNrlCareer('storm', 39);
    const draw = nrlSeasonPlan(2026).draw;
    const matches = draw.flatMap((round, index) => round.some(pair => pair.includes('storm')) ? [index + 1] : []);
    const last = until(initial, ({ season }) => season.round === matches.at(-8));
    expect(nrlCoachQuote(last).developmentReason).toBeNull();
    expect(hire(last).finance.coachHire?.role).toBe('development');
    const late = advance(last);
    expect(nrlCoachQuote(late).developmentReason).toMatch(/eight regular/);
    expect(hire(late)).toBe(late);
    const forged = { ...late, finance: { ...late.finance, coachHire: { role: 'development' as const, round: late.season.round, paidRounds: 0 } } };
    expect(read(forged)).toBeNull();
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(hire(live)).toBe(live);
    const old = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 39)))!;
    expect(hire(old)).toBe(old);
    expect(hire(finish(initial)).finance.coachHire).toBeUndefined();
    expect(reduceNrlCareer(initial, { type: 'hireCoach', role: 'development', year: 2026, clubId: 'bears', round: 1 })).toBe(initial);
  });
});
