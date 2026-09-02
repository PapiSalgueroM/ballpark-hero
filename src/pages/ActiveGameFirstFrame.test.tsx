import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GiveUpButton', () => ({ GiveUpButton: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/higher-lower/HigherLowerHowToPlay', () => ({ HigherLowerHowToPlay: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

import HigherLowerGame from '@/pages/HigherLower';
import { higherLowerPlayers } from '@/data/higherLowerPlayers';

describe('active game first frame', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows an honest loading shell without painting fallback players', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.37);
    const html = renderToString(<HigherLowerGame />);

    expect(random).not.toHaveBeenCalled();
    expect(html).toContain('Choosing matchup...');
    expect(html).not.toContain(higherLowerPlayers[0].name);
    expect(html).not.toContain(higherLowerPlayers[1].name);
  });
});
