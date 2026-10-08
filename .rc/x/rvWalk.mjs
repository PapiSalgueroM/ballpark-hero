/* Release AO review walk (runner lens). Runs on the GitHub runner from the repo root:
   BASE is the served branch build, RC_OUT takes screenshots and measurements.
   1. old saves: Release AN's engines (git archive of origin/release-an2-int) make saves in node,
      this branch's engines load them and play on, then the branch's PAGES open them.
   2. plays the Season Centre (soccer and NBA), opens Club Manager, measures the sound switch,
      at 390x844 and 1280x900, reduced motion off and on. supabase.co is aborted everywhere. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const pw = process.env.RV_NODE_ONLY === '1' ? null : (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-out');
fs.mkdirSync(OUT, { recursive: true });
const BASEROOT = path.join(ROOT, '.rc', 'base');
const NODE_ONLY = process.env.RV_NODE_ONLY === '1';

let checks = 0, failed = 0;
const notes = [];
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); return ok; };
const info = label => { console.log(`info ${label}`); notes.push(label); };

/* ─── the base tree ─── */
fs.mkdirSync(BASEROOT, { recursive: true });
let baseRef = 'origin/release-an2-int';
try { execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'pipe' }); }
catch { execSync('git fetch -q origin release-an2-int', { stdio: 'inherit' }); baseRef = 'FETCH_HEAD'; }
execSync(`git archive ${baseRef} src | tar -x -C "${BASEROOT}"`, { stdio: 'inherit', shell: '/bin/bash' });
info(`base tree ${execSync(`git rev-parse ${baseRef}`).toString().trim()} extracted; branch head ${execSync('git rev-parse HEAD^').toString().trim()} (request commit's parent)`);

/* ─── both trees' engines ─── */
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
async function bundle(root, tag) {
  const outfile = path.join(process.env.TMPDIR || '/tmp', `rv-bundle-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: [
      "export * as soccer from './src/lib/soccerCareerEngine.ts';",
      "export * as cm from './src/lib/clubManager.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
    ].join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, absWorkingDir: root, logLevel: 'error', jsx: 'automatic',
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' },
    banner: { js: "import { createRequire as __rvRequire } from 'node:module'; const require = __rvRequire(import.meta.url);" },
  });
  return import(pathToFileURL(outfile).href);
}
const OLD = await bundle(BASEROOT, 'base');
const NEW = await bundle(ROOT, 'branch');
info('bundled soccer, Club Manager and the NBA binding from both trees');

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FIXED_NOW = Date.UTC(2026, 9, 8, 16);
function withSeed(seed, fn) {
  const r = Math.random, n = Date.now;
  Math.random = mulberry32(seed >>> 0); Date.now = () => FIXED_NOW;
  try { return fn(); } finally { Math.random = r; Date.now = n; }
}

/* ─── soccer: the step a walker takes, from scripts/playSeasonCentre.mjs ─── */
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function stepWith(soccer, CLUBS, s) {
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
    case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
    default: return null;
  }
}

/* base saves: one per phase we meet, from three seeded careers */
const SOCCER_SAVES = {};
for (let c = 0; c < 6; c += 1) {
  withSeed(c * 7919 + 4242, () => {
    const S0 = OLD.soccer, CL = S0.FALLBACK_CLUBS;
    let s = S0.initCareer(`Old Save ${c}`, 'England', ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'][c], '2010-14', abil(72 + c), 72 + c, 2010, CL, null, 92);
    for (let g = 0; g < 500 && s && !s.retired; g += 1) {
      const key = s.phase === 'playing' ? (s.seasons.length >= 2 ? 'playing' : 'playing_early') : s.phase;
      const tag = `${key}#${c}`;
      if (!SOCCER_SAVES[tag] && Object.keys(SOCCER_SAVES).filter(k => k.startsWith(`${key}#`)).length < 2) SOCCER_SAVES[tag] = JSON.stringify(s);
      s = stepWith(S0, CL, s);
    }
  });
}
info(`base engine made ${Object.keys(SOCCER_SAVES).length} soccer saves: ${Object.keys(SOCCER_SAVES).join(' ')}`);

