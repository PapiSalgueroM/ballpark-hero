/**
 * Round 1042: Club Manager, Manager Hot Seat, Deadline Day and Transfer Path do not download data
 * they never read, and a past season brings its own data when it is opened.
 *
 * WHAT WAS WRONG. Every visit to /club-manager downloaded, before the club list could draw, the
 * 12,703 real national team rows that only Soccer Career's squad picker reads, the invented name
 * pools that picker uses, the nationality maps of four past seasons nobody had opened, and Squad
 * Deal's loader with Footle's data behind it, carried for two constants and a function. Manager
 * Hot Seat and Deadline Day import the same engine and paid the same; Transfer Path paid for the
 * national team rows to look a confederation up.
 *
 * WHAT ROUND 1042 DID. Three moves, no rule and no number changed:
 *   the squad picker left soccerInternational.ts for soccerInternationalSquads.ts, which is the
 *     only reader of src/data/nationalPools.ts and is imported by Soccer Career only;
 *   the formations, the slot rules and the rating curve left squadDeal.ts for squadShape.ts,
 *     which imports types only;
 *   each past world's nationalities left src/data/playerNationalities.ts for a file of its own
 *     under src/data/nationalities/, fetched in the same promise as that season's squads.
 *
 * WHAT THIS HARNESS HOLDS (the source side, no build; scripts/sweepWeight.mjs section 4 holds the
 * built side). Every assertion is exact: a set, a count that is derived and printed, zero findings.
 * There is no band here, so no headroom to measure and no seed to vary.
 *   1) The closures, over EVERY page file in src/pages. No page is named in a rule: the rules are
 *      about what a page holds, so a page added later is covered without anyone remembering.
 *   2) The registry, on one bundle of the engine: the eras the engine can open, the files the
 *      nationalities load from and the worlds the scripts read are the same list; a past world
 *      answers nobody before its gate and everybody after it.
 *   3) The shape the bakes depend on: each world's file is a header, one export, one block of
 *      entry lines in sorted order. A hand edit or a reformat fails here and not in the middle
 *      of somebody's next era bake.
 *   4) No stragglers: nothing reads NATIONALITY_BY_WORLD from the old place, and nothing but the
 *      squad picker (and the pools' own harness) imports the national team pools.
 *
 * NEGATIVE CONTROLS, CM_DATA_CONTROL=<name>. Each one rewrites a file IN MEMORY (an override
 * handed to the walker, or a patched file inside the bundle); nothing on disk is ever written.
 * Each first asserts that the text it changes is there exactly once and refuses otherwise. The
 * exit code under a control: 1 when the section it predicts went red in the way it predicts,
 * 2 when it did not fire.
 *   pools       soccerInternational.ts gets its pools import back. 1) names every page that holds
 *               the tournaments without the career engine (four today).
 *   eranat      playerNationalities.ts gets a static import of one past world's file. 1) names
 *               every page that holds the nationality map (the three engine pages today).
 *   squad       clubManager.ts reads the squad shape from squadDeal again. 1) names every engine
 *               page, for Squad Deal's loader and for Footle's data.
 *   noregister  the registerNationalityWorld call is cut from ensureEraRosters. 2) reports every
 *               past pair unanswered after the gate.
 *   eager       nationalityOf loses its "not arrived" line. 2) reports the names a past world
 *               answered before its gate, exactly as many as today's maps also hold.
 *   reformat    one entry line of one era file is indented differently. 3) names the file and
 *               the line.
 * All six, run 2026-10-07 on this checkout (which stores src as CRLF): pools exit 1 (four pages:
 * ClubManager, DeadlineDay, ManagerHotSeat, TransferPath), eranat exit 1 (three), squad exit 1
 * (three, each for the loader and for Footle's data), noregister exit 1 (all 6910 past names
 * unanswered), eager exit 1 (1101 answered early, 23 with the wrong country), reformat exit 1
 * (era2010.ts:11). The first run of eranat did NOT fire, and it was right not to be trusted: the
 * walker dropped a module that one file imports both statically and with import(), which is
 * exactly what the control plants. scripts/lib/staticClosure.mjs gained its bothWays repair for
 * it, so that mistake is caught here from now on.
 *
 * Run: node scripts/simCmDataOnDemand.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { staticClosure, staticSpecs, dynamicSpecs, codeOf } from './lib/staticClosure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const abs = rel => path.join(ROOT, rel);
/* Every read of a file folds CRLF to LF before an anchor is looked for: this checkout stores src
   as CRLF and an anchor that spans lines can never match one otherwise. */
