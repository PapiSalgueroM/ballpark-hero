// Reviewer probe and walk for Round 1519: the save a player who ALREADY hit the bug holds today.
// The base engine (bc79b526) takes a stray retired flag at 26 through Next Season and the summary's
// Continue, exactly the reported road; that save is then loaded by the branch (engine, then the served page).
// Run from the repo root: node .rc/x/rvvictim1519.mjs   (BASE set: also walks the page; RC_OUT gets shots)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = process.cwd();
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvvictim');
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-victim-'));
async function bundle(name, src) {
  const entry = path.join(TMP, name + '-entry.mjs'); const out = path.join(TMP, name + '.mjs');
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ENGINE}';
export { parseSoccerCareerSave } from '${path.join(ROOT, 'src/lib/soccerCareerSave.ts')}';
`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'eng', setup(b) { b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({ contents: src, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') })); } }] });
  return import(pathToFileURL(out).href);
}
const CUR = await bundle('cur', fs.readFileSync(ENGINE, 'utf8'));
const BASEE = await bundle('base', execFileSync('git', ['show', 'bc79b526:src/lib/soccerCareerEngine.ts'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
fs.rmSync(TMP, { recursive: true, force: true });
const E = BASEE; const clubs = E.FALLBACK_CLUBS;
const realRandom = Math.random;
function seed(n) { let s = n | 0; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const copy = v => JSON.parse(JSON.stringify(v));
let failures = 0, checks = 0;
const check = (ok, m) => { checks += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${m}`); if (!ok) failures += 1; return ok; };
// A career on Next Season at 26, the base's way.
seed(35193519);
const o = 64, st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
let s = E.initCareer('Victim Probe', 'Brazil', 'CAM', '2020s', st, o, 2025, clubs, null);
const last = n => n - 1;
const step = x => {
  switch (x.phase) {
    case 'youth': return E.advanceYouthYear(x, clubs);
    case 'contract_offer': return x.pendingOffers.length ? E.acceptOffer(x, x.pendingOffers[last(x.pendingOffers.length)]) : { ...x, phase: 'playing' };
    case 'playing': return E.advanceProSeason(x, clubs);
    case 'newspaper': return E.dismissNewspaper(x);
    case 'season_summary': return E.dismissSummary(x, clubs);
    case 'random_events': return x.pendingEvents[0] ? E.applyEventChoice(x, last(x.pendingEvents[0].choices.length), clubs) : { ...x, phase: 'playing' };
    case 'moral_dilemma': return x.pendingMoralDilemma ? E.applyMoralDilemmaChoice(x, last(x.pendingMoralDilemma.choices.length)) : E.dismissMoralDilemma(x, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(x, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(x, clubs);
    case 'international_debut': return E.dismissDebut(x, clubs);
    case 'world_cup': return E.dismissWorldCup(x, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(x, clubs);
    case 'ballon_dor': return E.dismissBallonDor(x, clubs);
    case 'rehab_choice': return E.applyRehabChoice(x, 1);
    case 'transfer_window': return E.stayAtClub(x);
    default: throw new Error('unhandled ' + x.phase);
  }
};
for (let g = 0; g < 1500 && !(s.phase === 'playing' && s.age === 25); g++) s = step(s);
// The reported road on the base: a stray flag rides along, Next Season plays 26, then the paper and the summary's Continue.
let v = { ...copy(s), retired: true };
for (let g = 0; g < 40 && v.phase !== 'retired'; g++) { v = step(v); if (v.phase === 'playing' || v.phase === 'retirement_ceremony') break; }
Math.random = realRandom;
delete v.chanceWheel;
console.log(`victim save on the base: age ${v.age}, retired ${v.retired}, phase ${v.phase}, legacy ${v.legacy ? v.legacy.score : 'none'}, last row ${v.seasons[v.seasons.length - 1].type}, choice ${v.postRetirementChoice ?? 'none'}`);
check(v.phase === 'retired' && v.retired === true && v.age === 26, 'the base ended the stray flag career on the retired screen at 26 (the reported bug)');
const r = CUR.repairCareer(copy(v));
console.log(`the branch loads it as: retired ${r.retired}, phase ${r.phase}, legacy ${r.legacy ? r.legacy.score : 'none'}`);
check(!(r.retired && r.phase === 'retired'), 'the branch gives that player his career back (or at least the send off and its choices)');
fs.writeFileSync(path.join(OUT, 'victim-save.json'), JSON.stringify(v));
if (process.env.BASE) {
  const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
  const browser = await pw.chromium.launch({ headless: true });
  try {
    for (const width of [390, 1280]) {
      const touch = width < 1000;
      const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
      await ctx.route(/supabase\.co/, q => q.abort());
      const page = await ctx.newPage();
      await page.goto(process.env.BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      await page.evaluate(([k, val]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, val); }, ['soccerCareerSave', JSON.stringify(v)]);
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `rv-victim-${width}.png`) });
      await page.screenshot({ path: path.join(OUT, `rv-victim-${width}-full.png`), fullPage: true });
      const share = await page.getByRole('button', { name: /Share Legacy/ }).count();
      const next = await page.getByRole('button', { name: /Next Season/ }).count();
      const choices = await page.getByRole('button', { name: /Retire and Enjoy Life/ }).count();
      const text = (await page.textContent('body')) || '';
      console.log(`  ${width}: Share Legacy ${share}, Next Season ${next}, send off choices ${choices}, says 26: ${/\b26\b/.test(text)}`);
      check(share === 0 || choices > 0, `${width}: the player who already hit the bug is not left on the retired screen with no choice`);
      await ctx.close();
    }
  } finally { await browser.close(); }
}
console.log(failures ? `rvvictim1519: FAIL, ${failures} of ${checks} checks failed` : `rvvictim1519: ${checks} checks, 0 failures`);
process.exit(failures ? 1 : 0);
