/**
 * Round 1340: how Club Manager's match day screens put two clubs side by side.
 *
 * One rule, the engine's own. playMyMatch writes every report home side first
 * with `const iAmHome = fx.home !== false; // neutral finals list us first`
 * (src/lib/clubManager.ts), so a scoreboard that reads like football names the
 * home side first and, on a neutral ground, my club first. Every screen takes
 * the order from here and never decides it for itself. Pure: no imports, no
 * clock, no draw.
 */

/**
 * True when my club is drawn first: at home or on a neutral ground. `undefined`
 * (a fixture or live match saved before the field existed) answers true, which
 * is what every screen printed before this round.
 */
export function myClubFirst(home: boolean | null | undefined): boolean {
  return home !== false;
}

/** The pair in the order the screen draws it: home side first. */
export function inFixtureOrder<T>(home: boolean | null | undefined, mine: T, theirs: T): [T, T] {
  return myClubFirst(home) ? [mine, theirs] : [theirs, mine];
}

/**
 * The same rule read off a finished report, which the engine already wrote
 * home first: my club is first exactly when it is the report's home side.
 */
export function mineFirstOfReport(report: { home: string }, clubName: string): boolean {
  return report.home === clubName;
}

/* The pitch wears names, never numbers: no roster the game holds carries real shirt numbers. A man's pitch name is
   his surname with the words that belong to it, and in a crowd his initials. Only words the save already holds are
   used; nothing is looked up and nothing is invented. */

/** Words a surname carries in front of it ("van Dijk", "De Bruyne", "Mac Allister"), compared without case. */
const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'del', 'della', 'di', 'da', 'das', 'do', 'dos', 'du', 'la', 'le', 'ter', 'ten', 'mac', 'el', 'al', 'ben', 'bin', 'st', 'st.']);
/** Generational suffixes, dropped when another word is left ("Cristian Cásseres Jr." is Cásseres). */
const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);
/** Agnomes are often the name a man is known by, so one is never dropped: it joins the word before it. */
const AGNOMES = new Set(['neto', 'filho', 'sobrinho', 'júnior', 'junior']);

/** The words of a name: no " (Youth)", no word holding a digit, no trailing generational suffix. */
function nameWords(name: string): string[] {
  const words = name.replace(/\s*\(Youth\)\s*$/i, '').split(/\s+/).filter(w => w && !/\d/.test(w));
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1].toLowerCase())) words.pop();
  return words;
}

/** His surname as the pitch prints it: "van Dijk", "De Bruyne", "Pedro Neto", "Amoako Junior", "Isak". */
export function pitchName(name: string): string {
  const words = nameWords(name);
  let i = words.length - 1;
  if (i > 0 && AGNOMES.has(words[i].toLowerCase())) i -= 1;
  while (i > 1 && PARTICLES.has(words[i - 1].toLowerCase())) i -= 1;
  return words.slice(Math.max(0, i)).join(' ');
}

/** His initials for a crowd, at most three letters and never a digit: "VvD", "KDB", "AI"; one word gives two ("Ro"). */
export function pitchInitials(name: string): string {
  const words = nameWords(name);
  if (words.length < 2) return (words[0] ?? '').replace(/[^\p{L}]/gu, '').slice(0, 2);
  const marks = words.map(w => {
    const letter = /\p{L}/u.exec(w)?.[0] ?? '';
    return PARTICLES.has(w.toLowerCase()) ? letter : letter.toUpperCase();
  }).filter(Boolean);
  return marks.length <= 3 ? marks.join('') : marks[0] + marks.slice(-2).join('');
}