const read = rel => fs.readFileSync(abs(rel), 'utf8').replace(/\r\n/g, '\n');

const CONTROL = process.env.CM_DATA_CONTROL ?? '';
const CONTROLS = ['pools', 'eranat', 'squad', 'noregister', 'eager', 'reformat'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CM_DATA_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(2); }

/* Findings are kept by section and by rule, so a control can ask whether ITS rule went red. */
const findings = [];
const fail = (section, rule, msg, extra = {}) => { findings.push({ section, rule, msg, ...extra }); console.error(`  FAIL: ${msg}`); };
const refuse = m => { console.error(`simCmDataOnDemand: REFUSING TO RUN. ${m}`); process.exit(2); };

/** One exact replacement in a file's text, in memory. Refuses unless the text is there once. */
function rewriteOnce(rel, from, to) {
  const text = read(rel);
  const n = text.split(from).length - 1;
  if (n !== 1) refuse(`control ${CONTROL}: ${rel} holds the text it rewrites ${n} times, not once: ${from.slice(0, 70)}`);
  return text.replace(from, () => to);
}

const F = {
  engine: 'src/lib/clubManager.ts',
  eras: 'src/lib/clubManagerEras.ts',
  nat: 'src/data/playerNationalities.ts',
  natDir: 'src/data/nationalities',
  allWorlds: 'src/data/nationalities/allWorlds.ts',
  pools: 'src/data/nationalPools.ts',
  intl: 'src/lib/soccerInternational.ts',
  squads: 'src/lib/soccerInternationalSquads.ts',
  career: 'src/lib/soccerCareerEngine.ts',
  intlNames: 'src/lib/intlNames.ts',
  squadDeal: 'src/lib/squadDeal.ts',
  squadShape: 'src/lib/squadShape.ts',
  footle: 'src/data/footleEnrichment.ts',
};

/* ---------- the controls that rewrite a file for the walker (section 1) ---------- */
const override = {};
if (CONTROL === 'pools') {
  override[abs(F.intl)] = rewriteOnce(F.intl, "import {\n  periodInForce, playedPeriod, wcFieldMixFor, type IntlCompetition,\n} from './intlFormatHistory';",
    "import { NATIONAL_POOLS, NATIONAL_POOL_YEARS } from '@/data/nationalPools';\nimport {\n  periodInForce, playedPeriod, wcFieldMixFor, type IntlCompetition,\n} from './intlFormatHistory';\nvoid NATIONAL_POOLS; void NATIONAL_POOL_YEARS;");
  console.log('CONTROL pools: soccerInternational.ts imports the national team pools again (in memory)');
}
if (CONTROL === 'eranat') {
  override[abs(F.nat)] = rewriteOnce(F.nat, "import { CM_ALEAGUE_NATIONALITIES } from '@/data/clubManagerALeague2026';",
    "import { CM_ALEAGUE_NATIONALITIES } from '@/data/clubManagerALeague2026';\nimport { NATIONALITY_WORLD as EAGER_WORLD } from '@/data/nationalities/era2010';\nvoid EAGER_WORLD;");
  console.log('CONTROL eranat: playerNationalities.ts imports the 2010 world statically (in memory)');
}
if (CONTROL === 'squad') {
  override[abs(F.engine)] = rewriteOnce(F.engine, "import { FORMATIONS as SHARED_FORMATIONS, SLOT_ALLOWED, playerRating } from '@/lib/squadShape';",
    "import { FORMATIONS as SHARED_FORMATIONS, SLOT_ALLOWED, playerRating } from '@/lib/squadDeal';");
  console.log('CONTROL squad: clubManager.ts reads the squad shape from squadDeal again (in memory)');
}

