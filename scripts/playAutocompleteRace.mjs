/**
 * Round 1138 browser harness: the search box never offers the last search's
 * names under new text, on three real pages, in a real browser.
 *
 * THE BUG. src/components/game/PlayerAutocomplete.tsx kept the last search's
 * list painted under the new text until the new search answered (the 200 ms
 * debounce plus the fetch). A tap in that window picked the OLD name, and on
 * most pages that judged a guess. Every search game mounts this one box.
 *
 * WHAT IS WALKED. Three pages that search player_market_values, so one stub
 * serves all three:
 *   /build-your-xi        a scoped lineup builder (a pick is sent to the hook)
 *   /football-connect-4   a two player board (a pick is judged at once)
 *   /missing-xi           a one answer puzzle. Here a pick only SELECTS a name
 *                         and nothing is judged until "Lock in guess", so on
 *                         this page a stale pick is a wrong name selected, not
 *                         a guess spent.
 * /college-grid and /cbb-grid are left out on purpose: their search goes local
 * with Round 1105.
 *
 * ONE TRIAL. Type A's text and wait for A's name. Set the hold (the search
 * stub then sits on every answer). Replace the text with B's. Wait a seeded
 * 0 to 700 ms (mulberry32 on RACE_SEED, default 1138). Then, in ONE evaluate
 * so nothing can change between the look and the tap: read the box and the
 * first option and, if there is one, dispatch a pointerdown on it.
 *   staleVisible  an option naming A while the box holds B's text
 *   stalePicked   the page TOOK that pick: a second evaluate finds the box no
 *                 longer holding B's typed text (a pick writes the picked name
 *                 into the box). A dispatched event the page ignored is not
 *                 counted.
 * 34 trials on each page at each of 390 by 844 (touch) and 1280 by 800: 204
 * taps. After each page's trials one positive leg: type B with the hold off,
 * tap its option with a real tap or click, and require that the pick landed.
 * Six positive legs prove the tap path is alive in the same run that reports
 * zero stale picks.
 *
 * NOTHING REACHES THE DATABASE. Every request that is not to this harness's
 * own local server is aborted, and the few answers the pages need are stubs.
 *
 * MODES
 *   node scripts/playAutocompleteRace.mjs
 *       against dist (or RACE_DIST). Exits 0 only when no stale name was
 *       offered or picked on any page at any width, all positive legs landed
 *       and no page error fired.
 *   RACE_EXPECT=stale RACE_DIST=<a build of main> node scripts/playAutocompleteRace.mjs
 *       the measurement. Exits 0 only when stale picks are above zero on every
 *       page. RACE_WIDTHS=390 walks the phone width only.
 *   AUTOCOMPLETE_RACE_CONTROL=notag node scripts/playAutocompleteRace.mjs
 *       builds the app with the query tag removed from the box into a new
 *       folder under .sim-control/ and walks that build. Exits 0 only when the
 *       race came back on every page and width at or above FLOOR. The side
 *       build takes minutes.
 *
 * MEASURED ON MAIN (6f57ce78, before the fix), stale picks of 34 per page and width:
 *   (written by the build step that measured them, see MEASURED below)
 *
 * Run after npm run build. ENGINES is not read: chromium only.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AUTOCOMPLETE_RACE_CONTROL || '';
const EXPECT = process.env.RACE_EXPECT || '';
if (CONTROL && CONTROL !== 'notag') {
  console.error(`AUTOCOMPLETE_RACE_CONTROL=${CONTROL} is not a control this harness knows (notag)`);
  process.exit(1);
}
if (EXPECT && EXPECT !== 'stale') {
  console.error(`RACE_EXPECT=${EXPECT} is not a mode this harness knows (stale)`);
  process.exit(1);
}
const SEED = Number(process.env.RACE_SEED || 1138);
const TRIALS = Number(process.env.RACE_TRIALS || 34);
const WIDTHS = (process.env.RACE_WIDTHS || '390,1280').split(',').map(Number);
const VIEWPORTS = {
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 } },
};
for (const w of WIDTHS) {
  if (!VIEWPORTS[w]) { console.error(`RACE_WIDTHS: ${w} is not a width this harness walks (390, 1280)`); process.exit(1); }
}

const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const PORT = 4238;
const BASE = `http://127.0.0.1:${PORT}`;

/* Names no real player, club or roster can match. */
const A = { text: 'qzxalpha', name: 'Qzxalpha Fixture' };
const B = { text: 'qzxbravo', name: 'Qzxbravo Fixture' };
const row = (who, value) => ({
  player_name: who.name, name_folded: who.name.toLowerCase(), market_value_usd: value, year: 2026,
  club: 'Fixture Rovers', nationality: 'Fixtureland', position: 'Centre-Back', age: 27,
});
const ROWS = [row(A, 2000000), row(B, 1000000)];

