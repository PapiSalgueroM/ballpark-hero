import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { CareerState } from '@/lib/clubManager';

type Point = { x: number; y: number };
type ShapeWriter = (formationIndex: number, points: readonly Point[] | null) => boolean;
const PITCH = { x: 20, y: 30, left: 20, top: 30, width: 300, height: 400, right: 320, bottom: 430 };
let seed: number;

function rect() {
  return { ...PITCH, toJSON: () => ({ ...PITCH }) } as DOMRect;
}
class PointerInput extends MouseEvent {
  declare readonly pointerId: number;
  declare readonly isPrimary: boolean;
  constructor(type: string, point: { x: number; y: number }) {
    super(type, { bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: point.x, clientY: point.y });
    Object.defineProperties(this, { pointerId: { value: 7 }, isPrimary: { value: true } });
  }
}
function pointer(token: HTMLElement, type: string, point: { x: number; y: number }) {
  const event = new PointerInput(type, point);
  expect([event.button, event.clientX, event.clientY, event.pointerId, event.isPrimary],
    'CM_POSITION_REAL_POINTER_FIXTURE').toEqual([0, point.x, point.y, 7, true]);
  fireEvent(token, event);
}
async function mounted() {
  // Seed before importing the real engine/component and before calling its real factory.
  const core = await import('@/lib/clubManager');
  const { TacticsScreen } = await import('@/components/club-manager/TacticsScreen');
  const made = core.startCareer('Real Madrid');
  const career: CareerState = { ...made, squad: made.squad.map(player => ({
    ...player, fitness: 100, injuryWeeks: 0, suspendedMatches: 0,
  })) };
  const formation = core.FORMATIONS[career.formationIndex] ?? core.FORMATIONS[0];
  expect(formation.slots.length, 'CM_POSITION_REAL_ELEVEN_SLOT_FORMATION').toBe(11);
  expect(core.resolveXI(career).length, 'CM_POSITION_REAL_XI_FOUNDATION').toBe(11);
  const before = JSON.stringify(career);
  const onShape = vi.fn<ShapeWriter>(() => true), onSwap = vi.fn(), onSlot = vi.fn();
  // The additional optional callback is passed structurally so this test compiles against the old component.
  // It does not import a proposed helper, adapter or new core export.
  const props = { career, onFormation: vi.fn(), onMentality: vi.fn(), onInstructions: vi.fn(),
    onSlot, onSwap, onAutoPick: vi.fn(), onDuty: vi.fn(), onSetPiece: vi.fn(),
    onAutoSetPieces: vi.fn(), onShootoutOrder: vi.fn(), onCustomShape: onShape };
  const view = render(<TacticsScreen {...props} />);
  const tokens = [...view.container.querySelectorAll<HTMLButtonElement>('[data-cm-slot]')];
  expect(tokens.length, 'CM_POSITION_ACTUAL_COMPONENT_MOUNTED').toBe(11);
  return { core, career, formation, before, onShape, onSwap, onSlot, view, tokens };
}

