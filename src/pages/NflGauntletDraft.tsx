import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GauntletBoard from '@/components/gauntlet/GauntletBoard';
import { NFL_GAUNTLET_CONFIG } from '@/lib/gauntletDraftNfl';

/**
 * Gauntlet Draft: NFL. Same game as /gauntlet-draft wearing the NFL's own pool,
 * positions and ladder. Round 520 built this as a 230 line page; Round 538
 * moved all of it into src/components/gauntlet/GauntletBoard.tsx, which four
 * sports now share, and left the page as the copy a crawler reads. See
 * src/lib/gauntletDraftNfl.ts for why the draft is scoped to the four skill
 * positions rather than forcing an eleven man lineup.
 */
export default function NflGauntletDraft() {
  return (
    <>
      <PageSeo
        title="Gauntlet Draft: NFL, Pick Five, Survive Five | DoUKnowBall"
        description="The NFL draft mode: seven picks of five real players each, one per starting offense slot, then your offense runs a five round knockout against ever stronger opposition. One shared daily draft, an unlimited mode, and the same offense always runs the same gauntlet."
        path="/nfl-gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft: NFL" emoji="⚔️" subtitle="Pick your offense, five cards at a time, then survive the cup.">
        <GauntletBoard config={NFL_GAUNTLET_CONFIG} />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nfl-gauntlet-draft" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Gauntlet Draft: NFL, Pick Five, Survive Five"
          description="The NFL draft mode: each of the seven starting offense slots deals five real players from a star to a bargain, you keep one per slot, and the finished offense runs a five round knockout against ever stronger invented opposition. One shared daily draft, unlimited redrafts, and a fully deterministic cup run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
