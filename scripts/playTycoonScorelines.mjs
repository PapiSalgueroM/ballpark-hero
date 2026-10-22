/**
 * Round 1532 walk (brief-1532 design 3.7.4, critic item 16): the real /stadium-tycoon
 * route on a served dist (BASE, default http://localhost:4173, the hostLikeServer a
 * remote check's #!serve gives), Supabase and ad hosts aborted.
 *
 *  a) A fresh visitor sees the rules first, at 320 x 640 (the modal only), 390 x 844
 *     and 1280 x 900, with reduced motion on and off. The match paragraph shows the
 *     even match example, the Squad level's worth and the goal, win and promotion
 *     bonuses, and every one of those numbers equals the engine's own, computed here
 *     in node from the same source the dist was built from. Nothing in the dialog is
 *     cut and the page has no horizontal overflow. The close button's size is printed
 *     (it predates this round).
 *  b) A save planted in division 3 at minute 89 with Squad at the division's par and
 *     a full ground (fanbase far above the seats, so the crowd cannot move inside the
 *     settling tick), Math.random pinned to 0.999 so nobody scores and no whistle
 *     lands: at 1 to 1 the floater reads FULL TIME DRAW; at 1 to 0 it reads FULL TIME
 *     WIN + the page's own grouped form of the engine's winBonus for that state.
 *  c) scrollY and the document height are the same before and after each full time.
 *  d) Pictures go to RC_OUT (or .walk-out): rules-<size>.png, draw-<size>.png,
 *     win-<size>.png. Look at them.
 * PLAY_SCORELINES_CONTROL=crowd expects the base engine's crowd scaled win bonus
 * (attendance x 2.2 x reputation) instead, and must go red on (b): proof that the
 * planted state tells the two apart. vitest 2 of src/test/tycoonHelp.test.tsx is the
 * proof that every win floater prints its event's amount (critic item 16).
 * Exit 0 green, 1 red.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.walk-out');
const CONTROL = process.env.PLAY_SCORELINES_CONTROL || '';
assert(['', 'crowd'].includes(CONTROL), `unknown PLAY_SCORELINES_CONTROL ${CONTROL}`);
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'stadiumTycoonSaveV1';

/* The engine, from the same source the dist was built from. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'play-scorelines-'));
const bundle = path.join(tmp, 'engine.mjs');
await build({
  stdin: { contents: `export * as T from ${JSON.stringify(path.join(ROOT, 'src/lib/stadiumTycoon.ts').split(path.sep).join('/'))};\nexport { formatNumber } from ${JSON.stringify(path.join(ROOT, 'src/lib/formatNumber.ts').split(path.sep).join('/'))};`, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { T, formatNumber } = await import(pathToFileURL(bundle).href);
/* The page's own grouping (StadiumTycoon.tsx formatMoneyText), applied to the hook's fmtMoney text. */
const pageMoney = text => text.replace(/\$(-?\d+(?:\.\d+)?)([KMBTQ]?)/g, (_t, amount, unit) => `$${formatNumber(amount)}${unit}`);
const scoring = T.scoringFacts();
const expectRules = [
  `you expect about ${scoring.evenFor} goals to their ${scoring.evenAgainst}`,
  `each Squad level adds about ${scoring.levelGoals} of a goal a match`,
  `A goal pays ${T.GOAL_BONUS_SEC} seconds of your income, a win ${T.WIN_BONUS_SEC} seconds and going up a division ${T.PROMOTION_BONUS_SEC / 60} minutes`,
];

let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const facts = {};
const browser = await chromium.launch();
async function context(w, h, reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  return ctx;
}
const dismissConsent = async page => { const reject = page.getByRole('button', { name: 'Reject all' }); if (await reject.count()) await reject.first().click({ noWaitAfter: true }).catch(() => {}); };

