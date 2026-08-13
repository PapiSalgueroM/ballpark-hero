/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerRealism.ts, the Round 54 realism layer for Soccer Career.

   Owner brief: "imagine everything that bitlife has and then make it ten times
   better and more out of pocket... at least 200 new additions to each game".

   90 new self-gated life events split across two batch files purely to keep
   each file readable:
     soccerCareerRealismA.ts, ids 400-444: training ground, media, fans,
       dressing room, travel, body and mind, everyday money decisions.
     soccerCareerRealismB.ts, ids 450-494: international life, legacy and
       records, rivalry beats, family, club politics, genuinely unhinged
       football moments, contract and career forks.

   The corruption layer lives separately in soccerCareerCorruption.ts (300-349).
   Same contract as the rest of the event pool: every event self-gates, so the
   caller in soccerCareerEngine needs no extra eligibility rules.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";
import { getRealismEventsA } from "./soccerCareerRealismA";
import { getRealismEventsB } from "./soccerCareerRealismB";

export function getRealismEvents(state: CareerState): RandomEvent[] {
  return [...getRealismEventsA(state), ...getRealismEventsB(state)];
}

/** Id band owned by this layer, handy for de-duplication by the caller. */
export const REALISM_ID_MIN = 400;
export const REALISM_ID_MAX = 499;
