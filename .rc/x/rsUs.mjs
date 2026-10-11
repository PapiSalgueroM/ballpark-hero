/* Reviewer walk (screens, Release AX): the saved contract talks of the four US careers on the built site.
   Sent as an extra file of a remote check (.rc/x/rsUs.mjs). Reads BASE, SPORT, RC_OUT. Blocks supabase.co.
   Presses are DOM clicks with a focus first (a Playwright click scrolls, and the page position is what is measured). */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const SPORT = process.env.SPORT || 'nfl';
const OUT = process.env.RC_OUT || '.tmp-fx/rs-out';
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = `/${SPORT}-my-career`, KEY = `${SPORT}-my-career-save-v1`;
const fixture = JSON.parse(fs.readFileSync('scripts/data/usBoardFixture.json', 'utf8')).sports[SPORT].saves;
const VIEWS = [[320, 568], [390, 844], [1280, 900]];
const log = [];
const say = (tag, obj) => { const line = `${tag} ${typeof obj === 'string' ? obj : JSON.stringify(obj)}`; console.log(line.slice(0, 1800)); log.push({ tag, obj }); };
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(w, h, raw, reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v, route]) => {
    let a = 20261011;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (!sessionStorage.getItem('rs-seeded')) {
      sessionStorage.setItem('rs-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(k, v);
      localStorage.setItem('rules-gate-seen:' + route, '1');
      for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1');
    }
  }, [KEY, raw, ROUTE]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_CONNECTION|Failed to load resource|supabase/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors };
}
const shot = async (page, name, full = false) => { if (full && page.viewportSize().width !== 390) return; try { await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 55, fullPage: full }); } catch (e) { say('SHOTFAIL', name + ' ' + String(e).slice(0, 100)); } };
const saved = page => page.evaluate(k => localStorage.getItem(k), KEY);
const press = (page, sel) => page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.focus({ preventScroll: true }); el.click(); return true; }, sel);
const pressPlay = page => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Play the [0-9]+ season$/.test((x.textContent || '').trim())); if (!b) return false; b.focus({ preventScroll: true }); b.click(); return true; });
const waitFor = (page, sel, ms = 20000) => page.locator(sel).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const settle = page => page.waitForTimeout(700);

/* Everything measured about one region: its box, the page position, small type, tap targets, truncated text, focus. */
const facts = (page, sel) => page.evaluate(q => {
  const root = document.querySelector(q);
  const box = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const a = document.activeElement;
  const active = a ? `${a.tagName} ${[...a.attributes].filter(x => x.name.startsWith('data-')).map(x => x.name + (x.value ? '=' + x.value : '')).join(' ')} "${(a.textContent || '').trim().slice(0, 30)}"` : null;
  const base = { scrollY: Math.round(scrollY), innerW: innerWidth, innerH: innerHeight, docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - innerWidth, active };
  if (!root) return { missing: q, ...base };
  const small = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const p = n.parentElement; if (seen.has(p)) continue; seen.add(p);
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) small.push(`${fs}px "${t.slice(0, 36)}"`);
  }
  const taps = [...root.querySelectorAll('button, a[href]')].map(b => ({ t: (b.textContent || '').trim().slice(0, 28) || b.getAttribute('aria-label'), r: box(b), dis: b.disabled ? 1 : undefined })).filter(x => x.r[2] > 0);
  const cut = [...root.querySelectorAll('*')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => (e.textContent || '').trim().slice(0, 40));
  const r = box(root);
  return { rect: r, inView: r[1] >= 0 && r[1] + r[3] <= innerHeight, topInView: r[1] >= 0 && r[1] < innerHeight, ...base, small, under44: taps.filter(x => x.r[3] < 44 || x.r[2] < 44), taps: taps.length, cut };
}, sel);
const text = (page, sel) => page.evaluate(q => [...document.querySelectorAll(q)].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()), sel);

