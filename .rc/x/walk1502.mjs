/* Review of Round 1502 (runs lens): Club Manager played the way a player plays it, on the served build, to see
   that the dark binding changes nothing a player sees and that the save carries the watched Champions League.
   W1 Everton 2026-27 (a watcher, the league phase) at 390x844 reduced motion, W2 the same at 1280x900 full
   motion, W3 Everton 2005-06 from the New year (an era watcher, the groups, a mid season start) at 1280x900 full
   motion, W4 the same at 390x844 reduced motion, W5 an old save (W1's with worldComps taken out) reloaded, W6 the
   two dailies. Every request off the served origin is aborted (the database host included).
   BASE (or SWEEP_BASE) is the build; screenshots go to RC_OUT/walk1502. Exit 0 green, 1 red, 2 could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const URL0 = (process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.join(process.env.RC_OUT ?? '.tmp-fx', 'walk1502');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const SIZE = { s390: { width: 390, height: 844 }, s1280: { width: 1280, height: 900 } };
const fails = [];
const fail = m => { fails.push(m); console.log(`  FAIL ${m}`); };
const pass = m => console.log(`  PASS ${m}`);
const check = (c, m) => (c ? pass(m) : fail(m));
const browser = await chromium.launch();

async function openPage(size, reduced) {
  const origin = new URL(URL0).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  const blocked = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (new URL(u).origin === origin) return r.continue(); blocked.push(u); return r.abort(); });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED|supabase/i.test(m.text())) errors.push(`console: ${m.text()}`); });
  return { ctx, page, errors, blocked };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
const save = page => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } }, KEY);
const vis = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
function clickTile(page, title) { return page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.querySelector(':scope > div.uppercase')?.textContent.trim() === t);
  if (b) b.click();
  return !!b;
}, title); }
async function home(page) {
  const h = page.locator('button', { hasText: 'Club home' });
  if (await vis(h)) await h.first().evaluate(b => b.click());
  const back = page.getByRole('button', { name: /^Back$/ });
  if (await vis(back)) await back.first().evaluate(b => b.click());
  await page.waitForTimeout(300);
}

async function startCareer(page, { era, nation, league, club, entry }) {
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: era }).first().click();
  await page.locator('button', { hasText: nation }).first().click();
  const tiles = page.locator('button', { hasText: 'Board wants' });
  await Promise.race([tiles.first().waitFor({ timeout: 15000 }).catch(() => {}), page.locator('button', { hasText: league }).first().waitFor({ timeout: 15000 }).catch(() => {})]);
  if (await tiles.count() === 0) await page.locator('button', { hasText: league }).first().click();
  await tiles.filter({ hasText: club }).first().click();
  await page.locator('div.fixed button', { hasText: 'Take the job' }).first().click();
  const skip = page.getByRole('button', { name: /^Skip: just manage$/ }).first();
  await skip.waitFor({ timeout: 15000 });
  if (entry) await page.locator('button', { hasText: entry }).first().click();
  await skip.click();
  await page.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(600);
}

/* One press that moves the season on, whatever the hub shows. */
async function advance(page) {
  const cont = page.locator('button', { hasText: /^Continue/ });
  if (await vis(page.getByRole('button', { name: /^Continue to Season \d+/ }))) return 'review';
  if (await vis(cont)) { await cont.first().click(); return 'continue'; }
  for (const t of ['See Season Review', 'Open the Window', 'Quick Sim']) {
    const b = page.locator('button', { hasText: t });
    if (await vis(b)) { await b.first().click(); return t; }
  }
  const h = page.locator('button', { hasText: 'Club home' });
  if (await vis(h)) { await h.first().click(); return 'home'; }
  return 'nothing';
}

const sliceLine = sv => { const sl = sv?.worldComps?.ucl; return sl ? `${sl.f} season ${sl.s}, ${sl.clubs.length} clubs, seed ${sl.seed}${sl.holder ? `, holder ${sl.holder}` : ''}` : 'no slice'; };
function watches(id, sv, fmt) {
  const sl = sv?.worldComps?.ucl;
  check(!!sv && !sv.uclGroup && !!sl && sl.f === fmt && sl.s === sv.season && sl.clubs.length === (fmt === 'g8' ? 32 : 36)
    && new Set(sl.clubs).size === sl.clubs.length && !sl.clubs.includes(sv.clubName),
  `${id}: the save watches the Champions League (${sliceLine(sv)}; uclGroup ${sv?.uclGroup ? 'set' : 'null'}; ${sv?.clubName} season ${sv?.season} week ${sv?.week})`);
}
async function cupsDark(page, id) {
  const opened = await clickTile(page, 'Cups');
  await page.waitForTimeout(600);
  await shot(page, `${id}-cups`);
  const txt = await page.evaluate(() => document.body.innerText);
  check(opened && /No European football this season/.test(txt), `${id}: the Cups panel opens and still says "No European football this season" (dark: no screen reads the slice)`);
  check(await noSideScroll(page), `${id}: no sideways scroll on the Cups panel`);
  await home(page);
}
async function playOn(page, id, presses, stopAtReview = true) {
  const seen = {};
  for (let i = 0; i < presses; i += 1) {
    const what = await advance(page).catch(e => `error ${String(e).slice(0, 60)}`);
    seen[what] = (seen[what] ?? 0) + 1;
    await page.waitForTimeout(250);
    if (what === 'review' && stopAtReview) break;
  }
  console.log(`  ${id}: presses ${JSON.stringify(seen)}`);
}
async function resume(page) {
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: 'Resume Career' }).first().click({ timeout: 20000 });
  await page.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(600);
}
const done = async (ctx, id, errors) => { check(errors.length === 0, `${id}: no page or console error${errors.length ? ` (${errors[0].slice(0, 160)})` : ''}`); await ctx.close(); };

