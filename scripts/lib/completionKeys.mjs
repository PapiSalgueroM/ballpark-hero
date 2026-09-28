/**
 * The completion keys the client can send, read from src rather than from a
 * list kept anywhere, so a game added tomorrow is covered the day it ships.
 *
 * Round 646 lifted this out of scripts/simLeaderboardCaps.mjs unchanged, so
 * that harness and simCapsAreCeilings read one scan: two copies of a scan are
 * two answers to "which games can score", and the whole history of the caps
 * table is those answers drifting apart.
 *
 * WHY IT MATCHES WHAT IT MATCHES, from simLeaderboardCaps' own history:
 *   Round 361: the first version matched useGameCompletion('literal' and
 *   recordCompletion('/literal' only. Five pages pass a `const SLUG` instead of
 *   an inline literal, three perfect lineup variants pass `config.gameId`, two
 *   calls are split across lines, and WorldCupPredictor uses double quotes.
 *   nba-stat-line shipped with no scores yet and fell through both halves of
 *   the caps table, so the first points anybody earned in it counted for
 *   nothing.
 *   Round 429: ResultScreen records on mount for any page that passes
 *   recordCompletionOnMount, under the key it derives from share.gamePath, so
 *   those pages call neither recorder and every pattern above walks past them.
 *   A page that opts into the mount record is read for its gamePath.
 */
import fs from 'node:fs';
import path from 'node:path';

const LITERAL = /useGameCompletion\(\s*['"]([a-z0-9-]+)['"]|recordCompletion\(\s*['"]\/([a-z0-9-]+)['"]/g;
const VIA_IDENT = /useGameCompletion\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g;
const CONSTANT = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*['"]([a-z0-9-]+)['"]/g;
const GAME_ID = /gameId:\s*['"]([a-z0-9-]+)['"]/g;
const ON_MOUNT = /recordCompletionOnMount/;
const GAME_PATH = /gamePath:\s*['"]\/([a-z0-9-]+)['"]/g;

/** The keys one source file can send, added to `found`. */
function scanSource(src, found) {
  for (const m of src.matchAll(LITERAL)) found.add(m[1] || m[2]);
  for (const m of src.matchAll(GAME_ID)) found.add(m[1]);
  if (ON_MOUNT.test(src)) for (const m of src.matchAll(GAME_PATH)) found.add(m[1]);
  /* Resolve an identifier argument against the string constants declared
     in the same file. Deliberately file local: following an import would
     mean building a module graph, and every case in this repo is local. */
  const consts = new Map();
  for (const m of src.matchAll(CONSTANT)) consts.set(m[1], m[2]);
  for (const m of src.matchAll(VIA_IDENT)) {
    const v = consts.get(m[1]);
    if (v) found.add(v);
  }
}

/**
 * Every completion key src can send, as a Set. `extraSources` (texts) are
 * scanned exactly as a file in src would be: simCapsAreCeilings' classify
 * control hands one in so its check is proved through this same scan.
 */
export function sourceCompletionKeys(root, extraSources = []) {
  const found = new Set();
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) scanSource(fs.readFileSync(p, 'utf8'), found);
    }
  };
  walk(path.join(root, 'src'));
  for (const src of extraSources) scanSource(src, found);
  return found;
}

/**
 * The retirements somebody wrote down, with a reason each, in
 * RETIRED_COMPLETION_SLUGS in src/data/completionSlugs.ts. Read out of the
 * source rather than bundled. Returns null when the block is not where this
 * reads it, so a caller can refuse rather than excuse nothing.
 */
export function declaredRetirements(root) {
  const slugSrc = fs.readFileSync(path.join(root, 'src', 'data', 'completionSlugs.ts'), 'utf8');
  const block = slugSrc.match(/RETIRED_COMPLETION_SLUGS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return null;
  return new Set([...block[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map(m => m[1]));
}
