/* qa-us hunt walk: plays one US My Career through the real UI like a player.
   Env: SPORT (nfl|nba|mlb|nhl) W H SEED POS NAME SEASONS MAXMIN TAG ROAD (1 = road to the draft, 0 = quick start)
        CENTRE (1 = first season through Week by week) SHOTMAX */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = (await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/out';
fs.mkdirSync(OUT, { recursive: true });
const SPORT = process.env.SPORT || 'nba';
const W = Number(process.env.W || 390), H = Number(process.env.H || 844);
const TAG = process.env.TAG || `${SPORT}-${W}`;
const SEED = Number(process.env.SEED || 4242);
const POS = process.env.POS || '';
const NAME = process.env.NAME || 'Maximilian Okonkwo-Smith';
const SEASONS = Number(process.env.SEASONS || 2);
const MAXMS = Number(process.env.MAXMIN || 17) * 60000;
const ROAD = process.env.ROAD !== '0';
const CENTRE = process.env.CENTRE !== '0';
const SHOTMAX = Number(process.env.SHOTMAX || 70);
const EDGE = process.env.EDGE === '1';
const edge = {};
const ROUTE = `/${SPORT}-my-career`;
const SAVE_KEY = `${SPORT}-my-career-save-v1`;
const mobile = W < 768;
const T0 = Date.now();
const log = { tag: TAG, SPORT, W, H, SEED, POS, steps: [], audits: [], errors: [], pageErrors: [], failedRequests: [], events: [], outcomes: [], curtains: [], hub: [], tiles: [], centre: [], stuck: [], notes: [], shots: [], draft: {}, reload: [], inbox: [], practice: [], edge: [], programme: [] };
let shots = 0;
const flush = () => fs.writeFileSync(path.join(OUT, `${TAG}-log.json`), JSON.stringify(log, null, 1));
const say = m => { console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${m}`); };
const note = m => { log.notes.push(m); say(`NOTE ${m}`); };
let rng = (SEED * 9301 + 49297) % 233280;
const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
await ctx.addInitScript(s => {
  let t = s >>> 0;
  Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* none */ }
}, SEED);
const page = await ctx.newPage();
await page.route(/supabase\.co/, r => r.abort());
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const text = m.text(); if (/supabase|ERR_FAILED|net::/.test(text)) return; log.errors.push({ t: m.type(), at: log.steps.length, text: text.slice(0, 300) }); } });
page.on('pageerror', e => log.pageErrors.push({ at: log.steps.length, text: String(e).slice(0, 400) }));
page.on('requestfailed', r => { if (!/supabase\.co|google|doubleclick|adsbygoogle|gstatic|flagcdn|fonts/.test(r.url())) log.failedRequests.push(r.url().slice(0, 200)); });

async function shot(name, full = false) {
  if (shots >= SHOTMAX) return null;
  shots += 1;
  const f = `${TAG}-${String(shots).padStart(2, '0')}-${name}.jpg`;
  try { await page.screenshot({ path: path.join(OUT, f), fullPage: full, type: 'jpeg', quality: 50 }); log.shots.push(f); } catch (e) { log.notes.push(`shot ${f} failed ${String(e).slice(0, 80)}`); }
  return f;
}

/* What is on the screen: the board's own elements (main's children between the title and the SEO block),
   plus any overlay. */
const STATE_FN = () => {
  const vis = el => { if (!el) return false; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const main = document.querySelector('#dukb-main');
  const kids = main ? [...main.children] : [];
  const board = kids.slice(1, Math.max(1, kids.length - 2));
  const overlays = [...document.querySelectorAll('[data-season-centre], [data-season-centre-loading], [data-us-centre-cover], [role=dialog], [data-radix-popper-content-wrapper], [data-sonner-toast]')].filter(vis);
  const roots = [...board, ...overlays];
  const buttons = [];
  for (const r of roots) for (const b of r.querySelectorAll('button')) if (vis(b)) buttons.push({ t: (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 70), d: b.disabled });
  const q = s => [...document.querySelectorAll(s)].find(vis);
  const prospect = q('[data-prospect-journey]');
  const centre = q('[data-season-centre]') || q('[data-season-centre-loading]');
  return {
    buttons,
    centre: !!centre,
    centreHelp: !!q('[data-season-help]'),
    popover: !!q('[data-radix-popper-content-wrapper]'),
    dialog: [...document.querySelectorAll('[role=dialog]')].filter(vis).map(d => d.getAttribute('aria-label') || d.innerText.slice(0, 40)),
    create: !!q('input[aria-label="Your player name"]'),
    prospect: prospect ? prospect.getAttribute('data-prospect-phase') : null,
    decisionEvent: q('[data-career-decision-event]')?.getAttribute('data-career-decision-event') ?? null,
    decisionContinue: !!q('[data-decision-continue]'),
    rivalryOption: !!q('[data-rivalry-option]'),
    wheelSpin: !!q('[data-market-spin]'),
    wheelContinue: !!q('[data-market-continue]'),
    practice: !!q('[data-practice-rules]') || !!q('[data-training-result]') || !!q('[data-practice-chrome]'),
    toast: [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.slice(0, 120)),
    url: location.pathname,
  };
};
const state = () => page.evaluate(STATE_FN);

const AUDIT_FN = () => {
  const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const Wd = innerWidth;
  const main = document.querySelector('#dukb-main');
  const kids = main ? [...main.children] : [];
  const board = kids.slice(1, Math.max(1, kids.length - 2));
  const overlays = [...document.querySelectorAll('[data-season-centre], [role=dialog], [data-sonner-toast]')].filter(vis);
  const roots = overlays.some(o => o.matches('[data-season-centre]')) ? overlays : [...board, ...overlays];
  const out = { overX: document.documentElement.scrollWidth - Wd, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight };
  const text = roots.map(r => r.innerText).join('\n');
  out.bad = [];
  for (const src of ['\\bundefined\\b', '\\bNaN\\b', '\\[object \\w+\\]', '\\bnull\\b', '\\bInfinity\\b', '\\$-\\d', '(?<![\\d\\w])-0(?![\\d.])']) { const m = text.match(new RegExp(`.{0,50}${src}.{0,50}`)); if (m) out.bad.push(m[0]); }
  const trunc = [], off = [], small = [];
  for (const r of roots) for (const el of r.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    if (el.children.length === 0 || cs.textOverflow === 'ellipsis') {
      if (el.scrollWidth > el.clientWidth + 1 && (cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.clientWidth > 2) trunc.push(`${(el.innerText || '').trim().slice(0, 70)} [${el.clientWidth}<${el.scrollWidth}]`);
    }
    if (/^(BUTTON|P|SPAN|H1|H2|H3|A|LI|TD|DIV)$/.test(el.tagName) && el.children.length === 0 && b.right > Wd + 1 && b.left < Wd && cs.position !== 'fixed') off.push(`${el.tagName}:${(el.innerText || '').trim().slice(0, 50)} r=${Math.round(b.right)}`);
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && (b.height < 30 || b.width < 30)) small.push(`${(el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)} ${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  out.trunc = [...new Set(trunc)].slice(0, 15);
  out.off = [...new Set(off)].slice(0, 10);
  out.small = [...new Set(small)].slice(0, 15);
  let inView = 0;
  for (const r of roots) for (const b of r.querySelectorAll('button')) { const x = b.getBoundingClientRect(); if (vis(b) && x.top >= 0 && x.bottom <= innerHeight) inView += 1; }
  out.buttonsInView = inView;
  return out;
};
const seenAudit = new Set();
async function audit(where) {
  let a;
  try { a = await page.evaluate(AUDIT_FN); } catch (e) { log.notes.push(`audit ${where} failed ${String(e).slice(0, 80)}`); return null; }
  a.where = where;
  a.t = Math.round((Date.now() - T0) / 1000);
  log.audits.push(a);
  for (const k of ['bad', 'trunc', 'off', 'small']) for (const v of a[k]) { const key = `${k}:${v}`; if (!seenAudit.has(key)) { seenAudit.add(key); say(`AUDIT ${where} ${k}: ${v}`); } }
  if (a.overX > 0) say(`AUDIT ${where} overflow-x ${a.overX}`);
  if (a.buttonsInView === 0) say(`AUDIT ${where} no button in the viewport (scrollY ${a.scrollY})`);
  return a;
}

/* A press, the way a thumb does it: the player scrolls it into view first; the scroll the app itself does after the press is recorded. */
const SCOPE = '#dukb-main button, [data-season-centre] button, [data-season-centre-loading] button, [role=dialog] button, [data-sonner-toast] button';
async function press(match, label, { exact = false, nth = 0, sel = SCOPE } = {}) {
  let loc = page.locator(sel).filter({ hasText: match });
  if (exact) loc = page.locator(sel).filter({ hasText: new RegExp(`^\\s*${String(match).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });
  const all = await loc.all();
  const visible = [];
  for (const l of all) if (await l.isVisible().catch(() => false)) visible.push(l);
  const target = visible[nth] ?? visible[0];
  if (!target) { log.steps.push({ t: Math.round((Date.now() - T0) / 1000), act: `MISSING ${label}` }); return false; }
  if (await target.isDisabled().catch(() => false)) { log.steps.push({ act: `DISABLED ${label}` }); return false; }
  const before = await page.evaluate(() => Math.round(scrollY));
  await target.scrollIntoViewIfNeeded().catch(() => {});
  const reached = await page.evaluate(() => Math.round(scrollY));
  const text = (await target.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 60);
  try { await target.click({ timeout: 8000 }); } catch (e) { log.steps.push({ act: `CLICKFAIL ${label} ${String(e).slice(0, 120)}` }); return false; }
  await sleep(450);
  const after = await page.evaluate(() => Math.round(scrollY));
  log.steps.push({ t: Math.round((Date.now() - T0) / 1000), act: label, text, scroll: [before, reached, after] });
  return true;
}

const save = () => page.evaluate(k => { try { const s = JSON.parse(localStorage.getItem(k)); return s ? { phase: s.phase, seasons: s.c?.seasons?.length ?? null, year: s.c?.year, age: s.c?.age, ovr: s.c?.ovr, team: s.c?.team, salary: s.c?.salary, cy: s.c?.contractYears, morale: s.c?.morale, fanbase: s.c?.fanbase, health: s.c?.health, net: s.c?.netWorth, summer: s.c?.summer ?? null, last: s.c?.seasons?.at?.(-1) ?? null } : null; } catch { return 'unreadable'; } }, SAVE_KEY);

async function hubChips() {
  return page.evaluate(() => {
    const main = document.querySelector('#dukb-main');
    const chips = [...(main?.querySelectorAll('span.rounded-full') ?? [])].slice(0, 8).map(s => s.innerText.trim()).filter(Boolean);
    const play = [...(main?.querySelectorAll('button') ?? [])].map(b => b.innerText.trim()).find(t => /^Play the \d{4} season/.test(t)) ?? null;
    const so = [...(main?.querySelectorAll('p') ?? [])].map(p => p.innerText.trim()).find(t => t.startsWith('Career so far')) ?? null;
    const last = [...(main?.querySelectorAll('p') ?? [])].map(p => p.innerText.trim()).find(t => t.startsWith('Last season')) ?? null;
    const tiles = [...(main?.querySelectorAll('[data-career-hub-buttons] button') ?? [])].map(b => b.innerText.replace(/\s+/g, ' ').trim());
    return { chips, play, so, last, tiles };
  });
}

const TILES = [['My Player', 'Hub'], ['The Bank', 'Hub'], ['Career Log', 'Back to career'], ['Trophy Case', 'Hub'], ['News', 'Hub'], ['Inbox', 'Hub']];
async function openTile(word, back, tag, extra) {
  const before = await page.evaluate(() => Math.round(scrollY));
  const tile = page.locator('[data-career-hub-buttons] button').filter({ hasText: new RegExp(word, 'i') }).first();
  if (!(await tile.isVisible().catch(() => false))) { log.tiles.push({ tag, word, missing: true }); return; }
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  await sleep(900);
  const a = await audit(`tile ${word} ${tag}`);
  const text = await page.evaluate(() => { const m = document.querySelector('#dukb-main'); const k = m ? [...m.children] : []; return k.slice(1, -2).map(x => x.innerText).join('\n').slice(0, 1500); });
  const f = await shot(`tile-${word.replace(/\s+/g, '').toLowerCase()}-${tag}`);
  if (extra) await extra();
  const ok = await press(new RegExp(`^\\s*${back}\\s*$`), `back from ${word}`, {});
  await sleep(500);
  const after = await page.evaluate(() => Math.round(scrollY));
  const focus = await page.evaluate(() => (document.activeElement?.innerText || '').replace(/\s+/g, ' ').slice(0, 40));
  log.tiles.push({ tag, word, shot: f, text, backOk: ok, scroll: [before, a?.scrollY, after], focus });
  if (!ok) { note(`no way back from ${word} (${back}); reloading`); await page.reload(); await sleep(1500); }
}

async function inboxRead() {
  const rows = await page.locator('[data-inbox-row]').all();
  log.inbox.push({ rows: rows.length });
  for (let i = 0; i < Math.min(rows.length, 2); i += 1) {
    const row = page.locator('[data-inbox-row]').nth(0);
    if (!(await row.isVisible().catch(() => false))) break;
    await row.click(); await sleep(500);
    const body = await page.evaluate(() => { const m = document.querySelector('#dukb-main'); const k = m ? [...m.children] : []; return k.slice(1, -2).map(x => x.innerText).join('\n').slice(0, 600); });
    await shot('inbox-open');
    const opts = await page.locator('#dukb-main button').all();
    let answered = false;
    for (const o of opts) { const t = (await o.innerText().catch(() => '')).trim(); if (t && !/^(Hub|Back|.*Back.*|Inbox)$/i.test(t) && t.length > 6 && (await o.isVisible())) { await o.click(); answered = t; break; } }
    log.inbox.push({ body, answered });
    await sleep(600);
  }
}

async function bankTry() {
  /* the shop: the fourth tab of the money app */
  const shopTab = page.locator('#dukb-main button').filter({ hasText: /shop/i }).first();
  if (await shopTab.isVisible().catch(() => false)) {
    await shopTab.click(); await sleep(500);
    await shot('bank-shop');
    await audit('bank shop');
    const buy = page.locator('#dukb-main button:not([disabled])').filter({ hasText: /^\$[\d.]+M$|^Hire$/ }).first();
    if (await buy.isVisible().catch(() => false)) { const t = await buy.innerText(); const s0 = await save(); await buy.click(); await sleep(600); const s1 = await save(); log.notes.push(`bought ${t}; save salary ${s0?.salary} -> ${s1?.salary}`); await shot('bank-bought'); }
  } else note('no shop tab in the Bank');
}

async function practiceTry() {
  const ok = await press(/^(Start practice|View practice)$/, 'open practice');
  if (!ok) return;
  await sleep(1500);
  await shot('practice-menu');
  await audit('practice menu');
  const drill = page.locator('[role=dialog] button, .fixed button').filter({ hasText: /Trains/ }).first();
  if (await drill.isVisible().catch(() => false)) {
    await drill.click(); await sleep(1200);
    await shot('practice-drill');
    const box = await page.locator('.fixed .max-w-md').first().boundingBox().catch(() => null);
    const t1 = Date.now();
    while (Date.now() - t1 < 45000) {
      const res = await page.locator('[data-training-result]').isVisible().catch(() => false);
      if (res) break;
      /* tap around the drill like a thumb would */
      const btns = await page.locator('.fixed button:visible').all();
      const cands = [], nums = [];
      for (const b of btns) { const t = (await b.innerText().catch(() => '')).trim(); if (/^\d+$/.test(t)) nums.push([Number(t), b]); else if (!/Close|Pause|Resume|\?|Back|Drills|practice/i.test(t)) cands.push(b); }
      if (nums.length) { nums.sort((a, b) => a[0] - b[0]); await nums[0][1].click({ timeout: 1500 }).catch(() => {}); }
      else if (cands.length) await cands[Math.floor(rand() * cands.length)].click({ timeout: 1500 }).catch(() => {});
      else if (box) await page.mouse.click(box.x + box.width * (0.2 + 0.6 * rand()), box.y + box.height * (0.3 + 0.5 * rand()));
      await sleep(250);
    }
    const score = await page.locator('[data-training-score]').innerText().catch(() => null);
    await shot('practice-result');
    log.practice.push({ score, secs: Math.round((Date.now() - t1) / 1000) });
    const bank = page.locator('[data-training-result] button').first();
    if (await bank.isVisible().catch(() => false)) { const s0 = await save(); await bank.click(); await sleep(600); const s1 = await save(); log.practice.push({ banked: true, ovr: [s0?.ovr, s1?.ovr] }); }
  } else note('practice opened with no drill to pick');
  await press(/^Close$|Back to camp|Done|Back to/, 'close practice', { sel: '.fixed button' }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
}

/* ─── the Season Center ─── */
async function centreRun(tag) {
  const c = { tag, games: 0, help: false, kickoff: null, firstCard: null, review: null, notes: [] };
  const t0 = Date.now();
  let watched = 0, speedSet = false, liveShot = 0, simmed = false;
  while (Date.now() - t0 < 6 * 60000) {
    const s = await state();
    if (!s.centre) { c.closed = true; break; }
    const texts = s.buttons.map(b => b.t);
    if (s.centreHelp) { c.help = true; await shot(`centre-help-${tag}`); await press(/^Got it$/, 'centre help got it'); continue; }
    if (texts.some(t => /Getting your season ready/.test(t)) || (texts.length <= 1 && texts[0] === 'Back to your season')) { await sleep(500); continue; }
    if (texts.some(t => /Straight to the/.test(t))) {
      if (c.firstCard === null) { c.firstCard = Math.round((Date.now() - t0) / 1000); await shot(`centre-kickoff-${tag}`); await audit(`centre kickoff ${tag}`); }
      const start = texts.find(t => /^▶/.test(t));
      if (start) { await press(start, 'centre start', { exact: true }); continue; }
    }
    if (texts.includes('⏸ Pause') || texts.includes('▶ Resume')) {
      if (!speedSet && texts.includes('3x')) { await press('3x', 'speed 3x', { exact: true }); speedSet = true; }
      if (liveShot < watched + 1) { await sleep(2500); await shot(`centre-live-${tag}-g${watched + 1}`); await audit(`centre live ${tag}`); liveShot += 1; }
      await sleep(1500);
      continue;
    }
    const next = texts.find(t => /^▶ \S+ \d+/.test(t));
    if (texts.includes('📋 Season review') || (next && texts.includes('⏭ Sim the rest'))) {
      watched += 1;
      c.games = watched;
      await shot(`centre-final-${tag}-g${watched}`);
      await audit(`centre final ${tag}`);
      if (watched >= 2 && texts.includes('⏭ Sim the rest')) { await press('⏭ Sim the rest', 'sim the rest', { exact: true }); simmed = true; await sleep(1200); continue; }
      if (next) { await press(next, 'next game', { exact: true }); if (watched === 1 && texts.includes('Results')) { /* the second game at Results speed */ } continue; }
      await press('📋 Season review', 'season review', { exact: true }); continue;
    }
    if (texts.some(t => /^▶ \S+ \d+/.test(t))) { await press(texts.find(t => /^▶ \S+ \d+/.test(t)), 'poster go', { exact: true }); continue; }
    if (texts.filter(t => t === 'Back to your season').length >= 1 && !texts.includes('⏸ Pause')) {
      const txt = await page.evaluate(() => (document.querySelector('[data-season-centre]')?.innerText ?? '').slice(0, 2500));
      if (/Season review/.test(txt) || simmed) {
        await shot(`centre-review-${tag}`);
        await sleep(6000);
        c.review = (await page.evaluate(() => (document.querySelector('[data-season-centre]')?.innerText ?? '').slice(0, 2500))).slice(0, 1800);
        await shot(`centre-review-late-${tag}`);
        await audit(`centre review ${tag}`);
        if (mobile) {
          const fx = page.locator('[data-centre-fixtures]');
          if (await fx.isVisible().catch(() => false)) { await fx.click(); await sleep(700); await shot(`centre-fixtures-${tag}`); await audit(`centre fixtures ${tag}`); await press(/^← Back$/, 'fixtures back'); }
        } else {
          const gl = page.locator('[data-season-centre] button').filter({ hasText: /Game log/ }).first();
          if (await gl.isVisible().catch(() => false)) { await gl.click(); await sleep(700); await shot(`centre-gamelog-${tag}`); await audit(`centre game log ${tag}`); const bk = page.locator('[data-season-centre] button').filter({ hasText: /^← Back$/ }).first(); if (await bk.isVisible().catch(() => false)) await bk.click(); await sleep(400); }
        }
        await press('Back to your season', 'leave centre', { exact: true, nth: 0 });
        await sleep(1200);
        continue;
      }
      c.notes.push(`unknown centre screen: ${texts.join(' | ').slice(0, 300)} :: ${txt.slice(0, 300)}`);
      await shot(`centre-unknown-${tag}`);
      await press('Back to your season', 'leave unknown centre', { exact: true });
      continue;
    }
    c.notes.push(`centre waiting: ${texts.join(' | ').slice(0, 200)}`);
    await sleep(800);
  }
  c.secs = Math.round((Date.now() - t0) / 1000);
  log.centre.push(c);
  say(`centre ${tag}: games watched ${c.games}, first card ${c.firstCard}s, ${c.secs}s, closed ${!!c.closed}`);
}

/* ─── the road to the draft ─── */
async function prospectStep(phase) {
  const help = page.locator('[data-prospect-journey] button').filter({ hasText: /^Got it$/ });
  if (await help.isVisible().catch(() => false)) { await shot('prospect-help'); await audit('prospect help'); await help.click(); await sleep(400); return; }
  if (phase === 'routes') {
    await shot('prospect-routes'); await audit('prospect routes');
    const routes = await page.locator('[data-prospect-journey] button').filter({ hasText: /Start at age/ }).all();
    log.draft.routes = [];
    for (const r of routes) log.draft.routes.push((await r.innerText()).replace(/\s+/g, ' ').slice(0, 120));
    const pick = Math.floor(rand() * routes.length);
    log.draft.route = log.draft.routes[pick];
    await routes[pick].scrollIntoViewIfNeeded(); await routes[pick].click(); await sleep(700);
    log.steps.push({ act: `route ${pick}` });
    return;
  }
  if (phase === 'season') {
    const ok = await press(/^Play (your first|the next) season$/, 'pre-draft season');
    await sleep(500);
    if ((log.draft.seasonShots = (log.draft.seasonShots ?? 0) + 1) <= 2) { await shot(`prospect-season${log.draft.seasonShots}`); await audit('prospect season'); }
    if (!ok) await sleep(800);
    return;
  }
  if (phase === 'choice') {
    const card = page.locator('[data-testid="pre-draft-choice"]');
    const title = await card.locator('div').first().innerText().catch(() => '');
    const opts = await card.locator('button').all();
    const i = Math.floor(rand() * opts.length);
    (log.draft.choices ??= []).push(`${title} -> ${i}/${opts.length}`);
    if (log.draft.choices.length === 1) { await shot('prospect-choice'); await audit('prospect choice'); }
    await opts[i].scrollIntoViewIfNeeded(); await opts[i].click(); await sleep(700);
    return;
  }
  if (phase === 'showcase') {
    await shot('prospect-showcase'); await audit('prospect showcase');
    const opts = await page.locator('[data-testid="draft-showcase"] button').all();
    const i = Math.floor(rand() * Math.min(opts.length, 3));
    log.draft.showcase = (await opts[i].innerText()).replace(/\s+/g, ' ').slice(0, 100);
    await opts[i].scrollIntoViewIfNeeded(); await opts[i].click(); await sleep(700);
    return;
  }
  if (phase === 'draft') {
    log.draft.range = await page.locator('[data-testid="draft-range"]').innerText().catch(() => null);
    await shot('prospect-draftday'); await audit('prospect draft day');
    const t1 = Date.now();
    await press(/^Draft day$/, 'draft day');
    await sleep(1500); await shot('draft-night-1'); await audit('draft night live');
    await sleep(4000); await shot('draft-night-2');
    let started = null;
    while (Date.now() - t1 < 120000) {
      const st = page.locator('[data-prospect-journey] button').filter({ hasText: /^Start your career$/ });
      if (await st.isVisible().catch(() => false)) { started = Math.round((Date.now() - t1) / 1000); break; }
      await sleep(1000);
    }
    log.draft.nightSecs = started;
    log.draft.skipSeen = await page.locator('[data-prospect-journey] button').filter({ hasText: /Skip to the end/ }).count();
    log.draft.result = await page.evaluate(() => (document.querySelector('[data-prospect-journey]')?.innerText ?? '').slice(0, 1600));
    await shot('draft-night-end'); await audit('draft night end');
    return;
  }
  if (phase === 'done') {
    await press(/^Start your career$/, 'start your career');
    await sleep(1200);
    return;
  }
  log.stuck.push(`prospect phase ${phase}`);
  await sleep(800);
}

/* ─── after a season: everything between the press and the next hub ─── */
async function settle(tag) {
  const seen = { curtain: 0, events: 0 };
  for (let i = 0; i < 60; i += 1) {
    if (Date.now() - T0 > MAXMS) return 'time';
    const s = await state();
    const texts = s.buttons.map(b => b.t);
    if (s.centre) { await centreRun(`${tag}-late`); continue; }
    if (s.popover) { await page.keyboard.press('Escape'); await sleep(300); continue; }
    if (s.decisionContinue) {
      const txt = await page.evaluate(() => (document.querySelector('[data-decision-continue]')?.closest('div.rounded-2xl, section, div')?.parentElement?.innerText ?? '').slice(0, 700));
      log.outcomes.push({ tag, txt });
      if (log.outcomes.length <= 2) { await shot(`outcome-${tag}`); await audit(`outcome ${tag}`); }
      await press(/./, 'decision continue', { sel: '[data-decision-continue]' });
      continue;
    }
    if (s.decisionEvent) {
      const ev = await page.evaluate(() => { const el = document.querySelector('[data-career-decision-event]'); return { id: el.getAttribute('data-career-decision-event'), text: el.innerText.slice(0, 900), opts: [...el.querySelectorAll('[data-career-decision-option]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()) }; });
      if (EDGE && tag === 's2' && !edge.reloadEvent) {
        edge.reloadEvent = true;
        const b = await save();
        await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(3000);
        const s2 = await state();
        const ev2 = await page.evaluate(() => { const el = document.querySelector('[data-career-decision-event]'); return el ? { id: el.getAttribute('data-career-decision-event'), title: el.querySelector('p')?.innerText } : null; });
        log.edge.push({ test: 'reload on an offseason card', before: ev.id, after: ev2, phase: s2.prospect, saveBefore: b?.summer, saveAfter: (await save())?.summer, buttons: s2.buttons.map(x => x.t).slice(0, 8) });
        await shot(`edge-reload-event-${tag}`);
        continue;
      }
      seen.events += 1;
      const i = Math.floor(rand() * ev.opts.length);
      log.events.push({ tag, ...ev, chose: i });
      if (seen.events <= 2) { await shot(`event-${tag}-${seen.events}`); await audit(`event ${tag}`); }
      const before = await save();
      if (EDGE && tag === 's3' && !edge.dblEvent) {
        edge.dblEvent = true;
        await page.locator(`[data-career-decision-option="${i}"]`).dblclick().catch(() => {});
        await sleep(800);
        const mid = await save();
        const outTxt = await page.evaluate(() => (document.querySelector('[data-decision-continue]')?.closest('div.rounded-2xl')?.innerText ?? '').slice(0, 400));
        log.edge.push({ test: 'double tap on an offseason answer', before: { morale: before?.morale, fanbase: before?.fanbase, health: before?.health, net: before?.net, ovr: before?.ovr, summer: before?.summer }, after: { morale: mid?.morale, fanbase: mid?.fanbase, health: mid?.health, net: mid?.net, ovr: mid?.ovr, summer: mid?.summer }, outcome: outTxt });
        await shot(`edge-dbltap-${tag}`);
        log.events[log.events.length - 1].delta = { dbl: true };
        continue;
      }
      await press(/./, `event option ${i}`, { sel: `[data-career-decision-option="${i}"]` });
      const after = await save();
      log.events[log.events.length - 1].delta = { ovr: [before?.ovr, after?.ovr], salary: [before?.salary, after?.salary], team: [before?.team, after?.team] };
      continue;
    }
    if (s.rivalryOption) {
      const txt = await page.evaluate(() => (document.querySelector('[data-rivalry-option]')?.parentElement?.parentElement?.innerText ?? '').slice(0, 800));
      log.events.push({ tag, rivalryChoice: txt });
      await shot(`rivalry-choice-${tag}`); await audit(`rivalry choice ${tag}`);
      const n = await page.locator('[data-rivalry-option]').count();
      await press(/./, 'rivalry option', { sel: `[data-rivalry-option="${Math.floor(rand() * n)}"]` });
      continue;
    }
    if (texts.some(t => /One more year/.test(t))) {
      await shot(`farewell-${tag}`);
      log.events.push({ tag, farewell: true });
      await press(/One more year/, 'one more year');
      continue;
    }
    if (s.wheelSpin) {
      await shot(`wheel-${tag}`); await audit(`wheel ${tag}`);
      const spun = await press(/./, 'wheel spin', { sel: '[data-market-spin]' });
      if (!spun) await press(/./, 'wheel skip', { sel: '[data-market-skip]' });
      await sleep(4000);
      continue;
    }
    if (s.wheelContinue) { await shot(`wheel-result-${tag}`); await press(/./, 'wheel continue', { sel: '[data-market-continue]' }); continue; }
    if (texts.some(t => /^Sign it:/.test(t))) {
      const card = await page.evaluate(() => [...document.querySelectorAll('#dukb-main button')].find(b => /^Sign it:/.test(b.innerText.trim()))?.closest('div.rounded-2xl')?.innerText.slice(0, 900) ?? '');
      log.events.push({ tag, extension: card });
      await shot(`extension-${tag}`); await audit(`extension ${tag}`);
      if (texts.includes('Ask for more, once') && !log.notes.includes(`pushed ext ${tag}`)) { log.notes.push(`pushed ext ${tag}`); await press('Ask for more, once', 'extension push', { exact: true }); await sleep(800); continue; }
      await press(/^Sign it:/, 'extension sign');
      continue;
    }
    if (texts.some(t => /Push for more|Talks done/.test(t)) && texts.some(t => /^Sign$/.test(t))) {
      const card = await page.evaluate(() => (document.querySelector('[data-market-compare-open]')?.parentElement?.innerText ?? document.querySelector('#dukb-main').innerText).slice(0, 1400));
      log.events.push({ tag, freeAgency: card });
      await shot(`fa-${tag}`); await audit(`fa ${tag}`);
      const cmp = page.locator('[data-market-compare-open]');
      if (await cmp.isVisible().catch(() => false) && !log.notes.includes(`compared ${tag}`)) { log.notes.push(`compared ${tag}`); await cmp.click(); await sleep(700); await shot(`fa-compare-${tag}`); await audit(`fa compare ${tag}`); await page.keyboard.press('Escape'); await sleep(300); const back = page.locator('#dukb-main button, [role=dialog] button').filter({ hasText: /Back|Close|Done/ }).first(); if (await back.isVisible().catch(() => false)) await back.click(); await sleep(500); continue; }
      if (texts.includes('Push for more') && !log.notes.includes(`pushed fa ${tag}`)) { log.notes.push(`pushed fa ${tag}`); await press(/Push for more/, 'fa push'); await sleep(800); continue; }
      await press(/^Sign$/, 'fa sign');
      continue;
    }
    if (texts.includes('Continue')) {
      const txt = await page.evaluate(() => { const b = [...document.querySelectorAll('#dukb-main button')].find(x => x.innerText.trim() === 'Continue'); return (b?.parentElement?.innerText ?? '').slice(0, 1500); });
      seen.curtain += 1;
      log.curtains.push({ tag, n: seen.curtain, txt });
      await sleep(2500);
      await shot(`continue-${tag}-${seen.curtain}`); await audit(`continue card ${tag}`);
      await press('Continue', 'continue', { exact: true });
      await sleep(600);
      continue;
    }
    if (texts.some(t => /^Play the \d{4} season/.test(t))) return 'hub';
    if (texts.some(t => /New career/.test(t))) return 'retired';
    log.stuck.push({ tag, texts: texts.slice(0, 20), dialog: s.dialog, toast: s.toast });
    await shot(`stuck-${tag}-${i}`);
    await sleep(1200);
    if (log.stuck.length > 12) return 'stuck';
  }
  return 'loop';
}

/* ─── the walk ─── */
say(`walk ${TAG}: ${BASE}${ROUTE} at ${W}x${H}`);
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
await sleep(3500);
{
  const s = await state();
  log.firstVisit = { popover: s.popover, dialog: s.dialog, buttons: s.buttons.map(b => b.t).slice(0, 20) };
  await shot('first-visit');
  if (s.popover || s.dialog.length) {
    const helpText = await page.evaluate(() => (document.querySelector('[data-radix-popper-content-wrapper], [role=dialog]')?.innerText ?? '').slice(0, 3000));
    log.firstVisit.helpText = helpText;
    await audit('first visit help');
    await page.keyboard.press('Escape'); await sleep(600);
    const s2 = await state();
    log.firstVisit.closedByEscape = !s2.popover && !s2.dialog.length;
  } else note('no first visit help on a fresh visit');
}
/* create */
{
  await shot('create'); await audit('create');
  await page.fill('input[aria-label="Your player name"]', NAME);
  if (POS) { const p = page.locator('#dukb-main button').filter({ hasText: new RegExp(`^${POS}$`) }).first(); await p.scrollIntoViewIfNeeded(); await p.click(); await sleep(300); }
  const arch = await page.evaluate(() => [...document.querySelectorAll('#dukb-main button.border-2')].length);
  if (arch > 3) { const a = page.locator('#dukb-main button.border-2').nth(3); await a.scrollIntoViewIfNeeded(); await a.click(); }
  log.create = await page.evaluate(() => [...document.querySelectorAll('#dukb-main button.border-2')].map(b => `${b.className.includes('border-gold') ? '*' : ''}${b.innerText.replace(/\s+/g, ' ').slice(0, 60)}`));
  await shot('create-filled', true);
  if (ROAD) await press(/^Play your road to the draft$/, 'road to the draft');
  else await press(/^Enter the draft$/, 'enter the draft');
  await sleep(1200);
}
/* the road */
for (let i = 0; i < 40 && ROAD; i += 1) {
  const s = await state();
  if (!s.prospect) break;
  await prospectStep(s.prospect);
  if (Date.now() - T0 > MAXMS) break;
}
await sleep(1000);
/* the hub before a season is played */
{
  const sv = await save();
  log.hub.push({ at: 'drafted', save: sv, ...(await hubChips()) });
  await shot('hub-draft'); await audit('hub draft');
  await shot('hub-draft-full', true);
  for (const [word, back] of TILES) await openTile(word, back, 's0', word === 'Inbox' ? inboxRead : undefined);
}

/* the season programme dialog, once */
async function programmeTry() {
  const open = page.locator('[data-us-programme-open]');
  if (!(await open.isVisible().catch(() => false))) { log.programme.push('no programme button'); return; }
  const s0 = await save();
  await open.scrollIntoViewIfNeeded(); await open.click(); await sleep(800);
  await shot('programme-open'); await audit('programme open');
  const start = page.locator('[data-us-programme-start]');
  if (await start.isVisible().catch(() => false)) { await start.click(); await sleep(500); }
  const tiles = await page.locator('[data-us-programme-tile]').all();
  const names = [];
  for (const t of tiles) names.push((await t.innerText()).replace(/\s+/g, ' ').slice(0, 80));
  log.programme.push({ tiles: names });
  if (tiles.length) {
    await tiles[0].click(); await sleep(600);
    const choices = await page.locator('[data-us-programme-choice]').all();
    const ctexts = [];
    for (const c of choices) ctexts.push(`${(await c.getAttribute('aria-pressed')) === 'true' ? '*' : ''}${(await c.innerText()).replace(/\s+/g, ' ').slice(0, 90)}`);
    log.programme.push({ choices: ctexts });
    await shot('programme-menu'); await audit('programme menu');
    for (const c of choices) { if ((await c.getAttribute('aria-pressed')) !== 'true' && !(await c.isDisabled())) { await c.click(); break; } }
    await sleep(600);
    await shot('programme-picked');
  }
  const close = page.locator('[data-us-programme-close]');
  if (await close.isVisible().catch(() => false)) await close.click(); else await page.keyboard.press('Escape');
  await sleep(600);
  const s1 = await save();
  log.programme.push({ saved: JSON.stringify(s0) !== JSON.stringify(s1) });
}

let season = 0;
let outcome = 'start';
while (season < SEASONS && Date.now() - T0 < MAXMS) {
  const sv0 = await save();
  const useCentre = CENTRE && season === 0;
  const wbw = page.locator('[data-week-by-week]');
  const held = await page.locator('[data-season-centre-held]').innerText().catch(() => null);
  if (held) log.notes.push(`season ${season + 1}: Week by week held: ${held}`);
  const hasWbw = await wbw.isVisible().catch(() => false);
  if (season === 0) log.wbw = { visible: hasWbw, held };
  if (useCentre && hasWbw) {
    await press(/Week by week/, 'week by week', { sel: '[data-week-by-week]' });
    await sleep(1500);
    await centreRun(`s${season + 1}`);
  } else {
    const ok = await press(/Play the \d{4} season/, `play season ${season + 1}`);
    if (!ok) { note(`no Play button for season ${season + 1}`); await shot(`no-play-s${season + 1}`); }
    await sleep(800);
  }
  outcome = await settle(`s${season + 1}`);
  const sv1 = await save();
  season += 1;
  log.hub.push({ at: `after s${season}`, outcome, save: sv1, ...(await hubChips()) });
  say(`season ${season}: ${outcome}, seasons on save ${sv0?.seasons} -> ${sv1?.seasons}, year ${sv1?.year}, age ${sv1?.age}, ovr ${sv1?.ovr}, team ${sv1?.team}, $${sv1?.salary}M x${sv1?.cy}, last ${sv1?.last ? JSON.stringify(sv1.last).slice(0, 160) : '-'}`);
  if (outcome !== 'hub') { await shot(`end-${outcome}-s${season}`); break; }
  if (season <= 2 || season % 3 === 0) { await shot(`hub-s${season}`); await audit(`hub s${season}`); }
  if (season === 1) {
    /* a reload: what was played must still be there */
    const before = await hubChips();
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(3000);
    const s = await state();
    if (s.popover || s.dialog.length) { log.reload.push({ helpAgain: true }); await page.keyboard.press('Escape'); await sleep(400); }
    const after = await hubChips();
    log.reload.push({ before, after, save: await save() });
    for (const [word, back] of TILES) await openTile(word, back, `s${season}`, word === 'Inbox' ? inboxRead : word === 'The Bank' ? bankTry : undefined);
    await practiceTry();
    await shot('hub-after-practice'); await audit('hub after practice');
  } else if (season === 2) {
    await programmeTry();
    for (const [word, back] of TILES.filter(([w]) => /News|Inbox/.test(w))) await openTile(word, back, `s${season}`, word === 'Inbox' ? inboxRead : undefined);
  } else {
    /* a quiet summer: read the inbox like a player does */
    const inboxTile = page.locator('[data-career-hub-buttons] button').filter({ hasText: /Inbox/ }).first();
    const unread = /unread/.test(await inboxTile.innerText().catch(() => ''));
    if (unread) await openTile('Inbox', 'Hub', `s${season}`, inboxRead);
  }
  flush();
}
/* the watch-again button on a season already played */
{
  const again = page.locator('[data-watch-last]');
  if (await again.isVisible().catch(() => false) && Date.now() - T0 < MAXMS) {
    log.notes.push(`watch again: ${await again.innerText()}`);
    await again.click(); await sleep(2000);
    await centreRun('again');
    await settle('again');
  }
}
/* the full sweep at the end */
if (outcome === 'hub' && Date.now() - T0 < MAXMS) for (const [word, back] of TILES) await openTile(word, back, 'end');
if (EDGE && Date.now() - T0 < MAXMS) {
  /* the back button and forward again */
  const b = await hubChips();
  await page.goBack().catch(() => {}); await sleep(1500);
  const backUrl = page.url();
  await page.goForward().catch(() => {}); await sleep(2500);
  const a = await hubChips();
  log.edge.push({ test: 'back then forward at the hub', backUrl, same: JSON.stringify(a.chips) === JSON.stringify(b.chips), before: b.chips, after: a.chips });
  /* hostile saves */
  for (const [name, value] of [['wrong types', JSON.stringify({ c: { name: 5, seasons: 'x', year: 'soon' }, phase: 'season', teamQuality: 'high' })], ['not json', '{{{garbage'], ['seasons missing', (() => '')()]]) {
    if (!value) continue;
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, value]);
    const pe = log.pageErrors.length;
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(3000);
    const s = await state();
    const f = await shot(`edge-hostile-${name.replace(/\s+/g, '')}`);
    log.edge.push({ test: `hostile save: ${name}`, create: s.create, buttons: s.buttons.map(x => x.t).slice(0, 8), newPageErrors: log.pageErrors.slice(pe).map(e => e.text.slice(0, 160)), shot: f, stored: (await page.evaluate(k => localStorage.getItem(k), SAVE_KEY))?.slice(0, 60) });
  }
}
log.final = { save: await save(), chips: await hubChips(), secs: Math.round((Date.now() - T0) / 1000) };
await shot('final');
flush();
const titles = log.events.filter(e => e.text).map(e => e.text.split('\n').filter(Boolean).find(l => !/^OFFSEASON/.test(l)));
const counts = {}; for (const t of titles) counts[t] = (counts[t] ?? 0) + 1;
say(`DONE ${TAG}: seasons ${log.final.save?.seasons}, events ${log.events.length}, curtains ${log.curtains.length}, page errors ${log.pageErrors.length}, console ${log.errors.length}, stuck ${log.stuck.length}, shots ${shots}`);
say(`event titles: ${Object.entries(counts).map(([k, v]) => `${k} x${v}`).join(' | ').slice(0, 900)}`);
for (const e of log.edge) say(`EDGE ${JSON.stringify(e).slice(0, 400)}`);
for (const e of log.pageErrors.slice(0, 5)) say(`PAGEERROR ${e.text.slice(0, 200)}`);
for (const e of log.errors.slice(0, 8)) say(`CONSOLE ${e.t} ${e.text.slice(0, 200)}`);
await browser.close();
