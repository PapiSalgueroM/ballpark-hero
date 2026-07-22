import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { TierListBoard } from '@/components/tier-list/TierListBoard';

export default function TierList() {
  return (
    <>
      <PageSeo
        title="Football Tier List - Daily S/A/B/C/D Ranking | DoUKnowBall"
        description="Rank today's eight players into S, A, B, C and D tiers, then see where the crowd put them. A new list every day."
        path="/tier-list"
      />
      <GameNavbar />
      <TierListBoard />
      <GameSeoContent
        title="Football Tier List | DoUKnowBall"
        description="Every day you get eight real players. Drop each one into S, A, B, C or D tier, lock in your list, and compare it against the crowd's average placement for every player."
        howToPlay={[
          'Eight real players, the same eight for everyone, every day.',
          'Tap a player, then tap the tier you think they belong in.',
          'Tap a placed player again to send them back and rethink.',
          'Lock in once all eight are ranked.',
          "You'll then see the crowd's average tier for each player next to your own.",
        ]}
        examples={[
          'S tier: the ones you would build a team around',
          'A tier: elite, just not that elite',
          'B tier: very good starters',
          'C tier: squad players',
          'D tier: you know why they are here',
        ]}
      />
    </>
  );
}