/* ---------- 1. The closures ---------- */
console.log('1) No page downloads data it never reads (the static import closure of every page)');
const pageFiles = fs.readdirSync(abs('src/pages')).filter(f => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f)).sort().map(f => `src/pages/${f}`);
/* Floors, so the rules below cannot pass empty. 150 is a floor (170 pages on the day this was
   written). 3 is NOT a margin: exactly three pages hold the engine today (Club Manager, Manager
   Hot Seat, Deadline Day), so one fewer means the walker lost the engine, not that a game left. */
if (pageFiles.length < 150) refuse(`only ${pageFiles.length} page files found under src/pages, expected at least 150`);
const closures = new Map();
for (const p of pageFiles) closures.set(p, staticClosure(ROOT, p, override));
const holding = rel => pageFiles.filter(p => closures.get(p).has(rel));
/* What the tree holds with NO control applied, to derive what a control must name. */
const cleanClosures = CONTROL ? new Map(pageFiles.map(p => [p, staticClosure(ROOT, p)])) : closures;
const cleanHolding = rel => pageFiles.filter(p => cleanClosures.get(p).has(rel));
const enginePages = cleanHolding(F.engine);
if (enginePages.length < 3) refuse(`only ${enginePages.length} pages hold ${F.engine}, expected exactly the three manager games or more; the walker is not seeing the engine`);

{
  /* a. the pools ride with the career engine and nowhere else */
  for (const p of holding(F.pools)) {
    if (!closures.get(p).has(F.career)) fail(1, 'pools', `${p} downloads the national team pools (${F.pools}) and does not hold Soccer Career's engine, the only game that reads them`, { page: p });
  }
  /* b. no past world, and never allWorlds, on any page */
  for (const p of pageFiles) {
    const got = [...closures.get(p)].filter(f => f.startsWith(F.natDir + '/'));
    if (got.length) fail(1, 'eranat', `${p} statically imports ${got.join(', ')}: a past world's nationalities must arrive with its season, never with the page`, { page: p });
  }
  /* c. the engine pages carry none of what the three moves took off them */
  const BANNED = [[F.squadDeal, "Squad Deal's loader"], [F.footle, "Footle's data"], [F.intlNames, "the squad picker's invented name pools"], [F.squads, "Soccer Career's squad picker"]];
  for (const p of holding(F.engine)) {
    for (const [rel, what] of BANNED) {
      if (closures.get(p).has(rel)) fail(1, 'squad', `${p} holds the Club Manager engine and downloads ${rel} (${what}) with it`, { page: p, file: rel });
    }
  }
  /* d. absence is half the proof: the data is still where it IS read */
  const need = (page, rel, why) => { if (!closures.get(page)?.has(rel)) fail(1, 'presence', `${page} no longer holds ${rel} (${why}), so the rules above may be passing because the walker lost a file`); };
  need('src/pages/SoccerCareer.tsx', F.pools, 'Soccer Career reads the national team pools');
  need('src/pages/SoccerCareer.tsx', F.squads, 'Soccer Career picks squads');
  need('src/pages/ClubManager.tsx', F.nat, "Club Manager reads today's nationalities");
  need('src/pages/ClubManager.tsx', F.squadShape, 'Club Manager reads the squad shape');
  need('src/pages/ClubManager.tsx', F.intl, 'Club Manager plays the international tournaments');
  /* e. the seam itself: the tournament engine imports neither the pools nor what only the picker uses */
  const intlAbs = abs(F.intl);
  const intlSpecs = staticSpecs(intlAbs, override[intlAbs] ?? read(F.intl));
  for (const bad of ['./intlNames', '@/data/nationalPools', './soccerInternationalSquads']) {
    if (intlSpecs.includes(bad)) fail(1, 'seam', `${F.intl} imports ${bad} again: every game that plays a tournament would download it`);
  }
  console.log(`   ${pageFiles.length} pages walked; ${holding(F.engine).length} hold the Club Manager engine, ${holding(F.pools).length} the national team pools, ${holding(F.nat).length} today's nationalities, ${holding(F.squadShape).length} the squad shape, ${holding(F.squadDeal).length} Squad Deal's loader`);
}

