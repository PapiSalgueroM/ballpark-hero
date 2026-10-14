/* Release BF join: the keyed deck seam of four Soccer Career fixture builders.
   Rounds 1356, 1358, 1361 and 1363 built their browser fixtures by steering the old sort shuffle's comparator through
   the Math.random values it consumed, so a batch could be dealt with chosen cards in front. Round 1327 replaced that
   shuffle: each batch is now a fair pick from a stream keyed to the career and the season (drawEventBatch on keyedRng),
   which Math.random cannot steer. On such a tree a fixture is its prepared context under its own player name (the deck
   key's moving part, as simSoccerDeckFairness varies it), searched in order until the unchanged picker deals the target
   cards first with a real continuation behind them. The walks then read that witness instead of the comparator one.
   Nothing about the picker is changed or observed: the plain compiled engine deals every batch. */
export const OLD_SORT_ANCHOR = '  const shuffled = [...eligible].sort(() => Math.random() - 0.5);';
export const KEYED_DECK_ANCHOR = '  const picked = drawEventBatch(eligible, `${soccerDeckIdentity(state)}|${season}|deck`);';
export const KEYED_KIND = 'keyed-deck-name-search';
export const KEYED_LIMIT = 200000;

/** True when the engine source has the keyed deck and not the old sort shuffle. */
export function isKeyedEngine(source) {
  return !source.includes(OLD_SORT_ANCHOR) && source.split(KEYED_DECK_ANCHOR).length === 2;
}

/** The observer receipt a keyed fixture builder writes in place of the comparator observer. */
export function keyedObserver(engineFile, plainCompiledSha256) {
  return { kind: KEYED_KIND, file: engineFile, deckAnchor: KEYED_DECK_ANCHOR, sortAnchor: OLD_SORT_ANCHOR, sortAnchorAbsent: true,
    limit: KEYED_LIMIT, plainCompiledPath: 'fixed/engine.mjs', plainCompiledSha256 };
}

/** Does this raw batch deal the targets first, with at least one more card behind them? */
export function dealsPrefix(batch, targets) {
  return batch?.phase === 'random_events' && batch.pendingEvents.length > targets.length
    && targets.every((id, index) => batch.pendingEvents[index]?.id === id);
}

/** Try attempt(0), attempt(1), ... until one deals the targets first (and passes accept). attempt returns { picked, ... }. */
export function keyedSearch(targets, attempt, limit = KEYED_LIMIT, accept = () => true) {
  for (let n = 0; n < limit; n += 1) {
    const run = attempt(n);
    if (dealsPrefix(run.picked.result, targets) && accept(run.picked.result)) return { ...run, attempts: n + 1 };
  }
  return null;
}

/** The walk side: problems with a keyed observer receipt, given this checkout's engine source (empty when it holds). */
export function keyedObserverProblems(observer, engineSource) {
  const problems = [];
  if (observer?.kind !== KEYED_KIND) problems.push('observer kind is not ' + KEYED_KIND);
  if (observer?.file !== 'src/lib/soccerCareerEngine.ts') problems.push('observer file differs');
  if (observer?.deckAnchor !== KEYED_DECK_ANCHOR || observer?.sortAnchor !== OLD_SORT_ANCHOR) problems.push('observer anchors differ');
  if (!isKeyedEngine(engineSource)) problems.push('this checkout\'s engine is not the keyed deck without the old sort shuffle');
  if (observer?.plainCompiledPath !== 'fixed/engine.mjs' || !/^[0-9a-f]{64}$/.test(observer?.plainCompiledSha256 ?? '')) problems.push('plain compiled receipt differs');
  return problems;
}

/** The walk side: problems with one fixture's keyed input witness (empty when it holds). */
export function keyedInputProblems(witness, legalPrefix = []) {
  const problems = [], input = witness?.input;
  if (input?.mode !== KEYED_KIND) problems.push('input mode is not ' + KEYED_KIND);
  if (!Number.isInteger(input?.attempts) || input.attempts < 1 || input.attempts > KEYED_LIMIT) problems.push('attempt count is not a bounded integer');
  if (!Array.isArray(input?.draws) || input.draws.length !== input.drawCount) problems.push('draw vector length differs');
  else if (!input.draws.every((value, index) => value === (legalPrefix[index] ?? 0.99))) problems.push('a draw is not its disclosed prefix value or 0.99');
  if (!Array.isArray(witness?.comparisons) || witness.comparisons.length !== 0) problems.push('a keyed witness carries comparator receipts');
  return problems;
}
