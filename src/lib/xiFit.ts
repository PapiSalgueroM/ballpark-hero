import type { Position } from '@/types/game';
import type { FilledSlot, PositionSlot } from '@/types/lineupBuilder';
import { ALL_POSITIONS, FIT_PENALTY, gradeFit, SLOT_ALLOWED_BY_ROLE, type FitGrade } from '@/lib/positionFit';
import { CHEMISTRY_WEIGHTS, computeChemistry, type ChemistryPlayer } from '@/lib/chemistry';
import { canonicalClubName } from '@/data/lineupTeams';

/**
 * Round 825: HOW an eleven is put together, as three numbers the season sim
 * reads on top of the squad rating (master spec section 76: tactical fit,
 * chemistry and role compatibility in Build Your XI's simulation).
 *
 * Nothing here is new data. Every input is the row the player picked from
 * the dropdown (his recorded position, club and nationality), the verified
 * position history where the game looked it up, and the slot he was put in.
 * Nothing here is a new rule either, where an old one exists:
 *
 *   ROLE FIT is Club Manager's Round 505 table (FIT_PENALTY and gradeFit,
 *   both in positionFit.ts): nothing for a slot his positions cover, 2 for
 *   next door, 6 for another line, 14 for a keeper swap, on that man, and
 *   averaged over the eleven exactly the way Club Manager's xiFitReport
 *   averages it.
 *
 *   CHEMISTRY is the shared engine (computeChemistry) and its weights, told
 *   to count neighbours on the pitch only. A club link is 3 chemistry points
 *   and a country link 1; CHEMISTRY_SCALE turns that into squad rating points
 *   (+0.6 and +0.2) and CHEMISTRY_CAP keeps the side's total bounded.
 *
 *   BALANCE is the one new idea and it is small: a side with no defensive
 *   midfielder in a CM or CDM slot pays HOLDING_PRICE, and a wide slot held by
 *   somebody who is not a wide player (a centre back covering at full back)
 *   pays WIDTH_PRICE for that flank.
 *
 * Missing data never costs anything: a man whose row had no position is read
 * as fitting his slot and is not held against the balance, and a man with no
 * club or nationality simply makes no link.
 */

export interface XiMan {
  name: string;
  /** His recorded primary position, null when his row had none. */
  position: Position | null;
  /** Verified extra positions (player_verified_positions), when the game looked them up. */
  played?: Position[];
  club?: string;
  nationality?: string;
}

export interface XiFitSlot {
  role: Position;
  /** What the slot accepts, the game's own set. */
  allowed: Position[];
  man: XiMan | null;
}

export type XiLinkType = 'club' | 'nationality';

export interface XiLink {
  /** Slot indexes. */
  a: number;
  b: number;
  type: XiLinkType;
  /** The club, or the country, the two share. */
  value: string;
  /** Squad rating points this link adds before the cap. */
  worth: number;
}

export interface XiFitBreakdown {
  roleFit: {
    /** One grade per slot, null for an empty one. */
    grades: (FitGrade | null)[];
    /** FIT_PENALTY on each man, null for an empty slot. */
    perMan: (number | null)[];
    /** Squad rating points, zero or less. */
    value: number;
  };
  chemistry: {
    links: XiLink[];
    /** What the links add up to before the cap. */
    raw: number;
    /** Squad rating points, zero to CHEMISTRY_CAP. */
    value: number;
  };
  balance: {
    /** True with a defensive midfielder in the middle, false without one,
     *  null while it cannot be told yet (a CM or CDM slot is still open, or a
     *  man there has no recorded position). */
    holding: boolean | null;
    /** The slot of the man who holds, when one does. */
    holder: number | null;
    /** Each flank that lost its width, with the slot that lost it. */
    narrow: { side: 'left' | 'right'; slot: number }[];
    /** Squad rating points, zero or less. */
    value: number;
  };
  /** The three added up, squad rating points. */
  total: number;
  /** How many slots have a man in them. */
  filled: number;
}

/** What the season sim takes: the three values, squad rating points. */
export interface XiFitAdjust {
  roleFit: number;
  chemistry: number;
  balance: number;
}

