#!/usr/bin/env node
/**
 * Round 1132: sound, in the browser, on the built site.
 *
 * scripts/simSound.mjs holds the kit to numbers against a fake audio graph.
 * This holds the same promises where a player would meet them, on dist as the
 * host serves it, with a real AudioContext counted by an instrument:
 *
 *    0  the built chunks: the kit is one chunk nothing imports statically
 *    1  off by default: no context, no start, no buzz, the kit never fetched
 *    2  the switch: on, off, on again, remembered, the page does not move
 *    3  awards night out loud, once, each tick on its row (and with a cold kit)
 *    4  never before a tap, and nothing late after it
 *    5  a hidden tab is silent
 *    6  the prerenderer constructs nothing
 *    7  reduced motion: silent until he turns it on, then the result alone
 *    8  the footer row and the header hold their shape with the switch in them
 *    9  no audio file is ever requested
 *   10  a kit that will not load never reloads the page
 *
 * Sections 2 and 8 run only when a switch is mounted, and print NOT RUN
 * otherwise. A sound may only follow a tap, so every "on" flow starts on the
 * home page and CLICKS through to Soccer Career (the router keeps the
 * document, so the page is tapped when the card mounts). Playwright's own
 * evaluate counts as a tap, so section 4 uses goto and a plain wait and proves
 * its hands stayed off with the activation samples.
 *
 * A context with no audio device may never move its clock, so nothing here
 * waits for a sound to END: every assertion is on a start() or stop() CALL.
 *
 * Negative controls, SOUND_GATE_CONTROL=<name>, planted in the JavaScript the
 * browser is SERVED (no rebuild). Each mutation must hit exactly once; with a
 * control on only the aimed section runs and the gate exits 0 only when the
 * aimed checks went red:
 *   eager      the switch's chunk makes a context as it loads         -> 1
 *   everytick  the once guard compares against nothing                -> 3
 *   nowait     the kit no longer waits for a tap                      -> 4
 *   nohide     the switch no longer checks for a hidden tab           -> 5
 *   reloadkit  the stale chunk guard no longer knows the kit          -> 10
 *   slowkit    a cold kit no longer takes its wait off the delay      -> 3
 *
 * Offline by construction: every context blocks the live database's host.
 * Run: npm run build, then ENGINES=chromium node scripts/playSoundGate.mjs
 * It takes several minutes: run it detached.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');
const PORT = Number(process.env.PORT || 4587);
const BASE = `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.SOUND_GATE_CONTROL ?? '';
const AIM = { eager: 1, everytick: 3, nowait: 4, nohide: 5, reloadkit: 10, slowkit: 3 };
if (CONTROL && !(CONTROL in AIM)) { console.error(`unknown SOUND_GATE_CONTROL ${CONTROL}. Known: ${Object.keys(AIM).join(', ')}`); process.exit(2); }
const ONLY = process.env.SOUND_GATE_ONLY ? process.env.SOUND_GATE_ONLY.split(',').map(Number) : null;
/** does this section run? With a control on, only the one it is aimed at. */
const runs = n => (CONTROL ? AIM[CONTROL] === n : !ONLY || ONLY.includes(n));

/** the checks a control is aimed at carry its tag: a control fires only when one of THOSE went red */
const AIM_TAG = { eager: 'off', everytick: 'once', nowait: 'notap', nohide: 'hidden', reloadkit: 'reload', slowkit: 'cold' };
let checks = 0, failed = 0, notRun = 0, section = -1, aimedRed = 0;
const check = (ok, label, tag = '') => {
  checks += 1;
  if (ok) console.log(`   ok   ${label}`);
  else { failed += 1; if (CONTROL && tag === AIM_TAG[CONTROL]) aimedRed += 1; console.log(`   FAIL ${label}`); }
  return ok;
};
const head = (n, title) => { section = n; console.log(`\n${n}) ${title}`); };
const skipped = (n, why) => { notRun += 1; console.log(`\n${n}) NOT RUN: ${why}`); };

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('dist/index.html is missing: run npm run build first. NOT CHECKED.'); process.exit(1); }
const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|weba|mid|midi)(\?.*)?$/i;
const jsFiles = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const textOf = f => fs.readFileSync(path.join(ASSETS, f), 'utf8');
const holding = re => jsFiles.filter(f => re.test(textOf(f)));
const KIT = holding(/dukb-synth-kit-1/);
const SWITCH = holding(/["'`]dukb-sound["'`]/);
if (KIT.length !== 1 || SWITCH.length !== 1) {
  console.log(`expected one kit chunk and one switch chunk in dist/assets, found ${KIT.length} and ${SWITCH.length} (${[...KIT, ...SWITCH].join(', ')}). NOT CHECKED.`);
  process.exit(1);
}
const KIT_CHUNK = KIT[0], SWITCH_CHUNK = SWITCH[0];
const kitText = textOf(KIT_CHUNK), switchText = textOf(SWITCH_CHUNK);

/* ---------- 0. the built chunks ----------
   MEASURED on a GitHub runner, 2026-10-08: the kit chunk is 5,318 bytes, 2,424 gzipped, with the switch in the
   entry chunk (the footer and the header mount it). Built with NO switch mounted, the switch's only home is the
   Soccer Career chunk, the bundler lists that chunk's own imports at the top of the kit chunk, and it measured
   6,853 bytes, 3,172 gzipped: the same code under a longer import list. So a build that drops both mounts goes
   red on the cap here, and the answer then is the measurement, not a raised cap. */
if (runs(0)) {
  head(0, 'The built chunks');
  const gz = zlib.gzipSync(Buffer.from(kitText)).length;
  check(KIT_CHUNK.startsWith('soundKit-') && gz <= 3000, `the kit is one chunk, ${KIT_CHUNK}: ${kitText.length} bytes, ${gz} gzipped (named soundKit-, at most 3,000 gzipped)`);
  check(true, `the switch lives in ${SWITCH_CHUNK}`);
  check(!fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').includes(KIT_CHUNK), 'dist/index.html does not name the kit chunk');
  const name = KIT_CHUNK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const staticRe = new RegExp(`(?:from|import)\\s*["']\\./${name}["']`);
  const importers = jsFiles.filter(f => f !== KIT_CHUNK && staticRe.test(textOf(f)));
  check(importers.length === 0, `no chunk imports the kit statically${importers.length ? `: FOUND ${importers.join(', ')}` : ''}`);
  const dynamic = jsFiles.filter(f => f !== KIT_CHUNK && textOf(f).includes(`import("./${KIT_CHUNK}")`));
  check(dynamic.length === 1 && dynamic[0] === SWITCH_CHUNK, `the one dynamic import of the kit is in the switch's chunk (${dynamic.join(', ') || 'none found'})`);
  const audio = [];
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (AUDIO_EXT.test(e.name)) audio.push(path.relative(DIST, p)); } })(DIST);
  check(audio.length === 0, `no audio file anywhere in dist${audio.length ? `: FOUND ${audio.slice(0, 4).join(', ')}` : ''}`);
}

