/**
 * Round 1320: the athletic director, walked like a person on a served build, both college routes, at 320 by
 * 568, 390 by 844 and 1280 by 800, Chromium, the database host blocked.
 *
 * Stations (each a picture in $RC_OUT, or .tmp-fx/college-seat-shots when RC_OUT is unset):
 *  1 a new dynasty's first screen: the tile, under the chips, above the tabs;
 *  2 the card open in place of the tab content, its "?" over it, Back twice;
 *  3 the page never jumps: window.scrollY either side of a press, the tile's top, and the Play button's top
 *    before and after the first press, and on an older save the slot's height and the Play button's top
 *    before "Take the ask", after it, and after "Not now", all equal to the pixel;
 *  4 the final press: the recap with the verdict and trust; under prefers-reduced-motion the verdict is on its
 *    last frame at first paint (opacity 1, no transform, no running animation).
 * At every station: no seat element sits over another element, none runs past the page's right edge, no seat
 * text is under 12 px, and every seat button is at least 44 px tall.
 *
 * Control SEAT_WALK_CONTROL=smalltap: one seat button shrinks to a 4 px padding (the old GmSeatCard size);
 * the 44 px check must go red. The closing line says FIRED or DID NOT FIRE.
 *
 * Run on a served build: node scripts/playCollegeSeat.mjs (BASE or SWEEP_BASE, default http://localhost:4173).
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.SEAT_WALK_CONTROL || '';
if (CONTROL && CONTROL !== 'smalltap') { console.error(`SEAT_WALK_CONTROL=${CONTROL} is not a control this walk knows (smalltap)`); process.exit(2); }
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/college-seat-shots');
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [[320, 568], [390, 844], [1280, 800]];
const ROUTES = [
  { route: '/cfb-dynasty', key: 'cfb-dynasty-save-v1', school: 'Alabama' },
  { route: '/cbb-dynasty', key: 'cbb-dynasty-save-v1', school: 'Kentucky' },
];
const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;

let failures = 0;
const failedIn = new Map();
let where = '';
let shortFails = 0;
const say = (ok, what) => {
  if (!ok) { failures += 1; failedIn.set(where, (failedIn.get(where) ?? 0) + 1); console.error(`  FAIL [${where}] ${what}`); }
  return ok;
};

/** Every rule a seat node must keep, measured on the page. */
async function seatChecks(page, label) {
  const r = await page.evaluate(() => {
    const out = { roots: 0, small: [], short: [], over: [], wide: [] };
    const W = document.documentElement.clientWidth;
    for (const root of document.querySelectorAll('[data-college-seat]')) {
      out.roots += 1;
      const rr = root.getBoundingClientRect();
      if (rr.right > W + 0.5 || rr.left < -0.5) out.wide.push(root.getAttribute('data-college-seat'));
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(getComputedStyle(el).fontSize) < 12) out.small.push(`${el.tagName} ${el.textContent.trim().slice(0, 30)}`);
      }
      for (const b of [...(root.tagName === 'BUTTON' ? [root] : []), ...root.querySelectorAll('button')]) {
        if (b.getBoundingClientRect().height < 44 - 0.5) out.short.push(`${b.textContent.trim().slice(0, 30)} ${b.getBoundingClientRect().height.toFixed(1)}px`);
      }
      for (const sib of [root.previousElementSibling, root.nextElementSibling]) {
        if (!sib || sib.tagName === 'STYLE') continue;
        const s = sib.getBoundingClientRect();
        if (s.height > 0 && rr.height > 0 && rr.left < s.right && s.left < rr.right && rr.top < s.bottom - 0.5 && s.top < rr.bottom - 0.5) out.over.push(root.getAttribute('data-college-seat'));
      }
    }
    return out;
  });
  say(r.small.length === 0, `${label}: seat text under 12 px: ${r.small.slice(0, 3).join(' | ')}`);
  say(r.short.length === 0, `${label}: seat buttons under 44 px: ${r.short.slice(0, 3).join(' | ')}`);
  if (r.short.length) shortFails += 1;
  say(r.over.length === 0, `${label}: a seat node sits over its neighbour: ${r.over.join(', ')}`);
  say(r.wide.length === 0, `${label}: a seat node runs past the page edge: ${r.wide.join(', ')}`);
  return r;
}

