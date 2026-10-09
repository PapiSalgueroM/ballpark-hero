/**
 * Round 1045: the Season Centre in a real browser (DESIGN 1045 section 9.5,
 * with the critic's C1, C8, C9 and C11). ENGINES=chromium, served the way the
 * live host serves (scripts/lib/hostLikeServer.mjs), saves made by the real
 * engine in node and handed to the page through localStorage.
 *
 *  1. Lazy: no Season Centre chunk on a fresh hub; requested after 📺. The
 *     action bar's FIRST button still starts with "Next Season" (four vitests
 *     press it by position).
 *  2. Same press: one context presses 📺 Week by week, another Next Season,
 *     on the same save, with Math.random reseeded inside the page right before
 *     each click: the saved JSON is equal byte for byte. Then the first walks
 *     every matchday to the review and closes: the save string is unchanged.
 *  3. The UI agrees with the summary card: apps, goals and assists, the finish
 *     and the champion ("X won it"), on a title season and a named champion.
 *  4. The clock: frames sampled through a match at 1x; the score shown always
 *     equals the goals the derived season (the same modules, in node) has at or
 *     before the minute shown.
 *  5. Walker safety: on every screen, playSoccerCareer's own pick (its ACTIONS
 *     and SKIP parsed from that file's TEXT, critic C8; the file runs on
 *     import) never lands on a new button, and no new label starts with an
 *     ACTIONS entry.
 *  6. Phone 390 by 844: no sideways scroll, the bar inside the screen, Next
 *     Season at least its width without 📺 minus 52 px, the page does not move
 *     across a matchday. Desktop 1440 by 900: three columns side by side, the
 *     dialog inside the screen, the page does not scroll.
 *  7. Reduced motion: the first frame of a match is full time, and nothing is
 *     still animating 100 ms after each arrival.
 *  8. The chunk carries no Club Manager marker.
 *  Screenshots of the kick off card, a derby day, a match mid clock, the title
 *  clinch and the review at both sizes go to SHOTS (default .tmp-fx/shots).
 *
 * Controls (SEASON_CENTRE_PLAY_CONTROL=), applied to what is SERVED (the built
 * files on disk are never written; each refuses to run if its needle is
 * missing):
 *   static  the page imports the Season Centre chunk as it loads -> 1 red
 *   write   the chunk writes a field into the save when it loads -> 2 red
 *   label   a Season Centre button is renamed "Next matchday"   -> 5 red
 *   count   the score bug reads 20 minutes ahead of the clock    -> 4 red
 *
 * Measured 2026-10-07 on the merged release-ai-int tree: 39 checks, 0 failed
 * (the score bug sampled over 126 to 142 frames a match with 0 wrong; Next
 * Season 173 px beside the 44 px 📺, 225 px without it). Controls, each exit 1:
 * static fails 1 (49 scripts on the hub); write fails 1 (the press no longer
 * writes the save Next Season writes); label fails 4, among them 5 ("Next
 * matchday" clashes with the walker); count fails 2 (34 and 35 wrong frames).
 *
 * Round 1047: a matchday can now stop for one of his moments. This harness
 * never takes one: wherever the offer card shows it checks the walker on it
 * and presses "▶ Let it play", so "the save is byte for byte the same after a
 * full watch" now also says that letting every moment play writes nothing.
 * Taking a moment is scripts/playSeasonMoments.mjs.
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playSeasonCentre.mjs
 * (MSYS_NO_PATHCONV=1 under Git Bash). Green is the closing
 * "playSeasonCentre: N checks, 0 failed" line and exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4541);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const CONTROL = process.env.SEASON_CENTRE_PLAY_CONTROL ?? '';
if (CONTROL && !['static', 'write', 'label', 'count'].includes(CONTROL)) throw new Error(`unknown SEASON_CENTRE_PLAY_CONTROL ${CONTROL}`);

let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } return ok; };

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('dist/index.html is missing: run npm run build first. NOT CHECKED.'); process.exit(1); }
const ASSETS = path.join(DIST, 'assets');
const chunkWith = needle => fs.readdirSync(ASSETS).filter(f => f.endsWith('.js') && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes(needle));
const CENTRE = chunkWith('Straight to the final table');
if (CENTRE.length !== 1) { console.log(`expected one Season Centre chunk, found ${CENTRE.length}`); process.exit(1); }
const CENTRE_CHUNK = CENTRE[0];
const centreText = fs.readFileSync(path.join(ASSETS, CENTRE_CHUNK), 'utf8');
console.log(`Season Centre chunk ${CENTRE_CHUNK}, ${(centreText.length / 1024).toFixed(1)} KB raw`);

/* ─── 8. no Club Manager in the chunk ─── */
const CM_MARKERS = ['Sit deep, frustrate them, protect the point', 'oppositionShape'];
check(CM_MARKERS.every(m => !centreText.includes(m)), '8. the Season Centre chunk carries no Club Manager marker');

