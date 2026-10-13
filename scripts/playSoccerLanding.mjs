/**
 * Round 1330 walk: the Soccer Career page lands on your player, the bottom bar
 * fits a small phone, long names show in full, one Retire, no wage once
 * retired, and the toasts stop covering the next choice.
 *
 * The built dist is served by scripts/lib/hostLikeServer.mjs (or BASE /
 * SWEEP_BASE when a server is already up); Supabase and ad hosts are aborted,
 * so nothing here reaches the live database. Every page is seeded
 * (scripts/lib/pageSeed.mjs). At 320 by 640, 390 by 844 and 1280 by 900.
 *
 * THE BASE ARM IS EACH SECTION'S NEGATIVE CONTROL. SOCCER_LANDING_BASE_DIST
 * names a plain build of the commit the round started from; every section runs
 * against it too, and each section marked BASE below must find the bug there.
 * A base arm that passes a marked section is a blind run and the walk exits
 * red. Without the base dist the walk refuses to call itself green (set
 * SOCCER_LANDING_HEAD_ONLY=1 to see the head arm alone, never a proof).
 * SOCCER_LANDING_ARMS=base runs the base arm alone (step 5 of the round).
 *
 * SECTIONS (SECTIONS=landing,name,bar,retire,toasts,bytes to pick)
 *   landing  a player made through the form (the hunt's "Danny
 *            Okafor-Whitfield" and a 40 character single word), Begin Career
 *            pressed: in the first animation frame and one second later the
 *            name heading sits inside the readable area (under anything pinned
 *            at the top, above the bar) and scrollY is the same in both reads.
 *            New Career then Begin again lands again. BASE: off screen.
 *   name     at 320 the name is never cut and no line of it sits under a
 *            button; at 1280 it is one line. BASE: cut at 320.
 *   bar      saves made by the engine (youth, playing, manager employed,
 *            manager out of work, pundit, owner, retired): every button and
 *            the AGE tile inside the screen, no button text cut, every button
 *            at least 44 px tall, the first button's name as on the base.
 *            BASE: AGE off screen at 320 in playing.
 *   retire   one Retire control on the youth and playing hub, and it opens
 *            "Retire?"; the retired screen shows no Weekly Wage tile. BASE:
 *            two Retire controls, and the tile.
 *   toasts   every page toast raised by Begin Career, a driven career (event
 *            cards, transfer windows, contract and personality cards) and a
 *            phone purchase: at its first visible frame and once settled, a
 *            5 by 3 grid of points inside its box; the first element under
 *            each point that is not the toast must not be a button, link,
 *            input, select, textarea, role button or focusable element, and at
 *            landing not the name heading. Every toast is printed with its
 *            words, size and what lay under it. BASE: at least one hit at 1280.
 *   bytes    the same seeded career on the base build and on head (390 by
 *            844): Begin Career, then driven step by step (Next Year and Next
 *            Season presses, the cards' choices, one phone action), the save's
 *            bytes compared after EVERY step: equal.
 *            SOCCER_LANDING_CONTROL=seed plays the head arm on another seed:
 *            the byte check must go red (the walk prints CONTROL FIRED and
 *            exits 1; a control that changed nothing exits 2).
 *
 * Pictures of every section at every size go to RC_OUT (or
 * soccer-landing-artifacts/).
 * Run: [SOCCER_LANDING_BASE_DIST=<base dist>] ENGINES=chromium node scripts/playSoccerLanding.mjs
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'soccerCareerSave';
const OUT = process.env.RC_OUT || path.join(ROOT, 'soccer-landing-artifacts');
fs.mkdirSync(OUT, { recursive: true });
const CONTROL = process.env.SOCCER_LANDING_CONTROL || '';
if (CONTROL && CONTROL !== 'seed') { console.error(`SOCCER_LANDING_CONTROL=${CONTROL} is not a control here (seed)`); process.exit(2); }
const SIZES = (process.env.SIZES || '320x640,390x844,1280x900').split(',').map(s => s.split('x').map(Number));
const ALL_SECTIONS = ['landing', 'name', 'bar', 'retire', 'toasts', 'bytes'];
const SECTIONS = CONTROL ? ['bytes'] : (process.env.SECTIONS || ALL_SECTIONS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
const BASE_DIST = process.env.SOCCER_LANDING_BASE_DIST ? path.resolve(process.env.SOCCER_LANDING_BASE_DIST) : null;
const HEAD_ONLY = process.env.SOCCER_LANDING_HEAD_ONLY === '1';
const ARMS = (process.env.SOCCER_LANDING_ARMS || (BASE_DIST ? 'head,base' : 'head')).split(',');
if (ARMS.includes('base') && !BASE_DIST) { console.error('the base arm needs SOCCER_LANDING_BASE_DIST (a plain build of the base commit)'); process.exit(2); }
const SEED = pageSeedOf(import.meta.url, process.env.SOCCER_LANDING_SEED);
const NAMES = ['Danny Okafor-Whitfield', 'Supercalifragilisticexpialidociouswinger'];
const DRIVE_STEPS = Number(process.env.SOCCER_LANDING_STEPS || 24);
console.log(`seed ${SEED}; arms ${ARMS.join(', ')}; sections ${SECTIONS.join(', ')}; sizes ${SIZES.map(s => s.join('x')).join(', ')}${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);
if (NAMES[1].length !== 40) { console.error(`the long name is ${NAMES[1].length} characters, not 40`); process.exit(2); }

/* ---------- findings ---------- */
const found = { head: new Map(), base: new Map() };
const rec = (arm, section, size, message) => {
  const m = found[arm];
  (m.get(section) ?? m.set(section, []).get(section)).push({ size, message });
  console.log(`  ${arm === 'head' ? 'FAIL' : 'base'} [${section} ${size}]: ${message}`);
};
const ok = m => console.log(`  ok    ${m}`);
const note = m => console.log(`  note  ${m}`);

