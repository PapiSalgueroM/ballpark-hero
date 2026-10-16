/* Review of Round 1344 (the runner): a reviewer's walk of the built page. Not committed.
   Plants saves the head's engine builds in node: an Everton career (2026-27) after its January window, and the same
   career after a mid season move to Napoli (joinClubNow). For a man another club bought earlier this season:
   J) after the move: the market search, Talk pressed: does the desk refuse him ("only joined") or do talks open?
   S) before the move: the same press (the refusal, the desk note).
   H) the help's world-moves block at 390 and 1280; W) What's New at 390.
   Widths 390x844 and 1280x900, reduced motion on and off. Every host but the local one is aborted (Supabase too).
   Pictures and walk.json go to $RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk-out');
fs.mkdirSync(OUT, { recursive: true });
const BASEURL = process.env.BASE || 'http://localhost:4173';
const KEY = 'dukb-club-manager-save';
const report = { cases: [] };
const log = (...a) => { console.log(...a); };
function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear(), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
globalThis.fetch = async () => { throw new Error('offline'); };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'review-walk-'));
const entry = path.join(work, 'e.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\n");
const outfile = path.join(work, 'e.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const { cm, cal } = createRequire(import.meta.url)(outfile);
await cm.ensureAllEraRosters();
const OPT = { skipHalftime: true, noCoach: true };
const saveOf = s => { memory.clear(); if (!cm.saveCareer(s)) throw new Error('save refused'); return memory.get(KEY); };
const aiLine = me => t => !t.loan && t.from !== me && t.to !== me && t.from !== 'a free transfer' && t.to !== 'a free transfer';

/* ---- the career ---- */
let pick = null;
for (let seed = 1; seed <= 25 && !pick; seed += 1) {
  let s = withSeed(seed, () => cm.startCareer('Everton', 'now'));
  let january = false, after = 0;
  for (let i = 0; i < 400; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    if (january && (after += 1) > 3) break;
    const r = withSeed(seed * 1000 + i, () => cm.playNextEntry(s, OPT));
    s = r.state;
    if (r.kind === 'window') january = true;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  if (!january || s.sacked) continue;
  const league = cm.REAL_LEAGUES.find(l => cm.playableClubs(l.id).some(c => c.name === 'Napoli'))?.id;
  const open = { club: 'Napoli', league, tier: 1, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  const j = withSeed(seed + 99, () => cal.joinClubNow({ ...s, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } }));
  if (!j || j.clubName !== 'Napoli') continue;
  const lines = (s.transferLog ?? []).filter(aiLine('Everton')).filter(l => l.season === s.season);
  const screenS = cm.marketForScreen(s), screenJ = cm.marketForScreen(j);
  const rows = [];
  for (const line of lines) {
    const rowS = screenS.find(p => p.name === line.name && p.club === line.to);
    const rowJ = screenJ.find(p => p.name === line.name && p.club === line.to);
    if (!rowS || !rowJ || line.to === 'Napoli' || line.from === 'Napoli') continue;
    rows.push({ name: line.name, from: line.from, to: line.to, week: line.week, goneJ: j.goneNames.includes(line.name),
      markedJ: rowJ.joinedThisSeason === true, linesInJ: (j.transferLog ?? []).filter(t => t.name === line.name).length,
      talkS: cm.doorRefusal(s, rowS, 'talk'), talkJ: cm.doorRefusal(j, rowJ, 'talk'), buyJ: cm.doorRefusal(j, rowJ, 'buy') });
  }
  report.engine = { seed, rows };
  log(`seed ${seed}: ${lines.length} AI deal lines this season before the move; listed at the buyer both before and after: ${rows.length}`);
  for (const r of rows.slice(0, 8)) log(`  ${r.name} ${r.from} -> ${r.to} (wk ${r.week}) goneAfter=${r.goneJ} markedAfter=${r.markedJ} linesAfter=${r.linesInJ} | talk before: ${r.talkS} | talk after: ${r.talkJ} | buy after: ${r.buyJ}`);
  const best = rows.find(r => r.talkS && r.talkS.includes('only joined') && !r.talkJ) ?? rows.find(r => r.talkS && r.talkS.includes('only joined'));
  if (best) pick = { seed, X: best.name, B: best.to, before: saveOf(s), joined: saveOf(j), row: best };
}
if (!pick) { log('walk: no career found with a refused man before the move'); fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1)); process.exit(2); }
log(`walk: seed ${pick.seed}, ${pick.X} at ${pick.B}; engine says talk before "${pick.row.talkS}", after the move "${pick.row.talkJ}"`);

