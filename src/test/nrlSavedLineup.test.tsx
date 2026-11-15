import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlSavedMatchPlanPreview, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlInjuries, nrlNextRound, nrlSavedLineupPreview, nrlStarterOptions, NRL_ROLES, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const start = () => createNrlCareer('storm', 4);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const save = (state: NrlCareerState) => reduceNrlCareer(state, {
  type: 'saveLineup', year: state.season.year, clubId: state.season.clubId,
});
const apply = (state: NrlCareerState, previewKey: string) => reduceNrlCareer(state, { type: 'applySavedLineup', previewKey });
const selection = ({ lineup, bench, kickerId }: NrlCareerState['season']) => ({ lineup, bench, kickerId });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function open(saveBytes: string) {
  localStorage.setItem(NRL_SAVE_KEY, saveBytes);
  localStorage.setItem(fence, '4');
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  click('Squad');
  return view;
}

function desk() {
  const summary = screen.getByText('Saved lineup', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  return within(details);
}

function rearrange(state: NrlCareerState) {
  const alternate = state.season.squad.find(player => player.role === 'Halfback' && player.id !== state.season.lineup.Halfback)!;
  const changed = reduceNrlCareer(state, { type: 'selectStarter', role: 'Halfback', playerId: alternate.id });
  return reduceNrlCareer(changed, { type: 'selectBench', slot: 0, playerId: changed.season.bench![1] });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL saved lineup', () => {
  it('saves and previews a match plan, then restores both settings in one write after reload', async () => {
    const opening = createNrlCareer('bears', 3, 2027);
    const frame = { year: 2027, clubId: 'bears', round: 1 } as const;
    const set = (state: NrlCareerState) => reduceNrlCareer(reduceNrlCareer(state, {
      type: 'setAttackPlan', ...frame, attackPlan: 'counter',
    }), { type: 'setKickingPlan', ...frame, plan: 'contest' });
    const first = open(bytes(set(opening)));
    const panel = desk();
    fireEvent.click(panel.getByRole('button', { name: 'Save current match plan' }));
    const saved = readNrlCareerSave(raw())!;
    expect(saved.savedMatchPlans?.first).toEqual({ attackPlan: 'counter', kickingPlan: 'contest' });
    expect(localStorage.getItem(fence)).toBe('5');
    expect(panel.getByRole('button', { name: 'Apply saved match plan' })).toBeDisabled();
    click('Match centre');
    fireEvent.click(screen.getByText('Attack plan: Counter opponent'));
    fireEvent.click(await screen.findByRole('button', { name: 'Standard' }));
    fireEvent.click(screen.getByText('Last-tackle kicks · Contest kicks'));
    click('Mixed kicks');
    const ordinary = readNrlCareerSave(raw())!;
    expect(ordinary.season.attackPlan).toBeUndefined();
    expect(ordinary.season.kickingPlan).toBeUndefined();
    expect(localStorage.getItem(fence)).toBe('7');
    first.unmount();

    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    click('Squad');
    const preview = desk();
    expect(preview.getByText(/Standard → Counter opponent/)).toBeVisible();
    expect(preview.getByText(/Mixed kicks → Contest kicks/)).toBeVisible();
    expect(raw()).toBe(bytes(ordinary));
    expect(localStorage.getItem(fence)).toBe('7');
    fireEvent.click(preview.getByRole('button', { name: 'Apply saved match plan' }));
    const applied = nrlSavedMatchPlanPreview(ordinary, 'first')!.next;
    expect(raw()).toBe(bytes(applied));
    expect(localStorage.getItem(fence)).toBe('8');
    expect(preview.getByText('Saved lineup', { exact: true })).toHaveFocus();
    click('Match centre');
    click('Quick Sim');
    expect(raw()).toBe(bytes(advance(applied)));
    expect(localStorage.getItem(fence)).toBe('9');
    expect(screen.getByText(/Last-tackle kicks: Contest kicks/)).toBeVisible();
  });

  it('refuses to apply a preview after another tab advances the save', () => {
    const initial = start();
    const frame = { year: 2026, clubId: 'storm', round: 1 } as const;
    const territory = reduceNrlCareer(initial, { type: 'setKickingPlan', ...frame, plan: 'territory' });
    const saved = reduceNrlCareer(territory, { type: 'saveMatchPlan', ...frame, slot: 'first' });
    const prepared = { ...saved, season: initial.season };
    open(bytes(prepared));
    const panel = desk();
    const elsewhere = bytes(advance(prepared));
    localStorage.setItem(NRL_SAVE_KEY, elsewhere);
    localStorage.setItem(fence, '5');
    fireEvent.click(panel.getByRole('button', { name: 'Apply saved match plan' }));
    expect(raw()).toBe(elsewhere);
    expect(localStorage.getItem(fence)).toBe('5');
    expect(screen.getByText(/this season changed in another tab/i)).toBeVisible();
  });

  it('books and cancels a future rotation in Squad, then uses the edited team for only that match', () => {
    const first = save(start());
    const rotation = reduceNrlCareer(rearrange(first), { type: 'saveLineup', year: 2026, clubId: 'storm', slot: 'rotation' });
    const initial = apply(rotation, nrlSavedLineupPreview(rotation.season, first.savedLineup!)!.key);
    const read = () => readNrlCareerSave(raw())!;
    const view = open(bytes(initial));
    const selection = desk();
    const choose = () => {
      fireEvent.click(selection.getByRole('button', { name: 'Rotation' }));
      const picker = selection.getByLabelText('Fixture for saved rotation');
      expect(within(picker).queryByRole('option', { name: /Round 21/ })).toBeNull();
      fireEvent.change(picker, { target: { value: '2' } });
    };
    const book = () => fireEvent.click(selection.getByRole('button', { name: 'Schedule saved rotation' }));
    choose();
    expect(raw()).toBe(bytes(initial));
    book();
    expect(read().scheduledRotation?.fixture.round).toBe(2);
    expect(selection.getByText(/Round 2 .* Rotation scheduled\./)).toBeVisible();
    fireEvent.click(selection.getByRole('button', { name: 'Cancel scheduled rotation' }));
    expect(raw()).toBe(bytes(initial));
    choose();
    book();
    const planned = raw();

    view.unmount();
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    click('Squad');
    expect(desk().getByText(/Round 2 .* Rotation scheduled\./)).toBeVisible();
    expect(raw()).toBe(planned);
    click('Match centre');
    click('Quick Sim');
    expect(screen.getByText(/Saved rotation is active/)).toBeVisible();
    expect(read().season.lineup.Halfback).toBe(rotation.savedRotationLineup!.lineup.Halfback);
    const usual = read().scheduledRotation!.returnLineup!;
    click('Squad');
    const neighbour = nrlStarterOptions(read().season, 'Left Centre').find(player => player.id !== read().season.lineup['Left Centre'])!;
    fireEvent.change(screen.getByLabelText('Left Centre'), { target: { value: neighbour.id } });
    click('Match centre');
    click('Quick Sim');
    const result = read().season.results.find(match => match.round === 2 && match.playerScoring)!;
    expect(result.playerScoring?.starters[NRL_ROLES.indexOf('Left Centre')]).toBe(neighbour.id);
    expect(result.playerScoring?.starters[NRL_ROLES.indexOf('Halfback')]).toBe(rotation.savedRotationLineup!.lineup.Halfback);
    expect(read().season.lineup['Left Centre']).toBe(usual.lineup['Left Centre']);
    expect(read().season.lineup.Halfback).toBe(usual.lineup.Halfback);
    expect(read().scheduledRotation).toBeUndefined();
    expect(screen.queryByText(/Saved rotation is active/)).toBeNull();
  });

  it('captures one exact selection and applies it without restoring tactics or preparation', () => {
    const original = start();
    const selected = reduceNrlCareer(original, { type: 'setKicker', playerId: original.season.lineup.Fullback });
    const saved = save(selected);
    expect(saved.savedLineup).toEqual({ year: 2026, ...selection(selected.season) });
    expect(saved.season).toBe(selected.season);
    expect(save(saved)).toBe(saved);
    expect(bytes(readNrlCareerSave(bytes(saved)))).toBe(bytes(saved));

    const rearranged = rearrange(saved);
    const changeKicker = reduceNrlCareer(rearranged, { type: 'setKicker', playerId: rearranged.season.lineup.Halfback });
    const attack = reduceNrlCareer(changeKicker, { type: 'setTactic', tactic: 'attack' });
    const before = reduceNrlCareer(attack, { type: 'prepare', choice: 'recover' });
    const beforeBytes = bytes(before);
    const preview = nrlSavedLineupPreview(before.season, before.savedLineup!)!;
    expect(selection(preview.next)).toEqual(selection(selected.season));
    expect(preview.changes).toHaveLength(1);
    expect(preview.benchChanged).toBe(true);
    expect(bytes(before)).toBe(beforeBytes);
    const stale = reduceNrlCareer(before, { type: 'setKicker', playerId: before.season.lineup.Fullback });
    expect(apply(stale, preview.key)).toBe(stale);
    const applied = apply(before, preview.key);
    expect(applied.season).toEqual({ ...before.season, ...selection(selected.season) });
    expect(applied.finance).toBe(before.finance);
    expect(applied.players).toBe(before.players);
    expect(applied.savedLineup).toBe(saved.savedLineup);
    expect(apply(applied, preview.key)).toBe(applied);
    const replaced = save(before);
    expect(replaced.savedLineup).toEqual({ year: 2026, ...selection(before.season) });
  });

  it('repairs a genuine injured starter and restores the saved starter and kicker after recovery', () => {
    const original = createNrlCareer('broncos', 16);
    const victim = original.season.lineup['Prop 10'];
    const selected = reduceNrlCareer(original, { type: 'setKicker', playerId: victim });
    const saved = save(selected);
    const injured = advance(saved);
    expect(nrlInjuries(injured.season).has(victim)).toBe(true);
    const preview = nrlSavedLineupPreview(injured.season, injured.savedLineup!)!;
    expect(preview.replacements).toBeGreaterThan(0);
    expect(preview.next.lineup['Prop 10']).not.toBe(victim);
    expect(preview.next.kickerId).toBe(preview.next.lineup.Halfback);
    expect(new Set([...Object.values(preview.next.lineup), ...preview.next.bench!]).size).toBe(19);
    expect(preview.next.bench).not.toContain(victim);
    expect(injured.savedLineup?.lineup['Prop 10']).toBe(victim);

    let healthy = injured;
    for (let round = 0; round < 10 && (nrlInjuries(healthy.season).has(victim) || !nrlNextRound(healthy.season).clubMatch); round++) {
      healthy = advance(healthy);
    }
    const returned = nrlSavedLineupPreview(healthy.season, healthy.savedLineup!)!;
    expect(returned.next.lineup['Prop 10']).toBe(victim);
    expect(returned.next.kickerId).toBe(victim);
    expect(apply(healthy, returned.key).season.kickerId).toBe(victim);
  });

  it('refuses a stale repair even when current and saved selections are equal', () => {
    const start = createNrlCareer('broncos', 16);
    const victim = start.season.lineup['Prop 10'];
    const injured = rearrange(advance(save(start)));
    const preview = nrlSavedLineupPreview(injured.season, injured.savedLineup!)!;
    expect(preview.changed).toBe(true);
    expect(preview.next.lineup['Prop 10']).not.toBe(victim);
    const alternative = {
      ...injured,
      season: { ...injured.season, results: injured.season.results.map(match =>
        match.injury?.playerId === victim ? { ...match, injury: undefined } : match) },
    };
    expect(bytes(readNrlCareerSave(bytes(alternative)))).toBe(bytes(alternative));
    expect(selection(alternative.season)).toEqual(selection(injured.season));
    expect(alternative.savedLineup).toBe(injured.savedLineup);
    const updated = nrlSavedLineupPreview(alternative.season, alternative.savedLineup!)!;
    expect(updated.next.lineup['Prop 10']).toBe(victim);
    expect(apply(alternative, preview.key)).toBe(alternative);
    expect(apply(alternative, updated.key).season.lineup['Prop 10']).toBe(victim);
  });

  it('preserves default and legacy bytes and drops the selection at either kind of rollover', () => {
    const original = start();
    expect(original.savedLineup).toBeUndefined();
    expect(bytes(readNrlCareerSave(bytes(original)))).toBe(bytes(original));
    const saved = save(original);
    const live = reduceNrlCareer(saved, { type: 'startLive' });
    expect(save(live)).toBe(live);
    expect(nrlSavedLineupPreview(live.season, saved.savedLineup!)).toBeNull();
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(save(bye)).toBe(bye);
    const legacyRaw = bytes(createNrlSeason('storm', 4));
    const legacy = readNrlCareerSave(legacyRaw)!;
    expect(save(legacy)).toBe(legacy);
    const view = open(legacyRaw);
    expect(screen.queryByText('Saved lineup', { exact: true })).not.toBeInTheDocument();
    expect(raw()).toBe(legacyRaw);
    view.unmount();

    let defaultYear = original;
    let savedYear = saved;
    while (defaultYear.season.phase !== 'complete') {
      defaultYear = advance(defaultYear);
      savedYear = advance(savedYear);
      expect(savedYear.season).toEqual(defaultYear.season);
    }
    expect(save(savedYear)).toBe(savedYear);
    expect(save({ ...savedYear, retired: true })).toEqual({ ...savedYear, retired: true });
    for (const move of [undefined, { fromYear: 2026, clubId: 'bears' }]) {
      const rollover = { type: 'startNextSeason', move } as const;
      expect(bytes(reduceNrlCareer(savedYear, rollover))).toBe(bytes(reduceNrlCareer(defaultYear, rollover)));
    }
  });

  it('rejects forged member IDs, duplicates, kicker and year', () => {
    const state = save(start());
    const saved = state.savedLineup!;
    const tryRead = (savedLineup: unknown) => readNrlCareerSave(bytes({ ...state, savedLineup }));
    expect(tryRead({ ...saved, year: 2027 })).toBeNull();
    expect(tryRead({ ...saved, lineup: { ...saved.lineup, Fullback: 'unknown' } })).toBeNull();
    expect(tryRead({ ...saved, lineup: { ...saved.lineup, Fullback: saved.lineup.Halfback } })).toBeNull();
    expect(tryRead({ ...saved, bench: [...saved.bench.slice(0, 5), saved.lineup.Fullback] })).toBeNull();
    expect(tryRead({ ...saved, kickerId: saved.bench[0] })).toBeNull();
    expect(tryRead({ ...saved, bench: saved.bench.slice(0, 5) })).toBeNull();
  });

  it('previews manual changes without a write and applies after reload in the mounted Squad screen', () => {
    const original = start();
    const view = open(bytes(original));
    const controls = desk();
    expect(raw()).toBe(bytes(original));
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(controls.getByRole('button', { name: 'Save this lineup' }));
    const saved = save(original);
    expect(raw()).toBe(bytes(saved));
    view.unmount();

    const changed = rearrange(saved);
    open(bytes(changed));
    const preview = desk();
    expect(preview.getByText('Halfback', { exact: true })).toBeVisible();
    expect(preview.getByText(/bench order changes/i)).toBeVisible();
    expect(raw()).toBe(bytes(changed));
    fireEvent.click(preview.getByRole('button', { name: 'Apply saved lineup' }));
    const applied = readNrlCareerSave(raw())!;
    expect(selection(applied.season)).toEqual(selection(original.season));
    expect(applied.savedLineup).toEqual(saved.savedLineup);
    expect(preview.getByRole('button', { name: 'Apply saved lineup' })).toBeDisabled();
  });

  it('uses the same save fence and quota retry as the manual lineup', () => {
    const changed = rearrange(save(start()));
    const view = open(bytes(changed));
    const stale = desk();
    const newer = bytes(advance(changed));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    fireEvent.click(stale.getByRole('button', { name: 'Apply saved lineup' }));
    expect(raw()).toBe(newer);
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
    view.unmount();

    open(bytes(changed));
    const pending = desk();
    const setItem = Storage.prototype.setItem;
    const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    fireEvent.click(pending.getByRole('button', { name: 'Apply saved lineup' }));
    expect(raw()).toBe(bytes(changed));
    expect(localStorage.getItem(fence)).toBe('4');
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    full.mockRestore();
    click('Retry save');
    expect(selection(readNrlCareerSave(raw())!.season)).toEqual(selection(start().season));
    expect(localStorage.getItem(fence)).toBe('5');
  });
});
