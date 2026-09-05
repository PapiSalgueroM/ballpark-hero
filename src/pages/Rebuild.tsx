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
        description="Pick a real club, open the board's envelope, then spin for one XI shirt at a time: keep the man you drew or sell him for three priced replacements, a free bench and a 40 overall. Rebuild Man United, Barcelona, or drag Southampton up."
        path="/rebuild"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <RebuildBoard />
      <GameSeoContent
        title="Rebuild Challenge | DoUKnowBall"
        description="Choose a real club with a complete 2026 squad and inherit its actual players and market values. Two envelopes land first, the board's and the finance department's, then a wheel draws your XI one shirt at a time: keep the man or sell him, fund the next move, and answer to the board when the music stops. The target scales to the club, because dragging Genk up is a different job to squeezing more out of Real Madrid."
        howToPlay={[
          'Pick a market restriction (open, top five leagues, under 25s, wonderkids or the bargain bin), then a club. Tiers run from elite (Real Madrid, Arsenal) to modest (Southampton, Genk).',
          'Open the envelopes: the board\'s, with its mood, its money and its demands, and one of fifteen finance envelopes you pick blind. Then hire a manager or keep the man you have.',
          'SPIN and the wheel draws one of your XI shirts in a hidden order. Every shirt gets exactly one spin.',
          'Keep the man you drew, or sell him for his market value. Selling is final: the scouts bring three priced replacements, promoting from your own bench is free, and a 40 overall is always there if you cannot afford anyone.',
          'You can spend up to €60M past zero. Finish in debt and shirts are force sold at random until the books balance.',
          'Miss a board demand and you draw a punishment card. One card in the five is safe.',
        ]}
        examples={[
          'The wheel lands on your striker. Keep the 84 you inherited, or cash €70M and gamble on the scouts?',
          'Sold cheap early, so the marquee option later means dipping €40M into the overdraft',
          'Elite clubs need +2 with no headroom, modest clubs need +7 with no money',
          'The punishment card was the dressing room turning: the XI plays two ratings below itself',
        ]}
      />
    </>
  );
}
