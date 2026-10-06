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
 *
 * Review of Round 1020: the harness drives the desk with its own copy of the
 * board's call order, so nothing there notices the board itself dropping the
 * desk. The walk below plays the REAL board through the last round, October,
 * the draft and the winter, once on a desk save and once on an old save, and
 * checks what the board handed the engine and what the winter wrote down:
 * every expiring man decided on the re-sign desk and the feed saying so, the
 * staff edge and the trainer on the round, the edge in October. Measured
 * 2026-10-05 by hand mutation of the board: the winter's `if (deskNow) {`
 * made `if (false && deskNow) {`, and the round handed `undefined` in place
 * of the desk's options, each turns this walk red.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as engine from '@/lib/mlbFrontOffice';
import { initMlbLeague, MLB_ROUNDS, type MlbGmPlayer, type MlbLeague } from '@/lib/mlbFrontOffice';
import { mlbContractsOf, mlbInjuryRounds, mlbStaffEdge, mlbStaffOf, openMlbDesk } from '@/lib/mlbGmDesk';
import { expiringMen } from '@/lib/gmContracts';
import { mlbContractHost } from '@/lib/gmContractsHostMlb';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';

/* The engine as it is, with the two calls the board makes each round and in
   October recorded, so the walk can read what the board handed them. */
vi.mock('@/lib/mlbFrontOffice', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/mlbFrontOffice')>();
  return { ...real, simMlbRound: vi.fn(real.simMlbRound), runMlbPlayoffs: vi.fn(real.runMlbPlayoffs) };
});
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

  /* The last round, October, the draft and the winter, through the board's
     own buttons, with every draw seeded. */
  function walk(withDesk: boolean) {
    const random = vi.spyOn(Math, 'random').mockImplementation(lehmer(1020));
    try {
      const league = initMlbLeague(lehmer(9));
      league.round = MLB_ROUNDS;
      /* A season into every deal, so the ones with a year left run out this winter. */
      for (const p of league.teams[TEAM].players) p.years = Math.max(1, p.years - 1);
      const desk = openMlbDesk(league, TEAM);
      const up = expiringMen(mlbContractHost, league, TEAM).map(m => m.id).sort();
      write(league, { trust: 70, fired: false, ...(withDesk ? { gm: desk } : {}) });
      render(<MlbFrontOfficeBoard />);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Play Round ${MLB_ROUNDS} of ${MLB_ROUNDS}`) }));
      fireEvent.click(screen.getByRole('button', { name: /Final stretch \+ October/ }));
      expect(saved().phase).toBe('recap');
      const afterSeason = saved();
      /* The room stands between the season and the draft: the measured answer, which tilts nothing. */
      const measured = screen.queryAllByRole('button').find(b => /Measured/.test(b.textContent ?? ''));
      if (measured) fireEvent.click(measured);
      fireEvent.click(screen.getByRole('button', { name: /Go to the draft/ }));
      for (let i = 0; i < 4 && saved().phase === 'draft' && saved().picksLeft > 0; i++) {
        const name = (saved().draftClass as { name: string }[]).map(p => p.name).find(n => screen.queryByText(n));
        expect(name).toBeTruthy();
        fireEvent.click(screen.getByText(name!).closest('button')!);
      }
      expect(saved().phase).toBe('hub');
      fireEvent.click(screen.getByRole('button', { name: /Continue to the hub/ }));
      return { league, desk, up, afterSeason, after: saved() };
    } finally {
      random.mockRestore();
    }
  }

  it('a desk save plays October with the staff edge and takes its winter through the re-sign desk', () => {
    const round = vi.mocked(engine.simMlbRound), october = vi.mocked(engine.runMlbPlayoffs);
    round.mockClear(); october.mockClear();
    const { league, desk, up, afterSeason, after } = walk(true);
    expect(up.length).toBeGreaterThan(0);

    /* The round: the desk's edge for your club and the desk's trainer. */
    const staff = mlbStaffOf(desk, league, TEAM).block;
    const edge = mlbStaffEdge(staff);
    expect(edge).toBeGreaterThan(0);
    expect(round).toHaveBeenCalledTimes(1);
    const opts = round.mock.calls[0][3];
    expect(opts?.edges).toEqual({ [TEAM]: edge });
    const man = { id: 'walk-check' } as MlbGmPlayer;
    expect(opts?.injuryRounds?.(TEAM, man, 3)).toBe(mlbInjuryRounds(staff, TEAM, league.season, MLB_ROUNDS, man.id, 3));
    expect(opts?.injuryRounds?.('NYY', man, 3)).toBe(3);

    /* October: the edge of the staff the season ended with. */
    expect(october).toHaveBeenCalledTimes(1);
    expect(october.mock.calls[0][2]).toEqual({ [TEAM]: mlbStaffEdge(mlbStaffOf(afterSeason.gm, afterSeason.league, TEAM).block) });

    /* The winter: every man whose deal ran out has a recorded decision, by the staff's rule since nobody was decided by hand. */
    const decided = mlbContractsOf(after.gm, after.league, TEAM).decisions.filter(d => d.season === league.season);
    expect(decided.map(d => d.id).sort()).toEqual(up);
    expect(decided.every(d => d.via === 'auto')).toBe(true);
    expect(screen.getByText(/The re-sign desk: \d+ kept, \d+ gone\./)).toBeTruthy();
    expect(screen.getByText(new RegExp(`You left ${up.length} deals? open, so your staff settled`))).toBeTruthy();
  });

  it('an old save walks the same season with no desk: nothing handed to the engine, nothing written down', () => {
    const round = vi.mocked(engine.simMlbRound), october = vi.mocked(engine.runMlbPlayoffs);
    round.mockClear(); october.mockClear();
    const { after } = walk(false);
    expect(round).toHaveBeenCalledTimes(1);
    expect(round.mock.calls[0][3]).toBeUndefined();
    expect(october.mock.calls[0][2]).toBeUndefined();
    expect(after.gm).toBeUndefined();
    expect(screen.queryByText(/The re-sign desk:/)).toBeNull();
  });
});