/* MEASURED: the lowest stale pick count of any page at any width over the
   measurement runs on main, and the floor the notag control must reach on
   every page and width (half of it, rounded up). */
const MEASURED_LOWEST = 0;
const FLOOR = Math.ceil(MEASURED_LOWEST / 2);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? '  PASS  ' : '  FAIL  '}${message}`);
  if (!ok) failures += 1;
}

const BOX = 'input[role="combobox"]';

/* How each page gets from a cold load to a search box on screen. */
const PAGES = [
  {
    route: '/build-your-xi',
    async reach(page) {
      await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 30000 });
      await page.getByText('Select a position on the pitch').waitFor({ timeout: 30000 });
      /* The pitch slots are buttons whose text is the position label; a centre
         back fits the fixture row's position. */
      await page.locator('button', { hasText: /^CB$/ }).first().click();
    },
  },
  {
    route: '/football-connect-4',
    async reach(page) {
      await page.getByRole('heading', { level: 1, name: 'SOCCER CONNECT 4' }).waitFor({ timeout: 30000 });
      await page.getByRole('button', { name: /Unlimited/ }).click();
      await page.getByRole('button', { name: /^Empty square,/ }).nth(35).click();
    },
  },
  {
    route: '/missing-xi',
    async reach() { /* the box is on screen once the puzzle draws; its puzzle and its answer check are local */ },
  },
];

/* The target leg: on this page the text stays in the box when another square
   is tapped, so a list that survives leaving the box is offered again for a
   different square. */
const TARGET_ROUTE = '/football-connect-4';
const TARGET_TRIALS = Number(process.env.RACE_TARGET_TRIALS || 10);

/** The search stub, with a hold: while it is set every answer waits for the release. */
function makeStub() {
  const stub = { held: false, waiting: [], searches: 0, validator: 0 };
  stub.hold = () => { stub.held = true; };
  stub.release = () => {
    stub.held = false;
    for (const go of stub.waiting.splice(0)) go();
  };
  stub.search = async route => {
    stub.searches += 1;
    if (stub.held) await new Promise(resolve => stub.waiting.push(resolve));
    /* The box aborts a search it no longer wants, and a fulfilled route for an
       aborted request throws: that is the page's own doing, not a failure. */
    await route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'content-range': '0-1/2' }, body: JSON.stringify(ROWS),
    }).catch(() => {});
  };
  return stub;
}

const json = body => route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});

async function openPage(browser, width, spec, stub, pageErrors) {
  const context = await browser.newContext(VIEWPORTS[width]);
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('lineup-rules-seen', '1');
    } catch { /* ignored */ }
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${spec.route} at ${width}: ${error.message}`));
  /* Playwright checks route handlers in reverse registration order, so the
     offline fence goes first and the stubs below win. Anything that is not
     this harness's own server is refused. */
  await page.route('**/*', route => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, stub.search);
  await page.route(`**${SUPA_HOST}/rest/v1/national_team_squads**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_verified_positions**`, json([]));
  await page.route(`**${SUPA_HOST}/functions/v1/validate-player`, route => { stub.validator += 1; return json({ valid: true })(route); });
  await page.route(`**${SUPA_HOST}/functions/v1/football-connect4-validate`, route => { stub.validator += 1; return json({ valid: true, cached: true })(route); });
  const load = async () => {
    await page.goto(`${BASE}${spec.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(() => page.goto(`${BASE}${spec.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }));
    await spec.reach(page);
    await page.locator(BOX).first().waitFor({ timeout: 30000 });
  };
  await load();
  return { context, page, load };
}

