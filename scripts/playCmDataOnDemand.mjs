/**
 * Round 1042, in the browser: the manager games open without the data they never read, and a
 * past season still opens, with its flags, when it has to fetch its own.
 *
 * scripts/simCmDataOnDemand.mjs proves the split on the source and scripts/sweepWeight.mjs
 * section 4 on the built files. This walks the built page, because two things can only be seen
 * there: that a saved 2010-11 career really waits for the file its nationalities now live in and
 * then draws its squad with the right flags, and that the wait does not move the page.
 *
 *   arm 1  a fresh visit to /club-manager, /manager-hot-seat, /deadline-day and /transfer-path,
 *          on a phone and on a desktop: the page draws, throws nothing, and fetches no file
 *          holding a national team pool or a past season (nationalities or squads).
 *   arm 2  a career in the 2010-11 world, written by the REAL engine in node and seeded into
 *          localStorage. The page must fetch the 2010 nationalities and the 2010 squads and no
 *          other season's file, open the squad, and show a flag on exactly the men the engine
 *          says have a country in that world (the set is computed from the same save, never a
 *          floor that was typed).
 *   arm 3  the same save with one of the 2010 files HELD until the walk lets it go: while it is
 *          held the page shows its loading line, no manager card and no squad row. The page's
 *          scroll position and the top of its first heading are read then and once the career
 *          has arrived. Then the club picker: 2010-11 picked with the file held, the same two
 *          numbers around the line "Loading the 2010-11 squads". CM_PLAY_HOLD=nat (the default)
 *          holds the nationality file, CM_PLAY_HOLD=squads the squads file, which is the one a
 *          build from before this round can hold (its nationalities were in the engine chunk).
 *   arm 4  /soccer-career, fresh: it still fetches the national team pools, and throws nothing.
 *
 * Negative control, CM_PLAY_CONTROL=abort: the 2010 nationality file never arrives. The career
 * must NOT open: the retry notice shows, no manager card, the saved career still in
 * localStorage byte for byte, and arm 2's flags go red. That is the proof this walk depends on
 * the on demand file. Exit 1 when all of that happens, 2 when it does not.
 *
 * EXIT CODES, all four: 0 green, 1 red (or, under the control, FIRED), 2 refused to run (or the
 * control did not fire), 3 THE WALK ITSELF CRASHED (a navigation timed out, the server was not
 * there, the browser died). Until the fix of 2026-10-08 a crash left through node's own exit 1,
 * the code the control uses for FIRED: the review's first abort run timed out in page.goto on a
 * loaded machine, printed no FIRED line and still exited 1, so a gate script reading only the
 * exit code would have counted a crash as a control that fired. A crash now says CRASHED and
 * exits 3. Proved 2026-10-08 by pointing the walk at a port nothing listens on, once plain and
 * once under the control: exit 3 both times, the CRASHED line, no FIRED line. The same day on a
 * build of the merged tree: plain exit 0 (all four arms, both widths, 0 page errors), the control
 * exit 1 with its FIRED line.
 *
 * Run 2026-10-07 on a build of the branch: exit 0 (eight fresh visits with no pool and no past
 * season among 36 to 42 files each; Barcelona 2010-11 with 27 squad rows and a flag on exactly
 * the 26 men who have a country); the control exit 1.
 *
 * WHAT ARM 3 MEASURED, on a build of release-al-int from before this round (6f99ccdf, the squads
 * file held, the only one it can hold) and on the branch (each file held in turn). All three the
 * same to the pixel:
 *   the club picker does not move at all: scroll position and the CLUB MANAGER heading stay
 *     where they are, on a phone (scrollY 101, heading at 12) and a desktop (0 and 125);
 *   a saved career does not move the reader either (scrollY 0 before and after), but the page
 *     under the game is pushed: the boot's "Loading" line is shorter than the manager cards
 *     that replace it, so the guide heading below goes from 377 to 932 on a phone (555 px) and
 *     from 389 to 520 on a desktop (131 px). That is the Round 832 boot screen, it was there
 *     before this round and this round changed no screen, so it is reported to the screens'
 *     owner and not asserted here. What IS asserted: the reader's scroll position, and the
 *     first heading whenever it is the same heading before and after (1 pixel of tolerance).
 *
 * The database host is blocked on every context. Files are found by what they HOLD (probes
 * derived from the source, scripts/lib/dataProbes.mjs), never by their names.
 *
 * Run: npm run build, serve dist with node scripts/lib/hostLikeServer.mjs dist 4173, then
 *      ENGINES=chromium node scripts/playCmDataOnDemand.mjs
 *      (BASE or SWEEP_BASE for another address, CM_PLAY_DIST for another build's folder,
 *       CM_PLAY_ARMS=1,2 for some arms only)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { dataProbes, findProbes } from './lib/dataProbes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const DIST = path.resolve(process.env.CM_PLAY_DIST ?? path.join(ROOT, 'dist'));
const CONTROL = process.env.CM_PLAY_CONTROL ?? '';
const ARMS = new Set((process.env.CM_PLAY_ARMS ?? '1,2,3,4').split(',').map(s => s.trim()));
const HOLD = process.env.CM_PLAY_HOLD ?? 'nat';
const ERA = 'era2010';
const ERA_LABEL = '2010-11';
const CLUB = 'Barcelona';
/* The nation the picker lists that club's league under. */
const NATION = 'Spain';
const SIZES = [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 800 }];

