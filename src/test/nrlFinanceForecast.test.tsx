import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCoachSpend, nrlFinanceForecast, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerState, type NrlTicketTier,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, nrlRegularRounds, reduceNrlSeason } from '@/lib/nrlManager';

afterEach(cleanup);

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const forecastFor = (career: NrlCareerState) => nrlFinanceForecast(career)!;
const setTier = (career: NrlCareerState, tier: NrlTicketTier) => reduceNrlCareer(career, {
  type: 'setTicketTier', tier, year: career.season.year, round: career.season.round,
});

function openForecast(career: NrlCareerState) {
  const action = vi.fn(() => false);
  render(<NrlCareerOffice career={career} screen="finances" onAction={action} disabled={false} />);
  const toggle = screen.getByText('Season cash forecast', { exact: true });
  const details = toggle.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(toggle);
  expect(details).toHaveAttribute('open');
  expect(action).not.toHaveBeenCalled();
  return within(details);
}

describe('NRL season cash forecast', () => {
  it('shows a scheduled gate range and the estimate assumptions without dispatching a save action', () => {
    const career = createNrlCareer('storm', 4);
    const bytes = JSON.stringify(career);
    const forecast = openForecast(career);
    expect(forecast.getByText('$2,880,000 to $3,240,000')).toBeVisible();
    expect(forecast.getByText('Estimated closing cash')).toBeVisible();
    expect(forecast.getByText(/simulated amounts/)).toBeVisible();
    expect(forecast.getByText(/Later finals/)).toBeVisible();
    expect(JSON.stringify(career)).toBe(bytes);
  });

  it('describes partial accounts and holds the forecast until next season on a completed v1 import', () => {
    let season = createNrlSeason('storm', 4);
    season = reduceNrlSeason(season, { type: 'advance' });
    const raw = JSON.stringify(season);
    const imported = readNrlCareerSave(raw)!;
    const partial = openForecast(imported);
    expect(partial.getByText(/Accounts began in round 2/)).toBeVisible();
    const forecast = forecastFor(imported);
    const cap = nrlCareerCap(imported);
    expect(forecast).toMatchObject({ cashNow: 2_500_000, homeMatches: 11, roundsLeft: 30,
      funding: cap.cap - Math.floor(cap.cap / 31), playerWages: cap.committed - Math.floor(cap.committed / 31) });
    cleanup();
    while (season.phase !== 'complete') season = reduceNrlSeason(season, { type: 'advance' });
    const completed = openForecast(readNrlCareerSave(JSON.stringify(season))!);
    expect(completed.getByText('Forecast starts next season for this imported save.')).toBeVisible();
    expect(completed.queryByText('Estimated closing cash')).not.toBeInTheDocument();
  });

  it('orders the range by cash outcome at all three tiers, including the cheaper Value win', () => {
    const initial = createNrlCareer('storm', 4);
    const { cap, committed } = nrlCareerCap(initial);
    for (const [tier, low, high] of [
      ['standard', 240_000, 270_000], ['value', 248_000, 258_000], ['premium', 216_000, 288_000],
    ] as const) {
      const career = setTier(initial, tier);
      const raw = JSON.stringify(career);
      const forecast = forecastFor(career);
      const knownCosts = 31 * 75_000 + 12 * 45_000;
      expect(forecast).toMatchObject({
        roundsLeft: 31, homeMatches: 12, trips: 12, funding: cap, playerWages: committed, assistantWages: 0,
        operatingCosts: knownCosts, gateLow: 12 * low, gateHigh: 12 * high,
        closingLow: 2_500_000 + cap + 12 * low - committed - knownCosts,
        closingHigh: 2_500_000 + cap + 12 * high - committed - knownCosts,
      });
      expect(JSON.stringify(career)).toBe(raw);
    }
  });

  it('keeps committed wages through a bye and counts the signing fee and medical upgrade only as paid', () => {
    const initial = createNrlCareer('panthers', 1);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    const hired = reduceNrlCareer(initial, { type: 'hireCoach', role: 'attack', year: 2026, round: 1 });
    const upgraded = reduceNrlCareer(hired, { type: 'upgradeMedical', level: 2 });
    const before = forecastFor(upgraded);
    expect(before.cashNow).toBe(2_500_000 - 120_000 - 800_000);
    expect(before.assistantWages).toBe(31 * 18_000);
    const after = forecastFor(advance(upgraded));
    expect(after.roundsLeft).toBe(30);
    expect(after.trips).toBe(before.trips);
    expect(after.operatingCosts).toBe(before.operatingCosts - 75_000);
    expect(after.assistantWages).toBe(before.assistantWages - 18_000);
    expect(after.gateLow).toBe(before.gateLow);
    expect(after.closingLow).toBe(before.closingLow);
    expect(after.closingHigh).toBe(before.closingHigh);
  });

  it('reconciles projected commitments with each ledger tick through known, undrawn, and neutral finals', () => {
    let career = setTier(createNrlCareer('storm', 4), 'premium');
    career = reduceNrlCareer(career, { type: 'hireCoach', role: 'defense', year: 2026, round: 1 });
    const ticks: { round: number; gate: number; travel: number }[] = [];
    const forecasts: { before: NrlCareerState; forecast: ReturnType<typeof forecastFor>; scheduledThrough: number }[] = [];
    let homeFinal = false;
    let neutralFinal = false;
    while (career.season.phase !== 'complete') {
      const before = career;
      const { phase, round, year, clubId } = before.season;
      const forecast = forecastFor(before);
      const { clubMatch } = nrlNextRound(before.season);
      const scheduledThrough = phase === 'regular' ? nrlRegularRounds(year) : round;
      forecasts.push({ before, forecast, scheduledThrough });
      career = advance(before);
      ticks.push({ round, gate: career.finance.gateReceipts - before.finance.gateReceipts,
        travel: career.finance.operatingCosts - before.finance.operatingCosts - 75_000 });
      if (clubMatch?.finalsRound && clubMatch.tieId !== 'GF' && clubMatch.homeId === clubId) {
        homeFinal = true;
        expect(forecast).toMatchObject({ gateLow: 396_000, gateHigh: 426_000, homeMatches: 1, trips: 0 });
      }
      if (clubMatch?.tieId === 'GF') {
        neutralFinal = true;
        expect(forecast).toMatchObject({ gateLow: 0, gateHigh: 0, homeMatches: 0, trips: 1, roundsLeft: 1, operatingCosts: 120_000 });
        expect(forecast.closingLow).toBe(nrlCareerFinance(career).cash);
        expect(forecast.closingHigh).toBe(nrlCareerFinance(career).cash);
      }
    }
    expect(homeFinal && neutralFinal).toBe(true);
    const closed = nrlCareerFinance(career);
    for (const { before, forecast, scheduledThrough } of forecasts) {
      const undrawn = ticks.filter(tick => tick.round > scheduledThrough);
      const unknownGate = undrawn.reduce((sum, tick) => sum + tick.gate, 0);
      const unknownTravel = undrawn.reduce((sum, tick) => sum + tick.travel, 0);
      const adjustedCash = closed.cash - unknownGate + unknownTravel;
      expect(forecast.funding).toBe(closed.centralFunding - before.finance.centralFunding);
      expect(forecast.playerWages).toBe(closed.wagesPaid - before.finance.wagesPaid);
      expect(forecast.assistantWages).toBe(nrlCoachSpend(closed).wages - nrlCoachSpend(before.finance).wages);
      expect(forecast.operatingCosts).toBe(closed.operatingCosts - before.finance.operatingCosts - unknownTravel);
      expect(adjustedCash).toBeGreaterThanOrEqual(forecast.closingLow);
      expect(adjustedCash).toBeLessThanOrEqual(forecast.closingHigh);
    }
    expect(nrlFinanceForecast(career)).toBeNull();
    expect(openForecast(career).getByText('This season’s accounts are final.')).toBeVisible();
  });
});
