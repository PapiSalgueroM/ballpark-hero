import { GameNavbar } from '@/components/game/GameNavbar';
import ImperialismBoardMlb from '@/components/conquest/ImperialismBoardMlb';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Footer } from '@/components/game/Footer';

const ConquestMlb = () => {
  return (
    <>
      <PageSeo
        title="MLB Conquest - Imperialism Territory Baseball Game | DoUKnowBall"
        description="The imperialism map format for baseball. Every territory belongs to its nearest MLB park, winners annex whole empires, and two landless invaders fight for a foothold."
        path="/conquest-mlb"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">MLB Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The imperialism map at the ballpark: winners take entire empires, the wiped-out fight
              back, and two landless invaders are always one win from taking it all.
            </p>
          </div>
          <ImperialismBoardMlb />
          <GameSeoContent
            title="MLB Conquest: Imperialism Territory Game"
            description="The classic imperialism map format for baseball. Every US territory starts with its nearest MLB park, winners annex the loser's entire empire, wiped-out teams can storm back with one win, and a territory-seeded playoff crowns the ruler of the map. Toronto and San Diego start landless as the invaders."
            howToPlay={[
              'Pick your team, predict their game each round, then watch all 30 results redraw the map. Winners take EVERYTHING the loser owned.',
              'Wiped off the map, or starting landless as an invader? Keep playing. One win takes a whole empire.',
              'After 14 rounds the top 8 empires enter the playoffs: Division Round, Pennant Round, then the Imperial World Series.',
              'Extra-inning games are decided by a single run. No ties, ever.',
            ]}
            examples={[
              'The back-to-back champion Dodgers defend Los Angeles',
              'The Braves start with a six-territory southern empire',
              "The White Sox hold Iowa because of course the Field of Dreams is theirs",
              'The Blue Jays invade from the north with nothing to lose',
              'The Athletics hold Sacramento while the Vegas move looms',
            ]}
          />
          <GameNav />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ConquestMlb;
