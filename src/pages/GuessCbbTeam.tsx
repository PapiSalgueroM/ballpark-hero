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
        examples={[
          "Duke Blue Devils — ACC, Coach K, 5× National Champions, Cameron Indoor",
          "Kentucky Wildcats — SEC, 8× National Champions, Rupp Arena",
          "North Carolina Tar Heels — ACC, 6× National Champions, Dean Dome",
          "Kansas Jayhawks — Big 12, 4× National Champions, Allen Fieldhouse",
          "UCLA Bruins — Big Ten, 11× National Champions, John Wooden era",
          "Gonzaga Bulldogs — WCC, Perennial March Madness contender"
        ]}
      />
    </>
  );
}