/* ---------- 2. The registry ---------- */
console.log('2) A past world answers nobody before its season is asked for, and everybody after');
const TMP = path.join(os.tmpdir(), `sim-cm-data-on-demand-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
let pastPairs = 0;
{
  /* The two controls that rewrite a file INSIDE the bundle. */
  let patched = null;
  if (CONTROL === 'noregister') {
    patched = { file: abs(F.eras), contents: rewriteOnce(F.eras, '    registerNationalityWorld(eraId, nationalities);\n', '    void nationalities;\n') };
    console.log('   CONTROL noregister: ensureEraRosters no longer registers the nationalities it fetched (in the bundle)');
  }
  if (CONTROL === 'eager') {
    patched = { file: abs(F.nat), contents: rewriteOnce(F.nat, '  if (Object.prototype.hasOwnProperty.call(NATIONALITY_WORLD_LOADERS, key)) return null;\n', '') };
    console.log('   CONTROL eager: nationalityOf no longer answers null for a past world that has not arrived (in the bundle)');
  }
  const entry = path.join(TMP, 'entry.mjs');
  const bundle = path.join(TMP, 'bundle.mjs');
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    `export * as cm from '${R}/${F.engine}';`,
    `export * as eras from '${R}/${F.eras}';`,
    `export * as nat from '${R}/${F.nat}';`,
    `export * as all from '${R}/${F.allWorlds}';`,
    `export { CM_ALEAGUE_NATIONALITIES } from '${R}/src/data/clubManagerALeague2026.ts';`,
    '',
  ].join('\n'));
  const norm = p => path.normalize(p);
  const swap = {
    name: 'control-swap',
    setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        if (!patched || norm(args.path) !== norm(patched.file)) return undefined;
        patched.loaded = true;
        return { contents: patched.contents, loader: 'ts' };
      });
    },
  };
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle,
    logLevel: 'error', jsx: 'automatic', alias: { '@': `${R}/src` }, plugins: [swap],
  });
  if (patched && !patched.loaded) refuse(`control ${CONTROL}: the rewritten file never reached the bundle`);
  const { cm, eras, nat, all, CM_ALEAGUE_NATIONALITIES } = await import(pathToFileURL(bundle).href);
  void cm;
  const worlds = all.NATIONALITY_BY_WORLD;
  const past = Object.keys(worlds).filter(w => w !== 'now');
  const sortedSame = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const eraIds = eras.historicEraIds();
  const loaderIds = Object.keys(nat.NATIONALITY_WORLD_LOADERS);
  if (!sortedSame(eraIds, loaderIds)) fail(2, 'lists', `the eras the engine can open (${[...eraIds].sort().join(', ')}) are not the worlds with a nationality file to load (${[...loaderIds].sort().join(', ')}): the first one missing a row cannot open`);
  if (!sortedSame(loaderIds, past)) fail(2, 'lists', `the worlds with a nationality file to load (${[...loaderIds].sort().join(', ')}) are not the past worlds allWorlds hands the scripts (${[...past].sort().join(', ')})`);
  if (past.length < 4) fail(2, 'lists', `only ${past.length} past worlds, there were four when this was written`);

  /* BEFORE any gate. Every pair of every past world must answer null; the count is derived. */
  pastPairs = past.reduce((n, w) => n + Object.keys(worlds[w]).length, 0);
  let early = 0, earlyWrong = 0;
  const earlyNames = [];
  for (const w of past) {
    for (const name of Object.keys(worlds[w])) {
      const got = nat.nationalityOf(w, name);
      if (got !== null) { early += 1; if (got !== worlds[w][name]) earlyWrong += 1; if (earlyNames.length < 5) earlyNames.push(`${w} ${name}: ${got}`); }
    }
  }
  if (early) fail(2, 'before', `${early} of ${pastPairs} past names had a country before their season was asked for, ${earlyWrong} of them a DIFFERENT country from their own world's (${earlyNames.join('; ')}): a past world must answer nobody until it has arrived`, { early, earlyWrong });
  /* What the same question would answer if today's maps were read instead: derived, for the eager control. */
  let sharedWithToday = 0, sharedDifferent = 0;
  for (const w of past) for (const name of Object.keys(worlds[w])) {
    const today = worlds.now[name] ?? CM_ALEAGUE_NATIONALITIES[name] ?? null;
    if (today !== null) { sharedWithToday += 1; if (today !== worlds[w][name]) sharedDifferent += 1; }
  }
  const unknown = nat.nationalityOf('era1990', 'Erling Haaland');
  if (unknown !== nat.nationalityOf(undefined, 'Erling Haaland') || unknown === null) fail(2, 'before', `an id no table knows answered ${unknown}, not what today's world answers`);

  /* AFTER every gate. Every pair of every world answers its own world's value. */
  await eras.ensureAllEraRosters();
  let total = 0, missing = 0, missingPast = 0;
  for (const w of Object.keys(worlds)) {
    for (const name of Object.keys(worlds[w])) {
      total += 1;
      if (nat.nationalityOf(w === 'now' ? undefined : w, name) !== worlds[w][name]) { missing += 1; if (w !== 'now') missingPast += 1; }
    }
  }
  if (missing) fail(2, 'after', `${missing} of ${total} names did not answer their own world's country after every season had loaded (${missingPast} of them in a past world)`, { missing, missingPast });
  console.log(`   ${past.length} past worlds, the same list three ways; before any gate ${pastPairs - early} of ${pastPairs} past names answer nobody; after the gates ${total - missing} of ${total} names answer their own world`);
  console.log(`   (${sharedWithToday} of those past names are also in today's maps, ${sharedDifferent} of them with a different country there: that is what the null protects)`);

  if (CONTROL === 'eager') {
    const ok = early === sharedWithToday && early > 0 && earlyWrong === sharedDifferent;
    console.log(ok
      ? `CONTROL eager FIRED: ${early} past names answered before their gate, exactly the ${sharedWithToday} today's maps also hold, ${earlyWrong} with the wrong country`
      : `CONTROL eager DID NOT FIRE as predicted: ${early} answered early (expected ${sharedWithToday}), ${earlyWrong} wrong (expected ${sharedDifferent})`);
    process.exit(ok ? 1 : 2);
  }
  if (CONTROL === 'noregister') {
    const ok = missingPast === pastPairs && missing === pastPairs && early === 0;
    console.log(ok
      ? `CONTROL noregister FIRED: all ${pastPairs} past names went unanswered after their seasons had loaded`
      : `CONTROL noregister DID NOT FIRE as predicted: ${missingPast} past names unanswered (expected ${pastPairs})`);
    process.exit(ok ? 1 : 2);
  }
}

