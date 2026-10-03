import { useState } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaffScreen } from '@/components/club-manager/StaffScreen';
import styles from '@/components/club-manager/StaffScreen.module.css';
import { moneyIn, type CareerState } from '@/lib/clubManager';
import {
  hireStaff, matchStaffOffer, releaseToPoacher, sackStaff, severanceFor,
  STAFF_POST_IDS, STAFF_POST_INFO, staffEffectLine, staffOf, staffPayrollWeekly, staffShortlist,
  type StaffPostId,
} from '@/lib/clubManagerStaff';

function fixture(vacant: StaffPostId | null = null, poached: StaffPostId | null = null): CareerState {
  const state = { clubName: 'Fixture Staff Club', season: 3, week: 8, budget: 50, aiHeadlines: [], academy: { coaching: 12 }, squad: [] } as unknown as CareerState;
  state.staff = { ...staffOf(state), ...(vacant ? { [vacant]: null } : {}), poach: poached ? { postId: poached, club: 'Fixture Rival Club', weeksLeft: 2 } : null };
  return state;
}

const callbacks = () => ({ onHire: vi.fn(), onSack: vi.fn(), onMatch: vi.fn(), onLetGo: vi.fn() });
const post = (container: HTMLElement, id: StaffPostId) => container.querySelector<HTMLDivElement>(`[data-staff-post="${id}"]`)!;
const shortlist = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-staff-shortlist]')!;
const candidates = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-staff-candidate]')];
const open = (container: HTMLElement, id: StaffPostId) => fireEvent.click(within(post(container, id)).getByRole('button', { name: 'Find one' }));