/* ---------- the cues, by buffer length, read from the kit itself ---------- */
const require = createRequire(path.join(ROOT, 'package.json'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `playSoundGate-${process.pid}-`));
await require('esbuild').build({
  entryPoints: [path.join(ROOT, 'src/lib/soundKit.ts')], bundle: true, format: 'esm', platform: 'node',
  outfile: path.join(TMP, 'kit.mjs'), logLevel: 'error',
});
const kitModule = await import(pathToFileURL(path.join(TMP, 'kit.mjs')).href);
const LEN = Object.fromEntries(Object.entries(kitModule.CUES).map(([name, cue]) => [name, Math.round(cue.seconds * kitModule.SAMPLE_RATE)]));
const cueOf = len => Object.keys(LEN).find(name => LEN[name] === len) ?? `unknown(${len})`;
console.log(`cues by length: ${Object.entries(LEN).map(([k, v]) => `${k} ${v}`).join(', ')}`);

/* ---------- saves the game itself would write ----------
   Seeded careers, stepped the way the page steps them, stopped the moment an awards night is waiting: one he
   wins, one on the podium, one where he is anything else. Never edited by hand: if the engine will not produce
   one inside 400 careers, this fails and says so. */
const { soccer } = await bundleAwardsNight(ROOT);
const CLUBS = soccer.FALLBACK_CLUBS;
const PODIUM = soccer.SOCCER_BALLON_DOR.award.podiumSize;
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
let careers = 0;
for (let c = 0; c < 400 && Object.keys(SAVES).length < 3; c += 1) {
  careers = c + 1;
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1132);
  try {
    const o = 74 + (c % 14);
    let s = soccer.initCareer(`Sound ${c}`, 'England', ['ST', 'CM', 'LW', 'CB'][c % 4], '2010-14', abil(o), o, 2010, CLUBS, null, 96);
    for (let g = 0; g < 600 && s && !s.retired; g += 1) {
      const night = s.phase === 'ballon_dor' ? s.pendingBallonDor : null;
      if (night && !night.speech) {
        const kind = night.playerRank === 1 ? 'win' : night.playerNominated && night.playerRank !== null && night.playerRank <= PODIUM ? 'podium' : 'out';
        if (!SAVES[kind]) SAVES[kind] = { json: JSON.stringify(s), n: night.nominees.length, year: night.year, rank: night.playerRank };
      }
      s = step(s);
    }
  } finally { Math.random = real; }
}
console.log(`saves after ${careers} seeded careers: ${Object.entries(SAVES).map(([k, v]) => `${k} (a list of ${v.n}, ${v.year}, placed ${v.rank ?? 'nowhere'})`).join('; ')}`);
if (!SAVES.win || !SAVES.podium || !SAVES.out) {
  console.log(`the engine did not produce ${['win', 'podium', 'out'].filter(k => !SAVES[k]).join(' and ')} inside ${careers} careers. NOT CHECKED: no save is edited by hand.`);
  process.exit(1);
}

/* ---------- what a control changes in the code the browser is served ---------- */
/** file name -> the text served in its place. Every mutation must land exactly once across the build. */
const SERVED = {};
function mutate(what, re, to, only = null) {
  const hit = (only ? [only] : jsFiles).filter(f => (textOf(f).match(re) ?? []).length > 0);
  const count = hit.reduce((a, f) => a + textOf(f).match(re).length, 0);
  if (count !== 1) {
    console.log(`control ${CONTROL}: CANNOT BE PLANTED, ${what} appears ${count} times in ${only ?? 'the built chunks'} (${hit.join(', ') || 'nowhere'})`);
    for (const f of hit.slice(0, 2)) { const t = textOf(f), at = t.search(re); console.log(`   ${f}: ...${t.slice(Math.max(0, at - 80), at + 120)}...`); }
    process.exit(1);
  }
  const before = SERVED[hit[0]] ?? textOf(hit[0]);
  SERVED[hit[0]] = before.replace(re, to);
  if (SERVED[hit[0]] === before) { console.log(`control ${CONTROL}: CANNOT BE PLANTED, replacing ${what} changed nothing`); process.exit(1); }
  console.log(`CONTROL ${CONTROL}: ${what}, one hit in ${hit[0]}`);
}
const flag = re => new RegExp(re.source, 'g');
if (CONTROL === 'eager') {
  SERVED[SWITCH_CHUNK] = `try{new (window.AudioContext||window.webkitAudioContext)()}catch(e){}\n${switchText}`;
  console.log(`CONTROL eager: ${SWITCH_CHUNK} makes a context as it loads`);
}
if (CONTROL === 'everytick') mutate('the once guard', flag(/\.current\.playedKey===\w+/), '.current.playedKey===0');
if (CONTROL === 'nowait') mutate('the wait for a tap', flag(/(\w+)\?\1\.hasBeenActive:\w+/), '!0', KIT_CHUNK);
if (CONTROL === 'nohide') mutate('the hidden tab test', flag(/(if\(\w+\(\))\|\|document\.visibilityState==="hidden"(\)return)/), '$1$2', SWITCH_CHUNK);
if (CONTROL === 'reloadkit') mutate("the stale chunk guard's name for the kit", flag(/\\\/soundKit-\[\\w-\]\+\\\.js/), '\\/nosuchKit-[\\w-]+\\.js');
if (CONTROL === 'slowkit') mutate('the wait taken off a delay', flag(/-\(performance\.now\(\)-\w+\)\/1e3/), '', KIT_CHUNK);

