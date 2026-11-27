import { describe, expect, it } from 'vitest';
import { initMlbLeague, mlbBullpenPreview, setMlbBullpenCall, simMlbRound, type MlbGmPlayer, type MlbLeague } from '@/lib/mlbFrontOffice';
import { keyedRng } from '@/lib/keyedRng';

const team = 'NYY';
function leagueFixture(): MlbLeague {
  const league = initMlbLeague(keyedRng('bullpen card fixture'));
  for (const club of Object.values(league.teams)) {
    for (const player of club.players) { player.ovr = 80; player.out = 0; }
  }
  const arms = league.teams[team].players.filter(p => p.pos === 'RP' || p.pos === 'CL');
  arms.forEach((p, i) => { p.ovr = i === 0 ? 95 : 65; });
  league.schedule![0] = ['NYY-BOS', 'TOR-NYY', 'NYY-SDP', 'BAL-NYY', 'NYY-CLE', 'SEA-NYY'];
  return league;
}
const play = (league: MlbLeague) => simMlbRound(league, team, () => 0.5);

describe('MLB six-game bullpen card', () => {
  it('moves the team win and opponent loss with the two actual arms on both sides of the fixture', () => {
    const league = leagueFixture();
    const { lead, partner } = mlbBullpenPreview(league, team)!;
    for (const call of ['first', 'second'] as const) {
      const booked = setMlbBullpenCall(structuredClone(league), team, 0, call);
      const report = play(booked);
      expect(booked.bullpenCard).toBeUndefined();
      expect(report.bullpen).toContain(call === 'first' ? lead.name + ': G1 vs BOS W' : lead.name + ': G2 at TOR W');
      expect(report.bullpen).toContain(call === 'first' ? partner.name + ': G2 at TOR L' : partner.name + ': G1 vs BOS L');
      expect(booked.teams.BOS.losses).toBe(Number(call === 'first'));
      expect(booked.teams.TOR.losses).toBe(Number(call === 'second'));
      expect(report.myWins + report.myLosses).toBe(6);
      expect(report.bullpen).not.toContain('G3');
    }
  });

  it('restores the ordinary draw after cancelling and preserves a second pair through serialization', () => {
    const league = leagueFixture();
    let booked = setMlbBullpenCall(league, team, 2, 'second');
    booked = setMlbBullpenCall(JSON.parse(JSON.stringify(booked)), team, 0, 'first');
    expect(mlbBullpenPreview(booked, team)?.calls).toEqual(['first', 'auto', 'second']);
    booked = setMlbBullpenCall(booked, team, 0, 'auto');
    const cancelled = setMlbBullpenCall(booked, team, 2, 'auto');
    expect(cancelled).toEqual(league);
    expect(play(cancelled)).toEqual(play(league));
    expect(cancelled).toEqual(league);
  });

  it('uses the ordinary bullpen after a booked arm moves, without affecting any standings or draws', () => {
    const league = leagueFixture();
    const arm = mlbBullpenPreview(league, team)!.lead;
    const booked = setMlbBullpenCall(league, team, 1, 'second');
    league.teams[team].players = league.teams[team].players.filter((p: MlbGmPlayer) => p.id !== arm.id);
    const usual = structuredClone(league);
    const receipts = play(booked), baseline = play(usual);
    expect(receipts.bullpen).toMatch(/unavailable/);
    expect(receipts.myWins).toBe(baseline.myWins);
    expect(booked).toEqual(usual);
  });

  it('offers only six known fixtures, and reopens older scheduled leagues with automatic calls', () => {
    const league = leagueFixture();
    const games = mlbBullpenPreview(league, team)!.games;
    expect(games.map(game => game.label)).toEqual(['vs BOS', 'at TOR', 'vs SDP', 'at BAL', 'vs CLE', 'at SEA']);
    expect(games.filter(game => game.divisionRival).map(game => game.label)).toEqual(['vs BOS', 'at TOR', 'at BAL']);
    expect(games[0].record).toBe('0-0');
    expect(mlbBullpenPreview(league, team)?.calls).toEqual(['auto', 'auto', 'auto']);
    expect(setMlbBullpenCall(league, team, 3, 'first')).toBe(league);
    delete league.schedule;
    expect(mlbBullpenPreview(league, team)).toBeNull();
    expect(setMlbBullpenCall(league, team, 0, 'first')).toBe(league);
  });
});
