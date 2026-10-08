/* Reviewer's second walk (Round 1115 review, never committed): can a player always get OUT of the sheet on a short
   screen, and what happens when the sheet's chunk fails to load. Real /soccer-career page, supabase.co blocked. */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.cwd().replaceAll('\\', '/');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-out');
fs.mkdirSync(OUT, { recursive: true });
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk2-'));
const entry = path.join(WORK, 'entry.mjs');
fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/soccerClubSquad.ts');
export const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(WORK, 'b.mjs'), alias: { '@': `${ROOT}/src` }, logLevel: 'error' });
const { lib, engine } = await import(pathToFileURL(path.join(WORK, 'b.mjs')).href);
const CLUBS = engine.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const realRandom = Math.random;
let seed = 4242;
Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function step(s) {
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? engine.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return engine.advanceProSeason(s, CLUBS);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, CLUBS);
    case 'ballon_dor': return engine.dismissBallonDor(s, CLUBS);
    case 'international_debut': return engine.dismissDebut(s, CLUBS);
    case 'world_cup': return engine.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, CLUBS);
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev ? engine.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return engine.applyRehabChoice(s, 1);
    case 'transfer_window': return engine.stayAtClub(s);
    default: return null;
  }
}
let SAVE = null;
{
  let s = engine.initCareer('Jo Vale', 'England', 'CM', '2025', abil(58), 58, 2025, CLUBS, null);
  for (let g = 0; s && !s.retired && g < 200; g += 1) {
    if (s.phase === 'playing' && s.seasons.filter(r => r.type === 'playing').length >= 2 && lib.squadView(s)) { SAVE = JSON.parse(JSON.stringify(s)); break; }
    s = step(s);
  }
}
Math.random = realRandom;
if (!SAVE) { console.log('no save found'); process.exit(1); }
const v = lib.squadView(SAVE);
console.log(`save: ${v.club} ${v.year} ${v.source} rank ${v.rank}/${v.groupSize} arrivals ${v.arrivals.length} trust ${v.trust.label}`);
const ASSETS = path.join(ROOT, 'dist/assets');
const sheetChunk = fs.readdirSync(ASSETS).find(f => f.endsWith('.js') && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes('data-squad-xi'));
console.log(`sheet chunk: ${sheetChunk}`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
async function open({ width, height, helpSeen }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await ctx.addInitScript(([value, seen]) => { try { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', value); if (seen) localStorage.setItem('soccerSquad:help', '1'); } } catch { /* */ } }, [JSON.stringify(SAVE), helpSeen]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-squad-tile]', { timeout: 30000 });
  return { ctx, page, errors };
}
const buttons = page => page.evaluate(() => [...document.querySelectorAll('[data-squad-sheet] button')].map(b => { const r = b.getBoundingClientRect(); const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); return `${(b.textContent.trim() || b.getAttribute('aria-label')).slice(0, 22)}@${Math.round(r.top)}-${Math.round(r.bottom)}:${Math.round((vis / r.height) * 100)}%`; }));
/* can a finger reach it? a real (not forced) click, which playwright refuses when the target is off the screen */
const canTap = async (page, sel) => { try { await page.click(sel, { timeout: 2500 }); return 'tapped'; } catch (e) { return `CANNOT TAP (${String(e).split('\n')[0].slice(0, 90)})`; } };

/* 1. the first open on short screens: the help comes by itself */
for (const [w, h] of [[390, 844], [390, 664], [375, 553], [360, 640], [320, 568], [844, 390]]) {
  const { ctx, page } = await open({ width: w, height: h, helpSeen: false });
  await page.click('[data-squad-tile]');
  await page.waitForSelector('[data-squad-screen="help"]', { timeout: 15000 });
  await page.waitForTimeout(300);
  const b = await buttons(page);
  await page.screenshot({ path: path.join(OUT, `first-${w}x${h}-help.png`) });
  const back = await canTap(page, '[data-squad-sheet] button:has-text("← Back")');
  const now = await page.evaluate(() => document.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen') ?? 'closed');
  console.log(`first open ${w}x${h}: help buttons [${b.join(' | ')}] -> Back: ${back}, now on ${now}`);
  await ctx.close();
}
/* 2. every screen on short screens, help already seen: is Back reachable */
for (const [w, h] of [[375, 553], [320, 568], [844, 390]]) {
  const { ctx, page } = await open({ width: w, height: h, helpSeen: true });
  await page.click('[data-squad-tile]');
  await page.waitForSelector('[data-squad-screen="home"]', { timeout: 15000 });
  const out = [];
  out.push(`home [${(await buttons(page)).filter(x => x.startsWith('←')).join(' ')}]`);
  await page.screenshot({ path: path.join(OUT, `short-${w}x${h}-home.png`) });
  for (const sc of ['eleven', 'bench', 'place', 'last']) {
    const open1 = await canTap(page, `[data-squad-open="${sc}"]`);
    if (open1 !== 'tapped') { out.push(`${sc}: its tile ${open1}`); continue; }
    await page.waitForSelector(`[data-squad-screen="${sc}"]`, { timeout: 5000 });
    await page.waitForTimeout(200);
    const b = (await buttons(page)).filter(x => x.startsWith('←')).join(' ');
    if (sc === 'place' || sc === 'eleven') await page.screenshot({ path: path.join(OUT, `short-${w}x${h}-${sc}.png`) });
    const back = await canTap(page, '[data-squad-sheet] button:has-text("← Back")');
    out.push(`${sc} [${b}] Back ${back}`);
    if (back !== 'tapped') { await page.keyboard.press('Escape'); await page.waitForSelector('[data-squad-screen="home"]', { timeout: 5000 }).catch(() => {}); }
  }
  console.log(`short ${w}x${h}: ${out.join(' || ')}`);
  await ctx.close();
}
/* 3. the sheet's chunk fails to load, then loads on a retry */
{
  const { ctx, page, errors } = await open({ width: 390, height: 844, helpSeen: true });
  let block = true; let asked = 0;
  await ctx.route(`**/assets/${sheetChunk}`, r => { asked += 1; return block ? r.abort() : r.continue(); });
  await page.click('[data-squad-tile]');
  const failed = await page.waitForSelector('[data-squad-sheet="failed"]', { timeout: 15000 }).catch(() => null);
  const text = failed ? (await failed.innerText()).replace(/\s+/g, ' ') : null;
  await page.screenshot({ path: path.join(OUT, 'chunk-failed.png') });
  console.log(`chunk blocked: boundary ${failed ? `shown: "${text}"` : 'NOT shown'}; requests for the chunk ${asked}; page errors ${JSON.stringify(errors)}`);
  if (failed) {
    block = false;
    await page.click('[data-squad-sheet] button:has-text("Retry")');
    const home = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 8000 }).catch(() => null);
    const stuck = await page.evaluate(() => document.querySelector('[data-squad-sheet]')?.getAttribute('data-squad-sheet') ?? 'no sheet at all');
    await page.screenshot({ path: path.join(OUT, 'chunk-retry.png') });
    console.log(`after Retry with the network back: ${home ? 'the sheet opened' : `the sheet did NOT open (sheet attribute "${stuck}")`}; requests for the chunk now ${asked}`);
    if (!home) {
      const closed = await canTap(page, '[data-squad-sheet] button:has-text("← Back to your career")');
      await page.click('[data-squad-tile]').catch(() => {});
      const again = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 8000 }).catch(() => null);
      console.log(`  Back to your career ${closed}; pressing the tile again: ${again ? 'the sheet opened' : 'still not open'}; requests ${asked}`);
    }
  }
  await ctx.close();
}
/* 4. a slow chunk: does the tile say it is busy */
{
  const { ctx, page } = await open({ width: 390, height: 844, helpSeen: true });
  await ctx.route(`**/assets/${sheetChunk}`, async r => { await new Promise(d => setTimeout(d, 1500)); return r.continue(); });
  await page.click('[data-squad-tile]');
  await page.waitForTimeout(400);
  const busy = await page.evaluate(() => document.querySelector('[data-squad-tile]')?.getAttribute('aria-busy'));
  await page.waitForSelector('[data-squad-screen="home"]', { timeout: 10000 });
  const after = await page.evaluate(() => document.querySelector('[data-squad-tile]')?.getAttribute('aria-busy'));
  console.log(`slow chunk: aria-busy while loading ${busy}, after ${after}`);
  await ctx.close();
}
await browser.close();
console.log('RVWALK2 DONE');
