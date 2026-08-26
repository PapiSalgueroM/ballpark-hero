/**
 * Round 273: /soccer-career is about one in five pageviews on this whole site.
 * This is the guard that stops it carrying other games' code again.
 *
 * WHAT WAS MEASURED. A phone at slow 4G (1.6 Mbps, 562 ms round trip) with a
 * 4x CPU slowdown, loading the built site exactly as the host serves it, three
 * runs an arm, median, timed to the moment the Begin Career button exists:
 *
 *              downloaded   JS        requests   playable
 *   before       2807 KB    2618 KB      26      17535 ms
 *   after        2207 KB    2018 KB      24      14491 ms
 *
 * One line caused it. src/lib/soccerCareerEngine.ts had a static
 * `import { realJobOffers } from './managerJobMarket'`. managerJobMarket is
 * 3 KB of its own code and imports clubManager, the biggest file in the repo,
 * which imports squadDeal, which imports footleEnrichment, which is Footle's
 * data. So every Soccer Career player downloaded and parsed the entire Club
 * Manager engine and another game's word data before they could name a player,
 * for a job market that does not exist until a career reaches the dugout.
 *
 * The two files also import each other, which is why the bundler had to put
 * them in one 731 KB chunk: it was a cycle. Making this one import dynamic
 * broke the cycle as well.
 *
 * THREE SECTIONS, and section 1 is the one that matters most, because a byte
 * ceiling can be raised by anyone in a hurry while an assertion that names the
 * defect cannot be satisfied except by fixing it.
 *
 * Run: node scripts/simFlagshipWeight.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ── the source side: what does a route pull in before it can render? ──── */
/* `import type` is erased by the compiler and costs nothing at runtime, so it
   must NOT be counted. Getting that wrong reports src/integrations/supabase/
   types.ts, 272 KB, as shipping on every page of the site, which it does not.
   Dynamic imports are excluded for the same reason: that is the whole point. */
const STATIC_IMPORT = /(?:^|\n)\s*import\s+(?!type\s)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"]+)['"]/g;

function resolveSpec(spec, importer) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
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

function staticClosure(entryRel) {
  const entry = path.join(ROOT, entryRel);
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length) {
    const cur = queue.pop();
    let t;
    try { t = readFileSync(cur, 'utf8'); } catch { continue; }
    const dyn = new Set();
    DYNAMIC_IMPORT.lastIndex = 0;
    for (let m; (m = DYNAMIC_IMPORT.exec(t)) !== null;) dyn.add(m[1]);
    STATIC_IMPORT.lastIndex = 0;
    for (let m; (m = STATIC_IMPORT.exec(t)) !== null;) {
      if (dyn.has(m[1])) continue;
      const r = resolveSpec(m[1], cur);
      if (r && !seen.has(r)) { seen.add(r); queue.push(r); }
    }
  }
  return new Set([...seen].map(f => path.relative(ROOT, f).replaceAll('\\', '/')));
}

console.log('1) the flagship carries no other game');
const flagship = staticClosure('src/pages/SoccerCareer.tsx');
/* Each of these is another game's code, and each one was genuinely being
   downloaded by Soccer Career players until Round 273. */
const FOREIGN = {
  'src/lib/clubManager.ts': 'the whole Club Manager engine',
  'src/lib/managerJobMarket.ts': 'the manager job market, which drags Club Manager in behind it',
  'src/lib/squadDeal.ts': "Squad Deal's board",
  'src/data/footleEnrichment.ts': "Footle's player data",
};
let foreignFound = 0;
for (const [mod, what] of Object.entries(FOREIGN)) {
  if (flagship.has(mod)) {
    foreignFound += 1;
    fail(`/soccer-career statically imports ${mod}, which is ${what}, so every player downloads it before the first screen`);
  }
}
const srcBytes = [...flagship].reduce((s, f) => { try { return s + readFileSync(path.join(ROOT, f)).length; } catch { return s; } }, 0);
console.log(`   ${flagship.size} modules, ${(srcBytes / 1024).toFixed(0)} KB of source, ${Object.keys(FOREIGN).length} foreign engines checked, ${foreignFound} present`);

