import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { NascarChainBoard } from '@/components/nascar-chain/NascarChainBoard';

export default function NascarChain() {
  return (
    <>
      <PageSeo
        title="NASCAR Chain - Cup Champion Chain Game | DoUKnowBall"
        description="Name drivers who beat each other to the NASCAR Cup Series championship. Build the longest chain."
        path="/nascar-chain"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <NascarChainBoard />
      <GameSeoContent
          pageHasOwnH1
        title="NASCAR Chain Game | DoUKnowBall"
        description="Build the longest chain of NASCAR Cup Series drivers by naming someone who raced against the current driver. Test your knowledge of stock car racing history."
        howToPlay={[
          "Start with a given NASCAR driver. Name another driver who competed against them.",
          "Each valid connection extends your chain. Keep going as long as you can.",
          "Compete on the daily leaderboard or play unlimited mode for practice."
        ]}
        examples={[
          "Dale Earnhardt → Jeff Gordon (1990s rivals)",
          "Richard Petty → David Pearson (1970s duels)",
          "Jimmie Johnson → Tony Stewart (2000s championship battles)",
          "Kyle Busch → Kevin Harvick (2010s competition)",
          "Chase Elliott → Ryan Blaney (current era)",
          "Dale Earnhardt Jr. → Matt Kenseth (2000s contemporaries)"
        ]}
      />
    </>
  );
}
