import { GameNavbar } from '@/components/game/GameNavbar';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Footer } from '@/components/game/Footer';

const NhlMyCareer = () => {
  return (
    <>
      <PageSeo
        title="NHL My Career - Live a Whole Career | DoUKnowBall"
        description="Create a prospect, join a real NHL team, and live a full career: season stat lines, contracts, injuries, rings and a legacy verdict that decides if the Hall in Toronto calls."
        path="/nhl-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NHL My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft day to the farewell tour. Every offseason bends the career.
            </p>
          </div>
          <NhlMyCareerBoard />
          <GameSeoContent
            title="NHL My Career: the Player Life Sim"
            description="Build a fictional prospect and live a whole NHL career inside the real league. Archetypes drive realistic season lines, choices drive everything else, and the legacy verdict at the end tells you exactly what your career meant."
            howToPlay={[
              'Create your player: name, position and archetype.',
              'Play each season for a realistic stat line driven by rating, health and team quality.',
              'One big decision arrives every offseason: contracts, trades, surgeries, fame.',
              'Stack awards and rings, fight the aging curve, and retire to the verdict.',
            ]}
            examples={[
              'A generational talent who delivers on every ounce of hype',
              'A late pick who grinds into a franchise legend',
              'Leaving home for the biggest contract in league history',
            ]}
          />
          <GameNav />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default NhlMyCareer;
