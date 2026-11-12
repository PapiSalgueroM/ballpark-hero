import { lazy, Suspense, type ReactNode } from 'react';
import AdBanner from '@/components/ads/AdBanner';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';

const ClubManagerHelp = lazy(() => import('@/components/club-manager/ClubManagerHelp'));

export function ClubManagerFrame({ catalogue, children }: { catalogue: ReactNode; children: ReactNode }) {
  return (
    <>
      <PageSeo
        title="Club Manager: Football Management Sim | DoUKnowBall"
        description="Pick a real club, set your tactics, work the transfer market and survive the sack race across league seasons and the competitions each league plays."
        path="/club-manager"
      />
      <GameShell
        help="none"
        width="wide"
        showReportQuestion
        reportGameType="club-manager"
      >
        <div className="relative">
          {/* Round 1328: the "?" is 44 by 44 now, pulled 8px further into the
              corner so it covers no more of the screen than the old 36px one. */}
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right" className="-mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
            <Suspense fallback={<div role="status" className="min-h-48 py-12 text-center text-sm text-muted-foreground">Loading screen...</div>}>
              <ClubManagerHelp />
            </Suspense>
          </HowToPlayPopover>
          {children}
        </div>
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1
          title="Club Manager: Football Management Sim"
          description="Manage a current football club or start in one of four past seasons. J1 League, K League 1 and the Chinese Super League open with generated squads. J1 can use verified opponents and home sides in 2026/27, with simulated dates, stadiums and results. Pick your tactics, sign players and keep the board happy."
          howToPlay={[
            'Choose your season, nation, league and club. Pick Japan for the 2026/27 J1 start or China for the 2026 Chinese Super League start.',
            'Set your formation and starting eleven. Choose Play Live or Quick Sim. Open the Calendar to play ahead.',
            'Sign players, renew contracts and check the board screen for your targets.',
            'Review your results at the end of the season. Tap Managers to switch between your saved careers.',
          ]}
        >
          {/* Round 655: every league and club as readable text, below the guide. */}
          {catalogue}
        </GameSeoContent>
        <GameNav />
      </GameShell>
    </>
  );
}