/* ---- the browser ---- */
const ORIGIN = new URL(BASEURL).origin;
const browser = await pw.chromium.launch({ headless: true });
const errors = [];
async function pageWith(w, h, motion, save) {
  const touch = w < 768;
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [...(save ? [{ name: KEY, value: save }] : []), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(`${w}: ${String(e?.message ?? e)}`));
  return { context, page };
}
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }).catch(e => log(`shot ${name} failed: ${e.message}`));
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
async function talkOn(page, name, club, label) {
  await page.getByRole('tab', { name: /^Market$/ }).first().click();
  const box = page.getByPlaceholder(/Search player or club/).first();
  await box.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await box.count().catch(() => 0))) return { row: null };
  await box.fill(name);
  await page.waitForTimeout(500);
  const row = await page.evaluate(([x, c]) => {
    for (const b of document.querySelectorAll('button')) {
      const lbl = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^Talk/.test(lbl)) continue;
      const r = b.parentElement && b.parentElement.parentElement;
      const text = ((r && r.innerText) || '').replace(/\s+/g, ' ');
      if (text.includes(x) && text.includes(c)) { b.setAttribute('data-rv-talk', '1'); return { text: text.slice(0, 160), label: lbl, h: Math.round(b.getBoundingClientRect().height) }; }
    }
    return null;
  }, [name, club]);
  await shot(page, `${label}-search`);
  if (!row) return { row };
  await page.locator('[data-rv-talk="1"]').first().click();
  await page.waitForTimeout(900);
  const after = await page.evaluate(x => {
    const note = document.querySelector('[data-testid="cm-desk-note"]');
    const body = document.body.innerText.replace(/\s+/g, ' ');
    const i = body.indexOf(x);
    return { note: note ? note.textContent.replace(/\s+/g, ' ').trim() : null, refused: body.includes(`${x} only joined`),
      dialog: !!document.querySelector('[role="dialog"]'), around: i >= 0 ? body.slice(Math.max(0, i - 80), i + 220) : null,
      w: document.documentElement.scrollWidth, vw: window.innerWidth };
  }, name);
  await shot(page, `${label}-pressed`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await shot(page, `${label}-pressed-top`);
  return { row, after };
}
const VIEWS = [[390, 844, 'reduce'], [1280, 900, 'no-preference'], [390, 844, 'no-preference'], [1280, 900, 'reduce']];
for (const [w, h, motion] of VIEWS) {
  for (const [kind, save] of [['joined', pick.joined], ['before', pick.before]]) {
    const label = `${kind}-${w}-${motion === 'reduce' ? 'rm' : 'motion'}`;
    const { context, page } = await pageWith(w, h, motion, save);
    try {
      const ok = await resume(page);
      if (!ok) { log(`${label}: did not resume`); report.cases.push({ label, resumed: false }); await shot(page, `${label}-noresume`); continue; }
      const r = await talkOn(page, pick.X, pick.B, label);
      report.cases.push({ label, ...r });
      log(`${label}: row=${r.row ? r.row.text.slice(0, 90) : 'NONE'} | talk ${r.row?.h}px | refused=${r.after?.refused} note="${r.after?.note}" dialog=${r.after?.dialog} scrollW=${r.after?.w}/${r.after?.vw}`);
      if (kind === 'before' && motion === 'no-preference') {
        await page.getByRole('button', { name: /how to play/i }).first().click().catch(e => log(`help: ${e.message}`));
        const block = page.locator('[data-cm-help="world-moves"]').first();
        await block.waitFor({ timeout: 8000 }).catch(() => {});
        if (await block.count().catch(() => 0)) {
          await block.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(300);
          const box = await block.boundingBox();
          log(`${label}: help block world-moves box ${JSON.stringify(box)}`);
          await shot(page, `${label}-help`);
        } else log(`${label}: help block world-moves NOT FOUND`);
      }
    } catch (e) { log(`${label}: walk error ${e.message}`); report.cases.push({ label, error: e.message }); }
    finally { await context.close(); }
  }
}
{
  const { context, page } = await pageWith(390, 844, 'no-preference', null);
  await page.goto(`${ORIGIN}/whats-new`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/players other clubs buy stay bought/i).first().waitFor({ timeout: 20000 }).catch(() => {});
  const li = await page.evaluate(() => { const s = [...document.querySelectorAll('li')].find(l => /stay bought/.test(l.textContent || '')); return s ? s.textContent.replace(/\s+/g, ' ').trim() : null; });
  log(`whats-new: ${li}`);
  report.whatsNew = li;
  await shot(page, 'whatsnew-390');
  await context.close();
}
await browser.close();
report.errors = errors;
log(`page errors: ${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1));
log('walk: done');
