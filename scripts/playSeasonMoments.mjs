/**
 * Round 1047: a Season Centre moment taken end to end in a real browser
 * (DESIGN 1045 section 9.8). ENGINES=chromium, served the way the live host
 * serves (scripts/lib/hostLikeServer.mjs), saves made by the real engine in
 * node and handed to the page through localStorage, the live database blocked.
 *
 * Four walks, each on its own save and its own board: desktop 1440 by 900 and
 * phone 390 by 844, reduced motion off and on (wall shot, tackle, through
 * ball, glove save). Each walk checks, against the same modules run in node:
 *
 *  1. Lazy: the hub loads neither the training ground nor a drill board; the
 *     board's code is requested only after "Take it yourself".
 *  2. The offer: the kick off card lists the season's moments, the clock holds
 *     a beat before the minute, the badge is the planner's mode, and reading
 *     the offer has written nothing.
 *  3. Used first: the save holds [matchday, moment, -1] the moment the board
 *     is on screen, before any input.
 *  4. One round: the board reports once; the stars on the verdict card are the
 *     stars in the save; the saved entry replays in node (settleMoment) to the
 *     same result.
 *  5. The match follows: the score at full time is the node side
 *     applyDecisions' score for that game, and a YOUR CALL played against the
 *     record really changed the match (walk A forces it with a deliberate
 *     miss) while the review's finish line carries the plan's points.
 *  6. The bank: at the review the save is byte for byte the pure functions'
 *     output (ledgerPut, then applySeasonMomentsBank) on the loaded save.
 *  7. Once: after a reload the moment is not offered again and the season
 *     shows the decided score; an attempt opened and left (walk B reloads on
 *     the board) is a miss.
 *  8. Fit and stillness: both buttons on the offer are 44 pixels tall, no
 *     sideways scroll with the board open, the board
 *     inside the screen's width, the page does not scroll.
 *  9. Walker safety: no label on the offer, the board or the verdict starts
 *     with an entry of playSoccerCareer's ACTIONS.
 * 10. One go, and the keyboard: while a moment is on the stage (offer, board,
 *     verdict) the phone draws no Fixtures button, so nothing can take the
 *     stage from a board and hand its offer back; the button returns once
 *     the moment is done. The focus is inside the Season Centre on the
 *     offer, the board and the verdict, and Escape on the board closes the
 *     Centre with the go still used (walk B).
 * 11. Leaving early (walk E, the phone's glove save again): stepping out
 *     with moments still to play banks nothing and leaves the way back in;
 *     Continue on the season summary banks the stars as closeSeasonMoments
 *     does in node, against the moments on offer, and the career moves on.
 *
 * Controls (SEASON_MOMENTS_PLAY_CONTROL=), applied to what is SERVED (the
 * built files are never written; each refuses to run unless its needle is in
 * the chunk exactly once):
 *   used   the "used" entry is not written when the board opens  -> 3 red
 *   label  "Let it play" is served as "Next chance"              -> 9 red
 *   fixtures  the phone draws Fixtures while a moment is hosted  -> 10 red
 * A walk whose save has no entry after the board reported (the used control)
 * fails its own check and the walks after it still run.
 *
 * Measured 2026-10-07 on the build of 7e573b8a: 69 checks, 0 failed. Walk A
 * (desktop, wall shot) missed a YOUR CALL the record had as a goal and the
 * match changed; walk B (desktop, reduced motion, tackle) left the board and
 * came back to a miss; walk C (phone, through ball) made a YOUR CALL the
 * record had as a miss, with a real pointer on the real clock; walk D (phone,
 * reduced motion, glove save) made a RECREATE for two stars. Every banked
 * save was byte for byte the pure functions' output. Controls, each exit 1:
 * used fails 3 (the entry read [md, 0, -2]) and with it 7; label fails 9
 * only ("Next chance").
 *
 * Measured again 2026-10-07 after the review, on the build of the branch
 * with origin/main and release-al-int merged: 117 checks, 0
 * failed, five walks (walk E leaves early on the phone and banks at
 * Continue: "2 of 9 stars. No gains this time", phase ballon_dor). The
 * first run after the checks of 10 were written failed 6 of them (the
 * focus fell to BODY with the board open, in every walk), which is how the
 * moment host's cards came to be keyed. The phone's first screenshots showed
 * the offer's two buttons about 20 pixels tall (flex-1 in a column), now 44
 * on every walk (check 8). Controls, each exit 1 with all five
 * walks run: used fails 3 in every walk and 7, 6 and 10 in walk B; fixtures
 * fails 10 on the three phone walks only; label fails 9 only.
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playSeasonMoments.mjs
 * (MSYS_NO_PATHCONV=1 under Git Bash). Green is the closing
 * "playSeasonMoments: N checks, 0 failed" line and exit 0.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4547);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots-moments');
const CONTROL = process.env.SEASON_MOMENTS_PLAY_CONTROL ?? '';
if (CONTROL && !['used', 'label', 'fixtures'].includes(CONTROL)) throw new Error(`unknown SEASON_MOMENTS_PLAY_CONTROL ${CONTROL}`);

let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } return ok; };

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('dist/index.html is missing: run npm run build first. NOT CHECKED.'); process.exit(1); }
const ASSETS = path.join(DIST, 'assets');
const chunkWith = needle => fs.readdirSync(ASSETS).filter(f => f.endsWith('.js') && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes(needle));
const one = (needle, what) => { const c = chunkWith(needle); if (c.length !== 1) { console.log(`expected one ${what} chunk, found ${c.length}`); process.exit(1); } return c[0]; };
const CENTRE_CHUNK = one('Straight to the final table', 'Season Centre');
const DRILL_CHUNK = one('Go in at the marker', 'drill board');
const THROUGH_CHUNK = one('Read his run, then weight it into his path', 'through ball board');
const PANEL_CHUNK = one('tap the track as fast as you can', 'training ground');
const centreText = fs.readFileSync(path.join(ASSETS, CENTRE_CHUNK), 'utf8');
console.log(`chunks: centre ${CENTRE_CHUNK}, drill board ${DRILL_CHUNK}, through ball ${THROUGH_CHUNK}, training ground ${PANEL_CHUNK}`);

let CHUNK_TEXT = centreText;
const swapOnce = (from, to) => { const n = CHUNK_TEXT.split(from).length - 1; if (n !== 1) throw new Error(`control refused: ${JSON.stringify(from)} appears ${n} times in the chunk`); CHUNK_TEXT = CHUNK_TEXT.replace(from, to); };
if (CONTROL === 'used') { swapOnce(',-1,[])', ',-2,[])'); console.log('CONTROL used: opening the board writes an entry no reader accepts, so the attempt is not used'); }
if (CONTROL === 'label') { swapOnce('children:"▶ Let it play"', 'children:"Next chance"'); console.log('CONTROL label: "Let it play" is served as "Next chance"'); }
if (CONTROL === 'fixtures') {
  /* the guard in front of the phone's Fixtures button, whatever the minifier named the hosting state */
  const guard = /[\w$]+===null&&([\w$]+\.jsx\("button",\{type:"button",onClick:\(\)=>[\w$]+\(!0\),className:"[^"]*","data-centre-fixtures":!0)/g;
  const n = (CHUNK_TEXT.match(guard) ?? []).length;
  if (n !== 1) throw new Error(`control refused: the Fixtures guard appears ${n} times in the chunk`);
  CHUNK_TEXT = CHUNK_TEXT.replace(guard, '$1');
  console.log('CONTROL fixtures: the phone draws its Fixtures button while a moment is on the stage');
}

/* the walker's ACTIONS, read from its file's text (it runs on import) */
function walkerActions() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8');
  const at = src.indexOf('const ACTIONS = [');
  const end = src.indexOf('];', at);
  if (at < 0 || end < 0) throw new Error('cannot find ACTIONS in playSoccerCareer.mjs');
  const body = src.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
}
const ACTIONS = walkerActions();
check(ACTIONS.includes('Next') && ACTIONS.includes('Continue'), `9. parsed the walker's ACTIONS (${ACTIONS.length} entries)`);

