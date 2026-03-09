import PageSeo from '@/components/seo/PageSeo';
import { CbbProgramBoard } from '@/components/cbb-program/CbbProgramBoard';

export default function GuessCbbTeam() {
  return (
    <>
      <PageSeo
        title="Guess The College Basketball Program — DoUKnowBall"
        description="Can you identify the mystery college basketball program from progressive clues? Test your CBB knowledge with daily challenges."
        path="/guess-cbb-team"
      />
      <CbbProgramBoard />
    </>
  );
}
