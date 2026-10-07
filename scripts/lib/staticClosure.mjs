/**
 * Round 1042: one walker for "what does this file pull in before it can run".
 *
 * Lifted from scripts/simFlagshipWeight.mjs (Round 273), which kept its own copy, so that
 * scripts/simCmDataOnDemand.mjs can ask the same question of every page without a second walker
 * that drifts from the first. Three repairs came with the lift, and each can be switched off so
 * the lift itself can be proved (with all off this returns exactly what the Round 273 walker did):
 *
 *   comments   the text is read with its comments gone. A guard has to read the code and not the
 *              prose about it: a commented out import, or a sentence in a header that happens to
 *              hold the words import ... from '...', is not an edge. The comments are removed by
 *              esbuild, which parses the file, and never by a regex (a slash and a star inside a
 *              string or a glob would swallow every import after it). verbatimModuleSyntax is on
 *              for that parse, so esbuild drops what the compiler drops (import type, export type)
 *              and keeps every other import exactly as written, used or not.
 *   exportFrom `export ... from` is an edge like `import ... from`. A file that re exports another
 *              module loads it; the Round 273 expression did not see that.
 *   bothWays   a module one file imports BOTH statically and with import() is a static edge: the
 *              bundler keeps it in the first download and the import() buys nothing. The Round
 *              273 walker dropped such a module, to be safe against an `import (` it could
 *              misread in raw text. That cannot happen in parsed code, so this repair only
 *              applies together with `comments`. It is exactly the mistake a split has to be
 *              guarded against: a file that loads a chunk on demand and also imports it.
 *
 * What it does NOT follow, on purpose: `import type` (erased by the compiler, it costs nothing at
 * run time) and dynamic import() (loading on demand is the whole point of asking).
 *
 *   staticClosure(root, entryRel, override?, opts?) -> Set of paths relative to root, forward slashes
 *   staticEdges(root, fileAbs, override?, opts?)    -> the resolved files one file imports
 *   codeOf(fileAbs, text)                           -> the text with its comments gone
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';

/* `import type` is erased by the compiler and costs nothing at runtime, so it
   must NOT be counted. Getting that wrong reports src/integrations/supabase/
   types.ts, 272 KB, as shipping on every page of the site, which it does not.
   Dynamic imports are excluded for the same reason: that is the whole point. */
const STATIC_IMPORT = /(?:^|\n)\s*import\s+(?!type\s)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"]+)['"]/g;
/* export * from, export * as ns from, export { a, b as c } from. `export type` never matches. */
const EXPORT_FROM = /(?:^|\n)\s*export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}'"]*\})\s*from\s+['"]([^'"]+)['"]/g;

export function resolveSpec(root, spec, importer) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(importer), spec);
  else return null;
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '']) {
    const c = base + ext;
    try { if (statSync(c).isFile()) return c; } catch { /* not there */ }
  }
  for (const ext of ['.ts', '.tsx']) {
    const i = path.join(base, 'index' + ext);
    if (existsSync(i)) return i;
  }
  return null;
}

const codeCache = new Map();
/** The file's code with its comments gone, by a real parse. Anything esbuild cannot parse throws
 *  with the file's name: a guard that quietly read the raw text instead would be a weaker guard. */
export function codeOf(fileAbs, text) {
  const ext = path.extname(fileAbs).toLowerCase();
  const loader = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx', '.mjs': 'js', '.cjs': 'js' }[ext];
  if (!loader) return '';
  const hit = codeCache.get(fileAbs);
  if (hit && hit.text === text) return hit.code;
  let code;
  try {
    code = transformSync(text, {
      loader, jsx: 'preserve', legalComments: 'none', charset: 'utf8',
      tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } },
    }).code;
  } catch (e) {
    throw new Error(`staticClosure: esbuild could not parse ${fileAbs}: ${String(e.message ?? e).split('\n')[0]}`);
  }
  codeCache.set(fileAbs, { text, code });
  return code;
}

const DEFAULTS = { comments: true, exportFrom: true, bothWays: true };

/** The specifiers one text imports statically, in the order they are written. */
export function staticSpecs(fileAbs, text, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const t = o.comments ? codeOf(fileAbs, text) : text;
  const dyn = new Set();
  DYNAMIC_IMPORT.lastIndex = 0;
  for (let m; (m = DYNAMIC_IMPORT.exec(t)) !== null;) dyn.add(m[1]);
  const out = [];
  STATIC_IMPORT.lastIndex = 0;
  const keepBoth = o.comments && o.bothWays;
  for (let m; (m = STATIC_IMPORT.exec(t)) !== null;) if (keepBoth || !dyn.has(m[1])) out.push(m[1]);
  if (o.exportFrom) {
    EXPORT_FROM.lastIndex = 0;
    for (let m; (m = EXPORT_FROM.exec(t)) !== null;) out.push(m[1]);
  }
  return out;
}

/** The specifiers one text imports with import(), in the order they are written. */
export function dynamicSpecs(fileAbs, text, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const t = o.comments ? codeOf(fileAbs, text) : text;
  const out = [];
  DYNAMIC_IMPORT.lastIndex = 0;
  for (let m; (m = DYNAMIC_IMPORT.exec(t)) !== null;) out.push(m[1]);
  return out;
}

/* A file read from disk is walked once per process: a harness asks about every page in turn, and
   the pages share most of what they import. A file handed in through `override` is never cached,
   and nothing here expects a file to change on disk while a harness runs (a negative control
   rewrites in memory, through `override`). */
const edgeCache = new Map();

export function staticEdges(root, fileAbs, override = {}, opts = {}) {
  const overridden = Object.prototype.hasOwnProperty.call(override, fileAbs);
  const o = { ...DEFAULTS, ...opts };
  const key = `${root}|${fileAbs}|${o.comments ? 1 : 0}${o.exportFrom ? 1 : 0}${o.bothWays ? 1 : 0}`;
  if (!overridden && edgeCache.has(key)) return edgeCache.get(key);
  let t;
  try { t = overridden ? override[fileAbs] : readFileSync(fileAbs, 'utf8'); } catch { return []; }
  const out = [];
  for (const spec of staticSpecs(fileAbs, t, opts)) {
    const r = resolveSpec(root, spec, fileAbs);
    if (r) out.push(r);
  }
  if (!overridden) edgeCache.set(key, out);
  return out;
}

/**
 * Every file `entryRel` reaches through static imports, itself included.
 * `override` maps an ABSOLUTE path to the text to read in place of the file (a negative control
 * rewrites a file in memory with it; nothing on disk is ever written).
 */
export function staticClosure(root, entryRel, override = {}, opts = {}) {
  const entry = path.join(root, entryRel);
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length) {
    const cur = queue.pop();
    for (const r of staticEdges(root, cur, override, opts)) {
      if (!seen.has(r)) { seen.add(r); queue.push(r); }
    }
  }
  return new Set([...seen].map(f => path.relative(root, f).replaceAll('\\', '/')));
}
