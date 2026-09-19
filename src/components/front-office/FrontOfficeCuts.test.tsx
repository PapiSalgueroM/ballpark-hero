/**
 * Round 631: a cut costs dead money on the NFL Front Office board.
 *
 * The engine rule is fenced by scripts/simFrontOfficeCuts.mjs. This is the
 * board: the Cut button quotes the dead money before the first tap, the
 * second tap is only offered with the whole cost on screen, the cap line
 * shows the dead money once there is some, and a man you cut this season
 * sits in the pool with the reason beside him and his Sign button greyed.
 *
 * Same setup as FrontOfficeSeasonClose.test.tsx: a save from the real engine
 * under a seeded rng, the real board rendered on it, the save read back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { initLeague, deadMoneyFor } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const SAVE_KEY = 'front-office-save-v1';
/* eslint-disable @typescript-eslint/no-explicit-any */
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);

describe('NFL Front Office: a cut costs dead money on the board', () => {
  let restoreRandom: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restoreRandom = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restoreRandom?.(); });

  const setup = async () => {
    const { default: Board } = await import('@/components/front-office/FrontOfficeBoard');
    const league = initLeague(lehmer(7));
    const team = Object.keys(league.teams)[0];
    const target = [...league.teams[team].players].filter(p => p.years >= 2).sort((a, b) => b.salary - a.salary)[0];
    localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
    render(<Board />);
    return { team, target, cost: deadMoneyFor(target) };
  };
  const rosterRow = (id: string) => document.querySelector(`[data-roster-row="${id}"]`) as HTMLElement;
  const faRow = (id: string) => document.querySelector(`[data-fa-row="${id}"]`) as HTMLElement;

  it('quotes the dead money before the tap, asks twice, and only then charges it', async () => {
    const { team, target, cost } = await setup();
    fireEvent.click(screen.getByText('Roster'));
    const row = rosterRow(target.id);
    expect(row).toBeTruthy();
    /* the price is on the button before anything is tapped */
    const cut = within(row).getByText(`Cut, $${cost.now}M dead`);
    expect(row.querySelector('[data-cut-confirm]')).toBeNull();

    fireEvent.click(cut);
    const confirm = row.querySelector('[data-cut-confirm]') as HTMLElement;
    expect(confirm).toBeTruthy();
    expect(confirm.textContent).toContain(`$${cost.now}M of his $${target.salary}M stays on this season's cap`);
    expect(confirm.textContent).toContain(`$${cost.next}M lands on next season's`);
    expect(confirm.textContent).toContain('cannot sign him back until the offseason');
    /* one tap changed nothing on the save */
    expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(true);
    expect(read().league.teams[team].deadCap).toBeUndefined();

    /* keeping him closes the question */
    fireEvent.click(within(confirm).getByText('Keep him'));
    expect(row.querySelector('[data-cut-confirm]')).toBeNull();
    expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(true);

    /* the second tap, with the cost on screen, is the cut */
    fireEvent.click(within(row).getByText(`Cut, $${cost.now}M dead`));
    fireEvent.click(within(row.querySelector('[data-cut-confirm]') as HTMLElement).getByText('Cut him'));
    const saved = read().league.teams[team];
    expect(saved.players.some((p: any) => p.id === target.id)).toBe(false);
    expect(saved.deadCap).toEqual([{ playerId: target.id, name: target.name, amount: cost.now, seasonsLeft: 2 }]);
    expect(saved.releasedThisSeason).toEqual([target.id]);
    expect(rosterRow(target.id)).toBeNull();
    /* and the cap line says so */
    expect(screen.getByText(/dead money/).textContent).toContain(`dead money $${cost.now}M`);
  });

  it('shows why the man you cut cannot be signed back and greys his button', async () => {
    const { team, target, cost } = await setup();
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(within(rosterRow(target.id)).getByText(`Cut, $${cost.now}M dead`));
    fireEvent.click(within(rosterRow(target.id).querySelector('[data-cut-confirm]') as HTMLElement).getByText('Cut him'));
    fireEvent.click(screen.getByText('Hub'));
    fireEvent.click(screen.getByText('Free agency'));
    const row = faRow(target.id);
    expect(row).toBeTruthy();
    expect(within(row).getByText('You cut him this season. He can come back after the offseason.')).toBeTruthy();
    const sign = within(row).getByText('Sign') as HTMLButtonElement;
    expect(sign.disabled).toBe(true);
    fireEvent.click(sign);
    expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(false);
    /* somebody else in the pool is still signable, so the grey is his alone */
    const others = read().league.freeAgents.filter((p: any) => p.id !== target.id);
    const room = read().league.cap - read().league.teams[team].players.reduce((s: number, p: any) => s + p.salary, 0) - cost.now;
    const affordable = others.find((p: any) => p.salary <= room && faRow(p.id));
    expect(affordable).toBeTruthy();
    expect((within(faRow(affordable.id)).getByText('Sign') as HTMLButtonElement).disabled).toBe(false);
  });
});
