import { Link } from 'react-router-dom';
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
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NBA Front Office</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Curated rosters, original ratings, simulated contracts. The play-in is waiting for your mistakes.
            </p>
          </div>
          <NbaFrontOfficeBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NBA Front Office: the GM Sim"
            description="Take over an NBA franchise from a curated roster snapshot. New games use original 2024-25 and 2025-26 regular-season rating estimates with limited defensive and role evidence; ages, potential and contracts are simulated. Manage the cap, waive and sign, trade, survive the play-in for seeds 7 to 10, then draft and develop across saved seasons."
            howToPlay={[
              'Pick a franchise from the curated roster snapshot. New opening ratings use retained regular-season inputs; e marks limited evidence, and unmatched players use an explicit game prior. Existing saves keep their ratings.',
              'Work the roster: waive contracts, sign free agents, swing trades with pick sweeteners.',
              'Open Roster, then Set rotation: choose five starters and three bench players. Those slots determine strength, fixed minutes and season lines. Use automatic to return to the highest-rated healthy eight.',
              'Watch the tax line, set from your own league\'s payrolls. Payroll over it is taxed at season close in rising brackets, repeaters pay more, ownership holds the bill against you, and the season cannot tip off with fewer than 14 or more than 15 under contract.',
              'Play the season in stretches and watch the conference tables tighten.',
              'Finish 7th to 10th and you are in the play-in. Win a title through four best-of-7 rounds.',
              "Close each season on its numbers: the league leaders, your club's lines and five awards named by stated rules, all from this save's sim games, never real NBA stats.",
              'Draft, develop, re-sign and go again. Banners are forever.',
              'Run the GM desk: hire your staff (the one you start with is level 1 in every chair, so any edge from the bench is one you hired), settle every expiring deal on the re-sign desk under Bird rights, the rookie scale and restricted free agency, and build packages of players and picks until the trade deadline: deals shut once round 13 is played.',
              'Face the room: the podium, the accountability scrum and the trade question move your trust upstairs, and what you promise can raise or soften next season\'s mandate.',
            ]}
            examples={[
              'Trade an aging star for a rising guard before the deadline',
              'Sneak from the 9 seed through the play-in to a Finals run',
              'Draft a 90-grade prospect who turns out to be a 78',
              'Open a new league on its $226.7M tax line, close the season $10M over it and pay $10.8M (the first $6.859M at 1.00, the rest at 1.25), or $30.8M as a repeater',
              'Carry a strong sixth man behind your best five: off the bench he scores about 13 a game and can take Sixth Man of the Year, because he started fewer than half his games',
              'Build back-to-back champions and chase a dynasty',
              'Hire a level 6 head coach for +0.83 team strength, put a qualifying offer on your restricted first rounder when no rival sheet comes in, then ship a veteran and a second round pick to a buyer before round 13 is played',
            ]}
          />
          <p className="text-xs text-center mb-6">
            <Link to="/nba-playoff-format-history" className="inline-flex items-center min-h-[32px] max-w-full px-2 text-primary hover:underline">NBA playoff format history and the rules this game uses</Link>
          </p>
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NbaFrontOffice;