const optionNaming = (page, who) => page.locator('[role="option"]', { hasText: who.name }).first();

/** Looks and taps in one go, so nothing can change between the two. */
function lookAndTap(page) {
  return page.evaluate(sel => {
    const box = document.querySelector(sel);
    const option = document.querySelector('[role="option"]');
    const seen = { value: box ? box.value : null, label: option ? option.textContent : null };
    if (option) option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
    return seen;
  }, BOX);
}

/** True when the page took a pick: the box is gone or no longer holds the typed text. */
async function pickLanded(page, typed) {
  await page.waitForTimeout(120);
  return page.evaluate(({ sel, text }) => {
    const box = document.querySelector(sel);
    return !box || box.value !== text;
  }, { sel: BOX, text: typed });
}

async function raceTrials(session, stub, rng, counts) {
  const { page } = session;
  for (let trial = 0; trial < TRIALS; trial++) {
    const offset = Math.floor(rng() * 701);
    const box = page.locator(BOX).first();
    stub.release();
    await box.fill(A.text);
    await optionNaming(page, A).waitFor({ timeout: 15000 });
    stub.hold();
    await box.fill(B.text);
    await page.waitForTimeout(offset);
    const seen = await lookAndTap(page);
    counts.taps += 1;
    const stale = seen.value === B.text && typeof seen.label === 'string' && seen.label.includes(A.name);
    if (stale) counts.staleVisible += 1;
    const landed = seen.label !== null && (await pickLanded(page, B.text));
    if (stale && landed) counts.stalePicked += 1;
    if (seen.label !== null && !stale) counts.otherOption += 1;
    stub.release();
    if (landed) {
      await session.load();
    } else {
      await box.fill('');
      await page.locator('[role="option"]').first().waitFor({ state: 'detached', timeout: 15000 });
    }
  }
}

/** The tap path is alive: B's own name, a real tap or click, and the pick lands. */
async function positiveLeg(session, stub, width) {
  const { page } = session;
  stub.release();
  const box = page.locator(BOX).first();
  await box.fill(B.text);
  const option = optionNaming(page, B);
  await option.waitFor({ timeout: 15000 });
  if (width === 390) await option.tap(); else await option.click();
  return pickLanded(page, B.text);
}

/** /football-connect-4 only: a list that outlives a change of square. */
async function targetTrials(session, stub, rng, counts, trials) {
  const { page } = session;
  for (let trial = 0; trial < trials; trial++) {
    const offset = Math.floor(rng() * 501);
    const box = page.locator(BOX).first();
    stub.release();
    await box.fill(A.text);
    await optionNaming(page, A).waitFor({ timeout: 15000 });
    stub.hold();
    await page.getByRole('button', { name: /^Empty square,/ }).nth(36 + (trial % 6)).click();
    await page.locator(BOX).first().click();
    await page.waitForTimeout(offset);
    const outlived = await page.evaluate(() => document.querySelectorAll('[role="option"]').length);
    counts.targetLooks += 1;
    if (outlived > 0) counts.targetStale += 1;
    stub.release();
    await session.load();
  }
}

