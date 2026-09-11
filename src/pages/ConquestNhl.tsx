import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import ImperialismBoardShared from '@/components/conquest/ImperialismBoardShared';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { NHL_CONQUEST_GAME, NHL_IMPERIALISM } from '@/data/conquestSports';
import { NHL_CONQUEST_MAP } from '@/data/conquestDataNhl';

const ConquestNhl = () => {
  /* Round 529: the imperialism help, opened by the board once before the
     first run on this route and by the "?" after that. */
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <PageSeo
        title="NHL Conquest - Imperialism Territory Hockey Game | DoUKnowBall"
        description="The imperialism map format for hockey. Every territory belongs to its nearest NHL rink, winners annex whole empires, and five landless invaders fight for a foothold."
        path="/conquest-nhl"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">NHL Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The imperialism map on ice: winners take entire empires, the wiped-out fight back, and the
              five landless invaders are always one win from taking it all.
            </p>
            <button
              onClick={() => setShowHelp(true)}
              className="absolute top-0 right-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <ImperialismBoardShared sport={NHL_IMPERIALISM} map={NHL_CONQUEST_MAP} game={NHL_CONQUEST_GAME} helpOpen={showHelp} onHelpOpenChange={setShowHelp} />
          <GameSeoContent
          pageHasOwnH1
            title="NHL Conquest: Imperialism Territory Game"
            description="The classic imperialism map format for hockey. Every US territory starts with its nearest NHL rink, winners annex the loser's entire empire, wiped-out teams can storm back with one win, and a territory-seeded playoff crowns the ruler of the map. Toronto, Ottawa, Edmonton, Vancouver and Buffalo start landless as the invaders."
            howToPlay={[
              'Pick your team, predict their game each round, then watch all 32 results redraw the map. Winners take EVERYTHING the loser owned.',
              "Press Play and every game in the round plays out on the map one at a time: the wheel lands on the attacker, the map zooms in, the final score lands, and the loser's territories turn the winner's colour. Skip jumps to the results, and the timeline under the map shows the map after any earlier round.",
              'Wiped off the map, or starting landless as an invader? Keep playing. One win takes a whole empire.',
              'After 16 rounds the top 8 empires enter the playoffs. Losers hand everything to the winners until one team rules the map.',
              'Overtime games are decided by a single goal, sudden death style. No ties, ever.',
            ]}
            examples={[
              'Florida Panthers defend the South after back-to-back Cups',
              'Winnipeg Jets hold the northern plains from North Dakota',
              "Montreal Canadiens' foothold starts in Vermont",
              'Connor McDavid and the Oilers invade from the north with nothing to lose',
              'Dallas Stars start with the biggest empire in the league',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default ConquestNhl;
