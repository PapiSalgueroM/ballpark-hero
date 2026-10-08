/* Reviewer's old save probe for Round 1115 (never committed). Saves are made by the BASE engine (origin/main, the
   live release) in node, then read by the BRANCH readers with every object frozen, then loaded on the branch build.
   Usage on the runner: node .rc/x/rvOldSave.mjs /tmp/base-main   (BASE and RC_OUT from the environment). */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.cwd().replaceAll('\\', '/');
const OLD = path.resolve(process.argv[2]).replaceAll('\\', '/');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-out');
fs.mkdirSync(OUT, { recursive: true });
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'rvold-'));
async function bundle(dir, tag, files) {
  const entry = path.join(WORK, `${tag}.mjs`);
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n${Object.entries(files).map(([k, f]) => `export const ${k} = await import('${dir}/${f}');`).join('\n')}\n`);
  const out = path.join(WORK, `${tag}.out.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': `${dir}/src` }, nodePaths: [`${ROOT}/node_modules`], logLevel: 'error' });
  return import(pathToFileURL(out).href);
}
const old = await bundle(OLD, 'old', { engine: 'src/lib/soccerCareerEngine.ts' });
const cur = await bundle(ROOT, 'cur', { engine: 'src/lib/soccerCareerEngine.ts', lib: 'src/lib/soccerClubSquad.ts', sheet: 'src/lib/soccerClubSquadSheet.ts' });
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stepWith(engine, s) {
  const CLUBS = engine.FALLBACK_CLUBS;
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
const ERAS = [['1990-94', 1990], ['1995-99', 1995], ['2000-04', 2000], ['2005-09', 2005], ['2010-14', 2010], ['2015-19', 2015], ['2020-24', 2020], ['2025', 2025]];
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const saves = [];
let stepErrors = 0;
for (const [era, year] of ERAS) {
  for (let c = 0; c < 8; c += 1) {
    seedRandom(c * 7907 + year);
    const ovr = 52 + ((c * 5) % 22);
    let s = old.engine.initCareer('Old Save', ['England', 'Brazil', 'Japan', 'Spain'][c % 4], ['ST', 'CM', 'CB', 'GK', 'LW', 'RB', 'CAM', 'CDM'][c % 8], era, abil(ovr), ovr, year, old.engine.FALLBACK_CLUBS, null);
    let pro = 0;
    for (let g = 0; s && !s.retired && g < 320; g += 1) {
      if (s.phase === 'playing') { pro += 1; if ([1, 2, 5, 10, 15].includes(pro)) saves.push({ id: `${era}-c${c}-p${pro}`, json: JSON.stringify(s) }); }
      try { s = stepWith(old.engine, s); } catch (e) { stepErrors += 1; break; }
    }
  }
}
Math.random = realRandom;
/* older shapes still, cut by hand from the base saves */
const variants = [];
for (const s of saves.filter((_, i) => i % 9 === 0)) {
  const a = JSON.parse(s.json); delete a.phone; variants.push({ id: `${s.id}-nophone`, json: JSON.stringify(a) });
  const b = JSON.parse(s.json); for (const r of b.seasons) { delete r.ovr; delete r.leagueApps; delete r.injuryWeeks; delete r.clubCountry; } variants.push({ id: `${s.id}-barerows`, json: JSON.stringify(b) });
  const d = JSON.parse(s.json); delete d.frozenOut; delete d.isClubCaptain; delete d.currentClubCountry; variants.push({ id: `${s.id}-nocountry`, json: JSON.stringify(d) });
}
const all = [...saves, ...variants];
console.log(`base engine at ${OLD}: ${saves.length} playing saves from ${ERAS.length * 8} careers (${stepErrors} careers stopped on a step error), plus ${variants.length} cut down variants`);
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };
const tally = { real: 0, invented: 0, roles: 0, none: 0 };
const throwsRaw = []; const throwsRepaired = []; let repairChanged = 0; let viewDiff = 0;
for (const s of all) {
  const frozen = deepFreeze(JSON.parse(s.json));
  try {
    const v = cur.lib.squadView(frozen);
    tally[v ? v.source : 'none'] += 1;
    cur.sheet.lastSeason(frozen);
    cur.sheet.offerFit(frozen, { club: { name: 'Arsenal', country: 'England', tier: 1 } });
    const at = cur.lib.squadNow(frozen);
    if (at && v) { cur.sheet.trustLines(frozen, at, v.trust); cur.sheet.rankHeadline(v); cur.sheet.sourceLine(v); }
  } catch (e) { throwsRaw.push(`${s.id}: ${String(e).slice(0, 140)}`); }
  let rep;
  try { rep = cur.engine.repairCareer(JSON.parse(s.json)); } catch (e) { throwsRepaired.push(`${s.id}: repair ${String(e).slice(0, 120)}`); continue; }
  if (JSON.stringify(rep) !== s.json) repairChanged += 1;
  const repJson = JSON.stringify(rep);
  try {
    const fz = deepFreeze(JSON.parse(repJson));
    const v = cur.lib.squadView(fz); cur.sheet.lastSeason(fz);
    let v0 = null; try { v0 = cur.lib.squadView(JSON.parse(s.json)); } catch { /* counted above */ }
    if (JSON.stringify(v && [v.rank, v.groupSize, v.trust.pct, v.source]) !== JSON.stringify(v0 && [v0.rank, v0.groupSize, v0.trust.pct, v0.source])) viewDiff += 1;
  } catch (e) { throwsRepaired.push(`${s.id}: ${String(e).slice(0, 140)}`); }
}
console.log(`frozen readers over ${all.length} base saves: sources ${JSON.stringify(tally)}`);
console.log(`  throws on the raw save: ${throwsRaw.length}${throwsRaw.length ? ` e.g. ${throwsRaw.slice(0, 4).join(' | ')}` : ''}`);
console.log(`  throws on the repaired save (what the page hands the tile): ${throwsRepaired.length}${throwsRepaired.length ? ` e.g. ${throwsRepaired.slice(0, 4).join(' | ')}` : ''}`);
console.log(`  repairCareer on the branch changes the JSON of ${repairChanged} of ${all.length}; the tile's reading differs raw against repaired in ${viewDiff}`);

