// Review of Round 1536 (lens: runs things). Plays the hardened first visit dialogs the way a stranger meets them, with the
// cookie banner unanswered, at 390x844 and 1280x900 with reduced motion on and off, plus Stadium Tycoon's Academy tab,
// the "While you were away" box for a returning player (320, 390, 1280), Hall of Champions with a faked catalog
// (fulfilled in the browser, nothing reaches the database), and the same boxes once the banner is answered.
// Screens (jpeg) and a JSON of measurements go to $RC_OUT. Exit 0 always; the lines say what was seen.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
fs.mkdirSync(OUT, { recursive: true });
const BANNER = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';
const log = [];
const say = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };

async function fakeDb(page, mock) {
  await page.route(/supabase\.co/, r => {
    const u = new URL(r.request().url());
    if (!mock || !u.pathname.startsWith('/rest/v1/') || r.request().method() !== 'GET') return r.abort();
    const sel = (u.searchParams.get('select') || 'id').split(',').map(s => s.trim()).filter(Boolean).map(c => c.split(':').pop().split('(')[0]);
    const num = c => /year|season|score|^id$|_id$|rating|ovr|points|goals|count|rank|age|num|pct|wins|losses/i.test(c);
    const rows = Array.from({ length: 24 }, (_, i) => Object.fromEntries(sel.map(c => [c, num(c) ? 1990 + i : `Mock ${c} ${i}`])));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
  });
}

