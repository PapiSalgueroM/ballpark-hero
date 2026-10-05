import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NhlFrontOffice = () => {
  return (
    <>
      <PageSeo
        title="NHL Front Office - GM Simulation | DoUKnowBall"
        description="Run a real NHL franchise: hard cap, waivers, trades the AI evaluates, points and OT losses, the divisional playoff bracket, four best-of-7 rounds to the Cup, drafts and dynasties."
        path="/nhl-front-office"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NHL Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              A roster snapshot. Original simulation ratings. Sixteen teams, one Cup.
            </p>
          </div>
          <NhlFrontOfficeBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NHL Front Office: the GM Sim"
            description="Take over an NHL franchise from a curated roster snapshot. New games use original estimates from 2024-25 and 2025-26 regular-season inputs, with limited evidence marked. Forward ratings measure offensive production; defensemen and goalies use qualified proxies. Potential, contracts and future events are simulated. Work the salary cap, waive contracts, sign free agents and negotiate trades, then chase points through an 80 game season where overtime losses still pay. Finish top three in your division or take a wild card, win four best-of-7 rounds for the Cup, then draft, develop and continue. Existing saves keep their ratings and progress."
            howToPlay={[
              'Pick a franchise from the roster snapshot. Read the opening estimate notes before comparing players.',
              'Work the cap: waive contracts, sign free agents, swing trades with pick sweeteners.',
              'Run the GM desk: hire your staff, settle every expiring deal on the re-sign desk, and build packages of players and picks until the trade deadline: deals shut once round 16 is played.',
              'Play the season in stretches; wins are two points, OT losses one.',
              'Finish top three in the division or grab a wild card to make the bracket.',
              'Win four best-of-7 rounds for the Cup, then draft, develop and go again.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Flip an aging winger for a young defenseman at the deadline',
              'Steal a wild card spot on OT-loss points alone',
              'Draft a 90-grade prospect who turns out to be a 77',
              'Repeat as champions with a goalie who refuses to age',
            ]}
          />
          <p className="text-xs text-center mb-6">
            <Link to="/nhl-playoff-format-history" className="inline-flex items-center min-h-[32px] max-w-full px-2 text-primary hover:underline">NHL playoff format history and the rules this game uses</Link>
          </p>
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NhlFrontOffice;
