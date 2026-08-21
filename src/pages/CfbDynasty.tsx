import { GameNavbar } from '@/components/game/GameNavbar';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const CfbDynasty = () => {
  return (
    <>
      <PageSeo
        title="CFB Dynasty - College Football Program Sim | DoUKnowBall"
        description="Run a real college program: NIL recruiting with scouting error, the transfer portal, conference title races, the 12-team Playoff, Heisman winners and dynasty tracking across unlimited seasons."
        path="/cfb-dynasty"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">CFB Dynasty</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real schools. Fictional stars. The portal never sleeps and neither do you.
            </p>
          </div>
          <CfbDynastyBoard />
          <GameSeoContent
          pageHasOwnH1
            title="CFB Dynasty: the College Program Sim"
            description="Take over one of 44 real programs in the post-realignment landscape: the loaded SEC and Big Ten, the ACC and Big 12 cores, and a Group of Five path for giant killers. Every player is a generated recruit with a class year, so rosters actually churn: freshmen develop, seniors graduate, elite juniors declare early, and the transfer portal giveth and taketh. Recruit with an NIL budget that grows with prestige and winning, sweat scouting error on high school grades, chase conference championships, and fight through the real 12-team College Football Playoff with byes for the top four seeds. Win Heismans, stack natties, build the dynasty."
            howToPlay={[
              'Pick a real program; its prestige sets your talent pipeline and NIL power.',
              'Play the 12-week season: four non-conference games, then the conference race.',
              'Finish top two in the conference to reach the title game and lock a Playoff bid.',
              'Survive the 12-team bracket: first round on campus, quarters, semis, the natty.',
              'Recruit every offseason: high school stars carry scouting error, portal players do not.',
            ]}
            examples={[
              'Take Boise State from the Group of Five to a national title',
              'Land a 5-star QB whose scouted 88 turns out to be a 79',
              'Lose your Heisman runner-up to the draft and reload through the portal',
              'Go back-to-back with Georgia and start the dynasty argument',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default CfbDynasty;