/* ---------- the served site and the instrument ---------- */
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server', '--mute-audio'] });
const stop = code => { try { server.kill(); } catch { /* gone */ } try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* scratch */ } process.exit(code); };

/* what this machine's headless Chromium does with a context made after a tap: printed, never asserted, so a
   red further down can be told from a browser with no audio at all */
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent('<button id="b" style="width:200px;height:60px">tap</button>');
  await page.click('#b');
  const r = await page.evaluate(async () => {
    const c = new AudioContext();
    const s0 = c.state, t0 = performance.now();
    const woke = await Promise.race([c.resume().then(() => 'resolved'), new Promise(done => setTimeout(() => done('still pending after 800 ms'), 800))]);
    const ms = Math.round(performance.now() - t0);
    await new Promise(done => setTimeout(done, 300));
    return { s0, woke, ms, s1: c.state, clock: Number(c.currentTime.toFixed(2)) };
  });
  console.log(`this Chromium, a context made after a tap: ${r.s0} at first, resume ${r.woke} in ${r.ms} ms, then ${r.s1}, its clock at ${r.clock} s after 0.3 s`);
  await ctx.close();
}

/** Runs in the page before any of its code: counts what the audio graph is asked to do. */
function instrument([save, pref, prerender, seed, n]) {
  let t = seed >>> 0;
  Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const snd = { made: 0, state0: null, starts: [], stops: 0, suspends: 0, resumes: 0, buzz: [], ua: [], mountAt: 0 };
  window.__snd = snd;
  const Real = window.AudioContext || window.webkitAudioContext;
  if (Real) {
    class Counted extends Real {
      constructor(...a) { super(...a); snd.made += 1; snd.state0 = this.state; }
      createBufferSource() {
        const src = super.createBufferSource(), ctx = this;
        const start = src.start.bind(src), halt = src.stop.bind(src);
        src.start = (when = 0, ...rest) => { snd.starts.push({ when, delay: when - ctx.currentTime, len: src.buffer ? src.buffer.length : -1, at: performance.now() }); return start(when, ...rest); };
        src.stop = (...a) => { snd.stops += 1; return halt(...a); };
        return src;
      }
      suspend() { snd.suspends += 1; return super.suspend(); }
      resume() { snd.resumes += 1; return super.resume(); }
    }
    window.AudioContext = Counted;
    if (window.webkitAudioContext) window.webkitAudioContext = Counted;
  }
  try { Navigator.prototype.vibrate = function vibrate(p) { snd.buzz.push(Array.isArray(p) ? p.slice() : [p]); return true; }; } catch { /* a browser with no buzz */ }
  setInterval(() => { snd.ua.push(!!(navigator.userActivation && navigator.userActivation.hasBeenActive)); }, 100);
  /* the clock the card's countdown runs on: the first frame after its rows entered the document, which is
     when their CSS animations start counting their delays */
  let seen = false;
  new MutationObserver(() => {
    if (seen || n <= 0 || document.querySelectorAll('.cm-tick-in').length < n) return;
    seen = true;
    requestAnimationFrame(ts => { snd.mountAt = ts; });
    if (window.__cardMounted) window.__cardMounted();
  }).observe(document, { childList: true, subtree: true });
  try {
    if (!sessionStorage.getItem('sound-gate')) {
      sessionStorage.setItem('sound-gate', '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (save) localStorage.setItem('soccerCareerSave', save);
      if (pref) localStorage.setItem('dukb-sound', pref);
    }
  } catch { /* private mode */ }
  if (prerender) window.__DUKB_PRERENDER__ = true;
}

const everyMedia = [];
/** A context: the instrument in, the live database out, the kit chunk served, held or refused as asked. */
async function open({ save = null, pref = null, width = 1280, height = 900, reduced = false, prerender = false, kit = 'serve', holdMs = 400 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(instrument, [save?.json ?? null, pref, prerender, 1132, save?.n ?? 0]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  let release = () => {};
  const released = new Promise(r => { release = r; });
  /* a held kit is let go by the PAGE, holdMs after it saw the card's rows, so the hold is on the card's clock.
     Only a flow that holds the kit gets the binding: answering a binding call is sent with a gesture, like an
     evaluate, and it tapped the page in section 4's first run on a runner (106 of 110 samples true). */
  if (kit === 'hold') await ctx.exposeFunction('__cardMounted', () => { setTimeout(release, holdMs); });
  const js = [], errors = [];
  let loads = 0;
  await ctx.route('**/assets/*.js', async route => {
    const name = route.request().url().split('/').pop().split('?')[0];
    if (name === KIT_CHUNK && kit === 'refuse') return route.abort();
    if (name === KIT_CHUNK && kit === 'hold') await released;
    if (SERVED[name]) return route.fulfill({ status: 200, contentType: 'application/javascript', body: SERVED[name] });
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/assets/') && u.split('?')[0].endsWith('.js')) js.push(u.split('/').pop().split('?')[0]);
    if (r.resourceType() === 'media' || AUDIO_EXT.test(u.split('#')[0])) everyMedia.push(u);
  });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  page.on('load', () => { loads += 1; });
  return { ctx, page, js, errors, loads: () => loads, release, kitAsked: () => js.filter(f => f === KIT_CHUNK).length };
}
const read = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__snd)));
const settle = async page => {
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 40, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
};
const names = starts => starts.map(s => cueOf(s.len));
const count = (starts, cue) => starts.filter(s => cueOf(s.len) === cue).length;
const waitOut = n => Math.round((0.75 + n * 0.22 + 2) * 1000);

