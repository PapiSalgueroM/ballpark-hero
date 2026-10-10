/**
 * Round 1101: Club Manager's live match in a real browser, on the built site.
 *
 * What it proves, each from what the page actually draws:
 *   1. THE GOAL IN ORDER. Sampled every frame around a real goal of a real match: the score text never
 *      changes while the pitch reads plant or flight, the first frame with the new score is a frame in
 *      phase net with a net marked as hit, the scorer card sits inside the pitch, and a tap on it ends
 *      the hold.
 *   2. REDUCED MOTION. With the device asking for less motion, nothing under the pitch or the card is
 *      animating at three instants (one of them inside a goal), and the score and the card still arrive.
 *   3. THE FIT, at 320 by 568, 390 by 844, 768 by 1024, 1280 by 900 and 844 by 390 (a phone on its side,
 *      where the pitch must be drawn on its side at 4 by 3 and nine tenths of the height): the stage is exactly the window,
 *      its strip starts inside it and its control row ends inside it, the pitch has the share of the
 *      screen the round promised, nothing overflows sideways, every control is 44 px both ways, and a
 *      hit test at the middle of Back, the score and each control lands on that very element.
 *   4. NOTHING MOVES THE PAGE. window.scrollY is the same before, during and after a goal, and after
 *      the change sheet and each panel has been opened.
 *   5. THE RELOAD. A match left in the middle of a half comes back at its minute, give or take one:
 *      by a reload, by closing the page, and by the tab going hidden.
 *   6. BACK. The stage's Back button folds the match to a small card in the page and pauses it (the
 *      clock is read again 2.6 seconds later), the page is free to scroll again, and the card's one
 *      button puts the stage back with the clock running.
 *   7. A WIDE SCREEN. At 1280 by 900, where the match is listed line by line beside the pitch, a goal is
 *      watched again: the list says GOAL! only once the ball is in (never on a plant or flight frame),
 *      and neither does the line under the pitch, at any size. Sections 1 and 7 leave two screenshots each
 *      (the ball on its way, the card up) when LIVE_FIT_SHOTS or RC_OUT names a folder.
 *
 * NEGATIVE CONTROL 2 (Release AO). LIVE_FIT_CONTROL=silentlist rewrites every GOAL! in the list beside the
 * pitch as the page draws it (after asserting the list is one node). Section 7 must go red on "the list
 * beside the pitch never said this goal" and every other section must stay green; exit 1 when it does, 3
 * when it does not. It guards the watch for a NEW line in a list of five (see judgeGoalFrames).
 *
 * NEGATIVE CONTROLS 3 AND 4 (Release AR). The release gate went red on two of section 1's checks for a real
 * reason (a goal cut off in flight by a change of line up, fixed in the viewer), and neither check had a
 * control of its own. Both work on the wide screen's watched goal, as silentlist does, and each must turn
 * section 7 red on its own line and leave every other section green (exit 1 when it does, 3 when not):
 *   LIVE_FIT_CONTROL=earlyscore  adds one to my side of the score the first frame the pitch reads the watched
 *                                goal's plant or flight; "the score changed before the ball was in" must fire.
 *   LIVE_FIT_CONTROL=nocard      takes the mark off the scorer card as the page draws it (after asserting the
 *                                card is not on screen yet); "no scorer card was ever on screen" must fire.
 *
 * NEGATIVE CONTROL. LIVE_FIT_CONTROL=bar pushes the control row 200 px down with a style tag (after
 * asserting the selector matches exactly one node). Section 3 must go red; 1, 2 and 4 must stay green.
 *
 * LIVE_FIT_REPORT=1 is a measuring pass: it prints the rectangles and counts below for 320 by 568,
 * 390 by 844 and 1280 by 900 and asserts nothing about section 3. Recorded with it, on the build
 * BEFORE the full screen match mode existed (commit and numbers in the block right under this one).
 *
 * It never reaches the network: every page aborts supabase.co, and the site is served from dist by
 * scripts/lib/hostLikeServer.mjs. Run `npm run build` first.
 *
 * THE WALK CAN BE REPLAYED (Round 1215). The walk never drew a number itself; the PAGE does (Club Manager's
 * engine draws from the ambient Math.random), and three fresh contexts used to be dealt three matches nobody
 * could ask for again. Release AR's gate met a real bug (a goal that lost its net) only because this walk
 * happened to draw that match. Now:
 *   THE SEED. LIVE_FIT_SEED is the one knob: a whole number, or the word fresh (one drawn from the clock, for
 *     a gate that wants other matches on purpose), or unset for the walk's own fixed seed (a hash of its file
 *     name, scripts/lib/pageSeed.mjs). The phone, the reduced motion phone and the wide screen take seed,
 *     seed + 1 and seed + 2. The first line printed is the seed and the command that replays the run. Each
 *     context prints the match it opened: the page's draw count at kick off and a digest of everything the
 *     engine drew for it (the save's whole live object but its clock, see matchDigest).
 *   WHAT THE SEED PROMISES: the opening match of each context, which is the match sections 1, 2 and 7 look
 *     for their goal in first. Sections 5 and 6 (the reload, Back) act at whatever minute the clock shows.
 *   THE REPLAY MODE, the proof of the seed. LIVE_FIT_REPLAY=1 opens the first match in four fresh contexts and
 *     watches nothing: A, B and C on the seed, D on the next. A, B and C must print one digest, and D another
 *     (that arm is the control of the digest itself). It also prints how often the page drew while nobody
 *     touched it, before the job and into the match, because a draw on a timer is what would break a seed.
 *     NEGATIVE CONTROL 5: LIVE_FIT_CONTROL=noseed (replay mode only) leaves the seed out. A, B and C must then
 *     be three different matches: exit 1 when they are, as they must, 3 when not.
 *   A RED HANDS BACK ITS MATCH. The save is kept as it stood when a goal was picked to be watched, and on a red
 *     in section 1, 2 or 7 it is written to LIVE_FIT_SHOTS, RC_OUT or the temp folder with the goal that was
 *     watched, and its path and size are printed. LIVE_FIT_SAVE=<that file> then starts every context from that
 *     save instead of taking a job and watches that very goal again, at each size. LIVE_FIT_SAVE also takes a
 *     plain stored save (what localStorage holds under dukb-club-manager-save, a match in flight): the walk
 *     then picks its goal by its own rule. A later round can hand it a save an engine search found.
 *
 *   node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_SEED=12345 node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_SEED=fresh node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_REPLAY=1 node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_REPLAY=1 LIVE_FIT_CONTROL=noseed node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_SAVE=/path/to/live-fit-save-wide.json node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_REPORT=1 node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_CONTROL=bar node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_CONTROL=silentlist node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_CONTROL=earlyscore node scripts/playLiveMatchFit.mjs
 *   LIVE_FIT_CONTROL=nocard node scripts/playLiveMatchFit.mjs
 */
/* RECORDED BEFORE MATCH MODE, with LIVE_FIT_REPORT=1 on the build of 6b1caa20 (the viewer still a card in
   the page, under the navbar and the page's own heading), on a GitHub runner's Chromium:
     320 by 568    scoreboard 157 to 286, pitch 296 to 680 (288 by 384), control row 813.5 to 857.5,
                   text nodes under 12 px 92 (smallest 7), controls under 44 px 6
     390 by 844    scoreboard 157 to 286, pitch 296 to 773.3 (358 by 477.3), control row 906.8 to 950.8,
                   text nodes under 12 px 87, controls under 44 px 2
     1280 by 900   scoreboard 173 to 302, pitch 312 to 909.3 (448 by 597.3), control row 1042.8 to 1086.8,
                   text nodes under 12 px 88, controls under 44 px 2
     name labels at 390 wide: 1.63 overlapping pairs a frame, over 24 frames of 22 labels (LABELS_BEFORE)
   So the controls sat under the fold at every size, which is what section 3 now forbids. Section 4 was red
   there too: window.scrollY read 507, 0, 896 and 280 as the panels opened. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { hashName, pageDraws, pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4191);
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = 'dukb-club-manager-save';
const REPORT = process.env.LIVE_FIT_REPORT === '1';
const REPLAY = process.env.LIVE_FIT_REPLAY === '1';
const CONTROL = process.env.LIVE_FIT_CONTROL || '';
if (CONTROL && !['bar', 'silentlist', 'earlyscore', 'nocard', 'noseed'].includes(CONTROL)) { console.error(`unknown LIVE_FIT_CONTROL ${CONTROL}`); process.exit(2); }
if ((CONTROL === 'noseed') !== (REPLAY && !!CONTROL)) { console.error('LIVE_FIT_CONTROL=noseed is the replay mode\'s control and its only one: set LIVE_FIT_REPLAY=1 with it, and no other control with LIVE_FIT_REPLAY'); process.exit(2); }
const V = !!process.env.VERBOSE;

/* Round 1215: the seed of the three contexts' pages, and the first line this walk prints. */
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.LIVE_FIT_SEED); }
catch (e) { console.error(`LIVE_FIT_SEED: ${e.message}`); process.exit(2); }
const seedAt = n => (SEED + n) >>> 0;
const SAVE_FILE = process.env.LIVE_FIT_SAVE || '';
if (SAVE_FILE && REPLAY) { console.error('LIVE_FIT_SAVE starts from a match already drawn, so the replay mode has nothing to prove with it: set one or the other'); process.exit(2); }
console.log(`playLiveMatchFit: seed ${SEED}${process.env.LIVE_FIT_SEED === undefined ? ' (the walk\'s own, from its file name)' : process.env.LIVE_FIT_SEED === 'fresh' ? ' (drawn fresh from the clock)' : ''}. Replay this run with: ${[
  `LIVE_FIT_SEED=${SEED}`, REPLAY ? 'LIVE_FIT_REPLAY=1' : '', CONTROL ? `LIVE_FIT_CONTROL=${CONTROL}` : '', REPORT ? 'LIVE_FIT_REPORT=1' : '', SAVE_FILE ? `LIVE_FIT_SAVE=${SAVE_FILE}` : '',
].filter(Boolean).join(' ')} node scripts/playLiveMatchFit.mjs`);
/* A folder for screenshots of the fit at each size (LIVE_FIT_SHOTS, or a remote check's RC_OUT). Optional. */
const SHOTS = process.env.LIVE_FIT_SHOTS || process.env.RC_OUT || '';
const shoot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, (CONTROL ? CONTROL + '-' : '') + name + '.png') }).catch(() => {}); };

