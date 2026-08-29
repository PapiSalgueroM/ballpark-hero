import { CombatChainBoard } from '@/components/ufc-chain/CombatChainBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';

export default function UfcChain() {
  return (
    <>
      <PageSeo
        title="Combat Chain - MMA Fighter Chain Game | DoUKnowBall"
        description="Build the longest chain of MMA fighters. Name a fighter who defeated the current fighter to extend your chain."
        path="/ufc-chain"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <CombatChainBoard />
      <GameSeoContent
          pageHasOwnH1
        title="MMA Combat Chain Game | DoUKnowBall"
        description="Build the longest chain of MMA fighters by naming someone who defeated the current fighter. Covers UFC, Bellator, and all major promotions."
        howToPlay={[
          "Start with a given MMA fighter. Name another fighter who beat them in an official bout.",
          "Each valid win connection extends your chain. Keep the streak going as long as you can.",
          "Compete on the daily leaderboard or play unlimited and weight-class modes."
        ]}
        examples={[
          "Conor McGregor → Khabib Nurmagomedov → Justin Gaethje → Charles Oliveira",
          "Ronda Rousey → Holly Holm → Miesha Tate → Amanda Nunes",
          "Anderson Silva → Chris Weidman → Luke Rockhold → Michael Bisping",
          "Georges St-Pierre → Matt Serra → Matt Hughes → BJ Penn",
          "Jon Jones → Alexander Gustafsson → Daniel Cormier",
          "Max Holloway → Alexander Volkanovski → Islam Makhachev"
        ]}
      />
    </>
  );
}
