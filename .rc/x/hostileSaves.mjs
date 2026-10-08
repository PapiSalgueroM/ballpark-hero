// Round 1115, a probe and not a harness: does a hand edited save take the career page down now that the
// Squad tile is in its first paint? Each hostile save is read by the lib in node (does squadView throw?)
// and then loaded on the built /soccer-career. Run it twice, on this round's build and on the base's
// (DIST_DIR), and compare line for line: a save that only breaks WITH the round is the tile's.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..').replaceAll('\\', '/');
const require = createRequire(path.join(ROOT, 'scripts/x.mjs'));
const NM = path.dirname(path.dirname(require.resolve('react/package.json'))).replaceAll('\\', '/');
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const PORT = Number(process.env.PORT || 4911);
const TAG = process.env.TAG || 'head';
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'hostile-'));

const nodeEntry = path.join(WORK, 'node-entry.mjs');
fs.writeFileSync(nodeEntry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/soccerClubSquad.ts');
export const sheet = await import('${ROOT}/src/lib/soccerClubSquadSheet.ts');
export const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
await build({ entryPoints: [nodeEntry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(WORK, 'node-bundle.mjs'), alias: { '@': `${ROOT}/src` }, nodePaths: [NM], logLevel: 'error' });
const { lib, sheet, engine } = await import(pathToFileURL(path.join(WORK, 'node-bundle.mjs')).href);
const CLUBS = engine.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
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
let A = null;
for (let c = 0; c < 400 && !A; c += 1) {
  seedRandom(c * 7919 + 1115);
  const ovr = 52 + (c % 20);
  let s = engine.initCareer('Sam Carter', 'England', ['ST', 'CM', 'CB', 'LW'][c % 4], '2025', abil(ovr), ovr, 2025, CLUBS, null);
  for (let guard = 0; s && !s.retired && guard < 220; guard += 1) {
    if (s.phase === 'playing' && s.seasons.filter(r => r.type === 'playing').length === 3) { A = JSON.parse(JSON.stringify(s)); break; }
    s = step(s);
  }
}
Math.random = realRandom;
if (!A) { console.log('no base save found. NOT CHECKED.'); process.exit(1); }

const v = fn => { const s = JSON.parse(JSON.stringify(A)); fn(s); return s; };
const last = s => s.seasons[s.seasons.length - 1];
const SAVES = {
  plain: v(() => {}),
  tierString: v(s => { s.currentClubTier = 'two'; }),
  tierMissing: v(s => { delete s.currentClubTier; }),
  noSeasons: v(s => { s.seasons = []; }),
  seasonsObject: v(s => { s.seasons = {}; }),
  posUnknown: v(s => { s.position = 'SW'; }),
  posMissing: v(s => { delete s.position; }),
  overallNull: v(s => { s.overall = null; }),
  overallString: v(s => { s.overall = 'sixty'; }),
  phoneNull: v(s => { s.phone = null; }),
  phoneGarbage: v(s => { s.phone = { threads: 'x', contacts: 7 }; }),
  clubNumber: v(s => { s.currentClub = 12345; }),
  clubEmpty: v(s => { s.currentClub = ''; }),
  countryMissing: v(s => { delete s.currentClubCountry; }),
  frozenString: v(s => { s.frozenOut = 'yes'; }),
  nameMissing: v(s => { delete s.playerName; }),
  firstRowGarbage: v(s => { s.seasons[0] = { year: 'x' }; }),
  lastRowNoYear: v(s => { delete last(s).year; }),
  lastRowHugeYear: v(s => { last(s).year = 99999; }),
  lastRowNoApps: v(s => { delete last(s).leagueApps; delete last(s).apps; delete last(s).ovr; }),
  lastRowNullTier: v(s => { last(s).clubTier = null; last(s).club = null; }),
  yearsAncient: v(s => { for (const r of s.seasons) r.year -= 2500; }),
};

console.log(`hostile saves on ${TAG}: dist ${DIST}`);
const nodeSide = {};
for (const [name, save] of Object.entries(SAVES)) {
  try { const view = lib.squadView(save); const l = sheet.lastSeason(save); nodeSide[name] = view ? `view ${view.source} rank ${view.rank}/${view.groupSize} trust ${view.trust.pct}${l ? `, last ${l.leagueApps}` : ''}` : 'no view'; }
  catch (e) { nodeSide[name] = `THROWS ${String(e).slice(0, 90)}`; }
}

const host = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(done => setTimeout(done, 1500));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let threw = 0; let crashed = 0;
for (const [name, save] of Object.entries(SAVES)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([value]) => {
    try { window.localStorage.setItem('cookie-consent', 'essential'); window.localStorage.setItem('soccerCareerSave', value); window.localStorage.setItem('soccerSquad:help', '1'); } catch { /* private mode */ }
  }, [JSON.stringify(save)]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 110)));
  let state = '';
  try {
    await page.goto(`http://127.0.0.1:${PORT}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3500);
    state = await page.evaluate(() => {
      const root = document.getElementById('root');
      const text = root ? root.innerText : '';
      const btn = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
      return `root ${text.length} chars, hub ${btn.some(t => t.startsWith('Next Season')) ? 'yes' : 'no'}, tile ${document.querySelector('[data-squad-tile]') ? 'yes' : 'no'}, boundary ${/went wrong|try again|reload/i.test(text) ? 'maybe' : 'no'}`;
    });
    if (await page.locator('[data-squad-tile]').count()) {
      await page.click('[data-squad-tile]');
      await page.waitForTimeout(900);
      state += `, sheet ${await page.locator('[data-squad-sheet]').count() ? 'opened' : 'DID NOT OPEN'}`;
    }
  } catch (e) { state = `walk stopped: ${String(e).slice(0, 100)}`; }
  if (nodeSide[name].startsWith('THROWS')) threw += 1;
  if (errors.length) crashed += 1;
  console.log(`${name.padEnd(16)} | lib: ${nodeSide[name]} | page: ${state} | page errors ${errors.length}${errors.length ? `: ${errors[0]}` : ''}`);
  await ctx.close();
}
await browser.close();
try { host.kill(); } catch { /* gone */ }
console.log(`hostile saves on ${TAG}: ${Object.keys(SAVES).length} saves, lib threw on ${threw}, page errors on ${crashed}`);
process.exit(0);
