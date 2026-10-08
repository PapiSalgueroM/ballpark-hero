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
 * THREE MORE, added 2026-10-08 after the round's review broke this harness three ways it could
 * not see. Each is a check that was missing or loose, with the control that proves it:
 *   nowait      ensureEraRosters hands out the squads without waiting for the nationalities (the
 *               load is started and left to land when it lands). The AFTER check of 2) could never
 *               see that: it reads once every gate has opened, by when a late load has landed too,
 *               and the review's mutation left this harness green. 2) now also reads AT the gate:
 *               each past world's file is held back a moment, and the very next thing after the
 *               gate opens is asking that world for every one of its names. The control predicts
 *               every past name unanswered at the gate AND the AFTER check green.
 *   seamalias   soccerInternational.ts imports the invented name pools under the alias spelling
 *               ('@/lib/intlNames'). Rule 1e compared spelled specifiers and knew './intlNames'
 *               only; it now compares the files the specifiers resolve to. The control predicts
 *               the seam named for src/lib/intlNames.ts, and every engine page under rule 1c.
 *   stragglers  section 4 had no control at all. Three files rewritten in memory, one per rule:
 *               a harness takes the whole of playerNationalities under a name and reads
 *               NATIONALITY_BY_WORLD off it while naming allWorlds elsewhere (the shape
 *               simEra2005 had before this round repaired it; the old rule, "the file names
 *               allWorlds somewhere", passed it); a lib file imports the national team pools;
 *               a lib file imports allWorlds. The control predicts exactly those three findings.
 * All nine controls and the plain run, 2026-10-08 on this checkout: plain exit 0 (at the moment
 * each gate opens 6910 of 6910 past names answer their own world); nowait exit 1 (all 6910
 * unanswered at their gate, 11299 of 11299 answering after, so the AFTER check alone was blind);
 * seamalias exit 1 (the seam named for src/lib/intlNames.ts, the three engine pages under 1c);
 * stragglers exit 1 (exactly the three planted files: simEra2005.mjs read off NAT, a name that
 * holds playerNationalities; confederationGroups.ts; clubManagerInternationals.ts); and the six
 * older ones exit 1 with the same counts as before (noregister now also reports all 6910
 * unanswered at the gate).
 *
 * Run: node scripts/simCmDataOnDemand.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { staticClosure, staticEdges, dynamicSpecs, codeOf } from './lib/staticClosure.mjs';
import { GATHERED_LEAGUES } from './lib/gatheredLeagues.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const abs = rel => path.join(ROOT, rel);
/* Every read of a file folds CRLF to LF before an anchor is looked for: this checkout stores src
   as CRLF and an anchor that spans lines can never match one otherwise. */
const read = rel => fs.readFileSync(abs(rel), 'utf8').replace(/\r\n/g, '\n');

const CONTROL = process.env.CM_DATA_CONTROL ?? '';
const CONTROLS = ['pools', 'eranat', 'squad', 'noregister', 'eager', 'reformat', 'nowait', 'seamalias', 'stragglers'];
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
if (CONTROL === 'seamalias') {
  /* The same place the pools control writes to, and the spelling rule 1e did not know. */
  override[abs(F.intl)] = rewriteOnce(F.intl, "import {\n  periodInForce, playedPeriod, wcFieldMixFor, type IntlCompetition,\n} from './intlFormatHistory';",
    "import { intlName } from '@/lib/intlNames';\nimport {\n  periodInForce, playedPeriod, wcFieldMixFor, type IntlCompetition,\n} from './intlFormatHistory';\nvoid intlName;");
  console.log("CONTROL seamalias: soccerInternational.ts imports the invented name pools as '@/lib/intlNames' (in memory)");
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
  /* Compared as the FILES the specifiers resolve to, never as they are spelled: './intlNames' and
     '@/lib/intlNames' are one file, and until 2026-10-08 this rule knew only the first spelling
     (control seamalias). The pages rules above would still catch the pools and the engine pages,
     but the invented name pools coming back to Transfer Path is caught here and nowhere else. */
  const intlAbs = abs(F.intl);
  const intlEdges = new Set(staticEdges(ROOT, intlAbs, override).map(f => path.relative(ROOT, f).replaceAll('\\', '/')));
  if (!intlEdges.has('src/lib/intlFormatHistory.ts')) fail(1, 'presence', `the static imports of ${F.intl} no longer resolve to src/lib/intlFormatHistory.ts, so the seam rule is not reading that file's imports`);
  for (const [rel, what] of [[F.intlNames, "the squad picker's invented name pools"], [F.pools, 'the national team pools'], [F.squads, "Soccer Career's squad picker"]]) {
    if (intlEdges.has(rel)) fail(1, 'seam', `${F.intl} imports ${rel} again (${what}): every game that plays a tournament would download it`, { file: rel });
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
  if (CONTROL === 'nowait') {
    /* The review's mutation, word for word: the squads are handed out as soon as they are here
       and the nationalities are left to land whenever they do. Two edits, each anchor once. */
    const gateLine = '  const p = Promise.all([ERA_BAKES[eraId](), loadNationalityWorld(eraId)]).then(([bake, nationalities]) => {\n';
    const registerLine = '    registerNationalityWorld(eraId, nationalities);\n';
    rewriteOnce(F.eras, registerLine, '');
    const first = rewriteOnce(F.eras, gateLine, '  const p = ERA_BAKES[eraId]().then(bake => {\n    loadNationalityWorld(eraId).then(nationalities => registerNationalityWorld(eraId, nationalities));\n');
    patched = { file: abs(F.eras), contents: first.replace(registerLine, () => '') };
    if (patched.contents.includes(registerLine) || patched.contents.includes('Promise.all([ERA_BAKES[eraId]()')) refuse('control nowait: the gate was not rewritten');
    console.log('   CONTROL nowait: ensureEraRosters hands out the squads without waiting for the nationalities (in the bundle)');
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

  /* AT the gate (added 2026-10-08, control nowait). The AFTER check below reads once every season
     has loaded, and in one bundle a nationality load that nobody waited for has landed by then
     too, so it cannot tell a gate that waits from one that does not. Here each past world's file
     is held back for a moment through the table the loader reads (NATIONALITY_WORLD_LOADERS),
     the season is asked for, and the very next thing after the gate opens, with no await in
     between, is asking that world for every one of its names. A gate that waits answers all of
     them however long the file took; a gate that does not answers none. HOLD_MS is not a band
     and nothing is asserted on it: the squads arrive in microtasks, so any timer at all is later.
     The call count keeps the check honest: if the gate stopped fetching through the table, the
     hold would hold nothing and this would pass without having looked. */
  const HOLD_MS = 100;
  let gateMissing = 0;
  const gateNames = [];
  for (const w of past) {
    const real = nat.NATIONALITY_WORLD_LOADERS[w];
    let calls = 0;
    nat.NATIONALITY_WORLD_LOADERS[w] = () => { calls += 1; return new Promise(res => setTimeout(res, HOLD_MS)).then(() => real()); };
    await eras.ensureEraRosters(w);
    for (const name of Object.keys(worlds[w])) {
      if (nat.nationalityOf(w, name) !== worlds[w][name]) { gateMissing += 1; if (gateNames.length < 3) gateNames.push(`${w} ${name}`); }
    }
    nat.NATIONALITY_WORLD_LOADERS[w] = real;
    if (calls !== 1) fail(2, 'gate', `opening ${w} asked the table of nationality files ${calls} times, not once: the gate no longer fetches through NATIONALITY_WORLD_LOADERS, so holding the file back held nothing and the check above saw nothing`);
  }
  if (gateMissing) fail(2, 'gate', `${gateMissing} of ${pastPairs} past names had no country, or the wrong one, at the moment their season's gate opened (${gateNames.join('; ')}): the gate hands out the squads without waiting for the nationalities, so the first screen draws a squad with no flags and nationBars caches an empty world`, { gateMissing });
  /* let a load nobody waited for land, so the AFTER check reads a settled registry either way */
  await new Promise(res => setTimeout(res, HOLD_MS * 3));

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
  console.log(`   ${past.length} past worlds, the same list three ways; before any gate ${pastPairs - early} of ${pastPairs} past names answer nobody; at the moment each gate opens ${pastPairs - gateMissing} of ${pastPairs} answer their own world; after the gates ${total - missing} of ${total} names answer their own world`);
  console.log(`   (${sharedWithToday} of those past names are also in today's maps, ${sharedDifferent} of them with a different country there: that is what the null protects)`);

  if (CONTROL === 'eager') {
    const ok = early === sharedWithToday && early > 0 && earlyWrong === sharedDifferent;
    console.log(ok
      ? `CONTROL eager FIRED: ${early} past names answered before their gate, exactly the ${sharedWithToday} today's maps also hold, ${earlyWrong} with the wrong country`
      : `CONTROL eager DID NOT FIRE as predicted: ${early} answered early (expected ${sharedWithToday}), ${earlyWrong} wrong (expected ${sharedDifferent})`);
    process.exit(ok ? 1 : 2);
  }
  if (CONTROL === 'noregister') {
    const ok = missingPast === pastPairs && missing === pastPairs && gateMissing === pastPairs && early === 0;
    console.log(ok
      ? `CONTROL noregister FIRED: all ${pastPairs} past names went unanswered at their gate and after their seasons had loaded`
      : `CONTROL noregister DID NOT FIRE as predicted: ${missingPast} past names unanswered after the gates, ${gateMissing} at them (expected ${pastPairs} both times)`);
    process.exit(ok ? 1 : 2);
  }
  if (CONTROL === 'nowait') {
    /* Every past name unanswered AT its gate, and the AFTER check green: the second half is the
       review's finding itself, that the old check alone could not see this. */
    const others = findings.filter(f => !(f.section === 2 && f.rule === 'gate'));
    const ok = gateMissing === pastPairs && pastPairs > 0 && missing === 0 && early === 0 && others.length === 0;
    console.log(ok
      ? `CONTROL nowait FIRED: all ${pastPairs} past names were unanswered at the moment their gate opened, and the AFTER check alone saw nothing (${total - missing} of ${total} answered once the late loads had landed)`
      : `CONTROL nowait DID NOT FIRE as predicted: ${gateMissing} past names unanswered at their gate (expected ${pastPairs}), ${missing} after (expected 0), ${early} early (expected 0), ${others.length} findings outside the gate rule (expected 0)`);
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
    /* above the export there is only the header and, in the modern file, the imports the writer writes:
       the A-League's nationality map and, since Round 1052, one a gathered league in the order of
       scripts/lib/gatheredLeagues.mjs (the template in scripts/bakeNationalities.mjs carries the same lines) */
    const headCode = codeOf(abs(rel), head).split('\n').map(l => l.trim()).filter(Boolean);
    const wantHead = isNow ? ['import { CM_ALEAGUE_NATIONALITIES } from "@/data/clubManagerALeague2026";', ...GATHERED_LEAGUES.map(l => `import { CM_${l.prefix}_NATIONALITIES } from "@/data/${path.basename(l.out, '.ts')}";`)] : [];
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
let strayExpected = null;
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
  /* Control stragglers: three files read from memory in place of the disk, one per rule below. */
  const planted = {};
  const code = rel => {
    const text = planted[rel]?.text ?? read(rel);
    try { return codeOf(abs(rel), text); } catch { fallback += 1; return blank(text); }
  };
  /* An import, an export ... from or an import() whose path, on the same line, ends in the module.
     The path may hold a ${...} with quotes of its own (a harness writing a bundle entry), so the
     rule looks for the statement and then the name on the line, not for one clean string. */
  const imports = (c, mod) => new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s+)['"\`][^\\n]*?${mod}(?:\\.ts)?['"\`]`).test(c);
  const SELF = 'scripts/simCmDataOnDemand.mjs';
  /* Who takes NATIONALITY_BY_WORLD from the OLD module (tightened 2026-10-08, control stragglers).
     The rule used to be "a file that uses the name also names allWorlds somewhere", and a file
     can do that and still read the worlds off playerNationalities, where the export is gone and
     the read is undefined: scripts/simEra2005.mjs did exactly that until this round repaired it
     by hand. So the rule now also finds the three ways a file can take the name from there:
       1. it names it in an import or an export ... from playerNationalities;
       2. it destructures it from an import() of playerNationalities;
       3. it holds the whole of playerNationalities under a name (import * as, export * as, or
          x = await import(...)), or under a renamed copy of that name (a destructure such as
          { nat: NAT }), and reads the worlds off it with a dot, a ?. or a bracket.
     The path may hold a ${...} with quotes of its own, so it is matched up to the module's name
     within one statement (no newline, no semicolon). */
  const ID = '[A-Za-z_$][\\w$]*';
  const Q = '[\'"`]';
  const OLD = `${Q}[^\\n;]*?playerNationalities`;
  const esc = s => s.replace(/\$/g, '\\$');
  const takesFromOldPlace = c => {
    const why = [];
    if (new RegExp(`\\b(?:import|export)\\s*\\{[^}]*\\bNATIONALITY_BY_WORLD\\b[^}]*\\}\\s*from\\s*${OLD}`).test(c)) why.push('names it in an import or an export from playerNationalities');
    if (new RegExp(`\\{[^}]*\\bNATIONALITY_BY_WORLD\\b[^}]*\\}\\s*=\\s*(?:await\\s+)?import\\s*\\(\\s*${OLD}`).test(c)) why.push('destructures it from an import() of playerNationalities');
    const holders = new Set();
    for (const re of [new RegExp(`\\*\\s*as\\s+(${ID})\\s+from\\s*${OLD}`, 'g'), new RegExp(`\\b(${ID})\\s*=\\s*(?:await\\s+)?import\\s*\\(\\s*${OLD}`, 'g')]) {
      for (const m of c.matchAll(re)) holders.add(m[1]);
    }
    for (let grew = true; grew;) {
      grew = false;
      for (const h of [...holders]) for (const m of c.matchAll(new RegExp(`\\b${esc(h)}\\s*:\\s*(${ID})`, 'g'))) {
        if (!holders.has(m[1])) { holders.add(m[1]); grew = true; }
      }
    }
    for (const h of holders) {
      const off = new RegExp(`\\b${esc(h)}\\s*(?:\\?\\.|\\.)\\s*NATIONALITY_BY_WORLD\\b`).test(c)
        || new RegExp(`\\b${esc(h)}\\s*(?:\\?\\.)?\\[\\s*${Q}NATIONALITY_BY_WORLD${Q}\\s*\\]`).test(c)
        || new RegExp(`\\{[^}]*\\bNATIONALITY_BY_WORLD\\b[^}]*\\}\\s*=\\s*${esc(h)}\\b`).test(c);
      if (off) why.push(`reads it off ${h}, a name that holds playerNationalities`);
    }
    return why;
  };
  if (CONTROL === 'stragglers') {
    /* a. the shape simEra2005 had: the whole old module under `nat`, renamed NAT by a destructure,
          NAT.NATIONALITY_BY_WORLD read further down, and allWorlds still named in the file. */
    const a = 'scripts/simEra2005.mjs';
    const lines = read(a).split('\n');
    const tail = "/src/data/nationalities/allWorlds.ts');";
    const at = lines.map((l, i) => (l.startsWith('const nat = await import(') && l.endsWith(tail) ? i : -1)).filter(i => i >= 0);
    if (at.length !== 1) refuse(`control stragglers: ${a} holds the line that takes allWorlds under the name nat ${at.length} times, not once`);
    if (!/\bnat\s*:\s*NAT\b/.test(lines.join('\n')) || !/\bNAT\.NATIONALITY_BY_WORLD\b/.test(lines.join('\n'))) refuse(`control stragglers: ${a} no longer renames nat to NAT and reads NAT.NATIONALITY_BY_WORLD, so the plant would prove nothing`);
    const keep = lines[at[0]];
    lines[at[0]] = `${keep.slice(0, -tail.length)}/src/data/playerNationalities.ts');\n${keep.replace('const nat =', 'const worldsToo =')} void worldsToo;`;
    planted[a] = { rule: 'oldplace', text: lines.join('\n') };
    /* b. a lib file imports the national team pools; c. a lib file imports allWorlds. */
    const b = 'src/lib/confederationGroups.ts';
    const cFile = 'src/lib/clubManagerInternationals.ts';
    planted[b] = { rule: 'pools', text: `import { NATIONAL_POOLS } from '@/data/nationalPools';\nvoid NATIONAL_POOLS;\n${read(b)}` };
    planted[cFile] = { rule: 'allworlds', text: `import { NATIONALITY_BY_WORLD } from '@/data/nationalities/allWorlds';\nvoid NATIONALITY_BY_WORLD;\n${read(cFile)}` };
    for (const rel of Object.keys(planted)) if (!files.includes(rel)) refuse(`control stragglers: ${rel} is not among the files section 4 reads`);
    /* each plant must be something the file does not already do, and the first one must be a file
       the OLD rule would have passed, or this control proves nothing about the tightening */
    if (imports(codeOf(abs(b), read(b)), 'nationalPools')) refuse(`control stragglers: ${b} already imports the pools`);
    if (imports(codeOf(abs(cFile), read(cFile)), 'nationalities/allWorlds')) refuse(`control stragglers: ${cFile} already imports allWorlds`);
    if (!code(a).includes('nationalities/allWorlds')) refuse(`control stragglers: the rewritten ${a} no longer names allWorlds, so the old rule would have caught it too`);
    console.log(`   CONTROL stragglers: ${a} reads the worlds off playerNationalities while still naming allWorlds, ${b} imports the pools, ${cFile} imports allWorlds (all in memory)`);
    strayExpected = Object.entries(planted).map(([rel, p]) => `${p.rule} ${rel}`).sort();
  }
  let namers = 0, poolImporters = 0;
  for (const rel of files) {
    if (rel === SELF) continue;
    const c = code(rel);
    if (/\bNATIONALITY_BY_WORLD\b/.test(c) && rel !== F.allWorlds) {
      namers += 1;
      if (!c.includes('nationalities/allWorlds')) fail(4, 'oldplace', `${rel} uses NATIONALITY_BY_WORLD and never names src/data/nationalities/allWorlds.ts: playerNationalities.ts holds one world now, so this file would quietly see one world of five`, { file: rel });
      for (const why of takesFromOldPlace(c)) fail(4, 'oldplace', `${rel} ${why}: that module holds today's world only and exports no NATIONALITY_BY_WORLD, so the read is undefined. Take it from src/data/nationalities/allWorlds.ts`, { file: rel });
    }
    if (imports(c, 'nationalPools')) {
      poolImporters += 1;
      if (rel !== F.squads && rel !== 'scripts/simNationalPools.mjs') fail(4, 'pools', `${rel} imports the national team pools: only ${F.squads} (and the pools' own harness) may, or whatever imports this file downloads 12,703 rows`, { file: rel });
    }
    if (rel.startsWith('src/') && !/\.test\.tsx?$/.test(rel) && !rel.startsWith('src/test/') && rel !== F.allWorlds && imports(c, 'nationalities/allWorlds')) {
      fail(4, 'allworlds', `${rel} imports allWorlds.ts, which is for scripts and tests: it pulls every past world back onto the page`, { file: rel });
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
if (CONTROL === 'seamalias') {
  /* The seam, named for the FILE the alias resolves to, and rule 1c for every engine page (they
     hold the tournaments, so the name pools ride along). Nothing else may go red. */
  const isSeam = f => f.section === 1 && f.rule === 'seam';
  const isRide = f => f.section === 1 && f.rule === 'squad' && f.file === F.intlNames;
  const seam = findings.filter(isSeam);
  const ride = findings.filter(isRide).map(f => f.page).sort();
  const others = findings.filter(f => !isSeam(f) && !isRide(f));
  const ok = seam.length === 1 && seam[0].file === F.intlNames && enginePages.length >= 3
    && JSON.stringify(ride) === JSON.stringify([...enginePages].sort()) && others.length === 0;
  console.log(ok
    ? `CONTROL seamalias FIRED: rule 1e named ${F.intlNames} through its alias, and rule 1c named the ${ride.length} engine pages that would carry it`
    : `CONTROL seamalias DID NOT FIRE as predicted: ${seam.length} seam findings (${seam.map(f => f.file).join(', ') || 'none'}), ${ride.length} engine pages named (expected ${enginePages.length}), ${others.length} other findings (expected 0)`);
  process.exit(ok ? 1 : 2);
}
if (CONTROL === 'stragglers') {
  const got = findings.filter(f => f.section === 4).map(f => `${f.rule} ${f.file}`).sort();
  const others = findings.filter(f => f.section !== 4);
  const ok = strayExpected !== null && strayExpected.length === 3 && JSON.stringify(got) === JSON.stringify(strayExpected) && others.length === 0;
  console.log(ok
    ? `CONTROL stragglers FIRED: section 4 named exactly the three planted files, one per rule (${got.join('; ')})`
    : `CONTROL stragglers DID NOT FIRE as predicted: section 4 found ${got.join('; ') || 'nothing'}, expected ${(strayExpected ?? []).join('; ')}; ${others.length} findings outside section 4 (expected 0)`);
  process.exit(ok ? 1 : 2);
}

console.log('');
if (findings.length) {
  console.error(`simCmDataOnDemand: ${findings.length} failure${findings.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCmDataOnDemand: green. No page downloads data it never reads, and a past season brings its own.');
