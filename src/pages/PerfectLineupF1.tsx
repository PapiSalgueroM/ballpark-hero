import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GenericLineupBoard from '@/components/perfect-lineup/GenericLineupBoard';
import { F1_LINEUP_CONFIG } from '@/data/f1PerfectLineupPool';
import { GameShell } from '@/components/game/GameShell';

const PerfectLineupF1 = () => {
  return (
    <>
      <PageSeo
        title="Perfect Lineup: F1 Dream Driver Squad Builder | DoUKnowBall"
        description="Build a five-driver F1 dream team where every slot demands a driver from a random team, era, or country, then simulate a season and share your result."
        path="/perfect-lineup-f1"
      />
      <GameShell
        width="wide"
        emoji="🏎️"
        title="Perfect Lineup: F1"
        subtitle="Assemble a five-driver dream squad, but constrained slots only accept a driver from that team, era, or country. Then simulate a season and share your result."
        showReportQuestion
      >
        <GenericLineupBoard config={F1_LINEUP_CONFIG} />

        <GameSeoContent
          pageHasOwnH1
          title="Perfect Lineup: F1 Daily Driver Squad Builder"
          description="Perfect Lineup: F1 hands you five driver slots, most locked to a specific constructor, era, or nationality. Pick a real eligible driver for each, then run a simulation that scores your squad on pace and chemistry and turns it into a shareable result."
          howToPlay={[
            'Each slot often carries a team, era, or country constraint.',
            'Tap a slot and pick a real F1 driver who fits the constraint.',
            'Drivers from the same team, era, or country boost chemistry.',
            'Fill all five slots, then Simulate to score your squad.',
            'Share your win tally, grade, and chemistry.',
          ]}
          examples={[
            'A "Ferrari" slot accepts any driver who raced for Ferrari.',
            'A "Finland" slot accepts any Finnish driver in the pool.',
          ]}
        />
      </GameShell>
    </>
  );
};

export default PerfectLineupF1;
