/* ─── Round 913: one training ground for every career ─────────────────────

   Soccer Career has had a training ground with four drills you actually play
   since Round 81 (cone run, burst tap, zone pick, and the gate tap that joined
   in Round 159). The four American careers had one card called Offseason
   focus. The drills now live in src/components/career/drills, the menu and
   the result screen live in src/components/career/TrainingGround, and a sport
   is a skin: the words, the emoji and what each drill trains. This file is the
   part with no React in it: the shape of a skin, and the one rule.

   The rule, the same in every sport: a session is scored 0 to 100, 50 banks
   one, 80 banks two, and there is one session a season. Soccer banks into a
   named attribute through its own engine (applyTrainingResult, which this
   rule is held equal to by scripts/simCareerTraining.mjs for every score from
   0 to 100). A career with a single rating and a potential banks through
   bankTrainingRating below, which goes through raiseWithinPotential, so no
   drill can lift a player past his ceiling. */ import { raiseWithinPotential } from '@/lib/careerHeadroom';
/** A session score needs this much to bank one. */ export const TRAINING_SOLID = 50;
/** A session score needs this much to bank two. */ export const TRAINING_ELITE = 80;
/** A raw drill score as the result screen shows it: whole, 0 to 100. */ export function trainingScore(raw) {
    return Math.max(0, Math.min(100, Math.round(raw)));
}
/** What a session score banks: 0, 1 or 2. */ export function trainingTier(score) {
    const sc = trainingScore(score);
    return sc >= TRAINING_ELITE ? 2 : sc >= TRAINING_SOLID ? 1 : 0;
}
/** One session a season: open until this season's session has been banked. */ export function trainingSessionOpen(lastTrainedSeason, season) {
    return lastTrainedSeason !== season;
}
/** Bank a session into a single rating, held at potential. */ export function bankTrainingRating(ovr, pot, score) {
    const tier = trainingTier(score);
    const after = tier === 0 ? ovr : raiseWithinPotential(ovr, pot, tier);
    return {
        ovr: after,
        tier,
        gain: after - ovr
    };
}
/** The line a banked session ends on, in the same words the rating raise uses elsewhere. */ export function trainingBankNote(bank) {
    if (bank.tier === 0) return 'Rough day. No gains this time.';
    if (bank.gain >= bank.tier) return `Rating +${bank.gain}.`;
    if (bank.gain > 0) return `Rating +${bank.gain}, and that is your ceiling.`;
    return `You were already at your ceiling, so the rating stays at ${bank.ovr}.`;
}
/* ─── the words every single rating career shares ───
   They sit beside bankTrainingRating because they describe it: a session
   banks one or two into the rating, and the rating stops at potential. A skin
   that spreads these can only promise what the bank pays. */ export const RATING_TRAINING = {
    rule: 'One session a season. Score 50+ for a +1 to your rating, 80+ for a +2. Training never takes you past your ceiling.',
    tierLine: (tier, stat)=>tier === 2 ? `Elite session! +2 ${stat}, up to your ceiling` : tier === 1 ? `Solid work. +1 ${stat}, up to your ceiling` : 'Rough day. No gains this time',
    scoreLabel: 'session score',
    bank: 'Bank the session',
    done: 'Back to your career'
};
/** What a single rating career's drills train, in the word its own screens use. */ export const RATING_STAT = 'Rating';