let failures = 0;
/* control silentlist: did section 7 go red on the very line it must, and did the control rewrite a line */
let neverSaid = false;
let silenced = 0;
/* controls earlyscore and nocard: did section 7 go red on the very line it must, and did the control touch the page */
let scoreLed = false;
let cardMissed = false;
let tampered = 0;
const failed = new Set();
let section = 0;
const fail = m => { failures += 1; failed.add(section); console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);
const say = m => { if (V) console.log('      ' + m); };

/* ---- Round 1215: the match as the save holds it, its digest, the dump of a red, and LIVE_FIT_SAVE ---- */

/**
 * A digest of everything the engine drew for the match in flight: the save's whole live object (every shot,
 * corner, foul and throw in of the half, the goals, the cards, the share of the ball, the board, the other
 * eleven), which no two draws share. A digest of the club, the eleven and the goals would not do: the club is
 * the first of six in the page's order, and about three first halves in ten have no goal.
 * Two things are taken out, both because a clock writes them and no draw does:
 *   live.minute, where the clock stood when the page was last hidden or the manager last acted;
 *   the ids of the squad, which are turned into the man's place in the squad and his name (an academy
 *   player's id carries the time he was made).
 * Keys are sorted, so a save the page has read and written again digests the same.
 */
function matchDigest(save) {
  const live = save && save.live;
  if (!live) return null;
  const who = new Map((Array.isArray(save.squad) ? save.squad : []).map((p, i) => [p && p.id, `#${i} ${p && p.name}`]));
  const named = v => (typeof v === 'string' && who.has(v) ? who.get(v) : v);
  const plain = v => {
    if (Array.isArray(v)) return v.map(plain);
    /* named first and sorted after, so an id that carries a time never decides the order */
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).map(k => [named(k), plain(v[k])]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
    return named(v);
  };
  const { minute: _clock, ...drawn } = live;
  const text = JSON.stringify(plain(drawn));
  return { digest: hashName(text).toString(16).padStart(8, '0'), chars: text.length };
}
const clockOf = g => `${g.minute}${g.plus ? '+' + g.plus : ''}'`;
const goalWords = g => `${clockOf(g)} ${g.name ?? ''}${g.own ? ' (own goal)' : ''}, ${g.side === 'me' ? 'for me' : 'against me'}`;

/* LIVE_FIT_SAVE: a file this walk dumped on a red (an envelope: the stored string, the goal that was watched,
   the digest), or a plain stored save. Every context then starts from it instead of taking a job. */
let START = null;
if (SAVE_FILE) {
  try {
    const text = fs.readFileSync(SAVE_FILE, 'utf8');
    const parsed = JSON.parse(text);
    const envelope = !!parsed && parsed.liveFitSave === 1 && typeof parsed.raw === 'string';
    const raw = envelope ? parsed.raw : text;
    const career = envelope ? JSON.parse(raw) : parsed;
    if (!career || !career.live) throw new Error('it holds no match in flight (no live object)');
    START = { raw, target: envelope ? parsed.target ?? null : null, digest: envelope ? parsed.digest ?? null : null };
    console.log(`Starting every context from ${SAVE_FILE}: ${Buffer.byteLength(raw)} bytes as stored, ${career.clubName} v ${career.live.opponent}, match digest ${matchDigest(career).digest}${START.target ? `, to watch the goal at ${goalWords(START.target)}` : ', the goal picked by the walk\'s own rule'}.`);
  } catch (e) { console.error(`LIVE_FIT_SAVE ${SAVE_FILE}: ${e.message}`); process.exit(2); }
}
const startState = () => (START ? { storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: START.raw }] }] } } : {});

/* The save as it stood when the last goal was picked to be watched, per context, for the dump of a red. */
const VIEW_OF = { 1: 'phone', 2: 'calm', 7: 'wide' };
let kept = null;
const dumped = new Set();
function dumpSave() {
  const view = VIEW_OF[section];
  if (!view || dumped.has(view)) return;
  if (!kept || kept.view !== view || !kept.raw) { console.log('      no save was kept for this red (no goal had been picked in this context yet)'); return; }
  dumped.add(view);
  try {
    const folder = SHOTS || path.join(os.tmpdir(), 'live-fit-saves');
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, `${CONTROL ? CONTROL + '-' : ''}live-fit-save-${view}${START ? '-replay' : ''}.json`);
    const d = matchDigest(JSON.parse(kept.raw));
    const bytes = Buffer.byteLength(kept.raw);
    fs.writeFileSync(file, JSON.stringify({ liveFitSave: 1, walk: 'playLiveMatchFit', seed: SEED, view, section, control: CONTROL || null, digest: d ? d.digest : null, target: kept.target ?? null, bytes, raw: kept.raw }));
    console.log(`      RED TO REPLAY: section ${section} (${view}), match digest ${d ? d.digest : 'none'}, the goal watched ${kept.target ? goalWords(kept.target) : 'none'}`);
    console.log(`      its save is in ${file} (${bytes} bytes as stored). Replay that half with: LIVE_FIT_SAVE=${file}${CONTROL ? ` LIVE_FIT_CONTROL=${CONTROL}` : ''} node scripts/playLiveMatchFit.mjs`);
  } catch (e) { console.log(`      the save of this red could not be written: ${e.message}`); }
}

let server = null;
async function startServer() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('dist/index.html is missing. Run npm run build before this browser harness.');
  const occupied = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
  if (occupied) throw new Error(`port ${PORT} already answers, refusing to test an unknown server`);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`the dist server never came up on port ${PORT}`);
}

/** A page of a context, with the live database refused and its errors kept. */
async function openPage(context) {
  const page = await context.newPage();
  await page.route(/supabase\.co/, route => route.abort());
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e && e.message ? e.message : e)));
  return page;
}
const tap = async (page, rx, what) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) { say(`no button for ${what}`); return false; }
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
const tapText = async (page, rx, what) => {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) { say(`no button for ${what}`); return false; }
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
async function clearRoom(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
const saved = page => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY);
/** The save exactly as the page stores it: the string under its key. */
const storedRaw = page => page.evaluate(k => localStorage.getItem(k), KEY);
const liveRoot = page => page.locator('[data-cm-live-stage]').first();
const minuteOf = async page => Number(await liveRoot(page).getAttribute('data-cm-live-minute').catch(() => 'NaN'));
const stageOf = page => liveRoot(page).getAttribute('data-cm-live-stage').catch(() => null);

/** Opens Club Manager and waits for the page to settle, before anything is tapped. */
async function land(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom(page);
}

/** Takes a job the way a visitor does and stops on the club page. With LIVE_FIT_SAVE the job is the save's. */
async function takeJob(page) {
  await land(page);
  if (START) {
    const start = await saved(page);
    if (!start || !start.live) throw new Error('LIVE_FIT_SAVE: the page did not keep the match in flight it was started from');
    return start;
  }
  return pickJob(page);
}
async function pickJob(page) {
  await tap(page, /2026-27/i, 'the 2026-27 era');
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i, 'England');
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i, 'Premier League');
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i, 'the pinned confirm bar');
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i, 'skip the dugout form');
  await page.waitForTimeout(800);
  const start = await saved(page);
  if (!start) throw new Error('no save on disk after taking the job');
  return start;
}

