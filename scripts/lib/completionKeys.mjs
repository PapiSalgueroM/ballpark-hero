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
 *   Round 674 (the fence lens review, R2.D9): the scan read raw text, so a
 *   key named only in a comment, or only in a test file, counted as one the
 *   client can send, and a call written with a template literal
 *   (recordCompletion(`/stat-detective`, ...)) was not seen at all. It now
 *   reads each file as code (scripts/lib/readSource.mjs stripComments, which
 *   keeps strings and templates), accepts a template literal with no ${}
 *   in it as a literal, and skips src/test, *.test and *.spec files and the
 *   __control_ copies a harness writes, as srcFiles does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stripComments } from './readSource.mjs';

const LITERAL = /useGameCompletion\(\s*(['"`])([a-z0-9-]+)\1|recordCompletion\(\s*(['"`])\/([a-z0-9-]+)\3/g;
const VIA_IDENT = /useGameCompletion\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g;
const CONSTANT = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*(['"`])([a-z0-9-]+)\2/g;
const GAME_ID = /gameId:\s*(['"`])([a-z0-9-]+)\1/g;
const ON_MOUNT = /recordCompletionOnMount/;
const GAME_PATH = /gamePath:\s*(['"`])\/([a-z0-9-]+)\1/g;

/** A file the scan reads: under src, a .ts or .tsx, not a test, not a control copy. */
export function scannedFile(rel) {
  const r = rel.replaceAll('\\', '/');
  return /\.tsx?$/.test(r) && !r.startsWith('src/test/') && !/\.(test|spec)\.tsx?$/.test(r) && !path.basename(r).startsWith('__control_');
}

/** The keys one source file can send, added to `found`. Read as code. */
function scanSource(raw, found) {
  const src = stripComments(raw.split('\r\n').join('\n'));
  for (const m of src.matchAll(LITERAL)) found.add(m[2] || m[4]);
  for (const m of src.matchAll(GAME_ID)) found.add(m[2]);
  if (ON_MOUNT.test(src)) for (const m of src.matchAll(GAME_PATH)) found.add(m[2]);
  /* Resolve an identifier argument against the string constants declared
     in the same file. Deliberately file local: following an import would
     mean building a module graph, and every case in this repo is local. */
  const consts = new Map();
  for (const m of src.matchAll(CONSTANT)) consts.set(m[1], m[3]);
  for (const m of src.matchAll(VIA_IDENT)) {
    const v = consts.get(m[1]);
    if (v) found.add(v);
  }
}

/**
 * Every completion key src can send, as a Set. `extraSources` (texts) are
 * scanned exactly as a file in src would be: simCapsAreCeilings' classify
 * control hands one in so its check is proved through this same scan.
 * `overrides` (repo relative path to text) replaces a file's text for this
 * scan only, so a control can rewrite one file in memory and be read through
 * the same scan; a path that is not a scanned file is refused.
 */
export function sourceCompletionKeys(root, extraSources = [], overrides = new Map()) {
  const found = new Set();
  for (const rel of overrides.keys()) if (!scannedFile(rel)) throw new Error(`${rel} is not a file this scan reads`);
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(root, p).replaceAll('\\', '/');
      if (e.isDirectory()) { if (rel !== 'src/test') walk(p); continue; }
      if (!scannedFile(rel)) continue;
      scanSource(overrides.has(rel) ? overrides.get(rel) : fs.readFileSync(p, 'utf8'), found);
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
