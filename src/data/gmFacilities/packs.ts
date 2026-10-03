/**
 * Round 943: the buildings, as data, for every manager seat that is not Club
 * Manager. The engine is src/lib/gmFacilities.ts; read its header first.
 *
 * Nothing here is a real club's or a real program's money. The four front
 * office packs price their ladder against the league's opening cap, which
 * the engines already carry from src/lib/leagueCaps.ts (sourced there), so a
 * training centre costs the same share of the cap in every sport. The other
 * packs run on a game scale of their own, said plainly in goodSeasonSource,
 * because those engines keep no money of the same kind (the college
 * dynasties and Australian football keep none at all).
 *
 * Every effect is neutral at level 1, so a seat that never builds plays the
 * game exactly as it was balanced. The steps are bounded on purpose and match
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
 * A good season's operating result as a share of the cap: a big market on
 * the cap winning two in three with a deep playoff run. scripts/simGmBooks.mjs
 * measured it on 2026-10-02 at 0.639 caps (NFL), 0.583 (NBA), 0.580 (NHL) and
 * 0.483 (MLB), six seeds each with under 0.002 between them, and fails if any
 * sport's comes out above this number, so it is never an underestimate.
 */
export const FO_GOOD_SEASON_SHARE = 0.7;

function foPack(id: string, label: string, cap: number, periods: number, period: string): FacilityPack {
  return {
    id, label, unit: '$M', period, maxLevel: 10,
    costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * cap * FO_COST_PER_CAP * 1000) / 1000),
    buildPeriods: TEN_LEVEL_BUILD,
    startLevel: [6, 4, 2],
    upkeepPerLevel: Math.round((cap * FO_UPKEEP_SHARE / (periods * 16)) * 1000) / 1000,
    goodSeasonIncome: Math.round(cap * FO_GOOD_SEASON_SHARE * 10) / 10,
    goodSeasonSource: 'A big market club\'s operating result in a season that ends on a deep playoff run, measured by scripts/simGmBooks.mjs on this league\'s opening cap.',
    facilities: FO_FACILITIES,
  };
}

/* Periods are the engines' own: the NFL plays 18 weeks (17 games and a bye),
   the NBA and NHL 20 rounds, MLB 27 (nbaFrontOffice NBA_ROUNDS,
   nhlFrontOffice NHL_FO_ROUNDS, mlbFrontOffice MLB_ROUNDS). */
export const NFL_FACILITY_PACK = foPack('nfl', 'NFL Front Office', NFL_SALARY_CAP_2026, 18, 'week');
export const NBA_FACILITY_PACK = foPack('nba', 'NBA Front Office', NBA_SALARY_CAP_2026_27, 20, 'round');
export const NHL_FACILITY_PACK = foPack('nhl', 'NHL Front Office', NHL_UPPER_LIMIT_2026_27, 20, 'round');
export const MLB_FACILITY_PACK = foPack('mlb', 'MLB Front Office', MLB_CBT_THRESHOLD_2026, 27, 'round');

/* ---------- college ---------- */

export const COLLEGE_FACILITY_PACK: FacilityPack = {
  id: 'college', label: 'College program', unit: '$M', period: 'week', maxLevel: 10,
  costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * 0.075 * 1000) / 1000),
  buildPeriods: TEN_LEVEL_BUILD,
  startLevel: [6, 4, 2],
  upkeepPerLevel: 0.004,
  goodSeasonIncome: 12,
  goodSeasonSource: 'Game scale, not any real program\'s budget: the college dynasties keep no money yet, so this is the facility fund a good season is meant to bring in, and the round that binds the pack sets its income against it.',
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
   (signProspect's literal 6), and 0.08 reputation forgotten a quiet week. */

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
      blurb: 'Somebody working the phones, so a quiet gym is forgotten more slowly.',
      effects: [amount('repDecay', 'Reputation lost a quiet week', 0.08, -0.01, 2, 'A quiet week costs 0.08 reputation.', v => `A quiet week costs ${v} reputation.`)],
    },
  ],
};

/* ---------- Australian football ----------

   src/lib/aussieRulesManager.ts is a fictional six club league that keeps no
   money, so this pack runs on a game scale of its own and says so. */

export const AUSSIE_FACILITY_PACK: FacilityPack = {
  id: 'aussie', label: 'Aussie Rules Manager', unit: '$M', period: 'round', maxLevel: 10,
  costStep: TEN_LEVEL_STEPS.map(s => Math.round(s * 0.04 * 1000) / 1000),
  buildPeriods: [1, 1, 1, 1, 2, 2, 2, 3, 3],
  startLevel: [5, 3, 1],
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
      id: 'recruiting', label: 'Recruiting department', emoji: '\u{1F50D}', costFactor: 0.7,
      blurb: 'More eyes on the young players coming through, so the ones you bring in are a touch better.',
      effects: [amount('rookieSkill', 'Rookie skill', 0, 0.5, 1, 'Rookies arrive as they are.', v => `Rookies arrive +${v} skill.`)],
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
