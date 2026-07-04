import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { HofOrBustBoard } from '@/components/hof-or-bust/HofOrBustBoard';

export default function HofOrBust() {
  return (
    <>
      <PageSeo
        title="Hall of Fame or Bust? - Sports Trivia | DoUKnowBall"
        description="Can you tell a Hall of Famer from a bust using only career stats? Vote, reveal hints, and see how the community voted."
        path="/hof-or-bust"
      />
      <GameNavbar />
      <HofOrBustBoard />
      <GameSeoContent
        title="Hall of Fame or Bust? | DoUKnowBall"
        description="Review anonymized career stats from players across NFL, NBA, MLB, NHL, and Soccer. Decide if they're a Hall of Famer or a bust, then see the community consensus."
        howToPlay={[
          "You're shown anonymized career stats for a mystery player: no name, just numbers.",
          "Optionally reveal up to 3 hints (each costs 100 points).",
          "Vote: is this player a Hall of Famer or a Bust?",
          "After voting, the player is revealed along with community vote percentages and the official verdict."
        ]}
        examples={[
          "894 career goals, 4 Stanley Cups → Hall of Fame (Wayne Gretzky)",
          "762 career home runs, 7 MVPs → Borderline (Barry Bonds)",
          "14,580 passing yards, 89 TDs → Bust (JaMarcus Russell)",
          "672 club goals, 7 Ballon d'Ors → Hall of Fame (Lionel Messi)"
        ]}
      />
    </>
  );
}
