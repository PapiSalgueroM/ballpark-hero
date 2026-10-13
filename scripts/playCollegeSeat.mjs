/**
 * Round 1320: the athletic director, walked like a person on a served build, both college routes, at 320 by
 * 568, 390 by 844 and 1280 by 800, Chromium, the database host blocked.
 *
 * Stations (each a picture in $RC_OUT, or .tmp-fx/college-seat-shots when RC_OUT is unset):
 *  1 a new dynasty's first screen: the tile, under the chips, above the tabs;
 *  2 the card open in place of the tab content, its "?" over it, Back twice;
 *  3 the seat never moves the page: the tile's top, the slot's height and the top of the tab bar under it
 *    before and after the first press, equal to the pixel (window.scrollY and the Play button's top are
 *    printed: the board's own feed above the Play card changes length with every round, as it did before
 *    this round); and on an older save the slot's height and the Play button's top before "Take the ask",
 *    after it, and after "Not now", all equal to the pixel;
 *  4 the final press: the recap with the verdict and trust; under prefers-reduced-motion the verdict is on its
 *    last frame at first paint (opacity 1, no transform, no running animation);
 *  5 trust at zero: the fired recap, "See who calls" in place of the trail button;
 *  6 the market, and a reload reading the same market;
 *  7 "Take the job": the new program's recruiting trail, the record two stints long.
 *  8 a buyout bid on the recap of a second tier program after a title, and "Stay put" (the same trail);
 *  9 "Go to <program>": the new program's trail, the old stint ended as a buyout.
 *  Under reduced motion the fired title, "See who calls" and the market land on their last frame too.
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
    const out = { roots: 0, small: [], short: [], over: [], wide: [], cut: [], minTap: null };
    const W = document.documentElement.clientWidth;
    for (const root of document.querySelectorAll('[data-college-seat]')) {
      out.roots += 1;
      const rr = root.getBoundingClientRect();
      if (rr.right > W + 0.5 || rr.left < -0.5) out.wide.push(root.getAttribute('data-college-seat'));
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(getComputedStyle(el).fontSize) < 12) out.small.push(`${el.tagName} ${el.textContent.trim().slice(0, 30)}`);
        /* cut off: a clamped or truncated line whose text does not fit its box */
        const cs = getComputedStyle(el);
        const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' || cs.textOverflow === 'ellipsis';
        if (own && clamped && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) out.cut.push(`${el.textContent.trim().slice(0, 40)}`);
      }
      for (const b of [...(root.tagName === 'BUTTON' ? [root] : []), ...root.querySelectorAll('button')]) {
        out.minTap = Math.min(out.minTap ?? 999, Math.round(b.getBoundingClientRect().height * 10) / 10);
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
  say(r.cut.length === 0, `${label}: seat text cut off: ${r.cut.slice(0, 3).join(' | ')}`);
  console.log(`   ${label}: ${r.roots} seat nodes, smallest seat button ${r.minTap ?? 'none'} px`);
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
  await ctx.addInitScript(r => { try { localStorage.setItem(`rules-gate-seen:${r}`, '1'); localStorage.setItem('cookie-consent', 'essential'); } catch { /* none */ } }, route);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('framenavigated', fr => { if (fr === page.mainFrame()) page.__navs = [...(page.__navs ?? []), fr.url()]; });
  return { ctx, page, errors };
};
const control = async page => { if (CONTROL === 'smalltap') await page.addStyleTag({ content: SMALL_TAP }); };
const clickText = async (page, re) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { return await clickOnce(page, re); } catch (e) {
      if (!String(e).includes('Execution context was destroyed')) throw e;
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(800);
    }
  }
  return false;
};
const clickOnce = async (page, re) => {
  const ok = await page.evaluate(src => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test(x.textContent.trim()));
    if (b) b.click();
    return !!b;
  }, re.source);
  await page.waitForTimeout(250);
  return ok;
};
const docTop = async (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + window.scrollY : null; }, sel);
/** The document top of the element right under the seat's slot (the tab bar). */
const underSlot = async page => page.evaluate(() => {
  const next = document.querySelector('[data-college-seat="tile"], [data-college-seat="optin"], [data-college-seat="passed"]')?.nextElementSibling;
  return next ? next.getBoundingClientRect().top + window.scrollY : null;
});
const height = async (page, sel) => page.evaluate(s => document.querySelector(s)?.getBoundingClientRect().height ?? null, sel);
const recapSaves = {};
const fireSaves = {};

