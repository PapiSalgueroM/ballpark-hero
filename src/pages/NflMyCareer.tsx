import { GameNavbar } from '@/components/game/GameNavbar';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NflMyCareer = () => {
  return (
    <>
      <PageSeo
        title="NFL My Career - Draft to Canton Career Sim | DoUKnowBall"
        description="Create a prospect, get drafted by a real NFL team, and live a whole career: stats, contracts, holdouts, injuries, rings, MVPs and a legacy verdict."
        path="/nfl-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NFL My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft night to retirement speech. Every choice bends the career.
            </p>
          </div>
          <NflMyCareerBoard />
          <GameSeoContent
            title="NFL My Career: the Player Life Sim"
            description="Build a fictional prospect and live a full NFL career inside the real league. Your position and archetype drive realistic season stat lines, your choices drive everything else: training focus, holdouts, trade requests, surgeries, hometown discounts or max-money moves. Chase rings, MVPs and All-Pro nods, fight the aging curve, and retire to a legacy verdict that tells you if Canton calls."
            howToPlay={[
              'Create your player: name, one of 8 positions (QB, RB, WR, TE, LB, CB, EDGE, K) and an archetype, then get drafted by a real team.',
              'Pick your league first: today\'s NFL, or the 2005 throwback with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis.',
              'Play each season for a realistic stat line driven by your rating, your health and your team.',
              'Between seasons, one big decision arrives: contracts, trade requests, surgeries, podcasts, training focus.',
              'Running backs fall off a cliff early, field surgeons age like wine. Plan the career, not the season.',
              'Retire (or get forced out) and face the legacy verdict: from cup of coffee to first-ballot immortal.',
            ]}
            examples={[
              'A dual-threat QB who wins MVP at 25 and blows a knee at 28',
              'A bellcow back with three straight All-Pros and nothing left at 30',
              'Taking the hometown discount and finally winning it all at 34',
              'Requesting a trade out of a 3-win rebuild and landing on a contender',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NflMyCareer;
