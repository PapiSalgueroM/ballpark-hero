import { normalizeName } from '@/lib/playerSearch';

/* Round 1010a: why Transfer Path's player list came back empty, so the board
   can say so instead of a bare "No players found".

   The search matches the typed text inside a name, exactly as typed, with
   hyphens and apostrophes kept (normalizeName folds accents and case only).
   So the list is empty for three different reasons, and only one of them is
   "he is not in the pool":
     chain     the text is inside a name the list leaves out on purpose, a
               name already in the chain or the target ("oyarzabal").
     spelling  some pool name shares a word start with something typed once
               punctuation is folded ("alexander arnold", "ngolo kante",
               "etoo", "neymar jr", "mo salah"). The man may well be in the
               pool, so this text claims nothing about it.
     pool      nothing in the pool is anywhere near it.
   The review that found "alexander arnold" told "not in the pool" measured
   it on the real board; simTransferPathEmptyState holds this on every name in
   the bake. */
export type EmptyListReason = 'chain' | 'spelling' | 'pool';

export interface FoldedName {
  words: string[];
  joined: string;
}

/** A name as words: normalized, apostrophes dropped, hyphens, dots and spaces as breaks. */
export function foldedWords(name: string): string[] {
  return normalizeName(name).replace(/['`‘’ʼ]/g, '').split(/[\s.-]+/).filter(Boolean);
}

export function foldName(name: string): FoldedName {
  const words = foldedWords(name);
  return { words, joined: words.join('') };
}

export function emptyListReason(input: string, excluded: readonly string[], pool: readonly FoldedName[]): EmptyListReason {
  const typed = foldName(input);
  if (typed.joined === '') return 'pool';
  if (excluded.some(n => foldName(n).joined.includes(typed.joined))) return 'chain';
  const near = pool.some(({ words, joined }) =>
    joined.includes(typed.joined) || typed.words.some(t => t.length >= 2 && words.some(w => w.startsWith(t))));
  return near ? 'spelling' : 'pool';
}
