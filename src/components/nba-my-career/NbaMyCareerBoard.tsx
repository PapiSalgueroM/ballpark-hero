/* Round 900: this was one of four copies of a 1,090 line board. The board is
   now src/components/us-career/UsCareerBoard.tsx, shared by all four US
   careers, and this file hands it basketball's binding (src/lib/nbaCareerSport.ts).
   Wire a new screen in the shared board, once; put a basketball word or number
   in the binding. The page and the tests keep importing this file, and it is
   the only file that imports the NBA binding and engine. The NBA conquest
   data still reaches every route through the coach career
   (usCareerToCoach.ts), as it did before Round 900. */
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
/* Round 1048: the host owns the Season Center's overlay, because the board
   shows only the season curtain once a season is played. */
import { UsSeasonCentreHost } from '@/components/us-career/season/UsSeasonCentreHost';

/* Round 530 review: one number for round one, used by the pressure line and
   by the card's confetti rule, so the card and the line under it can never
   disagree about the same pick. The NBA drafts 30 in round one. */
export const FIRST_ROUND_END = NBA_CAREER_SPORT.firstRoundEnd;

export default function NbaMyCareerBoard() {
  return <UsSeasonCentreHost sport={NBA_CAREER_SPORT}><UsCareerBoard sport={NBA_CAREER_SPORT} /></UsSeasonCentreHost>;
}
