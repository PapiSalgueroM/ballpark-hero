/**
 * Round 1051 browser harness: the Hall of Fame card's "what the voters
 * weighed" line, walked like a person on all four US My Career routes.
 *
 * simCareerHall proves the score and the words; the vitest board cases prove
 * the stamp in jsdom. This proves the thing a player sees: he presses "Hang
 * them up now", the save on his device is stamped, the card shows the line,
 * the page does not jump while it lands, and a career he retired before this
 * round opens exactly as it was told, with no line.
 *
 * For each route, at 390 by 844 and 1280 by 800, with motion and with
 * reduced motion:
 *   1) an active save is retired through the board: "Hang them up now" and
 *      its confirmation on the hub, or "Retire now" where the save opens on
 *      the retirement talk (a career long enough to pile up a standout total
 *      is often inside the talk's rule; in baseball every one found is). The
 *      save now carries today's hallCal (3 since Round 1301), [data-hall-weighs] is in the card and
 *      fully shown, its text is the line worked out for that career before
 *      he retired, the legacy pill is the calibration 2 score, headline,
 *      line and score are the engine's reading of the career as the board
 *      saved it, the settled page is not wider than the viewport, the card's
 *      first button is inside the viewport and can be pressed, scrollY did
 *      not move between the headline landing and the line landing, at 390
 *      the line is at most four lines of text, and a reload shows the same
 *      score, headline and line and writes nothing.
 *   2) a retired save with no stamp (one the version 1 fixture recorded on
 *      the base's code): the load writes nothing, no line, the headline and
 *      the score are the recorded ones, and no stamp appears.
 *   3) with reduced motion the line is fully shown within 100 ms of the card
 *      mounting.
 * The saves are built here, on this tree's engines, from one seeded stream a route,
 * so the walk needs nothing but a served build:
 *
 *   npm run build && node scripts/lib/hostLikeServer.mjs dist 4173
 *   ENGINES=chromium node scripts/playCareerHallLine.mjs
 *
 * Every request to the database host is aborted: the walk never reaches it.
 * The site has one colour scheme (it does not follow the system's), so the
 * screenshots (SHOTS=<dir>, default .tmp-fx/shots) are one set, not two.
 *
 * What the width check reads, and why: the retired screen's own slam (the
 * "<name> retires" line, there since Round 1039) scales past a 390 wide
 * viewport for a few frames while it lands, on old saves exactly as on new
 * ones. That is not this round's and is reported, so the check reads the
 * SETTLED page and prints the widest frame beside it.
 *
 * NEGATIVE CONTROL: PLAY_CONTROL=noline seeds case 1's save already retired
 * and unstamped, which is what a career retired before this round is. The
 * stamp, the line, its text and the calibration 2 score must then all be
 * missing, each of those checks must fail, and nothing else may. The run
 * refuses to count if no save was swapped. Under the house rule for browser
 * controls (scripts/lib/servedCodeControl.mjs) a control run exits 0 when
 * every guarded check fired.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const SHOTS = process.env.SHOTS || path.join(ROOT, '.tmp-fx', 'shots');
const CONTROL = process.env.PLAY_CONTROL || '';
if (CONTROL && CONTROL !== 'noline') {
  console.error(`PLAY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const { say: tell, verdict } = controlledChecks(CONTROL);
let checks = 0;
const say = (ok, what, guarded = false) => { checks += 1; tell(ok, what, guarded); };
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const ONLY = (process.env.ONLY_SPORTS || 'nfl,nba,mlb,nhl').split(',');

const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality' },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality' },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality' },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality' },
};
const saveKey = sport => `${sport}-my-career-save-v1`;
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/careerHallV1.json'), 'utf8'));

/* The saves a walk seeds, built on this tree's engines: one active career
   whose line will name a standout (the longest such line found, so the four
   line limit is tested where it is tightest), one active career with none,
   and one retired save the fixture recorded before this round. */