/** The card with a real tap behind it: the home page, then a CLICK on its Soccer Career link (the router keeps the document). */
async function clickThrough(o, save) {
  for (const from of ['/', '/soccer']) {
    await o.page.goto(`${BASE}${from}`, { waitUntil: 'load', timeout: 60000 });
    await settle(o.page);
    const link = o.page.locator('a[href="/soccer-career"]:visible').first();
    if (!(await link.count())) continue;
    await link.click();
    const there = await o.page.waitForFunction(n => document.querySelectorAll('.cm-tick-in').length >= n, save.n, { timeout: 40000 }).then(() => true, () => false);
    return { from, there, loads: o.loads() };
  }
  return { from: null, there: false, loads: o.loads() };
}
const SIZES = [[390, 844], [1280, 900]];

/* which switches does the built site mount? Read from the page, not assumed. */
const MOUNTED = await (async () => {
  const o = await open({});
  await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await settle(o.page);
  const found = await o.page.evaluate(() => ({
    footer: !!document.querySelector('footer [data-sound-toggle="text"]'),
    header: !!document.querySelector('header [data-sound-toggle="icon"]'),
  }));
  await o.ctx.close();
  return found;
})();
console.log(`switches mounted: footer ${MOUNTED.footer ? 'yes' : 'no'}, header ${MOUNTED.header ? 'yes' : 'no'}`);

/* ---------- 1. off by default ---------- */
if (runs(1)) {
  head(1, 'Off by default');
  for (const [width, height] of SIZES) {
    for (const route of ['/', '/club-manager']) {
      const o = await open({ width, height });
      await o.page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 });
      await settle(o.page);
      await o.page.mouse.click(5, 5);
      await o.page.waitForTimeout(1200);
      const s = await read(o.page);
      check(s.made === 0 && s.starts.length === 0 && s.buzz.length === 0 && o.kitAsked() === 0,
        `${route} at ${width}: contexts ${s.made}, starts ${s.starts.length}, buzzes ${s.buzz.length}, the kit chunk requested ${o.kitAsked()} times (tapped: ${s.ua.includes(true)})`, 'off');
      await o.ctx.close();
    }
    const save = SAVES.win;
    const o = await open({ width, height, save });
    await o.page.goto(`${BASE}/soccer-career`, { waitUntil: 'load', timeout: 60000 });
    const there = await o.page.waitForFunction(n => document.querySelectorAll('.cm-tick-in').length >= n, save.n, { timeout: 40000 }).then(() => true, () => false);
    await o.page.waitForTimeout(waitOut(save.n));
    const speech = o.page.locator('.cm-rise-gated button').first();
    const spoke = (await speech.count()) > 0;
    if (spoke) await speech.click();
    await o.page.waitForTimeout(1000);
    const s = await read(o.page);
    check(there && spoke, `/soccer-career at ${width}: the winner's night was on screen (${save.n} names) and a speech was given`);
    check(s.made === 0 && s.starts.length === 0 && s.buzz.length === 0 && o.kitAsked() === 0,
      `/soccer-career at ${width}, the whole night and a speech: contexts ${s.made}, starts ${s.starts.length}, buzzes ${s.buzz.length}, the kit chunk requested ${o.kitAsked()} times (tapped: ${s.ua.includes(true)})`, 'off');
    check(o.errors.length === 0, `/soccer-career at ${width}: no page error${o.errors.length ? `: ${o.errors[0]}` : ''}`);
    await o.ctx.close();
  }
}

