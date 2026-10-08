// AN2 runner reviewer's walk (never committed). Plays the seams of Release AN's second half on the served build.
//   node .rc/x/rv-walk.mjs [us|soccer|home|all]      reads BASE and RC_OUT, blocks the database host
// It asserts little and measures a lot: every line it prints is a fact for the report, PROBLEM lines are defects.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/rv-walk-out');
const WHAT = process.argv[2] || 'all';
fs.mkdirSync(OUT, { recursive: true });
let problems = 0;
const note = (...a) => console.log(a.join(' '));
const bad = (...a) => { problems += 1; note('PROBLEM', ...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = v => JSON.stringify(v);

const DEFS = {
  nba: { route: '/nba-my-career', binding: 'NBA_CAREER_SPORT', file: 'src/lib/nbaCareerSport.ts', pos: 'SG', centre: true },
  nfl: { route: '/nfl-my-career', binding: 'NFL_CAREER_SPORT', file: 'src/lib/nflCareerSport.ts', pos: 'QB', centre: false },
  mlb: { route: '/mlb-my-career', binding: 'MLB_CAREER_SPORT', file: 'src/lib/mlbCareerSport.ts', pos: null, centre: false },
  nhl: { route: '/nhl-my-career', binding: 'NHL_CAREER_SPORT', file: 'src/lib/nhlCareerSport.ts', pos: null, centre: false },
};

/* saves made by the real bindings, in node (the way scripts/playUsSeasonCentre.mjs makes its own) */
let M = null;
async function bindings() {
  if (M) return M;
  const file = path.join(os.tmpdir(), `rv-walk-bind-${process.pid}.mjs`);
  await build({
    stdin: { contents: Object.values(DEFS).map(d => `export { ${d.binding} } from './${d.file}';`).join('\n'), resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: file, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
    banner: { js: "import { createRequire as __rvRequire } from 'node:module'; const require = __rvRequire(import.meta.url);" },
  });
  const mem = new Map();
  globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
  M = await import(pathToFileURL(file).href);
  return M;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
async function makeSave(slug, seasons) {
  const SB = (await bindings())[DEFS[slug].binding];
  const rng = mulberry32(2042 + seasons * 7);
  const real = Math.random;
  Math.random = rng;
  try {
    const pos = DEFS[slug].pos ?? SB.create.defaultPos;
    const c = SB.startCareer('Seam Walker', pos, SB.create.archetypes[pos][0], rng, null, 'now');
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < seasons; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
    c.contractYears = Math.max(4, c.contractYears);
    return { key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
  } finally { Math.random = real; }
}

/* the page's storage: seeded once (a reload must not seed it again), and a switch that makes the browser refuse
   writes the way a full store does (setItem throws QuotaExceededError; reads and removes still work) */
function initStorage([key, value]) {
  const realSet = Storage.prototype.setItem;
  let fromLoad = false;
  try { fromLoad = window.sessionStorage.getItem('__rvFull') === '1'; } catch (e) { /* ordinary */ }
  const rv = { full: fromLoad, onlyKey: null, refused: 0, nextLoad: on => realSet.call(window.sessionStorage, '__rvFull', on ? '1' : '0') };
  Object.defineProperty(window, '__rv', { value: rv, enumerable: false });
  Storage.prototype.setItem = function setItem(k, v) {
    if (rv.full && this === window.localStorage && (!rv.onlyKey || k === rv.onlyKey)) { rv.refused += 1; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }
    return realSet.call(this, k, v);
  };
  try {
    if (!window.sessionStorage.getItem('__rvSeeded')) {
      realSet.call(window.sessionStorage, '__rvSeeded', '1');
      realSet.call(window.localStorage, 'cookie-consent', 'essential');
      if (key) realSet.call(window.localStorage, key, value);
      for (const s of ['nba', 'nfl', 'mlb', 'nhl']) realSet.call(window.localStorage, `seasonCentre:help:${s}`, '1');
    }
  } catch (e) { /* the walk says so below */ }
}

let browser = null;
async function open(route, save, { width, height, reduced }) {
  browser ??= await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(initStorage, [save?.key ?? null, save?.value ?? null]);
  const page = await ctx.newPage();
  const errors = [];
  const origin = new URL(BASE).origin;
  await page.route(/supabase\.co/, r => r.abort());
  await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.fallback() : r.abort(); });
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 160)));
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
const clickText = (page, src) => page.evaluate(s => {
  const rx = new RegExp(s, 'i');
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && rx.test((x.textContent ?? '').trim()));
  if (b) b.click();
  return !!b;
}, src);
const closeHelp = async page => {
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let.s Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await sleep(350);
  }
};
const waitFor = async (page, fn, arg, ms = 20000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };

/* what is on the page right now, as numbers */
const state = (page, key) => page.evaluate(k => {
  const r = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; };
  const notice = document.querySelector('[data-us-career-save-error]');
  const retryBtn = notice ? notice.querySelector('button') : null;
  const line = document.querySelector('[data-dukb-storage-notice]');
  const header = document.querySelector('header');
  const seen = el => {
    if (!el) return null;
    const q = el.getBoundingClientRect();
    const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return { inView: q.top >= 0 && q.bottom <= window.innerHeight, onTop: !!top && el.contains(top), topIs: top ? `${top.tagName}.${String(top.className).slice(0, 40)}` : 'nothing' };
  };
  let disk = null;
  try { disk = JSON.parse(window.localStorage.getItem(k) ?? 'null'); } catch (e) { disk = 'UNREADABLE'; }
  const play = [...document.querySelectorAll('button')].find(b => /Play the \d+ season/.test(b.textContent ?? ''));
  return {
    notice: notice ? { op: notice.getAttribute('data-save-operation'), rect: r(notice), seen: seen(notice), btn: seen(retryBtn), words: notice.querySelector('p')?.textContent ?? '' } : null,
    line: line ? { trouble: line.getAttribute('data-dukb-storage-notice'), rect: r(line), words: (line.textContent ?? '').trim().slice(0, 70) } : null,
    header: r(header),
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(t => (t.textContent ?? '').trim().slice(0, 90)),
    viewer: !!document.querySelector('[data-season-centre]'), cover: !!document.querySelector('[data-us-centre-cover]'),
    curtain: !!document.querySelector('[data-season-reveal]'), option: !!document.querySelector('[data-career-decision-option]'),
    wbw: !!document.querySelector('[data-week-by-week]'), playLabel: play ? (play.textContent ?? '').trim() : null,
    broke: /This page broke/.test(document.body.textContent ?? ''),
    diskSeasons: disk && disk !== 'UNREADABLE' && disk.c ? disk.c.seasons.length : disk === 'UNREADABLE' ? 'UNREADABLE' : null,
    diskYear: disk && disk !== 'UNREADABLE' && disk.c ? disk.c.year : null, diskPhase: disk && disk !== 'UNREADABLE' ? disk.phase : null,
    refused: window.__rv ? window.__rv.refused : -1, scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > window.innerWidth,
  };
}, key);
const brief = s => J({ notice: s.notice ? `${s.notice.op} ${J(s.notice.rect)} seen ${J(s.notice.seen)}` : null, line: s.line ? `${s.line.trouble} ${J(s.line.rect)}` : null, toasts: s.toasts.length, viewer: s.viewer, curtain: s.curtain, play: s.playLabel, disk: `${s.diskSeasons} seasons, year ${s.diskYear}`, refused: s.refused });

/* from wherever a played season left the board, back to the hub: the curtain's Continue, an offseason card's
   first answer, an outcome's Continue. Says every screen it passed and whether the notice was on each. */
