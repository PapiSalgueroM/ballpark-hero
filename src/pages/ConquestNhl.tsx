import { GameNavbar } from '@/components/game/GameNavbar';
import ImperialismBoardNhl from '@/components/conquest/ImperialismBoardNhl';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const ConquestNhl = () => {
  return (
    <>
      <PageSeo
        title="NHL Conquest - Imperialism Territory Hockey Game | DoUKnowBall"
        description="The imperialism map format for hockey. Every territory belongs to its nearest NHL rink, winners annex whole empires, and five landless invaders fight for a foothold."
        path="/conquest-nhl"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NHL Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The imperialism map on ice: winners take entire empires, the wiped-out fight back, and the
              five landless invaders are always one win from taking it all.
            </p>
          </div>
          <ImperialismBoardNhl />
          <GameSeoContent
          pageHasOwnH1
            title="NHL Conquest: Imperialism Territory Game"
            description="The classic imperialism map format for hockey. Every US territory starts with its nearest NHL rink, winners annex the loser's entire empire, wiped-out teams can storm back with one win, and a territory-seeded playoff crowns the ruler of the map. Toronto, Ottawa, Edmonton, Vancouver and Buffalo start landless as the invaders."
            howToPlay={[
              'Pick your team, predict their game each round, then watch all 32 results redraw the map. Winners take EVERYTHING the loser owned.',
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