/* ---------- 2. the switch ---------- */
const FOOT = 'footer [data-sound-toggle="text"]';
if (runs(2) && !MOUNTED.footer) skipped(2, 'no switch is mounted in the footer');
if (runs(2) && MOUNTED.footer) {
  head(2, 'The switch');
  for (const [width, height] of SIZES) {
    const o = await open({ width, height, save: SAVES.out });
    await o.page.goto(`${BASE}/soccer-career`, { waitUntil: 'load', timeout: 60000 });
    await settle(o.page);
    const sw = o.page.locator(FOOT);
    await sw.scrollIntoViewIfNeeded();
    await o.page.waitForTimeout(400);
    const look = () => o.page.evaluate(sel => {
      const b = document.querySelector(sel);
      return { text: b.textContent.trim(), pressed: b.getAttribute('aria-pressed'), stored: localStorage.getItem('dukb-sound'), y: window.scrollY, snd: JSON.parse(JSON.stringify(window.__snd)) };
    }, FOOT);
    /* press it where it is: a click that had to scroll first would hide a page that jumps */
    const press = async () => { const before = await look(); await sw.click(); await o.page.waitForTimeout(900); const after = await look(); return { before, after, still: before.y === after.y }; };
    const at = `at ${width}`;
    const first = await look();
    check(first.text === 'Sound: off' && first.pressed === 'false' && first.snd.made === 0 && o.kitAsked() === 0, `${at}: it reads "${first.text}", pressed ${first.pressed}, contexts ${first.snd.made}, the kit chunk requested ${o.kitAsked()} times`);
    const on = await press();
    check(on.after.text === 'Sound: on' && on.after.pressed === 'true' && on.after.stored === 'on', `${at}, a press: "${on.after.text}", pressed ${on.after.pressed}, stored ${on.after.stored}`);
    check(o.kitAsked() === 1 && on.after.snd.made === 1 && on.after.snd.starts.length === 1 && cueOf(on.after.snd.starts[0]?.len) === 'tick',
      `${at}, a press: the kit chunk requested ${o.kitAsked()} time, ${on.after.snd.made} context, ${on.after.snd.starts.length} start (${names(on.after.snd.starts).join(', ')}): one tick says it worked`);
    const off = await press();
    check(off.after.text === 'Sound: off' && off.after.stored === 'off' && off.after.snd.starts.length === 1 && off.after.snd.suspends >= 1, `${at}, a second press: "${off.after.text}", stored ${off.after.stored}, ${off.after.snd.starts.length - 1} new starts, ${off.after.snd.suspends} suspend`);
    const again = await press();
    check(again.after.text === 'Sound: on' && again.after.snd.made === 1 && again.after.snd.starts.length === 2 && cueOf(again.after.snd.starts[1]?.len) === 'tick' && o.kitAsked() === 1,
      `${at}, a third press: "${again.after.text}", still ${again.after.snd.made} context, ${again.after.snd.starts.length - 1} more tick, the kit chunk still requested once`);
    check(on.still && off.still && again.still, `${at}: the page did not move under any press (scrollY ${on.before.y}, ${on.after.y}, ${off.after.y}, ${again.after.y})`);
    /* a reload: remembered, and silent until he taps. Hands off until the one read. */
    await o.page.reload({ waitUntil: 'load', timeout: 60000 });
    await o.page.waitForTimeout(5000);
    const back = await look();
    check(back.text === 'Sound: on' && back.pressed === 'true', `${at}, a reload: it still reads "${back.text}"`);
    check(back.snd.made === 0 && back.snd.starts.length === 0, `${at}, a reload: contexts ${back.snd.made}, starts ${back.snd.starts.length} before any tap (untouched: ${back.snd.ua.every(v => v === false)})`);
    check(o.kitAsked() === 2, `${at}, a reload: the kit chunk asked for once more (${o.kitAsked() - 1}), ready for his first tap`);
    check(o.errors.length === 0, `${at}: no page error${o.errors.length ? `: ${o.errors[0]}` : ''}`);
    await o.ctx.close();
  }
}

/* ---------- 8. the footer row and the header hold ---------- */
if (runs(8) && !MOUNTED.footer && !MOUNTED.header) skipped(8, 'no switch is mounted');
if (runs(8) && (MOUNTED.footer || MOUNTED.header)) {
  head(8, 'The footer row and the header hold their shape');
  /** boxes: the switch, its row's other children, the footer; and whether the switch's words sit on one line */
  const shape = (page, sel) => page.evaluate(s => {
    const b = document.querySelector(s);
    if (!b) return null;
    const box = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const range = document.createRange();
    range.selectNodeContents(b);
    const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
    const row = b.parentElement, me = box(b), foot = b.closest('footer, header');
    const overlaps = [...row.children].filter(c => c !== b).map(box).filter(o => o.w > 0 && o.x < me.r - 0.5 && o.r > me.x + 0.5 && o.y < me.b - 0.5 && o.b > me.y + 0.5).length;
    return { me, row: box(row), holder: box(foot), lines, overlaps, wide: document.documentElement.scrollWidth, inner: window.innerWidth, shown: getComputedStyle(b).display !== 'none' && me.w > 0 };
  }, sel);
  if (MOUNTED.footer) {
    for (const [width, height] of [[320, 700], [390, 844], [1280, 900]]) {
      for (const route of ['/', '/soccer-career']) {
        const o = await open({ width, height });
        await o.page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 });
        await settle(o.page);
        const sw = o.page.locator(FOOT);
        await sw.scrollIntoViewIfNeeded();
        const offShape = await shape(o.page, FOOT);
        await sw.click(); await o.page.waitForTimeout(500);
        const onShape = await shape(o.page, FOOT);
        const at = `${route} at ${width}`;
        check(offShape.wide <= offShape.inner && onShape.wide <= onShape.inner, `${at}: the page is no wider than the screen (${onShape.wide} of ${onShape.inner})`);
        check(offShape.me.x >= offShape.row.x - 0.5 && offShape.me.r <= offShape.row.r + 0.5 && offShape.overlaps === 0 && onShape.overlaps === 0, `${at}: the switch sits inside the footer's link row and on no neighbour`);
        check(offShape.lines === 1 && onShape.lines === 1, `${at}: its words sit on one line, off and on (${offShape.lines}, ${onShape.lines})`);
        check(offShape.me.w === onShape.me.w && offShape.holder.h === onShape.holder.h, `${at}: one width (${offShape.me.w} px, then ${onShape.me.w}) and one footer height (${offShape.holder.h} px, then ${onShape.holder.h}) whichever it says`);
        await o.ctx.close();
      }
    }
  }
  if (MOUNTED.header) {
    const HEAD = 'header [data-sound-toggle="icon"]';
    const heights = {};
    for (const [width, height] of [[320, 700], [390, 844], [640, 800], [1280, 900]]) {
      const o = await open({ width, height });
      await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
      await settle(o.page);
      const h = await shape(o.page, HEAD);
      heights[width] = h.holder.h;
      const at = `the home page at ${width}`;
      check(h.wide <= h.inner, `${at}: no wider than the screen (${h.wide} of ${h.inner})`);
      if (width < 640) check(!h.shown, `${at}: the header's switch is not shown (a phone has no room for it, the footer has one)`);
      else check(h.shown && h.me.w >= 44 && h.me.h >= 44 && h.overlaps === 0 && h.me.y >= h.holder.y - 0.5 && h.me.b <= h.holder.b + 0.5,
        `${at}: the header's switch is a ${h.me.w} by ${h.me.h} px target inside the bar, on no neighbour`);
      await o.ctx.close();
    }
    check(new Set(Object.values(heights)).size === 1, `the bar is one height with and without the switch (${Object.entries(heights).map(([w, h]) => `${h} px at ${w}`).join(', ')})`);
  }
}