if (CONTROL && CONTROL !== 'abort') { console.error(`CM_PLAY_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
if (HOLD !== 'nat' && HOLD !== 'squads') { console.error(`CM_PLAY_HOLD=${HOLD} is neither nat nor squads`); process.exit(2); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error(`playCmDataOnDemand: REFUSING TO RUN. ${m}`); process.exit(2); };
/* A crash is not a verdict (see EXIT CODES in the header). Everything below runs at the top level
   of this module, so an error nobody caught, a rejected await included, lands in one of these two
   and leaves with its own code instead of node's exit 1. */
const crashed = err => {
  console.error(`playCmDataOnDemand: CRASHED, which is neither green nor red nor a control that fired. ${String(err?.message ?? err).split('\n')[0].slice(0, 240)}`);
  process.exit(3);
};
process.on('uncaughtException', crashed);
process.on('unhandledRejection', crashed);

/* ---------- which built file holds what ---------- */
const ASSETS = path.join(DIST, 'assets');
if (!fs.existsSync(ASSETS)) refuse(`no build at ${ASSETS}: run npm run build first`);
const probes = dataProbes(ROOT);
const built = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const textOf = new Map(built.map(f => [f, fs.readFileSync(path.join(ASSETS, f), 'utf8')]));
const holders = list => built.filter(f => findProbes(textOf.get(f), list) > 0);
const eraIds = Object.keys(probes.eras);
const poolFiles = holders(probes.pools);
const natFiles = Object.fromEntries(eraIds.map(id => [id, holders(probes.eras[id])]));
const squadFiles = Object.fromEntries(eraIds.map(id => [id, holders(probes.eraSquads[id])]));
if (!poolFiles.length) refuse('no built file holds the national team pool probes, so this walk cannot tell what a page fetched');
for (const id of eraIds) {
  if (natFiles[id].length !== 1) refuse(`the ${id} nationality probes are in ${natFiles[id].length} built files, not one`);
  if (squadFiles[id].length !== 1) refuse(`the ${id} squad probes are in ${squadFiles[id].length} built files, not one`);
}
const NAT = natFiles[ERA][0];
const SQUADS = squadFiles[ERA][0];
/* On a build from before Round 1042 every past season's nationalities sit in one file, the
   engine chunk. The walk says so and can then only run arm 3 with the squads file held. */
const natApart = new Set(eraIds.map(id => natFiles[id][0])).size === eraIds.length;
const otherEraFiles = [...new Set(eraIds.filter(id => id !== ERA).flatMap(id => [natFiles[id][0], squadFiles[id][0]]))].filter(f => f !== NAT && f !== SQUADS);
const pastFiles = [...new Set(eraIds.flatMap(id => [natFiles[id][0], squadFiles[id][0]]))];
console.log(`0) the built files: the ${ERA_LABEL} nationalities in ${NAT}, its squads in ${SQUADS}, the pools in ${poolFiles.join(', ')}${natApart ? '' : '; THE PAST NATIONALITIES SHARE ONE FILE (a build from before Round 1042)'}`);
if (!natApart && (ARMS.has('1') || ARMS.has('2') || HOLD === 'nat' || CONTROL)) refuse('this build keeps every past season\'s nationalities in one file, so only CM_PLAY_ARMS=3 with CM_PLAY_HOLD=squads can run on it');

/* ---------- a real 2010-11 career, written by the real engine ---------- */
console.log(`1) a ${ERA_LABEL} career, started and saved by the engine in node`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-cm-data-on-demand-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const entry = path.join(TMP, 'entry.mjs');
const bundle = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(entry, `export * as cm from '${R}/src/lib/clubManager.ts';\nexport * as nat from '${R}/src/data/playerNationalities.ts';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', jsx: 'automatic', alias: { '@': `${R}/src` } });
const { cm, nat } = await import(pathToFileURL(bundle).href);
await cm.ensureEraRosters(ERA);
const career = cm.startCareer(CLUB, ERA);
if (!cm.saveCareer(career)) refuse('the engine could not save the career it started');
const SAVE = Object.fromEntries(store);
const SAVE_KEY = cm.SAVE_KEY;
if (typeof SAVE[SAVE_KEY] !== 'string') refuse(`the engine saved under ${Object.keys(SAVE).join(', ')}, not under ${SAVE_KEY}`);
const nameOf = new Map(career.squad.map(p => [p.id, p.name]));
/* The men who must wear a flag: the squad's players the engine itself gives a country in this
   world. Derived from the save, so a rebake moves the expectation with the data. */
