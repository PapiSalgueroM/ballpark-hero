/* Every query on player_market_values must say which year it means.

   Born in Round 296 out of a user report ("Outdated info", 2026-07-05,
   higher-lower-transfers). The table holds one row per player per YEAR back
   to 2004, so a query without a year constraint ranks peak-year rows first
   and shows 2018 clubs and 2018 fees as if they were today's. When the
   report was chased down, dealPlayers.ts turned out to be the single unscoped
   query in the repo; all 27 other call sites either scope by year or read all
   years on purpose (history categories). This guard makes sure the NEXT
   unscoped query cannot ship quietly.

   Rules honored from CLAUDE.md:
   - Reads the CODE, not the comments: block and line comments are stripped
     before matching, so prose about year scoping cannot satisfy the check.
   - The deliberate all-year readers are pinned by exact count per file, so
     an added unscoped chain in an allowlisted file still fails.
   - Negative control: SIM_MARKETYEAR_CONTROL=unscope removes the year
     constraint from dealPlayers.ts in memory and the run must then fail;
     the control asserts it actually changed the text first.

   Run: node scripts/simMarketYearScope.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.MARKETYEAR_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* file -> number of chains allowed to read ALL years, and why (the reason
   strings are documentation; the count is what is enforced) */
const ALL_YEAR_ALLOWLIST = {
  'src/lib/playerBingo.ts': { count: 1, why: 'club-history tiles check every season row by design' },
  'src/lib/whoAmI.ts': { count: 1, why: 'the club-history clue walks the full career' },
  'src/lib/rarityRound.ts': { count: 6, why: 'all six are "ever" categories: prominence map, played-for-club, nationality, position, worth 100M+ ever, worth 50M+ ever' },
  'src/lib/fetchSoccerClubNotablePlayers.ts': { count: 2, why: 'notable names for a club include past stars; names only, no values shown' },
};

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/* A chain is the text from .from('player_market_values...') to the end of
   the statement: the first semicolon at paren depth zero, capped defensively. */
function chainsOf(src) {
  const out = [];
  const re = /\.from\(\s*['"]player_market_values(_dedup)?['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tail = src.slice(m.index, m.index + 1200);
    const end = tail.search(/;|\n\s*\n\s*(const|let|function|export)/);
    out.push(end === -1 ? tail : tail.slice(0, end));
  }
  return out;
}

const isScoped = chain => /\.(eq|gte|gt|in)\(\s*['"]year['"]/.test(chain);

console.log('1) Every player_market_values chain names a year, or is on the pinned all-year list');
{
  const libDir = path.join(ROOT, 'src');
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  })(libDir);

  const control = process.env.SIM_MARKETYEAR_CONTROL === 'unscope';
  let controlBit = false;
  let scanned = 0, scoped = 0, allowed = 0;
  for (const f of files) {
    let src = stripComments(fs.readFileSync(f, 'utf8'));
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');
    if (control && rel === 'src/lib/dealPlayers.ts') {
      const before = src;
      src = src.replace(/\.eq\(\s*['"]year['"][^)]*\)/g, '');
      if (src !== before) controlBit = true;
    }
    const chains = chainsOf(src);
    if (chains.length === 0) continue;
    const unscoped = chains.filter(c => !isScoped(c)).length;
    scanned += chains.length;
    scoped += chains.length - unscoped;
    const entry = ALL_YEAR_ALLOWLIST[rel];
    if (unscoped === 0) continue;
    if (!entry) { fail(`${rel}: ${unscoped} chain(s) on player_market_values with no year constraint and no allowlist entry`); continue; }
    if (unscoped !== entry.count) { fail(`${rel}: ${unscoped} unscoped chain(s), allowlist pins exactly ${entry.count} (${entry.why})`); continue; }
    allowed += unscoped;
  }
  console.log(`   ${scanned} chains scanned, ${scoped} year-scoped, ${allowed} pinned all-year`);
  if (scanned < 25) fail(`only ${scanned} chains found; the scanner is likely broken, the repo had 31 when this was written`);

  if (control) {
    if (!controlBit) { console.error('\ncontrol run: dealPlayers.ts had no year constraint to remove, the control is dead'); process.exit(1); }
    if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
    console.error('\ncontrol run: unscoping dealPlayers changed NOTHING, the check is dead');
    process.exit(1);
  }
}

if (failures > 0) { console.error(`\nsimMarketYearScope: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimMarketYearScope: all green');
