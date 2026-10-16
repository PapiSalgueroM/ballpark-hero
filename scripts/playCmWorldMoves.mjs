/* Round 1344: Club Manager, a man two other clubs trade is at his new club at once and stays there, in the built page.

   The player report of 2026-10-16: "if a player transfers to another club they get deleted from the database until
   next season, where they end up at their former team." Serves a built dist (DIST, default dist) with
   scripts/lib/hostLikeServer.mjs, every other host aborted (Supabase and the ad hosts included), and plants saves
   the real engine builds in node (none committed): a new 2026-27 Everton career after its opening window, whose news
   holds a deal of X from A to B, B a Premier League club.
     (a) at 320 by 640, 390 by 844 and 1280 by 900: Resume Career, the Market tab, a search for X finds him listed at
         B, and pressing Talk shows "X only joined B this season" on the desk;
     (b) at 390: the Table tab, B's club page lists X, and A's page does not when A is in the league too;
     (c) at 390: the same career rolled by the engine to its second summer: B's page still lists X, and Talk on his
         market row no longer says he only joined;
     (d) at 390: the same career's save written by the round's BASE engine (d4f2c6f6, which never told the ledger):
         after Resume Career, B's club page lists X (the repair on load);
     (e) at every width, around the refused press: the desk note that shows the refusal is today's (Round 634), so
         the press is held to a refusal that already exists, the same row with the window shut: the card under the
         finger moves no more than it does there (within 2 px), and the note's text is at least 12 px and inside the
         screen's width. scrollY, the document height and where the note lands are printed for both. The Talk
         button's height is printed too (it is today's button, not this round's).
   Pictures go to $RC_OUT (or .tmp-fx/playCmWorldMoves) as world-moves-<case>-<width>.png.

   Controls (PLAY_WORLD_MOVES_CONTROL):
     norecord  the saves are built by an engine with scripts/lib/cmNoAiMoves1344.mjs, against a dist built from a
               copy with the same bridge (DIST names it; the runner builds it, never committed): (b) red.
     norepair  the BASE save of (d) against a dist built from a copy whose loadCareer does not call repairAiMoves
               (DIST names it): (d) red.
   Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire. */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { withoutAiMoves } from './lib/cmNoAiMoves1344.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.env.DIST || 'dist');