async function walk(distDir) {
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), distDir, String(PORT)], { stdio: 'ignore' });
  let serverUp = false;
  for (let i = 0; i < 50 && !serverUp; i++) {
    serverUp = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
    if (!serverUp) await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!serverUp) {
    server.kill();
    throw new Error(`the server for ${distDir} never came up on ${PORT}`);
  }
  const browser = await chromium.launch();
  const rng = mulberry32(SEED);
  const cells = [];
  const target = { targetLooks: 0, targetStale: 0 };
  const pageErrors = [];
  try {
    for (const width of WIDTHS) {
      for (const spec of PAGES) {
        const stub = makeStub();
        const counts = { route: spec.route, width, taps: 0, staleVisible: 0, stalePicked: 0, otherOption: 0, positive: false, searches: 0 };
        const session = await openPage(browser, width, spec, stub, pageErrors);
        await raceTrials(session, stub, rng, counts);
        counts.positive = await positiveLeg(session, stub, width);
        if (spec.route === TARGET_ROUTE && TARGET_TRIALS > 0) {
          await session.load();
          await targetTrials(session, stub, rng, target, TARGET_TRIALS);
        }
        counts.searches = stub.searches;
        await session.context.close();
        cells.push(counts);
        console.log(`  ${spec.route} at ${width}: ${counts.taps} taps, ${counts.staleVisible} stale names offered, ${counts.stalePicked} stale picks, ${counts.otherOption} other options tapped, current pick ${counts.positive ? 'landed' : 'DID NOT LAND'}, ${counts.searches} search requests`);
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }
  return { cells, target, pageErrors };
}

/** The notag control: the real build with one file swapped for a copy that lost the query tag. */
function buildNotag() {
  const componentPath = path.join(ROOT, 'src', 'components', 'game', 'PlayerAutocomplete.tsx');
  const source = fs.readFileSync(componentPath, 'utf8').replace(/\r\n/g, '\n');
  const anchor = 'const suggestions = heldTag === tag ? heldSuggestions : NO_SUGGESTIONS;';
  if (source.split(anchor).length - 1 !== 1) {
    throw new Error('notag control: the query tag line must occur exactly once in the component, or the control changes nothing');
  }
  const changed = source.replace(anchor, 'const suggestions = heldSuggestions;');
  if (changed === source) throw new Error('notag control: the copy must differ from the component');
  const folder = path.join(ROOT, '.sim-control', `race-notag-${Date.now()}`);
  fs.mkdirSync(folder, { recursive: true });
  const copy = path.join(folder, 'PlayerAutocomplete.tsx');
  fs.writeFileSync(copy, changed);
  const outDir = path.join(folder, 'dist');
  const slash = p => p.split(path.sep).join('/');
  /* The project's own config, called the way a production build calls it, so
     both of our plugins run (the search title parts and the snapshot asset
     tags) and the walked build has the same shape as the real one. Only the
     alias list and the outDir are replaced. */
  const config = [
    `import base from ${JSON.stringify(slash(path.join(ROOT, 'vite.config.ts')))};`,
    'export default env => {',
    "  const cfg = typeof base === 'function' ? base({ ...env, mode: 'production', command: 'build' }) : base;",
    '  return {',
    '    ...cfg,',
    `    root: ${JSON.stringify(slash(ROOT))},`,
    '    resolve: {',
    '      ...cfg.resolve,',
    '      alias: [',
    `        { find: '@/components/game/PlayerAutocomplete', replacement: ${JSON.stringify(slash(copy))} },`,
    `        { find: '@', replacement: ${JSON.stringify(slash(path.join(ROOT, 'src')))} },`,
    '      ],',
    '    },',
    `    build: { ...(cfg.build || {}), outDir: ${JSON.stringify(slash(outDir))}, emptyOutDir: true },`,
    '  };',
    '};',
    '',
  ].join('\n');
  const configPath = path.join(folder, 'race.vite.config.ts');
  fs.writeFileSync(configPath, config);
  console.log(`notag control: building the app with the query tag removed into ${slash(path.relative(ROOT, outDir))} (this takes minutes)`);
  const build = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--config', configPath], { cwd: ROOT, encoding: 'utf8' });
  if (build.status !== 0) {
    throw new Error(`notag control: the side build failed\n${`${build.stdout || ''}\n${build.stderr || ''}`.slice(-3000)}`);
  }
  if (!fs.existsSync(path.join(outDir, 'index.html'))) throw new Error('notag control: the side build wrote no index.html');
  return outDir;
}

const distDir = CONTROL === 'notag' ? buildNotag() : path.resolve(ROOT, process.env.RACE_DIST || 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`playAutocompleteRace: no build at ${distDir}. Run npm run build first, or set RACE_DIST.`);
  process.exit(1);
}
console.log(`playAutocompleteRace: seed ${SEED}, ${TRIALS} trials a page, widths ${WIDTHS.join(' and ')}, build ${path.relative(ROOT, distDir) || distDir}`);
const { cells, target, pageErrors } = await walk(distDir);

