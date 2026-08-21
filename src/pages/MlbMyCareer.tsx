import { GameNavbar } from '@/components/game/GameNavbar';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const MlbMyCareer = () => {
  return (
    <>
      <PageSeo
        title="MLB My Career - Live a Whole Career | DoUKnowBall"
        description="Create a prospect, join a real MLB team, and live a full career: season stat lines, contracts, injuries, rings and a legacy verdict that decides if Cooperstown calls."
        path="/mlb-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">MLB My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft day to the farewell tour. Every offseason bends the career.
            </p>
          </div>
          <MlbMyCareerBoard />
          <GameSeoContent
          pageHasOwnH1
            title="MLB My Career: the Player Life Sim"
            description="Build a fictional prospect and live a whole MLB career inside the real league. Archetypes drive realistic season lines, choices drive everything else, and the legacy verdict at the end tells you exactly what your career meant."
            howToPlay={[
              'Create your player: name, one of 11 positions from starting pitcher to designated hitter, and an archetype.',
              'Pick your league first: today\'s MLB, or the 2004 throwback with the Expos in Montreal and the Anaheim Angels.',
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
      </div>
    </>
  );
};

export default MlbMyCareer;
