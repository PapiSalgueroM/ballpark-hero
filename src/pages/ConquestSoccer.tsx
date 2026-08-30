import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import ImperialismBoardSoccer from '@/components/conquest/ImperialismBoardSoccer';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const ConquestSoccer = () => {
  return (
    <>
      <PageSeo
        title="Soccer Conquest - World Map Football Imperialism Game | DoUKnowBall"
        description="The imperialism map goes worldwide. 32 clubs, one per country, fight over all 173 countries on earth. Winners take the loser's entire empire, and a draw moves nothing at all."
        path="/conquest-soccer"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Soccer Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The imperialism map on a world scale: 32 clubs, one per country, 173 countries in play,
              and a draw that moves nothing at all.
            </p>
          </div>
          <ImperialismBoardSoccer />
          <GameSeoContent
            pageHasOwnH1
            title="Soccer Conquest: World Map Football Imperialism"
            description="The classic imperialism map format, played across the whole planet. Thirty-two clubs, one from each football nation, start holding every one of the 173 countries on the world map. Win and you annex the loser's entire empire. Lose and you hand yours over. Draw, and not a single border moves, which is what makes a hard fixture something to fear. Sixteen matchdays, then a knockout where ties go to penalties, until one club rules the world."
            howToPlay={[
              'Pick your club, call its tie each matchday, then watch all 16 results redraw the world. Winners take EVERYTHING the loser owned.',
              'A league tie can finish level. A draw moves no borders at all, so being held is its own punishment, and calling the draw scores just like calling a winner.',
              'Wiped off the map? Keep playing. You are never eliminated, and one win takes a whole empire back.',
              'After 16 matchdays the top 8 empires reach the knockouts, seeded on countries held and then league points. Knockout ties cannot draw: level after extra time means penalties.',
            ]}
            examples={[
              'Real Madrid open holding Spain and nothing else, because Europe is crowded',
              'Asante Kotoko start with fifteen countries of west Africa to defend',
              'Boca Juniors and Flamengo split South America between them',
              'A goalless draw against a minnow costs a giant the whole matchday',
              'Beat the club that just annexed half of Asia and the whole lot is yours',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default ConquestSoccer;
