import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ERA_ID, FORMATIONS, SET_PIECE_KEYS, SAVE_KEY, autoPickXI, dutyOptions,
  effectiveXIWithSlots, loadCareer, matchStrengthNow, playNextEntry, saveCareer,
  setDuty, setSetPiece, setShootoutOrder, startCareer, startNextSeason,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  MATCH_PLAN_LIMIT, applyMatchPlan, canEditMatchPlans, deleteMatchPlan, matchPlansOf,
  previewMatchPlan, saveMatchPlan,
} from '@/lib/clubManagerMatchPlans';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { useClubManager } from '@/hooks/useClubManager';
import type { ClubManagerGame } from '@/hooks/useClubManager';
import { SLOTS_INDEX_KEY } from '@/lib/clubManagerSlots';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));

const stream = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const tactics = (c: CareerState) => ({ formationIndex: c.formationIndex, mentality: c.mentality, xiIds: c.xiIds, xiDuties: c.xiDuties, setPieces: c.setPieces, shootoutOrder: c.shootoutOrder ?? [] });
let api: ClubManagerGame;
let rendered: string[];
let random: ReturnType<typeof vi.spyOn>;

function Harness() {
  const g = useClubManager();
  api = g;
  if (!g.career) return <p>Opening career</p>;
  rendered.push(JSON.stringify(tactics(g.career)));
  return <TacticsScreen career={g.career} onFormation={g.setFormationIndex} onMentality={g.setMentality}
    onSlot={g.setXiSlot} onSwap={g.swapXiSlots} onAutoPick={g.autoPick} onDuty={g.setSlotDuty}
    onSetPiece={g.assignSetPiece} onAutoSetPieces={g.autoPickSetPieces} onShootoutOrder={g.setShootoutOrder}
    onSaveMatchPlan={g.saveMatchPlan} onApplyMatchPlan={g.applyMatchPlan} onDeleteMatchPlan={g.deleteMatchPlan} />;
}

function fixture() {
  let c = startCareer('Real Madrid');
  c = { ...c, mentality: 'attacking', form: ['W', 'D', 'W'] };
  c.squad = c.squad.map((p, i) => ({ ...p, fitness: 58 + i % 25, morale: 65 + i % 12, injuryWeeks: 0, suspendedMatches: 0 }));
  FORMATIONS[c.formationIndex].slots.forEach((slot, i) => { c = setDuty(c, i, dutyOptions(slot)[0])!; });
  const outfield = c.squad.filter(p => p.position !== 'GK' && !p.onLoan);
  SET_PIECE_KEYS.forEach((key, i) => { c = setSetPiece(c, key, outfield[i].id)!; });
  c = setShootoutOrder(c, outfield.slice(0, 5).map(p => p.id))!;
  return c;
}

async function mountCareer(career: CareerState, resume = true) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  const view = render(<Harness />);
  await waitFor(() => expect(api.phase).toBe('resume'));
  if (resume) act(() => api.resume());
  return view;
}
const q = (selector: string) => document.querySelector(selector) as HTMLElement;
const openPlans = () => fireEvent.click(q('[data-cm-tile-btn="plans"]'));
function saveVisible(name: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), { target: { value: name } });
  fireEvent.click(q('[data-cm-plan-save]'));
}

