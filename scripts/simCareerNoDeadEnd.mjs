/* A Soccer Career never lands the player on a screen that cannot draw.
 *
 * Round 502. The corruption conviction ended careers permanently, with the
 * player still at the keyboard and their save intact but unusable.
 *
 * THE PATH, all of it verified in source before anything was changed:
 * advanceProSeason's conviction branch is the ONLY place in the engine that
 * sets phase = "newspaper" (grep: one hit), and it returns early WITHOUT
 * pushing a season record and without setting pendingSummary, which
 * dismissSummary nulls at the end of the previous season. dismissNewspaper then
 * moved unconditionally to "season_summary". SoccerCareer.tsx renders that
 * phase only under `career.phase === "season_summary" && career.pendingSummary`,
 * and showActionButton lists youth, playing, manager_season, pundit_season and
 * owner_season, so there was no board, no Next Season and no Retire. The state
 * is written to localStorage on every change and the loader never touched
 * phase, so reloading restored the same dead screen. The only escape was New
 * Career, which DELETES the save.
 *
 * It was not a rare unlucky path. Conviction is the only way into the newspaper
 * phase, so EVERY conviction did it, and the trial fires on a 50 percent roll
 * once corruption heat reaches 90. Heat 90 is reachable by buying one
 * repeatable EUR 0.25M item seven times.
 *
 * WHAT THIS HOLDS:
 *   1. Driving the REAL engine: after a conviction and a dismissed newspaper,
 *      the career is in a phase the page renders unconditionally AND that
 *      carries the action button. This is the behavioural check, run against
 *      the shipped module rather than a description of it.
 *   2. repairCareer heals a save that is ALREADY stranded, because fixing the
 *      transition does nothing for a career that died before it shipped.
 *   3. Every phase string the ENGINE can assign is a phase the PAGE renders.
 *      This is the general form, and it is the one that would have caught this
 *      class without anybody knowing about corruption: a phase that the engine
 *      can reach and the page cannot draw is a dead end whatever put it there.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   CAREER_DEADEND_CONTROL=strand restores the unconditional hop to
 *     season_summary, reproducing exactly what shipped, so sections 1 and 3 go
 *     red.
 *   CAREER_DEADEND_CONTROL=noheal skips the repair, so section 2 goes red with
 *     the stranded save still stranded.
 *
 * Run: node scripts/simCareerNoDeadEnd.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAREER_DEADEND_CONTROL || '';
if (CONTROL && !['strand', 'noheal'].includes(CONTROL)) {
  console.error(`CAREER_DEADEND_CONTROL=${CONTROL} is not a control this harness knows (strand, noheal)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

/* The engine is bundled from source so the controls can patch a real line of a
   real module rather than a copy of it. */
const ENGINE = path.join(ROOT, 'src', 'lib', 'soccerCareerEngine.ts');
const engineSrc = fs.readFileSync(ENGINE, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-deadend-'));
let patchedEngine = engineSrc;
if (CONTROL === 'strand') {
  const before = patchedEngine;
  patchedEngine = patchedEngine.replace(
    's.phase = s.pendingSummary ? "season_summary" : "playing";',
    's.phase = "season_summary";');
  if (patchedEngine === before) {
    console.error('CONTROL strand cannot run: the guarded dismissNewspaper line is not there to replace');
    process.exit(1);
  }
}
if (CONTROL === 'noheal') {
  const before = patchedEngine;
  patchedEngine = patchedEngine.replace(
    'if (s.phase === "season_summary" && !s.pendingSummary) s.phase = "playing";',
    '');
  if (patchedEngine === before) {
    console.error('CONTROL noheal cannot run: the repair line is not there to remove');
    process.exit(1);
  }
}
/* The patched source is injected with an onLoad plugin rather than copied to a
   temp directory. A copy breaks every relative import the engine has
   (./careerEras, ./soccerPhone and a dozen more), because resolution is
   relative to the file's location; the plugin keeps resolveDir pointing at
   src/lib so the module graph is the real one. */
const ENTRY = path.join(tmp, 'entry.ts');
const ENGINE_POSIX = ENGINE.split(path.sep).join('/');
fs.writeFileSync(ENTRY, `export * from '${ENGINE_POSIX}';`);
const BUNDLE = path.join(tmp, 'bundle.mjs');
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'patch-engine',
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => ({
        contents: patchedEngine,
        loader: 'ts',
        resolveDir: path.dirname(args.path),
      }));
    },
  }],
});
const E = await import(pathToFileURL(BUNDLE).href);

