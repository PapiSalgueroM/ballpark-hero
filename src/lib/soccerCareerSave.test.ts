import { describe, expect, it } from 'vitest';
import { compressToUTF16 } from 'lz-string';
import { initCareer, FALLBACK_CLUBS } from './soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from './soccerCareerSave';
import { CONTINUE_SAVES, describeSave } from '@/data/continueSaves';

function fixture() {
  return initCareer('Save Tester', 'Spain', 'ST', '2020s',
    { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 },
    62, 2020, FALLBACK_CLUBS, null, 92);
}

describe('Soccer Career storage', () => {
  it('keeps small and legacy saves in their original JSON format', () => {
    const career = fixture();
    delete career.physique;
    const raw = JSON.stringify(career);
    expect(raw.length).toBeLessThan(60000);
    expect(serializeSoccerCareerSave(career)).toBe(raw);
    expect(JSON.stringify(parseSoccerCareerSave(raw))).toBe(raw);
    expect(isSoccerCareerSave(parseSoccerCareerSave(raw))).toBe(true);
  });

  it('packs only oversized history and restores every JSON value and field', () => {
    const career = fixture();
    // Repeated rows test the codec; genuinely played careers are measured by the sim.
    career.seasons = Array.from({ length: 80 }, (_, index) => ({
      ...career.seasons[0], year: 2020 + index,
      extension: { text: '雪 ⚽ café \u0000 \ud800', missing: undefined, empty: null,
        rows: Array.from({ length: 30 }, (_, n) => ({ n, label: 'Saved history', exact: 1 / (n + 3) })) },
    }));
    career.story = Array.from({ length: 30 }, (_, index) => ({ year: 2020 + index, age: 16 + index,
      club: career.currentClub, lines: ['雪 ⚽ café \u0000 \ud800', 'Full saved story'], unknown: { exact: 1 / 3 } }));
    const raw = JSON.stringify(career);
    expect(raw.length).toBeGreaterThan(60000);
    const stored = serializeSoccerCareerSave(career);
    expect(stored.length).toBeLessThanOrEqual(60000);
    expect(JSON.stringify(career)).toBe(raw);
    expect(JSON.stringify(parseSoccerCareerSave(stored))).toBe(raw);
    expect(isSoccerCareerSave(parseSoccerCareerSave(stored))).toBe(true);
    const envelope = JSON.parse(stored);
    expect(envelope.seasons.format).toBe('lz-string-utf16');
    expect(envelope.story.format).toBe('lz-string-utf16');
    expect(Object.keys(envelope)).toEqual(Object.keys(JSON.parse(raw)));
    delete envelope.seasons;
    delete envelope.story;
    const otherFields = JSON.parse(raw);
    delete otherFields.seasons;
    delete otherFields.story;
    expect(envelope).toEqual(otherFields);
    const home = CONTINUE_SAVES.find(row => row.path === '/soccer-career')!;
    expect(describeSave(home, stored)).toBe(describeSave(home, raw));
  });

  it('keeps unknown root and nested fields, including own prototype-shaped keys', () => {
    const career = fixture();
    const value = JSON.parse(JSON.stringify(career));
    value.seasons[0].unknown = JSON.parse('{"__proto__":{"held":true},"constructor":"history"}');
    value.extension = 'x'.repeat(60000);
    const stored = serializeSoccerCareerSave(value);
    expect(JSON.stringify(parseSoccerCareerSave(stored))).toBe(JSON.stringify(value));
    expect(serializeSoccerCareerSave(parseSoccerCareerSave(stored) as typeof career)).toBe(stored);
  });

  it.each([
    { format: 'future', data: compressToUTF16('[]') },
    { format: 'lz-string-utf16', data: 17 },
    { format: 'lz-string-utf16', data: '' },
    { format: 'lz-string-utf16', data: compressToUTF16('null') },
    { format: 'lz-string-utf16', data: compressToUTF16('{}') },
    { format: 'lz-string-utf16', data: compressToUTF16('[]') },
    { format: 'lz-string-utf16', data: compressToUTF16('[{"club":"missing fields"}]') },
  ])('refuses invalid packed history without repairing away its loss: %j', seasons => {
    const raw = JSON.stringify({ ...fixture(), seasons });
    let accepted = false;
    try { accepted = isSoccerCareerSave(parseSoccerCareerSave(raw)); } catch { /* unreadable */ }
    expect(accepted).toBe(false);
  });

  it.each([null, { old: 'damaged legacy story' }])('leaves optional legacy story repair to the existing loader: %j', story => {
    const raw = JSON.stringify({ ...fixture(), story });
    expect(JSON.stringify(parseSoccerCareerSave(raw))).toBe(raw);
    expect(isSoccerCareerSave(parseSoccerCareerSave(raw))).toBe(true);
  });

  it.each([
    { format: 'future', data: compressToUTF16('[]') },
    { format: 'lz-string-utf16', data: '' },
    { format: 'lz-string-utf16', data: compressToUTF16('null') },
    { format: 'lz-string-utf16', data: compressToUTF16('{}') },
  ])('refuses unreadable packed story before optional-field repair can discard it: %j', story => {
    expect(() => parseSoccerCareerSave(JSON.stringify({ ...fixture(), story }))).toThrow();
  });
});
