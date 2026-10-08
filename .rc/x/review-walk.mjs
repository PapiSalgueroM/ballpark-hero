// Reviewer's own walk for Round 1140 (never committed). Runs on the GitHub runner against the served build.
// A person's view of a translated page: it finds controls by what is ON SCREEN first and says so when the
// screen and React disagree. Screenshots go to $RC_OUT/rv/.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = (await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/+$/, '');
const OUT = path.join(process.env.RC_OUT || '.tmp-fx/rev/out', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const NAME = 'Rui Revisor';

const src = fs.readFileSync('scripts/playSoccerCareer.mjs', 'utf8');
const at = src.indexOf('const ACTIONS = [');
const body = src.slice(at, src.indexOf('];', at)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const ACTIONS = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /'));
const SKIP = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));

function init(cfg) {
  try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* blocked */ }
  if (cfg.seed) for (const k of Object.keys(cfg.seed)) { try { if (localStorage.getItem(k) === null) localStorage.setItem(k, cfg.seed[k]); } catch (e) { /* blocked */ } }
  const rv = { swapped: 0, started: false };
  window.__rv = rv;
  // what React holds for an element, whatever is on screen
  rv.react = function react(n) {
    if (!n) return '';
    if (n.nodeType === 3) return n.nodeValue || '';
    if (n.nodeType !== 1) return '';
    if (n.__orig) return n.__orig.nodeValue || '';
    let s = '';
    for (const c of n.childNodes) s += react(c);
    return s;
  };
  if (!cfg.translate) { rv.started = true; return; }
  const mine = new WeakSet();
  const SKIPT = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'TITLE', 'IFRAME', 'CODE']);
  function ok(n) {
    if (mine.has(n) || !n.nodeValue || !n.nodeValue.trim()) return false;
    let e = n.parentElement;
    if (!e) return false;
    for (; e; e = e.parentElement) {
      if (SKIPT.has(e.tagName) || e.namespaceURI === 'http://www.w3.org/2000/svg') return false;
      if (e.getAttribute('translate') === 'no' || e.classList.contains('notranslate') || e.isContentEditable) return false;
    }
    return true;
  }
  function sweep() {
    if (!document.body) return;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const list = [];
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (ok(n)) list.push(n);
    for (const n of list) {
      if (!n.isConnected) continue;
      const o = document.createElement('font');
      o.style.verticalAlign = 'inherit';
      const i = document.createElement('font');
      i.style.verticalAlign = 'inherit';
      const t = document.createTextNode(n.nodeValue);
      mine.add(t);
      i.appendChild(t);
      o.appendChild(i);
      o.__orig = n;
      n.parentNode.replaceChild(o, n);
      rv.swapped += 1;
    }
  }
  let timer = null;
  const kick = () => { if (timer) return; timer = setTimeout(() => { timer = null; sweep(); }, cfg.delay); };
  const start = () => {
    document.documentElement.lang = 'pt';
    document.documentElement.classList.add('translated-ltr');
    sweep();
    rv.started = true;
    new MutationObserver(kick).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  };
  if (cfg.early) document.addEventListener('DOMContentLoaded', start);
  else window.addEventListener('load', () => setTimeout(start, 500));
}

const VIEWS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const problems = [];
const note = (tag, what) => { problems.push(`${tag}: ${what}`); log(`   !! ${tag}: ${what}`); };

async function open(tag, view, opts) {
  const ctx = await browser.newContext({ viewport: VIEWS[view], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(init, { translate: opts.translate !== false, delay: 150, early: !!opts.early, seed: opts.seed || null });
  await ctx.route('**/*', route => {
    let host = '';
    try { host = new URL(route.request().url()).hostname; } catch { /* data: */ }
    if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('flagcdn.com')) return route.continue();
    return route.abort();
  });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e.message || e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); if (m.type() === 'warning' && m.text().startsWith('[dukb]')) log(`   guard line: ${m.text().slice(0, 90)}`); });
  return { ctx, page, errs, tag };
}
const beat = (page, ms = 550) => page.waitForTimeout(ms);
async function shot(W, name, top = true) {
  if (top) await W.page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await W.page.waitForTimeout(200);
  await W.page.screenshot({ path: path.join(OUT, `${W.tag}-${name}.png`) }).catch(e => log('   shot failed ' + e));
}

