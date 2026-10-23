import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  return { core, career, formation, before, onShape, onSwap, onSlot, view, tokens, props, TacticsScreen };
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


function pitchPosition(view: Awaited<ReturnType<typeof mounted>>['view'], index: number): Point {
  const token = view.container.querySelector<HTMLElement>('[data-cm-slot="' + index + '"]');
  if (!token) throw new Error('Actual position token is missing.');
  const shift = token.style.transform.match(/calc\(-50% \+ ([^)]+)px\), calc\(-50% \+ ([^)]+)px\)/);
  expect(shift !== null, 'CM_POSITION_REAL_TOKEN_TRANSFORM').toBe(true);
  if (!shift) throw new Error('Actual token transform was not readable.');
  return { x: parseFloat(token.style.left) + Number(shift[1]) * 100 / PITCH.width,
    y: parseFloat(token.style.top) + Number(shift[2]) * 100 / PITCH.height };
}
function tokenAt(f: Awaited<ReturnType<typeof mounted>>, index: number) {
  const token = f.view.container.querySelector<HTMLButtonElement>('[data-cm-slot="' + index + '"]');
  if (!token) throw new Error('Actual canonical token is missing.');
  return token;
}
function screenPoint(point: Point): Point {
  return { x: PITCH.left + point.x * PITCH.width / 100, y: PITCH.top + point.y * PITCH.height / 100 };
}
function captureFor(token: HTMLElement) {
  const capture = vi.fn(), release = vi.fn();
  Object.defineProperties(token, { setPointerCapture: { value: capture, configurable: true },
    releasePointerCapture: { value: release, configurable: true } });
  return { capture, release };
}
async function editor(raw?: unknown) {
  const f = await mounted();
  let published: CareerState & { customShape?: unknown } = raw === undefined
    ? f.career : { ...f.career, customShape: raw };
  const repaint = (next: CareerState & { customShape?: unknown }) => {
    published = next;
    f.view.rerender(<f.TacticsScreen {...f.props} career={next} />);
  };
  repaint(published);
  const preset = f.formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
  const publishLast = () => {
    const call = f.onShape.mock.calls.at(-1);
    if (!call) throw new Error('A real component proposal is required before publication.');
    expect(call[0], 'CM_POSITION_PARENT_CURRENT_FORMATION').toBe(published.formationIndex);
    const next = { ...published };
    if (call[1] === null) delete next.customShape;
    else next.customShape = { v: 1, formationIndex: call[0], points: call[1].map(point => ({ ...point })) };
    repaint(next);
  };
  const enter = () => fireEvent.click(screen.getByRole('button', { name: 'Move players' }));
  const select = (index: number) => fireEvent.change(screen.getByRole('combobox', { name: 'Position slot' }),
    { target: { value: String(index) } });
  return { ...f, preset, enter, select, repaint, publishLast, current: () => published };
}

