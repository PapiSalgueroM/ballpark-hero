/* Reviewer's walk of Round 1132 (never committed). Runs on the remote check runner as .rc/x/rvwalk.mjs.
   BASE is the served build, RC_OUT is where screenshots and the JSON go. The live database host is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundleAwardsNight } from '../../scripts/lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from '../../scripts/lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk-out');
const BASE_ROOT = process.env.BASE_ROOT || '';
fs.mkdirSync(OUT, { recursive: true });
const RESULT = { notes: [], scenes: {} };
const note = s => { console.log(s); RESULT.notes.push(s); };
const flush = () => fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(RESULT, null, 1));

/* ---------- saves, built the way scripts/playSoundGate.mjs builds them ---------- */
async function buildSaves(root) {
  const { soccer } = await bundleAwardsNight(root);
  const CLUBS = soccer.FALLBACK_CLUBS;
  const PODIUM = soccer.SOCCER_BALLON_DOR.award.podiumSize;
  const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const step = s => {
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
  };
  const saves = {};
  for (let c = 0; c < 400 && Object.keys(saves).length < 3; c += 1) {
    const real = Math.random;
    Math.random = mulberry32(c * 7919 + 1132);
    try {
      const o = 74 + (c % 14);
      let s = soccer.initCareer(`Sound ${c}`, 'England', ['ST', 'CM', 'LW', 'CB'][c % 4], '2010-14', abil(o), o, 2010, CLUBS, null, 96);
      for (let g = 0; g < 600 && s && !s.retired; g += 1) {
        const night = s.phase === 'ballon_dor' ? s.pendingBallonDor : null;
        if (night && !night.speech) {
          const kind = night.playerRank === 1 ? 'win' : night.playerNominated && night.playerRank !== null && night.playerRank <= PODIUM ? 'podium' : 'out';
          if (!saves[kind]) saves[kind] = { json: JSON.stringify(s), n: night.nominees.length, year: night.year, rank: night.playerRank };
        }
        s = step(s);
      }
    } finally { Math.random = real; }
  }
  return saves;
}
const SAVES = await buildSaves(ROOT);
note(`branch saves: ${Object.entries(SAVES).map(([k, v]) => `${k} n=${v.n} year=${v.year} rank=${v.rank}`).join('; ')}`);
let OLD = null;
if (BASE_ROOT && fs.existsSync(path.join(BASE_ROOT, 'src/lib/soccerCareerEngine.ts'))) {
  try {
    OLD = await buildSaves(BASE_ROOT);
    note(`base saves (built with origin/release-al-int's engine): ${Object.entries(OLD).map(([k, v]) => `${k} n=${v.n} year=${v.year} rank=${v.rank} bytes=${v.json.length}`).join('; ')}`);
    note(`base win save equals branch win save byte for byte: ${OLD.win && SAVES.win ? OLD.win.json === SAVES.win.json : 'n/a'}`);
  } catch (e) { note(`base saves FAILED to build: ${String(e).slice(0, 300)}`); }
} else note('base saves: BASE_ROOT not given or not there, old save scene will be skipped');

