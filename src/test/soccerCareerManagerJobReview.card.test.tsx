import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import SoccerManagerJobReview from '@/components/soccer-career/SoccerManagerJobReview';
import { quoteManagerJob, readManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import { pending, seeded } from './helpers/managerJobReviewFixtures';
afterEach(cleanup);
describe('manager job review choice card', () => {
  it('shows the actual earned destination and both decisions with no simulation work', () => {
    const state = pending(), before = structuredClone(state), move = readManagerJobReview(state, E.FALLBACK_CLUBS)!.pending!, resolve = vi.fn();
    const actual = seeded(9, () => {
      render(<SoccerManagerJobReview career={state} clubs={E.FALLBACK_CLUBS} help={false} onBack={vi.fn()} onResolve={resolve} />);
      fireEvent.click(screen.getByRole('button', { name: 'Accept move' }));
      return resolve.mock.calls[0];
    });
    expect(screen.getByText(new RegExp(move.to.club))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stay at '+move.from.club })).toBeTruthy();
    expect(actual.value).toEqual([quoteManagerJob(state, E.FALLBACK_CLUBS), 'accept']);
    expect(actual.draws).toHaveLength(0); expect(state).toStrictEqual(before);
  });
  it('help explains the settled season and national call and Back does not select a job', () => {
    const state = pending(), resolve = vi.fn(), back = vi.fn();
    const actual = seeded(9, () => {
      render(<SoccerManagerJobReview career={state} clubs={E.FALLBACK_CLUBS} help onBack={back} onResolve={resolve} />);
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    });
    expect(screen.getByText(/Any national-team call is already settled too/)).toBeTruthy();
    expect(screen.getByText(/The season result stays the same whichever option you pick/)).toBeTruthy();
    expect(resolve).not.toHaveBeenCalled(); expect(back).toHaveBeenCalledTimes(1); expect(actual.draws).toHaveLength(0);
  });
  it('ambiguous destination data cannot display actionable invented choices', () => {
    const state = pending(), move = readManagerJobReview(state, E.FALLBACK_CLUBS)!.pending!, resolve = vi.fn();
    const target = E.FALLBACK_CLUBS.find(club => club.name === move.to.club)!;
    render(<SoccerManagerJobReview career={state} clubs={[...E.FALLBACK_CLUBS, { ...target }]} help={false} onBack={vi.fn()} onResolve={resolve} />);
    expect(screen.queryByRole('button', { name: 'Accept move' })).toBeNull(); expect(resolve).not.toHaveBeenCalled();
  });
  it('rerendered card binds Stay to the current saved state without advancing', () => {
    const state = pending(), changed = E.applyMoneyAction(state, { t: 'deposit', amount: 0.1 }).state, resolve = vi.fn();
    const view = render(<SoccerManagerJobReview career={state} clubs={E.FALLBACK_CLUBS} help={false} onBack={vi.fn()} onResolve={resolve} />);
    view.rerender(<SoccerManagerJobReview career={changed} clubs={E.FALLBACK_CLUBS} help={false} onBack={vi.fn()} onResolve={resolve} />);
    const move = readManagerJobReview(changed, E.FALLBACK_CLUBS)!.pending!;
    const actual = seeded(4, () => fireEvent.click(screen.getByRole('button', { name: 'Stay at '+move.from.club })));
    expect(resolve).toHaveBeenCalledTimes(1); expect(resolve.mock.calls[0][0].source).toBe(changed); expect(resolve.mock.calls[0][1]).toBe('stay');
    expect(actual.draws).toHaveLength(0);
  });
});
