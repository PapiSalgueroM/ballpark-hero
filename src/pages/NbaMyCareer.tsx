import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { nbaHallHelpRules } from '@/lib/nbaCareerHall';
import { nbaAwardHelpRules } from '@/lib/nbaCareerAwards';
import { US_BANK_HELP_RULE } from '@/lib/usCareerBank';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaMyCareer = () => {
  return (
    <>
      <PageSeo
        title="NBA My Career - Draft Night to the Rafters | DoUKnowBall"
        description="Create a prospect, get drafted by a real NBA team, and live a whole career: per-game stat lines, contracts, trade demands, rings, MVPs and a legacy verdict."
        path="/nba-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp firstVisit extraRules={[...nbaAwardHelpRules(), ...nbaHallHelpRules(), US_BANK_HELP_RULE]} className="inline-flex min-h-11 min-w-11 items-center justify-center" /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NBA My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft night to jersey retirement. Every summer bends the career.
            </p>
          </div>
          <NbaMyCareerBoard />
          <GameSeoContent
          pageHasOwnH1
            title="NBA My Career: the Player Life Sim"
            description="Build a fictional prospect and live a full NBA career inside the real league. Your position and archetype drive realistic per-game lines, and every summer brings up to three big decisions: hometown discount or the max somewhere new, surgery or load management, the podcast or the gym. Chase rings, MVPs, Finals MVPs and All-NBA nods, fight Father Time, and retire to a verdict that runs from ten-day contracts to the GOAT debate."
            howToPlay={[
              'Create your player: name, one of 5 positions (PG, SG, SF, PF, C) and archetype, from Point God to Paint Beast.',
              'Pick your league first: today\'s NBA, or the 2003-04 throwback with the SuperSonics in Seattle and no Charlotte yet.',
              'Play each season for a per-game stat line driven by your rating, role, health and team quality: points, rebounds and assists, with your minutes, steals and blocks on the season card.',
              'Up to three decisions land every summer, one card at a time: contracts, trade demands, surgeries, brand building. A card you just saw rests for a while (press moments follow your season, so those can come right back).',
              'Open the Bank when you like: savings that pays 2.5% a season, a market of five moving prices, a statement, the card school on the team plane and the shop.',
              'The News box carries the paper, your SocialGram and your draft class rival\'s card. The Trophy Case holds 23 badges, lit off the facts of your career.',
              'Rings, MVPs, Finals MVPs and All-NBA years stack your legacy. All-Star nods and Rookie of the Year go on your record and light a badge in the Trophy Case.',
              'From 31, a falling rating brings the retirement talk: stop, one more year, or a farewell season. Then the verdict and the Hall of Fame wait. The GOAT debate tier is real and it is brutal to reach.',
            ]}
            examples={[
              'A Point God who wins back-to-back MVPs and never gets the ring',
              'A Paint Beast who dominates for six years and falls apart at 31',
              'Taking the discount to finally win one at 36',
              'Demanding out of a rebuild and becoming a villain everywhere',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NbaMyCareer;
