import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlNextRound } from '@/lib/nrlManager';

const step = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });

describe('NRL in-season ratings', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('moves ratings up and down between matches in %s, with no rollover jump', (year, club) => {
    let career = createNrlCareer(club, 4, year);
    let ownUp = 0;
    let ownDown = 0;
    let rivalChanges = 0;
    while (career.season.phase !== 'complete') {
      const previous = new Map(career.players.map(player => [player.id, player]));
      const fixture = nrlNextRound(career.season).clubMatch;
      const regular = career.season.phase === 'regular';
      career = step(career);
      for (const player of career.players) {
        const prior = previous.get(player.id)!;
        const delta = player.rating - prior.rating;
        expect(Math.abs(delta)).toBeLessThanOrEqual(1);
        expect(player.rating).toBeLessThanOrEqual(player.potential);
        if (!regular) expect(delta).toBe(0);
        if (player.contract?.clubId === club) {
          if (!fixture) expect(delta).toBe(0);
          if (delta > 0) ownUp++;
          if (delta < 0) ownDown++;
        } else if (delta) rivalChanges++;
      }
      expect(career.season.squad.every(player => career.players.find(row => row.id === player.id)?.rating === player.rating)).toBe(true);
    }
    expect(ownUp).toBeGreaterThan(0);
    expect(ownDown).toBeGreaterThan(0);
    expect(rivalChanges).toBeGreaterThan(0);
    expect(readNrlCareerSave(JSON.stringify(career))).toEqual(career);
    const rolled = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(rolled.season.year).toBe(year + 1);
    const finished = new Map(career.players.map(player => [player.id, player.rating]));
    expect(rolled.players.every(player => !finished.has(player.id) || player.rating === finished.get(player.id))).toBe(true);
    expect(readNrlCareerSave(JSON.stringify(rolled))).toEqual(rolled);
  });

  it('leaves halftime and 60-minute pauses unchanged and settles ordinary Live and Quick Sim identically', () => {
    let career = createNrlCareer('storm', 4);
    while (career.season.round < 10 || !nrlNextRound(career.season).clubMatch) career = step(career);
    const { round, year, tactic } = career.season;
    const half = reduceNrlCareer(career, { type: 'startLive' });
    const pause = reduceNrlCareer(half, { type: 'reachMinute60', year, round, tactic });
    expect(half.players).toBe(career.players);
    expect(pause.players).toBe(career.players);
    const reopened = readNrlCareerSave(JSON.stringify(pause))!;
    const after = reduceNrlCareer(reopened, { type: 'finishMinute60', year, round, tactic });
    expect(JSON.stringify(after)).toBe(JSON.stringify(step(career)));
  });
});
