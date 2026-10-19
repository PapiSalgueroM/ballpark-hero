// Reviewer walk (run lens) for Round 1513 save points. Runs on the GitHub runner only, from .rc/x/.
// Four passes: 390x844 and 1280x900, each with reduced motion on and off. The live database is blocked;
// every game_completions insert is captured (then aborted) so the leaderboard rule is seen end to end.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { pageSeedOf, seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walkout';
fs.mkdirSync(OUT, { recursive: true });
const SEED = pageSeedOf(new URL('../../scripts/playCmSavePoints.mjs', import.meta.url).href, undefined);
const KEY = 'dukb-club-manager-save';
const PASSES = (process.env.PASSES || '390r,1280n,390n,1280r').split(',');
const errors = [];
const findings = [];
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures += 1; console.log(`  FAIL: ${msg}`); } else console.log(`  ok: ${msg}`); return ok; };
const note = msg => { findings.push(msg); console.log(`  NOTE: ${msg}`); };
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, name), fullPage: full }).catch(e => console.log(`  shot ${name} failed ${e}`)); };
const pause = (page, ms) => page.waitForTimeout(ms);
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const raw = page => page.evaluate(k => localStorage.getItem(k), KEY).catch(() => null);
const readSave = page => page.evaluate(k => {
  const r = localStorage.getItem(k);
  if (!r) return null;
  const c = JSON.parse(r);
  return { played: c.careerStats?.played ?? null, week: c.week, season: c.season };
}, KEY).catch(() => null);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const rows = async page => page.locator('[data-testid="cm-point-row"]').evaluateAll(els => els.map(e => ({
  id: e.getAttribute('data-point-id'),
  title: e.querySelector('[data-testid="cm-point-title"]')?.textContent?.trim() ?? '',
  where: e.querySelector('[data-testid="cm-point-where"]')?.textContent?.trim() ?? '',
}))).catch(() => []);
const pointKeys = page => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dukb-cm-point') || k.startsWith('dukb-save-pending')).sort());
const overflowers = page => page.evaluate(() => {
  const root = document.querySelector('[data-testid="cm-points"]');
  if (!root) return ['no panel'];
  const box = root.getBoundingClientRect();
  const bad = [];
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) bad.push(`${el.tagName}.${(el.getAttribute('data-testid') || '')} ${Math.round(r.left)}..${Math.round(r.right)} vs ${Math.round(box.left)}..${Math.round(box.right)}`);
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && el.children.length === 0) bad.push(`text overflow ${el.tagName} "${el.textContent.slice(0, 30)}"`);
  }
  return bad.slice(0, 6);
});
const buttonHeights = page => page.evaluate(() => [...document.querySelectorAll('[data-testid="cm-points"] button')].map(b => `${b.textContent.trim()}:${Math.round(b.getBoundingClientRect().height)}`));

async function toHub(page) {
  for (let i = 0; i < 8 && !(await visible(page.locator('[data-cm-meters]'))); i += 1) {
    const resume = page.locator('[data-cm-slot-open="resume"]');
    const home = page.locator('button', { hasText: 'Club home' });
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await visible(resume)) await resume.first().click({ timeout: 4000 }).catch(() => {});
    else if (await visible(home)) await home.first().click({ timeout: 4000 }).catch(() => {});
    else if (await visible(onward)) await onward.first().click({ timeout: 4000 }).catch(() => {});
    else { const tab = page.getByRole('tab', { name: 'Home', exact: true }); if (await visible(tab)) await tab.first().click({ timeout: 4000 }).catch(() => {}); }
    await pause(page, 600);
  }
}
async function playMatches(page, n) {
  const start = (await readSave(page))?.played ?? 0;
  for (let steps = 0; steps < 60; steps += 1) {
    const s = await readSave(page);
    if (s && s.played >= start + n) break;
    const quick = page.getByRole('button', { name: '⚡ Quick Sim', exact: true });
    if (await visible(quick)) { await quick.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 800); continue; }
    const win = page.locator('button', { hasText: 'Open the Window' });
    if (await visible(win)) { await win.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 600); }
    await toHub(page);
    await pause(page, 300);
  }
  await toHub(page);
  return ((await readSave(page))?.played ?? 0) - start;
}
async function openPoints(page) {
  await toHub(page);
  await page.locator('button', { hasText: /Go back after a mistake|of 3 made/ }).first().click({ timeout: 5000 }).catch(() => {});
  return page.locator('[data-testid="cm-points"]').waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
}
async function newCareer(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
}
const index = page => page.evaluate(() => { const k = Object.keys(localStorage).find(x => /^dukb-cm-points-\d+$/.test(x)); return k ? localStorage.getItem(k) : null; });
async function fillStorage(page, leave) {
  return page.evaluate(leave => {
    const keys = [];
    let i = 0;
    for (const n of [1000000, 100000, 10000, 1000, 100]) {
      const s = 'x'.repeat(n);
      for (;;) { const k = `zfill-${i++}`; try { localStorage.setItem(k, s); keys.push([k, n]); } catch { break; } }
    }
    const free = () => { let lo = 0, hi = 2000000; while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); try { localStorage.setItem('zprobe', 'y'.repeat(mid)); localStorage.removeItem('zprobe'); lo = mid; } catch { hi = mid - 1; } } return lo; };
    keys.sort((a, b) => a[1] - b[1]);
    while (free() < leave && keys.length) localStorage.removeItem(keys.shift()[0]);
    return free();
  }, leave);
}
const unfill = page => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('zfill-')) localStorage.removeItem(k); });

