import fs from 'node:fs';
import path from 'node:path';
import { useState, type ComponentProps } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { MatchPlansCard } from '@/components/club-manager/MatchPlansCard';
import {
  FORMATIONS, engineRegistrations, instructionsOf, resolveXI,
  restoreEngineRegistrations, setInstructions, startCareer, xiFitReport,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { carryShape } from '@/lib/clubManagerCarry';
import { applyMatchPlan, deleteMatchPlan, matchPlansOf, saveMatchPlan } from '@/lib/clubManagerMatchPlans';
import type { TeamInstructions } from '@/lib/clubManagerTacticsCore';

type Point = { x: number; y: number };
type FutureShape = { v: 1; formationIndex: number; points: Point[] };
const MIX: TeamInstructions = { press: 1, tempo: -1, width: 1, line: 1 };
const NAME = 'My pressure philosophy 1';
const calls = { formations: [] as number[], saves: [] as unknown[][], applies: [] as number[], shapes: [] as unknown[][] };
let registrations: ReturnType<typeof engineRegistrations>, latest: CareerState | null, refuseSave: boolean;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function fixture(): CareerState {
  // Existing engine builder creates this fictional club and squad. No real sports data is edited.
  return startCareer('Custom Tactics Lab', 'now', {
    name: 'Custom Tactics Lab', leagueId: 'premier', stadium: 'Lab Ground',
    budgetTier: 'small', quality: 72, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'CT' },
  });
}
function current() {
  expect(latest, 'CM_CUSTOM_UI_SETUP_STATE').not.toBeNull();
  return latest!;
}
function record(key: string, value: unknown) {
  const receipt = { case: key, fixture: 'Fictional real-engine custom club; explicitly synthetic v1 custom points and legacy saved-plan fixture only', value };
  const dir = process.env.CM_CUSTOM_TACTICS_UI_RAW;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, key + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('CM_CUSTOM_TACTICS_UI ' + JSON.stringify(receipt));
}
function Harness({ initial, plansOnly = false }: { initial: CareerState; plansOnly?: boolean }) {
  const [career, setCareer] = useState(initial);
  latest = career;
  const publish = (next: CareerState) => { if (next === career) return false; setCareer(next); return true; };
  const save = (slot: number, name: string) => {
    calls.saves.push([slot, name]);
    return refuseSave ? false : publish(saveMatchPlan(career, slot, name));
  };
  const apply = (slot: number) => { calls.applies.push(slot); return publish(applyMatchPlan(career, slot)); };
  const remove = (slot: number) => publish(deleteMatchPlan(career, slot));
  if (plansOnly) return <MatchPlansCard career={career} open onToggle={() => {}} onSave={save} onApply={apply} onDelete={remove} />;
  // Extra optional callback is passed structurally, as in the queued PR382 tests, so old main still type-checks.
  // It imports no proposed positions helper and invents no geometry engine behavior.
  const props: ComponentProps<typeof TacticsScreen> & { onCustomShape: (index: number, points: readonly Point[] | null) => boolean } = {
    career,
    onFormation: index => {
      calls.formations.push(index);
      const from = FORMATIONS[career.formationIndex], to = FORMATIONS[index];
      return !!from && !!to && publish({ ...career, formationIndex: index, ...carryShape(career.xiIds, career.xiDuties ?? [], from, to, career.squad) });
    },
    onMentality: mentality => publish({ ...career, mentality }),
    onInstructions: instructions => {
      const next = setInstructions(career, instructions);
      return !!next && publish(next);
    },
    onSlot: () => {}, onSwap: () => {}, onAutoPick: () => {}, onDuty: () => {},
    onSetPiece: () => {}, onAutoSetPieces: () => {}, onShootoutOrder: () => {},
    onSaveMatchPlan: save, onApplyMatchPlan: apply, onDeleteMatchPlan: remove,
    onCustomShape: (index, points) => { calls.shapes.push([index, points]); return false; },
  };
  return <TacticsScreen {...props} />;
}
function mount(initial: CareerState, plansOnly = false) {
  return render(<MemoryRouter><Harness initial={initial} plansOnly={plansOnly} /></MemoryRouter>);
}
const button = (view: ReturnType<typeof render>, selector: string) => {
  const found = view.container.querySelector<HTMLButtonElement>(selector);
  if (!found) throw new Error('The actual existing control is missing: ' + selector);
  return found;
};
beforeEach(() => {
  registrations = engineRegistrations(); localStorage.clear(); latest = null; refuseSave = false;
  calls.formations.length = 0; calls.saves.length = 0; calls.applies.length = 0; calls.shapes.length = 0;
  let seed = 505;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  });
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); restoreEngineRegistrations(registrations); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Club Manager custom tactics UI', () => {
  it('keeps preset controls and all eleven roles before offering a separate keyboard-reachable Move mode', () => {
    const career = fixture(), before = JSON.stringify(career), view = mount(career);
    const nextIndex = (career.formationIndex + 1) % FORMATIONS.length, nextFormation = FORMATIONS[nextIndex];
    const preset = Array.from(view.container.querySelectorAll<HTMLButtonElement>('[data-cm-formation-btn]'))
      .find(control => control.getAttribute('data-cm-formation-btn') === nextFormation.name);
    if (!preset) throw new Error('The real next preset is missing');
    fireEvent.click(preset);
    const state = current(), tokens = Array.from(view.container.querySelectorAll<HTMLButtonElement>('[data-cm-slot]'));
    const fit = xiFitReport(state);
    const move = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(control => control.textContent?.trim() === 'Move players');
    record('move-mode', { formation: state.formationIndex, presetName: nextFormation.name, tokenLabels: tokens.map(token => token.getAttribute('data-cm-slot-label')),
      fit: { raw: fit.raw, rating: fit.rating }, shownFit: view.container.querySelector('[data-cm-xi-avg]')?.textContent,
      presetCalls: calls.formations, movePresent: !!move, unchangedInput: JSON.stringify(career) === before });
    expect(calls.formations).toEqual([nextIndex]); expect(state.formationIndex).toBe(nextIndex);
    expect(tokens).toHaveLength(11); expect(resolveXI(state)).toHaveLength(11);
    expect(tokens.map(token => token.getAttribute('data-cm-slot-label'))).toEqual(nextFormation.slots.map(slot => slot.label));
    expect(view.container.querySelector('[data-cm-xi-avg]')?.textContent).toBe(String(fit.rating));
    expect(JSON.stringify(career)).toBe(before); expect(calls.shapes).toEqual([]);
    expect(!!move, 'CM_CUSTOM_UI_MOVE_MODE_AVAILABLE').toBe(true);
    if (!move) throw new Error('The owned missing-Move assertion should have failed first');
    fireEvent.click(move);
    const select = view.container.querySelector<HTMLSelectElement>('select[aria-label="Position slot"]');
    expect(select, 'CM_CUSTOM_UI_ALL_SLOTS_REACHABLE').not.toBeNull();
    expect(Array.from(select!.options).map(option => option.value)).toEqual(nextFormation.slots.map((_, index) => String(index)));
    expect(select!.options[0].textContent).toContain(nextFormation.slots[0].label);
    expect(calls.shapes).toEqual([]);
  });

  it('saves the named philosophy selected on the real screen with its actual instruction mix and custom points', () => {
    const career = fixture(), formation = FORMATIONS[career.formationIndex];
    const points = formation.slots.map(slot => ({ x: Math.max(6, Math.min(94, slot.x)), y: Math.max(6, Math.min(94, slot.y)) }));
    points[1] = { x: points[1].x <= 92 ? points[1].x + 2 : points[1].x - 2, y: points[1].y };
    const customShape: FutureShape = { v: 1, formationIndex: career.formationIndex, points };
    Object.assign(career, { customShape });
    const before = JSON.stringify(career), view = mount(career);
    fireEvent.click(button(view, '[data-cm-mentality-btn="attacking"]'));
    fireEvent.click(button(view, '[data-cm-instr-open="tab"]'));
    for (const [key, value] of Object.entries(MIX)) fireEvent.click(button(view, '[data-cm-instr-btn="tab:' + key + ':' + value + '"]'));
    fireEvent.click(button(view, '[data-cm-tile-btn="plans"]'));
    const input = view.container.querySelector<HTMLInputElement>('[data-cm-plan-name]');
    if (!input) throw new Error('The actual plan name input is missing');
    fireEvent.change(input, { target: { value: NAME } });
    const save = button(view, '[data-cm-plan-save]');
    fireEvent.click(save);
    const state = current(), plan = matchPlansOf(state)[0], raw = plan as unknown as Record<string, unknown> | undefined;
    const captured = [raw?.instructions ?? null, raw?.customShape ?? null];
    const notice = view.container.querySelector('[data-cm-plan-notice]')?.textContent;
    record('complete-plan', { mix: instructionsOf(state), mentality: state.mentality, name: plan?.name ?? null, captured,
      expected: [MIX, customShape], saveDisabled: save.disabled, calls: calls.saves, notice, inputUnchanged: JSON.stringify(career) === before });
    expect(NAME).toHaveLength(24); expect(input.maxLength).toBe(24);
    expect(instructionsOf(state)).toEqual(MIX); expect(state.mentality).toBe('attacking');
    expect(calls.saves).toEqual([[0, NAME]]); expect(plan?.name).toBe(NAME);
    expect(notice).toBe('Saved ' + NAME + '.'); expect(JSON.stringify(career)).toBe(before);
    expect(captured, 'CM_CUSTOM_UI_COMPLETE_PLAN_CAPTURE').toEqual([MIX, customShape]);
  });

  it('applies a legacy named preset without changing current instructions and keeps a refused save honest', () => {
    let career = fixture();
    const originalFormation = career.formationIndex, originalMentality = career.mentality;
    const saved = saveMatchPlan(career, 0, 'Legacy preset'), legacy = clone(saved.matchPlans![0]) as unknown as Record<string, unknown>;
    legacy.version = 1; delete legacy.instructions; delete legacy.customShape;
    const nextIndex = (originalFormation + 1) % FORMATIONS.length;
    career = { ...career, formationIndex: nextIndex, mentality: 'attacking',
      ...carryShape(career.xiIds, career.xiDuties ?? [], FORMATIONS[originalFormation], FORMATIONS[nextIndex], career.squad) };
    career = setInstructions(career, MIX)!;
    Object.assign(career, { matchPlans: [legacy] });
    refuseSave = true;
    const view = mount(career, true);
    fireEvent.click(button(view, '[data-cm-plan-apply]'));
    const applied = current(), held = JSON.stringify(applied);
    const input = view.container.querySelector<HTMLInputElement>('[data-cm-plan-name]');
    if (!input) throw new Error('The legacy plan name input is missing');
    fireEvent.change(input, { target: { value: 'Refused replacement' } });
    fireEvent.click(button(view, '[data-cm-plan-save]'));
    const notice = view.container.querySelector('[data-cm-plan-notice]');
    record('legacy-refusal', { originalFormation, appliedFormation: applied.formationIndex, originalMentality, appliedMentality: applied.mentality,
      instructions: instructionsOf(applied), applyCalls: calls.applies, saveCalls: calls.saves, unchangedAfterRefusal: JSON.stringify(current()) === held, notice: notice?.textContent, noticeRole: notice?.getAttribute('role') });
    expect(calls.applies).toEqual([0]); expect(applied.formationIndex).toBe(originalFormation); expect(applied.mentality).toBe(originalMentality);
    expect(instructionsOf(applied)).toEqual(MIX); expect(resolveXI(applied)).toHaveLength(11);
    expect(calls.saves).toEqual([[0, 'Refused replacement']]); expect(JSON.stringify(current())).toBe(held);
    expect(matchPlansOf(current())[0].name).toBe('Legacy preset');
    expect(notice?.getAttribute('role')).toBe('alert');
    expect(notice?.textContent).toBe('This setup could not be changed. Reopen your active manager save and try again.');
  });
});
