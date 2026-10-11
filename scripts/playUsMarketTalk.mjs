/**
 * Release AX, step d6: a saved contract talk and the two ways to play a season, in a real browser.
 *
 * Since the other lane's Rounds 1230 to 1234 a contract talk in the four US careers is saved with the career
 * (phase extension or freeagency and a contractTalk beside it). The shared board hands ONE playSeason to both
 * ways of playing a year: the Play button and this lane's Week by week entry (Round 1048, MLB bound in Round
 * 1212). This walk holds, on the built site at 390 by 844, in the NFL and in MLB, on the fixed save "ext" of
 * the board recording (scripts/data/usBoardFixture.json: a career in the last year of its deal, as main wrote it):
 *   past      with a talk due, Week by week cannot play past it: the press opens the talk, the viewer does not
 *             open and no season is on the save
 *   reload    a reload lands on the same talk: the same offer, the same save bytes
 *   sign      Sign puts the years on the deal, takes the talk off the save and returns to the hub; Week by week
 *             then plays the season it could not play past the talk, and the viewer opens on it
 *   decline   Decline is "play the year out": it plays the season by itself, and the curtain is on screen
 *   plan      the planning panel (the season programme): a plan is prepared, Play opens the talk, and after a
 *             reload the talk is open again with the plan still on the save
 * Every request to supabase.co is aborted and counted.
 *
 * NEGATIVE CONTROL (US_MARKET_TALK_CONTROL=droptalk): before the reload the walk takes contractTalk off the
 * stored save, which is what a build that did not save the talk leaves behind. The reload check must then go
 * red in both sports (the hub comes back, not the talk), and nothing else. Exit 1 with FIRED; exit 2 when the
 * save held no talk to take off, because a control that changed nothing proves nothing.
 *
 * Run: npm run build, then node scripts/playUsMarketTalk.mjs   (PORT to move the server, ENGINES=chromium)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4611);
const BASE = `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.US_MARKET_TALK_CONTROL || '';
if (CONTROL && CONTROL !== 'droptalk') { console.error(`unknown US_MARKET_TALK_CONTROL ${CONTROL}`); process.exit(2); }
const SPORTS = { nfl: { route: '/nfl-my-career', key: 'nfl-my-career-save-v1' }, mlb: { route: '/mlb-my-career', key: 'mlb-my-career-save-v1' } };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

let checks = 0, failed = 0;
const failures = [];
const check = (name, cond, line) => { checks += 1; if (cond) console.log(`ok   ${name}: ${line}`); else { failed += 1; failures.push(name); console.log(`FAIL ${name}: ${line}`); } };

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let aborted = 0;
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

/** A phone on a save: the save is put down once (a reload keeps what the board wrote), Math.random is seeded. */
async function open(slug, raw) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([k, v]) => {
    let a = 20261011;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (!sessionStorage.getItem('market-talk-seeded')) {
      sessionStorage.setItem('market-talk-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(k, v);
      for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1');
    }
  }, [SPORTS[slug].key, raw]);
  await ctx.route('**://*.supabase.co/**', r => { aborted += 1; return r.abort(); });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${SPORTS[slug].route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page };
}
const saved = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
const parsed = async (page, key) => JSON.parse((await saved(page, key)) || 'null');
const seasonsOf = s => s?.c?.seasons?.length ?? -1;
const play = page => page.getByRole('button', { name: /^Play the [0-9]+ season$/ });
const WEEK = '[data-season-centre-entry] [data-week-by-week]';
/* Presses are DOM clicks, as in this lane's other US walks: a Playwright click scrolls the page first, and the
   hub must not be moved by the walk that measures it. What sits under the button is printed, not assumed. */
