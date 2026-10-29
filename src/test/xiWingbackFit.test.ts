import { describe, expect, it } from 'vitest';
import { normalizePosition } from '@/lib/squadDeal';
import { checkLineupPick, gradeFit, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';
import { lineupFitSlots, seasonAdjust, xiFitBreakdown } from '@/lib/xiFit';
import type { Position } from '@/types/game';
import { FORMATIONS, type FilledSlot, type Formation, type PositionSlot } from '@/types/lineupBuilder';

function filledSlot(slot: PositionSlot, primary: Position | null, played?: Position[]): FilledSlot {
  return {
    ...slot,
    playerName: 'Fictional Wingback Fixture',
    assignedTeam: 'Fictional Fixture Club',
    isNation: false,
    pick: primary ? { position: primary, played } : {},
  };
}

function single(role: Position, primary: Position | null, played?: Position[]) {
  const slot: PositionSlot = { role, label: role };
  return lineupFitSlots([slot], new Map([[0, filledSlot(slot, primary, played)]]));
}

describe('Build Your XI same-side wingback role fit', () => {
  it('keeps a primary left back at full value in both actual left wingback formations', () => {
    for (const formation of ['3-5-2', '5-3-2'] as Formation[]) {
      const positions = FORMATIONS[formation];
      const index = positions.findIndex(slot => slot.role === 'LWB');
      expect(index, 'fixture needs the actual left wingback slot').toBeGreaterThanOrEqual(0);
      const filled = new Map([[index, filledSlot(positions[index], 'LB')]]);
      const breakdown = xiFitBreakdown(lineupFitSlots(positions, filled));
      expect(breakdown.roleFit.perMan[index], 'XI_LEFT_BACK_AT_LWB: a same-side fullback must not lose rating points').toBe(0);
      expect(breakdown.roleFit.grades[index]).toBe('natural');
      expect(breakdown.roleFit.value).toBe(0);
      expect(seasonAdjust(breakdown).roleFit).toBe(0);
    }
  });

  it('keeps a primary right back at full value in both actual right wingback formations', () => {
    for (const formation of ['3-5-2', '5-3-2'] as Formation[]) {
      const positions = FORMATIONS[formation];
      const index = positions.findIndex(slot => slot.role === 'RWB');
      expect(index, 'fixture needs the actual right wingback slot').toBeGreaterThanOrEqual(0);
      const filled = new Map([[index, filledSlot(positions[index], 'RB')]]);
      const breakdown = xiFitBreakdown(lineupFitSlots(positions, filled));
      expect(breakdown.roleFit.perMan[index], 'XI_RIGHT_BACK_AT_RWB: a same-side fullback must not lose rating points').toBe(0);
      expect(breakdown.roleFit.grades[index]).toBe('natural');
      expect(breakdown.roleFit.value).toBe(0);
      expect(seasonAdjust(breakdown).roleFit).toBe(0);
    }
  });

  it('retains the existing opposite-side and other outfield penalties', () => {
    const cases: { role: Position; primary: Position; grade: string; penalty: number }[] = [
      { role: 'RWB', primary: 'LB', grade: 'wrong', penalty: 6 },
      { role: 'LWB', primary: 'RB', grade: 'wrong', penalty: 6 },
      { role: 'RB', primary: 'LB', grade: 'family', penalty: 2 },
      { role: 'LB', primary: 'RB', grade: 'family', penalty: 2 },
      { role: 'RW', primary: 'LWB', grade: 'wrong', penalty: 6 },
      { role: 'LW', primary: 'RWB', grade: 'wrong', penalty: 6 },
      { role: 'LWB', primary: 'CB', grade: 'wrong', penalty: 6 },
      { role: 'CAM', primary: 'CM', grade: 'natural', penalty: 0 },
    ];
    for (const row of cases) {
      const b = xiFitBreakdown(single(row.role, row.primary));
      expect(b.roleFit.grades[0], row.primary + ' at ' + row.role).toBe(row.grade);
      expect(b.roleFit.perMan[0]).toBe(row.penalty);
    }
  });

  it('retains the goalkeeper boundary even when verified history names a fullback', () => {
    for (const role of ['LWB', 'RWB'] as Position[]) {
      const b = xiFitBreakdown(single(role, 'GK', ['LB', 'RB']));
      expect(b.roleFit.grades[0], 'XI_WINGBACK_KEEPER_BOUNDARY').toBe('keeper');
      expect(b.roleFit.perMan[0]).toBe(14);
    }
    const outfielderInGoal = xiFitBreakdown(single('GK', 'LB', ['GK']));
    expect(outfielderInGoal.roleFit.grades[0]).toBe('keeper');
    expect(outfielderInGoal.roleFit.perMan[0]).toBe(14);
    expect(xiFitBreakdown(single('GK', 'GK')).roleFit.perMan[0]).toBe(0);
  });

  it('preserves verified wingback history, missing positions, empty slots and input bodies', () => {
    const input = single('LWB', 'RB', ['LWB']);
    const before = JSON.stringify(input);
    expect(xiFitBreakdown(input).roleFit.perMan[0]).toBe(0);
    expect(JSON.stringify(input)).toBe(before);
    expect(xiFitBreakdown(single('RWB', 'LB', ['RWB'])).roleFit.perMan[0]).toBe(0);
    expect(xiFitBreakdown(single('LWB', null)).roleFit.grades[0]).toBe('natural');
    const empty = lineupFitSlots([{ role: 'LWB', label: 'LWB' }], new Map());
    expect(xiFitBreakdown(empty).roleFit.grades[0]).toBeNull();
    expect(xiFitBreakdown(empty).roleFit.perMan[0]).toBeNull();
  });

  it('leaves the shared grade and actual pick-admission boundaries unchanged', () => {
    expect(gradeFit(['LB'], SLOT_ALLOWED_BY_ROLE.LWB)).toBe('family');
    expect(gradeFit(['RB'], SLOT_ALLOWED_BY_ROLE.RWB)).toBe('family');
    expect(checkLineupPick('Fictional Left', 'LWB', 'LWB', 'Left-Back', normalizePosition).ok).toBe(true);
    expect(checkLineupPick('Fictional Right', 'RWB', 'RWB', 'Right-Back', normalizePosition).ok).toBe(true);
    expect(checkLineupPick('Fictional Left', 'RWB', 'RWB', 'Left-Back', normalizePosition).ok).toBe(false);
    expect(checkLineupPick('Fictional Right', 'LWB', 'LWB', 'Right-Back', normalizePosition).ok).toBe(false);
    expect(checkLineupPick('Fictional Keeper', 'LWB', 'LWB', 'Goalkeeper', normalizePosition).ok).toBe(false);
  });
});
