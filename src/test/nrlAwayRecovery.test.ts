import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlAwayRecoveryQuote, nrlCareerFinance, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlNextRound } from '@/lib/nrlManager';

const ready = () => {
  let career = createNrlCareer('broncos', 1, 2026);
  while (career.season.round < 4) career = reduceNrlCareer(career, { type: 'advance' });
  return career;
};

describe('NRL away recovery', () => {
  it('charges once and feeds the same fitness gain into Quick Sim and reloaded Live play', () => {
    const before = ready();
    const { year, clubId, round } = before.season;
    expect(nrlNextRound(before.season).clubMatch?.awayId).toBe(clubId);
    const action = { type: 'bookAwayRecovery', year, clubId, round } as const;
    const quote = nrlAwayRecoveryQuote(before);
    expect(quote?.reason).toBeNull();
    expect(quote?.cost).toBe(120_000);
    expect(quote).toMatchObject({ normalFitness: 88, bookedFitness: 95 });
    const booked = reduceNrlCareer(before, action);
    expect(booked.season).toBe(before.season);
    expect(booked.players).toBe(before.players);
    expect(nrlCareerFinance(before).cash - nrlCareerFinance(booked).cash).toBe(120_000);
    expect(reduceNrlCareer(booked, action)).toBe(booked);
    expect(readNrlCareerSave(JSON.stringify(booked))).toEqual(booked);
    expect(nrlAwayRecoveryQuote(booked)).toMatchObject({ booked: true });
    expect(nrlOppositionReport(booked)!.attackEdge).toBeGreaterThan(nrlOppositionReport(before)!.attackEdge);
    const control = reduceNrlCareer(before, { type: 'advance' });
    const quick = reduceNrlCareer(booked, { type: 'advance' });
    const starterId = before.season.lineup.Halfback;
    const fitness = (state: typeof before) => state.players.find(player => player.id === starterId)!.fitness;
    expect(fitness(quick) - fitness(control)).toBe(8);
    let halftime = reduceNrlCareer(booked, { type: 'startLive' });
    expect(halftime.season.squad).toEqual(booked.season.squad);
    expect(readNrlCareerSave(JSON.stringify(halftime))).toEqual(halftime);
    halftime = readNrlCareerSave(JSON.stringify(halftime))!;
    expect(reduceNrlCareer(halftime, action)).toBe(halftime);
    expect(reduceNrlCareer(halftime, { type: 'finishLive', year, round, tactic: booked.season.tactic })).toEqual(quick);
    const staged = reduceNrlCareer(halftime, { type: 'reachMinute60', year, round, tactic: booked.season.tactic, attackPlan: 'wide' });
    expect(readNrlCareerSave(JSON.stringify(staged))).toEqual(staged);
    let later = quick;
    while (later.season.round < 9) later = reduceNrlCareer(later, { type: 'advance' });
    expect(nrlAwayRecoveryQuote(later)?.reason).toMatch(/used/);
    expect(reduceNrlCareer(later, { ...action, round: 9 })).toBe(later);
    while (later.season.phase !== 'complete') later = reduceNrlCareer(later, { type: 'advance' });
    const next = reduceNrlCareer(later, { type: 'startNextSeason' });
    expect(next.history[0].finance?.awayRecoveryRound).toBe(4);
    expect(next.finance.awayRecoveryRound).toBeUndefined();
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  });

  it('rejects purchases at home, in another round, and when club cash cannot cover reserved staff wages', () => {
    const start = createNrlCareer('broncos', 1, 2026);
    const action = { type: 'bookAwayRecovery', year: 2026, clubId: 'broncos', round: 4 } as const;
    expect(reduceNrlCareer(start, { ...action, round: 1 })).toBe(start);
    const before = ready();
    expect(reduceNrlCareer(before, { ...action, round: 2 })).toBe(before);
    const allFit = { ...before, season: { ...before.season, squad: before.season.squad.map(player => ({ ...player, fitness: 100 })) } };
    expect(nrlAwayRecoveryQuote(allFit)?.reason).toMatch(/fully fit/);
    expect(reduceNrlCareer(allFit, action)).toBe(allFit);
    const hired = reduceNrlCareer(before, { type: 'hireCoach', role: 'attack', year: 2026, round: 4 });
    const limited = { ...hired, finance: { ...hired.finance,
      openingCash: hired.finance.openingCash - nrlCareerFinance(hired).cash + 120_000 } };
    expect(nrlAwayRecoveryQuote(limited)?.reason).toMatch(/reserved/);
    expect(reduceNrlCareer(limited, action)).toBe(limited);
    const falseReceipt = { ...before, finance: { ...before.finance, awayRecoveryRound: 1 } };
    expect(readNrlCareerSave(JSON.stringify(falseReceipt))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...before, finance: { ...before.finance, awayRecoveryRound: 9 } }))).toBeNull();
  });
});