const wheelFacts = page => page.evaluate(() => {
  const w = document.querySelector('[data-market-wheel]'); if (!w) return null;
  const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const disc = w.querySelector('[aria-hidden="true"]'), hand = disc && disc.firstElementChild;
  const cs = hand ? getComputedStyle(hand) : null;
  return { result: w.getAttribute('data-market-result'), heading: (w.querySelector('h2') || {}).textContent, disc: box(disc), gradient: disc ? disc.style.background.slice(0, 130) : null,
    handTransform: hand ? hand.style.transform : null, handTransition: cs ? cs.transitionDuration + ' ' + cs.transitionProperty : null,
    legend: [...w.querySelectorAll('li')].map(li => li.textContent + ' ' + getComputedStyle(li).fontSize + ' ' + JSON.stringify(box(li))),
    outcome: (w.querySelector('[data-market-wheel-outcome]') || {}).textContent || null, outcomeBox: box(w.querySelector('[data-market-wheel-outcome]')),
    spin: box(w.querySelector('[data-market-spin]')), skip: box(w.querySelector('[data-market-skip]')), cont: box(w.querySelector('[data-market-continue]')),
    buttons: [...w.querySelectorAll('button')].map(b => b.textContent.trim() + (b.disabled ? ' (disabled)' : '')) };
});
const CARD = '[data-extension-talk], [data-fa-window]';

async function wheelJourney(w, h, reduced) {
  const tag = `${SPORT} ${w}x${h}${reduced ? ' reduced' : ''} wheel:`; const id = `us-${SPORT}-${w}${reduced ? '-rm' : ''}`;
  const raw = fixture.wheel; const { ctx, page, errors } = await open(w, h, raw, reduced);
  try {
    if (!await waitFor(page, '[data-market-wheel]')) { say(tag, 'NO WHEEL ON LOAD'); await shot(page, id + '-wheel-missing'); return; }
    await settle(page);
    const talk = JSON.parse(raw).contractTalk; say(tag, { savedResult: talk.wheel.result, p: talk.wheel.probabilities, kind: talk.kind });
    say(tag + ' open', { f: await facts(page, '[data-market-wheel]'), wf: await wheelFacts(page) });
    await shot(page, id + '-wheel-open');
    const bytes0 = await saved(page);
    if (!reduced) {
      await press(page, '[data-market-spin]'); await page.waitForTimeout(150);
      say(tag + ' spinning', await wheelFacts(page)); await shot(page, id + '-wheel-spinning');
      await page.waitForTimeout(1500);
      say(tag + ' revealed', { f: await facts(page, '[data-market-wheel]'), wf: await wheelFacts(page), sameBytes: (await saved(page)) === bytes0 });
      await shot(page, id + '-wheel-result');
      await page.reload({ waitUntil: 'domcontentloaded' }); await waitFor(page, '[data-market-wheel]'); await settle(page);
      const again = await wheelFacts(page); say(tag + ' after reload', { result: again && again.result, buttons: again && again.buttons, sameBytes: (await saved(page)) === bytes0 });
      await press(page, '[data-market-skip]'); await page.waitForTimeout(300);
      const sk = await wheelFacts(page); say(tag + ' skip', { result: sk && sk.result, outcome: sk && sk.outcome, hand: sk && sk.handTransform, sameBytes: (await saved(page)) === bytes0 });
    }
    await press(page, '[data-market-continue]'); await waitFor(page, CARD); await settle(page);
    say(tag + ' card after continue', { f: await facts(page, CARD), words: (await text(page, CARD)).map(t => t.slice(0, 700)), seen: JSON.parse(await saved(page)).contractTalk?.wheel?.seen });
    await shot(page, id + '-after-wheel');
    const words1 = await text(page, CARD);
    await page.reload({ waitUntil: 'domcontentloaded' }); await waitFor(page, CARD); await settle(page);
    const words2 = await text(page, CARD); const same = JSON.stringify(words1) === JSON.stringify(words2);
    say(tag + ' reload on the card', { wheelBack: await page.locator('[data-market-wheel]').count(), sameWords: same, diff: same ? '' : [words1.join('|').slice(0, 400), words2.join('|').slice(0, 400)] });
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 400)); await shot(page, id + '-wheel-crash'); }
  say(tag + ' errors', errors); await ctx.close();
}