/* ---------- the instrument (the gate's, trimmed) ---------- */
function instrument([save, pref, seed, n]) {
  let t = seed >>> 0;
  Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const snd = { made: 0, starts: [], stops: 0, suspends: 0, resumes: 0, buzz: [], mountAt: 0, hiddenAt: 0 };
  window.__snd = snd;
  const Real = window.AudioContext || window.webkitAudioContext;
  if (Real) {
    class Counted extends Real {
      constructor(...a) { super(...a); snd.made += 1; }
      createBufferSource() {
        const src = super.createBufferSource(), ctx = this;
        const start = src.start.bind(src), halt = src.stop.bind(src);
        src.start = (when = 0, ...rest) => { snd.starts.push({ delay: +(when - ctx.currentTime).toFixed(3), len: src.buffer ? src.buffer.length : -1, at: Math.round(performance.now()), vis: document.visibilityState }); return start(when, ...rest); };
        src.stop = (...a) => { snd.stops += 1; return halt(...a); };
        return src;
      }
      suspend() { snd.suspends += 1; return super.suspend(); }
      resume() { snd.resumes += 1; return super.resume(); }
    }
    window.AudioContext = Counted;
    if (window.webkitAudioContext) window.webkitAudioContext = Counted;
  }
  try { Navigator.prototype.vibrate = function vibrate(p) { snd.buzz.push(Array.isArray(p) ? p.slice() : [p]); return true; }; } catch { /* no buzz */ }
  let seen = false;
  new MutationObserver(() => {
    if (seen || n <= 0 || document.querySelectorAll('.cm-tick-in').length < n) return;
    seen = true;
    snd.mountAt = Math.round(performance.now());
    if (window.__cardMounted) window.__cardMounted();
  }).observe(document, { childList: true, subtree: true });
  try {
    if (!sessionStorage.getItem('rv-walk')) {
      sessionStorage.setItem('rv-walk', '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (save) localStorage.setItem('soccerCareerSave', save);
      if (pref) localStorage.setItem('dukb-sound', pref);
    }
  } catch { /* private mode */ }
}

/* ---------- helpers ---------- */
const LEN = { 2205: 'tick', 9702: 'thud', 13230: 'net', 18522: 'whistle', 39690: 'sting', 61740: 'crowd' };
const cue = s => LEN[s.len] ?? `len${s.len}`;
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server', '--mute-audio'] });
const KIT_RE = /\/assets\/soundKit-[\w-]+\.js/;
async function open({ save = null, pref = null, width = 1280, height = 900, reduced = false, kit = 'serve', holdMs = 400, scheme = 'dark' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: scheme });
  await ctx.addInitScript(instrument, [save?.json ?? null, pref, 1132, save?.n ?? 0]);
  await ctx.route(/supabase\.co/, r => r.abort());
  let release = () => {};
  const released = new Promise(r => { release = r; });
  if (kit === 'hold') await ctx.route(KIT_RE, async route => { await released; return route.continue(); });
  const page = await ctx.newPage();
  const errors = [], kitReq = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('request', r => { if (KIT_RE.test(r.url())) kitReq.push(r.url().split('/').pop()); });
  return { ctx, page, errors, kitReq, release };
}
const read = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__snd)));
const settle = async page => {
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 40, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(900);
};
const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts }).catch(e => note(`shot ${name} failed: ${String(e).slice(0, 120)}`)); };
const FOOT = 'footer [data-sound-toggle="text"]';
const HEAD = 'header [data-sound-toggle="icon"]';
async function clickThrough(o, save) {
  await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await settle(o.page);
  const link = o.page.locator('a[href="/soccer-career"]:visible').first();
  if (!(await link.count())) return false;
  await link.click();
  return o.page.waitForFunction(n => document.querySelectorAll('.cm-tick-in').length >= n, save.n, { timeout: 40000 }).then(() => true, () => false);
}
const summary = s => ({ made: s.made, starts: s.starts.map(x => `${cue(x)}@${x.delay}`), stops: s.stops, suspends: s.suspends, resumes: s.resumes, buzz: s.buzz });
async function scene(name, fn) {
  const t0 = Date.now();
  try { RESULT.scenes[name] = await fn(); } catch (e) { RESULT.scenes[name] = { error: String(e).slice(0, 400) }; }
  console.log(`\n== ${name} (${Date.now() - t0} ms)\n${JSON.stringify(RESULT.scenes[name])}`);
  flush();
}

