import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { RebuildBoard } from '@/components/rebuild/RebuildBoard';

export default function Rebuild() {
  return (
    <>
      <PageSeo
        title="Rebuild Challenge - Fix a Real Club | DoUKnowBall"
        description="Pick a real club, inherit its real squad and €100M, then sell and sign your way to the target rating. Rebuild Man United, Barcelona, or drag Southampton up."
        path="/rebuild"
      />
      <GameNavbar />
      <RebuildBoard />
      <GameSeoContent
        title="Rebuild Challenge | DoUKnowBall"
        description="Choose any of 63 real clubs and inherit their actual 2026 squad and market values. You get €100M plus whatever you raise selling players. Hit the target rating to complete the rebuild — and the target scales to the club, because dragging Genk up is a different job to squeezing more out of Real Madrid."
        howToPlay={[
          'Pick a club. Tiers run from elite (Real Madrid, Arsenal) to modest (Southampton, Genk).',
          'You inherit their real squad, and the game picks your best XI automatically.',
          'You start with €100M. Selling a player adds his market value to your budget.',
          'Tap any slot to sign a replacement — you only see players you can afford.',
          'Change formation if it gets you a better XI out of the players you have.',
          'Hit the target rating to finish the job.',
        ]}
        examples={[
          'Elite clubs need +2 — almost no headroom, so every signing has to be an upgrade',
          'Modest clubs need +7 — more room, but nowhere near the money',
          'Sell your best player to fund three good ones, or keep him and build around?',
          'Sometimes the fix is just a different formation',
        ]}
      />
    </>
  );
}
