import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GauntletBoard from '@/components/gauntlet/GauntletBoard';
import { MLB_GAUNTLET_CONFIG } from '@/lib/gauntletDraftMlb';

/**
 * Gauntlet Draft: MLB (Round 538). The same game as /gauntlet-draft, /nba-
 * and /nfl-gauntlet-draft, drawn by the shared board in
 * src/components/gauntlet/GauntletBoard.tsx and wearing baseball's own roster
 * data, lineup card and postseason ladder. See src/lib/gauntletDraftMlb.ts for
 * where the players and the ratings come from.
 */
export default function MlbGauntletDraft() {
  return (
    <>
      <PageSeo
        title="Gauntlet Draft: MLB, Fill the Card, Win the Series | DoUKnowBall"
        description="The MLB draft mode: eleven picks of five real players each, one per spot on the lineup card, then your lineup runs a five round postseason against ever stronger opposition. One shared daily draft, an unlimited mode, and the same lineup always runs the same gauntlet."
        path="/mlb-gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft: MLB" emoji="⚾" subtitle="Fill the lineup card, five cards at a time, then survive October.">
        <GauntletBoard config={MLB_GAUNTLET_CONFIG} />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="mlb-gauntlet-draft" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Gauntlet Draft: MLB, Fill the Card, Win the Series"
          description="The MLB draft mode: each of the eleven spots on the lineup card, the nine in the batting order plus a starter and a closer, deals five real players from a star to a bargain, you keep one per spot, and the finished lineup runs a five round postseason against ever stronger invented opposition. Players and ratings come from real 2026 rosters, with hitters rated off their production and pitchers off theirs. One shared daily draft, unlimited redrafts, and a fully deterministic run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