async function faJourney(w, h) {
  const tag = `${SPORT} ${w}x${h} fa:`; const id = `us-${SPORT}-${w}`;
  const { ctx, page, errors } = await open(w, h, fixture.fa);
  try {
    await page.getByRole('button', { name: /^Play the [0-9]+ season$/ }).waitFor({ state: 'visible', timeout: 30000 }); await settle(page);
    const hubY = await page.evaluate(() => Math.round(scrollY));
    await pressPlay(page);
    if (!await waitFor(page, '[data-fa-window]')) { say(tag, 'NO FA WINDOW after Play'); await shot(page, id + '-fa-missing'); return; }
    await page.waitForTimeout(1500);
    const raw0 = await saved(page); const s0 = JSON.parse(raw0); const offers = s0.contractTalk?.window?.offers || [];
    say(tag + ' opened', { hubY, phase: s0.phase, offers: offers.map(o => `${o.label} ${o.salary}x${o.years} q${o.quality}${o.incumbent ? ' inc' : ''}`), f: await facts(page, '[data-fa-window]'), odds: await text(page, '[data-market-odds]') });
    await shot(page, id + '-fa-view'); await shot(page, id + '-fa-full', true);
    /* the comparison, opened with the page scrolled so its button sits 120 px under the top */
    await page.evaluate(() => { const b = document.querySelector('[data-market-compare-open]'); const r = b.getBoundingClientRect(); window.scrollTo(0, Math.max(0, scrollY + r.top - 120)); });
    await page.waitForTimeout(200); const y0 = await page.evaluate(() => Math.round(scrollY));
    await press(page, '[data-market-compare-open]'); await waitFor(page, '[data-market-compare]'); await page.waitForTimeout(300);
    say(tag + ' compare', { y0, f: await facts(page, '[data-market-compare]'), rows: await text(page, '[data-market-compared-offer]') });
    await shot(page, id + '-compare');
    for (const m of ['total', 'years', 'roster']) { await press(page, `[data-market-priority="${m}"]`); await page.waitForTimeout(120); say(tag + ' compare by ' + m, await text(page, '[data-market-compared-offer]')); }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(150);
    const yIn = await page.evaluate(() => Math.round(scrollY));
    await press(page, '[data-market-compare-back]'); await waitFor(page, '[data-fa-window]'); await page.waitForTimeout(300);
    say(tag + ' back to offers', { y0, scrolledInsideTo: yIn, f: await facts(page, '[data-market-compare-open]'), sameBytes: (await saved(page)) === raw0 });
    await shot(page, id + '-compare-back');
    /* push the lowest offer from where a player has scrolled to it */
    const idx = offers.length - 1;
    await page.evaluate(i => { const b = document.querySelector(`[data-fa-push="${i}"]`); if (b) b.scrollIntoView({ block: 'center' }); }, idx);
    await page.waitForTimeout(250); const y1 = await page.evaluate(() => Math.round(scrollY));
    const before = (await text(page, `[data-fa-offer="${idx}"]`))[0];
    await shot(page, id + '-fa-before-push');
    await press(page, `[data-fa-push="${idx}"]`); await page.waitForTimeout(500);
    const wf = await wheelFacts(page);
    say(tag + ' wheel after push', { idx, y1, f: await facts(page, '[data-market-wheel]'), heading: wf && wf.heading, disc: wf && wf.disc, legend: wf && wf.legend });
    await shot(page, id + '-fa-push-view');
    await press(page, '[data-market-skip]'); await page.waitForTimeout(300);
    const res = await wheelFacts(page); say(tag + ' wheel revealed', { result: res && res.result, outcome: res && res.outcome, outcomeBox: res && res.outcomeBox, cont: res && res.cont, f: await facts(page, '[data-market-wheel]') });
    await shot(page, id + '-fa-push-result');
    await press(page, '[data-market-continue]'); await waitFor(page, '[data-fa-window]'); await settle(page);
    say(tag + ' offers after continue', { before, after: (await text(page, `[data-fa-offer="${idx}"]`))[0], receipt: await text(page, '[data-fa-result]'), talkLine: (await text(page, '[data-fa-window] .bg-secondary')).slice(0, 3), offerBox: await facts(page, `[data-fa-offer="${idx}"]`) });
    await shot(page, id + '-fa-after-continue');
    const words1 = await text(page, '[data-fa-offer]');
    await page.reload({ waitUntil: 'domcontentloaded' }); await waitFor(page, '[data-fa-window]'); await page.waitForTimeout(1500);
    const words2 = await text(page, '[data-fa-offer]');
    say(tag + ' reload', { words1, words2, f: await facts(page, '[data-fa-window]') });
    await shot(page, id + '-fa-reload');
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 400)); await shot(page, id + '-fa-crash'); }
  say(tag + ' errors', errors); await ctx.close();
}

