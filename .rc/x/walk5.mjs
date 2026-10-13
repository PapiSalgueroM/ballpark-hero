// Reviewer walk 5 (r1323 run lens). BASE = a served head dist; supabase.co and ad hosts aborted.
// W5  the damaged tile's promise: Clear keeps a copy and "the game offers to put it back": reload, is it offered,
//     and what does a put back show?
// W6  Escape behind the notice while the stale tab is mid Play Live: does the key reach the match?
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4178';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
let reds = 0;
const red = m => { reds += 1; console.log('  RED   ' + m); };
const note = m => console.log('  note  ' + m);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk5-'));
const stub = new Map();
globalThis.localStorage = { getItem: k => (stub.has(k) ? stub.get(k) : null), setItem: (k, v) => { stub.set(k, String(v)); }, removeItem: k => { stub.delete(k); } };
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts').split(path.sep).join('/'))};\n`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], outfile: path.join(TMP, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { cm } = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);
cm.saveCareer(cm.startCareer('Brighton'));
const BRIGHTON = stub.get(KEY);
const browser = await chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(BLOCK, r => r.abort());
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) }).catch(() => {});
async function plant(p, kv) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, kv);
}
async function clearBanner(p) { await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {}); }
async function toHub(p) {
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await p.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  if (await p.locator('[data-testid="cm-slots"]').isVisible().catch(() => false)) await p.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  return p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
}

/* W5 */
console.log('W5: damaged save, Clear, reload: is it offered back?');
const A = await ctx.newPage();
const broken = BRIGHTON.slice(0, 400);
await plant(A, { [KEY]: broken });
await A.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
await A.locator('[data-testid="cm-slots"]').waitFor({ timeout: 20000 }).catch(() => {});
await clearBanner(A);
const offeredBefore = await A.getByRole('button', { name: 'Put that save back' }).count().catch(() => 0);
await A.getByRole('button', { name: /Clear it, new manager/ }).first().click({ timeout: 5000 }).catch(() => {});
await A.getByRole('button', { name: 'Clear it', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
await A.waitForTimeout(1500);
const keys = await A.evaluate(k => Object.keys(localStorage).filter(x => x.startsWith(k)).map(x => [x, (localStorage.getItem(x) || '').length]), KEY);
const offeredSameLoad = await A.getByRole('button', { name: 'Put that save back' }).isVisible().catch(() => false);
await A.reload({ waitUntil: 'domcontentloaded' });
const put = A.getByRole('button', { name: 'Put that save back' }).first();
const offeredAfterReload = await put.waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
await shot(A, 'W5-after-clear-reload');
note(`before Clear the card was offered ${offeredBefore} times; keys after Clear ${JSON.stringify(keys)}; offered on the same screen ${offeredSameLoad}; offered after a reload ${offeredAfterReload}`);
if (!offeredAfterReload) red('W5: the cleared damaged save is not offered back after a reload, though the confirm says the game offers to put it back');
if (offeredAfterReload) {
  await put.click({ timeout: 5000 }).catch(() => {});
  await A.waitForLoadState('domcontentloaded').catch(() => {});
  await A.locator('[data-testid="cm-slots"], [data-cm-way="quick"], button:has-text("2026-27")').first().waitFor({ timeout: 20000 }).catch(() => {});
  await A.waitForTimeout(800);
  const damagedAgain = await A.locator('[data-testid$="-damaged"]').count().catch(() => 0);
  const onDisk = await A.evaluate(k => (localStorage.getItem(k) || '').length, KEY);
  await shot(A, 'W5-after-put-back');
  note(`after the put back: damaged tile shown ${damagedAgain}, save on disk ${onDisk} chars`);
}
await A.close();

/* W6 */
console.log('W6: Escape behind the notice while the stale tab is mid Play Live');
const L = await ctx.newPage();
await plant(L, { [KEY]: BRIGHTON });
await toHub(L);
await L.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 5000 }).catch(() => {});
await L.locator('[data-cm-live-minute]').first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
await L.waitForTimeout(3000);
const stageOf = p => p.evaluate(() => { const s = document.querySelector('[data-cm-live-minute]'); return s ? `${s.getAttribute('data-cm-live-stage')} min ${s.getAttribute('data-cm-live-minute')}` : 'no stage'; });
const B = await ctx.newPage();
await toHub(B);
const up = await L.locator('[data-testid="save-moved-notice"]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
const before = await stageOf(L);
await L.keyboard.press('Escape');
await L.waitForTimeout(1500);
const after = await stageOf(L);
await L.waitForTimeout(2000);
const later = await stageOf(L);
await shot(L, 'W6-after-escape');
note(`notice ${up}; stage before Escape "${before}", right after "${after}", two seconds later "${later}"`);
if (before !== 'no stage' && (after === 'no stage' || after.split(' ')[0] !== before.split(' ')[0])) red(`W6: Escape behind the notice changed the live match: "${before}" to "${after}"`);
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`walk5: ${reds ? `RED, ${reds} findings` : 'green'}`);
process.exit(reds ? 1 : 0);