const press = async (page, sel) => {
  await page.locator(sel).first().waitFor({ state: 'attached', timeout: 30000 });
  return page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel);
};
const pressPlay = page => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Play the [0-9]+ season$/.test((x.textContent || '').trim())); if (!b) return false; b.click(); return true; });
const under = (page, sel) => page.evaluate(q => {
  const el = document.querySelector(q); if (!el) return 'no such element';
  const r = el.getBoundingClientRect(); const y = r.top + r.height / 2;
  if (y < 0 || y > window.innerHeight) return 'the button is outside the first screen (its centre at y ' + Math.round(y) + ' of ' + window.innerHeight + ')';
  const top = document.elementFromPoint(r.left + r.width / 2, y);
  if (top === el || el.contains(top)) return 'the button itself';
  if (!top) return 'nothing';
  /* something else is on top: say what it reads and which fixed or sticky box holds it */
  let box = 'no fixed or sticky ancestor';
  for (let n = top; n; n = n.parentElement) {
    const p = getComputedStyle(n).position;
    if (p === 'fixed' || p === 'sticky') { box = `${p} <${n.tagName.toLowerCase()} ${[...n.attributes].slice(0, 2).map(a => a.name + '="' + a.value.slice(0, 50) + '"').join(' ')}>`; break; }
  }
  return `<${top.tagName.toLowerCase()}> reading "${(top.textContent || '').trim().slice(0, 50)}", inside ${box}; the button's box is ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} in a ${window.innerWidth}x${window.innerHeight} window`;
}, sel);
const TALK = '[data-extension-talk]';
const offerOf = page => page.evaluate(() => {
  const card = document.querySelector('[data-extension-talk]');
  return card ? { salary: card.querySelector('[data-ext-salary]')?.getAttribute('data-ext-salary') ?? null, words: (card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400) } : null;
});

