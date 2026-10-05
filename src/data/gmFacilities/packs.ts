/**
 * Round 943: the buildings, as data, for every manager seat that is not Club
 * Manager. The engine is src/lib/gmFacilities.ts; read its header first.
 *
 * Nothing here is a real club's or a real program's money. The four front
 * office packs price their ladder against the league's opening cap, which
 * the engines already carry from src/lib/leagueCaps.ts (sourced there), so a
 * training centre costs the same share of the cap in every sport. The other
 * packs run on a game scale of their own, said plainly in goodSeasonSource,
 * because those engines keep no money of the same kind: the college
 * dynasties keep a program budget in points, not dollars (nilBudgetFor in
 * cfbDynasty.ts and cbbNilFor in cbbDynasty.ts, opened by collegeProgram.ts
 * openProgramOffseason), which pays the staff and then the NIL pot, and
 * Australian football keeps none at all. Whether a building is paid out of
 * that program budget, and at what rate, is the binding round's call.
 *
 * Every effect is neutral at level 1 and every seat opens with every building
 * at level 1, whatever its market (startLevel is [1, 1, 1] in every pack, and
 * scripts/simGmFacilities.mjs fails otherwise), so a seat that never builds,
 * and an old save that has no facilities block, plays the game exactly as it
 * was balanced and pays no upkeep. A big market's edge is money: a bigger
 * operations budget builds sooner. The steps are bounded on purpose and match
 * Club Manager's where the building is the same idea (growth 1.3 percent a
 * level, injury spells 4 percent shorter a level, a ground 2 percent a level).
 *
 * scripts/simGmFacilities.mjs walks every level of every building here and
 * fails if any step leaves its value where it was, and it holds each pack's
 * full build out against goodSeasonIncome.
 */
import type { FacilityEffect, FacilityPack } from '@/lib/gmFacilities';
import { MLB_CBT_THRESHOLD_2026, NBA_SALARY_CAP_2026_27, NFL_SALARY_CAP_2026, NHL_UPPER_LIMIT_2026_27 } from '@/lib/leagueCaps';

const pct = (v: number): number => Math.round(Math.abs(v - 1) * 1000) / 10;

/** A multiplier on something the engine already computes, 1 at level 1. */
function mult(key: string, label: string, step: number, digits: number, atNeutral: string, words: (p: number) => string): FacilityEffect {
  return { key, label, neutral: 1, step, digits, atNeutral, line: v => words(pct(v)) };
}

/** A count or an amount added to (or taken from) what the engine has, `neutral` at level 1. */
function amount(key: string, label: string, neutral: number, step: number, digits: number, atNeutral: string, words: (v: number) => string): FacilityEffect {
  return { key, label, neutral, step, digits, atNeutral, line: v => words(v) };
}

/** Club Manager's cost step table (clubManagerFacilities.ts COST_STEP), the shape every ten level ladder here uses. */
const TEN_LEVEL_STEPS = [4, 6, 9, 13, 19, 27, 38, 54, 75];
const TEN_LEVEL_BUILD = [1, 1, 2, 2, 3, 3, 4, 5, 6];

/* ---------- the four front offices ---------- */

const FO_FACILITIES = [
  {
    id: 'training', label: 'Training centre', emoji: '\u{1F3CB}️', costFactor: 1.0,
    blurb: 'Everyone with room to grow grows a little faster. Nobody grows past his ceiling.',
    effects: [mult('growthMult', 'Growth', 0.013, 3, 'No lift on growth yet.', p => `Growth ${p}% faster for anyone with room to grow.`)],
  },
  {
    id: 'medical', label: 'Medical', emoji: '\u{1FA7A}', costFactor: 0.8,
    blurb: 'Injuries are written for less time. A knock is still a knock.',
    effects: [mult('injurySpellMult', 'Injury spells', -0.04, 2, 'Injuries run their full course.', p => `Injury spells written ${p}% shorter.`)],
  },
  {
    id: 'analytics', label: 'Analytics room', emoji: '\u{1F4CA}', costFactor: 0.7,
    blurb: 'The numbers people find the fair price, so a free agent asks a little less.',
    effects: [mult('faAskMult', 'Free agent asks', -0.005, 3, 'Free agents ask the going rate.', p => `Free agents ask ${p}% less.`)],
  },
  {
    id: 'scouting', label: 'Scouting department', emoji: '\u{1F50D}', costFactor: 0.6,
    blurb: 'More eyes on the draft class, so the grade you see sits closer to the truth.',
    effects: [mult('draftReadErrorMult', 'Draft read error', -0.06, 2, 'Draft grades carry the usual guesswork.', p => `Draft grade error ${p}% smaller.`)],
  },
];

