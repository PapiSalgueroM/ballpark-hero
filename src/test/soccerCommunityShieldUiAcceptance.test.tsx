import { describe, expect, it } from 'vitest';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { savedSeasonCompetitions, type SavedSeasonCompetition } from '@/lib/soccerSeasonCompetitions';
import { cupCalendar, nextCupGame } from '@/lib/soccerSeasonCalendar';
import { trophyWins, type TrophyCategory } from '@/components/soccer-career/TrophyCabinet';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

// Controlled simulated save. These scores and qualification receipts are not real results.
function savedShield(): SeasonRecord {
  const qualification = {
    version: 1, competition: 'community-shield', status: 'ready',
    qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  return {
    ...JSON.parse(JSON.stringify(cupSeason)), apps: cupSeason.apps + 1, goals: cupSeason.goals + 1,
    rating: Math.round((cupSeason.rating * cupSeason.apps + 8) / (cupSeason.apps + 1) * 10) / 10,
    extraCups: [{
      version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
      qualification, entrants: JSON.parse(JSON.stringify(qualification.entrants)),
      minutes: 90, score: [1, 1], decidedBy: 'penalties', penalties: [5, 4], winner: 'Arsenal',
      player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1,
        assists: 0, cleanSheets: 0, rating: 8, title: true },
    }],
  } as SeasonRecord;
}

describe('Soccer Career Community Shield screens', () => {
  it('SC_SHIELD_UI_NAV: projects the recorded represented-club opening match into existing competitions', () => {
    const row = savedShield(), held = JSON.stringify(row);
    const competitions = savedSeasonCompetitions({ lastUCLResult: null }, row);
    expect(competitions.some(item => item.id === 'domestic'), 'the existing saved domestic cup must remain readable').toBe(true);
    const shield = competitions.find(item => String(item.id) === 'shield');
    expect(!!shield,
      'SC_SHIELD_UI_NAV_MISSING: the represented club needs its saved Shield match in the competition viewer').toBe(true);
    expect(shield!.name).toBe('Community Shield');
    expect(shield!.matches).toHaveLength(1);
    const match = shield!.matches[0];
    expect(match.opponent).toBe('Newcastle');
    expect([match.goalsFor, match.goalsAgainst]).toEqual([1, 1]);
    expect(match.home).toBeUndefined();
    expect((match as unknown as { neutral?: boolean }).neutral).toBe(true);
    expect(match.note).toContain('5-4 on penalties');
    expect(match.playerGoals).toBe(1);
    expect(JSON.stringify(row)).toBe(held);
  });

  it('SC_SHIELD_UI_OPENING: places a saved neutral opening before league game one', () => {
    const opening = { id: 'shield', name: 'Community Shield', result: 'Winners',
      matches: [{ round: 'Opening match', opponent: 'Newcastle', goalsFor: 1, goalsAgainst: 1,
        neutral: true, playerGoals: 1, note: '5-4 on penalties' }] } as unknown as SavedSeasonCompetition;
    const held = JSON.stringify(opening), calendar = cupCalendar([opening], 38);
    expect(calendar.length === 1,
      'SC_SHIELD_UI_OPENING_MISSING: the saved opening needs a calendar position before the first league game').toBe(true);
    expect(calendar[0].competition).toBe('shield');
    expect(calendar[0].afterLeague).toBe(0);
    expect(calendar[0].previous).toBeNull();
    expect(nextCupGame(calendar, 0, new Set())).toEqual(calendar[0]);
    expect(nextCupGame(calendar, 0, new Set([calendar[0].id]))).toBeNull();
    expect(JSON.stringify(opening)).toBe(held);
  });

  it('SC_SHIELD_UI_CABINET: lists the same valid played Shield win as its own trophy category', () => {
    const row = savedShield(), career = { seasons: [row] } as Pick<CareerState, 'seasons'>;
    const held = JSON.stringify(career), wins = trophyWins(career, 'shield' as TrophyCategory);
    expect(wins.length === 1,
      'SC_SHIELD_UI_CABINET_MISSING: a valid played Shield win needs its own cabinet season').toBe(true);
    expect(wins).toEqual([row]);
    expect(trophyWins({ seasons: [cupSeason] }, 'shield' as TrophyCategory)).toEqual([]);
    expect(JSON.stringify(career)).toBe(held);
  });
});