/* ─── the same modules in node ─── */
const B = await bundleAwardsNight(ROOT, { extra: {
  season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', moments: 'src/lib/season/soccerMoments.ts',
  ledger: 'src/lib/season/momentsSave.ts', drills: 'src/lib/careerDrills.ts', through: 'src/lib/throughBallDrill.ts',
} });
const { soccer, season: S, core: C, moments: M, ledger: L, drills: D, through: T } = B;
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

/* ─── saves the game itself would write, one per board ─── */
const WANT = {
  /* walk A forces a YOUR CALL against the record: his goal, deliberately missed */
  A: { pos: 'ST', pick: m => m.kind === 'finish' && m.mode === 'call' && m.planSuccess },
  B: { pos: 'CB', pick: m => m.kind === 'tackle' },
  C: { pos: 'CM', pick: m => m.kind === 'pass' },
  D: { pos: 'GK', pick: m => m.kind === 'save' },
};
const SAVES = {};
for (let c = 0; c < 240 && Object.keys(SAVES).length < 4; c += 1) {
  const tag = ['A', 'B', 'C', 'D'][c % 4];
  if (SAVES[tag]) continue;
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1047);
  try {
    let s = soccer.initCareer(`Moment ${c}`, 'England', WANT[tag].pos, '2010-14', abil(70 + (c % 12)), 70 + (c % 12), 2010, CLUBS, null, 92);
    for (let g = 0; g < 400 && s && !s.retired && !SAVES[tag]; g += 1) {
      if (s.phase === 'season_summary' && s.pendingSummary?.type === 'playing' && s.pendingSummary.apps > 0) {
        const row = s.pendingSummary;
        const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
        const plan = C.deriveSeason(S.SOCCER, row, ctx);
        const key = S.soccerSeasonKey(s.playerName, row);
        const latest = s.seasons[s.seasons.length - 1];
        if (plan && key && latest && S.soccerSeasonKey(s.playerName, latest) === key) {
          const moments = C.planMoments(S.SOCCER, row, ctx, plan);
          /* the first moment of the season is the one the walk takes */
          if (moments.length >= 2 && WANT[tag].pick(moments[0]) && moments[0].md >= 2) SAVES[tag] = { save: JSON.stringify(s), row, ctx, plan, key, moments, pos: WANT[tag].pos };
        }
      }
      s = step(s);
    }
  } finally { Math.random = real; }
}
console.log(`saves: ${Object.keys(SAVES).sort().map(t => `${t} ${SAVES[t].pos} ${SAVES[t].plan.mode} moments ${SAVES[t].moments.map(m => `md${m.md} ${m.kind} ${m.mode}`).join(', ')}`).join(' | ')}`);
check(['A', 'B', 'C', 'D'].every(t => SAVES[t]), 'the engine produced a season for each board whose first moment is the wanted kind');

