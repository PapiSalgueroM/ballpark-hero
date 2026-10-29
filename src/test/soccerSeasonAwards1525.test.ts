/* Round 1525: Soccer Career's season awards, won against a field, only in the seasons they were given for. */
import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import {
  goldenGloveAwardExists, puskasAwardExists, seasonLabel, uefaPlayerAwardExists,
  GOLDEN_GLOVE_FIRST_SEASON, UEFA_PLAYER_FIRST_SEASON, UEFA_PLAYER_LAST_SEASON,
} from '@/lib/soccerWorldTruth';
import { soccerAwardEligible, soccerAwardWon, type SoccerAwardSeason } from '@/lib/soccerSeasonAwards';

const season = (over: Partial<SoccerAwardSeason> = {}): SoccerAwardSeason => ({
  year: 2015, apps: 36, goals: 20, cleanSheets: 0, rating: 7.4, yellowCards: 3, redCards: 0, championsLeague: false,
  clubTier: 1, position: 'ST', age: 27, level: 7.4, prevRating: 7.0, ...over,
});
const rate = (award: Parameters<typeof soccerAwardWon>[0], s: SoccerAwardSeason, n = 2000) => {
  let won = 0;
  for (let i = 0; i < n; i += 1) if (soccerAwardWon(award, s, keyedRng(`test ${i}|${award}`))) won += 1;
  return won / n;
};

describe('Round 1525: the years each award was given for', () => {
  it('names the first and last seasons by the season label the game prints', () => {
    expect(seasonLabel(GOLDEN_GLOVE_FIRST_SEASON)).toBe('2004-05');
    expect(seasonLabel(UEFA_PLAYER_FIRST_SEASON)).toBe('2010-11');
    expect(seasonLabel(UEFA_PLAYER_LAST_SEASON)).toBe('2022-23');
  });
  it('gives the Golden Glove from 2004-05, UEFA Player of the Year from 2010-11 to 2022-23, the Puskas from 2008-09', () => {
    expect(goldenGloveAwardExists(2003)).toBe(false);
    expect(goldenGloveAwardExists(2004)).toBe(true);
    expect(uefaPlayerAwardExists(2009)).toBe(false);
    expect(uefaPlayerAwardExists(2010)).toBe(true);
    expect(uefaPlayerAwardExists(2022)).toBe(true);
    expect(uefaPlayerAwardExists(2023)).toBe(false);
    expect(uefaPlayerAwardExists(2030)).toBe(false);
    expect(puskasAwardExists(2007)).toBe(false);
    expect(puskasAwardExists(2008)).toBe(true);
  });
  it('never lets a season outside those years be eligible', () => {
    expect(soccerAwardEligible('Golden Glove', season({ position: 'GK', year: 2003, cleanSheets: 25 }))).toBe(false);
    expect(soccerAwardEligible('Golden Glove', season({ position: 'GK', year: 2004, cleanSheets: 25 }))).toBe(true);
    expect(soccerAwardEligible('UEFA Player of the Year', season({ championsLeague: true, year: 2009 }))).toBe(false);
    expect(soccerAwardEligible('UEFA Player of the Year', season({ championsLeague: true, year: 2023 }))).toBe(false);
    expect(soccerAwardEligible('UEFA Player of the Year', season({ championsLeague: true, year: 2016 }))).toBe(true);
    expect(soccerAwardEligible('Puskás Award', season({ year: 2007 }))).toBe(false);
  });
});

describe('Round 1525: who may win, and against what', () => {
  it('keeps the old structural gates', () => {
    expect(soccerAwardEligible('Golden Boot', season({ clubTier: 3, goals: 40 }))).toBe(false);
    expect(soccerAwardEligible('Golden Glove', season({ position: 'ST', year: 2015 }))).toBe(false);
    expect(soccerAwardEligible('UEFA Player of the Year', season({ championsLeague: false }))).toBe(false);
    expect(soccerAwardEligible('Young Player of the Year', season({ age: 23 }))).toBe(false);
    expect(soccerAwardEligible('Fair Play Award', season({ yellowCards: 2 }))).toBe(false);
    expect(soccerAwardEligible('Fair Play Award', season({ yellowCards: 1 }))).toBe(true);
    expect(soccerAwardEligible('Comeback Player of the Year', season({ prevRating: null }))).toBe(false);
    expect(soccerAwardEligible('Comeback Player of the Year', season({ prevRating: 6.5 }))).toBe(true);
  });
  it('is pure: the same season and the same stream give the same answer', () => {
    const s = season({ goals: 27 });
    for (let i = 0; i < 50; i += 1) {
      expect(soccerAwardWon('Golden Boot', s, keyedRng(`pure ${i}`))).toBe(soccerAwardWon('Golden Boot', s, keyedRng(`pure ${i}`)));
    }
  });
  it('lets a dominant season win the Golden Boot more often than not, and a 24 goal one only now and then', () => {
    const big = rate('Golden Boot', season({ goals: 40 }));
    const small = rate('Golden Boot', season({ goals: 24 }));
    expect(big).toBeGreaterThan(0.8);
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(0.2);
  });
  it('makes every goal a chance at the Puskas Award (40 of 2,040 goals), and no goal no chance', () => {
    expect(rate('Puskás Award', season({ goals: 0 }))).toBe(0);
    const r = rate('Puskás Award', season({ goals: 40 }), 20000);
    expect(r).toBeGreaterThan(0.01);
    expect(r).toBeLessThan(0.03);
  });
});
