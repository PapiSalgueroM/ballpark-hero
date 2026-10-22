/* Review of Round 1533 (run lens): play it. Run from the repo root on a runner with #!serve (the head on BASE) and a
 * build of the base commit served on OLD (port 4174, started by the request line).
 * Part 1: saves made by the BASE build (desk on and off, on the hub and sitting on the old fired screen).
 * Part 2: each loaded on the head: what the player sees, and whether looking writes anything.
 * Part 3: a fresh career on the head at 390 by 844 (reduced motion) and 1280 by 900 (motion on).
 * Supabase and ad hosts aborted. Pictures to $RC_OUT/rv. Prints ok/FAIL lines and a closing summary. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const HEAD = process.env.BASE || 'http://localhost:4173';
const OLD = process.env.OLD || 'http://localhost:4174';
const OUT = path.join(process.env.RC_OUT || '.tmp-rv', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
const ROUTE = '/front-office';
const ASK = 'Win the Super Bowl. Anything less is a failed season upstairs.';
const browser = await pw.chromium.launch();
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, checks = 0;
const say = (cond, msg) => { checks++; if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); };
const note = msg => console.log(`  NOTE ${msg}`);

async function openPage(w, h, motion) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}
const readSave = page => page.evaluate(k => localStorage.getItem(k), KEY);
const writeSave = (page, s) => page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, typeof s === 'string' ? s : JSON.stringify(s)]);
const parsed = async page => JSON.parse((await readSave(page)) || 'null');
const slug = t => t.toLowerCase().replace(/[^a-z]+/g, '-');
async function shot(page, name) {
  try {
    const [w, h] = await page.evaluate(() => [window.innerWidth, Math.min(1600, document.documentElement.scrollHeight)]);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: w, height: h }, fullPage: true });
  } catch (e) { note(`no picture ${name}: ${String(e).slice(0, 120)}`); }
}
/** Nothing wider than the screen; under reduced motion nothing animating; tiny text in this round's scopes. */
async function look(page, tag, motion) {
  const r = await page.evaluate(() => {
    const wide = document.documentElement.scrollWidth - window.innerWidth;
    const moving = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.animationName === 'none' || cs.animationPlayState !== 'running') continue;
      const raw = cs.animationDuration.split(',')[0].trim();
      const secs = raw.endsWith('ms') ? parseFloat(raw) / 1000 : parseFloat(raw);
      const b = el.getBoundingClientRect();
      if (secs > 0.02 && b.width > 0 && b.height > 0) moving.push(`${el.tagName.toLowerCase()}[${String(el.className).slice(0, 60)}] ${cs.animationName} ${raw}`);
    }
    const small = [];
    for (const root of document.querySelectorAll('[data-gm-out-of-work], [data-gm-desk="panel"], [data-verdict-reveal]')) {
      for (const el of root.querySelectorAll('*')) {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 11) small.push(`${el.textContent.trim().slice(0, 40)} ${px}px`);
      }
    }
    return { wide, moving, small };
  });
  say(r.wide <= 0, `${tag}: nothing wider than the screen (${r.wide}px over)`);
  if (motion === 'reduce') say(r.moving.length === 0, `${tag}: nothing animating under reduced motion (${r.moving.slice(0, 4).join(' ; ') || 'none'})`);
  else note(`${tag}: ${r.moving.length} elements animating with motion on`);
  say(r.small.length === 0, `${tag}: no text under 11 px in the round's screens (${r.small.slice(0, 4).join(' ; ') || 'none'})`);
}
async function startClub(page, base) {
  await page.goto(`${base}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('.grid button').first().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', KEY, { timeout: 30000 });
  await wait(600);
}
async function reloadWith(page, s) {
  await writeSave(page, s);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await wait(300);
}
async function playFinal(page) {
  await page.locator('button:has(div.uppercase)').filter({ hasText: /This week/i }).first().click();
  await wait(400);
  await page.locator('button:has-text("Play the final week")').last().click();
  await page.waitForFunction(k => ['recap', 'fired'].includes(JSON.parse(localStorage.getItem(k) || '{}').phase), KEY, { timeout: 30000 });
  await wait(1800);
}
function doom(s) {
  s.trust = 5;
  s.mandate = { tier: 'title', text: ASK, winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  s.league.week = 17;
  return s;
}
const box = (page, title) => page.locator(`[data-gm-desk="tiles"] button:has(div.uppercase:text-is("${title}"))`).first();
const back = async page => { const b = page.locator('[data-gm-desk="panel"] button:has-text("Hub")').first(); if (await b.count()) await b.click(); await wait(400); };
async function openBox(page, title) {
  await box(page, title).click();
  const ok = await page.locator('[data-gm-desk="panel"]').first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  await wait(700);
  return ok;
}
/** The Job market box, the first offer opened, armed, taken. Returns the save after, or null. */
async function takeFirst(page, tag, pics) {
  if (!(await openBox(page, 'Job market'))) { say(false, `${tag}: the Job market box opens`); return null; }
  await page.locator('[data-gm-market]:not([data-gm-market="held"])').first().waitFor({ timeout: 20000 }).catch(() => {});
  const state = await page.locator('[data-gm-market]').first().getAttribute('data-gm-market').catch(() => null);
  note(`${tag}: market state ${state}`);
  if (pics) await shot(page, `${pics}-market`);
  const offer = page.locator('[data-gm-offer]').first();
  if (!(await offer.count())) { say(false, `${tag}: an offer to take (market ${state})`); return null; }
  await offer.click();
  await wait(400);
  const take = page.locator('[data-gm-take]').first();
  await take.click();
  await wait(300);
  if (pics) await shot(page, `${pics}-armed`);
  const armed = await readSave(page);
  await take.click();
  const moved = await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'recap', KEY, { timeout: 20000 }).then(() => true, () => false);
  say(moved, `${tag}: two taps take the seat (the save goes to the arrival recap)`);
  await wait(1800);
  return { armed, after: await parsed(page) };
}
/** The room, the draft, to the hub. */
async function draftToHub(page, tag) {
  const press = page.locator('[data-gm-press] button').first();
  if (await press.count()) { await press.click(); await wait(600); }
  const go = page.locator('button:has-text("Go to the draft")').first();
  if (!(await go.count())) { say(false, `${tag}: the arrival recap offers the draft`); return; }
  await go.click();
  await wait(800);
  for (let n = 0; n < 40 && (await parsed(page)).phase === 'draft'; n++) {
    const pick = page.getByText(/· age \d+/).first();
    if (await pick.count()) { await pick.click(); await wait(450); continue; }
    const skip = page.locator('button').filter({ hasText: /no picks|without/i }).first();
    if (!(await skip.count())) break;
    await skip.click();
    await wait(600);
  }
  const cont = page.locator('button:has-text("Continue")').first();
  if (await cont.count()) { await cont.click(); await wait(800); }
  say((await parsed(page)).phase === 'hub', `${tag}: the new club's draft runs to the hub`);
}

/* ------------------------------ Part 1: saves made by the base build ------------------------------ */
const old = {};
{
  const { ctx, page } = await openPage(390, 844, 'reduce');
  await startClub(page, OLD);
  old.hubOn = await readSave(page);
  await reloadWith(page, doom(JSON.parse(old.hubOn)));
  await playFinal(page);
  await shot(page, 'base-fired-recap-390');
  old.firedOn = await readSave(page);
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  await startClub(page, OLD);
  const s = JSON.parse(await readSave(page));
  delete s.gm;
  old.hubOff = JSON.stringify(s);
  await reloadWith(page, doom(JSON.parse(old.hubOff)));
  await playFinal(page);
  await reloadWith(page, await readSave(page));
  await shot(page, 'base-fired-screen-390');
  old.firedOff = await readSave(page);
  await ctx.close();
}
for (const [k, v] of Object.entries(old)) {
  const s = JSON.parse(v || 'null');
  note(`base save ${k}: phase ${s?.phase} fired ${s?.fired} desk ${s?.gm ? Object.keys(s.gm.blocks || {}).join('+') : 'off'} season ${s?.league?.season}`);
}
say(JSON.parse(old.firedOn || '{}').fired === true && !!JSON.parse(old.firedOn).gm, 'base: a fired save with the desk on was made');
say(JSON.parse(old.firedOff || '{}').fired === true && !JSON.parse(old.firedOff).gm, 'base: a fired save with the desk off was made');

/* ------------------------------ Part 2: each base save on the head ------------------------------ */
async function onHead(name, json, fn) {
  const { ctx, page, errors } = await openPage(390, 844, 'reduce');
  try {
    await page.goto(`${HEAD}${ROUTE}`, { waitUntil: 'networkidle' });
    await wait(700);
    await answerConsent(page);
    await reloadWith(page, json);
    await fn(page);
  } catch (e) { say(false, `${name}: the walk ran to its end (${String(e).slice(0, 200)})`); }
  say(errors.length === 0, `${name}: no console error (${errors.slice(0, 2).join(' | ').slice(0, 300)})`);
  await ctx.close();
}
for (const [name, key, deskOn] of [['old fired desk on', 'firedOn', true], ['old fired desk off', 'firedOff', false]]) {
  if (!old[key]) continue;
  await onHead(name, old[key], async page => {
    const tag = slug(name);
    say(await page.locator('[data-gm-out-of-work]').count() === 1, `${name}: the reload opens on the out of work screen`);
    say(await page.locator('[data-gm-out-of-work] [data-gm-desk="tiles"] button').count() === 3, `${name}: three boxes`);
    const card = await page.locator('[data-gm-out-card]').innerText().catch(() => '');
    note(`${name}: card reads: ${card.replace(/\s+/g, ' ').slice(0, 300)}`);
    await shot(page, `${tag}-390`);
    await look(page, `${name} out of work`, 'reduce');
    const before = await readSave(page);
    for (const t of ['Job market', 'Career', 'GM level']) {
      say(await openBox(page, t), `${name}: the ${t} box opens`);
      const txt = await page.locator('[data-gm-desk="panel"]').first().innerText().catch(() => '');
      note(`${name} ${t}: ${txt.replace(/\s+/g, ' ').slice(0, 260)}`);
      await shot(page, `${tag}-${slug(t)}-390`);
      await look(page, `${name} ${t}`, 'reduce');
      await back(page);
    }
    say((await readSave(page)) === before, `${name}: looking at the three boxes writes nothing to the save`);
    if (!deskOn) {
      const sit = page.locator('[data-gm-sit-out]').first();
      if (await openBox(page, 'Job market') && await sit.count()) {
        await sit.click(); await wait(300);
        await shot(page, `${tag}-sit-armed-390`);
        await sit.click();
        await page.waitForFunction(([k, s]) => JSON.parse(localStorage.getItem(k) || '{}').league?.season === s + 1, [KEY, JSON.parse(before).league.season], { timeout: 30000 }).catch(() => {});
        await wait(1200);
        const s = await parsed(page);
        say(!!s.gm && s.gm.blocks?.seat?.career?.seasonsOut === 1, `${name}: a year out opens the desk for good and writes one season out`);
        say(s.seasonsPlayed === JSON.parse(before).seasonsPlayed && s.phase === 'fired', `${name}: a year out moves no counter and stays out of work`);
        await shot(page, `${tag}-after-year-out-390`);
        await look(page, `${name} after a year out`, 'reduce');
        return;
      }
      await back(page);
    }
    const r = await takeFirst(page, name, `${tag}`);
    if (!r) return;
    say(r.armed === before, `${name}: one tap on take only arms`);
    const s = r.after;
    say(!!s.gm?.blocks?.seat && s.fired === false && s.trust === 60, `${name}: the take writes his record, trust 60, not fired`);
    const recap = await page.locator('[data-verdict-reveal]').innerText().catch(() => '');
    note(`${name}: arrival recap reads: ${recap.replace(/\s+/g, ' ').slice(0, 300)}`);
    say(/You take over the/.test(recap), `${name}: the arrival line`);
    await shot(page, `${tag}-arrival-390`);
    await look(page, `${name} arrival`, 'reduce');
  });
}
for (const [name, key, deskOn] of [['old hub desk on', 'hubOn', true], ['old hub desk off', 'hubOff', false]]) {
  if (!old[key]) continue;
  const s0 = JSON.parse(old[key]);
  s0.league.week = 17;
  await onHead(name, s0, async page => {
    const tag = slug(name);
    await playFinal(page);
    const s = await parsed(page);
    note(`${name}: after the final week phase ${s.phase} trust ${s.trust} fired ${s.fired} desk ${s.gm ? Object.keys(s.gm.blocks).join('+') : 'off'}`);
    if (deskOn) say(!!s.gm?.blocks?.seat && !!s.gm?.blocks?.xp, `${name}: the graded season writes his record and XP`);
    else say(s.gm === undefined, `${name}: a desk off save writes no desk at the close`);
    const xp = await page.locator('[data-gm-xp-recap]').innerText().catch(() => '');
    note(`${name}: recap XP line: ${xp || '(none)'}`);
    if (deskOn) say(xp.length > 0, `${name}: the recap prints what the season paid`);
    else say(xp.length === 0, `${name}: no XP line with the desk off`);
    await shot(page, `${tag}-recap-390`);
    await look(page, `${name} recap`, 'reduce');
  });
}

/* ------------------------------ Part 3: a fresh career on the head ------------------------------ */
for (const [w, h, motion] of [[390, 844, 'reduce'], [1280, 900, 'no-preference']]) {
  const tag = `fresh-${w}`;
  const { ctx, page, errors } = await openPage(w, h, motion);
  try {
    await startClub(page, HEAD);
    const s0 = doom(JSON.parse(await readSave(page)));
    await reloadWith(page, s0);
    await playFinal(page);
    await shot(page, `${tag}-recap-fired`);
    await look(page, `${tag} fired recap`, motion);
    const reveal = await page.locator('[data-verdict-reveal]').innerText().catch(() => '');
    note(`${tag}: fired recap reads: ${reveal.replace(/\s+/g, ' ').slice(0, 400)}`);
    const callBtn = page.locator('button:has-text("See who is calling")').first();
    say(await callBtn.count() === 1, `${tag}: the fired recap offers who is calling`);
    say(await page.locator('button:has-text("Take another front office")').count() === 0, `${tag}: no button on the recap deletes the save`);
    const chairLine = await page.locator('p.text-destructive').first().innerText().catch(() => '');
    say(chairLine.replace(/[^A-Za-z]/g, '').length > 10, `${tag}: the recap's fired box says what the phone did (${chairLine.slice(0, 120)})`);
    await callBtn.click();
    await wait(1000);
    say(await page.locator('[data-gm-out-of-work]').count() === 1, `${tag}: who is calling opens the out of work screen`);
    await shot(page, `${tag}-out-of-work`);
    await look(page, `${tag} out of work`, motion);
    const y0 = await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
    const r = await takeFirst(page, tag, tag);
    note(`${tag}: scroll and height on the out of work screen before the market ${JSON.stringify(y0)}`);
    if (r) {
      const recap = await page.locator('[data-verdict-reveal]').innerText().catch(() => '');
      note(`${tag}: arrival recap reads: ${recap.replace(/\s+/g, ' ').slice(0, 400)}`);
      say(/You take over the/.test(recap), `${tag}: the arrival line`);
      await shot(page, `${tag}-arrival`);
      await look(page, `${tag} arrival`, motion);
      const feed = await page.locator('body').innerText();
      say(!/Your build\. Your rings\./.test(feed), `${tag}: no title of his staged on the arrival`);
      await draftToHub(page, tag);
      await shot(page, `${tag}-hub`);
      await look(page, `${tag} hub`, motion);
      for (const t of ['Career', 'GM level']) {
        const ok = await openBox(page, t);
        say(ok, `${tag}: the hub's ${t} box opens`);
        const txt = await page.locator('[data-gm-desk="panel"]').first().innerText().catch(() => '');
        note(`${tag} hub ${t}: ${txt.replace(/\s+/g, ' ').slice(0, 300)}`);
        await shot(page, `${tag}-hub-${slug(t)}`);
        await look(page, `${tag} hub ${t}`, motion);
        await back(page);
      }
    }
  } catch (e) { say(false, `${tag}: the walk ran to its end (${String(e).slice(0, 200)})`); }
  say(errors.length === 0, `${tag}: no console error (${errors.slice(0, 2).join(' | ').slice(0, 300)})`);
  await ctx.close();
}

await browser.close();
console.log(`review walk: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