beforeEach(() => {
  localStorage.clear(); rendered = [];
  random = vi.spyOn(Math, 'random').mockImplementation(stream(1079));
  vi.spyOn(Date, 'now').mockReturnValue(1791360000000);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Club Manager saved match plans', () => {
  it('retains an independent engine kickoff and saved tactics baseline without using match plans', () => {
    const c = fixture(), expected = clone(tactics(c)), before = JSON.stringify(c);
    const xi = effectiveXIWithSlots(c);
    expect(xi).toHaveLength(11);
    expect(new Set(xi.map(x => x.p.id)).size).toBe(11);
    expect(xi.map(x => x.duty)).toEqual(c.xiDuties);
    expect(matchStrengthNow(c)).toBeGreaterThan(40);
    expect(saveCareer(c)).toBe(true);
    expect(tactics(loadCareer()!)).toEqual(expected);
    expect(JSON.stringify(c)).toBe(before);
    const result = playNextEntry(c);
    expect(result.state.live?.startXi).toEqual(xi.map(x => x.p.id));
    expect(result.state.live?.duties).toEqual(c.xiDuties);
    expect(result.state.live?.lamMine).toBeGreaterThan(0);
    expect(result.state.live?.lamOpp).toBeGreaterThan(0);
  });

  it('captures every tactics assignment without aliasing players or consuming a random draw', () => {
    const c = fixture(), before = clone(c);
    random.mockClear();
    const saved = saveMatchPlan(c, 0, '  First XI  '), p = matchPlansOf(saved)[0];
    expect(p).toBeDefined();
    expect(p.name).toBe('First XI');
    expect(p.clubName).toBe(c.clubName); expect(p.eraId).toBe(c.eraId ?? DEFAULT_ERA_ID);
    expect(tactics(p as unknown as CareerState)).toEqual(tactics(c));
    expect(random).not.toHaveBeenCalled(); expect(c).toEqual(before);
    c.xiIds[0] = null; c.xiDuties![0] = null; c.setPieces!.captain = null; c.shootoutOrder!.reverse();
    expect(tactics(p as unknown as CareerState)).toEqual(tactics(before));
    expect('squad' in p).toBe(false);
  });

  it('saves applies and reloads the actual mounted tactics atomically through the real hook', async () => {
    const view = await mountCareer(fixture());
    openPlans(); saveVisible('First XI');
    expect(matchPlansOf(api.career!)).toHaveLength(1);
    const saved = clone(tactics(api.career!));
    act(() => {
      api.setFormationIndex(1); api.setMentality('defensive'); api.swapXiSlots(0, 8);
      api.setSlotDuty(0, null); api.assignSetPiece('captain', null); api.setShootoutOrder([]);
    });
    expect(tactics(api.career!)).not.toEqual(saved);
    const changedAt = rendered.length;
    random.mockClear();
    fireEvent.click(q('[data-cm-plan-apply]'));
    expect(tactics(api.career!)).toEqual(saved);
    expect(rendered.slice(changedAt).every(value => value === JSON.stringify(saved))).toBe(true);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career);
    const plans = clone(api.career!.matchPlans);
    view.unmount();
    render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'));
    expect(tactics(api.career!)).toEqual(saved); expect(api.career!.matchPlans).toEqual(plans);
    act(() => api.resume()); openPlans();
    expect(q('[data-cm-plan-name]')).toHaveValue('First XI');
    expect(q('[data-cm-plan-apply]')).toHaveTextContent('Apply plan');
  });

  it('previews current injuries suspensions departed players fitness and exact engine replacements', async () => {
    const saved = saveMatchPlan(fixture(), 0, 'First XI');
    const p = matchPlansOf(saved)[0], ids = p.xiIds;
    const c = clone(saved);
    c.squad = c.squad.filter(player => player.id !== ids[2]).map(player => ({ ...player,
      injuryWeeks: player.id === ids[0] ? 3 : 0, suspendedMatches: player.id === ids[1] ? 2 : 0, fitness: 39 + player.age % 30 }));
    c.formationIndex = 1; c.xiIds = autoPickXI(c.squad, FORMATIONS[1]); c.mentality = 'defensive';
    const before = JSON.stringify(c), expectedState = { ...c, ...tactics(p as unknown as CareerState) };
    const expected = effectiveXIWithSlots(expectedState);
    random.mockClear();
    const preview = previewMatchPlan(c, 0)!;
    expect(preview.rows.map(row => row.player?.id)).toEqual(expected.map(x => x.p.id));
    expect(preview.strength).toBe(matchStrengthNow(expectedState));
    expect(preview.currentStrength).toBe(matchStrengthNow(c));
    expect(preview.fitness).toBe(expected.reduce((sum, x) => sum + x.p.fitness, 0) / expected.length);
    expect(preview.rows.slice(0, 3).map(row => row.reason)).toEqual(['Injured', 'Suspended', 'Left the squad']);
    expect(preview.replacements).toBeGreaterThanOrEqual(3);
    expect(random).not.toHaveBeenCalled(); expect(JSON.stringify(c)).toBe(before);
    await mountCareer(c); openPlans(); fireEvent.click(q('[data-cm-plan-details]'));
    expect(q('[data-cm-plan-strength]')).toHaveTextContent(`${preview.currentStrength.toFixed(1)} now / ${preview.strength.toFixed(1)} with plan`);
    expect(q('[data-cm-plan-fitness]')).toHaveTextContent(`${Math.round(preview.fitness!)}% average`);
    expect([...document.querySelectorAll('[data-cm-plan-row]')].map(el => el.getAttribute('data-cm-plan-player'))).toEqual(expected.map(x => x.p.id));
    expect(q('[data-cm-plan-lineup]')).toHaveTextContent('Injured');
    expect(q('[data-cm-plan-lineup]')).toHaveTextContent('Suspended');
    expect(q('[data-cm-plan-lineup]')).toHaveTextContent('Left the squad');
  });

  it('takes the previewed XI and all saved duties into an actual kickoff with identical engine draws', () => {
    const c = saveMatchPlan(fixture(), 0, 'First XI'), plan = clone(matchPlansOf(c)[0]);
    c.squad.find(p => p.id === plan.xiIds[0])!.injuryWeeks = 3;
    c.squad.find(p => p.id === plan.xiIds[1])!.suspendedMatches = 2;
    c.squad = c.squad.filter(p => p.id !== plan.xiIds[2]);
    c.formationIndex = 1; c.xiIds = autoPickXI(c.squad, FORMATIONS[1]); c.mentality = 'defensive'; c.xiDuties = [];
    const expected = { ...c, ...tactics(plan as unknown as CareerState) };
    const preview = previewMatchPlan(c, 0)!;
    random.mockClear();
    const applied = applyMatchPlan(c, 0);
    expect(random).not.toHaveBeenCalled();
    expect(applied.xiIds).toEqual(plan.xiIds); expect(matchPlansOf(applied)[0]).toEqual(plan);
    expect(effectiveXIWithSlots(applied).map(x => x.p.id)).toEqual(preview.rows.map(row => row.player!.id));
    expect(matchStrengthNow(applied)).toBe(preview.strength);
    random.mockImplementation(stream(42079)); random.mockClear();
    const actualMatch = playNextEntry(applied), actualDraws = random.mock.calls.length;
    random.mockImplementation(stream(42079)); random.mockClear();
    const expectedMatch = playNextEntry(expected);
    expect(random.mock.calls.length).toBe(actualDraws);
    expect(actualMatch.state.live?.startXi).toEqual(preview.rows.map(row => row.player!.id));
    expect(actualMatch.state.live?.formationIndex).toBe(plan.formationIndex);
    expect(actualMatch.state.live?.duties).toEqual(plan.xiDuties);
    expect(actualMatch.state.live?.mentality).toBe(plan.mentality);
    expect(actualMatch.state.live?.lamMine).toBe(expectedMatch.state.live?.lamMine);
    expect(actualMatch.state.live?.lamOpp).toBe(expectedMatch.state.live?.lamOpp);
    expect(actualMatch.state.live?.myGoals).toBe(expectedMatch.state.live?.myGoals);
    expect(actualMatch.state.live?.oppGoals).toBe(expectedMatch.state.live?.oppGoals);
  });

  it('keeps three named slots independent and replaces or deletes only the selected saved setup', async () => {
    await mountCareer(fixture()); openPlans();
    for (let slot = 0; slot < 3; slot++) {
      fireEvent.click(q(`[data-cm-plan-slot="${slot}"]`));
      act(() => api.setMentality(slot === 0 ? 'attacking' : slot === 1 ? 'balanced' : 'defensive'));
      saveVisible(`Setup ${slot + 1}`);
    }
    expect(matchPlansOf(api.career!)).toHaveLength(MATCH_PLAN_LIMIT);
    const kept = clone(matchPlansOf(api.career!).filter(p => p.slot !== 1));
    fireEvent.click(q('[data-cm-plan-slot="1"]')); saveVisible('Rotation');
    expect(matchPlansOf(api.career!).filter(p => p.slot !== 1)).toEqual(kept);
    expect(matchPlansOf(api.career!).find(p => p.slot === 1)?.name).toBe('Rotation');
    fireEvent.click(q('[data-cm-plan-delete]'));
    expect(matchPlansOf(api.career!)).toEqual(kept);
    expect(q('[data-cm-plan-preview]')).toBeNull();
    expect(q('[data-cm-plan-name]')).toHaveValue('');
    const before = api.career;
    act(() => { api.saveMatchPlan(3, 'Fourth'); api.saveMatchPlan(-1, 'Bad'); api.saveMatchPlan(1, '   '); });
    expect(api.career).toBe(before);
    act(() => api.saveMatchPlan(1, 'A'.repeat(40)));
    expect(matchPlansOf(api.career!).find(p => p.slot === 1)?.name).toBe('A'.repeat(24));
  });

  it('ignores damaged and old plan metadata without discarding the earned career', () => {
    const c = fixture();
    expect(matchPlansOf(c)).toEqual([]); expect(applyMatchPlan(c, 0)).toBe(c);
    const valid = matchPlansOf(saveMatchPlan(c, 0, 'Saved'))[0];
    const broken: unknown[] = [null, {}, { ...valid, version: 2 }, { ...valid, slot: 3 },
      { ...valid, formationIndex: 999 }, { ...valid, mentality: 'unknown' }, { ...valid, name: 5 },
      { ...valid, xiIds: [7] }, { ...valid, xiIds: [] }, { ...valid, xiDuties: [] },
      { ...valid, xiDuties: FORMATIONS[valid.formationIndex].slots.map(() => 'poacher') },
      { ...valid, setPieces: null }, { ...valid, setPieces: {} }, { ...valid, shootoutOrder: [7] },
      { ...valid, shootoutOrder: [valid.xiIds[0], valid.xiIds[0]] }];
    for (const value of broken) {
      const damaged = { ...c, matchPlans: [value] } as CareerState;
      expect(matchPlansOf(damaged)).toEqual([]); expect(previewMatchPlan(damaged, 0)).toBeNull();
      expect(applyMatchPlan(damaged, 0)).toBe(damaged);
      expect(saveCareer(damaged)).toBe(true);
      const loaded = loadCareer()!;
      expect(loaded.clubName).toBe(c.clubName); expect(loaded.squad.map(p => p.id)).toEqual(c.squad.map(p => p.id));
      expect(loaded.budget).toBe(c.budget); expect(matchPlansOf(loaded)).toEqual([]);
    }
    expect(matchPlansOf({ ...c, matchPlans: [valid, valid] })).toHaveLength(1);
  });

  it('refuses another club or era and keeps valid plans across the same clubs next season', () => {
    const saved = saveMatchPlan(fixture(), 0, 'First XI');
    const foreign = { ...saved, clubName: 'Barcelona' }, otherEra = { ...saved, eraId: '2010-11' };
    for (const c of [foreign, otherEra]) {
      expect(matchPlansOf(c)).toEqual([]); expect(previewMatchPlan(c, 0)).toBeNull();
      expect(applyMatchPlan(c, 0)).toBe(c);
    }
    const next = startNextSeason(saved);
    expect(matchPlansOf(next)).toEqual(matchPlansOf(saved));
    const moved = startNextSeason(saved, 'Barcelona');
    expect(moved.clubName).toBe('Barcelona'); expect(matchPlansOf(moved)).toEqual([]);
    expect(applyMatchPlan(moved, 0)).toBe(moved);
    const replacement = saveMatchPlan(moved, 0, 'New club');
    expect(matchPlansOf(replacement)).toHaveLength(1); expect(matchPlansOf(replacement)[0].clubName).toBe('Barcelona');
  });

  it('drops departed or loaned taker assignments while keeping the saved request for honest previews', () => {
    const saved = saveMatchPlan(fixture(), 0, 'First XI'), plan = clone(matchPlansOf(saved)[0]);
    const gone = plan.setPieces.captain!, loaned = plan.setPieces.cornersLeft!;
    const c = { ...saved, squad: saved.squad.filter(p => p.id !== gone).map(p => p.id === loaned ? { ...p, onLoan: true } : p) };
    const applied = applyMatchPlan(c, 0);
    expect(applied.setPieces!.captain).toBeNull(); expect(applied.setPieces!.cornersLeft).toBeNull();
    expect(applied.setPieces!.cornersRight).toBe(plan.setPieces.cornersRight);
    expect(applied.shootoutOrder).toEqual(plan.shootoutOrder.filter(id => id !== gone));
    expect(matchPlansOf(applied)[0]).toEqual(plan);
    const loaded = (saveCareer(applied), loadCareer()!);
    expect(loaded.setPieces!.captain).not.toBe(gone); expect(loaded.setPieces!.cornersLeft).not.toBe(loaned);
    expect(matchPlansOf(loaded)[0]).toEqual(plan);
  });

  it('blocks saved plan actions during a live match a sack or a stale manager slot', async () => {
    const saved = saveMatchPlan(fixture(), 0, 'First XI');
    const live = playNextEntry(saved).state;
    expect(live.live).toBeTruthy();
    for (const c of [live, { ...saved, sacked: true }, { ...saved, wilderness: { weeksOut: 1, formerClub: saved.clubName, offers: [], seen: [] } }]) {
      expect(canEditMatchPlans(c)).toBe(false);
      expect(saveMatchPlan(c, 1, 'Blocked')).toBe(c); expect(applyMatchPlan(c, 0)).toBe(c); expect(deleteMatchPlan(c, 0)).toBe(c);
    }
    await mountCareer(saved, false);
    const beforeResume = api.career;
    act(() => { api.saveMatchPlan(1, 'Blocked'); api.applyMatchPlan(0); api.deleteMatchPlan(0); });
    expect(api.career).toBe(beforeResume);
    act(() => api.resume());
    const before = api.career, disk = localStorage.getItem(SAVE_KEY);
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ active: 2 }));
    act(() => { api.saveMatchPlan(1, 'Blocked'); api.applyMatchPlan(0); api.deleteMatchPlan(0); });
    expect(api.career).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
  });

  it('shows the worked example and current assignments then restores focus when the plan tile closes', async () => {
    await mountCareer(saveMatchPlan(fixture(), 0, 'First XI')); openPlans();
    fireEvent.click(screen.getByRole('button', { name: 'Match plan rules' }));
    expect(q('[data-cm-plan-rules]')).toHaveTextContent('shootout order');
    expect(q('[data-cm-plan-rules]')).toHaveTextContent('For example');
    fireEvent.click(q('[data-cm-plan-details]'));
    const c = api.career!;
    SET_PIECE_KEYS.forEach(key => expect(q('[data-cm-plan-assignments]')).toHaveTextContent(c.squad.find(p => p.id === c.setPieces![key])!.name));
    expect(q('[data-cm-plan-shootout]')).toHaveTextContent(c.shootoutOrder!.map(id => c.squad.find(p => p.id === id)!.name).join(', '));
    fireEvent.click(within(q('[data-cm-match-plans]')).getByRole('button', { name: 'Back' }));
    expect(q('[data-cm-match-plans]')).toBeNull(); expect(q('[data-cm-tile-btn="plans"]')).toHaveFocus();
    openPlans(); fireEvent.keyDown(q('[data-cm-match-plans]'), { key: 'Escape' });
    expect(q('[data-cm-match-plans]')).toBeNull(); expect(q('[data-cm-tile-btn="plans"]')).toHaveFocus();
    openPlans(); fireEvent.click(q('[data-cm-tile-btn="bench"]'));
    expect(q('[data-cm-match-plans]')).toBeNull(); expect(q('[data-cm-bench-list]')).not.toBeNull();
    fireEvent.click(q('[data-cm-bench]'));
    expect(q('[data-cm-hint]')).toHaveTextContent('Tap a spot on the pitch');
    openPlans(); fireEvent.click(q('[data-cm-plan-apply]'));
    expect(q('[data-cm-hint]')).not.toHaveTextContent('Tap a spot on the pitch');
    const beforeTap = clone(api.career!.xiIds);
    fireEvent.click(q('[data-cm-slot="0"]'));
    expect(api.career!.xiIds).toEqual(beforeTap);
  });

  it('reports refused actual plan clicks without success notices or clearing a pending bench selection', async () => {
    await mountCareer(saveMatchPlan(fixture(), 0, 'First XI'));
    act(() => api.setMentality('defensive'));
    fireEvent.click(q('[data-cm-tile-btn="bench"]'));
    fireEvent.click(q('[data-cm-bench]'));
    expect(q('[data-cm-hint]')).toHaveTextContent('Tap a spot on the pitch');
    openPlans();
    fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), { target: { value: 'Changed name' } });
    const career = api.career, disk = localStorage.getItem(SAVE_KEY);
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ active: 2 }));
    random.mockClear();
    for (const selector of ['[data-cm-plan-apply]', '[data-cm-plan-save]', '[data-cm-plan-delete]']) {
      fireEvent.click(q(selector));
      expect(q('[data-cm-hint]')).toHaveTextContent('Tap a spot on the pitch');
      expect(q('[data-cm-plan-notice]')).toHaveTextContent('Reopen your active manager save and try again.');
      expect(q('[data-cm-plan-notice]')).toHaveAttribute('role', 'alert');
      expect(q('[data-cm-plan-notice]')).not.toHaveTextContent(/Saved |Applied |Removed /);
      expect(api.career).toBe(career); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
    }
    expect(random).not.toHaveBeenCalled();
    expect(api.saveFailed).toBe(false);
  });

  it('reveals the actual plan action row after opening and selecting a saved setup', async () => {
    let career = saveMatchPlan(fixture(), 0, 'First XI');
    career = saveMatchPlan({ ...career, mentality: 'defensive' }, 1, 'Rotation');
    await mountCareer(career);
    const saved = localStorage.getItem(SAVE_KEY);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000, bottom: 2044, height: 44, left: 0, right: 300, width: 300, x: 0, y: 2000, toJSON: () => ({}) } as DOMRect);
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function () { scrolled.push(this); };
    const hitTest = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [] });
    try {
      openPlans();
      expect(scrolled).toContain(q('[data-cm-plan-actions]'));
      scrolled.length = 0;
      fireEvent.click(q('[data-cm-plan-slot="1"]'));
      expect(scrolled).toContain(q('[data-cm-plan-actions]'));
      expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    } finally {
      if (hitTest) Object.defineProperty(document, 'elementsFromPoint', hitTest);
      else Reflect.deleteProperty(document, 'elementsFromPoint');
    }
  });
});
