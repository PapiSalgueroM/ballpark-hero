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
 * Closing check: the Save points button (SavePointsDoor.tsx) is driven on the
 * three screens the hub tile is not on, each reached the page's own way: the
 * season's end (the calendar's Rest of season), out of work (the save marked
 * sacked), the farewell (the sacked screen's retire door). Each opens the
 * points screen in place listing the point; the farewell's Restore puts it back.
 * Control POINTS_CONTROL=nodoor hides the button (data-cm-points-door, asserted
 * in SavePointsDoor.tsx first): every door check goes red, nothing else, and
 * the last line says FIRED with exit 1.
 * Round 1515: the copy the restore kept aside is slot 1's. With its offer up,
 * the walk switches to slot 2 in place (Managers, New manager): the card
 * offers nothing of slot 1's, nor after a reload in slot 2; slot 1's Resume
 * brings the offer back. Controls (WIDTHS=390, the walk stops after this step):
 * POINTS_CONTROL=nomark drops the slot mark's write (dukb-set-aside-slot), so
 * both slot 2 checks go red; POINTS_CONTROL=noevent stops the page's slot
 * switch event (dukb-slot-switch) before the card hears it, so the in place
 * check and the way back go red and the reload stays green. Each ends FIRED.
 *
 *   #!serve then: node scripts/playCmSavePoints.mjs        (WIDTHS=390 for one width)
 */
import fs from 'node:fs';
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
const CONTROL = process.env.POINTS_CONTROL || '';
if (CONTROL && !['nodoor', 'nomark', 'noevent'].includes(CONTROL)) { console.error(`playCmSavePoints: unknown control ${CONTROL}`); process.exit(2); }
if (CONTROL === 'nodoor' && !fs.readFileSync('src/components/club-manager/SavePointsDoor.tsx', 'utf8').includes('data-cm-points-door')) {
  console.error('playCmSavePoints: control nodoor cannot run, SavePointsDoor.tsx carries no data-cm-points-door'); process.exit(2);
}
/* Round 1515: the kept aside copy's slot mark and the event the page sends when it switches slots in place. */
const MARK_KEY = 'dukb-set-aside-slot', SWITCH_EVENT = 'dukb-slot-switch';
const recoverySrc = fs.readFileSync('src/lib/brokenSaveRecovery.ts', 'utf8');
if (CONTROL === 'nomark' && !recoverySrc.includes(`'${MARK_KEY}'`)) { console.error(`playCmSavePoints: control nomark cannot run, brokenSaveRecovery.ts names no ${MARK_KEY}`); process.exit(2); }
if (CONTROL === 'noevent' && !recoverySrc.includes(`'${SWITCH_EVENT}'`)) { console.error(`playCmSavePoints: control noevent cannot run, brokenSaveRecovery.ts names no ${SWITCH_EVENT}`); process.exit(2); }
const errors = [];
let failures = 0;
let doorFailures = 0;
let slotFailures = 0;
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
  if (CONTROL === 'nodoor') await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '[data-cm-points-door]{display:none!important}';
    document.head.appendChild(st);
  }));
  /* nomark: the browser keeps no slot mark (the write is dropped), so every copy is unmarked. */
  if (CONTROL === 'nomark') await ctx.addInitScript(k => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key !== k) set.call(this, key, value); };
  }, MARK_KEY);
  /* noevent: the page's slot switch never reaches the card (stopped before the card's own listener). */
  if (CONTROL === 'noevent') await ctx.addInitScript(n => { window.addEventListener(n, e => e.stopImmediatePropagation()); }, SWITCH_EVENT);
  await seedPages(ctx, SEED);
  return ctx;
}
const scoredIn = list => list.filter(b => typeof b.score === 'number').length;
async function toHub(page, stop = null) {
  for (let i = 0; i < 8 && !(await visible(page.locator('[data-cm-meters]'))); i += 1) {
    if (stop && await visible(stop)) return;
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

  /* Round 1515: that kept aside copy is slot 1's. Switched to slot 2 in place (Managers, then New manager on slot
     2) the card offers nothing of slot 1's, nor after a reload in slot 2; back in slot 1 (its Resume) it is there. */
  const keptCard = page.locator('[data-dukb-set-aside]', { hasText: 'kept aside' });
  const slotCheck = (ok, msg) => { if (!ok) slotFailures += 1; return check(ok, msg); };
  await page.locator('[data-testid="cm-show-slots"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('[data-testid="cm-slot-2"] button', { hasText: 'New manager' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1200);
  const index = await page.evaluate(() => localStorage.getItem('dukb-cm-slots')).catch(() => null);
  check(/"active":2/.test(index || ''), `slot 2 is the active slot after New manager (${index})`);
  slotCheck(!(await visible(keptCard)), 'switched to slot 2 in place, the card offers nothing of slot 1\'s');
  await shot(page, `points-slot2-${W}.png`);
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  slotCheck(!(await visible(keptCard)), 'a reload in slot 2 offers nothing of slot 1\'s either');
  await page.locator('[data-testid="cm-slot-1"] [data-cm-slot-open="resume"]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1500);
  slotCheck(await visible(keptCard), 'back in slot 1, the card offers the career he had again');
  check((await raw(page)) === bytes, 'back in slot 1 the save is still the point\'s career');
  if (CONTROL === 'nomark' || CONTROL === 'noevent') { await ctx.close(); continue; }
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

  /* Closing check: the Save points button on the three screens the hub tile is not on (SavePointsDoor.tsx), each
     reached the page's own way. The season's end by the calendar's Rest of season; out of work by the save marked
     sacked (the way playCmDifficulty does it); the farewell by the sacked screen's own retire door. On each the
     button opens the same screen in place, listing the point; on the farewell its Restore puts the point back. */
  const door = page.locator('[data-cm-points-door]');
  const doorBtn = page.locator('[data-testid="cm-points-door"]');
  const doorCheck = (ok, msg) => { if (!ok) doorFailures += 1; return check(ok, msg); };
  const tryDoor = async where => {
    await door.first().waitFor({ timeout: 10000 }).catch(() => {});
    /* ResultScreen enters with zoom-in-95 over 300 ms, so a button measured the moment it mounts reads 42 px. */
    await pause(page, 800);
    const h =await doorBtn.first().evaluate(e => Math.round(e.getBoundingClientRect().height)).catch(() => 0);
    doorCheck(await visible(doorBtn) && h >= 44, `${where}: the Save points button is there, ${h} px tall`);
    await doorBtn.first().click({ timeout: 5000 }).catch(() => {});
    const opened = await door.locator('[data-testid="cm-points"]').first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    const list = opened ? (await rows(page)).map(r => r.title).join('|') : '';
    doorCheck(opened && list === 'Renamed copy', `${where}: it opens the points screen in place, listing the point (${list})`);
    check(await fits(page), `${where}: the page still fits the width`);
    await shot(page, `points-door-${where}-${W}.png`);
  };
  const seasonDone = page.locator('h1', { hasText: /^SEASON \d+ COMPLETE$/ });
  const sackedHead = page.locator('h1', { hasText: 'SACKED!' });
  const stopAt = page.locator('h1', { hasText: /^(SEASON \d+ COMPLETE|SACKED!)$/ });
  let passes = 0;
  for (; passes < 16 && !(await visible(seasonDone)) && !(await visible(sackedHead)); passes += 1) {
    const review = page.locator('button', { hasText: 'See Season Review' });
    if (await visible(review)) { await review.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 1500); continue; }
    const win = page.locator('button', { hasText: 'Open the Window' });
    if (await visible(win)) { await win.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 600); }
    await toHub(page, stopAt);
    if (await visible(stopAt)) break;
    const home = page.getByRole('tab', { name: 'Home', exact: true });
    if (await visible(home)) await home.first().click({ timeout: 4000 }).catch(() => {});
    /* A hub panel left open (the points screen, the calendar) hides the tiles: its Club home closes it. */
    const clubHome = page.locator('button', { hasText: 'Club home' });
    if (await visible(clubHome)) { await clubHome.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 500); }
    await page.locator('button').filter({ hasText: '📅' }).filter({ hasText: 'Calendar' }).first().click({ timeout: 4000 }).catch(() => {});
    await pause(page, 800);
    const rest = page.locator('button', { hasText: 'Rest of season' });
    if (await visible(rest)) { await rest.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 2500); }
  }
  check(await visible(seasonDone), `the season ran to its review by the calendar's Rest of season (${passes} passes, week ${(await readSave(page))?.week})`);
  await tryDoor('season-end');
  await doorBtn.first().click({ timeout: 4000 }).catch(() => {});

  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(k => { const c = JSON.parse(localStorage.getItem(k)); c.sacked = true; delete c.live; localStorage.setItem(k, JSON.stringify(c)); }, KEY).catch(() => {});
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const resumeSlot = page.locator('[data-cm-slot-open="resume"]');
  if (await visible(resumeSlot)) { await resumeSlot.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 1500); }
  check(await visible(sackedHead), 'the save marked sacked opens on the sacked screen');
  await tryDoor('sacked');
  await doorBtn.first().click({ timeout: 4000 }).catch(() => {});

  await page.locator('[data-cm-retire-door]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 900);
  await page.locator('[data-cm-retire-yes]').first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('[data-cm-retired]').first().waitFor({ timeout: 10000 }).catch(() => {});
  check(await visible(page.locator('[data-cm-retired]')), 'the sacked screen\'s retire door opens the farewell');
  await tryDoor('retired');
  await door.locator('[data-testid="cm-point-restore"]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 300);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    door.locator('[data-testid="cm-point-confirm"]').first().click({ timeout: 5000 }).catch(() => {}),
  ]);
  await pause(page, 1500);
  doorCheck(await visible(page.locator('[data-cm-meters]')) && (await raw(page)) === bytes, 'retired: Restore from the farewell puts the point back, on its hub, byte for byte');
  await shot(page, `points-door-restored-${W}.png`);
  await ctx.close();
}
await browser.close();
for (const e of errors) console.error(`  page error: ${e}`);
const total = failures + errors.length;
if (CONTROL) {
  const [n, what] = CONTROL === 'nodoor' ? [doorFailures, 'door'] : [slotFailures, 'slot'];
  console.log(n > 0 ? `playCmSavePoints: control ${CONTROL} FIRED (${n} ${what} check(s) red, ${failures} in all)` : `playCmSavePoints: control ${CONTROL} DID NOT FIRE`);
  process.exit(n > 0 ? 1 : 0);
}
console.log(total ? `playCmSavePoints: FAIL, ${failures} check(s) and ${errors.length} page error(s)` : `playCmSavePoints: OK at ${WIDTHS.join(' and ')}`);
process.exit(total ? 1 : 0);