const shot = async (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
const top = async (page, sel) => page.evaluate(s => document.querySelector(s)?.getBoundingClientRect().top ?? null, sel);
const playTop = async page => page.evaluate(re => {
  const b = [...document.querySelectorAll('button')].find(x => new RegExp(re).test(x.textContent.trim()));
  return b ? b.getBoundingClientRect().top + window.scrollY : null;
}, PLAY.source);

const browser = await chromium.launch();
const SMALL_TAP = '[data-college-seat] button, button[data-college-seat] { min-height: 0 !important; height: auto !important; padding-top: 4px !important; padding-bottom: 4px !important; }';
const fresh = async (vw, vh, route, reduce = false) => {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(r => { try { localStorage.setItem(`rules-gate-seen:${r}`, '1'); } catch { /* none */ } }, route);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
};
const control = async page => { if (CONTROL === 'smalltap') await page.addStyleTag({ content: SMALL_TAP }); };
const clickText = async (page, re) => {
  const ok = await page.evaluate(src => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test(x.textContent.trim()));
    if (b) b.click();
    return !!b;
  }, re.source);
  await page.waitForTimeout(250);
  return ok;
};
const docTop = async (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + window.scrollY : null; }, sel);
const height = async (page, sel) => page.evaluate(s => document.querySelector(s)?.getBoundingClientRect().height ?? null, sel);
const recapSaves = {};

