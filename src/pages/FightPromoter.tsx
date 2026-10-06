import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import FightPromoterModes from '@/components/fight-promoter/FightPromoterModes';

const FightPromoter = () => {
  return (
    <>
      <PageSeo
        title="Fight Promoter - Make the Fights, Sell the Room | DoUKnowBall"
        description="Run a fictional MMA or boxing promotion. Sign fighters, book matchups, crown champions, sell tickets and build your organization."
        path="/fight-promoter"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-3 pb-20">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-display font-bold text-primary">Fight Promoter</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Your organization. Your roster. Your fight night.
            </p>
          </div>
          <FightPromoterModes />
          <GameSeoContent
            pageHasOwnH1
            title="Fight Promoter: MMA and Boxing Management"
            description="Run your own fictional fight organization. MMA adds contracts, recovery, division rankings and championship belts. Boxing keeps its original room and matchmaking game. Choose a mode, then make the fights."
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