let controlRan = 0;
try {
  for (const slug of Object.keys(SPORTS)) {
    const { route, key } = SPORTS[slug];
    const raw = fixture.sports[slug].saves.ext;
    const start = JSON.parse(raw);
    const tag = `${slug} 390x844`;

    /* A: Week by week first, then a reload, then Decline, then Week by week again. */
    {
      const { ctx, page } = await open(slug, raw);
      await play(page).waitFor({ state: 'visible', timeout: 30000 });
      const week = page.locator(WEEK);
      check('past', await week.count() === 1 && start.phase === 'season' && start.contractTalk === undefined && start.c.contractYears === 1,
        `${tag}: the save is one main wrote in the last year of a deal (phase ${start.phase}, ${start.c.contractYears} year left, no talk) and the hub offers Week by week (${await week.count()})`);
      console.log(`     ${tag}: under the centre of Week by week, the page not moved: ${await under(page, WEEK)}`);
      await press(page, WEEK);
      await page.locator(TALK).waitFor({ state: 'visible', timeout: 30000 });
      const held = await parsed(page, key);
      const viewer = await page.locator('[data-us-season-centre]').count();
      check('past', viewer === 0 && seasonsOf(held) === seasonsOf(start) && held.phase === 'extension' && held.contractTalk?.kind === 'extension',
        `${tag}: Week by week opened the talk and played nothing (viewer ${viewer}, ${seasonsOf(held)} seasons as before, saved phase ${held.phase}, talk ${held.contractTalk?.kind})`);
      const before = await offerOf(page), bytes = await saved(page, key);
      if (CONTROL === 'droptalk') {
        const took = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); if (!s.contractTalk) return false; delete s.contractTalk; localStorage.setItem(k, JSON.stringify(s)); return true; }, key);
        if (!took) { console.error(`control droptalk refused: the ${slug} save holds no talk to take off`); stop(2); }
        controlRan += 1;
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      const back = await page.locator(TALK).waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
      const after = back ? await offerOf(page) : null;
      check('reload', back && JSON.stringify(after) === JSON.stringify(before) && (await saved(page, key)) === bytes,
        `${tag}: a reload lands on the same talk (talk on screen ${back}, the same offer ${after?.salary ?? 'none'} against ${before?.salary}, the same save bytes ${(await saved(page, key)) === bytes})`);
      /* Sign returns to the hub; Week by week then plays the season it could not play past the talk. A club
         that made no offer leaves only "play the year out", which is journey B's subject, so it is said and
         not counted here. */
      if (back && await page.locator('[data-ext-sign]').count() === 1) {
        await press(page, '[data-ext-sign]');
        await play(page).waitFor({ state: 'visible', timeout: 15000 });
        const signed = await parsed(page, key);
        await press(page, WEEK);
        const up = await page.locator('[data-us-season-centre]').waitFor({ state: 'visible', timeout: 60000 }).then(() => true, () => false);
        const played = await parsed(page, key);
        check('sign', up && seasonsOf(played) === seasonsOf(start) + 1 && seasonsOf(signed) === seasonsOf(start) && signed.c.contractYears > 1 && signed.contractTalk === undefined,
          `${tag}: Sign put ${signed.c.contractYears} years on the deal and took the talk off the save, and Week by week then played the season and opened the viewer (viewer ${up}, seasons ${seasonsOf(start)} then ${seasonsOf(played)})`);
      } else if (back) console.log(`     ${tag}: the club made no offer on this save, so there is nothing to sign in journey A`);
      await ctx.close();
    }
    if (CONTROL) continue;

    /* B: Play first, then Decline, which plays the year out by itself. */
    {
      const { ctx, page } = await open(slug, raw);
      await play(page).waitFor({ state: 'visible', timeout: 30000 });
      await pressPlay(page);
      await page.locator(TALK).waitFor({ state: 'visible', timeout: 30000 });
      const held = await parsed(page, key);
      await press(page, '[data-ext-decline]');
      const curtain = await page.locator('[data-season-reveal]').waitFor({ state: 'visible', timeout: 60000 }).then(() => true, () => false);
      const played = await parsed(page, key);
      check('decline', seasonsOf(held) === seasonsOf(start) && held.phase === 'extension' && curtain && seasonsOf(played) === seasonsOf(start) + 1,
        `${tag}: Play opened the talk with nothing played (saved phase ${held.phase}), and Decline played the year out (curtain ${curtain}, seasons ${seasonsOf(start)} then ${seasonsOf(played)})`);
      await ctx.close();
    }

    /* C: a plan prepared in the planning panel, then the talk, then a reload. */
    {
      const { ctx, page } = await open(slug, raw);
      await play(page).waitFor({ state: 'visible', timeout: 30000 });
      for (const sel of ['[data-us-programme-open]', '[data-us-programme-start]', '[data-us-programme-tile]', '[data-us-programme-choice][aria-pressed="false"]:not([disabled])', '[data-us-programme-close]']) await press(page, sel);
      await page.locator('[data-us-programme="dialog"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);
      const planned = await parsed(page, key);
      const plan = JSON.stringify(planned.c.programme ?? null);
      await pressPlay(page);
      await page.locator(TALK).waitFor({ state: 'visible', timeout: 30000 });
      const before = await offerOf(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const back = await page.locator(TALK).waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
      const reloaded = await parsed(page, key);
      check('plan', plan !== 'null' && back && JSON.stringify(await offerOf(page)) === JSON.stringify(before) && JSON.stringify(reloaded.c.programme ?? null) === plan && seasonsOf(reloaded) === seasonsOf(start),
        `${tag}: a plan was prepared (${plan.slice(0, 80)}), Play opened the talk, and after a reload the talk is open again on the same offer with the plan still on the save (talk ${back}, plan held ${JSON.stringify(reloaded.c.programme ?? null) === plan})`);
      await ctx.close();
    }
  }
} catch (e) {
  failed += 1; failures.push('crash');
  console.log(`FAIL the walk stopped: ${String(e?.stack ?? e).split('\n').slice(0, 16).join(' | ')}`);
}
await browser.close();
console.log(`     ${aborted} requests to the live database were aborted by the walk's own route`);
console.log(`playUsMarketTalk: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
if (CONTROL === 'droptalk') {
  const own = failures.length > 0 && failures.every(f => f === 'reload') && failures.length === controlRan;
  console.log(own ? `CONTROL droptalk: FIRED. The reload check went red in ${controlRan} sports and nothing else did.` : `CONTROL droptalk: DID NOT FIRE as its own (failures: ${failures.join(', ') || 'none'}; the talk was taken off ${controlRan} saves).`);
  stop(own ? 1 : 2);
}
stop(failed ? 1 : 0);
