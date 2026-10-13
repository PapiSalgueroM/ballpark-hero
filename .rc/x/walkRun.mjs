// Reviewer walk (r1323 run lens). Runs on a served dist (BASE), Chromium, supabase.co and ad hosts aborted.
// W1  MAJOR 1 repro: tab A reached /club-manager by an in-app link, is mid Play Live, tab B opens the career and
//     plays on, A shows the notice, A presses the browser's Back (an SPA pop, same document). Is the disk still B's?
// W2  control: the same with A on the hub (no live match) when it presses Back.
// W3  pictures at 390x844 and 1280x900, reduced motion on and off: the notice over the hub, Escape behind it,
//     Reload and where it lands, the damaged tile and its confirm, the help block, the What's New entry.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const FENCE = 'dukb-fence:' + KEY;
const results = {};
let reds = 0;
const red = m => { reds += 1; console.log('  RED   ' + m); };
const ok = m => console.log('  ok    ' + m);
const note = m => console.log('  note  ' + m);

/* fixture: a Brighton career made by the real engine (no window, so no fence in node) */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walkRun-'));
const stub = new Map();
globalThis.localStorage = { getItem: k => (stub.has(k) ? stub.get(k) : null), setItem: (k, v) => { stub.set(k, String(v)); }, removeItem: k => { stub.delete(k); } };
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts').split(path.sep).join('/'))};\n`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], outfile: path.join(TMP, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { cm } = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);
cm.saveCareer(cm.startCareer('Brighton'));
const BRIGHTON = stub.get(KEY);
if (!BRIGHTON) { console.error('WALK ABORT: no fixture'); process.exit(3); }

