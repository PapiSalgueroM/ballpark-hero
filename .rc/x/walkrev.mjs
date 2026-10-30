/* Round 1592 adversarial review walk (reviewer, lens: runs things). Not the builder's walk.
   Run from the repo root against the served build (BASE). FIX_ROOT, when set, is a checkout of the BASE commit:
   every fixture (the Club Manager careers and the Hot Seat run record) is then made by the base's code, so
   this also proves old saves load on the branch. Cases, at 390x844 and 1280x900, reduced motion on and off:
     D  slot 1 a career, slot 2 an unreadable save, slot 3 empty: the card says slot 3 and that slot 2 stays.
     S  the card read slot 2 as free, then "another tab" filled it: the press must not write over it.
     X  all three full, one an old era career: the chooser names each (started in), a slot changed under the
        open chooser answers changed and writes nothing, then a pick keeps the replaced bytes aside.
   Layout: no sideways page scroll, no clipped button text, no overlapping chooser buttons. Supabase blocked.
   Exit 1 on any FAIL, 2 on no fixtures; the last line says which. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const FIX = process.env.FIX_ROOT || ROOT;
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { answerConsent } = await imp('scripts/lib/answerConsent.mjs');
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walkrev');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const FREE = 'manager-hot-seat-free';
let fails = 0;
const fail = m => { fails += 1; console.log(`  FAIL: ${m}`); };
const ok = m => console.log(`  ok    ${m}`);

/* ---------- fixtures, from FIX (the base commit when set) ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walkrev-'));
const stub = new Map();
globalThis.localStorage = { getItem: k => stub.get(k) ?? null, setItem: (k, v) => { stub.set(k, String(v)); }, removeItem: k => { stub.delete(k); } };
const P = rel => JSON.stringify(path.join(FIX, rel).split(path.sep).join('/'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as hs from ${P('src/lib/managerHotSeat.ts')};\n`);
await build({
  entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
  logLevel: 'error', absWorkingDir: FIX, alias: { '@': path.join(FIX, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const { cm, hs } = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
let HOT = null;
const pool = hs.hotSeatPool();
for (let k = 0; k < 60 && !HOT; k++) {
  const setup = { club: pool[(k * 11 + 3) % pool.length].club, seed: (2000 + k) >>> 0 };
  let r = hs.startHotSeat(setup);
  for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
  if (hs.canCarryOn(r)) HOT = { v: 1, club: setup.club, seed: setup.seed, actions: r.actions, done: true, kind: r.verdict.kind };
}
const names = ['Liverpool', 'Aston Villa', 'Newcastle United', 'Fulham', ...pool.map(c => c.club)].filter((c, i, a) => c !== HOT?.club && a.indexOf(c) === i);
const raw = club => { stub.clear(); try { cm.saveCareer(cm.startCareer(club)); } catch { return null; } return stub.get(KEY) ?? null; };
const CAREERS = [];
for (const n of names) { if (CAREERS.length >= 4) break; const r = raw(n); if (r) CAREERS.push(r); }
fs.rmSync(TMP, { recursive: true, force: true });
if (!HOT || CAREERS.length < 4) { console.log('walkrev: ABORT, no fixtures'); process.exit(2); }
const clubOf = v => { try { return JSON.parse(v).clubName; } catch { return null; } };
/* An old era career for the chooser's words: the same career stamped with a historic era id. */
const OLDERA = (() => { const c = JSON.parse(CAREERS[2]); c.eraId = 'era2010'; return JSON.stringify(c); })();
console.log(`fixtures from ${FIX === ROOT ? 'the head' : FIX}: Hot Seat ${HOT.club} (${HOT.kind}), careers ${CAREERS.map(clubOf).join(', ')}`);

