// Release AM fences reviewer walk, never committed. Reaches every new surface of the six rounds the way a
// player would, at 390x844 and 1280x900, and asks the site wide rule questions of each: any dash in what
// is printed, one footer with the disclaimer, a how to play control, no sideways scroll, no page jump,
// tap targets, page errors, and which hosts the page tried to reach. usage: node walk.mjs [scenario ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const { chromium } = await imp('scripts/lib/playwrightLoader.mjs');
const BASE = process.env.BASE || 'http://127.0.0.1:4385';
const OUT = process.env.RC_OUT || 'C:/Users/antho/dukb-handoff/2026-10-08/review-shots/am-fences';
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const WANT = process.argv.slice(2);
const report = { base: BASE, runs: [], problems: [] };
const flush = () => fs.writeFileSync(path.join(OUT, 'walk-fences.json'), JSON.stringify(report, null, 2));
const problem = (tag, what, extra) => { report.problems.push({ tag, what, extra }); console.log(`  PROBLEM ${tag}: ${what}${extra ? ' | ' + String(extra).slice(0, 200) : ''}`); flush(); };
const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(view, name, init) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, hasTouch: view.w < 700 });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* private */ } });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const rec = { name, view: view.w, audits: [], notes: [], pageErrors: [], consoleErrors: [], hosts: {} };
  report.runs.push(rec);
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === new URL(BASE).origin) return route.continue();
    rec.hosts[u.host] = (rec.hosts[u.host] || 0) + 1;
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { rec.pageErrors.push(String(e).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource|ERR_ABORTED/.test(m.text())) rec.consoleErrors.push(m.text().slice(0, 240)); });
  return { ctx, page, rec };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const sleep = (page, ms) => page.waitForTimeout(ms);
const clickBtn = (page, re) => page.evaluate(src => {
  const r = new RegExp(src);
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && r.test(x.innerText));
  if (!b) return null;
  b.click();
  return b.innerText.replace(/\s+/g, ' ').trim().slice(0, 70);
}, re.source);

/* The rule questions, asked of whatever is on screen now. scope: a selector for the NEW surface, whose
   controls are measured for tap size; the dash scan covers the whole page plus its labels. */