const flagged = new Set(career.squad.filter(p => nat.nationalityOf(ERA, p.name) !== null).map(p => p.name));
if (flagged.size < 11) refuse(`only ${flagged.size} of ${career.squad.length} men in the ${CLUB} squad have a country in ${ERA}, fewer than an eleven: the save cannot prove the flags`);
console.log(`   ${CLUB}, ${career.squad.length} players, ${flagged.size} of them with a country in ${ERA}, save ${(SAVE[SAVE_KEY].length / 1024).toFixed(0)} KB under ${Object.keys(SAVE).length} key(s)`);
fs.rmSync(TMP, { recursive: true, force: true });

/* ---------- the browser ---------- */
/* A failed fetch to the blocked database is this walk's own doing, not the page's. A chunk of the
   page that failed to load is the page's, and it is exactly what this walk exists to see: until
   2026-10-08 the filter read /supabase|Failed to fetch|CORS/ alone, and Chromium words a failed
   import() as "Failed to fetch dynamically imported module", so arms 1, 2 and 4 could not have
   reported one. The two sample lines below are checked before any page opens, so the filter
   cannot drift back to swallowing it. */
const ownDoing = e => /supabase|Failed to fetch|CORS/i.test(e) && !/dynamically imported module|module script/i.test(e);
if (ownDoing('TypeError: Failed to fetch dynamically imported module: http://localhost:4173/assets/x.js')) refuse('the page error filter would swallow a chunk that failed to load');
if (!ownDoing('TypeError: Failed to fetch')) refuse('the page error filter no longer forgives a fetch to the blocked database host');
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });

/** One visit. `hold` names a built file whose request waits until release() is called;
 *  `abort` names one that never arrives. */
async function open({ route, size, save = null, hold = null, abort = null }) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  /* production is not this walk's business */
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const chunks = [];
  const errors = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) chunks.push(u.split('/').pop()); });
  page.on('pageerror', err => errors.push(String(err).slice(0, 160)));
  let release = () => {};
  let seen = false;
  if (hold) {
    const gate = new Promise(res => { release = res; });
    await page.route(u => u.pathname.endsWith('/' + hold), async r => { seen = true; await gate; await r.continue().catch(() => {}); });
  }
  if (abort) await page.route(u => u.pathname.endsWith('/' + abort), r => r.abort());
  if (save) await page.addInitScript(s => { try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* private mode */ } }, save);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const pageErrors = () => errors.filter(e => !ownDoing(e));
  return { ctx, page, chunks, pageErrors, release: () => release(), heldSeen: () => seen };
}
const drawn = page => page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').length > 200, { timeout: 45000 }).then(() => true, () => false);
const button = (page, text) => page.locator('#root button').filter({ hasText: text }).first();
/** Where the page is: its scroll position and the top of its first heading. */
const where = page => page.evaluate(() => {
  const h = document.querySelector('#root h1, #root h2, #root h3');
  return { scrollY: Math.round(window.scrollY), headingTop: h ? Math.round(h.getBoundingClientRect().top) : null, heading: h ? (h.innerText || '').trim().slice(0, 24) : null };
});

