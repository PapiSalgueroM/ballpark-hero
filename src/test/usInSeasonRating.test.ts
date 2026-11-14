import { describe, expect, it } from 'vitest';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';

const sports = [NBA_CAREER_SPORT, NFL_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];

describe.each(sports)('$label season rating', sport => {
  const career = (age: number, ovr: number, pot: number) => {
    const { defaultPos, archetypes, eras } = sport.create;
    const c = sport.startCareer('Rating Fixture', defaultPos, archetypes[defaultPos][0], () => 0.5, null, eras[0].id);
    Object.assign(c, { age, ovr, pot, health: 100, role: 'starter', contractYears: 3, purchased: [] });
    return c;
  };

  it.each([[21, 76, 79, 1], [38, 80, 90, -1]])('records a rating through the year at age %s and only settles it once', (age, opening, potential, direction) => {
    const c = career(age, opening, potential);
    const pay = c.salary;
    const earnings = c.earnings;
    const year = c.year;
    const { line } = sport.simSeason(c, 75, () => 0.5, true);
    expect(c.earnings).toBeCloseTo(earnings + pay);
    expect(c.year).toBe(year);
    expect(c.seasons).toHaveLength(1);
    const receipt = line.seasonRating;
    expect(receipt).toBeDefined();
    expect(receipt.opening).toBe(opening);
    expect(receipt.checkpoints).toHaveLength(4);
    expect(receipt.checkpoints[3][1]).toBe(receipt.finish);
    expect(Math.sign(receipt.finish - opening)).toBe(direction);
    expect(Math.sign(receipt.average - opening)).toBe(direction);
    expect(receipt.finish).toBeLessThanOrEqual(potential);
    expect(c.ovr).toBe(opening);
    const recovered = JSON.parse(JSON.stringify(c));
    sport.progress(recovered, () => 0.5, recovered.seasons[0].seasonRating);
    expect(recovered.year).toBe(year + 1);
    expect(recovered.ovr).toBe(receipt.finish);
    expect(recovered.contractYears).toBe(2);
    expect(recovered.seasons).toEqual(c.seasons);
    expect(recovered.earnings).toBeCloseTo(earnings + pay);
  });

  it('keeps the legacy aggregate when ratings are omitted', () => {
    const c = career(21, 76, 79);
    const { line } = sport.simSeason(c, 75, () => 0.5);
    expect(line.seasonRating).toBeUndefined();
    sport.progress(c, () => 0.5);
    expect(c.ovr).toBe(78);
  });

  it('keeps bought support inside the staged rating without double counting it', () => {
    const c = career(22, 76, 79);
    c.purchased = sport.slug === 'nfl' ? ['speed_coach'] : ['shot_doctor', 'film_room'];
    const { line } = sport.simSeason(c, 75, () => 0.5, true);
    const receipt = line.seasonRating;
    expect(receipt.support).toBeGreaterThan(0);
    const notes = sport.progress(c, () => 0.5, receipt);
    expect(c.ovr).toBe(receipt.finish);
    expect(c.ovr).toBeLessThanOrEqual(c.pot);
    expect(notes).toContain(`Yearly support: rating +${receipt.support}.`);
  });
});
