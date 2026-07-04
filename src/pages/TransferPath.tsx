import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { TransferPathBoard } from '@/components/transfer-path/TransferPathBoard';

export default function TransferPath() {
  return (
    <>
      <PageSeo
        title="Transfer Path - Connect Players via Clubs | DoUKnowBall"
        description="Connect two soccer players by naming teammates who played at the same clubs. Like Six Degrees of Kevin Bacon for football transfers."
        path="/transfer-path"
      />
      <GameNavbar />
      <TransferPathBoard />
      <GameSeoContent
        title="Transfer Path | DoUKnowBall"
        description="Build a chain connecting two football players through shared clubs. Name players who played at the same club to create the shortest transfer path possible."
        howToPlay={[
          "You're given two players: a start and an end target.",
          "Name a player who shared a club with the last player in your chain.",
          "Keep building the chain until you connect to the target player.",
          "Score 1000 points for the optimal path. Lose 100 points for each extra step."
        ]}
        examples={[
          "Zlatan → Rooney: Both played at Manchester United (1 step)",
          "Gerrard → Ronaldo: Gerrard (Liverpool) → Torres (Liverpool & Atlético) → Ronaldo (2 steps)",
          "Lampard → Messi: Lampard (Chelsea) → Fàbregas (Chelsea & Barcelona) → Messi (2 steps)"
        ]}
      />
    </>
  );
}