async function toHub(page, key, tag, wantNotice) {
  const passed = [];
  for (let i = 0; i < 14; i += 1) {
    const s = await state(page, key);
    if (wantNotice && !s.notice) bad(tag, `a screen on the way back to the hub has no Retry notice while the save is still refused (step ${i}, curtain ${s.curtain}, option ${s.option}, play ${s.playLabel})`);
    if (s.playLabel && !s.curtain && !s.option) { passed.push('hub'); break; }
    if (s.curtain) { passed.push('curtain'); await page.evaluate(() => { const b = [...document.querySelectorAll('[data-season-reveal] button')].find(x => /Continue/.test(x.textContent ?? '')); if (b) b.click(); }); }
    else if (await page.evaluate(() => { const b = document.querySelector('[data-rivalry-option]'); if (b) b.click(); return !!b; })) passed.push('rivalry');
    else if (s.option) { passed.push('card'); await page.evaluate(() => { const b = document.querySelector('[data-career-decision-option]'); if (b) b.click(); }); }
    else if (await clickText(page, '^Continue')) passed.push('continue');
    else { passed.push('stuck'); break; }
    await sleep(700);
  }
  note(`${tag}: back to the hub through ${passed.join(' > ')}`);
  return passed[passed.length - 1] === 'hub';
}

/* the board is up (the hub, or a card a saved career opens on): close the rules, answer any card, stand on the hub */
async function hubOrThrow(page, key, tag) {
  const up = await waitFor(page, () => [...document.querySelectorAll('button')].some(x => /Play the \d+ season/.test(x.textContent ?? '')) || !!document.querySelector('[data-rivalry-option]') || !!document.querySelector('[data-career-decision-option]'), null, 40000);
  if (!up) throw new Error('the board never showed');
  await sleep(900);
  await closeHelp(page);
  const s = await state(page, key);
  if (!s.playLabel && !await toHub(page, key, tag, false)) throw new Error('the board never reached the hub');
}