/* ---------- 3. awards night out loud, once ----------
   MEASURED on a GitHub runner, 2026-10-08, six runs of this section (five of them three at a time on one
   machine), thirty nights in all, a cold kit among them every run:
     the first tick, on the CARD's clock (the frame its rows entered on, where their CSS delays start counting),
       landed 598 to 643 ms after the rows; its row's own delay is 600. So 2 ms early to 43 ms late, and the
       lateness is the frame the card took to paint before React ran the effect that asks for the sound.
     a tick against its own slot, counted from the first tick: 3 to 19 ms off. That is not drift: the plan asks
       for every sound against one audio clock, and a browser moves that clock a buffer at a time, so two asks
       a millisecond apart can read it a buffer apart.
   FIRST_TICK_TOL is about three times the worst lateness seen and half a step of the countdown (220 ms); the
   slowkit control lands 300 ms late or more, so it stays red by a wide margin. SLOT_TOL is two and a half
   times the most a tick was seen off its slot. The step itself is held tighter, measured across the whole
   countdown, where one buffer's error is shared between nine steps. */
const FIRST_TICK_TOL = 0.12, SLOT_TOL = 0.05, STEP_TOL = 0.01;
const STEP = 0.22, FIRST = 0.6;
/** what one night sounded like: its ticks in order, the sting, the crowd, and where the first tick landed */
function heard(s) {
  const ticks = s.starts.filter(x => cueOf(x.len) === 'tick').sort((a, b) => a.when - b.when);
  const sting = s.starts.find(x => cueOf(x.len) === 'sting'), crowd = s.starts.find(x => cueOf(x.len) === 'crowd');
  const first = ticks[0];
  /* the first tick on the card's clock: when it was scheduled, plus how far ahead */
  const landed = first && s.mountAt ? (first.at - s.mountAt) / 1000 + first.delay : NaN;
  const offSlot = ticks.filter((t, k) => Math.abs(t.when - ticks[0].when - k * STEP) > SLOT_TOL).length;
  const step = ticks.length > 1 ? (ticks[ticks.length - 1].when - ticks[0].when) / (ticks.length - 1) : NaN;
  return { ticks, sting, crowd, landed, offSlot, step, other: s.starts.length - ticks.length - (sting ? 1 : 0) - (crowd ? 1 : 0) };
}
const ms = x => (Number.isFinite(x) ? `${Math.round(x * 1000)} ms` : 'not measured');
async function night(kind, width, height, { cold = false } = {}) {
  const save = SAVES[kind], n = save.n, tag = cold ? 'cold' : '';
  const o = await open({ width, height, save, pref: 'on', kit: cold ? 'hold' : 'serve', holdMs: 300 });
  const through = await clickThrough(o, save);
  await o.page.waitForTimeout(waitOut(n) + 500);
  const s = await read(o.page), h = heard(s);
  const what = `${kind} at ${width}${cold ? ', a cold kit (held 300 ms past the card)' : ''}`;
  check(through.there && through.loads === 1, `${what}: clicked through from ${through.from} without leaving the document, the night on screen (${n} names)`);
  const want = { win: [n, 1, 1], podium: [n, 1, 0], out: [n, 0, 0] }[kind];
  check(h.ticks.length === want[0] && (h.sting ? 1 : 0) === want[1] && (h.crowd ? 1 : 0) === want[2] && h.other === 0,
    `${what}: ${h.ticks.length} ticks, ${h.sting ? 1 : 0} sting, ${h.crowd ? 1 : 0} crowd, ${h.other} other (wanted ${want.join(', ')}, 0): ${names(s.starts).join(' ')}`, tag);
  check(Math.abs(h.landed - FIRST) <= FIRST_TICK_TOL, `${what}: the first tick lands ${ms(h.landed)} after the rows appear (the row's own delay is 600 ms, within ${FIRST_TICK_TOL * 1000})`, tag);
  check(Math.abs(h.step - STEP) <= STEP_TOL, `${what}: a tick every ${Number.isFinite(h.step) ? (h.step * 1000).toFixed(1) : '?'} ms across the countdown (the rows: 220, within ${STEP_TOL * 1000})`, tag);
  check(h.ticks.length > 1 && h.offSlot === 0, `${what}: ${h.offSlot} ticks more than ${SLOT_TOL * 1000} ms off their own slot`, tag);
  if (want[1]) {
    const gap = h.sting && h.ticks[0] ? h.sting.when - h.ticks[0].when : NaN, wantGap = 0.75 + n * STEP + 0.24 - FIRST;
    check(Math.abs(gap - wantGap) <= SLOT_TOL, `${what}: the sting starts ${ms(gap)} after the first tick, as the headline lands (wanted ${ms(wantGap)})`, tag);
  }
  if (want[2]) check(Math.abs(h.crowd.when - h.sting.when - 0.3) <= 0.005, `${what}: the crowd swells ${ms(h.crowd.when - h.sting.when)} after the sting (300 ms)`);
  const wantBuzz = kind === 'win' ? '[[30,40,30]]' : '[]';
  check(JSON.stringify(s.buzz) === wantBuzz, `${what}: buzz ${JSON.stringify(s.buzz)} (wanted ${wantBuzz})`);
  if (!cold) {
    /* once: nothing more on its own, and nothing more when the card re-renders with his speech */
    await o.page.waitForTimeout(2000);
    const later = await read(o.page);
    check(later.starts.length === s.starts.length, `${what}: 2 s later, ${later.starts.length - s.starts.length} new starts`, 'once');
    if (kind === 'win') {
      const speech = o.page.locator('.cm-rise-gated button').first();
      const can = (await speech.count()) > 0;
      if (can) await speech.click();
      await o.page.waitForTimeout(1500);
      const spoken = await o.page.evaluate(() => !!document.querySelector('[data-spoken-speech]'));
      const after = await read(o.page);
      check(can && spoken, `${what}: he gave a speech and the card shows it`);
      check(after.starts.length === s.starts.length, `${what}: the speech re-rendered the card and brought ${after.starts.length - s.starts.length} new starts`, 'once');
      check(after.made === 1, `${what}: ${after.made} context throughout`, 'once');
    }
  }
  check(o.errors.length === 0, `${what}: no page error${o.errors.length ? `: ${o.errors[0]}` : ''}`);
  await o.ctx.close();
  return h.landed;
}
if (runs(3)) {
  head(3, 'Awards night out loud, once');
  const landed = [];
  for (const [width, height] of SIZES) landed.push(await night('win', width, height));
  landed.push(await night('podium', 1280, 900));
  landed.push(await night('out', 1280, 900));
  landed.push(await night('win', 1280, 900, { cold: true }));
  console.log(`   first tick, measured this run: ${landed.map(ms).join(', ')} (its row: 600 ms)`);
}

