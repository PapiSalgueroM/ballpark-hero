// Reviewer play walk for Round 1328 (run lens). Runs from the repo root on a runner: node .rc/x/rvwalk.mjs
// HEAD build on HEAD_URL (or BASE, the #!serve build); optional base build on BASE_URL for the old save case.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const HEAD = (process.env.HEAD_URL ?? process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const BASEB = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : null;
const OUT = process.env.RC_OUT ?? path.join('.tmp-fx', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = new Set((process.env.RV_PARTS ?? 'PBOX').split(''));
const browser = await chromium.launch();
const notes = [];
const note = (tag, msg) => { notes.push(`${tag}: ${msg}`); console.log(`  NOTE  ${tag}: ${msg}`); };
const bad = [];
const flag = (tag, msg) => { bad.push(`${tag}: ${msg}`); console.log(`  FLAG  ${tag}: ${msg}`); };

function init({ consent }) {
  if (consent) { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ } }
  window.__hubFirst = null;
  window.__trail = [];
  const tick = () => {
    const b = document.querySelector('[data-testid="cm-show-slots"]');
    if (b) {
      const r = b.closest('header').getBoundingClientRect();
      if (!window.__hubFirst) window.__hubFirst = { scrollY: scrollY, top: r.top, t: performance.now() };
      if (window.__trail.length < 90) window.__trail.push(Math.round(scrollY));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
async function openPage(url, size, { reduced = true, consent = true, store = null } = {}) {
  const origin = new URL(url).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(init, { consent });
  if (store) await ctx.addInitScript(s => { if (!sessionStorage.getItem('rv-seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('rv-seeded', '1'); } }, store);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }).catch(() => {});
const sy = page => page.evaluate(() => Math.round(scrollY));
/* A player's tap: bring the thing into view with the wheel if needed, then a mouse click on its centre. */
async function tap(page, loc) {
  await loc.first().waitFor();
  for (let i = 0; i < 30; i += 1) {
    const b = await loc.first().boundingBox();
    const vh = page.viewportSize().height;
    if (b && b.y >= 0 && b.y + b.height <= vh - 10) { await page.mouse.click(b.x + b.width / 2, b.y + Math.min(b.height / 2, 20)); return; }
    await page.mouse.wheel(0, b && b.y < 0 ? -300 : 300);
    await page.waitForTimeout(120);
  }
  throw new Error('could not bring the target on screen');
}
const tile = (page, title) => page.locator('[data-cm-hub] .grid > button, .grid > button').filter({ has: page.locator(`div.uppercase:text-is("${title}")`) });
async function pickAndStart(page, url, { era, nation, league, club, take, entry }, tag) {
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
  await tap(page, page.locator('button', { hasText: era }));
  await tap(page, page.locator('button', { hasText: nation }));
  await page.waitForTimeout(600);
  const tiles = page.locator('button', { hasText: 'Board wants' });
  if (await tiles.count() === 0) await tap(page, page.locator('button', { hasText: league }));
  await tiles.filter({ hasText: club }).first().waitFor();
  if (tag) await shot(page, `team-${tag}`);
  await tap(page, tiles.filter({ hasText: club }));
  await tap(page, page.locator('div.fixed button', { hasText: 'Take the job' }));
  const skip = page.getByRole('button', { name: /^Skip: just manage$/ });
  await skip.first().waitFor();
  if (entry) await tap(page, page.locator('button', { hasText: entry }));
  if (take) {
    await page.locator('input[placeholder="e.g. Sam Calloway"]').fill('Jo Walker');
    await tap(page, page.locator('button', { hasText: 'Take the job' }).last());
  } else await tap(page, skip);
  await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 120000 });
}
async function hubTiles(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-cm-hub] .grid > button')].map(b => {
    const d = [...b.querySelectorAll(':scope > div')];
    const i = d.findIndex(x => x.classList.contains('uppercase'));
    return i < 0 ? null : { t: d[i].textContent.trim(), v: d[i + 1]?.innerText.trim() ?? '', s: d[i + 2]?.innerText.trim() ?? '' };
  }).filter(Boolean));
}
const BADW = /undefined|NaN|\[object Object\]|Infinity/;

/* P. Play: a new job at three sizes, motion reduced and not; the first frame, the frames after it, the
   calendar taps by mouse, a Sim to, the report and back, the training panel. */
const CONFIGS = [
  { tag: 'p390r', size: { width: 390, height: 844 }, reduced: true, club: 'Liverpool', take: true },
  { tag: 'p390m', size: { width: 390, height: 844 }, reduced: false, club: 'Arsenal', take: false },
  { tag: 'p1280r', size: { width: 1280, height: 900 }, reduced: true, club: 'Chelsea', take: true },
  { tag: 'p1280m', size: { width: 1280, height: 900 }, reduced: false, club: 'Manchester City', take: false, entry: 'Autumn' },
  { tag: 'p320r', size: { width: 320, height: 640 }, reduced: true, club: 'Newcastle', take: false, entry: 'New year' },
];
if (ONLY.has('P')) for (const cf of CONFIGS) {
  const { ctx, page, errors } = await openPage(HEAD, cf.size, { reduced: cf.reduced });
  try {
    await pickAndStart(page, HEAD, { era: '2026-27', nation: 'England', league: 'Premier League', club: cf.club, take: cf.take, entry: cf.entry }, cf.tag);
    await shot(page, `hub-first-${cf.tag}`);
    await page.waitForTimeout(1500);
    const { first, trail } = await page.evaluate(() => ({ first: window.__hubFirst, trail: window.__trail }));
    const moved = Math.max(...trail) - Math.min(...trail);
    note(cf.tag, `first hub frame: header top ${Math.round(first.top)} at scrollY ${first.scrollY}; scrollY over ${trail.length} frames moved ${moved} px (${[...new Set(trail)].slice(0, 6).join(',')})`);
    if (first.top < -2 || first.top > 120) flag(cf.tag, `header top ${Math.round(first.top)} on the first frame`);
    if (moved > 0) flag(cf.tag, `the page moved ${moved} px after the first hub frame`);
    await shot(page, `hub-settled-${cf.tag}`);
    await shot(page, `hub-full-${cf.tag}`, true);
    const tl = await hubTiles(page);
    note(cf.tag, `tiles: ${tl.map(x => `${x.t}=${x.v}|${x.s}`).join(' ; ').slice(0, 900)}`);
    if (tl.some(x => BADW.test(x.v + x.s))) flag(cf.tag, 'a tile draws undefined, NaN, [object Object] or Infinity');
    // Calendar by a real tap.
    const y0 = await sy(page);
    await tap(page, tile(page, 'Calendar'));
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    await page.waitForTimeout(800);
    const gridTop = await page.evaluate(() => Math.round(document.querySelector('[data-testid="cm-calendar-grid"]').getBoundingClientRect().top));
    note(cf.tag, `calendar opened from scrollY ${y0} to ${await sy(page)}; grid top at ${gridTop} of ${cf.size.height}`);
    await shot(page, `cal-open-${cf.tag}`);
    const cells = page.locator('[data-testid="cm-calendar-grid"] > button');
    const n = await cells.count();
    for (const idx of [n - 1, Math.floor(n / 2), 0]) {
      const cell = cells.nth(idx);
      const lab = await cell.getAttribute('aria-label');
      await tap(page, cell);
      const b = await page.evaluate(() => Math.round(scrollY));
      await page.waitForTimeout(700);
      const a = await sy(page);
      const strip = await page.evaluate(() => { const s = document.querySelector('[data-testid="cm-calendar-day"]'); const r = s?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), text: s.innerText.split('\n')[0] } : null; });
      const cb = await cell.boundingBox();
      note(cf.tag, `tap ${lab}: scrollY ${b} to ${a}; strip ${strip ? `${strip.top} to ${strip.bottom} "${strip.text}"` : 'none'}; cell at ${Math.round(cb?.y ?? -1)}`);
      if (a !== b) flag(cf.tag, `a day tap moved the page ${a - b} px`);
      if (!strip || strip.bottom > cf.size.height + 1 || strip.top < 0) flag(cf.tag, `the strip is not wholly on screen after tapping ${lab}`);
      await shot(page, `cal-tap${idx}-${cf.tag}`);
    }
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(500);
    await shot(page, `cal-bottom-${cf.tag}`);
    const names = await page.evaluate(() => document.body.innerText.match(/Rest first|Full training|Balanced rhythm/g));
    if (names) flag(cf.tag, `old intensity words on the calendar: ${names.join(', ')}`);
    // Sim to the next match day, then the report, then back to the hub: where does the page land?
    const target = await page.evaluate(() => [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].map(b => b.getAttribute('aria-label')).find(l => / (vs|at|v) /.test(l ?? '') && !/played|[0-9]-[0-9]/i.test(l)) ?? null);
    if (target) {
      await tap(page, page.locator(`[data-testid="cm-calendar-grid"] > button[aria-label="${target.replace(/"/g, '\\"')}"]`));
      await page.waitForTimeout(400);
      const simBtn = page.locator('[data-testid="cm-calendar-day"] button', { hasText: 'Sim to' });
      if (await simBtn.count()) {
        await page.evaluate(() => { window.__hubFirst = null; window.__trail = []; });
        await tap(page, simBtn);
        await page.waitForTimeout(2500);
        note(cf.tag, `after Sim to ${target.split(':')[0]}: scrollY ${await sy(page)}, h1 "${await page.evaluate(() => document.querySelector('h1, h2')?.innerText ?? '')}"`);
        await shot(page, `simto-${cf.tag}`);
        const cont = page.locator('button', { hasText: /^Continue/ });
        if (await cont.count()) {
          await page.evaluate(() => { window.__hubFirst = null; window.__trail = []; });
          await tap(page, cont);
          await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 30000 }).catch(() => {});
          await page.waitForTimeout(1200);
          const back = await page.evaluate(() => ({ first: window.__hubFirst, trail: window.__trail }));
          note(cf.tag, `back on the hub after the report: header top ${back.first ? Math.round(back.first.top) : '?'}; frames moved ${back.trail.length ? Math.max(...back.trail) - Math.min(...back.trail) : '?'}`);
          await shot(page, `after-report-${cf.tag}`);
        }
      } else note(cf.tag, `no Sim to button for ${target}`);
    }
    // Training panel, by a real tap.
    const home = page.locator('button', { hasText: 'Club home' });
    if (await home.count()) await tap(page, home);
    await page.waitForTimeout(400);
    if (await tile(page, 'Training').count()) {
      await tap(page, tile(page, 'Training'));
      await page.waitForTimeout(800);
      await shot(page, `training-${cf.tag}`);
      const tt = await page.evaluate(() => document.body.innerText.match(/Light|Normal|Double|Rest first|Full training/g)?.slice(0, 8));
      note(cf.tag, `training words: ${tt?.join(',')}`);
    }
    if (errors.length) flag(cf.tag, `page error ${errors[0].slice(0, 160)}`);
  } catch (e) {
    flag(cf.tag, `broke: ${String(e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `stuck-${cf.tag}`);
  }
  await ctx.close();
}

/* B. The cookie banner up, a day tapped, then the banner answered: where does the strip sit? */
if (ONLY.has('B')) {
  const { ctx, page } = await openPage(HEAD, { width: 390, height: 844 }, { consent: false });
  const click = async loc => { await loc.first().waitFor(); await loc.first().evaluate(b => b.click()); await page.waitForTimeout(500); };
  try {
    await page.goto(`${HEAD}/club-manager`, { waitUntil: 'domcontentloaded' });
    await click(page.locator('button', { hasText: '2026-27' }));
    await click(page.locator('button', { hasText: 'England' }));
    await click(page.locator('button', { hasText: 'Premier League' }));
    await click(page.locator('button', { hasText: 'Board wants' }).filter({ hasText: 'Liverpool' }));
    await click(page.locator('div.fixed button', { hasText: 'Take the job' }));
    await click(page.getByRole('button', { name: /^Skip: just manage$/ }));
    await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 120000 });
    await click(tile(page, 'Calendar'));
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    await page.evaluate(() => { const c = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')]; c[c.length - 1].click(); });
    await page.waitForTimeout(600);
    const box = () => page.evaluate(() => { const r = document.querySelector('[data-testid="cm-calendar-day"]').getBoundingClientRect(); const b = document.querySelector('[role="region"][aria-label="Cookie choices"]'); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, banner: b && getComputedStyle(b).position === 'fixed' ? Math.round(b.getBoundingClientRect().top) : null }; });
    note('banner', `with the banner up: strip ${JSON.stringify(await box())}`);
    await shot(page, 'banner-up');
    await click(page.locator('button', { hasText: 'Essential only' }));
    await page.waitForTimeout(600);
    const after = await box();
    note('banner', `after Essential only: strip ${JSON.stringify(after)}`);
    if (after.banner === null && after.vh - after.bottom > 40) flag('banner', `after the banner is answered the strip floats ${after.vh - after.bottom} px above the foot of the screen until the next tap`);
    await shot(page, 'banner-answered');
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(400);
    note('banner', `after scrolling up 200: strip ${JSON.stringify(await box())}`);
    await shot(page, 'banner-answered-scrolled');
  } catch (e) { flag('banner', `broke: ${String(e).split('\n')[0].slice(0, 200)}`); await shot(page, 'banner-stuck'); }
  await ctx.close();
}

/* O. A save written by the BASE build, loaded by the head build (and by the base again, for the bytes). */
async function playOn(url, career, sims) {
  const { ctx, page } = await openPage(url, { width: 390, height: 844 });
  await pickAndStart(page, url, career, null);
  for (let i = 0; i < sims * 2 + 4 && sims > 0; i += 1) {
    const cont = page.locator('button', { hasText: /^Continue/ });
    const quick = page.locator('button', { hasText: 'Quick Sim' });
    if (await cont.count() && await cont.first().isVisible()) await cont.first().evaluate(b => b.click());
    else if (await quick.count()) { await quick.first().evaluate(b => b.click()); sims -= 1; }
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(800);
  const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('dukb-')).map(k => [k, localStorage.getItem(k)])));
  await ctx.close();
  return store;
}
async function resumeOn(url, store, tag) {
  const { ctx, page, errors } = await openPage(url, { width: 390, height: 844 }, { store });
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: 'Resume Career' }).first().evaluate(b => b.click());
  await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const first = await page.evaluate(() => window.__hubFirst);
  const tl = await hubTiles(page);
  if (tag) await shot(page, `old-${tag}`);
  const saved = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('dukb-club-manager')).map(k => [k, localStorage.getItem(k)])));
  let inbox = '', manager = '';
  if (tag) {
    for (const [t, set] of [['Inbox', v => { inbox = v; }], ['Manager', v => { manager = v; }]]) {
      const b = tile(page, t);
      if (await b.count()) { await b.first().evaluate(x => x.click()); await page.waitForTimeout(800); set(await page.evaluate(() => document.querySelector('[data-cm-hub]')?.innerText ?? '')); await shot(page, `old-${tag}-${t}`); const h = page.locator('button', { hasText: 'Club home' }); if (await h.count()) await h.first().evaluate(x => x.click()); await page.waitForTimeout(300); }
    }
  }
  await ctx.close();
  return { first, tl, saved, inbox, manager, errors };
}
if (ONLY.has('O') && BASEB) {
  const OLD = [
    { tag: 'celta', career: { era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false }, sims: 4 },
    { tag: 'everton05', career: { era: '2005-06', nation: 'England', league: 'Premier League', club: 'Everton', take: true, entry: 'New year' }, sims: 0 },
  ];
  for (const o of OLD) {
    try {
      const store = await playOn(BASEB, o.career, o.sims);
      note(`old-${o.tag}`, `base wrote keys ${Object.keys(store).filter(k => k.startsWith('dukb-club-manager')).map(k => `${k} ${store[k].length}`).join(', ')}`);
      const h = await resumeOn(HEAD, store, o.tag);
      const b = await resumeOn(BASEB, store, null);
      note(`old-${o.tag}`, `head: header top ${Math.round(h.first.top)}; tiles ${h.tl.map(x => `${x.t}=${x.v}|${x.s}`).join(' ; ').slice(0, 700)}`);
      if (h.tl.some(x => BADW.test(x.v + x.s))) flag(`old-${o.tag}`, 'a tile draws undefined, NaN, [object Object] or Infinity');
      const inb = h.tl.find(x => x.t === 'Inbox');
      if (inb && inb.s !== 'No messages yet' && !h.inbox.toLowerCase().includes(inb.s.toLowerCase())) flag(`old-${o.tag}`, `the Inbox tile names "${inb.s}" and the panel does not`);
      if (inb && inb.s === 'No messages yet' && !/Nobody has texted you yet/.test(h.inbox)) flag(`old-${o.tag}`, 'the Inbox tile says No messages yet and the panel holds something');
      const man = h.tl.find(x => x.t === 'Manager');
      if (man && /^[\d,]+W/.test(man.v) && !h.manager.includes(man.v)) flag(`old-${o.tag}`, `the Manager tile "${man.v}" is not in the Manager panel`);
      for (const k of new Set([...Object.keys(h.saved), ...Object.keys(b.saved)])) {
        const same = h.saved[k] === b.saved[k];
        note(`old-${o.tag}`, `after Resume, ${k}: head ${h.saved[k]?.length ?? 0} bytes, base ${b.saved[k]?.length ?? 0} bytes, ${same ? 'byte equal' : 'DIFFERENT'}; store before ${store[k]?.length ?? 0}`);
        if (!same) flag(`old-${o.tag}`, `${k} differs after Resume on head against base`);
      }
      if (h.errors.length) flag(`old-${o.tag}`, `page error ${h.errors[0].slice(0, 160)}`);
    } catch (e) { flag(`old-${o.tag}`, `broke: ${String(e).split('\n')[0].slice(0, 200)}`); }
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-notes.json'), JSON.stringify({ notes, bad }, null, 1));
console.log(`rvwalk: ${bad.length} flag(s), ${notes.length} note(s)`);
process.exit(bad.length ? 1 : 0);