// A button by what is ON SCREEN first; when the screen does not show the words, by what React holds, and say so.
async function pressButton(W, words, { quiet = false } = {}) {
  const h = await W.page.evaluateHandle(([w]) => {
    const vis = b => { const r = b.getBoundingClientRect(); return r.width > 2 && r.height > 2 && !b.disabled; };
    const all = [...document.querySelectorAll('button')].filter(vis);
    const onScreen = all.find(b => (b.innerText || '').includes(w));
    if (onScreen) { onScreen.dataset.rvHow = 'screen'; return onScreen; }
    const held = all.find(b => window.__rv.react(b).includes(w));
    if (held) { held.dataset.rvHow = 'react:' + (held.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50); return held; }
    return null;
  }, [words]);
  const el = h.asElement();
  if (!el) { if (!quiet) note(W.tag, `no button "${words}" on screen or in React`); return false; }
  const how = await el.evaluate(b => b.dataset.rvHow);
  if (how !== 'screen') note(W.tag, `button "${words}" is NOT what the screen says; the screen shows "${how.slice(6)}"`);
  await el.click({ timeout: 8000 }).catch(e => note(W.tag, `click "${words}" failed: ${String(e).split('\n')[0].slice(0, 100)}`));
  return true;
}
const waitButton = (W, words, ms) => W.page.waitForFunction(([w]) => [...document.querySelectorAll('button')].some(b => !b.disabled && (window.__rv.react(b).includes(w) || (b.innerText || '').includes(w))), [words], { timeout: ms }).catch(() => note(W.tag, `button "${words}" never became pressable in ${ms} ms`));
async function pick(W, index, words) {
  const { page } = W;
  await page.locator('[role="combobox"]').nth(index).click({ timeout: 8000 }).catch(e => note(W.tag, `combobox ${index} click failed: ${String(e).split('\n')[0].slice(0, 90)}`));
  await page.waitForSelector('[role="option"]', { timeout: 8000 }).catch(() => note(W.tag, `combobox ${index}: no options opened`));
  await beat(page, 400);
  const opt = page.locator('[role="option"]', { hasText: words }).first();
  await opt.click({ timeout: 8000 }).catch(e => note(W.tag, `option "${words}" click failed: ${String(e).split('\n')[0].slice(0, 90)}`));
  await page.waitForSelector('[role="option"]', { state: 'detached', timeout: 4000 }).catch(() => {});
  await beat(page, 500);
  const reads = await page.evaluate(i => { const t = document.querySelectorAll('[role="combobox"]')[i]; return t ? (t.innerText || '').replace(/\s+/g, ' ').trim() : '(no box)'; }, index);
  log(`   box ${index} reads on screen: "${reads}" after picking ${words}`);
  return reads;
}
async function look(W) {
  return W.page.evaluate(() => {
    const txt = el => (el.innerText || '').replace(/\s+/g, ' ').trim();
    let save = null;
    try { save = JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'); } catch (e) { save = null; }
    const broke = [...document.querySelectorAll('h1')].some(h => txt(h).includes('This page broke'));
    const root = document.getElementById('root');
    const all = root ? txt(root) : '';
    const ages = [...all.matchAll(/\bAge:?\s*(\d{2})\b/gi)].map(m => Number(m[1]));
    const stale = [...document.querySelectorAll('font')].filter(f => f.__orig && f.firstChild && f.firstChild.firstChild && f.__orig.nodeValue !== f.firstChild.firstChild.nodeValue)
      .map(f => `screen "${f.firstChild.firstChild.nodeValue.trim().slice(0, 30)}" vs React "${(f.__orig.nodeValue || '').trim().slice(0, 30)}"`);
    return { broke, h1: [...document.querySelectorAll('h1')].map(txt).slice(0, 2), create: !!document.getElementById('pname'), agesOnScreen: [...new Set(ages)], save: save ? { age: save.age, name: save.playerName, phase: save.phase, nat: save.nationality } : null, stale: stale.length, staleSample: stale.slice(0, 6), swapped: window.__rv.swapped, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  });
}
const say = (W, where, s) => log(`   ${where}: broke=${s.broke} h1=${JSON.stringify(s.h1[0] || '')} create=${s.create} save=${s.save ? `${s.save.name}/${s.save.nat}/age ${s.save.age}/${s.save.phase}` : 'none'} agesOnScreen=[${s.agesOnScreen}] stale=${s.stale} swapped=${s.swapped} scrollW=${s.scrollW}/${s.clientW}`);

async function create(W, viaHome = false) {
  const { page } = W;
  if (viaHome) {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => window.__rv && window.__rv.started, null, { timeout: 15000 }).catch(() => {});
    await beat(page, 1200);
    await shot(W, '0-home');
    const link = page.locator('#root a[href="/soccer-career"]').first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await link.click({ timeout: 8000 }).catch(e => note(W.tag, 'no link to /soccer-career on the translated home page: ' + String(e).split('\n')[0].slice(0, 80)));
  } else await page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 45000 });
  await page.waitForSelector('#pname', { timeout: 30000 }).catch(() => note(W.tag, 'the create screen never drew'));
  await page.waitForFunction(() => window.__rv && window.__rv.started, null, { timeout: 15000 }).catch(() => {});
  await beat(page, 700);
  await shot(W, '1-create');
  await page.fill('#pname', NAME).catch(e => note(W.tag, 'could not type the name: ' + String(e).split('\n')[0].slice(0, 80)));
  const boxes = [await pick(W, 0, 'Brazil')];
  await page.locator('[role="combobox"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(W, '2-nationality', false);
  boxes.push(await pick(W, 1, 'Striker'));
  boxes.push(await pick(W, 2, 'Current era'));
  await shot(W, '3-picks', false);
  if (!/Brazil/.test(boxes[0]) || /Choose/.test(boxes[0])) note(W.tag, `nationality box reads "${boxes[0]}" after picking Brazil`);
  if (!/Striker/.test(boxes[1]) || /Choose/.test(boxes[1])) note(W.tag, `position box reads "${boxes[1]}" after picking Striker`);
  if (!/Current era/.test(boxes[2]) || /Choose/.test(boxes[2])) note(W.tag, `era box reads "${boxes[2]}" after picking Current era`);
  await pressButton(W, 'Generate Starting Potential');
  await waitButton(W, 'Roll again', 15000);
  await beat(page, 600);
  await shot(W, '4-rolled', false);
  await pressButton(W, 'Customize your build');
  await waitButton(W, 'Lock in', 10000);
  await beat(page, 500);
  await shot(W, '5-build', false);
  await pressButton(W, 'Lock in');
  await waitButton(W, 'Begin Career', 10000);
  await beat(page, 500);
  await shot(W, '6-locked', false);
  await pressButton(W, 'Begin Career');
  await page.waitForFunction(() => !document.getElementById('pname'), null, { timeout: 15000 }).catch(() => note(W.tag, 'the create form never went away after Begin Career'));
  await beat(page, 1500);
  const s = await look(W);
  say(W, 'after Begin Career', s);
  if (s.broke) note(W.tag, 'THE ERROR BOUNDARY after Begin Career');
  if (!s.save || s.save.name !== NAME) note(W.tag, 'no save with the typed name after Begin Career');
  await shot(W, '7-hub');
  return s;
}