/* ---------- a) the rules, first thing a fresh visitor sees ---------- */
for (const [w, h] of [[320, 640], [390, 844], [1280, 900]]) {
  for (const reduced of [false, true]) {
    const tag = `${w}x${h}${reduced ? '-reduced' : ''}`;
    const f = facts[`rules-${tag}`] = {};
    const ctx = await context(w, h, reduced);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    const dialog = page.locator('[role="dialog"][aria-label="How Stadium Tycoon works"]');
    await dialog.waitFor({ timeout: 30000 });
    const para = dialog.locator('[data-tycoon-rules] p', { hasText: 'plays like football' });
    f.paragraph = (await para.innerText()).replace(/\s+/g, ' ');
    for (const want of expectRules) if (!f.paragraph.includes(want)) fail(`${tag}: the rules do not say "${want}": ${f.paragraph}`);
    f.overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (f.overflow > 0) fail(`${tag}: the page scrolls sideways by ${f.overflow} px`);
    const box = await dialog.boundingBox(); const pbox = await para.boundingBox();
    if (!box || !pbox || pbox.x < box.x - 0.5 || pbox.x + pbox.width > box.x + box.width + 0.5) fail(`${tag}: the paragraph leaves the dialog sideways`);
    f.cut = await para.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    if (f.cut) fail(`${tag}: the paragraph is cut`);
    const close = await dialog.locator('button[aria-label="Close the rules"]').boundingBox();
    f.closeButton = close ? `${Math.round(close.width)} x ${Math.round(close.height)}` : 'missing';
    if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
    /* The consent banner covers the lower half of a phone; answer it (reject) so the
       picture shows the rules, and reopen them if the answer closed the dialog. */
    await dismissConsent(page);
    await page.waitForTimeout(300);
    if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'How it works' }).first().click({ noWaitAfter: true }).catch(() => {});
    await para.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(OUT, `rules-${tag}.png`) });
    await ctx.close();
  }
}

/* ---------- b) and c) a planted full time, drawn and won ---------- */
const par3 = Math.round(T.DIVISIONS[3].rivalStrength / T.SQUAD_POINTS);
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const result of ['draw', 'win']) {
    const tag = `${w}x${h}`;
    const f = facts[`${result}-${tag}`] = {};
    const ctx = await context(w, h, false);
    const errors = [];
    const first = await ctx.newPage();
    first.on('pageerror', e => errors.push(String(e)));
    await first.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await first.waitForFunction(k => !!localStorage.getItem(k), T.TYCOON_SAVE_KEY, { timeout: 20000 });
    const fresh = JSON.parse(await first.evaluate(k => localStorage.getItem(k), T.TYCOON_SAVE_KEY));
    await first.close({ runBeforeUnload: true });
    const seed = {
      ...fresh, levels: { ...fresh.levels, squad: par3, stands: 30 }, fanbase: 50000, streak: 0,
      league: T.newLeague(fresh.rep ?? 0, 3, 0), bestDivision: 3, minute: 89, matchSec: 0,
      goalsFor: 1, goalsAgainst: result === 'win' ? 0 : 1,
      /* Every badge and milestone already earned: a planted ground this big would earn
         several in its first ticks (+2 percent income each), and the win would then be
         paid on more income than the planted save holds (the first run read 2,332 for
         2,046, seven badges). */
      ach: T.ACHIEVEMENTS.map(a => a.id), claimed: T.MILESTONES.map(m => m.id),
    };
    const now = Date.now();
    const loaded = T.deserializeTycoon(JSON.stringify({ ...seed, savedAt: now }), now);
    if (!loaded || T.divisionIndex(loaded) !== 3) fail(`${tag}: the planted save does not load into division 3`);
    const amount = CONTROL === 'crowd' ? Math.round(T.attendance(loaded) * 2.2 * T.repMult(loaded)) : T.winBonus(loaded);
    const want = result === 'win' ? `FULL TIME WIN +${pageMoney(T.fmtMoney(amount))}` : 'FULL TIME DRAW';
    f.want = want;
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(({ k, v }) => {
      const s = JSON.parse(v); s.savedAt = Date.now();
      localStorage.setItem(k, JSON.stringify(s));
      Math.random = () => 0.999;
    }, { k: T.TYCOON_SAVE_KEY, v: JSON.stringify(seed) });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await page.keyboard.press('Escape');
    await dismissConsent(page);
    const before = await page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
    let seen = '';
    for (let i = 0; i < 250 && !seen; i += 1) {
      const text = await page.evaluate(() => document.body.innerText);
      const m = text.match(/FULL TIME (?:WIN \+\$[0-9,.]+[KMBTQ]?|DRAW)/);
      if (m) seen = m[0]; else await page.waitForTimeout(100);
    }
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
    f.seen = seen;
    if (seen !== want) fail(`${tag}: the ${result} floater read "${seen || 'nothing'}", the engine says "${want}"`);
    f.scroll = `${before.y} to ${after.y}, height ${before.h} to ${after.h}`;
    if (before.y !== after.y || before.h !== after.h) fail(`${tag}: the page moved at full time (${f.scroll})`);
    if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
    await page.screenshot({ path: path.join(OUT, `${result}-${tag}.png`) });
    await ctx.close();
  }
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'playTycoonScorelines.json'), JSON.stringify(facts, null, 2));
for (const [k, v] of Object.entries(facts)) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 400)}`);
console.log(`playTycoonScorelines${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures ? `${failures} failure${failures === 1 ? '' : 's'}` : 'green'}`);
process.exit(failures ? 1 : 0);
