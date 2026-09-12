import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GauntletBoard from '@/components/gauntlet/GauntletBoard';
import { NBA_GAUNTLET_CONFIG } from '@/lib/gauntletDraftNba';

/**
 * Gauntlet Draft: NBA. Same game as /gauntlet-draft wearing the NBA's own pool,
 * positions and ladder. Round 520 built this as a 230 line page; Round 538
 * moved all of it into src/components/gauntlet/GauntletBoard.tsx, which four
 * sports now share.
 */
export default function NbaGauntletDraft() {
  return (
    <>
      <PageSeo
        title="Gauntlet Draft: NBA, Pick Five, Survive Five | DoUKnowBall"
        description="The NBA draft mode: five picks of five real players each, one per starting five slot, then your five runs a five round knockout against ever stronger opposition. One shared daily draft, an unlimited mode, and the same five always runs the same gauntlet."
        path="/nba-gauntlet-draft"
      />
      <GameShell width="narrow" title="Gauntlet Draft: NBA" emoji="⚔️" subtitle="Pick your five, five cards at a time, then survive the cup.">
        <GauntletBoard config={NBA_GAUNTLET_CONFIG} />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-gauntlet-draft" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Gauntlet Draft: NBA, Pick Five, Survive Five"
          description="The NBA draft mode: each of the five starting five slots deals five real players from a star to a bargain, you keep one per slot, and the finished five runs a five round knockout against ever stronger invented opposition. One shared daily draft, unlimited redrafts, and a fully deterministic cup run so the draft is the game."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
