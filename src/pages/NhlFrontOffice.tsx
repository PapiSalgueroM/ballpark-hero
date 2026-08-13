import { GameNavbar } from '@/components/game/GameNavbar';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NhlFrontOffice = () => {
  return (
    <>
      <PageSeo
        title="NHL Front Office - GM Sim With Real 2026-27 Rosters | DoUKnowBall"
        description="Run a real NHL franchise: hard cap, waivers, trades the AI evaluates, points and OT losses, the divisional playoff bracket, four best-of-7 rounds to the Cup, drafts and dynasties."
        path="/nhl-front-office"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NHL Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real 2026-27 rosters. A hard cap with no mercy. Sixteen teams, one Cup.
            </p>
          </div>
          <NhlFrontOfficeBoard />
          <GameSeoContent
            title="NHL Front Office: the GM Sim"
            description="Take over a real NHL club with its actual 2026-27 roster, every player rated off real 2025-26 stats pulled from the league's own data. Work under the hard salary cap, waive contracts, sign free agents, swing trades the AI weighs on age, position and rating, then chase points through an 82-game-shaped season where overtime losses still pay. Make the real divisional bracket: top three per division plus two wild cards per conference, four best-of-7 rounds, the Stanley Cup at the end. Draft prospects whose scouting grades can lie, manage aging curves where goalies last longer, and stack Cups across unlimited saved seasons."
            howToPlay={[
              'Pick a franchise and inherit its real 2026-27 top-six, blue line and crease.',
              'Work the cap: waive contracts, sign free agents, swing trades with pick sweeteners.',
              'Play the season in stretches; wins are two points, OT losses one.',
              'Finish top three in the division or grab a wild card to make the bracket.',
              'Win four best-of-7 rounds for the Cup, then draft, develop and go again.',
            ]}
            examples={[
              'Flip an aging winger for a young defenseman at the deadline',
              'Steal a wild card spot on OT-loss points alone',
              'Draft a 90-grade prospect who turns out to be a 77',
              'Repeat as champions with a goalie who refuses to age',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NhlFrontOffice;