/* ---------- the servers ---------- */
const spawned = [];
async function answers(url) {
  for (let i = 0; i < 60; i++) {
    if (await fetch(url).then(r => r.ok).catch(() => false)) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}
async function serve(dir, port) {
  const url = `http://127.0.0.1:${port}`;
  if (await fetch(url + '/').then(r => r.ok).catch(() => false)) { console.error(`port ${port} already answers, refusing to test an unknown server`); process.exit(2); }
  spawned.push(spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), dir, String(port)], { stdio: 'ignore' }));
  if (!await answers(url + '/')) { console.error(`nothing answered at ${url}`); for (const s of spawned) s.kill(); process.exit(2); }
  return url;
}
const SUPPLIED = process.env.SWEEP_BASE || process.env.BASE || null;
const URLS = {};
if (ARMS.includes('head')) URLS.head = SUPPLIED ? SUPPLIED.replace(/\/$/, '') : await serve(path.join(ROOT, 'dist'), Number(process.env.PORT || 4181));
if (ARMS.includes('base')) URLS.base = await serve(BASE_DIST, Number(process.env.BASE_PORT || 4182));
if (URLS.head && !await answers(URLS.head + '/')) { console.error(`nothing answered at ${URLS.head}`); process.exit(2); }

/* ---------- the bar's saves, made by the real engine in this process ---------- */
const stubStore = new Map();
globalThis.localStorage = { getItem: k => (stubStore.has(k) ? stubStore.get(k) : null), setItem: (k, v) => { stubStore.set(k, String(v)); }, removeItem: k => { stubStore.delete(k); } };
function seeded(n) {
  let a = n >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
const SAVES = {};
if (SECTIONS.includes('bar') || SECTIONS.includes('retire')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'soccerLanding-'));
  try {
    const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
    fs.writeFileSync(path.join(tmp, 'entry.mjs'), `export * as sc from ${P('src/lib/soccerCareerEngine.ts')};\n`);
    await build({
      entryPoints: [path.join(tmp, 'entry.mjs')], outfile: path.join(tmp, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
      logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    });
    const { sc } = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
    const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'careerStep.mjs')).href);
    const clubs = sc.FALLBACK_CLUBS;
    const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    Math.random = seeded(1330);
    const youth = sc.initCareer('Bar Tester', 'England', 'ST', 'modern', flat(62), 62, 2020, clubs, null, 84);
    SAVES.youth = youth;
    const pro = s => (s.seasons || []).filter(r => r.type === 'playing').length;
    let c = youth;
    for (let g = 0; g < 400 && !(c.phase === 'playing' && pro(c) >= 1) && !c.retired; g++) c = careerStep(sc, c, clubs);
    if (c.phase !== 'playing') throw new Error(`no playing hub (phase ${c.phase})`);
    SAVES.playing = c;
    const ceremony = sc.manualRetire(c);
    SAVES.manager = sc.choosePostRetirement(ceremony, 'manager', clubs);
    SAVES.pundit = sc.choosePostRetirement(ceremony, 'pundit', clubs);
    SAVES.owner = sc.choosePostRetirement(ceremony, 'owner', clubs);
    SAVES.retired = sc.choosePostRetirement(ceremony, 'retire', clubs);
    let m = SAVES.manager;
    for (let g = 0; g < 80 && !m.managerState?.unemployed; g++) {
      m = sc.advanceManagerSeason(m, clubs);
      if (m.phase !== 'manager_season') break;
    }
    if (m.managerState?.unemployed && m.phase === 'manager_season') SAVES.managerOut = m;
    else note(`no manager season ended in the sack within 80 seasons (phase ${m.phase}); the out of work bar is not measured`);
  } finally {
    Math.random = realRandom;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  for (const [k, v] of Object.entries(SAVES)) console.log(`bar save ${k}: phase ${v.phase}, age ${v.age}${v.managerState ? `, ${v.managerState.unemployed ? 'out of work' : 'employed'}` : ''}`);
}

