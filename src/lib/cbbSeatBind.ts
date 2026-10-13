/* Round 1320: CBB Dynasty's binding for the athletic director
   (src/lib/collegeSeat.ts through src/lib/collegeSeatBind.ts). Basketball
   only: it imports the basketball engine and nothing of football's.

   The view reads each program's roster strength off the engine (cbbStrength,
   what the ask ranks), its editorial prestige (what the market tiers), its
   regular season record (conference and national tournament games are played
   off the record), the national champions on record (titles) and his place in
   the engine's own rankings. The field is the engine's DANCE_SIZE, and the
   bracket the seat grades is the national tournament alone: the conference
   tournaments are never in it. */

import {
  CBB_ROUNDS, CBB_SCHOOLS, DANCE_SIZE, cbbRankings, cbbStrength,
  type CbbState, type MarchResult,
} from '@/lib/cbbDynasty';
import type { CollegeSeatBinding } from '@/lib/collegeSeatBind';

export const cbbSeatBinding: CollegeSeatBinding<CbbState, { result: MarchResult }> = {
  sport: 'cbb',
  get fieldSize() { return DANCE_SIZE; },
  view: st => ({
    sport: 'cbb',
    season: st.season,
    round: st.round,
    rounds: CBB_ROUNDS,
    myTeam: st.myTeam,
    programs: CBB_SCHOOLS.map(s => {
      const t = st.teams[s.id];
      return { id: s.id, name: s.name, strength: t ? cbbStrength(t) : 0, prestige: s.prestige, wins: t?.wins ?? 0, losses: t?.losses ?? 0 };
    }),
    champions: st.titles,
    place: cbbRankings(st).findIndex(t => t.id === st.myTeam) + 1,
    fieldSize: DANCE_SIZE,
  }),
  bracketOf: recap => recap.result.bracket,
};
