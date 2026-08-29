import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaFrontOffice = () => {
  return (
    <>
      <PageSeo
        title="NBA Front Office - GM Sim With Real Rosters | DoUKnowBall"
        description="Run a real NBA franchise: cap sheet, waivers, trades the AI evaluates, the play-in, best-of-7 wars, drafts and dynasties across unlimited seasons."
        path="/nba-front-office"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NBA Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real rosters. Real cap pain. The play-in is waiting for your mistakes.
            </p>
          </div>
          <NbaFrontOfficeBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NBA Front Office: the GM Sim"
            description="Take over a real NBA franchise with its actual curated roster. Manage the cap, waive and sign, propose trades the AI weighs on age and rating, play the season in stretches, survive the modern play-in for seeds 7 to 10, win four best-of-seven rounds, then hit a draft where the scouting grades can lie. Aging, breakouts, retirements and rising caps across unlimited saved seasons."
            howToPlay={[
              'Pick a franchise and inherit its real rotation, rated player by player.',
              'Work the roster: waive contracts, sign free agents, swing trades with pick sweeteners.',
              'Play the season in stretches and watch the conference tables tighten.',
              'Finish 7th to 10th and you are in the play-in. Win a title through four best-of-7 rounds.',
              'Draft, develop, re-sign and go again. Banners are forever.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Trade an aging star for a rising guard before the deadline',
              'Sneak from the 9 seed through the play-in to a Finals run',
              'Draft a 90-grade prospect who turns out to be a 78',
              'Build back-to-back champions and chase a dynasty',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NbaFrontOffice;
