/* Round 1584: Soccer Grid's club rule, taken by name out of supabase/functions/soccer-grid-validate/index.ts and
 * compiled, so a harness or a generator runs the function's own code instead of a hand copy.
 *
 * The source is CRLF normalised and its comments are stripped before any anchor is looked for, so a comment can never
 * stand in for the code. Each anchor must be in the stripped text exactly once, or the build returns null and says
 * which (through onFail). Pieces:
 *   TRANSLIT, norm, WC_WINNER_BY_YEAR (parseCriterion reads it), CLUB_ALIASES, CLUB_NAMESAKES, clubMatches,
 *   parseCriterion, and TRANSFER_OVERLAY_2026 when withOverlay is set (the verified moves count as stints).
 * Used by scripts/simClubNamesakes.mjs (section G) and scripts/qa/genClubNamesakePurge1584.mjs. */
import { transformSync } from 'esbuild';

export const stripComments = s => s.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

export const braceEnd = (text, from) => {
  const open = text.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
};

export const onceAt = (text, anchor) => {
  const at = text.indexOf(anchor);
  return at < 0 || text.indexOf(anchor, at + 1) >= 0 ? -1 : at;
};

const PIECES = [
  ['const TRANSLIT', 'object'], ['const norm =', 'statement'], ['const WC_WINNER_BY_YEAR', 'object'],
  ['const CLUB_ALIASES', 'object'], ['const CLUB_NAMESAKES', 'object'], ['function clubMatches(', 'block'],
  ['function parseCriterion(', 'block'],
];

export function buildGridRule(raw, { onFail = m => { throw new Error(m); }, withOverlay = false } = {}) {
  const src = stripComments(raw);
  const pieces = withOverlay ? [...PIECES, ['const TRANSFER_OVERLAY_2026', 'object']] : PIECES;
  const parts = [];
  for (const [anchor, shape] of pieces) {
    const at = onceAt(src, anchor);
    if (at < 0) { onFail(`the anchor "${anchor}" is not in soccer-grid-validate exactly once`); return null; }
    /* an object's value opens at "= {", past any braces in its type annotation */
    let end = shape === 'statement' ? src.indexOf(';', at) + 1
      : braceEnd(src, shape === 'object' ? src.indexOf('= {', at) : at);
    if (shape === 'object') end = src.indexOf(';', end) + 1;
    parts.push(src.slice(at, end));
  }
  const names = ['norm', 'clubMatches', 'parseCriterion', 'CLUB_NAMESAKES', ...(withOverlay ? ['TRANSFER_OVERLAY_2026'] : [])];
  const ts = `function __rule() {\n${parts.join('\n')}\nreturn { ${names.join(', ')} };\n}`;
  const js = transformSync(ts, { loader: 'ts' }).code;
  return new Function(`${js}\nreturn __rule();`)();
}