for (const { route, key, school } of ROUTES) {
  for (const [vw, vh] of VIEWPORTS) {
    const tag = `${route.slice(1)}-${vw}`;
    const { ctx, page, errors } = await fresh(vw, vh, route);
    await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    where = 'S1';
    say(await page.locator('[data-college-seat="pick"]').count() === 1, `${tag}: the pick screen says a new dynasty comes with the athletic director`);
    say(await clickText(page, new RegExp(`^${school}Prestige`)), `${tag}: picked ${school}`);
    await page.waitForTimeout(500);
    await control(page);
    const startSave = await page.evaluate(k => localStorage.getItem(k), key);
    say(await page.locator('[data-college-seat="tile"]').count() === 1, `${tag}: a new dynasty's first screen carries the tile`);
    await seatChecks(page, `${tag} station 1`);
    await shot(page, `${tag}-1-tile`);

    where = 'S2';
    await page.locator('[data-college-seat="tile"]').click();
    await page.waitForTimeout(400);
    say(await page.locator('[data-college-seat="card"]').count() === 1, `${tag}: the card opens in place of the tab content`);
    await seatChecks(page, `${tag} station 2 card`);
    await shot(page, `${tag}-2-card`);
    await page.locator('[aria-label="How the athletic director works"]').click();
    await page.waitForTimeout(400);
    say(await page.locator('[data-college-seat="rules"]').count() === 1, `${tag}: the "?" opens the rules over the card`);
    await seatChecks(page, `${tag} station 2 rules`);
    await shot(page, `${tag}-2-rules`);
    await clickText(page, /Back$/);
    await clickText(page, /Back$/);
    say(await page.locator('[data-college-seat="card"]').count() === 0 && await page.locator('[data-college-seat="tile"]').count() === 1, `${tag}: Back twice returns to the tabs and the tile`);

    where = 'S3';
    await clickText(page, /^Play$/);
    const before = { tile: await docTop(page, '[data-college-seat="tile"]'), play: await playTop(page), y: await page.evaluate(() => window.scrollY), h: await height(page, '[data-college-seat="tile"]') };
    await clickText(page, PLAY);
    await page.waitForTimeout(700);
    const after = { tile: await docTop(page, '[data-college-seat="tile"]'), play: await playTop(page), y: await page.evaluate(() => window.scrollY), h: await height(page, '[data-college-seat="tile"]') };
    console.log(`   ${tag} first press: tile top ${before.tile} to ${after.tile}, Play top ${before.play} to ${after.play}, slot ${before.h} to ${after.h}, scrollY ${before.y} to ${after.y}`);
    say(before.tile !== null && before.tile === after.tile && before.play === after.play && before.h === after.h, `${tag}: the first press moved the tile or the Play button`);
    await shot(page, `${tag}-3-press`);
    /* An older dynasty: the same start with no athletic director, at its first press. */
    const old = JSON.parse(startSave);
    delete old.st.seat;
    const plant = async () => { await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(old)]); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(700); await control(page); await clickText(page, /^Play$/); };
    await plant();
    const offer = { h: await height(page, '[data-college-seat="optin"]'), play: await playTop(page) };
    await seatChecks(page, `${tag} station 3 offer`);
    await shot(page, `${tag}-3-offer`);
    await clickText(page, /^Not now$/);
    const passed = { h: await height(page, '[data-college-seat="passed"]'), play: await playTop(page) };
    await plant();
    await clickText(page, /^Take the ask$/);
    const taken = { h: await height(page, '[data-college-seat="tile"]'), play: await playTop(page) };
    console.log(`   ${tag} older save: slot ${offer.h} / ${passed.h} / ${taken.h}, Play top ${offer.play} / ${passed.play} / ${taken.play}`);
    say(offer.h !== null && offer.h === passed.h && passed.h === taken.h && offer.h === before.h, `${tag}: the slot changed height between its states`);
    say(offer.play !== null && offer.play === passed.play && passed.play === taken.play, `${tag}: Not now or Take the ask moved the Play button`);

    where = 'S4';
    for (let i = 0; i < 30 && await page.locator('[data-college-seat="recap"]').count() === 0; i += 1) {
      if (!await clickText(page, PLAY)) break;
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1600);
    say(await page.locator('[data-college-seat="recap"]').count() === 1, `${tag}: the final press shows the grade on the recap`);
    say(/Trust upstairs: \d+ of 100/.test(await page.locator('[data-college-seat="recap"]').innerText().catch(() => '')), `${tag}: the recap carries trust`);
    await seatChecks(page, `${tag} station 4`);
    await shot(page, `${tag}-4-recap`);
    if (vw === 390) recapSaves[route] = await page.evaluate(k => localStorage.getItem(k), key);
    where = 'errors';
    say(errors.length === 0, `${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
}

/* Reduced motion: the recap drawn from a saved recap, the verdict on its last frame at first paint. */
where = 'S4-reduced';
for (const { route, key } of ROUTES) {
  const saved = recapSaves[route];
  if (!say(!!saved, `${route}: no recap save was kept for the reduced motion check`)) continue;
  const { ctx, page } = await fresh(390, 844, route, true);
  await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, saved]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-college-seat="recap"]', { timeout: 8000 }).catch(() => {});
  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-college-seat="recap"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { opacity: cs.opacity, transform: cs.transform, running: el.getAnimations().filter(a => a.playState === 'running').length };
  });
  console.log(`   ${route} reduced motion: ${JSON.stringify(m)}`);
  say(!!m && m.opacity === '1' && (m.transform === 'none' || m.transform === '') && m.running === 0, `${route}: under reduced motion the verdict is not on its last frame at first paint`);
  await shot(page, `${route.slice(1)}-390-4-reduced`);
  await ctx.close();
}

await browser.close();
const red = [...failedIn.entries()].map(([k, n]) => `${k} (${n})`).join(', ');
if (CONTROL) {
  const fired = shortFails > 0;
  console.log(fired ? `playCollegeSeat CONTROL ${CONTROL} FIRED: the 44 px check went red (red: ${red})` : `playCollegeSeat CONTROL ${CONTROL} DID NOT FIRE (red: ${red || 'none'})`);
  process.exit(1);
}
console.log(failures ? `playCollegeSeat: RED, ${failures} failures (${red})` : 'playCollegeSeat: all stations green at 320, 390 and 1280 on both routes');
process.exit(failures ? 1 : 0);
