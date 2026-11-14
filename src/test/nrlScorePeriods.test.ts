import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const managed = ({ season }: NrlCareerState) => season.results.find(match =>
  match.round === season.round - 1 && (match.homeId === season.clubId || match.awayId === season.clubId))!;

describe('NRL score by period', () => {
  it('shares half-time and regulation between Quick Sim and an unchanged Live match', () => {
    const season = createNrlCareer('broncos', 1, 2026);
    const live = reduceNrlCareer(season, { type: 'startLive' });
    const { homeScoring, awayScoring } = live.season.live!;
    const settled = reduceNrlCareer(season, { type: 'advance' });
    const quick = managed(settled);
    expect(quick.scorePeriods).toEqual({
      halfTime: [nrlScorePoints(homeScoring), nrlScorePoints(awayScoring)],
      regulation: [22, 8],
    });
    expect(managed(reduceNrlCareer(live, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' }))).toEqual(quick);
    expect(settled.season.results.filter(match => match !== quick).every(match => match.scorePeriods === undefined)).toBe(true);
  });

  it('keeps the paused scores and separates 80 minutes from golden point', () => {
    const initial = createNrlCareer('bears', 53, 2027);
    const half = reduceNrlCareer(initial, { type: 'startLive' });
    const at60 = reduceNrlCareer(half, { type: 'reachMinute60', year: 2027, round: 1, tactic: 'balanced' });
    const raw = JSON.stringify(at60);
    const paused = readNrlCareerSave(raw)!;
    expect(JSON.stringify(paused)).toBe(raw);
    const live = paused.season.live!;
    const result = reduceNrlCareer(paused, { type: 'finishMinute60', year: 2027, round: 1, tactic: 'attack' });
    const match = managed(result);
    expect(match.scorePeriods).toEqual({
      halfTime: [nrlScorePoints(live.homeScoring), nrlScorePoints(live.awayScoring)],
      at60: [nrlScorePoints(live.minute60!.homeScoring), nrlScorePoints(live.minute60!.awayScoring)],
      regulation: [32, 32],
    });
    expect([match.homeScore, match.awayScore]).toEqual([32, 33]);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(result)))).toBe(JSON.stringify(result));

    const usePeriods = (scorePeriods: unknown) => JSON.stringify({ ...result, season: { ...result.season,
      results: result.season.results.map(fixture => fixture === match ? { ...match, scorePeriods } : fixture) } });
    expect(JSON.stringify(readNrlCareerSave(usePeriods(undefined)))).toBe(usePeriods(undefined));
    for (const scorePeriods of [
      { ...match.scorePeriods, halfTime: [-1, 12] },
      { ...match.scorePeriods, halfTime: [8.5, 12] },
      { ...match.scorePeriods, at60: [2, 2] },
      { ...match.scorePeriods, regulation: [32, 33] },
      { ...match.scorePeriods, regulation: [30, 30] },
    ]) expect(readNrlCareerSave(usePeriods(scorePeriods))).toBeNull();
  });
});
