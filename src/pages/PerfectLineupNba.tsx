import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GenericLineupBoard from '@/components/perfect-lineup/GenericLineupBoard';
import { NBA_LINEUP_CONFIG } from '@/data/nbaPerfectLineupPool';
import { GameShell } from '@/components/game/GameShell';

const PerfectLineupNba = () => {
  return (
    <>
      <PageSeo
        title="Perfect Lineup: NBA Starting 5 Under Random Constraints | DoUKnowBall"
        description="Build an NBA starting five where every slot demands a player from a random team or era, then simulate the game and share your scoreline."
        path="/perfect-lineup-nba"
      />
      <GameShell
        width="wide"
        title="Perfect Lineup: NBA"
        emoji="🏀"
        subtitle="Build the best starting five you can, but constrained slots only accept a player from that team or era. Then simulate the game and share your result."
      >
        <GenericLineupBoard config={NBA_LINEUP_CONFIG} />

        <GameSeoContent
          pageHasOwnH1
          title="Perfect Lineup: NBA Daily Basketball Squad Builder"
          description="Perfect Lineup: NBA gives you a starting five where most slots are locked to a specific franchise or era. Pick a real eligible player for every position, then run a simulation that scores your squad on talent and chemistry and turns it into a shareable scoreline."
          howToPlay={[
            'Each slot shows a position and often a team or era constraint.',
            'Tap a slot and pick a real player who fits both the position and the constraint.',
            'Players from the same team or era boost your chemistry.',
            'Fill all five slots, then Simulate to score your squad.',
            'Share your scoreline, grade, and chemistry.',
          ]}
          examples={[
            'A "Lakers" center slot accepts any center who starred for the Lakers.',
            'A "1990s" guard slot accepts any guard from that era.',
          ]}
        />
      </GameShell>
    </>
  );
};

export default PerfectLineupNba;
