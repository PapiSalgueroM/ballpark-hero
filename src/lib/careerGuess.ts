/**
 * Round 924: how a typed guess is matched to a player in the career path games.
 *
 * A guess counts when it is the full name or the surname. Case and accents never matter ("acuna" finds
 * Acuña), and the surname skips a trailing Jr., Sr., II, III or IV, so "griffey" finds Ken Griffey Jr.
 * (the old rule took the last word, so it wanted "jr.", which then matched every Jr. in the pool).
 *
 * MLB Career Path uses it. The NHL and NBA career hooks still take the last word; they are other rounds'
 * files, and moving them onto this helper is their change to make.
 * scripts/simMlbCareerPathFacts.mjs restates foldName and surnameOf to check that no two MLB pool players
 * share a surname, and src/test/baseballCareerGuess.test.tsx holds the two copies to the same answers.
 */
const NAME_SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/;

/** lower case, accents dropped, outer spaces trimmed */
export function foldName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** the last word of the folded name that is not a suffix */
export function surnameOf(name: string): string {
  const words = foldName(name).split(/\s+/);
  while (words.length > 1 && NAME_SUFFIX.test(words[words.length - 1])) words.pop();
  return words[words.length - 1];
}

/** true when the guess is the player's full name or his surname */
export function isCareerGuessMatch(guess: string, playerName: string): boolean {
  const g = foldName(guess).split(/\s+/).join(' ');
  return g !== '' && (g === foldName(playerName).split(/\s+/).join(' ') || g === surnameOf(playerName));
}
