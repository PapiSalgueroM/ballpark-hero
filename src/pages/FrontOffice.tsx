import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const FrontOffice = () => {
  return (
    <>
      <PageSeo
        title="NFL Front Office - GM Career Sim With Real Rosters | DoUKnowBall"
        description="Run a real NFL franchise: manage the cap, sign free agents, swing trades, survive injuries, draft the future and chase a dynasty across unlimited seasons."
        path="/front-office"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NFL Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real rosters. Real cap math. Your calls. Build a dynasty one season at a time.
            </p>
          </div>
          <FrontOfficeBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NFL Front Office: the GM Sim"
            description="Take over a real NFL franchise on the real 2026 rosters, offence and defence, rated off 2025 production and draft position. Manage the salary cap, cut and sign players, negotiate trades the AI actually evaluates, ride out the weekly injury report, scout a draft class where the grades can lie, and chase titles across unlimited saved seasons with aging, breakouts and retirements."
            howToPlay={[
              'Pick a franchise: its real 2026 squad, offence and defence, rated off the 2025 season and draft position.',
              'Work the roster: cut contracts to open cap room, sign free agents, propose trades the AI evaluates on age, position and rating.',
              'Play each week: results, injuries and rival moves roll in; division standings decide the real 14-team playoff bracket.',
              'After the Super Bowl, scout the draft: grades carry error, so the board can lie to you.',
              'Every offseason your young players develop, veterans decline, contracts expire and the cap rises. Dynasties are built, not bought.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Trade a fading star for a young receiver before the deadline',
              'Cut a bloated contract to chase the top free agent QB',
              'Draft a 90-grade tackle who turns out to be an 84',
              'Survive a December where both your running backs are hurt',
              'Win back-to-back titles and start a threepeat conversation',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default FrontOffice;