beforeEach(() => {
  seed = 0x14560001;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.matches('[data-cm-pitch]') ? rect() : original.call(this);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager tactics position modes', () => {
  it('offers a separate Move players mode with all eleven numbered position slots', async () => {
    const f = await mounted();
    const move = screen.queryByRole('button', { name: 'Move players' });
    expect(move !== null, 'CM_POSITION_MOVE_MODE_AVAILABLE').toBe(true);
    if (!move) throw new Error('Owned Move-mode assertion should have failed first.');
    fireEvent.click(move);
    const select = screen.getByRole('combobox', { name: 'Position slot' });
    const options = [...select.querySelectorAll('option')];
    expect(options.map(option => option.value), 'CM_POSITION_ALL_CANONICAL_SLOTS_REACHABLE').toEqual(
      f.formation.slots.map((_, index) => String(index)));
    options.forEach((option, index) => {
      expect(option.textContent?.startsWith(String(index + 1)), 'CM_POSITION_NUMBERED_SLOT_' + index).toBe(true);
    });
    expect(options[0].textContent?.includes(f.formation.slots[0].label), 'CM_POSITION_KEEPER_SLOT_REACHABLE').toBe(true);
    expect(f.onShape, 'CM_POSITION_ENTERING_MODE_DOES_NOT_SAVE').not.toHaveBeenCalled();
    expect(f.onSwap, 'CM_POSITION_ENTERING_MODE_DOES_NOT_SWAP_XI').not.toHaveBeenCalled();
    expect(JSON.stringify(f.career), 'CM_POSITION_MODE_ENTRY_PRESERVES_CAREER').toBe(f.before);
  });

  it('keeps a default-mode token tap opening the real slot picker without saving a shape', async () => {
    const f = await mounted();
    fireEvent.click(f.tokens[1]);
    const dialog = screen.queryByRole('dialog');
    expect(dialog !== null, 'CM_POSITION_SWAP_TAP_STILL_OPENS_REAL_PICKER').toBe(true);
    if (!dialog) throw new Error('The existing slot picker did not open.');
    expect(within(dialog).getByRole('heading').textContent, 'CM_POSITION_SWAP_TAP_SLOT_IDENTITY').toBe('Pick your ' + f.formation.slots[1].label);
    expect(f.onShape, 'CM_POSITION_SWAP_TAP_NO_SHAPE_WRITE').not.toHaveBeenCalled();
    expect(f.onSwap).not.toHaveBeenCalled(); expect(f.onSlot).not.toHaveBeenCalled();
    expect(JSON.stringify(f.career), 'CM_POSITION_SWAP_TAP_RAW_CAREER_HELD').toBe(f.before);
  });

  it('keeps default-mode dragging as one XI swap and discards a cancelled drag', async () => {
    const f = await mounted(), from = 1, to = 2, token = f.tokens[from];
    const capture = vi.fn(), release = vi.fn();
    Object.defineProperties(token, { setPointerCapture: { value: capture, configurable: true },
      releasePointerCapture: { value: release, configurable: true } });
    const point = (index: number) => {
      const p = f.core.slotPosition(f.formation.slots[index], f.career.mentality);
      return { x: PITCH.left + p.x * PITCH.width / 100, y: PITCH.top + p.y * PITCH.height / 100 };
    };
    const a = point(from), b = point(to);
    expect(Math.hypot(a.x - b.x, a.y - b.y) > 6, 'CM_POSITION_REAL_DISTINCT_SWAP_TARGET').toBe(true);
    pointer(token, 'pointerdown', a); pointer(token, 'pointermove', b);
    expect(f.onSwap, 'CM_POSITION_SWAP_NOT_BEFORE_RELEASE').not.toHaveBeenCalled();
    pointer(token, 'pointerup', b);
    expect(f.onSwap.mock.calls, 'CM_POSITION_DEFAULT_DRAG_RETAINS_REAL_SWAP').toEqual([[from, to]]);
    expect(capture.mock.calls, 'CM_POSITION_REAL_CAPTURE_PATH').toEqual([[7]]);
    expect(release.mock.calls, 'CM_POSITION_REAL_RELEASE_PATH').toEqual([[7]]);
    pointer(token, 'pointerdown', a); pointer(token, 'pointermove', b); pointer(token, 'pointercancel', b); pointer(token, 'pointerup', b);
    expect(f.onSwap.mock.calls, 'CM_POSITION_DEFAULT_CANCEL_DOES_NOT_SWAP').toEqual([[from, to]]);
    expect(f.onShape, 'CM_POSITION_DEFAULT_DRAG_NEVER_WRITES_COORDINATES').not.toHaveBeenCalled();
    expect(f.onSlot).not.toHaveBeenCalled();
    expect(JSON.stringify(f.career), 'CM_POSITION_SWAP_DRAG_RAW_CAREER_HELD').toBe(f.before);
  });
});