async function savesFor(sport) {
  const E = ENGINES[sport];
  const out = path.join(os.tmpdir(), `play-hall-line-${sport}-${process.pid}.mjs`);
  const entry = [
    `export { ${E.legacy} as LEGACY, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
    `export { ${E.hall} as HALL } from './src/lib/${sport}CareerHall.ts';`,
    `export { hallRecordFor, stampHallCalibration } from './src/lib/careerHallOfFame.ts';`,
    `export { retirementTalk } from './src/lib/careerRetirement.ts';`,
    `export { hallHeadline } from './src/components/career/HallOfFameCard.tsx';`,
  ].join('\n');
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT,
    logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic', banner: { js: "import { createRequire as __lineRequire } from 'node:module'; const require = __lineRequire(import.meta.url);" },
  });
  const eng = await import(pathToFileURL(out).href);
  try { fs.unlinkSync(out); } catch { /* the temp file is only a copy */ }
  const HALL = eng.HALL;
  /* One stream a sport, so a route's saves are the same whichever routes are walked beside it. */
  let seed = (1051000 + Object.keys(ENGINES).indexOf(sport)) >>> 0;
  Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const positions = Object.keys(eng.ARCH);
  /* What the board will show when this active career hangs them up: retire a copy, stamp it, read it. */
  const ifRetired = (c, stamp) => { const k = JSON.parse(JSON.stringify(c)); k.retired = true; if (stamp) eng.stampHallCalibration(k); return { legacy: eng.LEGACY(k), rec: eng.hallRecordFor(HALL, k), career: k }; };
  /* A standout total takes a long career, and a long career is often inside the retirement talk's rule
     (in baseball always, on this stream): such a save opens on the talk, and the walk retires it there,
     through "Retire now". One that still opens on the hub is preferred, so the hub's own button is walked
     wherever the engine offers the choice. */
  const best = { hub: null, talk: null }, seen = { hub: 0, talk: 0 };
  let plain = null;
  for (let i = 0; i < 1500 && (!plain || (seen.hub < 25 && (i < 600 || seen.talk < 25))); i += 1) {
    const pos = positions[i % positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Walker ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null;
    for (let y = 0; y < 30 && !c.retired; y += 1) {
      tq = eng.roll(tq, Math.random); eng.season(c, tq, Math.random); eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) break;
      if (c.seasons.length < 10) continue;
      const via = HALL.retirement && eng.retirementTalk(HALL.retirement, HALL.snapshot(c), undefined) ? 'talk' : 'hub';
      const live = JSON.parse(JSON.stringify(c));
      live.pendingRivalryEvent = null; live.pendingRivalryChoice = null; live.suspendedSeasons = 0;
      const on2 = ifRetired(live, true), on1 = ifRetired(live, false);
      if (!on2.rec.weighs) continue;
      const pack = { active: JSON.stringify({ c: live, phase: 'season', teamQuality: tq, coach: null }), retiredUnstamped: JSON.stringify({ c: on1.career, phase: 'retired', teamQuality: tq, coach: null }), pos, via, seasons: live.seasons.length, score: on2.legacy.score, score1: on1.legacy.score, weighs: on2.rec.weighs, cal: on2.career.hallCal };
      const said = / sat near the top of this game's books\.$/.test(on2.rec.weighs);
      if (said && on2.legacy.score !== on1.legacy.score) { seen[via] += 1; if (!best[via] || pack.weighs.length > best[via].weighs.length) best[via] = pack; }
      else if (!said && !on2.legacy.standout && via === 'hub' && !plain) plain = pack;
    }
  }
  const e = FIXTURE.sports[sport].find(x => x.hall.outcome === 'inducted') ?? FIXTURE.sports[sport][0];
  const old = { id: e.id, save: JSON.stringify({ c: e.save, phase: 'retired', teamQuality: null, coach: null }), score: e.legacy.score, headline: eng.hallHeadline(e.hall, HALL.rules) };
  /* What the engine says of a career AS THE BOARD SAVED IT (the board writes the year he retired, which the class year reads). */
  const told = c => { const rec = eng.hallRecordFor(HALL, c); return { score: eng.LEGACY(c).score, weighs: rec.weighs ?? null, headline: eng.hallHeadline(rec, HALL.rules) }; };
  return { standout: best.hub ?? best.talk, plain, old, told };
}

const browser = await chromium.launch();
const proof = CONTROL ? { seededRetired: 0 } : {};
let walks = 0;

async function open(sport, vp, reduce, save) {
  const ctx = await browser.newContext({ viewport: SIZES[vp], reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|googletagmanager|google-analytics|doubleclick|adservice/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const route = `/${sport}-my-career`;
  /* Seeded once a context: a reload must read what the page itself saved. */
  await page.addInitScript(([key, value, r]) => {
    try {
      if (sessionStorage.getItem('hall-line-seeded')) return;
      localStorage.setItem(`rules-gate-seen:${r}`, '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(key, value);
      sessionStorage.setItem('hall-line-seeded', '1');
    } catch { /* storage refused: the checks below will say so */ }
  }, [saveKey(sport), save, route]);
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('main button').first().waitFor({ state: 'visible', timeout: 30000 });
  walks += 1;
  return { ctx, page, errors };
}

/* Runs in the page: one sample a frame while the card reveals. Opacity is
   the product up the tree, because the line rides its block's animation. */
const SAMPLER = () => {
  const t0 = performance.now();
  const w = (window.__hallLine = { samples: [] });
  const shown = el => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity || '1'); return Math.round(o * 100) / 100; };
  const tick = () => {
    const head = document.querySelector('h3.cm-slam');
    const line = document.querySelector('[data-hall-weighs]');
    const s = { y: Math.round(window.scrollY), card: !!head, head: head ? shown(head) : null, line: line ? shown(line) : null, docW: document.documentElement.scrollWidth };
    const last = w.samples[w.samples.length - 1];
    if (!last || last.y !== s.y || last.card !== s.card || last.head !== s.head || last.line !== s.line || last.docW !== s.docW) w.samples.push({ t: Math.round(performance.now() - t0), ...s });
    if (performance.now() - t0 < 40000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/* An engine built save can open on a pending beat (a rivalry card): press
   through it the way a player does, until `done` says the screen is there. */
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

const readSave = (page, sport) => page.evaluate(k => localStorage.getItem(k), saveKey(sport));
const pill = page => page.locator('span:has-text("Legacy") b').first().textContent({ timeout: 5000 }).catch(() => null);
const cardOf = page => page.locator('h3.cm-slam').first().locator('xpath=..');

/* Case 1 (and 3): an active career is retired through the hub. `kind` names
   the save; guarded checks (the third argument of say) are the ones the
   noline control is aimed at. */
async function retireCase(sport, vp, reduce, kind, want, told) {
  const tag = `${sport} ${kind} ${vp}${reduce ? ' reduced' : ''}`;
  const { ctx, page, errors } = await open(sport, vp, reduce, CONTROL ? want.retiredUnstamped : want.active);
  if (CONTROL) proof.seededRetired += 1;
  try {
    const hub = page.getByRole('button', { name: 'Hang them up now' });
    const talk = page.getByRole('button', { name: /Retire now/ }).first();
    const retired = page.getByRole('button', { name: 'New career' }).first();
    const door = want.via === 'talk' ? talk : hub;
    await passBeats(page, async () => (await door.isVisible()) || (await retired.isVisible()));
    if (CONTROL) await page.evaluate(SAMPLER);
    else {
      await door.waitFor({ state: 'visible', timeout: 15000 });
      await door.scrollIntoViewIfNeeded();
      if (want.via === 'talk') {
        // Inside the retirement talk's rule the save opens on the talk, and "Retire now" is the board's retirement.
        await page.evaluate(SAMPLER);
        await door.click();
      } else {
        await door.click();
        const confirm = page.getByRole('button', { name: 'Retire this player' });
        await confirm.waitFor({ state: 'visible', timeout: 10000 });
        await page.evaluate(SAMPLER);
        await confirm.click();
      }
    }
    await page.locator('h3.cm-slam').first().waitFor({ state: 'attached', timeout: 25000 });
    const line = page.locator('[data-hall-weighs]');
    await line.waitFor({ state: 'attached', timeout: CONTROL ? 4000 : 20000 }).catch(() => {});
    // The ballot ticks in first when motion is on: wait for the block that holds the line to land.
    await page.waitForFunction(() => { const s = window.__hallLine.samples; const l = s[s.length - 1]; return !!l && (l.line === null ? l.head >= 0.99 : l.line >= 0.99); }, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(700);
    const samples = await page.evaluate(() => window.__hallLine.samples);
    const has = await line.count();
    const mounted = samples.find(s => s.card), headFull = samples.find(s => s.card && s.head >= 0.99), lineFull = samples.find(s => s.line !== null && s.line >= 0.99);
    say(has === 1 && !!lineFull, `${tag}: the line is in the card and fully shown`, true);
    const raw = await readSave(page, sport);
    const saved = raw ? JSON.parse(raw) : null;
    say(saved?.c?.retired === true && want.cal >= 3 && saved?.c?.hallCal === want.cal, `${tag}: the save is retired and stamped hallCal ${want.cal}, today's calibration (it reads ${saved?.c?.hallCal})`, true);
    const text = has ? (await line.textContent()) ?? '' : '';
    say(text === want.weighs, `${tag}: the line is the engine's own for this career${text === want.weighs ? '' : ` (page "${text}", engine "${want.weighs}")`}`, true);
    const score = await pill(page);
    say(String(score) === String(want.score), `${tag}: the legacy pill is the calibration 2 score (pill ${score}, engine ${want.score}, calibration 1 ${want.score1})`, want.score !== want.score1);
    if (!CONTROL) {
      if (reduce && mounted && lineFull) say(lineFull.t - mounted.t <= 100, `${tag}: with reduced motion the line is shown within 100 ms of the card mounting (${lineFull.t - mounted.t} ms)`);
      if (headFull && lineFull) say(headFull.y === lineFull.y, `${tag}: scrollY is the same when the headline lands and when the line lands (${headFull.y}, ${lineFull.y})`);
      const ys = [...new Set(samples.filter(s => s.card).map(s => s.y))];
      say(ys.length === 1, `${tag}: the page did not jump while the card revealed (scrollY ${ys.join(', ')})`);
      const box = has ? await line.boundingBox() : null;
      const lineHeight = has ? await line.evaluate(el => parseFloat(getComputedStyle(el).lineHeight) || 16) : 16;
      const lines = box ? Math.round(box.height / lineHeight) : 0;
      say(!!box && box.x >= 0 && box.x + box.width <= SIZES[vp].width, `${tag}: the line sits inside the viewport (${box ? `${Math.round(box.width)} by ${Math.round(box.height)} px, ${lines} lines, ${text.length} characters` : 'no box'})`);
      if (vp === 390) say(lines >= 1 && lines <= 4, `${tag}: at most four lines of text at 390 wide (${lines})`);
    }
    const settled = await page.evaluate(() => document.documentElement.scrollWidth);
    const widest = Math.max(...samples.map(s => s.docW));
    say(settled <= SIZES[vp].width, `${tag}: the settled page is not wider than the viewport (${settled} of ${SIZES[vp].width}; widest frame while landing ${widest})`);
    const first = cardOf(page).locator('button').first();
    const bb = await first.boundingBox().catch(() => null);
    const pressable = await first.click({ trial: true, timeout: 8000 }).then(() => true, () => false);
    say(!!bb && bb.x >= 0 && bb.x + bb.width <= SIZES[vp].width && pressable, `${tag}: the card's first button is inside the viewport and can be pressed`);
    if (has) await line.scrollIntoViewIfNeeded().catch(() => {});
    if (reduce || CONTROL) await page.screenshot({ path: path.join(SHOTS, `${sport}-${kind}-${vp}${CONTROL ? '-control' : ''}.png`) }).catch(() => {});
    if (!CONTROL) {
      const head = await page.locator('h3.cm-slam').first().textContent();
      const before = JSON.stringify({ score, text, head });
      const engine = saved?.c ? told(saved.c) : null;
      say(!!engine && engine.headline === head && engine.weighs === text && String(engine.score) === String(score), `${tag}: headline, line and score are the engine's reading of the career as saved ("${engine?.headline}")`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-hall-weighs]').waitFor({ state: 'attached', timeout: 25000 }).catch(() => {});
      const after = JSON.stringify({ score: await pill(page), text: await page.locator('[data-hall-weighs]').textContent({ timeout: 5000 }).catch(() => null), head: await page.locator('h3.cm-slam').first().textContent({ timeout: 5000 }).catch(() => null) });
      say(before === after, `${tag}: a reload shows the same score, headline and line`);
      const again = await readSave(page, sport);
      say(again === raw, `${tag}: the reload wrote nothing`);
    }
    say(errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.join(' ; ')})` : ''}`);
  } catch (err) {
    say(false, `${tag}: the walk threw (${String(err).slice(0, 240)})`);
    await page.screenshot({ path: path.join(SHOTS, `${sport}-${kind}-${vp}-threw.png`), fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }
}

/* Case 2: a save retired before this round, as the base's code recorded it. */
async function oldCase(sport, vp, reduce, old) {
  const tag = `${sport} old save ${vp}${reduce ? ' reduced' : ''}`;
  const { ctx, page, errors } = await open(sport, vp, reduce, old.save);
  try {
    say((await readSave(page, sport)) === old.save, `${tag}: the load alone wrote nothing (${old.id})`);
    const retired = page.getByRole('button', { name: 'New career' }).first();
    await passBeats(page, () => retired.isVisible());
    await retired.waitFor({ state: 'visible', timeout: 15000 });
    const head = page.locator('h3.cm-slam').first();
    await head.waitFor({ state: 'attached', timeout: 25000 });
    say((await head.textContent()) === old.headline, `${tag}: the headline is the one the fixture recorded ("${old.headline}")`);
    say((await page.locator('[data-hall-weighs]').count()) === 0, `${tag}: no line on a career retired before this round`);
    const score = await pill(page);
    say(String(score) === String(old.score), `${tag}: the legacy pill is the recorded score (pill ${score}, recorded ${old.score})`);
    const raw = await readSave(page, sport);
    const c = raw ? JSON.parse(raw).c : null;
    say(!!c && c.retired === true && !('hallCal' in c), `${tag}: the save still carries no stamp`);
    say(errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.join(' ; ')})` : ''}`);
  } catch (err) {
    say(false, `${tag}: the walk threw (${String(err).slice(0, 240)})`);
    await page.screenshot({ path: path.join(SHOTS, `${sport}-old-${vp}-threw.png`), fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }
}

fs.mkdirSync(SHOTS, { recursive: true });
let routes = 0;
for (const sport of ONLY) {
  if (!ENGINES[sport]) { console.error(`ONLY_SPORTS names ${sport}, which is not a route this harness walks`); process.exit(1); }
  const saves = await savesFor(sport);
  routes += 1;
  console.log(`\n/${sport}-my-career`);
  if (!saves.standout || !saves.plain) { say(false, `${sport}: the engine gave no active career ${saves.standout ? 'without' : 'with'} a standout to walk`); continue; }
  console.log(`  saves: standout ${saves.standout.pos}, ${saves.standout.seasons} seasons, retired through the ${saves.standout.via}, ${saves.standout.score1} then ${saves.standout.score}, line of ${saves.standout.weighs.length} characters; plain ${saves.plain.pos}, ${saves.plain.seasons} seasons, ${saves.plain.score}; old ${saves.old.id}`);
  if (CONTROL) { await retireCase(sport, 390, true, 'standout', saves.standout, saves.told); continue; }
  for (const vp of [390, 1280]) {
    for (const reduce of [false, true]) {
      await retireCase(sport, vp, reduce, 'standout', saves.standout, saves.told);
      await oldCase(sport, vp, reduce, saves.old);
    }
  }
  await retireCase(sport, 390, true, 'plain', saves.plain, saves.told);
}
await browser.close();

/* Four guarded checks a route under the control; the count is printed either way so nothing passes empty. */
const code = verdict('playCareerHallLine', proof, { minGuarded: 4 * routes });
console.log(`playCareerHallLine: ${routes} routes, ${walks} walks, ${checks} checks${CONTROL ? `, control ${CONTROL}` : ''}, ${code === 0 ? (CONTROL ? 'the control fired on every guarded check' : 'all checks passed') : 'RED'}`);
process.exit(code);