const browser = await chromium.launch();
for (const P of (process.env.PASSES2 || '390r,1280n').split(',')) {
  const W = Number.parseInt(P, 10);
  const reduce = P.endsWith('r');
  const tag = `${W}${reduce ? 'r' : 'n'}`;
  console.log(`\n== walk2 ${tag}`);
  const ctx = await browser.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, SEED);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${tag}: ${String(e)}`));
  await newCareer(page);
  check(await playMatches(page, 1) >= 1, 'a first match');
  await toHub(page);
  await shot(page, `w2-hub-none-${tag}.png`, true);
  check(await openPoints(page), 'the screen opens');
  await page.locator('[data-testid="cm-point-name"]').fill('Keep me');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 400);
  check((await rows(page)).length === 1, 'one point');
  await page.locator('button', { hasText: 'Club home' }).first().click({ timeout: 4000 }).catch(() => {});
  await toHub(page);
  await shot(page, `w2-hub-one-${tag}.png`, true);

  /* No room: a new point and a restore are both refused in plain words, nothing moves. */
  const save0 = await raw(page), idx0 = await index(page);
  const free = await fillStorage(page, Number(process.env.LEAVE || 3000));
  console.log(`  storage filled, ${free} characters free; point sizes in the index: ${JSON.stringify((JSON.parse(idx0 || '{}').points || []).map(p => [p.size, p.len]))}`);
  check(await openPoints(page), 'the screen opens with the storage full');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 500);
  const n1 = await page.locator('[data-testid="cm-point-note"]').innerText().catch(() => '');
  check(/out of room/i.test(n1), `a point with no room is refused ("${n1}")`);
  const idx1 = await index(page);
  const keysNow = (await pointKeys(page)).filter(k => k.startsWith('dukb-cm-point-'));
  check((await rows(page)).length === 1 && idx1 === idx0 && (await raw(page)) === save0 && keysNow.length === 1, `the career, the index and the point keys are as they were (${keysNow.length} point keys)`);
  await shot(page, `w2-noroom-create-${tag}.png`);
  await page.locator('[data-testid="cm-point-restore"]').first().click();
  await pause(page, 200);
  const url0 = page.url();
  await page.locator('[data-testid="cm-point-confirm"]').first().click();
  await pause(page, 1500);
  const n2 = await page.locator('[data-testid="cm-point-note"]').innerText().catch(() => '');
  check(page.url() === url0 && /out of room/i.test(n2), `a restore with no room to stage is refused ("${n2}")`);
  const idx2 = await index(page);
  check(idx2 === idx1 && (await raw(page)) === save0, `the season mark was taken back and the career is as it was (blocked ${JSON.stringify(JSON.parse(idx2 || '{}').blocked)})`);
  check(!(await pointKeys(page)).some(k => k.startsWith('dukb-save-pending')), 'nothing staged');
  await shot(page, `w2-noroom-restore-${tag}.png`);
  await unfill(page);

  /* Delete the career: its points go. A new career in the slot starts with none. */
  await page.locator('button', { hasText: 'Club home' }).first().click({ timeout: 4000 }).catch(() => {});
  await toHub(page);
  await page.locator('[data-testid="cm-show-slots"]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 800);
  await shot(page, `w2-slots-${tag}.png`);
  await page.locator('button', { hasText: /^Delete$/ }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 300);
  await page.locator('button.bg-destructive', { hasText: 'Delete' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 800);
  const left = (await pointKeys(page)).filter(k => k.startsWith('dukb-cm-point'));
  check(left.length === 0, `deleting the career took its points (${left.join(',') || 'none left'})`);
  await page.locator('button', { hasText: 'New manager' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1000);
  await page.locator('button:has-text("2026-27")').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 700);
  await page.locator('text=England').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 700);
  await page.locator('button:has-text("Brentford")').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 500);
  await page.locator('text=Take the job').click({ timeout: 5000 }).catch(() => {});
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
  await toHub(page);
  const tile = await page.locator('button', { hasText: /Go back after a mistake|of 3 made/ }).first().innerText().catch(() => '');
  check(/None yet/.test(tile), `a new career in the slot starts with no points (${tile.replace(/\s+/g, ' ')})`);
  await ctx.close();
}
await browser.close();
for (const e of errors) console.log(`  page error: ${e}`);
const total = failures + errors.length;
console.log(total ? `walk2Run1513: FAIL, ${failures} check(s) and ${errors.length} page error(s)` : 'walk2Run1513: OK');
process.exit(total ? 1 : 0);
