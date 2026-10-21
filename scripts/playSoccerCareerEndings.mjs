/* Round 1519: the built page, at 390 and 1280, for "i retired at 26 no injury no choice".
 *
 * A generated player stands on Next Season at 25. The walk presses Next Season, goes through the
 * paper and the summary, reloads, opens the Retire dialog and cancels it, then confirms it as the
 * positive control. Then two saves whose retired flag and phase disagree: a stray flag on the summary
 * at 26 (it must play on) and a real retirement whose phase was lost (it must open its send off with
 * the reason and the choices). The save is read back from the page after every press.
 *
 * Runs against a served build: BASE (default http://localhost:4173). The database host is blocked,
 * nothing here reads or writes it. Screenshots and walk.json go to RC_OUT (or .tmp-fx/walk1519).
 * Run: node scripts/playSoccerCareerEndings.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1519');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';

let checks = 0, failures = 0;
const results = [];
const check = (ok, label) => { checks += 1; results.push({ ok: !!ok, label }); if (!ok) { failures += 1; console.error('  FAIL: ' + label); } return ok; };

/* The engine and the save reader, bundled once, to build the fixtures and read the page's save back. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1519-'));
const slash = p => p.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${slash(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'))}';
export { parseSoccerCareerSave } from '${slash(path.join(ROOT, 'src/lib/soccerCareerSave.ts'))}';
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(path.join(TMP, 'e.mjs')).href);
fs.rmSync(TMP, { recursive: true, force: true });
const clubs = E.FALLBACK_CLUBS;
const realRandom = Math.random;
function seed(n) {
  let s = n | 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function careerAt(age) {
  seed(15191519);
  const o = 66, stats = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer('Walk Tester', 'England', 'CM', '2020s', stats, o, 2025, clubs, null);
  const last = n => n - 1;
  for (let guard = 0; guard < 1500 && !(s.phase === 'playing' && s.age === age); guard++) {
    if (s.retired) throw new Error(`fixture retired at ${s.age}`);
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'contract_offer': s = s.pendingOffers.length ? E.acceptOffer(s, s.pendingOffers[last(s.pendingOffers.length)]) : { ...s, phase: 'playing' }; break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents[0] ? E.applyEventChoice(s, last(s.pendingEvents[0].choices.length), clubs) : { ...s, phase: 'playing' }; break;
      case 'moral_dilemma': s = s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, last(s.pendingMoralDilemma.choices.length)) : E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'transfer_window': s = E.stayAtClub(s); break;
      default: throw new Error(`unhandled phase ${s.phase}`);
    }
  }
  Math.random = realRandom;
  if (!(s.phase === 'playing' && s.age === age)) throw new Error(`never stood on Next Season at ${age}`);
  return seen(s);
}
/* A chance wheel the last card spun opens over the page on load until it is closed; these saves have seen it. */
function seen(s) { const out = { ...s }; delete out.chanceWheel; return out; }
const copy = v => JSON.parse(JSON.stringify(v));
const at25 = careerAt(25), at26 = careerAt(26);
seed(1519002);
let summary26 = E.advanceProSeason(copy(at25), clubs);
if (summary26.phase === 'newspaper') summary26 = E.dismissNewspaper(summary26);
Math.random = realRandom;
const real = E.manualRetire(copy(at26));
const FIXTURES = {
  at25,
  stray: { ...seen(copy(summary26)), retired: true },
  lost: { ...copy(real), phase: 'season_summary', pendingSummary: real.seasons[real.seasons.length - 1] },
};
const ended = s => !!s && (s.retired || ['retirement_ceremony', 'post_retirement', 'retired'].includes(s.phase));

