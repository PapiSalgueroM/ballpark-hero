/* Round 1607 runner walk (never committed): a new 2026-27 Premier League career at Everton, then three rival club
   pages, each must show the opening day manager from src/data/clubManagerDugouts.ts. The host to the database is
   blocked. Run from the repo root in a #!serve request: node .rc/x/walkDugouts.mjs */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.rc-out');
fs.mkdirSync(OUT, { recursive: true });
const RIVALS = [['Liverpool', 'Andoni Iraola'], ['Manchester United', 'Michael Carrick'], ['Newcastle', 'Matthias Jaissle']];
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);

const browser = await pw.chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.route(/supabase\.co/, r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push(String(e?.message ?? e)));
const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
async function tap(rx) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 5000 }).then(() => true).catch(() => false);
}
async function clearRoom() {
  await answerConsent(page, { wait: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

try {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom();
  await tap(/2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton/ }).first();
  await club.waitFor({ timeout: 10000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(/take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/skip: just manage/i);
  await page.waitForTimeout(1000);
  await clearRoom();
  if (!/Season 1/i.test(await text())) throw new Error('could not get past the club picker');
  ok('in the job at Everton, season 1');
  for (const [rival, man] of RIVALS) {
    const tab = page.getByRole('tab', { name: /^Table$/i }).first();
    if (await tab.count().catch(() => 0)) await tab.click({ timeout: 5000 }).catch(() => {});
    else await page.locator('button:visible').filter({ hasText: /^Table$/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    const row = page.locator('button:visible').filter({ hasText: new RegExp(rival) }).first();
    if (await row.count().catch(() => 0) === 0) { fail(`no table row for ${rival}`); continue; }
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const t = await text();
    const slug = rival.toLowerCase().replace(/\s+/g, '-');
    await page.screenshot({ path: path.join(OUT, `club-${slug}-390.png`), fullPage: false });
    const at = t.indexOf(man);
    if (at < 0) fail(`${rival}'s page does not show ${man} (page starts: ${t.slice(0, 200)})`);
    else ok(`${rival}'s page shows "${t.slice(Math.max(0, at - 40), at + man.length + 30)}"`);
    await tap(/^back/i) || await page.goBack().catch(() => {});
    await page.waitForTimeout(600);
  }
} catch (e) {
  fail(String(e?.message ?? e));
  await page.screenshot({ path: path.join(OUT, 'walk-blocked.png') }).catch(() => {});
}
if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failures ? `walkDugouts: ${failures} failure(s)` : 'walkDugouts: green, three rival pages show their opening day manager');
process.exit(failures ? 1 : 0);
