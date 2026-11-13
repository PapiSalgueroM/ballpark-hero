import { cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContractChaos from '@/pages/ContractChaos';
import { recordCompletion } from '@/lib/completions';
import { buildDeal, dailySeed, freeSeed, SAVE_KEY } from '@/lib/contractChaos';

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: import('react').ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => undefined }));
vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  getCurrentPlayerName: () => 'Fixture player',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const day = '2026-11-11';
const daily = buildDeal(dailySeed(day));
const button = (view: RenderResult, name: string | RegExp) => within(view.container).getByRole('button', { name });
const mount = () => render(<MemoryRouter><ContractChaos /></MemoryRouter>);
const saved = () => localStorage.getItem(SAVE_KEY);
const firstClub = daily.offers[0].fa.label;

function openOffer(view: RenderResult, label: string) {
  fireEvent.click(within(view.container).getByText(label, { exact: true }).closest('button')!);
}

function signDaily(view: RenderResult) {
  fireEvent.click(button(view, "Open today's offers"));
  openOffer(view, firstClub);
  fireEvent.click(button(view, 'Sign here'));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T22:00:00Z'));
  vi.mocked(recordCompletion).mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Contract Chaos Daily receipt on a stale menu', () => {
  it('shows the stored result before a stale menu can open a completed deal', () => {
    const stale = mount();
    const fresh = mount();
    signDaily(fresh);
    const before = saved();
    expect(within(fresh.container).getByText('Season 1 of 5')).toBeVisible();
    expect(JSON.parse(before!).daily.date).toBe(day);

    fireEvent.click(button(stale, "Open today's offers"));
    expect(within(stale.container).queryByText(firstClub, { exact: true })).toBeNull();
    expect(within(stale.container).getByText(`You signed at ${firstClub}. A new player tomorrow.`)).toBeVisible();
    expect(saved()).toBe(before);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/contract-chaos', undefined, 'Fixture player', 0);
  });

  it('still rejects a signature if the deal was opened before another tab signed', () => {
    const stale = mount();
    fireEvent.click(button(stale, "Open today's offers"));
    openOffer(stale, daily.offers[1].fa.label);
    const fresh = mount();
    signDaily(fresh);
    const before = saved();

    fireEvent.click(button(stale, 'Sign here'));
    expect(within(stale.container).getByText(`You signed at ${firstClub}. A new player tomorrow.`)).toBeVisible();
    expect(saved()).toBe(before);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('leaves Free Play available on a stale menu and retains the Daily receipt', () => {
    const stale = mount();
    const fresh = mount();
    signDaily(fresh);
    const before = JSON.parse(saved()!);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    fireEvent.click(button(stale, 'Deal me a client'));
    openOffer(stale, buildDeal(freeSeed(0.5)).offers[0].fa.label);
    fireEvent.click(button(stale, 'Sign here'));
    const after = JSON.parse(saved()!);
    expect(after.daily).toEqual(before.daily);
    expect(after.played).toBe(before.played + 1);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
  });
});
