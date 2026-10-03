/* Round 914: the NBA road to the draft, data for careerPreDraft.ts.

   Verified (docs/audits/US-PRE-DRAFT-RULES-2026-10.md):
   - two rounds, one pick per team per round, in both eras (since 1989);
   - today: fourteen lottery teams, four picks drawn, combinations
     140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5 (since 2019);
   - 2003: thirteen lottery teams (29 teams, 16 in the playoffs), three picks
     drawn, combinations 250, 200, 157, 120, 89, 64, 44, 29, 18, 11, 7, 6, 5;
   - the 2005 CBA set the floor at 19 in the draft year and a year out of
     high school, so straight from high school is a 2003-04 road only. */

import { nbaEraById, nbaEraTeamIds, nbaTeamLabelOf } from './nbaMyCareer';
import type { PreDraftDescriptor, PreDraftLottery, PreDraftRoute, PreDraftStat } from './careerPreDraft';

export const NBA_LOTTERY_NOW: PreDraftLottery = {
  teams: 14, drawn: 4,
  combos: [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5],
};

export const NBA_LOTTERY_2003: PreDraftLottery = {
  teams: 13, drawn: 3,
  combos: [250, 200, 157, 120, 89, 64, 44, 29, 18, 11, 7, 6, 5],
};

const COLLEGE_ONE: PreDraftRoute = {
  id: 'one', label: 'One year of college', level: 'College basketball',
  blurb: 'One season on campus, then you declare.',
  seasons: 1, startAge: 18, stockStart: 2,
};
const COLLEGE_THREE: PreDraftRoute = {
  id: 'three', label: 'Three years of college', level: 'College basketball',
  blurb: 'Three seasons to grow into it. Less hype, more polish.',
  seasons: 3, startAge: 18, stockStart: -4,
};
const PREP: PreDraftRoute = {
  id: 'prep', label: 'Straight from high school', level: 'High school, senior year',
  blurb: 'One senior season, then the draft at 18. The rules of the time allow it.',
  seasons: 1, startAge: 17, stockStart: 0,
};

function nbaStatLine(perf: number, rng: () => number, pos: string | undefined): PreDraftStat[] {
  const f = 0.45 + perf / 100;
  const v = (base: number) => (Math.max(0, base * f * (0.85 + rng() * 0.3))).toFixed(1);
  const big = pos === 'C' || pos === 'PF';
  const guard = pos === 'PG' || pos === 'SG';
  return [
    { label: 'Games', value: String(26 + Math.floor(rng() * 10)) },
    { label: 'PPG', value: v(13) },
    { label: 'RPG', value: v(big ? 8 : guard ? 3.5 : 5) },
    { label: 'APG', value: v(pos === 'PG' ? 5.5 : big ? 1.2 : 2.5) },
  ];
}

export function nbaPreDraftDescriptor(eraId?: string): PreDraftDescriptor {
  const era = nbaEraById(eraId);
  const then = era.id === 'y2004';
  return {
    sport: 'nba',
    eraId: era.id,
    draftYear: era.startYear,
    rounds: 2,
    teamIds: () => nbaEraTeamIds(era.id),
    teamLabel: id => nbaTeamLabelOf(id, era.id),
    lottery: then ? NBA_LOTTERY_2003 : NBA_LOTTERY_NOW,
    routes: then ? [PREP, COLLEGE_ONE, COLLEGE_THREE] : [COLLEGE_ONE, COLLEGE_THREE],
    showcaseName: 'Pre draft workouts',
    drills: ['Spot up shooting', 'Lane agility', 'Max vertical', 'Three on three'],
    statLine: (perf, rng, pos) => nbaStatLine(perf, rng, pos),
    choices: [
      {
        id: 'nba_circuit',
        title: 'The summer circuit',
        body: 'The travel team wants you for every tournament, and the scouts will be at all of them.',
        options: [
          { label: 'Play every tournament', effect: { stock: 3, health: -10 } },
          { label: 'Stay home and train', effect: { rating: 1 } },
        ],
      },
      {
        id: 'nba_bench',
        title: 'Off the bench',
        body: 'The head coach wants you coming off the bench behind an older player.',
        routes: ['one', 'three'],
        options: [
          { label: 'Take the role', effect: { rating: 1, stock: -1 } },
          { label: 'Push for the start', effect: { stock: 2, rating: -1 } },
        ],
      },
    ],
    postDraft: null,
    undraftedLine: 'Nobody calls your name. You can still sign with any team, and one gives you a summer league invite.',
  };
}
