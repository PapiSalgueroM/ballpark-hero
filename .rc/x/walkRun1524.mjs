/* Round 1524 run reviewer's walk (sent as .rc/x/walkRun1524.mjs on a served build, never committed).
   A player who retires rich, opens the clubs for sale, goes back, buys the dearest club, plays four seasons
   (one per call, in a different order from the builder's walk), reloads; a player at exactly 200M; and an
   owner save written by the BASE engine (before this round), loaded in the browser and played on.
   390 by 844 (touch) and 1280 by 900, each with reduced motion on and off. Supabase and ad hosts blocked. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', `walkrun-${Date.now()}`);
fs.mkdirSync(OUT, { recursive: true });
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
let failures = 0, checks = 0;
const check = (ok, what) => { checks += 1; if (!ok) { failures += 1; console.log(`  FAIL: ${what}`); } else console.log(`  ok: ${what}`); };
const note = m => console.log(`  note: ${m}`);

/* the engines: this tree, and the base's engine and league module (the tree before this round) */
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const MB = git(['merge-base', 'HEAD', 'origin/main']);
console.log(`head ${git(['rev-parse', 'HEAD']).slice(0, 10)}, base ${MB.slice(0, 10)}`);
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
const baseFiles = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLeague.ts'];
const basePlugin = { name: 'base', setup(b) {
  const want = new Map(baseFiles.map(f => [norm(path.join(ROOT, f)), f]));
  b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    const f = want.get(norm(args.path));
    return f ? { contents: git(['show', `${MB}:${f}`]), loader: 'ts' } : undefined;
  });
} };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walkrun-'));
const R = p => path.join(ROOT, p).replaceAll('\\', '/');
async function bundle(name, plugins) {
  const entry = path.join(tmp, `${name}.entry.mjs`), out = path.join(tmp, `${name}.mjs`);
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${R('src/lib/soccerCareerEngine.ts')}';
export * as S from '${R('src/lib/soccerCareerSave.ts')}';
`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, plugins });
  return import(pathToFileURL(out).href);
}
const HEADM = await bundle('head', []);
const BASEM = await bundle('base', [basePlugin]);
const E = HEADM.E, S = HEADM.S, BE = BASEM.E;
if (typeof E.loadOwnerTail !== 'function' || typeof BE.loadOwnerTail === 'function') { console.log('WALK ABORT: the head and base bundles are not what they claim'); process.exit(2); }

const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const REAL = Math.random;
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function ceremony(eng, name, seed) {
  Math.random = mulberry32(seed);
  try {
    let c = eng.initCareer(name, 'Spain', 'CM', '2020s', flat(70), 70, 2020, eng.FALLBACK_CLUBS, null, 90);
    for (let i = 0; i < 16 && !c.retired; i += 1) {
      c = c.phase === 'youth' ? eng.advanceYouthYear(c, eng.FALLBACK_CLUBS) : c.phase === 'retirement_suggestion' ? eng.acceptRetirementSuggestion(c) : eng.advanceProSeason(c, eng.FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
    }
    if (!c.retired) c = eng.manualRetire(c);
    return c;
  } finally { Math.random = REAL; }
}
const RICH_C = { ...ceremony(E, 'Run Owner', 2401), netWorth: 320 };
const EXACT_C = { ...ceremony(E, 'Run Owner', 2401), netWorth: 200 };
let OLD_C = { ...ceremony(BE, 'Old Owner', 2402), netWorth: 300 };
Math.random = mulberry32(77);
OLD_C = BE.choosePostRetirement(OLD_C, 'owner', BE.FALLBACK_CLUBS);
OLD_C = BE.advanceOwnerSeason(OLD_C);
OLD_C = BE.advanceOwnerSeason(OLD_C);
Math.random = REAL;
console.log(`rich: phase ${RICH_C.phase}, ${RICH_C.seasons.length} seasons; old: phase ${OLD_C.phase}, club ${OLD_C.ownerState?.club} tier ${OLD_C.ownerState?.clubTier}, rows ${OLD_C.ownerState?.seasonResults?.length}`);
if (RICH_C.phase !== 'retirement_ceremony' || OLD_C.phase !== 'owner_season' || 'debt' in (OLD_C.ownerState || {})) { console.log('WALK ABORT: the seeded saves are not what they claim'); process.exit(2); }
const RAW = { rich: S.serializeSoccerCareerSave(RICH_C), exact: S.serializeSoccerCareerSave(EXACT_C), old: S.serializeSoccerCareerSave(OLD_C) };
fs.writeFileSync(path.join(OUT, 'old-save.json'), RAW.old);
const BANDS = { 4: [50, 8], 3: [100, 12], 2: [250, 24] };

const browser = await chromium.launch();
const errorsOf = new Map();
async function open(w, h, motion, raw) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: motion });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  errorsOf.set(p, errs);
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(r => { localStorage.clear(); localStorage.setItem('soccerCareerSave', r); }, raw);
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await settle(p);
  return { ctx, p };
}
async function settle(p) {
  await p.getByRole('button', { name: /^reject all$/i }).first().click({ timeout: 2500 }).catch(() => {});
  for (let i = 0; i < 4; i += 1) {
    if (await p.locator('[role="dialog"]:visible').count().catch(() => 0) === 0) break;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = (p, name, full = false) => p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }).catch(e => note(`shot ${name}: ${e}`));
const seasonButton = p => p.locator('button', { hasText: /Next Owner Season|Pick where the budget goes/ }).first();
/* elements inside `sel` whose text is cut: wider content than box, for text bearing leaves */
const cut = (p, sel) => p.locator(sel).first().evaluate(root => [...root.querySelectorAll('*')]
  .filter(e => e.children.length === 0 && (e.textContent || '').trim() && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')
  .map(e => (e.textContent || '').trim().slice(0, 60))).catch(() => ['(could not measure)']);
/* every animated element in `sel`: its animation name and opacity right now */
const anim = (p, sel) => p.locator(sel).first().evaluate(root => [...root.querySelectorAll('.cm-rise, .cm-tick-in')]
  .map(e => ({ name: getComputedStyle(e).animationName, op: Number(getComputedStyle(e).opacity) }))).catch(() => []);
const outside = (p, sel, w) => p.locator(sel).evaluateAll((els, w) => els.filter(e => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > w + 0.5; }).length, w);
async function motionCheck(p, sel, motion, tag, what) {
  const a = await anim(p, sel);
  const names = [...new Set(a.map(x => x.name))].join(' ');
  if (!a.length) { note(`${tag}: ${what}: no animated element`); return; }
  if (motion === 'reduce') check(a.every(x => x.name === 'none' && x.op >= 0.99), `${tag}: ${what} stands still and shown under reduced motion (${a.length} elements, ${names})`);
  else check(a.some(x => x.name !== 'none'), `${tag}: ${what} animates with motion on (${a.length} elements, ${names})`);
}
const tilesOf = sale => sale.locator('[data-testid="owner-club-for-sale"]').evaluateAll(els => els.map(e => [...e.querySelectorAll('div')].map(d => (d.textContent || '').trim())));
function listTruth(tag, list, nw) {
  for (const l of list) {
    const tier = Number((/Tier (\d)/.exec(l[1] || '') || [])[1]);
    const band = BANDS[tier];
    check(!!band && l[2] === `€${band[0]}M` && l[3] === `€${band[1]}M debt` && band[0] <= nw, `${tag}: ${l[0]} (${l[1]}) at ${l[2]}, ${l[3]} is its tier's band and within €${nw}M`);
  }
}

