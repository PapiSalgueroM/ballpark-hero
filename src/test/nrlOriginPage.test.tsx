import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { nrlOriginFixtures, nrlOriginResult, NRL_ORIGIN_TEAM_NAMES } from '@/lib/nrlOrigin';
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
  it('reopens all three settled scores after accepting the next Origin series', () => {
    let career = createNrlCareer('broncos', 16);
    career = reduceNrlCareer(career, { type: 'startOrigin', year: 2026, side: 'qld' });
    for (const game of [1, 2, 3]) career = reduceNrlCareer(career, { type: 'playOriginMatch', year: 2026, side: 'qld', game });
    const old = career.origin!;
    const winner = nrlOriginResult(old).winner!;
    while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
    career = reduceNrlCareer(career, { type: 'startNextSeason' });
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
    const page = open();
    click('Club office');
    expect(screen.queryByText('Past Origin series')).not.toBeInTheDocument();
    click('Coach New South Wales Blues');
    expect(save().origin?.year).toBe(2027);
    const saved = raw();
    page.unmount();
    open();
    click('Club office');
    fireEvent.click(screen.getByText('Past Origin series'));
    fireEvent.click(screen.getByText(`2026 · ${NRL_ORIGIN_TEAM_NAMES[winner]} won`));
    expect(screen.getByText('You coached Queensland Maroons.')).toBeVisible();
    const list = within(screen.getByRole('list', { name: '2026 State of Origin games' }));
    nrlOriginFixtures(2026).forEach(({ game, home, away }, index) => {
      const { homeScore, awayScore } = old.matches[index];
      expect(list.getAllByRole('listitem')[game - 1]).toHaveTextContent(`${home.toUpperCase()} ${homeScore}–${awayScore} ${away.toUpperCase()}`);
    });
    expect(raw()).toBe(saved);
  });

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

  it('nominates an eligible club player for the same state, lets you select them and remembers the nomination', () => {
    const initial = createNrlCareer('broncos', 16);
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(initial));
    const view = open();
    click('Club office');
    click('State of Origin');
    const select = screen.getByRole('combobox', { name: 'Nominate a club player' });
    const group = within(select).getByRole('group', { name: 'Queensland Maroons' });
    const player = within(group).getAllByRole('option')[0] as HTMLOptionElement;
    fireEvent.change(select, { target: { value: player.value } });
    expect(button('Coach New South Wales Blues')).toBeDisabled();
    expect(raw()).toBe(JSON.stringify(initial));
    click('Coach Queensland Maroons');
    expect(save().origin?.nomination?.playerId).toBe(player.value);
    expect(screen.getByText(/Club nomination/)).toBeVisible();
    expect(save().origin?.pools.qld.some(candidate => candidate.id === player.value)).toBe(true);
    const saved = raw();
    view.unmount();
    open();
    click('Club office');
    expect(screen.getByText(/Club nomination/)).toBeVisible();
    expect(raw()).toBe(saved);
  });

  it('finds an eligible player beyond the opening shortlist and fields him in the saved series', () => {
    const initial = createNrlCareer('broncos', 1);
    const original = JSON.stringify(initial);
    localStorage.setItem(NRL_SAVE_KEY, original);
    open();
    click('Club office');
    click('State of Origin');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include every eligible player for your state' }));
    expect(raw()).toBe(original);
    click('Coach Queensland Maroons');
    expect(save().origin?.fullPool).toBe(true);
    expect(save().origin?.pools.qld).toHaveLength(231);
    fireEvent.click(screen.getByText('Select your matchday 19'));
    const saved = raw();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find an eligible player' }), { target: { value: 'DANE MERRITT' } });
    expect(raw()).toBe(saved);
    const slot = screen.getByRole('combobox', { name: 'Left Second Row' });
    expect(within(slot).getByRole('option', { name: /Dane Merritt/ })).toHaveValue('nrl-eels-2026-10');
    expect(within(slot).getAllByRole('option')).toHaveLength(2);
    fireEvent.change(slot, { target: { value: 'nrl-eels-2026-10' } });
    click('Simulate Origin Game 1');
    expect(save().origin?.matches[0]).toMatchObject({ homeScore: 14, awayScore: 20, selection: { starters: { 'Left Second Row': 'nrl-eels-2026-10' } } });
    expect(save().season).toEqual(initial.season);
  });
});