const browser = await pw.chromium.launch({ headless: true });
const errors = [];
try {
  for (const width of [390, 1280]) {
    const touch = width < 1000;
    const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${width}: ${String(e).slice(0, 200)}`));
    const save = async () => { const raw = await page.evaluate(k => localStorage.getItem(k), KEY); return raw ? E.parseSoccerCareerSave(raw) : null; };
    const press = async locator => { await locator.scrollIntoViewIfNeeded(); if (touch) await locator.tap(); else await locator.click(); };
    const shot = async name => page.screenshot({ path: path.join(OUT, `shot-${width}-${name}.png`) });
    const load = async fixture => {
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      /* The rules card opens on a first visit; this walk has read it (it is the game's own key). */
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, v); }, [KEY, JSON.stringify(fixture)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-career-action-bar]', { timeout: 20000 });
    };
    const fits = async label => {
      const wide = await page.evaluate(() => document.documentElement.scrollWidth);
      check(wide <= width + 1, `${width} ${label}: no sideways scroll (${wide} wide)`);
    };
    /* Through the paper and the summary with their Continue buttons, reading the save after each. */
    const continueThrough = async () => {
      for (let i = 0; i < 4; i++) {
        const s = await save();
        if (!s || !['newspaper', 'season_summary'].includes(s.phase)) return;
        const before = await page.evaluate(k => localStorage.getItem(k), KEY);
        await press(page.getByRole('button', { name: /^Continue/ }).first());
        await page.waitForFunction(([k, b]) => localStorage.getItem(k) !== b, [KEY, before], { timeout: 10000 }).catch(() => {});
      }
    };

    /* 1. Next Season at 25, the paper and the summary, a reload. */
    await load(FIXTURES.at25);
    await press(page.locator('[data-career-action-bar] button').first());
    await page.waitForFunction(k => { try { return /"age":26/.test(localStorage.getItem(k) || ''); } catch { return false; } }, KEY, { timeout: 15000 }).catch(() => {});
    let s = await save();
    check(s && s.age === 26 && !ended(s), `${width} Next Season at 25 plays the season at 26 (age ${s?.age}, phase ${s?.phase}, retired ${s?.retired})`);
    await continueThrough();
    s = await save();
    check(s && !ended(s), `${width} the summary's Continue at 26 plays on (phase ${s?.phase}, retired ${s?.retired})`);
    await shot('after-summary'); await fits('after the summary');
    await page.reload({ waitUntil: 'networkidle' });
    s = await save();
    check(s && s.age === 26 && !ended(s), `${width} a reload at 26 keeps the career (phase ${s?.phase}, retired ${s?.retired})`);
    check(await page.getByRole('button', { name: /Share Legacy/ }).count() === 0, `${width} no retired screen after the reload`);

    /* 2. The Retire dialog: Cancel, then Confirm (the positive control). */
    await load(at26);
    const retire = page.locator('button', { hasText: /^🚪 Retire$/ });
    await press(retire);
    const dialog = page.getByRole('dialog', { name: 'Retire?' });
    check(await dialog.isVisible(), `${width} Retire opens the dialog`);
    await shot('retire-dialog');
    await press(dialog.getByRole('button', { name: 'Cancel' }));
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    s = await save();
    check(!(await dialog.isVisible()) && s && !ended(s) && s.phase === 'playing', `${width} Cancel keeps the career (phase ${s?.phase}, retired ${s?.retired})`);
    await press(retire);
    await press(page.getByRole('dialog', { name: 'Retire?' }).getByRole('button', { name: 'Confirm Retirement' }));
    await page.getByRole('button', { name: /Retire and Enjoy Life/ }).waitFor({ timeout: 10000 }).catch(() => {});
    s = await save();
    check(s && s.retired && s.phase === 'retirement_ceremony' && s.age === 26, `${width} Confirm Retirement ends it on the send off at 26 (phase ${s?.phase})`);
    check(await page.locator('[data-retirement-reason]').count() === 0, `${width} the player's own retirement gets no forced line`);
    for (const name of [/Retire and Enjoy Life/, /Become a Manager/, /Become a TV Pundit/]) check(await page.getByRole('button', { name }).count() === 1, `${width} the send off offers ${name}`);
    await shot('send-off'); await fits('on the send off');

    /* 3. A stray flag on the summary at 26 plays on. */
    await load(FIXTURES.stray);
    await continueThrough();
    s = await save();
    check(s && !ended(s), `${width} a stray flag on the summary at 26 plays on (phase ${s?.phase}, retired ${s?.retired})`);
    check(await page.getByRole('button', { name: /Share Legacy/ }).count() === 0, `${width} the stray flag never reaches the retired screen`);

    /* 4. A real retirement whose phase was lost opens its send off. */
    await load(FIXTURES.lost);
    await page.getByRole('button', { name: /Retire and Enjoy Life/ }).waitFor({ timeout: 10000 }).catch(() => {});
    check(await page.getByRole('button', { name: /Retire and Enjoy Life/ }).count() === 1 && (await page.textContent('body')).includes('retires at age 26'), `${width} a real retirement whose phase was lost opens its send off`);
    await shot('lost-phase');
    await ctx.close();
  }
} finally {
  await browser.close();
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ base: BASE, checks, failures, results, errors }, null, 2));
console.log(failures ? `\nplaySoccerCareerEndings: FAIL, ${failures} of ${checks} checks failed` : `\nplaySoccerCareerEndings: ${checks} checks, 0 failures`);
process.exit(failures ? 1 : 0);
