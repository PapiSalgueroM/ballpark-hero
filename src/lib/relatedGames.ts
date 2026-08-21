/* Round 181: the site links itself like a site (S-6, internal links).

   The old "More games" block linked every page in a category to the SAME
   first three games in registry order, so three games hoarded every
   internal link and most games had zero inbound links at all. Crawlers
   rank what the site itself points at, so that shape was wasting the 47k
   words of per-game copy.

   The new picker is a deterministic graph with two provable properties:

   1. EVERY game gets inbound links. Each page links to the next three
      games in its own category (a ring), so every game receives links
      from its three in-category predecessors (fewer only in tiny
      categories).
   2. The WHOLE SITE is one connected component. Each page also links to
      one game in the NEXT category (categories form a cycle), so a
      crawler entering on any game page can reach every other game page
      by following related-game links alone. simRelatedGames proves this
      with a real breadth-first search, not by trusting this comment.

   Plus two variety picks from anywhere else, chosen by a stable hash of
   the path, so pages do not all point at the same handful of games.
   Everything is a pure function of (path, registry): no randomness, no
   dates, the same links on every render of the same page. Crawlers hate
   churn. */

import { CATEGORIES, ALL_GAMES, type GameDef } from '@/data/gameRegistry';

export interface RelatedPick {
  path: string;
  label: string;
  emoji: string;
  description: string;
}

/** Small stable string hash. NOT crypto, just deterministic spread. */
export function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

const toPick = (g: GameDef): RelatedPick => ({
  path: g.path, label: g.label, emoji: g.emoji, description: g.description,
});

/** Up to 6 related games for a page, by the rules in the header comment. */
export function relatedGamesFor(path: string): RelatedPick[] {
  const ci = CATEGORIES.findIndex(c => c.games.some(g => g.path === path));
  if (ci < 0) return [];
  const cat = CATEGORIES[ci];
  const gi = cat.games.findIndex(g => g.path === path);
  const h = stableHash(path);
  const picked: GameDef[] = [];
  const taken = new Set<string>([path]);
  const add = (g: GameDef | undefined) => {
    if (g && !taken.has(g.path)) { picked.push(g); taken.add(g.path); }
  };

  /* 1. The category ring: the next three games in my own category. */
  for (let k = 1; k <= 3 && k < cat.games.length; k++) {
    add(cat.games[(gi + k) % cat.games.length]);
  }

  /* 2. The category cycle: one game from the next category, hash-spread
     so its games share the inbound love. */
  const nextCat = CATEGORIES[(ci + 1) % CATEGORIES.length];
  add(nextCat.games[h % nextCat.games.length]);

  /* 3. Variety picks from anywhere else on the site, walking until the
     block is full. A normal category reaches 6 after two picks exactly as
     before (ring 3 + next-category 1 + variety 2), so existing pages keep
     their links and crawlers see no churn. A tiny category has no ring to
     lean on (Round 237: the one-game Aussie Rules section shipped a
     3-link block and failed the out-degree floor), so the same walk just
     keeps going until the page offers its full six. */
  const elsewhere = ALL_GAMES.filter(g => !taken.has(g.path) && !cat.games.some(x => x.path === g.path));
  for (let k = 0; k < 5 && picked.length < 6 && elsewhere.length > 0; k++) {
    const idx = (h * 7 + k * 131) % elsewhere.length;
    const g = elsewhere[idx];
    add(g);
    elsewhere.splice(idx, 1);
  }

  return picked.slice(0, 6).map(toPick);
}
