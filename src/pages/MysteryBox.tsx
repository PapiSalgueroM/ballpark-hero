import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { MysteryBoxBoard } from '@/components/mystery-box/MysteryBoxBoard';

export default function MysteryBox() {
  return (
    <>
      <PageSeo
        title="Mystery Box - Pack-Luck Squad Builder | DoUKnowBall"
        description="Open 15 mystery packs, keep or bin each player, and build the best 4-3-3 your luck allows. Same packs for everyone daily, beat their pulls."
        path="/mystery-box"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <MysteryBoxBoard />
      <GameSeoContent
        title="Mystery Box | DoUKnowBall"
        description="Fifteen sealed packs, eleven slots, one 4-3-3. Every pack reveals a real player, superstar or fringe body, and you decide on the spot: slot him in, or bin him and hope the next pack is better. Everyone opens the same fifteen packs each day, so the difference between your rating and your mate's is pure decision-making."
        howToPlay={[
          'Open packs one at a time, 15 in total.',
          'Each pack reveals a real player with his real market value.',
          'Keep him: tap a highlighted compatible slot in your 4-3-3.',
          'Or bin him, but with 15 packs and 11 slots, you only get 4 bins.',
          'Empty slots drag your rating down hard. Fill the XI.',
          'Same pack sequence for everyone each day. Share your pulls.',
        ]}
        examples={[
          '🟪 Superstar pull, pack 3, instant keep, whatever the position',
          'A fringe keeper in pack 1: keep him and pray, or gamble on a better one later?',
          'Two star strikers but only one ST slot, someone plays out wide',
          'Binned three early, now every pack is a forced keep',
        ]}
      />
    </>
  );
}
