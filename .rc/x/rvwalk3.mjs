/* Reviewer's third walk of Round 1132 (never committed): rapid presses of the switch, and two tabs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk3-out');
fs.mkdirSync(OUT, { recursive: true });
const RESULT = {};

function instrument([pref]) {
  const snd = { made: 0, starts: [], stops: 0, suspends: 0, resumes: 0 };
  window.__snd = snd;
  const Real = window.AudioContext || window.webkitAudioContext;
  if (Real) {
    class Counted extends Real {
      constructor(...a) { super(...a); snd.made += 1; window.__ctx = this; }
      createBufferSource() {
        const src = super.createBufferSource(), ctx = this, start = src.start.bind(src), halt = src.stop.bind(src);
        src.start = (when = 0, ...rest) => { snd.starts.push({ delay: +(when - ctx.currentTime).toFixed(3), len: src.buffer ? src.buffer.length : -1, state: ctx.state }); return start(when, ...rest); };
        src.stop = (...a) => { snd.stops += 1; return halt(...a); };
        return src;
      }
      suspend() { snd.suspends += 1; return super.suspend(); }
      resume() { snd.resumes += 1; return super.resume(); }
    }
    window.AudioContext = Counted;
  }
  try {
    if (!sessionStorage.getItem('rv-walk3')) {
      sessionStorage.setItem('rv-walk3', '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (pref) localStorage.setItem('dukb-sound', pref);
    }
  } catch { /* private mode */ }
}
const FOOT = 'footer [data-sound-toggle="text"]';
const state = page => page.evaluate(sel => ({ text: document.querySelector(sel).textContent, pressed: document.querySelector(sel).getAttribute('aria-pressed'), stored: localStorage.getItem('dukb-sound'), ctx: window.__ctx ? window.__ctx.state : 'none', snd: JSON.parse(JSON.stringify(window.__snd)) }), FOOT);
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server', '--mute-audio'] });
const fresh = async pref => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(instrument, [pref]);
  await ctx.route(/supabase\.co/, x => x.abort());
  return ctx;
};
const load = async (ctx, route = '/whats-new') => {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 20, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.locator(FOOT).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  return { page, errors };
};

/* rapid presses: n real clicks with no wait between them, from off */
for (const presses of [2, 3, 5, 6]) {
  const ctx = await fresh(null);
  const { page, errors } = await load(ctx);
  const sw = page.locator(FOOT);
  for (let i = 0; i < presses; i += 1) await sw.click({ delay: 0, noWaitAfter: true });
  await page.waitForTimeout(1500);
  const s = await state(page);
  RESULT[`rapid-${presses}`] = { text: s.text, pressed: s.pressed, stored: s.stored, ctxState: s.ctx, contexts: s.snd.made, starts: s.snd.starts.length, startStates: s.snd.starts.map(x => x.state), suspends: s.snd.suspends, resumes: s.snd.resumes,
    consistent: (s.text === 'Sound: on') === (s.ctx === 'running') || s.ctx === 'none', errors };
  console.log(`rapid-${presses}: ${JSON.stringify(RESULT[`rapid-${presses}`])}`);
  await ctx.close();
}

/* two tabs of one browser: A is on and sounding, B switches off */
{
  const ctx = await fresh('on');
  const a = await load(ctx), b = await load(ctx);
  await a.page.bringToFront();
  /* a tap in A so its context exists, then switch off and on again in A to leave it on and running */
  await a.page.mouse.click(5, 5);
  await a.page.waitForTimeout(600);
  const a0 = await state(a.page);
  await b.page.bringToFront();
  await b.page.locator(FOOT).click();
  await b.page.waitForTimeout(900);
  const b1 = await state(b.page);
  await a.page.bringToFront();
  await a.page.waitForTimeout(600);
  const a1 = await state(a.page);
  RESULT.twoTabs = { aBefore: { text: a0.text, ctx: a0.ctx, contexts: a0.snd.made }, bAfterPress: { text: b1.text, stored: b1.stored }, aAfter: { text: a1.text, pressed: a1.pressed, ctx: a1.ctx, suspends: a1.snd.suspends }, errors: [...a.errors, ...b.errors] };
  console.log(`twoTabs: ${JSON.stringify(RESULT.twoTabs)}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk3.json'), JSON.stringify(RESULT, null, 1));
console.log(`walk3 done: ${Object.keys(RESULT).length} scenes`);
process.exit(0);
