import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlDevelopmentAssistantProgress, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlHoldableReserves } from '@/lib/nrlManager';
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

it.each([[2026, 'broncos', 9], [2027, 'bears', 8]] as const)(
  'previews the %s eighth match and earns the existing assistant point only when the reserve plays',
  (year, clubId, round) => {
    let career = reduceNrlCareer(createNrlCareer(clubId, 1, year), { type: 'hireCoach', role: 'development', year, clubId, round: 1 });
    while (career.season.round < round) career = reduceNrlCareer(career, { type: 'advance' });
    const id = 'nrl-' + clubId + '-' + year + '-26';
    const player = nrlDevelopmentAssistantProgress(career).find(candidate => candidate.id === id)!;
    expect(player.apps).toBe(7);
    const original = reduceNrlCareer(career, { type: 'selectBench', slot: 4, playerId: id });
    const baseline = JSON.stringify(original);
    const fence = fenceKeyOf(NRL_SAVE_KEY);
    localStorage.setItem(NRL_SAVE_KEY, baseline);
    localStorage.setItem(fence, '4');
    const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    show();
    const rotation = screen.getByText('Hold one reserve for later').closest('details')!;
    rotation.open = true;
    const preview = within(rotation);
    const development = preview.getByText('Development appearances', { exact: true }).closest('section')!;
    const row = () => within(development).getByText(player.name, { exact: true }).closest('li')!;
    expect(row()).toHaveTextContent('7 of 8 appearances');
    expect(row()).toHaveTextContent('Quick Sim: Not in rotation');
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(baseline);
    expect(localStorage.getItem(fence)).toBe('4');

    expect(nrlHoldableReserves(original.season).some(candidate => candidate.id === id)).toBe(true);
    fireEvent.change(preview.getByLabelText('Opening rotation'), { target: { value: id } });
    expect(row()).toHaveTextContent('Live: Held for later');
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(baseline);

    const control = reduceNrlCareer(original, { type: 'advance' });
    expect(nrlDevelopmentAssistantProgress(control).find(candidate => candidate.id === id)?.apps).toBe(7);
    expect(control.ratingReview?.assistant ?? []).not.toContain(id);
    fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
    fireEvent.change(screen.getByLabelText('Reserve 14'), { target: { value: id } });
    fireEvent.click(screen.getByRole('button', { name: 'Match centre' }));
    const nextRotation = screen.getByText('Hold one reserve for later').closest('details')!;
    nextRotation.open = true;
    const nextDevelopment = within(nextRotation).getByText('Development appearances', { exact: true }).closest('section')!;
    const nextRow = within(nextDevelopment).getByText(player.name, { exact: true }).closest('li')!;
    expect(nextRow).toHaveTextContent('Quick Sim: In rotation');
    fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
    const settled = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
    expect(nrlDevelopmentAssistantProgress(settled).find(candidate => candidate.id === id)?.apps).toBe(8);
    expect(settled.ratingReview?.assistant).toContain(id);
    expect(settled.players.find(candidate => candidate.id === id)?.rating).toBe(player.rating + 1);
  },
);
