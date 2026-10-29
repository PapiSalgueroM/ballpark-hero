/**
 * Release BS fix BS-sc418-1: the coaching start chooser offers only clubs that exist in his first
 * manager season, at their tier that year. Before the fix it ranked the raw club list, so a career
 * whose last season was 2012 could be offered Mumbai City (founded 2014 in the game's own era
 * table) for a 2013 first job, and picking it started a manager career there.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FALLBACK_CLUBS, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { adjustClubsForYear } from '@/lib/careerEras';
import { coachingStartChoices, startCoachingAppointment } from '@/lib/soccerCareerCoachingStart';

function fixture(name: string, firstJob: number): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw Error('Existing complete recorded career ere required');
  const input = structuredClone(saved.state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34; input.playerName = name;
  const shift = firstJob - 1 - input.seasons[input.seasons.length - 1].year;
  input.seasons = input.seasons.map(row => ({ ...row, year: row.year + shift }));
  const state = manualRetire(input);
  state.phase = 'retirement_ceremony'; state.postRetirementChoice = null; state.managerState = null;
  state.lifeFlags = { ...(state.lifeFlags ?? {}), coachingBadges: 3 };
  return state;
}

describe('coaching start keeps to the clubs of its season', () => {
  it('the raw list holds clubs the era table rules out, so the check below has teeth', () => {
    const tier3 = FALLBACK_CLUBS.filter(club => club.tier >= 3);
    const kept = new Set(adjustClubsForYear(FALLBACK_CLUBS, 2013).map(club => club.id));
    expect(tier3.filter(club => !kept.has(club.id)).length).toBeGreaterThan(50);
    expect(FALLBACK_CLUBS.some(club => club.name === 'Mumbai City')).toBe(true);
    expect(adjustClubsForYear(FALLBACK_CLUBS, 2013).some(club => club.name === 'Mumbai City')).toBe(false);
  });
  it('every offered club exists in the first manager season, at that season tier, and signing lands there', () => {
    let offered = 0, signed = 0;
    for (const year of [2008, 2013, 2018, 2023]) {
      const era = new Map(adjustClubsForYear(FALLBACK_CLUBS, year).map(club => [club.id, club]));
      for (let i = 0; i < 60; i += 1) {
        const state = fixture(`Era Probe ${i}`, year);
        const choices = coachingStartChoices(state, FALLBACK_CLUBS);
        expect(choices.length, `${year} name ${i}`).toBe(3);
        for (const quote of choices) {
          offered += 1;
          const club = era.get(quote.clubId);
          expect(club ? `${quote.clubName} tier ${club.tier}` : `${quote.clubName} is not a club in ${year}`).toBe(`${quote.clubName} tier ${quote.level}`);
        }
        if (i < 5) {
          const next = startCoachingAppointment(state, FALLBACK_CLUBS, choices[0]);
          expect(next.phase).toBe('manager_season');
          expect(next.managerState?.club).toBe(choices[0].clubName);
          expect(next.managerState?.clubTier).toBe(choices[0].level);
          signed += 1;
        }
      }
    }
    console.log(`coaching era: ${offered} offered clubs checked, ${signed} signings`);
    expect(offered).toBe(720);
  }, 120000);
});
