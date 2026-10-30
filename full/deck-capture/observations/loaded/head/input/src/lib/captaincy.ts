/**
 * Round 505: the armband rule, written once. A club captain is 24 or older
 * and rated 76 or better. Soccer Career's board reads it against the
 * player's overall when it hands out the armband over a season, and Club
 * Manager's captain list reads it against the rating when the manager
 * picks. Both engines import these two numbers so the next tuning is one
 * edit; nothing else lives here, so neither engine pulls the other in.
 */
export const CAPTAIN_MIN_AGE = 24;
export const CAPTAIN_MIN_RATING = 76;
