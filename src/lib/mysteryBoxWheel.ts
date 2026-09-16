import type { PackTier } from '@/lib/fetchPackPool';

/**
 * Mystery Box pack wheel. Presentation only: the daily pack sequence in
 * useMysteryBox is the source of truth. The wheel lands on that pack's tier
 * and never rolls a second outcome.
 *
 * Angles are degrees clockwise from 12 o'clock (the fixed pointer).
 */

export const WHEEL_TIERS: PackTier[] = ['superstar', 'star', 'quality', 'squad', 'fringe'];
export const SECTOR_SPAN = 360 / WHEEL_TIERS.length;
export const SPIN_DURATION_MS = 3400;
export const CARD_REVEAL_MS = 720;

export interface WheelSector {
  tier: PackTier;
  index: number;
  startDeg: number;
  endDeg: number;
}

export const TIER_WHEEL: Record<PackTier, { label: string; fill: string; text: string }> = {
  superstar: { label: 'SUPER', fill: '#7e22ce', text: '#f5d0fe' },
  star: { label: 'STAR', fill: '#ca8a04', text: '#422006' },
  quality: { label: 'QUAL', fill: '#059669', text: '#ecfdf5' },
  squad: { label: 'SQUAD', fill: '#64748b', text: '#f8fafc' },
  fringe: { label: 'FRINGE', fill: '#78716c', text: '#fafaf9' },
};

export function wheelSectors(): WheelSector[] {
  return WHEEL_TIERS.map((tier, index) => ({
    tier,
    index,
    startDeg: index * SECTOR_SPAN,
    endDeg: (index + 1) * SECTOR_SPAN,
  }));
}

/** Wheel-local angle sitting under the 12 o'clock pointer. */
export function pointerLocalDeg(rotationDeg: number): number {
  const r = ((rotationDeg % 360) + 360) % 360;
  return (360 - r) % 360;
}

export function tierUnderPointer(rotationDeg: number): PackTier {
  const a = pointerLocalDeg(rotationDeg);
  const sectors = wheelSectors();
  for (const s of sectors) {
    if (a >= s.startDeg && a < s.endDeg) return s.tier;
  }
  return sectors[sectors.length - 1].tier;
}

/**
 * Cubic ease-out: fast first turn, long deceleration tail.
 * Same family as SlotReel, not a linear CSS spin.
 */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** 5 to 7 full turns, derived from the pack index so a replay of the same pack matches. */
export function extraTurnsForPack(packIndex: number): number {
  return 5 + (((packIndex % 3) + 3) % 3);
}

/** Deterministic [0,1) jitter so the pointer does not always kiss the sector centre. */
export function jitterForPack(packIndex: number): number {
  const x = Math.sin((packIndex + 1) * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Absolute clockwise rotation that puts `tier` under the pointer after
 * `extraTurns` full rotations. `jitter01` stays inside the sector, clear of
 * the edges so a tick cannot flicker on the boundary.
 */
export function landingRotationDeg(tier: PackTier, extraTurns: number, jitter01: number): number {
  const sectors = wheelSectors();
  const s = sectors.find(x => x.tier === tier) ?? sectors[sectors.length - 1];
  const edge = 0.14;
  const u = Math.min(1, Math.max(0, jitter01));
  const t = edge + u * (1 - 2 * edge);
  const local = s.startDeg + t * SECTOR_SPAN;
  const settle = (360 - local) % 360;
  return extraTurns * 360 + settle;
}

export function spinTargetForPack(tier: PackTier, packIndex: number): number {
  return landingRotationDeg(tier, extraTurnsForPack(packIndex), jitterForPack(packIndex));
}
