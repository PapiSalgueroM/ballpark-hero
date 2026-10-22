// Review walk (run lens, Round 1532): play the new match outcomes the way a player meets them.
// BASE from env (a #!serve request gives http://localhost:4173), supabase and ad hosts aborted,
// pictures into RC_OUT. Scenarios, each at 390x844 and 1280x900 with reduced motion on and off:
//   rules     the first visit rules dialog (and 320x640)
//   loss      division 3 at par, minute 89, 0 to 1, nobody can score: "full time. beaten"
//   promote   the last matchday of division 3, top by 23 points, 1 to 0: title, promotion card,
//             its amount against the engine's 120 seconds of the new division's income
//   lost      the last matchday, 5 points behind the leader, 1 to 0: a season you lose
//   summit    the last matchday at The Summit, top, 1 to 0: the Summit title card
// Exit 1 on a hard failure (page error, a wrong amount, the page moving, sideways scroll).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.walk-out');
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-walk-'));
const bundle = path.join(tmp, 'engine.mjs');
await build({ stdin: { contents: `export * as T from ${JSON.stringify(path.join(ROOT, 'src/lib/stadiumTycoon.ts'))};\nexport { formatNumber } from ${JSON.stringify(path.join(ROOT, 'src/lib/formatNumber.ts'))};`, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { T, formatNumber } = await import(pathToFileURL(bundle).href);
const pageMoney = text => text.replace(/\$(-?\d+(?:\.\d+)?)([KMBTQ]?)/g, (_t, a, u) => `$${formatNumber(a)}${u}`);

let failures = 0; const facts = {};
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const browser = await chromium.launch();
async function context(w, h, reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  return ctx;
}
const dismissConsent = async page => { const b = page.getByRole('button', { name: 'Reject all' }); if (await b.count()) await b.first().click({ noWaitAfter: true }).catch(() => {}); };

/** A final matchday table: row i has played `md` matches with w wins, 0 draws. */
function table(lg, md, winsOf) {
  return lg.clubs.map((c, i) => { const w = winsOf(i); return { ...c, w, d: 0, l: md - w, gf: w * 2, ga: md - w, pts: w * 3 }; });
}
function seedFor(fresh, kind) {
  const d = kind === 'summit' ? 9 : 3;
  const lg = T.newLeague(fresh.rep ?? 0, d, 0);
  const last = T.leagueShape(d).matchdays - 1;
  const par = Math.round(T.DIVISIONS[d].rivalStrength / T.SQUAD_POINTS);
  let league = lg;
  if (kind !== 'loss') {
    const winsOf = kind === 'lost' ? (i => (i === 0 ? last - 3 : i === 1 ? last - 1 : 1)) : (i => (i === 0 ? last : 1));
    league = { ...lg, matchday: last, clubs: table(lg, last, winsOf) };
  }
  return {
    ...fresh, levels: { ...fresh.levels, squad: par, stands: 30 }, fanbase: 50000, streak: 0, league, bestDivision: d,
    minute: 89, matchSec: 0, goalsFor: kind === 'loss' ? 0 : 1, goalsAgainst: kind === 'loss' ? 1 : 0,
    ach: T.ACHIEVEMENTS.map(a => a.id), claimed: T.MILESTONES.map(m => m.id),
  };
}

const sizes = [[390, 844, true], [390, 844, false], [1280, 900, true], [1280, 900, false]];
let fresh = null;
for (const [w, h, reduced] of [[320, 640, false], ...sizes]) {
  const tag = `${w}${reduced ? '-rm' : ''}`;
  const ctx = await context(w, h, reduced); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  const dialog = page.locator('[role="dialog"][aria-label="How Stadium Tycoon works"]');
  await dialog.waitFor({ timeout: 30000 });
  await page.waitForFunction(k => !!localStorage.getItem(k), T.TYCOON_SAVE_KEY, { timeout: 20000 });
  if (!fresh) fresh = JSON.parse(await page.evaluate(k => localStorage.getItem(k), T.TYCOON_SAVE_KEY));
  await dismissConsent(page); await page.waitForTimeout(300);
  if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'How it works' }).first().click({ noWaitAfter: true }).catch(() => {});
  const para = dialog.locator('[data-tycoon-rules] p', { hasText: 'plays like football' });
  await para.scrollIntoViewIfNeeded().catch(() => {});
  facts[`rules-${tag}`] = { text: (await para.innerText()).replace(/\s+/g, ' '), overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), errors };
  await page.screenshot({ path: path.join(OUT, `rules-${tag}.png`) });
  if (errors.length) fail(`rules ${tag}: ${errors.join(' | ')}`);
  await ctx.close();
}

