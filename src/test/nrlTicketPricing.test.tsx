import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import {
  createNrlCareer, nrlCareerFinance, nrlFinanceForecast, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerAction, type NrlCareerState, type NrlTicketTier,
} from '@/lib/nrlCareer';
import { archiveNrlLadder, createNrlSeason, nrlNextRound, nrlRegularRounds } from '@/lib/nrlManager';

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
      leagueLadder: archiveNrlLadder(value.season),
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

  it.each([false, true])('applies a single midseason review only to remaining home gates, with supporter attendance %s', attendance => {
    const year = 2026, clubId = 'storm', round = 14;
    const action = { type: 'reviewTicketTier', year, clubId, round, tier: 'premium' } as const;
    let opening = choose(start(), 'value');
    if (attendance) opening = reduceNrlCareer(opening, { type: 'setSupporterAttendance', year, clubId, enabled: true });
    const early = opening;
    while (opening.season.round < round) opening = advance(opening);

    const baselineForecast = nrlFinanceForecast(opening)!;
    const reviewed = reduceNrlCareer(opening, action);
    expect(reviewed.finance.ticketReview).toEqual({ round, tier: 'premium' });
    expect(reduceNrlCareer(early, { ...action, round: 1 })).toBe(early);
    expect(reviewed.finance.ticketTier).toBe('value');
    expect(reviewed.season).toBe(opening.season);
    expect(reviewed.finance.gateReceipts).toBe(opening.finance.gateReceipts);
    expect(nrlCareerFinance(reviewed).cash).toBe(nrlCareerFinance(opening).cash);
    expect(reduceNrlCareer(reviewed, { ...action, tier: 'standard' })).toBe(reviewed);
    expect(reduceNrlCareer(opening, { ...action, clubId: 'broncos' })).toBe(opening);
    expect(reduceNrlCareer(opening, { ...action, tier: 'value' })).toBe(opening);
    const paused = reduceNrlCareer(opening, { type: 'startLive' });
    expect(reduceNrlCareer(paused, action)).toBe(paused);

    const forecast = nrlFinanceForecast(reviewed)!;
    const supporterDelta = attendance ? -12_000 : 0;
    expect(forecast.homeMatches).toBe(5);
    expect(forecast.gateLow - baselineForecast.gateLow).toBe(5 * (-32_000 + supporterDelta));
    expect(forecast.gateHigh - baselineForecast.gateHigh).toBe(5 * (30_000 + supporterDelta));
    expect(raw(readNrlCareerSave(raw(reviewed))!)).toBe(raw(reviewed));
    const forged = { ...reviewed, finance: { ...reviewed.finance, ticketReview: { round: 15, tier: 'premium' } } };
    expect(readNrlCareerSave(JSON.stringify(forged))).toBeNull();

    let original = opening;
    let changed = reviewed;
    let gap = 0;
    const seen = new Set<string>();
    while (original.season.phase !== 'complete') {
      const fixture = nrlNextRound(original.season).clubMatch;
      const at = original.season.round;
      original = advance(original);
      changed = advance(changed);
      const match = original.season.results.find(row => row.round === at && row.playerScoring);
      const kind = fixture?.tieId === 'GF' ? 'neutral'
        : match?.homeId === clubId ? match.finalsRound ? 'final' : match.homeScore > match.awayScore ? 'win' : 'non-win'
          : match ? 'away' : 'bye';
      if (kind === 'final') gap += 72_000 + supporterDelta;
      if (kind === 'win') gap += 40_000 + supporterDelta;
      if (kind === 'non-win') gap += -42_000 + supporterDelta;
      expect(changed.finance.gateReceipts - original.finance.gateReceipts).toBe(gap);
      seen.add(kind);
    }
    expect([...seen].sort()).toEqual(['away', 'bye', 'final', 'neutral', 'non-win', 'win']);
    expect(changed.season).toEqual(original.season);
    expect(nrlCareerFinance(changed).cash - nrlCareerFinance(original).cash).toBe(gap);
    expect(raw(readNrlCareerSave(raw(changed))!)).toBe(raw(changed));

    const next = reduceNrlCareer(changed, { type: 'startNextSeason' });
    expect(next.finance.ticketReview).toBeUndefined();
    expect(next.history[0].finance?.ticketReview).toEqual({ round, tier: 'premium' });
    expect(next.history[0].attendanceForm).toHaveLength(24);
    expect(next.finance.openingCash).toBe(nrlCareerFinance(changed).cash);
    expect(raw(readNrlCareerSave(raw(next))!)).toBe(raw(next));
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

  it('can return to Standard during an away round and only changes the next paid home gate', () => {
    const year = 2027, clubId = 'bears', round = 14;
    let original = choose(createNrlCareer(clubId, 17, year), 'premium');
    while (original.season.round < round) original = advance(original);
    const act = { type: 'reviewTicketTier', year, clubId, round, tier: 'standard' } as const;
    let changed = reduceNrlCareer(original, act);
    expect(changed.finance.ticketReview).toEqual({ round, tier: 'standard' });
    const firstGates = changed.finance.gateReceipts;
    for (let awayRound = round; awayRound < 16; awayRound++) {
      expect(nrlNextRound(changed.season).clubMatch?.awayId).toBe(clubId);
      original = advance(original);
      changed = advance(changed);
      expect(changed.finance.gateReceipts).toBe(firstGates);
    }
    original = advance(original);
    changed = advance(changed);
    expect(changed.finance.gateReceipts - original.finance.gateReceipts).toBe(24_000);
    expect(changed.season).toEqual(original.season);
    expect(raw(readNrlCareerSave(raw(changed))!)).toBe(raw(changed));
  });

  it('previews the remaining home gates before committing the one review', () => {
    let career = choose(start(), 'value');
    while (career.season.round < 14) career = advance(career);
    const review = () => <NrlCareerOffice career={career} onAction={event => {
      career = reduceNrlCareer(career, event);
      return true;
    }} screen="finances" disabled={false} />;
    const view = render(review());
    const initialSave = raw(career);
    const picker = screen.getByLabelText('Midseason ticket review');
    const confirm = screen.getByRole('button', { name: 'Confirm ticket prices' });
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/5 remaining regular-season home games/)).toHaveTextContent('$1,240,000 to $1,290,000');
    fireEvent.change(picker, { target: { value: 'premium' } });
    expect(raw(career)).toBe(initialSave);
    expect(screen.getByText(/5 remaining regular-season home games/)).toHaveTextContent('$1,080,000 to $1,440,000');
    fireEvent.click(confirm);
    career = readNrlCareerSave(raw(career))!;
    view.rerender(review());
    expect(screen.getByLabelText('Home ticket pricing')).toHaveValue('premium');
    expect(screen.queryByLabelText('Midseason ticket review')).toBeNull();
    expect(screen.getByText('Value to Premium from Round 14.')).toBeVisible();
  });
});