const setFull = (page, on, onlyKey = null) => page.evaluate(([o, k]) => { window.__rv.full = o; window.__rv.onlyKey = k; }, [on, onlyKey]);
const pressPlay = (page, centre) => page.evaluate(c => {
  const b = c ? document.querySelector('[data-week-by-week]') : [...document.querySelectorAll('button')].find(x => /Play the \d+ season/.test(x.textContent ?? ''));
  if (!b || b.disabled) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, centre);

/* THE journey: the device starts refusing the career save in the middle of a visit (a store that filled up),
   a season is played (Week by week where the sport has it), a second one before Retry, then storage comes back. */
async function usJourney(slug, vp, reduced) {
  const d = DEFS[slug];
  const tag = `${slug} ${vp.width}${reduced ? ' reduced' : ''}`;
  const save = await makeSave(slug, 0);
  const { ctx, page, errors } = await open(d.route, save, { ...vp, reduced });
  const name = `us-${slug}-${vp.width}${reduced ? 'r' : ''}`;
  try {
    await hubOrThrow(page, save.key, tag);
    const s0 = await state(page, save.key);
    const year0 = s0.diskYear;
    note(`${tag}: hub ${brief(s0)}`);
    if (s0.notice || s0.line) bad(tag, 'ordinary storage shows a notice on the hub');
    if (s0.diskSeasons !== 0) bad(tag, `the seeded save did not load as a rookie (${s0.diskSeasons})`);
    await shot(page, `${name}-1-hub`);

    /* 1. the store fills up (this key only, like a quota), then a season is played */
    await setFull(page, true, save.key);
    if (!await pressPlay(page, d.centre)) throw new Error('no button to play the season');
    if (d.centre) {
      if (!await waitFor(page, () => !!document.querySelector('[data-season-centre]'), null, 30000)) bad(tag, 'Week by week with the save refused never opened the viewer');
      await sleep(1200);
      const v = await state(page, save.key);
      note(`${tag}: viewer open with the save refused ${brief(v)}`);
      if (v.diskSeasons !== 0) bad(tag, `the store holds ${v.diskSeasons} seasons although the write was refused`);
      if (!v.notice) bad(tag, 'no Retry notice in the page while the viewer is open');
      if (v.notice && v.notice.seen.onTop) bad(tag, `the Retry notice paints OVER the viewer: ${J(v.notice.seen)}`);
      if (!v.toasts.length) bad(tag, 'no toast says the save was refused while the viewer covers the notice');
      const head = await page.evaluate(() => (document.querySelector('[data-season-centre]')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 140));
      note(`${tag}: the viewer reads "${head}"`);
      await shot(page, `${name}-2-viewer-refused`);
      await clickText(page, 'Back to your season');
      await waitFor(page, () => !document.querySelector('[data-season-centre]'), null, 8000);
      await sleep(600);
    } else await sleep(900);
    const a = await state(page, save.key);
    note(`${tag}: after the season, save refused ${brief(a)}`);
    if (!a.notice || a.notice.op !== 'write') bad(tag, 'no Retry notice for a write after a played season was refused');
    else if (!(a.notice.seen.inView && a.notice.seen.onTop)) bad(tag, `the Retry notice is not seen after the season: ${J(a.notice.seen)}`);
    if (a.notice && a.notice.btn && !a.notice.btn.onTop) bad(tag, `the Retry save button is covered: ${J(a.notice.btn)}`);
    if (a.toasts.length !== 1) note(`${tag}: NOTE ${a.toasts.length} toasts are up (${J(a.toasts)})`);
    if (a.sideways) bad(tag, 'the page scrolls sideways');
    if (a.broke || errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ') || 'This page broke'}`);
    await shot(page, `${name}-3-refused`);

    /* 2. the notice is sticky and so is the site header: scrolled, is it still readable and pressable? */
    await page.evaluate(() => window.scrollTo(0, 420));
    await sleep(500);
    const sc = await state(page, save.key);
    note(`${tag}: scrolled to ${sc.scrollY}: header ${J(sc.header)} notice ${sc.notice ? J(sc.notice.rect) : null} text point ${sc.notice ? J(sc.notice.seen) : null} button ${sc.notice ? J(sc.notice.btn) : null}`);
    if (sc.scrollY > 100 && sc.notice && sc.header && sc.notice.rect.t < sc.header.b && sc.notice.rect.b > sc.header.t) {
      const hidden = Math.min(sc.notice.rect.b, sc.header.b) - Math.max(sc.notice.rect.t, sc.header.t);
      bad(tag, `scrolled, the site header covers ${hidden}px of the ${sc.notice.rect.b - sc.notice.rect.t}px Retry notice (header ${J(sc.header)}, notice ${J(sc.notice.rect)}, button on top: ${sc.notice.btn ? sc.notice.btn.onTop : null})`);
    }
    await shot(page, `${name}-4-scrolled`);
    await page.evaluate(() => window.scrollTo(0, 0));

    /* 3. a second season before Retry */
    const hub1 = await toHub(page, save.key, tag, true);
    if (hub1 && await pressPlay(page, d.centre)) {
      if (d.centre) { await waitFor(page, () => !!document.querySelector('[data-season-centre]'), null, 30000); await sleep(900); await shot(page, `${name}-5-second-viewer`); await clickText(page, 'Back to your season'); await sleep(600); }
      else await sleep(900);
    } else note(`${tag}: NOTE no second season was played (hub ${hub1})`);
    await toHub(page, save.key, tag, true);
    const b = await state(page, save.key);
    note(`${tag}: two seasons played, none saved ${brief(b)}`);
    if (b.diskSeasons !== 0) bad(tag, `the store moved to ${b.diskSeasons} seasons while every write was refused`);

    /* 4. storage is back: Retry save must put the LATEST career on the store, and a reload must open on it */
    await setFull(page, false);
    await clickText(page, '^Retry save$');
    await sleep(600);
    const c = await state(page, save.key);
    const memYear = c.playLabel ? Number((c.playLabel.match(/\d{4}/) ?? [0])[0]) : null;
    note(`${tag}: after Retry save ${brief(c)} | the hub says year ${memYear}, seeded year ${year0}`);
    if (c.notice) bad(tag, 'the Retry notice is still up after a Retry that the store took');
    if (memYear && c.diskYear !== memYear) bad(tag, `Retry wrote year ${c.diskYear} but the hub is on ${memYear}: not the latest career`);
    if (memYear && year0 && c.diskSeasons !== memYear - year0) bad(tag, `Retry wrote ${c.diskSeasons} seasons, the hub played ${memYear - year0}`);
    await shot(page, `${name}-6-after-retry`);
    const before = await page.evaluate(k => window.localStorage.getItem(k), save.key);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => [...document.querySelectorAll('button')].some(x => /Play the \d+ season/.test(x.textContent ?? '')) || !!document.querySelector('[data-career-decision-option]'), null, 40000);
    await sleep(900);
    const r = await state(page, save.key);
    const after = await page.evaluate(k => window.localStorage.getItem(k), save.key);
    note(`${tag}: after a reload ${brief(r)} | the save is ${before === after ? 'byte for byte the one Retry wrote' : 'DIFFERENT from the one Retry wrote'}`);
    if (r.notice) bad(tag, 'a Retry notice after a reload with ordinary storage');
    if (r.diskSeasons !== c.diskSeasons) bad(tag, `the reload changed the seasons on the save (${c.diskSeasons} to ${r.diskSeasons})`);
    if (r.playLabel && memYear && !r.playLabel.includes(String(memYear))) bad(tag, `the reload opened on "${r.playLabel}", not ${memYear}`);
    if (r.broke || errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ') || 'This page broke'}`);
    await shot(page, `${name}-7-reload`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); await shot(page, `${name}-threw`); }
  await ctx.close();
}

/* Home and back with a save pending: the notice says "Stay on this page". What does leaving really cost,
   and does the board come back sane? */
async function homeAndBack(slug, vp) {
  const d = DEFS[slug];
  const tag = `${slug} ${vp.width} home-and-back`;
  const save = await makeSave(slug, 1);
  const { ctx, page, errors } = await open(d.route, save, { ...vp, reduced: false });
  try {
    await hubOrThrow(page, save.key, tag);
    const s0 = await state(page, save.key);
    await setFull(page, true, save.key);
    await pressPlay(page, false);
    await sleep(900);
    const a = await state(page, save.key);
    note(`${tag}: played with the save refused ${brief(a)}`);
    if (!a.notice) bad(tag, 'no Retry notice after a refused Play');
    const went = await page.evaluate(() => { const l = document.querySelector('a[href="/"]'); if (l) l.click(); return !!l; });
    await sleep(1500);
    const home = await page.evaluate(() => ({ path: location.pathname, notice: !!document.querySelector('[data-us-career-save-error]'), toasts: document.querySelectorAll('[data-sonner-toast]').length }));
    note(`${tag}: pressed the header's home link (${went}): now on ${home.path}, notice ${home.notice}, toasts ${home.toasts}`);
    await setFull(page, false);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), null, 30000);
    await sleep(900);
    const b = await state(page, save.key);
    note(`${tag}: back on the board ${brief(b)} | before leaving the hub said "${s0.playLabel}", the refused season would have made it ${s0.diskYear + 1}`);
    if (b.notice) bad(tag, 'a Retry notice is up after coming back although nothing is pending');
    if (b.diskSeasons !== s0.diskSeasons) bad(tag, `the store changed while away (${s0.diskSeasons} to ${b.diskSeasons})`);
    if (b.playLabel !== s0.playLabel) bad(tag, `the board came back on "${b.playLabel}" but the store holds the career of "${s0.playLabel}"`);
    if (b.broke || errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ') || 'This page broke'}`);
    await shot(page, `us-${slug}-${vp.width}-home-and-back`);
    /* and the game still saves afterwards */
    await pressPlay(page, false);
    await sleep(900);
    const c = await state(page, save.key);
    if (c.diskSeasons !== s0.diskSeasons + 1 || c.notice) bad(tag, `after coming back a Play did not save (${c.diskSeasons} seasons, notice ${!!c.notice})`);
    note(`${tag}: a Play after coming back saved ${c.diskSeasons} seasons`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); }
  await ctx.close();
}

/* Every write refused from the first paint (Round 1142 says "full" in its one line) and Round 1084's notice
   under it: both on a phone, and what each says after the store takes writes again. */
async function fullFromLoad(slug, vp) {
  const d = DEFS[slug];
  const tag = `${slug} ${vp.width} full-from-load`;
  const save = await makeSave(slug, 1);
  const { ctx, page, errors } = await open(d.route, save, { ...vp, reduced: false });
  try {
    await waitFor(page, () => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), null, 40000);
    await sleep(900);
    await closeHelp(page);
    await page.evaluate(() => window.__rv.nextLoad(true));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), null, 40000);
    await sleep(900);
    await closeHelp(page);
    const s0 = await state(page, save.key);
    note(`${tag}: a page that loaded with every write refused: ${brief(s0)}`);
    if (!s0.line || s0.line.trouble !== 'full') bad(tag, `Round 1142's line does not say full on a page that loaded full (${s0.line ? s0.line.trouble : 'no line'})`);
    await pressPlay(page, false);
    await sleep(1000);
    const a = await state(page, save.key);
    note(`${tag}: played ${brief(a)} | line "${a.line ? a.line.words : ''}"`);
    await shot(page, `us-${slug}-${vp.width}-full-1`);
    await setFull(page, false);
    await clickText(page, '^Retry save$');
    await sleep(600);
    const b = await state(page, save.key);
    note(`${tag}: after a Retry the store took ${brief(b)} | line "${b.line ? b.line.words : ''}" | toasts ${J(b.toasts)}`);
    if (b.line && b.diskSeasons === a.diskSeasons + 1) note(`${tag}: FACT the storage line still says "${b.line.words}" although the save is on the store`);
    await shot(page, `us-${slug}-${vp.width}-full-2-after-retry`);
    if (errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); }
  await ctx.close();
}

