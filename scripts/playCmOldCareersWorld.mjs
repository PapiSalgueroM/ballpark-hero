/* Round 1508: Club Manager, a career from before the 13 October update joins the living world at its next summer, in
   the built page, on a phone.

   The lead's decision 4: "A walk at 390 shows a moved man at his new club in an old career after one summer." Serves a
   built dist (DIST, default dist) with scripts/lib/hostLikeServer.mjs, every other host aborted (Supabase and the ad
   hosts included), and plants a save the real engine builds in node (none committed): the old Arsenal career of
   scripts/data/cmOldCareersWorldFixture.json (written by the engine from before Release AZ), played by this tree to
   the end of its season and rolled into its first summer here, whose summer news holds a deal of X from A to a
   Premier League club B. At 390 by 844:
     (a) Resume Career, the Market tab, a search for X finds him listed at B, and pressing Talk shows "X only joined B
         this season" on the desk;
     (b) the Table tab, B's club page lists X, and A's page does not when A is in the league too.
   Pictures go to $RC_OUT (or .tmp-fx/playCmOldCareersWorld) as old-world-<case>-390.png.

   Control (PLAY_OLD_WORLD_CONTROL):
     never  the save is rolled by an engine with the adoption line out of startNextSeason (adoptLivingWorld): (b) red.
   Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire. */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.env.DIST || 'dist');
const CONTROL = process.env.PLAY_OLD_WORLD_CONTROL || '';
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmOldCareersWorld'), CONTROL || 'head');
const KEY = 'dukb-club-manager-save';
const ADOPT = '  career = adoptLivingWorld(career);\n';
const cannot = why => { console.log(`playCmOldCareersWorld could not run: ${why}`); process.exit(2); };
if (CONTROL && CONTROL !== 'never') cannot(`unknown control ${CONTROL}`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- this tree's engine in node (the adoption line out for the control) ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-old-world-'));
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
async function engine(label) {
  const entry = path.join(work, `${label}.ts`);
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
  let edited = 0;
  const plugin = { name: `old-world-${label}`, setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = fs.readFileSync(args.path, 'utf8').split('\r\n').join('\n');
      if (CONTROL === 'never' && rel === 'src/lib/clubManager.ts') {
        const n = text.split(ADOPT).length - 1;
        if (n !== 1) cannot(`control never: the adoption line is in ${rel} ${n} times, it must be exactly once`);
        text = text.replace(ADOPT, () => ''); edited += 1;
      }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  } };
  const outfile = path.join(work, `${label}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin] });
  if (CONTROL === 'never' && edited !== 1) cannot('control never: the engine was never edited');
  const { cm } = createRequire(import.meta.url)(outfile);
  await cm.ensureAllEraRosters();
  return cm;
}
const H = await engine(CONTROL || 'head');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldCareersWorldFixture.json'), 'utf8'));
const aiLines = s => (s.transferLog ?? []).filter(t => !t.loan && t.from !== s.clubName && t.to !== s.clubName && t.from !== 'a free transfer' && t.to !== 'a free transfer');

/* ---- the career: the old Arsenal save, played to its summer here; a summer deal of X from A to B in the league ---- */
let pick = null;
for (let seed = 1; seed <= 12 && !pick; seed += 1) {
  memory.clear(); memory.set(KEY, fixture.saves.pre);
  let s = H.loadCareer();
  if (!s) cannot('the old save did not open');
  if (H.worldSeedOf(s) !== undefined || s.worldRoster !== undefined) cannot('the old save carries a seed or a ledger');
  for (let i = 0; i < 260; i += 1) {
    const r = withSeed(seed * 1000 + i, () => H.playNextEntry(s, { skipHalftime: true, noCoach: true }));
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  if (s.sacked) continue;
  const s2 = withSeed(seed + 7, () => H.startNextSeason(H.finishSeason(s).state));
  const line = aiLines(s2).filter(l => l.season === s2.season).find(l => s2.leagueClubs.includes(l.to)
    && (CONTROL === 'never' || H.worldRosterFor(s2, l.to).some(p => p.n === l.name)));
  if (!line) continue;
  memory.clear();
  if (!H.saveCareer(s2)) cannot('the engine refused to save the career');
  pick = { seed, X: line.name, A: line.from, B: line.to, aInLeague: s2.leagueClubs.includes(line.from), season: s2.season, save: memory.get(KEY),
    adopted: H.worldSeedOf(s2) === undefined && !!s2.worldRoster };
}
if (!pick) cannot('no seed of 12 rolled the old Arsenal career into a summer that moved a man to a Premier League club');
const { X, A } = pick, BUYER = pick.B;
console.log(`playCmOldCareersWorld: the old Arsenal career (pre), seed ${pick.seed}, season ${pick.season}: the summer's ${X} from ${A} to ${BUYER}${pick.aInLeague ? ' (both in the league)' : ''}; adopted ${pick.adopted}`);

/* ---- the served page ---- */
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => (e ? reject(e) : resolve(p))); });
});
const ORIGIN = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('the host like server did not start')), 15000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', d => { serverLog += d; if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', d => { serverLog += d; });
}).catch(e => cannot(e.message));

