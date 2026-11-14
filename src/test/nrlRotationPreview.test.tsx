import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlBenchRotation, nrlHoldableReserves } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([[2026, 'broncos', 1, 'Quick Sim'], [2027, 'bears', 17, 'Play Live']] as const)(
  'previews engine reserve use and matches %s settlement',
  (year, club, seed, action) => {
    const career = createNrlCareer(club, seed, year);
    const baseline = JSON.stringify(career);
    const fence = fenceKeyOf(NRL_SAVE_KEY);
    localStorage.setItem(NRL_SAVE_KEY, baseline);
    localStorage.setItem(fence, '4');
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);

    const details = screen.getByText('Hold one reserve for later').closest('details')!;
    details.open = true;
    const preview = within(details);
    const normal = nrlBenchRotation(career.season);
    expect(normal.size).toBe(4);
    const ids = (list: string) => within(preview.getByRole('list', { name: list })).queryAllByRole('listitem')
      .map(row => row.getAttribute('data-nrl-rotation-reserve'));
    const expected = (rotation: ReturnType<typeof nrlBenchRotation>) => [...rotation.values()].map(player => player.id);
    expect(ids('Quick Sim rotation')).toEqual(expected(normal));
    expect(preview.queryByRole('list', { name: 'Live opening rotation' })).toBeNull();

    const held = nrlHoldableReserves(career.season).find(player => expected(normal).includes(player.id))!;
    const live = nrlBenchRotation(career.season, held.id);
    fireEvent.change(preview.getByLabelText('Opening rotation'), { target: { value: held.id } });
    expect(ids('Quick Sim rotation')).toEqual(expected(normal));
    expect(ids('Live opening rotation')).toEqual(expected(live));
    expect(live.size).toBe(3);
    expect(expected(live)).not.toContain(held.id);
    const first = within(preview.getByRole('list', { name: 'Live opening rotation' })).getAllByRole('listitem')[0];
    const [starterId, reserve] = [...live.entries()][0];
    expect(first).toHaveTextContent(career.season.squad.find(player => player.id === starterId)!.name);
    expect(first).toHaveTextContent(reserve.name);
    expect(preview.getByText('Held for later: ' + held.name)).toBeVisible();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(baseline);
    expect(localStorage.getItem(fence)).toBe('4');

    const shown = ids(action === 'Quick Sim' ? 'Quick Sim rotation' : 'Live opening rotation');
    fireEvent.click(screen.getByRole('button', { name: action }));
    if (action === 'Play Live') {
      const paused = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
      expect(paused.season.live?.heldReserveId).toBe(held.id);
      expect(screen.queryByText('Hold one reserve for later')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Play second half' }));
    }
    const result = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))?.season.results
      .find(match => match.homeId === club || match.awayId === club);
    expect(result?.benchUsed).toEqual(shown);
  },
);
