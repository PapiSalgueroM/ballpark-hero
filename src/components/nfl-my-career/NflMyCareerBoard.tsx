/* Round 900: this was one of four copies of a 1,090 line board. The board is
   now src/components/us-career/UsCareerBoard.tsx, shared by all four US
   careers, and this file hands it football's binding (src/lib/nflCareerSport.ts).
   Wire a new screen in the shared board, once; put a football word or number
   in the binding. The page and the tests keep importing this file, and it is
   the only file that imports the NFL binding. The NFL engine itself still
   reaches the other three routes through the coach career
   (usCareerToCoach.ts), as it did before Round 900. */
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';

/* Round 530 review: one number for round one, used by the pressure line and
   by the card's confetti rule, so the card and the line under it can never
   disagree about the same pick. The NFL has 32 clubs, so round one is 32. */
export const FIRST_ROUND_END = NFL_CAREER_SPORT.firstRoundEnd;

export default function NflMyCareerBoard() {
  return <UsCareerBoard sport={NFL_CAREER_SPORT} />;
}