/* ---------- 3. The shape the bakes depend on ---------- */
console.log("3) Each world's file is a header, one export and one sorted block (what the era bakes parse)");
const eraFiles = fs.readdirSync(abs(F.natDir)).filter(f => /^era\d{4}\.ts$/.test(f)).sort();
if (eraFiles.length < 4) refuse(`only ${eraFiles.length} era files under ${F.natDir}, expected at least four`);
let reformatAt = null;
{
  const unesc = s => s.replace(/\\(.)/g, '$1');
  const ENTRY = /^ {2}'(.*)': '(.*)',$/;
  const shapeOverride = {};
  if (CONTROL === 'reformat') {
    const rel = `${F.natDir}/era2010.ts`;
    const lines = read(rel).split('\n');
    const at = lines.indexOf('era2010: {') + 1;
    if (at < 1 || !ENTRY.test(lines[at])) refuse('control reformat: era2010.ts has no first entry line where this control looks for it');
    if (lines.filter(l => l === lines[at]).length !== 1) refuse('control reformat: the line it rewrites is not there exactly once');
    lines[at] = '  ' + lines[at];
    shapeOverride[rel] = lines.join('\n');
    reformatAt = { file: rel, line: at + 1 };
    console.log(`   CONTROL reformat: line ${at + 1} of ${rel} indented by two more spaces (in memory)`);
  }
  let entries = 0;
  const checkFile = (rel, key, exportLine, isNow) => {
    const text = shapeOverride[rel] ?? read(rel);
    const lines = text.split('\n');
    const bad = (line, msg) => fail(3, 'shape', `${rel}:${line}: ${msg}`, { file: rel, line });
    const ex = lines.map((l, i) => (l === exportLine ? i : -1)).filter(i => i >= 0);
    if (ex.length !== 1) { bad(1, `the line "${exportLine}" is there ${ex.length} times, not once`); return; }
    const head = lines.slice(0, ex[0]).join('\n');
    if (!head.startsWith('/* AUTO-GENERATED by scripts/bakeNationalities.mjs')) bad(1, 'the file no longer opens with its AUTO-GENERATED header');
    /* above the export there is only the header (and, in the modern file, its one import) */
    const headCode = codeOf(abs(rel), head).split('\n').map(l => l.trim()).filter(Boolean);
    const wantHead = isNow ? ['import { CM_ALEAGUE_NATIONALITIES } from "@/data/clubManagerALeague2026";'] : [];
    if (JSON.stringify(headCode) !== JSON.stringify(wantHead)) bad(1, `there is code above the export that the writer does not write (${headCode.slice(0, 2).join(' ')})`);
    let i = ex[0] + 1;
    if (lines[i] !== `${key}: {`) { bad(i + 1, `expected the line "${key}: {" right under the export, found "${lines[i]}"`); return; }
    const names = [];
    for (i += 1; i < lines.length && lines[i] !== '},'; i++) {
      const m = lines[i].match(ENTRY);
      if (!m) { bad(i + 1, `a line the era bakes cannot parse (updateNationalityBlock accepts two spaces, a quoted name, a colon, a quoted country, a comma): "${lines[i].slice(0, 60)}"`); continue; }
      names.push(unesc(m[1]));
    }
    if (lines[i] !== '},') { bad(i + 1, `the ${key} block never closes on a "}," line`); return; }
    if (lines[i + 1] !== '};') bad(i + 2, 'the export does not close right after its one block');
    const sorted = [...names].sort();
    const firstOut = names.findIndex((n, k) => n !== sorted[k]);
    if (firstOut >= 0) bad(ex[0] + 3 + firstOut, `the entries are not in the order Array.prototype.sort gives ("${names[firstOut]}" where "${sorted[firstOut]}" belongs), so the next bake would rewrite the whole block`);
    if (new Set(names).size !== names.length) bad(ex[0] + 2, 'a name is there twice');
    if (!names.length) bad(ex[0] + 2, 'the block is empty');
    if (!isNow && lines.slice(i + 2).join('').trim() !== '') bad(i + 3, 'there is something after the export in a file that holds one world and nothing else');
    entries += names.length;
  };
  checkFile(F.nat, 'now', 'export const NATIONALITY_WORLD_NOW: Record<string, Record<string, string>> = {', true);
  for (const f of eraFiles) checkFile(`${F.natDir}/${f}`, f.slice(0, -3), 'export const NATIONALITY_WORLD: Record<string, Record<string, string>> = {', false);
  /* one import() per past world's file in the modern file, and no other */
  const natAbs = abs(F.nat);
  const dyn = dynamicSpecs(natAbs, read(F.nat)).sort();
  const wantDyn = eraFiles.map(f => `@/data/nationalities/${f.slice(0, -3)}`).sort();
  if (JSON.stringify(dyn) !== JSON.stringify(wantDyn)) fail(3, 'loaders', `${F.nat} loads ${dyn.join(', ') || 'nothing'} on demand, and the files on disk are ${wantDyn.join(', ')}: one import() per past world, written with the files`);
  console.log(`   ${eraFiles.length + 1} files, ${entries} entries, every block sorted and in the one form the era bakes accept; ${dyn.length} on demand loads for ${eraFiles.length} era files`);
  if (CONTROL === 'reformat') {
    const hit = findings.filter(f => f.section === 3 && f.file === reformatAt.file && f.line === reformatAt.line);
    const others = findings.filter(f => !(f.section === 3 && f.file === reformatAt.file));
    const ok = hit.length === 1 && others.length === 0;
    console.log(ok ? `CONTROL reformat FIRED: section 3 named ${reformatAt.file}:${reformatAt.line}` : `CONTROL reformat DID NOT FIRE as predicted (${hit.length} findings on its line, ${others.length} elsewhere)`);
    process.exit(ok ? 1 : 2);
  }
}

