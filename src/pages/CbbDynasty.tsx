import { GameNavbar } from '@/components/game/GameNavbar';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const CbbDynasty = () => {
  return (
    <>
      <PageSeo
        title="CBB Dynasty - College Basketball Program Sim | DoUKnowBall"
        description="Run a real college hoops program: NIL recruiting, one-and-done freshmen, the transfer portal, conference tournaments and a 32-team single-elimination March with real Cinderella runs."
        path="/cbb-dynasty"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">CBB Dynasty</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Survive March. That is the whole job description.
            </p>
          </div>
          <CbbDynastyBoard />
          <GameSeoContent
          pageHasOwnH1
            title="CBB Dynasty: the College Hoops Program Sim"
            description="Take over one of 40 real programs across six leagues, from the blue bloods to a Mid-Major bucket built for Cinderella stories. Every player is a generated recruit with a class year: elite freshmen are one-and-done, seniors graduate, stars leave early, and the transfer portal reshapes your rotation every spring. Recruit with an NIL budget that grows with prestige and wins, sweat the scouting error on high school grades, fight through your conference tournament, and then survive a 32-team single-elimination March where six tournament champions auto-qualify and one bad night ends everything. National Player of the Year races, Cinderella tracking and title counts across unlimited seasons."
            howToPlay={[
              'Pick a real program; prestige drives your recruiting pipeline and NIL power.',
              'Play ten rounds of two games: league nights plus cross-country tests.',
              'Finish top four in your league for the conference tournament; win it to dance automatically.',
              'Survive five single-elimination rounds from the Round of 32 to the title game.',
              'Recruit every offseason knowing your best freshman might be gone in one year.',
            ]}
            examples={[
              'Take VCU on a 12-seed run to the Final Four',
              'Sign a 5-star point guard who leaves after one season',
              'Win back-to-back titles with UConn and call it a dynasty',
              'Lose in the Round of 32 as a 2 seed and question everything',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default CbbDynasty;
