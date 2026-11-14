import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import {
  createNrlCareer, nrlCareerFinance, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerAction, type NrlCareerState, type NrlTicketTier,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, nrlRegularRounds } from '@/lib/nrlManager';

afterEach(cleanup);

const raw = (career: NrlCareerState) => JSON.stringify(career);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const start = () => createNrlCareer('storm', 4);
const tierOf = (career: NrlCareerState) => career.finance.ticketTier;

function choose(career: NrlCareerState, tier: NrlTicketTier, year = career.season.year, round = career.season.round) {
  return reduceNrlCareer(career, { type: 'setTicketTier', tier, year, round });
}

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = advance(career);
  return career;
}

describe('NRL home ticket pricing', () => {
  it('keeps Standard absent and lets a club choose or return to Standard until its first home gate', () => {
    const initial = start();
    const original = raw(initial);
    expect('ticketTier' in initial.finance).toBe(false);
    const value = choose(initial, 'value');
    expect(tierOf(value)).toBe('value');
    expect(value.season).toBe(initial.season);
    expect(value.players).toBe(initial.players);
    expect(nrlCareerFinance(value).cash).toBe(nrlCareerFinance(initial).cash);
    expect(raw(initial)).toBe(original);
    expect(raw(choose(value, 'standard'))).toBe(original);
    expect(choose(value, 'value')).toBe(value);
    expect(choose(value, 'premium', 2027)).toBe(value);
    expect(choose(value, 'premium', 2026, 2)).toBe(value);
    expect(choose(value, 'unreadable' as NrlTicketTier)).toBe(value);

    const home = nrlNextRound(value.season).clubMatch;
    expect(home?.homeId).toBe('storm');
    const played = advance(value);
    expect(choose(played, 'premium')).toBe(played);
    expect(choose(played, 'standard')).toBe(played);
    expect(tierOf(played)).toBe('value');
  });

  it('keeps a bye and an away opener gate-free and editable, while a v1 import waits for rollover', () => {
    const bye = createNrlCareer('panthers', 1);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    const pricedBye = advance(choose(bye, 'value'));
    expect(pricedBye.finance.gateReceipts).toBe(0);
    expect(tierOf(choose(pricedBye, 'premium'))).toBe('premium');

    const away = createNrlCareer('sharks', 1);
    expect(nrlNextRound(away.season).clubMatch?.awayId).toBe('sharks');
    const pricedAway = advance(choose(away, 'premium'));
    expect(pricedAway.finance.gateReceipts).toBe(0);
    expect(tierOf(choose(pricedAway, 'value'))).toBe('value');

    const v1 = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 4)))!;
    expect(v1.legacySeason).toBe(true);
    expect(choose(v1, 'value')).toBe(v1);
    const next = reduceNrlCareer(finish(v1), { type: 'startNextSeason' });
    expect(tierOf(choose(next, 'value'))).toBe('value');
  });

  it('replays each modeled gate, leaves match results exact, and carries the archived cash through a move and return', () => {
    let standard = start();
    let value = choose(standard, 'value');
    let premium = choose(standard, 'premium');
    const seen = new Set<string>();
    while (standard.season.phase !== 'complete') {
      const { round, year, clubId } = standard.season;
      const old = [standard.finance.gateReceipts, value.finance.gateReceipts, premium.finance.gateReceipts];
      standard = advance(standard);
      value = advance(value);
      premium = advance(premium);
      const fixture = standard.season.results.find(result => result.round === round && [result.homeId, result.awayId].includes(clubId));
      const home = fixture?.homeId === clubId && fixture.tieId !== 'GF';
      const won = fixture !== undefined && fixture.homeScore > fixture.awayScore;
      const base = home ? 240_000 + (won ? 30_000 : 0) + (fixture.finalsRound ? 120_000 : 0) : 0;
      const type = home ? fixture.finalsRound ? 'home-final' : won ? 'home-win' : 'home-nonwin'
        : fixture?.tieId === 'GF' ? 'neutral-final' : fixture ? 'away' : round <= nrlRegularRounds(year) ? 'bye' : 'idle';
      const delta = type === 'home-final' ? [-36_000, 36_000]
        : type === 'home-win' ? [-22_000, 18_000] : type === 'home-nonwin' ? [18_000, -24_000] : [0, 0];
      expect([standard.finance.gateReceipts - old[0], value.finance.gateReceipts - old[1], premium.finance.gateReceipts - old[2]])
        .toEqual([base, base + delta[0], base + delta[1]]);
      seen.add(type);
    }
    for (const expected of ['home-final', 'home-win', 'home-nonwin', 'neutral-final', 'away', 'bye']) expect(seen.has(expected), expected).toBe(true);
    expect(value.season).toEqual(standard.season);
    expect(premium.season).toEqual(standard.season);
    expect(value.players).toEqual(standard.players);
    expect(premium.players).toEqual(standard.players);
    expect(nrlCareerFinance(premium).cash - nrlCareerFinance(standard).cash)
      .toBe(premium.finance.gateReceipts - standard.finance.gateReceipts);
    expect(value.history[0].finance).toEqual(nrlCareerFinance(value));
    expect(raw(readNrlCareerSave(raw(value))!)).toBe(raw(value));

    const stayed = reduceNrlCareer(value, { type: 'startNextSeason' });
    expect(tierOf(stayed)).toBeUndefined();
    expect(stayed.finance.openingCash).toBe(nrlCareerFinance(value).cash);
    const perth = reduceNrlCareer(value, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(tierOf(perth)).toBeUndefined();
    expect(perth.finance.openingCash).toBe(2_500_000);
    const back = reduceNrlCareer(finish(choose(perth, 'premium')), { type: 'startNextSeason', move: { fromYear: 2027, clubId: 'storm' } });
    expect(tierOf(back)).toBeUndefined();
    expect(back.finance.openingCash).toBe(nrlCareerFinance(value).cash);
    expect(back.history[0]).toEqual(stayed.history[0]);
    const { playerSeasons, ...returned } = back.history[0];
    expect(playerSeasons?.length).toBeGreaterThanOrEqual(13);
    expect(returned).toEqual({
      ...value.history[0],
      finals: {
        seeds: ['broncos', 'bulldogs', 'storm', 'raiders', 'panthers', 'sea-eagles', 'roosters', 'warriors'],
        scores: [[18, 28], [22, 24], [12, 13], [4, 10], [22, 12], [24, 16], [4, 16], [22, 2], [10, 28]],
      },
    });
    expect(raw(readNrlCareerSave(raw(back))!)).toBe(raw(back));
  });

  it('blocks halftime pricing, settles the same Live and Quick ledger, and rejects forged current books', () => {
    const initial = choose(start(), 'premium');
    const pending = reduceNrlCareer(initial, { type: 'startLive' });
    expect(pending.season.live).toBeDefined();
    expect(choose(pending, 'value')).toBe(pending);
    const restored = readNrlCareerSave(raw(pending))!;
    expect(raw(restored)).toBe(raw(pending));
    const { year, round, tactic } = pending.season;
    const action = { type: 'finishLive', year, round, tactic } as const;
    const finished = reduceNrlCareer(restored, action);
    expect(raw(finished)).toBe(raw(advance(initial)));
    expect(reduceNrlCareer(finished, action)).toBe(finished);
    for (const finance of [
      { ...finished.finance, ticketTier: 'standard' },
      { ...finished.finance, ticketTier: 'value' },
      { ...finished.finance, gateReceipts: finished.finance.gateReceipts + 1 },
    ]) {
      expect(readNrlCareerSave(JSON.stringify({ ...finished, finance }))).toBeNull();
    }
  });

  it('shows the simulated receipt changes in Club finances and disables pricing after the home gate', () => {
    let career = start();
    const action = (event: NrlCareerAction) => { career = reduceNrlCareer(career, event); return true; };
    const view = render(<NrlCareerOffice career={career} onAction={action} screen="finances" disabled={false} />);
    const control = screen.getByLabelText('Home ticket pricing');
    expect(control).toHaveValue('standard');
    const changes = within(screen.getByRole('table', { name: 'Changes to simulated gate receipts' }));
    expect(changes.getByRole('row', { name: /Regular home loss or draw/ })).toHaveTextContent('+$18,000');
    expect(changes.getByRole('row', { name: /Regular home win/ })).toHaveTextContent('-$22,000');
    expect(changes.getByRole('row', { name: /Home final/ })).toHaveTextContent('+$36,000');
    fireEvent.change(control, { target: { value: 'value' } });
    expect(tierOf(career)).toBe('value');
    career = advance(career);
    view.rerender(<NrlCareerOffice career={career} onAction={action} screen="finances" disabled={false} />);
    expect(screen.getByLabelText('Home ticket pricing')).toBeDisabled();
    expect(screen.getByText(/locked until next season/i)).toBeVisible();
  });
});