/* ─── the walker's own rule, read from its file's text (critic C8) ─── */
function walkerRule() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8');
  const at = src.indexOf('const ACTIONS = [');
  const end = src.indexOf('];', at);
  if (at < 0 || end < 0) throw new Error('cannot find ACTIONS in playSoccerCareer.mjs');
  const body = src.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const actions = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /'));
  if (!skipLine) throw new Error('cannot find SKIP in playSoccerCareer.mjs');
  const skip = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));
  return { actions, skip };
}
const WALK = walkerRule();
check(WALK.actions.includes('Next Season') && WALK.actions.includes('Continue') && WALK.skip.includes('Retire'), `5. parsed the walker's ACTIONS (${WALK.actions.length} entries) and SKIP from its text`);

/* ─── saves the game itself would write ─── */
const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const { soccer, season: S, core: C } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function step(s) {
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
const SAVES = {};
const derived = {};
for (let c = 0; c < 60 && Object.keys(SAVES).length < 4; c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1045);
  try {
    let s = soccer.initCareer(`Centre ${c}`, 'England', ['ST', 'CM', 'CB', 'LW'][c % 4], '2010-14', abil(70 + (c % 12)), 70 + (c % 12), 2010, CLUBS, null, 92);
    for (let g = 0; g < 600 && s && !s.retired; g += 1) {
      if (s.phase === 'playing' && s.seasons.length >= 2 && !SAVES.playing) SAVES.playing = JSON.stringify(s);
      if (s.phase === 'season_summary' && s.pendingSummary?.type === 'playing' && s.pendingSummary.apps > 0) {
        const row = s.pendingSummary;
        const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
        const d = C.deriveSeason(S.SOCCER, row, ctx);
        const derby = d && d.games.some(x => x.fixedKey && x.played);
        if (d && d.mode === 'table' && row.leagueTitle && derby && d.clinch && d.clinch.md < d.games.length - 1 && !SAVES.title) { SAVES.title = JSON.stringify(s); derived.title = d; }
        else if (d && d.mode === 'table' && !row.leagueTitle && ctx.champion && !SAVES.champion) { SAVES.champion = JSON.stringify(s); derived.champion = d; }
        else if (d && d.mode === 'results' && !SAVES.results) { SAVES.results = JSON.stringify(s); derived.results = d; }
      }
      s = step(s);
    }
  } finally { Math.random = real; }
}
console.log(`saves: ${Object.keys(SAVES).join(', ')}`);
check(['playing', 'title', 'champion', 'results'].every(k => SAVES[k]), 'the engine produced a playing save, a title season, a named champion season and a results only season');