/** From the club page into the live viewer of the next match (or back into the one in flight). */
async function startLive(page) {
  /* After a reload the page opens on the resume screen: back into the career first. */
  const resume = page.getByRole('button', { name: /Resume Career/i }).first();
  if (await resume.count().catch(() => 0)) { await resume.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); }
  if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i, 'play live');
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const speedTo = (page, label) => page.getByRole('button', { name: label, exact: true }).first().click({ timeout: 3000 }).catch(() => {});

/** The goals of the half on the clock, off the save: each with its place and whether it is the last kick.
 *  Round 1215: the save is handed back as stored (for the dump of a red), and an own goal is named by the man
 *  who put it in, the name on the card. A goal of mine that went in off one of theirs keeps the scorer it was
 *  first drawn for in name and carries the man in og.n; one of theirs off one of mine is renamed by the engine
 *  and carries og true. Reading name alone printed a man who is not on the card. */
async function goalsOfHalf(page) {
  const raw = await storedRaw(page);
  const save = raw ? JSON.parse(raw) : null;
  const live = save?.live;
  if (!live) return { goals: [], board: 0, second: false, raw, own: 0 };
  const second = !!live.h2Drawn && (live.minute ?? 0) >= 46;
  const board = (second ? live.added?.h2 : live.added?.h1) ?? 0;
  const cap = second ? 90 : 45;
  const line = side => g => ({ minute: g.minute, plus: g.plus ?? 0, place: g.minute + (g.plus ?? 0), side, own: !!g.og, name: g.og && typeof g.og === 'object' && g.og.n ? g.og.n : g.name });
  const lines = second ? [...(live.h2My ?? []).map(line('me')), ...(live.h2Opp ?? []).map(line('opp'))] : [...(live.h1My ?? []).map(line('me')), ...(live.h1Opp ?? []).map(line('opp'))];
  const goals = lines.filter(g => g.place < cap + board).sort((a, b) => a.place - b.place);
  return { goals, board, second, cap, raw, own: goals.filter(g => g.own).length };
}

/**
 * Round 1215: the match a context has just opened, as the save holds it, on one printed line: the page's draw
 * count at kick off, the digest of everything drawn for it, who plays whom, the goals of the half on the clock
 * and how many of them are own goals. The save is written by the page a moment after the stage is drawn, so
 * this waits for it.
 */
async function opening(page, label, seed) {
  let save = null;
  for (let i = 0; i < 50; i++) {
    save = await saved(page).catch(() => null);
    if (save && save.live && (save.live.h1Play || save.live.h1My || save.live.h2Drawn)) break;
    await page.waitForTimeout(100);
  }
  if (!save || !save.live) throw new Error(`${label}: the save holds no match in flight after the stage opened`);
  const draws = await pageDraws(page);
  const d = matchDigest(save);
  const half = await goalsOfHalf(page);
  const told = half.goals.map(g => `${clockOf(g)} ${g.name}${g.own ? ' (own goal)' : ''}`).join(', ') || 'none';
  console.log(`  [match ${label}] seed ${seed === null ? 'none' : seed}, ${draws === null ? 'draws not counted' : `${draws} draws at kick off`}, digest ${d.digest} over ${d.chars} characters of drawn match: ${save.clubName} v ${save.live.opponent}, goals of the ${half.second ? 'second' : 'first'} half ${told}; own goals among them ${half.own}`);
  return { label, seed, draws, digest: d.digest, chars: d.chars, club: save.clubName, opponent: save.live.opponent };
}
/** With LIVE_FIT_SAVE: the match that opened must be the one the file was dumped with. */
function heldToSave(opened) {
  if (!START || !START.digest) return;
  if (opened.digest !== START.digest) fail(`the match that opened (digest ${opened.digest}) is not the one in the file (digest ${START.digest})`);
  else ok(`the match that opened is the one in the file (digest ${opened.digest})`);
}

