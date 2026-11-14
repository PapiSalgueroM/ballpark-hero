import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlSavedLineupPreview, nrlStarterOptions } from '@/lib/nrlManager';

describe('NRL lineup plans', () => {
  it.each([['storm', 2026], ['bears', 2027]] as const)('holds a rotated and a first-choice lineup independently for %s', (clubId, year) => {
    const original = createNrlCareer(clubId, 4, year);
    const save = { type: 'saveLineup', year, clubId } as const;
    const primary = reduceNrlCareer(original, save);
    expect(primary.savedLineup?.lineup).toEqual(original.season.lineup);
    const available = nrlStarterOptions(primary.season, 'Fullback');
    const reserve = available.find(p => p.id !== primary.season.lineup.Fullback)!;
    expect(reserve).toBeDefined();
    const changed = reduceNrlCareer(primary, { type: 'selectStarter', role: 'Fullback', playerId: reserve.id });
    expect(changed.season.lineup.Fullback).toBe(reserve.id);
    const both = reduceNrlCareer(changed, { ...save, slot: 'rotation' });
    expect(both.savedRotationLineup?.lineup.Fullback).toBe(reserve.id);
    expect(both.savedLineup).toEqual(primary.savedLineup);
    const raw = JSON.stringify(both);
    const back = readNrlCareerSave(raw)!;
    expect(JSON.stringify(back)).toBe(raw);
    const first = nrlSavedLineupPreview(back.season, back.savedLineup!)!;
    const applied = reduceNrlCareer(back, { type: 'applySavedLineup', previewKey: first.key });
    expect(applied.season.lineup.Fullback).toBe(original.season.lineup.Fullback);
    const rotation = nrlSavedLineupPreview(applied.season, applied.savedRotationLineup!)!;
    expect(reduceNrlCareer(applied, { type: 'applySavedLineup', slot: 'rotation', previewKey: first.key })).toBe(applied);
    expect(reduceNrlCareer(applied, { type: 'applySavedLineup', slot: 'rotation', previewKey: rotation.key }).season.lineup.Fullback).toBe(reserve.id);
    expect(readNrlCareerSave(JSON.stringify({ ...both, savedRotationLineup: { ...both.savedRotationLineup!, year: year + 1 } }))).toBeNull();
    let complete = both;
    for (let i = 0; i < 33 && complete.season.phase !== 'complete'; i++) {
      complete = reduceNrlCareer(complete, { type: 'advance' });
    }
    expect(complete.season.phase).toBe('complete');
    const next = reduceNrlCareer(complete, { type: 'startNextSeason' });
    expect(next.season.year).toBe(year + 1);
    expect(next.savedLineup).toBeUndefined();
    expect(next.savedRotationLineup).toBeUndefined();
  });
});
