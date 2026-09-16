import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import FightPromoterBoard from '@/components/fight-promoter/FightPromoterBoard';

const FightPromoter = () => {
  return (
    <>
      <PageSeo
        title="Fight Promoter - Make the Fights, Sell the Room | DoUKnowBall"
        description="Book the room, make the fights and pay the purses. Feeding a name sells tickets tonight. Making the fight people actually want is what gets you a bigger building."
        path="/fight-promoter"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Fight Promoter</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sells tonight, or builds your name. Rarely both.
            </p>
          </div>
          <FightPromoterBoard />
          <GameSeoContent
            pageHasOwnH1
            title="Fight Promoter: the Boxing Matchmaking Sim"
            description="Run a boxing promotion from a leisure centre to a national stadium. You pick the room, set the ticket price, and decide who fights whom. The two ways to fill a building pull against each other, and that is the whole game."
            howToPlay={[
              'Name the promotion. You start with a small room, a little money and ten fighters who will take your calls.',
              'Pick the venue you can afford and that will have you, then set your ticket price.',
              'Build a card: choose a fighter, then choose who goes in with him.',
              'A mismatch sells on the name. A real fight sells on the fight, and costs you both purses.',
              'The men take the greater of their guarantee or 58 percent of the door, so a big night is never a windfall.',
              'Put the show on, then read the room: a one sided beating earns nothing for your name.',
              'Your name opens bigger buildings and brings better fighters through the door.',
            ]}
            examples={[
              'Feeding your one draw four soft touches and wondering why nobody rates you',
              'Making the fight everyone wanted and losing your biggest name in it',
              'A sold out leisure centre that still lost money on the guarantees',
              'Reaching a national stadium with a card people actually argued about',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default FightPromoter;
