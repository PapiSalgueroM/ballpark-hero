import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import GenericLineupBoard from '@/components/perfect-lineup/GenericLineupBoard';
import { NHL_LINEUP_CONFIG } from '@/data/nhlPerfectLineupPool';

const PerfectLineupNhl = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="Perfect Lineup: NHL Dream Line Under Random Constraints | DoUKnowBall"
        description="Build an NHL dream line: three forwards, two defensemen and a goalie, where every slot demands a player from a random team or era, then simulate and share."
        path="/perfect-lineup-nhl"
      />
      <GameNavbar />
      <main className="flex-1 pt-6">
        <header className="text-center mb-6 px-4">
          <h1 className="text-3xl font-black text-foreground">🏒 Perfect Lineup: NHL</h1>
          <p className="text-muted-foreground mt-1 max-w-xl mx-auto">
            Build a dream line: LW, C, RW, two defensemen and a goalie, but constrained slots only
            accept a player from that team or era. Then simulate the game and share your result.
          </p>
        </header>

        <GenericLineupBoard config={NHL_LINEUP_CONFIG} />

        <GameSeoContent
          title="Perfect Lineup: NHL Daily Hockey Line Builder"
          description="Perfect Lineup: NHL gives you a six-slot hockey line where most slots are locked to a specific franchise or era. Pick a real eligible player for every position, then run a simulation that scores your line on talent and chemistry and turns it into a shareable result."
          howToPlay={[
            'Each slot shows a position (LW, C, RW, D, D, G) and often a team or era constraint.',
            'Tap a slot and pick a real player who fits both the position and the constraint.',
            'Players from the same team or era boost your chemistry.',
            'Fill all six slots, then Simulate to score your line.',
            'Share your scoreline, grade, and chemistry.',
          ]}
          examples={[
            'An "Oilers" center slot accepts any center who starred for Edmonton.',
            'A "1990s" defenseman slot accepts any defenseman from that era.',
          ]}
        />
      </main>
      <Footer />
    </div>
  );
};

export default PerfectLineupNhl;
