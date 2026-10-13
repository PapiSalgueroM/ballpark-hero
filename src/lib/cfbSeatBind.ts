/* Round 1320: CFB Dynasty's binding for the athletic director
   (src/lib/collegeSeat.ts through src/lib/collegeSeatBind.ts). Football only:
   it imports the football engine and nothing of basketball's.

   The view reads each program's roster strength off the engine (cfbStrength,
   what the ask ranks), its editorial prestige (what the market tiers), its
   record, the national champions on record (natties) and his place in the
   engine's own rankings. The field is the engine's twelve team Playoff, and
   the bracket the seat grades is the Playoff alone: the conference title games
   are never in it. */

import {
  CFB_ROUNDS, CFB_SCHOOLS, cfbRankings, cfbStrength,
  type CfbPlayoffGame, type CfbState,
} from '@/lib/cfbDynasty';
import type { CollegeSeatBinding } from '@/lib/collegeSeatBind';

/** The Playoff field (runCfbPostseason slices twelve). */
export const CFB_SEAT_FIELD = 12;

export const cfbSeatBinding: CollegeSeatBinding<CfbState, { bracket: CfbPlayoffGame[] }> = {
  sport: 'cfb',
  fieldSize: CFB_SEAT_FIELD,
  view: st => ({
    sport: 'cfb',
    season: st.season,
    round: st.round,
    rounds: CFB_ROUNDS,
    myTeam: st.myTeam,
    programs: CFB_SCHOOLS.map(s => {
      const t = st.teams[s.id];
      return { id: s.id, name: s.name, strength: t ? cfbStrength(t) : 0, prestige: s.prestige, wins: t?.wins ?? 0, losses: t?.losses ?? 0 };
    }),
    champions: st.natties,
    place: cfbRankings(st).findIndex(t => t.id === st.myTeam) + 1,
    fieldSize: CFB_SEAT_FIELD,
  }),
  bracketOf: recap => recap.bracket,
};
