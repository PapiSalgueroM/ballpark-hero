import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { RebuildBoard } from '@/components/rebuild/RebuildBoard';

export default function Rebuild() {
  return (
    <>
      <PageSeo
        title="Rebuild Challenge - Fix a Real Club | DoUKnowBall"
        description="Pick a real club, then spin for one XI position at a time: keep the man you drew or sell him for three priced replacements and a free bench. Rebuild Man United, Barcelona, or drag Southampton up."
        path="/rebuild"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <RebuildBoard />
      <GameSeoContent
        title="Rebuild Challenge | DoUKnowBall"
        description="Choose any of 63 real clubs and inherit their actual 2026 squad and market values. A wheel draws your XI one shirt at a time: keep the man or sell him, fund the next move, and answer to the board when the music stops. The target scales to the club, because dragging Genk up is a different job to squeezing more out of Real Madrid."
        howToPlay={[
          'Pick a market restriction (open, top five leagues only, or under 25s only), then a club. Tiers run from elite (Real Madrid, Arsenal) to modest (Southampton, Genk).',
          'Hire a manager, flip one fortune card, then the wheel takes over.',
          'SPIN and the wheel draws one of your XI positions in a hidden order. Every shirt gets exactly one spin.',
          'Keep the man you drew, or sell him for his market value. Selling is final: the scouts bring three priced replacements, and promoting from your own bench is always free.',
          'You can spend up to €60M past zero. Finish in debt and shirts are force sold at random until the books balance.',
          'Miss a board demand and you draw a punishment card. One card in the five is safe.',
        ]}
        examples={[
          'The wheel lands on your striker. Keep the 84 you inherited, or cash €70M and gamble on the scouts?',
          'Sold cheap early, so the marquee option later means dipping €40M into the overdraft',
          'Elite clubs need +2 with no headroom, modest clubs need +7 with no money',
          'The punishment card was The Mutiny: the XI plays two ratings below itself',
        ]}
      />
    </>
  );
}
