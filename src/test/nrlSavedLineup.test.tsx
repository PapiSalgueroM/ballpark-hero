import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlInjuries, nrlNextRound, nrlSavedLineupPreview, NRL_SAVE_KEY } from '@/lib/nrlManager';
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
