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

/* ---------- 0. the built chunks ---------- */
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
        src.start = (when = 0, ...rest) => { snd.starts.push({ delay: when - ctx.currentTime, len: src.buffer ? src.buffer.length : -1, at: performance.now() }); return start(when, ...rest); };
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
  /* the moment the card's rows enter the document: the clock its countdown runs on */
  new MutationObserver(() => {
    if (!snd.mountAt && n > 0 && document.querySelectorAll('.cm-tick-in').length >= n) {
      snd.mountAt = performance.now();
      if (window.__cardMounted) window.__cardMounted();
    }
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
  /* a held kit is let go by the PAGE, holdMs after it saw the card's rows, so the hold is on the card's clock */
  await ctx.exposeFunction('__cardMounted', () => { setTimeout(release, holdMs); });
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