async function journeyRich(w, h, motion) {
  const tag = `${w}x${h}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  console.log(tag);
  let { ctx, p } = await open(w, h, motion, RAW.rich);
  const buy = p.getByRole('button', { name: /Buy a Football Club/ });
  await buy.waitFor({ timeout: 30000 });
  await buy.evaluate(e => e.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(motion === 'reduce' ? 300 : 3000);
  await shot(p, `${tag}-0-ceremony`);
  await buy.click();
  const sale = p.locator('[data-testid="owner-club-sale"]');
  await sale.waitFor({ timeout: 20000 });
  await p.waitForTimeout(150);
  await motionCheck(p, '[data-testid="owner-club-sale"]', motion, tag, 'the clubs for sale');
  await p.waitForTimeout(motion === 'reduce' ? 200 : 1500);
  const list = await tilesOf(sale);
  check(list.length === 6, `${tag}: six clubs for sale at €320M (${list.length}: ${list.map(l => l[0]).join(', ')})`);
  listTruth(tag, list, 320);
  check((await sale.innerText()).includes("not real figures"), `${tag}: the list says the prices are the game's estimates`);
  check(await outside(p, '[data-testid="owner-club-for-sale"]', w) === 0, `${tag}: every club tile inside the screen`);
  const cutSale = await cut(p, '[data-testid="owner-club-sale"]');
  if (cutSale.length) note(`${tag}: text cut short on the list: ${cutSale.join(' | ')}`);
  check(await sideways(p) <= 0, `${tag}: no sideways scroll on the list`);
  await sale.evaluate(e => e.scrollIntoView({ block: 'start' }));
  await shot(p, `${tag}-1-sale`);
  /* Back returns the four doors, and the list is the same on the second visit */
  await sale.getByRole('button', { name: /^Back$/ }).click();
  await p.getByRole('button', { name: /Retire and Enjoy Life/ }).waitFor({ timeout: 10000 });
  check(await p.getByRole('button', { name: /Become a Manager/ }).count() === 1, `${tag}: Back returns to the four doors`);
  await p.getByRole('button', { name: /Buy a Football Club/ }).click();
  await sale.waitFor({ timeout: 20000 });
  await p.waitForTimeout(motion === 'reduce' ? 200 : 1500);
  const again = await tilesOf(sale);
  check(JSON.stringify(again) === JSON.stringify(list), `${tag}: the same list on the second visit`);
  /* buy the dearest club, the last tile */
  const pick = list[list.length - 1];
  const pickTier = Number((/Tier (\d)/.exec(pick[1]) || [])[1]);
  await sale.locator('[data-testid="owner-club-for-sale"]').last().click();
  const panel = p.locator('[data-testid="owner-panel"]');
  await panel.waitFor({ timeout: 20000 });
  let s = await saved(p);
  const band = BANDS[pickTier] || [NaN, NaN];
  check(s?.ownerState?.club === pick[0] && s.ownerState.clubTier === pickTier && s.ownerState.debt === band[1] && Math.abs(s.netWorth - (320 - band[0])) < 1e-6,
    `${tag}: bought ${pick[0]} at Tier ${pickTier}: the save says ${s?.ownerState?.club}, tier ${s?.ownerState?.clubTier}, debt ${s?.ownerState?.debt}, net worth ${s?.netWorth}`);
  const lastEvent = (s.events || [])[s.events.length - 1] || '';
  check(lastEvent.includes(pick[0]) && lastEvent.includes(`€${band[0]}M`) && lastEvent.includes("game's figures"), `${tag}: the log line: ${lastEvent.slice(0, 120)}`);
  const sb = seasonButton(p);
  check(!(await sb.isEnabled()) && /Pick where the budget goes/.test(await sb.innerText()), `${tag}: the season button waits for a call`);
  const sbCut = await sb.evaluate(e => e.scrollWidth - e.clientWidth);
  check(sbCut <= 1, `${tag}: the season button's words fit (${sbCut}px over)`);
  await p.waitForTimeout(motion === 'reduce' ? 200 : 1500);
  await panel.evaluate(e => e.scrollIntoView({ block: 'start' }));
  await shot(p, `${tag}-2-panel`);
  await shot(p, `${tag}-2-panel-full`, true);
  return { ctx, p, tag, panel };
}

