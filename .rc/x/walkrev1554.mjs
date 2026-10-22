// Review of Round 1554 (run lens): play CFB Dynasty and CBB Dynasty as a player would, on a served build,
// database host blocked. 390x844 and 1280x900, reduced motion on and off. Old saves are written by the BASE
// engine (/tmp/base, bundled here) and seeded into localStorage. Screenshots go to RC_OUT.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from 'playwright';

const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.tmp-fx/walkrev';
const BASE_TREE = process.env.BASE_TREE || '/tmp/base';
fs.mkdirSync(OUT, { recursive: true });
let checks = 0; let failed = 0;
const check = (ok, what) => { checks += 1; if (!ok) { failed += 1; console.log('  FAIL: ' + what); } else console.log('  ok: ' + what); };
const note = m => console.log('  NOTE: ' + m);

/* ---- old saves from the base engine ---- */
function lehmer(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walkrev-'));
const out = path.join(TMP, 'base.mjs');
await build({
  stdin: { contents: `export * as cfb from '${BASE_TREE}/src/lib/cfbDynasty.ts';\nexport * as cbb from '${BASE_TREE}/src/lib/cbbDynasty.ts';\n`, resolveDir: BASE_TREE, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': `${BASE_TREE}/src` }, nodePaths: [path.join(process.cwd(), 'node_modules')],
});
const OLD = await import(pathToFileURL(out).href);
const oldCfb = (() => {
  const rng = lehmer(4711);
  const st = OLD.cfb.initCfb('ND', rng, { depth: true });
  for (let r = 1; r <= 5; r += 1) { OLD.cfb.simCfbRound(st, rng); st.round += 1; }
  return JSON.stringify({ st, phase: 'season', recruits: null, portal: null, postseason: null });
})();
const oldCbb = (() => {
  const rng = lehmer(4712);
  const st = OLD.cbb.initCbb('DUKE', rng, { depth: true });
  for (let r = 1; r <= 4; r += 1) { OLD.cbb.simCbbRound(st, rng); st.round += 1; }
  return JSON.stringify({ st, phase: 'season', recruits: null, portal: null, march: null });
})();

const browser = await pw.chromium.launch();
const errors = [];
async function open(vw, vh, motion, route, save) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  if (save) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('walk-seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('walk-seeded', '1'); } }, save);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${route} ${vw}: ${e.message}`));
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return { ctx, page };
}
const tag = (vw, motion) => `${vw}-${motion === 'reduce' ? 'rm' : 'mo'}`;
const shot = async (page, name) => { const el = page.locator('#dukb-main > :nth-child(2)').first(); try { await el.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }); } catch { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }); } };
const noScroll = async (page, where) => check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `no horizontal scroll on ${where}`);
const tab = async (page, name) => { const b = page.getByRole('button', { name: new RegExp(`^${name}$`) }).first(); if (await b.count()) { await b.click(); await page.waitForTimeout(250); return true; } note(`no ${name} tab`); return false; };
const body = page => page.evaluate(() => document.querySelector('#dukb-main')?.children[1]?.innerText ?? '');
async function overlaps(page) {
  /* text boxes inside the main card that overflow their parent horizontally (cut off) */
  return page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('main *')) {
      if (!el.childElementCount && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && !/truncate/.test(el.className)) bad.push(el.textContent.trim().slice(0, 60));
    }
    return bad.slice(0, 8);
  });
}
async function playOut(page, maxWeeks = 12) {
  let n = 0;
  for (let i = 0; i < maxWeeks; i += 1) {
    const btn = page.getByRole('button', { name: /^(Play Week \d+|Final week \+ the Playoff|Play Round \d+|Final round \+ March|.*Selection Sunday.*)$/ }).first();
    if (!(await btn.count())) break;
    await btn.click(); n += 1;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  return n;
}

const VIEWS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference']];
for (const [vw, vh, motion] of VIEWS) {
  const t = tag(vw, motion);
  console.log(`== ${t}`);
  /* Flow 1: a new dynasty as UNLV (a Group of Five school): welcome, Play, Schedule, Conferences. */
  try {
    const { ctx, page } = await open(vw, vh, motion, '/cfb-dynasty');
    if (motion === 'reduce') {
      const pick = await body(page);
      check(/independent/i.test(pick) && /Notre Dame/.test(pick), `${t}: the pick screen lists Notre Dame under Independent`);
      await shot(page, `${t}-pick`);
    }
    await page.getByRole('button', { name: /UNLV/ }).first().click();
    await page.waitForTimeout(500);
    const welcome = await body(page);
    check(/Group of Five's automatic Playoff spot to chase/.test(welcome), `${t}: UNLV welcome names the Group of Five spot`);
    await shot(page, `${t}-unlv-start`);
    if (await tab(page, 'Play')) { const p = await body(page); check(/This week: (vs|at) /.test(p), `${t}: UNLV Play tab names this week's opponent`); await shot(page, `${t}-unlv-play`); await noScroll(page, `${t} UNLV Play`); }
    if (await tab(page, 'Schedule')) {
      const s = await body(page);
      const rows = (s.match(/^W\d+ (vs|at) /gm) || []);
      check(rows.length === 12, `${t}: UNLV Schedule lists twelve games (found ${rows.length})`);
      const opps = rows.map(r => r);
      check(new Set(s.match(/^W\d+ (vs|at) ([^\n(]+)/gm)?.map(x => x.replace(/^W\d+ (vs|at) /, '').trim())).size === 12, `${t}: UNLV Schedule has twelve different opponents`);
      await shot(page, `${t}-unlv-schedule`); await noScroll(page, `${t} UNLV Schedule`);
      const cut = await overlaps(page); if (cut.length) note(`${t} Schedule cut text: ${cut.join(' | ')}`);
    }
    if (await tab(page, 'Conferences')) {
      const c = await body(page);
      check(/Independent/i.test(c) && /\(auto spot\)/.test(c), `${t}: Conferences has the Independent table and the auto spot mark`);
      check(!/G5 Championship/.test(c), `${t}: no G5 Championship on Conferences`);
      await shot(page, `${t}-unlv-conferences`); await noScroll(page, `${t} UNLV Conferences`);
    }
    if (vw === 390 && motion === 'reduce') {
      await tab(page, 'Play');
      const n = await playOut(page);
      const recap = await body(page);
      check(n === 12, `${t}: twelve presses to the recap (pressed ${n})`);
      check(/Group of Five spot: /.test(recap) && !/G5 Championship/.test(recap), `${t}: recap names the Group of Five spot, no G5 title game`);
      check((recap.match(/Championship/g) || []).length >= 4, `${t}: recap lists the title games`);
      await shot(page, `${t}-unlv-recap`); await noScroll(page, `${t} UNLV recap`);
      const r1 = page.getByRole('button', { name: /Hit the recruiting trail/ }).first();
      if (await r1.count()) {
        await r1.click(); await page.waitForTimeout(400);
        const r2 = page.getByRole('button', { name: /Close the class, run it back/ }).first();
        if (await r2.count()) {
          await r2.click(); await page.waitForTimeout(500);
          await tab(page, 'Schedule');
          const s2 = await body(page);
          const rows2 = (s2.match(/^W\d+ (vs|at) /gm) || []).length;
          check(rows2 === 12, `${t}: season two Schedule lists twelve games (found ${rows2})`);
          await shot(page, `${t}-unlv-season2-schedule`);
        } else note('no Close the class button');
      } else note('no recruiting button on the recap');
    }
    await ctx.close();
  } catch (e) { check(false, `${t}: flow 1 crashed: ${String(e).slice(0, 200)}`); }

  /* Flow 2: a new dynasty as Ohio State: rivalry week is Michigan, named as a real series. */
  try {
    const { ctx, page } = await open(vw, vh, motion, '/cfb-dynasty');
    await page.getByRole('button', { name: /Ohio State/ }).first().click();
    await page.waitForTimeout(500);
    if (await tab(page, 'Play')) {
      const p = await body(page);
      const line = (p.match(/rivalry week[^\n]*/i) || [''])[0];
      console.log(`  ${t} OSU rivalry line: ${line}`);
      check(/Michigan/.test(line), `${t}: OSU rivalry line names Michigan`);
      await shot(page, `${t}-osu-play`);
    }
    if (await tab(page, 'Schedule')) {
      const s = await body(page);
      const w12 = (s.match(/^W12 [^\n]*/m) || [''])[0];
      console.log(`  ${t} OSU week 12: ${w12}`);
      check(/Michigan/.test(w12) && /🔥/.test(w12), `${t}: OSU week 12 is Michigan with the rivalry mark`);
      await shot(page, `${t}-osu-schedule`);
    }
    await ctx.close();
  } catch (e) { check(false, `${t}: flow 2 crashed: ${String(e).slice(0, 200)}`); }

  /* Flow 3: an old CFB save (base engine, Notre Dame, layer on, five weeks played). */
  try {
    const { ctx, page } = await open(vw, vh, motion, '/cfb-dynasty', ['cfb-dynasty-save-v1', oldCfb]);
    const first = await body(page);
    note(`${t} old save opened, ${first.length} chars`);
    if (await tab(page, 'Play')) {
      const p = await body(page);
      check(/Play Week 6/.test(p), `${t}: the old save opens on week 6`);
      check(!/set before kickoff/.test(p), `${t}: the old season keeps the old Play wording`);
      check(!/This week: /.test(p), `${t}: the old season has no fixed this-week line`);
      console.log(`  ${t} old save rivalry line: ${(p.match(/rivalry week[^\n]*/i) || [''])[0]}`);
      await shot(page, `${t}-old-play`); await noScroll(page, `${t} old Play`);
    }
    if (await tab(page, 'Schedule')) {
      const s = await body(page);
      const rows = (s.match(/^W\d+ (vs|at) /gm) || []).length;
      console.log(`  ${t} old save schedule rows ${rows}`);
      check(rows === 5, `${t}: the old save lists its five played games`);
      await shot(page, `${t}-old-schedule`); await noScroll(page, `${t} old Schedule`);
    }
    if (await tab(page, 'Conferences')) {
      const c = await body(page);
      check(!/Independent/i.test(c), `${t}: the old season shows no Independent table`);
      await shot(page, `${t}-old-conferences`); await noScroll(page, `${t} old Conferences`);
    }
    if (vw === 390 && motion === 'reduce') {
      await tab(page, 'Play');
      const n = await playOut(page, 8);
      const recap = await body(page);
      check(n === 7, `${t}: the old season needs seven presses (pressed ${n})`);
      check((recap.match(/Championship/g) || []).length >= 5, `${t}: the old season recap keeps five title games`);
      console.log(`  ${t} old recap title lines: ${(recap.match(/[^\n]*Championship[^\n]*/g) || []).slice(0, 7).join(' / ')}`);
      await shot(page, `${t}-old-recap`);
      const r1 = page.getByRole('button', { name: /Hit the recruiting trail/ }).first();
      if (await r1.count()) {
        await r1.click(); await page.waitForTimeout(400);
        const r2 = page.getByRole('button', { name: /Close the class, run it back/ }).first();
        if (await r2.count()) {
          await r2.click(); await page.waitForTimeout(500);
          await tab(page, 'Schedule');
          const s2 = await body(page);
          check((s2.match(/^W\d+ (vs|at) /gm) || []).length === 12, `${t}: the old save's next season lists twelve games`);
          await shot(page, `${t}-old-season2-schedule`);
          await tab(page, 'Conferences');
          check(/Independent/i.test(await body(page)), `${t}: the old save's next season shows Notre Dame independent`);
          await shot(page, `${t}-old-season2-conferences`);
        }
      }
    }
    await ctx.close();
  } catch (e) { check(false, `${t}: flow 3 crashed: ${String(e).slice(0, 200)}`); }

  /* Flow 4: CBB, a new dynasty and an old save, the league table. */
  try {
    const { ctx, page } = await open(vw, vh, motion, '/cbb-dynasty');
    await page.getByRole('button', { name: /Duke/ }).first().click();
    await page.waitForTimeout(500);
    await tab(page, 'Play');
    await playOut(page, 3);
    const std = page.getByRole('button', { name: /^(Conferences|Leagues)$/ }).first();
    if (await std.count()) { await std.click(); await page.waitForTimeout(250); }
    const c = await body(page);
    check(/\d+-\d+ \(\d+-\d+\)/.test(c), `${t}: CBB table shows league (overall) records`);
    await shot(page, `${t}-cbb-new-table`); await noScroll(page, `${t} CBB table`);
    await ctx.close();
    const o = await open(vw, vh, motion, '/cbb-dynasty', ['cbb-dynasty-save-v1', oldCbb]);
    const std2 = o.page.getByRole('button', { name: /^(Conferences|Leagues)$/ }).first();
    if (await std2.count()) { await std2.click(); await o.page.waitForTimeout(250); }
    const c2 = await body(o.page);
    console.log(`  ${t} old CBB table sample: ${(c2.match(/[^\n]*\d+-\d+[^\n]*/g) || []).slice(0, 3).join(' / ')}`);
    await shot(o.page, `${t}-cbb-old-table`); await noScroll(o.page, `${t} old CBB table`);
    await o.ctx.close();
  } catch (e) { check(false, `${t}: flow 4 crashed: ${String(e).slice(0, 200)}`); }
}
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
for (const e of errors.slice(0, 10)) console.log('  PAGEERROR: ' + e);
check(errors.length === 0, `no page errors (${errors.length})`);
console.log(`walkrev1554: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
