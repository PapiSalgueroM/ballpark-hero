/**
 * Round 377: the badge means what it says, and its copy cannot drift from it.
 *
 * WHAT WAS WRONG, three faults in one small feature:
 *   1. The overlay congratulated the winner with "You completed all 37 games
 *      today" and its share post said the same. 37 was true a long time ago.
 *      The registry holds 118. That number was typed into the prose while the
 *      rule was computed somewhere else, so the two could not help but part.
 *   2. The award rule required a player's distinct completions to reach
 *      TOTAL_GAMES, ALL_GAMES.length, 118, a set that includes Club Manager
 *      seasons, four Front Office career sims and four Conquest campaigns.
 *      Nobody finishes that in a day. daily_badges has zero rows and always has.
 *   3. Because it counted ALL_GAMES, every game shipped made the badge harder.
 *      It was not merely unreachable, it was moving away every round.
 *
 * MEASURED before it was changed: the most any signed in player has ever
 * completed in one day is 25 distinct games, on 2026-07-27. That number is why
 * section 4 exists rather than a comment claiming the new bar is fair.
 *
 * WHAT THIS HOLDS:
 *   1. The copy carries no typed game count at all. This is the check that
 *      would have caught the original bug, and the only one that reads the
 *      words a winner actually sees.
 *   2. The target is the daily set, not every game, so it cannot climb when an
 *      unrelated game ships.
 *   3. Every game the target counts is reachable through a recorded completion
 *      slug. Without Round 376's resolver the four Conquest boards and the Quiz
 *      Board record under other names, so five daily games could never count
 *      toward the badge and it would stay unwinnable for a second reason.
 *   4. The bar is reported against the observed record, so nobody has to guess
 *      whether it is achievable. This section prints rather than fails: how hard
 *      a badge should be is a product call, not a correctness one, and a harness
 *      that fails on a judgement is a harness people learn to ignore.
 *
 * NEGATIVE CONTROL: LEGEND_CONTROL=hardcode puts a typed "37 games" back into an
 * in memory copy of the overlay, restoring the shipped bug, and section 1 must
 * go red.
 *
 * Run: node scripts/simDailyLegend.mjs   (needs the database for section 4)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LEGEND_CONTROL || '';
if (CONTROL && CONTROL !== 'hardcode') {
  console.error(`LEGEND_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const ENTRY = path.join(os.tmpdir(), 'legendEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'legend.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export { ALL_GAMES } from '${rel('src/data/gameRegistry.ts')}';`,
  `export { completionSlugForPath } from '${rel('src/data/completionSlugs.ts')}';`,
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${rel('src')}`);
const { ALL_GAMES, completionSlugForPath } = await import(pathToFileURL(BUNDLE).href);
const DAILY = ALL_GAMES.filter(g => g.daily);

console.log('1) the badge copy states no game count of its own');
{
  const file = path.join(ROOT, 'src', 'components', 'game', 'DailyLegendOverlay.tsx');
  let src = fs.readFileSync(file, 'utf8');
  if (CONTROL === 'hardcode') {
    const before = src;
    src = src.replace(/all \$\{LEGEND_TARGET\} daily games/g, 'all 37 games')
             .replace(/all \{LEGEND_TARGET\} daily games/g, 'all 37 games');
    if (src === before) { console.error('control cannot run: there was no derived count to hardcode'); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON (hardcode): a typed "37 games" put back, restoring what shipped. Section 1 must go red.');
  }

  /* Comments explain the bug and quote the old number on purpose, so they are
     stripped before matching. Round 284's lesson: a guard that reads the prose
     explaining the guard is satisfied by its own documentation. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const typed = [...code.matchAll(/\b(\d{2,3})\s+(?:daily\s+)?games\b/gi)];
  for (const m of typed) {
    fail(`the overlay tells the player "${m[0]}" as a literal. That number is written next to a rule computed elsewhere, which is exactly how it came to say 37 while the site had 118. Derive it from LEGEND_TARGET.`);
  }
  const derives = /LEGEND_TARGET/.test(code);
  if (!derives) fail('the overlay never mentions LEGEND_TARGET, so whatever it tells the player is not the rule that awarded the badge');
  console.log(`   ${typed.length} typed game counts in the copy, derives from the rule: ${derives}`);
}

console.log('2) the target is the daily set and cannot climb with the catalogue');
{
  const hook = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useDailyLegend.ts'), 'utf8');
  const code = hook.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  if (/\bTOTAL_GAMES\b/.test(code)) {
    fail('the award rule still reads TOTAL_GAMES, so it counts every game on the site and gets harder every time one ships');
  }
  if (!/ALL_GAMES\.filter\(\s*g\s*=>\s*g\.daily\s*\)/.test(code)) {
    fail('the award rule no longer derives its target from the daily flagged games, so this harness cannot tell what it now counts');
  }
  console.log(`   target is ${DAILY.length} daily games out of ${ALL_GAMES.length} in the registry`);
  if (DAILY.length >= ALL_GAMES.length) fail('the daily set is the whole catalogue, which is the bug this round fixed');
}

/* Pulled once, up front, because sections 3 and 4 both need it. Paged, for the
   PostgREST 1,000 row cap this repo has been bitten by five times. */