/* ---------- the browser ---------- */
const browser = await pw.chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function page(w, h, motion) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: motion });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(`  note  page error: ${String(e?.message ?? e).slice(0, 160)}`));
  return p;
}
async function plant(p, kv) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, kv);
}
const store = p => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
const snap = p => p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
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
/* Layout facts: sideways scroll, clipped text in the card's buttons, overlapping buttons. */
async function layout(p, tag) {
  const m = await p.evaluate(() => {
    const card = document.querySelector('[data-testid="hot-seat-carry-on"]');
    const btns = card ? [...card.querySelectorAll('button')] : [];
    const rects = btns.map(b => b.getBoundingClientRect());
    let overlap = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap += 1;
    }
    const clipped = btns.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.slice(0, 40));
    const cr = card?.getBoundingClientRect();
    return { sideways: document.documentElement.scrollWidth - window.innerWidth, overlap, clipped, cardOut: cr ? (cr.right > window.innerWidth + 1 || cr.left < -1) : false };
  });
  if (m.sideways > 1 || m.overlap || m.clipped.length || m.cardOut) fail(`${tag} layout: sideways ${m.sideways}px, ${m.overlap} overlapping buttons, clipped ${JSON.stringify(m.clipped)}, card off screen ${m.cardOut}`);
  return m;
}

const whereOf = async p => (await p.getByTestId('hot-seat-carry-on-slot').innerText().catch(() => '')).replace(/\s+/g, ' ');
async function toHub(p, tag) {
  await p.waitForURL(/\/club-manager/, { timeout: 20000 }).catch(() => fail(`${tag}: never reached Club Manager`));
  await p.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 30000 }).catch(() => fail(`${tag}: Club Manager did not open on the hub`));
}

/* D: an unreadable save in slot 2 must stay, the job takes slot 3. */
async function caseD(w, h, motion, tag) {
  const p = await page(w, h, motion);
  await plant(p, { [KEY]: CAREERS[0], 'dukb-cm-slot-2': '{broken save', [FREE]: JSON.stringify(HOT) });
  await openOffer(p);
  const where = await whereOf(p);
  console.log(`   D card: "${where}"`);
  await layout(p, `${tag} D`);
  await shot(p, `${tag}-D1-offer`);
  if (!where.includes('slot 3') || !where.includes(clubOf(CAREERS[0])) || !/slot 2 \(a save this browser can.t read\)/.test(where)) fail(`${tag} D: the card does not say slot 3, ${clubOf(CAREERS[0])} and the unreadable slot 2`);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await toHub(p, `${tag} D`);
  const s = await store(p);
  if (activeOf(s) !== 3 || clubOf(s[KEY]) !== HOT.club || s['dukb-cm-slot-2'] !== '{broken save' || clubOf(s['dukb-cm-slot-1']) !== clubOf(CAREERS[0])) fail(`${tag} D: storage active ${activeOf(s)}, key ${clubOf(s[KEY])}, slot 2 ${JSON.stringify(s['dukb-cm-slot-2'])?.slice(0, 30)}, slot 1 ${clubOf(s['dukb-cm-slot-1'])}`);
  else ok(`${tag} D: the job went to slot 3, the unreadable slot 2 kept its bytes, slot 1 kept ${clubOf(CAREERS[0])}`);
  await shot(p, `${tag}-D2-hub`);
  await p.context().close();
}

/* S: the card read slot 2 as free; another tab fills it before the press. */
async function caseS(w, h, motion, tag) {
  const p = await page(w, h, motion);
  await plant(p, { [KEY]: CAREERS[0], [FREE]: JSON.stringify(HOT) });
  await openOffer(p);
  const where = await whereOf(p);
  if (!where.includes('slot 2')) fail(`${tag} S: the card does not say slot 2 ("${where}")`);
  await p.evaluate(([k, v]) => localStorage.setItem(k, v), ['dukb-cm-slot-2', CAREERS[1]]);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await toHub(p, `${tag} S`);
  const s = await store(p);
  if (s['dukb-cm-slot-2'] !== CAREERS[1] || activeOf(s) !== 3 || clubOf(s[KEY]) !== HOT.club || clubOf(s['dukb-cm-slot-1']) !== clubOf(CAREERS[0])) fail(`${tag} S: storage active ${activeOf(s)}, key ${clubOf(s[KEY])}, slot 2 ${s['dukb-cm-slot-2'] === CAREERS[1] ? 'byte equal' : 'CHANGED'}`);
  else ok(`${tag} S: slot 2 filled after the card read it was left byte equal, the job went to slot 3`);
  await p.context().close();
}