async function career(W, presses, label) {
  const { page } = W;
  let last = await look(W);
  const startAge = last.save ? last.save.age : null;
  for (let i = 1; i <= presses; i += 1) {
    const did = await page.evaluate(([acts, skipS]) => {
      const skip = new RegExp(skipS);
      const usable = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); const t = window.__rv.react(b).trim(); return r.width > 2 && r.height > 2 && !b.disabled && t && !skip.test(t) && !b.closest('header,footer'); });
      let el = null;
      for (const a of acts) { el = usable.find(b => window.__rv.react(b).trim().startsWith(a)); if (el) break; }
      if (!el) return null;
      const screen = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const held = window.__rv.react(el).replace(/\s+/g, ' ').trim().slice(0, 40);
      el.scrollIntoView({ block: 'center' });
      el.click();
      return { screen, held };
    }, [ACTIONS, SKIP]);
    if (!did) { log(`   ${label} press ${i}: nothing to press`); break; }
    if (did.screen !== did.held) note(W.tag, `${label} press ${i}: the button READS "${did.screen}" but is "${did.held}"`);
    await beat(page, 800);
    last = await look(W);
    if (last.broke) { note(W.tag, `THE ERROR BOUNDARY at ${label} press ${i} (${did.held})`); await shot(W, `${label}-BROKE`); break; }
    if (last.save && last.agesOnScreen.length && !last.agesOnScreen.includes(last.save.age)) log(`   ${label} press ${i} (${did.held}): the screen says age ${last.agesOnScreen} and the save says ${last.save.age}`);
  }
  say(W, `${label} end`, last);
  if (last.staleSample.length) log(`   ${label} stale now: ${last.staleSample.join(' | ')}`);
  if (startAge !== null && last.save && last.save.age <= startAge) note(W.tag, `${label}: the save never got older (age ${startAge} to ${last.save.age}) in ${presses} presses`);
  if (last.save && last.agesOnScreen.length && !last.agesOnScreen.includes(last.save.age)) note(W.tag, `${label}: at the end the screen shows age ${last.agesOnScreen} while the save is age ${last.save.age}`);
  if (last.scrollW > last.clientW + 1) note(W.tag, `${label}: the page scrolls sideways (${last.scrollW} wide in ${last.clientW})`);
  await shot(W, `${label}-top`);
  return last;
}

const ONLY = (process.env.RV_ONLY || 'A,B,C,E,G').split(',');
const run = async (tag, fn) => { log(`\n=== ${tag}`); try { await fn(); } catch (e) { note(tag, 'the walk threw: ' + String(e).split('\n')[0].slice(0, 160)); } };

