/* Round 1100: one engine step of a Soccer Career, lifted out of
   scripts/simCareerClubPool.mjs section 6 word for word (the same dispatch
   simClubSquads' fleet uses) so simCareerLeagueWorld plays the same careers
   through the same choices. `engine` is the bundled soccerCareerEngine.

   A passive player who says yes: he takes the first offer on the table, the
   first choice of every event, and goes where a transfer window sends him.
   Any phase the dispatch does not know ends the career. */
export function careerStep(engine, s, clubs) {
  if (s.phase === 'rehab_choice') return engine.applyRehabChoice(s, 1);
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, clubs);
    case 'contract_offer': {
      const offers = s.pendingOffers || [];
      if (!offers.length) return { ...s, phase: 'playing' };
      return engine.acceptOffer(s, offers[0]);
    }
    case 'playing': return engine.advanceProSeason(s, clubs);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, clubs);
    case 'random_events':
      if (!s.pendingEvents || !s.pendingEvents[0]) return { ...s, pendingEvents: [], phase: 'playing' };
      return engine.applyEventChoice(s, 0, clubs);
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, clubs);
    case 'international_debut': return engine.dismissDebut(s, clubs);
    case 'world_cup': return engine.dismissWorldCup(s, clubs);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return engine.dismissBallonDor(s, clubs);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (sit && sit.type === 'one_offer') return engine.acceptOffer(s, sit.offer);
      if (sit && sit.type === 'bidding_war') return engine.acceptOffer(s, sit.offerA);
      if (sit && sit.type === 'dream_club') return engine.acceptOffer(s, sit.offer);
      if (sit && sit.type === 'frozen_out' && sit.offers.length) {
        const o = sit.offers[0];
        return o.isLoan ? engine.acceptLoan(s, o) : engine.acceptOffer(s, o);
      }
      return engine.stayAtClub(s, clubs);
    }
    default: return { ...s, retired: true };
  }
}

/** mulberry32 over Math.random, the seeding simCareerClubPool section 6 uses. */
export function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