describe('Club Manager controlled base-position editor', () => {
  it('moves numbered slots by two points with buttons and keyboard while preserving keeper role and bounds', async () => {
    const f = await editor();
    f.enter(); f.select(0);
    const up = screen.getByRole('button', { name: 'Move up' });
    fireEvent.click(up);
    const first = f.onShape.mock.calls[0];
    expect(first?.[0], 'CM_POSITION_NUDGE_CURRENT_FORMATION').toBe(f.career.formationIndex);
    expect(first?.[1]?.[0], 'CM_POSITION_KEEPER_TWO_POINT_NUDGE').toEqual({ x: f.preset[0].x, y: f.preset[0].y - 2 });
    expect(first?.[1]?.slice(1), 'CM_POSITION_NUDGE_OTHER_TEN_HELD').toEqual(f.preset.slice(1));
    expect(pitchPosition(f.view, 0), 'CM_POSITION_NO_OPTIMISTIC_PUBLICATION').toEqual(f.preset[0]);
    f.publishLast();
    expect(pitchPosition(f.view, 0), 'CM_POSITION_PARENT_PUBLICATION_REACHES_PITCH').toEqual(first![1]![0]);

    f.select(1);
    const token = tokenAt(f, 1);
    fireEvent.focus(token); fireEvent.keyDown(token, { key: 'ArrowRight' });
    expect(f.onShape.mock.calls[1]?.[1]?.[1], 'CM_POSITION_KEYBOARD_TWO_POINT_NUDGE').toEqual(
      { x: f.preset[1].x + 2, y: f.preset[1].y });
    f.publishLast();
    const edges = f.preset.map(point => ({ ...point }));
    edges[0] = { x: 6, y: 6 }; edges[1] = { x: 94, y: 94 };
    f.repaint({ ...f.current(), customShape: { v: 1, formationIndex: f.career.formationIndex, points: edges } });
    f.select(0);
    const count = f.onShape.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
    f.select(1);
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(f.onShape.mock.calls.length, 'CM_POSITION_CLAMPED_NOOP_DOES_NOT_WRITE').toBe(count);
    expect(tokenAt(f, 0).getAttribute('data-cm-slot-label'), 'CM_POSITION_KEEPER_ROLE_STAYS_CANONICAL').toBe(f.formation.slots[0].label);
    expect(f.onSwap).not.toHaveBeenCalled(); expect(f.onSlot).not.toHaveBeenCalled();
  });

  it('previews a real drag and commits once on release before showing only the parent-published shape', async () => {
    const f = await editor();
    f.enter(); const previous = tokenAt(f, 1), token = tokenAt(f, 2), capture = captureFor(token);
    act(() => { previous.focus(); });
    expect(document.activeElement, 'CM_POSITION_DRAG_PREVIOUS_TOKEN_FOCUSED').toBe(previous);
    const a = screenPoint(f.preset[2]), b = screenPoint({ x: 40, y: 48 });
    pointer(token, 'pointerdown', a);
    act(() => { token.focus(); });
    expect(document.activeElement, 'CM_POSITION_DRAG_NEW_OWNER_FOCUSED').toBe(token);
    pointer(token, 'pointermove', b);
    expect(f.onShape, 'CM_POSITION_DRAG_PREVIEW_NO_WRITE').not.toHaveBeenCalled();
    expect(pitchPosition(f.view, 2).x, 'CM_POSITION_DRAG_ACTUAL_PREVIEW_X').toBeCloseTo(40, 12);
    expect(pitchPosition(f.view, 2).y, 'CM_POSITION_DRAG_ACTUAL_PREVIEW_Y').toBeCloseTo(48, 12);
    pointer(token, 'pointerup', b); pointer(token, 'pointerup', b);
    expect(f.onShape.mock.calls.length, 'CM_POSITION_RELEASE_COMMITS_ONCE').toBe(1);
    expect(f.onShape.mock.calls[0]?.[1]?.[2]?.x).toBeCloseTo(40, 12);
    expect(f.onShape.mock.calls[0]?.[1]?.[2]?.y).toBeCloseTo(48, 12);
    expect(pitchPosition(f.view, 2), 'CM_POSITION_RELEASE_DROPS_UNPUBLISHED_PREVIEW').toEqual(f.preset[2]);
    expect(capture.capture.mock.calls).toEqual([[7]]);
    expect(capture.release.mock.calls[0]).toEqual([7]);
    f.publishLast();
    expect(pitchPosition(f.view, 2).x, 'CM_POSITION_SAVED_DRAG_REACHES_PITCH').toBeCloseTo(40, 12);
    expect(pitchPosition(f.view, 2).y).toBeCloseTo(48, 12);
    expect(f.onSwap).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur'] as const)(
    'rolls back a real %s gesture without saving, swapping or reopening a picker', async kind => {
      const f = await editor();
      f.enter(); const token = tokenAt(f, 3); captureFor(token);
      const a = screenPoint(f.preset[3]), b = screenPoint({ x: 45, y: 45 });
      pointer(token, 'pointerdown', a); pointer(token, 'pointermove', b);
      expect(pitchPosition(f.view, 3).x, 'CM_POSITION_CANCEL_PREVIEW_POSITIVE').toBeCloseTo(45, 12);
      if (kind === 'blur') fireEvent.blur(window);
      else pointer(token, kind, b);
      pointer(token, 'pointerup', b);
      expect(f.onShape, 'CM_POSITION_CANCEL_ZERO_WRITES_' + kind).not.toHaveBeenCalled();
      expect(pitchPosition(f.view, 3), 'CM_POSITION_CANCEL_RESTORES_COMMITTED_' + kind).toEqual(f.preset[3]);
      expect(f.onSwap).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).toBeNull();
      expect(JSON.stringify(f.career), 'CM_POSITION_CANCEL_RAW_CAREER_HELD').toBe(f.before);
    });

  it('keeps the committed shape and truthful error after a refused move or reset', async () => {
    const f = await editor();
    const points = f.preset.map(point => ({ ...point })); points[1] = { x: 40, y: 60 };
    const held = { ...f.career, customShape: { v: 1, formationIndex: f.career.formationIndex, points } };
    f.repaint(held); f.enter(); f.select(1);
    f.onShape.mockReturnValue(false);
    const raw = JSON.stringify(held);
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(f.onShape.mock.calls[0]?.[1]?.[1], 'CM_POSITION_REFUSED_REAL_PROPOSAL').toEqual({ x: 42, y: 60 });
    expect(screen.getByRole('alert').textContent, 'CM_POSITION_REFUSAL_TRUTHFUL').toMatch(/not saved/i);
    expect(pitchPosition(f.view, 1), 'CM_POSITION_REFUSED_MOVE_COMMITTED_HELD').toEqual(points[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to preset' }));
    expect(f.onShape.mock.calls[1], 'CM_POSITION_REFUSED_RESET_REAL_NULL_PROPOSAL').toEqual([f.career.formationIndex, null]);
    expect(pitchPosition(f.view, 1), 'CM_POSITION_REFUSED_RESET_COMMITTED_HELD').toEqual(points[1]);
    expect(JSON.stringify(f.current()), 'CM_POSITION_REFUSAL_RAW_HELD').toBe(raw);
    f.onShape.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    f.publishLast();
    expect(pitchPosition(f.view, 1), 'CM_POSITION_REAL_RETRY_PUBLISHED').toEqual({ x: 42, y: 60 });
  });

  it('resets a valid custom shape only after the parent publishes the saved preset', async () => {
    const f = await editor();
    const points = f.preset.map(point => ({ ...point })); points[4] = { x: 55, y: 55 };
    f.repaint({ ...f.career, customShape: { v: 1, formationIndex: f.career.formationIndex, points } });
    f.enter(); f.select(4);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to preset' }));
    expect(f.onShape.mock.calls, 'CM_POSITION_RESET_ONE_NULL_REQUEST').toEqual([[f.career.formationIndex, null]]);
    expect(pitchPosition(f.view, 4), 'CM_POSITION_RESET_WAITS_FOR_PARENT').toEqual(points[4]);
    f.publishLast();
    expect(pitchPosition(f.view, 4), 'CM_POSITION_RESET_PUBLISHED_PRESET').toEqual(f.preset[4]);
    expect(Object.prototype.hasOwnProperty.call(f.current(), 'customShape'), 'CM_POSITION_PARENT_REMOVES_SUPPORTED_SHAPE').toBe(false);
    expect(screen.getByRole('button', { name: 'Reset to preset' }).hasAttribute('disabled')).toBe(true);
  });

  it.each(['future', 'malformed', 'foreign-formation', 'live'] as const)(
    'blocks %s editing without deleting raw data or invoking the writer', async fault => {
      const f = await editor();
      const raw = fault === 'future' ? { v: 2, formationIndex: f.career.formationIndex, points: f.preset }
        : fault === 'malformed' ? { v: 1, formationIndex: f.career.formationIndex, points: f.preset.slice(0, 10) }
        : { v: 1, formationIndex: f.career.formationIndex + 1, points: f.preset };
      let next: CareerState & { customShape?: unknown };
      if (fault === 'live') {
        let probe = f.career;
        let played: CareerState | null = null;
        for (let guard = 0; guard < 8; guard += 1) {
          const result = f.core.playNextEntry(probe, { noCoach: true });
          if (result.kind === 'halftime' && result.state.live) { played = result.state; break; }
          probe = result.state;
        }
        expect(played !== null, 'CM_POSITION_BLOCKED_ACTUAL_LIVE_FOUNDATION').toBe(true);
        if (!played) throw new Error('The actual engine did not produce a live fixture.');
        next = played;
      } else next = { ...f.career, customShape: raw };
      const before = JSON.stringify(next);
      f.repaint(next);
      const button = screen.getByRole('button', { name: 'Move players' });
      expect(button.hasAttribute('disabled'), 'CM_POSITION_BLOCKED_MODE_' + fault).toBe(true);
      fireEvent.click(button); fireEvent.keyDown(tokenAt(f, 0), { key: 'ArrowUp' });
      expect(f.onShape, 'CM_POSITION_BLOCKED_ZERO_WRITES_' + fault).not.toHaveBeenCalled();
      expect(screen.getByText(fault === 'live' ? /finish the match before moving/i : /stored shape needs review/i)).toBeTruthy();
      expect(JSON.stringify(f.current()), 'CM_POSITION_BLOCKED_RAW_HELD_' + fault).toBe(before);
    });

  it('discards a preview when the authoritative formation or saved shape changes', async () => {
    const f = await editor();
    f.enter(); let token = tokenAt(f, 1); captureFor(token);
    const a = screenPoint(f.preset[1]), b = screenPoint({ x: 44, y: 44 });
    pointer(token, 'pointerdown', a); pointer(token, 'pointermove', b);
    const changed = f.core.FORMATIONS.findIndex((_, index) => index !== f.career.formationIndex);
    expect(changed >= 0, 'CM_POSITION_OTHER_REAL_FORMATION').toBe(true);
    f.repaint({ ...f.career, formationIndex: changed });
    pointer(tokenAt(f, 1), 'pointerup', b);
    expect(f.onShape, 'CM_POSITION_STALE_FORMATION_GESTURE_ZERO_WRITES').not.toHaveBeenCalled();
    f.repaint(f.career); f.enter(); token = tokenAt(f, 1); captureFor(token);
    pointer(token, 'pointerdown', a); pointer(token, 'pointermove', b);
    const points = f.preset.map(point => ({ ...point })); points[1] = { x: 62, y: 62 };
    f.repaint({ ...f.career, customShape: { v: 1, formationIndex: f.career.formationIndex, points } });
    pointer(tokenAt(f, 1), 'pointerup', b);
    expect(f.onShape, 'CM_POSITION_STALE_SAVED_SHAPE_GESTURE_ZERO_WRITES').not.toHaveBeenCalled();
    expect(pitchPosition(f.view, 1), 'CM_POSITION_NEW_AUTHORITATIVE_SHAPE_WINS').toEqual(points[1]);
  });

  it('keeps overlapping slots individually reachable and applies mentality using their canonical roles', async () => {
    const f = await editor();
    const points = f.preset.map(point => ({ ...point }));
    points[0] = { x: 40, y: 45 }; points[1] = { x: 40, y: 45 };
    f.repaint({ ...f.career, mentality: 'attacking', customShape: { v: 1, formationIndex: f.career.formationIndex, points } });
    f.enter();
    expect(pitchPosition(f.view, 0), 'CM_POSITION_OVERLAP_KEEPER_BASE').toEqual(points[0]);
    expect(pitchPosition(f.view, 1), 'CM_POSITION_OVERLAP_DEFENDER_BASE').toEqual(points[1]);
    const options = screen.getByRole('combobox', { name: 'Position slot' }).querySelectorAll('option');
    expect(options.length, 'CM_POSITION_OVERLAP_ALL_ELEVEN_REACHABLE').toBe(11);
    f.select(1); fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(f.onShape.mock.calls[0]?.[1]?.[0], 'CM_POSITION_OVERLAP_OTHER_SLOT_HELD').toEqual(points[0]);
    expect(f.onShape.mock.calls[0]?.[1]?.[1], 'CM_POSITION_OVERLAP_SELECTED_SLOT_MOVES').toEqual({ x: 42, y: 45 });
    f.publishLast();
    fireEvent.click(screen.getByRole('button', { name: 'Swap players' }));
    // Existing mentalityShift reads the canonical y/role. Only x supplies the existing spread.
    const shift = f.core.mentalityShift(f.formation.slots[0], 'attacking', 40);
    expect(pitchPosition(f.view, 0).x, 'CM_POSITION_CANONICAL_KEEPER_SHIFT_X').toBeCloseTo(Math.max(6, Math.min(94, 40 + shift.dx)), 12);
    expect(pitchPosition(f.view, 0).y, 'CM_POSITION_CANONICAL_KEEPER_SHIFT_Y').toBeCloseTo(Math.max(6, Math.min(94, 45 + shift.dy)), 12);
    expect(tokenAt(f, 0).getAttribute('data-cm-slot-label')).toBe(f.formation.slots[0].label);
    expect(f.onSwap).not.toHaveBeenCalled(); expect(f.onSlot).not.toHaveBeenCalled();
  });

  it('reopens position rules and exposes labelled keyboard controls without changing the plan', async () => {
    const f = await editor();
    f.enter();
    const help = screen.getByRole('button', { name: 'Position rules' });
    fireEvent.click(help);
    expect(screen.getByText(/mentality still shifts/i), 'CM_POSITION_HELP_EXPLAINS_BASE_VS_KICKOFF').toBeTruthy();
    expect(screen.getByText(/two points/i), 'CM_POSITION_HELP_WORKED_STEP').toBeTruthy();
    fireEvent.click(help); fireEvent.click(help);
    for (const label of ['Move up', 'Move down', 'Move left', 'Move right']) {
      const button = screen.getByRole('button', { name: label });
      button.focus();
      expect(document.activeElement, 'CM_POSITION_LABELLED_CONTROL_FOCUS_' + label).toBe(button);
    }
    const select = screen.getByRole('combobox', { name: 'Position slot' });
    select.focus(); expect(document.activeElement, 'CM_POSITION_LABELLED_SELECT_FOCUS').toBe(select);
    expect(f.onShape, 'CM_POSITION_HELP_NO_WRITE').not.toHaveBeenCalled();
    expect(JSON.stringify(f.current())).toBe(f.before);
  });
});

