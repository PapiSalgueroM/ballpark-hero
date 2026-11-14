import { describe, expect, it } from 'vitest';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
import { communityShieldAnnualStats, communityShieldSeasonStats, readCommunityShield, type CommunityShieldResult } from '@/lib/soccerCareerExtraCups';
import { deriveSeason } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey } from '@/lib/season/soccer';

// Exact paired annual row and opener from the retained arsenal-00 witness.
// Only the new annualRating metadata below is an explicitly labelled QA lab.
const ANNUAL = {
  "year": 2030,
  "age": 21,
  "club": "Man City",
  "clubCountry": "England",
  "clubTier": 1,
  "apps": 40,
  "leagueApps": 29,
  "goals": 6,
  "assists": 7,
  "cleanSheets": 0,
  "yellowCards": 4,
  "redCards": 0,
  "rating": 7.6,
  "ovr": 86,
  "injury": null,
  "injuryWeeks": 0,
  "injurySevere": false,
  "leagueTitle": true,
  "leagueFinish": 1,
  "leagueSize": 20,
  "derbies": [
    {
      "rival": "Man United",
      "name": "Manchester derby",
      "kind": "derby",
      "meetings": [
        {
          "home": false,
          "gf": 1,
          "ga": 2,
          "played": false,
          "goals": 0
        },
        {
          "home": true,
          "gf": 1,
          "ga": 0,
          "played": true,
          "goals": 0
        }
      ]
    }
  ],
  "domesticCup": false,
  "championsLeague": false,
  "worldCup": false,
  "ballonDor": false,
  "ballonDorRank": 15,
  "type": "playing",
  "intApps": 14,
  "intGoals": 4,
  "intAssists": 5,
  "intRating": 7.5,
  "tournament": "World Cup",
  "tournamentResult": "Semi-final",
  "leagueWorld": {
    "league": "Premier League",
    "members": [
      "Arsenal",
      "Man City",
      "Liverpool",
      "Chelsea",
      "Man United",
      "Tottenham",
      "Newcastle",
      "Nottingham Forest",
      "Brighton",
      "Fulham",
      "Brentford",
      "Bournemouth",
      "Sunderland",
      "Leeds United",
      "Ipswich Town",
      "Coventry City",
      "Hull City",
      "West Ham",
      "Derby County",
      "Sheffield United"
    ],
    "champion": "Man City",
    "simulation": "simulated",
    "movements": [
      {
        "club": "Sheffield United",
        "from": "Premier League",
        "to": "Championship",
        "kind": "relegated"
      },
      {
        "club": "Bournemouth",
        "from": "Premier League",
        "to": "Championship",
        "kind": "relegated"
      },
      {
        "club": "Hull City",
        "from": "Premier League",
        "to": "Championship",
        "kind": "relegated"
      }
    ]
  },
  "clubCupRun": {
    "qualified": true,
    "matches": [
      {
        "opponent": "Leverkusen",
        "round": "R16",
        "leg": 1,
        "home": true,
        "goalsFor": 2,
        "goalsAgainst": 1,
        "playerGoals": 0,
        "won": false
      },
      {
        "opponent": "Leverkusen",
        "round": "R16",
        "leg": 2,
        "home": false,
        "goalsFor": 3,
        "goalsAgainst": 0,
        "playerGoals": 0,
        "won": true,
        "aggFor": 5,
        "aggAgainst": 1,
        "decidedBy": "aggregate"
      },
      {
        "opponent": "Inter Milan",
        "round": "QF",
        "leg": 1,
        "home": true,
        "goalsFor": 2,
        "goalsAgainst": 3,
        "playerGoals": 0,
        "won": false
      },
      {
        "opponent": "Inter Milan",
        "round": "QF",
        "leg": 2,
        "home": false,
        "goalsFor": 0,
        "goalsAgainst": 1,
        "playerGoals": 0,
        "won": false,
        "aggFor": 2,
        "aggAgainst": 4,
        "decidedBy": "aggregate"
      }
    ],
    "result": "Quarter-final",
    "playerGoals": 0,
    "isTopScorer": false,
    "competition": "Champions League",
    "cup": "ucl",
    "firstStage": {
      "kind": "leaguePhase",
      "stages": [
        {
          "label": "League phase",
          "games": [
            {
              "matchday": 1,
              "opponent": "Liverpool",
              "home": true,
              "goalsFor": 2,
              "goalsAgainst": 1,
              "playerGoals": 0
            },
            {
              "matchday": 2,
              "opponent": "PSG",
              "home": false,
              "goalsFor": 2,
              "goalsAgainst": 0,
              "playerGoals": 0
            },
            {
              "matchday": 3,
              "opponent": "Chelsea",
              "home": true,
              "goalsFor": 1,
              "goalsAgainst": 0,
              "playerGoals": 0
            },
            {
              "matchday": 4,
              "opponent": "Juventus",
              "home": false,
              "goalsFor": 3,
              "goalsAgainst": 2,
              "playerGoals": 0
            },
            {
              "matchday": 5,
              "opponent": "Dortmund",
              "home": true,
              "goalsFor": 4,
              "goalsAgainst": 1,
              "playerGoals": 0
            },
            {
              "matchday": 6,
              "opponent": "Bayern Munich",
              "home": false,
              "goalsFor": 1,
              "goalsAgainst": 0,
              "playerGoals": 0
            },
            {
              "matchday": 7,
              "opponent": "Benfica",
              "home": true,
              "goalsFor": 5,
              "goalsAgainst": 1,
              "playerGoals": 0
            },
            {
              "matchday": 8,
              "opponent": "Napoli",
              "home": false,
              "goalsFor": 1,
              "goalsAgainst": 0,
              "playerGoals": 0
            }
          ],
          "position": 1,
          "of": 36,
          "myRow": {
            "club": "Man City",
            "w": 8,
            "d": 0,
            "l": 0,
            "gf": 19,
            "ga": 5,
            "pts": 24
          },
          "cutoffs": {
            "direct": 16,
            "playoff": 8
          },
          "footnote": "Level on points splits on goal difference, then goals scored."
        }
      ],
      "through": true,
      "playoff": false
    },
    "seasonYear": 2030,
    "club": "Man City"
  },
  "cupRun": {
    "cup": "FA Cup",
    "stages": [
      {
        "stage": "early",
        "won": true
      },
      {
        "stage": "QF",
        "opp": "Hull City",
        "won": false,
        "for": 0,
        "against": 1,
        "home": true
      }
    ],
    "opening": {
      "opp": "Derby County",
      "country": "England",
      "league": "Championship",
      "won": true,
      "for": 2,
      "against": 1,
      "home": false
    }
  }
} as unknown as SeasonRecord;
const OPENER = {
  "version": 1,
  "competition": "community-shield",
  "qualifyingYear": 2029,
  "eventYear": 2030,
  "seed": 4272396692,
  "qualification": {
    "version": 1,
    "competition": "community-shield",
    "status": "ready",
    "qualifyingYear": 2029,
    "eventYear": 2030,
    "seed": 4272396692,
    "leagueWinner": "Man City",
    "cupWinner": "Man City",
    "runnerUp": "Brighton",
    "entrants": [
      {
        "club": "Man City",
        "via": "league-winner"
      },
      {
        "club": "Brighton",
        "via": "league-runner-up"
      }
    ],
    "proof": {
      "league": {
        "kind": "league-world-close",
        "year": 2029
      },
      "cup": {
        "kind": "phone-world",
        "year": 2029
      },
      "runnerUp": {
        "kind": "league-world-close",
        "year": 2029
      }
    }
  },
  "entrants": [
    {
      "club": "Man City",
      "via": "league-winner"
    },
    {
      "club": "Brighton",
      "via": "league-runner-up"
    }
  ],
  "minutes": 90,
  "score": [
    3,
    1
  ],
  "decidedBy": "normal-time",
  "winner": "Man City",
  "player": {
    "club": "Man City",
    "availability": "available",
    "selected": true,
    "apps": 1,
    "goals": 1,
    "assists": 2,
    "cleanSheets": 0,
    "rating": 7.5,
    "title": true
  }
} as CommunityShieldResult;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const five = (row: Pick<SeasonRecord, 'apps' | 'goals' | 'assists' | 'cleanSheets' | 'rating'>) => ({
  apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating,
});
function career(row: SeasonRecord): CareerState {
  return { playerName: 'Shield annual witness', position: 'CM', seasons: [row], awards: [], currentLeague: 'Premier League',
    phone: { world: { year: 2030, leagues: { 'Premier League': 'Man City' } } } } as unknown as CareerState;
}
function fixture() {
  const annual = clone(ANNUAL);
  const match = { ...clone(OPENER), annualRating: annual.rating };
  const row: SeasonRecord = { ...annual, ...communityShieldSeasonStats(annual, match), extraCups: [match] };
  return { annual, row, match };
}
function derived(row: SeasonRecord) {
  return deriveSeason(SOCCER, row, buildSoccerSeasonCtx(career(row), FALLBACK_CLUBS, row));
}
describe('Soccer Career Shield annual league replay', () => {
  it('SC_SHIELD_REPLAY_ANNUAL: keeps the exact annual key and complete league reconstruction', () => {
    const { annual, row, match } = fixture();
    const before = JSON.stringify({ annual, row });
    const oldPlan = derived(annual);
    expect(oldPlan, 'SC_SHIELD_REPLAY_ANNUAL_FIXTURE').not.toBeNull();
    expect(readCommunityShield(row)).toEqual(match);
    expect(communityShieldAnnualStats(row)).toEqual(five(annual));
    expect(soccerSeasonKey('Shield annual witness', row), 'SC_SHIELD_REPLAY_ANNUAL_KEY')
      .toBe('Shield annual witness|Man City|2030|40|6|7|7.6|centre');
    const plan = derived(row);
    expect(plan, 'SC_SHIELD_REPLAY_ANNUAL_OUTPUT').toEqual(oldPlan);
    const shown = plan!.games.filter(game => game.played);
    const bucket = plan!.bucket;
    expect(shown.length + (bucket?.apps ?? 0)).toBe(40);
    expect(shown.reduce((sum, game) => sum + (game.line.goals ?? 0), 0) + (bucket?.line.goals ?? 0)).toBe(6);
    expect(shown.reduce((sum, game) => sum + (game.line.assists ?? 0), 0) + (bucket?.line.assists ?? 0)).toBe(7);
    expect(row.apps).toBe(40 + match.player.apps);
    expect(row.goals).toBe(6 + match.player.goals);
    expect(row.assists).toBe(7 + match.player.assists);
    expect(JSON.stringify({ annual, row })).toBe(before);
  });

  it('SC_SHIELD_REPLAY_GRADE: uses the recorded annual grade when the opener changes the rounded mean', () => {
    const base = fixture();
    // Controlled short annual season, not an observed annual engine outcome.
    const annual: SeasonRecord = { ...base.annual, apps: 5, leagueApps: 5, goals: 2, assists: 1, rating: 6.2 };
    const match = { ...base.match, annualRating: 6.2 };
    const row: SeasonRecord = { ...annual, ...communityShieldSeasonStats(annual, match), extraCups: [match] };
    const before = JSON.stringify(row);
    expect(row.rating).toBe(6.4);
    expect(readCommunityShield(row)).toEqual(match);
    expect(communityShieldAnnualStats(row), 'SC_SHIELD_REPLAY_ANNUAL_GRADE').toEqual(five(annual));
    expect(soccerSeasonKey('Shield annual witness', row)).toBe('Shield annual witness|Man City|2030|5|2|1|6.2|centre');
    const corrupt = clone(row);
    corrupt.extraCups![0].annualRating = 6.3;
    expect(readCommunityShield(corrupt), 'SC_SHIELD_REPLAY_FORWARD_GRADE').toBeNull();
    expect(communityShieldAnnualStats(corrupt)).toBeNull();
    expect(soccerSeasonKey('Shield annual witness', corrupt)).toBeNull();
    expect(JSON.stringify(row)).toBe(before);
  });

  it('SC_SHIELD_REPLAY_LEGACY: keeps a valid selected legacy cup readable without inventing league proof', () => {
    const { row } = fixture();
    delete row.extraCups![0].annualRating;
    const before = JSON.stringify(row);
    expect(readCommunityShield(row)?.player.selected).toBe(true);
    expect(readCommunityShield(row)?.score).toEqual([3, 1]);
    expect(communityShieldAnnualStats(row), 'SC_SHIELD_REPLAY_MISSING_PROOF').toBeNull();
    expect(soccerSeasonKey('Shield annual witness', row), 'SC_SHIELD_REPLAY_MISSING_KEY').toBeNull();
    expect(derived(row)).toBeNull();
    expect(JSON.stringify(row)).toBe(before);
  });

  it('SC_SHIELD_REPLAY_UNSELECTED: preserves no-opener and unselected season keys and whole plans', () => {
    const { annual, match } = fixture();
    const oldKey = soccerSeasonKey('Shield annual witness', annual), oldPlan = derived(annual);
    expect(oldKey, 'SC_SHIELD_REPLAY_UNSELECTED_KEY_FIXTURE').not.toBeNull();
    expect(oldPlan, 'SC_SHIELD_REPLAY_UNSELECTED_PLAN_FIXTURE').not.toBeNull();
    expect(communityShieldAnnualStats(annual)).toEqual(five(annual));
    const bench = clone(match);
    delete bench.annualRating;
    bench.player = { ...bench.player, selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
    const row: SeasonRecord = { ...clone(annual), extraCups: [bench] };
    const before = JSON.stringify({ row, annual });
    expect(readCommunityShield(row)).toEqual(bench);
    expect(communityShieldAnnualStats(row)).toEqual(five(annual));
    expect(soccerSeasonKey('Shield annual witness', row)).toBe(oldKey);
    expect(derived(row)).toEqual(oldPlan);
    expect(JSON.stringify({ row, annual })).toBe(before);
  });

  it('SC_SHIELD_REPLAY_PROOF: refuses malformed proof and keeps a selected zero-annual-app opener separate', () => {
    const { annual, row, match } = fixture();
    const before = JSON.stringify(row);
    for (const bad of [null, '7.6', Number.NaN, Number.POSITIVE_INFINITY, -1, 2.9, 10.1, 7.61]) {
      const damaged = clone(row) as unknown as { extraCups: Array<{ annualRating: unknown }> };
      damaged.extraCups[0].annualRating = bad;
      expect(readCommunityShield(damaged), 'SC_SHIELD_REPLAY_CORRUPT_PROOF').toBeNull();
      expect(communityShieldAnnualStats(damaged as unknown as SeasonRecord)).toBeNull();
    }
    const zero: SeasonRecord = { ...clone(annual), apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
    const opening = { ...clone(match), annualRating: 0 };
    const only: SeasonRecord = { ...zero, ...communityShieldSeasonStats(zero, opening), extraCups: [opening] };
    expect(only.apps).toBe(1);
    expect(only.rating).toBe(7.5);
    expect(readCommunityShield(only)).toEqual(opening);
    expect(communityShieldAnnualStats(only)).toEqual(five(zero));
    expect(soccerSeasonKey('Shield annual witness', only)).toBeNull();
    only.extraCups![0].annualRating = 3;
    expect(readCommunityShield(only), 'SC_SHIELD_REPLAY_ZERO_APP_PROOF').toBeNull();
    expect(communityShieldAnnualStats(only)).toBeNull();
    const duplicate = clone(row);
    duplicate.extraCups!.push(clone(match));
    expect(communityShieldAnnualStats(duplicate)).toBeNull();
    expect(JSON.stringify(row)).toBe(before);
  });
});