/* ---------- arm 1: a fresh visit pays for none of it ---------- */
if (ARMS.has('1') && !CONTROL) {
  console.log('2) arm 1: a fresh visit to the four routes fetches no pool and no past season');
  const banned = new Set([...poolFiles, ...pastFiles]);
  for (const route of ['/club-manager', '/manager-hot-seat', '/deadline-day', '/transfer-path']) {
    for (const size of SIZES) {
      const v = await open({ route, size });
      const ok = await drawn(v.page);
      await v.page.waitForTimeout(1500);
      const got = [...new Set(v.chunks)].filter(c => banned.has(c));
      if (!ok) fail(`${route} on a ${size.name} did not draw (fewer than 200 characters in the page after 45 seconds)`);
      if (got.length) fail(`${route} on a ${size.name} fetched ${got.join(', ')}: a pool or a past season it never reads`);
      if (v.pageErrors().length) fail(`${route} on a ${size.name} threw ${v.pageErrors().length} page error(s), first: ${v.pageErrors()[0]}`);
      console.log(`   ${route.padEnd(18)} ${size.name.padEnd(7)} ${String(new Set(v.chunks).size).padStart(3)} js files, ${got.length} of them a pool or a past season, ${v.pageErrors().length} page errors`);
      await v.ctx.close();
    }
  }
}

/* ---------- arm 2: a past season opens, with its flags ---------- */
let abortFired = null;
if (ARMS.has('2') || CONTROL) {
  console.log(CONTROL ? `3) arm 2 under CONTROL abort: the ${ERA_LABEL} nationality file (${NAT}) never arrives` : `3) arm 2: a saved ${ERA_LABEL} career fetches its own season and shows its flags`);
  for (const size of CONTROL ? [SIZES[0]] : SIZES) {
    const v = await open({ route: '/club-manager', size, save: SAVE, abort: CONTROL ? NAT : null });
    const resume = button(v.page, 'Resume Career');
    const notice = v.page.locator('[data-testid="cm-era-load-failed"]');
    /* either the manager card or the retry notice, whichever the page decides on */
    await Promise.race([resume.waitFor({ timeout: 45000 }), notice.waitFor({ timeout: 45000 })]).catch(() => {});
    const opened = await resume.count() > 0;
    const failed = await notice.count() > 0;
    let rows = [];
    if (opened) {
      await resume.click();
      const squadTab = v.page.locator('#root button').filter({ hasText: /^\s*Squad\s*$/ }).first();
      await squadTab.waitFor({ timeout: 30000 }).catch(() => {});
      if (await squadTab.count()) await squadTab.click();
      await v.page.waitForSelector('[data-cm-squad-row]', { timeout: 30000 }).catch(() => {});
      await v.page.waitForTimeout(800);
      rows = await v.page.$$eval('[data-cm-squad-row]', els => els.map(e => ({ id: e.getAttribute('data-cm-squad-row'), flag: !!e.querySelector('img[src*="flagcdn.com"]') })));
    }
    const fetchedSet = new Set(v.chunks);
    const listed = rows.map(r => ({ name: nameOf.get(r.id) ?? null, flag: r.flag }));
    const missing = listed.filter(r => r.name && flagged.has(r.name) && !r.flag).map(r => r.name);
    const extra = listed.filter(r => r.name && !flagged.has(r.name) && r.flag).map(r => r.name);
    const unknown = listed.filter(r => !r.name).length;
    const shown = listed.filter(r => r.name && flagged.has(r.name) && r.flag).length;
    const flagsOk = rows.length >= 11 && shown >= 11 && !missing.length && !extra.length && !unknown;
    const savedNow = await v.page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
    console.log(`   ${size.name.padEnd(7)} career ${opened ? 'opened' : 'did not open'}${failed ? ', retry notice shown' : ''}; ${rows.length} squad rows, ${shown} flags on the ${flagged.size} men who have a country, ${missing.length} missing, ${extra.length} on men who have none; fetched nationalities ${fetchedSet.has(NAT) ? 'yes' : 'no'}, squads ${fetchedSet.has(SQUADS) ? 'yes' : 'no'}, other seasons ${otherEraFiles.filter(f => fetchedSet.has(f)).length}; ${v.pageErrors().length} page errors`);
    if (CONTROL) {
      /* the control's prediction, all of it */
      abortFired = !opened && failed && !flagsOk && savedNow === SAVE[SAVE_KEY];
      if (opened) console.log('   the career opened without its nationality file');
      if (savedNow !== SAVE[SAVE_KEY]) console.log('   the saved career in localStorage is no longer the one that was seeded');
    } else {
      if (!opened) fail(`${size.name}: the saved ${ERA_LABEL} career did not open${failed ? ' (the retry notice showed instead)' : ''}`);
      if (!fetchedSet.has(NAT)) fail(`${size.name}: the page never fetched ${NAT}, the file the ${ERA_LABEL} nationalities live in`);
      if (!fetchedSet.has(SQUADS)) fail(`${size.name}: the page never fetched ${SQUADS}, the ${ERA_LABEL} squads`);
      const strays = otherEraFiles.filter(f => fetchedSet.has(f));
      if (strays.length) fail(`${size.name}: a ${ERA_LABEL} career fetched another season's file (${strays.join(', ')})`);
      if (rows.length < 11) fail(`${size.name}: the squad screen listed ${rows.length} players`);
      if (unknown) fail(`${size.name}: ${unknown} squad rows are not in the saved squad`);
      if (missing.length) fail(`${size.name}: ${missing.length} men with a country in ${ERA} show no flag (${missing.slice(0, 4).join(', ')})`);
      if (extra.length) fail(`${size.name}: ${extra.length} men with no country in ${ERA} show a flag (${extra.slice(0, 4).join(', ')})`);
      if (shown < 11) fail(`${size.name}: only ${shown} flags on the squad list`);
      if (v.pageErrors().length) fail(`${size.name}: the page threw ${v.pageErrors().length} error(s), first: ${v.pageErrors()[0]}`);
    }
    await v.ctx.close();
  }
}
if (CONTROL) {
  await browser.close();
  console.log(abortFired
    ? 'CONTROL abort FIRED: the career did not open, the retry notice showed, the save is untouched and the flags went red'
    : 'CONTROL abort DID NOT FIRE as predicted');
  process.exit(abortFired ? 1 : 2);
}

