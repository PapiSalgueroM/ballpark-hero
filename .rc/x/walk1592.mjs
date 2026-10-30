/* Round 1592 browser walk (report fe949903): Manager Hot Seat's carry on never wipes a Club Manager career.
   Sent to a runner as .rc/x/walk1592.mjs, run from the repo root against the served build (BASE).
   Case A: a Club Manager career in slot 1, slots 2 and 3 empty: the card says slot 2, the press lands the job in
   slot 2 and the managers screen shows both careers. Case B: all three slots full: the chooser names each career,
   Cancel moves no byte, a pick keeps the replaced career aside and the put back card brings it back.
   Supabase is blocked. Exit 1 on any FAIL; the last line says how many. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { answerConsent } = await imp('scripts/lib/answerConsent.mjs');
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1592');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const SIZES = (process.env.SIZES || '390x844,1280x900').split(',').map(s => s.split('x').map(Number));
let fails = 0;
const fail = m => { fails += 1; console.log(`  FAIL: ${m}`); };
const ok = m => console.log(`  ok    ${m}`);

/* ---------- fixtures from the real engine ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1592-'));
const stub = new Map();
globalThis.localStorage = { getItem: k => stub.get(k) ?? null, setItem: (k, v) => { stub.set(k, String(v)); }, removeItem: k => { stub.delete(k); } };
const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as hs from ${P('src/lib/managerHotSeat.ts')};\n`);
await build({
  entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const { cm, hs } = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
let HOT = null;
const pool = hs.hotSeatPool();
for (let k = 0; k < 60 && !HOT; k++) {
  const setup = { club: pool[(k * 7) % pool.length].club, seed: (1000 + k) >>> 0 };
  let r = hs.startHotSeat(setup);
  for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
  if (!hs.canCarryOn(r)) continue;
  const again = hs.replayHotSeat(setup, r.actions);
  if (again.verdict?.kind === r.verdict.kind) HOT = { v: 1, club: setup.club, seed: setup.seed, actions: r.actions, done: true, kind: r.verdict.kind };
}
const others = ['Brighton', 'Everton', ...pool.map(c => c.club)].filter((c, i, a) => c !== HOT?.club && a.indexOf(c) === i).slice(0, 3);
const raw = club => { stub.clear(); cm.saveCareer(cm.startCareer(club)); return stub.get(KEY); };
const CAREERS = others.map(raw);
fs.rmSync(TMP, { recursive: true, force: true });
if (!HOT || CAREERS.some(c => !c)) { console.log('walk1592: ABORT, no fixtures (no surviving Hot Seat run or no career)'); process.exit(2); }
console.log(`fixtures: Hot Seat ${HOT.club} (${HOT.kind}), careers ${others.join(', ')}`);

/* ---------- the browser ---------- */
const browser = await pw.chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function page(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(`  note  page error: ${String(e?.message ?? e).slice(0, 160)}`));
  return p;
}
async function plant(p, kv) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, kv);
}
const snap = p => p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
const store = p => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
const clubOf = v => { try { return JSON.parse(v).clubName; } catch { return null; } };
const activeOf = s => { try { return JSON.parse(s['dukb-cm-slots']).active; } catch { return 1; } };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
async function clearDialogs(p) {
  for (let i = 0; i < 3; i++) {
    if (await p.locator('[role="dialog"]:visible').count().catch(() => 0) === 0) return;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
async function openOffer(p) {
  await p.goto(BASE + '/manager-hot-seat', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(1500);
  await answerConsent(p, { wait: 1200 });
  await clearDialogs(p);
  await p.getByRole('button', { name: `See the Club Manager offer for ${HOT.club}` }).first().click({ timeout: 15000 });
  await p.getByTestId('hot-seat-carry-on').waitFor({ timeout: 15000 });
  await p.getByTestId('hot-seat-carry-on').scrollIntoViewIfNeeded().catch(() => {});
}
const FREE = 'manager-hot-seat-free';

/* Case A: a career in slot 1, slots 2 and 3 empty. */
async function caseA(w, h) {
  const tag = `${w}x${h}`;
  console.log(`A) a career in slot 1, two empty slots (${tag})`);
  const p = await page(w, h);
  await plant(p, { [KEY]: CAREERS[0], [FREE]: JSON.stringify(HOT) });
  await openOffer(p);
  const where = (await p.getByTestId('hot-seat-carry-on-slot').innerText()).replace(/\s+/g, ' ');
  console.log(`   the card says: "${where}"`);
  await shot(p, `${tag}-A1-offer`);
  if (!where.includes('slot 2') || !where.includes(others[0])) fail(`${tag} A: the card does not say slot 2 and name ${others[0]}`);
  if (await p.getByRole('button', { name: /Replace/ }).count()) fail(`${tag} A: a Replace button shows with two empty slots`);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await p.waitForURL(/\/club-manager/, { timeout: 20000 }).catch(() => fail(`${tag} A: never reached Club Manager`));
  await p.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 30000 }).catch(() => fail(`${tag} A: Club Manager did not open on the hub`));
  await answerConsent(p, { wait: 800 });
  await shot(p, `${tag}-A2-hub`);
  const s = await store(p);
  console.log(`   storage: active slot ${activeOf(s)}, career key ${clubOf(s[KEY])}, slot 1 parked ${clubOf(s['dukb-cm-slot-1'])}`);
  if (activeOf(s) !== 2 || clubOf(s[KEY]) !== HOT.club || clubOf(s['dukb-cm-slot-1']) !== others[0]) fail(`${tag} A: storage is not slot 1 ${others[0]} and slot 2 ${HOT.club}`);
  await p.locator('[data-testid="cm-show-slots"]').first().click({ timeout: 10000 }).catch(() => {});
  await p.getByTestId('cm-slots').waitFor({ timeout: 15000 }).catch(() => fail(`${tag} A: the managers screen did not open`));
  const tiles = [];
  for (const n of [1, 2, 3]) tiles.push((await p.getByTestId(`cm-slot-${n}`).innerText().catch(() => '')).replace(/\s+/g, ' '));
  console.log(`   managers screen: ${tiles.map((t, i) => `slot ${i + 1} "${t.slice(0, 70)}"`).join(' | ')}`);
  await p.getByTestId('cm-slots').scrollIntoViewIfNeeded().catch(() => {});
  await shot(p, `${tag}-A3-managers`);
  if (!tiles[0].includes(others[0]) || !tiles[1].includes(HOT.club) || !/Empty slot/.test(tiles[2])) fail(`${tag} A: the tiles are not ${others[0]}, ${HOT.club}, empty`);
  else ok(`${tag} A: ${others[0]} stays in slot 1, ${HOT.club} is in slot 2, slot 3 is empty`);
  await p.context().close();
}

/* Case B: all three slots full. */
async function caseB(w, h) {
  const tag = `${w}x${h}`;
  console.log(`B) all three slots full (${tag})`);
  const p = await page(w, h);
  await plant(p, { [KEY]: CAREERS[0], 'dukb-cm-slot-2': CAREERS[1], 'dukb-cm-slot-3': CAREERS[2], [FREE]: JSON.stringify(HOT) });
  await openOffer(p);
  const where = (await p.getByTestId('hot-seat-carry-on-slot').innerText()).replace(/\s+/g, ' ');
  if (!where.includes('All three')) fail(`${tag} B: the card does not say all three slots are full ("${where}")`);
  const before = await snap(p);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await p.getByTestId('hot-seat-carry-on-choose').waitFor({ timeout: 10000 }).catch(() => fail(`${tag} B: no chooser`));
  await p.getByTestId('hot-seat-carry-on-choose').scrollIntoViewIfNeeded().catch(() => {});
  await shot(p, `${tag}-B1-chooser`);
  for (const n of [1, 2, 3]) {
    const t = (await p.getByTestId(`hot-seat-carry-on-replace-${n}`).innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`   option ${n}: "${t}"`);
    if (!t.includes(others[n - 1]) || !/season \d/.test(t)) fail(`${tag} B: option ${n} does not name ${others[n - 1]} and its season`);
  }
  if (await snap(p) !== before) fail(`${tag} B: opening the chooser changed storage`);
  await p.getByRole('button', { name: 'Cancel, keep all three' }).click({ timeout: 10000 });
  await p.waitForTimeout(300);
  await shot(p, `${tag}-B2-cancelled`);
  if (await snap(p) !== before || await p.getByTestId('hot-seat-carry-on-choose').count()) fail(`${tag} B: Cancel changed storage or left the chooser up`);
  else ok(`${tag} B: the chooser named all three careers and Cancel moved no byte`);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await p.getByTestId('hot-seat-carry-on-replace-2').click({ timeout: 10000 });
  await p.waitForURL(/\/club-manager/, { timeout: 20000 }).catch(() => fail(`${tag} B: never reached Club Manager`));
  await p.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 30000 }).catch(() => fail(`${tag} B: Club Manager did not open on the hub`));
  await answerConsent(p, { wait: 800 });
  const s = await store(p);
  const aside = Object.keys(s).filter(k => k.startsWith(`${KEY}.broken-`));
  let marks = {};
  try { marks = JSON.parse(s['dukb-set-aside-slot'] ?? '{}'); } catch { /* none */ }
  console.log(`   storage: active ${activeOf(s)}, career ${clubOf(s[KEY])}, kept aside ${aside.length} (${aside.map(k => `${clubOf(s[k])} slot ${marks[k]}`).join(', ')})`);
  if (activeOf(s) !== 2 || clubOf(s[KEY]) !== HOT.club) fail(`${tag} B: the job is not in slot 2`);
  if (aside.length !== 1 || s[aside[0]] !== CAREERS[1] || marks[aside[0]] !== 2) fail(`${tag} B: ${others[1]} was not kept aside byte for byte, marked slot 2`);
  if (clubOf(s['dukb-cm-slot-1']) !== others[0] || s['dukb-cm-slot-3'] !== CAREERS[2]) fail(`${tag} B: slot 1 or slot 3 moved`);
  const card = p.locator('[data-dukb-set-aside]');
  await card.first().waitFor({ timeout: 10000 }).catch(() => fail(`${tag} B: Club Manager does not offer the kept aside career back`));
  await card.first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(p, `${tag}-B3-kept-aside`);
  await p.getByRole('button', { name: 'Put that save back' }).click({ timeout: 10000 }).catch(() => fail(`${tag} B: no Put that save back button`));
  await p.waitForTimeout(3000);
  await p.locator('[data-testid="cm-show-slots"], [data-testid="cm-slots"]').first().waitFor({ timeout: 30000 }).catch(() => {});
  const t = await store(p);
  const asideNow = Object.keys(t).filter(k => k.startsWith(`${KEY}.broken-`)).map(k => clubOf(t[k]));
  console.log(`   after the put back: active ${activeOf(t)}, career ${clubOf(t[KEY])}, kept aside ${asideNow.join(', ')}`);
  await shot(p, `${tag}-B4-put-back`);
  if (activeOf(t) !== 2 || clubOf(t[KEY]) !== others[1] || !asideNow.includes(HOT.club)) fail(`${tag} B: the put back did not bring ${others[1]} back to slot 2 with ${HOT.club} kept aside`);
  else ok(`${tag} B: the picked career was kept aside, offered back in slot 2, and put back, with the Hot Seat job kept aside in its place`);
  await p.context().close();
}

for (const [w, h] of SIZES) {
  try { await caseA(w, h); } catch (e) { fail(`${w}x${h} A threw: ${String(e?.message ?? e).slice(0, 200)}`); }
  try { await caseB(w, h); } catch (e) { fail(`${w}x${h} B threw: ${String(e?.message ?? e).slice(0, 200)}`); }
}
await browser.close();
console.log(fails ? `\nwalk1592: RED, ${fails} failure(s)` : '\nwalk1592: green, the carry never wrote over a career at any size');
process.exit(fails ? 1 : 0);