const taps = cells.reduce((sum, cell) => sum + cell.taps, 0);
const staleVisible = cells.reduce((sum, cell) => sum + cell.staleVisible, 0);
const stalePicked = cells.reduce((sum, cell) => sum + cell.stalePicked, 0);
const landed = cells.filter(cell => cell.positive).length;
const perPage = PAGES.map(spec => `${spec.route} ${cells.filter(cell => cell.route === spec.route).map(cell => `${cell.stalePicked} at ${cell.width}`).join(', ')}`).join('; ');
const summary = `${taps} taps on ${PAGES.length} pages at ${WIDTHS.join(' and ')}, ${staleVisible} stale names offered, ${stalePicked} stale picks, ${landed} of ${cells.length} current picks landed, target leg ${target.targetStale} of ${target.targetLooks}`;
console.log(`RACE_COUNTS seed=${SEED} ${cells.map(cell => `${cell.route}@${cell.width}=${cell.stalePicked}/${cell.taps}`).join(' ')} target=${target.targetStale}/${target.targetLooks}`);
console.log('');

if (EXPECT === 'stale' || CONTROL === 'notag') {
  /* Both of these REQUIRE the bug: the measurement on a build of main, and
     the control on a build with the tag removed. */
  const floor = CONTROL === 'notag' ? FLOOR : 1;
  if (CONTROL === 'notag' && FLOOR < 1) {
    console.error('playAutocompleteRace notag control: RED. No floor has been measured on main, so the control cannot judge anything.');
    process.exit(1);
  }
  for (const cell of cells) check(cell.stalePicked >= floor, `${cell.route} at ${cell.width}: ${cell.stalePicked} stale picks of ${cell.taps} (needs at least ${floor})`);
  for (const cell of cells) check(cell.positive, `${cell.route} at ${cell.width}: a current pick still lands`);
  const name = CONTROL === 'notag' ? 'playAutocompleteRace notag control' : 'playAutocompleteRace measurement';
  if (failures > 0) {
    console.error(`${name}: RED. The race was not seen everywhere it must be (${perPage}). ${summary}.`);
    process.exit(1);
  }
  console.log(`${name}: green, the race is there. Stale picks: ${perPage}. ${summary}.`);
  process.exit(0);
}

for (const cell of cells) {
  check(cell.taps === TRIALS, `${cell.route} at ${cell.width}: ${cell.taps} of ${TRIALS} trials ran`);
  check(cell.staleVisible === 0, `${cell.route} at ${cell.width}: no name of the last search was offered under the new text (${cell.staleVisible})`);
  check(cell.stalePicked === 0, `${cell.route} at ${cell.width}: no tap picked a name of the last search (${cell.stalePicked})`);
  check(cell.otherOption === 0, `${cell.route} at ${cell.width}: no option of any kind was on screen while the new search was held (${cell.otherOption})`);
  check(cell.positive, `${cell.route} at ${cell.width}: a current pick lands, so the tap path is alive`);
}
check(target.targetStale === 0, `the list never outlived a change of square on ${TARGET_ROUTE} (${target.targetStale} of ${target.targetLooks})`);
check(pageErrors.length === 0, `no page error${pageErrors.length ? `: ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
if (failures > 0) {
  console.error(`playAutocompleteRace: ${failures} failure${failures === 1 ? '' : 's'}. ${summary}.`);
  process.exit(1);
}
console.log(`playAutocompleteRace: ${summary}.`);