function CommittingStaff({ initial, calls, observe }: { initial: CareerState; calls: ReturnType<typeof callbacks>; observe?: (state: CareerState) => void }) {
  const [state, setState] = useState(initial);
  observe?.(state);
  const commit = (next: CareerState | null) => { if (next) setState(next); };
  return <><button onClick={() => setState(previous => ({ ...previous, staff: { ...staffOf(previous) } }))}>Clone fixture state</button><StaffScreen career={state}
    onHire={(id, candidateId) => { calls.onHire(id, candidateId); commit(hireStaff(state, id, candidateId)); }}
    onSack={id => { calls.onSack(id); commit(sackStaff(state, id)); }}
    onMatch={() => { calls.onMatch(); commit(matchStaffOffer(state)); }}
    onLetGo={() => { calls.onLetGo(); commit(releaseToPoacher(state)); }}
  /></>;
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Club Manager staff decision desk', () => {
  it('shows generated posts in engine order and restored staff without feedback', () => {
    const state = fixture();
    const calls = callbacks();
    const view = render(<StaffScreen career={state} {...calls} />);
    expect([...view.container.querySelectorAll<HTMLElement>('[data-staff-post]')].map(row => row.dataset.staffPost)).toEqual(STAFF_POST_IDS);
    for (const id of STAFF_POST_IDS) {
      expect(post(view.container, id)).toHaveTextContent(staffOf(state)[id]!.name);
      expect(post(view.container, id)).toHaveTextContent(staffEffectLine(state, id));
      expect(post(view.container, id)).not.toHaveAttribute('data-staff-feedback');
    }
    view.rerender(<StaffScreen career={{ ...state, staff: { ...staffOf(state) } }} {...calls} />);
    expect(view.queryByRole('status')).toBeNull();
    Object.values(calls).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });

  it('says how many of his players already grow at the ceiling, and counts nobody else', () => {
    /* Round 963: a lift inside developmentRate's clamp adds nothing to a kid already on it. */
    const state = fixture();
    const flyer = { id: 'flyer', name: 'Fixture Flyer', position: 'ST', rating: 60, potential: 80, age: 19, apps: 34 } as unknown as CareerState['squad'][number];
    const slow = { ...flyer, id: 'slow', name: 'Fixture Slow', position: 'CB', apps: 0, potential: 62 };
    const s = staffOf(state);
    state.squad = [flyer, slow];
    state.staff = { ...s, attack: { ...s.attack!, level: 10, potential: 10 }, defence: { ...s.defence!, level: 10, potential: 10 } };
    const view = render(<StaffScreen career={state} {...callbacks()} />);
    expect(post(view.container, 'attack')).toHaveTextContent(`${staffEffectLine(state, 'attack')} One of his players is already growing as fast as anyone can, so he cannot add more there.`);
    expect(post(view.container, 'defence')).toHaveTextContent(staffEffectLine(state, 'defence'));
    expect(post(view.container, 'defence')).not.toHaveTextContent('as fast as anyone can');
  });

  it('previews the original shortlist IDs, exact fees, payroll and helper effects without writes', () => {
    const state = fixture('attack');
    const before = JSON.stringify(state);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const calls = callbacks();
    const view = render(<StaffScreen career={state} {...calls} />);
    open(view.container, 'attack');
    const list = staffShortlist(state, 'attack');
    expect(candidates(view.container).map(row => row.dataset.staffCandidate)).toEqual(list.map(candidate => candidate.person.id));
    list.forEach((candidate, index) => {
      const next = hireStaff(state, 'attack', candidate.person.id)!;
      const row = candidates(view.container)[index];
      expect(row).toHaveTextContent(candidate.person.name);
      expect(row).toHaveTextContent(`${candidate.person.wage}k a week`);
      expect(row).toHaveTextContent(candidate.from);
      expect(row).toHaveTextContent(`After: ${staffPayrollWeekly(next)}k a week on staff. ${staffEffectLine(next, 'attack')}`);
      expect(within(row).getByRole('button')).toHaveTextContent(candidate.fee > 0 ? `Hire ${moneyIn(state)(candidate.fee)}` : 'Promote');
    });
    fireEvent.click(within(post(view.container, 'attack')).getByRole('button', { name: 'Close' }));
    expect(JSON.stringify(state)).toBe(before);
    expect(write).not.toHaveBeenCalled();
    Object.values(calls).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });

  it('keeps a refused hire open with the same rows and focused original candidate button', () => {
    const state = fixture('defence');
    const calls = callbacks();
    const view = render(<StaffScreen career={state} {...calls} />);
    open(view.container, 'defence');
    const original = candidates(view.container);
    const button = within(original[1]).getByRole('button');
    button.focus();
    fireEvent.click(button);
    expect(calls.onHire).toHaveBeenCalledExactlyOnceWith('defence', staffShortlist(state, 'defence')[1].person.id);
    expect(shortlist(view.container)).toBeVisible();
    expect(button).toHaveFocus();
    original.forEach((row, index) => expect(candidates(view.container)[index]).toBe(row));
    expect(view.queryByRole('status')).toBeNull();
    const restored = hireStaff(state, 'defence', staffShortlist(state, 'defence')[1].person.id)!;
    view.rerender(<StaffScreen career={restored} {...calls} />);
    expect(post(view.container, 'defence')).not.toHaveAttribute('data-staff-feedback');
  });

  it('commits the exact paid hire and focuses its stable post with finite clone-safe feedback', () => {
    vi.useFakeTimers();
    const initial = fixture('attack');
    const expected = hireStaff(initial, 'attack', staffShortlist(initial, 'attack')[2].person.id)!;
    let observed = initial;
    const calls = callbacks();
    const view = render(<CommittingStaff initial={initial} calls={calls} observe={state => { observed = state; }} />);
    const originalPost = post(view.container, 'attack');
    open(view.container, 'attack');
    fireEvent.click(within(candidates(view.container)[2]).getByRole('button'));
    expect(calls.onHire).toHaveBeenCalledExactlyOnceWith('attack', staffShortlist(initial, 'attack')[2].person.id);
    expect(observed).toEqual(expected);
    expect(shortlist(view.container)).toBeNull();
    expect(post(view.container, 'attack')).toBe(originalPost);
    expect(originalPost).toHaveFocus();
    const cue = view.getByRole('status');
    expect(cue).toHaveTextContent('Staff member hired.');
    expect(cue).toHaveClass(styles.committed);
    fireEvent.click(view.getByRole('button', { name: 'Clone fixture state' }));
    expect(view.getByRole('status')).toBe(cue);
    act(() => vi.advanceTimersByTime(501));
    expect(view.queryByRole('status')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Clone fixture state' }));
    expect(view.queryByRole('status')).toBeNull();
  });

  it('promotes only the existing last academy candidate with zero fee and exact engine effects', () => {
    const initial = fixture('scout');
    initial.budget = 0;
    const list = staffShortlist(initial, 'scout');
    const expected = hireStaff(initial, 'scout', list[3].person.id)!;
    let observed = initial;
    const calls = callbacks();
    const view = render(<CommittingStaff initial={initial} calls={calls} observe={state => { observed = state; }} />);
    open(view.container, 'scout');
    candidates(view.container).slice(0, 3).forEach(row => expect(within(row).getByRole('button')).toBeDisabled());
    fireEvent.click(within(candidates(view.container)[3]).getByRole('button', { name: 'Promote' }));
    expect(calls.onHire).toHaveBeenCalledExactlyOnceWith('scout', list[3].person.id);
    expect(observed).toEqual(expected);
    expect(observed.budget).toBe(0);
    expect(staffOf(observed).scout!.academy).toBe(true);
    expect(post(view.container, 'scout')).toHaveFocus();
    expect(view.getByRole('status')).toHaveTextContent('Academy staff member promoted.');
  });

  it('requires a separate payoff confirmation and shows the exact pure cost, payroll and lost effect', () => {
    const initial = fixture(null, 'attack');
    const before = JSON.stringify(initial);
    const expected = sackStaff(initial, 'attack')!;
    const calls = callbacks();
    const view = render(<StaffScreen career={initial} {...calls} />);
    const button = within(post(view.container, 'attack')).getByRole('button', { name: /^Pay off / });
    button.focus();
    fireEvent.click(button);
    expect(calls.onSack).not.toHaveBeenCalled();
    const confirmation = view.container.querySelector('[data-staff-payoff="attack"]')!;
    expect(confirmation).toHaveTextContent(`Pay off ${staffOf(initial).attack!.name} for ${moneyIn(initial)(severanceFor(initial, 'attack')!)}?`);
    expect(confirmation).toHaveTextContent(`After: ${moneyIn(initial)(expected.budget)} to spend, ${staffPayrollWeekly(expected)}k a week on staff. ${staffEffectLine(expected, 'attack')}`);
    fireEvent.click(view.getByRole('button', { name: 'Cancel payoff' }));
    expect(view.queryByRole('button', { name: 'Confirm payoff' })).toBeNull();
    expect(button).toHaveFocus();
    expect(JSON.stringify(initial)).toBe(before);
    expect(calls.onSack).not.toHaveBeenCalled();
  });

  it('commits a confirmed payoff once with the exact post, budget, ledger and removed approach', () => {
    const initial = fixture(null, 'defence');
    const expected = sackStaff(initial, 'defence')!;
    let observed = initial;
    const calls = callbacks();
    const view = render(<CommittingStaff initial={initial} calls={calls} observe={state => { observed = state; }} />);
    fireEvent.click(within(post(view.container, 'defence')).getByRole('button', { name: /^Pay off / }));
    fireEvent.click(view.getByRole('button', { name: 'Confirm payoff' }));
    expect(calls.onSack).toHaveBeenCalledExactlyOnceWith('defence');
    expect(observed).toEqual(expected);
    expect(staffOf(observed).poach).toBeNull();
    expect(view.queryByRole('button', { name: 'Confirm payoff' })).toBeNull();
    expect(post(view.container, 'defence')).toHaveFocus();
    expect(view.getByRole('status')).toHaveTextContent('Staff payoff completed.');
  });

  it('keeps no-op payoff and poaching decisions quiet and invalidates stale person confirmation', () => {
    const initial = fixture(null, 'attack');
    const calls = callbacks();
    const view = render(<StaffScreen career={initial} {...calls} />);
    fireEvent.click(within(post(view.container, 'attack')).getByRole('button', { name: /^Pay off / }));
    fireEvent.click(view.getByRole('button', { name: 'Confirm payoff' }));
    expect(view.getByRole('button', { name: 'Confirm payoff' })).toBeVisible();
    expect(calls.onSack).toHaveBeenCalledExactlyOnceWith('attack');
    fireEvent.click(view.getByRole('button', { name: /^Match it / }));
    fireEvent.click(view.getByRole('button', { name: 'Let him go' }));
    expect(calls.onMatch).toHaveBeenCalledOnce();
    expect(calls.onLetGo).toHaveBeenCalledOnce();
    expect(view.queryByRole('status')).toBeNull();
    const changed = { ...initial, staff: { ...staffOf(initial), attack: { ...staffOf(initial).attack!, id: 'fixture-replacement' } } };
    view.rerender(<StaffScreen career={changed} {...calls} />);
    expect(view.queryByRole('button', { name: 'Confirm payoff' })).toBeNull();
    view.rerender(<StaffScreen career={initial} {...calls} />);
    expect(view.queryByRole('button', { name: 'Confirm payoff' })).toBeNull();
    expect(view.queryByRole('status')).toBeNull();
  });

  it('matches and releases the approached staff member using exact pure effects and stable focus', () => {
    for (const kind of ['match', 'release'] as const) {
      const initial = fixture(null, 'goalkeeping');
      const expected = (kind === 'match' ? matchStaffOffer(initial) : releaseToPoacher(initial))!;
      let observed = initial;
      const calls = callbacks();
      const view = render(<CommittingStaff initial={initial} calls={calls} observe={state => { observed = state; }} />);
      const originalPost = post(view.container, 'goalkeeping');
      fireEvent.click(view.getByRole('button', { name: kind === 'match' ? /^Match it / : 'Let him go' }));
      expect(observed).toEqual(expected);
      expect(observed.budget).toBe(initial.budget);
      expect(view.container.querySelector('[data-staff-poach]')).toBeNull();
      expect(post(view.container, 'goalkeeping')).toBe(originalPost);
      expect(originalPost).toHaveFocus();
      expect(view.getByRole('status')).toHaveTextContent(kind === 'match' ? 'Offer matched.' : 'Staff member released.');
      expect(kind === 'match' ? calls.onMatch : calls.onLetGo).toHaveBeenCalledOnce();
      expect(kind === 'match' ? calls.onLetGo : calls.onMatch).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('retains an unrelated vacancy shortlist during a committed poaching decision', () => {
    const initial = fixture('defence', 'attack');
    const calls = callbacks();
    const view = render(<CommittingStaff initial={initial} calls={calls} />);
    open(view.container, 'defence');
    const original = candidates(view.container);
    fireEvent.click(view.getByRole('button', { name: /^Match it / }));
    expect(shortlist(view.container)).toHaveAttribute('data-staff-shortlist', 'defence');
    original.forEach((row, index) => expect(candidates(view.container)[index]).toBe(row));
    expect(post(view.container, 'attack')).toHaveFocus();
    expect(calls.onMatch).toHaveBeenCalledOnce();
    expect(calls.onHire).not.toHaveBeenCalled();
  });

  it('preserves budget and matching guards, full names, 44px actions and cleans an owned cue timer', () => {
    vi.useFakeTimers();
    const initial = fixture(null, 'attack');
    initial.budget = 0;
    initial.staff = { ...staffOf(initial), matchesLeft: 0, attack: { ...staffOf(initial).attack!, name: 'FixtureUnbrokenStaffName'.repeat(5) } };
    const calls = callbacks();
    const view = render(<StaffScreen career={initial} {...calls} />);
    expect(within(post(view.container, 'attack')).getByRole('button')).toBeDisabled();
    expect(view.getByRole('button', { name: /^Match it / })).toBeDisabled();
    expect(post(view.container, 'attack')).toHaveTextContent(staffOf(initial).attack!.name);
    expect(post(view.container, 'attack')).toHaveClass(styles.wrap);
    view.getAllByRole('button').forEach(button => expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]'));
    view.unmount();
    const committing = render(<CommittingStaff initial={fixture(null, 'attack')} calls={calls} />);
    fireEvent.click(committing.getByRole('button', { name: 'Let him go' }));
    expect(committing.getByRole('status')).toHaveClass(styles.committed);
    const clear = vi.spyOn(window, 'clearTimeout');
    committing.unmount();
    expect(clear).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(600));
  });
});