/* ---------- 4. never before a tap ---------- */
if (runs(4)) {
  head(4, 'Never before a tap');
  const save = SAVES.win;
  const o = await open({ save, pref: 'on' });
  await o.page.goto(`${BASE}/soccer-career`, { waitUntil: 'load', timeout: 60000 });
  /* hands off: no evaluate, no locator, nothing that Playwright sends with a gesture */
  await o.page.waitForTimeout(6000 + waitOut(save.n));
  const s = await o.page.evaluate(() => ({ ...JSON.parse(JSON.stringify(window.__snd)), rows: document.querySelectorAll('.cm-tick-in').length }));
  const untouched = s.ua.length > 20 && s.ua.every(v => v === false);
  if (!untouched) console.log(`   NOT CHECKED: the walk itself tapped the page (${s.ua.filter(Boolean).length} of ${s.ua.length} activation samples were true)`);
  check(untouched, `the page was never tapped: ${s.ua.length} activation samples, all false`);
  check(s.rows >= save.n, `the winner's night was on screen the whole time (${s.rows} rows)`);
  check(s.made === 0, `contexts made with no tap: ${s.made}`, 'notap');
  check(s.starts.length === 0, `starts with no tap: ${s.starts.length}`, 'notap');
  await o.page.mouse.click(5, 5);
  await o.page.waitForTimeout(1500);
  const after = await read(o.page);
  check(after.starts.length === 0, `then one real click on empty space: ${after.starts.length} starts 1.5 s later (the countdown he missed is not played late)`, 'notap');
  await o.ctx.close();
}

