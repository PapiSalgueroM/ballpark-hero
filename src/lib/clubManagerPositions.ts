import type { FormationSlot } from '@/lib/squadShape';

export interface CustomShapePoint { x: number; y: number }
export interface CustomShape {
  v: 1;
  formationIndex: number;
  points: readonly CustomShapePoint[];
}
export interface CustomShapeProfile {
  advance: number;
  width: number;
  crowding: number;
  keeperExposure: number;
  atk: number;
  conceded: number;
}

function exactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
function point(value: unknown): value is CustomShapePoint {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !exactKeys(value, ['x', 'y'])) return false;
  const p = value as CustomShapePoint;
  return Number.isFinite(p.x) && Number.isFinite(p.y)
    && p.x >= 6 && p.x <= 94 && p.y >= 6 && p.y <= 94;
}
function points(value: unknown): value is readonly CustomShapePoint[] {
  if (!Array.isArray(value) || value.length !== 11 || Object.keys(value).length !== 11) return false;
  for (let i = 0; i < 11; i++) {
    if (!Object.prototype.hasOwnProperty.call(value, i) || !point(value[i])) return false;
  }
  return true;
}

/** Unsupported data stays untouched and inactive. A valid body keeps its identity. */
export function readCustomShape(
  raw: unknown, formationIndex: number, slots: readonly FormationSlot[],
): CustomShape | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || !exactKeys(raw, ['v', 'formationIndex', 'points']) || slots.length !== 11) return null;
  const shape = raw as CustomShape;
  return shape.v === 1 && Number.isSafeInteger(shape.formationIndex)
    && shape.formationIndex >= 0 && shape.formationIndex === formationIndex && points(shape.points)
    ? shape : null;
}

function crowding(all: readonly CustomShapePoint[], indices: readonly number[]): number {
  let close = 0;
  let pairs = 0;
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      const p = all[indices[a]], q = all[indices[b]];
      close += Math.max(0, 1 - Math.hypot(p.x - q.x, p.y - q.y) / 12);
      pairs++;
    }
  }
  return pairs ? close / pairs : 0;
}

/** Original game policy, compared with the same preset, mentality and actual on-pitch slots. */
export function customShapeProfile(
  slots: readonly FormationSlot[], actualXi: readonly { slot: FormationSlot | null }[],
  preset: readonly CustomShapePoint[], custom: readonly CustomShapePoint[],
): CustomShapeProfile | null {
  if (slots.length !== 11 || !points(preset) || !points(custom)) return null;
  const active = actualXi.map(row => row.slot ? slots.indexOf(row.slot) : -1);
  if (active.some(index => index < 0) || new Set(active).size !== active.length) return null;
  const outfield = active.filter(index => !slots[index].allowed.includes('GK'));
  const keepers = active.filter(index => slots[index].allowed.includes('GK'));
  const mean = (value: (index: number) => number) => outfield.length
    ? outfield.reduce((total, index) => total + value(index), 0) / outfield.length : 0;
  const advance = mean(index => preset[index].y - custom[index].y) / 88;
  const width = mean(index => Math.abs(custom[index].x - 50) - Math.abs(preset[index].x - 50)) / 44;
  const crowded = crowding(custom, outfield) - crowding(preset, outfield);
  const keeperExposure = keepers.length ? keepers.reduce((total, index) => total + Math.max(0,
    Math.hypot(custom[index].x - 50, custom[index].y - 94)
      - Math.hypot(preset[index].x - 50, preset[index].y - 94)), 0)
    / keepers.length / Math.hypot(44, 88) : 0;
  return {
    advance, width, crowding: crowded, keeperExposure,
    atk: 0.20 * advance + 0.10 * width - 0.10 * crowded,
    conceded: 0.25 * advance + 0.10 * width + 0.10 * crowded + 0.20 * keeperExposure,
  };
}