/* ─── node: the branch's soccer engine plays each base save on to retirement ─── */
const soccerOutcome = {};
for (const [tag, raw] of Object.entries(SOCCER_SAVES)) {
  let err = null, steps = 0, s = null;
  const leagues = new Set();
  withSeed(99 + tag.length, () => {
    try {
      const S1 = NEW.soccer, CL = S1.FALLBACK_CLUBS;
      s = JSON.parse(raw);
      for (; steps < 700 && s && !s.retired; steps += 1) {
        const n = stepWith(S1, CL, s);
        if (!n) { err = `no step for phase ${s.phase}`; break; }
        s = n;
        const last = s.seasons && s.seasons[s.seasons.length - 1];
        if (last && last.league) leagues.add(last.league);
      }
    } catch (e) { err = `${e && e.message}`.slice(0, 200); }
  });
  soccerOutcome[tag] = { err, steps, retired: !!(s && s.retired), seasons: s && s.seasons ? s.seasons.length : null, leagues: [...leagues].slice(0, 8) };
  check(!err && s && s.retired, `soccer old save ${tag}: the branch engine plays it on to retirement (${steps} steps, ${s && s.seasons ? s.seasons.length : '?'} seasons)${err ? ` ERROR ${err}` : ''}`);
}

/* ─── node: Club Manager. Base starts and saves, the branch loads and plays on ─── */
const CM_SAVES = {};
const cmOutcome = {};
for (const [i, club] of ['Real Madrid', 'Arsenal', 'Boca Juniors', 'Celtic'].entries()) {
  let raw = null, err = null;
  try {
    withSeed(5200 + i, () => {
      let s = OLD.cm.startCareer(club);
      for (let g = 0; g < 9; g += 1) {
        const r = OLD.cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind !== 'match') break;
      }
      mem.delete(OLD.cm.SAVE_KEY);
      OLD.cm.saveCareer(s);
      raw = mem.get(OLD.cm.SAVE_KEY);
    });
  } catch (e) { err = `${e && e.message}`.slice(0, 160); }
  if (!raw) { info(`Club Manager base save for ${club} not made (${err || 'no save string'}): skipped`); continue; }
  CM_SAVES[club] = raw;
  mem.set(NEW.cm.SAVE_KEY, raw);
  const oldLoaded = OLD.cm.loadCareer();
  mem.set(NEW.cm.SAVE_KEY, raw);
  let newLoaded = null, loadErr = null;
  try { newLoaded = NEW.cm.loadCareer(); } catch (e) { loadErr = `${e && e.message}`.slice(0, 200); }
  const same = !!newLoaded && JSON.stringify(newLoaded) === JSON.stringify(oldLoaded);
  check(!!newLoaded, `Club Manager old save (${club}): the branch loads it${loadErr ? ` ERROR ${loadErr}` : ''}`);
  if (newLoaded && !same) {
    const a = JSON.stringify(oldLoaded), b = JSON.stringify(newLoaded);
    let d = 0; while (d < a.length && a[d] === b[d]) d += 1;
    info(`Club Manager old save (${club}): loaded state differs from the base's load at char ${d}: base "${a.slice(Math.max(0, d - 60), d + 60)}" branch "${b.slice(Math.max(0, d - 60), d + 60)}"`);
  }
  check(same, `Club Manager old save (${club}): loads to the same state the base loads (${raw.length} chars)`);
  /* play on, on both engines with one seed: how far and how alike */
  const run = (E, start) => withSeed(8800 + i, () => {
    let s = start, played = 0, kinds = {}, e2 = null, lastKind = null;
    try {
      for (let g = 0; g < 80 && s; g += 1) {
        const r = E.playNextEntry(s, { skipHalftime: true });
        kinds[r.kind] = (kinds[r.kind] || 0) + 1; lastKind = r.kind; s = r.state;
        if (r.kind !== 'match') break;
        played += 1;
      }
    } catch (e) { e2 = `${e && e.message}`.slice(0, 200); }
    return { played, kinds, err: e2, lastKind, week: s && s.week, digest: s ? JSON.stringify({ w: s.week, pts: s.table && s.table.slice ? s.table.slice(0, 20).map(r => [r.name || r.club, r.pts]) : null }) : null };
  });
  const onNew = newLoaded ? run(NEW.cm, newLoaded) : null;
  const onOld = oldLoaded ? run(OLD.cm, oldLoaded) : null;
  cmOutcome[club] = { onNew, onOld };
  if (onNew) check(!onNew.err, `Club Manager old save (${club}): the branch plays on ${onNew.played} matches, stops on "${onNew.lastKind}" at week ${onNew.week}${onNew.err ? ` ERROR ${onNew.err}` : ''}`);
  if (onNew && onOld) info(`Club Manager old save (${club}): same seed, base plays ${onOld.played} (stops "${onOld.lastKind}" week ${onOld.week}); table digest equal: ${onNew.digest === onOld.digest}`);
}

