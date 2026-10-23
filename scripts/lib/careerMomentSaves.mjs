/* Round 1107: the two saves the career scene walks start from, made by the
   REAL engine in node and handed to the page through localStorage. Shared by
   scripts/playCareerMoments.mjs and by the Round 1107 block of
   scripts/playReducedMotion.mjs, so both walk the same two careers.

   The engine is the bundle scripts/lib/careerAwardsNightBundle.mjs builds
   (its `soccer` export is the whole engine module), played on mulberry32 from
   scripts/lib/careerAwardsNightProbe.mjs with Math.random restored in a
   finally. Nothing here reaches a network or the tree.

   The phase table below is a COPY of the one scripts/playReducedMotion.mjs
   steps its Season Centre career with. It is a copy on purpose: that block
   belongs to another round, and a shared table would make this file move
   whenever that one is edited.

   signingSave      a career stopped on its first contract offers, created
                    with a look (defaultAppearance), because the signing
                    scene is his avatar in the new club's colour. Accepting
                    an offer draws no random number, so what the page writes
                    after the press is what the engine gives here.
   wonTournamentSave seeds 1 upward, a striker made at 90 overall with a 95
                    ceiling for Brazil. Stopped ONE press before the won
                    tournament card: on the awards night (every played season
                    stages one, so the card is never one press from the
                    season summary), when he did not win the award (so its
                    card shows a plain Continue and no speech) and when
                    Continue leads straight to the tournament card (no first
                    cap in between). That last test is a what if call on a
                    deep copy with its own generator, so the search's own
                    random stream never moves. Both walks lean on Round
                    1107's settle rule by design: the loaded save HOLDS the
                    tournament one press before its card, and it must still
                    play. If 300 seeds give no such save the caller fails
                    with that sentence; the search is never loosened. */
import { bundleAwardsNight } from './careerAwardsNightBundle.mjs';
import { mulberry32 } from './careerAwardsNightProbe.mjs';

export const loadEngine = root => bundleAwardsNight(root);

const step = (sc, st, clubs) => {
  const ph = st.phase;
  return ph === 'youth' ? sc.advanceYouthYear(st, clubs)
    : ph === 'contract_offer' ? ((st.pendingOffers || []).length ? sc.acceptOffer(st, st.pendingOffers[0]) : { ...st, phase: 'playing' })
    : ph === 'playing' ? sc.advanceProSeason(st, clubs)
    : ph === 'newspaper' ? sc.dismissNewspaper(st)
    : ph === 'season_summary' ? sc.dismissSummary(st, clubs)
    : ph === 'ballon_dor' ? sc.dismissBallonDor(st, clubs)
    : ph === 'international_debut' ? sc.dismissDebut(st, clubs)
    : ph === 'world_cup' ? sc.dismissWorldCup(st, clubs)
    : ph === 'rivalry_event' ? sc.dismissRivalryEvent(st, clubs)
    : ph === 'social_media_action' ? sc.dismissSocialMediaPhase(st, clubs)
    : ph === 'random_events' ? ((st.pendingEvents || [])[0]?.choices?.length ? sc.applyEventChoice(st, 0, clubs) : { ...st, phase: 'playing', pendingEvents: [] })
    : ph === 'moral_dilemma' ? sc.dismissMoralDilemma(sc.applyMoralDilemmaChoice(st, 0), clubs)
    : ph === 'red_card_appeal_result' ? sc.dismissAppealResult(st, clubs)
    : ph === 'rehab_choice' ? sc.applyRehabChoice(st, 0)
    : ph === 'transfer_window' ? sc.stayAtClub(st)
    : ph === 'retirement_suggestion' ? sc.declineRetirementSuggestion(st, clubs)
    : null;
};
const clone = v => JSON.parse(JSON.stringify(v));
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
export const SIGNING_SEED = 1107;
export const MAX_SEEDS = 300;

/** A career on its first contract offers. Returns the save, the first offer's
    club, and what the engine makes of accepting it (the facts the walk holds
    the page to). */
export function signingSave(SB) {
  const sc = SB.soccer;
  const clubs = sc.FALLBACK_CLUBS;
  const real = Math.random;
  Math.random = mulberry32(SIGNING_SEED);
  try {
    let st = sc.initCareer('Scene', 'England', 'ST', '2010-14', flat(76), 76, 2010, clubs, SB.appearance.defaultAppearance(), 92);
    for (let g = 0; g < 400 && st; g += 1) {
      if (st.phase === 'contract_offer' && (st.pendingOffers || []).length >= 1) {
        const offer = st.pendingOffers[0];
        const signed = sc.acceptOffer(clone(st), clone(offer));
        return {
          save: JSON.stringify(st), seed: SIGNING_SEED, club: offer.club.name,
          after: { club: signed.currentClub, years: signed.contractYearsLeft, wage: sc.formatWage(signed.weeklyWage), colour: signed.currentClubColor, phase: signed.phase },
        };
      }
      st = step(sc, st, clubs);
    }
    return null;
  } finally {
    Math.random = real;
  }
}

/** A career one press before a won tournament card. Returns the save, the
    seed it came from, how many seeds were tried, and the tournament. */
export function wonTournamentSave(SB) {
  const sc = SB.soccer;
  const clubs = sc.FALLBACK_CLUBS;
  const real = Math.random;
  const whatIf = fn => {
    const keep = Math.random;
    Math.random = mulberry32(99991);
    try { return fn(); } finally { Math.random = keep; }
  };
  try {
    for (let seed = 1; seed <= MAX_SEEDS; seed += 1) {
      Math.random = mulberry32(seed);
      let st = sc.initCareer('Scene', 'Brazil', 'ST', '2010-14', flat(90), 90, 2010, clubs, SB.appearance.defaultAppearance(), 95);
      for (let g = 0; g < 400 && st && !st.retired; g += 1) {
        const t = st.pendingTournament;
        if (st.phase === 'ballon_dor' && t && t.myResult === 'Winner' && st.pendingBallonDor && st.pendingBallonDor.playerRank !== 1
          && whatIf(() => sc.dismissBallonDor(clone(st), clubs).phase) === 'world_cup') {
          return { save: JSON.stringify(st), seed, tried: seed, name: t.name, year: t.year, nation: t.nation, rank: st.pendingBallonDor.playerRank };
        }
        st = step(sc, st, clubs);
      }
    }
    return { save: null, seed: null, tried: MAX_SEEDS };
  } finally {
    Math.random = real;
  }
}