/* ─── the served site ─── */
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
/* on a busy machine the local server can take seconds to listen: ask it until it answers */
let up = false;
for (let i = 0; i < 60 && !up; i += 1) {
  await new Promise(r => setTimeout(r, 500));
  up = await new Promise(done => { const q = http.get(`${BASE}/`, res => { res.resume(); done(true); }); q.on('error', () => done(false)); q.setTimeout(2000, () => { q.destroy(); done(false); }); });
}
if (!up) { console.log('the local server never answered. NOT CHECKED.'); try { server.kill(); } catch { /* gone */ } process.exit(1); }
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

async function open(save, { width, height, reduced }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v]) => {
    let t = 1047;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('moments-harness')) {
        sessionStorage.setItem('moments-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, [save]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.route(`**/assets/${CENTRE_CHUNK}`, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: CHUNK_TEXT }));
  const page = await ctx.newPage();
  const js = [];
  const errors = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) js.push(u.split('/').pop()); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  const load = async () => {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 80, { timeout: 40000 }).catch(() => {});
    await page.waitForSelector('[data-watch-week-by-week]', { timeout: 30000 }).catch(() => {});
  };
  await load();
  return { ctx, page, js, errors, load };
}
const savedString = page => page.evaluate(() => localStorage.getItem('soccerCareerSave') ?? '');
const clickText = async (page, text) => {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, text);
  await page.waitForTimeout(200);
  return ok;
};
const shot = async (page, name) => { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
/** Labels inside the overlay that the walker would take for one of its own. */
const clashes = page => page.evaluate(actions => [...document.querySelectorAll('[data-season-centre] button')].map(b => b.textContent.trim()).filter(l => l && actions.some(a => l.startsWith(a))), ACTIONS);
const boxOf = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; }, sel);

