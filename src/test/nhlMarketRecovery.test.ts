import { describe, expect, it } from 'vitest';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import {
  initNhlLeague, nhlOffseason, nhlRelease, nhlSign, simNhlRound,
} from '@/lib/nhlFrontOffice';
import { nhlDeskOffseason, openNhlDesk } from '@/lib/nhlGmDesk';

const club = 'ANA';
const quietRound = () => 0.7;

function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function waiveInjuredPlayer() {
  const league = initNhlLeague(random(11), NHL_OPENING_RATINGS);
  const team = league.teams[club];
  const player = team.players[0];
  const draws = [0.01, 0.9];
  const report = simNhlRound(league, club, () => draws.shift() ?? quietRound());
  expect(report.notes).toContainEqual(expect.stringContaining(player.name));
  expect(player.out).toBe(3);
  expect(nhlRelease(team, league.freeAgents, player.id, league.ratingModelVersion)).toBe(true);
  const freeAgent = league.freeAgents.find(p => p.id === player.id);
  if (!freeAgent) throw new Error('Waived player missing from free agency');
  expect(freeAgent.out).toBe(3);
  return { league, team, freeAgent };
}

describe('NHL Front Office waiver recovery', () => {
  it('advances recovery each round while the waived player is unsigned', () => {
    const { league, team, freeAgent } = waiveInjuredPlayer();
    const healthy = league.freeAgents.find(p => p.out === 0)!;
    for (const roundsLeft of [2, 1, 0, 0]) {
      simNhlRound(league, club, quietRound);
      expect(freeAgent.out).toBe(roundsLeft);
      expect(healthy.out).toBe(0);
    }
    expect(nhlSign(team, league.freeAgents, freeAgent.id, league.cap, league.ratingModelVersion)).toBe(false);
  });

  it.each(['engine', 'contract desk'])('clears a late waiver injury at the offseason through the %s', (path) => {
    const { league, team, freeAgent } = waiveInjuredPlayer();
    const rng = random(97);
    if (path === 'contract desk') {
      expect(nhlDeskOffseason(league, openNhlDesk(league, club), club, rng).ok).toBe(true);
    } else {
      nhlOffseason(league, rng, club);
    }
    expect(league.teams[club]).toBe(team);
    expect(league.freeAgents).toContain(freeAgent);
    expect(nhlSign(team, league.freeAgents, freeAgent.id, league.cap, league.ratingModelVersion)).toBe(true);
    expect(team.players.find(p => p.id === freeAgent.id)?.out).toBe(0);
  });
});