// A. the create flow and a career under translation, both sizes, reduced motion on and off
if (ONLY.includes('A')) for (const view of ['phone', 'desktop']) for (const reduce of [false, true]) {
  const tag = `A-${view}-${reduce ? 'reduce' : 'motion'}`;
  await run(tag, async () => {
    const W = await open(tag, view, { reduce });
    const s = await create(W);
    if (!s.broke && s.save) await career(W, 12, '8-career');
    if (W.errs.length) note(tag, `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`);
    await W.ctx.close();
  });
}

// B. a returning player: a save made on an ordinary page, opened on a translated one
if (ONLY.includes('B')) for (const view of ['phone', 'desktop']) {
  const tag = `B-${view}`;
  await run(tag, async () => {
    const P = await open(tag + '-plain', view, { translate: false });
    const made = await create(P);
    if (made.save) await career(P, 3, 'plain');
    const seed = await P.page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
    const before = await look(P);
    if (P.errs.length) note(tag, `plain page error(s): ${P.errs.slice(0, 2).join(' || ')}`);
    await P.ctx.close();
    log(`   save carried over: ${Object.keys(seed).length} key(s), soccerCareerSave ${seed.soccerCareerSave ? seed.soccerCareerSave.length + ' chars' : 'MISSING'}, age ${before.save ? before.save.age : '?'}`);
    const W = await open(tag, view, { seed });
    await W.page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 45000 });
    await W.page.waitForFunction(() => window.__rv && window.__rv.started, null, { timeout: 15000 }).catch(() => {});
    await beat(W.page, 1500);
    const s = await look(W);
    say(W, 'old save on a translated page', s);
    if (s.create) note(tag, 'the old save did not load: the create form is up');
    if (!s.h1.some(h => h.includes(NAME))) note(tag, `the hub does not carry the name: h1 ${JSON.stringify(s.h1)}`);
    if (before.save && s.save && s.save.age !== before.save.age) note(tag, `the save changed age on load (${before.save.age} to ${s.save.age})`);
    await shot(W, '1-loaded');
    await career(W, 10, '2-career');
    if (W.errs.length) note(tag, `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`);
    await W.ctx.close();
  });
}

// C. what other pages look like translated
if (ONLY.includes('C')) for (const view of ['phone', 'desktop']) for (const route of ['/', '/club-manager', '/whats-new', '/nba-my-career']) {
  const tag = `C-${view}-${route === '/' ? 'home' : route.slice(1)}`;
  await run(tag, async () => {
    const W = await open(tag, view, {});
    await W.page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await W.page.waitForFunction(() => window.__rv && window.__rv.started, null, { timeout: 15000 }).catch(() => {});
    await beat(W.page, 1800);
    const s = await look(W);
    say(W, 'loaded', s);
    if (s.broke) note(tag, 'THE ERROR BOUNDARY on load');
    if (s.scrollW > s.clientW + 1) note(tag, `the page scrolls sideways (${s.scrollW} wide in ${s.clientW})`);
    if (route === '/whats-new') {
      const has = await W.page.evaluate(() => (document.getElementById('root').innerText || '').includes('Translated pages stopped crashing.'));
      log(`   the What's New entry is on the page: ${has}`);
      if (!has) note(tag, 'the What\'s New entry is not on the page');
    }
    await shot(W, 'top');
    if (W.errs.length) note(tag, `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`);
    await W.ctx.close();
  });
}

// E. a translator that starts before React has drawn anything (always translate, fast machine)
if (ONLY.includes('E')) await run('E-phone-early', async () => {
  const W = await open('E-phone-early', 'phone', { early: true });
  const s = await create(W);
  if (!s.broke && s.save) await career(W, 8, '8-career');
  if (W.errs.length) note('E-phone-early', `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`);
  await W.ctx.close();
});

// G. in from a translated home page by its own link (a route change under translation), then create
if (ONLY.includes('G')) await run('G-phone-viahome', async () => {
  const W = await open('G-phone-viahome', 'phone', {});
  const s = await create(W, true);
  if (!s.broke && s.save) await career(W, 6, '8-career');
  if (W.errs.length) note('G-phone-viahome', `${W.errs.length} error(s): ${W.errs.slice(0, 3).join(' || ')}`);
  await W.ctx.close();
});

await browser.close();
log(`\nREVIEW WALK: ${problems.length} thing(s) noted`);
for (const p of problems) log('  - ' + p);
fs.writeFileSync(path.join(OUT, 'problems.txt'), problems.join('\n') + '\n');
log(`review-walk done, ${problems.length} noted`);