/* what the PAGE can actually draw */
const pageSrc = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'SoccerCareer.tsx'), 'utf8');
const rendered = new Set([...pageSrc.matchAll(/career\.phase === "([a-z_]+)"/g)].map(m => m[1]));
const actionLine = pageSrc.match(/const showActionButton = ([^;]+);/);
const withButton = new Set(actionLine ? [...actionLine[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]) : []);
/* a phase that only draws when another field is set is conditionally rendered */
const conditional = new Set(
  [...pageSrc.matchAll(/career\.phase === "([a-z_]+)" && career\.(\w+)/g)].map(m => m[1]),
);
console.log(`   the page draws ${rendered.size} phases, ${withButton.size} carry the action button, ${conditional.size} draw only under another field`);
if (rendered.size < 10 || withButton.size === 0) {
  console.error('could not read the page phases; refusing to run rather than pass on an empty set');
  process.exit(1);
}

console.log('1) after a conviction, the career is still playable');
{
  const clubs = E.FALLBACK_CLUBS ?? [];
  const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 60, physical: 70, reflexes: 50 };
  if (!E.initCareer || clubs.length === 0) {
    fail('initCareer or FALLBACK_CLUBS is not exported, so the behavioural check could not run');
  } else {
    /* A real career, built the way scripts/simSoccerCareer.mjs builds one, then
       walked into the exact state the bug lives in: turned pro, heat at the
       trial threshold, and no summary pending because the last one was
       dismissed. Nothing here is a stub. */
    let s = E.initCareer('Dead End', 'England', 'ST', '2020s', stats, 70, 2020, clubs, null);
    for (let i = 0; i < 6 && s.phase === 'youth'; i += 1) s = E.advanceYouthYear(s, clubs);
    if (s.phase === 'contract_offer' && (s.pendingOffers ?? []).length > 0) s = E.acceptOffer(s, s.pendingOffers[0], clubs);
    /* A CONVICTION IS NOT JUST "phase === newspaper", and the first draft of
       this section got that wrong and was flaky because of it (4 runs of 5
       disagreed with the 5th). There are TWO ways into the newspaper phase and
       only one of them strands:
         soccerCareerEngine.ts:5043  a NORMAL season that produced news, via
           `s.phase = news.length > 0 ? "newspaper" : "season_summary"`, which
           sets pendingSummary on the line above it and is perfectly fine.
         soccerCareerEngine.ts:4624  the conviction, which sets no summary.
       A grep for a literal `phase = "newspaper"` finds only the second, which
       is how the first draft came to believe there was one entrance. The
       conviction is identified here by its own side effect, prisonSeasons going
       to 1, so the two cannot be confused again. */
    let convicted = null, normalNews = null;
    for (let i = 0; i < 800 && !(convicted && normalNews); i += 1) {
      const primed = { ...s, phase: 'playing', corruptionHeat: 100, dirtyMoney: 0, pendingSummary: null, prisonSeasons: 0, matchFixBanned: 0 };
      const after = E.advanceProSeason(primed, clubs);
      if (after.phase !== 'newspaper') continue;
      if ((after.prisonSeasons ?? 0) === 1) { if (!convicted) convicted = after; }
      else if (!normalNews) normalNews = after;
    }
    if (!convicted) {
      fail('800 seasons at corruption heat 100 never produced a conviction, so this section proved nothing');
    } else {
      if (convicted.pendingSummary) {
        fail('the state identified as a conviction carries a season summary, so this harness is no longer looking at the conviction path and its verdict means nothing');
      }
      const dismissed = E.dismissNewspaper(convicted);
      const p = dismissed.phase;
      const drawsAtAll = rendered.has(p);
      const needsAnotherField = conditional.has(p);
      const hasWayForward = withButton.has(p);
      console.log(`   convicted -> newspaper -> dismissed lands on "${p}" (drawn: ${drawsAtAll}, needs another field: ${needsAnotherField}, has buttons: ${hasWayForward})`);
      if (!drawsAtAll) fail(`after a conviction the career sits in phase "${p}", which SoccerCareer.tsx cannot draw at all`);
      else if (needsAnotherField && !dismissed.pendingSummary) {
        fail(`after a conviction the career sits in "${p}", which only draws when another field is set, and that field is empty. That is the blank screen, and the save reloads straight back into it.`);
      }
      if (!hasWayForward) fail(`phase "${p}" carries no Next Season or Retire button, so the player has no way out except deleting the save`);
      if (CONTROL === 'strand' && failures === 0) {
        console.error('   CONTROL strand changed nothing: the unconditional hop must strand the career');
        process.exit(1);
      }
    }
    /* THE OTHER HALF, so the fix cannot have been a blanket redirect: a normal
       season that produced news must STILL reach its summary screen. */
    if (!normalNews) {
      console.log('   (no ordinary news season came up in 800 tries, so the second half of this section did not run)');
    } else {
      const after = E.dismissNewspaper(normalNews);
      console.log(`   an ordinary news season still lands on "${after.phase}"`);
      if (after.phase !== 'season_summary') {
        fail(`a normal season with news now lands on "${after.phase}" instead of its summary, so the dead-end fix ate a screen the player is supposed to see`);
      }
    }
  }
}

