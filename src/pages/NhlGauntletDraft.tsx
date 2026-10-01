import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GauntletBoard from '@/components/gauntlet/GauntletBoard';
import { NHL_GAUNTLET_CONFIG } from '@/lib/gauntletDraftNhl';

/**
 * Gauntlet Draft: NHL (Round 724). The same game as /gauntlet-draft and the
 * NBA, NFL and MLB drafts, drawn by the shared board in
 * src/components/gauntlet/GauntletBoard.tsx and wearing hockey's own roster
 * data, lineup and playoff ladder. See src/lib/gauntletDraftNhl.ts for where
 * the players and the ratings come from.
 */
export default function NhlGauntletDraft() {
  return (
    <>
      <PageSeo
        title="Gauntlet Draft: NHL, Draft Your Lines, Win the Cup | DoUKnowBall"
        description="The NHL draft mode: eleven picks of five real players each, two forward lines, two defense pairs and a goalie, then your lineup runs a five round playoff against ever stronger opposition. One shared daily draft, an unlimited mode, and the same lineup always runs the same gauntlet."
        path="/nhl-gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft: NHL" emoji="🏒" subtitle="Draft your lines five cards at a time, then survive the playoffs.">
        <GauntletBoard config={NHL_GAUNTLET_CONFIG} />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nhl-gauntlet-draft" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Gauntlet Draft: NHL, Draft Your Lines, Win the Cup"
          description="The NHL draft mode: each of the eleven spots in the lineup, two forward lines, two defense pairs and a goalie, deals five real players from a star to a bargain, you keep one per spot, and the finished lineup runs a five round playoff against ever stronger invented opposition. Players and ratings come from real 2026-27 rosters, with skaters rated off their scoring and goalies off their save percentage and wins. One shared daily draft, unlimited redrafts, and a fully deterministic run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
