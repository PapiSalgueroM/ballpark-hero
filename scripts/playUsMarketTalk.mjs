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
 * Release AX fix pass, two more journeys, in all four sports:
 *   spent     THE PUSH SPENT STAYS SPENT (the recording reviewer's major 2: nothing in the release could fail when
 *             a spent push came back after a reload, the reroll the saved talks exist to stop). On the recording's
 *             named saves faTalk (a free agency window, not pushed) and extTalk (an extension talk; in MLB and the
 *             NHL the club made no offer there, so nothing can be pushed and the journey is said, not counted):
 *             push once, Skip animation, Continue, RELOAD. The push control is then exactly what it was before the
 *             reload and is not enabled, a press on it opens no wheel, and the save bytes did not move.
 *             spent-wheel, on the way: a reload AT the wheel, before it is spun or skipped, lands on the wheel
 *             again on the same save bytes, because the push is written the moment it is made.
 *   view      THE WHEEL AND THE ANSWER COME INTO VIEW BY THEMSELVES (the screens reviewer's major 1: a push on a
 *             lower offer swapped the 850 to 1,100 px offers window for a 375 to 430 px wheel, and the wheel was
 *             left wholly above a phone's window in every sport). On the fixed save "fa" at 390 by 844 and at 320
 *             by 568: Play opens the window, the LOWEST offer's Push for more is put in the middle of the window
 *             by the walk's own instant scroll and pressed as a DOM click (so the walk moves nothing afterwards).
 *             view-wheel: the wheel's top is inside the window, its heading whole, and all of it shows when it is
 *             shorter than the window. view-offer: after Skip and Continue the pushed offer's card, with its
 *             receipt line, is whole inside the window.
 *
 * Math.random is seeded with ANOTHER number on every load of a tab (20261011 plus 7919 a load). The first draft
 * seeded every load alike, so "the same offer after a reload" could not tell a restored talk from one drawn
 * again on the same draws (the engine reviewer's finding 5). The first load's seed is the old one.
 *
 * NEGATIVE CONTROLS (US_MARKET_TALK_CONTROL), each exits 1 with FIRED and 2 when it changed nothing or went red
 * for another reason, because a control that changed nothing proves nothing:
 *   droptalk  before the reload the walk takes contractTalk off the stored save, which is what a build that did
 *             not save the talk leaves behind. The reload check must go red in both sports (the hub comes back,
 *             not the talk), and nothing else.
 *   unspend   before the reload of journey "spent" the walk puts back the save as it stood BEFORE the push, which
 *             is what a build that never wrote the push, or forgot it on load, leaves a player with. Every spent
 *             check must go red (the push control is enabled again), and nothing else.
 *   noreveal  Element.prototype.scrollIntoView does nothing, which is the board with its reveal taken out again.
 *             Every view-wheel check must go red (the wheel is left above the window), and only view checks.
 *
 * Run: npm run build, then node scripts/playUsMarketTalk.mjs   (PORT to move the server, ENGINES=chromium)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { noteIntlCallTotals, watchIntlCalls } from './lib/intlCallNote.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4611);
const BASE = `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.US_MARKET_TALK_CONTROL || '';
if (CONTROL && !['droptalk', 'unspend', 'noreveal'].includes(CONTROL)) { console.error(`unknown US_MARKET_TALK_CONTROL ${CONTROL}`); process.exit(2); }
/* SPORTS: the two with a Week by week entry on this save, for the journeys past, reload, sign, decline and plan.
   ALL: the four the shared board serves, for the journeys spent and view. */
const SPORTS = { nfl: { route: '/nfl-my-career', key: 'nfl-my-career-save-v1' }, mlb: { route: '/mlb-my-career', key: 'mlb-my-career-save-v1' } };
const ALL = { ...SPORTS, nba: { route: '/nba-my-career', key: 'nba-my-career-save-v1' }, nhl: { route: '/nhl-my-career', key: 'nhl-my-career-save-v1' } };
const PHONE = { width: 390, height: 844 }, SMALL = { width: 320, height: 568 };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

let checks = 0, failed = 0;
const failures = [];
const check = (name, cond, line) => { checks += 1; if (cond) console.log(`ok   ${name}: ${line}`); else { failed += 1; failures.push(name); console.log(`FAIL ${name}: ${line}`); } };

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let aborted = 0;
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

/** A phone on a save: the save is put down once (a reload keeps what the board wrote). Math.random is seeded,
    with another number on every load of the tab, so a talk drawn again after a reload would not look restored. */
async function open(slug, raw, size = PHONE) {
  const ctx = await browser.newContext({ viewport: size });
  await ctx.addInitScript(([k, v, route, dead]) => {
    const loads = Number(sessionStorage.getItem('market-talk-loads') || '0');
    sessionStorage.setItem('market-talk-loads', String(loads + 1));
    let a = 20261011 + loads * 7919;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    /* control noreveal: nothing on the page can scroll an element into view (the walk's own window.scrollTo still can) */
    if (dead) Element.prototype.scrollIntoView = function scrollIntoViewTakenOut() { /* the reveal taken out */ };
    if (!sessionStorage.getItem('market-talk-seeded')) {
      sessionStorage.setItem('market-talk-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(k, v);
      /* a returning player: the first visit rules dialog (GameHelp) has been seen, so it does not stand over the hub */
      localStorage.setItem('rules-gate-seen:' + route, '1');
      for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1');
    }
  }, [ALL[slug].key, raw, ALL[slug].route, CONTROL === 'noreveal']);
  await ctx.route('**://*.supabase.co/**', r => { aborted += 1; return r.abort(); });
  const page = await ctx.newPage();
  /* Round 1557 (critic-1541 correction 9): the NBA journeys print whether their saves met the national team's call. */
  if (slug === 'nba') await watchIntlCalls(page);
  await page.goto(`${BASE}${ALL[slug].route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page };
}
/** What a control is: enabled, disabled, or absent. */
const stateOf = (page, sel) => page.evaluate(q => { const b = document.querySelector(q); return b ? (b.disabled ? 'disabled' : 'enabled') : 'absent'; }, sel);
/** Wait until the page has stopped scrolling: the same scrollY five readings running, 100 ms apart (6 s at most). */
const settle = async page => {
  let last = -1, same = 0;
  for (let i = 0; i < 60 && same < 5; i += 1) {
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    same = y === last ? same + 1 : 0; last = y;
  }
  return last;
};
/** An element's box against the window: its edges, its height and how much of its height is inside the window. */
const boxOf = (page, sel) => page.evaluate(q => {
  const el = document.querySelector(q); if (!el) return null;
  const r = el.getBoundingClientRect(), vh = window.innerHeight;
  const inside = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), vh, shown: r.height ? Math.round(100 * inside / r.height) : 0 };
}, sel);
const WHEEL = '[data-market-wheel]', WINDOW = '[data-fa-window]';
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
  for (const slug of (CONTROL && CONTROL !== 'droptalk') ? [] : Object.keys(SPORTS)) {
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

  /* D, spent: push once, Skip, Continue, reload. The push must still be spent. */
  for (const slug of (!CONTROL || CONTROL === 'unspend') ? Object.keys(ALL) : []) for (const name of ['faTalk', 'extTalk']) {
    const { key } = ALL[slug];
    const tag = `${slug} 390x844 save ${name}`;
    const root = name === 'faTalk' ? WINDOW : TALK, push = name === 'faTalk' ? '[data-fa-push="0"]' : '[data-ext-push]';
    const { ctx, page } = await open(slug, fixture.sports[slug].saves[name]);
    await page.locator(root).waitFor({ state: 'visible', timeout: 30000 });
    const first = await stateOf(page, push);
    if (first !== 'enabled') { console.log(`     ${tag}: nothing can be pushed on this save (the push control is ${first}), so this journey is said and not counted`); await ctx.close(); continue; }
    const unpushed = await saved(page, key);
    await press(page, push);
    await page.locator(WHEEL).waitFor({ state: 'visible', timeout: 15000 });
    const result = (await parsed(page, key))?.contractTalk?.wheel?.result ?? 'no wheel on the save';
    /* a reload AT the wheel, before it is spun or skipped: the push was written the moment it was made, so the
       wheel is there again on the same bytes. (A build that wrote the push only at Continue passes every check
       below and fails this one: measured, the engine reviewer's mutation M4.) */
    const atWheel = await saved(page, key);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const wheelBack = await page.locator(WHEEL).waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
    const wheelBytes = (await saved(page, key)) === atWheel;
    check('spent-wheel', wheelBack && wheelBytes, `${tag}: a reload at the wheel, before it is spun or skipped, lands on the wheel again (${wheelBack}) on the same save bytes (${wheelBytes})`);
    if (!wheelBack) { await ctx.close(); continue; }
    await press(page, '[data-market-skip]');
    await press(page, '[data-market-continue]');
    await page.locator(WHEEL).waitFor({ state: 'detached', timeout: 15000 });
    await page.locator(root).waitFor({ state: 'visible', timeout: 15000 });
    const before = await stateOf(page, push), bytes = await saved(page, key);
    if (CONTROL === 'unspend') {
      if (unpushed === bytes) { console.error(`control unspend refused: the push changed nothing on the ${tag}`); stop(2); }
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, unpushed]);
      controlRan += 1;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    const back = await page.locator(root).waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
    const after = back ? await stateOf(page, push) : 'no talk on screen';
    /* press it whatever it is: a disabled or absent control must open nothing, an enabled one shows the reroll */
    await page.evaluate(q => document.querySelector(q)?.click(), push);
    const again = await page.locator(WHEEL).waitFor({ state: 'visible', timeout: after === 'enabled' ? 5000 : 1200 }).then(() => true, () => false);
    const now = await saved(page, key);
    const second = again ? `A SECOND PUSH WAS TAKEN: a wheel opened again and the save now holds ${(await parsed(page, key))?.contractTalk?.wheel?.result}` : 'a press on it opened no wheel';
    check('spent', before !== 'enabled' && back && after === before && !again && now === bytes,
      `${tag}: the one push came up ${result}; the push control was ${before} after the wheel and is ${after} after a reload; ${second}; the save bytes ${now === bytes ? 'did not move' : 'MOVED'}`);
    await ctx.close();
  }

  /* E, view: the lowest offer pushed from the middle of the window; the wheel, then the answer, must be in view. */
  for (const slug of (!CONTROL || CONTROL === 'noreveal') ? Object.keys(ALL) : []) for (const size of [PHONE, SMALL]) {
    const tag = `${slug} ${size.width}x${size.height}`;
    const { ctx, page } = await open(slug, fixture.sports[slug].saves.fa, size);
    await play(page).waitFor({ state: 'visible', timeout: 30000 });
    await pressPlay(page);
    await page.locator(WINDOW).waitFor({ state: 'visible', timeout: 30000 });
    await settle(page);
    const lowest = (await page.locator('[data-fa-offer]').count()) - 1;
    const push = `[data-fa-push="${lowest}"]`, card = `[data-fa-offer="${lowest}"]`;
    if (await stateOf(page, push) !== 'enabled') { console.log(`     ${tag}: the lowest offer (${lowest + 1}) cannot be pushed on this save, so this journey is said and not counted`); await ctx.close(); continue; }
    await page.evaluate(q => { const r = document.querySelector(q).getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2, behavior: 'instant' }); }, push);
    const pressedAt = await settle(page);
    const tall = await boxOf(page, WINDOW);
    await press(page, push);
    await page.locator(WHEEL).waitFor({ state: 'attached', timeout: 15000 });
    const wheelAt = await settle(page);
    const wheel = await boxOf(page, WHEEL), head = await boxOf(page, `${WHEEL} h2`);
    if (CONTROL === 'noreveal') controlRan += 1;
    check('view-wheel', !!wheel && !!head && wheel.top >= -1 && wheel.top < wheel.vh && head.top >= -1 && head.bottom <= head.vh + 1 && (wheel.height > wheel.vh || wheel.shown === 100),
      `${tag}: offer ${lowest + 1} of ${lowest + 1} pushed with its button in the middle of the window (scrollY ${pressedAt}, the offers window ${tall?.height} px tall); the wheel is ${wheel?.height} px tall, its top at ${wheel?.top} and its bottom at ${wheel?.bottom} of ${wheel?.vh}, ${wheel?.shown}% of it in the window, its heading at ${head?.top} to ${head?.bottom} (scrollY now ${wheelAt})`);
    await press(page, '[data-market-skip]');
    await press(page, '[data-market-continue]');
    await page.locator(WINDOW).waitFor({ state: 'visible', timeout: 15000 });
    const backAt = await settle(page);
    const offer = await boxOf(page, card), receipt = await boxOf(page, `${card} [data-fa-result]`);
    check('view-offer', !!offer && offer.top >= -1 && offer.bottom <= offer.vh + 1 && !!receipt && receipt.shown === 100,
      `${tag}: after Continue the pushed offer's card is at ${offer?.top} to ${offer?.bottom} of ${offer?.vh} (${offer?.shown}% in the window) and its receipt line ${receipt ? `at ${receipt.top} to ${receipt.bottom} (${receipt.shown}% in the window)` : 'is not on the card'} (scrollY now ${backAt})`);
    await ctx.close();
  }
} catch (e) {
  failed += 1; failures.push('crash');
  console.log(`FAIL the walk stopped: ${String(e?.stack ?? e).split('\n').slice(0, 16).join(' | ')}`);
}
await browser.close();
console.log(`     ${aborted} requests to the live database were aborted by the walk's own route`);
noteIntlCallTotals('playUsMarketTalk, the NBA journeys');
console.log(`playUsMarketTalk: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
if (CONTROL === 'droptalk') {
  const own = failures.length > 0 && failures.every(f => f === 'reload') && failures.length === controlRan;
  console.log(own ? `CONTROL droptalk: FIRED. The reload check went red in ${controlRan} sports and nothing else did.` : `CONTROL droptalk: DID NOT FIRE as its own (failures: ${failures.join(', ') || 'none'}; the talk was taken off ${controlRan} saves).`);
  stop(own ? 1 : 2);
}
if (CONTROL === 'unspend') {
  const own = controlRan > 0 && failures.length === controlRan && failures.every(f => f === 'spent');
  console.log(own ? `CONTROL unspend: FIRED. The spent check went red in all ${controlRan} journeys that pushed (the push control came back enabled) and nothing else did.` : `CONTROL unspend: DID NOT FIRE as its own (failures: ${failures.join(', ') || 'none'}; the save from before the push was put back ${controlRan} times).`);
  stop(own ? 1 : 2);
}
if (CONTROL === 'noreveal') {
  const wheels = failures.filter(f => f === 'view-wheel').length;
  const own = controlRan > 0 && wheels === controlRan && failures.every(f => f === 'view-wheel' || f === 'view-offer');
  console.log(own ? `CONTROL noreveal: FIRED. With nothing able to scroll an element into view the wheel was left outside the window in all ${controlRan} journeys (${failures.length - wheels} of them lost the pushed offer after Continue as well), and no other check went red.` : `CONTROL noreveal: DID NOT FIRE as its own (failures: ${failures.join(', ') || 'none'}; ${controlRan} journeys ran).`);
  stop(own ? 1 : 2);
}
stop(failed ? 1 : 0);