/* ---------- A. the switch on screen: footer and header, every width, both motions ---------- */
for (const [w, h] of [[320, 700], [390, 844], [640, 800], [768, 900], [1280, 900]]) {
  for (const reduced of [false, true]) {
    await scene(`chrome-${w}${reduced ? '-rm' : ''}`, async () => {
      const o = await open({ width: w, height: h, reduced });
      await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
      await settle(o.page);
      const r = { errors: o.errors };
      if (!reduced) await shot(o.page, `home-${w}-top-off`);
      r.header = await o.page.evaluate(sel => {
        const el = document.querySelector(sel), bar = document.querySelector('header');
        const box = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
        const shown = !!el && getComputedStyle(el).display !== 'none';
        /* does anything in the header row overlap the switch, or poke out of the viewport? */
        const kids = bar ? [...bar.querySelectorAll('a, button')].filter(e => e.getBoundingClientRect().width > 0) : [];
        const over = [];
        if (shown) { const a = el.getBoundingClientRect(); for (const k of kids) { if (k === el || el.contains(k) || k.contains(el)) continue; const b = k.getBoundingClientRect(); if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) over.push((k.textContent || k.getAttribute('aria-label') || k.tagName).trim().slice(0, 30)); } }
        const out = kids.filter(k => k.getBoundingClientRect().right > window.innerWidth + 1).map(k => (k.textContent || k.getAttribute('aria-label') || '').trim().slice(0, 30));
        return { shown, box: shown ? box(el) : null, bar: bar ? box(bar) : null, overlaps: over, pokesOut: out, pageWider: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth };
      }, HEAD);
      const foot = o.page.locator(FOOT);
      await foot.scrollIntoViewIfNeeded();
      await o.page.waitForTimeout(300);
      const measure = () => o.page.evaluate(sel => {
        const el = document.querySelector(sel), f = document.querySelector('footer'), row = el.parentElement;
        const b = el.getBoundingClientRect(), fb = f.getBoundingClientRect();
        const sibs = [...row.children].filter(c => c !== el).map(c => { const x = c.getBoundingClientRect(); return { t: c.textContent.trim().slice(0, 20), l: Math.round(x.left), r: Math.round(x.right), top: Math.round(x.top), bottom: Math.round(x.bottom) }; });
        const overlap = sibs.filter(s => b.left < s.r - 1 && s.l < b.right - 1 && b.top < s.bottom - 1 && s.top < b.bottom - 1).map(s => s.t);
        return { text: el.textContent, pressed: el.getAttribute('aria-pressed'), box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], footerH: Math.round(fb.height), scrollY: Math.round(window.scrollY), overlap, rowTops: [...new Set(sibs.map(s => s.top))].length, stored: localStorage.getItem('dukb-sound') };
      }, FOOT);
      r.off = await measure();
      await shot(o.page, `footer-${w}${reduced ? '-rm' : ''}-off`);
      await foot.click();
      await o.page.waitForTimeout(700);
      r.on = await measure();
      await shot(o.page, `footer-${w}${reduced ? '-rm' : ''}-on`);
      r.afterOn = summary(await read(o.page));
      r.kitReq = o.kitReq.length;
      /* the keyboard: focus and Enter turns it off again */
      await foot.focus(); await o.page.keyboard.press('Enter'); await o.page.waitForTimeout(400);
      r.afterEnter = (await measure()).text;
      await o.page.keyboard.press('Space'); await o.page.waitForTimeout(400);
      r.afterSpace = (await measure()).text;
      if (r.header.shown && !reduced) {
        await o.page.evaluate(() => window.scrollTo(0, 0)); await o.page.waitForTimeout(300);
        await shot(o.page, `header-${w}-on`, { clip: { x: 0, y: 0, width: w, height: 120 } });
        await o.page.locator(HEAD).click(); await o.page.waitForTimeout(400);
        await shot(o.page, `header-${w}-off`, { clip: { x: 0, y: 0, width: w, height: 120 } });
        r.headerAfterClick = await o.page.evaluate(sel => ({ pressed: document.querySelector(sel).getAttribute('aria-pressed'), title: document.querySelector(sel).title, stored: localStorage.getItem('dukb-sound') }), HEAD);
      }
      await o.ctx.close();
      return r;
    });
  }
}

/* ---------- B. light mode header, What's New, another page's footer ---------- */
await scene('light-1280', async () => {
  const o = await open({ width: 1280, height: 900, scheme: 'light' });
  await o.page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await settle(o.page);
  const theme = o.page.locator('header button[aria-label*="mode" i], header button[title*="mode" i]').first();
  const had = await theme.count();
  if (had) { await theme.click(); await o.page.waitForTimeout(500); }
  await shot(o.page, 'header-1280-light', { clip: { x: 0, y: 0, width: 1280, height: 120 } });
  const cls = await o.page.evaluate(() => document.documentElement.className);
  await o.ctx.close();
  return { themeButtonFound: had, htmlClass: cls };
});
await scene('whatsnew-390', async () => {
  const o = await open({ width: 390, height: 844 });
  await o.page.goto(`${BASE}/whats-new`, { waitUntil: 'load', timeout: 60000 });
  await settle(o.page);
  const li = o.page.locator('li', { hasText: 'Sound, if you want it' }).first();
  const found = await li.count();
  let text = '';
  if (found) { await li.scrollIntoViewIfNeeded(); text = (await li.textContent()) ?? ''; }
  await shot(o.page, 'whatsnew-390');
  await o.ctx.close();
  return { found, text };
});

/* ---------- C. awards night out loud, as a player meets it ---------- */
for (const [kind, w, h, reduced] of [['win', 390, 844, false], ['win', 1280, 900, false], ['win', 390, 844, true], ['podium', 390, 844, false], ['out', 390, 844, false]]) {
  await scene(`night-${kind}-${w}${reduced ? '-rm' : ''}`, async () => {
    const save = SAVES[kind];
    if (!save) return { error: 'no such save' };
    const o = await open({ save, pref: 'on', width: w, height: h, reduced });
    const there = await clickThrough(o, save);
    const tag = `night-${kind}-${w}${reduced ? '-rm' : ''}`;
    await o.page.waitForTimeout(350);
    await shot(o.page, `${tag}-a-early`);
    await o.page.waitForTimeout(1300);
    await shot(o.page, `${tag}-b-mid`);
    await o.page.waitForTimeout(Math.round((0.75 + save.n * 0.22 + 2.2) * 1000) - 1650);
    await shot(o.page, `${tag}-c-landed`);
    const s = await read(o.page);
    const first = s.starts[0];
    const r = { there, n: save.n, ...summary(s), firstTickAfterMountMs: first ? Math.round(first.at - s.mountAt + first.delay * 1000) : null, kitReq: o.kitReq.length, errors: o.errors };
    const speech = o.page.locator('.cm-rise-gated button').first();
    if (await speech.count()) {
      await speech.click(); await o.page.waitForTimeout(1500);
      await shot(o.page, `${tag}-d-speech`);
      r.afterSpeechStarts = (await read(o.page)).starts.length;
    }
    await o.ctx.close();
    return r;
  });
}

