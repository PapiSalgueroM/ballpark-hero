import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import FightCareerBoard from '@/components/fight-career/FightCareerBoard';

const FightCareer = () => {
  return (
    <>
      <PageSeo
        title="Fight Career - Debut to World Champion | DoUKnowBall"
        description="Turn professional, pick your fights, run your camps and read the man in front of you. Climb from unranked to a world title, and find out what the wars cost you."
        path="/fight-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Fight Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Every hard fight pays you now and charges you later.
            </p>
          </div>
          <FightCareerBoard />
          <GameSeoContent
            pageHasOwnH1
            title="Fight Career: the Boxing Life Sim"
            description="Create a fighter, turn professional and live a whole career one fight at a time. Choose who you fight, run the camp, pick your looks for the night, and carry the damage for the rest of your life. Every fighter in the game is invented, so the roster is yours."
            howToPlay={[
              'Build your fighter: a name, one of eight weight classes and one of four styles, from out-boxer to slugger.',
              'Take one of three fights. A tune up is safe and pays nothing, a step up pays and ranks you and can ruin you.',
              'Spend six weeks of camp across conditioning, power, defence and speed. Spread them or specialise.',
              'Pick three looks for the night. He adjusts to whatever you keep doing, so do not give him the same thing twice.',
              'Pressure beats an out-boxer, boxing beats a swarmer, countering beats a slugger, brawling beats a counter-puncher.',
              'Damage never heals. It eats your chin first, and it is what decides when you are finished.',
              'Reach number one and every offer on the table is for a world title.',
              'Retire and get the verdict: who you beat is worth far more than how many.',
            ]}
            examples={[
              'An out-boxer who wins a belt at 27 and holds it four times',
              'A slugger who takes every war, wins a title at 24 and is finished by 29',
              'A patient featherweight who never loses and never gets the fight he wanted',
              'A counter-puncher who reads three straight contenders and never takes a round off',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default FightCareer;
