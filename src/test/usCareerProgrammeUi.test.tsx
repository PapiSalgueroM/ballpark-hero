import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { prepareUsCareerProgramme, type ProgrammeCareer } from '@/lib/usCareerProgramme';
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
    /* Release AU fix pass: a real career holds an archetype, and a card now states what will land on it (durability 0.9 leaves room for the full trade). */
    const { changed } = mount({ ...fixture(), pos, archetype: { durability: 0.9, scoring: 1, playmaking: 1, rebounding: 1, scoringMult: 1 } } as ProgrammeCareer, sport); await open(sport); start(); fireEvent.click(tile('tactics'));
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

  it.each([
    { sport: 'nba' as const, pos: 'PG', morale: 92, durability: 0.9, scoring: 1.08, playmaking: 0.92 },
    { sport: 'nfl' as const, pos: 'QB', morale: 98, durability: 0.84, scoring: 1, playmaking: 1 },
  ])('$sport previews the capped whole plan without writing, then applies it through one callback', async ({ sport, pos, morale, durability, scoring, playmaking }) => {
    const base = {
      ...fixture(), pos, health: 96, morale: 98,
      archetype: { durability: 0.9, scoring: 1, playmaking: 1, rebounding: 1, scoringMult: 1 },
      programme: { sport, year: 2026, team: 'BOS', workload: 'push', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' },
    } as ProgrammeCareer;
    const input = JSON.stringify(base), { changed } = mount(base, sport);
    await open(sport); start();
    const preview = screen.queryByRole('button', { name: 'Try a plan' });
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
    expect(preview, 'US_PROGRAMME_PREVIEW_APPLY: a whole plan must be previewable without saving each choice').not.toBeNull();
    fireEvent.click(preview!); fireEvent.click(tile('workload'));
    fireEvent.click(document.querySelector('[data-us-programme-choice="workload:recover"]')!);
    expect(document.querySelector('[data-us-programme-current]')).toHaveTextContent('Current plan: Push the workload');
    expect(document.querySelector('[data-us-programme-current]')).toHaveTextContent('Season health -8, morale +2 (morale tops out at 100).');
    expect(document.querySelector('[data-us-programme-preview-selection]')).toHaveTextContent('Preview: Prioritize recovery');
    expect(document.querySelector('[data-us-programme-preview-selection]')).toHaveTextContent('Season health +4 (health tops out at 100), morale -6.');
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
    back(); fireEvent.click(tile('tactics'));
    fireEvent.click(document.querySelector('[data-us-programme-choice="tactics:attack"]')!);
    expect(document.querySelector('[data-us-programme-current]')).toHaveTextContent('Current plan: Your usual approach');
    expect(document.querySelector('[data-us-programme-preview-selection]')).toHaveTextContent(sport === 'nba'
      ? 'Season scoring multiplier +8%, playmaking multiplier -8%. Your position stays the same.'
      : 'Season morale +6, durability -0.06. More form, more injury risk.');
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
    fireEvent.click(screen.getByRole('button', { name: 'Apply plan' }));
    expect(changed).toHaveBeenCalledOnce();
    const next = changed.mock.calls[0][0] as ProgrammeCareer;
    expect(next).toEqual({ ...base, programme: { sport, year: 2026, team: 'BOS', workload: 'recover', tactics: 'attack', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' } });
    expect(JSON.stringify(base)).toBe(input);
    const prepared = JSON.parse(JSON.stringify(next)) as ProgrammeCareer;
    const receipt = prepareUsCareerProgramme(prepared, sport);
    expect(receipt).not.toBeNull(); expect(prepared.health).toBe(100); expect(prepared.morale).toBe(morale);
    const archetype = (prepared as ProgrammeCareer & { archetype: { durability: number; scoring: number; playmaking: number } }).archetype;
    expect(archetype.durability).toBeCloseTo(durability, 10); expect(archetype.scoring).toBeCloseTo(scoring, 10); expect(archetype.playmaking).toBeCloseTo(playmaking, 10);
  });
  it.each([{ sport: 'nba' as const, pos: 'PG' }, { sport: 'nfl' as const, pos: 'QB' }])('$sport discards an uncommitted plan and restores the real current selections', async ({ sport, pos }) => {
    const base = { ...fixture(), pos, programme: { sport, year: 2026, team: 'BOS', workload: 'push', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' } } as ProgrammeCareer;
    const input = JSON.stringify(base), { changed } = mount(base, sport);
    await open(sport); start();
    const preview = screen.queryByRole('button', { name: 'Try a plan' });
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
    expect(preview, 'US_PROGRAMME_PREVIEW_DISCARD: experimenting must not replace the current plan').not.toBeNull();
    fireEvent.click(preview!); fireEvent.click(tile('workload'));
    fireEvent.click(document.querySelector('[data-us-programme-choice="workload:recover"]')!);
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
    fireEvent.click(screen.getByRole('button', { name: 'Discard preview' }));
    expect(screen.queryByRole('button', { name: 'Apply plan' })).toBeNull();
    expect(tile('workload')).toHaveTextContent('Push the workload');
    fireEvent.click(screen.getByRole('button', { name: 'Try a plan' })); fireEvent.click(tile('workload'));
    expect(document.querySelector('[data-us-programme-choice="workload:push"]')).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('[data-us-programme-choice="workload:recover"]')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(screen.getByRole('dialog', { name: sport.toUpperCase() + ' season programme' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(input);
  });

  it('renders the earned outcome using saved target and bonus values', () => {
    const c = fixture(); c.programmeResults = [{ sport: 'nba', year: 2025, team: 'BOS', outcome: 'completed', bonusGross: 0.25, bonusNet: 0.1, partnershipProgress: 2, decisions: [{ section: 'bonus', label: 'Match the benchmark', outcome: 'completed', target: 4, actual: 7, unit: 'assists per game' }] }];
    mount(c);
    expect(screen.getByText('Match the benchmark: completed (7/4 assists per game).')).toBeInTheDocument();
    expect(screen.getByText('Bonus: $0.25M gross, $0.1M banked.')).toBeInTheDocument();
    expect(screen.getByText('Partnership progress: 2/3.')).toBeInTheDocument();
  });
});