/** Where the keyboard is, and whether the phone's Fixtures button is on screen. */
const hostState = page => page.evaluate(() => {
  const dialog = document.querySelector('[data-season-centre] [role="dialog"]');
  const a = document.activeElement;
  const fx = document.querySelector('[data-centre-fixtures]');
  return { focusInside: !!dialog && !!a && dialog.contains(a), focus: a ? a.tagName : 'nothing', fixtures: !!fx && fx.getClientRects().length > 0 };
});

/** Open the Season Centre from the summary card and return the kick off line. */
async function openCentre(page) {
  await page.click('[data-watch-week-by-week]');
  await page.waitForSelector('[data-kickoff]', { timeout: 30000 }).catch(() => {});
  return page.evaluate(() => document.querySelector('[data-kickoff-moments]')?.textContent ?? '');
}
/** Walk at Results speed to the next moment's offer card (or the review). */
async function toOffer(page) {
  await clickText(page, '▶ Kick off');
  for (let i = 0; i < 150; i += 1) {
    if (await page.$('[data-moment-offer]')) return true;
    if (await page.$('[data-review]')) return false;
    await clickText(page, 'Results');
    if (!(await clickText(page, '▶ Matchday')) && !(await clickText(page, '▶ League game'))) await clickText(page, '📋 Season review');
  }
  return false;
}

/* ─── playing a board with a real pointer ─── */
const sleepUntil = async (page, t0, seconds) => { const left = t0 + seconds * 1000 - Date.now(); if (left > 0) await page.waitForTimeout(left); };

/** Play the moment's round. `how` is 'miss' (a deliberate one) or 'skilled' (the best input a careful player has). */
async function playBoard(page, board, setup, how) {
  if (board === 'throughball') {
    await page.waitForSelector('[data-through-match]', { timeout: 20000 });
    const box = await boxOf(page, '[data-through-ball-board] svg[role="img"]');
    await page.click('[data-through-action]');
    const t0 = Date.now();
    if (how === 'miss') return; /* nobody plays it: the board settles it as offside at the deadline */
    const p = T.perfectThroughBall(setup);
    const spot = T.passTarget(p.angle, p.weight);
    const x = box.left + (spot.x / 360) * box.width, y = box.top + (spot.y / 240) * box.height;
    await page.mouse.move(x, y);
    await sleepUntil(page, t0, p.press);
    await page.mouse.down();
    await page.mouse.up();
    return;
  }
  await page.waitForSelector('[data-drill-match]', { timeout: 20000 });
  const box = await boxOf(page, '[data-drill-board]');
  const vx = v => box.left + (v / 360) * box.width, vy = v => box.top + (v / 210) * box.height;
  await clickText(page, 'Start');
  const t0 = Date.now();
  if (board === 'wallshot') {
    if (how === 'miss') {
      /* the lowest power never has the legs, whatever the wall and the keeper do */
      for (let i = 0; i < 8; i += 1) await page.keyboard.press('s');
      await clickText(page, 'Shoot now');
      return;
    }
    const [gx, gy, , press] = M.textbookStrike(setup);
    await sleepUntil(page, t0, press);
    await page.mouse.click(vx(60 + ((gx + 1) / 2) * 240), vy(150 - gy * 116));
    return;
  }
  if (board === 'tackle') {
    if (how === 'miss') return; /* he runs off the far side */
    const t = D.tackleNextLoose(setup, 0.15);
    const b = D.tackleBallAt(setup, t);
    await page.mouse.move(vx(b.x * 360), vy(b.y * 210));
    await sleepUntil(page, t0, t);
    await page.mouse.down();
    await page.mouse.up();
    return;
  }
  if (how === 'miss') return; /* the ball crosses the line with the gloves at his chest */
  const dx = setup.target.x - D.GLOVE_ORIGIN.x, dy = setup.target.y - D.GLOVE_ORIGIN.y;
  const reach = Math.min(1, Math.hypot(dx, dy) / D.GLOVE_MAX_REACH);
  const pxPerM = (240 / (2 * D.GLOVE_HALF_WIDTH)) * (box.width / 360), pyPerM = (116 / D.GLOVE_HEIGHT) * (box.height / 210);
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx * pxPerM, cy - dy * pyPerM, { steps: 4 });
  await sleepUntil(page, t0, Math.max(0.1, D.gloveDeadline(setup) - D.diveTime(reach) - 0.02));
  await page.mouse.up();
}

