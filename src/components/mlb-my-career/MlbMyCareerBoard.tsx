/* Round 900: this was one of four copies of a 1,090 line board. The board is
   now src/components/us-career/UsCareerBoard.tsx, shared by all four US
   careers, and this file hands it baseball's binding (src/lib/mlbCareerSport.ts).
   Wire a new screen in the shared board, once; put a baseball word or number
   in the binding. The page and the tests keep importing this file, and it is
   the only one that imports the MLB engine, so the other three routes never
   load it. */
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';

/* Round 530 review: one number for round one, used by the pressure line and
   by the card's confetti rule, so the card and the line under it can never
   disagree about the same pick. MLB drafts 30 in round one. */
export const FIRST_ROUND_END = MLB_CAREER_SPORT.firstRoundEnd;

export default function MlbMyCareerBoard() {
  return <UsCareerBoard sport={MLB_CAREER_SPORT} />;
}