/* ---------- D. he switches off in the middle of the countdown ---------- */
await scene('off-mid-countdown', async () => {
  const save = SAVES.win;
  const o = await open({ save, pref: 'on', width: 390, height: 844 });
  const there = await clickThrough(o, save);
  await o.page.waitForTimeout(900);
  const before = await read(o.page);
  await o.page.locator(FOOT).click();
  await o.page.waitForTimeout(400);
  const off = await read(o.page);
  await o.page.waitForTimeout(3500);
  const later = await read(o.page);
  await o.page.locator(FOOT).click();
  await o.page.waitForTimeout(900);
  const on = await read(o.page);
  const r = { there, scheduledBefore: before.starts.length, stopsAfterOff: off.stops, suspendsAfterOff: off.suspends, startsAfterOff: later.starts.length - before.starts.length, onAgain: summary(on).starts.slice(before.starts.length), text: await o.page.locator(FOOT).textContent(), errors: o.errors };
  await o.ctx.close();
  return r;
});

/* ---------- E. he leaves the page in the middle of the countdown ---------- */
await scene('leave-mid-countdown', async () => {
  const save = SAVES.win;
  const o = await open({ save, pref: 'on', width: 390, height: 844 });
  const there = await clickThrough(o, save);
  await o.page.waitForTimeout(900);
  const before = await read(o.page);
  await o.page.goBack();
  await o.page.waitForTimeout(3500);
  const after = await read(o.page);
  const r = { there, url: o.page.url(), scheduledBefore: before.starts.length, stops: after.stops, newStarts: after.starts.length - before.starts.length, errors: o.errors };
  await o.ctx.close();
  return r;
});

/* ---------- F. the tab is hidden while the kit is still on its way ---------- */
for (const releaseAfterHideMs of [300, 1200]) {
  await scene(`hidden-while-kit-loads-${releaseAfterHideMs}`, async () => {
    const save = SAVES.win;
    const o = await open({ save, pref: 'on', width: 1280, height: 900, kit: 'hold' });
    const there = await clickThrough(o, save);
    await o.page.waitForTimeout(150);
    /* the only way a headless page can be hidden: the gate's own way */
    await o.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      window.__snd.hiddenAt = Math.round(performance.now());
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await o.page.waitForTimeout(releaseAfterHideMs);
    o.release();
    await o.page.waitForTimeout(5000);
    const s = await read(o.page);
    const r = { there, kitReq: o.kitReq.length, made: s.made, startsWhileHidden: s.starts.filter(x => x.vis === 'hidden').map(x => `${cue(x)}@${x.delay}`), stops: s.stops, suspends: s.suspends, buzz: s.buzz, errors: o.errors };
    await o.ctx.close();
    return r;
  });
}

/* ---------- G. old saves: built by the base's engine, loaded on this build ---------- */
if (OLD) {
  for (const kind of ['win', 'podium', 'out']) {
    await scene(`oldsave-${kind}`, async () => {
      const save = OLD[kind];
      if (!save) return { error: 'the base engine produced no such save' };
      const off = await open({ save, width: 390, height: 844 });
      await off.page.goto(`${BASE}/soccer-career`, { waitUntil: 'load', timeout: 60000 });
      const thereOff = await off.page.waitForFunction(n => document.querySelectorAll('.cm-tick-in').length >= n, save.n, { timeout: 40000 }).then(() => true, () => false);
      await off.page.waitForTimeout(Math.round((0.75 + save.n * 0.22 + 1.5) * 1000));
      await shot(off.page, `oldsave-${kind}-off`);
      const sOff = await read(off.page);
      const stored = await off.page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const r = { thereOff, off: summary(sOff), kitReqOff: off.kitReq.length, errorsOff: off.errors, saveRewritten: stored === save.json ? 'no, byte identical' : `yes (${stored ? stored.length : 0} bytes against ${save.json.length})` };
      await off.ctx.close();
      const on = await open({ save, pref: 'on', width: 390, height: 844 });
      r.thereOn = await clickThrough(on, save);
      await on.page.waitForTimeout(Math.round((0.75 + save.n * 0.22 + 2.2) * 1000));
      r.on = summary(await read(on.page));
      r.errorsOn = on.errors;
      await on.ctx.close();
      return r;
    });
  }
}

await browser.close();
flush();
console.log(`\nwalk done: ${Object.keys(RESULT.scenes).length} scenes, ${Object.values(RESULT.scenes).filter(s => s && s.error).length} errored`);
process.exit(0);