/** Squad rating points per chemistry point: a club link is +0.6, a country link +0.2. */
export const CHEMISTRY_SCALE = 0.2;
/** The most chemistry can add to the side. */
export const CHEMISTRY_CAP = 2;
/** No defensive midfielder in a CM or CDM slot. */
export const HOLDING_PRICE = 1;
/** A wide slot held by somebody who is not a wide player, once a flank. */
export const WIDTH_PRICE = 0.5;
/** How far across (percent of the pitch width) a man in the next line can be and still be a neighbour. */
export const NEIGHBOUR_REACH = 25;

const round1 = (n: number): number => (Math.round(n * 10) / 10) || 0;

/* ---------------- The pitch ---------------- */

/* The lines the Build Your XI pitch draws, keeper at the bottom. */
const PITCH_LINE: Record<string, number> = {
  GK: 0,
  LWB: 1, LB: 1, CB: 1, RB: 1, RWB: 1,
  CDM: 2, LM: 2, CM: 2, RM: 2,
  CAM: 3, LW: 3, RW: 3,
  CF: 4, ST: 4,
};

/** Left side roles first, then the middle, then the right, so a line draws the way it plays. */
function sideRank(role: string): number {
  return role[0] === 'L' ? 0 : role[0] === 'R' ? 2 : 1;
}

export interface PitchSpot {
  /** Percent across, left to right. */
  x: number;
  /** Percent down, top to bottom (the keeper is near the bottom). */
  y: number;
  /** Which drawn line, 0 for the keeper's. */
  row: number;
  /** Place in the line, left to right. */
  col: number;
}

/**
 * Where each slot sits on the pitch. FormationPitch draws from this and the
 * chemistry reads it, so a link can only ever join two men the player can see
 * standing next to each other. Inside a line the left sided roles come first:
 * before Round 825 a 3-5-2 drew its left wing back on the right, because the
 * line went in the order the formation happens to list its slots.
 */
export function pitchCoords(roles: string[]): PitchSpot[] {
  const lines = [...new Set(roles.map(r => PITCH_LINE[r] ?? 2))].sort((a, b) => a - b);
  const out: PitchSpot[] = new Array(roles.length);
  const padding = 8; // % top and bottom so the edge spots are not clipped
  lines.forEach((line, row) => {
    const idx = roles
      .map((_, i) => i)
      .filter(i => (PITCH_LINE[roles[i]] ?? 2) === line)
      .sort((a, b) => sideRank(roles[a]) - sideRank(roles[b]) || a - b);
    const y = lines.length > 1 ? padding + (1 - row / (lines.length - 1)) * (100 - 2 * padding) : 50;
    idx.forEach((i, col) => {
      out[i] = { x: (100 / (idx.length + 1)) * (col + 1), y, row, col };
    });
  });
  return out;
}

/**
 * Pairs of slots that stand next to each other: side by side in a line, or
 * in the next line up or down and no more than NEIGHBOUR_REACH across.
 */
export function pitchNeighbours(roles: string[]): [number, number][] {
  const spots = pitchCoords(roles);
  const out: [number, number][] = [];
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const a = spots[i];
      const b = spots[j];
      const sameLine = a.row === b.row && Math.abs(a.col - b.col) === 1;
      const nextLine = Math.abs(a.row - b.row) === 1 && Math.abs(a.x - b.x) <= NEIGHBOUR_REACH + 1e-9;
      if (sameLine || nextLine) out.push([i, j]);
    }
  }
  return out;
}

/**
 * The slots Build Your XI hands the breakdown, off the dropdown row each pick
 * came from. One function so the page and simBuildYourXiFit build them the
 * same way. The club goes in under one spelling per club (canonicalClubName),
 * so a club the table stores under two names links as the one club it is.
 */
export function lineupFitSlots(positions: PositionSlot[], filled: ReadonlyMap<number, FilledSlot>): XiFitSlot[] {
  return positions.map((pos, i) => {
    const s = filled.get(i);
    return {
      role: pos.role,
      allowed: SLOT_ALLOWED_BY_ROLE[pos.role],
      man: s
        ? {
            name: s.playerName,
            position: s.pick?.position ?? null,
            played: s.pick?.played,
            club: canonicalClubName(s.pick?.club),
            nationality: s.pick?.nationality,
          }
        : null,
    };
  });
}

/* ---------------- The breakdown ---------------- */

const WIDE_ROLES = new Set<Position>(['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LW', 'RW']);
const HOLDING_SLOTS = new Set<Position>(['CDM', 'CM']);