for (const { route, key, school } of ROUTES) {
  for (const [vw, vh] of VIEWPORTS) {
    const tag = `${route.slice(1)}-${vw}`;
    const { ctx, page, errors } = await fresh(vw, vh, route);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-college-seat="pick"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);

    where = 'S1';
    console.log(`   ${tag}: navigations after load ${JSON.stringify(page.__navs ?? [])}`);
    say(await page.locator('[data-college-seat="pick"]').count() === 1, `${tag}: the pick screen says a new dynasty comes with the athletic director`);
    say(await clickText(page, new RegExp(`^${school}Prestige`)), `${tag}: picked ${school}`);
    await page.waitForTimeout(500);
    await control(page);
    const startSave = await page.evaluate(k => localStorage.getItem(k), key);
    say(await page.locator('[data-college-seat="tile"]').count() === 1, `${tag}: a new dynasty's first screen carries the tile`);
    await seatChecks(page, `${tag} station 1`);
    await shot(page, `${tag}-1-tile`);
    /* The worst row: the longest ask either pack writes (basketball's 'contend', 99 characters) on the tile. */
    {
      const worst = JSON.parse(startSave);
      worst.st.seat.mandate.text = 'Make the national tournament and win a national tournament game. The boosters paid for this roster.';
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(worst)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await control(page);
      say(await page.locator('[data-college-seat="tile"]').count() === 1, `${tag}: the tile with the longest ask`);
      await seatChecks(page, `${tag} station 1, the longest ask`);
      await shot(page, `${tag}-1-longest-ask`);
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, startSave]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await control(page);
    }

    where = 'S2';
    await page.locator('[data-college-seat="tile"]').click();
    await page.waitForTimeout(400);
    say(await page.locator('[data-college-seat="card"]').count() === 1, `${tag}: the card opens in place of the tab content`);
    await seatChecks(page, `${tag} station 2 card`);
    await page.locator('[data-college-seat="card"]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `${tag}-2-card`);
    await page.locator('[aria-label="How the athletic director works"]').click();
    await page.waitForTimeout(400);
    say(await page.locator('[data-college-seat="rules"]').count() === 1, `${tag}: the "?" opens the rules over the card`);
    await seatChecks(page, `${tag} station 2 rules`);
    await page.locator('[data-college-seat="rules"]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `${tag}-2-rules`);
    /* scoped to the card: the site navbar carries a Back button of its own, which leaves the page */
    await page.locator('[data-college-seat="rules"] button:has-text("Back")').click();
    await page.waitForTimeout(300);
    await page.locator('[data-college-seat="card"] button:has-text("Back")').click();
    await page.waitForTimeout(300);
    say(await page.locator('[data-college-seat="card"]').count() === 0 && await page.locator('[data-college-seat="tile"]').count() === 1, `${tag}: Back twice returns to the tabs and the tile`);

    where = 'S3';
    await clickText(page, /^Play$/);
    const before = { tile: await docTop(page, '[data-college-seat="tile"]'), play: await playTop(page), y: await page.evaluate(() => window.scrollY), h: await height(page, '[data-college-seat="tile"]'), tabs: await underSlot(page) };
    await clickText(page, PLAY);
    await page.waitForTimeout(700);
    const after = { tile: await docTop(page, '[data-college-seat="tile"]'), play: await playTop(page), y: await page.evaluate(() => window.scrollY), h: await height(page, '[data-college-seat="tile"]'), tabs: await underSlot(page) };
    console.log(`   ${tag} first press: tile top ${before.tile} to ${after.tile}, slot ${before.h} to ${after.h}, tabs under it ${before.tabs} to ${after.tabs}, Play top ${before.play} to ${after.play} (the round's feed above it changes length, as it always has), scrollY ${before.y} to ${after.y}`);
    /* The seat's promise: its slot neither moves nor changes height, so everything under it (the tabs, then the
       board's own feed and the Play card) sits where the board alone would put it. The feed above the Play card
       has always grown and shrunk with the round's lines; that is the board's, measured and printed, not the seat's. */
    say(before.tile !== null && before.tile === after.tile && before.h === after.h && before.tabs === after.tabs, `${tag}: the first press moved the slot or what sits under it`);
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
    await page.locator('[data-college-seat="recap"]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `${tag}-4-recap`);
    if (vw === 390) recapSaves[route] = await page.evaluate(k => localStorage.getItem(k), key);
    /* Stations 5 to 7: the same start, at the season's last round, a roster gutted to 40 so no title can come,
       a title ask, one trust point left and three titles behind him so the market wants him. */
    where = 'S5';
    const fire = JSON.parse(startSave);
    fire.st.round = route === '/cfb-dynasty' ? 12 : 10;
    for (const p of fire.st.teams[fire.st.myTeam].players) p.ovr = 40;
    fire.st.seat.trust = 1;
    fire.st.seat.mandate = { ...fire.st.seat.mandate, tier: 'title', reqLevel: 4, winFloor: 0 };
    fire.st.seat.career.stints[0] = { ...fire.st.seat.career.stints[0], from: fire.st.season - 3, grades: ['title', 'title', 'title'] };
    if (vw === 390) fireSaves[route] = JSON.stringify(fire);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(fire)]);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await control(page);
    await clickText(page, /^Play$/);
    await clickText(page, PLAY);
    await page.waitForTimeout(1600);
    say(await page.locator('[data-college-seat="fired"]').count() === 1, `${tag}: trust at zero shows the fired recap`);
    say(await page.locator('[data-college-seat="calls"]').count() === 1 && !(await page.locator('body').innerText()).includes('Hit the recruiting trail'), `${tag}: See who calls stands in for the trail`);
    await seatChecks(page, `${tag} station 5`);
    await page.locator('[data-college-seat="fired"]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `${tag}-5-fired`);

    where = 'S6';
    await clickText(page, /^See who calls$/);
    await page.waitForTimeout(900);
    const market1 = await page.locator('[data-college-seat="market"]').innerText().catch(() => '');
    say(market1.includes('let you go'), `${tag}: the market opens and says who let him go`);
    await seatChecks(page, `${tag} station 6`);
    await shot(page, `${tag}-6-market`);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await control(page);
    const market2 = await page.locator('[data-college-seat="market"]').innerText().catch(() => '');
    say(market2 === market1 && market1.length > 0, `${tag}: a reload reads the same market`);

    where = 'S7';
    /* The feed is keyed on the record, so a record that drew nobody draws nobody on every reload: when this
       one is quiet, the walk tries longer records (more titles behind him) until one draws a call. */
    const fired7 = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
    for (let t = 4; t <= 12 && await page.locator('button:has-text("Take the job")').count() === 0; t += 1) {
      const s = JSON.parse(JSON.stringify(fired7));
      const stint = s.st.seat.career.stints[0];
      const last = stint.grades[stint.grades.length - 1];
      s.st.seat.career.stints[0] = { ...stint, from: s.st.season - t, grades: [...Array(t).fill('title'), last] };
      await page.evaluate(([kk, v]) => localStorage.setItem(kk, v), [key, JSON.stringify(s)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1300);
    }
    const before7 = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
    const took = await clickText(page, /^Take the job$/);
    await page.waitForTimeout(900);
    const after7 = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
    if (say(took, `${tag}: a coach with three titles drew no offer to take`)) {
      say(after7.phase === 'recruit' && after7.st.myTeam !== before7.st.myTeam && after7.st.seat.career.stints.length === 2, `${tag}: Take the job opens the new program's trail`);
      say((await page.locator('body').innerText()).includes(`The ${after7.st.season + 1} class`), `${tag}: the trail is the new program's class`);
      await shot(page, `${tag}-7-new-trail`);
    }

    /* Stations 8 and 9: a second tier program played to its recap, then its record made a title this season;
       the first record whose keyed draw bids is kept (the board decides, the walk only looks). */
    where = 'S8';
    await page.evaluate(k => localStorage.removeItem(k), key);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-college-seat="pick"]', { timeout: 15000 }).catch(() => {});
    const tier2 = await page.evaluate(() => {
      const picks = [...document.querySelectorAll('button')].map(b => /^(.*)Prestige (\d+)$/.exec(b.textContent.trim())).filter(Boolean).map(m => ({ name: m[1], p: Number(m[2]) }));
      picks.sort((a, b) => b.p - a.p);
      return picks[Math.floor(picks.length * 0.375)]?.name ?? null;
    });
    say(!!tier2 && await clickText(page, new RegExp(`^${tier2}Prestige`)), `${tag}: picked a second tier program (${tier2})`);
    await page.waitForTimeout(500);
    await clickText(page, /^Play$/);
    for (let i = 0; i < 30 && await page.locator('[data-college-seat="recap"]').count() === 0; i += 1) {
      if (!await clickText(page, PLAY)) break;
      await page.waitForTimeout(120);
    }
    const graded = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
    let bidSave = null;
    for (let k = 1; k <= 12 && !bidSave; k += 1) {
      const s = JSON.parse(JSON.stringify(graded));
      s.st.seat.trust = 80;
      s.st.seat.career.stints[0] = { team: s.st.myTeam, tier: 2, from: s.st.season - k + 1, grades: [...Array(k - 1).fill('met'), 'title'] };
      await page.evaluate(([kk, v]) => localStorage.setItem(kk, v), [key, JSON.stringify(s)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1300);
      if (await page.locator('[data-college-seat="bid"]').count() === 1) bidSave = s;
    }
    if (say(!!bidSave, `${tag}: no record drew a bid in twelve tries`)) {
      await control(page);
      await page.waitForTimeout(900);
      await seatChecks(page, `${tag} station 8`);
      await page.locator('[data-college-seat="bid"]').scrollIntoViewIfNeeded().catch(() => {});
      await shot(page, `${tag}-8-bid`);
      await clickText(page, /^Stay put$/);
      await page.waitForTimeout(700);
      const stayed = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
      say(stayed.phase === 'recruit' && stayed.st.myTeam === bidSave.st.myTeam && stayed.st.seat.career.stints.length === 1, `${tag}: Stay put opens the trail at the same program`);

      where = 'S9';
      await page.evaluate(([kk, v]) => localStorage.setItem(kk, v), [key, JSON.stringify(bidSave)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1600);
      await control(page);
      const went = await clickText(page, /^Go to /);
      await page.waitForTimeout(700);
      const moved = JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
      say(went && moved.phase === 'recruit' && moved.st.myTeam !== bidSave.st.myTeam && moved.st.seat.career.stints[0].ended === 'poached', `${tag}: Go to moves him and closes the old stint as a buyout`);
      await shot(page, `${tag}-9-went`);
    }
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

/* Reduced motion: the fired title and the market on their last frame at first paint. */
where = 'S5-reduced';
for (const { route, key } of ROUTES) {
  if (!say(!!fireSaves[route], `${route}: no firing save was kept for the reduced motion check`)) continue;
  const { ctx, page } = await fresh(390, 844, route, true);
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, fireSaves[route]]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await clickText(page, /^Play$/);
  await clickText(page, PLAY);
  const frame = sel => page.evaluate(s => {
    const els = [...document.querySelectorAll(s)];
    if (!els.length) return null;
    return els.map(el => { const cs = getComputedStyle(el); return { o: cs.opacity, t: cs.transform, v: cs.visibility, r: el.getAnimations().filter(a => a.playState === 'running').length }; });
  }, sel);
  const settled = xs => !!xs && xs.every(x => x.o === '1' && (x.t === 'none' || x.t === '') && x.v === 'visible' && x.r === 0);
  const fired = await frame('[data-college-seat="fired"] .cm-slam, [data-college-seat="fired"] .cm-rise, [data-college-seat="calls"]');
  console.log(`   ${route} reduced motion, fired recap: ${JSON.stringify(fired)}`);
  say(settled(fired), `${route}: under reduced motion the fired title or See who calls is not on its last frame at first paint`);
  await clickText(page, /^See who calls$/);
  const market = await frame('[data-college-seat="market"] .cm-rise, [data-college-seat="market"] .cm-rise-gated');
  console.log(`   ${route} reduced motion, market: ${JSON.stringify(market)}`);
  say(settled(market), `${route}: under reduced motion the market is not on its last frame at first paint`);
  await ctx.close();
}

await browser.close();
const red =[...failedIn.entries()].map(([k, n]) => `${k} (${n})`).join(', ');
if (CONTROL) {
  const fired = shortFails > 0;
  console.log(fired ? `playCollegeSeat CONTROL ${CONTROL} FIRED: the 44 px check went red (red: ${red})` : `playCollegeSeat CONTROL ${CONTROL} DID NOT FIRE (red: ${red || 'none'})`);
  process.exit(1);
}
console.log(failures ? `playCollegeSeat: RED, ${failures} failures (${red})` : 'playCollegeSeat: all stations green at 320, 390 and 1280 on both routes');
process.exit(failures ? 1 : 0);
