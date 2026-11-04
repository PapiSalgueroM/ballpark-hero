import { describe, expect, it, vi } from 'vitest';
import type { FormationSlot } from '@/lib/squadShape';

type Point = { x: number; y: number };

async function fixture() {
  const { FORMATIONS } = await import('@/lib/squadShape');
  const api = await import('@/lib/clubManagerPositions');
  const slots = FORMATIONS[0].slots;
  const preset = slots.map(slot => ({ x: slot.x, y: slot.y }));
  return { ...api, slots, preset };
}

function moved(points: readonly Point[]): Point[] {
  return points.map(point => ({ ...point }));
}

function project(
  f: Awaited<ReturnType<typeof fixture>>,
  custom: readonly Point[],
  active: readonly { slot: FormationSlot | null }[] = f.slots.map(slot => ({ slot })),
) {
  return f.customShapeProfile(f.slots, active, f.preset, custom);
}

function zero(profile: ReturnType<Awaited<ReturnType<typeof fixture>>['customShapeProfile']>) {
  expect(profile, 'CM_GEOMETRY_VALID_PROJECTION').not.toBeNull();
  expect(profile).toEqual({
    advance: 0, width: 0, crowding: 0, keeperExposure: 0, atk: 0, conceded: 0,
  });
}

describe('Custom position geometry is a pure provisional game policy', () => {
  it('reads a dense valid shape without repairing its body or canonical slots', async () => {
    const f = await fixture();
    const points = f.preset.map((point, index) => Object.freeze({
      x: index % 2 === 0 ? 6 : 94, y: index % 2 === 0 ? 94 : 6,
    }));
    const raw = Object.freeze({ v: 1, formationIndex: 0, points: Object.freeze(points) });
    const before = JSON.stringify(f.slots);
    expect(f.readCustomShape(raw, 0, f.slots), 'CM_GEOMETRY_VALID_BODY_IDENTITY').toBe(raw);
    expect(JSON.stringify(f.slots), 'CM_GEOMETRY_CANONICAL_BODY_HELD').toBe(before);
  });

  it.each([
    'absent', 'null', 'future-version', 'wrong-formation', 'fractional-formation', 'unsafe-formation',
    'ten-points', 'twelve-points', 'sparse', 'missing-x', 'string-x',
    'nan', 'infinity', 'left-outside', 'bottom-outside', 'extra-shape-field', 'extra-point-field',
  ] as const)('keeps %s raw data inactive instead of generating a replacement', async fault => {
    const f = await fixture();
    const points = moved(f.preset);
    let formationIndex = 0;
    let raw: Record<string, unknown> | null | undefined = { v: 1, formationIndex: 0, points };
    if (fault === 'absent') raw = undefined;
    else if (fault === 'null') raw = null;
    else if (fault === 'future-version') raw.v = 2;
    else if (fault === 'wrong-formation') raw.formationIndex = 1;
    else if (fault === 'fractional-formation') raw.formationIndex = 0.5;
    else if (fault === 'unsafe-formation') { raw.formationIndex = 9007199254740992; formationIndex = 9007199254740992; }
    else if (fault === 'ten-points') raw.points = points.slice(0, 10);
    else if (fault === 'twelve-points') raw.points = [...points, { x: 50, y: 50 }];
    else if (fault === 'sparse') raw.points = new Array<Point>(11);
    else if (fault === 'missing-x') raw.points = points.map((point, index) => index === 3 ? { y: point.y } : point);
    else if (fault === 'string-x') raw.points = points.map((point, index) => index === 3 ? { x: '50', y: point.y } : point);
    else if (fault === 'nan') points[3].x = NaN;
    else if (fault === 'infinity') points[3].y = Infinity;
    else if (fault === 'left-outside') points[3].x = 5.99;
    else if (fault === 'bottom-outside') points[3].y = 94.01;
    else if (fault === 'extra-shape-field') raw.note = 'retained inactive data';
    else if (fault === 'extra-point-field') raw.points = points.map((point, index) => index === 3 ? { ...point, note: 'retained inactive data' } : point);
    if (raw && Array.isArray(raw.points)) {
      raw.points.forEach(point => { if (point && typeof point === 'object') Object.freeze(point); });
      Object.freeze(raw.points);
    }
    if (raw) Object.freeze(raw);
    const before = JSON.stringify(raw);
    expect(f.readCustomShape(raw, formationIndex, f.slots), 'CM_GEOMETRY_INACTIVE_READER').toBeNull();
    expect(JSON.stringify(raw), 'CM_GEOMETRY_INACTIVE_RAW_HELD').toBe(before);
  });

  it('returns exact zero for canonical-equivalent points and draws no randomness', async () => {
    const f = await fixture();
    const before = JSON.stringify(f.slots);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('CM_GEOMETRY_NO_RANDOMNESS');
    });
    try {
      const raw = { v: 1, formationIndex: 0, points: moved(f.preset) };
      expect(f.readCustomShape(raw, 0, f.slots)).toBe(raw);
      zero(project(f, moved(f.preset)));
      expect(random, 'CM_GEOMETRY_READER_AND_PROFILE_NO_DRAWS').not.toHaveBeenCalled();
      expect(JSON.stringify(f.slots)).toBe(before);
    } finally {
      random.mockRestore();
    }
  });

  it('gives all-forward access and exposure, and all-deep fewer outlets with less exposure', async () => {
    const f = await fixture();
    const forward = project(f, f.preset.map(point => ({ x: point.x, y: 6 })));
    const deep = project(f, f.preset.map(point => ({ x: point.x, y: 94 })));
    expect(forward).not.toBeNull();
    expect(deep).not.toBeNull();
    expect(forward!.atk, 'CM_GEOMETRY_FORWARD_ACCESS').toBeGreaterThan(0);
    expect(forward!.conceded, 'CM_GEOMETRY_FORWARD_EXPOSURE').toBeGreaterThan(0);
    expect(deep!.atk, 'CM_GEOMETRY_DEEP_OUTLET_COST').toBeLessThan(0);
    expect(deep!.conceded, 'CM_GEOMETRY_DEEP_EXPOSURE_REDUCTION').toBeLessThan(0);
    expect(forward!.advance).toBeCloseTo(28 / 55, 12);
    expect(deep!.advance).toBeCloseTo(-27 / 55, 12);
    expect(forward!.crowding).toBeCloseTo(2 / 27, 12);
    expect(deep!.crowding).toBeCloseTo(2 / 27, 12);
  });

  it('matches the worked advance and width examples on the same two actual canonical outfield slots', async () => {
    const f = await fixture();
    const active = [0, 1, 4].map(index => ({ slot: f.slots[index] }));
    const up = moved(f.preset);
    up[1].y = 60;
    up[4].y = 60;
    const advanced = project(f, up, active);
    expect(advanced).not.toBeNull();
    expect(advanced!.atk, 'CM_GEOMETRY_TEN_POINT_ADVANCE_ATTACK').toBeCloseTo(1 / 44, 12);
    expect(advanced!.conceded, 'CM_GEOMETRY_TEN_POINT_ADVANCE_COST').toBeCloseTo(5 / 176, 12);
    const wide = moved(f.preset);
    wide[1].x = 94;
    wide[4].x = 6;
    const widened = project(f, wide, active);
    expect(widened).not.toBeNull();
    expect(widened!.atk, 'CM_GEOMETRY_WIDER_ACCESS').toBeCloseTo(1 / 44, 12);
    expect(widened!.conceded, 'CM_GEOMETRY_WIDER_EXPOSURE').toBeCloseTo(1 / 44, 12);
  });

  it('charges crowded players instead of treating an overlapping stack as a free narrow block', async () => {
    const f = await fixture();
    const custom = moved(f.preset);
    custom[1] = { x: 50, y: 70 };
    custom[4] = { x: 50, y: 70 };
    const result = project(f, custom, [0, 1, 4].map(index => ({ slot: f.slots[index] })));
    expect(result).not.toBeNull();
    expect(result!.crowding, 'CM_GEOMETRY_ACTUAL_CLOSE_PAIR').toBe(1);
    expect(result!.atk, 'CM_GEOMETRY_CROWDING_ATTACK_COST').toBeCloseTo(-39 / 220, 12);
    expect(result!.conceded, 'CM_GEOMETRY_CROWDING_EXPOSURE').toBeCloseTo(1 / 44, 12);
  });

  it('charges assigned-keeper vertical and lateral exposure without attacking credit or a backwards bonus', async () => {
    const f = await fixture();
    expect(f.slots[0].allowed).toContain('GK');
    const up = moved(f.preset);
    up[0] = { x: 50, y: 46 };
    const result = project(f, up);
    expect(result).not.toBeNull();
    expect(result!.advance).toBe(0);
    expect(result!.width).toBe(0);
    expect(result!.crowding).toBe(0);
    expect(result!.keeperExposure).toBeCloseTo(0.4472135954999579, 12);
    expect(result!.atk, 'CM_GEOMETRY_KEEPER_NOT_STRIKER').toBe(0);
    expect(result!.conceded, 'CM_GEOMETRY_KEEPER_VERTICAL_COST').toBeCloseTo(0.08944271909999159, 12);
    const sideways = moved(f.preset);
    sideways[0] = { x: 94, y: 90 };
    const lateral = project(f, sideways);
    expect(lateral).not.toBeNull();
    expect(lateral!.keeperExposure, 'CM_GEOMETRY_KEEPER_LATERAL_DISTANCE').toBeCloseTo(
      (Math.sqrt(1952) - 4) / Math.sqrt(9680), 12,
    );
    expect(lateral!.conceded, 'CM_GEOMETRY_KEEPER_LATERAL_COST').toBeGreaterThan(0);
    expect(lateral!.atk).toBe(0);
    const back = moved(f.preset);
    back[0].y = 94;
    zero(project(f, back));
    zero(project(f, moved(f.preset)));
  });

  it('looks up actual canonical slot identities without compacting missing rows or adding inactive slots', async () => {
    const f = await fixture();
    const custom = moved(f.preset);
    custom[2] = { x: 6, y: 6 };
    const active = [4, 1].map(index => ({ slot: f.slots[index] }));
    zero(project(f, custom, active));
    custom[4].y = 60;
    const result = project(f, custom, active);
    expect(result).not.toBeNull();
    expect(result!.atk, 'CM_GEOMETRY_MISSING_ROW_KEEPS_ORIGINAL_INDEX').toBeCloseTo(1 / 88, 12);
    expect(result!.conceded).toBeCloseTo(5 / 352, 12);
    expect(active[0].slot).toBe(f.slots[4]);
    expect(active[1].slot).toBe(f.slots[1]);
  });

  it('refuses duplicate or foreign slot identities before returning any effect and keeps an empty XI neutral', async () => {
    const f = await fixture();
    const custom = f.preset.map(point => ({ x: point.x, y: 6 }));
    expect(project(f, custom, [{ slot: f.slots[1] }, { slot: f.slots[1] }]),
      'CM_GEOMETRY_DUPLICATE_SLOT_REFUSED').toBeNull();
    const foreign: FormationSlot = { ...f.slots[1], allowed: [...f.slots[1].allowed] };
    expect(project(f, custom, [{ slot: foreign }]), 'CM_GEOMETRY_FOREIGN_SLOT_REFUSED').toBeNull();
    expect(project(f, custom, [{ slot: null }]), 'CM_GEOMETRY_NULL_SLOT_REFUSED').toBeNull();
    zero(project(f, custom, []));
  });
});