/** Every position he can call his own, primary first; null when his row had none. */
function heldOf(man: XiMan): Position[] | null {
  if (!man.position) return null;
  const extra = (man.played ?? []).filter(p => ALL_POSITIONS.includes(p));
  return [man.position, ...extra];
}

/** First nationality only, the way World XI reads "France / Algeria". */
function primaryNation(n: string | undefined): string {
  return (n ?? '').split('/')[0].trim();
}

export function xiFitBreakdown(slots: XiFitSlot[]): XiFitBreakdown {
  const n = slots.length || 1;

  /* Role fit, Club Manager's way: the penalty on each man, averaged over the eleven. */
  const grades: (FitGrade | null)[] = slots.map(s => {
    if (!s.man) return null;
    const held = heldOf(s.man);
    return held ? gradeFit(held, s.allowed) : 'natural';
  });
  const perMan = grades.map(g => (g ? FIT_PENALTY[g] : null));
  const penaltySum = perMan.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  const roleFitValue = round1(-penaltySum / n);

  /* Chemistry, the shared engine, neighbours only. Each player goes in under
     his slot index so the links come back as slots. */
  const near = new Set(pitchNeighbours(slots.map(s => s.role)).map(([i, j]) => `${i}-${j}`));
  const pairKey = (a: ChemistryPlayer, b: ChemistryPlayer) => {
    const i = Number(a.name);
    const j = Number(b.name);
    return `${Math.min(i, j)}-${Math.max(i, j)}`;
  };
  const chemPlayers: ChemistryPlayer[] = [];
  slots.forEach((s, i) => {
    if (s.man) chemPlayers.push({ name: String(i), club: s.man.club, nationality: primaryNation(s.man.nationality) });
  });
  const chem = computeChemistry(chemPlayers, { linked: (a, b) => near.has(pairKey(a, b)) });
  const links: XiLink[] = [];
  for (const l of chem.links) {
    if (l.type !== 'club' && l.type !== 'nationality') continue;
    const a = Number(l.a);
    const b = Number(l.b);
    const man = slots[a].man;
    if (!man) continue;
    links.push({
      a,
      b,
      type: l.type,
      value: l.type === 'club' ? (man.club ?? '').trim() : primaryNation(man.nationality),
      worth: round1(CHEMISTRY_WEIGHTS[l.type] * CHEMISTRY_SCALE),
    });
  }
  const raw = round1(links.reduce((sum, l) => sum + CHEMISTRY_WEIGHTS[l.type] * CHEMISTRY_SCALE, 0));
  const chemistryValue = Math.min(CHEMISTRY_CAP, raw);

  /* Balance. A holding midfielder is a man with CDM among his positions in a
     CM or CDM slot. */
  let holder: number | null = null;
  let undecided = false;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!HOLDING_SLOTS.has(s.role)) continue;
    const held = s.man ? heldOf(s.man) : null;
    if (!held) { undecided = true; continue; }
    if (holder === null && held.includes('CDM')) holder = i;
  }
  const holding = holder !== null ? true : undecided ? null : false;
  const narrow: { side: 'left' | 'right'; slot: number }[] = [];
  for (const side of ['left', 'right'] as const) {
    const letter = side === 'left' ? 'L' : 'R';
    const slot = slots.findIndex(s => {
      if (!WIDE_ROLES.has(s.role) || s.role[0] !== letter || !s.man) return false;
      const held = heldOf(s.man);
      return held !== null && !held.some(p => WIDE_ROLES.has(p));
    });
    if (slot >= 0) narrow.push({ side, slot });
  }
  const balanceValue = round1(-(holding === false ? HOLDING_PRICE : 0) - WIDTH_PRICE * narrow.length);

  return {
    roleFit: { grades, perMan, value: roleFitValue },
    chemistry: { links, raw, value: chemistryValue },
    balance: { holding, holder, narrow, value: balanceValue },
    total: round1(roleFitValue + chemistryValue + balanceValue),
    filled: slots.filter(s => s.man).length,
  };
}

/** The three values the season sim reads. */
export function seasonAdjust(b: XiFitBreakdown): XiFitAdjust {
  return { roleFit: b.roleFit.value, chemistry: b.chemistry.value, balance: b.balance.value };
}
