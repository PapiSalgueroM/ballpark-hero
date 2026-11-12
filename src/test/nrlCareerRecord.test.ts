import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlCareerRecord, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, reduceNrlSeason } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

describe('NRL Manager career record', () => {
  it('combines returning stints and separates the regular-season winner from the premiers', () => {
    const history = [
      { year: 2028, clubId: 'storm', rank: 1, wins: 18, draws: 0, losses: 6, championId: 'storm' },
      { year: 2027, clubId: 'bears', rank: 8, wins: 12, draws: 1, losses: 11, championId: 'bears' },
      { year: 2026, clubId: 'storm', rank: 1, wins: 17, draws: 2, losses: 5, championId: 'panthers' },
      { year: 2029, clubId: 'chiefs', rank: 9, wins: 11, draws: 0, losses: 13, championId: 'eels' },
    ];
    expect(nrlCareerRecord(history)).toEqual({
      seasons: 4, wins: 58, draws: 3, losses: 35, winRate: 60, finalsTrips: 3, minorPremierships: 2, premierships: 2,
      bestFinish: { rank: 1, year: 2026, clubId: 'storm' },
      clubs: [
        { clubId: 'storm', firstYear: 2026, seasons: 2, wins: 35, draws: 2, losses: 11, premierships: 1 },
        { clubId: 'bears', firstYear: 2027, seasons: 1, wins: 12, draws: 1, losses: 11, premierships: 1 },
        { clubId: 'chiefs', firstYear: 2029, seasons: 1, wins: 11, draws: 0, losses: 13, premierships: 0 },
      ],
    });
  });

  it('counts a season once on completion and keeps the same record after rollover and reload', () => {
    let state = createNrlCareer('storm', 4);
    expect(nrlCareerRecord(state.history)).toBeNull();
    while (state.season.phase === 'regular') state = advance(state);
    expect(state.season.phase).toBe('finals');
    expect(nrlCareerRecord(state.history)).toBeNull();
    while (state.season.phase !== 'complete') state = advance(state);
    const bytes = JSON.stringify(state);
    const record = nrlCareerRecord(state.history)!;
    expect(record.seasons).toBe(1);
    expect(record.wins + record.draws + record.losses).toBe(24);
    expect(record.premierships).toBe(Number(state.season.championId === state.season.clubId));
    expect(JSON.stringify(state)).toBe(bytes);

    const next = reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(next.season.clubId).toBe('bears');
    expect(nrlCareerRecord(next.history)).toEqual(record);
    expect(nrlCareerRecord(advance(next).history)).toEqual(record);
    const saved = JSON.stringify(next);
    const restored = readNrlCareerSave(saved)!;
    expect(nrlCareerRecord(restored.history)).toEqual(record);
    expect(JSON.stringify(restored)).toBe(saved);
  });

  it('reports a completed v1 import from its own ladder receipt and preserves its bytes', () => {
    let season = createNrlSeason('bears', 717, 2027);
    while (season.phase !== 'complete') season = reduceNrlSeason(season, { type: 'advance' });
    const raw = JSON.stringify(season);
    const imported = readNrlCareerSave(raw)!;
    const careerBytes = JSON.stringify(imported);
    const [row] = imported.history;
    expect(row.finance).toBeNull();
    expect(row.scoring).toBeUndefined();
    expect(nrlCareerRecord(imported.history)).toMatchObject({
      seasons: 1, wins: row.wins, draws: row.draws, losses: row.losses,
      bestFinish: { rank: row.rank, year: 2027, clubId: 'bears' },
      clubs: [{ clubId: 'bears', firstYear: 2027, seasons: 1 }],
    });
    expect(JSON.stringify(imported)).toBe(careerBytes);
    expect(JSON.stringify(season)).toBe(raw);
  });
});