const CONTROL = process.env.PLAY_WORLD_MOVES_CONTROL || '';
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmWorldMoves'), CONTROL || 'head');
const KEY = 'dukb-club-manager-save';
const BASE_COMMIT = 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const cannot = why => { console.log(`playCmWorldMoves could not run: ${why}`); process.exit(2); };
if (CONTROL && !['norecord', 'norepair'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- the engines in node: this tree's (with the bridge for norecord), and the round's BASE ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-world-moves-'));
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
async function engine(label, { base = false, bridge = false } = {}) {
  const entry = path.join(work, `${label}.ts`);
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
  const plugin = { name: `world-moves-${label}`, setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = base ? execFileSync('git', ['show', `${BASE_COMMIT}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
        : fs.readFileSync(args.path, 'utf8');
      text = text.split('\r\n').join('\n');
      if (bridge) text = withoutAiMoves(text, rel);
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  } };
  const outfile = path.join(work, `${label}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin] });
  const { cm } = createRequire(import.meta.url)(outfile);
  await cm.ensureAllEraRosters();
  return cm;
}
const H = await engine(CONTROL === 'norecord' ? 'bridged' : 'head', { bridge: CONTROL === 'norecord' });
const B = await engine('base', { base: true });
const saveOf = (cm, s) => { memory.clear(); if (!cm.saveCareer(s)) cannot('the engine refused to save the career'); return memory.get(KEY); };
const aiLines = s => (s.transferLog ?? []).filter(t => !t.loan && t.from !== s.clubName && t.to !== s.clubName && t.from !== 'a free transfer' && t.to !== 'a free transfer');
function playSeason(cm, s, seed) {
  for (let i = 0; i < 400; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = withSeed(seed * 1000 + i, () => cm.playNextEntry(s, { skipHalftime: true, noCoach: true }));
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return s;
}

/* ---- the career: a new Everton career whose opening window moved a man X from A to a Premier League club B, who
   is still at B a season later (by the ledger; by the news alone under norecord) ---- */
let pick = null;
for (let seed = 1; seed <= 40 && !pick; seed += 1) {
  const s = withSeed(seed, () => H.startCareer('Everton'));
  const lines = aiLines(s).filter(line => s.leagueClubs.includes(line.to));
  if (!lines.length) continue;
  const s1 = playSeason(H, s, seed);
  if (s1.sacked) continue;
  const s2 = withSeed(seed + 7, () => H.startNextSeason(H.finishSeason(s1).state));
  const resold = new Set(aiLines(s2).filter(line => line.season === s2.season).map(line => line.name));
  const line = lines.find(l => !resold.has(l.name) && (CONTROL === 'norecord' || H.worldRosterFor(s2, l.to).some(p => p.n === l.name)));
  if (!line) continue;
  const base = withSeed(seed, () => B.startCareer('Everton'));
  if (!aiLines(base).some(l => l.name === line.name && l.to === line.to)) continue;
  pick = { seed, X: line.name, A: line.from, B: line.to, aInLeague: s.leagueClubs.includes(line.from),
    save1: saveOf(H, s), save2: saveOf(H, s2), baseSave: saveOf(B, base) };
}
if (!pick) cannot('no Everton career in 40 seeds moved a man to a Premier League club who stayed a season');
const { X, A } = pick, BUYER = pick.B;
console.log(`playCmWorldMoves: Everton seed ${pick.seed}, the opening window's ${X} from ${A} to ${BUYER}${pick.aInLeague ? ' (both in the league)' : ''}`);

/* ---- the served page ---- */
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => (e ? reject(e) : resolve(p))); });
});
const ORIGIN = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('the host like server did not start')), 15000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', d => { serverLog += d; if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', d => { serverLog += d; });
}).catch(e => cannot(e.message));