console.log('2) a save that is already stranded is healed on load');
{
  const stranded = { phase: 'season_summary', pendingSummary: null, playerName: 'Stuck', age: 27 };
  const healed = E.repairCareer({ ...stranded });
  const ok = healed.phase !== 'season_summary' || !!healed.pendingSummary;
  console.log(`   stranded save loads as "${healed.phase}"`);
  if (!ok) fail('repairCareer leaves a stranded save in season_summary with nothing to summarise, so everyone whose career died before the fix stays dead');
  /* and it must not touch a HEALTHY season_summary */
  const healthy = E.repairCareer({ phase: 'season_summary', pendingSummary: { season: 1 }, playerName: 'Fine' });
  if (healthy.phase !== 'season_summary') {
    fail('repairCareer moved a career that had a real summary to show, so the repair is eating a screen the player should see');
  }
  if (CONTROL === 'noheal' && ok) {
    console.error('   CONTROL noheal changed nothing: without the repair a stranded save must stay stranded');
    process.exit(1);
  }
}

console.log('3) every phase the engine can assign is a phase the page can draw');
{
  const assigned = new Set([...engineSrc.matchAll(/\bphase\s*=\s*"([a-z_]+)"/g)].map(m => m[1]));
  console.log(`   the engine assigns ${assigned.size} distinct phases`);
  if (assigned.size < 10) fail(`only ${assigned.size} phases were parsed out of the engine, so this section is not checking much`);
  const orphans = [...assigned].filter(p => !rendered.has(p));
  orphans.forEach(p => fail(`the engine can put a career in phase "${p}" and SoccerCareer.tsx has no branch that draws it`));
  console.log(`   ${assigned.size - orphans.length}/${assigned.size} assignable phases are drawable, ${orphans.length} orphaned`);
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* non-fatal */ }

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimCareerNoDeadEnd: green. A convicted career is still a career, and a stranded save comes back.'
    : `\nsimCareerNoDeadEnd: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
