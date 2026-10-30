/* Review (run lens) of Round 1606, a remote check extra, never committed. Do Round 1607's 96 real names fit the two
   display slots this round built? Opens the Everton book save with the opponent's and Arsenal's chairs marked real,
   then for each name sets it into the live line and measures whether the truncating span cuts it (scrollWidth over
   clientWidth), at 390x844 and 1280x900. Screenshots of the longest name. The host is blocked. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx';
const SAVE_KEY = 'dukb-club-manager-save';
const NAMES = JSON.parse(fs.readFileSync('.rc/x/names1607.json', 'utf8'));
const s = JSON.parse(fs.readFileSync('scripts/data/cmBookSaveEvertonFixture.json', 'utf8'));
for (const club of Object.keys(s.managers ?? {})) s.managers[club] = { name: 'Mikel Arteta', since: 1, real: 1, appointed: '2019-12' };
const raw = JSON.stringify(s);
const browser = await chromium.launch();
const longest = [...NAMES].sort((a, b) => b.length - a.length)[0];
const report = {};
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ctx.addInitScript(([r, k]) => { try { localStorage.setItem(k, r); } catch { /* blocked */ } }, [raw, SAVE_KEY]);
  const page = await ctx.newPage();
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await answerConsent(page, { wait: 2000 }).catch(() => {});
  const slot = page.locator('[data-cm-slot-open="resume"]').first();
  if (await slot.count()) { await slot.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500); }
  await page.getByRole('button', { name: /Match Centre/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  const mcCut = await page.evaluate(names => {
    const span = document.querySelector('[data-cm-mc-dugout] > span');
    if (!span) return null;
    const cut = [];
    for (const n of names) { span.textContent = `Manager: ${n}`; if (span.scrollWidth > span.clientWidth + 1) cut.push(n); }
    return { width: span.clientWidth, cut };
  }, NAMES);
  await page.evaluate(n => { const span = document.querySelector('[data-cm-mc-dugout] > span'); if (span) span.textContent = `Manager: ${n}`; }, longest);
  const lb = await page.locator('[data-cm-mc-dugout]').first().boundingBox().catch(() => null);
  if (lb) await page.screenshot({ path: path.join(OUT, `fit-${w}-mc.png`), clip: { x: Math.max(0, lb.x - 260), y: Math.max(0, lb.y - 90), width: Math.min(w, 420), height: 160 } });
  await page.getByRole('button', { name: /Club home/ }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: 'Table', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Arsenal")').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const clubCut = await page.evaluate(names => {
    const outer = document.querySelector('[data-cm-dugout] > span');
    const inner = outer?.querySelector('span');
    if (!outer || !inner) return null;
    const cut = [];
    for (const n of names) { inner.textContent = n; if (outer.scrollWidth > outer.clientWidth + 1) cut.push(n); }
    return { width: outer.clientWidth, cut };
  }, NAMES);
  await page.evaluate(n => { const inner = document.querySelector('[data-cm-dugout] > span > span'); if (inner) inner.textContent = n; }, longest);
  const cb = await page.locator('[data-cm-dugout]').first().boundingBox().catch(() => null);
  if (cb) await page.screenshot({ path: path.join(OUT, `fit-${w}-club.png`), clip: { x: 0, y: Math.max(0, cb.y - 70), width: Math.min(w, 640), height: 140 } });
  report[w] = { mcWidth: mcCut?.width, mcCut: mcCut?.cut.length, mcCutNames: mcCut?.cut, clubWidth: clubCut?.width, clubCut: clubCut?.cut.length, clubCutNames: clubCut?.cut };
  console.log(`${w}: Match Centre line ${mcCut?.width}px, ${mcCut?.cut.length} of ${NAMES.length} names cut: ${(mcCut?.cut ?? []).join(' | ')}`);
  console.log(`${w}: club page line ${clubCut?.width}px, ${clubCut?.cut.length} of ${NAMES.length} names cut: ${(clubCut?.cut ?? []).join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'fit.json'), JSON.stringify(report, null, 1));
const total = Object.values(report).reduce((n, r) => n + (r.mcCut ?? 0) + (r.clubCut ?? 0), 0);
console.log(total ? `fitRun1606: ${total} cut name(s) across the two slots and two widths` : 'fitRun1606: every name fits');
process.exit(total ? 1 : 0);
