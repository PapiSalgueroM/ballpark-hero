import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GradeTransferBoard } from '@/components/grade-transfer/GradeTransferBoard';

export default function GradeTransfer() {
  return (
    <>
      <PageSeo
        title="Grade the Transfer - Daily Football Game | DoUKnowBall"
        description="Five real transfers a day. Grade each one A to F, then find out what actually happened to the player's value three years later."
        path="/grade-transfer"
      />
      <GameNavbar />
      <GradeTransferBoard />
      <GameSeoContent
        title="Grade the Transfer | DoUKnowBall"
        description="Five real club-to-club moves every day. You see the player, the clubs, the year and what they were worth at the time, then you grade the move A to F. The reveal shows what their market value actually did over the next three years, alongside the crowd's grade."
        howToPlay={[
          'You get five real transfers, the same five for everyone each day.',
          "Each card shows the player, the move, the year, and their value at the time.",
          'Grade it A to F before the outcome is revealed.',
          'The reveal shows their value three years later and the real grade.',
          'Exact grade = 100 points. One grade off = 50. Anything else = 0.',
        ]}
        examples={[
          'Coutinho, Liverpool → Barcelona: €162M at the time, €54M three years on',
          'Hazard, Chelsea → Real Madrid: €108M → €5M',
          'Salah, Chelsea → Fiorentina: €22M → €162M',
          'Bellingham, Birmingham → Dortmund: €81M → €194M',
        ]}
      />
    </>
  );
}