/* the browser: the same saves on the branch build */
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const pick = [...saves.filter((_, i) => i % 11 === 0).slice(0, 12), ...variants.filter((_, i) => i % 4 === 0).slice(0, 6)];
let bad = 0;
for (const s of pick) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(value => { try { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerSquad:help', '1'); localStorage.setItem('soccerCareerSave', value); } } catch { /* */ } }, s.json);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  let line = '';
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tile = await page.waitForSelector('[data-squad-tile]', { timeout: 20000 }).catch(() => null);
    await page.waitForTimeout(1200);
    const s1 = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
    let lib = null; try { lib = cur.lib.squadView(cur.engine.repairCareer(JSON.parse(s.json))); } catch { /* */ }
    if (!tile) { line = `no tile (lib says ${lib ? `${lib.rank}/${lib.groupSize}` : 'no squad'}) body "${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 90)}"`; if (lib) bad += 1; } else {
      const shown = await page.evaluate(() => document.querySelector('[data-squad-rank]')?.getAttribute('data-squad-rank'));
      await tile.click(); await page.waitForSelector('[data-squad-screen="home"]', { timeout: 15000 });
      for (const sc of ['eleven', 'bench', 'place', 'last']) { const b = await page.$(`[data-squad-open="${sc}"]`); if (!b) continue; await b.click(); await page.waitForSelector(`[data-squad-screen="${sc}"]`, { timeout: 8000 }); await page.click('[data-squad-sheet] button:has-text("← Back")'); await page.waitForSelector('[data-squad-screen="home"]'); }
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      const s2 = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const ok = s2 === s1 && String(lib?.rank) === shown && !errors.length;
      if (!ok) bad += 1;
      line = `tile rank ${shown} (lib ${lib?.rank}), page rewrote the save on load: ${s1 !== s.json}, save the same after the sheet: ${s2 === s1}`;
    }
  } catch (e) { bad += 1; line = `WALK ERROR ${String(e).slice(0, 200)}`; }
  console.log(`  ${s.id}: ${line}${errors.length ? ` PAGE ERRORS ${JSON.stringify(errors.slice(0, 2))}` : ''}`);
  await ctx.close();
}
await browser.close();
console.log(`OLDSAVE DONE: ${pick.length} base saves loaded on the branch build, ${bad} not clean; reader throws raw ${throwsRaw.length}, repaired ${throwsRepaired.length}`);
