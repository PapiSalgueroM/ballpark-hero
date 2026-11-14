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

  it.each([['storm', 2026], ['bears', 2027]] as const)('can carry repaired lineup plans through a genuine %s rollover', (clubId, year) => {
    let career = createNrlCareer(clubId, 4, year);
    const choice = { year, clubId };
    const original = career.season.lineup.Fullback;
    const reserve = nrlStarterOptions(career.season, 'Fullback').find(player => player.id !== original)!;
    const change = (action: Parameters<typeof reduceNrlCareer>[1]) => {
      career = reduceNrlCareer(career, action);
    };
    change({ type: 'saveLineup', ...choice });
    change({ type: 'selectStarter', role: 'Fullback', playerId: reserve.id });
    change({ type: 'saveLineup', ...choice, slot: 'rotation' });
    change({ type: 'applySavedLineup', previewKey: nrlSavedLineupPreview(career.season, career.savedLineup!)!.key });
    while (career.season.phase !== 'complete') change({ type: 'advance' });
    const defaultNext = reduceNrlCareer(career, { type: 'startNextSeason' });
    const action = { type: 'startNextSeason', carryLineups: { fromYear: year, clubId } } as const;
    const next = reduceNrlCareer(career, action);
    expect(next.season).toEqual(defaultNext.season);
    expect(next.players).toEqual(defaultNext.players);
    expect(next.savedLineup?.year).toBe(year + 1);
    expect(next.savedRotationLineup?.lineup.Fullback).toBe(reserve.id);
    expect(next.savedLineup?.lineup.Fullback).not.toBe(original);
    expect(defaultNext.season.squad.some(player => player.id === original)).toBe(false);
    expect(defaultNext.savedRotationLineup).toBeUndefined();
    expect(reduceNrlCareer(career, { ...action, carryLineups: { fromYear: year - 1, clubId } })).toBe(career);
    expect(reduceNrlCareer(career, { ...action, move: { fromYear: year, clubId: 'broncos' } })).toBe(career);
    const restored = readNrlCareerSave(JSON.stringify(next))!;
    expect(restored).toEqual(next);
    const preview = nrlSavedLineupPreview(restored.season, restored.savedRotationLineup!)!;
    const applied = reduceNrlCareer(restored, { type: 'applySavedLineup', slot: 'rotation', previewKey: preview.key });
    expect(applied.season.lineup.Fullback).toBe(reserve.id);
    if (clubId === 'storm') expect(applied.season.lineup.Fullback).not.toBe(next.season.lineup.Fullback);
  });
});