/* ---------- arm 3: the wait does not move the page ---------- */
if (ARMS.has('3')) {
  const held = HOLD === 'nat' ? NAT : SQUADS;
  const MEASURE_ONLY = process.env.CM_PLAY_MEASURE_ONLY === '1';
  console.log(`4) arm 3: the ${ERA_LABEL} ${HOLD === 'nat' ? 'nationality' : 'squads'} file (${held}) held back; the page is read while it waits and once it has arrived${MEASURE_ONLY ? ' (measuring only)' : ''}`);
  /* The page has moved when the reader's scroll position changed, or when the SAME first heading
     sits somewhere else (1 pixel of tolerance). When the first heading is a different one (the
     boot screen has no heading of its own, so the first one on the page is the guide's, below
     the game), the two tops are not a pair: then the walk follows that guide heading instead and
     reports how far it was pushed, which is the height the arriving screen has over the loading
     line. That push is not asserted here. It was measured on a build from before this round
     too (see the header of this file) and is the same there. */
  const moved = (a, b) => Math.abs(a.scrollY - b.scrollY) > 1 || (a.heading !== null && a.heading === b.heading && Math.abs(a.headingTop - b.headingTop) > 1);
  const topOf = (page, text) => page.evaluate(t => {
    const h = [...document.querySelectorAll('#root h1, #root h2, #root h3')].find(e => (e.innerText || '').trim().slice(0, 24) === t);
    return h ? Math.round(h.getBoundingClientRect().top) : null;
  }, text);
  const say = w => `scrollY ${w.scrollY}, first heading ${w.headingTop === null ? 'none' : `"${w.heading}" at ${w.headingTop}`}`;
  const waitHeld = async v => { const t0 = Date.now(); while (!v.heldSeen() && Date.now() - t0 < 30000) await v.page.waitForTimeout(100); return v.heldSeen(); };
  for (const size of SIZES) {
    /* a. a saved career: the boot holds on its loading line until the season is here */
    {
      const v = await open({ route: '/club-manager', size, save: SAVE, hold: held });
      const loading = v.page.locator('#root .animate-pulse').filter({ hasText: 'Loading' }).first();
      const shown = await loading.waitFor({ timeout: 45000 }).then(() => true, () => false);
      const asked = await waitHeld(v);
      await v.page.waitForTimeout(500);
      const during = await where(v.page);
      const rowsDuring = await v.page.locator('[data-cm-squad-row]').count();
      const cardDuring = await button(v.page, 'Resume Career').count();
      v.release();
      const arrived = await button(v.page, 'Resume Career').waitFor({ timeout: 45000 }).then(() => true, () => false);
      await v.page.waitForTimeout(500);
      const after = await where(v.page);
      const pushedTo = during.heading !== null && during.heading !== after.heading ? await topOf(v.page, during.heading) : null;
      const push = pushedTo === null ? '' : `; the heading under the game went from ${during.headingTop} to ${pushedTo} (${pushedTo - during.headingTop} px)`;
      console.log(`   ${size.name.padEnd(7)} saved career   waiting: ${say(during)}; arrived: ${say(after)}; ${moved(during, after) ? 'MOVED' : 'the reader was not moved'}${push}`);
      if (!asked) fail(`${size.name}: the page never asked for ${held}, so nothing was held and nothing was measured`);
      if (!shown) fail(`${size.name}: no loading line showed while the ${ERA_LABEL} file was held`);
      if (rowsDuring || cardDuring) fail(`${size.name}: the page showed ${cardDuring ? 'a manager card' : 'squad rows'} while its ${ERA_LABEL} file was still held`);
      if (!arrived) fail(`${size.name}: the career never arrived once the file was let go`);
      if (!MEASURE_ONLY && moved(during, after)) fail(`${size.name}: the page moved when the saved career arrived (${say(during)} then ${say(after)})`);
      if (v.pageErrors().length) fail(`${size.name}: the page threw ${v.pageErrors().length} error(s) around the wait, first: ${v.pageErrors()[0]}`);
      await v.ctx.close();
    }
    /* b. the club picker: a past season picked while its file is still on the way */
    {
      const v = await open({ route: '/club-manager', size, hold: held });
      const tile = button(v.page, ERA_LABEL);
      const hadTile = await tile.waitFor({ timeout: 45000 }).then(() => true, () => false);
      if (hadTile) await tile.click();
      const nation = button(v.page, NATION);
      const hadNation = await nation.waitFor({ timeout: 30000 }).then(() => true, () => false);
      if (hadNation) await nation.click();
      const line = v.page.locator('#root .animate-pulse').filter({ hasText: `Loading the ${ERA_LABEL}` }).first();
      const shown = await line.waitFor({ timeout: 30000 }).then(() => true, () => false);
      const asked = await waitHeld(v);
      await v.page.waitForTimeout(500);
      const during = await where(v.page);
      v.release();
      const gone = await line.waitFor({ state: 'detached', timeout: 45000 }).then(() => true, () => false);
      await v.page.waitForTimeout(500);
      const after = await where(v.page);
      console.log(`   ${size.name.padEnd(7)} club picker    waiting: ${say(during)}; arrived: ${say(after)}; ${moved(during, after) ? 'MOVED' : 'did not move'}`);
      if (!hadTile || !hadNation) fail(`${size.name}: the picker never offered ${hadTile ? NATION : ERA_LABEL}`);
      if (!asked) fail(`${size.name}: picking ${ERA_LABEL} never asked for ${held}`);
      if (!shown) fail(`${size.name}: the picker showed no "Loading the ${ERA_LABEL}" line while the file was held`);
      if (!gone) fail(`${size.name}: the picker's loading line never went once the file was let go`);
      if (!MEASURE_ONLY && moved(during, after)) fail(`${size.name}: the picker moved when the ${ERA_LABEL} squads arrived (${say(during)} then ${say(after)})`);
      if (v.pageErrors().length) fail(`${size.name}: the picker threw ${v.pageErrors().length} error(s) around the wait, first: ${v.pageErrors()[0]}`);
      await v.ctx.close();
    }
  }
}

/* ---------- arm 4: the one page that reads the pools still gets them ---------- */
if (ARMS.has('4')) {
  console.log('5) arm 4: /soccer-career still fetches the national team pools');
  const v = await open({ route: '/soccer-career', size: SIZES[0] });
  const ok = await drawn(v.page);
  await v.page.waitForTimeout(2000);
  const got = [...new Set(v.chunks)].filter(c => poolFiles.includes(c));
  if (!ok) fail('/soccer-career did not draw');
  if (!got.length) fail(`/soccer-career fetched none of ${poolFiles.join(', ')}: it is the page that reads the pools`);
  if (v.pageErrors().length) fail(`/soccer-career threw ${v.pageErrors().length} page error(s), first: ${v.pageErrors()[0]}`);
  console.log(`   ${new Set(v.chunks).size} js files, the pools in ${got.join(', ') || 'none of them'}, ${v.pageErrors().length} page errors`);
  await v.ctx.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playCmDataOnDemand: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playCmDataOnDemand: green. The manager games open without the data they never read, and a past season brings its own.');