/* ---------- 4. No stragglers ---------- */
console.log('4) Nothing reads the worlds from the old place, and only the squad picker imports the pools');
{
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(rel);
    }
    return out;
  };
  const files = [...walk('src'), ...walk('scripts')];
  /* The code of a file, comments gone. A script esbuild cannot parse is read with the comment
     blanker simNationalityFlags uses, and counted, so a weaker read is never a silent one. */
  const blank = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[\s(,{=])\/\/.*$/gm, '$1');
  let fallback = 0;
  const code = rel => {
    const text = read(rel);
    try { return codeOf(abs(rel), text); } catch { fallback += 1; return blank(text); }
  };
  /* An import, an export ... from or an import() whose path, on the same line, ends in the module.
     The path may hold a ${...} with quotes of its own (a harness writing a bundle entry), so the
     rule looks for the statement and then the name on the line, not for one clean string. */
  const imports = (c, mod) => new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s+)['"\`][^\\n]*?${mod}(?:\\.ts)?['"\`]`).test(c);
  const SELF = 'scripts/simCmDataOnDemand.mjs';
  let namers = 0, poolImporters = 0;
  for (const rel of files) {
    if (rel === SELF) continue;
    const c = code(rel);
    if (/\bNATIONALITY_BY_WORLD\b/.test(c) && rel !== F.allWorlds) {
      namers += 1;
      if (!c.includes('nationalities/allWorlds')) fail(4, 'oldplace', `${rel} uses NATIONALITY_BY_WORLD and never names src/data/nationalities/allWorlds.ts: playerNationalities.ts holds one world now, so this file would quietly see one world of five`);
    }
    if (imports(c, 'nationalPools')) {
      poolImporters += 1;
      if (rel !== F.squads && rel !== 'scripts/simNationalPools.mjs') fail(4, 'pools', `${rel} imports the national team pools: only ${F.squads} (and the pools' own harness) may, or whatever imports this file downloads 12,703 rows`);
    }
    if (rel.startsWith('src/') && !/\.test\.tsx?$/.test(rel) && !rel.startsWith('src/test/') && rel !== F.allWorlds && imports(c, 'nationalities/allWorlds')) {
      fail(4, 'allworlds', `${rel} imports allWorlds.ts, which is for scripts and tests: it pulls every past world back onto the page`);
    }
  }
  if (namers < 5) fail(4, 'oldplace', `only ${namers} files use NATIONALITY_BY_WORLD, there were nine readers when this was written: the search is not reading them`);
  if (poolImporters < 2) fail(4, 'pools', `only ${poolImporters} importers of the national team pools found, expected the squad picker and its harness: the search is not reading them`);
  console.log(`   ${files.length} files read (${fallback} with the fallback comment blanker); ${namers} use NATIONALITY_BY_WORLD, all through allWorlds; ${poolImporters} import the national team pools, both allowed`);
}

fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the controls of section 1, and the verdict ---------- */
if (CONTROL === 'pools' || CONTROL === 'eranat' || CONTROL === 'squad') {
  const named = [...new Set(findings.filter(f => f.section === 1 && f.rule === CONTROL).map(f => f.page))].sort();
  /* What the control must name, derived from the tree with no control applied. */
  const expected = (CONTROL === 'pools'
    ? pageFiles.filter(p => cleanClosures.get(p).has(F.intl) && !cleanClosures.get(p).has(F.career))
    : CONTROL === 'eranat' ? cleanHolding(F.nat) : enginePages).sort();
  let ok = expected.length >= 3 && JSON.stringify(named) === JSON.stringify(expected);
  if (CONTROL === 'squad') {
    /* every engine page, for the loader AND for Footle's data behind it */
    for (const p of expected) for (const rel of [F.squadDeal, F.footle]) {
      if (!findings.some(f => f.section === 1 && f.rule === 'squad' && f.page === p && f.file === rel)) ok = false;
    }
  }
  if (CONTROL === 'pools' && !findings.some(f => f.section === 1 && f.rule === 'seam')) ok = false;
  console.log(ok
    ? `CONTROL ${CONTROL} FIRED: section 1 named ${named.length} pages, exactly the ones it must (${named.map(p => path.basename(p, '.tsx')).join(', ')})`
    : `CONTROL ${CONTROL} DID NOT FIRE as predicted: named ${named.join(', ') || 'nothing'}, expected ${expected.join(', ')}`);
  process.exit(ok ? 1 : 2);
}

console.log('');
if (findings.length) {
  console.error(`simCmDataOnDemand: ${findings.length} failure${findings.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCmDataOnDemand: green. No page downloads data it never reads, and a past season brings its own.');
