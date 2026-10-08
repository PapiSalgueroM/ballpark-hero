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

/* A. the first failure in a tab: what the player sees */
{
  const { ctx, page } = await open({ width: 390, height: 844, helpSeen: true });
  let asked = 0; let navs = 0;
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs += 1; });
  await ctx.route(`**/assets/${sheetChunk}`, r => { asked += 1; return r.abort(); });
  await page.evaluate(() => window.scrollTo(0, 400));
  const y0 = await page.evaluate(() => Math.round(scrollY));
  await page.click('[data-squad-tile]');
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({ sheet: document.querySelector('[data-squad-sheet]')?.getAttribute('data-squad-sheet') ?? 'no sheet', y: Math.round(scrollY), flag: sessionStorage.getItem('dukb-reloaded-stale-chunk'), text: document.querySelector('[data-squad-sheet]')?.innerText?.replace(/\s+/g, ' ').slice(0, 120) ?? '' }));
  console.log(`first failure in a tab: chunk requests ${asked}, page navigations after the press ${navs}, sheet "${state.sheet}", scrollY ${y0} -> ${state.y}, stale chunk flag ${state.flag}, text "${state.text}"`);
  await page.screenshot({ path: path.join(OUT, 'fail-first.png') });
  /* B. the second failure in the same tab: the tile's own boundary */
  await page.click('[data-squad-tile]');
  const failed = await page.waitForSelector('[data-squad-sheet="failed"]', { timeout: 10000 }).catch(() => null);
  console.log(`second failure in the same tab: boundary ${failed ? `shown: "${(await failed.innerText()).replace(/\s+/g, ' ')}"` : 'NOT shown'}, chunk requests ${asked}`);
  await page.screenshot({ path: path.join(OUT, 'fail-second.png') });
  if (failed) {
    /* the network comes back */
    await ctx.unroute(`**/assets/${sheetChunk}`);
    let after = 0;
    page.on('request', r => { if (r.url().includes(sheetChunk)) after += 1; });
    for (let i = 1; i <= 3; i += 1) {
      await page.click('[data-squad-sheet] button:has-text("Retry")');
      const home = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 4000 }).catch(() => null);
      const sheet = await page.evaluate(() => document.querySelector('[data-squad-sheet]')?.getAttribute('data-squad-sheet') ?? 'no sheet');
      console.log(`  Retry ${i} with the network back: ${home ? 'THE SHEET OPENED' : `still not open (sheet "${sheet}")`}, new requests for the chunk ${after}`);
      if (home) break;
    }
    await page.screenshot({ path: path.join(OUT, 'fail-retry.png') });
    const stillFailed = await page.$('[data-squad-sheet="failed"]');
    if (stillFailed) {
      console.log(`  Back to your career: ${await canTap(page, '[data-squad-sheet] button:has-text("← Back to your career")')}`);
      await page.click('[data-squad-tile]');
      const again = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 4000 }).catch(() => null);
      const sheet = await page.evaluate(() => document.querySelector('[data-squad-sheet]')?.getAttribute('data-squad-sheet') ?? 'no sheet');
      console.log(`  pressing the tile again, network still back: ${again ? 'the sheet opened' : `not open (sheet "${sheet}")`}, new requests ${after}`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-squad-tile]', { timeout: 30000 });
      await page.click('[data-squad-tile]');
      const fresh = await page.waitForSelector('[data-squad-screen="home"]', { timeout: 8000 }).catch(() => null);
      console.log(`  after a manual reload of the page: ${fresh ? 'the sheet opens' : 'the sheet still does not open'}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log('RVWALK3 DONE');
