/* Review of Round 1508 (run lens): an old Club Manager career rolled into its next summer BY THE PAGE'S OWN BUTTON.
   Sent to a runner as .rc/x/walk1508.mjs under #!serve #!playwright; BASE is the served dist, RC_OUT gets pictures.
   The builder's walk rolls the save in node and pre-filters a deal the ledger already holds. This one plants the
   fixture's old save at the season's end (played on in node only up to SEASON N COMPLETE, before the summer), then
   presses "Continue to Season N+1" in the page, so the hook's own startNextSeason adopts the career, with the page's
   own random stream. It then reads the save the page wrote, and checks every deal of the summer between two other
   clubs: the buyer's roster lists him, the seller's does not; and in the page the buyer's club page lists the first
   such man in the league, the seller's does not, the market finds him at the buyer and Talk refuses him.
   Cases: fixture pre (Arsenal, written by the engine before Release AZ) at 390x844 and 1280x900 with reduced motion
   on and off; fixture mid (Bayern 2015-16, carried on by the AZ engine) at 390 reduce and 1280 no-preference.
   Exit 0 green, 1 red, 2 could not run. Supabase and every other host are aborted. */
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const ORIGIN = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1508');
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
const die = why => { console.log(`walk1508 could not run: ${why}`); process.exit(2); };

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- this tree's engine in node ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1508-'));
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const entry = path.join(work, 'head.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
const outfile = path.join(work, 'head.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const { cm: H } = createRequire(import.meta.url)(outfile);
await H.ensureAllEraRosters();
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldCareersWorldFixture.json'), 'utf8'));
const aiLines = s => (s.transferLog ?? []).filter(t => !t.loan && t.from !== s.clubName && t.to !== s.clubName && t.from !== 'a free transfer' && t.to !== 'a free transfer');

/* The old save played on in node to SEASON N COMPLETE (finishSeason), nothing past it: no adoption yet. */
function endOfSeason(key) {
  for (let seed = 1; seed <= 8; seed += 1) {
    memory.clear(); memory.set(KEY, fixture.saves[key]);
    let s = H.loadCareer();
    if (!s) die(`fixture ${key} did not open`);
    if (H.worldSeedOf(s) !== undefined || s.worldRoster !== undefined) die(`fixture ${key} carries a seed or a ledger`);
    for (let i = 0; i < 300; i += 1) {
      const r = withSeed(seed * 1000 + i, () => H.playNextEntry(s, { skipHalftime: true, noCoach: true }));
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.sacked) continue;
    const fin = withSeed(seed + 5, () => H.finishSeason(s)).state;
    if (fin.worldRoster !== undefined) die(`fixture ${key}: a ledger before the summer`);
    memory.clear();
    if (!H.saveCareer(fin)) die('the engine refused to save');
    return { key, seed, save: memory.get(KEY), season: fin.season, club: fin.clubName };
  }
  die(`fixture ${key}: sacked on every seed`);
}
const ends = { pre: endOfSeason('pre'), mid: endOfSeason('mid') };
for (const e of Object.values(ends)) console.log(`walk1508: fixture ${e.key} (${e.club}) at SEASON ${e.season} COMPLETE, seed ${e.seed}, ${e.save.length} characters`);

const results = [];
const check = (tag, name, ok, detail = '') => { results.push({ tag, name, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} [${tag}] ${name}${detail ? ` (${detail})` : ''}`); };

const browser = await pw.chromium.launch({ headless: true });
async function pageWith(save, width, height, motion) {
  const phone = width < 600;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: KEY, value: save }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(20000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const press = async (page, locator, phone) => { if (phone) await locator.tap(); else await locator.click(); };
async function clubPageText(page, club, phone) {
  const tab = page.getByRole('tab', { name: /^Table$/ }).first();
  if (!(await tab.count())) return null;
  await press(page, tab, phone);
  const row = page.locator(`[data-club="${club}"]`).first();
  await row.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await row.count())) return null;
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await press(page, row, phone);
  await page.getByText(/on the books\)/).first().waitFor({ timeout: 20000 }).catch(() => {});
  return page.evaluate(() => document.body.innerText);
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function walkCase(fx, width, height, motion) {
  const tag = `${fx}-${width}-${motion === 'reduce' ? 'rm' : 'anim'}`;
  const end = ends[fx], phone = width < 600;
  const { context, page } = await pageWith(end.save, width, height, motion);
  const shot = name => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: false }).catch(() => {});
  try {
    await page.goto(`${ORIGIN}/club-manager`, { waitUntil: 'domcontentloaded' });
    check(tag, 'reduced motion as asked', (await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) === (motion === 'reduce'));
    const resume = page.getByRole('button', { name: /resume career/i }).first();
    await resume.waitFor({ timeout: 25000 }).catch(() => {});
    if (!(await resume.count())) { check(tag, 'Resume Career offered', false); await shot('no-resume'); return; }
    await press(page, resume, phone);
    const heading = page.getByRole('heading', { name: `SEASON ${end.season} COMPLETE` });
    await heading.waitFor({ timeout: 25000 }).catch(() => {});
    check(tag, `the old save resumes at SEASON ${end.season} COMPLETE`, await heading.count());
    await shot('end');
    const next = page.getByRole('button', { name: /^(Continue to Season|Start Season) \d+/ }).first();
    await next.waitFor({ timeout: 30000 }).catch(() => {});
    if (!(await next.count())) { check(tag, 'the season end offers its continue button', false); await shot('no-continue'); return; }
    await next.scrollIntoViewIfNeeded().catch(() => {});
    await shot('continue');
    await press(page, next, phone);
    await page.locator('[data-cm-hub]').first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForFunction(([k, season]) => { try { return JSON.parse(localStorage.getItem(k))?.season === season; } catch { return false; } }, [KEY, end.season + 1], { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shot('hub');
    check(tag, 'no sideways scroll on the hub', (await overflow(page)) <= 1, `${await overflow(page)} px`);
    const savedRaw = await page.evaluate(k => localStorage.getItem(k), KEY);
    let saved = null; try { saved = JSON.parse(savedRaw); } catch { /* checked below */ }
    check(tag, `the page saved season ${end.season + 1}`, saved?.season === end.season + 1, `season ${saved?.season}`);
    if (!saved) return;
    check(tag, 'adopted through the page: no seed, a version 1 ledger', saved.worldSeed === undefined && saved.worldRoster?.version === 1 && Array.isArray(saved.worldRoster.records),
      `${(saved.worldRoster?.records ?? []).length} records`);
    /* Every deal of the summer between two other clubs, read back through the engine from the page's own save. */
    memory.clear(); memory.set(KEY, savedRaw);
    const st = H.loadCareer();
    check(tag, 'the page\'s save opens in the engine', !!st);
    if (!st) return;
    const lines = aiLines(st).filter(l => l.season === st.season);
    let atBuyer = 0, atSeller = 0;
    for (const l of lines) {
      if (H.worldRosterFor(st, l.to).some(p => p.n === l.name)) atBuyer += 1;
      if (H.worldRosterFor(st, l.from).some(p => p.n === l.name)) atSeller += 1;
    }
    check(tag, `every summer deal between two other clubs is at its buyer (${lines.length} deals)`, lines.length > 0 && atBuyer === lines.length, `${atBuyer} of ${lines.length}`);
    check(tag, 'and no seller still lists the man it sold', atSeller === 0, `${atSeller}`);
    const mkt = H.marketForScreen(st);
    check(tag, 'the market lists nobody at my club', !mkt.some(m => m.club === st.clubName), `${mkt.filter(m => m.club === st.clubName).length}`);
    check(tag, 'the market lists no moved man at his seller', !lines.some(l => mkt.some(m => m.name === l.name && m.club === l.from)));
    const pick = lines.find(l => st.leagueClubs.includes(l.to));
    if (!pick) { console.log(`[${tag}] no summer deal to a club in my league; club pages not walked`); return; }
    console.log(`[${tag}] walking ${pick.name}: ${pick.from} to ${pick.to}`);
    const buyerText = await clubPageText(page, pick.to, phone);
    await page.getByText(pick.name, { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot('buyer');
    check(tag, `${pick.to}'s club page lists ${pick.name}`, !!buyerText && buyerText.includes(pick.name));
    check(tag, 'no sideways scroll on the club page', (await overflow(page)) <= 1, `${await overflow(page)} px`);
    if (st.leagueClubs.includes(pick.from)) {
      const sellerText = await clubPageText(page, pick.from, phone);
      await shot('seller');
      check(tag, `${pick.from}'s club page does not list ${pick.name}`, !!sellerText && !sellerText.includes(pick.name));
    }
    const mtab = page.getByRole('tab', { name: /^Market$/ }).first();
    if (await mtab.count()) {
      await press(page, mtab, phone);
      const box = page.getByPlaceholder(/Search player or club/).first();
      await box.waitFor({ timeout: 20000 }).catch(() => {});
      if (await box.count()) {
        await box.fill(pick.name);
        await page.waitForTimeout(500);
        const row = await page.evaluate(([x, c]) => {
          for (const b of document.querySelectorAll('button')) {
            const label = (b.textContent || '').replace(/\s+/g, ' ').trim();
            if (!/^Talk/.test(label)) continue;
            const r = b.parentElement && b.parentElement.parentElement;
            const text = ((r && r.innerText) || '').replace(/\s+/g, ' ');
            if (text.includes(x)) { b.setAttribute('data-rv-talk', '1'); return { text, atBuyer: text.includes(`${c} · `) }; }
          }
          return null;
        }, [pick.name, pick.to]);
        await shot('market');
        check(tag, `the market's search finds ${pick.name} at ${pick.to}`, !!row && row.atBuyer, row ? row.text.slice(0, 100) : 'no row');
        if (row) {
          const talk = page.locator('[data-rv-talk="1"]').first();
          await talk.scrollIntoViewIfNeeded().catch(() => {});
          await press(page, talk, phone);
          await page.getByTestId('cm-desk-note').first().waitFor({ timeout: 5000 }).catch(() => {});
          const note = await page.evaluate(() => (document.querySelector('[data-testid="cm-desk-note"]')?.textContent || '').replace(/\s+/g, ' ').trim());
          await page.getByTestId('cm-desk-note').first().scrollIntoViewIfNeeded().catch(() => {});
          await shot('talk');
          check(tag, `Talk says ${pick.name} only joined ${pick.to} this season`, note.includes(`only joined ${pick.to} this season`), note.slice(0, 140));
        }
      }
    }
  } finally {
    check(tag, 'no page error', page.errors.length === 0, page.errors.slice(0, 2).join(' | '));
    await context.close().catch(() => {});
  }
}

try {
  await walkCase('pre', 390, 844, 'reduce');
  await walkCase('pre', 390, 844, 'no-preference');
  await walkCase('pre', 1280, 900, 'reduce');
  await walkCase('pre', 1280, 900, 'no-preference');
  await walkCase('mid', 390, 844, 'reduce');
  await walkCase('mid', 1280, 900, 'no-preference');
} finally {
  await browser.close().catch(() => {});
}
const red = results.filter(r => !r.ok);
console.log(red.length ? `walk1508: RED, ${red.length} of ${results.length} checks failed: ${red.map(r => `[${r.tag}] ${r.name}`).join('; ').slice(0, 600)}` : `walk1508: green, ${results.length} checks held; pictures in ${OUT}`);
process.exit(red.length ? 1 : 0);
