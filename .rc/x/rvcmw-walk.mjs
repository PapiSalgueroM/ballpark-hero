// Reviewer cm-world (Release AZ), never committed. PLAY: a seeded career (this build's engine) and an old save
// (the engine of b6eb78e7, Release AX) taken through a mid season job move in the browser, at 390 (reduced motion on
// and off) and 1280; then Everton's club screen after the move (the man I bought there must stay, the man I sold
// must not be back); and a deep seeded save at season 8 against the same save stripped, Quick Sim timed at 390 with
// the CPU slowed four times. Saves are made on the runner by the two engines. Run on a served build:
// BASE=http://localhost:4173 node .rc/x/rvcmw-walk.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const URLBASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || '.tmp-fx/rv-walk'); fs.mkdirSync(OUT, { recursive: true });
const BASECOMMIT = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
const lf = s => s.split('\r\n').join('\n');
async function engine(base) {
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!rel.startsWith('src/')) return null;
    const text = base ? execFileSync('git', ['show', `${BASECOMMIT}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }) : fs.readFileSync(args.path, 'utf8');
    return { contents: lf(text), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
  }); } };
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: `w-${base}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const module = { exports: {} }; const store = new Map();
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('offline')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  new vm.Script(out.outputFiles[0].text).runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}
function tape(seed, action, forced) {
  let st = seed >>> 0; const original = Math.random;
  Math.random = () => { if (forced !== undefined) return forced; st = (st + 0x6d2b79f5) >>> 0; let v = st;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}
const play = (M, s, seed) => tape(seed, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }).state);
/* An Everton career with one buy and one sale, ten entries in, a job in the same league accepted and waiting. */
function jobSave(M) {
  let s = tape(1, () => M.cm.startCareer('Everton'));
  s = { ...s, budget: 9999, wageCap: 9999 };
  const mp = M.cm.buildMarket(s).find(p => !s.leagueClubs.includes(p.club) && p.position !== 'GK' && p.age < 26 && p.rating >= 72);
  s = tape(2, () => M.cm.buyPlayer(s, mp)) ?? s;
  const seller = s.squad.filter(p => !p.onLoan && p.position !== 'GK' && p.name !== mp.name).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[3];
  const soldTo = M.cm.buildMarket(s).find(p => p.club !== s.clubName && !s.leagueClubs.includes(p.club) && p.club !== mp.club)?.club;
  s = tape(3, () => M.cm.acceptBid({ ...s, incomingBids: [{ playerId: seller.id, playerName: seller.name, club: soldTo, offer: 30, status: 'open' }] }, seller.id)) ?? s;
  for (let i = 0; i < 10; i += 1) s = play(M, s, 10 + i);
  const target = M.cm.applyTargets(s).find(t => t.club !== s.clubName && s.leagueClubs.includes(t.club))?.club ?? M.cm.applyTargets(s).find(t => t.club !== s.clubName)?.club;
  s = tape(50, () => M.cm.applyForJob(s, target), 0) ?? s;
  for (let n = 0; n < 20 && s.jobHunt?.open?.status === 'pending'; n += 1) s = tape(60 + n, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }).state, 0.6);
  M.store.clear(); M.cm.saveCareer(s);
  return { entries: [...M.store.entries()], bought: mp.name, boughtFrom: mp.club, sold: seller.name, soldTo, target, accepted: s.jobHunt?.open?.status === 'accepted', seed: s.worldSeed, ledger: !!s.worldRoster };
}
function deepSave(M) {
  let s = tape(7, () => M.cm.startCareer('Everton'));
  for (let season = 1; season < 8; season += 1) {
    for (let i = 0; i < 240; i += 1) { const r = tape(1000 * season + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })); s = r.state; if (r.kind === 'seasonOver') break; }
    s = tape(5000 + season, () => M.cm.finishSeason(s).state); s = tape(6000 + season, () => M.cm.startNextSeason(s));
  }
  for (let i = 0; i < 3; i += 1) s = play(M, s, 9000 + i);
  const bare = JSON.parse(JSON.stringify(s)); delete bare.worldSeed; delete bare.worldRoster;
  const save = (st) => { M.store.clear(); M.cm.saveCareer(st); return [...M.store.entries()]; };
  return { seeded: save(s), stripped: save(bare), season: s.season, ledger: s.worldRoster ? (s.worldRoster.records.length || 'packed') : 0 };
}
const head = await engine(false), base = await engine(true);
const SAVES = { seeded: jobSave(head), old: jobSave(base) };
const deep = deepSave(head);
for (const [k, v] of Object.entries(SAVES)) console.log(`save ${k}: bought ${v.bought} (from ${v.boughtFrom}), sold ${v.sold} to ${v.soldTo}, job ${v.target} accepted ${v.accepted}, seed ${v.seed !== undefined}, ledger ${v.ledger}`);
console.log(`deep save: season ${deep.season}, ledger ${deep.ledger}`);
const failures = [], notes = [];
const browser = await chromium.launch();
async function open(profile, entries) {
  const context = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, hasTouch: profile.touch, isMobile: profile.touch, reducedMotion: profile.rm });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(({ now, entries }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
    if (!sessionStorage.getItem('rv-injected')) { for (const [k, v] of entries) localStorage.setItem(k, v); sessionStorage.setItem('rv-injected', '1'); }
  }, { now: NOW, entries });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const tap = async loc => { if (profile.touch) await loc.tap(); else await loc.click(); };
  return { context, page, errors, tap };
}
async function resume(s) {
  await s.page.goto(`${URLBASE}/club-manager`, { waitUntil: 'networkidle' });
  const r = s.page.getByRole('button', { name: 'Resume Career', exact: true });
  if (await r.count()) await s.tap(r.first());
  await s.page.locator('[data-cm-way="quick"]').first().waitFor();
  await s.page.evaluate(() => document.fonts.ready);
}
const wide = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const saved = page => page.evaluate(k => { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && { club: o.clubName, seed: o.worldSeed !== undefined, ledger: o.worldRoster !== undefined }; }, SAVE);
const PROFILES = [
  { name: '390-reduce', w: 390, h: 844, touch: true, rm: 'reduce' },
  { name: '390-motion', w: 390, h: 844, touch: true, rm: 'no-preference' },
  { name: '1280', w: 1280, h: 900, touch: false, rm: 'no-preference' },
];
for (const profile of PROFILES) for (const [kind, sv] of Object.entries(SAVES)) {
  const tag = `${profile.name}-${kind}`; const s = await open(profile, sv.entries);
  try {
    await resume(s);
    await s.page.screenshot({ path: path.join(OUT, `${tag}-1-hub.png`) });
    await s.tap(s.page.getByRole('button').filter({ hasText: 'now or in the summer' }).first());
    const join = s.page.getByRole('button', { name: `Join ${sv.target} now` });
    await join.waitFor(); await join.scrollIntoViewIfNeeded();
    await s.page.screenshot({ path: path.join(OUT, `${tag}-2-job.png`) });
    const t0 = Date.now(); await s.tap(join);
    await s.page.waitForFunction(([k, club]) => JSON.parse(localStorage.getItem(k) || '{}').clubName === club, [SAVE, sv.target], { timeout: 60000 });
    const joinMs = Date.now() - t0;
    await s.page.waitForTimeout(600);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await s.page.screenshot({ path: path.join(OUT, `${tag}-3-after-join.png`) });
    const after = await saved(s.page);
    if (kind === 'seeded' && !(after.seed && after.ledger)) failures.push(`${tag}: after the move the save lost its seed or ledger ${JSON.stringify(after)}`);
    if (kind === 'old' && (after.seed || after.ledger)) failures.push(`${tag}: the old save gained a seed or a ledger ${JSON.stringify(after)}`);
    if (await wide(s.page)) failures.push(`${tag}: sideways scroll after the join`);
    await s.tap(s.page.getByRole('tab', { name: 'Table' }));
    await s.tap(s.page.getByRole('button').filter({ has: s.page.getByText('Everton', { exact: true }) }).first());
    await s.page.getByText('Best XI', { exact: true }).waitFor(); await s.page.evaluate(() => document.fonts.ready);
    const text = await s.page.evaluate(() => document.body.innerText);
    const hasBought = text.includes(sv.bought), hasSold = text.includes(sv.sold);
    notes.push(`${tag}: join took ${joinMs} ms; Everton's screen lists the man bought there (${sv.bought}) ${hasBought}, the man sold (${sv.sold}) ${hasSold}`);
    if (kind === 'seeded' && !hasBought) failures.push(`${tag}: ${sv.bought}, bought at Everton, is not on Everton's screen after the move`);
    if (kind === 'seeded' && hasSold) failures.push(`${tag}: ${sv.sold}, sold to ${sv.soldTo}, is back on Everton's screen`);
    await s.page.screenshot({ path: path.join(OUT, `${tag}-4-everton.png`), fullPage: profile.w === 390 });
    if (await wide(s.page)) failures.push(`${tag}: sideways scroll on Everton's screen`);
    if (s.errors.length) failures.push(`${tag}: page errors ${s.errors.join(' | ').slice(0, 300)}`);
  } catch (e) {
    failures.push(`${tag}: ${String(e).slice(0, 300)}`);
    await s.page.screenshot({ path: path.join(OUT, `${tag}-error.png`) }).catch(() => {});
  } finally { await s.context.close(); }
}
/* Quick Sim on the deep save, seeded and stripped, at 390 with the CPU slowed four times: the main thread's long tasks. */
for (const [kind, entries] of [['seeded', deep.seeded], ['stripped', deep.stripped], ['seeded-again', deep.seeded]]) {
  const s = await open(PROFILES[0], entries);
  try {
    await resume(s);
    const cdp = await s.context.newCDPSession(s.page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await s.page.evaluate(() => { window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: false }); });
    const t0 = Date.now(); await s.tap(s.page.locator('[data-cm-way="quick"]').first());
    await s.page.waitForTimeout(8000);
    const lt = await s.page.evaluate(() => window.__lt);
    notes.push(`deep ${kind} (season ${deep.season}): Quick Sim, ${lt.length} long tasks, ${Math.round(lt.reduce((a, b) => a + b, 0))} ms blocked, longest ${Math.round(Math.max(0, ...lt))} ms (8 s window from the tap at ${t0})`);
    await s.page.screenshot({ path: path.join(OUT, `deep-${kind}-after-quick.png`) });
    if (s.errors.length) failures.push(`deep ${kind}: page errors ${s.errors.join(' | ').slice(0, 300)}`);
  } catch (e) { failures.push(`deep ${kind}: ${String(e).slice(0, 300)}`); await s.page.screenshot({ path: path.join(OUT, `deep-${kind}-error.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
await browser.close();
for (const n of notes) console.log(n);
fs.writeFileSync(path.join(OUT, 'rvcmw-walk.json'), JSON.stringify({ notes, failures }, null, 1));
if (failures.length) { for (const f of failures) console.log(`  FAIL: ${f}`); console.log(`rvcmw-walk: ${failures.length} failures`); process.exit(1); }
console.log('rvcmw-walk: green');