/* ─── the served site, and what a control changes in it ─── */
let STATIC_EXTRA = '';
let CHUNK_TEXT = centreText;
if (CONTROL === 'write') {
  CHUNK_TEXT = `try{const k="soccerCareerSave";const v=JSON.parse(localStorage.getItem(k));v.centreSeen=1;localStorage.setItem(k,JSON.stringify(v));}catch(e){}\n${centreText}`;
  console.log('CONTROL write: the served chunk writes centreSeen into the save when it loads');
}
if (CONTROL === 'count') {
  /* scoreAt sums the points events put on the board (Round 1045 review: the
     clock no longer knows a goal from a touchdown) */
  const re = /(\w+)\.pts&&\1\.min<=(\w+)/g;
  const hits = centreText.match(re) ?? [];
  if (hits.length !== 1) throw new Error(`control refused: the scoreAt test appears ${hits.length} times in the chunk`);
  CHUNK_TEXT = centreText.replace(re, (m, e, t) => `${e}.pts&&${e}.min<=${t}+20`);
  console.log('CONTROL count: the served score bug reads 20 minutes ahead');
}
if (CONTROL === 'static') {
  STATIC_EXTRA = `/assets/${CENTRE_CHUNK}`;
  console.log('CONTROL static: the page imports the Season Centre chunk as it loads');
}
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

/** A context on a save, with Math.random seeded, the cookie question answered,
 *  the help seen (unless asked), the live database unreachable. */
async function open(save, { width = 1440, height = 900, reduced = false, help = true, seed = 1045 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v, s, h, extra]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('centre-harness')) {
        sessionStorage.setItem('centre-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        if (h) localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
    if (extra) document.addEventListener('DOMContentLoaded', () => { import(extra).catch(() => {}); });
  }, [save, seed, help, STATIC_EXTRA]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.route(`**/assets/${CENTRE_CHUNK}`, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: CHUNK_TEXT }));
  const page = await ctx.newPage();
  const js = [];
  const errors = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) js.push(u.split('/').pop()); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 80, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return { ctx, page, js, errors };
}
const savedString = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const reseed = (page, s) => page.evaluate(seed => {
  let t = seed >>> 0;
  Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}, s);
const clickText = async (page, text) => {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, text);
  await page.waitForTimeout(250);
  return ok;
};
const shot = async (page, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(900); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };

/* The walker's pick on this screen, and every label the Season Centre shows. */
async function walkerCheck(page, where) {
  if (CONTROL === 'label') {
    await page.evaluate(() => {
      const b = document.querySelector('[data-centre-bar] button');
      if (b) b.textContent = 'Next matchday';
    });
  }
  const r = await page.evaluate(([actions, skipSrc]) => {
    const skip = new RegExp(skipSrc);
    const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()));
    let pick = null;
    for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
    if (!pick) pick = usable[0] ?? null;
    const isNew = b => !!b && (!!b.closest('[data-season-centre]') || b.hasAttribute('data-week-by-week') || b.hasAttribute('data-watch-week-by-week'));
    const labels = [...document.querySelectorAll('[data-season-centre] button, [data-week-by-week], [data-watch-week-by-week]')].map(b => b.textContent.trim());
    const clash = labels.filter(l => actions.some(a => l.startsWith(a)));
    return { pick: pick ? pick.textContent.trim().slice(0, 40) : null, pickIsNew: isNew(pick), labels, clash };
  }, [WALK.actions, WALK.skip]);
  if (r.pickIsNew || r.clash.length) console.log(`   ${where}: pick "${r.pick}", clashes ${JSON.stringify(r.clash)}`);
  return r;
}

const allErrors = [];
let LET_PLAY = 0;
const SCREEN_LABELS = new Set();
let pickOnNew = 0, clashes = new Set();
async function walkerAt(page, where) {
  const r = await walkerCheck(page, where);
  if (r.pickIsNew) pickOnNew += 1;
  for (const c of r.clash) clashes.add(c);
  for (const l of r.labels) SCREEN_LABELS.add(l);
}
/** A moment's offer card: check the walker on it, then let it play (Round 1047). */
async function letPlay(page, where) {
  if (!(await page.$('[data-moment-offer]'))) return false;
  await walkerAt(page, `${where} moment`);
  LET_PLAY += 1;
  return clickText(page, '▶ Let it play');
}
/** Play on at Results speed until the review shows. */
async function toReview(page, where) {
  for (let i = 0; i < 140; i += 1) {
    if (await page.$('[data-review]')) return true;
    await letPlay(page, `${where} step ${i}`);
    await walkerAt(page, `${where} step ${i}`);
    await clickText(page, 'Results');
    if (!(await clickText(page, '▶ Matchday')) && !(await clickText(page, '▶ League game'))) await clickText(page, '📋 Season review');
  }
  return !!(await page.$('[data-review]'));
}