/** Front office money is the league's: each step is a thousandth of the opening cap times Club Manager's step. */
export const FO_COST_PER_CAP = 0.001;
/** Two percent of the cap a season in running costs with every building at level 5 (16 levels above 1). */
const FO_UPKEEP_SHARE = 0.02;
/**
 * The most a front office can put into buildings in one season, as a share
 * of the cap: a big market at full trust, nothing built yet, so its whole
 * operations budget less staff and scouts is free (0.12 x 1.2 x 0.55 =
 * 0.0792 in src/lib/gmBooks.ts). Buildings are paid from the operations
 * budget and nothing else, so this is the pot a full build out is held
 * against, not the season's operating result, which never buys a building.
 * scripts/simGmBooks.mjs measures the real figure through opsFreeK and fails
 * if it comes out above this number, so it is never an underestimate.
 */
export const FO_BEST_FREE_OPS_SHARE = 0.08;

function foPack(id: string, label: string, cap: number, periods: number, period: string): FacilityPack {
  return {
    id, label, unit: '$M', period, maxLevel: 10,
    costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * cap * FO_COST_PER_CAP * 1000) / 1000),
    buildPeriods: TEN_LEVEL_BUILD,
    startLevel: [1, 1, 1],
    upkeepPerLevel: Math.round((cap * FO_UPKEEP_SHARE / (periods * 16)) * 1000) / 1000,
    goodSeasonIncome: Math.round(cap * FO_BEST_FREE_OPS_SHARE * 1000) / 1000,
    goodSeasonSource: 'The most free operations money one season can bring (a big market at full trust with nothing built), the only money that buys a building, measured by scripts/simGmBooks.mjs on this league\'s opening cap.',
    facilities: FO_FACILITIES,
  };
}

/* Periods are the engines' own: the NFL front office plays 17 weeks with no
   bye (frontOffice REGULAR_WEEKS), the NBA and NHL 20 rounds, MLB 27
   (nbaFrontOffice NBA_ROUNDS, nhlFrontOffice NHL_FO_ROUNDS, mlbFrontOffice
   MLB_ROUNDS). scripts/simGmBooks.mjs reads those constants and fails if a
   pack or the books disagree with them. */
export const NFL_FACILITY_PACK = foPack('nfl', 'NFL Front Office', NFL_SALARY_CAP_2026, 17, 'week');
export const NBA_FACILITY_PACK = foPack('nba', 'NBA Front Office', NBA_SALARY_CAP_2026_27, 20, 'round');
export const NHL_FACILITY_PACK = foPack('nhl', 'NHL Front Office', NHL_UPPER_LIMIT_2026_27, 20, 'round');
export const MLB_FACILITY_PACK = foPack('mlb', 'MLB Front Office', MLB_CBT_THRESHOLD_2026, 27, 'round');

/* ---------- college ---------- */