async function audit(page, rec, tag, scope, isGame = true) {
  const a = await page.evaluate(sel => {
    const isDash = c => (c >= 0x2010 && c <= 0x2015) || c === 0x2212;
    const hits = [];
    const scan = (text, where) => {
      const s = String(text || '');
      for (let i = 0; i < s.length; i += 1) {
        if (isDash(s.codePointAt(i))) hits.push({ where, code: s.codePointAt(i).toString(16), near: s.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ') });
      }
    };
    scan(document.body.innerText, 'text');
    scan(document.title, 'title');
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
      for (const at of ['aria-label', 'title', 'placeholder', 'alt']) if (el.hasAttribute(at)) scan(el.getAttribute(at), at);
    }
    const text = document.body.innerText;
    const footers = [...document.querySelectorAll('footer')];
    const footText = footers.map(f => f.innerText).join(' ');
    const help = [...document.querySelectorAll('button, a')].filter(b => /how to play|how it works|rules|help/i.test(b.getAttribute('aria-label') || '') || /how it works/i.test(b.innerText) || b.innerText.trim() === '?' || /how to play/i.test(b.innerText));
    const imgs = [...new Set([...document.images].map(i => { try { return new URL(i.currentSrc || i.src, location.href).host; } catch { return 'bad-url'; } }))];
    const root = sel ? document.querySelector(sel) : null;
    const small = [];
    const cut = [];
    if (root) {
      const rr = root.getBoundingClientRect();
      for (const b of root.querySelectorAll('button, a, input')) {
        const r = b.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.width < 43.5 || r.height < 43.5) small.push({ t: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
      }
      for (const el of root.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > innerWidth + 1 || r.left < -1) cut.push({ t: (el.innerText || '').trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
        else if (!String(el.className).includes('sr-only') && el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') cut.push({ t: (el.innerText || '').trim().slice(0, 40), clipped: el.scrollWidth - el.clientWidth });
      }
      void rr;
    }
    return {
      url: location.pathname, scrollY: Math.round(scrollY), dashes: hits.slice(0, 12), dashCount: hits.length,
      footers: footers.length, disclaimer: /independent fan project/i.test(footText), uefa: /UEFA/.test(footText), reportBug: /report a bug/i.test(footText),
      helpControls: help.length, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      imgHosts: imgs, scopeFound: sel ? !!root : null, scopeText: root ? root.innerText.replace(/\s+/g, ' ').trim().slice(0, 900) : null, small, cut: cut.slice(0, 8),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null, textLength: text.length,
    };
  }, scope || null);
  a.tag = tag;
  rec.audits.push(a);
  const t = `${rec.name}@${rec.view} ${tag}`;
  if (a.dashCount) problem(t, `${a.dashCount} dash character(s) printed`, JSON.stringify(a.dashes.slice(0, 3)));
  if (a.footers !== 1) problem(t, `${a.footers} footer elements`);
  if (!a.disclaimer || !a.uefa) problem(t, 'footer disclaimer missing its required words');
  if (isGame && !a.helpControls) problem(t, 'no how to play or help control on screen');
  if (a.overflowX > 1) problem(t, `page scrolls sideways by ${a.overflowX}px`);
  if (scope && !a.scopeFound) problem(t, `new surface ${scope} is not on screen`);
  if (a.small.length) problem(t, `${a.small.length} control(s) under 44px in the new surface`, JSON.stringify(a.small.slice(0, 4)));
  if (a.cut.length) problem(t, `${a.cut.length} element(s) cut off or outside the screen in the new surface`, JSON.stringify(a.cut.slice(0, 3)));
  const foreign = a.imgHosts.filter(h => h && h !== new URL(BASE).host && h !== 'flagcdn.com');
  if (foreign.length) problem(t, 'image from a host other than the site or flagcdn.com', foreign.join(','));
  console.log(`  audit ${t}: dashes ${a.dashCount}, footers ${a.footers}, help ${a.helpControls}, overflowX ${a.overflowX}, small ${a.small.length}, cut ${a.cut.length}, scrollY ${a.scrollY}`);
  flush();
  return a;
}
const SCENARIOS = {};

/* Round 1088: the search chunk never arrives. A player taps the box and types. */
SCENARIOS.home = async view => {
  const { ctx, page, rec } = await open(view, 'home');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const box = 'input[aria-label="Search games"]';
  await page.waitForSelector(box, { timeout: 60000 });
  await sleep(page, 1500);
  await audit(page, rec, 'home before search');
  await page.route(/\/assets\/siteSearch-[^/]*\.js/, r => r.abort());
  let seen = 0;
  for (let attempt = 1; attempt <= 3 && !seen; attempt += 1) {
    try { await page.locator(box).click({ timeout: 8000 }); await page.locator(box).fill('messi', { timeout: 8000 }); } catch (e) { rec.notes.push(`attempt ${attempt}: ${String(e).split('\n')[0].slice(0, 120)}`); }
    await sleep(page, 2500);
    await page.waitForSelector(box, { timeout: 30000 }).catch(() => {});
    seen = await page.locator('[data-home-search-unavailable]').count();
    rec.notes.push(`attempt ${attempt}: notice on screen ${seen}, box holds "${await page.locator(box).inputValue().catch(() => '?')}"`);
  }
  if (!seen) problem(`home@${view.w}`, 'the search failure notice never appeared in three tries');
  await page.locator('[data-home-search-unavailable]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `home-${view.w}-search-failed`);
  const before = await audit(page, rec, 'search could not load', '[data-home-search-unavailable]', false);
  await clickBtn(page, /^Back to games$/);
  await sleep(page, 500);
  const after = await page.evaluate(sel => ({ y: Math.round(scrollY), value: document.querySelector(sel)?.value, focused: document.activeElement === document.querySelector(sel), notice: !!document.querySelector('[data-home-search-unavailable]') }), box);
  rec.notes.push(`Back to games: ${JSON.stringify(after)} (scrollY before ${before.scrollY})`);
  if (after.value !== '' || !after.focused || after.notice) problem(`home@${view.w}`, 'Back to games did not clear the query, refocus the box and remove the notice', JSON.stringify(after));
  if (Math.abs(after.y - before.scrollY) > 2) problem(`home@${view.w}`, `Back to games moved the page from ${before.scrollY} to ${after.y}`);
  await shot(page, `home-${view.w}-after-back`);
  await ctx.close();
};

/* Round 1086: boxing mode, one bout on the card, the forecast and its help. */
SCENARIOS.boxing = async view => {
  const { ctx, page, rec } = await open(view, 'boxing');
  await page.goto(`${BASE}/fight-promoter`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('button[aria-label="Boxing"]') || !!document.querySelector('#fight-promoter-name'), null, { timeout: 60000 });
  await sleep(page, 800);
  await audit(page, rec, 'mode choice');
  if (await page.locator('button[aria-label="Boxing"]').count()) await page.locator('button[aria-label="Boxing"]').click();
  await page.waitForSelector('#fight-promoter-name', { timeout: 30000 });
  await page.fill('#fight-promoter-name', 'Fence Hall');
  rec.notes.push(`start: ${await clickBtn(page, /^Book your first room/)}`);
  await sleep(page, 700);
  for (let k = 0; k < 5 && !(await page.locator('[data-boxing-forecast]').count()); k += 1) {
    const a = await clickBtn(page, /draw \d+/);
    await sleep(page, 250);
    const b = await clickBtn(page, /appeal \d+/);
    await sleep(page, 350);
    rec.notes.push(`bout try ${k}: ${a} v ${b}`);
    if (!b) { await clickBtn(page, /^Pick somebody else/); await sleep(page, 200); }
  }
  await page.locator('[data-boxing-forecast]').scrollIntoViewIfNeeded().catch(() => {});
  await sleep(page, 300);
  await shot(page, `boxing-${view.w}-forecast`);
  const before = await audit(page, rec, 'show cash forecast', '[data-boxing-forecast]');
  await page.locator('button[aria-label="Show cash rules"]').click({ timeout: 8000 }).catch(e => problem(`boxing@${view.w}`, 'the ? beside the forecast could not be pressed', String(e).split('\n')[0]));
  await sleep(page, 600);
  await shot(page, `boxing-${view.w}-help`);
  const open_ = await audit(page, rec, 'show cash help open', '[role="dialog"]');
  if (Math.abs(open_.scrollY - before.scrollY) > 2) problem(`boxing@${view.w}`, `opening the help moved the page from ${before.scrollY} to ${open_.scrollY}`);
  await clickBtn(page, /^Back to card$/);
  await sleep(page, 500);
  const closed = await page.evaluate(() => ({ y: Math.round(scrollY), dialog: !!document.querySelector('[role="dialog"]'), focus: document.activeElement?.getAttribute('aria-label') }));
  rec.notes.push(`help closed: ${JSON.stringify(closed)}`);
  if (closed.dialog || Math.abs(closed.y - before.scrollY) > 2) problem(`boxing@${view.w}`, 'closing the help left the dialog or moved the page', JSON.stringify(closed));
  await ctx.close();
};

/* Rounds 1083 and 1087: a ground that can be sold (a save the engine on main wrote), the review and its help. */
SCENARIOS.tycoon = async view => {
  const saves = JSON.parse(fs.readFileSync(path.join(HERE, 'saves.json'), 'utf8'));
  const { ctx, page, rec } = await open(view, 'tycoon');
  const helper = await ctx.newPage();
  await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  await helper.evaluate(([raw]) => { const s = JSON.parse(raw); s.savedAt = Date.now() - 5000; localStorage.setItem('stadiumTycoonSaveV1', JSON.stringify(s)); }, [saves.mainGreedy.raw]);
  await helper.close();
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-tycoon-pitch]', { timeout: 60000 });
  await sleep(page, 1200);
  rec.notes.push(`intro: ${await clickBtn(page, /^Let's go$/)} | away: ${await clickBtn(page, /Back to work/)}`);
  await sleep(page, 500);
  await shot(page, `tycoon-${view.w}-ground`);
  await audit(page, rec, 'ground with a sale ready');
  const sell = page.locator('[data-sell-up]');
  if (!(await sell.count())) { problem(`tycoon@${view.w}`, 'no Sell up button on a ground that can be sold'); await ctx.close(); return; }
  await sell.scrollIntoViewIfNeeded();
  await sleep(page, 300);
  await shot(page, `tycoon-${view.w}-sell-button`);
  const before = await audit(page, rec, 'sell up button in view', '[data-sell-up]');
  await sell.click();
  await page.waitForSelector('[data-tycoon-sale-review]', { timeout: 8000 }).catch(() => {});
  await sleep(page, 500);
  await shot(page, `tycoon-${view.w}-sale-review`);
  const review = await audit(page, rec, 'sale review open', '[data-tycoon-sale-review]');
  if (Math.abs(review.scrollY - before.scrollY) > 2) problem(`tycoon@${view.w}`, `opening the review moved the page from ${before.scrollY} to ${review.scrollY}`);
  await page.locator('button[aria-label="Sell up help"]').click({ timeout: 8000 }).catch(e => problem(`tycoon@${view.w}`, 'the ? in the review could not be pressed', String(e).split('\n')[0]));
  await sleep(page, 400);
  await shot(page, `tycoon-${view.w}-sale-help`);
  await audit(page, rec, 'sale help open', '[data-tycoon-sale-review]');
  await page.locator('[data-tycoon-sale-review] button', { hasText: /^Back to sale review$/ }).click();
  await sleep(page, 300);
  await page.locator('[data-tycoon-sale-review] button', { hasText: /^Back$/ }).click();
  await sleep(page, 500);
  const closed = await page.evaluate(() => ({ y: Math.round(scrollY), dialog: !!document.querySelector('[data-tycoon-sale-review]'), stillSellable: !!document.querySelector('[data-sell-up]'), stars: JSON.parse(localStorage.getItem('stadiumTycoonSaveV1') || '{}').rep }));
  rec.notes.push(`review closed with Back: ${JSON.stringify(closed)}`);
  if (closed.dialog || !closed.stillSellable || closed.stars !== 0) problem(`tycoon@${view.w}`, 'Back did not leave the sale untouched', JSON.stringify(closed));
  if (Math.abs(closed.y - before.scrollY) > 2) problem(`tycoon@${view.w}`, `closing the review moved the page from ${before.scrollY} to ${closed.y}`);
  await ctx.close();
};

/* Round 1084: the device refuses the save while a player is made, then accepts it on Retry save. */
SCENARIOS.uscareer = async view => {
  const KEY = 'nfl-my-career-save-v1';
  const { ctx, page, rec } = await open(view, 'uscareer', { fn: key => {
    const real = Storage.prototype.setItem;
    window.__refuse = true;
    Storage.prototype.setItem = function (k, v) { if (window.__refuse && k === key) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return real.call(this, k, v); };
  }, arg: KEY });
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[aria-label="Your player name"]', { timeout: 60000 });
  await sleep(page, 800);
  await audit(page, rec, 'create your player');
  await page.fill('input[aria-label="Your player name"]', 'Fence Walker');
  rec.notes.push(`create: ${await clickBtn(page, /^Enter the draft/)}`);
  await sleep(page, 1500);
  const notice = '[data-us-career-save-error]';
  if (!(await page.locator(notice).count())) problem(`uscareer@${view.w}`, 'a refused first save shows no notice');
  await shot(page, `uscareer-${view.w}-refused`);
  await audit(page, rec, 'save refused, as the page stands', notice);
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(page, 5000);
  await shot(page, `uscareer-${view.w}-refused-top`);
  const top = await audit(page, rec, 'save refused, top of page, toast gone', notice);
  const toasts = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.replace(/\s+/g, ' ').trim()));
  rec.notes.push(`toasts still up after 5s: ${JSON.stringify(toasts)} | on disk while refused: ${await page.evaluate(k => localStorage.getItem(k) === null ? 'nothing' : 'a save', KEY)}`);
  await page.evaluate(() => { window.__refuse = false; });
  await clickBtn(page, /^Retry save$/);
  await sleep(page, 600);
  const after = await page.evaluate(([k, sel]) => ({ notice: !!document.querySelector(sel), saved: (localStorage.getItem(k) || '').length, y: Math.round(scrollY) }), [KEY, notice]);
  rec.notes.push(`after Retry save: ${JSON.stringify(after)}`);
  if (after.notice || !after.saved) problem(`uscareer@${view.w}`, 'Retry save did not write the save and clear the notice', JSON.stringify(after));
  if (Math.abs(after.y - top.scrollY) > 2) problem(`uscareer@${view.w}`, `Retry save moved the page from ${top.scrollY} to ${after.y}`);
  await shot(page, `uscareer-${view.w}-after-retry`);
  await ctx.close();
};

/* Round 1089: the Soccer Career hub on a save the game's own engine wrote (a few seasons played). */
let hubSave = null;
async function makeHubSave() {
  if (hubSave) return hubSave;
  const { bundleAwardsNight } = await imp('scripts/lib/careerAwardsNightBundle.mjs');
  const { mulberry32 } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
  const { soccer } = await bundleAwardsNight(ROOT);
  const CLUBS = soccer.FALLBACK_CLUBS;
  const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const step = s => {
    switch (s.phase) {
      case 'youth': return soccer.advanceYouthYear(s, CLUBS);
      case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? soccer.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
      case 'playing': return soccer.advanceProSeason(s, CLUBS);
      case 'newspaper': return soccer.dismissNewspaper(s);
      case 'season_summary': return soccer.dismissSummary(s, CLUBS);
      case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
      case 'international_debut': return soccer.dismissDebut(s, CLUBS);
      case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
      case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
      case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
      case 'moral_dilemma': { const n = soccer.applyMoralDilemmaChoice(s, 0); return n.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(n, CLUBS) : n; }
      case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev && ev.choices && ev.choices.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
      case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
      case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
      case 'transfer_window': return soccer.stayAtClub(s);
      case 'retirement_suggestion': return soccer.declineRetirementSuggestion(s, CLUBS);
      default: return null;
    }
  };
  const real = Math.random;
  Math.random = mulberry32(1089);
  try {
    let s = soccer.initCareer('Fence Walker', 'England', 'ST', '2010-14', abil(78), 78, 2010, CLUBS, null, 92);
    for (let g = 0; g < 400 && s; g += 1) {
      if (s.phase === 'playing' && s.seasons.length >= 6) { hubSave = JSON.stringify(s); break; }
      s = step(s);
    }
  } finally { Math.random = real; }
  if (!hubSave) throw new Error('the engine never reached a playing season six');
  return hubSave;
}
SCENARIOS.hub = async view => {
  const save = await makeHubSave();
  const { ctx, page, rec } = await open(view, 'hub', { fn: v => {
    try { if (!sessionStorage.getItem('fence-walk')) { sessionStorage.setItem('fence-walk', '1'); localStorage.setItem('soccerCareerSave', v); localStorage.setItem('seasonCentre:help', '1'); } } catch { /* private */ }
  }, arg: save });
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => /career timeline/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => problem(`hub@${view.w}`, 'the hub with its Career Timeline never drew'));
  await sleep(page, 1800);
  await shot(page, `hub-${view.w}-top`);
  const m = await page.evaluate(() => {
    const grid = [...document.querySelectorAll('div.grid')].find(d => String(d.className).includes('md:grid-cols-[260px_1fr]'));
    if (!grid) return { grid: false };
    const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const kids = [...grid.children];
    const rail = kids.find(k => /career timeline/i.test(k.querySelector('span')?.innerText || ''));
    const list = grid.querySelector('div.overflow-y-auto.scrollbar-thin');
    return { grid: true, kids: kids.length, rail: rail ? rect(rail) : null, listInsideRail: !!(rail && list && rail.contains(list)), right: kids.filter(k => k !== rail).map(rect), seasonsListed: list ? list.children.length : 0 };
  });
  rec.notes.push(`hub grid: ${JSON.stringify(m)}`);
  if (!m.grid || m.kids !== 2 || !m.listInsideRail) problem(`hub@${view.w}`, 'the timeline list is not inside its sidebar card, or the grid does not hold exactly the rail and the right column', JSON.stringify(m));
  await audit(page, rec, 'career hub');
  await page.evaluate(() => { const g = [...document.querySelectorAll('div.grid')].find(d => String(d.className).includes('md:grid-cols-[260px_1fr]')); g?.scrollIntoView({ block: 'start' }); });
  await sleep(page, 400);
  await shot(page, `hub-${view.w}-grid`);
  await ctx.close();
};

for (const name of Object.keys(SCENARIOS)) {
  if (WANT.length && !WANT.includes(name)) continue;
  for (const view of VIEWS) {
    console.log(`== ${name} at ${view.w}x${view.h}`);
    try { await SCENARIOS[name](view); } catch (e) { problem(`${name}@${view.w}`, 'the walk itself stopped', String(e && e.stack || e).slice(0, 400)); }
    flush();
  }
}
await browser.close();
const errors = report.runs.reduce((n, r) => n + r.pageErrors.length, 0);
console.log(`walk-fences: ${report.runs.length} runs, ${report.problems.length} problem(s), ${errors} page error(s)`);
for (const r of report.runs) console.log(`  ${r.name}@${r.view}: hosts tried ${JSON.stringify(r.hosts)}; page errors ${r.pageErrors.length}; console errors ${r.consoleErrors.length}`);
flush();
process.exit(report.problems.length || errors ? 1 : 0);
