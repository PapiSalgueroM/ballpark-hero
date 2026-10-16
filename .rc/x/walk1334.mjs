// Round 1334 review walk (runner only). Plays /soccer-career on two builds:
//   HEAD  the branch as shipped (BASE, served by #!serve on 4173): the deck must never appear;
//   VAR   a copy whose page calls loadSoccerDeck() at import (built here, served on 4175): what Round 1504 will show.
// Saves are made in node from the head engine (seeded Math.random), planted in localStorage before load.
// supabase.co and every other outside host are aborted. Pictures and report.json go to RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.walk-out');
fs.mkdirSync(OUT, { recursive: true });
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const report = { checks: 0, failures: 0, issues: [], notes: [] };
const check = (cond, msg) => { report.checks++; if (!cond) { report.failures++; report.issues.push(msg); console.log(`FAIL ${msg}`); } else console.log(`ok ${msg}`); return !!cond; };
const note = msg => { report.notes.push(msg); console.log(`.. ${msg}`); };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

/* ── 1. the variant build: the page loads the deck at import ── */
const VAR = '/tmp/var1334';
const t0 = Date.now();
execFileSync('git', ['worktree', 'add', '--detach', VAR, 'HEAD'], { cwd: ROOT, stdio: 'inherit' });
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(VAR, 'node_modules'));
const pageFile = path.join(VAR, 'src/pages/SoccerCareer.tsx');
fs.appendFileSync(pageFile, "\nimport { loadSoccerDeck as __reviewLoadDeck } from '@/lib/soccerDeckGate';\nvoid __reviewLoadDeck().catch(() => {});\n");
execFileSync(path.join(ROOT, 'node_modules/.bin/vite'), ['build', '--logLevel', 'error'], { cwd: VAR, stdio: 'inherit' });
note(`variant built in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const server = spawn('node', [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(VAR, 'dist'), '4175'], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });
const VBASE = 'http://localhost:4175';
for (let i = 0; i < 40; i++) { try { const r = await fetch(`${VBASE}/soccer-career`); if (r.ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 250)); }

/* which built files carry a starter title, on each side */
const TITLES = ['Crosses into a crowded box', 'Fighting for the shirt', 'Derby clips', 'The return plan', 'Managing the miles', 'Your weaker foot'];
const ONLY = process.env.WALK_ONLY || '';
const carriers = dir => {
  const out = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(js|html)$/.test(f) && TITLES.some(t => fs.readFileSync(p, 'utf8').includes(t))) out.push(path.relative(dir, p)); } };
  walk(dir); return out;
};
const headCarriers = carriers(path.join(ROOT, 'dist'));
const varCarriers = carriers(path.join(VAR, 'dist'));
check(headCarriers.length === 0, `head dist: no built file carries a starter title (${headCarriers.join(', ') || 'none'})`);
check(varCarriers.length === 1, `variant dist: exactly one built file carries the starter titles (${varCarriers.join(', ')})`);

/* ── 2. the saves, from the head engine in node ── */
const bundleFile = path.join(VAR, 'walk-engine.mjs');
await esbuild.build({
  stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as gate from './src/lib/soccerDeckGate'; export * as deck from './src/lib/soccerDeck'; export { SOCCER_DECK_PACKS } from './src/data/soccerDeck';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: bundleFile, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
});
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear() };
const X = await import(pathToFileURL(bundleFile).href);
const M = X.engine;
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const CODES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function step(s, seed, clubs) {
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = (s.pendingOffers || []).find(x => x.isHomegrown) || (s.pendingOffers || [])[0]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': return s.pendingEvents && s.pendingEvents[0] ? M.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { let t = M.dismissSocialMediaPhase(s, clubs); if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs); return t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': { const sit = s.transferSituation; if (!sit || sit.type === 'no_interest') return M.stayAtClub(s); if (sit.type === 'contract_expiry') { const o = (sit.offers || [])[0]; return o ? M.acceptOffer(s, o) : M.stayAtClub(s); } return M.stayAtClub(s); }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
/** Drive a career until `want(s)` holds at a step, Math.random seeded; the deck loaded or not as the gate stands. */
function driveTo(seed, code, want, maxSeasons = 8) {
  const real = Math.random; const r = seeded(seed + 1); Math.random = r;
  try {
    const ovr = 55 + (seed % 15);
    let s = M.initCareer(`Walk ${seed}`, 'England', code, '2015-19', stats(ovr), ovr, 2015, M.FALLBACK_CLUBS, null);
    for (let g = 0; g < 2000 && !s.retired; g++) {
      if (want(s)) return s;
      if (s.phase === 'playing' && s.seasons.length >= maxSeasons) return null;
      const n = step(s, seed, M.FALLBACK_CLUBS); if (!n) return null; s = n;
    }
    return null;
  } finally { Math.random = real; }
}
const isDeck = id => typeof id === 'number' && id >= 700 && id <= 999;

/* season_summary saves (the deck not loaded in node), one keeper and one striker */
const pro = s => s.seasons.filter(r => r.type === 'playing').length;
const atSummary = s => s.phase === 'season_summary' && pro(s) >= 2 && s.age >= 18;
const SUMMARY = [];
for (const [code, seeds] of [['GK', [0, 10, 20, 30]], ['ST', [9, 19, 29, 39]]]) {
  for (const seed of seeds) { const s = driveTo(seed, code, atSummary); if (s) { SUMMARY.push({ name: `summary-${code}-${seed}`, code, state: s }); break; } }
}
note(`summary saves: ${SUMMARY.map(x => `${x.name} age ${x.state.age} at ${x.state.currentClub}`).join('; ')}`);
check(SUMMARY.length === 2, 'a keeper and a striker summary save were made');

/* random_events saves with a deck card pending first (the deck loaded in node) */
X.gate.setSoccerDeckLoader(() => Promise.resolve(X.deck));
await X.gate.loadSoccerDeck();
check(X.gate.soccerDeckReady(), 'node: the deck loaded for the pending saves');
const PENDING = [];
const wantIds = new Map([['GK', null], ['ST', null], ['CB', null], ['CM', null]]);
for (const code of wantIds.keys()) {
  const ci = CODES.indexOf(code);
  for (let k = 0; k < 12 && !wantIds.get(code); k++) {
    const seed = ci + 10 * k;
    const s = driveTo(seed, code, x => x.phase === 'random_events' && isDeck(x.pendingEvents?.[0]?.id) && !PENDING.some(p => p.state.pendingEvents[0].id === x.pendingEvents[0].id));
    if (s) { wantIds.set(code, s.pendingEvents[0].id); PENDING.push({ name: `pending-${code}-${s.pendingEvents[0].id}`, code, state: s }); }
  }
}
note(`pending saves: ${PENDING.map(p => `${p.name} "${p.state.pendingEvents[0].title}" (${p.state.pendingEvents.length} cards, ${p.state.pendingEvents[0].choices.length} options)`).join('; ')}`);
check(PENDING.length >= 3, 'at least three deck pending saves were made');
X.gate.setSoccerDeckLoader();
for (const x of [...SUMMARY, ...PENDING]) fs.writeFileSync(path.join(OUT, `${x.name}.json`), JSON.stringify(x.state));

/* ── 3. the browser ── */
const browser = await pw.chromium.launch();
const VIEWS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const MOTIONS = ['reduce', 'no-preference'];
async function open(base, state, view, motion, seed = null) {
  const ctx = await browser.newContext({ viewport: view, reducedMotion: motion, deviceScaleFactor: 1 });
  if (seed !== null) await ctx.addInitScript(([sd]) => {
    let a = sd >>> 0;
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, [seed]);
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(url => !/^https?:\/\/localhost:/.test(url.href) && !url.href.startsWith('data:'), r => r.abort());
  await ctx.addInitScript(([raw]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', raw); } catch { /* none */ }
  }, [JSON.stringify(state)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  const js = [];
  page.on('request', r => { if (r.url().endsWith('.js')) js.push(r.url().split('/').pop()); });
  await page.goto(`${base}/soccer-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { ctx, page, errors, js };
}
const readSave = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'); } catch { return null; } });
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); };
const PRIORITY = [/^\s*continue/i, /post training video/i, /skip/i, /move on/i, /^\s*next/i, /done/i, /dismiss/i, /close/i, /stay quiet/i, /no thanks/i];
async function clickOn(page) {
  const buttons = await page.$$('main button:visible, button:visible');
  const texts = [];
  for (const b of buttons) texts.push(((await b.innerText().catch(() => '')) || '').trim());
  for (const re of PRIORITY) {
    const i = texts.findIndex(t => re.test(t) && !/retire/i.test(t));
    if (i >= 0) { await buttons[i].click(); return texts[i].slice(0, 40); }
  }
  return null;
}
const layout = page => page.evaluate(() => {
  const card = [...document.querySelectorAll('h3')].find(h => h.closest('div.rounded-xl.border-2'));
  const box = card ? card.closest('div.rounded-xl.border-2') : null;
  const btns = box ? [...box.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right), text: b.innerText.replace(/\s+/g, ' ').trim() }; }) : [];
  const cut = box ? [...box.querySelectorAll('*')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.slice(0, 30)) : [];
  return { title: card ? card.textContent : null, btns, cut, sideways: document.documentElement.scrollWidth > window.innerWidth, scrollY: Math.round(window.scrollY), docH: document.documentElement.scrollHeight, iw: window.innerWidth,
    cardBottom: box ? Math.round(box.getBoundingClientRect().bottom) : null, cardTop: box ? Math.round(box.getBoundingClientRect().top) : null };
});

