/* Review of Round 1301 (runner only, never committed): the Hall card as a player sees it, on saves the OLD code made.
   Run from the repo root against a served build: BASE=http://localhost:4173 RC_OUT=<dir> node .rc/x/walk1301.mjs
   A) a career the old code retired on calibration 2 (the committed fixture, origin/main and Round 1226's head),
      chosen as the ones calibration 3 would take OUT of the Hall, plus a near miss: opens exactly as it was told.
   B) a career the old code left open: the player hangs them up today, the save is stamped 3 and the pill is the
      calibration 3 score.
   C) one stamped save of football, basketball and baseball: as told.
   D) the "?" help of the NHL route: the Hall rule and its example are there.
   390 by 844 and 1280 by 900, with motion and with reduced motion. Every request to the database host is aborted. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHOTS = process.env.RC_OUT ? path.join(process.env.RC_OUT) : path.join(ROOT, '.tmp-fx', 'review-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 900 } };
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/careerHallSaves1301.json'), 'utf8'));
const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', roll: 'rollTeamQuality' },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', roll: 'nbaRollTeamQuality' },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', roll: 'mlbRollTeamQuality' },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', roll: 'nhlRollTeamQuality' },
};
const saveKey = sport => `${sport}-my-career-save-v1`;
const clone = x => JSON.parse(JSON.stringify(x));
let fails = 0, checks = 0;
const say = (ok, what) => { checks += 1; if (!ok) fails += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

async function engine(sport) {
  const E = ENGINES[sport];
  const out = path.join(os.tmpdir(), `review-walk-${sport}-${process.pid}.mjs`);
  const entry = [
    `export { ${E.legacy} as LEGACY, ${E.roll} as roll } from './src/lib/${E.file}';`,
    `export { ${E.hall} as HALL } from './src/lib/${sport}CareerHall.ts';`,
    `export { hallRecordFor, HALL_CALIBRATION } from './src/lib/careerHallOfFame.ts';`,
    `export { hallHeadline } from './src/components/career/HallOfFameCard.tsx';`,
    `export { ${sport}HallHelpRules as helpRules } from './src/lib/${sport}CareerHall.ts';`,
  ].join('\n');
  await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic', banner: { js: "import { createRequire as __w } from 'node:module'; const require = __w(import.meta.url);" } });
  const eng = await import(pathToFileURL(out).href);
  try { fs.unlinkSync(out); } catch { /* only a copy */ }
  return eng;
}

