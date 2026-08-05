import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { BallIqBoard } from '@/components/ball-iq/BallIqBoard';

export default function BallIq() {
  return (
    <>
      <PageSeo
        title="Ball Knowledge IQ Test - Do You Know Ball? | DoUKnowBall"
        description="Twelve questions, getting harder as you go. Find out your Ball Knowledge IQ and settle it once and for all: do you actually know ball?"
        path="/ball-iq"
      />
      <GameNavbar />
      <BallIqBoard />
      <GameSeoContent
        title="Ball Knowledge IQ Test | DoUKnowBall"
        description="A daily twelve-question test across football, the NBA and the NFL. The questions escalate, the first few are recent, the last few go back decades and are worth the most. Your Ball Knowledge IQ is weighted so the hard ones decide it."
        howToPlay={[
          'Twelve multiple-choice questions, the same twelve for everyone each day.',
          'Difficulty ramps: $200 questions first, $1000 questions last.',
          'Wrong options are always from the same category and era, so nothing is a giveaway.',
          'Harder questions carry more weight, nailing the last two matters more than the first three.',
          'Finish to get your IQ (55-160) and your rank, then share it.',
        ]}
        examples={[
          'IQ 145+, Certified ball knower',
          'IQ 125+, Knows ball',
          'IQ 105+, Solid ball knowledge',
          'IQ 85+, Casual',
          'Below 70, Does not know ball',
        ]}
      />
    </>
  );
}
