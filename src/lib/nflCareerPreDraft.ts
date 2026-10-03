/* Round 914: the NFL road to the draft, data for careerPreDraft.ts.

   Verified (docs/audits/US-PRE-DRAFT-RULES-2026-10.md): seven rounds, one
   pick per club per round, in both eras (seven rounds since 1994); order by
   inverse finish with no lottery; eligible three seasons after high school,
   in force in 2004 and 2005 too (Clarett, 2004). An undrafted rookie is free
   to sign with any club. Three college seasons is the shortest road, so
   both routes run three. */

import { nflEraById } from './nflMyCareer';
import type { PreDraftDescriptor, PreDraftStat } from './careerPreDraft';

function nflStatLine(perf: number, rng: () => number, pos: string | undefined): PreDraftStat[] {
  const games = 10 + Math.floor(rng() * 4);
  const f = 0.4 + perf / 100;
  const n = (base: number) => Math.max(0, Math.round(base * f * (0.85 + rng() * 0.3)));
  const g = { label: 'Games', value: String(games) };
  switch (pos) {
    case 'QB': return [g, { label: 'Pass yds', value: String(n(2400)) }, { label: 'Pass TD', value: String(n(20)) }];
    case 'RB': return [g, { label: 'Rush yds', value: String(n(950)) }, { label: 'Rush TD', value: String(n(9)) }];
    case 'WR': case 'TE': return [g, { label: 'Catches', value: String(n(pos === 'TE' ? 30 : 50)) }, { label: 'Rec yds', value: String(n(pos === 'TE' ? 380 : 720)) }, { label: 'Rec TD', value: String(n(6)) }];
    case 'LB': return [g, { label: 'Tackles', value: String(n(70)) }, { label: 'Sacks', value: String(n(3)) }];
    case 'EDGE': return [g, { label: 'Tackles', value: String(n(40)) }, { label: 'Sacks', value: String(n(7)) }];
    case 'CB': return [g, { label: 'Tackles', value: String(n(40)) }, { label: 'INT', value: String(n(3)) }];
    case 'K': { const att = 12 + Math.floor(rng() * 10); return [g, { label: 'FG', value: `${Math.min(att, Math.round(att * (0.6 + perf / 300)))}/${att}` }]; }
    default: return [g, { label: 'Starts', value: String(Math.min(games, Math.round(games * (0.3 + perf / 120)))) }];
  }
}

export function nflPreDraftDescriptor(eraId?: string): PreDraftDescriptor {
  const era = nflEraById(eraId);
  return {
    sport: 'nfl',
    eraId: era.id,
    draftYear: era.startYear,
    rounds: 7,
    teamIds: () => era.teams.map(t => t.abbr),
    teamLabel: id => era.teams.find(t => t.abbr === id)?.label ?? id,
    lottery: null,
    routes: [
      {
        id: 'power', label: 'Big college program', level: 'College, big program',
        blurb: 'Every game on TV and scouts at every practice. Three seasons before you can declare.',
        seasons: 3, startAge: 18, stockStart: 4,
      },
      {
        id: 'small', label: 'Small school', level: 'College, small school',
        blurb: 'You start sooner, but the scouts have to come looking. Three seasons before you can declare.',
        seasons: 3, startAge: 18, stockStart: -6,
      },
    ],
    showcaseName: 'Scouting combine',
    drills: ['40 yard dash', 'Bench press', 'Vertical jump', 'Position drills'],
    statLine: (perf, rng, pos) => nflStatLine(perf, rng, pos),
    choices: [
      {
        id: 'nfl_bowl',
        title: 'The bowl game',
        body: 'Your agent thinks your stock is set. The head coach wants you out there one more time.',
        options: [
          { label: 'Play in the bowl', effect: { stock: 2, health: -10 } },
          { label: 'Sit it out', effect: { stock: -1 } },
        ],
      },
      {
        id: 'nfl_transfer',
        title: 'A bigger program calls',
        body: 'A big program wants you as a transfer. Your small school coach found you first.',
        routes: ['small'],
        options: [
          { label: 'Transfer up', effect: { stock: 5, rating: -1 } },
          { label: 'Stay loyal', effect: { rating: 1 } },
        ],
      },
    ],
    postDraft: null,
    undraftedLine: 'Nobody calls your name. You can still sign with any club, and one gives you a camp invite.',
  };
}