/* ---------- 5. a hidden tab ---------- */
const setVisibility = (page, state) => page.evaluate(v => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  document.dispatchEvent(new Event('visibilitychange'));
}, state);
if (runs(5)) {
  head(5, 'A hidden tab is silent');
  const save = SAVES.win;
  const o = await open({ save, pref: 'on' });
  await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await settle(o.page);
  /* a headless page hides the only way it can: the moment the plan is scheduled (its first tick still 0.6 s
     away) the page itself says it is hidden and tells its listeners */
  await o.page.evaluate(() => {
    const t = setInterval(() => {
      if (!window.__snd.starts.length) return;
      clearInterval(t);
      window.__snd.hidAt = performance.now();
      window.__snd.startsWhenHidden = window.__snd.starts.length;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, 10);
  });
  await o.page.locator('a[href="/soccer-career"]:visible').first().click();
  await o.page.waitForFunction(() => window.__snd.hidAt > 0, null, { timeout: 40000 }).catch(() => {});
  await o.page.waitForTimeout(600);
  const s = await read(o.page);
  check(s.hidAt > 0 && s.starts.length === save.n + 2, `the night was scheduled (${s.starts.length} starts) and the tab hid ${s.starts[0] ? Math.round(s.hidAt - s.starts[0].at) : '?'} ms later, before the first tick was due`);
  check(s.stops === s.starts.length, `hidden: ${s.stops} stops for ${s.starts.length} starts (every source cancelled, nothing had sounded)`);
  check(s.suspends >= 1, `hidden: the context was put to rest (${s.suspends} suspend)`);
  /* still hidden, the card mounts again */
  await o.page.evaluate(() => history.back());
  const left = await o.page.waitForFunction(() => document.querySelectorAll('.cm-tick-in').length === 0, null, { timeout: 15000 }).then(() => true, () => false);
  await o.page.evaluate(() => history.forward());
  const back = await o.page.waitForFunction(n => document.querySelectorAll('.cm-tick-in').length >= n, save.n, { timeout: 30000 }).then(() => true, () => false);
  await o.page.waitForTimeout(1500);
  const again = await read(o.page);
  check(left && back, 'still hidden: he went back and forward, and the night mounted again');
  check(again.starts.length === s.starts.length, `still hidden: the night that mounted again brought ${again.starts.length - s.starts.length} new starts`, 'hidden');
  await setVisibility(o.page, 'visible');
  await o.page.waitForTimeout(1500);
  const shown = await read(o.page);
  check(shown.resumes > again.resumes, `visible again: the context was woken (${shown.resumes - again.resumes} resume)`);
  check(shown.starts.length === again.starts.length, `visible again: ${shown.starts.length - again.starts.length} starts 1.5 s later (nothing he missed is played late)`, 'hidden');
  await o.ctx.close();
}

/* ---------- 6. the prerenderer ---------- */
if (runs(6)) {
  head(6, 'The prerenderer constructs nothing');
  const save = SAVES.win;
  const o = await open({ save, pref: 'on', prerender: true });
  const through = await clickThrough(o, save);
  await o.page.waitForTimeout(waitOut(save.n));
  const s = await read(o.page);
  check(through.there, `under the prerender flag the night still draws (${save.n} names)`);
  check(s.made === 0 && s.starts.length === 0 && o.kitAsked() === 0, `choice on, the prerender flag: contexts ${s.made}, starts ${s.starts.length}, the kit chunk requested ${o.kitAsked()} times`);
  await o.ctx.close();
}

/* ---------- 7. reduced motion ---------- */
if (runs(7)) {
  head(7, 'Reduced motion: silent until he turns it on, then the result alone');
  const save = SAVES.win;
  {
    const o = await open({ save, reduced: true });
    const through = await clickThrough(o, save);
    await o.page.waitForTimeout(2500);
    const s = await read(o.page);
    check(through.there && s.made === 0 && s.starts.length === 0 && o.kitAsked() === 0, `choice absent: contexts ${s.made}, starts ${s.starts.length}, the kit chunk requested ${o.kitAsked()} times`);
    await o.ctx.close();
  }
  {
    const o = await open({ save, pref: 'on', reduced: true });
    const through = await clickThrough(o, save);
    await o.page.waitForTimeout(2500);
    const s = await read(o.page), h = heard(s);
    check(through.there && s.starts.length === 2 && h.ticks.length === 0 && !!h.sting && !!h.crowd, `choice on: ${s.starts.length} starts (${names(s.starts).join(', ')}), no tick`);
    check(!!h.sting && h.sting.delay <= 0.03, `choice on: the sting starts at once (${h.sting ? ms(h.sting.delay) : 'missing'} ahead)`);
    check(!!h.sting && !!h.crowd && Math.abs(h.crowd.when - h.sting.when - 0.3) <= 0.005, `choice on: the crowd 300 ms after it (${h.sting && h.crowd ? ms(h.crowd.when - h.sting.when) : 'missing'})`);
    check(s.buzz.length === 0, `choice on: the phone does not shake (buzz ${JSON.stringify(s.buzz)})`);
    await o.ctx.close();
  }
}

/* ---------- 10. a kit that will not load ---------- */
if (runs(10)) {
  head(10, 'A kit that will not load never reloads the page');
  const save = SAVES.win;
  const o = await open({ save, pref: 'on', kit: 'refuse' });
  const through = await clickThrough(o, save);
  await o.page.waitForTimeout(waitOut(save.n));
  let pressed = 'no switch is mounted, so none was pressed';
  if (MOUNTED.footer) {
    const sw = o.page.locator('footer [data-sound-toggle="text"]');
    await sw.click(); await o.page.waitForTimeout(400);
    await sw.click(); await o.page.waitForTimeout(1200);
    pressed = 'the footer switch pressed off and on again';
  }
  const s = await read(o.page).catch(() => null);
  const flagged = await o.page.evaluate(() => sessionStorage.getItem('dukb-reloaded-stale-chunk')).catch(() => 'unreadable');
  check(o.kitAsked() >= 1, `the kit chunk was asked for and refused (${o.kitAsked()} requests); ${pressed}`);
  check(o.loads() === 1, `the document loaded ${o.loads()} time(s) (a reload would be a second)`, 'reload');
  check(flagged === null, `the stale chunk guard's once flag is ${flagged === null ? 'not set' : `set (${flagged})`}`, 'reload');
  check(!!s && s.made === 0 && s.starts.length === 0, `silence, and no audio graph: contexts ${s?.made}, starts ${s?.starts.length}`);
  check(through.there && o.errors.length === 0, `the night drew and the page threw nothing${o.errors.length ? `: ${o.errors[0]}` : ''}`);
  await o.ctx.close();
}

/* ---------- 9. no audio file ---------- */
if (runs(9)) {
  head(9, 'No audio file');
  check(everyMedia.length === 0, `no media request and none for an audio file in any context of this run${everyMedia.length ? `: FOUND ${everyMedia.slice(0, 3).join(', ')}` : ''}`);
}

await browser.close();
if (CONTROL) {
  if (aimedRed > 0) { console.log(`\nplaySoundGate control ${CONTROL}: fired, ${aimedRed} aimed checks red in section ${AIM[CONTROL]}`); stop(0); }
  console.log(`\nplaySoundGate control ${CONTROL}: DID NOT FIRE (${failed} checks red, none of them aimed)`);
  stop(1);
}
console.log(`\nplaySoundGate: ${checks} checks, ${failed} failed${notRun ? ` (${notRun} sections not run)` : ''}`);
stop(failed ? 1 : 0);
