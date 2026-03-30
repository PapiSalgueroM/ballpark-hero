import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { CbbProgramBoard } from '@/components/cbb-program/CbbProgramBoard';

export default function GuessCbbTeam() {
  return (
    <>
      <PageSeo
        title="Guess The CBB Program — DoUKnowBall"
        description="Can you identify the mystery college basketball program from progressive clues? Test your CBB knowledge with daily challenges."
        path="/guess-cbb-team"
      />
      <CbbProgramBoard />
      <GameSeoContent
        title="Guess The College Basketball Program | DoUKnowBall"
        description="Identify the mystery college basketball program from progressive clues about their conference, mascot, tournament history, and championships."
        howToPlay={[
          "Each clue reveals a detail about the program — region, conference, mascot, tournament success, and more.",
          "Type your guess at any time. The fewer clues you use, the higher your score.",
          "Daily mode gives everyone the same puzzle. Unlimited mode lets you keep playing."
        ]}
      />
    </>
  );
}
