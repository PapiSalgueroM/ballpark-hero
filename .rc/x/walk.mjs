/* Reviewer walk, Round 1550 (run lens). Served build on BASE, supabase aborted, screenshots to RC_OUT.
 * Part 1: a doomed season, the out of work screen, a seat taken, the new club's hub; then the Career box read with the
 *         kit (in tab), after a reload before the kit, and after the kit lands (stored record path, the box must not move).
 * Part 2: offline, the GM level box opened: the retry card; back online, Try again: does the screen draw?
 * Part 3: the last week with the kit chunk failing twice in the tab: the retry card and the press; the chunk back,
 *         Try again: does the press come back? Then a plain reload as the control.
 * Sizes 390x844 and 1280x900, reduced motion on and off. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rw';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
const ROUTE = '/front-office';
const ASK = 'Win the Super Bowl. Anything less is a failed season upstairs.';
const wait = ms => new Promise(r => setTimeout(r, ms));
let checks = 0, failed = 0;
const say = (cond, msg) => { checks++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); return cond; };
const note = msg => console.log(`  MEASURED ${msg}`);

const browser = await chromium.launch();
async function openPage(w, h, rm) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [], assets = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('request', r => { if (r.url().includes('/assets/')) assets.push(r.url()); });
  return { ctx, page, errors, assets };
}
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const writeSave = (page, s) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
const shot = async (page, name) => {
  const [w, h] = await page.evaluate(() => [window.innerWidth, Math.min(1600, document.documentElement.scrollHeight)]);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: w, height: h }, fullPage: true });
};
const careerBox = (page, title) => page.locator(`[data-gm-desk="tiles"] button:has(div.uppercase:text-is("${title}"))`).first();
const boxText = async (page, title) => { const b = careerBox(page, title); return (await b.count()) ? (await b.innerText()).replace(/\s+/g, ' ').trim() : null; };
const kitAsks = (assets, from = 0) => assets.slice(from).filter(u => u.includes('/nflCareerKit-')).length;
const hubBack = async page => { const b = page.locator('[data-gm-desk="panel"] button:has-text("Hub")').first(); if (await b.count()) await b.click(); await wait(400); };
const waitPhase = (page, phase, timeout = 30000) => page.waitForFunction(([k, p]) => JSON.parse(localStorage.getItem(k) || '{}').phase === p, [KEY, phase], { timeout });
const playTile = page => page.locator('button:has(div.uppercase)').filter({ hasText: /This week/i }).first();

/** The arrival recap's presser, the re-sign box glance, the new club's draft, to the hub (playGmCareer's answerAndDraft). */
async function answerAndDraft(page, tag) {
  const press = page.locator('[data-gm-press] button').first();
  if (await press.count()) { await press.click(); await wait(500); }
  await page.locator('button:has-text("Go to the draft")').first().click();
  await wait(700);
  for (let n = 0; n < 30 && (await readSave(page)).phase === 'draft'; n++) {
    const pick = page.getByText(/· age \d+/).first();
    if (await pick.count()) { await pick.click(); await wait(450); continue; }
    const skip = page.locator('button').filter({ hasText: /no picks|without/i }).first();
    if (!(await skip.count())) break;
    await skip.click(); await wait(600);
  }
  const cont = page.locator('button:has-text("Continue")').first();
  if (await cont.count()) { await cont.click(); await wait(600); }
  say((await readSave(page)).phase === 'hub', `${tag}: the new club's draft runs to the hub`);
}

