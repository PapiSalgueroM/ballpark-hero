import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import type { ProgrammeCareer } from '@/lib/usCareerProgramme';
import type { UsSport } from '@/lib/usCoachCareer';

const fixture = (): ProgrammeCareer => ({
  name: 'Generated UI Player', pos: 'PG', team: 'BOS', year: 2026, age: 31, ovr: 78, pot: 90,
  health: 80, morale: 70, salary: 5, contractYears: 4, seasons: [], retired: false, draftPick: 20,
  earnings: 5, netWorth: 2, fanbase: 30,
});
function mount(career = fixture(), sport: UsSport = 'nba') {
  const changed = vi.fn();
  function App() { const [c, setC] = useState(career); return <UsCareerProgramme career={c} sport={sport} onChange={next => { changed(next); setC(next); }} />; }
  return { ...render(<App />), changed };
}
async function open(sport: UsSport = 'nba') {
  fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
  await screen.findByRole('dialog', { name: sport.toUpperCase() + ' season programme' });
}
function start() { fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' })); }
function tile(id: string): HTMLButtonElement { return document.querySelector('[data-us-programme-tile="' + id + '"]') as HTMLButtonElement; }
function back() { fireEvent.click(document.querySelector('[data-us-programme-back]') as HTMLButtonElement); }
afterEach(cleanup);

describe('US programme choices and restoration', () => {
  it('shows the actual rules and worked example before the choice tiles', async () => {
    const { changed } = mount(); await open();
    expect(screen.getByText(/Example: Prioritize recovery adds 8/)).toBeInTheDocument();
    expect(document.querySelector('[data-us-programme-tile]')).toBeNull();
    expect(changed).not.toHaveBeenCalled(); start();
    expect(document.querySelectorAll('[data-us-programme-tile]')).toHaveLength(6);
  });
  it.each([
    { sport: 'nfl', pos: 'QB', attack: 'Season morale +6, durability -0.06. More form, more injury risk.', support: 'Season morale -3, durability +0.06. Less form, less injury risk.' },
    { sport: 'mlb', pos: 'CF', attack: 'Season morale +6, durability -0.06. More form, more injury risk.', support: 'Season morale -3, durability +0.06. Less form, less injury risk.' },
    { sport: 'mlb', pos: 'SP', attack: 'Season morale +6, durability -0.06. More form, more injury risk.', support: 'Season morale -3, durability +0.06. Less form, less injury risk.' },
    { sport: 'nhl', pos: 'G', attack: 'Season morale +6, durability -0.06. More form, more injury risk.', support: 'Season morale -3, durability +0.06. Less form, less injury risk.' },
    { sport: 'nba', pos: 'PG', attack: 'Season scoring multiplier +8%, playmaking multiplier -8%. Your position stays the same.', support: 'Season playmaking multiplier +8%, scoring multiplier -8%. Your position stays the same.' },
    { sport: 'nba', pos: 'PF', attack: 'Season scoring multiplier +8%, rebounding multiplier -8%. Your position stays the same.', support: 'Season rebounding multiplier +8%, scoring multiplier -8%. Your position stays the same.' },
    { sport: 'nhl', pos: 'C', attack: 'Season scoring multiplier +0.08, favoring goals over assists.', support: 'Season scoring multiplier -0.08 (minimum 0.4), favoring assists over goals.' },
  ] satisfies { sport: UsSport; pos: string; attack: string; support: string }[])('shows the distinct tactical tradeoff on each actual option for $sport $pos', async ({ sport, pos, attack, support }) => {
    const { changed } = mount({ ...fixture(), pos }, sport); await open(sport); start(); fireEvent.click(tile('tactics'));
    const attackButton = document.querySelector('[data-us-programme-choice="tactics:attack"]');
    const supportButton = document.querySelector('[data-us-programme-choice="tactics:support"]');
    expect(attackButton).toHaveTextContent(attack); expect(attackButton).not.toHaveTextContent(support);
    expect(supportButton).toHaveTextContent(support); expect(supportButton).not.toHaveTextContent(attack);
    expect(changed).not.toHaveBeenCalled();
  });
  it('saves a selected choice immediately with the real upcoming team and year', async () => {
    const { changed } = mount(); await open(); start(); fireEvent.click(tile('workload'));
    fireEvent.click(document.querySelector('[data-us-programme-choice="workload:push"]') as HTMLButtonElement);
    expect(changed).toHaveBeenCalledOnce();
    expect(changed.mock.calls[0][0].programme).toMatchObject({ sport: 'nba', year: 2026, team: 'BOS', workload: 'push' });
    expect(document.querySelector('[data-us-programme-choice="workload:push"]')).toHaveAttribute('aria-pressed', 'true');
  });
  it('restores the original tile focus and list scroll after Back', async () => {
    mount(); await open(); start();
    const body = document.querySelector('[data-us-programme-scroll]') as HTMLElement; body.scrollTop = 37;
    fireEvent.click(tile('bonus')); back();
    await waitFor(() => expect(tile('bonus')).toHaveFocus()); expect(body.scrollTop).toBe(37);
  });
  it('keeps a selected choice and restores detail scroll and Help focus', async () => {
    const { changed } = mount(); await open(); start(); fireEvent.click(tile('tactics'));
    fireEvent.click(document.querySelector('[data-us-programme-choice="tactics:support"]') as HTMLButtonElement);
    const body = document.querySelector('[data-us-programme-scroll]') as HTMLElement; body.scrollTop = 24;
    fireEvent.click(screen.getByRole('button', { name: 'Season programme help' })); back();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Season programme help' })).toHaveFocus());
    expect(body.scrollTop).toBe(24); expect(changed).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-us-programme-choice="tactics:support"]')).toHaveAttribute('aria-pressed', 'true');
  });
  it('clears optional selections without changing base career fields', async () => {
    const base = fixture(); base.programme = { sport: 'nba', year: 2026, team: 'BOS', workload: 'push', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' };
    const { changed } = mount(base); await open(); start(); fireEvent.click(screen.getByRole('button', { name: 'Use your usual routine' }));
    const expected = { ...base }; delete expected.programme; expect(changed.mock.calls[0][0]).toEqual(expected);
  });
  it.each([{ retired: true }, { suspendedSeasons: 1 }])('keeps all displayed choices disabled for an unavailable career %j', async state => {
    const { changed } = mount({ ...fixture(), ...state }); await open(); start(); fireEvent.click(tile('workload'));
    expect(document.querySelectorAll('[data-us-programme-choice]')).toHaveLength(3);
    document.querySelectorAll('[data-us-programme-choice]').forEach(button => expect(button).toBeDisabled());
    expect(changed).not.toHaveBeenCalled();
  });
  it('handles a malformed optional result without crashing or rewarding', async () => {
    const c = fixture(); c.programmeResults = [{ year: 2025 } as never];
    const { changed } = mount(c); await open(); start(); fireEvent.click(tile('bonus'));
    document.querySelectorAll('[data-us-programme-choice]').forEach(button => expect(button).toBeDisabled());
    expect(changed).not.toHaveBeenCalled(); expect(document.querySelector('[data-us-programme-result]')).toBeNull();
  });
  it('does not offer veteran adaptation before age 30', async () => {
    mount({ ...fixture(), age: 29 }); await open(); start(); fireEvent.click(tile('reinvention'));
    expect(document.querySelector('[data-us-programme-choice="reinvention:maintain"]')).toBeNull();
  });
  it('closes with Escape and returns focus to the exact opener', async () => {
    mount(); const opener = screen.getByRole('button', { name: 'Plan your season' }); opener.focus(); await open();
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'NBA season programme' })).toContainElement(document.activeElement as HTMLElement));
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'NBA season programme' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'NBA season programme' })).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });
  it('renders the earned outcome using saved target and bonus values', () => {
    const c = fixture(); c.programmeResults = [{ sport: 'nba', year: 2025, team: 'BOS', outcome: 'completed', bonusGross: 0.1, bonusNet: 0.045, partnershipProgress: 2, decisions: [{ section: 'bonus', label: 'Match the benchmark', outcome: 'completed', target: 4, actual: 7, unit: 'assists per game' }] }];
    mount(c);
    expect(screen.getByText('Match the benchmark: completed (7/4 assists per game).')).toBeInTheDocument();
    expect(screen.getByText('Bonus: $ 0.1000M gross, $ 0.0450M banked.')).toBeInTheDocument();
    expect(screen.getByText('Partnership progress: 2/3.')).toBeInTheDocument();
  });
});
