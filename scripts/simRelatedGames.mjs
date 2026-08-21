/**
 * Round 181 harness: the internal link graph is real, fair and crawlable.
 *
 * What Round 181 shipped (S-6): the "More games" block stopped pointing
 * every page in a category at the same first three games and became a
 * deterministic graph (src/lib/relatedGames.ts): a ring through the page's
 * own category, one link into the next category so categories form a
 * cycle, and two hash-spread variety picks, rendered as real tiles on
 * every game page through GameSeoContent.
 *
 * Measured at build time (2026-08-19, 107 games): out-degree 4 to 6,
 * inbound minimum 2, median 5, maximum 13, zero orphans, and a BFS from
 * one page reached all 107. The assertions below pin the invariants the
 * design guarantees (no orphans, everything reachable from EVERYWHERE,
 * out-degree floor 4) and add a concentration ceiling of 25 so a
 * regression back toward everyone-links-the-same-three cannot pass.
 *
 * Run: node scripts/simRelatedGames.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/relatedGamesEntry.mjs';
const BUNDLE = '/tmp/relatedGames.bundle.mjs';

fs.writeFileSync(ENTRY, `
const reg = await import('${ROOT}/src/data/gameRegistry.ts');
const rel = await import('${ROOT}/src/lib/relatedGames.ts');
export { reg, rel };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { reg, rel } = await import(BUNDLE);
const { ALL_GAMES, CATEGORIES } = reg;
const { relatedGamesFor } = rel;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const paths = ALL_GAMES.map(g => g.path);
const pathSet = new Set(paths);
const catOf = new Map();
for (const c of CATEGORIES) for (const g of c.games) catOf.set(g.path, c.title);

/* ---------- 1. Every page's picks are well formed ---------- */
console.log('1) Picks: no self, no dupes, no dead links, enough of them');
const adj = new Map();
for (const g of ALL_GAMES) {
  const r = relatedGamesFor(g.path);
  adj.set(g.path, r.map(x => x.path));
  if (r.length < 4) fail(`${g.path} only offers ${r.length} related games (floor is 4)`);
  if (r.length > 6) fail(`${g.path} offers ${r.length}, cap is 6`);
  const seen = new Set();
  for (const x of r) {
    if (x.path === g.path) fail(`${g.path} links to itself`);
    if (seen.has(x.path)) fail(`${g.path} links ${x.path} twice`);
    seen.add(x.path);
    if (!pathSet.has(x.path)) fail(`${g.path} links ${x.path}, which is not a registered game`);
    if (!x.label || !x.emoji || !x.description) fail(`${g.path}: pick ${x.path} is missing display fields`);
  }
  /* At least one pick leaves the category (the cycle link guarantees it). */
  if (!r.some(x => catOf.get(x.path) !== catOf.get(g.path))) {
    fail(`${g.path} never links outside its own category, the category cycle is broken`);
  }
}

/* ---------- 2. No orphans, no hoarding ---------- */
console.log('2) Inbound links: everyone gets some, nobody hoards');
{
  const inbound = new Map(paths.map(p => [p, 0]));
  for (const [, outs] of adj) for (const p of outs) inbound.set(p, inbound.get(p) + 1);
  for (const [p, n] of inbound) {
    if (n === 0) fail(`${p} has ZERO inbound internal links, an orphan for crawlers`);
    if (n < 2) fail(`${p} has only ${n} inbound link (the ring guarantees 2+)`);
    if (n > 25) fail(`${p} hoards ${n} inbound links, the spread has collapsed`);
  }
}

/* ---------- 3. The whole site is one crawlable component ---------- */
console.log('3) A crawler landing anywhere can reach everywhere');
{
  const reach = start => {
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const c = q.shift();
      for (const n of adj.get(c) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
    }
    return seen.size;
  };
  let bad = 0;
  for (const p of paths) {
    if (reach(p) !== paths.length) { bad += 1; if (bad <= 3) fail(`BFS from ${p} does not reach the whole site`); }
  }
  if (bad > 3) fail(`...and ${bad - 3} more pages with partial reach`);
}

/* ---------- 4. Deterministic on every call ---------- */
console.log('4) The same page always shows the same links');
for (const g of ALL_GAMES) {
  const a = JSON.stringify(relatedGamesFor(g.path));
  const b = JSON.stringify(relatedGamesFor(g.path));
  if (a !== b) { fail(`${g.path} produced different links on two calls`); break; }
}

/* ---------- 5. Unknown paths fail closed ---------- */
console.log('5) A page outside the registry gets an empty block, not a crash');
{
  const r = relatedGamesFor('/no-such-game');
  if (!Array.isArray(r) || r.length !== 0) fail('an unregistered path should return []');
}

/* ---------- verdict ---------- */
if (failures > 0) {
  console.error(`\n${failures} RELATED GAMES CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL RELATED GAMES CHECKS PASSED');
