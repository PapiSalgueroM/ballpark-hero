import { GameNavbar } from '@/components/game/GameNavbar';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaMyCareer = () => {
  return (
    <>
      <PageSeo
        title="NBA My Career - Draft Night to the Rafters | DoUKnowBall"
        description="Create a prospect, get drafted by a real NBA team, and live a whole career: per-game stat lines, contracts, trade demands, rings, MVPs and a legacy verdict."
        path="/nba-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NBA My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft night to jersey retirement. Every summer bends the career.
            </p>
          </div>
          <NbaMyCareerBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NBA My Career: the Player Life Sim"
            description="Build a fictional prospect and live a full NBA career inside the real league. Your position and archetype drive realistic per-game lines, and every summer brings one big decision: hometown discount or the max somewhere new, surgery or load management, the podcast or the gym. Chase rings, MVPs, Finals MVPs and All-NBA nods, fight Father Time, and retire to a verdict that runs from ten-day contracts to the GOAT debate."
            howToPlay={[
              'Create your player: name, one of 5 positions (PG, SG, SF, PF, C) and archetype, from Point God to Paint Beast.',
              'Pick your league first: today\'s NBA, or the 2003-04 throwback with the SuperSonics in Seattle and no Charlotte yet.',
              'Play each season for a per-game stat line driven by your rating, health and team quality.',
              'One big decision arrives every summer: contracts, trade demands, surgeries, brand building.',
              'Awards stack your legacy: Rookie of the Year, All-NBA, MVP, Finals MVP, rings.',
              'Retire and face the verdict. The GOAT debate tier is real and it is brutal to reach.',
            ]}
            examples={[
              'A Point God who wins back-to-back MVPs and never gets the ring',
              'A Paint Beast who dominates for six years and falls apart at 31',
              'Taking the discount to finally win one at 36',
              'Demanding out of a rebuild and becoming a villain everywhere',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NbaMyCareer;
