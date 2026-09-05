/**
 * Round 467: the club's facilities, his words: "dressing room, stadium,
 * training ground, medical, each level 1 to 10, big clubs start high, small
 * clubs start near zero, upgrades cost real money and help the squad."
 *
 * Four levels, all stored on the save under `facilities`, none typed per
 * club: the day one level comes from the club's tier and its market value
 * (ClubDef.budget is squad value times 0.16, capped 8 to 200), which is the
 * same stature every other money rule in the engine already reads. Tier 4
 * on the floor budget opens on 1 and 2, a tier 1 giant opens on 8 to 10,
 * and the 268 of 330 modern clubs sitting on the 8m floor open on 1 and 2.
 *
 * Every effect is a lift on top of the calibrated game and reaches exactly
 * nothing at level 1, so a club that never opens this desk plays the game
 * the previous rounds balanced. That is Round 95's rule (a multiplier that
 * cannot reach 1 is a hidden tax) applied to a feature that only ever adds:
 *
 *   training ground   one factor inside developmentRate, 1.0 at level 1 up
 *                     to 1.117 at 10, multiplied in BEFORE the clamp and
 *                     before agePlayer caps the drift at the player's
 *                     potential, so the Round 96 and 116 rule (growth reads
 *                     headroom) is untouched by construction.
 *   medical           the spell an injury is written for, times 1.0 at level
 *                     1 down to 0.64 at 10, floor one week. Applied to the
 *                     number the engine already drew, so no extra draw moves
 *                     a seeded stream.
 *   dressing room     morale recovery between fixtures: a player under 70
 *                     climbs 0.08 a week per level above 1, never past 70.
 *   stadium           food and drink money per head, 1.0 at level 1 up to
 *                     1.18 at 10 (clubManagerFinances reads it), and the
 *                     first three levels bought at a club also grow the
 *                     crowd the way Round 171's expansions did, because that
 *                     is the promise the old ground card made.
 *
 * Nothing here touches match strength. myMatchStrength does not read this
 * module, and scripts/simClubManagerFacilities.mjs reads the engine source
 * to hold it to that.
 *
 * Costs are a step table times a facility factor (bricks cost more than a
 * physio) times the era's money (historic eras run at 0.75, the same factor
 * the gate uses). From 1 to 10 a training ground costs 245m and a stadium
 * 370m, which a floor budget club cannot reach in a season, on purpose.
 */
import type { CareerState, ClubDef } from '@/lib/clubManager';
import { clubDefFor, eraClubDefFor, ensureFinance, isHistoricEra, money } from '@/lib/clubManager';

export type FacilityId = 'stadium' | 'trainingGround' | 'medical' | 'dressingRoom';

export const FACILITY_IDS: FacilityId[] = ['stadium', 'trainingGround', 'medical', 'dressingRoom'];
export const FACILITY_MAX = 10;
export const FACILITIES_VERSION = 1;

export interface ClubFacilities {
  /** Shape version of this block, FACILITIES_VERSION. */
  v: number;
  stadium: number;
  trainingGround: number;
  medical: number;
  dressingRoom: number;
  /** Millions spent on upgrades this season, for the finances screen. Reset each summer. */
  seasonSpend: number;
}

export const CLUB_FACILITY_INFO: Record<FacilityId, { label: string; emoji: string; blurb: string; costFactor: number }> = {
  stadium: {
    label: 'Stadium',
    emoji: '\u{1F3DF}️',
    blurb: 'More kiosks, better seats, more money a head on matchday. The first three levels you buy here also grow the crowd.',
    costFactor: 1.5,
  },
  trainingGround: {
    label: 'Training ground',
    emoji: '\u{1F3C3}',
    blurb: 'Everyone with room to grow grows a little faster. Nobody grows past his ceiling.',
    costFactor: 1.0,
  },
  medical: {
    label: 'Medical',
    emoji: '\u{1FA7A}',
    blurb: 'Injuries are written for fewer weeks. A knock is still a knock.',
    costFactor: 0.8,
  },
  dressingRoom: {
    label: 'Dressing room',
    emoji: '\u{1F6BF}',
    blurb: 'Unhappy players come round quicker between games. Nobody is talked above content.',
    costFactor: 0.6,
  },
};

