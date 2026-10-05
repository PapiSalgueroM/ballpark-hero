/**
 * Round 964: the world editor's pure rules, and the one place the engine takes
 * an edit (startCareer). scripts/simWorldEditor.mjs plays full seasons on
 * edited worlds; this file pins the swap arithmetic and the guard rails.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  REAL_LEAGUES, leagueOf, startCareer, registerLeagueOverrides, engineRegistrations,
} from '@/lib/clubManager';
import {
  swapClubs, worldEditMoves, validWorldEdit, withWorldEdit, editedClubsOf,
  editedLeagueIdOf, realLeagueIdOf,
} from '@/lib/clubManagerWorldEdit';
import type { WorldEdit } from '@/lib/clubManagerWorldEdit';
import { render, fireEvent, cleanup, renderHook, waitFor, act } from '@testing-library/react';
import { WorldEditorScreen } from '@/components/club-manager/WorldEditorScreen';
import { useClubManager } from '@/hooks/useClubManager';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const sizeOf = (id: string) => REAL_LEAGUES.find(l => l.id === id)!.clubs.length;
const allClubs = (edit: WorldEdit | null) => REAL_LEAGUES.flatMap(l => editedClubsOf(edit, l.id));

afterEach(() => { cleanup(); registerLeagueOverrides(null); });

describe('the real world', () => {
  it('names every club in exactly one league', () => {
    const all = allClubs(null);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(300);
  });
});

describe('swapClubs', () => {
  it('swaps two clubs and keeps both leagues their size', () => {
    const e = swapClubs(null, 'Celtic', 'Brentford');
    expect(e).not.toBeNull();
    expect(Object.keys(e!).sort()).toEqual(['premier', 'scottish']);
    expect(e!.premier).toHaveLength(sizeOf('premier'));
    expect(e!.scottish).toHaveLength(sizeOf('scottish'));
    expect(editedLeagueIdOf(e, 'Celtic')).toBe('premier');
    expect(editedLeagueIdOf(e, 'Brentford')).toBe('scottish');
    expect(editedLeagueIdOf(e, 'Arsenal')).toBe('premier');
    expect(worldEditMoves(e)).toEqual([
      { club: 'Celtic', from: 'scottish', to: 'premier' },
      { club: 'Brentford', from: 'premier', to: 'scottish' },
    ]);
  });

  it('swapping the pair back is a full undo', () => {
    const e = swapClubs(null, 'Celtic', 'Brentford');
    expect(swapClubs(e, 'Brentford', 'Celtic')).toBeNull();
  });

  it('refuses two clubs of one league and unknown names, returning the same edit', () => {
    const e = swapClubs(null, 'Celtic', 'Brentford');
    expect(swapClubs(e, 'Celtic', 'Arsenal')).toBe(e);
    expect(swapClubs(e, 'Celtic', 'Nobody FC')).toBe(e);
    expect(swapClubs(null, 'Arsenal', 'Chelsea')).toBeNull();
  });

  it('keeps every size and every club once across a chain of swaps', () => {
    let e: WorldEdit | null = null;
    const pairs: [string, string][] = [
      ['Celtic', 'Brentford'], ['Rangers', 'Fulham'], ['Celtic', 'Real Madrid'], ['Ajax', 'Brentford'],
    ];
    for (const [a, b] of pairs) e = swapClubs(e, a, b);
    for (const l of REAL_LEAGUES) expect(editedClubsOf(e, l.id)).toHaveLength(l.clubs.length);
    const all = allClubs(e);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...allClubs(null)].sort());
    expect(editedLeagueIdOf(e, 'Celtic')).toBe('laliga');
    expect(editedLeagueIdOf(e, 'Real Madrid')).toBe('premier');
    expect(validWorldEdit(e)).toEqual(e);
  });
});

describe('validWorldEdit', () => {
  const good = () => swapClubs(null, 'Celtic', 'Brentford')!;
  it('rejects anything this editor could not have made', () => {
    expect(validWorldEdit(null)).toBeNull();
    expect(validWorldEdit([])).toBeNull();
    expect(validWorldEdit('premier')).toBeNull();
    expect(validWorldEdit({ nowhere: ['Celtic'] })).toBeNull();
    expect(validWorldEdit({ ...good(), premier: good().premier.slice(1) })).toBeNull();
    expect(validWorldEdit({ ...good(), scottish: good().scottish.map(c => (c === 'Rangers' ? 'Celtic' : c)) })).toBeNull();
    expect(validWorldEdit({ ...good(), scottish: good().scottish.map(c => (c === 'Rangers' ? 'Nobody FC' : c)) })).toBeNull();
    expect(validWorldEdit({ premier: good().premier })).toBeNull();
  });
  it('treats a lineup that is the real one, in any order, as no edit', () => {
    const real = REAL_LEAGUES.find(l => l.id === 'premier')!.clubs;
    expect(validWorldEdit({ premier: [...real].reverse() })).toBeNull();
  });
});

describe('withWorldEdit', () => {
  it('registers for the call and puts the old registration back, even on a throw', () => {
    const e = swapClubs(null, 'Celtic', 'Brentford');
    const before = engineRegistrations().overrides;
    expect(withWorldEdit(e, () => leagueOf('Celtic').id)).toBe('premier');
    expect(engineRegistrations().overrides).toBe(before);
    expect(leagueOf('Celtic').id).toBe('scottish');
    expect(() => withWorldEdit(e, () => { throw new Error('x'); })).toThrow('x');
    expect(leagueOf('Celtic').id).toBe('scottish');
  });
});

describe('startCareer with an edit', () => {
  it('starts in the edited league and carries the edit on the save', () => {
    const e = swapClubs(null, 'Celtic', 'Brentford');
    const s = startCareer('Celtic', undefined, undefined, undefined, undefined, e);
    expect(s.leagueOverrides).toEqual(e);
    expect(s.leagueClubs).toHaveLength(sizeOf('premier'));
    expect(s.leagueClubs).toContain('Arsenal');
    expect(s.leagueClubs).not.toContain('Brentford');
    expect(realLeagueIdOf('Celtic')).toBe('scottish');
  });
  it('starts the real world when there is no edit', () => {
    const s = startCareer('Celtic', undefined, undefined, undefined, undefined, null);
    expect(s.leagueOverrides).toBeUndefined();
    expect(s.leagueClubs).toContain('Rangers');
  });
});

describe('WorldEditorScreen', () => {
  const noop = () => {};
  it('moves a club in two taps, says what happened, lists it and resets', () => {
    let edit: WorldEdit | null = null;
    const onChange = (e: WorldEdit | null) => { edit = e; };
    const view = render(<WorldEditorScreen edit={null} onChange={onChange} onBack={noop} onDone={noop} />);
    fireEvent.click(view.getByLabelText('Move Celtic'));
    /* The club's own league is not offered as somewhere to swap into. */
    const select = view.getByLabelText('League to swap into') as HTMLSelectElement;
    expect([...select.options].map(o => o.value)).not.toContain('scottish');
    fireEvent.click(view.getByLabelText('Swap Celtic with Brentford'));
    expect(edit).toEqual(swapClubs(null, 'Celtic', 'Brentford'));
    view.rerender(<WorldEditorScreen edit={edit} onChange={onChange} onBack={noop} onDone={noop} />);
    expect(view.getByRole('status').textContent).toContain('Celtic now plays in the Premier League');
    expect(view.getByText('2 clubs moved')).toBeTruthy();
    fireEvent.click(view.getByText('See list'));
    expect(view.getByTestId('cm-world-moves').textContent).toContain('Brentford');
    expect(view.getByText('Play this world (2 moved)')).toBeTruthy();
    fireEvent.click(view.getByText('Reset'));
    expect(edit).toBeNull();
  });
  it('lets a move be cancelled before the second tap', () => {
    let calls = 0;
    const view = render(<WorldEditorScreen edit={null} onChange={() => { calls += 1; }} onBack={noop} onDone={noop} />);
    fireEvent.click(view.getByLabelText('Move Celtic'));
    fireEvent.click(view.getByText('Cancel'));
    expect(view.getByLabelText('Move Rangers')).toBeTruthy();
    expect(calls).toBe(0);
  });
});

describe('useClubManager with an edit', () => {
  it('starts the picked club on the edited world, with no network', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in this test'))));
    localStorage.clear();
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    const e = swapClubs(null, 'Celtic', 'Brentford');
    act(() => r.result.current.chooseClub('Celtic'));
    act(() => r.result.current.confirmClub(undefined, undefined, undefined, e));
    expect(r.result.current.phase).toBe('hub');
    expect(r.result.current.career?.leagueOverrides).toEqual(e);
    expect(r.result.current.career?.leagueClubs).toContain('Arsenal');
    expect(leagueOf('Celtic').id).toBe('premier');
    r.unmount();
    vi.unstubAllGlobals();
  });
});
