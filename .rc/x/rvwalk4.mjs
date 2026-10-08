/* Reviewer's second walk of Round 1132 (never committed): the awards night reached the way a player reaches it,
   by pressing the page's own button on the screen BEFORE the night, with sound already on from an earlier visit.
   Measures where the card and its rows are on the screen while the ticks sound. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundleAwardsNight } from '../../scripts/lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from '../../scripts/lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk2-out');
fs.mkdirSync(OUT, { recursive: true });
const RESULT = {};
const flush = () => fs.writeFileSync(path.join(OUT, 'walk4.json'), JSON.stringify(RESULT, null, 1));

/* the state one step BEFORE each kind of night, from seeded careers stepped as the gate steps them */
const { soccer } = await bundleAwardsNight(ROOT);
const CLUBS = soccer.FALLBACK_CLUBS, PODIUM = soccer.SOCCER_BALLON_DOR.award.podiumSize;
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
const PREV = {};
for (let c = 0; c < 400 && Object.keys(PREV).length < 3; c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1132);
  try {
    const o = 74 + (c % 14);
    let s = soccer.initCareer(`Sound ${c}`, 'England', ['ST', 'CM', 'LW', 'CB'][c % 4], '2010-14', abil(o), o, 2010, CLUBS, null, 96);
    let prev = null;
    for (let g = 0; g < 600 && s && !s.retired; g += 1) {
      const night = s.phase === 'ballon_dor' ? s.pendingBallonDor : null;
      if (night && !night.speech && prev) {
        const kind = night.playerRank === 1 ? 'win' : night.playerNominated && night.playerRank !== null && night.playerRank <= PODIUM ? 'podium' : 'out';
        if (!PREV[kind]) PREV[kind] = { json: JSON.stringify(prev), phase: prev.phase, nightAlreadyPending: !!prev.pendingBallonDor, n: night.nominees.length, rank: night.playerRank };
      }
      prev = s;
      s = step(s);
    }
  } finally { Math.random = real; }
}
console.log(`states one step before a night: ${Object.entries(PREV).map(([k, v]) => `${k}: phase ${v.phase}, night already pending ${v.nightAlreadyPending}, n ${v.n}, rank ${v.rank}`).join('; ')}`);

