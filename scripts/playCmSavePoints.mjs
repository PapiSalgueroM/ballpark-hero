/*
 * Round 1513 browser walk: Club Manager's save points in a real Chromium, on
 * a served build, at 390 and 1280 (the live database blocked).
 *
 * Per width: a new career (2026-27 Brentford, Medium), one match, the Save
 * points tile on the hub, a point named "Before the run". Three more matches.
 * Restore: the page reloads, the save is the point's career byte for byte,
 * the week is back, the card says so and offers the career he had. A reload
 * after that: still there. Then Copy, Rename and Delete, each touching only
 * its own row. At every screen the panel fits the width (no sideways scroll).
 * Review fixes: every button on the screen is at least 44 px tall, and the
 * three matches are played again after the restore: the game_completions
 * inserts are kept (then aborted), the season scored before the restore, and
 * the replay posts rows with no score.
 *
 *   #!serve then: node scripts/playCmSavePoints.mjs        (WIDTHS=390 for one width)
 */
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.POINTS_SEED); } catch (e) { console.error(`POINTS_SEED: ${e.message}`); process.exit(2); }
const HEIGHTS = { 390: 844, 1280: 900 };
const WIDTHS = (process.env.WIDTHS || '390,1280').split(',').map(Number);
const KEY = 'dukb-club-manager-save';
const errors = [];
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures += 1; console.error(`  FAIL: ${msg}`); } else console.log(`  ok: ${msg}`); return ok; };
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
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
  title: e.querySelector('[data-testid="cm-point-title"]')?.textContent?.trim() ?? '',
  where: e.querySelector('[data-testid="cm-point-where"]')?.textContent?.trim() ?? '',
}))).catch(() => []);

/* Every button on the points screen, and its height. */
const buttonHeights = page => page.locator('[data-testid="cm-points"] button').evaluateAll(els => els.map(e => ({
  text: (e.textContent || '').trim(), h: Math.round(e.getBoundingClientRect().height),
}))).catch(() => []);

const browser = await chromium.launch();
/* Review run minor 2: every game_completions insert is kept (then aborted), so
   the leaderboard rule is watched in the real hook, not replayed in a harness. */
async function newCtx(vp, posts) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => {
    const req = r.request();
    if (req.method() === 'POST' && /game_completions/.test(req.url())) {
      let body = null;
      try { body = JSON.parse(req.postData() || 'null'); } catch { body = null; }
      for (const b of Array.isArray(body) ? body : [body]) if (b && b.game === 'club-manager') posts.push(b);
    }
    return r.abort();
  });
  await seedPages(ctx, SEED);
  return ctx;
}
const scoredIn = list => list.filter(b => typeof b.score === 'number').length;
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

