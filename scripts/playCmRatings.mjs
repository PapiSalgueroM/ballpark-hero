/**
 * Round 1102: the squad screen shows the rating and the age the roster file ships.
 *
 * The round changed two numbers on every row of Club Manager's squads (the rating reads age now,
 * and ages are for August 2026). The harnesses hold the FILE to the curve; this walk holds the
 * SCREEN to the file, in a real browser, the way a player meets it:
 *
 *   take the Liverpool job in the 2026-27 world through the picker, open the squad, and for two
 *   men chosen FROM THE FILE at run time (the most valuable man of 33 or more and the most
 *   valuable man of 22 or under who are in the squad the game dealt) the rating and the age on
 *   screen are the file's row. At 390 by 844 and at 1280 by 800. The page does not scroll
 *   sideways at 390 and the console carries no error.
 *
 * It never names the two men: Round 1108 moves who is at which club in the same release, so they
 * are read off src/data/clubManagerRosters.ts each run.
 *
 * NEGATIVE CONTROL, PLAY_CM_RATINGS_CONTROL=stale: the expected rating becomes the value rating
 * of the man's printed value (the curve before the round). The veteran's row must then fail, or
 * the walk is reading something other than his rating. It refuses to run (exit 2) unless the two
 * ratings differ for him in the file itself.
 *
 * Needs a built dist/ (the walk serves it itself with scripts/lib/hostLikeServer.mjs, the way the
 * host does) and Chromium. Every request to the database host is aborted: nothing here reaches
 * production.
 *
 *   npm run build && node scripts/playCmRatings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { valueRatingOf } from './lib/cmValueCurve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_CM_RATINGS_CONTROL ?? '';
if (CONTROL && CONTROL !== 'stale') { console.error(`unknown control ${CONTROL}; the control is stale`); process.exit(2); }
const CLUB = 'Liverpool';
const OUT = process.env.RC_OUT || null;
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];

let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const say = m => console.log(`   ${m}`);

/* ---------- the file: Liverpool's rows, by their shape, comments cut ---------- */
const text = fs.readFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const block = new RegExp(`^  '${CLUB}': \\[\\n([\\s\\S]*?)^  \\],$`, 'm').exec(text);
if (!block) { console.error(`the roster file has no ${CLUB} block`); process.exit(2); }
const FILE = [...block[1].matchAll(/\{ n: '((?:[^'\\]|\\.)*)', p: '([A-Z]+)', a: (\d+), v: ([\d.]+), r: (\d+) \}/g)]
  .map(m => ({ n: m[1].replace(/\\(.)/g, '$1'), p: m[2], a: Number(m[3]), v: Number(m[4]), r: Number(m[5]) }));
if (FILE.length < 11) { console.error(`only ${FILE.length} ${CLUB} rows read from the roster file`); process.exit(2); }
const valueRating = row => valueRatingOf((row.v / 0.75) * 1e6);