/* ------------------------------ Part 1 ------------------------------ */
async function part1(w, h, rm) {
  const tag = `${w} ${rm} P1`;
  const pre = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
  const { ctx, page, errors, assets } = await openPage(w, h, rm);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await shot(page, `${pre}-1-pick`);
  say(kitAsks(assets) === 0, `${tag}: the pick screen asks for no kit (${kitAsks(assets)})`);
  await page.locator('.grid button').first().click();
  await waitPhase(page, 'hub');
  await wait(600);
  /* a doomed last week */
  const s = await readSave(page);
  s.trust = 5;
  s.mandate = { tier: 'title', text: ASK, winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  s.league.week = 17;
  await writeSave(page, s);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await playTile(page).click();
  await wait(500);
  const final = page.locator('button:has-text("Play the final week")').last();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Play the final week') && !b.disabled), null, { timeout: 60000 });
  await shot(page, `${pre}-2-week17`);
  await final.click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, KEY, { timeout: 60000 });
  await wait(2500);
  await shot(page, `${pre}-3-recap`);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(900);
  await shot(page, `${pre}-4-out-of-work`);
  say((await readSave(page)).phase === 'fired', `${tag}: on the out of work screen`);
  /* the market, a seat */
  await careerBox(page, 'Job market').click();
  await page.locator('[data-gm-market]').first().waitFor({ timeout: 60000 });
  await wait(400);
  await shot(page, `${pre}-5-market`);
  const ids = await page.locator('[data-gm-offer]').evaluateAll(bs => bs.map(b => b.getAttribute('data-gm-offer')));
  if (!say(ids.length >= 1, `${tag}: the market has ${ids.length} offer(s)`)) { await ctx.close(); return; }
  await page.locator(`[data-gm-offer="${ids[0]}"]`).click();
  await wait(300);
  await page.locator('[data-gm-take]').click();
  await wait(300);
  await page.locator('[data-gm-take]').click();
  await wait(1500);
  await shot(page, `${pre}-6-arrival`);
  await answerAndDraft(page, tag);
  await wait(800);
  /* the stored record path: the Career box with the kit in the tab, after a reload without it, and once it lands */
  const save = await readSave(page);
  const stints = save?.gm?.blocks?.seat?.career?.stints ?? [];
  note(`${tag}: seasonsPlayed ${save.seasonsPlayed}, titles ${save.titles}, stints ${JSON.stringify(stints.map(x => [x.team, x.grades.length, x.ended ?? 'open']))}, myTeam ${save.myTeam}`);
  const a = await boxText(page, 'Career');
  const n0 = assets.length;
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await careerBox(page, 'Career').waitFor({ timeout: 30000 });
  const b = await boxText(page, 'Career');
  say(kitAsks(assets, n0) === 0, `${tag}: the new club's hub after a reload asks for no kit (${kitAsks(assets, n0)})`);
  await shot(page, `${pre}-7-hub-before-kit`);
  await careerBox(page, 'Career').click();
  await page.locator('[data-gm-career]').first().waitFor({ timeout: 60000 });
  await wait(400);
  await shot(page, `${pre}-8-career-panel`);
  await hubBack(page);
  const c = await boxText(page, 'Career');
  note(`${tag}: Career box with kit in tab "${a}", after reload before kit "${b}", after kit "${c}"`);
  say(a === b && b === c, `${tag}: the Career box reads the same with the kit, before it and after it`);
  say(errors.length === 0, `${tag}: no page error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* ------------------------------ Part 2 ------------------------------ */
async function freshHub(page, week) {
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('.grid button').first().click();
  await waitPhase(page, 'hub');
  await wait(600);
  const s = await readSave(page);
  s.league.week = week;
  await writeSave(page, s);
}
async function part2(w, h, rm) {
  const tag = `${w} ${rm} P2`;
  const pre = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
  const { ctx, page, errors, assets } = await openPage(w, h, rm);
  await freshHub(page, 9);
  const n0 = assets.length;
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await careerBox(page, 'GM level').waitFor({ timeout: 30000 });
  say(kitAsks(assets, n0) === 0, `${tag}: mid season after a reload, no kit asked (${kitAsks(assets, n0)})`);
  await ctx.setOffline(true);
  await careerBox(page, 'GM level').click();
  const card = await page.locator('[data-career-kit-failed]').first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  say(card, `${tag}: offline, the GM level box shows the retry card`);
  await shot(page, `${pre}-p2-1-offline-card`);
  await ctx.setOffline(false);
  await wait(800);
  const n1 = assets.length;
  if (card) await page.locator('[data-career-kit-failed] button:has-text("Try again")').first().click();
  const drew = await page.locator('[data-gm-xp-desk]').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  note(`${tag}: back online, after Try again: screen drawn ${drew}, kit requests after the click ${kitAsks(assets, n1)}, retry card still shown ${await page.locator('[data-career-kit-failed]').count()}`);
  say(drew, `${tag}: back online, Try again draws the GM level screen`);
  await shot(page, `${pre}-p2-2-after-try-again`);
  const kitUrl = assets.find(u => u.includes('/nflCareerKit-'));
  if (kitUrl) {
    const r = await page.evaluate(u => import(u).then(() => 'resolved', e => `rejected: ${String(e).slice(0, 140)}`), kitUrl);
    note(`${tag}: a direct import() of ${kitUrl.split('/').pop()} in the same page, online: ${r}`);
  }
  /* control: a plain reload, then the box */
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await careerBox(page, 'GM level').click();
  const drew2 = await page.locator('[data-gm-xp-desk]').first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  say(drew2, `${tag}: control, after a plain reload the GM level screen draws`);
  note(`${tag}: page errors ${errors.length} (${errors[0] ?? 'none'})`);
  await ctx.close();
}

/* ------------------------------ Part 3 ------------------------------ */
async function part3(w, h, rm) {
  const tag = `${w} ${rm} P3`;
  const pre = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
  const { ctx, page, errors, assets } = await openPage(w, h, rm);
  await freshHub(page, 17);
  let block = true, navs = 0;
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs++; });
  await page.route(u => u.pathname.includes('/nflCareerKit-'), r => (block ? r.abort() : r.fallback()));
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  const card = await page.locator('[data-career-kit-failed]').first().waitFor({ timeout: 40000 }).then(() => true, () => false);
  await wait(600);
  await answerConsent(page);
  await playTile(page).click().catch(() => {});
  await wait(600);
  const fin = page.locator('button:has-text("Play the final week")').last();
  const disabled = (await fin.count()) ? await fin.isDisabled() : null;
  note(`${tag}: kit chunk aborted: main frame navigations ${navs} (one is mine), retry card ${card}, final press disabled ${disabled}`);
  say(card, `${tag}: the last week shows the retry card when the kit fails twice in the tab`);
  await shot(page, `${pre}-p3-1-week17-failed`);
  block = false;
  const n1 = assets.length;
  if (card) await page.locator('[data-career-kit-failed] button:has-text("Try again")').first().click();
  const back = await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Play the final week') && !b.disabled), null, { timeout: 15000 }).then(() => true, () => false);
  note(`${tag}: chunk back, after Try again: press enabled ${back}, kit requests after the click ${kitAsks(assets, n1)}, retry card still shown ${await page.locator('[data-career-kit-failed]').count()}`);
  say(back, `${tag}: chunk back, Try again brings the last week's press back`);
  await shot(page, `${pre}-p3-2-after-try-again`);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await playTile(page).click().catch(() => {});
  const back2 = await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Play the final week') && !b.disabled), null, { timeout: 30000 }).then(() => true, () => false);
  say(back2, `${tag}: control, after a plain reload the last week's press is enabled`);
  note(`${tag}: page errors ${errors.length} (${errors[0] ?? 'none'})`);
  await ctx.close();
}

const COMBOS = [[390, 844, 'reduce'], [1280, 900, 'no-preference'], [390, 844, 'no-preference'], [1280, 900, 'reduce']];
const PARTS = (process.env.REVIEW_PARTS || '123').split('');
for (const [w, h, rm] of COMBOS) {
  for (const [k, fn] of [['1', part1], ['2', part2], ['3', part3]]) {
    if (!PARTS.includes(k)) continue;
    if (k !== '1' && rm === 'no-preference' && w === 390) continue;
    if (k !== '1' && rm === 'reduce' && w === 1280) continue;
    try { await fn(w, h, rm); } catch (e) { say(false, `${w} ${rm} part ${k}: the walk could not finish (${String(e).split('\n')[0].slice(0, 200)})`); }
  }
}
await browser.close();
console.log(`reviewWalk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