/* X: all three full (slot 3 an old era career); a slot changed under the open chooser; then a real pick. */
async function caseX(w, h, motion, tag) {
  const p = await page(w, h, motion);
  await plant(p, { [KEY]: CAREERS[0], 'dukb-cm-slot-2': CAREERS[1], 'dukb-cm-slot-3': OLDERA, [FREE]: JSON.stringify(HOT) });
  await openOffer(p);
  const where = await whereOf(p);
  if (!where.includes('All three')) fail(`${tag} X: the card does not say all three are full ("${where}")`);
  await shot(p, `${tag}-X0-full-offer`);
  await p.getByRole('button', { name: 'Carry on in Club Manager' }).click({ timeout: 10000 });
  await p.getByTestId('hot-seat-carry-on-choose').waitFor({ timeout: 10000 }).catch(() => fail(`${tag} X: no chooser`));
  await p.getByTestId('hot-seat-carry-on-choose').scrollIntoViewIfNeeded().catch(() => {});
  const opts = [];
  for (const n of [1, 2, 3]) opts.push((await p.getByTestId(`hot-seat-carry-on-replace-${n}`).innerText().catch(() => '')).replace(/\s+/g, ' '));
  console.log(`   X options: ${opts.map(o => `"${o}"`).join(' | ')}`);
  if (!opts[2].includes('started in')) fail(`${tag} X: the old era career is not named with its era ("${opts[2]}")`);
  const lay = await layout(p, `${tag} X chooser`);
  console.log(`   X layout: sideways ${lay.sideways}px, overlaps ${lay.overlap}, clipped ${lay.clipped.length}`);
  await shot(p, `${tag}-X1-chooser`);
  /* Another tab puts a different career in slot 2 while the chooser still names the old one. */
  await p.evaluate(([k, v]) => localStorage.setItem(k, v), ['dukb-cm-slot-2', CAREERS[3]]);
  const before = await snap(p);
  await p.getByTestId('hot-seat-carry-on-replace-2').click({ timeout: 10000 });
  await p.waitForTimeout(600);
  const note = (await p.getByTestId('hot-seat-carry-on').innerText()).replace(/\s+/g, ' ');
  const opt2 = (await p.getByTestId('hot-seat-carry-on-replace-2').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (await snap(p) !== before || p.url().includes('/club-manager')) fail(`${tag} X: a changed slot 2 was replaced`);
  else if (!/changed since this card read it/.test(note) || !opt2.includes(clubOf(CAREERS[3]))) fail(`${tag} X: no changed note or the chooser still names the old career ("${opt2}")`);
  else ok(`${tag} X: a slot changed under the open chooser was not replaced, and the chooser now names ${clubOf(CAREERS[3])}`);
  await shot(p, `${tag}-X2-changed`);
  await p.getByTestId('hot-seat-carry-on-replace-3').click({ timeout: 10000 });
  await toHub(p, `${tag} X`);
  const s = await store(p);
  const aside = Object.keys(s).filter(k => k.startsWith(`${KEY}.broken-`));
  let marks = {};
  try { marks = JSON.parse(s['dukb-set-aside-slot'] ?? '{}'); } catch { /* none */ }
  if (activeOf(s) !== 3 || clubOf(s[KEY]) !== HOT.club || aside.length !== 1 || s[aside[0]] !== OLDERA || marks[aside[0]] !== 3) fail(`${tag} X: after picking slot 3: active ${activeOf(s)}, key ${clubOf(s[KEY])}, ${aside.length} kept aside, bytes ${aside.length && s[aside[0]] === OLDERA ? 'equal' : 'differ'}, mark ${marks[aside[0]]}`);
  else if (s['dukb-cm-slot-2'] !== CAREERS[3] || clubOf(s['dukb-cm-slot-1']) !== clubOf(CAREERS[0])) fail(`${tag} X: slot 1 or slot 2 moved`);
  else ok(`${tag} X: the old era career was kept aside byte for byte, marked slot 3; slots 1 and 2 unmoved`);
  await shot(p, `${tag}-X3-hub`);
  await p.context().close();
}

const COMBOS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference']];
for (const [w, h, motion] of COMBOS) {
  const tag = `${w}x${h}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  console.log(`== ${tag}`);
  for (const [n, fn] of [['D', caseD], ['S', caseS], ['X', caseX]]) {
    try { await fn(w, h, motion, tag); } catch (e) { fail(`${tag} ${n} threw: ${String(e?.message ?? e).slice(0, 200)}`); }
  }
}
await browser.close();
console.log(fails ? `\nwalkrev: RED, ${fails} failure(s)` : '\nwalkrev: green, every case at both sizes with reduced motion on and off');
process.exit(fails ? 1 : 0);
