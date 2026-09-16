import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import FightGymBoard from '@/components/fight-gym/FightGymBoard';

const FightGym = () => {
  return (
    <>
      <PageSeo
        title="Fight Gym - Sign Them, Build Them, Answer For Them | DoUKnowBall"
        description="Run a boxing gym. Sign fighters nobody wanted, find them the right nights, and decide when a man has had enough. The money is yours and the damage is his."
        path="/fight-gym"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Fight Gym</h1>
            <p className="text-xs text-muted-foreground mt-1">
              The money is yours. The damage is his.
            </p>
          </div>
          <FightGymBoard />
          <GameSeoContent
            pageHasOwnH1
            title="Fight Gym: the Boxing Management Sim"
            description="Open a gym with two kids nobody wanted and a few weeks of rent in the drawer. Sign fighters, put the work in, pick their nights, and take your cut. The hard part is knowing when to tell a man he is finished, because he still earns right up until he cannot."
            howToPlay={[
              'Name the gym. You start with two young fighters and enough money for a few weeks.',
              'Each week you can sign somebody new, put a fighter through a training block, or find one of them a fight.',
              'Every fight has three offers. Pick the night, then pick three looks the way you would in a career.',
              'You take a cut of every purse. A better name means a bigger cut and better fighters walking in.',
              'Damage never heals. A hurt fighter still earns, and putting him in is noticed whatever happens.',
              'Let a man go before he is wrecked, or keep cashing him until he cannot go on.',
              'Pay the bills every week. Run out of money and the doors close.',
            ]}
            examples={[
              'A gym that turns one out-boxer into a champion and never sends anybody out broken',
              'Three world titles and a room full of men who cannot walk straight',
              'Going under in week 40 because the roster grew faster than the purses',
              'Keeping a faded veteran on because he is still the biggest name you have',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default FightGym;