const results = [];
const check = (part, name, ok, detail = '') => { results.push({ part, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} (${part}) ${name}${detail ? ` [${detail}]` : ''}`); };
const PROFILES = [{ width: 320, height: 640, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];
const PHONE = PROFILES[1];
const browser = await pw.chromium.launch({ headless: true });
async function pageWith(profile, save) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: KEY, value: save }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(20000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `world-moves-${name}.png`), fullPage: false }).catch(() => {});
async function resume(page) {
  await page.goto(`${ORIGIN}/club-manager`, { waitUntil: 'domcontentloaded' });
  const button = page.getByRole('button', { name: /resume career/i }).first();
  await button.waitFor({ timeout: 25000 }).catch(() => {});
  if (!(await button.count().catch(() => 0))) return false;
  await button.click();
  const tab = page.getByRole('tab', { name: /^Market$/ }).first();
  await tab.waitFor({ timeout: 25000 }).catch(() => {});
  return (await tab.count().catch(() => 0)) > 0;
}
/** The Market tab, a search for the man, and his row at the club: its Talk button marked for the press. */
async function marketRow(page, name, club) {
  await page.getByRole('tab', { name: /^Market$/ }).first().click();
  const box = page.getByPlaceholder('Search player or club…').first();
  await box.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await box.count().catch(() => 0))) return null;
  await box.fill(name);
  await page.waitForTimeout(400);
  return page.evaluate(([x, c]) => {
    for (const b of document.querySelectorAll('button')) {
      const label = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^Talk ·/.test(label)) continue;
      const row = b.parentElement && b.parentElement.parentElement;
      const text = ((row && row.innerText) || '').replace(/\s+/g, ' ');
      if (text.includes(x) && text.includes(`${c} · `)) { b.setAttribute('data-wm-talk', '1'); return { text, height: b.getBoundingClientRect().height }; }
    }
    return null;
  }, [name, club]);
}
/** Press the marked Talk button without letting the click scroll: in view first, then the measure, then the press. */
async function pressTalk(page) {
  const button = page.locator('[data-wm-talk="1"]').first();
  await button.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => { const b = document.querySelector('[data-wm-talk="1"]'); return { y: window.scrollY, h: document.documentElement.scrollHeight, top: b ? b.getBoundingClientRect().top : null }; });
  await button.click();
  const noteEl = page.getByTestId('cm-desk-note').first();
  await noteEl.waitFor({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => { const b = document.querySelector('[data-wm-talk="1"]'); return { y: window.scrollY, h: document.documentElement.scrollHeight, top: b ? b.getBoundingClientRect().top : null }; });
  const note = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="cm-desk-note"]');
    if (!el) return null;
    const span = el.querySelector('span') || el, r = el.getBoundingClientRect();
    return { text: (el.textContent || '').replace(/\s+/g, ' ').trim(), size: parseFloat(getComputedStyle(span).fontSize), left: r.left, right: r.right, width: window.innerWidth, top: r.top, bottom: r.bottom, height: window.innerHeight };
  });
  return { before, after, note };
}
/** The Table tab and one club's page: the page's text. */
async function clubPage(page, club) {
  await page.getByRole('tab', { name: /^Table$/ }).first().click();
  const row = page.locator(`[data-club="${club}"]`).first();
  await row.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await row.count().catch(() => 0))) return null;
  await row.click();
  await page.getByText(/on the books\)/).first().waitFor({ timeout: 20000 }).catch(() => {});
  return page.evaluate(() => document.body.innerText);
}
const joined = club => `${X} only joined ${club} this season`;

/* ---- the cases ---- */
const errors = [];
try {
  if (CONTROL !== 'norepair') {
    /* (a) and (e): the market finds him at his new club and the door says why, at every width. The desk note is
       today's (Round 634: every refused door shows the engine's sentence in it), so (e) holds the new refusal to the
       note's behaviour on a refusal that already exists, the same row with the window shut: the card under the finger
       moves no more than it does there, and the note's text is at least 12 px and inside the screen's width. */
    const shut = (() => { const c = JSON.parse(pick.save1); c.transferWindow = null; c.windowWeeksLeft = 0; return JSON.stringify(c); })();
    for (const profile of PROFILES) {
      const w = profile.width, presses = {};
      for (const [kind, save] of [['joined', pick.save1], ['shut', shut]]) {
        const { context, page } = await pageWith(profile, save);
        if (!(await resume(page))) { check('a', `${w} ${kind}: the planted career resumes to the hub`, false); await context.close(); continue; }
        const row = await marketRow(page, X, BUYER);
        if (kind === 'joined') check('a', `${w}: the market's search for ${X} finds him at ${BUYER}`, !!row, row ? row.text.slice(0, 90) : 'no row');
        await shot(page, `a-market-${kind}-${w}`);
        if (row) {
          presses[kind] = await pressTalk(page);
          presses[kind].button = row.height;
          await shot(page, `a-refused-${kind}-${w}`);
        }
        errors.push(...page.errors);
        await context.close();
      }
      const j = presses.joined, s = presses.shut;
      if (!j) continue;
      check('a', `${w}: Talk says he only joined ${BUYER} this season`, j.note?.text.includes(joined(BUYER)), j.note?.text ?? 'no note');
      check('a', `${w}: with the window shut the same Talk says so first`, s?.note?.text.includes('The transfer window is shut.'), s?.note?.text ?? 'no note');
      const moved = p => (p.after.top ?? 0) - (p.before.top ?? 0);
      const line = p => `card ${Math.round(moved(p))} px, scrollY ${p.before.y} to ${p.after.y}, height ${p.before.h} to ${p.after.h}, note ${p.note ? `${Math.round(p.note.top)} to ${Math.round(p.note.bottom)} of ${p.note.height}` : 'none'}`;
      check('e', `${w}: the refused press moves the card no more than today's refusal does (joined: ${line(j)}; shut: ${s ? line(s) : 'not measured'})`,
        !!s && Math.abs(moved(j) - moved(s)) <= 2);
      check('e', `${w}: the desk note is at least 12 px and inside the screen's width`, j.note && j.note.size >= 12 && j.note.left >= 0 && j.note.right <= j.note.width,
        j.note ? `${j.note.size} px, ${Math.round(j.note.left)} to ${Math.round(j.note.right)} of ${j.note.width}` : 'no note');
      console.log(`     the Talk button is ${Math.round(j.button)} px tall at ${w} (today's button, not this round's)`);
    }
    /* (b): his new club's page lists him, his old one's does not. */
    {
      const { context, page } = await pageWith(PHONE, pick.save1);
      const text = (await resume(page)) ? await clubPage(page, BUYER) : null;
      await shot(page, 'b-buyer-390');
      check('b', `${BUYER}'s club page lists ${X}`, !!text && text.includes(X), text ? '' : 'no club page');
      errors.push(...page.errors);
      await context.close();
      if (pick.aInLeague) {
        const second = await pageWith(PHONE, pick.save1);
        const old = (await resume(second.page)) ? await clubPage(second.page, A) : null;
        await shot(second.page, 'b-seller-390');
        check('b', `${A}'s club page does not list ${X}`, !!old && !old.includes(X), old ? '' : 'no club page');
        errors.push(...second.page.errors);
        await second.context.close();
      }
    }
    /* (c): a season later he is still there, and for sale (the club page and the market each from a fresh load). */
    if (CONTROL !== 'norecord') {
      const first = await pageWith(PHONE, pick.save2);
      const text = (await resume(first.page)) ? await clubPage(first.page, BUYER) : null;
      await shot(first.page, 'c-buyer-390');
      check('c', `a season later ${BUYER}'s club page still lists ${X}`, !!text && text.includes(X));
      errors.push(...first.page.errors);
      await first.context.close();
      const { context, page } = await pageWith(PHONE, pick.save2);
      const row = (await resume(page)) ? await marketRow(page, X, BUYER) : null;
      check('c', `a season later the market lists ${X} at ${BUYER}`, !!row);
      if (row) {
        const press = await pressTalk(page);
        await shot(page, 'c-talk-390');
        check('c', 'and Talk no longer says he only joined', !(press.note?.text ?? '').includes('only joined'), press.note?.text ?? 'no note: the talks opened');
      }
      errors.push(...page.errors);
      await context.close();
    }
  }
  /* (d): a save the round's BASE engine wrote is mended when it opens. */
  if (CONTROL !== 'norecord') {
    const { context, page } = await pageWith(PHONE, pick.baseSave);
    const text = (await resume(page)) ? await clubPage(page, BUYER) : null;
    await shot(page, 'd-buyer-390');
    check('d', `a save BASE's engine wrote: after Resume Career ${BUYER}'s club page lists ${X}`, !!text && text.includes(X));
    errors.push(...page.errors);
    await context.close();
  }
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
check('errors', 'no page error on any page', errors.length === 0, errors.slice(0, 2).join(' | '));
const red = results.filter(r => !r.ok);
if (CONTROL) {
  const part = CONTROL === 'norecord' ? 'b' : 'd';
  const fired = red.some(r => r.part === part);
  console.log(fired ? `playCmWorldMoves: control ${CONTROL} FIRED: (${part}) red` : `playCmWorldMoves: control ${CONTROL} DID NOT FIRE: (${part}) stayed green`);
  process.exit(fired ? 1 : 3);
}
console.log(red.length ? `playCmWorldMoves: RED, ${red.length} of ${results.length} checks failed` : `playCmWorldMoves: green, ${results.length} checks held; pictures in ${OUT}`);
process.exit(red.length ? 1 : 0);
