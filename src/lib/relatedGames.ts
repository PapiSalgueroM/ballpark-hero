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
   churn.

   ROUND 289: STABLE UNDER INSERTION. The variety picks used to be
   `hash % elsewhere.length`, and the next-category pick `hash % size`, so
   the moment ANY game was added anywhere the modulus moved and the picks
   moved with it. Measured when Round 288 registered one game: 99 of the
   127 shipped pages had their related links rewired and were re-dated in
   the sitemap, which is the "everything changed today" shape Round 280
   exists to prevent, and it would have happened again on every game after.
   Both picks are rendezvous choices now: each candidate is scored by a hash
   of (this page, that candidate) and the highest scores win, so adding a
   game only touches the few pages where the newcomer outscores a sitting
   pick. simRelatedGames section 6 measures that against a registry with one
   extra game. */

import { CATEGORIES as LIVE_CATEGORIES, type GameDef, type GameCategory } from '@/data/gameRegistry';

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

/** The rendezvous score of a candidate for a page: high wins. Hashing the
 *  pair rather than the page alone is what makes the pick stable when the
 *  candidate list grows. Ties (a 32 bit collision) fall to path order. */
const pairScore = (page: string, candidate: string) => stableHash(`${page}|${candidate}`);
const byScoreFor = (page: string) => (x: GameDef, y: GameDef) =>
  pairScore(page, y.path) - pairScore(page, x.path) || x.path.localeCompare(y.path);

/** Up to 6 related games for a page, by the rules in the header comment.
 *  The registry is a parameter so the harness can hand in one with an
 *  extra game and measure how many pages move; the site never passes it. */
export function relatedGamesFor(path: string, categories: GameCategory[] = LIVE_CATEGORIES): RelatedPick[] {
  const ci = categories.findIndex(c => c.games.some(g => g.path === path));
  if (ci < 0) return [];
  const cat = categories[ci];
  const gi = cat.games.findIndex(g => g.path === path);
  const picked: GameDef[] = [];
  const taken = new Set<string>([path]);
  const add = (g: GameDef | undefined) => {
    if (g && !taken.has(g.path)) { picked.push(g); taken.add(g.path); }
  };

  /* 1. The category ring: the next three games in my own category. */
  for (let k = 1; k <= 3 && k < cat.games.length; k++) {
    add(cat.games[(gi + k) % cat.games.length]);
  }

  /* 2. The category cycle: one game from the next category, the one that
     scores highest for this page, so a category's games share the inbound
     love and the pick holds still when that category grows.

     ROUND 352: A SMALL NEXT CATEGORY TAKES ALL OF IT, because one pick is
     not enough to keep the promise the harness checks. The ring gives a
     game c-1 inbound links from its own category, so a two game category
     hands each of its games exactly one and a one game category hands it
     none; the rest has to arrive through this cycle or through a variety
     pick, and variety is a rendezvous hash, which is luck. NASCAR is two
     games and the category before it is Aussie Rules, which is one page,
     so that page could only ever link ONE of the two, and the other lived
     on whatever the hashes felt like. Round 352 added a game, the hashes
     moved, and /guess-nascar-driver dropped to a single inbound link, so
     the "2+" the harness asserts was never structural for small
     categories, only lucky. Taking every game of a small next category
     makes it structural: measured across the whole registry it moved 10
     of 117 pages and left nothing under two inbound, with the busiest
     page on 12 against a hoarding ceiling of 25. */
  const nextCat = categories[(ci + 1) % categories.length];
  const nextPicks = [...nextCat.games].filter(g => !taken.has(g.path)).sort(byScoreFor(path));
  for (const g of nextCat.games.length <= 3 ? nextPicks : nextPicks.slice(0, 1)) add(g);

  /* 3. Variety picks from anywhere else on the site, best scores first,
     until the block is full. A normal category reaches 6 after two picks
     (ring 3 + next-category 1 + variety 2). A tiny category has no ring to
     lean on (Round 237: the one-game Aussie Rules section shipped a
     3-link block and failed the out-degree floor), so the same walk just
     keeps going until the page offers its full six. */
  const all = categories.flatMap(c => c.games);
  const elsewhere = all.filter(g => !taken.has(g.path) && !cat.games.some(x => x.path === g.path)).sort(byScoreFor(path));
  for (const g of elsewhere) {
    if (picked.length >= 6) break;
    add(g);
  }

  return picked.slice(0, 6).map(toPick);
}