try {
  /* ─── 1, 2 and 5: the hub, the same press, a full watch ─── */
  const X = await open(SAVES.playing);
  const Y = await open(SAVES.playing);
  check(!X.js.includes(CENTRE_CHUNK), `1. the hub does not load the Season Centre (${X.js.length} scripts)`);
  const first = await X.page.evaluate(() => document.querySelector('[data-career-action-bar] button')?.textContent.trim() ?? '');
  check(first.startsWith('Next Season'), `1. the action bar's first button is still Next Season ("${first.slice(0, 20)}")`);
  const hubPick = await walkerCheck(X.page, 'hub');
  check(!hubPick.pickIsNew && (hubPick.pick ?? '').startsWith('Next Season'), `5. on the hub the walker presses "${hubPick.pick}"`);
  const before = await savedString(X.page);
  await reseed(X.page, 4242);
  await reseed(Y.page, 4242);
  await X.page.click('[data-week-by-week]');
  await clickText(Y.page, 'Next Season');
  for (let i = 0; i < 25 && ((await savedString(X.page)) === before || (await savedString(Y.page)) === before); i += 1) await X.page.waitForTimeout(200);
  const sx = await savedString(X.page);
  const sy = await savedString(Y.page);
  check(sx !== before && sx === sy, `2. 📺 Week by week writes exactly the save Next Season writes (${sx === sy ? 'equal' : 'different'}, ${sx.length} bytes)`);
  const opened = await X.page.waitForSelector('[data-season-centre]', { timeout: 20000 }).then(() => true).catch(() => false);
  check(opened && X.js.includes(CENTRE_CHUNK), '1. the Season Centre chunk loads after the press, and the overlay opens');
  await walkerAt(X.page, 'kick off');
  await clickText(X.page, '▶ Kick off');
  const reached = await toReview(X.page, 'live');
  await walkerAt(X.page, 'review');
  check(reached, '2. a full watch reaches the season review');
  await clickText(X.page, 'Back to the papers');
  await X.page.waitForTimeout(600);
  check(!(await X.page.$('[data-season-centre]')), '2. Back to the papers closes the overlay');
  const after = await savedString(X.page);
  check(after === sx, `2. the save is byte for byte the same after a full watch (${after === sx ? 'same' : 'changed'})`);
  check(LET_PLAY > 0, `2. that watch met his moments and let every one play (${LET_PLAY} offers)`);
  allErrors.push(...X.errors, ...Y.errors);
  await X.ctx.close(); await Y.ctx.close();

  /* ─── 3: the review agrees with the summary card ─── */
  async function cardFacts(page) {
    return page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Season Summary');
      const card = h ? h.closest('div.relative') : null;
      if (!card) return null;
      const tiles = {};
      for (const d of card.querySelectorAll('.grid > div')) if (d.children.length >= 2) tiles[d.children[1].textContent.trim()] = d.children[0].textContent.trim();
      const line = card.querySelector('p.text-xs.font-semibold');
      return { tiles, line: line ? line.textContent.trim() : null };
    });
  }
  for (const which of ['title', 'champion']) {
    const T = await open(SAVES[which]);
    const card = await cardFacts(T.page);
    check(!!card, `3. ${which}: the summary card shows`);
    await clickText(T.page, '📺 Watch it week by week');
    await T.page.waitForSelector('[data-kickoff]', { timeout: 20000 }).catch(() => {});
    await walkerAt(T.page, `${which} kick off`);
    await clickText(T.page, '⏭ Straight to the final table');
    await T.page.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {});
    await walkerAt(T.page, `${which} review`);
    const rv = await T.page.evaluate(() => {
      const tiles = {};
      for (const d of document.querySelectorAll('[data-review-tile]')) tiles[d.getAttribute('data-review-tile')] = d.children[0].textContent.trim();
      const top = document.querySelector('aside [data-club]');
      return {
        tiles,
        finish: document.querySelector('[data-review-finish]')?.textContent.trim() ?? null,
        champion: document.querySelector('[data-review-champion]')?.textContent.trim() ?? null,
        position: document.querySelector('aside [data-his-position]')?.textContent.trim() ?? null,
        top: top ? top.children[1].textContent.trim() : null,
      };
    });
    const cardLine = (card?.line ?? '').split(' · ')[0];
    const cardChamp = (card?.line ?? '').includes(' · ') ? card.line.split(' · ').slice(1).join(' · ') : null;
    check(rv.tiles.Apps === card?.tiles.Apps && rv.tiles.Assists === card?.tiles.Assists && (rv.tiles.Goals ?? rv.tiles['Clean sheets']) === (card?.tiles.Goals ?? card?.tiles['Clean Sheets']),
      `3. ${which}: review apps, goals and assists equal the card's (${JSON.stringify(rv.tiles)} vs ${JSON.stringify(card?.tiles)})`);
    check(!!rv.finish && rv.finish.startsWith(cardLine), `3. ${which}: the review's finish "${rv.finish}" starts with the card's "${cardLine}"`);
    const ord = (cardLine.match(/(\d+)(st|nd|rd|th)/) ?? [])[0] ?? (cardLine.startsWith('Champions') ? '1st' : null);
    check(!!rv.position && rv.position.startsWith(ord ?? '?'), `3. ${which}: the final table puts him ${rv.position}, the card ${ord}`);
    if (cardChamp) check(rv.champion === cardChamp && rv.top === cardChamp.replace(/ won it$/, ''), `3. ${which}: "${cardChamp}" on the card, "${rv.champion}" in the review, ${rv.top} top of the table`);
    else check(rv.champion === null, `3. ${which}: no champion named on the card, none in the review`);
    allErrors.push(...T.errors);
    await T.ctx.close();
  }

  /* ─── 4, 6 and the screenshots: a title season at both sizes ─── */
  const D = derived.title;
  const scoreAt = (events, minute) => {
    let us = 0, them = 0;
    for (const e of events) if (e.kind === 'goal' && e.min <= minute) { if (e.side === 'us') us += 1; else them += 1; }
    return `${us}-${them}`;
  };
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const P = await open(SAVES.title, { width: w, height: h });
    await clickText(P.page, '📺 Watch it week by week');
    await P.page.waitForSelector('[data-kickoff]', { timeout: 20000 }).catch(() => {});
    await shot(P.page, `${tag}-1-kickoff`);
    if (tag === 'desktop') {
      const cols = await P.page.evaluate(() => ['aside[aria-label="Fixtures"]', '[data-centre-stage]', 'aside[aria-label="Table"]'].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.left, w: r.width, top: r.top } : null; }));
      check(cols.every(c => c && c.w > 100) && cols[0].x < cols[1].x && cols[1].x < cols[2].x, `6. desktop: three columns side by side (${cols.map(c => c ? Math.round(c.w) : 0).join(', ')} px)`);
      const box = await P.page.evaluate(() => { const r = document.querySelector('[data-season-centre] [role="dialog"]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, scroll: document.scrollingElement.scrollHeight - window.innerHeight, y: window.scrollY }; });
      check(box.top >= 0 && box.bottom <= 900 && box.y === 0, `6. desktop: the dialog sits inside the screen (${Math.round(box.top)} to ${Math.round(box.bottom)}) and the page has not moved`);
    } else {
      const fit = await P.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, dlg: (() => { const d = document.querySelector('[data-season-centre] [role="dialog"]'); return d.scrollWidth - d.clientWidth; })(), bar: 0 }));
      check(fit.sw <= 391 && fit.dlg <= 1, `6. phone: no sideways scroll on the kick off card (${fit.sw}, ${fit.dlg})`);
    }
    await clickText(P.page, '▶ Kick off');
    if (tag === 'phone') {
      const bar = await P.page.evaluate(() => { const b = document.querySelector('[data-centre-bar]'); const r = b ? b.getBoundingClientRect() : null; return r ? { top: r.top, bottom: r.bottom, sw: document.documentElement.scrollWidth } : null; });
      check(!!bar && bar.top >= 0 && bar.bottom <= 844 && bar.sw <= 391, `6. phone: the bar sits inside the screen once the season starts (${bar ? Math.round(bar.top) + ' to ' + Math.round(bar.bottom) : 'no bar'})`);
    }
    if (await P.page.$('[data-poster]')) await clickText(P.page, '▶ Matchday 1');
    /* 4: the clock, sampled through the first match at 1x */
    const g1 = D.games[0];
    let samples = 0, wrong = 0, shotTaken = false;
    for (let i = 0; i < 260; i += 1) {
      const f = await P.page.evaluate(() => { const c = document.querySelector('[data-match-clock]'); return c ? { m: Number(c.getAttribute('data-minute')), s: c.getAttribute('data-score'), ft: !!document.querySelector('[data-full-time]') } : null; });
      if (!f) break;
      samples += 1;
      if (f.s !== scoreAt(g1.events, f.m)) wrong += 1;
      if (!shotTaken && f.m >= 35) { await shot(P.page, `${tag}-3-matchday-mid-clock`); shotTaken = true; }
      if (f.ft) break;
      await letPlay(P.page, `${tag} first match`);
      await P.page.waitForTimeout(90);
    }
    check(samples >= 20 && wrong === 0, `4. ${tag}: the score bug equals the derived goals at every sampled minute (${samples} frames, ${wrong} wrong)`);
    const y0 = await P.page.evaluate(() => window.scrollY);
    await clickText(P.page, 'Results');
    let derbyShot = false, clinchShot = false;
    const tourSaw = [];
    for (let i = 0; i < 40 && !(derbyShot && clinchShot); i += 1) {
      await letPlay(P.page, `${tag} tour ${i}`);
      const kinds = await P.page.evaluate(() => document.querySelector('[data-poster]')?.getAttribute('data-poster') ?? '');
      tourSaw.push(kinds || '.');
      if (kinds.includes('derby') && !derbyShot) { await shot(P.page, `${tag}-2-derby-day`); derbyShot = true; }
      if (kinds.includes('title') && !clinchShot) { await shot(P.page, `${tag}-4-title-clinch`); clinchShot = true; }
      await walkerAt(P.page, `${tag} tour ${i}`);
      if (kinds) { await clickText(P.page, '▶ Matchday'); continue; }
      /* Release AQ: the jump is not offered when the very next matchday is the
         big one (the Season Centre hides it: there is nothing to jump over),
         and the tour used to stop there. The title season the engine picks
         now has a derby on matchday 19 and the halfway mark on 20, so it
         stopped five matchdays in and never saw the clinch on 36. A player
         presses the next matchday; so does the tour. */
      if (!(await clickText(P.page, '⏩ To the next big game')) && !(await clickText(P.page, '▶ Matchday'))) break;
    }
    check(derbyShot && clinchShot, `the ${tag} tour reached a derby day and the title clinch`);
    if (!(derbyShot && clinchShot)) {
      const t = JSON.parse(SAVES.title).pendingSummary;
      console.log(`   the tour saw [${tourSaw.join(' | ')}]; the title season is ${t.year} ${t.club}, ${t.apps} apps (${t.leagueApps} league), saved field ${t.leagueWorld ? t.leagueWorld.league : 'none'}; derived at the pick: ${derived.title.games.length} matchdays, clinch after matchday ${derived.title.clinch?.md}, derbies on matchdays ${derived.title.games.filter(g => g.fixedKey).map(g => `${g.md}${g.played ? '' : ' (missed)'}`).join(', ')}`);
    }
    const y1 = await P.page.evaluate(() => window.scrollY);
    check(y0 === y1, `6. ${tag}: the page did not move across the matchdays (${y0} then ${y1})`);
    await clickText(P.page, '⏭ Sim the rest');
    await P.page.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {});
    await shot(P.page, `${tag}-5-review`);
    allErrors.push(...P.errors);
    await P.ctx.close();
  }

  /* ─── 6: Next Season keeps its width on a phone ─── */
  const Ph = await open(SAVES.playing, { width: 390, height: 844 });
  const widths = await Ph.page.evaluate(() => {
    const next = [...document.querySelectorAll('[data-career-action-bar] button')].find(b => b.textContent.trim().startsWith('Next Season'));
    const tv = document.querySelector('[data-week-by-week]');
    const withTv = next.getBoundingClientRect().width;
    tv.style.display = 'none';
    const without = next.getBoundingClientRect().width;
    tv.style.display = '';
    return { withTv, without, tv: tv.getBoundingClientRect().width, sw: document.documentElement.scrollWidth };
  });
  check(widths.withTv >= widths.without - 52 && widths.sw <= 391, `6. phone: Next Season ${Math.round(widths.withTv)} px beside 📺 (${Math.round(widths.tv)} px), ${Math.round(widths.without)} px without it`);
  allErrors.push(...Ph.errors);
  await Ph.ctx.close();

  /* ─── 7: reduced motion, and the help sheet opening by itself ─── */
  const R = await open(SAVES.title, { reduced: true, help: false });
  await clickText(R.page, '📺 Watch it week by week');
  await R.page.waitForSelector('[data-season-help]', { timeout: 20000 }).catch(() => {});
  check(!!(await R.page.$('[data-season-help]')), 'the "?" sheet opens by itself the first time');
  await clickText(R.page, 'Got it');
  const running = () => R.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-season-centre]')).length);
  await R.page.waitForTimeout(100);
  const k0 = await running();
  await clickText(R.page, '▶ Kick off');
  if (await R.page.$('[data-poster]')) { await R.page.waitForTimeout(100); await clickText(R.page, '▶ Matchday 1'); }
  await letPlay(R.page, 'reduced motion');
  const firstFrame = await R.page.evaluate(() => !!document.querySelector('[data-full-time]'));
  await R.page.waitForTimeout(100);
  const k1 = await running();
  await clickText(R.page, '⏭ Sim the rest');
  await R.page.waitForTimeout(100);
  const k2 = await running();
  check(firstFrame, '7. reduced motion: the first frame of a match is full time');
  check(k0 + k1 + k2 === 0, `7. reduced motion: nothing animating 100 ms after each arrival (${k0}, ${k1}, ${k2})`);
  await clickText(R.page, '?');
  check(!!(await R.page.$('[data-season-help]')), 'the "?" button opens the sheet again');
  allErrors.push(...R.errors);
  await R.ctx.close();

  /* ─── 5: the walker, over every screen walked ─── */
  check(pickOnNew === 0, `5. the walker's pick never landed on a new button (${pickOnNew})`);
  check(clashes.size === 0, `5. no Season Centre label starts with a walker ACTIONS entry (${SCREEN_LABELS.size} labels seen${clashes.size ? `; clashes ${[...clashes].join(', ')}` : ''})`);
  check(allErrors.length === 0, `no page errors (${allErrors.length}${allErrors.length ? `: ${allErrors[0]}` : ''})`);
} catch (e) {
  failed += 1;
  console.log(`FAIL the walk threw: ${String(e).slice(0, 300)}`);
}
await browser.close();
console.log(`screenshots in ${path.relative(ROOT, SHOTS)}`);
console.log(`playSeasonCentre: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
stop(failed ? 1 : 0);