async function settle(page) {
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, null, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(BANNER, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

// In the page: the named dialog, its own button (by text), the banner; scroll the box the way a thumb would.
function measure({ BANNER, name, btnText, scroll }) {
  const d = document.querySelector(`[aria-label="${name}"]`);
  const banner = document.querySelector(BANNER);
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
  if (!d) return { open: false, banner: r(banner), pending: !!document.body.dataset.consentPending };
  if (scroll === 'bottom') d.scrollTop = d.scrollHeight;
  if (scroll === 'top') d.scrollTop = 0;
  const btn = [...d.querySelectorAll('button')].find(b => (b.textContent || '').trim() === btnText);
  const out = { open: true, W: innerWidth, H: innerHeight, box: r(d), scrollH: d.scrollHeight, clientH: d.clientHeight, banner: r(banner),
    bannerFixed: !!banner && getComputedStyle(banner).position === 'fixed', pending: !!document.body.dataset.consentPending,
    varH: getComputedStyle(document.body).getPropertyValue('--dukb-consent-height').trim(), btn: r(btn) };
  if (btn) {
    const b = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    out.at = !hit ? 'nothing' : btn.contains(hit) ? 'button' : banner && banner.contains(hit) ? 'BANNER' : `${hit.tagName} ${String(hit.className).slice(0, 40)}`;
    out.cx = Math.round(b.left + b.width / 2); out.cy = Math.round(b.top + b.height / 2);
  }
  const h = d.querySelector('h2, .text-lg');
  if (h) { const hb = h.getBoundingClientRect(); out.headTop = Math.round(hb.top); out.headAt = (document.elementFromPoint(hb.left + 4, hb.top + hb.height / 2) && h.contains(document.elementFromPoint(hb.left + 4, hb.top + hb.height / 2))) ? 'visible' : 'covered'; }
  return out;
}

const shot = async (page, file) => { await page.screenshot({ path: path.join(OUT, `${file}.jpg`), type: 'jpeg', quality: 60 }); };
const fmt = m => !m.open ? `no dialog (banner ${m.banner ? `${m.banner.top}-${m.banner.bottom}` : 'none'}, pending ${m.pending})`
  : `box ${m.box.top}-${m.box.bottom} x ${m.box.left}-${m.box.right} (scroll ${m.clientH}/${m.scrollH}), button ${m.btn ? `${m.btn.top}-${m.btn.bottom}` : 'MISSING'} at its centre: ${m.at}, banner ${m.banner ? `${m.banner.top}-${m.banner.bottom}` : 'none'} pending ${m.pending} var ${m.varH || 'unset'}, heading ${m.headTop} ${m.headAt}`;

const browser = await chromium.launch();
const results = {};
const DIALOGS = [
  ['/stadium-tycoon', 'How Stadium Tycoon works', "Let's go", false],
  ['/idle-arena', 'How Idle Arena works', 'Start tapping', false],
  ['/wonderkid-factory', 'How Wonderkid Factory works', "Let's go", false],
  ['/hall-of-champions', 'How Hall of Champions works', 'Open the doors', true],
];
const tag = r => r.replace(/\//g, '');

// S1: the first visit, banner unanswered, both motion settings, two widths; tap the button, then reopen from "How it works".
for (const [route, name, btnText, mock] of DIALOGS) {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    for (const rm of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
      const page = await ctx.newPage();
      await fakeDb(page, mock);
      const k = `${tag(route)}-${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await settle(page);
        if (mock) await page.waitForSelector(`[aria-label="${name}"]`, { timeout: 15000 }).catch(() => {});
        const first = await page.evaluate(measure, { BANNER, name, btnText, scroll: 'top' });
        if (rm === 'no-preference' || w === 390) await shot(page, `${k}-1first`);
        const bottom = await page.evaluate(measure, { BANNER, name, btnText, scroll: 'bottom' });
        if (rm === 'no-preference') await shot(page, `${k}-2bottom`);
        say(`S1 ${k} first:  ${fmt(first)}`);
        say(`S1 ${k} bottom: ${fmt(bottom)}`);
        let closed = null, reopen = null;
        if (bottom.open && bottom.at === 'button') {
          await page.mouse.click(bottom.cx, bottom.cy);
          await page.waitForTimeout(600);
          closed = !(await page.evaluate(n => !!document.querySelector(`[aria-label="${n}"]`), name));
          if (rm === 'no-preference') await shot(page, `${k}-3after`);
          const how = page.locator('button', { hasText: 'How it works' }).first();
          if (await how.count()) {
            await how.click({ timeout: 5000 }).catch(e => say(`S1 ${k} reopen click failed: ${String(e.message).split('\n')[0]}`));
            await page.waitForTimeout(600);
            reopen = await page.evaluate(measure, { BANNER, name, btnText, scroll: 'bottom' });
            if (rm === 'no-preference') await shot(page, `${k}-4reopen`);
          }
        }
        say(`S1 ${k} tapped: closed ${closed}; reopened: ${reopen ? fmt(reopen) : 'not tried'}`);
        results[`S1 ${k}`] = { first, bottom, closed, reopen };
      } catch (e) { say(`S1 ${k} ERROR ${String(e.message).split('\n')[0]}`); }
      await ctx.close();
    }
  }
}

// S2: Stadium Tycoon's Academy tab, first opened with the banner still unanswered (Wonderkid's rules inside the tycoon).
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await fakeDb(page, false);
  const k = `academytab-${w}`;
  try {
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    const m0 = await page.evaluate(measure, { BANNER, name: 'How Stadium Tycoon works', btnText: "Let's go", scroll: 'bottom' });
    if (m0.at === 'button') await page.mouse.click(m0.cx, m0.cy);
    await page.waitForTimeout(500);
    await page.locator('button[data-room="academy"]').first().click({ timeout: 5000 });
    await page.waitForSelector('[aria-label="How Wonderkid Factory works"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    const first = await page.evaluate(measure, { BANNER, name: 'How Wonderkid Factory works', btnText: "Let's go", scroll: 'top' });
    await shot(page, `${k}-1first`);
    const bottom = await page.evaluate(measure, { BANNER, name: 'How Wonderkid Factory works', btnText: "Let's go", scroll: 'bottom' });
    await shot(page, `${k}-2bottom`);
    say(`S2 ${k} first:  ${fmt(first)}`);
    say(`S2 ${k} bottom: ${fmt(bottom)}`);
    results[`S2 ${k}`] = { first, bottom };
  } catch (e) { say(`S2 ${k} ERROR ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}

// S3: a returning Stadium Tycoon player who never answered the banner: "While you were away" (Round 1532's file, not changed here).
for (const [w, h] of [[320, 640], [390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await fakeDb(page, false);
  const k = `away-${w}`;
  try {
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    const m0 = await page.evaluate(measure, { BANNER, name: 'How Stadium Tycoon works', btnText: "Let's go", scroll: 'bottom' });
    if (m0.at === 'button') await page.mouse.click(m0.cx, m0.cy);
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/robots.txt`);
    const aged = await page.evaluate(() => {
      const raw = localStorage.getItem('stadiumTycoonSaveV1');
      if (!raw) return 'no save';
      const s = JSON.parse(raw); s.savedAt = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem('stadiumTycoonSaveV1', JSON.stringify(s));
      return 'aged 3 h';
    });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    const first = await page.evaluate(measure, { BANNER, name: 'While you were away', btnText: 'Back to work', scroll: 'top' });
    await shot(page, `${k}-1first`);
    const bottom = await page.evaluate(measure, { BANNER, name: 'While you were away', btnText: 'Back to work', scroll: 'bottom' });
    await shot(page, `${k}-2bottom`);
    say(`S3 ${k} save ${aged}; first:  ${fmt(first)}`);
    say(`S3 ${k} bottom: ${fmt(bottom)}`);
    let escape = null;
    if (bottom.open && bottom.at !== 'button') {
      // the way out a player might find: tap the dark area above the box
      await page.mouse.click(Math.round(w / 2), Math.max(4, bottom.box.top - 8));
      await page.waitForTimeout(500);
      escape = !(await page.evaluate(() => !!document.querySelector('[aria-label="While you were away"]')));
      say(`S3 ${k} tapping the dark area above the box closes it: ${escape}`);
    }
    results[`S3 ${k}`] = { aged, first, bottom, escape };
  } catch (e) { say(`S3 ${k} ERROR ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}

// S4: the same first visit boxes once the banner is answered (Reject all): the 1rem pad and the cap must still look right.
for (const [route, name, btnText] of DIALOGS.slice(0, 3)) {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await fakeDb(page, false);
    const k = `answered-${tag(route)}-${w}`;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settle(page);
      await page.locator(BANNER).locator('button', { hasText: 'Reject all' }).first().click({ timeout: 5000, force: true });
      await page.waitForTimeout(800);
      const first = await page.evaluate(measure, { BANNER, name, btnText, scroll: 'top' });
      await shot(page, `${k}-1first`);
      const bottom = await page.evaluate(measure, { BANNER, name, btnText, scroll: 'bottom' });
      say(`S4 ${k} first:  ${fmt(first)}`);
      say(`S4 ${k} bottom: ${fmt(bottom)}`);
      results[`S4 ${k}`] = { first, bottom };
    } catch (e) { say(`S4 ${k} ERROR ${String(e.message).split('\n')[0]}`); }
    await ctx.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'play.json'), JSON.stringify(results, null, 1));
console.log(`play walk done: ${Object.keys(results).length} scenes measured`);