const allErrors = [];
const outcomes = [];
async function walk(tag, view, how, { leaveOnBoard = false, leaveEarly = false, save = tag } = {}) {
  const W = SAVES[save];
  const m = W.moments[0];
  const board = M.MOMENT_BOARD[m.kind];
  const setup = M.momentSetup(board, M.momentSeed(W.key, m.md, m.id), M.momentRound(m.stakes));
  const rng = () => M.momentShotRng(W.key, m.md, m.id, board === 'wallshot' ? setup : undefined);
  const name = `${tag} ${view.width === 390 ? 'phone' : 'desktop'}${view.reduced ? ' reduced' : ''} ${board}`;
  const P = await open(W.save, view);
  const loaded = await savedString(P.page);
  check(![DRILL_CHUNK, THROUGH_CHUNK, PANEL_CHUNK].some(c => P.js.includes(c)), `1. ${name}: the page loads no training ground and no drill board (${P.js.length} scripts)`);
  const kick = await openCentre(P.page);
  /* read with the overlay open: Playwright's own click scrolls the summary card's button into view first */
  const y0 = await P.page.evaluate(() => window.scrollY);
  const want = M.momentsKickoffLine(W.moments.map(x => x.md), W.plan.mode === 'table' ? 'matchday' : 'league game');
  check(kick.includes(want), `2. ${name}: the kick off card lists the moments ("${kick.slice(0, 80)}")`);
  const offered = await toOffer(P.page);
  const offer = await P.page.evaluate(() => ({
    badge: document.querySelector('[data-moment-badge]')?.textContent ?? '', held: document.querySelector('[data-match-clock]')?.getAttribute('data-held') ?? '',
    minute: Number(document.querySelector('[data-match-clock]')?.getAttribute('data-minute') ?? -1), md: Number(document.querySelector('[data-matchday]')?.getAttribute('data-matchday') ?? 0),
    bar: !!document.querySelector('[data-centre-bar]'), how: document.querySelector('[data-moment-how]')?.textContent ?? '',
    /* layout heights (a transform in flight does not move them) */
    takeH: document.querySelector('[data-moment-take]')?.offsetHeight ?? 0, passH: document.querySelector('[data-moment-pass]')?.offsetHeight ?? 0,
  }));
  check(offer.takeH >= 44 && offer.passH >= 44, `8. ${name}: both buttons on the offer are full touch targets (${offer.takeH} and ${offer.passH} pixels tall, 44 wanted)`);
  const offerState = await hostState(P.page);
  check(offer.how === `How it plays: ${M.MOMENT_HOW[board]}` && offerState.focusInside, `2. ${name}: the offer says how the board is played before the go is used, and holds the focus ("${offer.how.slice(0, 50)}", on ${offerState.focus})`);
  check(offered && offer.md === m.md && offer.badge === (m.mode === 'call' ? 'YOUR CALL' : 'RECREATE'), `2. ${name}: matchday ${m.md} stops for a ${m.mode} (${offer.badge} on matchday ${offer.md})`);
  check(offer.held === 'true' && offer.minute === Math.max(0, m.minute - 1) && !offer.bar, `2. ${name}: the clock holds a beat before minute ${m.minute} (${offer.minute}) and the bar steps aside`);
  check((await savedString(P.page)) === loaded, `2. ${name}: reading the offer wrote nothing`);
  const bad1 = await clashes(P.page);
  await shot(P.page, `${tag}-1-offer`);
  await P.page.click('[data-moment-take]');
  await P.page.waitForSelector('[data-moment-board]', { timeout: 20000 }).catch(() => {});
  await P.page.waitForSelector('[data-soccer-moment-board] svg', { timeout: 20000 }).catch(() => {});
  const used = JSON.parse(await savedString(P.page)).seasonMoments;
  check(!!used && used.key === W.key && JSON.stringify(used.m) === JSON.stringify([[m.md, m.id, -1]]), `3. ${name}: the attempt is used before any input (${JSON.stringify(used?.m ?? null)})`);
  check(P.js.includes(board === 'throughball' ? THROUGH_CHUNK : DRILL_CHUNK), `1. ${name}: the board's code arrived after the press`);
  const fit = await P.page.evaluate(() => { const b = document.querySelector('[data-soccer-moment-board]'); const r = b ? b.getBoundingClientRect() : null; return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, left: r ? r.left : -1, right: r ? r.right : 99999, y: window.scrollY }; });
  check(fit.sw <= fit.iw + 1 && fit.left >= -1 && fit.right <= fit.iw + 1 && fit.y === y0, `8. ${name}: the board fits (${Math.round(fit.left)} to ${Math.round(fit.right)} of ${fit.iw}, page ${fit.sw} wide) and the page did not move (${y0} then ${fit.y})`);
  const bad2 = await clashes(P.page);
  await shot(P.page, `${tag}-2-board`);
  /* 10: the keyboard stays inside the Season Centre while the board is up
     (the pressed button is gone), and on a phone the fixtures cannot take the
     stage away from a moment: there is no way off a board and back to its offer */
  const onBoard = await hostState(P.page);
  check(onBoard.focusInside, `10. ${name}: with the board open the focus is inside the Season Centre (on ${onBoard.focus})`);
  check(!onBoard.fixtures && !offerState.fixtures, `10. ${name}: no Fixtures button while a moment is on the stage (offer ${offerState.fixtures}, board ${onBoard.fixtures})`);
  if (leaveOnBoard) {
    /* 10: Escape leaves the Season Centre from the board, and the go stays used */
    await P.page.keyboard.press('Escape');
    await P.page.waitForTimeout(300);
    const gone = await P.page.evaluate(() => !document.querySelector('[data-season-centre]'));
    const kept = JSON.parse(await savedString(P.page)).seasonMoments?.m ?? null;
    check(gone && JSON.stringify(kept) === JSON.stringify([[m.md, m.id, -1]]), `10. ${name}: Escape on the board closes the Season Centre and the go stays used (closed ${gone}, ${JSON.stringify(kept)})`);
    /* 7: opened and left */
    await P.load();
    const again = await openCentre(P.page);
    const rest = M.momentsKickoffLine(W.moments.slice(1).map(x => x.md), W.plan.mode === 'table' ? 'matchday' : 'league game');
    check(again.includes(rest) && !again.includes(want), `7. ${name}: after a reload on the board the moment is not offered again ("${again.slice(0, 70)}")`);
    const entries = JSON.parse(await savedString(P.page)).seasonMoments?.m ?? [];
    const season = C.applyDecisions(S.SOCCER, W.row, W.ctx, W.plan, W.moments, entries);
    const g = season.games[m.md - 1];
    await clickText(P.page, '⏭ Straight to');
    await P.page.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
    const pill = await P.page.evaluate(md => [...document.querySelectorAll('[data-fixtures] li')].find(li => li.firstElementChild?.textContent.trim() === String(md))?.textContent ?? '', m.md);
    check(pill.includes(`${g.us}-${g.them}`), `7. ${name}: an attempt opened and left is a miss, and matchday ${m.md} shows ${g.us}-${g.them} ("${pill.slice(-12)}")`);
    const banked = JSON.parse(await savedString(P.page)).seasonMoments;
    check(banked?.banked === 1 && banked?.m?.[0]?.[2] === -1, `6. ${name}: the left attempt banks as a miss at the review`);
    outcomes.push(`${name}: left on the board`);
    allErrors.push(...P.errors);
    await P.ctx.close();
    return bad1.concat(bad2);
  }
  await playBoard(P.page, board, setup, how);
  await P.page.waitForSelector('[data-moment-verdict]', { timeout: 25000 }).catch(() => {});
  await P.page.waitForTimeout(view.reduced ? 100 : 1500);
  const seen = await P.page.evaluate(() => ({ verdict: document.querySelector('[data-moment-verdict]')?.getAttribute('data-moment-verdict') ?? '', stars: Number(document.querySelector('[data-moment-stars]')?.getAttribute('data-moment-stars') ?? 0), after: document.querySelector('[data-moment-after]')?.textContent ?? '', running: document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target?.closest?.('[data-moment-verdict]')).length }));
  const entry = JSON.parse(await savedString(P.page)).seasonMoments?.m?.[0];
  /* a save with no entry here (the `used` control) fails this walk and lets the next ones run */
  if (!check(Array.isArray(entry), `4. ${name}: the save holds the moment's entry once the board has reported (${JSON.stringify(entry ?? null)})`)) {
    allErrors.push(...P.errors);
    await P.ctx.close();
    return bad1.concat(bad2);
  }
  const atVerdict = await hostState(P.page);
  check(!atVerdict.fixtures && atVerdict.focusInside, `10. ${name}: on the verdict card there is still no Fixtures button and the focus is inside (${atVerdict.fixtures}, on ${atVerdict.focus})`);
  const replay = M.settleMoment(board, setup, entry.slice(3), rng());
  check(seen.verdict === (entry[2] >= 1 ? 'made' : 'missed') && seen.stars === Math.max(0, entry[2]), `4. ${name}: the verdict card shows the saved result (${seen.verdict}, ${seen.stars} stars, entry ${JSON.stringify(entry)})`);
  check(replay.stars === entry[2] && replay.won === (entry[2] >= 1), `4. ${name}: the saved entry replays in node to the same result (${replay.stars} stars, "${replay.verdict}")`);
  if (how === 'miss') check(entry[2] === 0, `4. ${name}: the deliberate miss is a miss`);
  if (view.reduced) check(seen.running === 0, `8. ${name}: reduced motion, nothing animating on the verdict (${seen.running})`);
  const bad3 = await clashes(P.page);
  await shot(P.page, `${tag}-3-verdict`);
  outcomes.push(`${name}: ${seen.verdict} with ${seen.stars} stars (${m.mode}, the record had ${m.planSuccess ? 'a make' : 'a miss'})`);
  const entries = [entry];
  const season = C.applyDecisions(S.SOCCER, W.row, W.ctx, W.plan, W.moments, entries);
  const g = season.games[m.md - 1], g0 = W.plan.games[m.md - 1];
  const flipped = m.mode === 'call' && (entry[2] >= 1) !== m.planSuccess;
  if (tag === 'A') check(flipped && (g.us !== g0.us || g.them !== g0.them), `5. ${name}: a YOUR CALL played against the record changes the match (${g0.us}-${g0.them} on the record, ${g.us}-${g.them} now)`);
  check(flipped ? seen.after.includes(`${W.plan.mode === 'table' ? 'matchday' : 'league game'} ${m.mirrorMd}`) : !seen.after.includes('return game'), `5. ${name}: the card says what it means for the season ("${seen.after.slice(0, 60)}")`);
  await P.page.click('[data-moment-back]');
  await P.page.waitForSelector('[data-full-time]', { timeout: 15000 }).catch(() => {});
  const score = await P.page.evaluate(() => document.querySelector('[data-match-clock]')?.getAttribute('data-score') ?? '');
  check(score === `${g.us}-${g.them}`, `5. ${name}: full time reads ${score}, the decided match is ${g.us}-${g.them}`);
  if (view.width === 390) check((await hostState(P.page)).fixtures, `10. ${name}: the Fixtures button is back once the moment is done`);
  if (leaveEarly) {
    /* 11: stepping out with moments still to play keeps them open; moving on
       from the summary banks what was earned, against the moments on offer */
    await P.page.click('[data-centre-exit]');
    await P.page.waitForTimeout(300);
    const out = JSON.parse(await savedString(P.page));
    const backIn = (await P.page.$('[data-watch-week-by-week]')) !== null;
    check(out.phase === 'season_summary' && !!out.seasonMoments && out.seasonMoments.banked === undefined && backIn, `11. ${name}: stepping out early banks nothing and the way back in is still there (phase ${out.phase}, banked ${out.seasonMoments?.banked}, button ${backIn})`);
    let led = L.ledgerPut(undefined, W.key, m.md, m.id, -1, []);
    led = L.ledgerPut(led, W.key, m.md, m.id, entry[2], entry.slice(3));
    const closed = M.closeSeasonMoments({ ...JSON.parse(loaded), seasonMoments: led }, CLUBS);
    const line = closed.events[closed.events.length - 1];
    await clickText(P.page, 'Continue');
    await P.page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || '{}').phase !== 'season_summary'; } catch { return false; } }, null, { timeout: 20000 }).catch(() => {});
    const moved = JSON.parse(await savedString(P.page));
    check(moved.phase !== 'season_summary' && JSON.stringify(moved.seasonMoments) === JSON.stringify(closed.seasonMoments) && closed.seasonMoments.banked === 1,
      `11. ${name}: Continue on the summary banks the season's stars as the pure function does (phase ${moved.phase}, ledger ${JSON.stringify(moved.seasonMoments).slice(0, 90)})`);
    check(line.startsWith('🎯 Season Centre moments:') && line.includes(`of ${W.moments.length * 3} stars`) && (moved.events ?? []).includes(line), `11. ${name}: the bank's line is in his events, against the ${W.moments.length} moments on offer ("${line.slice(0, 70)}")`);
    outcomes.push(`${name}: left early, banked at Continue`);
    allErrors.push(...P.errors);
    await P.ctx.close();
    return bad1.concat(bad2, bad3);
  }
  await clickText(P.page, '⏭ Sim the rest');
  await P.page.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  const review = await P.page.evaluate(() => ({ finish: document.querySelector('[data-review-finish]')?.textContent ?? '', moments: [...document.querySelectorAll('[data-review-moments]')].map(x => x.textContent).join(' | ') }));
  if (W.plan.mode === 'table') {
    const pts = C.tableAt(W.plan, W.plan.games.length).find(r => r.slot === 0).pts;
    check(review.finish.includes(`${pts} pts`), `5. ${name}: the review's finish line carries the plan's ${pts} points ("${review.finish.slice(0, 70)}")`);
  }
  check(review.moments.includes(`${Math.max(0, entry[2])} of ${W.moments.length * 3} stars`), `6. ${name}: the review counts the stars ("${review.moments.slice(0, 90)}")`);
  const start = JSON.parse(loaded);
  let led = L.ledgerPut(undefined, W.key, m.md, m.id, -1, []);
  led = L.ledgerPut(led, W.key, m.md, m.id, entry[2], entry.slice(3));
  const expected = JSON.stringify(M.applySeasonMomentsBank({ ...start, seasonMoments: led }, W.moments.length));
  const got = await savedString(P.page);
  check(got === expected, `6. ${name}: the banked save is byte for byte the pure functions' output (${got === expected ? 'equal' : `differs, ${got.length} against ${expected.length} bytes`})`);
  await shot(P.page, `${tag}-4-review`);
  /* 7: once */
  await P.load();
  const again = await openCentre(P.page);
  check(!again.includes(want), `7. ${name}: after a reload the taken moment is not offered again ("${again.slice(0, 70)}")`);
  await clickText(P.page, '⏭ Straight to');
  await P.page.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
  const pill = await P.page.evaluate(md => [...document.querySelectorAll('[data-fixtures] li')].find(li => li.firstElementChild?.textContent.trim() === String(md))?.textContent ?? '', m.md);
  check(pill.includes(`${g.us}-${g.them}`) && (await savedString(P.page)) === expected, `7. ${name}: the reloaded season shows the decided ${g.us}-${g.them} and banks nothing twice`);
  allErrors.push(...P.errors);
  await P.ctx.close();
  return bad1.concat(bad2, bad3);
}

try {
  const DESK = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844 };
  const bad = [];
  bad.push(...await walk('A', { ...DESK, reduced: false }, 'miss'));
  bad.push(...await walk('B', { ...DESK, reduced: true }, 'skilled', { leaveOnBoard: true }));
  bad.push(...await walk('C', { ...PHONE, reduced: false }, 'skilled'));
  bad.push(...await walk('D', { ...PHONE, reduced: true }, 'skilled'));
  bad.push(...await walk('E', { ...PHONE, reduced: true }, 'skilled', { leaveEarly: true, save: 'D' }));
  check(bad.length === 0, `9. no label on the offer, the board or the verdict starts with a walker action (${JSON.stringify([...new Set(bad)])})`);
  check(allErrors.length === 0, `no page error on any walk (${allErrors.slice(0, 2).join(' | ')})`);
  console.log(`outcomes: ${outcomes.join('; ')}`);
} catch (e) {
  failed += 1;
  console.log(`FAIL the harness threw: ${String(e && e.stack ? e.stack : e).slice(0, 600)}`);
}
await browser.close();
console.log(`playSeasonMoments: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
stop(failed ? 1 : 0);
