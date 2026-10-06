/**
 * Round 1020: the MLB board with the GM desk.
 *
 * A save from before the round carries no `gm` field: the hub still shows the
 * desk boxes, the deal box says what opening it brings rather than a deadline
 * that is not running, and nothing is written to the save until a box is
 * tapped. The first tap switches the desk on and saves it. A save with the
 * desk past round 19 says the deadline has passed, and the trade desk says
 * only Competitive Balance picks can be traded and this game awards none.
 * scripts/simMlbGmDesk.mjs holds the rules.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initMlbLeague, type MlbLeague } from '@/lib/mlbFrontOffice';
import { openMlbDesk } from '@/lib/mlbGmDesk';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const SAVE_KEY = 'mlb-front-office-save-v1';
const TEAM = 'BOS';
const write = (league: MlbLeague, extra: Record<string, unknown> = {}) =>
  localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: TEAM, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...extra }));
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');

describe('1020 MLB GM desk on the board', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('an old save shows the desk boxes and stays off until one is tapped', () => {
    const league = initMlbLeague(lehmer(7));
    write(league);
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByText('Packages and a deadline')).toBeTruthy();
    expect(screen.getByText(/deals shut once round 19 is played/)).toBeTruthy();
    expect(saved().gm).toBeUndefined();
    fireEvent.click(screen.getByText('Staff'));
    expect(saved().gm).toBeTruthy();
    expect(Object.keys(saved().gm.blocks).sort()).toEqual(['contracts', 'picks', 'retained', 'staff']);
  });

  it('a desk save past the deadline says so, and the trade desk says picks cannot move', () => {
    const league = initMlbLeague(lehmer(8));
    const desk = openMlbDesk(league, TEAM);
    league.round = 21;
    write(league, { gm: desk });
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByText('Deadline passed')).toBeTruthy();
    expect(screen.getByLabelText('How the GM desk works')).toBeTruthy();
    fireEvent.click(screen.getByText('Trade desk'));
    expect(document.querySelector('[data-mlb-desk-deals]')).toBeTruthy();
    expect(screen.getAllByText(/only Competitive Balance picks can be traded, and this game awards none/).length).toBeGreaterThan(0);
  });
});
