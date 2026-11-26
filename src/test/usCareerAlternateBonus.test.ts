import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CareerSeasonReview from '@/components/us-career/CareerSeasonReview';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import { bindUsProgrammeSeason, currentUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, usProgrammeResults, type ProgrammeCareer } from '@/lib/usCareerProgramme';

const cases: { sport: UsCareerSport; pos: string; key: string; unit: string; floor: number; games: number }[] = [
  { sport: NBA_CAREER_SPORT, pos: 'PG', key: 'spg', unit: 'steals per game', floor: 0.8, games: 55 },
  { sport: NFL_CAREER_SPORT, pos: 'WR', key: 'rec', unit: 'receptions', floor: 45, games: 10 },
  { sport: MLB_CAREER_SPORT, pos: 'RP', key: 'saves', unit: 'saves', floor: 5, games: 45 },
  { sport: NHL_CAREER_SPORT, pos: 'G', key: 'svpct', unit: 'save percentage', floor: 0.9, games: 35 },
];

function random(seed: number) {
  return () => ((seed = Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const recordedLine = { year: 2025, team: 'BOS', age: 25, games: 10, ovr: 86, awards: [], teamResult: 'Missed playoffs', salary: 4 };
afterEach(cleanup);

describe('US career alternate performance bonus', () => {
  it.each(cases)('posts a $unit challenge and settles it against real paired seasons', ({ sport, pos, key, unit, floor, games }) => {
    const career = sport.startCareer('Generated Career Fixture', pos, sport.create.archetypes[pos][0], random(12), null, sport.create.eras[0].id);
    Object.assign(career, { ovr: 92, pot: 96, health: 100, morale: 80, salary: 10, netWorth: 5, contractYears: 3, role: 'starter' });
    const option = usProgrammeMenus(career, sport.slug).find(menu => menu.id === 'bonus')?.options.find(choice => choice.id === 'alternate');
    expect(option?.effect).toContain(`${key === 'svpct' ? floor.toFixed(3) : floor} ${unit} and ${games} games`);
    const plan = saveUsCareerProgramme(career, sport.slug, { ...usProgrammeDefaults(), bonus: 'alternate' });
    expect(plan).not.toBe(career);
    let completed = 0;
    for (let seed = 1; seed <= 18; seed++) {
      const play = (source: typeof plan) => {
        const next = structuredClone(source);
        const rng = random(seed * 10013);
        const preparation = prepareUsCareerProgramme(next, sport.slug);
        const { line } = sport.simSeason(next, 78, rng, true, preparation);
        restoreUsCareerProgramme(next, preparation);
        sport.progress(next, rng, line.seasonRating);
        settleUsCareerProgramme(next, line, sport.slug, preparation);
        return { next, line };
      };
      const usual = play(career);
      const chosen = play(plan);
      expect(chosen.line).toEqual(usual.line);
      const [result] = usProgrammeResults(chosen.next);
      const actual = (chosen.line as unknown as Record<string, unknown>)[key];
      const earned = typeof actual === 'number' && actual >= floor && chosen.line.games >= games;
      expect(result.decisions).toEqual([{ section: 'bonus', label: option?.label, target: floor, actual, unit, outcome: earned ? 'completed' : 'missed' }]);
      expect(result.bonusGross).toBe(earned ? 0.2 : 0);
      expect(chosen.next.earnings - usual.next.earnings).toBeCloseTo(result.bonusGross, 6);
      expect(chosen.next.programme).toBeUndefined();
      if (earned) completed++;
    }
    expect(completed).toBeGreaterThan(0);
  });

  it('uses a recorded historical goalie rate as a three-decimal benchmark', () => {
    const sport = NHL_CAREER_SPORT;
    const career = sport.startCareer('Generated Goalie Fixture', 'G', sport.create.archetypes.G[0], random(31), null, sport.create.eras[0].id);
    career.year = 2020;
    const row = { year: 2019, team: career.team, age: 25, games: 50, ovr: 86, awards: [], teamResult: 'Missed playoffs', salary: 4 };
    career.seasons = [{ ...row, svpct: 0.927 }, { ...row, year: 2020, svpct: 4, games: 1 }];
    const option = usProgrammeMenus(career, 'nhl').find(menu => menu.id === 'bonus')?.options.find(choice => choice.id === 'alternate');
    expect(option?.effect).toContain('0.927 save percentage');
  });

  it.each([
    { sport: NBA_CAREER_SPORT as UsCareerSport, pos: 'PG', key: 'spg', unit: 'steals per game', target: 1.1, below: 1 },
    { sport: NBA_CAREER_SPORT as UsCareerSport, pos: 'C', key: 'bpg', unit: 'blocks per game', target: 1.3, below: 1.2 },
    { sport: NFL_CAREER_SPORT as UsCareerSport, pos: 'K', key: 'longFg', unit: 'yards on your longest field goal', target: 49, below: 48 },
  ])('keeps the benchmark for $unit independent of season length', ({ sport, pos, key, unit, target, below }) => {
    // Make any accidental conversion noticeable without changing either sport's real engine.
    bindUsProgrammeSeason(sport.slug, { carry: count => Math.round(count * 0.7), full: count => count * 2 });
    try {
      const career = sport.startCareer('Generated Benchmark Fixture', pos, sport.create.archetypes[pos][0], random(31), null, sport.create.eras[0].id);
      career.year = 2026;
      career.seasons = [{ ...recordedLine, team: career.team, [key]: target }];
      const menu = usProgrammeMenus(career, sport.slug).find(menu => menu.id === 'bonus');
      expect(menu?.options.find(o => o.id === 'alternate')?.effect).toContain(target + ' ' + unit);
      const saved = saveUsCareerProgramme(career, sport.slug, { ...usProgrammeDefaults(), bonus: 'alternate' });
      for (const [actual, outcome] of [[below, 'missed'], [target, 'completed']] as const) {
        const reloaded: ProgrammeCareer = JSON.parse(JSON.stringify(saved));
        expect(currentUsCareerProgramme(reloaded, sport.slug)?.bonus).toBe('alternate');
        const line = { ...recordedLine, year: career.year, team: career.team, games: sport.slug === 'nba' ? 55 : 10, salary: 10, [key]: actual };
        const preparation = prepareUsCareerProgramme(reloaded, sport.slug);
        reloaded.seasons.push(line);
        reloaded.year++;
        const result = settleUsCareerProgramme(reloaded, line, sport.slug, preparation);
        expect(result?.decisions).toEqual([{ section: 'bonus', label: 'Chase a different stat', target, actual, unit, outcome }]);
        expect(result?.bonusGross).toBe(outcome === 'completed' ? 0.2 : 0);
        expect(settleUsCareerProgramme(reloaded, line, sport.slug, preparation)).toBeNull();
      }
    } finally {
      bindUsProgrammeSeason(sport.slug, null);
    }
  });

  it('saves the actual alternate choice through the season programme', () => {
    const sport = NBA_CAREER_SPORT;
    const career = sport.startCareer('Generated Defensive Fixture', 'C', sport.create.archetypes.C[0], random(31), null, sport.create.eras[0].id);
    let saved: ProgrammeCareer | undefined;
    render(createElement(UsCareerProgramme, { career, sport: 'nba', onChange: next => { saved = next; } }));
    fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    fireEvent.click(screen.getByRole('button', { name: /Performance bonus/ }));
    const alternate = screen.getByRole('button', { name: /Chase a different stat/ });
    expect(alternate).toHaveTextContent('1.0 blocks per game');
    fireEvent.click(alternate);
    expect(saved?.programme?.bonus).toBe('alternate');
    expect(career).not.toHaveProperty('programme');
  });

  it.each([
    { sport: NBA_CAREER_SPORT as UsCareerSport, pos: 'C', recorded: { bpg: 0, spg: 1.7 }, expected: 'Blocks per game0.0' },
    { sport: NFL_CAREER_SPORT as UsCareerSport, pos: 'WR', recorded: { recYds: 847 }, expected: 'Receiving yards per appearance84.7' },
  ])('renders one saved role-specific Overview stat and omits an older unknown value', ({ sport, pos, recorded, expected }) => {
    const career = sport.startCareer('Generated Stats Fixture', pos, sport.create.archetypes[pos][0], random(14), null, sport.create.eras[0].id);
    const newer: UsCareerSeason = { ...recordedLine, year: 2026, ...recorded };
    career.seasons = [recordedLine, newer];
    const { container } = render(createElement(CareerSeasonReview, { career, sport, backLabel: 'Back', onBack: () => {} }));
    fireEvent.click(screen.getByRole('button', { name: 'Review 2026 season' }));
    expect(container.querySelector('[data-season-extra-stat]')).toHaveTextContent(expected);
    fireEvent.click(screen.getByRole('button', { name: 'Back to seasons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review 2025 season' }));
    expect(container.querySelector('[data-season-extra-stat]')).toBeNull();
  });
});