/* ── the gates that keep it that way ───────────────────────────────────── */
console.log('2) the job market is loaded on demand, and something loads it');
const engine = readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf8');
const page = readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8');
if (/^\s*import\s[^\n]*from\s+['"]\.\/managerJobMarket['"]/m.test(engine)) {
  fail('soccerCareerEngine.ts imports managerJobMarket statically again, which is the whole defect');
}
if (!/import\(\s*['"]\.\/managerJobMarket['"]\s*\)/.test(engine)) {
  fail('soccerCareerEngine.ts has no dynamic import of managerJobMarket, so nothing can ever load it');
}
if (!/export function loadManagerMarket/.test(engine)) fail('loadManagerMarket is gone from the engine');
/* The empty offer list is a REAL game state here: it means nobody called. If
   the market has not arrived the engine must say that instead, or a player is
   told his career is over because a file was slow. */
if (!/Still getting the phone lines up/.test(engine)) {
  fail('the engine no longer distinguishes a market that has not loaded from a market with no offers in it');
}
if (!/loadManagerMarket/.test(page)) {
  fail('SoccerCareer.tsx never calls loadManagerMarket, so the market only arrives after the player is already in the dugout');
}
const preloadEffect = /phase === "post_retirement" \|\| phase === "manager_season"/.test(page);
if (!preloadEffect) {
  fail('the preload effect no longer covers both the choice screen and a save reloaded straight into manager_season');
}
console.log('   engine loads it dynamically, the page preloads it on both phases, the not-loaded state is honest');

/* ── the built side: the actual weight, with a ceiling ──────────────────── */
console.log('3) the built weight of /soccer-career');
const ASSETS = path.join(ROOT, 'dist/assets');
if (!existsSync(ASSETS)) {
  console.log('   NO dist BUILD. RUN npm run build FIRST. SECTION 3 NOT CHECKED.');
} else {
  const files = readdirSync(ASSETS).filter(f => f.endsWith('.js'));
  /* Only the STATIC imports of a chunk. Vite writes its lazy preload list into
     a __vite__mapDeps array, and counting that would count the very chunks
     this round made lazy. */
  const CHUNK_IMPORT = /(?:^|[;\s}])import\s*(?:[^'"]*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
  const depsOf = f => {
    const t = readFileSync(path.join(ASSETS, f), 'utf8');
    const out = new Set();
    CHUNK_IMPORT.lastIndex = 0;
    for (let m; (m = CHUNK_IMPORT.exec(t)) !== null;) out.add(m[1]);
    return [...out];
  };
  const entry = files.find(f => /^index-.*\.js$/.test(f));
  const route = files.find(f => /^SoccerCareer-.*\.js$/.test(f));
  if (!entry || !route) {
    fail('cannot find the entry chunk or the SoccerCareer chunk in dist/assets, the build layout changed');
  } else {
    const seen = new Set();
    const queue = [entry, route];
    while (queue.length) {
      const f = queue.pop();
      if (!f || seen.has(f) || !files.includes(f)) continue;
      seen.add(f);
      for (const d of depsOf(f)) queue.push(d);
    }
    /* Absence is only half the proof. A chunk that is missing because the
       feature broke would also be absent, and the flagship would look lighter
       for the worst possible reason. So the Club Manager chunk has to be in
       the flagship's LAZY dependency list: present, wired, and deferred.
       Vite writes that list into a __vite__mapDeps array at the top of the
       chunk, which is a different thing from the static imports counted above. */
    const routeText = readFileSync(path.join(ASSETS, route), 'utf8').slice(0, 4000);
    const mapDeps = routeText.match(/__vite__mapDeps[^\[]*\[([^\]]*)\]/);
    const lazy = mapDeps ? [...mapDeps[1].matchAll(/assets\/([^"']+)/g)].map(m => m[1]) : [];
    if (!lazy.some(f => /^clubManager-/.test(f))) {
      fail('the SoccerCareer chunk does not list a clubManager chunk among its lazy dependencies, so the job market is not deferred, it is gone');
    }
    /* NOT asserted: that a lazy dependency is never also a static one. That
       was written and immediately removed, because it fires on correct output.
       Vite's mapDeps is the full preload set for the dynamic import, so shared
       chunks the page already has, the entry bundle among them, are listed
       again on purpose. A check that goes red on a healthy build is worse than
       no check, because it teaches everyone to scroll past the red. */
    const alsoStatic = lazy.filter(f => seen.has(f)).length;
    console.log(`   ${lazy.length} lazy dependencies including the Club Manager chunk (${alsoStatic} are shared chunks the page already has, which is normal)`);

    let raw = 0, gz = 0;
    for (const f of seen) { const b = readFileSync(path.join(ASSETS, f)); raw += b.length; gz += gzipSync(b).length; }
    const rawK = raw / 1024, gzK = gz / 1024;
    /* THE CEILING, and why it is this number. Measured at 2015 KB raw the day
       this was written. The smallest regression of the class this guard exists
       for is Club Manager coming back, which is 444 KB, so the ceiling has to
       sit well under 2015 + 444. 2250 KB gives 235 KB of room for Soccer
       Career's own growth, which is more than a year of it at the rate this
       game has been adding data, and still fails the moment another engine
       lands. Raise it only with a fresh measurement in this comment. */
    const CEILING_KB = 2250;
    if (rawK > CEILING_KB) {
      fail(`/soccer-career now needs ${rawK.toFixed(0)} KB of JavaScript before it can render, over the ${CEILING_KB} KB ceiling. Check what got statically imported.`);
    }
    console.log(`   ${seen.size} chunks, ${rawK.toFixed(0)} KB raw (ceiling ${CEILING_KB}), ${gzK.toFixed(0)} KB over the wire`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simFlagshipWeight: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simFlagshipWeight: green. The flagship carries its own game and nobody else\'s.');