const byDay = new Map();
const liveSlugs = new Map();
let dbOk = true;
{
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  for (let from = 0; dbOk; from += 1000) {
    let page = null;
    for (let attempt = 0; attempt <= 2 && !page; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 600 * attempt));
      try {
        const res = await fetch(`${URL_}/rest/v1/daily_completions?select=game_slug,date,user_id`, {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
        });
        if (res.ok) page = await res.json();
      } catch { page = null; }
    }
    if (!page) { dbOk = false; break; }
    for (const r of page) {
      liveSlugs.set(r.game_slug, (liveSlugs.get(r.game_slug) || 0) + 1);
      if (!r.user_id) continue;
      const k = `${r.user_id}|${r.date}`;
      if (!byDay.has(k)) byDay.set(k, new Set());
      byDay.get(k).add(r.game_slug);
    }
    if (page.length < 1000) break;
  }
}

console.log('3) every game the target counts can actually be reached');
{
  /* A daily game whose recorded slug is not the one the badge looks for can
     never be ticked off, and one such game is enough to make the badge
     unwinnable on its own. */
  const walk = d => {
    const out = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) out.push(...walk(f));
      else if (/\.tsx?$/.test(e.name)) out.push(f);
    }
    return out;
  };
  /* NOT A LITERAL-ONLY SCAN, and the first draft of this section was, which
     reported seven false positives. Plenty of games pass the slug through a
     `const SLUG = '...'` or a shared config (usePerfectLineupGeneric takes
     config.gameId), so the name never appears inside the call parentheses. A
     slug counts as written if it is quoted anywhere in a file that records
     completions at all. */
  const written = new Set();
  for (const f of walk(path.join(ROOT, 'src'))) {
    const s = fs.readFileSync(f, 'utf8');
    if (!s.includes('useGameCompletion(')) continue;
    for (const m of s.matchAll(/['"]([a-z0-9][a-z0-9-]{2,})['"]/g)) written.add(m[1]);
  }
  /* TWO INDEPENDENT SOURCES, because neither alone is sufficient and widening
     one regex until it passes is not the same as being right. The source scan
     misses a slug held in a data file (the Perfect Lineup boards take theirs
     from a pool config, so the name appears nowhere near a completion call).
     The live table misses a game too new or too quiet to have rows. A daily
     game is reachable if EITHER can show it. */
  let bySource = 0, byData = 0;
  const unproven = [];
  for (const g of DAILY) {
    const slug = completionSlugForPath(g.path);
    if (written.has(slug)) { bySource += 1; continue; }
    if (liveSlugs.has(slug)) { byData += 1; continue; }
    unproven.push({ path: g.path, slug });
  }
  console.log(`   ${bySource} proven by source, ${byData} by rows in the live table, ${unproven.length} unproven of ${DAILY.length}`);
  for (const u of unproven.slice(0, 6)) {
    fail(`${u.path} counts toward the badge as "${u.slug}", no file that records completions mentions that name and the live table has never seen it, so it can never be ticked off`);
  }
  if (!dbOk) console.log('   (the database did not answer, so only the source side was available)');
}

console.log('4) the bar, against what anyone has actually managed');
{
  const dailySlugs = new Set(DAILY.map(g => completionSlugForPath(g.path)));
  if (!dbOk) {
    console.log('   the database did not answer, skipped');
  } else {
    let bestAll = 0, bestDaily = 0;
    for (const set of byDay.values()) {
      bestAll = Math.max(bestAll, set.size);
      bestDaily = Math.max(bestDaily, [...set].filter(s => dailySlugs.has(s)).length);
    }
    console.log(`   best day on record: ${bestAll} distinct games, ${bestDaily} of them daily. The badge asks for ${DAILY.length}.`);
    /* Reported, not failed. Whether a badge should be winnable today is
       Anthony's call; what this round fixed is that it was unwinnable BY
       CONSTRUCTION and lying about its own rule. */
    if (bestDaily < DAILY.length) {
      console.log(`   NOTE: nobody has reached it yet. Lowering the bar is a one line change to LEGEND_TARGET if he wants it earned.`);
    }
  }
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simDailyLegend control (${CONTROL}): green. The restored bug was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simDailyLegend control (${CONTROL}): RED. A typed game count was put back and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simDailyLegend: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simDailyLegend: green. The rule and the words a winner reads come from one place.');