export const COLLEGE_FACILITY_PACK: FacilityPack = {
  id: 'college', label: 'College program', unit: '$M', period: 'week', maxLevel: 10,
  costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * 0.075 * 1000) / 1000),
  buildPeriods: TEN_LEVEL_BUILD,
  startLevel: [1, 1, 1],
  upkeepPerLevel: 0.004,
  goodSeasonIncome: 12,
  goodSeasonSource: 'Game scale, not any real program\'s budget: the college dynasties keep a program budget in points, not dollars, and nothing yet pays a building out of it, so this is the facility fund a good season is meant to bring in, and the round that binds the pack sets its income against it.',
  facilities: [
    {
      id: 'stadium', label: 'Stadium', emoji: '\u{1F3DF}️', costFactor: 1.5,
      blurb: 'More seats and a louder Saturday, and a place recruits remember from their visit.',
      effects: [
        mult('crowdMult', 'Crowd', 0.02, 2, 'The stands hold what they hold.', p => `Crowds ${p}% bigger.`),
        amount('recruitPitch', 'Recruiting pitch', 0, 1, 0, 'Recruits see an ordinary stadium.', v => `Recruiting pitch +${v}.`),
      ],
    },
    {
      id: 'weightRoom', label: 'Weight room', emoji: '\u{1F3CB}️', costFactor: 1.0,
      blurb: 'Players with room to grow grow a little faster. Nobody grows past his ceiling.',
      effects: [mult('growthMult', 'Growth', 0.013, 3, 'No lift on growth yet.', p => `Growth ${p}% faster for anyone with room to grow.`)],
    },
    {
      id: 'academic', label: 'Academic centre', emoji: '\u{1F4DA}', costFactor: 0.8,
      blurb: 'Tutors and study hall, so fewer players are lost to grades.',
      effects: [mult('eligibilityEventMult', 'Eligibility scares', -0.04, 2, 'Grades are the player\'s own business.', p => `Eligibility scares ${p}% rarer.`)],
    },
    {
      id: 'collective', label: 'Collective office', emoji: '\u{1F91D}', costFactor: 0.6,
      blurb: 'Somebody whose job is the NIL money, so the base offer goes further.',
      effects: [mult('nilBaseMult', 'NIL base', 0.03, 2, 'The NIL base is what boosters give unasked.', p => `NIL base ${p}% higher.`)],
    },
  ],
};

/* ---------- the fight gym ----------

   Money is the gym's own, in millions like src/lib/fightGym.ts (a gym opens
   on 0.6). Five levels, not ten: a gym is a smaller building than a stadium,
   and the dormitory's value is a roster cap, which can only move a whole man
   a level. Level 1 of each is exactly the gym as Round 625 built it: the
   training bump TRAIN_COST buys, the damage a fight leaves, six beds
   (signProspect's literal 6), and the reputation advanceWeek forgets.

   That last one is written as a cadence, not a rate, because the gym keeps
   reputation to one decimal: advanceWeek takes 0.08 and rounds, so every
   week really costs exactly 0.1, and any rate between 0.05 and 0.149 still
   costs 0.1 (a ladder of 0.08, 0.07, 0.06, 0.05, 0.04 lost 0.1, 0.1, 0.1, 0,
   0 a week). So the front office says how many weeks pass for each 0.1 the
   gym loses: 1 at level 1 (the gym as it is), then 2, 3, 4, 5. The binding
   round applies it as "advanceWeek forgets 0.1 only in a week whose number
   divides by it", and scripts/simGmFacilities.mjs walks a year of that under
   the gym's own one decimal rounding at every level. */

export const GYM_FACILITY_PACK: FacilityPack = {
  id: 'gym', label: 'Fight Gym', unit: '$M', period: 'week', maxLevel: 5,
  costStep: [0.7, 1.2, 1.9, 2.9],
  buildPeriods: [2, 3, 4, 6],
  startLevel: [1, 1, 1],
  upkeepPerLevel: 0.004,
  goodSeasonIncome: 18,
  goodSeasonSource: 'An established gym\'s purse cuts over 52 weeks: scripts/simGmFacilities.mjs runs src/lib/fightGym.ts with the careful policy and measured 16.6M in year two and 12.8M in year three (ten seeds, 2026-10-02).',
  facilities: [
    {
      id: 'ring', label: 'Ring and bags', emoji: '\u{1F94A}', costFactor: 1.0,
      blurb: 'Better kit in the room, so a training block moves a fighter a bit further.',
      effects: [mult('trainBumpMult', 'Training block', 0.05, 2, 'A training block buys what it always did.', p => `Training blocks ${p}% stronger.`)],
    },
    {
      id: 'medical', label: 'Medical room', emoji: '\u{1FA7A}', costFactor: 0.8,
      blurb: 'A doctor on the door, so less of a fight comes home with the fighter.',
      effects: [mult('damageCarriedMult', 'Damage carried', -0.04, 2, 'A fighter carries every bit of damage home.', p => `${p}% less damage carried out of a fight.`)],
    },
    {
      id: 'dormitory', label: 'Dormitory', emoji: '\u{1F6CF}️', costFactor: 1.2,
      blurb: 'More beds, so more fighters can live and train under your roof.',
      effects: [amount('rosterCap', 'Roster cap', 6, 1, 0, 'Room for six fighters.', v => `Room for ${v} fighters.`)],
    },
    {
      id: 'frontOffice', label: 'Front office', emoji: '\u{1F4DE}', costFactor: 0.6,
      blurb: 'Somebody working the phones, so the gym is forgotten more slowly.',
      effects: [amount('repDecayEvery', 'Weeks for each 0.1 reputation lost', 1, 1, 0, 'The gym loses 0.1 reputation every week.', v => `The gym loses 0.1 reputation every ${v} weeks.`)],
    },
  ],
};