/** Cost to go from level L to L plus 1, in millions, before the factors. Index L minus 1. */
const COST_STEP = [4, 6, 9, 13, 19, 27, 38, 54, 75];
const ERA_MONEY = 0.75;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;
const lvl = (n: number): number => clamp(Math.round(n), 1, FACILITY_MAX);

function careerDef(state: Pick<CareerState, 'clubName' | 'eraId'>): ClubDef {
  return state.eraId && isHistoricEra(state.eraId)
    ? eraClubDefFor(state.clubName, state.eraId)
    : clubDefFor(state.clubName);
}

function eraMoney(state: Pick<CareerState, 'eraId'>): number {
  return state.eraId && isHistoricEra(state.eraId) ? ERA_MONEY : 1;
}

/**
 * Day one levels from stature alone: the tier sets the base (8, 6, 4, 2),
 * the market value nudges it by one either way, the stadium sits one above
 * the base and the dressing room one below. Deterministic, so the harness
 * can say what a club opens on.
 */
export function facilityStartLevels(def: Pick<ClubDef, 'tier' | 'budget'>): Record<FacilityId, number> {
  const tierBase = [8, 6, 4, 2][def.tier - 1] ?? 2;
  const stature = clamp((def.budget - 8) / 192, 0, 1);
  const valueAdj = Math.round(stature * 2) - 1;
  const base = tierBase + valueAdj;
  return {
    stadium: lvl(base + 1),
    trainingGround: lvl(base),
    medical: lvl(base),
    dressingRoom: lvl(base - 1),
  };
}

function defaultFacilities(state: CareerState): ClubFacilities {
  const start = facilityStartLevels(careerDef(state));
  /* A save that bought ground expansions before this desk existed keeps
     them as stadium levels: the ground it built is the ground it has. */
  const bought = state.finance?.groundUpgrades;
  const carried = Number.isInteger(bought) ? clamp(bought as number, 0, 3) : 0;
  return {
    v: FACILITIES_VERSION,
    stadium: lvl(start.stadium + carried),
    trainingGround: start.trainingGround,
    medical: start.medical,
    dressingRoom: start.dressingRoom,
    seasonSpend: 0,
  };
}

function isLevel(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= FACILITY_MAX;
}

/** True when the block on the save is exactly the shape this round writes. */
export function isValidFacilities(f: unknown): f is ClubFacilities {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return false;
  const o = f as Record<string, unknown>;
  return o.v === FACILITIES_VERSION
    && FACILITY_IDS.every(id => isLevel(o[id]))
    && typeof o.seasonSpend === 'number' && Number.isFinite(o.seasonSpend) && o.seasonSpend >= 0;
}

/** The facilities block, repaired in place when missing or mangled. Fails closed on shape. */
export function ensureFacilities(state: CareerState): ClubFacilities {
  if (!isValidFacilities(state.facilities)) state.facilities = defaultFacilities(state);
  return state.facilities as ClubFacilities;
}

/** The facilities block for reading, never writing: a save from before this round reads its day one levels. */
export function facilitiesOf(state: CareerState): ClubFacilities {
  return isValidFacilities(state.facilities) ? state.facilities : defaultFacilities(state);
}

export function facilityLevel(state: CareerState, id: FacilityId): number {
  return facilitiesOf(state)[id];
}

/** What the next level costs, in millions, or null at the cap. */
export function facilityUpgradeCost(state: CareerState, id: FacilityId): number | null {
  const level = facilityLevel(state, id);
  if (level >= FACILITY_MAX) return null;
  const step = COST_STEP[level - 1];
  return Math.max(1, Math.round(step * CLUB_FACILITY_INFO[id].costFactor * eraMoney(state)));
}

/** Every level's price in one list, for the harness and the screen. */
export function facilityCostLadder(id: FacilityId, eraHist: boolean): number[] {
  return COST_STEP.map(step => Math.max(1, Math.round(step * CLUB_FACILITY_INFO[id].costFactor * (eraHist ? ERA_MONEY : 1))));
}

/**
 * Buy the next level. Refuses when the kitty cannot cover it or the
 * facility is at 10. Never mutates the state it was handed.
 */