function instrument([save, pref]) {
  const snd = { made: 0, starts: [], stops: 0, buzz: [], mountAt: 0, geo: [] };
  window.__snd = snd;
  const Real = window.AudioContext || window.webkitAudioContext;
  if (Real) {
    class Counted extends Real {
      constructor(...a) { super(...a); snd.made += 1; }
      createBufferSource() {
        const src = super.createBufferSource(), ctx = this, start = src.start.bind(src), halt = src.stop.bind(src);
        src.start = (when = 0, ...rest) => { snd.starts.push({ delay: +(when - ctx.currentTime).toFixed(3), len: src.buffer ? src.buffer.length : -1, at: Math.round(performance.now()) }); return start(when, ...rest); };
        src.stop = (...a) => { snd.stops += 1; return halt(...a); };
        return src;
      }
    }
    window.AudioContext = Counted;
    if (window.webkitAudioContext) window.webkitAudioContext = Counted;
  }
  try { Navigator.prototype.vibrate = function vibrate(p) { snd.buzz.push({ p: Array.isArray(p) ? p.slice() : [p], msAfterMount: Math.round(performance.now() - snd.mountAt), vis: document.visibilityState }); return true; }; } catch { /* no buzz */ }
  /* where the card and its rows are, sampled from the frame the rows enter */
  const sample = label => {
    const rows = [...document.querySelectorAll('.cm-tick-in')];
    const slam = document.querySelector('.cm-slam');
    const vh = window.innerHeight;
    const inView = r => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < vh && b.height > 0; };
    const fully = r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh && b.height > 0; };
    snd.geo.push({ label, t: Math.round(performance.now() - snd.mountAt), scrollY: Math.round(window.scrollY), vh, rows: rows.length, rowsInView: rows.filter(inView).length, rowsFullyInView: rows.filter(fully).length,
      firstRowTop: rows[0] ? Math.round(rows[0].getBoundingClientRect().top) : null, lastRowBottom: rows.length ? Math.round(rows[rows.length - 1].getBoundingClientRect().bottom) : null,
      slamTop: slam ? Math.round(slam.getBoundingClientRect().top) : null, slamBottom: slam ? Math.round(slam.getBoundingClientRect().bottom) : null });
  };
  let seen = false;
  new MutationObserver(() => {
    if (seen || document.querySelectorAll('.cm-tick-in').length < 3) return;
    seen = true;
    snd.mountAt = Math.round(performance.now());
    for (const ms of [0, 300, 700, 1300, 2000, 2700, 3400, 4500]) setTimeout(() => sample(`+${ms}`), ms);
  }).observe(document, { childList: true, subtree: true });
  try {
    if (!sessionStorage.getItem('rv-walk2')) {
      sessionStorage.setItem('rv-walk2', '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (save) localStorage.setItem('soccerCareerSave', save);
      if (pref) localStorage.setItem('dukb-sound', pref);
    }
  } catch { /* private mode */ }
}
const LEN = { 2205: 'tick', 9702: 'thud', 13230: 'net', 18522: 'whistle', 39690: 'sting', 61740: 'crowd' };
const ADVANCE = ['Next Year', 'Next Season', 'Continue', 'Proceed', 'Next', 'Done', 'Close'];
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server', '--mute-audio'] });
for (const [kind, w, h, reduced] of [['win', 390, 844, false], ['win', 390, 844, true]]) {
  const tag = `buzz-${kind}-${w}${reduced ? '-rm' : ''}`;
  const save = PREV[kind];
  const r = RESULT[tag] = { phaseBefore: save?.phase, pressed: [], errors: [] };
  if (!save) { r.error = 'no such state'; continue; }
  try {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(instrument, [save.json, 'on']);
    await ctx.route(/supabase\.co/, x => x.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => r.errors.push(String(e).slice(0, 200)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 40, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await (async () => {})({ path: path.join(OUT, `${tag}-0-before.png`) });
    let there = false;
    for (let press = 0; press < 5 && !there; press += 1) {
      let clicked = null;
      for (const label of ADVANCE) {
        const b = page.locator('main button:visible, #root button:visible').filter({ hasText: new RegExp(`^\\s*(\\S+\\s)?${label}`) }).first();
        if (await b.count()) { clicked = (await b.textContent()).trim().slice(0, 40); await b.click(); break; }
      }
      r.pressed.push(clicked ?? 'NOTHING TO PRESS');
      if (!clicked) break;
      there = await page.waitForFunction(() => document.querySelectorAll('.cm-tick-in').length >= 3, null, { timeout: 4000 }).then(() => true, () => false);
    }
    r.there = there;
    if (there) {
      await page.waitForTimeout(350); await (async () => {})({ path: path.join(OUT, `${tag}-1-early.png`) });
      await page.waitForTimeout(1200); await (async () => {})({ path: path.join(OUT, `${tag}-2-mid.png`) });
      await page.waitForTimeout(2300); await (async () => {})({ path: path.join(OUT, `${tag}-3-landed.png`) });
      await page.waitForTimeout(1500);
    }
    const s = await page.evaluate(() => JSON.parse(JSON.stringify(window.__snd)));
    const saved = await page.evaluate(() => { try { const c = JSON.parse(localStorage.getItem('soccerCareerSave')); return { phase: c.phase, rank: c.pendingBallonDor ? c.pendingBallonDor.playerRank : null, n: c.pendingBallonDor ? c.pendingBallonDor.nominees.length : null }; } catch { return null; } });
    Object.assign(r, { saved, made: s.made, starts: s.starts.map(x => `${LEN[x.len] ?? x.len}@${x.delay}`), firstStartAfterMountMs: s.starts[0] ? s.starts[0].at - s.mountAt + Math.round(s.starts[0].delay * 1000) : null, buzz: s.buzz, geo: s.geo });
    await ctx.close();
  } catch (e) { r.error = String(e).slice(0, 300); }
  console.log(`\n== ${tag}\n${JSON.stringify(r)}`);
  flush();
}
await browser.close();
console.log(`\nwalk2 done: ${Object.keys(RESULT).length} scenes`);
process.exit(0);