/* ---------- Australian football ----------

   src/lib/aussieRulesManager.ts is a fictional six club league that keeps no
   money, so this pack runs on a game scale of its own and says so.

   Every building feeds a number the engine already has: a training week's
   prep (8), the fatigue that clears between rounds and on a rest week (20
   and 30), and the fatigue a quarter adds (7 plus the stamina and tactic
   terms). The brief named a recruiting department, but the engine has no
   rookies, no draft and no recruiting, so a recruiting tile would promise
   what nothing reads; the conditioning staff stands in its place.

   Owed by the round that binds it: the engine plays ONE season of ten
   rounds and then stops, with no summer, so as it stands no seat could climb
   far up a ten level ladder (the build periods alone add to 16 rounds a
   building) and the rollover is never called. That round either gives the
   game a next season or cuts this ladder to what ten rounds can reach. */

export const AUSSIE_FACILITY_PACK: FacilityPack = {
  id: 'aussie', label: 'Aussie Rules Manager', unit: '$M', period: 'round', maxLevel: 10,
  costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * 0.04 * 1000) / 1000),
  buildPeriods: [1, 1, 1, 1, 2, 2, 2, 3, 3],
  startLevel: [1, 1, 1],
  upkeepPerLevel: 0.004,
  goodSeasonIncome: 6,
  goodSeasonSource: 'Game scale, not any real club\'s money: the Aussie Rules manager keeps no money yet, so this is the facility fund a good season is meant to bring in, and the round that binds the pack sets its income against it.',
  facilities: [
    {
      id: 'trainingBase', label: 'Training base', emoji: '\u{1F3C9}', costFactor: 1.0,
      blurb: 'Better ovals and gear, so a training week sharpens the side a little more.',
      effects: [mult('trainPrepMult', 'Training week', 0.02, 2, 'A training week does what it always did.', p => `Training weeks ${p}% sharper.`)],
    },
    {
      id: 'medical', label: 'Medical', emoji: '\u{1FA7A}', costFactor: 0.8,
      blurb: 'Recovery staff, so tired legs come back faster between games.',
      effects: [mult('fatigueRecoveryMult', 'Recovery', 0.03, 2, 'Legs recover at the usual pace.', p => `Fatigue clears ${p}% faster.`)],
    },
    {
      id: 'conditioning', label: 'Conditioning staff', emoji: '\u{1F3C3}', costFactor: 0.7,
      blurb: 'Fitter legs, so a quarter takes a little less out of the side.',
      effects: [mult('matchFatigueMult', 'Fatigue a quarter', -0.03, 2, 'A quarter takes what it always took.', p => `A quarter adds ${p}% less fatigue.`)],
    },
  ],
};

/** Every pack by id, the one lookup a screen or a harness needs. */
export const GM_FACILITY_PACKS: Record<string, FacilityPack> = {
  nfl: NFL_FACILITY_PACK,
  nba: NBA_FACILITY_PACK,
  nhl: NHL_FACILITY_PACK,
  mlb: MLB_FACILITY_PACK,
  college: COLLEGE_FACILITY_PACK,
  gym: GYM_FACILITY_PACK,
  aussie: AUSSIE_FACILITY_PACK,
};
