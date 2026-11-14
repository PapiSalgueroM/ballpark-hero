import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INTERCONTINENTAL_CUP_SCHEDULE, simIntercontinentalCupMatch, type IntercontinentalCupMatch } from '@/lib/clubIntercontinentalCup';
import { eraClubDefFor, finishSeason, loadCareer, playNextEntry, saveCareer, SAVE_KEY, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { dateKey, entryDatesOf } from '@/lib/clubManagerCalendar';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { saveFence } from '@/lib/saveFence';

function next(career: CareerState) {
  return playNextEntry(career, { skipHalftime: true }).state;
}

function beforeFinal(career: CareerState): CareerState {
  const week = entryDatesOf(career).findIndex(date => dateKey(date) >= 20251217);
  return { ...career, week };
}

function results(seed: string, tierOf: (club: string) => number = () => 2) {
  const matches: IntercontinentalCupMatch[] = [];
  for (const _fixture of INTERCONTINENTAL_CUP_SCHEDULE) {
    matches.push(simIntercontinentalCupMatch(matches, seed, tierOf));
  }
  return matches;
}

describe('Club Manager 2025 Intercontinental Cup', () => {
  beforeAll(async () => { await ensureEraRosters('era2020'); });
  beforeEach(() => { saveFence.release(SAVE_KEY); localStorage.clear(); });
  afterEach(() => { saveFence.release(SAVE_KEY); });

  it('replays the five slots, including the UEFA bye to the final and both deciders', () => {
    const deciders = new Set<IntercontinentalCupMatch['decidedBy']>();
    for (let seed = 0; seed < 25; seed++) {
      const all = results(String(seed));
      const [opening, asianCup, americas, challenger, final] = all;
      expect([opening.home, opening.away]).toEqual(['Pyramids', 'Auckland City']);
      expect([asianCup.home, asianCup.away]).toEqual(['Al Ahli', opening.winner]);
      expect([americas.home, americas.away]).toEqual(['Cruz Azul', 'Flamengo']);
      expect([challenger.home, challenger.away]).toEqual([americas.winner, asianCup.winner]);
      expect([final.home, final.away]).toEqual(['PSG', challenger.winner]);
      for (const match of all) {
        deciders.add(match.decidedBy);
        if (match.decidedBy === 'penalties') {
          expect(match.homeGoals).toBe(match.awayGoals);
          expect([match.home, match.away]).toContain(match.winner);
        } else {
          expect(match.homeGoals).not.toBe(match.awayGoals);
          expect(match.winner).toBe(match.homeGoals > match.awayGoals ? match.home : match.away);
        }
      }
      expect(results(String(seed))).toEqual(all);
    }
    expect([...deciders].sort()).toEqual(['extra time', 'full time', 'penalties']);
  });

  it('reveals only the matches reached when playing, then keeps results through reload and rollover', () => {
    let career = { ...startCareer('Arsenal', 'era2020'), season: 6, worldSeed: 35 };
    expect(next(career).intercontinentalCup2025).toBeUndefined();
    const dates = entryDatesOf(career);
    const openingWeek = dates.findIndex(date => dateKey(date) >= 20250914);
    career = { ...career, week: openingWeek };
    const afterOpening = next(career);
    expect(afterOpening.intercontinentalCup2025).toEqual(results('35', name => eraClubDefFor(name, career.eraId).tier).slice(0, 1));
    expect(saveCareer(beforeFinal(afterOpening))).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.intercontinentalCup2025).toHaveLength(4);
    const afterFinal = next(loaded);
    expect(afterFinal.intercontinentalCup2025).toHaveLength(5);
    expect(afterFinal.intercontinentalCup2025?.slice(0, 4)).toEqual(loaded.intercontinentalCup2025);
    expect(afterFinal.trophies.some(trophy => trophy.name === 'Intercontinental Cup')).toBe(false);
    const review = finishSeason({ ...afterFinal, week: afterFinal.calendar.length });
    expect(startNextSeason(review.state).intercontinentalCup2025).toEqual(afterFinal.intercontinentalCup2025);
    expect(next({ ...career, season: 7 }).intercontinentalCup2025).toBeUndefined();
  });

  it('awards the current manager one trophy for winning and no trophy to a late arrival', () => {
    const career = { ...startCareer('PSG', 'era2020'), season: 6, boardConfidence: 95 };
    const seed = Array.from({ length: 24 }, (_, i) => i).find(i => results(String(i), name => eraClubDefFor(name, career.eraId).tier).at(-1)?.winner === 'PSG')!;
    expect(seed).toBeDefined();
    const before = beforeFinal({ ...career, worldSeed: seed });
    const after = next(before);
    expect(after.intercontinentalCup2025?.at(-1)?.winner).toBe('PSG');
    const won = after.trophies.filter(trophy => trophy.name === 'Intercontinental Cup');
    expect(won).toEqual([{ name: 'Intercontinental Cup', emoji: '🌐', season: 6, minor: true }]);
    expect(next(after).trophies.filter(trophy => trophy.name === 'Intercontinental Cup')).toEqual(won);
    expect(saveCareer({ ...before, week: after.week })).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.intercontinentalCup2025).toEqual(after.intercontinentalCup2025);
    expect(loaded.trophies.some(trophy => trophy.name === 'Intercontinental Cup')).toBe(false);
  });
});
