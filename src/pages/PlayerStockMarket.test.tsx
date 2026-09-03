import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, MarketRow } from '@/lib/playerStockMarket';

const stockMocks = vi.hoisted(() => ({
  assembleCampaign: vi.fn<(rows: MarketRow[], seed: number) => Campaign | null>(),
  fetchCampaignRows: vi.fn<(startYear: number) => Promise<MarketRow[] | null>>(),
}));

vi.mock('@/lib/playerStockMarket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/playerStockMarket')>();
  return {
    ...actual,
    assembleCampaign: stockMocks.assembleCampaign,
    dailyCampaignSeed: () => 101,
    fetchCampaignRows: stockMocks.fetchCampaignRows,
    randomCampaignSeed: () => 202,
    startYearFor: () => 2020,
  };
});

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

import PlayerStockMarket from '@/pages/PlayerStockMarket';

const recoveredCampaign: Campaign = {
  startYear: 2020,
  finalYear: 2026,
  budget: 200_000_000,
  slots: [{
    slot: { label: 'GK', allowed: ['GK'], x: 50, y: 90 },
    offerYear: 2020,
    candidates: [{
      name: 'Recovered Keeper',
      club: 'Test Club',
      nationality: 'Testland',
      position: 'GK',
      age: 25,
      series: [{ year: 2020, value: 5_000_000 }],
      output: [],
      price: 5_000_000,
      final: 8_000_000,
    }],
  }],
};

beforeEach(() => {
  stockMocks.assembleCampaign.mockReset();
  stockMocks.fetchCampaignRows.mockReset();
});

describe('Player Stock Market load recovery', () => {
  it('describes a load failure without blaming the player connection', async () => {
    stockMocks.fetchCampaignRows.mockResolvedValue(null);
    render(<PlayerStockMarket />);

    fireEvent.click(screen.getByRole('button', { name: /daily market/i }));

    const error = await screen.findByText(/Couldn't open the market right now/);
    expect(error).toHaveTextContent("Couldn't open the market right now");
    expect(error).not.toHaveTextContent(/connection/i);
  });

  it('retries the failed request and opens the recovered campaign', async () => {
    stockMocks.fetchCampaignRows
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);
    stockMocks.assembleCampaign.mockReturnValue(recoveredCampaign);
    render(<PlayerStockMarket />);

    fireEvent.click(screen.getByRole('button', { name: /daily market/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText(/Buy 1 of 1/)).toBeInTheDocument());
    expect(screen.getByText(/Anonymous GK/)).toBeInTheDocument();
    expect(stockMocks.fetchCampaignRows).toHaveBeenCalledTimes(2);
  });
});