/** Every frame the page draws from now on, kept on the page until taken. */
async function startSampler(page) {
  await page.evaluate(() => {
    const out = [];
    window.__fit = { out, on: true };
    const read = () => {
      if (!window.__fit.on) return;
      const pitch = document.querySelector('[data-cm-live-pitch]');
      const score = document.querySelector('[data-cm-live-score]');
      const card = document.querySelector('[data-cm-goal-card]');
      const root = document.querySelector('[data-cm-live-stage]');
      const log = document.querySelector('[data-cm-live-log]');
      const line = document.querySelector('[data-cm-live-event]');
      out.push({
        told: log && log.getBoundingClientRect().height > 0 ? [...log.querySelectorAll('li')].filter(li => li.textContent.includes('GOAL!')).length : null,
        /* Release AO: the GOAL! lines themselves, so a new one is told from one that was there already */
        goals: log && log.getBoundingClientRect().height > 0 ? [...log.querySelectorAll('li')].filter(li => li.textContent.includes('GOAL!')).map(li => li.textContent.replace(/\s+/g, ' ').trim()) : null,
        line: line ? line.textContent.replace(/\s+/g, ' ').trim() : '',
        men: pitch ? [...pitch.querySelectorAll('[data-cm-dot], [data-cm-dot-opp]')].map(el => el.textContent.trim()).join('|') : '',
        t: performance.now(),
        score: score ? score.textContent.replace(/\s+/g, ' ').trim() : null,
        motion: pitch ? pitch.getAttribute('data-cm-motion') : null,
        phase: pitch ? pitch.getAttribute('data-cm-motion-phase') : null,
        net: pitch ? pitch.querySelectorAll('[data-cm-net="goal"]').length : 0,
        card: card ? (() => { const r = card.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() : null,
        pitch: pitch ? (() => { const r = pitch.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() : null,
        minute: root ? Number(root.getAttribute('data-cm-live-minute')) : null,
        y: window.scrollY,
      });
      requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
}
const takeSamples = page => page.evaluate(() => { const s = window.__fit ? window.__fit.out.splice(0) : []; return s; });
const stopSampler = page => page.evaluate(() => { if (window.__fit) window.__fit.on = false; });

/**
 * Plays on until a goal that is not the last kick of its period has been watched from before its minute
 * to after its card, sampling every frame. Skips on through halves without one; gives up when
 * sixteen halves pass. Returns the samples around the goal, or null.
 */
async function watchAGoal(page, { tapCard, onTick, view }) {
  /* Round 1215: with a file this walk dumped on a red, the goal to watch is the one that red watched. */
  const pin = START ? START.target : null;
  /* Sixteen halves, counting only the ones looked through for a goal: the dressing room, the report and the
     start of the next match are turns of this loop too, and with the goal it wants (inside the ninety, on its
     own, with minutes in hand) eight turns were sometimes two matches with none. */
  for (let turn = 0, halves = 0; turn < 80 && halves < 16; turn++) {
    const stage = await stageOf(page);
    if (stage === 'interval') { await tap(page, /^Second half$/i, 'second half'); await page.waitForTimeout(600); continue; }
    if (stage === 'done') {
      await tap(page, /full report/i, 'full report'); await page.waitForTimeout(700);
      await tap(page, /continue|next|carry on|ok/i, 'continue'); await page.waitForTimeout(700);
      if (!(await startLive(page))) return null;
      continue;
    }
    if (stage === null) { if (!(await startLive(page))) return null; continue; }
    const now = await minuteOf(page);
    const { goals, cap, raw, own } = await goalsOfHalf(page);
    /* One goal on its own: no other within four minutes either side (a goal two minutes later plays out
       inside the window sampled here, with its own wind up reading the score the first one left, and one a
       minute before is still on screen when the sampling starts). */
    /* And never one in the board: the minute this walk reads off the page stops at 45 and at 90, so it would
       wait for a 47th minute that never comes and sample the dressing room instead (it did, once). */
    let target = goals.find(g => !g.plus && g.place >= now + 2 && g.place <= cap - 2 && !goals.some(o => o !== g && Math.abs(o.place - g.place) < 4));
    if (pin) {
      /* The half in the file is the half on the clock, and it holds that goal or the file is not this match. */
      target = goals.find(g => g.minute === pin.minute && g.plus === (pin.plus ?? 0) && g.side === pin.side && g.name === pin.name);
      if (!target) throw new Error(`the goal the file was dumped for (${goalWords(pin)}) is not in the half on the clock (${goals.map(clockOf).join(', ') || 'no goals'})`);
      if (target.place <= now) throw new Error(`the goal the file was dumped for (${goalWords(pin)}) had been played when the watch began, with the clock at ${now}`);
    }
    /* A match started from a file was held at its restart (see openMatch) and runs on from here. */
    if (page.held) { page.held = false; await tap(page, /^Resume$/i, 'let the held match run'); }
    if (!target) { halves++; await tap(page, /skip/i, 'skip a half with no goal to watch'); await page.waitForTimeout(700); continue; }
    /* The save as it stands now is the half this goal is in: kept, and written out if the section goes red. */
    kept = { view, raw, target, own, goals: goals.length };
    say(`a goal is coming at ${target.minute}${target.plus ? '+' + target.plus : ''}, the clock is at ${now}`);
    await speedTo(page, '4x');
    /* On to a minute and a half before it, then watch it at 2x, the speed the match opens at. */
    for (let i = 0; i < 400 && (await minuteOf(page)) < target.place - 2; i++) await page.waitForTimeout(100);
    await speedTo(page, '2x');
    await startSampler(page);
    const samples = [];
    let tapped = false;
    const until = Date.now() + 14000;
    while (Date.now() < until) {
      await page.waitForTimeout(onTick ? 60 : 120);
      samples.push(...await takeSamples(page));
      if (onTick) await onTick();
      const card = page.locator('[data-cm-goal-card]').first();
      if (tapCard && !tapped && await card.count().catch(() => 0)) {
        await page.waitForTimeout(350);
        samples.push(...await takeSamples(page));
        await card.click({ timeout: 2000 }).catch(() => {});
        tapped = true;
        samples.push({ tapped: true, t: await page.evaluate(() => performance.now()) });
      }
      const last = samples.filter(s => !s.tapped).slice(-1)[0];
      if (last && last.minute !== null && last.minute >= target.place + 2) break;
    }
    await stopSampler(page);
    const list = await page.evaluate(() => [...document.querySelectorAll('[data-cm-live-log] li')].map(li => li.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
    return { target, samples, tapped, list, own, goals: goals.length };
  }
  return null;
}

/** Two screenshots of the goal being watched, when a folder was asked for: one with the ball on its way, one
 *  with the card up. Returned as watchAGoal's onTick. */
function goalShots(page, prefix) {
  const done = new Set();
  return async () => {
    if (!SHOTS || done.size === 2) return;
    const now = await page.evaluate(() => {
      const p = document.querySelector('[data-cm-live-pitch]');
      return { motion: p ? p.getAttribute('data-cm-motion') : null, phase: p ? p.getAttribute('data-cm-motion-phase') : null, card: !!document.querySelector('[data-cm-goal-card]') };
    }).catch(() => null);
    if (!now) return;
    if (now.motion === 'goal' && (now.phase === 'plant' || now.phase === 'flight') && !done.has('windup')) { done.add('windup'); await shoot(page, prefix + '-goal-windup'); }
    else if (now.card && !done.has('card')) { done.add('card'); await shoot(page, prefix + '-goal-card'); }
  };
}

const inside = (inner, outer) => inner[0] >= outer[0] - 1 && inner[1] >= outer[1] - 1 && inner[2] <= outer[2] + 1 && inner[3] <= outer[3] + 1;

/** Sections 1 and 4 read one watched goal: the order of things, and that the page never moved. */
/** What the page drew around the goal, as runs of frames that read the same: "motion/phase score card xN". */
function timeline(samples) {
  const runs = [];
  for (const s of samples) {
    /* e and three digits: a mark of the 22 names on the grass, so a change of line up shows as a new run. */
    const mark = s.men ? ' e' + String([...s.men].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 997, 7)).padStart(3, '0') : '';
    const label = s.tapped ? 'TAP' : `${s.motion}/${s.phase} ${s.score}${s.card ? ' card' : ''} ${s.minute}'${mark}`;
    const last = runs[runs.length - 1];
    if (last && last.label === label && !s.tapped) last.n++;
    else runs.push({ label, n: 1 });
  }
  return runs.map(r => (r.label === 'TAP' ? 'TAP' : `${r.label} x${r.n}`)).join(' | ');
}

function judgeGoal(watched, { reduced, wide = false }) {
  const before = failures;
  /* Round 1215: said on every run, so two runs on one seed can be read against each other. An own goal is named
     by the man on the card and called one, with the half's count of them. */
  console.log(`  the goal watched: ${goalWords(watched.target)}; own goals in its half ${watched.own} of ${watched.goals} goals`);
  try { return judgeGoalFrames(watched, { reduced, wide }); }
  finally {
    if (failures > before || V) {
      console.log('      what was drawn: ' + timeline(watched.samples).slice(0, 2400));
      console.log(`      the list at the end: ${(watched.list ?? []).join(' / ') || 'not on screen'}`);
    }
    /* A red hands back its match: the save kept when this goal was picked, with the goal. */
    if (failures > before) dumpSave();
  }
}
function judgeGoalFrames(watched, { reduced, wide }) {
  const frames = watched.samples.filter(s => !s.tapped && s.score !== null);
  if (frames.length < 30) { fail(`only ${frames.length} frames were sampled around the goal`); return; }
  const first = frames[0].score;
  const changedAt = frames.findIndex(f => f.score !== first);
  if (changedAt < 0) { fail(`the score never changed from ${first} in ${frames.length} frames around a goal at ${watched.target.minute}'`); return; }
  const at = frames[changedAt];
  const early = frames.slice(0, changedAt).filter(f => f.score !== first).length;
  const windup = frames.filter(f => f.motion === 'goal' && (f.phase === 'plant' || f.phase === 'flight'));
  const wrong = windup.filter(f => f.score !== first).length;
  if (!reduced) {
    if (windup.length < 5) fail(`only ${windup.length} frames of the goal's wind up and flight were seen, so the order was not really watched`);
    else if (wrong || early) { scoreLed = true; fail(`the score changed before the ball was in: ${wrong} of ${windup.length} plant and flight frames already read the new score`); }
    else if (at.phase !== 'net' || at.net < 1) fail(`the first frame with the new score (${at.score}) reads phase ${at.phase} with ${at.net} net marked, not the ball in the net`);
    else ok(`the goal in order: ${windup.length} frames of wind up and flight all read ${first}, and the first frame reading ${at.score} is in phase net with the net marked`);
  } else if (at.phase !== 'net') fail(`under reduced motion the frame with the new score reads phase ${at.phase}`);
  else ok(`under reduced motion the score reads ${at.score} on a frame in phase net`);
  /* Nothing says GOAL before the ball is in: not the line under the pitch, and where the list beside the pitch
     is on screen (768 wide and up) not the list either. The list must say it in the end. */
  if (!reduced) {
    const lineEarly = windup.filter(f => /^GOAL!/.test(f.line || '')).length;
    if (lineEarly) fail(`the line under the pitch already read GOAL! on ${lineEarly} of ${windup.length} plant and flight frames`);
    else ok(`the line under the pitch never read GOAL! while the ball was on its way (${windup.length} frames)`);
    const listed = frames.filter(f => f.told !== null && f.told !== undefined);
    if (wide && !listed.length) fail('the list beside the pitch was never on screen on a wide window');
    else if (listed.length) {
      const start = listed[0].told;
      /* Release AO: the list keeps its five newest lines, so an earlier goal's line can leave it while
         this goal's line arrives, and a COUNT of GOAL! lines then never passes where it started. Seen on
         a runner on the merged tree (a penalty at 53' with one goal listed already: red on a list that
         ended "53'GOAL! Penalty, ..."), and the screen and this walk were byte for byte Round 1101's.
         The watch is for a GOAL! line the list did not hold on the first frame. */
      const had = new Set(listed[0].goals ?? []);
      const fresh = f => (f.goals ?? []).some(t => !had.has(t));
      const toldEarly = windup.filter(f => f.told !== null && fresh(f)).length;
      const said = listed.findIndex(fresh);
      if (toldEarly) fail(`the list beside the pitch said GOAL! on ${toldEarly} of ${windup.length} plant and flight frames, before the ball was in`);
      else if (said < 0) { neverSaid = true; fail(`the list beside the pitch never said this goal (${start} GOAL! lines all through ${listed.length} frames)`); }
      else if (listed[said].phase !== 'net' && listed[said].motion === 'goal') fail(`the list beside the pitch first said GOAL! on a frame in phase ${listed[said].phase}`);
      else ok(`the list beside the pitch said GOAL! only once the ball was in (first on a frame reading ${listed[said].motion}/${listed[said].phase}, score ${listed[said].score})`);
    }
  }
  const carded = frames.filter(f => f.card);
  if (!carded.length) { cardMissed = true; fail('no scorer card was ever on screen around the goal'); }
  else {
    const out = carded.filter(f => !f.pitch || !inside(f.card, f.pitch)).length;
    if (out) fail(`the scorer card was outside the pitch on ${out} of ${carded.length} frames`);
    else ok(`the scorer card was inside the pitch on all ${carded.length} frames it was up`);
  }
  if (watched.tapped) {
    const tap = watched.samples.find(s => s.tapped);
    const after = frames.filter(f => f.t > tap.t + 250);
    const still = after.filter(f => f.card).length;
    if (!after.length) fail('no frame was sampled after the tap on the card');
    else if (still) fail(`the card was still up on ${still} frames a quarter of a second after it was tapped`);
    else ok(`a tap on the card ended the hold (${after.length} frames after it, none with the card)`);
  }
  return frames;
}

/** Section 4. The frames of the watched goal are one stretch of one period: scrollY is one number through it.
 *  The panels are opened later, perhaps a period later (the interval between is the page's own screen, where
 *  the page may scroll), so they are held to a reading taken just before the first of them opened. */
function judgeScroll(frames, base, panels) {
  const during = [...new Set(frames.map(f => Math.round(f.y)))];
  if (during.length !== 1) fail(`window.scrollY moved during the goal: ${during.join(', ')}`);
  else ok(`window.scrollY stayed at ${during[0]} through ${frames.length} frames before, during and after a goal`);
  const moved = panels.filter(p => Math.round(p.y) !== Math.round(base));
  if (!panels.length) fail('no panel could be opened to read scrollY with');
  else if (moved.length) fail(`window.scrollY was ${Math.round(base)} and moved with ${moved.map(p => `${p.what} (${Math.round(p.y)})`).join(', ')} open`);
  else ok(`window.scrollY stayed at ${Math.round(base)} with ${panels.map(p => p.what).join(', ')} open`);
}

/** Opens each panel the viewer has, and the change sheet, and reads scrollY with each one open. */
async function openEachPanel(page) {
  const out = [];
  const read = async what => { out.push({ what, y: await page.evaluate(() => window.scrollY) }); await shoot(page, 'panel-' + what.split(' ')[1]); };
  const dot = page.locator('button[data-cm-dot]:not([disabled])').first();
  if (await dot.count().catch(() => 0)) {
    await dot.click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(350);
    if (await page.locator('[data-cm-live-sheet]').count().catch(() => 0)) await read('the change sheet');
    /* Closed with its own Close: a second tap at the dot's spot would land on the sheet now lying over it. */
    await page.locator('[data-cm-live-sheet] button[aria-label="Close"]').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  for (const [name, what] of [[/squad and stamina/i, 'the squad panel'], [/how watching a match works/i, 'the help panel'], [/^stats$/i, 'the stats panel']]) {
    const b = page.getByRole('button', { name }).first();
    if (!(await b.count().catch(() => 0)) || !(await b.isVisible().catch(() => false))) continue;
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(350);
    await read(what);
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  return out;
}

/** Rectangles and counts of the viewer as it stands on this page, read in the page. */
function measure(page) {
  return page.evaluate(() => {
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const root = document.querySelector('[data-cm-live-stage]');
    const pitch = document.querySelector('[data-cm-live-pitch]');
    const pause = root ? root.querySelector('button[aria-label="Pause"], button[aria-label="Resume"]') : null;
    const controlsEl = document.querySelector('[data-cm-live-controls]') || (pause ? pause.parentElement : null);
    const score = document.querySelector('[data-cm-live-score]');
    const strip = document.querySelector('[data-cm-live-strip]') || (score ? score.closest('.bg-card') : null);
    const stage = document.querySelector('[data-cm-live-stagebox]');
    const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const controls = controlsEl ? [...controlsEl.querySelectorAll('button')].filter(visible) : [];
    /* Text under 12 px inside the viewer: text nodes with something in them, by their element's computed size. */
    let small = 0, smallest = 99;
    if (root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue || !node.nodeValue.trim() || !node.parentElement || !visible(node.parentElement)) continue;
        const size = parseFloat(getComputedStyle(node.parentElement).fontSize);
        if (size < 12) small++;
        if (size < smallest) smallest = size;
      }
    }
    const buttons = root ? [...root.querySelectorAll('button')].filter(visible).filter(b => !b.hasAttribute('data-cm-dot')) : [];
    const under44 = buttons.filter(b => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).length;
    /* Name labels that overlap: the label span under (or over) each figure on the pitch. */
    const labels = pitch ? [...pitch.querySelectorAll('[data-cm-dot] > span, [data-cm-dot-opp] > span')].map(el => el.getBoundingClientRect()).filter(r => r.width > 0) : [];
    let overlapping = 0;
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlapping++;
    }
    const hit = el => { if (!el) return null; const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === el || el.contains(at)); };
    const back = root ? root.querySelector('button[aria-label="Back to the club page"]') : null;
    const statline = document.querySelector('[data-cm-live-statline]');
    return {
      window: { width: window.innerWidth, height: window.innerHeight },
      doc: { height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth },
      strip: rect(strip), pitch: rect(pitch), controls: rect(controlsEl), stage: rect(stage), statline: statline && visible(statline) ? rect(statline) : null,
      controlRects: controls.map(b => ({ name: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24), width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height, hit: hit(b) })),
      backHit: hit(back), scoreHit: hit(score), hasBack: !!back,
      small, smallest, under44, labels: labels.length, overlapping,
      orient: document.querySelector('[data-pm-orient]') ? document.querySelector('[data-pm-orient]').getAttribute('data-pm-orient') : null,
    };
  });
}

/** The mean number of overlapping name labels a frame, over a couple of seconds of open play. */
async function labelMean(page, frames = 24) {
  let sum = 0, n = 0, labels = 0;
  for (let i = 0; i < frames; i++) {
    const m = await measure(page);
    if (m.labels) { sum += m.overlapping; labels = m.labels; n++; }
    await page.waitForTimeout(250);
  }
  return { mean: n ? sum / n : NaN, frames: n, labels };
}

const VIEWPORTS = [
  { name: '320 by 568', width: 320, height: 568, phone: true },
  { name: '390 by 844', width: 390, height: 844, phone: true },
  { name: '768 by 1024', width: 768, height: 1024, phone: false },
  { name: '1280 by 900', width: 1280, height: 900, phone: false, tall: true },
  /* A phone on its side: the pitch is drawn on its side at its own 4 by 3, with the phone's rows beside it. */
  { name: '844 by 390', width: 844, height: 390, phone: false, sideways: true },
];
const round = v => (v === null || v === undefined ? 'none' : Math.round(v * 10) / 10);

/** Section 3 for one viewport, on a running match. In the measuring pass it prints and asserts nothing. */
function judgeFit(view, m) {
  if (REPORT) {
    console.log(`  [report ${view.name}] scoreboard ${round(m.strip?.top)} to ${round(m.strip?.bottom)}, pitch ${round(m.pitch?.top)} to ${round(m.pitch?.bottom)} (${round(m.pitch?.width)} by ${round(m.pitch?.height)}), control row ${round(m.controls?.top)} to ${round(m.controls?.bottom)}, document height ${m.doc.height}, text nodes under 12 px ${m.small} (smallest ${m.smallest}), controls under 44 px ${m.under44}`);
    return;
  }
  const problems = [];
  if (!m.stage) problems.push('there is no stage box');
  else if (Math.abs(m.stage.left) > 0.5 || Math.abs(m.stage.top) > 0.5 || Math.abs(m.stage.width - m.window.width) > 0.5 || Math.abs(m.stage.height - m.window.height) > 0.5) problems.push(`the stage box is ${round(m.stage.left)},${round(m.stage.top)} ${round(m.stage.width)} by ${round(m.stage.height)}, not the window`);
  if (!m.strip || m.strip.top < -0.5) problems.push(`the strip starts at ${round(m.strip?.top)}`);
  if (!m.controls || m.controls.bottom > m.window.height + 0.5) problems.push(`the control row ends at ${round(m.controls?.bottom)}, under a window ${m.window.height} tall`);
  if (!m.pitch) problems.push('there is no pitch');
  else {
    const share = m.pitch.height / m.window.height;
    if (view.phone && share < 0.6) problems.push(`the pitch is ${round(share * 100)} percent of the height`);
    if (view.phone && m.pitch.width < m.window.width * 0.98) problems.push(`the pitch is ${round(m.pitch.width)} wide in a window ${m.window.width} wide`);
    if (view.tall && m.pitch.height < 700) problems.push(`the pitch is ${round(m.pitch.height)} px tall on the desktop`);
    if (view.sideways) {
      const shape = m.pitch.width / m.pitch.height;
      if (m.orient !== 'landscape') problems.push(`the pitch is drawn ${m.orient}, not on its side`);
      if (shape < 1.25 || shape > 1.4) problems.push(`the pitch is ${round(m.pitch.width)} by ${round(m.pitch.height)}, not 4 by 3 on its side`);
      if (m.pitch.height < m.window.height * 0.9) problems.push(`the pitch is ${round(m.pitch.height)} px tall in a window ${m.window.height} tall`);
    } else if (m.orient !== 'portrait') problems.push(`the pitch is drawn ${m.orient} in an upright window`);
    if (view.sideways) {
      if (m.strip && m.pitch.right > m.strip.left + 0.5) problems.push('the pitch runs under the strip beside it');
      if (m.controls && m.pitch.right > m.controls.left + 0.5) problems.push('the pitch runs under the controls beside it');
    } else {
      if (m.controls && m.pitch.bottom > m.controls.top + 0.5) problems.push('the pitch runs under the control row');
      if (m.strip && m.pitch.top < m.strip.bottom - 0.5) problems.push('the pitch starts under the strip');
    }
  }
  if (m.doc.width > m.window.width + 1) problems.push(`the document is ${m.doc.width} wide in a window ${m.window.width} wide`);
  const thin = m.controlRects.filter(c => c.width < 43.5 || c.height < 43.5);
  if (m.controlRects.length < 6) problems.push(`only ${m.controlRects.length} controls in the row`);
  if (thin.length) problems.push(`controls under 44 px: ${thin.map(c => `${c.name} ${round(c.width)} by ${round(c.height)}`).join(', ')}`);
  const covered = m.controlRects.filter(c => !c.hit);
  if (covered.length) problems.push(`something is drawn over: ${covered.map(c => c.name).join(', ')}`);
  if (!m.hasBack || !m.backHit) problems.push('Back is missing or covered');
  if (!m.scoreHit) problems.push('the score is covered');
  if ((view.phone || view.sideways) && !m.statline) problems.push('the stats line is not on screen on a phone');
  if (view.phone && m.statline && (m.statline.height < 18 || m.statline.top < (m.pitch?.bottom ?? 0) - 0.5)) problems.push(`the stats line is ${round(m.statline.height)} tall at ${round(m.statline.top)}`);
  if (problems.length) fail(`${view.name}: ${problems.join('; ')}`);
  else ok(`${view.name}: the stage is the window, strip at ${round(m.strip.top)}, pitch ${round(m.pitch.width)} by ${round(m.pitch.height)} (${round(m.pitch.height / m.window.height * 100)} percent of the height), control row ends at ${round(m.controls.bottom)} of ${m.window.height}, ${m.controlRects.length} controls all 44 px and none covered`);
}

/* The mean number of overlapping name labels a frame at 390 wide, measured with LIVE_FIT_REPORT=1 on the
   build of the commit named here, BEFORE the full screen match mode. With match mode the mean must be lower. */
const LABELS_BEFORE = { commit: '6b1caa20', mean: 1.63 };

/** A period being played with at least `need` minutes of it left: a reading taken as a half ends finds the
 *  dressing room where the stage was. Skips on to the next period until there is one. */
async function withRoom(page, need) {
  for (let i = 0; i < 6; i++) {
    if (!(await runningMatch(page))) return false;
    const stage = await stageOf(page);
    const minute = await minuteOf(page);
    if ((stage === 'first' && minute <= 45 - need) || (stage === 'second' && minute <= 90 - need)) return true;
    await tap(page, /skip/i, 'skip on to a fresh period');
    await page.waitForTimeout(700);
  }
  return false;
}

/** Section 6: Back folds the match away to a card in the page and pauses it; the card's button puts it back. */
async function judgeBack(page) {
  /* With at least seven minutes of the period left, so the clock has room to be seen running on. */
  if (!(await withRoom(page, 7))) { fail('no running match to fold away'); return; }
  const back = page.getByRole('button', { name: 'Back to the club page' }).first();
  if (!(await back.count().catch(() => 0))) { fail('there is no Back button on the stage'); return; }
  const before = await minuteOf(page);
  await back.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const folded = await page.evaluate(() => ({
    stage: document.querySelectorAll('[data-cm-live-stagebox]').length,
    card: document.querySelectorAll('[data-cm-live-compact]').length,
    text: (document.querySelector('[data-cm-live-compact]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    lock: document.body.style.overflow,
  }));
  await page.waitForTimeout(2600);
  const held = await minuteOf(page);
  if (folded.stage !== 0 || folded.card !== 1) fail(`after Back there are ${folded.stage} stage boxes and ${folded.card} compact cards`);
  else if (!/Paused at \d+/.test(folded.text) || !/Back to the match/.test(folded.text)) fail(`the compact card reads "${folded.text}"`);
  else if (folded.lock === 'hidden') fail('the page is still locked against scrolling with the stage folded away');
  else if (held !== before && held !== before + 1) fail(`the clock ran on from ${before}' to ${held}' while the match was folded away`);
  else ok(`Back folds the match to a card reading "${folded.text.slice(0, 70)}", and the clock held at ${held}' for 2.6 seconds`);
  await page.getByRole('button', { name: 'Back to the match' }).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const again = await page.evaluate(() => ({ stage: document.querySelectorAll('[data-cm-live-stagebox]').length, card: document.querySelectorAll('[data-cm-live-compact]').length }));
  let moved = held;
  for (let i = 0; i < 40 && moved <= held; i++) { await page.waitForTimeout(150); moved = await minuteOf(page); }
  if (again.stage !== 1 || again.card !== 0) fail(`after Back to the match there are ${again.stage} stage boxes and ${again.card} compact cards`);
  else if (!(moved > held)) fail(`the match did not run on after Back to the match (still ${moved}')`);
  else ok(`Back to the match puts the stage back and the clock runs on (${held}' to ${moved}')`);
}

async function runningMatch(page) {
  for (let i = 0; i < 10; i++) {
    const stage = await stageOf(page);
    if (stage === 'first' || stage === 'second' || stage === 'extra') return true;
    if (stage === 'interval') await tap(page, /^Second half$/i, 'second half');
    else if (stage === 'done') { await tap(page, /full report/i, 'full report'); await page.waitForTimeout(600); await tap(page, /continue|next|carry on|ok/i, 'continue'); await page.waitForTimeout(600); await startLive(page); }
    else await startLive(page);
    await page.waitForTimeout(700);
  }
  return false;
}

/** Round 1215: a context on its own seed (null leaves the page unseeded), started from the file when
 *  LIVE_FIT_SAVE names one. */
async function seededContext(options, seed) {
  const context = await browser.newContext({ ...options, ...startState() });
  if (seed !== null) await seedPages(context, seed);
  return context;
}
/** A match started from a file is held as soon as its stage is up, so the goal the file was dumped for is
 *  still to come when the watch begins; watchAGoal lets it run. */
async function holdIfSaved(page) {
  if (!START) return;
  if (await tap(page, /^Pause$/i, 'hold the saved match') || await page.getByRole('button', { name: /^Resume$/i }).count().catch(() => 0)) page.held = true;
}
/** No goal could be watched: the save as it stands is what there is to hand back. */
async function noGoal(page, view, words) {
  fail(words);
  kept = { view, raw: await storedRaw(page).catch(() => null), target: null };
  dumpSave();
}
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

await startServer();
const browser = await chromium.launch();
const errors = [];
/* Round 1215, the replay mode: what each of its contexts opened. */
const replays = [];
try {
  if (REPLAY) {
    section = 8;
    console.log(CONTROL === 'noseed'
      ? '8) The replay, NEGATIVE CONTROL noseed: the first match in three fresh contexts with no seed at all'
      : `8) The replay: the first match in three fresh contexts on seed ${SEED} and in one on seed ${seedAt(1)}`);
    const arms = CONTROL === 'noseed' ? [['A', null], ['B', null], ['C', null]] : [['A', SEED], ['B', SEED], ['C', SEED], ['D', seedAt(1)]];
    for (const [label, seed] of arms) {
      const context = await seededContext(PHONE, seed);
      const page = await openPage(context);
      /* How often the page draws while nobody touches it: a draw on a timer is what would break a seed. */
      await land(page);
      const settled = await pageDraws(page);
      await page.waitForTimeout(2500);
      const waited = await pageDraws(page);
      await pickJob(page);
      const inJob = await pageDraws(page);
      if (!(await startLive(page))) throw new Error(`replay ${label}: the live viewer never opened`);
      const opened = await opening(page, 'replay ' + label, seed);
      await page.waitForTimeout(2500);
      const playing = await pageDraws(page);
      if (seed !== null) console.log(`  [draws replay ${label}] ${settled} once the page had settled, ${waited} after 2.5 seconds untouched, ${inJob} with the job taken, ${opened.draws} at kick off, ${playing} after 2.5 seconds of the match`);
      replays.push({ ...opened, idle: seed === null ? null : (waited - settled) + (playing - opened.draws) });
      errors.push(...page.errors);
      await context.close();
    }
    const same = seed => replays.filter(r => r.seed === seed);
    if (CONTROL !== 'noseed') {
      const mine = same(SEED);
      const one = new Set(mine.map(r => r.digest));
      if (mine.length !== 3 || one.size !== 1) fail(`one seed did not open one match: seed ${SEED} gave digests ${mine.map(r => r.digest).join(', ')} with ${mine.map(r => r.draws).join(', ')} draws at kick off`);
      else ok(`one seed, one match, three times: seed ${SEED} gave digest ${mine[0].digest} in A, B and C (${mine[0].club} v ${mine[0].opponent})`);
      const counts = new Set(mine.map(r => r.draws));
      if (counts.size !== 1) fail(`the page did not draw the same number of times before kick off on one seed: ${mine.map(r => r.draws).join(', ')}`);
      else ok(`the page drew ${mine[0].draws} times before kick off in A, B and C`);
      const other = same(seedAt(1))[0];
      if (!other || one.has(other.digest)) fail(`another seed opened the same match: seed ${seedAt(1)} gave digest ${other ? other.digest : 'none'}, so the digest tells nothing apart`);
      else ok(`another seed, another match: seed ${seedAt(1)} gave digest ${other.digest}`);
      const idle = replays.filter(r => r.idle);
      if (idle.length) fail(`the page drew while nobody touched it (${idle.map(r => `${r.label} ${r.idle}`).join(', ')} draws in five idle seconds): a draw on a timer breaks a seed`);
      else ok('the page drew nothing in five idle seconds of any context (2.5 before the job, 2.5 into the match)');
    }
  } else {
  const phone = await seededContext(PHONE, seedAt(0));
  let page = await openPage(phone);
  const job = await takeJob(page);
  console.log(START ? `Back in the match at ${job.clubName}, from the file.` : `In the job at ${job.clubName}.`);
  if (!(await startLive(page))) throw new Error('the live viewer never opened');
  await holdIfSaved(page);

  section = 1;
  console.log('1) The goal in order');
  heldToSave(await opening(page, 'phone', seedAt(0)));
  /* The page settles its own reveal as the match opens; the reading is taken after that. */
  await page.waitForTimeout(1500);
  const yBefore = await page.evaluate(() => window.scrollY);
  const watched = await watchAGoal(page, { tapCard: true, onTick: goalShots(page, 'phone'), view: 'phone' });
  let frames = [];
  if (!watched) await noGoal(page, 'phone', 'sixteen halves passed without a goal that could be watched');
  else frames = judgeGoal(watched, { reduced: false }) ?? [];

  section = 4;
  console.log('4) Nothing moves the page');
  if (await runningMatch(page)) {
    const base = await page.evaluate(() => window.scrollY);
    judgeScroll(frames.length ? frames : [{ y: yBefore }], base, await openEachPanel(page));
  }
  else fail('no running match to open the panels on');

  section = 3;
  console.log(REPORT ? '3) The fit: measuring pass, nothing asserted' : '3) The fit');
  if (CONTROL === 'bar') {
    const count = await page.locator('[data-cm-live-controls]').count();
    if (count !== 1) throw new Error(`control bar: [data-cm-live-controls] matches ${count} nodes, so the control can not run`);
    await page.addStyleTag({ content: '[data-cm-live-controls]{transform:translateY(200px)!important}' });
    console.log('  Negative control: the control row is pushed 200 px down.');
  }
  for (const view of VIEWPORTS) {
    if (REPORT && (view.width === 768 || view.sideways)) continue;
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.waitForTimeout(600);
    if (!(await withRoom(page, 5))) { fail(`${view.name}: no running match to measure`); continue; }
    await page.waitForTimeout(400);
    const m = await measure(page);
    judgeFit(view, m);
    await shoot(page, `fit-${view.width}`);
    if (!REPORT && !CONTROL && view.width !== 390) {
      /* Printed, not asserted: there is no reading of these sizes from before match mode to hold them to. */
      const labels = await labelMean(page, 10);
      console.log(`  [labels ${view.name}] mean overlapping name labels a frame ${labels.mean.toFixed(2)} over ${labels.frames} frames of ${labels.labels} labels`);
    }
    if (view.width === 390) {
      const labels = await labelMean(page);
      console.log(`  [labels 390] mean overlapping name labels a frame ${labels.mean.toFixed(2)} over ${labels.frames} frames of ${labels.labels} labels; before match mode ${LABELS_BEFORE.mean} at ${LABELS_BEFORE.commit}${Number.isFinite(LABELS_BEFORE.mean) && LABELS_BEFORE.mean > 0 ? `, ratio ${(labels.mean / LABELS_BEFORE.mean).toFixed(2)}` : ''}`);
      if (!REPORT && !CONTROL) {
        if (!labels.frames) fail('no frame with name labels was measured');
        else if (Number.isFinite(LABELS_BEFORE.mean) && !(labels.mean < LABELS_BEFORE.mean)) fail(`name labels overlap ${labels.mean.toFixed(2)} a frame, not fewer than the ${LABELS_BEFORE.mean} before match mode`);
        else ok(`name labels overlap ${labels.mean.toFixed(2)} a frame, fewer than the ${LABELS_BEFORE.mean} before match mode`);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);

  section = 6;
  console.log('6) Back folds the match away');
  if (REPORT) console.log('  (not in the measuring pass: the build before match mode has no Back)');
  else await judgeBack(page);

  section = 5;
  console.log('5) The reload');
  if (CONTROL) console.log('  (skipped under a control)');
  else if (!(await runningMatch(page))) fail('no running match to leave');
  else {
    /* Somewhere past the 20th minute of a half, at 2x. */
    await speedTo(page, '4x');
    for (let i = 0; i < 300; i++) {
      const stage = await stageOf(page);
      if (stage !== 'first' && stage !== 'second') { await runningMatch(page); await speedTo(page, '4x'); continue; }
      const minute = await minuteOf(page);
      if ((stage === 'first' && minute >= 20 && minute <= 38) || (stage === 'second' && minute >= 66 && minute <= 83)) break;
      if ((stage === 'first' && minute > 38) || (stage === 'second' && minute > 83)) { await tap(page, /skip/i, 'skip on'); await page.waitForTimeout(600); continue; }
      await page.waitForTimeout(150);
    }
    await speedTo(page, '2x');
    await page.waitForTimeout(300);
    const resumeAt = async () => { await startLive(page); const r = await minuteOf(page); await tap(page, /^Pause$/i, 'pause'); return r; };
    /* by a reload */
    let m = await minuteOf(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await clearRoom(page);
    let onDisk = (await saved(page))?.live?.minute;
    let r = await resumeAt();
    if (!(r >= m - 1 && r <= m + 1)) fail(`reload: left at ${m}', the save holds ${onDisk}, the match came back at ${r}'`);
    else ok(`reload: left at ${m}', the save holds ${onDisk}, the match came back at ${r}'`);
    /* by closing the page, waiting for it to be gone before the next one opens */
    await tap(page, /^Resume$/i, 'resume');
    await page.waitForTimeout(1200);
    m = await minuteOf(page);
    const gone = page.waitForEvent('close');
    await page.close({ runBeforeUnload: true });
    await gone;
    page = await openPage(phone);
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(900);
    await clearRoom(page);
    onDisk = (await saved(page))?.live?.minute;
    r = await resumeAt();
    if (!(r >= m - 1 && r <= m + 1)) fail(`close: left at ${m}', the save holds ${onDisk}, the match came back at ${r}'`);
    else ok(`close: left at ${m}', the save holds ${onDisk}, the match came back at ${r}'`);
    /* by the tab going hidden */
    await tap(page, /^Resume$/i, 'resume');
    await page.waitForTimeout(1200);
    m = await minuteOf(page);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(200);
    onDisk = (await saved(page))?.live?.minute;
    if (!(onDisk >= m - 1 && onDisk <= m + 1)) fail(`hidden tab: the clock read ${m}' and the save holds ${onDisk}`);
    else ok(`hidden tab: the clock read ${m}' and the save holds ${onDisk}`);
  }
  errors.push(...page.errors);
  await phone.close();

  section = 2;
  console.log('2) Reduced motion');
  const calm = await seededContext({ ...PHONE, reducedMotion: 'reduce' }, seedAt(1));
  const still = await openPage(calm);
  await takeJob(still);
  if (!(await startLive(still))) fail('the live viewer never opened under reduced motion');
  else {
    await holdIfSaved(still);
    heldToSave(await opening(still, 'calm', seedAt(1)));
    /* Animations under the pitch (the card is inside it) that are running right now. */
    const moving = () => still.evaluate(() => {
      const pitch = document.querySelector('[data-cm-live-pitch]');
      const list = pitch ? pitch.getAnimations({ subtree: true }).filter(a => a.playState === 'running') : [];
      return { pitch: !!pitch, running: list.length, card: !!document.querySelector('[data-cm-goal-card]') };
    });
    const instants = [];
    instants.push({ when: 'in open play', ...await moving() });
    const calmGoal = await watchAGoal(still, { tapCard: false, view: 'calm', onTick: async () => { const now = await moving(); if (now.card && !instants.some(i => i.when === 'inside a goal')) instants.push({ when: 'inside a goal', ...now }); } });
    instants.push({ when: 'after the goal', ...await moving() });
    if (!calmGoal) await noGoal(still, 'calm', 'sixteen halves passed without a goal to watch under reduced motion');
    else {
      judgeGoal(calmGoal, { reduced: true });
      const busy = instants.filter(i => i.running > 0);
      if (!instants.some(i => i.when === 'inside a goal')) fail('no instant inside a goal was read under reduced motion');
      else if (instants.some(i => !i.pitch)) fail('the pitch was not on screen at one of the instants');
      else if (busy.length) fail(`animations were running under the pitch: ${busy.map(i => `${i.running} ${i.when}`).join(', ')}`);
      else ok(`nothing under the pitch or the card was animating ${instants.map(i => i.when).join(', ')}`);
    }
  }
  errors.push(...still.errors);
  await calm.close();

  section = 7;
  console.log('7) A wide screen');
  if (REPORT || CONTROL === 'bar') console.log('  (not in the measuring pass or under control bar)');
  else {
    const desk = await seededContext({ viewport: { width: 1280, height: 900 } }, seedAt(2));
    const wide = await openPage(desk);
    await takeJob(wide);
    if (!(await startLive(wide))) fail('the live viewer never opened at 1280 by 900');
    else {
      await holdIfSaved(wide);
      heldToSave(await opening(wide, 'wide', seedAt(2)));
      await wide.waitForTimeout(1200);
      if (CONTROL === 'silentlist') {
        const count = await wide.locator('[data-cm-live-log]').count();
        if (count !== 1) throw new Error(`control silentlist: [data-cm-live-log] matches ${count} nodes, so the control can not run`);
        await wide.evaluate(() => {
          window.__silenced = 0;
          const hush = () => {
            for (const li of document.querySelectorAll('[data-cm-live-log] li')) {
              const walk = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
              for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.includes('GOAL!')) { n.nodeValue = n.nodeValue.replaceAll('GOAL!', 'Scored.'); window.__silenced += 1; }
            }
          };
          hush();
          new MutationObserver(hush).observe(document.body, { subtree: true, childList: true, characterData: true });
        });
        console.log('  Negative control: every GOAL! in the list beside the pitch is rewritten as it is drawn.');
      }
      if (CONTROL === 'earlyscore') {
        const digits = await wide.locator('[data-cm-live-score] [data-cm-score-of="me"]').count();
        if (digits < 1) throw new Error('control earlyscore: the score has no digit for my side, so the control can not run');
        await wide.evaluate(() => {
          window.__tampered = 0;
          let done = false;
          /* Registered before the sampler, so on every frame it runs first. Only while the sampler is on:
             the goals played through on the way to the watched one are left alone. */
          const lead = () => {
            const pitch = document.querySelector('[data-cm-live-pitch]');
            const phase = pitch && pitch.getAttribute('data-cm-motion') === 'goal' ? pitch.getAttribute('data-cm-motion-phase') : null;
            if (!done && window.__fit && window.__fit.on && (phase === 'plant' || phase === 'flight')) {
              for (const digit of document.querySelectorAll('[data-cm-live-score] [data-cm-score-of="me"]')) { digit.textContent = String(Number(digit.textContent) + 1); window.__tampered += 1; }
              done = true;
            }
            requestAnimationFrame(lead);
          };
          requestAnimationFrame(lead);
        });
        console.log('  Negative control: my side of the score goes up by one as the watched goal is wound up.');
      }
      if (CONTROL === 'nocard') {
        const up = await wide.locator('[data-cm-goal-card]').count();
        if (up !== 0) throw new Error('control nocard: a scorer card is on screen before the watch starts, so the control can not run');
        await wide.evaluate(() => {
          window.__tampered = 0;
          const strip = () => {
            for (const card of document.querySelectorAll('[data-cm-goal-card]')) { card.removeAttribute('data-cm-goal-card'); if (window.__fit && window.__fit.on) window.__tampered += 1; }
          };
          new MutationObserver(strip).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cm-goal-card'] });
        });
        console.log('  Negative control: the scorer card loses its mark as the page draws it.');
      }
      const seen = await watchAGoal(wide, { tapCard: false, onTick: goalShots(wide, 'wide'), view: 'wide' });
      if (CONTROL === 'silentlist') silenced = await wide.evaluate(() => window.__silenced || 0).catch(() => 0);
      if (CONTROL === 'earlyscore' || CONTROL === 'nocard') tampered = await wide.evaluate(() => window.__tampered || 0).catch(() => 0);
      if (!seen) await noGoal(wide, 'wide', 'sixteen halves passed without a goal to watch at 1280 by 900');
      else judgeGoal(seen, { reduced: false, wide: true });
    }
    errors.push(...wide.errors);
    await desk.close();
  }
  }
} catch (e) {
  fail(`the walk stopped: ${e && e.message ? e.message : e}`);
  /* A walk that stops while a goal is being watched still hands back the half it was in. */
  dumpSave();
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
if (errors.length) { section = 0; fail(`page errors: ${[...new Set(errors)].slice(0, 3).join(' | ')}`); }

if (CONTROL === 'noseed') {
  /* Nothing else may be red: a walk that stopped before three matches opened did not prove the seed matters. */
  const digests = replays.map(r => r.digest);
  const asItMust = failures === 0 && replays.length === 3 && new Set(digests).size === 3;
  console.log(asItMust
    ? `playLiveMatchFit: control noseed turned the replay red on the line it must (with no seed, three contexts opened three different matches: ${digests.join(', ')}).`
    : `playLiveMatchFit: control noseed did NOT behave: ${failures} failure${failures === 1 ? '' : 's'} of its own, ${replays.length} of 3 matches opened, digests ${digests.join(', ') || 'none'}.`);
  process.exit(asItMust ? 1 : 3);
}
if (REPLAY) {
  const mine = replays.filter(r => r.seed === SEED);
  const other = replays.find(r => r.seed === seedAt(1));
  console.log(failures
    ? `playLiveMatchFit: the replay is RED, ${failures} failure${failures === 1 ? '' : 's'}.`
    : `playLiveMatchFit: the replay is green. Seed ${SEED} opened one match three times (digest ${mine[0].digest}, ${mine[0].draws} draws at kick off) and seed ${seedAt(1)} opened another (digest ${other.digest}); the page drew nothing while idle.`);
  process.exit(failures ? 1 : 0);
}
if (CONTROL === 'bar') {
  const asItMust = failed.has(3) && !failed.has(1) && !failed.has(2) && !failed.has(4);
  console.log(asItMust
    ? 'playLiveMatchFit: control bar turned section 3 red and left sections 1, 2 and 4 green, as it must.'
    : `playLiveMatchFit: control bar did NOT behave: red sections ${[...failed].sort().join(', ') || 'none'}.`);
  process.exit(asItMust ? 1 : 3);
}
if (CONTROL === 'silentlist') {
  const asItMust = neverSaid && silenced > 0 && failed.has(7) && failed.size === 1;
  console.log(asItMust
    ? `playLiveMatchFit: control silentlist turned section 7 red on the line it must (the list never said this goal, ${silenced} GOAL! rewritten) and left the rest green.`
    : `playLiveMatchFit: control silentlist did NOT behave: red sections ${[...failed].sort().join(', ') || 'none'}, never said ${neverSaid}, ${silenced} GOAL! rewritten.`);
  process.exit(asItMust ? 1 : 3);
}
if (CONTROL === 'earlyscore' || CONTROL === 'nocard') {
  const line = CONTROL === 'earlyscore' ? scoreLed : cardMissed;
  const what = CONTROL === 'earlyscore' ? 'the score changed before the ball was in' : 'no scorer card was ever on screen';
  const asItMust = line && tampered > 0 && failed.has(7) && failed.size === 1;
  console.log(asItMust
    ? `playLiveMatchFit: control ${CONTROL} turned section 7 red on the line it must (${what}, ${tampered} node${tampered === 1 ? '' : 's'} touched) and left the rest green.`
    : `playLiveMatchFit: control ${CONTROL} did NOT behave: red sections ${[...failed].sort().join(', ') || 'none'}, its own line fired ${line}, ${tampered} nodes touched.`);
  process.exit(asItMust ? 1 : 3);
}
console.log(failures
  ? `playLiveMatchFit: ${failures} failure${failures === 1 ? '' : 's'}.`
  : REPORT ? 'playLiveMatchFit: measuring pass done, sections 1, 2, 4 and 5 green, section 3 printed and not asserted.'
    : 'playLiveMatchFit: all green. The goal in order, reduced motion, the fit at five sizes, nothing moves the page, the reload, Back, a wide screen.');
process.exit(failures ? 1 : 0);