/* ---------- the browser ---------- */
const browser = await chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
/* In every page: the toast audit (a toast is sampled at its first frame and
   once settled) and the readable area reader the landing uses. */
function pageProbes() {
  const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), summary';
  window.__toastAudit = [];
  const sample = (li, when) => {
    if (!li.isConnected) return;
    const r = li.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const hits = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const x = r.left + (r.width * (i + 0.5)) / 5;
      const y = r.top + (r.height * (j + 0.5)) / 3;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const under = document.elementsFromPoint(x, y).find(el => !li.contains(el) && !el.closest('[data-sonner-toaster]'));
      if (!under) continue;
      const control = under.closest(INTERACTIVE);
      const heading = under.closest('main h1');
      if (control) hits.push({ kind: 'control', what: (control.getAttribute('aria-label') || control.textContent || control.tagName).replace(/\s+/g, ' ').trim().slice(0, 50) });
      else if (heading) hits.push({ kind: 'heading', what: (heading.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) });
    }
    window.__toastAudit.push({ words: (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), when, box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, scrollY: Math.round(scrollY), hits });
  };
  const seen = new WeakSet();
  /* Every toast the page raised, by its words, whether or not it could be sampled. */
  window.__toastSeen = [];
  const watch = () => new MutationObserver(() => {
    for (const li of document.querySelectorAll('[data-sonner-toast]')) {
      if (seen.has(li)) continue;
      seen.add(li);
      window.__toastSeen.push((li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80));
      requestAnimationFrame(() => sample(li, 'first frame'));
      setTimeout(() => sample(li, 'settled'), 450);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch);
  /* The readable area by useRevealScroll's own rule (topInset, bottomInset):
     what is pinned where the screen's top and bottom rows are actually hit,
     at the middle and both edges, no taller than 40 percent of the screen. A
     pinned thing nobody can hit (pointer-events none) does not count, exactly
     as the hook does not count it. */
  window.__readable = () => {
    const h = document.querySelector('main h1');
    if (!h) return null;
    const vh = innerHeight;
    const vw = innerWidth;
    const pinned = y => {
      const out = [];
      for (const x of [vw * 0.5, 6, vw - 6]) for (const el of document.elementsFromPoint(x, y)) {
        const pos = getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.height > vh * 0.4) continue;
        out.push({ el, r });
      }
      return out;
    };
    let top = 0;
    for (const { r } of pinned(1)) if (r.top <= 2 && r.bottom > 0) top = Math.max(top, r.bottom);
    let bottom = vh;
    for (const { r } of pinned(vh - 2)) if (r.bottom >= vh - 2 && r.top < vh) bottom = Math.min(bottom, r.top);
    const r = h.getBoundingClientRect();
    let club = null;
    try {
      const name = JSON.parse(localStorage.getItem('soccerCareerSave'))?.currentClub;
      if (name) {
        /* Every text on the page that names the club; the landing view names it
           when any one of them is inside the readable area. */
        const places = [];
        const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          if (!(t.textContent || '').includes(name)) continue;
          const range = document.createRange();
          range.selectNodeContents(t);
          const c = range.getBoundingClientRect();
          if (c.height > 0) places.push({ top: Math.round(c.top), bottom: Math.round(c.bottom), inside: c.top >= top - 2 && c.bottom <= bottom + 2 });
        }
        const best = places.find(p => p.inside) ?? places.sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
        club = best ? { name, ...best, places: places.length } : { name, top: null, bottom: null, inside: false, places: 0 };
      }
    } catch { club = null; }
    return { y: Math.round(scrollY), top: Math.round(r.top), bottom: Math.round(r.bottom), readTop: Math.round(top), readBottom: Math.round(bottom), inside: r.top >= top - 2 && r.bottom <= bottom + 2, club };
  };
}
async function newContext(w, h, seed) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  await seedPages(ctx, seed);
  await ctx.addInitScript(pageProbes);
  return ctx;
}
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); };
async function plant(p, url, entries) {
  await p.goto(url + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(kv => { localStorage.clear(); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, entries);
}
async function clearBanner(p) {
  await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
}
async function clearDialogs(p) {
  for (let i = 0; i < 3; i++) {
    const d = p.locator('[role="dialog"]:visible');
    if (await d.count().catch(() => 0) === 0) return;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
async function openSoccer(p, url) {
  await p.goto(url + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.locator('[data-career-action-bar], input[placeholder*="player name"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(600);
  await clearBanner(p);
  await clearDialogs(p);
}
const saveRaw = p => p.evaluate(k => localStorage.getItem(k), KEY);
async function pickCombo(p, triggerText, wanted) {
  await p.locator('[role="combobox"]', { hasText: triggerText }).first().click({ timeout: 5000 });
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  await p.evaluate(w => {
    const opts = [...document.querySelectorAll('[role="option"]')];
    const hit = opts.find(o => o.textContent.includes(w)) || opts[0];
    hit.scrollIntoView();
    hit.click();
  }, wanted);
  await p.waitForTimeout(400);
}
async function fillCreation(p, name) {
  await p.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await p.fill('input[placeholder*="player name"]', name);
  await pickCombo(p, 'Choose nationality', 'England');
  await pickCombo(p, 'Choose position', 'Striker');
  await pickCombo(p, 'Choose era', 'Current era');
  await p.getByRole('button', { name: /Generate Starting Potential/ }).click({ timeout: 5000 });
  await p.waitForTimeout(3400);
}

/* ---------- landing and name ---------- */
async function beginAndMeasure(p) {
  const begin = p.getByRole('button', { name: /Begin Career/ });
  await begin.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(300);
  const atBegin = await p.evaluate(() => ({ y: Math.round(scrollY), docH: document.documentElement.scrollHeight }));
  await p.evaluate(() => {
    window.__landing = null;
    const btn = [...document.querySelectorAll('button')].find(b => /Begin Career/.test(b.textContent || ''));
    btn?.addEventListener('click', () => { requestAnimationFrame(() => { window.__landing = window.__readable(); }); }, { capture: true, once: true });
  });
  await begin.click({ timeout: 5000 });
  await p.waitForFunction(() => window.__landing !== null, null, { timeout: 5000 }).catch(() => {});
  const first = await p.evaluate(() => window.__landing);
  await p.waitForTimeout(1000);
  const later = await p.evaluate(() => window.__readable());
  return { atBegin, first, later };
}
function judgeLanding(arm, size, label, m) {
  const where = r => (r ? `name heading ${r.top} to ${r.bottom}, readable ${r.readTop} to ${r.readBottom}, scrollY ${r.y}` : 'no heading');
  console.log(`   ${label}: from scrollY ${m.atBegin.y} of ${m.atBegin.docH}; first frame ${where(m.first)}; one second later ${where(m.later)}`);
  if (!m.first || !m.first.inside) rec(arm, 'landing', size, `${label}: in the first frame after Begin Career the name heading is not in the readable area (${where(m.first)})`);
  if (!m.later || !m.later.inside) rec(arm, 'landing', size, `${label}: one second after Begin Career the name heading is not in the readable area (${where(m.later)})`);
  if (m.first && m.later && m.first.y !== m.later.y) rec(arm, 'landing', size, `${label}: the page glided after the landing (scrollY ${m.first.y} in the first frame, ${m.later.y} a second later)`);
  /* The hub names the club you joined in the landing view (the "Joined" toast is gone). */
  const club = m.later?.club;
  console.log(`   ${label}: the club ${club ? `"${club.name}" at ${club.top} to ${club.bottom}, in the readable area: ${club.inside}` : 'not read'}`);
  if (!club || !club.inside) rec(arm, 'landing', size, `${label}: the club joined is not named inside the readable area of the landing view (${JSON.stringify(club)})`);
}
async function measureName(p) {
  return p.evaluate(() => {
    /* The name is the heading's last child (the flag comes first). */
    const span = document.querySelector('main h1')?.lastElementChild;
    if (!span) return null;
    const range = document.createRange();
    range.selectNodeContents(span);
    const lines = [...range.getClientRects()].filter(r => r.width > 0);
    const tops = [...new Set(lines.map(r => Math.round(r.top)))];
    const buttons = [...document.querySelectorAll('main button')].filter(b => b.getBoundingClientRect().height > 0);
    const under = [];
    for (const l of lines) for (const b of buttons) {
      const r = b.getBoundingClientRect();
      if (l.left < r.right && l.right > r.left && l.top < r.bottom && l.bottom > r.top) under.push((b.textContent || '').trim().slice(0, 30));
    }
    return { text: span.textContent, scrollW: span.scrollWidth, clientW: span.clientWidth, lines: tops.length, under: [...new Set(under)] };
  });
}
function judgeName(arm, size, w, n) {
  if (!n) { rec(arm, 'name', size, 'no name heading on the hub'); return; }
  console.log(`   name "${n.text}": ${n.lines} line(s), scrollWidth ${n.scrollW} of ${n.clientW}${n.under.length ? `, under ${JSON.stringify(n.under)}` : ''}`);
  if (w <= 320 && n.scrollW > n.clientW + 1) rec(arm, 'name', size, `"${n.text}" is cut (${n.scrollW} px of text in ${n.clientW} px)`);
  if (w <= 320 && n.under.length) rec(arm, 'name', size, `"${n.text}" sits under ${JSON.stringify(n.under)}`);
  if (w >= 1280 && n.lines !== 1) rec(arm, 'name', size, `"${n.text}" takes ${n.lines} lines at ${w}`);
}
async function sectionLanding(ctx, arm, size, w) {
  for (const [i, name] of NAMES.entries()) {
    const p = await ctx.newPage();
    await plant(p, URLS[arm], {});
    await openSoccer(p, URLS[arm]);
    await fillCreation(p, name);
    const m = await beginAndMeasure(p);
    await shot(p, `${arm}-${size}-landing-${i}`);
    if (SECTIONS.includes('landing')) judgeLanding(arm, size, `"${name}"`, m);
    if (SECTIONS.includes('name')) judgeName(arm, size, w, await measureName(p));
    if (i === 0 && SECTIONS.includes('landing')) {
      /* New Career, then Begin again: lands again. */
      await p.getByRole('button', { name: /New Career/ }).first().click({ timeout: 5000 }).catch(() => {});
      await p.getByRole('button', { name: 'Delete & Start Over' }).click({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(600);
      await fillCreation(p, name);
      const again = await beginAndMeasure(p);
      await shot(p, `${arm}-${size}-landing-again`);
      judgeLanding(arm, size, `"${name}" after New Career`, again);
    }
    await p.close();
  }
}

/* ---------- the bar ---------- */
const firstNames = { head: {}, base: {} };
async function measureBar(p) {
  return p.evaluate(() => {
    const bar = document.querySelector('[data-career-action-bar]');
    if (!bar) return null;
    const vw = innerWidth;
    const name = b => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim();
    const buttons = [...bar.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height > 0);
    const age = bar.lastElementChild;
    const ageNumber = age?.firstElementChild?.getBoundingClientRect();
    const out = [];
    for (const el of [...buttons, age].filter(Boolean)) {
      const r = el.getBoundingClientRect();
      if (r.left < -0.5 || r.right > vw + 0.5) out.push(`${name(el) || 'AGE'} spans ${Math.round(r.left)} to ${Math.round(r.right)} on a ${vw} screen`);
    }
    const cut = [];
    for (const b of buttons) {
      for (const t of [b, ...b.querySelectorAll('*')]) {
        const cs = getComputedStyle(t);
        if (cs.display === 'none' || t.getBoundingClientRect().width === 0) continue;
        if (t.scrollWidth > t.clientWidth + 1 && t.clientWidth > 0) cut.push(`${name(b)}: ${t.tagName.toLowerCase()} ${t.scrollWidth} px of text in ${t.clientWidth} px`);
      }
    }
    const short = buttons.filter(b => b.getBoundingClientRect().height < 44).map(b => `${name(b)} ${Math.round(b.getBoundingClientRect().height)} px`);
    return {
      kind: bar.getAttribute('data-career-action-bar'),
      names: buttons.map(name),
      first: buttons[0] ? name(buttons[0]) : null,
      out, cut, short,
      ageOn: !!ageNumber && ageNumber.left >= 0 && ageNumber.right <= vw && ageNumber.width > 0,
      ageBox: ageNumber ? `${Math.round(ageNumber.left)} to ${Math.round(ageNumber.right)}` : 'none',
    };
  });
}
async function sectionBar(ctx, arm, size) {
  for (const [kind, save] of Object.entries(SAVES)) {
    const p = await ctx.newPage();
    await plant(p, URLS[arm], { [KEY]: JSON.stringify(save) });
    await openSoccer(p, URLS[arm]);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(300);
    const m = await measureBar(p);
    await shot(p, `${arm}-${size}-bar-${kind}`);
    if (!m) { rec(arm, 'bar', size, `${kind}: no action bar`); await p.close(); continue; }
    console.log(`   bar ${kind} (${m.kind}): ${JSON.stringify(m.names)}, AGE ${m.ageBox}`);
    for (const o of m.out) rec(arm, 'bar', size, `${kind}: ${o}`);
    for (const c of m.cut) rec(arm, 'bar', size, `${kind}: cut text, ${c}`);
    for (const s of m.short) rec(arm, 'bar', size, `${kind}: a button under 44 px, ${s}`);
    if (!m.ageOn) rec(arm, 'bar', size, `${kind}: the AGE number is not fully on screen (${m.ageBox})`);
    firstNames[arm][`${kind} ${size}`] = m.first;
    await p.close();
  }
}

/* ---------- retire ---------- */
async function sectionRetire(ctx, arm, size) {
  for (const kind of ['youth', 'playing']) {
    const p = await ctx.newPage();
    await plant(p, URLS[arm], { [KEY]: JSON.stringify(SAVES[kind]) });
    await openSoccer(p, URLS[arm]);
    const retires = p.getByRole('button', { name: /^(🚪 )?Retire$/ });
    const n = await retires.count();
    console.log(`   ${kind}: ${n} Retire control(s)`);
    if (n !== 1) rec(arm, 'retire', size, `${kind}: ${n} Retire controls on the hub`);
    if (n >= 1) {
      await retires.first().click({ timeout: 5000 }).catch(() => {});
      const asked = await p.getByText('Retire?', { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
      await shot(p, `${arm}-${size}-retire-${kind}`);
      if (!asked) rec(arm, 'retire', size, `${kind}: the Retire control did not open "Retire?"`);
    }
    await p.close();
  }
  const p = await ctx.newPage();
  await plant(p, URLS[arm], { [KEY]: JSON.stringify(SAVES.retired) });
  await openSoccer(p, URLS[arm]);
  const wage = await p.getByText('Weekly Wage').count();
  await shot(p, `${arm}-${size}-retired-screen`);
  console.log(`   retired: ${wage} Weekly Wage tile(s)`);
  if (wage) rec(arm, 'retire', size, `the retired screen shows ${wage} Weekly Wage tile(s)`);
  await p.close();
}

/* ---------- driving a career, the same way on both arms ---------- */
/* One step: the bar's Next Year or Next Season on the hub, otherwise the
   card's own choice (an open dialog first, then the card area), preferring the
   words that move a career on. Clicked in the page, so nothing scrolls first. */
function driveOne() {
  const ADV = ['Sign contract', 'Review contract', 'Join Club', 'Continue at', 'Stay at', 'Continue', 'Accept', 'Next', 'Done', 'Confirm', 'Proceed'];
  const TILE = /data-(press-room-open|soccer-programme-open|squad-tile|career-mentor-tile|career-records-tile|season-ambition|preseason-plan|farewell-open|trophy-category|open-|career-utility|watch-week|week-by-week)/;
  const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled; };
  const text = b => (b.textContent || '').replace(/\s+/g, ' ').trim();
  let save = null;
  try { save = JSON.parse(localStorage.getItem('soccerCareerSave')); } catch { save = null; }
  const phase = save?.phase ?? null;
  const modal = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].find(vis);
  const bar = document.querySelector('[data-career-action-bar] button');
  if (!modal && (phase === 'youth' || phase === 'playing') && bar && vis(bar) && /^Next (Year|Season)/.test(text(bar))) { bar.click(); return { phase, pressed: text(bar).slice(0, 40) }; }
  const scope = modal ? [modal] : [...document.querySelectorAll('main [class*="md:order-2"] > div')];
  let cands = scope.flatMap(s => [...s.querySelectorAll('button')]).filter(vis);
  if (!modal) cands = cands.filter(b => !TILE.test([...b.attributes].map(a => a.name).join(' ')) && !/^Full attributes/.test(text(b)));
  cands = cands.filter(b => !/close|help/i.test(b.getAttribute('aria-label') || '') && !/^(Close|Back)$/.test(text(b)));
  let pick = null;
  for (const a of ADV) { pick = cands.find(b => text(b).startsWith(a)); if (pick) break; }
  if (!pick) pick = cands[0] ?? null;
  if (!pick && bar && vis(bar)) pick = bar;
  if (!pick) return { phase, pressed: null };
  pick.click();
  return { phase, pressed: text(pick).slice(0, 40) };
}
async function drive(p, steps, onStep) {
  const kinds = new Set();
  let phoneDone = false;
  for (let i = 0; i < steps; i++) {
    if (!p.url().includes('/soccer-career')) { kinds.add(`left the page for ${p.url()}`); break; }
    const step = await p.evaluate(driveOne).catch(e => ({ phase: null, pressed: null, error: String(e?.message ?? e).slice(0, 120) }));
    if (step.error) { kinds.add(`the page went away: ${step.error.slice(0, 80)}`); break; }
    await p.waitForTimeout(900);
    if (step.phase) kinds.add(step.phase);
    if (onStep) await onStep(`step ${i + 1} (${step.phase}: ${step.pressed})`);
    if (!step.pressed) break;
    if (!phoneDone && step.phase === 'playing') {
      phoneDone = true;
      const bought = await phonePurchase(p).catch(e => `the phone threw: ${String(e?.message ?? e).slice(0, 80)}`);
      kinds.add(`phone: ${bought}`);
      if (onStep) await onStep(`phone (${bought})`);
    }
  }
  return [...kinds];
}
/* One phone action: My Life, the first category, the first thing in it. */
async function phonePurchase(p) {
  const opened = await p.evaluate(() => { const b = document.querySelector('[data-career-utility="phone"]'); if (!b) return false; b.click(); return true; });
  if (!opened) return 'no phone button';
  await p.waitForTimeout(600);
  const app = await p.evaluate(() => { const b = document.querySelector('[data-phone-app="shop"]'); if (!b) return false; b.click(); return true; });
  if (!app) return 'no My Life app';
  await p.waitForTimeout(500);
  const picked = await p.evaluate(async () => {
    const inPhone = () => (document.querySelector('[data-phone-back]') || document.querySelector('[data-phone-app]'))?.closest('.fixed') ?? null;
    const buttons = () => [...(inPhone()?.querySelectorAll('button') ?? [])].filter(b => b.getBoundingClientRect().height > 0 && !b.hasAttribute('data-phone-back') && !/Put phone away/.test(b.textContent || ''));
    const first = buttons()[0];
    if (!first) return 'no category';
    first.click();
    await new Promise(r => setTimeout(r, 500));
    const buy = buttons().find(b => /€|Buy|\$|£/.test(b.textContent || ''));
    if (!buy) return 'no item to buy';
    buy.click();
    return (buy.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  });
  await p.waitForTimeout(700);
  await p.keyboard.press('Escape').catch(() => {});
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Put phone away/.test(x.textContent || '')); b?.click(); });
  await p.waitForTimeout(400);
  return picked;
}

/* ---------- toasts ---------- */
async function sectionToasts(ctx, arm, size) {
  const p = await ctx.newPage();
  await plant(p, URLS[arm], {});
  await openSoccer(p, URLS[arm]);
  await fillCreation(p, NAMES[0]);
  await p.getByRole('button', { name: /Begin Career/ }).click({ timeout: 5000 });
  await p.waitForTimeout(1200);
  await shot(p, `${arm}-${size}-toast-landing`);
  let shots = 0;
  const kinds = await drive(p, DRIVE_STEPS, async () => {
    if (shots < 6 && await p.locator('[data-sonner-toast]').count() > 0) { shots += 1; await shot(p, `${arm}-${size}-toast-${shots}`); }
  });
  await p.waitForTimeout(600);
  const audit = await p.evaluate(() => window.__toastAudit ?? []);
  const seenWords = await p.evaluate(() => window.__toastSeen ?? []);
  console.log(`   ${audit.length} toast sample(s) over a drive through ${kinds.join(', ')}; toasts raised: ${JSON.stringify(seenWords)}`);
  for (const w of new Set(seenWords)) if (!audit.some(t => t.words === w)) rec(arm, 'toasts', size, `"${w}" was raised but never sampled, so the audit is blind to it`);
  for (const t of audit) {
    const bad = t.hits.filter(h => h.kind === 'control' || (h.kind === 'heading' && /^Joined /.test(t.words)));
    console.log(`     "${t.words}" ${t.when} at ${t.box.x},${t.box.y} ${t.box.w}x${t.box.h} (scrollY ${t.scrollY}): ${t.hits.length ? JSON.stringify([...new Set(t.hits.map(h => `${h.kind} ${h.what}`))]) : 'nothing under it'}`);
    if (bad.length) rec(arm, 'toasts', size, `"${t.words}" (${t.when}) lies over ${JSON.stringify([...new Set(bad.map(h => `${h.kind} ${h.what}`))])}`);
  }
  if (!audit.length) note(`${arm} ${size}: no toast was raised at all`);
  await p.close();
  return audit;
}

/* ---------- bytes ---------- */
const sha = s => (s === null ? 'none' : crypto.createHash('sha256').update(s).digest('hex').slice(0, 16));
async function bytesArm(arm, seed) {
  const ctx = await newContext(390, 844, seed);
  const p = await ctx.newPage();
  const trail = [];
  try {
    await plant(p, URLS[arm], {});
    await openSoccer(p, URLS[arm]);
    await fillCreation(p, 'Byte Tester');
    await p.getByRole('button', { name: /Begin Career/ }).click({ timeout: 5000 });
    await p.waitForTimeout(1200);
    trail.push({ at: 'Begin Career', sha: sha(await saveRaw(p)) });
    const kinds = await drive(p, DRIVE_STEPS, async label => { trail.push({ at: label, sha: sha(await saveRaw(p)) }); });
    console.log(`   ${arm} on seed ${seed}: ${trail.length} saves through ${kinds.join(', ')}`);
  } finally {
    await ctx.close();
  }
  return trail;
}
let bytesRed = 0;
async function sectionBytes() {
  if (!URLS.head || !URLS.base) { note('bytes needs both arms; not judged'); return; }
  console.log('== bytes (390x844)');
  const base = await bytesArm('base', SEED);
  const head = await bytesArm('head', CONTROL === 'seed' ? SEED + 1 : SEED);
  const n = Math.max(base.length, head.length);
  let same = 0;
  for (let i = 0; i < n; i++) {
    const b = base[i];
    const h = head[i];
    if (!b || !h || b.sha !== h.sha || b.at !== h.at) {
      bytesRed += 1;
      rec('head', 'bytes', '390x844', `the save parts from the base at ${h?.at ?? 'nothing'} (head ${h?.sha ?? 'none'}) against ${b?.at ?? 'nothing'} (base ${b?.sha ?? 'none'})`);
      break;
    }
    same += 1;
  }
  if (!bytesRed) ok(`bytes: ${same} saves equal to the base byte for byte, ${head.map(t => t.at.split(' (')[0]).length} steps`);
}

/* ---------- run ---------- */
const MARKED = {
  landing: m => SIZES.every(([w, h]) => (m.get('landing') ?? []).some(f => f.size === `${w}x${h}`)),
  name: m => !SIZES.some(([w]) => w <= 320) || (m.get('name') ?? []).some(f => f.size.startsWith('320x')),
  bar: m => !SIZES.some(([w]) => w <= 320) || (m.get('bar') ?? []).some(f => f.size.startsWith('320x') && /^playing: .*AGE/.test(f.message)),
  retire: m => (m.get('retire') ?? []).length > 0,
  toasts: m => !SIZES.some(([w]) => w >= 1280) || (m.get('toasts') ?? []).some(f => f.size.startsWith('1280x')),
};
try {
  for (const arm of ARMS) {
    if (CONTROL) break;
    for (const [w, h] of SIZES) {
      const size = `${w}x${h}`;
      console.log(`== ${arm} ${size}`);
      const ctx = await newContext(w, h, SEED);
      try {
        if (SECTIONS.includes('landing') || SECTIONS.includes('name')) await sectionLanding(ctx, arm, size, w);
        if (SECTIONS.includes('bar')) await sectionBar(ctx, arm, size);
        if (SECTIONS.includes('retire')) await sectionRetire(ctx, arm, size);
        if (SECTIONS.includes('toasts')) await sectionToasts(ctx, arm, size);
      } catch (e) {
        rec(arm, 'walk', size, `threw: ${String(e?.message ?? e).split('\n')[0].slice(0, 300)}`);
      }
      await ctx.close();
    }
  }
  if (SECTIONS.includes('bytes') && ARMS.includes('head') && ARMS.includes('base')) await sectionBytes();
} finally {
  await browser.close();
  for (const s of spawned) s.kill();
}
if (ARMS.includes('head') && ARMS.includes('base') && SECTIONS.includes('bar')) {
  for (const [k, b] of Object.entries(firstNames.base)) {
    if (firstNames.head[k] !== b) rec('head', 'bar', k.split(' ')[1], `${k.split(' ')[0]}: the first button reads "${firstNames.head[k]}" on head and "${b}" on the base`);
  }
}
if (CONTROL === 'seed') {
  if (!URLS.base) { console.log('control cannot run: SOCCER_LANDING_CONTROL=seed needs the base arm'); process.exit(2); }
  if (bytesRed) { console.log(`CONTROL FIRED: SOCCER_LANDING_CONTROL=seed played head on seed ${SEED + 1} and the byte check went red`); process.exit(1); }
  console.log('CONTROL DID NOT FIRE: another seed left every save equal to the base'); process.exit(2);
}
let red = 0;
for (const [section, list] of found.head) { red += list.length; console.log(`  head ${section}: ${list.length} finding(s)`); }
if (ARMS.includes('base')) {
  for (const [section, seesBug] of Object.entries(MARKED)) {
    if (!SECTIONS.includes(section)) continue;
    const n = (found.base.get(section) ?? []).length;
    if (seesBug(found.base)) console.log(`  base ${section}: the measurement sees the bug on the base (${n} finding(s))`);
    else { red += 1; console.log(`  BLIND [${section}]: the base arm passed where it must fail (${n} finding(s)), so this section proves nothing`); }
  }
  if (found.base.has('walk')) { red += 1; console.log('  the base arm threw'); }
}
if (!ARMS.includes('head')) {
  console.log(red ? `playSoccerLanding base arm: RED, ${red} section(s) blind` : 'playSoccerLanding base arm: every marked section sees the bug on the base');
  process.exit(red ? 1 : 0);
}
if (!ARMS.includes('base') && !HEAD_ONLY) { console.log('playSoccerLanding: RED, no base arm (set SOCCER_LANDING_BASE_DIST); a head arm alone is not a proof'); process.exit(1); }
if (red) { console.log(`playSoccerLanding: RED, ${red} finding(s)`); process.exit(1); }
console.log(`playSoccerLanding: green at ${SIZES.map(s => s.join('x')).join(', ')} (${SECTIONS.join(', ')})${ARMS.includes('base') ? ', every marked section red on the base' : ', HEAD ONLY'}`);