/* Soccer Career's hub after Round 1089: is the season list inside the Career Timeline card, is the right
   column inside the grid, and does the card end where its list ends? Measured, at 1280 and at 390. */
const hubBoxes = page => page.evaluate(() => {
  const r = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top + window.scrollY), b: Math.round(q.bottom + window.scrollY), l: Math.round(q.left), r: Math.round(q.right) }; };
  const span = [...document.querySelectorAll('span')].find(s => (s.textContent ?? '').trim() === 'Career Timeline');
  if (!span) return null;
  const card = span.closest('.rounded-xl');
  const grid = card ? card.parentElement : null;
  const list = grid ? grid.querySelector('.overflow-y-auto') : null;
  const kids = grid ? [...grid.children] : [];
  return {
    gridKids: kids.length, listInCard: !!(card && list && card.contains(list)), rows: list ? list.children.length : -1,
    card: r(card), list: r(list), grid: r(grid), right: r(kids.find(k => k !== card) ?? null),
    sideways: document.documentElement.scrollWidth > window.innerWidth, vw: window.innerWidth,
  };
});
async function soccerHub() {
  const tag = 'soccer hub';
  const { ctx, page, errors } = await open('/soccer-career', null, { width: 1280, height: 900, reduced: false });
  try {
    await page.waitForSelector('input[placeholder*="player name"]', { timeout: 30000 });
    await page.fill('input[placeholder*="player name"]', 'Seam Walker');
    for (const [trigger, wanted] of [['Choose nationality', 'England'], ['Choose position', 'Striker'], ['Choose era', 'Current era']]) {
      await page.locator('[role="combobox"]', { hasText: trigger }).first().click();
      await page.waitForSelector('[role="option"]', { timeout: 8000 });
      await page.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; const hit = o.find(x => (x.textContent ?? '').includes(w)) || o[0]; hit.scrollIntoView(); hit.click(); }, wanted);
      await sleep(400);
    }
    await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
    await sleep(2600);
    await page.getByRole('button', { name: /Begin Career/ }).click();
    await sleep(2200);
    await closeHelp(page);
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await sleep(600);
      const h = await hubBoxes(page);
      note(`${tag} ${vp.width}: ${J(h)}`);
      if (!h) { bad(tag, `${vp.width}: no Career Timeline card on the page after Begin Career`); await shot(page, `soccer-hub-${vp.width}`); continue; }
      if (h.gridKids !== 2) bad(tag, `${vp.width}: the hub grid has ${h.gridKids} children, 1089 says two`);
      if (!h.listInCard) bad(tag, `${vp.width}: the season list is outside the Career Timeline card`);
      if (h.right && h.grid && (h.right.l < h.grid.l - 1 || h.right.r > h.grid.r + 1)) bad(tag, `${vp.width}: the right column leaves the grid`);
      if (h.card && h.list && Math.abs(h.card.b - h.list.b) > 12) bad(tag, `${vp.width}: the timeline card ends ${h.card.b - h.list.b}px below its list`);
      if (vp.width === 1280 && h.card && h.right && !(h.card.r <= h.right.l + 1)) bad(tag, '1280: the timeline card is not to the left of the hub');
      if (vp.width === 390 && h.card && h.right && !(h.right.t < h.card.t)) bad(tag, '390: the hub does not come before the timeline');
      if (h.sideways) bad(tag, `${vp.width}: the page scrolls sideways`);
      await shot(page, `soccer-hub-${vp.width}`);
      await page.evaluate(() => { const s = [...document.querySelectorAll('span')].find(x => (x.textContent ?? '').trim() === 'Career Timeline'); if (s) s.scrollIntoView({ block: 'center' }); });
      await sleep(300);
      await shot(page, `soccer-timeline-${vp.width}`);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    if (errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); await shot(page, 'soccer-threw'); }
  await ctx.close();
}

