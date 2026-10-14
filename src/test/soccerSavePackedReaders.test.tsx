import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import YourCareers from '@/components/profile/YourCareers';
import { CONTINUE_SAVES, describeSave } from '@/data/continueSaves';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import type { CareerState } from '@/lib/soccerCareerEngine';

/* Release BE join (Round BEG), the lead's decision m8 (d): the readers of the Soccer Career save key outside the game
   read a packed save. The profile careers card (signed in only, so no browser walk reaches it offline) and the shared
   describeSave behind the home continue row and the sport hub resume line. The save is a fictional fixture made long
   enough to cross the codec's 60000 character threshold; the browser walk scripts/qa/playSoccerSaveReaders.mjs does
   the same with a genuine engine career. */

const KEY = 'soccerCareerSave';
afterEach(() => { cleanup(); localStorage.clear(); });

function longSave(): { raw: string; stored: string } {
  const seasons = Array.from({ length: 160 }, (_, i) => ({
    season: i + 1, club: 'Fixture FC', apps: 30, goals: i % 9, assists: i % 7, rating: 6.5, notes: 'fixture season '.repeat(12),
  }));
  const story = Array.from({ length: 120 }, (_, i) => `Fixture chapter ${i}: a quiet season at the club, nothing more to report.`);
  const value = { currentClub: 'Fixture FC', age: 31, retired: false, phase: 'playing', seasons, story } as unknown as CareerState;
  return { raw: JSON.stringify(value), stored: serializeSoccerCareerSave(value) };
}

describe('packed Soccer Career saves outside the game', () => {
  it('the fixture crosses the threshold and is packed', () => {
    const { raw, stored } = longSave();
    expect(raw.length).toBeGreaterThan(60000);
    expect(stored.length).toBeLessThan(raw.length);
    expect(JSON.parse(stored).seasons.format).toBe('lz-string-utf16');
    expect(JSON.stringify(parseSoccerCareerSave(stored))).toBe(raw);
  });

  it('describeSave reads the packed save exactly as the plain one', () => {
    const { raw, stored } = longSave();
    const entry = CONTINUE_SAVES.find(e => e.saveKey === KEY)!;
    expect(entry).toBeTruthy();
    expect(describeSave(entry, stored)).toBe(describeSave(entry, raw));
    expect(describeSave(entry, stored)).toContain('Fixture FC');
    expect(describeSave(entry, stored)).toContain('age 31');
  });

  it('the profile careers card lists the packed career with its club and age', async () => {
    localStorage.setItem(KEY, longSave().stored);
    render(<MemoryRouter><YourCareers /></MemoryRouter>);
    expect(await screen.findByText(/Fixture FC, age 31/)).toBeTruthy();
  });
});