/* ---------- the server the walk owns ---------- */
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) { console.error('no dist/index.html: build the site first (npm run build)'); process.exit(2); }
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(err => (err ? reject(err) : resolve(p))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start: ${serverLog}`)), 20000);
  server.once('error', e => { clearTimeout(timer); reject(e); });
  server.stdout.on('data', d => { serverLog += d; if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', d => { serverLog += d; });
});

const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] });
let aborted = 0;
try {
  for (const vp of VIEWPORTS) {
    const tag = `${vp.width} by ${vp.height}`;
    console.log(`At ${tag}`);
    const ctx = await browser.newContext({ viewport: vp });
    /* PRODUCTION IS OFF LIMITS: no request to the database host leaves the browser. */
    await ctx.route(/supabase\.co/, route => { aborted += 1; return route.abort(); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 160)));
    page.on('console', m => {
      const t = m.text();
      if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED|net::ERR_ABORTED/i.test(t)) errs.push(t.slice(0, 160));
    });
    const tap = async (rx, what) => {
      const b = page.locator('button:visible').filter({ hasText: rx }).first();
      await b.waitFor({ timeout: 10000 }).catch(() => {});
      if (await b.count().catch(() => 0) === 0) return false;
      const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (ok) await page.waitForTimeout(400);
      else say(`could not press ${what}`);
      return ok;
    };
    const shot = async name => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, `${name}-${vp.width}.png`) }).catch(() => {}); } };

    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
    /* the picker: when, then country, league and club, then the pinned bar, then the classic career */
    await tap(/2026-27/i, 'the 2026-27 world');
    await tap(/England/i, 'England');
    await tap(/Premier League/i, 'the Premier League');
    await tap(new RegExp(`^\\s*${CLUB}\\b`), CLUB) || await tap(new RegExp(CLUB), CLUB);
    await tap(/take the job|confirm|start/i, 'the pinned confirm bar');
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(/skip: just manage/i, 'skip the dugout form');
    await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null')?.squad?.length; } catch { return false; } }, null, { timeout: 15000 }).catch(() => {});
    const saved = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); return s ? { club: s.club ?? s.clubName ?? null, squad: s.squad.map(p => ({ name: p.name, rating: p.rating, age: p.age })) } : null; } catch { return null; } });
    if (!saved) { fail(`${tag}: no career was started, so nothing below was read (the picker did not get to a save)`); await shot('blocked'); await ctx.close(); continue; }
    const inSquad = new Set(saved.squad.map(p => p.name));
    if (!FILE.some(r => inSquad.has(r.n))) { fail(`${tag}: the career's squad holds none of the file's ${CLUB} men (the club taken was ${saved.club})`); await shot('wrong-club'); await ctx.close(); continue; }
    const byValue = FILE.filter(r => inSquad.has(r.n)).sort((a, b) => b.v - a.v);
    const veteran = byValue.find(r => r.a >= 33), youngster = byValue.find(r => r.a <= 22);
    if (!veteran || !youngster) { fail(`${tag}: the dealt squad has no man of 33 or more and no man of 22 or under from the file (veteran ${veteran?.n ?? 'none'}, youngster ${youngster?.n ?? 'none'})`); await ctx.close(); continue; }
    if (CONTROL === 'stale' && valueRating(veteran) === veteran.r) { console.error(`CONTROL stale did not apply: ${veteran.n}'s value rating and shipped rating are both ${veteran.r}`); await browser.close(); server.kill(); process.exit(2); }

    /* the squad screen */
    if (!await tap(/^\s*Squad\s*$/, 'the squad tab')) await tap(/Squad/, 'the squad tab');
    await page.locator('[data-cm-squad-row]').first().waitFor({ timeout: 15000 }).catch(() => {});
    const rows = await page.locator('[data-cm-squad-row]').count().catch(() => 0);
    if (rows < 11) { fail(`${tag}: the squad screen shows ${rows} rows, so it was not reached`); await shot('no-squad'); await ctx.close(); continue; }
    for (const [who, man] of [['the veteran', veteran], ['the youngster', youngster]]) {
      const read = await page.evaluate(name => {
        for (const row of document.querySelectorAll('[data-cm-squad-row]')) {
          const n = row.querySelector('span.truncate');
          if (!n || (n.textContent || '').trim() !== name) continue;
          const visible = el => !!el && el.getClientRects().length > 0;
          const ovr = row.querySelector('[data-cm-cell="ovr"]');
          const ageCell = row.querySelector('[data-cm-cell="age"]');
          const agePhone = [...row.querySelectorAll('span')].find(s => /^\d+y$/.test((s.textContent || '').trim()) && visible(s));
          return {
            rating: visible(ovr) ? (ovr.textContent || '').trim() : null,
            age: visible(ageCell) ? (ageCell.textContent || '').trim() : agePhone ? (agePhone.textContent || '').trim().replace(/y$/, '') : null,
          };
        }
        return null;
      }, man.n);
      const wantRating = CONTROL === 'stale' ? valueRating(man) : man.r;
      if (!read) { fail(`${tag}: ${who} (${man.n}) has no row on the squad screen`); continue; }
      if (read.rating !== String(wantRating)) fail(`${tag}: ${who} (${man.n}) shows a rating of ${read.rating}, ${CONTROL === 'stale' ? 'his value rating is' : 'the file ships'} ${wantRating}`);
      if (read.age !== String(man.a)) fail(`${tag}: ${who} (${man.n}) shows an age of ${read.age}, the file ships ${man.a}`);
      say(`${who}: ${man.n}, valued ${man.v}m, on screen ${read.rating} rated and ${read.age} years old; the file ships ${man.r} and ${man.a}${CONTROL === 'stale' ? ` (control: held to his value rating, ${wantRating})` : ''}`);
    }
    if (vp.width <= 400) {
      const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
      if (wide.scroll > wide.inner + 1) fail(`${tag}: the page scrolls sideways (${wide.scroll} wide in a ${wide.inner} window)`);
      else say(`no sideways scroll (${wide.scroll} in ${wide.inner})`);
    }
    if (errs.length) fail(`${tag}: ${errs.length} console error(s): ${errs.slice(0, 3).join(' | ')}`);
    await shot('squad');
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
console.log('');
if (CONTROL === 'stale') {
  if (!failures) { console.log('playCmRatings: CONTROL stale turned nothing red. The walk is not reading the rating.'); process.exit(0); }
  console.error(`playCmRatings: CONTROL stale fired, ${failures} failure(s)`);
  process.exit(1);
}
if (failures) { console.error(`playCmRatings: ${failures} failure(s)`); process.exit(1); }
console.log(`playCmRatings: green. At both widths the squad screen shows the rating and the age the file ships (${aborted} database requests aborted).`);
