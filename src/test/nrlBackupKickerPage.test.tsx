import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlStarterOptions } from '@/lib/nrlManager';
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

it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
  'names the active backup and keeps the %s match credit after reload',
  (year, club) => {
    const opening = createNrlCareer(club, 1, year);
    const { season } = opening;
    const primary = season.lineup.Fullback, backup = season.lineup['Left Wing'];
    const name = season.squad.find(player => player.id === backup)!.name;
    const replacement = nrlStarterOptions(season, 'Fullback').find(player => player.id !== primary)!;
    const raw = () => localStorage.getItem(NRL_SAVE_KEY);
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(opening));
    localStorage.setItem(fenceKeyOf(NRL_SAVE_KEY), '4');
    const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    const click = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
    const first = show();
    click('Squad');
    fireEvent.change(screen.getByLabelText('Goal kicker'), { target: { value: primary } });
    const picker = screen.getByLabelText('Backup goal kicker');
    expect(Array.from((picker as HTMLSelectElement).options).some(option => option.value === primary)).toBe(false);
    fireEvent.change(picker, { target: { value: backup } });
    fireEvent.change(screen.getByLabelText('Fullback'), { target: { value: replacement.id } });
    click('Match centre');
    expect(screen.getByText('Goal kicker: ' + name + ' · Backup on duty')).toBeVisible();
    const ready = raw();
    first.unmount();
    show();
    expect(raw()).toBe(ready);
    expect(screen.getByText('Goal kicker: ' + name + ' · Backup on duty')).toBeVisible();
    click('Quick Sim');
    expect(screen.getByText('Match goal kicker: ' + name + '.')).toBeVisible();
    const saved = readNrlCareerSave(raw())!;
    const match = saved.season.results.find(result => result.homeId === club || result.awayId === club)!;
    const scoring = match.homeId === club ? match.homeScoring : match.awayScoring;
    expect(scoring.conversions + scoring.penalties).toBeGreaterThan(0);
    expect(match.playerScoring?.kickerId).toBe(backup);
    expect(match.playerScoring?.lines.find(player => player.playerId === backup)).toMatchObject({
      conversions: scoring.conversions, penalties: scoring.penalties,
    });
  },
);
