import { describe, expect, it } from 'vitest';
import { simulateSeason, simulateSharedSeason, type RivalResult, type SharedSeasonTeam } from '@/lib/rebuildDeck';
import type { RebuildClub } from '@/lib/fetchRebuild';
import type { Player } from '@/types/game';

function player(name: string, position: Player['position']): Player {
  return {
    name, position, marketValue: 4, age: 24, nationality: 'Unknown',
    league: 'Other', club: 'Test Club', goals: 0, assists: 0, kitNumber: 0, difficulty: 'easy',
  };
}

const xi = [player('Home Forward', 'ST'), player('Home Midfielder', 'CM')];
const fillers: RebuildClub[] = Array.from({ length: 4 }, (_, i) => ({
  club: 'Neutral ' + (i + 1), tier: 'modest', squadSize: 18, squadValueM: 100,
}));
const home = { clubName: 'Home Club', rating: 47, xi };
const rival: RivalResult = {
  name: 'Rival', emoji: 'R', club: { ...fillers[0], club: 'Rival Club' },
  startRating: 52, finalRating: 52, signings: ['Rival Forward'],
};

describe('Rebuild season awards', () => {
  it('omits solo scoring and assists for a scoreless team, keeping the rival award', () => {
    const season = simulateSeason(home, [rival], fillers.slice(1), 37);
    expect(season.table.find(row => row.isYou)?.gf).toBe(0);
    expect(season.table.find(row => row.isRival)?.gf).toBe(6);
    expect(season.yourTopScorer).toBeNull();
    expect(season.yourAssistKing).toBeNull();
    expect(season.goldenBoot).toEqual({ player: 'Rival Forward', team: 'Rival', goals: 2 });
  });

  it('reports one solo goal and assist when the team scores once', () => {
    const season = simulateSeason(home, [rival], fillers.slice(1), 1);
    expect(season.table.find(row => row.isYou)?.gf).toBe(1);
    expect(season.yourTopScorer).toEqual({ player: 'Home Forward', goals: 1 });
    expect(season.yourAssistKing).toEqual({ player: 'Home Midfielder', assists: 1 });
  });

  it('leaves the solo Golden Boot empty when its only named candidate belongs to a scoreless rival', () => {
    const season = simulateSeason({ ...home, rating: 77, xi: [] }, [rival], fillers.slice(1), 31);
    expect(season.table.find(row => row.isRival)?.gf).toBe(0);
    expect(season.goldenBoot).toBeNull();
  });

  it('omits a scoreless seat from shared scoring while keeping another seat’s award', () => {
    const teams: SharedSeasonTeam[] = [
      { ...home, seat: 0, name: 'First', emoji: '1', rating: 46, startRating: 46 },
      { seat: 1, clubName: 'Rival Club', name: 'Second', emoji: '2', rating: 52, startRating: 52, xi: [player('Away Forward', 'ST')] },
    ];
    const season = simulateSharedSeason(teams, fillers, 65);
    expect(season.table.find(row => row.seat === 0)?.gf).toBe(0);
    expect(season.table.find(row => row.seat === 1)?.gf).toBe(5);
    expect(season.records.map(record => record.topScorer)).toEqual([null, { player: 'Away Forward', goals: 2 }]);
    expect(season.trophies.find(trophy => trophy.title === 'Golden Boot')?.winner).toBe('Away Forward');
  });

  it('keeps exact healthy solo standings and awards for the same seed', () => {
    const season = simulateSeason({ ...home, rating: 82 }, [{ ...rival, finalRating: 84 }], fillers.slice(1), 7);
    expect(season.table.map(row => [row.name, row.gf, row.ga, row.pts])).toEqual([
      ['You', 15, 6, 20],
      ['Rival', 16, 7, 19],
      ['Neutral 3', 6, 10, 5],
      ['Neutral 2', 7, 12, 5],
      ['Neutral 4', 5, 14, 5],
    ]);
    expect(season.yourTopScorer).toEqual({ player: 'Home Forward', goals: 8 });
    expect(season.yourAssistKing).toEqual({ player: 'Home Midfielder', assists: 5 });
    expect(season.goldenBoot).toEqual({ player: 'Home Forward', team: 'You', goals: 8 });
  });
});
