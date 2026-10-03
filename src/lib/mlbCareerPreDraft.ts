/* Round 914: the MLB road to the draft, data for careerPreDraft.ts.

   Verified (docs/audits/US-PRE-DRAFT-RULES-2026-10.md):
   - 20 rounds today (since 2021), 50 rounds in 2004 (1998 to 2011);
   - a high school senior is eligible once he graduates, a junior college
     player after any year, a four year college player after his junior
     year (or at 21);
   - the 2026 slot values of picks 1 to 25; after round 10 a pick signs for
     up to 150,000 dollars without touching the pool; bonus pools began with
     the 2012 draft, so the 2004 era quotes no bonus figure at all;
   - Triple-A, Double-A and A ball are the full season levels in both eras.
   The minor league seasons come AFTER the draft and before the debut, which
   the career's own header always promised and never built. Rookie ball is
   left out: it would not confirm twice. The real draft lottery (since 2023)
   is not modelled; the order is inverse record. */

import { mlbEraById, mlbEraTeamIds, mlbTeamLabelOf } from './mlbMyCareer';
import type { PreDraftDescriptor, PreDraftStat } from './careerPreDraft';

/** 2026 draft slot values in dollars, picks 1 to 25, two sources. */
export const MLB_SLOT_2026: number[] = [
  11350600, 10507000, 9740100, 8988400, 8336500, 7746100, 7327200, 6982600, 6675300, 6393100,
  6133500, 5889300, 5661300, 5444900, 5241000, 5051900, 4868600, 4695500, 4530500, 4373900,
  4224700, 4082700, 3947600, 3818700, 3696000,
];

export const MLB_MINOR_LEVELS = ['A ball', 'Double-A', 'Triple-A'];

/** Rates only, never a games or innings count: a high school, junior
 *  college, college, A ball, Double-A and Triple-A season are all different
 *  lengths, and none of those lengths was confirmed twice, so no line
 *  implies one. */
function mlbStatLine(perf: number, rng: () => number, pos: string | undefined): PreDraftStat[] {
  const rate = (x: number) => x.toFixed(3).replace(/^0/, '');
  if (pos === 'SP' || pos === 'RP') {
    const era = Math.max(1.2, 6.2 - perf / 25 + (rng() - 0.5));
    const whip = Math.max(0.85, 1.7 - perf / 140 + (rng() - 0.5) * 0.12);
    const k9 = 6 + perf / 18 + (rng() - 0.5);
    return [
      { label: 'ERA', value: era.toFixed(2) },
      { label: 'WHIP', value: whip.toFixed(2) },
      { label: 'K/9', value: k9.toFixed(1) },
    ];
  }
  const avg = Math.min(0.42, Math.max(0.18, 0.21 + perf / 600 + (rng() - 0.5) * 0.04));
  const obp = avg + 0.055 + perf / 2000 + (rng() - 0.5) * 0.02;
  const slg = Math.min(0.95, avg + 0.08 + perf / 500 + (rng() - 0.5) * 0.04);
  return [
    { label: 'AVG', value: rate(avg) },
    { label: 'OBP', value: rate(obp) },
    { label: 'SLG', value: rate(slg) },
  ];
}

export function mlbPreDraftDescriptor(eraId?: string): PreDraftDescriptor {
  const era = mlbEraById(eraId);
  const now = era.id === 'now';
  const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;
  return {
    sport: 'mlb',
    eraId: era.id,
    draftYear: era.startYear,
    rounds: now ? 20 : 50,
    teamIds: () => mlbEraTeamIds(era.id),
    teamLabel: id => mlbTeamLabelOf(id, era.id),
    lottery: null,
    routes: [
      {
        id: 'hs', label: 'High school senior', level: 'High school, senior year',
        blurb: 'Eligible the day you graduate. The rawest road, and one season to show it.',
        seasons: 1, startAge: 17, stockStart: -2,
      },
      {
        id: 'juco', label: 'Junior college', level: 'Junior college',
        blurb: 'Eligible after any year. Two seasons of reps against grown men.',
        seasons: 2, startAge: 18, stockStart: -4,
      },
      {
        id: 'college', label: 'Four year college', level: 'College baseball',
        blurb: 'Eligible after your junior year. Three seasons, and the scouts know exactly what you are.',
        seasons: 3, startAge: 18, stockStart: 2,
      },
    ],
    showcaseName: 'Pre draft showcase',
    drills: ['Sixty yard dash', 'Live batting practice', 'Bullpen session', 'Defensive drills'],
    statLine: (perf, rng, pos) => mlbStatLine(perf, rng, pos),
    choices: [
      {
        id: 'mlb_summer_league',
        title: 'A summer wood bat league',
        body: 'A summer league wants you. Wood bats, long bus rides, scouts behind the plate.',
        options: [
          { label: 'Go play summer ball', effect: { stock: 3, health: -10 } },
          { label: 'Take the summer off', effect: { health: 10 } },
        ],
      },
      {
        id: 'mlb_commit',
        title: 'The college commitment',
        body: 'A college coach wants your commitment. Scouts read it as leverage at signing time.',
        routes: ['hs'],
        options: [
          { label: 'Sign the commitment', effect: { stock: -2, rating: 1 } },
          { label: 'Keep your options open', effect: { stock: 1 } },
        ],
      },
    ],
    slotValue: now ? (pick => MLB_SLOT_2026[pick - 1] ?? null) : undefined,
    bonusLine: pick => {
      if (!now) return 'You sign your first deal.';
      const slot = MLB_SLOT_2026[pick - 1];
      if (slot) return `Your pick's slot value is ${dollars(slot)}.`;
      if (Math.ceil(pick / mlbEraTeamIds(era.id).length) > 10) return 'After round 10 a pick can sign for up to $150,000 without touching the bonus pool.';
      return 'You sign for the slot value of your pick.';
    },
    postDraft: {
      title: 'Minor league seasons',
      min: 1, max: 3,
      levelFor: (i, n) => MLB_MINOR_LEVELS[MLB_MINOR_LEVELS.length - n + i] ?? 'Triple-A',
    },
    /* preDraftRunDraft gives an undrafted player the longest climb, so his
       first minor league season is always A ball. */
    undraftedLine: 'Nobody calls your name. A club signs you anyway, and you start in A ball.',
  };
}
