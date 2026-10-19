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

const browser = await chromium.launch();
const measured = [];
for (const P of PASSES) {
  const W = Number.parseInt(P, 10);
  const reduce = P.endsWith('r');
  const vp = { width: W, height: W === 390 ? 844 : 900 };
  const tag = `${W}${reduce ? 'r' : 'n'}`;
  console.log(`\n== ${tag}: ${vp.width} by ${vp.height}, reduced motion ${reduce ? 'on' : 'off'}`);
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const posts = [];
  await ctx.route(/supabase\.co/, r => {
    const req = r.request();
    if (req.method() === 'POST' && /game_completions/.test(req.url())) {
      let body = null; try { body = JSON.parse(req.postData() || 'null'); } catch { body = req.postData(); }
      for (const b of Array.isArray(body) ? body : [body]) posts.push(b);
    }
    return r.abort();
  });
  await seedPages(ctx, SEED);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${tag}: ${String(e)}`));
  await newCareer(page);
  check(await playMatches(page, 1) >= 1, 'a first match played');
  const scored = () => posts.filter(b => b && b.game === 'club-manager' && typeof b.score === 'number').length;
  const all = () => posts.filter(b => b && b.game === 'club-manager').length;
  console.log(`  posts after match 1: ${all()} rows, ${scored()} scored`);
  await toHub(page);
  await shot(page, `run-hub-${tag}.png`);

  check(await openPoints(page), 'the Save points tile opens its screen');
  await shot(page, `run-empty-${tag}.png`);
  await page.locator('[data-testid="cm-point-name"]').fill('Before the run');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 500);
  const at = await readSave(page);
  const bytes = await raw(page);
  const made = await rows(page);
  check(made.length === 1 && made[0].title === 'Before the run', `one row (${JSON.stringify(made.map(r => r.title))})`);

  check(await playMatches(page, 3) >= 3, 'three more matches');
  const scoredBefore = scored(), allBefore = all();
  console.log(`  posts before the restore: ${allBefore} rows, ${scoredBefore} scored`);
  check(await openPoints(page), 'the screen opens again');
  await page.locator('[data-testid="cm-point-restore"]').first().click();
  await pause(page, 300);
  await shot(page, `run-confirm-${tag}.png`);
  const t0 = Date.now();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    page.locator('[data-testid="cm-point-confirm"]').first().click(),
  ]);
  await page.locator('[data-cm-meters]').first().waitFor({ timeout: 20000 }).catch(() => {});
  measured.push(`${tag} restore to hub ${Date.now() - t0} ms`);
  await pause(page, 800);
  check((await raw(page)) === bytes, 'the save is the point byte for byte after the restore');
  await shot(page, `run-restored-${tag}.png`);
  await page.locator('[data-dukb-put-back] button', { hasText: 'OK' }).click({ timeout: 4000 }).catch(() => {});
  await toHub(page);

  /* The leaderboard, end to end: the replayed matches of a season a restore landed in post no score. */
  const s0 = scored(), a0 = all();
  check(await playMatches(page, 3) >= 3, 'three matches replayed after the restore');
  const replayScored = scored() - s0, replayAll = all() - a0;
  console.log(`  replay posts: ${replayAll} rows, ${replayScored} scored`);
  check(replayAll >= 1, `the replayed matches still post their activity (${replayAll} rows)`);
  check(replayScored === 0, `the replayed season posts no score (${replayScored} scored rows)`);
  if (scoredBefore === 0) note(`${tag}: no scored row was seen BEFORE the restore either, so the replay check proves nothing here`);

  /* Fill to three with long wide names, the cap, and the screen at its fullest. */
  check(await openPoints(page), 'the screen opens for more points');
  await page.locator('[data-testid="cm-point-name"]').fill('WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 400);
  await page.locator('[data-testid="cm-point-name"]').fill('MMMMMMMMMMMMMMMMMMMMMMMM');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 400);
  let list = await rows(page);
  check(list.length === 3, `three points (${JSON.stringify(list.map(r => r.title))})`);
  check(list.every(r => r.title.length <= 24), `every name is 24 characters or fewer (${list.map(r => r.title.length).join(',')})`);
  check(await visible(page.locator('[data-testid="cm-points-full"]')), 'at three the name box is replaced by the cap line');
  check(await fits(page), 'the full screen fits the width');
  const ov = await overflowers(page);
  if (ov.length) note(`${tag}: overflow in the full screen: ${ov.join(' | ')}`);
  measured.push(`${tag} buttons ${(await buttonHeights(page)).slice(0, 5).join(' ')}`);
  await page.locator('[data-testid="cm-points"]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `run-full-${tag}.png`);
  await shot(page, `run-full-page-${tag}.png`, true);

  /* A damaged point: one character changed in the middle of the first point's stored text. */
  const first = list[0];
  const hurt = await page.evaluate(id => {
    const k = Object.keys(localStorage).find(x => x.startsWith('dukb-cm-point-') && x.endsWith(`-${id}`));
    if (!k) return null;
    const v = localStorage.getItem(k);
    const i = Math.floor(v.length / 2);
    localStorage.setItem(k, v.slice(0, i) + String.fromCharCode(v.charCodeAt(i) ^ 1) + v.slice(i + 1));
    return k;
  }, first.id);
  check(!!hurt, `the first point's key was found to damage (${hurt})`);
  const beforeDamaged = await raw(page);
  await page.locator('[data-testid="cm-point-restore"]').first().click();
  await pause(page, 200);
  const url0 = page.url();
  await page.locator('[data-testid="cm-point-confirm"]').first().click();
  await pause(page, 1500);
  const noteText = await page.locator('[data-testid="cm-point-note"]').innerText().catch(() => '');
  check(/damaged/i.test(noteText), `a damaged point is refused in plain words ("${noteText}")`);
  check(page.url() === url0 && (await raw(page)) === beforeDamaged, 'the refusal changed nothing (no reload, the save equal)');
  check(!(await pointKeys(page)).some(k => k.startsWith('dukb-save-pending')), 'nothing staged after the refusal');
  await shot(page, `run-damaged-${tag}.png`);

  /* Delete the damaged one, copy, rename. */
  await page.locator('[data-testid="cm-point-delete"]').first().click();
  await page.locator('[data-testid="cm-point-confirm"]').click();
  await pause(page, 400);
  await page.locator('[data-testid="cm-point-copy"]').first().click();
  await pause(page, 400);
  list = await rows(page);
  check(list.length === 3 && list[2].title.startsWith('Copy of'), `the copy (${JSON.stringify(list.map(r => r.title))})`);
  const keys = await pointKeys(page);
  const listed = new Set(list.map(r => r.id));
  const orphans = keys.filter(k => /^dukb-cm-point-\d+-/.test(k) && !listed.has(k.replace(/^dukb-cm-point-\d+-/, '')));
  check(orphans.length === 0, `no point key without a row (${orphans.join(',') || 'none'})`);
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  await toHub(page);
  const tile = await page.locator('button', { hasText: /of 3 made/ }).first().innerText().catch(() => '');
  check(/3 of 3 made/.test(tile), `after a reload the tile says three (${tile.replace(/\s+/g, ' ')})`);
  await shot(page, `run-hub-after-${tag}.png`);
  await ctx.close();
}
await browser.close();
for (const e of errors) console.log(`  page error: ${e}`);
for (const m of measured) console.log(`  measured: ${m}`);
for (const f of findings) console.log(`  finding: ${f}`);
fs.writeFileSync(path.join(OUT, 'walk-summary.txt'), [...measured, ...findings, ...errors].join('\n'));
const total = failures + errors.length;
console.log(total ? `walkRun1513: FAIL, ${failures} check(s) and ${errors.length} page error(s)` : `walkRun1513: OK on ${PASSES.join(' ')}`);
process.exit(total ? 1 : 0);
