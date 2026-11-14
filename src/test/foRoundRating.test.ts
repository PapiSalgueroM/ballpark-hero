import { describe, expect, it } from 'vitest';
import { initNbaLeague, nbaOffseason, simRound } from '@/lib/nbaFrontOffice';
import { initMlbLeague, mlbOffseason, simMlbRound } from '@/lib/mlbFrontOffice';
import { initNhlLeague, nhlOffseason, simNhlRound } from '@/lib/nhlFrontOffice';
import { keyedRng } from '@/lib/keyedRng';

interface Player {
  id: string;
  age: number;
  ovr: number;
  pot: number;
  years: number;
}
interface League {
  inSeasonRatings?: true;
  round: number;
  season: number;
  teams: Record<string, { players: Player[] }>;
  freeAgents: Player[];
}

function check<L extends League>(
  sport: string,
  create: (rng: () => number) => L,
  sim: (league: L, team: string, rng: () => number) => { notes: string[] },
  offseason: (league: L, rng: () => number, team?: string) => string[],
) {
  it(`${sport} grows and declines during actual rounds and carries the closing ratings forward`, () => {
    const rng = keyedRng(`${sport}|test round ratings`);
    const league = create(rng);
    league.inSeasonRatings = true;
    const clubs = Object.keys(league.teams);
    const team = clubs[0];
    const older = new Set<string>();
    for (const abbr of clubs.slice(0, 2)) {
      league.teams[abbr].players.forEach((player, index) => {
        Object.assign(player, { age: index % 2 ? 35 : 20, ovr: 78, pot: 89, years: 4 });
        if (index % 2) older.add(player.id);
      });
    }
    const periodReports: string[] = [];
    const initial = new Map(Object.values(league.teams).flatMap(t => t.players.map(p => [p.id, p.ovr])));
    for (; league.round <= 13; league.round += 1) {
      const before = new Map(Object.values(league.teams).flatMap(t => t.players.map(p => [p.id, p.ovr])));
      periodReports.push(...sim(league, team, rng).notes);
      for (const p of Object.values(league.teams).flatMap(t => t.players)) {
        expect(Math.abs(p.ovr - before.get(p.id)!)).toBeLessThanOrEqual(1);
      }
    }
    for (const abbr of clubs.slice(0, 2)) {
      const moved = league.teams[abbr].players;
      expect(moved.some(p => older.has(p.id) && p.ovr < initial.get(p.id)!)).toBe(true);
      expect(moved.some(p => !older.has(p.id) && p.ovr > initial.get(p.id)!)).toBe(true);
    }
    expect(periodReports.some(note => note.includes('OVR +1'))).toBe(true);
    expect(periodReports.some(note => note.includes('OVR -1'))).toBe(true);
    const close = new Map([...league.freeAgents, ...Object.values(league.teams).flatMap(t => t.players)].map(p => [p.id, { ovr: p.ovr, age: p.age }]));
    const year = league.season;
    offseason(league, rng, team);
    expect(league.season).toBe(year + 1);
    for (const player of [...league.freeAgents, ...Object.values(league.teams).flatMap(t => t.players)]) {
      const earlier = close.get(player.id);
      if (earlier) {
        expect(player.ovr).toBe(earlier.ovr);
        expect(player.age).toBe(earlier.age + 1);
      }
    }
  });
}

describe('Front Office in-season roster ratings', () => {
  check('NBA', initNbaLeague, simRound, nbaOffseason);
  check('MLB', initMlbLeague, simMlbRound, mlbOffseason);
  check('NHL', initNhlLeague, simNhlRound, nhlOffseason);
});
