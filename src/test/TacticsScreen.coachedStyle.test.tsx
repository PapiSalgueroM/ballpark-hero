import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  FORMATIONS, effectiveXIWithSlots, fitGrade, instructionsOf,
  resolveXI, setInstructions, slotDuty, startCareer,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  coachedStyleFit, coachedStyleXi, readCoachedStyle,
  startCoachedStyle, tickCoachedStyle,
} from '@/lib/clubManagerTraits';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';

function fixture() {
  let c = startCareer('Real Madrid');
  c = { ...c, squad: c.squad.map(p => ({ ...p, fitness: 100, injuryWeeks: 0, suspendedMatches: 0 })) };
  const instructed = setInstructions(c, { press: 1, tempo: 0, width: 0, line: 0 });
  expect(instructed !== null, 'COACHED_TACTICS_REAL_INSTRUCTIONS').toBe(true);
  if (!instructed) throw new Error('Real instructions fixture was refused.');
  c = instructed;
  const formation = FORMATIONS[c.formationIndex] ?? FORMATIONS[0];
  const rows = effectiveXIWithSlots(c);
  const row = rows.find(candidate => candidate.p.position !== 'GK' && !candidate.p.onLoan && candidate.slot
    && formation.slots.indexOf(candidate.slot) > 0
    && ['natural', 'family'].includes(fitGrade(candidate.p, candidate.slot)));
  expect(row !== undefined, 'COACHED_TACTICS_REAL_FITTED_CARRIER').toBe(true);
  if (!row || !row.slot) throw new Error('No actual fitted outfield slot in this fixture.');
  const index = formation.slots.indexOf(row.slot), id = row.p.id;
  const started = startCoachedStyle(row.p, 'press', { owned: true, awayOnLoan: false, live: false });
  expect(started.ok).toBe(true);
  let trained = started.player;
  // Only a fixture payload witness. Real charged-calendar learning has its separate engine checks.
  for (let week = 0; week < 6; week += 1) trained = tickCoachedStyle(trained, { owned: true, awayOnLoan: false });
  expect(readCoachedStyle(trained), 'COACHED_TACTICS_ACTUAL_HELPER_PAYLOAD').toEqual({ v: 1, id: 'press' });
  c = { ...c, squad: c.squad.map(p => p.id === id ? trained : p) };
  return { c, id, index };
}

function openSelected(career: CareerState, index: number) {
  const view = render(<TacticsScreen career={career} coachedStyleSaveState="saved"
    onFormation={() => {}} onMentality={() => {}} onInstructions={() => {}}
    onSlot={() => {}} onSwap={() => {}} onAutoPick={() => {}} onDuty={() => {}}
    onSetPiece={() => {}} onAutoSetPieces={() => {}} onShootoutOrder={() => {}} />);
  const button = view.container.querySelector<HTMLButtonElement>('[data-cm-duty="' + index + '"]');
  expect(button !== null, 'COACHED_TACTICS_REAL_DUTY_BUTTON').toBe(true);
  if (!button) throw new Error('Actual duty button is missing.');
  fireEvent.click(button);
  const sheet = view.container.querySelector<HTMLElement>('[data-cm-duty-sheet="' + index + '"]');
  expect(sheet !== null, 'COACHED_TACTICS_REAL_DUTY_SHEET').toBe(true);
  if (!sheet) throw new Error('Actual selected duty sheet is missing.');
  return { view, sheet };
}
afterEach(cleanup);

describe('Coached-style selected duty uses the actual available XI slot', () => {
  it('shows an actually selected fit carrier active and the exact aggregate count', () => {
    const { c, id, index } = fixture();
    const formation = FORMATIONS[c.formationIndex] ?? FORMATIONS[0];
    expect(effectiveXIWithSlots(c).some(row => row.p.id === id && row.slot === formation.slots[index]),
      'COACHED_TACTICS_HEALTHY_EFFECTIVE_SLOT').toBe(true);
    const expected = coachedStyleXi(effectiveXIWithSlots(c), instructionsOf(c));
    expect(expected.activeCount, 'COACHED_TACTICS_HEALTHY_POSITIVE_COUNT').toBe(1);
    const { view, sheet } = openSelected(c, index);
    expect(sheet.querySelector('[data-cm-coached-used]')?.getAttribute('data-cm-coached-used'),
      'COACHED_UI_AVAILABLE_CARRIER_ACTIVE').toBe('1');
    expect(view.container.querySelector('[data-cm-coached-active]')?.getAttribute('data-cm-coached-active'),
      'COACHED_UI_AVAILABLE_COUNT_REAL').toBe(String(expected.activeCount));
  });

  it.each(['injury', 'suspension', 'duplicate'] as const)('does not call the %s-replaced raw pick active in this slot', fault => {
    const { c: base, id, index } = fixture();
    const c: CareerState = fault === 'duplicate'
      ? { ...base, xiIds: base.xiIds.map((value, slot) => slot === 0 ? id : value) }
      : { ...base, squad: base.squad.map(p => p.id === id
        ? { ...p, injuryWeeks: fault === 'injury' ? 2 : 0, suspendedMatches: fault === 'suspension' ? 2 : 0 } : p) };
    const formation = FORMATIONS[c.formationIndex] ?? FORMATIONS[0];
    const raw = resolveXI(c)[index];
    expect(raw?.id, 'COACHED_TACTICS_RAW_PICK_PRESERVED_' + fault).toBe(id);
    expect(raw !== null && raw !== undefined, 'COACHED_TACTICS_RAW_PICK_PRESENT_' + fault).toBe(true);
    if (!raw) throw new Error('The actual raw pick disappeared.');
    const oldRead = coachedStyleFit(raw, formation.slots[index], slotDuty(c, formation, index), instructionsOf(c));
    expect(oldRead.active, 'COACHED_TACTICS_RAW_FIT_FALSE_POSITIVE_WITNESS_' + fault).toBe(true);
    const effective = effectiveXIWithSlots(c);
    const replacement = effective.find(row => row.slot === formation.slots[index]);
    expect(replacement !== undefined, 'COACHED_TACTICS_ACTUAL_REPLACEMENT_EXISTS_' + fault).toBe(true);
    expect(replacement?.p.id === id, 'COACHED_TACTICS_ACTUAL_SLOT_REPLACED_' + fault).toBe(false);
    const expected = coachedStyleXi(effective, instructionsOf(c));
    const { view, sheet } = openSelected(c, index);
    expect(sheet.querySelector('[data-cm-coached-used]')?.getAttribute('data-cm-coached-used'),
      'COACHED_UI_EFFECTIVE_SLOT_ONLY_' + fault).toBe('0');
    expect(sheet.textContent?.includes('This player is not in the current available XI for this slot.'),
      'COACHED_UI_EFFECTIVE_SLOT_EXPLANATION_' + fault).toBe(true);
    expect(view.container.querySelector('[data-cm-coached-active]')?.getAttribute('data-cm-coached-active'),
      'COACHED_UI_REPLACEMENT_COUNT_REAL_' + fault).toBe(String(expected.activeCount));
  });
});

