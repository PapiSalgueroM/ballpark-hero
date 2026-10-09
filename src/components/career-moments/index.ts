/* Round 1107: the career moment kit, one door for a binder that wants all of
   it. Shared files that need only one part (the hook, the confetti) import
   that part by FILE instead, so a page that never shows a scene does not
   take the whole kit (scripts/simCareerMoments.mjs S6 holds that for the two
   soccer re-exporters). */
export * from './moments';
export * from './useCareerMoment';
export { Confetti, prefersReducedMotion } from './Confetti';
export { CareerMomentStyles } from './CareerMomentStyles';
export {
  CareerMomentCard, CareerMomentCardView, SigningMoment, TrophyMoment, AwardMoment, MilestoneMoment,
  type CareerMomentCardProps,
} from './CareerMomentCard';
