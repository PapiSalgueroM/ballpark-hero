/**
 * Round 568: an entity id minted from a module scope counter is not unique,
 * because the module scope restarts on a page load and the save does not.
 *
 * Six engines had the same shape: `let cfbId = 0` beside a save that is
 * restored verbatim. Reload the page and the counter is 0 again while the
 * saved roster still holds c1 through c528, so the next man minted is handed
 * an id a saved man already wears.
 *
 * MEASURED, NOT ARGUED. Eighteen independent skeptics were pointed at the six
 * engines and asked to refute it; none of the six was refuted. In NFL Front
 * Office, a reload plus one click put two men on Arizona under `p1`, and then
 * `releasePlayer("p1")` returned true, removed Jacoby Brissett, and left the
 * rookie on the roster. In NBA Front Office, pressing Waive on the new draftee
 * waived Payton Pritchard instead, and a one for one trade took Boston from
 * eleven men to ten with BOTH players gone and only one arriving in Denver.
 * MLB and NHL carry the identical pair of call sites.
 *
 * That is the same failure Anthony's player reported for Club Manager on
 * 2026-09-13 ("the players duplicate if you buy them"), which Round 567 traced
 * to a squad id built from a name fold that is not injective. Same class,
 * different cause, four more games, and worse: there it needed two specific
 * real footballers whose names folded together, here it needs a reload.
 *
 * THE RULE, and it is Round 567's rule applied to a counter: the id is unique
 * BY CONSTRUCTION at the moment of minting, rather than made unique later by
 * throwing one of two real entities away. The counter still runs, but every id
 * carries a token drawn once per document, so ids minted in this page load
 * cannot equal ids minted in any other.
 *
 * WHY NOT PERSIST THE COUNTER, the wonderkidFactory shape. That is the right
 * pattern where it lives (wonderkidFactory.ts keeps `nextId` on the state that
 * serialize() writes whole) and it is wrong here for a structural reason: the
 * counter has to reach the mint site, and several mint sites never see the
 * state. `generateDraftClass(rng, size, taken)` and `prospectToPlayer(pr, rng)`
 * take no league at all, so a persisted counter means moving ten exported
 * signatures and roughly twenty five call sites across six libs, six boards
 * and the harnesses, and it would STILL need a max-id scan on load to migrate
 * every save written before the field existed. This needs neither.
 *
 * NO CLOCK, DELIBERATELY. The token is drawn from Math.random and not from
 * Date.now, and that is the safe direction here rather than the risky one.
 * This constant is evaluated at module scope, which happens under
 * scripts/prerender.mjs, and the prerenderer seeds Math.random identically on
 * every sample and every run (Round 284), so the token is stable across its
 * three clock samples and across playRenderStability's repeated renders. A
 * clock would not be. Nothing renders an id as text in any case: every
 * consumer is a React key or an onClick argument.
 */
const EPOCH = `${Math.floor(Math.random() * 0x100000000).toString(36)}${Math.floor(Math.random() * 0x100000000).toString(36)}`;

/** A minter whose ids cannot collide with ids minted in another page load. */
export function makeIdMinter(prefix: string): () => string {
  let n = 0;
  return () => { n += 1; return `${prefix}${EPOCH}-${n}`; };
}

/**
 * Round 568: the repair, for a save written before the minter above.
 *
 * FIRST HOLDER WINS, inherited from Round 567's `withUniqueIds` in
 * clubManager.ts. Every id already written resolves to the FIRST of a pair,
 * so leaving the first alone means no stored reference is repointed and only
 * the shadowed entity moves. Nobody is dropped: two entries under one id are
 * two real entities, which is the same reason `freeSquadId` exists rather
 * than a filter.
 *
 * The replacement comes from the minter rather than from a "-2" suffix, so a
 * repaired id is distinct even from ids in a list this call was not handed.
 * It mutates in place, because the object here is the one freshly parsed out
 * of localStorage and about to be handed to setState: the arrays keep their
 * identity and only the shadowed entities change.
 */
export function ensureUniqueIds(mint: () => string, lists: (({ id: string }[]) | null | undefined)[]): number {
  const seen = new Set<string>();
  let moved = 0;
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const e of list) {
      if (!e) continue;
      /* A corrupt or missing id is minted too: an entity with no id is as
         unaddressable as one sharing another's. */
      if (typeof e.id !== 'string' || e.id === '' || seen.has(e.id)) {
        e.id = mint();
        moved += 1;
      }
      seen.add(e.id);
    }
  }
  return moved;
}

/**
 * The save shape all six engines share: a record of teams holding players,
 * optionally free agents, plus any loose lists drawn from the same counter
 * (a draft class, a recruiting class, a transfer portal). The GM four have
 * `teams` and `freeAgents`; the two dynasties have `teams` only and
 * `freeAgents` is simply undefined.
 */
export function ensureLeagueEntityIds(
  mint: () => string,
  world: { teams?: Record<string, { players?: { id: string }[] }>; freeAgents?: { id: string }[] } | null | undefined,
  ...loose: (({ id: string }[]) | null | undefined)[]
): number {
  if (!world) return 0;
  return ensureUniqueIds(mint, [
    ...Object.values(world.teams ?? {}).map(t => t?.players),
    world.freeAgents,
    ...loose,
  ]);
}
