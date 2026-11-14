import { describe, expect, it, vi } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import * as random from '@/lib/careerEngine';
import { createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { createNrlSeason, nrlLadder, nrlNextRound, nrlStarterOptions } from '@/lib/nrlManager';

describe('NRL opposition report', () => {
  it('reads actual opponent form newest first with scores from their side', () => {
    let career = createNrlCareer('storm', 1);
    while (career.season.round < 9) career = reduceNrlCareer(career, { type: 'advance' });
    const { season } = career;
    const fixture = nrlNextRound(season).clubMatch!;
    const rival = fixture.homeId === season.clubId ? fixture.awayId : fixture.homeId;
    const report = nrlOppositionReport?.(career);
    expect(report?.opponentId).toBe(rival);
    expect(report?.ladderRank).toBe(nrlLadder(season).findIndex(row => row.clubId === rival) + 1);
    const results = season.results.filter(match => match.homeId === rival || match.awayId === rival).slice(-3).reverse();
    expect(results).toHaveLength(3);
    expect(new Set(results.map(match => match.homeId === rival)).size).toBe(2);
    expect(report?.recent).toEqual(results.map(match => {
      const home = match.homeId === rival;
      const scored = home ? match.homeScore : match.awayScore;
      const conceded = home ? match.awayScore : match.homeScore;
      return {
        round: match.round, rivalId: home ? match.awayId : match.homeId, scored, conceded,
        outcome: scored > conceded ? 'W' : scored < conceded ? 'L' : 'D',
      };
    }));
  });

  it.each([['storm', 2026], ['bears', 2027]] as const)('shows only completed head-to-head results for %s', (clubId, year) => {
    let career = createNrlCareer(clubId, 4, year);
    const start = nrlOppositionReport(career);
    if (start) expect(start.meetings).toEqual([]);
    for (let i = 0; i < 27; i++) {
      const report = nrlOppositionReport(career);
      const rows = report ? career.season.results.filter(match =>
        (match.homeId === clubId && match.awayId === report.opponentId)
        || (match.awayId === clubId && match.homeId === report.opponentId)) : [];
      if (report && rows.length) {
        const before = JSON.stringify(career);
        const expected = [...rows].reverse().map(match => ({
          round: match.round,
          scored: match.homeId === clubId ? match.homeScore : match.awayScore,
          conceded: match.homeId === clubId ? match.awayScore : match.homeScore,
        }));
        expect(report.meetings).toEqual(expected);
        expect(nrlOppositionReport(readNrlCareerSave(before)!)?.meetings).toEqual(expected);
        expect(JSON.stringify(career)).toBe(before);
        return;
      }
      career = reduceNrlCareer(career, { type: 'advance' });
    }
    throw new Error('Fixture needs a return match against a previous opponent');
  });

  it('updates both model edges when the tactic, preparation or selected starter changes', () => {
    const career = createNrlCareer('broncos', 16);
    const base = nrlOppositionReport?.(career);
    expect(base).toBeDefined();
    const attack = nrlOppositionReport(reduceNrlCareer(career, { type: 'setTactic', tactic: 'attack' }))!;
    expect(attack.attackEdge - base!.attackEdge).toBeCloseTo(5);
    expect(attack.defenseEdge - base!.defenseEdge).toBeCloseTo(-3);
    const trained = nrlOppositionReport(reduceNrlCareer(career, { type: 'prepare', choice: 'train' }))!;
    expect(trained.attackEdge - base!.attackEdge).toBeCloseTo(7 - 0.72);
    expect(trained.defenseEdge - base!.defenseEdge).toBeCloseTo(-0.72);
    const fullback = career.season.lineup.Fullback;
    const starter = career.season.squad.find(player => player.id === fullback)!;
    const replacement = nrlStarterOptions(career.season, 'Fullback').find(player => player.id !== fullback && player.rating !== starter.rating)!;
    const changed = nrlOppositionReport(reduceNrlCareer(career, { type: 'selectStarter', role: 'Fullback', playerId: replacement.id }))!;
    const delta = changed.attackEdge - base!.attackEdge;
    expect(delta).not.toBeCloseTo(0);
    expect(changed.defenseEdge - base!.defenseEdge).toBeCloseTo(delta);
  });

  it.each([['broncos', 2026, 2], ['bears', 2027, -2]] as const)('uses the original roster/venue inputs for a legacy %s career', (clubId, year, venue) => {
    const career = readNrlCareerSave(JSON.stringify(createNrlSeason(clubId, 16, year)))!;
    const report = nrlOppositionReport?.(career);
    expect(report).toBeDefined();
    const starters = new Set(Object.values(career.season.lineup));
    const own = career.season.squad.filter(player => starters.has(player.id));
    const ownRating = own.reduce((sum, player) => sum + player.rating, 0) / own.length;
    const rivalRating = nrlSeasonPlan(year).clubs.find(club => club.id === report!.opponentId)!.strength;
    const edge = ownRating - rivalRating + venue;
    expect(report!.attackEdge).toBeCloseTo(edge);
    expect(report!.defenseEdge).toBeCloseTo(edge);
    expect(report!.ladderRank).toBeNull();
    expect(report!.recent).toEqual([]);
  });

  it('reads without consuming RNG or save state and skips byes and paused matches', () => {
    const career = createNrlCareer('broncos', 16);
    const saved = JSON.stringify(career);
    const seeded = vi.spyOn(random, 'rngFrom');
    const global = vi.spyOn(Math, 'random');
    try {
      const first = nrlOppositionReport?.(career);
      expect(first).toBeDefined();
      expect(nrlOppositionReport(career)).toStrictEqual(first);
      expect(seeded).not.toHaveBeenCalled();
      expect(global).not.toHaveBeenCalled();
      expect(JSON.stringify(career)).toBe(saved);
    } finally {
      seeded.mockRestore();
      global.mockRestore();
    }
    expect(nrlOppositionReport(createNrlCareer('panthers', 16))).toBeNull();
    expect(nrlOppositionReport(reduceNrlCareer(career, { type: 'startLive' }))).toBeNull();
    expect(JSON.stringify(reduceNrlCareer(career, { type: 'advance' })))
      .toBe(JSON.stringify(reduceNrlCareer(readNrlCareerSave(saved)!, { type: 'advance' })));
  });
});