const results = [];
const check = (part, name, ok, detail = '') => { results.push({ part, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} (${part}) ${name}${detail ? ` [${detail}]` : ''}`); };
const PHONE = { width: 390, height: 844 };
const browser = await pw.chromium.launch({ headless: true });
async function pageWith(save) {
  const context = await browser.newContext({ viewport: { width: PHONE.width, height: PHONE.height }, isMobile: true, hasTouch: true, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: KEY, value: save }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(20000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `old-world-${name}-390.png`), fullPage: false }).catch(() => {});
async function resume(page) {
  await page.goto(`${ORIGIN}/club-manager`, { waitUntil: 'domcontentloaded' });
  const button = page.getByRole('button', { name: /resume career/i }).first();
  await button.waitFor({ timeout: 25000 }).catch(() => {});
  if (!(await button.count().catch(() => 0))) return false;
  await button.click();
  const tab = page.getByRole('tab', { name: /^Market$/ }).first();
  await tab.waitFor({ timeout: 25000 }).catch(() => {});
  return (await tab.count().catch(() => 0)) > 0;
}
/** The Market tab, a search for the man, and his row at the club, its Talk button marked for the press. */
async function marketRow(page, name, club) {
  await page.getByRole('tab', { name: /^Market$/ }).first().click();
  const box = page.getByPlaceholder('Search player or club…').first();
  await box.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await box.count().catch(() => 0))) return null;
  await box.fill(name);
  await page.waitForTimeout(400);
  return page.evaluate(([x, c]) => {
    for (const b of document.querySelectorAll('button')) {
      const label = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^Talk ·/.test(label)) continue;
      const row = b.parentElement && b.parentElement.parentElement;
      const text = ((row && row.innerText) || '').replace(/\s+/g, ' ');
      if (text.includes(x) && text.includes(`${c} · `)) { b.setAttribute('data-ow-talk', '1'); return { text }; }
    }
    return null;
  }, [name, club]);
}
/** The Table tab and one club's page: the page's text. */
async function clubPage(page, club) {
  await page.getByRole('tab', { name: /^Table$/ }).first().click();
  const row = page.locator(`[data-club="${club}"]`).first();
  await row.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await row.count().catch(() => 0))) return null;
  await row.click();
  await page.getByText(/on the books\)/).first().waitFor({ timeout: 20000 }).catch(() => {});
  return page.evaluate(() => document.body.innerText);
}

/* ---- the cases ---- */
const errors = [];
try {
  {
    const { context, page } = await pageWith(pick.save);
    const resumed = await resume(page);
    check('a', 'the old career, a summer on, resumes to the hub', resumed);
    const row = resumed ? await marketRow(page, X, BUYER) : null;
    await shot(page, 'a-market');
    if (CONTROL !== 'never') check('a', `the market's search for ${X} finds him at ${BUYER}`, !!row, row ? row.text.slice(0, 90) : 'no row');
    if (row) {
      const button = page.locator('[data-ow-talk="1"]').first();
      await button.scrollIntoViewIfNeeded().catch(() => {});
      await button.click();
      await page.getByTestId('cm-desk-note').first().waitFor({ timeout: 4000 }).catch(() => {});
      const note = await page.evaluate(() => (document.querySelector('[data-testid="cm-desk-note"]')?.textContent || '').replace(/\s+/g, ' ').trim());
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, 'a-refused');
      if (CONTROL !== 'never') check('a', `Talk says ${X} only joined ${BUYER} this season`, note.includes(`${X} only joined ${BUYER} this season`), note.slice(0, 120));
    }
    errors.push(...page.errors);
    await context.close();
  }
  {
    const { context, page } = await pageWith(pick.save);
    const text = (await resume(page)) ? await clubPage(page, BUYER) : null;
    await shot(page, 'b-buyer');
    check('b', `${BUYER}'s club page lists ${X}`, !!text && text.includes(X));
    errors.push(...page.errors);
    await context.close();
  }
  if (pick.aInLeague) {
    const { context, page } = await pageWith(pick.save);
    const text = (await resume(page)) ? await clubPage(page, A) : null;
    await shot(page, 'b-seller');
    check('b', `${A}'s club page does not list ${X}`, !!text && !text.includes(X));
    errors.push(...page.errors);
    await context.close();
  }
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
check('errors', 'no page error on any page', errors.length === 0, errors.slice(0, 2).join(' | '));
const red = results.filter(r => !r.ok);
if (CONTROL) {
  const fired = red.some(r => r.part === 'b');
  console.log(fired ? `playCmOldCareersWorld: control ${CONTROL} FIRED: (b) red` : `playCmOldCareersWorld: control ${CONTROL} DID NOT FIRE: (b) stayed green`);
  process.exit(fired ? 1 : 3);
}
console.log(red.length ? `playCmOldCareersWorld: RED, ${red.length} of ${results.length} checks failed` : `playCmOldCareersWorld: green, ${results.length} checks held; pictures in ${OUT}`);
process.exit(red.length ? 1 : 0);