async function extJourney(w, h) {
  const tag = `${SPORT} ${w}x${h} ext:`; const id = `us-${SPORT}-${w}`;
  const { ctx, page, errors } = await open(w, h, fixture.ext);
  try {
    await page.getByRole('button', { name: /^Play the [0-9]+ season$/ }).waitFor({ state: 'visible', timeout: 30000 }); await settle(page);
    say(tag + ' hub', { week: await facts(page, '[data-season-centre-entry]'), held: await text(page, '[data-season-centre-held]') });
    await shot(page, id + '-hub-view');
    await press(page, '[data-season-centre-entry] [data-week-by-week]');
    if (!await waitFor(page, '[data-extension-talk]')) { say(tag, 'NO TALK after Week by week'); await shot(page, id + '-ext-missing'); return; }
    await page.waitForTimeout(1500);
    const s0 = JSON.parse(await saved(page));
    say(tag + ' talk', { phase: s0.phase, offer: s0.contractTalk?.talk?.offer, viewer: await page.locator('[data-us-season-centre]').count(), f: await facts(page, '[data-extension-talk]'), odds: await text(page, '[data-market-odds]'), oddsBox: await facts(page, '[data-market-odds]') });
    await shot(page, id + '-ext-view'); await shot(page, id + '-ext-full', true);
    if (await page.locator('[data-ext-push]:not([disabled])').count()) {
      const before = await text(page, '[data-extension-talk]');
      await press(page, '[data-ext-push]'); await page.waitForTimeout(500);
      const wf = await wheelFacts(page);
      say(tag + ' wheel after push', { f: await facts(page, '[data-market-wheel]'), wf });
      await shot(page, id + '-ext-push-view');
      await press(page, '[data-market-skip]'); await page.waitForTimeout(300);
      const res = await wheelFacts(page); say(tag + ' wheel revealed', { result: res && res.result, outcome: res && res.outcome, hand: res && res.handTransform, f: await facts(page, '[data-market-wheel]') });
      await shot(page, id + '-ext-push-result');
      await press(page, '[data-market-continue]'); await waitFor(page, '[data-extension-talk]'); await settle(page);
      say(tag + ' card after continue', { before: before[0].slice(0, 500), after: (await text(page, '[data-extension-talk]'))[0].slice(0, 500), f: await facts(page, '[data-extension-talk]') });
      await shot(page, id + '-ext-after-continue');
    } else say(tag, 'no push to press (the club made no offer)');
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 400)); await shot(page, id + '-ext-crash'); }
  say(tag + ' errors', errors); await ctx.close();
}

async function oldSaves(w, h) {
  for (const name of ['mid', 'rookie', 'extCut', 'retired', 'coach', 'noRole', 'extTalk', 'faTalk']) {
    const tag = `${SPORT} ${w}x${h} old save ${name}:`;
    if (!fixture[name]) { say(tag, 'not in the recording'); continue; }
    const { ctx, page, errors } = await open(w, h, fixture[name]);
    try {
      await page.waitForTimeout(3500);
      const on = await page.evaluate(() => ({ play: [...document.querySelectorAll('button')].filter(x => /^Play the [0-9]+ season$/.test((x.textContent || '').trim())).length, talk: document.querySelectorAll('[data-extension-talk]').length, fa: document.querySelectorAll('[data-fa-window]').length, wheel: document.querySelectorAll('[data-market-wheel]').length, h1: (document.querySelector('h1') || {}).textContent, crash: /something went wrong|error/i.test(document.body.innerText.slice(0, 600)) }));
      say(tag, { on, savedPhase: JSON.parse(await saved(page) || '{}').phase, hasTalk: !!JSON.parse(await saved(page) || '{}').contractTalk, errors });
      if (name === 'extTalk' || name === 'faTalk' || name === 'extCut') await shot(page, `us-${SPORT}-${w}-old-${name}`);
    } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 300)); }
    await ctx.close();
  }
}

for (const [w, h] of VIEWS) { await wheelJourney(w, h, false); await wheelJourney(w, h, true); await faJourney(w, h); await extJourney(w, h); }
await oldSaves(390, 844);
await browser.close();
fs.writeFileSync(path.join(OUT, `us-${SPORT}-log.json`), JSON.stringify(log));
console.log(`rsUs ${SPORT}: done, ${log.length} lines, ${log.filter(l => /CRASH|NO WHEEL|NO FA|NO TALK/.test(JSON.stringify(l.obj).slice(0, 12))).length} stops`);