async function reload(p) {
  await p.reload({ waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.locator('[data-testid="owner-panel"]').waitFor({ timeout: 30000 });
  await p.waitForTimeout(600);
}
async function playSeasons(st, motion, order, shotPrefix) {
  const { p, tag, panel } = st;
  for (let k = 0; k < order.length; k += 1) {
    const plan = order[k];
    const tile = p.locator(`[data-plan="${plan}"]`);
    if (await tile.count() !== 1) { check(false, `${tag}: season ${k + 1} offers ${plan}`); continue; }
    await tile.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(250);
    const y0 = await p.evaluate(() => scrollY);
    await tile.click();
    await p.waitForTimeout(350);
    const y1 = await p.evaluate(() => scrollY);
    check(Math.abs(y1 - y0) <= 2, `${tag}: picking ${plan} does not move the page (${y0} to ${y1})`);
    let s = await saved(p);
    check(s?.ownerState?.plan === plan && (await tile.getAttribute('aria-pressed')) === 'true', `${tag}: ${plan} is picked and saved`);
    check(await seasonButton(p).isEnabled() && /Next Owner Season/.test(await seasonButton(p).innerText()), `${tag}: with a call the button reads Next Owner Season`);
    const before = s.ownerState.seasonResults.length;
    await seasonButton(p).click();
    await p.waitForFunction(n0 => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')).ownerState.seasonResults.length > n0; } catch { return false; } }, before, { timeout: 20000 });
    await p.waitForTimeout(150);
    await motionCheck(p, '[data-testid="owner-panel"]', motion, tag, `season ${k + 1}'s rows`);
    await p.waitForTimeout(motion === 'reduce' ? 300 : 3600);
    s = await saved(p);
    const os = s.ownerState, row = os.seasonResults[os.seasonResults.length - 1];
    const me = (row.table || []).find(r => r.you);
    check(!!me && me.pos === row.playerPos && row.plan === plan, `${tag}: season ${os.season} (${plan}) is on the table: ${row.result}`);
    check(os.plan === undefined && !(await seasonButton(p).isEnabled()), `${tag}: after season ${os.season} the call is spent and the button waits again`);
    const text = await panel.innerText();
    check(text.includes(`Season ${os.season}`) && text.toLowerCase().includes('final table'), `${tag}: the panel is on season ${os.season} with its final table`);
    check(text.includes(row.result.slice(0, 25)), `${tag}: the panel shows the saved line`);
    check(text.includes(`€${(os.debt ?? 0).toFixed(1)}M`), `${tag}: the debt tile shows the saved €${(os.debt ?? 0).toFixed(1)}M`);
    const over = await panel.evaluate(el => [...el.querySelectorAll('.cm-tick-in, [data-plan]')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => (e.textContent || '').slice(0, 40)));
    check(over.length === 0, `${tag}: no row or tile spills its box after season ${os.season} (${over.join(' | ')})`);
    const cutP = await cut(p, '[data-testid="owner-panel"]');
    if (cutP.length) note(`${tag}: text cut short in the panel after season ${os.season}: ${cutP.join(' | ')}`);
    check(await sideways(p) <= 0, `${tag}: no sideways scroll after season ${os.season}`);
    await panel.evaluate(e => e.scrollIntoView({ block: 'start' }));
    await shot(p, `${shotPrefix}-3-season${os.season}`);
    if (k === 1) {
      const mid = JSON.stringify((await saved(p)).ownerState);
      await reload(p);
      check(JSON.stringify((await saved(p)).ownerState) === mid && (await panel.innerText()).includes(`Season ${os.season}`), `${tag}: a reload after season ${os.season} keeps the save and the panel`);
    }
  }
  await shot(p, `${shotPrefix}-4-end-full`, true);
}

async function exactJourney(w, h, motion) {
  const tag = `${w}x${h}-${motion === 'reduce' ? 'rm' : 'mo'}-200`;
  console.log(tag);
  const { ctx, p } = await open(w, h, motion, RAW.exact);
  await p.getByRole('button', { name: /Buy a Football Club/ }).click({ timeout: 30000 });
  const sale = p.locator('[data-testid="owner-club-sale"]');
  await sale.waitFor({ timeout: 20000 });
  await p.waitForTimeout(motion === 'reduce' ? 200 : 1500);
  const list = await tilesOf(sale);
  check(list.length === 4 && list.every(l => !/Tier [12]/.test(l[1])), `${tag}: four clubs at €200M, none of Tier 2 (${list.map(l => l[1]).join(' / ')})`);
  listTruth(tag, list, 200);
  await sale.evaluate(e => e.scrollIntoView({ block: 'start' }));
  await shot(p, `${tag}-1-sale`);
  const errs = errorsOf.get(p) || [];
  check(errs.length === 0, `${tag}: no page errors (${errs.slice(0, 2).join(' | ')})`);
  await ctx.close();
}

async function oldJourney(w, h, motion) {
  const tag = `${w}x${h}-${motion === 'reduce' ? 'rm' : 'mo'}-old`;
  console.log(tag);
  const { ctx, p } = await open(w, h, motion, RAW.old);
  const panel = p.locator('[data-testid="owner-panel"]');
  await panel.waitFor({ timeout: 30000 });
  await p.waitForTimeout(motion === 'reduce' ? 300 : 2500);
  const text = await panel.innerText();
  const oldRows = OLD_C.ownerState.seasonResults;
  check(text.includes(`Owning ${OLD_C.ownerState.club}`) && oldRows.every(r => text.includes(r.result.slice(0, 15))), `${tag}: the old save shows its club and its two old rows`);
  const plans = await p.locator('[data-plan]').evaluateAll(els => els.map(e => e.getAttribute('data-plan')));
  check(plans.join() === 'squad,youth,stadium', `${tag}: an old save offers squad, youth and stadium, no debt (${plans.join(' ')})`);
  check(!(await seasonButton(p).isEnabled()), `${tag}: an old save's season waits for a call too`);
  await panel.evaluate(e => e.scrollIntoView({ block: 'start' }));
  await shot(p, `${tag}-1-loaded`);
  await playSeasons({ ctx, p, tag, panel }, motion, ['youth', 'stadium'], tag);
  const s = await saved(p);
  check(s.ownerState.club === OLD_C.ownerState.club && JSON.stringify(s.ownerState.seasonResults.slice(0, 2)) === JSON.stringify(oldRows), `${tag}: the old club and its old rows are kept byte for byte`);
  const errs = errorsOf.get(p) || [];
  check(errs.length === 0, `${tag}: no page errors (${errs.slice(0, 2).join(' | ')})`);
  await ctx.close();
}

const RUNS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference']];
for (const [w, h, motion] of RUNS) {
  try {
    const st = await journeyRich(w, h, motion);
    await playSeasons(st, motion, ['debt', 'squad', 'youth', 'stadium'], st.tag);
    const errs = errorsOf.get(st.p) || [];
    check(errs.length === 0, `${st.tag}: no page errors (${errs.slice(0, 2).join(' | ')})`);
    await st.ctx.close();
  } catch (e) { failures += 1; console.log(`  FAIL: ${w}x${h} ${motion} rich journey stopped: ${String(e).slice(0, 300)}`); }
  try { await exactJourney(w, h, motion); } catch (e) { failures += 1; console.log(`  FAIL: ${w}x${h} ${motion} 200M journey stopped: ${String(e).slice(0, 300)}`); }
  try { await oldJourney(w, h, motion); } catch (e) { failures += 1; console.log(`  FAIL: ${w}x${h} ${motion} old save journey stopped: ${String(e).slice(0, 300)}`); }
}
await browser.close();
console.log(failures ? `walkRun1524: ${failures} of ${checks} checks failed` : `walkRun1524: green, ${checks} checks`);
process.exit(failures ? 1 : 0);