for (const W of WIDTHS) {
  const vp = { width: W, height: HEIGHTS[W] ?? 900 };
  console.log(`\n== ${vp.width} by ${vp.height}`);
  const posts = [];
  const ctx = await newCtx(vp, posts);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${W}: ${String(e)}`));
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
  check(await playMatches(page, 1) >= 1, 'a first match played');

  /* Make the point. */
  check(await openPoints(page), 'the Save points tile opens its screen');
  check(await fits(page), 'the screen fits the width');
  await page.locator('[data-testid="cm-point-name"]').fill('Before the run');
  await page.locator('[data-testid="cm-point-create"]').click();
  await pause(page, 500);
  const made = await rows(page);
  check(made.length === 1 && made[0].title === 'Before the run', `one row named "Before the run" (${JSON.stringify(made)})`);
  const at = await readSave(page);
  const bytes = await raw(page);
  check(!!at && made[0]?.where.startsWith(`Season ${at.season}, week ${at.week + 1} ·`), `the row says season ${at?.season}, week ${(at?.week ?? 0) + 1} (${made[0]?.where})`);
  /* Review minors 3 and 15: the taps are 44 px, like the Managers link and 1512's tiles. */
  const tall = await buttonHeights(page);
  check(tall.length >= 5 && tall.every(b => b.h >= 44), `every button on the screen is at least 44 px tall (${tall.map(b => `${b.text}:${b.h}`).join(' ')})`);
  await shot(page, `points-made-${W}.png`);

  /* Three matches, then back. */
  check(await playMatches(page, 3) >= 3, 'three more matches played');
  const moved = await readSave(page);
  check(!!moved && moved.week > at.week && (await raw(page)) !== bytes, `the career moved on (week ${at?.week} to ${moved?.week})`);
  const scoredBefore = scoredIn(posts);
  check(scoredBefore > 0, `the season posted scores before the restore (${posts.length} rows, ${scoredBefore} scored), so the replay check below can fail`);
  check(await openPoints(page), 'the screen opens again');
  await page.locator('[data-testid="cm-point-restore"]').first().click();
  await pause(page, 300);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    page.locator('[data-testid="cm-point-confirm"]').first().click(),
  ]);
  await pause(page, 1500);
  check(await visible(page.locator('[data-cm-meters]')), 'the restore opens the career straight on its hub');
  check((await raw(page)) === bytes, 'after the reload the save is the point\'s career byte for byte');
  const card = page.locator('[data-dukb-put-back="done"]');
  check(await visible(card), 'the card says the point is back');
  check(/save point/i.test((await card.innerText().catch(() => '')) || ''), 'the card names the save point');
  await shot(page, `points-restored-${W}.png`);
  await page.locator('[data-dukb-put-back] button', { hasText: 'OK' }).click({ timeout: 4000 }).catch(() => {});
  await toHub(page);
  const back = await readSave(page);
  check(!!back && back.week === at.week && back.played === at.played, `the week and the matches are back (week ${back?.week}, played ${back?.played}; the point had ${at?.week} and ${at?.played})`);
  check((await raw(page)) === bytes, 'the save is still the point\'s career on the hub');

  /* A reload: still there, and the career he had is on offer. */
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  check((await raw(page)) === bytes, 'a reload keeps the restored career');
  check(await visible(page.locator('[data-dukb-set-aside]', { hasText: 'kept aside' })), 'the card offers the career he had');
  await page.locator('[data-dukb-set-aside] button', { hasText: 'Leave it aside' }).click({ timeout: 4000 }).catch(() => {});
  await toHub(page);

  /* Copy, rename, delete. */
  check(await openPoints(page), 'the screen opens after the reload');
  check((await rows(page)).length === 1, 'the point is still listed after its restore');
  await page.locator('[data-testid="cm-point-copy"]').first().click();
  await pause(page, 400);
  let list = await rows(page);
  check(list.length === 2 && list[1].title === 'Copy of Before the run', `the copy is listed (${JSON.stringify(list.map(r => r.title))})`);
  await page.locator('[data-testid="cm-point-rename"]').nth(1).click();
  await page.locator('[data-testid="cm-point-new-name"]').fill('Renamed copy');
  await page.locator('[data-testid="cm-point-confirm"]').click();
  await pause(page, 400);
  list = await rows(page);
  check(list.map(r => r.title).join('|') === 'Before the run|Renamed copy', `rename touched one row (${list.map(r => r.title).join('|')})`);
  await page.locator('[data-testid="cm-point-delete"]').first().click();
  await page.locator('[data-testid="cm-point-confirm"]').click();
  await pause(page, 400);
  list = await rows(page);
  check(list.map(r => r.title).join('|') === 'Renamed copy', `delete took one row (${list.map(r => r.title).join('|')})`);
  check(await fits(page), 'the screen still fits the width');
  check((await raw(page)) === bytes, 'copy, rename and delete never touched the career');
  await shot(page, `points-after-${W}.png`);

  /* The replay: the season the restore landed in posts no score again, and the activity still counts. */
  const before = posts.length;
  check(await playMatches(page, 3) >= 3, 'the three matches played again after the restore');
  const replay = posts.slice(before);
  check(replay.length > 0 && scoredIn(replay) === 0, `the replayed season posts no score (${replay.length} rows, ${scoredIn(replay)} scored)`);
  await ctx.close();
}
await browser.close();
for (const e of errors) console.error(`  page error: ${e}`);
const total = failures + errors.length;
console.log(total ? `playCmSavePoints: FAIL, ${failures} check(s) and ${errors.length} page error(s)` : `playCmSavePoints: OK at ${WIDTHS.join(' and ')}`);
process.exit(total ? 1 : 0);