const browser = await chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function ctxOf(w, h, reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(BLOCK, r => r.abort());
  return ctx;
}
async function pageOf(ctx) {
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e?.message ?? e).slice(0, 160)));
  return p;
}
async function plant(p, kv) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, kv);
}
const disk = p => p.evaluate(([k, f]) => {
  const raw = localStorage.getItem(k);
  if (!raw) return { none: true, fence: localStorage.getItem(f) };
  try {
    const c = JSON.parse(raw);
    const log = c.resultLog ?? [];
    const last = log[log.length - 1];
    return { week: c.week, results: log.length, last: last ? `${last.opp} ${last.score}` : 'none', liveMinute: c.live?.minute ?? null, fence: localStorage.getItem(f), len: raw.length };
  } catch { return { unreadable: true, fence: localStorage.getItem(f) }; }
}, [KEY, FENCE]);
const fmt = d => (d.none ? `no save (fence ${d.fence})` : `week ${d.week}, ${d.results} results, last ${d.last}, live minute ${d.liveMinute}, fence ${d.fence}`);
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.png`) }).catch(e => note(`shot ${n} failed: ${e.message}`));
const noticeUp = p => p.locator('[data-testid="save-moved-notice"]').isVisible().catch(() => false);
async function waitNotice(p, ms = 8000) { for (let t = 0; t < ms; t += 250) { if (await noticeUp(p)) return true; await p.waitForTimeout(250); } return false; }
async function clearBanner(p) { await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {}); }
async function resumeToHub(p) {
  await p.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  if (await p.locator('[data-testid="cm-slots"]').isVisible().catch(() => false)) {
    await p.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  }
  return p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
}
async function openCM(p) { await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 }); return resumeToHub(p); }
async function quick(p) {
  const btn = p.locator('[data-cm-way="quick"]:visible').first();
  if (!await btn.count().catch(() => 0)) return false;
  await btn.click({ timeout: 5000 }).catch(() => {});
  await p.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
  await p.getByRole('button', { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  return true;
}
/** Into /club-manager by an in-app navigation from the home page, so Back pops the router, not the document. */
async function spaIntoCM(p) {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clearBanner(p);
  const link = p.locator('a[href="/club-manager"]:visible').first();
  let how = 'link';
  if (await link.count().catch(() => 0)) await link.click({ timeout: 5000 }).catch(() => { how = 'link failed'; });
  else how = 'none';
  await p.waitForTimeout(800);
  if (!p.url().endsWith('/club-manager')) {
    how = 'pushState';
    await p.evaluate(() => { history.pushState({}, '', '/club-manager'); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
  }
  const hub = await resumeToHub(p);
  return { how, hub };
}

/* ---------- W1 and W2: the SPA Back of a stale tab, mid live match and on the hub ---------- */
async function backCase(label, live) {
  console.log(`${label}: stale tab A presses Back ${live ? 'mid Play Live' : 'on the hub'} (390x844)`);
  const ctx = await ctxOf(390, 844, false);
  const A = await pageOf(ctx);
  await plant(A, { [KEY]: BRIGHTON });
  const into = await spaIntoCM(A);
  note(`A reached /club-manager by ${into.how}, hub ${into.hub}`);
  if (!into.hub) { red(`${label}: A never reached the hub`); await ctx.close(); return; }
  if (live) {
    await A.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 5000 }).catch(() => {});
    const staged = await A.locator('[data-cm-live-stage]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    note(`A live stage up: ${staged}`);
    await A.waitForTimeout(6000);
  }
  const atA = await disk(A);
  note(`disk with A ${live ? 'mid match' : 'on the hub'}: ${fmt(atA)}`);
  await shot(A, `${label}-A-before-B`);
  const B = await pageOf(ctx);
  const bHub = await openCM(B);
  let played = 0;
  for (let i = 0; i < 3 && bHub; i++) if (await quick(B)) played += 1;
  const afterB = await disk(B);
  note(`B on hub ${bHub}, played ${played} quick sims; disk: ${fmt(afterB)}`);
  const up = await waitNotice(A);
  note(`A shows the notice: ${up}`);
  await shot(A, `${label}-A-stale`);
  const origin0 = await A.evaluate(() => performance.timeOrigin);
  await A.goBack({ timeout: 10000 }).catch(e => note(`goBack: ${e.message}`));
  await A.waitForTimeout(2000);
  const origin1 = await A.evaluate(() => performance.timeOrigin).catch(() => null);
  const afterBack = await disk(B);
  note(`A after Back: url ${A.url()}, same document ${origin0 === origin1}; disk: ${fmt(afterBack)}`);
  await shot(A, `${label}-A-after-back`);
  const same = afterBack.week === afterB.week && afterBack.results === afterB.results && afterBack.last === afterB.last && afterBack.liveMinute === afterB.liveMinute;
  results[label] = { into: into.how, played, sameDoc: origin0 === origin1, notice: up, afterB: fmt(afterB), afterBack: fmt(afterBack), kept: same };
  if (!up) red(`${label}: A never showed the notice`);
  if (!same) red(`${label}: CLOBBER by Back: B left "${fmt(afterB)}", after A's Back the disk holds "${fmt(afterBack)}"`);
  else ok(`${label}: the disk is still B's after A's Back`);
  await B.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await resumeToHub(B);
  await shot(B, `${label}-B-after-reload`);
  note(`B errors ${B.errs.length}, A errors ${A.errs.length}: ${[...A.errs, ...B.errs].slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await backCase('W1-live', true);
await backCase('W2-hub', false);

/* ---------- W3: pictures and measurements ---------- */
const measureNotice = p => p.evaluate(() => {
  const d = document.querySelector('[data-testid="save-moved-notice"]');
  if (!d) return null;
  const card = d.firstElementChild.getBoundingClientRect();
  const btn = d.querySelector('button').getBoundingClientRect();
  let minFont = 99;
  for (const el of d.querySelectorAll('*')) if (el.textContent.trim()) minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize));
  return {
    card: [Math.round(card.x), Math.round(card.y), Math.round(card.width), Math.round(card.height)], reloadH: Math.round(btn.height),
    inView: card.x >= 0 && card.y >= 0 && card.right <= innerWidth && card.bottom <= innerHeight, minFont,
    anims: document.getAnimations().length, focusIn: d.contains(document.activeElement),
    name: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby') || null, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight,
  };
});
async function visuals(w, h, reduced) {
  const tag = `W3-${w}x${h}-${reduced ? 'rm' : 'motion'}`;
  console.log(`${tag}: the notice, Escape, Tab, Reload`);
  const ctx = await ctxOf(w, h, reduced);
  const A = await pageOf(ctx);
  await plant(A, { [KEY]: BRIGHTON });
  await openCM(A);
  await A.evaluate(() => window.scrollTo(0, 120));
  await A.waitForTimeout(300);
  const before = await A.evaluate(() => ({ scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight }));
  const B = await pageOf(ctx);
  await openCM(B);
  await quick(B);
  const afterB = await disk(B);
  const up = await waitNotice(A);
  await A.waitForTimeout(400);
  const m = await measureNotice(A);
  await shot(A, `${tag}-notice`);
  note(`${tag}: notice ${up}; before ${JSON.stringify(before)}; notice ${JSON.stringify(m)}`);
  if (!up || !m) { red(`${tag}: no notice`); await ctx.close(); return; }
  if (m.scrollY !== before.scrollY || m.docH !== before.docH) red(`${tag}: the page moved under the notice (${JSON.stringify(before)} vs ${m.scrollY}/${m.docH})`);
  if (m.reloadH < 44) red(`${tag}: Reload ${m.reloadH}px tall`);
  if (m.minFont < 12) red(`${tag}: text at ${m.minFont}px`);
  if (!m.inView) red(`${tag}: the card leaves the viewport`);
  if (m.anims) note(`${tag}: ${m.anims} animations running in the document while the notice shows`);
  await A.keyboard.press('Escape');
  await A.waitForTimeout(400);
  const stillUp = await noticeUp(A);
  for (let i = 0; i < 4; i++) await A.keyboard.press('Tab');
  const focusIn = await A.evaluate(() => document.querySelector('[data-testid="save-moved-notice"]')?.contains(document.activeElement) ?? false);
  note(`${tag}: after Escape the notice is up ${stillUp}; after four Tabs focus inside it ${focusIn}`);
  if (!stillUp) red(`${tag}: Escape took the notice away`);
  if (!focusIn) red(`${tag}: Tab left the notice`);
  await A.getByRole('button', { name: 'Reload', exact: true }).click({ timeout: 5000 }).catch(() => {});
  await A.waitForLoadState('domcontentloaded').catch(() => {});
  await A.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await A.waitForTimeout(600);
  const landedSlots = await A.locator('[data-testid="cm-slots"]').isVisible().catch(() => false);
  const landedHub = await A.locator('[data-cm-way="quick"]').first().isVisible().catch(() => false);
  await shot(A, `${tag}-after-reload`);
  const afterReload = await disk(A);
  const bStale = await waitNotice(B, 5000);
  await shot(B, `${tag}-B-after-A-reload`);
  note(`${tag}: A reloaded onto ${landedSlots ? 'the managers screen' : landedHub ? 'the hub' : 'neither'}; disk ${fmt(afterReload)} (B left ${fmt(afterB)}); B shows the notice now: ${bStale}`);
  if (afterReload.week !== afterB.week || afterReload.results !== afterB.results) red(`${tag}: A's reload changed the disk`);
  results[tag] = { m, before, landed: landedSlots ? 'slots' : landedHub ? 'hub' : 'neither', bStale, escapeKeepsNotice: stillUp };
  await ctx.close();
}
for (const [w, h] of [[390, 844], [1280, 900]]) for (const rm of [false, true]) await visuals(w, h, rm);

