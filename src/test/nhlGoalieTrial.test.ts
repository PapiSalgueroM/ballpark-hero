import { describe, expect, it } from 'vitest';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import { rngFrom } from '@/lib/careerEngine';
import {
  initNhlLeague, nhlContributors, nhlExecuteTalksTrade, nhlGoalieTrial, nhlSetContributors, nhlWinProb,
  setNhlGoalieTrial, simNhlRound, type NhlLeague,
} from '@/lib/nhlFrontOffice';

function fixture() {
  const league = initNhlLeague(rngFrom(42), NHL_OPENING_RATINGS);
  league.inSeasonRatings = true;
  // Interleave venues and other clubs so only Montreal's actual games affect its trial.
  const round = ['MTL-BUF', 'FLA-BOS', 'BUF-MTL', 'MTL-BUF', 'BUF-MTL'];
  league.schedule![0] = round;
  league.schedule![1] = round;
  return league;
}

const prospect = (league: NhlLeague) => league.teams.MTL.players.find(player => player.name === 'Jacob Fowler')!;
const book = (league: NhlLeague) => setNhlGoalieTrial(league, 'MTL', prospect(league).id);

function play(league: NhlLeague) {
  const injuryChecks = Object.values(league.teams).reduce((sum, team) => sum + team.players.filter(player => player.out === 0).length, 0);
  const games = [0.533, 0.99, 0.533, 0.99, 0.467, 0.99, 0.533, 0.99, 0.467, 0.99];
  let draws = 0;
  const played = simNhlRound(league, 'MTL', () => {
    const draw = draws++;
    return draw < injuryChecks ? 0.99 : games[draw - injuryChecks];
  });
  league.round++;
  return { played, draws };
}

describe('NHL Front Office goalie development trial', () => {
  it('uses the named goalie for two actual starts each round, then earns one point without changing the contract', () => {
    const usual = fixture();
    const goalie = prospect(usual);
    expect(goalie).toMatchObject({ age: 21, ovr: 79, salary: 4.5, years: 4 });
    const usualSelection = nhlContributors(usual.teams.MTL);
    expect(nhlWinProb(usual.teams.MTL, usual.teams.BUF)).toBeCloseTo(0.541365, 6);
    expect(nhlWinProb({ ...usual.teams.MTL, contributors: { ...usualSelection, goalie: goalie.id } }, usual.teams.BUF))
      .toBeCloseTo(0.524992, 6);
    const trial = book(structuredClone(usual));
    expect(nhlGoalieTrial(trial, 'MTL')).toMatchObject({ firstRound: 1, goalieId: goalie.id, starts: 0 });
    expect(nhlGoalieTrial(usual, 'MTL')).toBeNull();

    const standardRound = play(usual);
    const trialRound = play(trial);
    expect(standardRound.played).toMatchObject({ myWins: 4, myLosses: 0 });
    expect(trialRound.played).toMatchObject({ myWins: 2, myLosses: 2 });
    expect(trialRound.draws).toBe(standardRound.draws);
    const restored = JSON.parse(JSON.stringify(trial)) as NhlLeague;
    expect(nhlGoalieTrial(restored, 'MTL')).toMatchObject({ starts: 2 });
    expect(prospect(restored).ovr).toBe(prospect(usual).ovr);
    expect(nhlContributors(restored.teams.MTL)).toEqual(usualSelection);

    play(usual);
    expect(play(restored).played).toMatchObject({ myWins: 2, myLosses: 2 });
    const rating = prospect(usual).ovr;
    expect(nhlGoalieTrial(restored, 'MTL')).toMatchObject({
      starts: 4, result: { kind: 'developed', before: rating, after: rating + 1 },
    });
    expect(prospect(restored)).toMatchObject({ ovr: rating + 1, salary: 4.5, years: 4 });
    expect(book(restored)).toBe(restored);
    expect(nhlGoalieTrial(JSON.parse(JSON.stringify(restored)), 'MTL')).toEqual(nhlGoalieTrial(restored, 'MTL'));
  });

  it('scratches a now-injured trial and otherwise plays the exact ordinary round', () => {
    const trial = book(fixture());
    prospect(trial).out = 2;
    const usual = { ...structuredClone(trial), goalieTrial: undefined };
    const standardRound = play(usual);
    expect(play(trial)).toMatchObject({
      draws: standardRound.draws, played: { myWins: standardRound.played.myWins, myLosses: standardRound.played.myLosses },
    });
    expect(trial.teams).toEqual(usual.teams);
    expect(nhlGoalieTrial(trial, 'MTL')).toMatchObject({ starts: 0, result: { kind: 'scratched', reason: 'unavailable' } });
    expect(book(trial)).toBe(trial);
  });

  it('keeps the two recorded starts when a trade, new usual selection, or potential cap ends the trial', () => {
    const cases = [
      ['unavailable', (league: NhlLeague) => {
        const returned = league.teams.BUF.players.find(player => player.pos === 'G')!;
        expect(nhlExecuteTalksTrade(league.teams.MTL, league.teams.BUF, prospect(league).id, returned.id, false, league.cap))
          .toBe('done');
      }],
      ['usual-starter', (league: NhlLeague) => {
        const team = league.teams.MTL;
        expect(nhlSetContributors(team, { ...nhlContributors(team), goalie: prospect(league).id })).toBe(true);
      }],
      ['potential', (league: NhlLeague) => { prospect(league).pot = prospect(league).ovr; }],
    ] as const;
    for (const [reason, change] of cases) {
      const trial = book(fixture());
      play(trial);
      change(trial);
      const usual = { ...structuredClone(trial), goalieTrial: undefined };
      play(trial);
      play(usual);
      expect(trial.teams).toEqual(usual.teams);
      expect(nhlGoalieTrial(trial, 'MTL')).toMatchObject({ starts: 2, result: { kind: 'scratched', reason } });
    }
  });

  it('only books an available prospect with headroom over two scheduled regular rounds', () => {
    const league = fixture(), team = league.teams.MTL;
    expect(setNhlGoalieTrial(league, 'MTL', nhlContributors(team).goalie!)).toBe(league);
    expect(setNhlGoalieTrial(league, 'MTL', league.teams.BUF.players.find(p => p.pos === 'G')!.id)).toBe(league);
    expect(book({ ...league, schedule: undefined })).not.toHaveProperty('goalieTrial');
    expect(book({ ...league, round: 20 })).not.toHaveProperty('goalieTrial');
    expect(book({ ...league, champions: [{ season: league.season, team: 'MTL' }] })).not.toHaveProperty('goalieTrial');
    const capped = structuredClone(league);
    prospect(capped).ovr = prospect(capped).pot;
    expect(book(capped)).toBe(capped);
    const booked = book(league);
    expect(setNhlGoalieTrial(booked, 'MTL', '')).not.toHaveProperty('goalieTrial');
    expect(nhlGoalieTrial({ ...booked, season: 2027 }, 'MTL')).toBeNull();
  });
});