/* Path A: deal by play, from season_summary, on HEAD (the deck must never appear) and on VAR (the deck card first, when one is dealt) */
for (const [tag, base] of ONLY === 'S' ? [] : [['head', BASE], ['var', VBASE]]) {
  for (const sv of SUMMARY) for (const view of VIEWS) for (const motion of MOTIONS) {
    const id = `A-${tag}-${sv.code}-${view.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    const { ctx, page, errors, js } = await open(base, sv.state, view, motion);
    const phases = [];
    let s = await readSave(page);
    for (let i = 0; i < 10 && s && s.phase !== 'random_events' && s.phase !== 'transfer_window'; i++) {
      phases.push(s.phase);
      if (i === 0) await shot(page, `${id}-0-${s.phase}`);
      let clicked = await clickOn(page);
      if (!clicked) { await page.waitForTimeout(3000); clicked = await clickOn(page); }
      if (!clicked) { await shot(page, `${id}-stuck-${s.phase}`); note(`${id}: no button to press at ${s.phase}`); break; }
      await page.waitForTimeout(600);
      s = await readSave(page);
    }
    phases.push(s?.phase);
    const ids = (s?.pendingEvents || []).map(e => e.id);
    if (s?.phase === 'random_events') {
      await page.waitForTimeout(400);
      await shot(page, `${id}-1-random-events`);
      const L = await layout(page);
      note(`${id}: phases ${phases.join(' > ')}; batch ${ids.join(',')}; on screen "${L.title}"; buttons ${L.btns.map(b => b.h).join('/')} px; sideways ${L.sideways}`);
      if (tag === 'head') check(!ids.some(isDeck), `${id}: no deck card in the batch on the shipped page`);
      else check(ids.filter(isDeck).length <= 1 && (!ids.some(isDeck) || isDeck(ids[0])), `${id}: at most one deck card and only first`);
      check(!L.sideways, `${id}: no sideways scroll`);
    } else note(`${id}: phases ${phases.join(' > ')}; never reached random_events (batch empty or a button not found)`);
    const deckJs = js.filter(f => varCarriers.some(c => c.endsWith(f)));
    if (tag === 'head') check(deckJs.length === 0, `${id}: the shipped page fetched no deck chunk (${js.length} scripts)`);
    else note(`${id}: deck chunk fetched: ${deckJs.join(', ') || 'none'}`);
    check(errors.length === 0, `${id}: no page error ${errors.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
}

/* Path S: the same seeded Math.random in the page on both builds, so the state at the deal is the same: the variant's
   batch minus its first deck card must equal the shipped page's batch. Three repeats per build show determinism. */
async function dealBatch(base, state, seed) {
  const { ctx, page, errors } = await open(base, state, VIEWS[0], 'reduce', seed);
  let s = await readSave(page);
  for (let i = 0; i < 12 && s && s.phase !== 'random_events' && s.phase !== 'transfer_window'; i++) {
    let c = await clickOn(page); if (!c) { await page.waitForTimeout(3000); c = await clickOn(page); }
    if (!c) break; await page.waitForTimeout(600); s = await readSave(page);
  }
  const out = { phase: s?.phase, ids: (s?.pendingEvents || []).map(e => e.id), errors: errors.length };
  await ctx.close();
  return out;
}
if (ONLY === 'S') {
  for (const sv of SUMMARY) for (const seed of [42, 7, 1234]) {
    const runs = { head: [], var: [] };
    for (const [tag, base] of [['head', BASE], ['var', VBASE]]) for (let r = 0; r < 3; r++) runs[tag].push(await dealBatch(base, sv.state, seed));
    const key = b => `${b.phase}:${b.ids.join(',')}`;
    const h = runs.head.map(key), v = runs.var.map(key);
    note(`S ${sv.name} seed ${seed}: head ${h.join(' | ')}; var ${v.join(' | ')}`);
    const stripped = runs.var.map(b => `${b.phase}:${(isDeck(b.ids[0]) ? b.ids.slice(1) : b.ids).join(',')}`);
    check(new Set(h).size === 1, `S ${sv.name} seed ${seed}: the shipped page deals one batch in three runs`);
    check(stripped.every(x => x === h[0]), `S ${sv.name} seed ${seed}: the variant's batch minus its deck card is the shipped page's (${stripped.join(' | ')} vs ${h[0]})`);
  }
}

/* Path B: a deck card pending at random_events on VAR: how it looks, and what an answer does */
for (const pv of ONLY ? [] : PENDING) for (const view of VIEWS) for (const motion of MOTIONS) {
  const id = `B-${pv.code}-${pv.state.pendingEvents[0].id}-${view.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { ctx, page, errors } = await open(VBASE, pv.state, view, motion);
  await page.waitForTimeout(500);
  await shot(page, `${id}-0-top`);
  await page.evaluate(() => { const h = [...document.querySelectorAll('div.rounded-xl.border-2')].find(d => d.querySelector('h3') && d.querySelector('button')); h?.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(300);
  const L = await layout(page);
  await shot(page, `${id}-0-card`);
  const card = pv.state.pendingEvents[0];
  check(L.title === card.title, `${id}: the pending deck card is on screen ("${L.title}")`);
  check(L.btns.length === card.choices.length && L.btns.every(b => b.h >= 44), `${id}: ${L.btns.length} buttons, heights ${L.btns.map(b => b.h).join('/')} px (>= 44)`);
  check(!L.sideways && L.cut.length === 0, `${id}: nothing sideways or cut (${L.cut.join(' | ')})`);
  note(`${id}: buttons ${JSON.stringify(L.btns.map(b => b.text))}`);
  const before = await readSave(page);
  const i0 = card.choices.findIndex(c => / next season /.test(c.consequence));
  const pick = i0 >= 0 ? i0 : 0;
  const pre = await layout(page);
  const btn = (await page.$$('div.rounded-xl.border-2 button'))[pick];
  await btn.click();
  await page.waitForTimeout(900);
  await shot(page, `${id}-1-answered`);
  const after = await readSave(page);
  const post = await layout(page);
  const toast = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast], li[role=status], [role=status]')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3));
  const lastLine = after?.events?.[after.events.length - 1] || '';
  check(after && after.pendingEvents?.[0]?.id !== card.id, `${id}: the card left the batch after the answer`);
  check(lastLine.includes(card.title), `${id}: the season log's last line names the card: "${lastLine}"`);
  note(`${id}: answered "${card.choices[pick].label}" (${card.choices[pick].consequence}); toast ${JSON.stringify(toast)}; boost ${JSON.stringify(before?.statBoostNextSeason)} -> ${JSON.stringify(after?.statBoostNextSeason)}; morale ${before?.morale} -> ${after?.morale}; scrollY ${pre.scrollY} -> ${post.scrollY}, docH ${pre.docH} -> ${post.docH}; next "${post.title}"`);
  check(errors.length === 0, `${id}: no page error ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
}

/* Path C: the shipped page with a deck card pending (a save from a later build): what the player sees */
for (const pv of ONLY ? [] : PENDING.slice(0, 1)) for (const view of VIEWS.slice(0, 1)) {
  const id = `C-head-${pv.state.pendingEvents[0].id}-${view.width}`;
  const { ctx, page, errors } = await open(BASE, pv.state, view, 'reduce');
  await shot(page, `${id}-0-card`);
  const btn = (await page.$$('div.rounded-xl.border-2 button'))[0];
  if (btn) await btn.click();
  await page.waitForTimeout(900);
  await shot(page, `${id}-1-after`);
  const after = await readSave(page);
  const toast = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast], [role=status]')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3));
  note(`${id}: after the tap phase ${after?.phase}, batch ${(after?.pendingEvents || []).map(e => e.id).join(',')}, boost ${JSON.stringify(after?.statBoostNextSeason)}, last log "${after?.events?.[after.events.length - 1]}", toast ${JSON.stringify(toast)}`);
  check(errors.length === 0, `${id}: no page error ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
}

await browser.close();
save();
console.log(`walk1334: ${report.checks} checks, ${report.failures} failed; ${report.notes.length} notes; pictures in ${OUT}`);
process.exit(report.failures ? 1 : 0);