for (const kind of ['loss', 'promote', 'lost', 'summit']) {
  for (const [w, h, reduced] of sizes) {
    const tag = `${kind}-${w}${reduced ? '-rm' : ''}`;
    const f = facts[tag] = {};
    const seed = seedFor(fresh, kind);
    const now = Date.now();
    const loaded = T.deserializeTycoon(JSON.stringify({ ...seed, savedAt: now }), now);
    f.loaded = loaded ? { div: T.divisionIndex(loaded), md: loaded.league?.matchday, mine: loaded.league?.clubs?.[0]?.pts, gap: Math.round(T.matchGap(loaded) * 100) / 100 } : null;
    const sim = T.tick(structuredClone(loaded), 0.25, () => 0.999);
    f.engine = sim.events.map(e => `${e.kind}${e.amount !== undefined ? ` ${e.amount}` : ''}${e.label ? ` ${e.label}` : ''}`);
    const ctx = await context(w, h, reduced); const errors = [];
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(({ k, v }) => { const s = JSON.parse(v); s.savedAt = Date.now(); localStorage.setItem(k, JSON.stringify(s)); Math.random = () => 0.999; }, { k: T.TYCOON_SAVE_KEY, v: JSON.stringify(seed) });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await page.keyboard.press('Escape'); await dismissConsent(page);
    const before = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }));
    const want = { loss: /full time\. beaten/, promote: /promotion bonus/, lost: /Season over/, summit: /promotion bonus|CHAMPIONS/ }[kind];
    let text = '';
    for (let i = 0; i < 200; i += 1) { text = await page.evaluate(() => document.body.innerText); if (want.test(text)) break; await page.waitForTimeout(100); }
    await page.waitForTimeout(kind === 'loss' ? 200 : 900);
    const after = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }));
    f.seen = (text.match(/(full time\. beaten|FULL TIME[^\n]*|Season over[^\n]*|CHAMPIONS[^\n]*|\+\$[^\n]*promotion bonus[^\n]*|PROMOTED[^\n]*)/g) || []).slice(0, 6);
    f.scroll = `${before.y}->${after.y} h ${before.h}->${after.h}`;
    f.running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    f.overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (!want.test(text)) fail(`${tag}: never showed ${want}`);
    if (before.y !== after.y || before.h !== after.h) fail(`${tag}: the page moved (${f.scroll})`);
    if (f.overflow > 0) fail(`${tag}: sideways scroll ${f.overflow}`);
    if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
    const paid = sim.events.find(e => (kind === 'summit' ? e.kind === 'title' : e.kind === 'promoted'));
    if (kind === 'promote' || kind === 'summit') {
      const card = page.locator('[data-promotion-card]');
      f.card = (await card.count()) ? (await card.innerText()).replace(/\s+/g, ' ') : 'no card';
      const variants = paid ? [T.fmtMoney(paid.amount), pageMoney(T.fmtMoney(paid.amount))] : [];
      f.wantAmount = variants;
      if (!paid || !variants.some(v => f.card.includes(`+${v}`))) fail(`${tag}: the card reads "${f.card}", the engine paid ${paid?.amount} (${variants.join(' or ')})`);
      if (paid) f.paidSeconds = Math.round((paid.amount / T.unboostedIncomePerSec(sim.state)) * 100) / 100;
    }
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    if (kind === 'lost' || kind === 'promote') {
      const btn = page.locator('[data-promotion-card] button'); if (await btn.count()) await btn.first().click({ noWaitAfter: true }).catch(() => {});
      const room = page.locator('[data-league-room]');
      if (await room.count()) { await room.first().scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, `${tag}-league.png`) }); f.league = (await room.first().innerText()).replace(/\s+/g, ' ').slice(0, 500); }
      else f.league = 'no league room on screen';
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'review-walk.json'), JSON.stringify(facts, null, 1));
for (const [k, v] of Object.entries(facts)) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 600)}`);
console.log(`review walk: ${failures ? `${failures} failures` : 'green'}`);
process.exit(failures ? 1 : 0);
