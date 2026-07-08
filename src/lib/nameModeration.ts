/**
 * Display-name / username moderation (#6).
 *
 * Blocks inappropriate display names and usernames before they are saved.
 * Matching is done on a NORMALIZED form of the candidate so common evasion
 * (leetspeak like "n1gg3r", spacing like "f u c k", punctuation, repeats)
 * still gets caught. The blocklist is intentionally curated to the clearly
 * offensive - slurs, sexual and excretory profanity, and hard insults - and
 * avoids very short fragments (e.g. bare "ass") that would false-positive on
 * legitimate names (the classic "Scunthorpe problem").
 *
 * Pure and synchronous: safe to call from a form handler. Returns a
 * user-facing error string when the name should be rejected, or null when it
 * is acceptable.
 */

// Leetspeak / lookalike folding applied before matching.
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't',
  '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'i', '(': 'c',
};

/** Lowercase, fold leetspeak, then strip everything that is not a-z, and
 *  collapse runs of the same letter (so "sh1ttttt" -> "shit"). */
function normalize(s: string): string {
  const folded = (s || '')
    .toLowerCase()
    .split('')
    .map((c) => LEET[c] ?? c)
    .join('')
    .replace(/[^a-z]/g, '');
  // collapse 3+ repeats of a letter to a single letter so padded evasions match
  return folded.replace(/(.)\1{2,}/g, '$1');
}

// Curated blocklist (write readably; normalized once at module load). Covers
// the common offensive terms and their obvious variants. Not exhaustive, but
// extend here as needed.
const RAW_BLOCKED: string[] = [
  // sexual / explicit
  'fuck', 'fuk', 'fuc', 'motherfucker', 'fucker', 'fucking', 'shit', 'bullshit',
  'bitch', 'biatch', 'cunt', 'cock', 'dick', 'penis', 'vagina', 'pussy', 'cum',
  'jizz', 'boob', 'tits', 'titties', 'blowjob', 'handjob', 'anal', 'anus',
  'butthole', 'asshole', 'dumbass', 'jackass', 'dildo', 'horny', 'orgasm',
  'porn', 'pornhub', 'xxx', 'sex', 'sexy', 'slut', 'whore', 'hoe', 'skank',
  'wank', 'wanker', 'bollocks', 'bugger', 'twat', 'prick', 'knob', 'boner',
  'nutsack', 'ballsack', 'scrotum', 'clit', 'creampie', 'deepthroat',
  'masturbate', 'ejaculate', 'coochie', 'fanny', 'smegma', 'queef',
  // excretory / crude
  'crap', 'turd', 'poop', 'piss', 'pissoff', 'douche', 'douchebag',
  // slurs (racial / ethnic / homophobic / ableist / religious) and evasions
  'nigger', 'nigga', 'niger', 'negro', 'coon', 'chink', 'gook', 'spic',
  'wetback', 'beaner', 'kike', 'kyke', 'raghead', 'towelhead', 'sandnigger',
  'paki', 'jap', 'nip', 'wop', 'dago', 'cracker', 'honky', 'redskin',
  'faggot', 'fagot', 'faggit', 'fag', 'dyke', 'tranny', 'shemale', 'homo',
  'queer', 'retard', 'retarded', 'tard', 'spastic', 'mongoloid', 'cripple',
  // hate / violence
  'nazi', 'hitler', 'kkk', 'klux', 'rape', 'rapist', 'pedo', 'pedophile',
  'molest', 'terrorist', 'isis', 'jihad',
  // general insults / offensive
  'bastard', 'moron', 'idiot', 'scum', 'loser',
];

const BLOCKED_NORMALIZED = Array.from(new Set(RAW_BLOCKED.map(normalize))).filter(Boolean);

/**
 * Returns a user-facing error message if the name is inappropriate, else null.
 * Empty / whitespace-only names return null here (length is validated
 * separately by the caller).
 */
export function nameModerationError(name: string | null | undefined): string | null {
  const norm = normalize(name ?? '');
  if (!norm) return null;
  for (const bad of BLOCKED_NORMALIZED) {
    if (norm.includes(bad)) {
      return 'Please choose a different name - that one contains language we do not allow.';
    }
  }
  return null;
}

/** Convenience boolean: true when the name is acceptable. */
export function isNameClean(name: string | null | undefined): boolean {
  return nameModerationError(name) === null;
}