/* ---------- W4: the damaged tile, the help block, What's New, at 390 and 1280 ---------- */
async function pages(w, h) {
  const tag = `W4-${w}x${h}`;
  const ctx = await ctxOf(w, h, false);
  const A = await pageOf(ctx);
  const broken = BRIGHTON.slice(0, 400);
  await plant(A, { [KEY]: broken });
  await A.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  const slots = await A.locator('[data-testid="cm-slots"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  await clearBanner(A);
  const line = await A.locator('[data-testid$="-damaged"]').first().innerText().catch(() => null);
  await shot(A, `${tag}-damaged`);
  await A.getByRole('button', { name: /Clear it, new manager/ }).first().click({ timeout: 5000 }).catch(() => {});
  await A.waitForTimeout(400);
  await shot(A, `${tag}-damaged-confirm`);
  const boxes = await A.evaluate(() => [...document.querySelectorAll('[data-testid="cm-slots"] button')].map(b => [b.innerText.trim().slice(0, 30), Math.round(b.getBoundingClientRect().height)]));
  await A.getByRole('button', { name: 'Clear it', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await A.waitForTimeout(1200);
  const kept = await A.evaluate(([k, raw]) => Object.keys(localStorage).filter(x => x.startsWith(k + '.broken-')).map(x => localStorage.getItem(x) === raw), [KEY, broken]);
  await shot(A, `${tag}-after-clear`);
  note(`${tag}: managers screen ${slots}; damaged line "${line}"; buttons ${JSON.stringify(boxes)}; backups byte equal ${JSON.stringify(kept)}; url ${A.url()}`);
  if (!slots) red(`${tag}: a damaged save did not land on the managers screen`);
  if (!kept.includes(true)) red(`${tag}: no backup holds the damaged bytes after Clear`);
  for (const [t, hh] of boxes) if (hh < 44) red(`${tag}: button "${t}" is ${hh}px tall`);
  /* the help block */
  await plant(A, { [KEY]: BRIGHTON });
  await openCM(A);
  await A.getByRole('button', { name: /how to play/i }).first().click({ timeout: 5000 }).catch(() => note(`${tag}: no How to play trigger`));
  await A.waitForTimeout(800);
  const block = A.locator('[data-cm-help="one-tab"]').first();
  const has = await block.count().catch(() => 0);
  if (has) { await block.scrollIntoViewIfNeeded().catch(() => {}); await A.waitForTimeout(300); }
  const helpText = has ? (await block.innerText().catch(() => '')).replace(/\s+/g, ' ') : null;
  await shot(A, `${tag}-help`);
  note(`${tag}: help block found ${has}; text "${helpText}"`);
  if (!has) red(`${tag}: no "One tab at a time" block in the help`);
  /* What's New */
  await A.goto(BASE + '/whats-new', { waitUntil: 'domcontentloaded' });
  await A.waitForTimeout(1500);
  const entry = await A.locator('li', { hasText: 'one tab at a time' }).first().innerText().catch(() => null);
  const ey = await A.locator('li', { hasText: 'one tab at a time' }).first().boundingBox().catch(() => null);
  if (ey) await A.evaluate(y => window.scrollTo(0, Math.max(0, y - 80)), ey.y);
  await A.waitForTimeout(300);
  await shot(A, `${tag}-whatsnew`);
  note(`${tag}: What's New entry "${entry}"`);
  if (!entry) red(`${tag}: no What's New entry`);
  const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (const t of [line, helpText, entry]) if (t && dash.some(d => t.includes(d))) red(`${tag}: a dash in shipped words`);
  results[tag] = { slots, line, boxes, kept, helpText, entry };
  await ctx.close();
}
for (const [w, h] of [[390, 844], [1280, 900]]) await pages(w, h);

await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'walkRun.json'), JSON.stringify(results, null, 1));
console.log(`walkRun: ${reds ? `RED, ${reds} findings` : 'green'} (W1 kept ${results['W1-live']?.kept}, W2 kept ${results['W2-hub']?.kept})`);
process.exit(reds ? 1 : 0);