/* Home search when its chunk will not load (Round 1088) beside the stale chunk reload (once a tab). */
async function homeSearch() {
  const tag = 'home search 390';
  let named = [];
  try { named = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).filter(f => /^siteSearch[^/]*\.js$/.test(f)); } catch { named = []; }
  if (named.length !== 1) { note(`${tag}: NOT RUN, the build has ${named.length} chunks named siteSearch (wanted 1), so the walk cannot take the search away`); return; }
  const { ctx, page, errors } = await open('/', null, { width: 390, height: 844, reduced: false });
  try {
    let loads = 0;
    page.on('load', () => { loads += 1; });
    await page.route(/\/assets\/siteSearch[^/]*\.js/, r => r.abort());
    await page.waitForSelector('input[type="text"]', { timeout: 30000 });
    for (let i = 0; i < 3; i += 1) {
      await page.locator('input[type="text"]').first().fill('shootout').catch(() => {});
      await sleep(2500);
      if (await page.evaluate(() => !!document.querySelector('[data-home-search-unavailable]'))) break;
    }
    const s = await page.evaluate(() => { const n = document.querySelector('[data-home-search-unavailable]'); const q = n ? n.getBoundingClientRect() : null; return { notice: !!n, rect: q ? { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) } : null, sideways: document.documentElement.scrollWidth > window.innerWidth, results: /no games found/i.test(document.body.textContent ?? '') }; });
    note(`${tag}: ${J(s)} | extra page loads ${loads}`);
    if (!s.notice) bad(tag, 'the search chunk is missing and no notice says so');
    await shot(page, 'home-search-unavailable-390');
    await clickText(page, '^Back to games$');
    await sleep(500);
    const after = await page.evaluate(() => ({ notice: !!document.querySelector('[data-home-search-unavailable]'), value: document.querySelector('input[type="text"]')?.value ?? null, tiles: document.querySelectorAll('a[href^="/"]').length }));
    note(`${tag}: after Back to games ${J(after)}`);
    if (after.notice || after.value) bad(tag, 'Back to games did not clear the search');
    if (errors.length) note(`${tag}: NOTE page errors ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); }
  await ctx.close();
}

/* The sticky notice against the page's own "bring the new screen into view" scroll: with the save refused,
   open a hub box from three scroll positions and see whether the notice lands on the screen's Hub button. */
async function panelUnderNotice(slug, vp) {
  const d = DEFS[slug];
  const tag = `${slug} ${vp.width} panel-under-notice`;
  const save = await makeSave(slug, 1);
  const { ctx, page, errors } = await open(d.route, save, { ...vp, reduced: false });
  try {
    await hubOrThrow(page, save.key, tag);
    await setFull(page, true, save.key);
    await pressPlay(page, false);
    await sleep(900);
    if (!await toHub(page, save.key, tag, true)) throw new Error('never got back to the hub');
    for (const y of [0, 150, 420]) {
      await page.evaluate(v => window.scrollTo(0, v), y);
      await sleep(400);
      const clicked = await page.evaluate(() => {
        const box = document.querySelector('[data-career-hub-buttons]');
        const tiles = box ? [...box.querySelectorAll('button')] : [];
        const seen = tiles.filter(b => { const q = b.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return q.top >= 0 && q.bottom <= window.innerHeight && !!top && b.contains(top); });
        const pick = seen[seen.length - 1];
        if (pick) pick.click();
        return pick ? (pick.textContent ?? '').trim().slice(0, 30) : null;
      });
      await sleep(1100);
      const m = await page.evaluate(() => {
        const r = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; };
        const n = document.querySelector('[data-us-career-save-error]');
        const hub = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === 'Hub');
        let onTop = null;
        if (hub) { const q = hub.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); onTop = !!top && hub.contains(top); }
        return { notice: r(n), hub: r(hub), hubOnTop: onTop, scrollY: Math.round(window.scrollY) };
      });
      note(`${tag}: from scroll ${y} opened "${clicked}": ${J(m)}`);
      if (clicked && m.hub && m.hubOnTop === false) bad(tag, `from scroll ${y} the "${clicked}" screen opens with its Hub button covered (notice ${J(m.notice)}, button ${J(m.hub)})`);
      if (clicked && m.hub && (m.hub.t < 0 || m.hub.b > vp.height)) bad(tag, `from scroll ${y} the "${clicked}" screen opens with its Hub button off the screen (${J(m.hub)})`);
      await shot(page, `us-${slug}-${vp.width}-panel-from-${y}`);
      await page.evaluate(() => { const hub = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === 'Hub'); if (hub) hub.click(); });
      await sleep(600);
    }
    if (errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 260)}`); await shot(page, `us-${slug}-${vp.width}-panel-threw`); }
  await ctx.close();
}

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 900 };
if (WHAT === 'all' || WHAT === 'us') {
  await usJourney('nba', PHONE, false);
  await usJourney('nba', DESK, true);
  await usJourney('nfl', PHONE, true);
  await usJourney('nfl', DESK, false);
  await usJourney('mlb', PHONE, false);
  await usJourney('nhl', DESK, true);
  await homeAndBack('nba', PHONE);
  await fullFromLoad('nba', PHONE);
  await fullFromLoad('mlb', DESK);
}
if (WHAT === 'us2') {
  await usJourney('nfl', PHONE, true);
  await usJourney('nfl', DESK, false);
  await usJourney('mlb', PHONE, false);
  await homeAndBack('nba', PHONE);
  await homeAndBack('nhl', DESK);
  await panelUnderNotice('nba', PHONE);
  await panelUnderNotice('nfl', PHONE);
}
if (WHAT === 'all' || WHAT === 'soccer') await soccerHub();
if (WHAT === 'all' || WHAT === 'home') await homeSearch();
if (browser) await browser.close();
console.log(`rv-walk (${WHAT}): ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