/* ─── node: the NBA. A base save for the page ─── */
function nbaSave(SB, seasons) {
  return withSeed(1048 + seasons * 7, () => {
    const rng = Math.random;
    const c = SB.startCareer('Old Baller', 'SG', SB.create.archetypes.SG[0], rng, null, 'now');
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < seasons; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
    c.contractYears = Math.max(3, c.contractYears);
    return { key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
  });
}
let NBA = null;
try { NBA = nbaSave(OLD.NBA_CAREER_SPORT, 3); info(`base NBA save made under ${NBA.key} (${NBA.value.length} chars)`); }
catch (e) { info(`base NBA save not made: ${e && e.message}`); }
fs.writeFileSync(path.join(OUT, 'node-old-saves.json'), JSON.stringify({ soccerOutcome, cmOutcome }, null, 1));
if (NODE_ONLY) { console.log(`rvWalk: ${checks} checks, ${failed} failed (node only)`); process.exit(failed ? 1 : 0); }

/* ─── the browser ─── */
const browser = await pw.chromium.launch();
const measures = [];
const SIZES = [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 900, tag: 'desk' }];
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false; b.click(); return true;
}, text);
const shot = async (page, name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const layout = page => page.evaluate(() => {
  const de = document.documentElement;
  const cut = [];
  const small = [];
  for (const el of document.querySelectorAll('[data-season-centre] button, [data-us-season-centre] button, [data-centre-header]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const label = (el.textContent || '').trim().slice(0, 28);
    if (r.right > innerWidth + 1 || r.left < -1) cut.push(`${label} ${Math.round(r.left)}..${Math.round(r.right)}`);
    if (el.tagName === 'BUTTON' && r.height < 43.5) small.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const text = (document.querySelector('#root')?.innerText || '').slice(0, 30000);
  return { sideways: de.scrollWidth > innerWidth + 1, scrollW: de.scrollWidth, cut, small, crashed: /Something went wrong|Unexpected Application Error/i.test(text), undef: (text.match(/undefined|NaN|\[object Object\]/g) || []).length };
});
async function open(vp, reduced, saves, route, extraInit) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([pairs, extra]) => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      for (const [k, v] of pairs) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
    } catch (e) { /* a blocked store */ }
    if (extra === 'audio') {
      window.__ac = 0; window.__plays = 0;
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) { window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac += 1; } }; }
      const p = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...a) { window.__plays += 1; return p.apply(this, a); };
    }
  }, [saves, extraInit || '']);
  const page = await ctx.newPage();
  const errors = [];
  let aborted = 0;
  await page.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
  page.on('pageerror', e => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|net::|Failed to fetch/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 60, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play|Start playing/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, errors, aborted: () => aborted };
}
const pick = prefix => Object.entries(SOCCER_SAVES).find(([k]) => k.startsWith(`${prefix}#`));
/** Walk an open Season Centre (soccer or US): help, kick off card, a game, the phone list, on to the review. */
async function centre(X, tag, g, vp, reduced, sel, startWord, listSel) {
  await shot(X.page, `${g}-first-${tag}`);
  if (await clickText(X.page, 'Got it')) await X.page.waitForTimeout(400);
  const k = await layout(X.page);
  await shot(X.page, `${g}-kick-${tag}`);
  check(!k.sideways && k.cut.length === 0, `[${tag}] ${g} kick off card: nothing off the side (${k.cut.join(' | ') || 'none'})`);
  if (k.small.length) info(`[${tag}] ${g} kick off card: buttons under 44 px tall: ${k.small.join(' | ')}`);
  const started = await clickText(X.page, startWord);
  check(started, `[${tag}] ${g}: the start button reads "${startWord}"`);
  await X.page.waitForTimeout(reduced ? 700 : 2600);
  await shot(X.page, `${g}-mid-${tag}`);
  const m = await layout(X.page);
  check(!m.sideways && m.cut.length === 0 && !m.crashed, `[${tag}] ${g} game one: nothing off the side, no error (${m.cut.join(' | ') || 'none'})`);
  if (m.undef) info(`[${tag}] ${g} game one: ${m.undef} undefined, NaN or [object Object] words on the page`);
  if (m.small.length) info(`[${tag}] ${g} game one: buttons under 44 px tall: ${m.small.join(' | ')}`);
  await clickText(X.page, 'Results');
  await X.page.waitForTimeout(1500);
  if (await X.page.$('[data-moment-offer]')) { await shot(X.page, `${g}-offer-${tag}`); await clickText(X.page, '▶ Let it play'); await X.page.waitForTimeout(900); }
  await shot(X.page, `${g}-ft-${tag}`);
  if (vp.w < 700) {
    const order = await X.page.evaluate(([s, l]) => {
      const top = q => { const e = document.querySelector(q); return e ? Math.round(e.getBoundingClientRect().top + (document.querySelector('[data-centre-stage]')?.scrollTop || 0)) : null; };
      return { list: top(l), table: top(`${s} table`), record: top('[data-record-panel]'), soFar: top('[data-so-far]') };
    }, [sel, listSel]);
    info(`[${tag}] ${g} phone order (stage offsets): table ${order.table}, record panel ${order.record}, list button ${order.list}, so far tiles ${order.soFar}`);
    await X.page.evaluate(() => { const st = document.querySelector('[data-centre-stage]'); if (st) st.scrollTop = st.scrollHeight; });
    await shot(X.page, `${g}-ft-bottom-${tag}`);
    await X.page.evaluate(() => { const st = document.querySelector('[data-centre-stage]'); if (st) st.scrollTop = 0; });
    if (await X.page.$(listSel)) {
      await X.page.evaluate(q => document.querySelector(q).click(), listSel);
      await shot(X.page, `${g}-list-${tag}`);
      const f = await layout(X.page);
      check(!f.sideways && f.cut.length === 0, `[${tag}] ${g} phone list: nothing off the side`);
      await clickText(X.page, '← Back');
    } else info(`[${tag}] ${g} phone: no list button (${listSel}) on screen after game one`);
  }
  let review = false;
  for (let i = 0; i < 120 && !review; i += 1) {
    if (await X.page.$('[data-review]')) { review = true; break; }
    if (await X.page.$('[data-moment-offer]')) { await clickText(X.page, '▶ Let it play'); await X.page.waitForTimeout(300); }
    await clickText(X.page, 'Results');
    const next = await X.page.evaluate(() => {
      const b = [...document.querySelectorAll('[data-centre-bar] button, [data-season-centre] button, [data-us-season-centre] button')].find(x => !x.disabled && /^(▶|📋)/.test((x.textContent ?? '').trim()));
      if (!b) return null; const t = b.textContent.trim(); b.click(); return t;
    });
    if (i === 3) info(`[${tag}] ${g}: the bar's next button read "${next}"`);
    await X.page.waitForTimeout(reduced ? 120 : 240);
  }
  check(review, `[${tag}] ${g}: walked every game to the review`);
  await shot(X.page, `${g}-review-${tag}`);
  const rv = await layout(X.page);
  check(!rv.sideways && !rv.crashed && rv.undef === 0, `[${tag}] ${g} review: no sideways scroll, no error, no undefined or NaN words (${rv.undef})`);
  if (rv.small.length) info(`[${tag}] ${g} review: buttons under 44 px tall: ${rv.small.join(' | ')}`);
  await X.page.evaluate(() => { const st = document.querySelector('[data-centre-stage]'); if (st) st.scrollTop = st.scrollHeight; });
  await shot(X.page, `${g}-review-bottom-${tag}`);
}