export function upgradeFacility(career: CareerState, id: FacilityId): CareerState | null {
  const cost = facilityUpgradeCost(career, id);
  if (cost === null || career.budget < cost) return null;
  const state: CareerState = { ...career };
  const f: ClubFacilities = { ...facilitiesOf(career) };
  f[id] = f[id] + 1;
  f.seasonSpend = round1(f.seasonSpend + cost);
  state.facilities = f;
  state.budget = round1(state.budget - cost);
  if (id === 'stadium') {
    /* The old ground card's promise, kept: the first three levels bought at
       this club grow the crowd about 12 percent each, from the next home
       game, and the board reads ambition into bricks. */
    const fin = ensureFinance(state);
    state.finance = { ...fin, groundUpgrades: Math.min(3, (fin.groundUpgrades ?? 0) + 1) };
    state.boardConfidence = clamp(state.boardConfidence + 2, 0, 100);
  }
  const info = CLUB_FACILITY_INFO[id];
  state.aiHeadlines = [
    `${info.emoji} ${state.clubName} have signed off ${money(cost)} on the ${info.label.toLowerCase()}: level ${f[id]} of ${FACILITY_MAX}.`,
    ...state.aiHeadlines,
  ].slice(0, 8);
  return state;
}

/* ---------- the effects, each exactly nothing at level 1 ---------- */

/** Growth factor from the training ground: 1 at level 1, 1.117 at 10. */
export function trainingGroundGrowthMult(state: CareerState): number {
  return 1 + 0.013 * (facilityLevel(state, 'trainingGround') - 1);
}

/** The spell an injury is written for once the medical staff have seen it. Floor one week. */
export function injurySpell(state: CareerState, weeks: number): number {
  const mult = 1 - 0.04 * (facilityLevel(state, 'medical') - 1);
  return Math.max(1, Math.round(weeks * mult));
}

/** Morale a player under DRESSING_ROOM_REST climbs each week: 0 at level 1, 0.72 at 10. */
export const DRESSING_ROOM_REST = 70;
export function dressingRoomLift(state: CareerState): number {
  return round1(0.08 * (facilityLevel(state, 'dressingRoom') - 1));
}

/** Food and drink money per head, lifted by the stadium: 1 at level 1, 1.18 at 10. */
export function stadiumConcessionMult(level: number): number {
  return 1 + 0.02 * (clamp(level, 1, FACILITY_MAX) - 1);
}

/**
 * The week's recovery in the dressing room. Called from tickWeek on the
 * engine's private copy, so it may write into the squad it is handed.
 */
export function tickFacilities(state: CareerState): void {
  const lift = dressingRoomLift(state);
  if (lift <= 0) return;
  state.squad = state.squad.map(p => (
    p.morale < DRESSING_ROOM_REST
      ? { ...p, morale: Math.min(DRESSING_ROOM_REST, round1(p.morale + lift)) }
      : p
  ));
}

/** One line per facility for the screen, saying what the level does today. */
export function facilityEffectLine(state: CareerState, id: FacilityId): string {
  const level = facilityLevel(state, id);
  if (id === 'trainingGround') {
    const pct = Math.round((trainingGroundGrowthMult(state) - 1) * 1000) / 10;
    return level <= 1 ? 'No lift on growth yet.' : `Growth ${pct}% faster for anyone with room to grow.`;
  }
  if (id === 'medical') {
    const pct = Math.round(4 * (level - 1));
    return level <= 1 ? 'Injuries run their full course.' : `Injury spells written ${pct}% shorter, never under a week.`;
  }
  if (id === 'dressingRoom') {
    const lift = dressingRoomLift(state);
    return lift <= 0 ? 'Unhappy players stay unhappy until results change.' : `Unhappy players climb ${lift} morale a week, up to ${DRESSING_ROOM_REST}.`;
  }
  const pct = Math.round((stadiumConcessionMult(level) - 1) * 100);
  const bought = state.finance?.groundUpgrades ?? 0;
  const crowd = bought > 0 ? ` Crowds grown ${bought} of 3 times.` : '';
  return (pct <= 0 ? 'Standard kiosks.' : `Food and drink money ${pct}% up a head.`) + crowd;
}

/**
 * The summer. Facilities belong to the club, exactly like the ground and the
 * sponsor: stay and they carry with the season's spend reset, move and the
 * new club hands you its own on the next read.
 */
export function rolloverFacilities(state: CareerState, career: CareerState, moving: boolean): void {
  state.facilities = moving || !isValidFacilities(career.facilities)
    ? undefined
    : { ...career.facilities, seasonSpend: 0 };
}
