import { TennisChainBoard } from '@/components/tennis-chain/TennisChainBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function TennisChain() {
  return (
    <>
      <PageSeo
        title="Tennis Chain — Grand Slam Chain Game"
        description="Build the longest chain of tennis players! Name someone who beat the current player at a Grand Slam. Covers ATP and WTA from 1970 to 2025."
        path="/tennis-chain"
      />
      <TennisChainBoard />
      <GameSeoContent
        title="Tennis Chain Game | DoUKnowBall"
        description="Build the longest chain of tennis players by naming someone who defeated the current player at a Grand Slam. Covers ATP and WTA tours from 1970 to 2025."
        howToPlay={[
          "Start with a given tennis player. Name someone who beat them at a Grand Slam tournament.",
          "Each valid defeat connection extends your chain. Keep going as long as you can.",
          "Compete on the daily leaderboard or play unlimited for practice."
        ]}
        examples={[
          "Federer → Nadal (multiple Roland Garros finals)",
          "Nadal → Djokovic (Australian Open, Wimbledon)",
          "Serena Williams → Angelique Kerber (Australian Open 2016)",
          "Djokovic → Medvedev (US Open 2021)",
          "Murray → Wawrinka (French Open 2017)",
          "Osaka → Brady (Australian Open 2021)"
        ]}
      />
    </>
  );
}
