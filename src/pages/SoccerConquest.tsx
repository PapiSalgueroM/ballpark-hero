import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import ImperialismBoardShared from '@/components/conquest/ImperialismBoardShared';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { SOCCER_CONQUEST_GAME, SOCCER_CONQUEST_MAP, SOCCER_IMPERIALISM, SOCCER_REGULAR_ROUNDS } from '@/data/soccerConquest';

const SoccerConquest = () => {
  /* Round 529: the imperialism help, opened by the board once before the
     first run on this route and by the "?" after that. */
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <PageSeo
        title="Soccer Conquest - Top Five Leagues Imperialism Map Game | DoUKnowBall"
        description="The imperialism map format for football. 96 clubs from the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1 on one map of Europe: winners annex whole empires until one club rules the continent."
        path={SOCCER_CONQUEST_GAME.path}
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">Soccer Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The imperialism map across the top five leagues: winners take entire empires, the wiped-out
              fight back, and one club ends up ruling Europe.
            </p>
            <button
              onClick={() => setShowHelp(true)}
              className="absolute top-0 right-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <ImperialismBoardShared sport={SOCCER_IMPERIALISM} map={SOCCER_CONQUEST_MAP} game={SOCCER_CONQUEST_GAME} helpOpen={showHelp} onHelpOpenChange={setShowHelp} />
          <GameSeoContent
            pageHasOwnH1
            title="Soccer Conquest: Top Five Leagues Imperialism Game"
            description="The classic imperialism map format for football. All 96 clubs of the 2026-27 Premier League, La Liga, Serie A, Bundesliga and Ligue 1 start with their home region on a map of Europe, winners annex the loser's entire empire, wiped-out clubs can storm back with one win, and a territory-seeded playoff crowns the ruler of the continent. Club strength comes from real squad market values."
            howToPlay={[
              `Pick your club from all 96, call its game each matchday, then watch all 48 results redraw the map. Winners take EVERYTHING the loser owned.`,
              "Press Play and every game on the matchday plays out on the map one at a time: the wheel lands on the attacker, the map zooms in, the final score lands, and the loser's regions turn the winner's colour. Skip jumps to the results, and the timeline under the map shows the map after any earlier matchday.",
              'Wiped off the map? Keep playing. One win takes a whole empire back.',
              `After ${SOCCER_REGULAR_ROUNDS} matchdays the top 8 empires enter the playoffs: Quarter-finals, Semi-finals, then the Imperial Final.`,
              'Level games go to penalties. No draws, ever.',
            ]}
            examples={[
              'Real Madrid open with the biggest squad value in Europe and the strongest empire',
              'Le Mans, back in Ligue 1 after sixteen years, start as the longest shot on the map',
              'Six London clubs start shoulder to shoulder on the same six hexes',
              'Cagliari hold Sardinia, an island nobody can march to',
              'Strasbourg and Freiburg face each other across the Rhine',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default SoccerConquest;
