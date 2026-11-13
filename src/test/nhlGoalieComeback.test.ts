import { describe, expect, it } from 'vitest';
import {
  NHL_ARCHETYPES, nhlAssignRole, nhlCampBattle, nhlProgress, simNhlSeason, startNhlCareer,
} from '@/lib/nhlMyCareer';

const comebackAward = 'Comeback Player of the Year';
const teamQuality = 72;

function rngFrom(draws: number[], rest = 0.001) {
  let index = 0;
  return () => draws[index++] ?? rest;
}

function startGoalie(year = 2026) {
  const career = startNhlCareer('Riley Clark', 'G', NHL_ARCHETYPES.G[2], () => 0.99, null, year < 2026 ? 'y2006' : undefined);
  career.year = year;
  nhlAssignRole(career, teamQuality, () => 0.1);
  expect(career.role).toBe('starter');
  return career;
}

function playPreviousSeason(career: ReturnType<typeof startGoalie>, injured: boolean) {
  const result = simNhlSeason(career, teamQuality, rngFrom(injured ? [0, 0.001, 0.2] : [0, 0.99], 0.8));
  nhlProgress(career, () => 0.5);
  return result;
}

function playReturn(career: ReturnType<typeof startGoalie>, injured = false) {
  nhlCampBattle(career, teamQuality, () => 0.1);
  // Low workload draw, best season swing, and a low award-field draw.
  return simNhlSeason(career, teamQuality, rngFrom([
    0, injured ? 0.001 : 0.99, ...(injured ? [0.8] : []),
    0.0001, 0, 0.8, 0.99, 0.99, 0.99,
  ]));
}

describe('NHL goalie comeback award', () => {
  it.each([[2026, 30], [2012, 18]])('recognizes a healthy return after an injured %i season', (year, missedYearStarts) => {
    const career = startGoalie(year);
    const previous = playPreviousSeason(career, true);
    expect(previous.line.games).toBe(missedYearStarts);
    expect(previous.notes).toContain('🚑 Injuries bit into the season.');

    const { line, notes } = playReturn(career);

    expect(line.games).toBe(58);
    expect(line.awards).toContain(comebackAward);
    expect(notes).toContain(`🔁 ${comebackAward}.`);
  });

  it('does not treat a healthy shortened schedule as a lost year', () => {
    const career = startGoalie(2012);
    const previous = playPreviousSeason(career, false);
    expect(previous.line.games).toBe(34);

    const { line } = playReturn(career);

    expect(line.games).toBe(58);
    expect(line.awards).not.toContain(comebackAward);
  });

  it('requires a full starter workload on the return', () => {
    const career = startGoalie();
    playPreviousSeason(career, true);

    const { line } = playReturn(career, true);

    expect(line.games).toBeLessThan(58);
    expect(line.awards).not.toContain(comebackAward);
  });
});
