import { GameNavbar } from '@/components/game/GameNavbar';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const MlbFrontOffice = () => {
  return (
    <>
      <PageSeo
        title="MLB Front Office - GM Sim With Real 2026 Rosters | DoUKnowBall"
        description="Run a real MLB franchise: payroll under the tax line, DFAs, trades the AI evaluates, the 162, October baseball from the Wild Card to the World Series, drafts and dynasties."
        path="/mlb-front-office"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">MLB Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real 2026 rosters. Real tax-line pain. October does not forgive.
            </p>
          </div>
          <MlbFrontOfficeBoard />
          <GameSeoContent
            title="MLB Front Office: the GM Sim"
            description="Take over a real MLB club with its actual 2026 roster, every player rated off real 2025 stats pulled from the league's own data. Manage the payroll against the luxury tax line, DFA dead weight, sign free agents, swing trades the AI weighs on age, position and rating, then grind the 162 in simulated stretches. Win your division for a bye, survive the best-of-3 Wild Card round, the Division Series, the LCS and the World Series. Draft prospects whose scouting grades can lie, ride aging curves and retirements, and stack rings across unlimited saved seasons."
            howToPlay={[
              'Pick a franchise and inherit its real 2026 lineup, rotation and bullpen.',
              'Work the payroll: DFA contracts, sign free agents, swing trades with pick sweeteners.',
              'Play the season in stretches and watch six division races tighten.',
              'Win the division for a top-3 seed; the top two skip the Wild Card round entirely.',
              'Survive three playoff rounds and the World Series, then draft and go again.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Trade an aging ace for a young shortstop before the deadline',
              'Sneak in as the 6 seed and steal a pennant',
              'Draft a 90-grade prospect who turns out to be a 76',
              'Keep a juggernaut under the tax line three winters running',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default MlbFrontOffice;
