/* Round 1524 closing check probe (sent as .rc/x/probeOwnerPanelFail.mjs on a served build, never committed).
   Question: an owner save is open and the owner screens' chunk cannot load. Does the panel say so with Retry,
   and does Retry bring the panel back once the chunk can load? Before the fix the panel's placeholder was a
   blank box and the season button stayed disabled under it. 390 by 844 (touch) and 1280 by 900.
   PROBE_SERVE_DIR=<dist> serves that build itself on 4175 (the base arm, the negative control).
   Exit 0 green, 1 a check failed (FIRED for the base arm), 2 the probe could not run (ABORT). */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SERVE = process.env.PROBE_SERVE_DIR || '';
const BASE = SERVE ? 'http://localhost:4175' : (process.env.BASE || 'http://localhost:4173');
const TAG = process.env.PROBE_TAG || (SERVE ? 'base' : 'head');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', `probepanel-${Date.now()}`);
fs.mkdirSync(OUT, { recursive: true });
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const OWNER_CHUNK = /\/assets\/[^/?]*(OwnerTail|soccerCareerOwner)[^/?]*\.js(\?|$)/;
const abort = m => { console.log(`PROBE ABORT (${TAG}): ${m}`); process.exit(2); };

let server = null;
if (SERVE) {
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', SERVE, '4175'], { cwd: ROOT, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 40 && !up; i += 1) {
    await new Promise(r => setTimeout(r, 250));
    up = await fetch(BASE + '/robots.txt').then(r => r.ok).catch(() => false);
  }
  if (!up) abort('the base build did not come up on 4175');
}
const owners = fs.readdirSync(path.join(SERVE || path.join(ROOT, 'dist'), 'assets')).filter(f => /(OwnerTail|soccerCareerOwner)[^/]*\.js$/.test(f));
console.log(`${TAG}: owner chunks in the build: ${owners.join(', ') || 'none'}`);
if (!owners.length) abort('no owner chunk in the build');

/* the owner save: a seeded career to its ceremony, rich, buying the list's first club through the engine */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probepanel-'));
const R = p => path.join(ROOT, p).replaceAll('\\', '/');
fs.writeFileSync(path.join(tmp, 'e.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${R('src/lib/soccerCareerEngine.ts')}';
export * as S from '${R('src/lib/soccerCareerSave.ts')}';
`);
await build({ entryPoints: [path.join(tmp, 'e.mjs')], outfile: path.join(tmp, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { E, S } = await import(pathToFileURL(path.join(tmp, 'b.mjs')).href);
const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const REAL = Math.random;
Math.random = mulberry32(2403);
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let c = E.initCareer('Panel Owner', 'Spain', 'CM', '2020s', flat(70), 70, 2020, E.FALLBACK_CLUBS, null, 90);
for (let i = 0; i < 16 && !c.retired; i += 1) {
  c = c.phase === 'youth' ? E.advanceYouthYear(c, E.FALLBACK_CLUBS) : c.phase === 'retirement_suggestion' ? E.acceptRetirementSuggestion(c) : E.advanceProSeason(c, E.FALLBACK_CLUBS);
  if (c.transferSituation) c = { ...c, transferSituation: null };
}
if (!c.retired) c = E.manualRetire(c);
Math.random = REAL;
await E.loadOwnerTail();
const own = E.choosePostRetirement({ ...c, netWorth: 320 }, 'owner', E.FALLBACK_CLUBS);
if (own.phase !== 'owner_season' || !own.ownerState || !(own.ownerState.debt > 0)) abort(`the save is not an owner save with debt (phase ${own.phase})`);
const RAW = S.serializeSoccerCareerSave(own);
console.log(`${TAG}: owner save at ${own.ownerState.club}, tier ${own.ownerState.clubTier}, debt ${own.ownerState.debt}`);

const FAIL_TEXT = "Couldn't load your club's screen";
let failures = 0;
const check = (ok, m) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${m}`); if (!ok) failures += 1; };
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `${TAG} ${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  let aborted = 0;
  const blockOwner = r => { aborted += 1; return r.abort(); };
  await ctx.route(OWNER_CHUNK, blockOwner);
  const p = await ctx.newPage();
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(r => { localStorage.clear(); localStorage.setItem('soccerCareerSave', r); }, RAW);
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /^reject all$/i }).first().click({ timeout: 2500 }).catch(() => {});
  for (let i = 0; i < 4; i += 1) { if (await p.locator('[role="dialog"]:visible').count() === 0) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const season = p.getByRole('button', { name: /Next Owner Season/ });
  if (!(await season.waitFor({ timeout: 30000 }).then(() => true).catch(() => false))) abort(`${tag}: the owner bar never showed`);
  const shown = await p.getByText(FAIL_TEXT).first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
  if (aborted === 0) abort(`${tag}: no owner chunk request was blocked`);
  await p.screenshot({ path: path.join(OUT, `panel-${TAG}-${w}-blocked.png`) });
  check(shown, `${tag}: with the owner chunk blocked (${aborted} requests) the panel says "${FAIL_TEXT}"`);
  const retry = p.getByRole('button', { name: /Retry/ });
  const retryShown = shown && await retry.isVisible().catch(() => false);
  check(retryShown, `${tag}: the panel offers Retry`);
  check(await season.isDisabled(), `${tag}: Next Owner Season waits (disabled) while no call can be made`);
  check(await p.getByRole('button', { name: /^Sell Club$/ }).isEnabled().catch(() => false), `${tag}: Sell Club still works`);
  if (retryShown) {
    await ctx.unroute(OWNER_CHUNK, blockOwner);
    await Promise.all([p.waitForEvent('load', { timeout: 30000 }).catch(() => null), retry.click()]);
    const panel = p.locator('[data-testid="owner-panel"]');
    const back = await panel.waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    check(back, `${tag}: Retry reloads and the owner panel comes back once the chunk can load`);
    if (back) {
      const debtLine = (await p.locator('[data-plan="debt"]').innerText().catch(() => '')).replace(/\s+/g, ' ');
      check(/the lenders take €[\d.]+M for paying early/.test(debtLine), `${tag}: the debt call names its fee ("${debtLine}")`);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 0, `${tag}: no sideways scroll with the panel up (${over} px over)`);
      await p.locator('[data-plan="debt"]').scrollIntoViewIfNeeded().catch(() => {});
      await p.screenshot({ path: path.join(OUT, `panel-${TAG}-${w}-retried.png`) });
    }
  }
  await ctx.close();
}
await browser.close();
if (server) server.kill();
console.log(failures ? `probeOwnerPanelFail (${TAG}): ${failures} check(s) failed` : `probeOwnerPanelFail (${TAG}): green`);
process.exit(failures ? 1 : 0);