const browser = await chromium.launch();
async function open(sport, vp, reduce, save) {
  const ctx = await browser.newContext({ viewport: SIZES[vp], reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|googletagmanager|google-analytics|doubleclick|adservice/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const route = `/${sport}-my-career`;
  await page.addInitScript(([key, value, r]) => {
    try {
      if (sessionStorage.getItem('review-seeded')) return;
      localStorage.setItem(`rules-gate-seen:${r}`, '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (value !== null) localStorage.setItem(key, value);
      sessionStorage.setItem('review-seeded', '1');
    } catch { /* storage refused: the checks will say so */ }
  }, [saveKey(sport), save, route]);
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('main button').first().waitFor({ state: 'visible', timeout: 30000 });
  return { ctx, page, errors };
}
const readSave = (page, sport) => page.evaluate(k => localStorage.getItem(k), saveKey(sport));
const pill = page => page.locator('span:has-text("Legacy") b').first().textContent({ timeout: 5000 }).catch(() => null);
async function passBeats(page, done) {
  for (let i = 0; i < 16; i += 1) {
    if (await done().catch(() => false)) return i;
    const opt = page.locator('[data-rivalry-option="0"]').first();
    const go = page.locator('main').getByRole('button', { name: 'Continue', exact: true }).first();
    if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {});
    else if (await go.isVisible().catch(() => false)) await go.click().catch(() => {});
    await page.waitForTimeout(600);
  }
  return -1;
}
const settle = async page => { await page.waitForTimeout(2600); };
const widthOk = async (page, vp) => (await page.evaluate(() => document.documentElement.scrollWidth)) <= SIZES[vp].width;

/* A and C: a save the old code retired and stamped, opened on today's build. */
async function retiredCase(sport, eng, e, vp, reduce, shot) {
  const tag = `${e.id} ${e.kind} ${vp}${reduce ? ' reduced' : ''}`;
  const seeded = JSON.stringify({ c: e.save, phase: 'retired', teamQuality: null, coach: null });
  const { ctx, page, errors } = await open(sport, vp, reduce, seeded);
  try {
    const again = page.getByRole('button', { name: 'New career' }).first();
    await passBeats(page, () => again.isVisible());
    await again.waitFor({ state: 'visible', timeout: 15000 });
    const head = page.locator('h3.cm-slam').first();
    await head.waitFor({ state: 'attached', timeout: 25000 });
    await settle(page);
    const want = eng.hallHeadline(e.hall, eng.HALL.rules);
    const got = await head.textContent();
    say(got === want, `${tag}: the headline is the one the old code told ("${want}"${got === want ? '' : `, page "${got}"`})`);
    const score = await pill(page);
    say(String(score) === String(e.legacy.score), `${tag}: the legacy pill is the score the old code told (pill ${score}, told ${e.legacy.score})`);
    const line = page.locator('[data-hall-weighs]');
    const text = (await line.count()) ? await line.first().textContent() : undefined;
    say(text === e.hall.weighs, `${tag}: the card's sentence is the one the old code told${text === e.hall.weighs ? '' : ` (page "${text}", told "${e.hall.weighs}")`}`);
    const raw = await readSave(page, sport);
    const c = raw ? JSON.parse(raw).c : null;
    say(!!c && c.retired === true && c.hallCal === 2, `${tag}: the save still carries the stamp 2 (reads ${c?.hallCal})`);
    say(raw === seeded, `${tag}: the load wrote nothing`);
    say(await widthOk(page, vp), `${tag}: the settled page is not wider than the viewport`);
    say(errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.join(' ; ')})` : ''}`);
    if (shot) { await head.scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: path.join(SHOTS, `${shot}.png`) }); }
  } catch (err) {
    say(false, `${tag}: the walk threw (${String(err).slice(0, 240)})`);
    await page.screenshot({ path: path.join(SHOTS, `threw-${sport}-${vp}-${reduce ? 'r' : 'm'}.png`), fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }
}

/* B: a career the old code left open, hung up today through the board. */
async function openCase(eng, e, vp, reduce, shot) {
  const tag = `${e.id} open ${vp}${reduce ? ' reduced' : ''}`;
  const live = clone(e.save);
  live.pendingRivalryEvent = null; live.pendingRivalryChoice = null; live.suspendedSeasons = 0;
  let seed = 771301;
  const rng = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tq = eng.roll(null, rng);
  const on3 = eng.LEGACY({ ...clone(live), retired: true, hallCal: 3 });
  const on2 = eng.LEGACY({ ...clone(live), retired: true, hallCal: 2 });
  const { ctx, page, errors } = await open('nhl', vp, reduce, JSON.stringify({ c: live, phase: 'season', teamQuality: tq, coach: null }));
  try {
    const hub = page.getByRole('button', { name: 'Hang them up now' });
    const talk = page.getByRole('button', { name: /Retire now/ }).first();
    const done = page.getByRole('button', { name: 'New career' }).first();
    await passBeats(page, async () => (await hub.isVisible()) || (await talk.isVisible()) || (await done.isVisible()));
    if (shot) await page.screenshot({ path: path.join(SHOTS, `${shot}-before.png`) });
    let via = 'talk';
    if (await talk.isVisible().catch(() => false)) await talk.click();
    else {
      via = 'hub';
      await hub.waitFor({ state: 'visible', timeout: 15000 });
      await hub.scrollIntoViewIfNeeded();
      await hub.click();
      const confirm = page.getByRole('button', { name: 'Retire this player' });
      await confirm.waitFor({ state: 'visible', timeout: 10000 });
      if (shot) await page.screenshot({ path: path.join(SHOTS, `${shot}-confirm.png`) });
      await confirm.click();
    }
    const head = page.locator('h3.cm-slam').first();
    await head.waitFor({ state: 'attached', timeout: 25000 });
    await settle(page);
    const raw = await readSave(page, 'nhl');
    const c = raw ? JSON.parse(raw).c : null;
    say(!!c && c.retired === true && c.hallCal === 3, `${tag}: retired through the ${via}, the save is stamped 3 (reads ${c?.hallCal})`);
    const now = c ? eng.LEGACY(c) : null;
    const score = await pill(page);
    say(!!now && String(score) === String(now.score), `${tag}: the pill is the engine's reading of the save the board wrote (pill ${score}, engine ${now?.score})`);
    say(!!now && now.score === on3.score, `${tag}: that is the calibration 3 score worked out before he retired (${on3.score}; on calibration 2 it would be ${on2.score}; the old code would have told ${e.toldIfRetiredThen?.score})`);
    const want = c ? eng.hallHeadline(eng.hallRecordFor(eng.HALL, c), eng.HALL.rules) : null;
    const got = await head.textContent();
    say(got === want, `${tag}: the headline is the engine's for the save ("${want}"${got === want ? '' : `, page "${got}"`})`);
    say(await widthOk(page, vp), `${tag}: the settled page is not wider than the viewport`);
    if (shot) { await head.scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: path.join(SHOTS, `${shot}.png`) }); }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('h3.cm-slam').first().waitFor({ state: 'attached', timeout: 25000 });
    await settle(page);
    say(String(await pill(page)) === String(score) && (await page.locator('h3.cm-slam').first().textContent()) === got, `${tag}: a reload shows the same score and headline`);
    say((await readSave(page, 'nhl')) === raw, `${tag}: the reload wrote nothing`);
    say(errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.join(' ; ')})` : ''}`);
  } catch (err) {
    say(false, `${tag}: the walk threw (${String(err).slice(0, 240)})`);
    await page.screenshot({ path: path.join(SHOTS, `threw-open-${vp}-${reduce ? 'r' : 'm'}.png`), fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }
}

/* D: the "?" of the route, opened on a retired save. */
async function helpCase(eng, e, vp) {
  const tag = `nhl help ${vp}`;
  const { ctx, page, errors } = await open('nhl', vp, true, JSON.stringify({ c: e.save, phase: 'retired', teamQuality: null, coach: null }));
  try {
    await page.getByRole('button', { name: 'New career' }).first().waitFor({ state: 'visible', timeout: 15000 });
    const trigger = page.getByRole('button', { name: /how to play/i }).first();
    say(await trigger.isVisible().catch(() => false), `${tag}: the "?" is on the page`);
    await trigger.click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const body = await page.evaluate(() => document.body.innerText);
    for (const rule of eng.helpRules()) say(body.includes(rule), `${tag}: the help prints "${rule.slice(0, 70)}..."`);
    say(!/8[24] games|82-game|84-game/.test(body.split('The rules')[1] ?? ''), `${tag}: the rules name no season length that could be stale`);
    await page.screenshot({ path: path.join(SHOTS, `D-help-${vp}.png`) });
    say(errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.join(' ; ')})` : ''}`);
  } catch (err) {
    say(false, `${tag}: the walk threw (${String(err).slice(0, 240)})`);
    await page.screenshot({ path: path.join(SHOTS, `threw-help-${vp}.png`), fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }
}

const nhl = await engine('nhl');
say(nhl.HALL_CALIBRATION === 3, `today's calibration is 3 (reads ${nhl.HALL_CALIBRATION})`);
console.log('\nA. NHL careers the old code retired on calibration 2');
let helpSave = null;
for (const r of FX.recordings) {
  const ret = r.sports.nhl.filter(e => e.kind !== 'open');
  const on3 = e => nhl.LEGACY({ ...clone(e.save), hallCal: 3 });
  const out = ret.filter(e => e.legacy.hof && !on3(e).hof);
  console.log(`  ${r.tag}: ${ret.length} retired, calibration 3 would take out ${out.length}: ${out.map(e => `${e.id} ${e.legacy.score} to ${on3(e).score}`).join(', ')}`);
  say(out.length >= 1, `${r.tag}: the fixture holds a Hall of Famer calibration 3 would take out`);
  helpSave ??= out[0];
  const near = ret.find(e => e.kind === 'nearPush');
  for (const [n, e] of [...out.slice(0, 2), ...(near ? [near] : [])].entries()) {
    for (const vp of [390, 1280]) for (const reduce of [false, true]) {
      await retiredCase('nhl', nhl, e, vp, reduce, n === 0 ? `A-${r.tag}-${vp}-${reduce ? 'reduced' : 'motion'}` : (e.kind === 'nearPush' && vp === 390 && reduce ? `A-${r.tag}-near-390` : null));
    }
  }
}
console.log('\nB. NHL careers the old code left open, hung up today');
for (const r of FX.recordings) {
  const e = r.sports.nhl.find(x => x.kind === 'open');
  if (!e) { say(false, `${r.tag}: no open career in the fixture`); continue; }
  for (const vp of [390, 1280]) for (const reduce of [false, true]) await openCase(nhl, e, vp, reduce, r.tag === 'r1226' || (vp === 390 && !reduce) ? `B-${r.tag}-${vp}-${reduce ? 'reduced' : 'motion'}` : null);
}
console.log('\nC. Football, basketball and baseball: one stamped save each, as told');
for (const sport of ['nfl', 'nba', 'mlb']) {
  const eng = await engine(sport);
  const e = FX.recordings[1].sports[sport].find(x => x.kind !== 'open' && x.legacy.hof) ?? FX.recordings[1].sports[sport].find(x => x.kind !== 'open');
  await retiredCase(sport, eng, e, 390, false, `C-${sport}-390`);
  await retiredCase(sport, eng, e, 1280, true, null);
}
console.log('\nD. The help');
for (const vp of [390, 1280]) await helpCase(nhl, helpSave, vp);
await browser.close();
console.log(`walk1301: ${checks} checks, ${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
