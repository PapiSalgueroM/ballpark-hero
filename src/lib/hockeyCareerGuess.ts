/**
 * NHL Career Path guess rule, kept out of the hook so the harness
 * (scripts/simNhlCareerPathFacts.mjs) checks the rule the game actually runs.
 *
 * A guess counts when it is the full name, the last word of it, or everything
 * after the first name, ignoring case and full stops. The last of those is for
 * a surname with a space in it: Martin St. Louis takes "St. Louis" or "st louis".
 */
const simplify = (s: string) => s.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');

export function acceptedHockeyGuesses(name: string): string[] {
  const full = simplify(name);
  const words = full.split(' ');
  return [...new Set([full, words[words.length - 1], words.slice(1).join(' ')].filter(Boolean))];
}

export function isHockeyGuessRight(guess: string, name: string): boolean {
  return acceptedHockeyGuesses(name).includes(simplify(guess));
}
