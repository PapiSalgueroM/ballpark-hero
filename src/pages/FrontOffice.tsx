import { Link } from 'react-router-dom';
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
            description="Take over an NFL franchise using a 2026 roster snapshot. New franchises use original simulation ratings from 2023 to 2025 performance, playing time and draft priors, with limited evidence marked. Manage fictional contracts under the salary cap, negotiate trades, handle injuries, scout the draft and build a saved dynasty."
            howToPlay={[
              'Pick a franchise: its 2026 roster snapshot and practice squad. New opening ratings use 2023 to 2025 evidence across the whole roster, with no separate backup ceiling. Linemen use playing time and draft priors because the inputs cannot measure blocking. Limited evidence is marked with e. Kickers, punters and long snappers sit out for now.',
              'Work the roster: cut contracts to open cap room, sign free agents, propose trades the AI evaluates on age, position and rating. The roster holds 53, and the practice squad sits off the cap until you call a man up. Go over 53 (your picks can do it, and the Giants start at 54) and Play waits until you cut down.',
              'Run the GM desk: hire a head coach, two coordinators, a scouting director and a trainer, settle every expiring deal on the re-sign desk (a first rounder\'s rookie deal carries the fifth year option), and build packages of players and picks before the trade deadline after Week 9. A traded man\'s contract goes with him, and you keep some dead money.',
              'Play each week: results, injuries and rival moves roll in; division standings decide the real 14-team playoff bracket.',
              'Set the depth chart from the Roster box: tap two men to swap them, and the sim reads who starts off your order. Injured men are skipped and the next man steps up, so your backups finally matter.',
              'After the Super Bowl, draft with the picks you still own. Trading one away costs a selection. Scout grades carry error. Before finishing the draft, decide the franchise tag on one expiring man: one guaranteed year at the top five average at his position or 120 percent of his old deal, whichever is more. With no picks left, run the league draft and offseason from that screen.',
              'Every offseason your young players develop, veterans decline, contracts expire and the cap rises. Dynasties are built, not bought.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Trade a fading star for a young receiver before the deadline',
              'Cut a bloated contract to chase the top free agent QB',
              'Draft a 90-grade tackle who turns out to be an 84',
              'Survive a December where both your running backs are hurt by calling a back up off the practice squad',
              'Win back-to-back titles and start a threepeat conversation',
            ]}
          />
          <p className="text-xs text-center mb-6">
            <Link to="/nfl-playoff-format-history" className="inline-flex items-center min-h-[32px] max-w-full px-2 text-primary hover:underline">NFL playoff format history and the rules this game uses</Link>
          </p>
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default FrontOffice;