async function careerCase(id, sizeKey, reduced, spec, fmt, { long }) {
  const { ctx, page, errors } = await openPage(SIZE[sizeKey], reduced);
  try { await startCareer(page, spec); } catch (e) { fail(`${id}: no hub (${String(e).split('\n')[0].slice(0, 140)})`); await shot(page, `${id}-stuck`); await ctx.close(); return; }
  await shot(page, `${id}-hub`);
  let sv = await save(page);
  watches(id, sv, fmt);
  check(await noSideScroll(page), `${id}: no sideways scroll on the hub`);
  await cupsDark(page, id);
  if (!long) return done(ctx, id, errors);
  const seed0 = sv?.worldComps?.ucl?.seed; const week0 = sv?.week ?? 0;
  await playOn(page, id, 30);
  sv = await save(page);
  check((sv?.week ?? 0) > week0 && sv?.worldComps?.ucl?.seed === seed0 && sv?.worldComps?.ucl?.s === sv?.season, `${id}: played on from week ${week0} to ${sv?.week}, the same slice kept (${sliceLine(sv)})`);
  await shot(page, `${id}-played`);
  const before = JSON.stringify(sv?.worldComps);
  try { await resume(page); } catch (e) { fail(`${id}: Resume Career did not reach the hub (${String(e).split('\n')[0].slice(0, 120)})`); }
  await shot(page, `${id}-resumed`);
  check(JSON.stringify((await save(page))?.worldComps) === before, `${id}: the slice reads the same after a reload`);
  await cupsDark(page, `${id}-resumed`);
  return done(ctx, id, errors);
}

/* An old save from before the round (a committed fixture, season one of today's world, week 48 of 54). */
async function oldSaveCase(id, file, sizeKey, reduced) {
  const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'data', file), 'utf8');
  const { ctx, page, errors } = await openPage(SIZE[sizeKey], reduced);
  await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ } }, [KEY, raw]);
  try { await resume(page); } catch (e) { fail(`${id}: the old save did not resume (${String(e).split('\n')[0].slice(0, 120)})`); await shot(page, `${id}-stuck`); await ctx.close(); return; }
  await shot(page, `${id}-resumed`);
  await cupsDark(page, id);
  await playOn(page, id, 1, false);
  let sv = await save(page);
  watches(`${id} after one press`, sv, 'l36');
  await playOn(page, id, 40);
  await shot(page, `${id}-review`);
  const review = page.getByRole('button', { name: /^Continue to Season \d+/ });
  if (await vis(review)) {
    await review.first().click();
    await page.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await playOn(page, `${id} season 2`, 2, false);
    sv = await save(page);
    await shot(page, `${id}-season2`);
    check(sv?.season === 2 && (sv.uclGroup ? !sv.worldComps : sv.worldComps?.ucl?.s === 2), `${id}: season 2 reached, ${sv?.uclGroup ? 'in the Champions League with no slice' : sliceLine(sv)}`);
    if (sv) console.log(`  ${id}: season 2 uclField holds ${sv.uclField?.length ?? 0} clubs`);
  } else fail(`${id}: the season review never came (week ${(await save(page))?.week})`);
  return done(ctx, id, errors);
}

async function dailyCase(id, route) {
  const { ctx, page, errors } = await openPage(SIZE.s390, true);
  await page.goto(`${URL0}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await shot(page, id);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => (localStorage.getItem(k) ?? '').includes('worldComps')));
  check(keys.length === 0, `${id}: no localStorage key carries worldComps${keys.length ? ` (${keys.join(', ')})` : ''}`);
  check(await noSideScroll(page), `${id}: no sideways scroll`);
  return done(ctx, id, errors);
}

const NOW_EVERTON = { era: '2026-27', nation: 'England', league: 'Premier League', club: 'Everton' };
const ERA_EVERTON = { era: '2005-06', nation: 'England', league: 'Premier League', club: 'Everton', entry: 'New year' };
const cases = [
  () => careerCase('w1-everton-now-390-reduce', 's390', true, NOW_EVERTON, 'l36', { long: true }),
  () => careerCase('w2-everton-now-1280-motion', 's1280', false, NOW_EVERTON, 'l36', { long: false }),
  () => careerCase('w3-everton2005-1280-motion', 's1280', false, ERA_EVERTON, 'g8', { long: true }),
  () => careerCase('w4-everton2005-390-reduce', 's390', true, ERA_EVERTON, 'g8', { long: false }),
  () => oldSaveCase('w5-sevilla-oldsave-390-reduce', 'cmOldSave1052Fixture.json', 's390', true),
  () => oldSaveCase('w5b-valencia-oldsave-1280-motion', 'cmSecondTierOldSaveFixture.json', 's1280', false),
  () => dailyCase('w6-hotseat-390', '/manager-hot-seat'),
  () => dailyCase('w6-deadlineday-390', '/deadline-day'),
];
for (const c of cases) { try { await c(); } catch (e) { fail(`a case threw: ${String(e).split('\n')[0].slice(0, 200)}`); } }
await browser.close();
console.log(`  screenshots in ${OUT}: ${fs.readdirSync(OUT).join(' ')}`);
console.log(fails.length ? `walk1502: RED, ${fails.length} failures` : 'walk1502: GREEN');
process.exit(fails.length ? 1 : 0);
