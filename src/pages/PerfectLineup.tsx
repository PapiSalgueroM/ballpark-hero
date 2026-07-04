import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameShell } from '@/components/game/GameShell';
import PerfectLineupBoard from '@/components/perfect-lineup/PerfectLineupBoard';

const PerfectLineup = () => {
  return (
    <>
      <PageSeo
        title="Perfect Lineup: Build a Squad Under Random Constraints | DoUKnowBall"
        description="Fill a 4-3-3 where every slot demands a player from a random league or country, then simulate the match and share your scoreline. A daily soccer squad-builder."
        path="/perfect-lineup"
      />
      <GameShell
        width="wide"
        emoji="⚽"
        title="PERFECT LINEUP"
        subtitle="Build the best XI you can, but every constrained slot only accepts a player from that league or country. Then simulate the match and share your result."
      >
        <PerfectLineupBoard />

        <GameSeoContent
          title="Perfect Lineup: Daily Soccer Squad Builder"
          description="Perfect Lineup is a daily soccer puzzle inspired by viral squad-builders. Each day you get a 4-3-3 where most slots are locked to a specific league or nationality. Pick a real, eligible player for every position, then run a simulation that scores your squad on star power and chemistry and turns it into a shareable scoreline."
          howToPlay={[
            'Each slot shows a position and, often, a league or country constraint.',
            'Tap a slot and search for any real player who fits both the position and the constraint.',
            'Constrained slots reward knowing obscure players from leagues around the world.',
            'Fill all 11 slots, then hit Simulate Match to score your squad.',
            'Share your scoreline, grade, and chemistry with the result card.',
          ]}
          examples={[
            'A "Serie A" striker slot accepts any striker who plays in Italy.',
            'A "Brazil" winger slot accepts any Brazilian winger.',
            'Higher market values and shared leagues/nationalities boost your rating and chemistry.',
          ]}
        />
      </GameShell>
    </>
  );
};

export default PerfectLineup;