for (const vp of SIZES) for (const reduced of [false, true]) {
  const tag = `${vp.tag}-${reduced ? 'rm' : 'mo'}`;
  /* 1. soccer: a base save mid career, the hub, then the Season Centre */
  const play = pick('playing');
  if (play) {
    const X = await open(vp, reduced, reduced ? [['soccerCareerSave', play[1]], ['seasonCentre:help', '1']] : [['soccerCareerSave', play[1]]], '/soccer-career');
    const hub = await layout(X.page);
    await shot(X.page, `soccer-hub-${tag}`);
    check(!hub.crashed, `[${tag}] soccer: the base save ${play[0]} opens on the hub, no error screen`);
    check(!hub.sideways, `[${tag}] soccer hub: no sideways scroll (scrollWidth ${hub.scrollW})`);
    const has = await X.page.evaluate(() => !!document.querySelector('[data-week-by-week]'));
    check(has, `[${tag}] soccer hub: the week by week button is there`);
    if (has) {
      await X.page.click('[data-week-by-week]');
      const opened = await X.page.waitForSelector('[data-season-centre]', { timeout: 25000 }).then(() => true).catch(() => false);
      check(opened, `[${tag}] soccer: the Season Centre opens on the base save`);
      if (opened) await centre(X, tag, 'soccer', vp, reduced, '[data-season-centre]', 'Kick off', '[data-centre-fixtures]');
    }
    check(X.errors.length === 0, `[${tag}] soccer: no page or console errors (${X.errors.slice(0, 3).join(' || ') || 'none'})`);
    measures.push({ tag, game: 'soccer', errors: X.errors, aborted: X.aborted() });
    await X.ctx.close();
  }
  /* 2. the NBA: a base save, the hub, then the Season Center (1046's layout around 1048's record panel) */
  if (NBA) {
    const X = await open(vp, reduced, reduced ? [[NBA.key, NBA.value], ['seasonCentre:help:nba', '1']] : [[NBA.key, NBA.value]], '/nba-my-career');
    await X.page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), { timeout: 30000 }).catch(() => {});
    const hub = await layout(X.page);
    await shot(X.page, `nba-hub-${tag}`);
    check(!hub.crashed && !hub.sideways, `[${tag}] nba: the base save opens on the hub, no error screen, no sideways scroll (scrollWidth ${hub.scrollW})`);
    const pressed = await clickText(X.page, 'Week by week');
    check(pressed, `[${tag}] nba hub: a Week by week button is there`);
    if (pressed) {
      const opened = await X.page.waitForSelector('[data-us-season-centre]', { timeout: 30000 }).then(() => true).catch(() => false);
      check(opened, `[${tag}] nba: the Season Center opens on the base save`);
      if (opened) await centre(X, tag, 'nba', vp, reduced, '[data-us-season-centre]', 'Tip off', '[data-centre-fixtures]');
    }
    check(X.errors.length === 0, `[${tag}] nba: no page or console errors (${X.errors.slice(0, 3).join(' || ') || 'none'})`);
    measures.push({ tag, game: 'nba', errors: X.errors, aborted: X.aborted() });
    await X.ctx.close();
  }
  /* 3. Club Manager: a base save opens on the branch's page */
  const cmClub = Object.keys(CM_SAVES)[0];
  if (cmClub) {
    const X = await open(vp, reduced, [[NEW.cm.SAVE_KEY, CM_SAVES[cmClub]]], '/club-manager');
    await X.page.waitForTimeout(2500);
    const hub = await layout(X.page);
    await shot(X.page, `cm-open-${tag}`);
    const txt = await X.page.evaluate(() => (document.querySelector('#root')?.innerText || '').slice(0, 6000));
    check(!hub.crashed && !hub.sideways, `[${tag}] Club Manager: the page opens with a base save of ${cmClub}, no error screen, no sideways scroll (scrollWidth ${hub.scrollW})`);
    const cont = await X.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Continue|Resume|Load/i.test(x.textContent ?? '')); if (b) { const t = b.textContent.trim(); b.click(); return t; } return null; });
    info(`[${tag}] Club Manager: club name on the first screen: ${txt.includes(cmClub)}; pressed "${cont}"`);
    await X.page.waitForTimeout(2500);
    await shot(X.page, `cm-hub-${tag}`);
    const after = await layout(X.page);
    const txt2 = await X.page.evaluate(() => (document.querySelector('#root')?.innerText || '').slice(0, 8000));
    check(!after.crashed && txt2.includes(cmClub), `[${tag}] Club Manager: the base career of ${cmClub} is on screen after the press, no error screen`);
    check(X.errors.length === 0, `[${tag}] Club Manager: no page or console errors (${X.errors.slice(0, 3).join(' || ') || 'none'})`);
    measures.push({ tag, game: 'cm', errors: X.errors, aborted: X.aborted() });
    await X.ctx.close();
  }
  /* 4. the sound switch: its boxes, and nothing made or played before it is on */
  {
    const X = await open(vp, reduced, [], '/soccer-career', 'audio');
    const box = sel => X.page.evaluate(q => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), shown: cs.display !== 'none' && r.width > 0, pressed: e.getAttribute('aria-pressed') }; }, sel);
    const icon = await box('[data-sound-toggle="icon"]');
    const text = await box('[data-sound-toggle="text"]');
    await X.page.mouse.click(vp.w / 2, 300);
    await X.page.keyboard.press('Tab');
    await X.page.waitForTimeout(600);
    const before = await X.page.evaluate(() => ({ ac: window.__ac, plays: window.__plays, stored: Object.keys(localStorage).filter(k => /sound/i.test(k)).map(k => `${k}=${localStorage.getItem(k)}`) }));
    await X.page.screenshot({ path: path.join(OUT, `sound-header-${tag}.png`), clip: { x: 0, y: 0, width: vp.w, height: 130 } });
    const target = icon && icon.shown ? '[data-sound-toggle="icon"]' : '[data-sound-toggle="text"]';
    let afterOn = null, pressedOn = null;
    if (await X.page.$(target)) {
      await X.page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center' }), target);
      await X.page.waitForTimeout(300);
      await X.page.screenshot({ path: path.join(OUT, `sound-switch-${tag}.png`) });
      await X.page.click(target);
      await X.page.waitForTimeout(1500);
      await X.page.mouse.click(vp.w / 2, 300);
      await X.page.waitForTimeout(1200);
      pressedOn = await X.page.evaluate(q => document.querySelector(q)?.getAttribute('aria-pressed'), target);
      afterOn = await X.page.evaluate(() => ({ ac: window.__ac, plays: window.__plays, stored: Object.keys(localStorage).filter(k => /sound/i.test(k)).map(k => `${k}=${localStorage.getItem(k)}`) }));
    }
    info(`[${tag}] sound: header icon ${JSON.stringify(icon)}, footer text ${JSON.stringify(text)}; before the switch: ${JSON.stringify(before)}; after switching on with ${target}: pressed=${pressedOn} ${JSON.stringify(afterOn)}`);
    check(before.ac === 0 && before.plays === 0, `[${tag}] sound: nothing is made or played before he switches it on (AudioContext ${before.ac}, play() ${before.plays})`);
    if (icon && icon.shown) check(icon.w >= 44 && icon.h >= 44, `[${tag}] sound: the header switch is a ${icon.w} by ${icon.h} target`);
    check(pressedOn === 'true', `[${tag}] sound: the switch turns on with reduced motion ${reduced ? 'on' : 'off'}`);
    measures.push({ tag, game: 'sound', icon, text, before, afterOn, errors: X.errors });
    await X.ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-measures.json'), JSON.stringify({ notes, measures }, null, 1));
console.log(`rvWalk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
