/* Round 1045: the colour of a season rating, by band. It lived in
   SeasonRatings.tsx, and the page's timeline reads it too, so the page held
   the whole Ratings dialog in its first download for one small table. Here
   it is on its own, SeasonRatings re-exports it, and the dialog loads when
   it is opened. */
import type { RatingBand } from './careerSeasonRatings';

export const BAND_CLASS: Record<RatingBand, string> = {
  elite: "text-amber-400",
  good: "text-emerald-400",
  ok: "text-foreground",
  poor: "text-red-400",
};
