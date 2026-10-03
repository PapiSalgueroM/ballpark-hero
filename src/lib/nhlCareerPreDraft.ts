/* Round 914: the NHL road to the draft, data for careerPreDraft.ts.

   Verified (docs/audits/US-PRE-DRAFT-RULES-2026-10.md): seven rounds in
   both eras (since 2005); eligible at 18 on or before September 15 of the
   draft year; prospects come out of major junior, US junior and college
   hockey, and the European leagues. Every route here drafts you at 18, then
   one to three development seasons before the debut. The real draft
   lottery would not confirm twice, so it is left out and the order is
   inverse record; nothing on screen claims there is no lottery. */

import { nhlEraById, nhlEraTeamIds, nhlTeamLabelOf } from './nhlMyCareer';
import type { PreDraftDescriptor, PreDraftStat } from './careerPreDraft';

const DEV_LEVEL: Record<string, string> = {
  junior: 'Major junior',
  college: 'NCAA college hockey',
  europe: 'European pro league',
};

function nhlStatLine(perf: number, rng: () => number, pos: string | undefined): PreDraftStat[] {
  const gp = 50 + Math.floor(rng() * 18);
  if (pos === 'G') {
    const sv = Math.min(0.935, Math.max(0.86, 0.875 + perf / 2000 + (rng() - 0.5) * 0.01));
    return [
      { label: 'GP', value: String(Math.round(gp * 0.7)) },
      { label: 'SV%', value: sv.toFixed(3).replace(/^0/, '') },
      { label: 'GAA', value: Math.max(1.6, 4.2 - perf / 40 + (rng() - 0.5) * 0.4).toFixed(2) },
    ];
  }
  const f = 0.4 + perf / 100;
  const g = Math.max(0, Math.round((pos === 'D' ? 8 : 24) * f * (0.75 + rng() * 0.5)));
  const a = Math.max(0, Math.round((pos === 'D' ? 26 : 30) * f * (0.75 + rng() * 0.5)));
  return [
    { label: 'GP', value: String(gp) },
    { label: 'G', value: String(g) },
    { label: 'A', value: String(a) },
    { label: 'PTS', value: String(g + a) },
  ];
}

export function nhlPreDraftDescriptor(eraId?: string): PreDraftDescriptor {
  const era = nhlEraById(eraId);
  return {
    sport: 'nhl',
    eraId: era.id,
    draftYear: era.startYear,
    rounds: 7,
    teamIds: () => nhlEraTeamIds(era.id),
    teamLabel: id => nhlTeamLabelOf(id, era.id),
    lottery: null,
    routes: [
      {
        id: 'junior', label: 'Major junior', level: 'Major junior',
        blurb: 'Long season, long bus rides, scouts in every rink. Drafted at 18.',
        seasons: 2, startAge: 16, stockStart: 3,
      },
      {
        id: 'college', label: 'US junior, then college', level: 'US junior hockey',
        blurb: 'Two seasons of US junior, drafted at 18, then you take your college place.',
        seasons: 2, startAge: 16, stockStart: -2,
      },
      {
        id: 'europe', label: 'Europe', level: 'European junior league',
        blurb: 'Two seasons in a European junior league, drafted at 18, then pro hockey at home.',
        seasons: 2, startAge: 16, stockStart: -3,
      },
    ],
    showcaseName: 'Scouting combine',
    drills: ['Fitness testing', 'Skating sprint', 'Agility course', 'Interview day'],
    statLine: (perf, rng, pos) => nhlStatLine(perf, rng, pos),
    choices: [
      {
        id: 'nhl_tournament',
        title: 'The under 18 tournament',
        body: 'Your country wants you for the spring tournament. It lands right on top of the playoffs.',
        options: [
          { label: 'Go to the tournament', effect: { stock: 4, health: -10 } },
          { label: 'Stay with your club', effect: { rating: 1 } },
        ],
      },
      {
        id: 'nhl_billet',
        title: 'A new billet family',
        body: 'Your billet family is moving. The team can find you a new one, or you can room with a teammate.',
        routes: ['junior'],
        options: [
          { label: 'New billet family', effect: { health: 10 } },
          { label: 'Room with a teammate', effect: { rating: 1, health: -5 } },
        ],
      },
    ],
    postDraft: {
      title: 'Development seasons',
      min: 1, max: 3,
      levelFor: (_i, _n, routeId) => DEV_LEVEL[routeId] ?? 'Major junior',
    },
    undraftedLine: 'Nobody calls your name. A club invites you to camp on a tryout.',
  };
}
