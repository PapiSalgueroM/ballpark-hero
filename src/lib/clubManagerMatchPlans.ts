import {
  DEFAULT_ERA_ID, FORMATIONS, MENTALITIES, SET_PIECE_KEYS, SHOOTOUT_MAX_ORDER,
  effectiveXIWithSlots, matchStrengthNow, slotDuty, dutyOptions, shootoutOrderOf,
} from '@/lib/clubManager';
import type { CareerState, Duty, Mentality, SetPieces } from '@/lib/clubManager';
import { BALANCED, INSTRUCTION_KEYS, isBalanced, readInstructions, type TeamInstructions } from '@/lib/clubManagerTacticsCore';
import { readCustomShape, type CustomShape } from '@/lib/clubManagerPositions';

export const MATCH_PLAN_LIMIT = 3;
export const MATCH_PLAN_NAME_LIMIT = 24;

interface MatchPlanAssignments {
  slot: number;
  name: string;
  clubName: string;
  eraId: string;
  formationIndex: number;
  mentality: Mentality;
  xiIds: (string | null)[];
  xiDuties: (Duty | null)[];
  setPieces: SetPieces;
  shootoutOrder: string[];
}

export interface SavedMatchPlanV1 extends MatchPlanAssignments { version: 1 }
export interface SavedMatchPlanV2 extends MatchPlanAssignments {
  version: 2;
  instructions: TeamInstructions;
  customShape: CustomShape | null;
}
export type SavedMatchPlan = SavedMatchPlanV1 | SavedMatchPlanV2;

const validSlot = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < MATCH_PLAN_LIMIT;
const playerId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200;
const optionalId = (id: unknown): id is string | null => id === null || playerId(id);

function exactInstructions(raw: unknown): TeamInstructions | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 4
    || !INSTRUCTION_KEYS.every(key => Object.prototype.hasOwnProperty.call(raw, key))) return null;
  return readInstructions(raw);
}

function currentTactics(career: CareerState) {
  const formation = FORMATIONS[career.formationIndex];
  if (!Number.isInteger(career.formationIndex) || !formation || !MENTALITIES.some(m => m.id === career.mentality)) return null;
  const instructions = career.instructions === undefined ? { ...BALANCED } : exactInstructions(career.instructions);
  if (!instructions) return null;
  const customShape = career.customShape === undefined ? null : readCustomShape(career.customShape, career.formationIndex, formation.slots);
  if (career.customShape !== undefined && !customShape) return null;
  return { instructions, customShape };
}

/** Structural support is separate from the club and era where a plan can be applied. */
function readPlan(value: unknown): SavedMatchPlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as SavedMatchPlan;
  if ((p.version !== 1 && p.version !== 2) || !validSlot(p.slot)) return null;
  if (typeof p.clubName !== 'string' || !p.clubName || typeof p.eraId !== 'string' || !p.eraId) return null;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > MATCH_PLAN_NAME_LIMIT || /[\r\n]/.test(p.name)) return null;
  if (!Number.isInteger(p.formationIndex) || !FORMATIONS[p.formationIndex] || !MENTALITIES.some(m => m.id === p.mentality)) return null;
  const slots = FORMATIONS[p.formationIndex].slots;
  if (!Array.isArray(p.xiIds) || p.xiIds.length !== slots.length || !p.xiIds.every(optionalId)) return null;
  if (!Array.isArray(p.xiDuties) || p.xiDuties.length !== slots.length || !p.xiDuties.every((d, i) => d === null || dutyOptions(slots[i]).includes(d))) return null;
  if (!p.setPieces || typeof p.setPieces !== 'object' || !SET_PIECE_KEYS.every(k => optionalId(p.setPieces[k]))) return null;
  if (!Array.isArray(p.shootoutOrder) || p.shootoutOrder.length > SHOOTOUT_MAX_ORDER || !p.shootoutOrder.every(playerId) || new Set(p.shootoutOrder).size !== p.shootoutOrder.length) return null;
  if (p.version === 2) {
    if (!Object.prototype.hasOwnProperty.call(p, 'instructions') || !Object.prototype.hasOwnProperty.call(p, 'customShape')
      || !exactInstructions(p.instructions)) return null;
    if (p.customShape !== null && !readCustomShape(p.customShape, p.formationIndex, slots)) return null;
  }
  return p;
}

/** Old saves have no plans. Unsupported raw entries remain stored and inactive. */
export function matchPlansOf(career: CareerState): SavedMatchPlan[] {
  if (!Array.isArray(career.matchPlans)) return [];
  const found: SavedMatchPlan[] = [];
  for (const value of career.matchPlans.slice(0, MATCH_PLAN_LIMIT)) {
    const p = readPlan(value);
    if (!p || found.some(x => x.slot === p.slot)) continue;
    if (p.clubName !== career.clubName || p.eraId !== (career.eraId ?? DEFAULT_ERA_ID)) continue;
    found.push(p);
  }
  return found.sort((a, b) => a.slot - b.slot);
}

