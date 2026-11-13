import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const open = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const save = () => readNrlCareerSave(raw())!;

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); saveFence.release(NRL_SAVE_KEY); });

describe('State of Origin in the Club office', () => {
  it('starts on demand, saves selections and scores, and resumes without advancing the club', () => {
    const initial = createNrlCareer('broncos', 16);
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(initial));
    const view = open();
    click('Club office');
    click('State of Origin');
    expect(raw()).toBe(JSON.stringify(initial));
    expect(screen.getByText(/Accor Stadium, Sydney/)).toBeVisible();
    click('Coach Queensland Maroons');
    expect(save().origin?.side).toBe('qld');
    expect(save().season).toEqual(initial.season);
    fireEvent.click(screen.getByText('Select your matchday 19'));
    const fullback = screen.getByRole('combobox', { name: 'Fullback' });
    const candidate = within(fullback).getAllByRole('option').find(option => (option as HTMLOptionElement).value !== (fullback as HTMLSelectElement).value)!;
    fireEvent.change(fullback, { target: { value: (candidate as HTMLOptionElement).value } });
    expect(save().origin?.selection.starters.Fullback).toBe((candidate as HTMLOptionElement).value);
    fireEvent.change(screen.getByRole('combobox', { name: 'Origin tactic' }), { target: { value: 'attack' } });
    click('Simulate Origin Game 1');
    const afterFirst = raw();
    expect(save().origin?.matches[0]).toMatchObject({ tactic: 'attack' });
    expect(save().season).toEqual(initial.season);
    view.unmount();

    open();
    click('Club office');
    expect(raw()).toBe(afterFirst);
    click('Simulate Origin Game 2');
    click('Simulate Origin Game 3');
    expect(screen.getByText(/win the 2026 series/)).toBeVisible();
    expect(save().origin?.matches).toHaveLength(3);
    expect(save().season).toEqual(initial.season);
  });

  it('identifies the later schedule as simulated and respects a live club match', () => {
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(createNrlCareer('bears', 16, 2027)));
    open();
    click('Club office');
    click('State of Origin');
    expect(screen.getByText('Simulated 2027 schedule')).toBeVisible();
    expect(screen.queryByText(/Accor Stadium/)).toBeNull();
    click('Coach New South Wales Blues');
    click('Match centre');
    click('Play Live');
    click('Club office');
    expect(button('Simulate Origin Game 1')).toBeDisabled();
    expect(save().origin?.matches).toHaveLength(0);
  });
});