export function canEditMatchPlans(career: CareerState): boolean {
  if (career.live || career.sacked || career.wilderness || !currentTactics(career)) return false;
  const raw = career.matchPlans;
  if (raw === undefined) return true;
  if (!Array.isArray(raw) || raw.length > MATCH_PLAN_LIMIT || Object.keys(raw).length !== raw.length) return false;
  const slots = new Set<number>();
  for (const value of raw) {
    const plan = readPlan(value);
    if (!plan || slots.has(plan.slot)) return false;
    slots.add(plan.slot);
  }
  return true;
}

/** These are assignments, not copies of players. A departed taker returns to the existing automatic rule. */
function currentSetPieces(career: CareerState, source: SetPieces | undefined): SetPieces {
  return Object.fromEntries(SET_PIECE_KEYS.map(key => {
    const id = source?.[key] ?? null;
    const p = career.squad.find(player => player.id === id);
    return [key, p && !p.onLoan && (key === 'captain' || p.position !== 'GK') ? id : null];
  })) as unknown as SetPieces;
}

export function saveMatchPlan(career: CareerState, slot: number, name: string): CareerState {
  if (!canEditMatchPlans(career) || !validSlot(slot)) return career;
  const label = name.trim().replace(/[\r\n]+/g, ' ').slice(0, MATCH_PLAN_NAME_LIMIT);
  if (!label) return career;
  const formation = FORMATIONS[career.formationIndex];
  if (!formation) return career;
  const tactics = currentTactics(career);
  if (!tactics) return career;
  const { instructions, customShape } = tactics;
  const plan: SavedMatchPlanV2 = {
    version: 2, slot, name: label, clubName: career.clubName, eraId: career.eraId ?? DEFAULT_ERA_ID,
    formationIndex: career.formationIndex, mentality: career.mentality,
    instructions,
    customShape: customShape ? { v: 1, formationIndex: customShape.formationIndex, points: customShape.points.map(point => ({ x: point.x, y: point.y })) } : null,
    xiIds: formation.slots.map((_, i) => career.xiIds[i] ?? null),
    xiDuties: formation.slots.map((_, i) => slotDuty(career, formation, i)),
    setPieces: currentSetPieces(career, career.setPieces),
    shootoutOrder: [...new Set(shootoutOrderOf(career) ?? [])].slice(0, SHOOTOUT_MAX_ORDER),
  };
  return { ...career, matchPlans: [...matchPlansOf(career).filter(p => p.slot !== slot), plan].sort((a, b) => a.slot - b.slot) };
}

function withPlan(career: CareerState, plan: SavedMatchPlan): CareerState {
  const next: CareerState = {
    ...career, formationIndex: plan.formationIndex, mentality: plan.mentality,
    xiIds: [...plan.xiIds], xiDuties: [...plan.xiDuties],
    setPieces: currentSetPieces(career, plan.setPieces),
    shootoutOrder: plan.shootoutOrder.filter(id => career.squad.some(p => p.id === id)),
  };
  if (plan.version === 2) {
    if (isBalanced(plan.instructions)) delete next.instructions;
    else next.instructions = { ...plan.instructions };
    if (plan.customShape === null) delete next.customShape;
    else next.customShape = { v: 1, formationIndex: plan.customShape.formationIndex, points: plan.customShape.points.map(point => ({ x: point.x, y: point.y })) };
  } else {
    delete next.customShape;
  }
  return next;
}

export function applyMatchPlan(career: CareerState, slot: number): CareerState {
  if (!canEditMatchPlans(career)) return career;
  const plan = matchPlansOf(career).find(p => p.slot === slot);
  return plan ? withPlan(career, plan) : career;
}

export function deleteMatchPlan(career: CareerState, slot: number): CareerState {
  if (!canEditMatchPlans(career) || !matchPlansOf(career).some(p => p.slot === slot)) return career;
  return { ...career, matchPlans: matchPlansOf(career).filter(p => p.slot !== slot) };
}

/** Uses the same slot objects and lineup resolver as kick off, including international rest replacements. */
export function previewMatchPlan(career: CareerState, slot: number) {
  const plan = matchPlansOf(career).find(p => p.slot === slot);
  if (!plan) return null;
  const state = withPlan(career, plan);
  const formation = FORMATIONS[plan.formationIndex];
  const actual = effectiveXIWithSlots(state);
  const rows = formation.slots.map((position, i) => {
    const pickedId = plan.xiIds[i];
    const picked = career.squad.find(p => p.id === pickedId) ?? null;
    const kickoff = actual.find(x => x.slot === position) ?? null;
    const reason = !pickedId ? 'Empty spot' : !picked ? 'Left the squad'
      : picked.injuryWeeks > 0 ? 'Injured' : picked.suspendedMatches > 0 ? 'Suspended'
        : kickoff?.p.id !== pickedId ? 'Already used in another spot' : null;
    return { slot: i, label: position.label, picked, pickedId, player: kickoff?.p ?? null, duty: kickoff?.duty ?? null, reason };
  });
  return {
    plan, state, rows,
    currentStrength: matchStrengthNow(career), strength: matchStrengthNow(state),
    fitness: actual.length ? actual.reduce((sum, x) => sum + x.p.fitness, 0) / actual.length : null,
    replacements: rows.filter(row => row.player?.id !== row.pickedId).length,
  };
}
