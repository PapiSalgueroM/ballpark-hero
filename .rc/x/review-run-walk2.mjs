/* Reviewer's walk for Round 1300 (runner only, on the served build): the one screen this round's code feeds.
   Round 1300 shows a player nothing new, but it rewrote the function behind the playoff list of the Season
   Center's review (usPlayoffPath, now a mapping over usPlayoffLay). So: on a save made by the real binding, press
   Week by week in NBA My Career and NFL My Career until a season reaches the playoffs, go straight to the review,
   and hold the list on screen against (a) the list this tree's own usPlayoffPath gives for the saved line, worked
   out here in node, and (b) the save itself (rounds for the result, series scores that add up to the saved games).
   390x844 and 1280x900, reduced motion off and on. Screenshots go to $RC_OUT. supabase.co is blocked and counted. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHOTS = process.env.RC_OUT ?? os.tmpdir();
fs.mkdirSync(SHOTS, { recursive: true });
const DEFS = {
  nba: { route: '/nba-my-career', binding: 'NBA_CAREER_SPORT', file: 'src/lib/nbaCareerSport.ts', bind: 'NBA_SEASON', bindFile: 'src/lib/season/nba.ts', pos: 'SG' },
  nfl: { route: '/nfl-my-career', binding: 'NFL_CAREER_SPORT', file: 'src/lib/nflCareerSport.ts', bind: 'NFL_SEASON', bindFile: 'src/lib/season/nfl.ts', pos: 'QB' },
};
let checks = 0; let failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };

/* the real bindings and this tree's own list function, in node */
const OUT = path.join(os.tmpdir(), `review-walk-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    ...Object.values(DEFS).flatMap(d => [`export { ${d.binding} } from './${d.file}';`, `export { ${d.bind} } from './${d.bindFile}';`]),
    "export { buildUsSeason, usPlayoffPath } from './src/lib/season/us.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(OUT).href);
try { fs.unlinkSync(OUT); } catch { /* a copy */ }
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A save on the hub after two seasons: of 40 keyed drafts, the starter on the best team (nothing is edited on
 *  the save: it is the save a player gets from that draft; a good team is picked so a playoff season comes soon). */
function makeSave(slug) {
  const d = DEFS[slug];
  const SB = M[d.binding];
  const real = Math.random;
  let best = null;
  for (let n = 0; n < 40; n += 1) {
    const rng = mulberry32(1300 + n * 1009 + (slug === 'nfl' ? 7 : 0));
    Math.random = rng;
    try {
      const c = SB.startCareer('Review Runner', d.pos, SB.create.archetypes[d.pos][0], rng, null, 'now');
      let tq = SB.rollTeamQuality(null, rng);
      SB.assignRole(c, tq, rng);
      for (let i = 0; i < 2; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
      if (c.retired || c.role === 'backup') continue;
      c.contractYears = Math.max(3, c.contractYears);
      if (!best || tq > best.tq) best = { tq, key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
    } finally { Math.random = real; }
  }
  if (!best) throw new Error(`no save for ${slug}`);
  return best;
}

if (process.env.WALK_DRY) {
  for (const slug of Object.keys(DEFS)) { const s = makeSave(slug); const c = JSON.parse(s.value).c; console.log(`DRY ${slug}: key ${s.key}, team quality ${s.tq}, ${c.seasons.length} seasons, role ${c.role}, year ${c.year}, bytes ${s.value.length}`); }
  process.exit(0);
}
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let aborted = 0;
async function open(slug, save, { width, height, reduced, seed }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([k, v, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('review-walk')) {
        sessionStorage.setItem('review-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(k, v);
        localStorage.setItem('seasonCentre:help:nba', '1');
        localStorage.setItem('seasonCentre:help:nfl', '1');
      }
    } catch { /* private mode */ }
  }, [save.key, save.value, seed]);
  await ctx.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}${DEFS[slug].route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, errors };
}

const T0 = Date.now();
const VIEWS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const lastSeed = {};
const summary = [];
for (const slug of Object.keys(DEFS)) {
  const d = DEFS[slug];
  const bind = M[d.bind];
  const SB = M[d.binding];
  const save = makeSave(slug);
  const startSeasons = JSON.parse(save.value).c.seasons.length;
  console.log(`${slug}: the save is a ${d.pos} after ${startSeasons} seasons, team quality ${save.tq}`);
  for (const vp of VIEWS) for (const reduced of [false, true]) {
    const tag = `${slug} ${vp.width}x${vp.height} ${reduced ? 'reduced motion' : 'motion on'}`;
    const name = `${slug}-${vp.width}-${reduced ? 'reduced' : 'motion'}`;
    let got = null;
    const tried = [];
    if (Date.now() - T0 > 9 * 60000) { check(false, `${tag}: skipped, the walk ran out of its nine minutes`); continue; }
    for (let k = 0; k < 8 && !got; k += 1) {
      const seed = (lastSeed[slug] ?? 4000) + k;
      const S = await open(slug, save, { ...vp, reduced, seed });
      const pressed = await S.page.evaluate(() => { const b = document.querySelector('[data-week-by-week]'); if (!b) return false; b.click(); return true; });
      if (!pressed) { tried.push(`${seed}: no entry`); await S.page.screenshot({ path: path.join(SHOTS, `${name}-no-entry.png`) }).catch(() => {}); await S.ctx.close(); continue; }
      const up = await S.page.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 12000 }).then(() => true).catch(() => false);
      if (!up) {
        const what = await S.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 260)).catch(() => '');
        console.log(`info ${tag} seed ${seed}: no kick off within 12 s; the page shows: ${what}`);
        await S.page.screenshot({ path: path.join(SHOTS, `${name}-no-viewer-${seed}.png`) }).catch(() => {});
      }
      const saved = await S.page.evaluate(key => localStorage.getItem(key), save.key);
      const state = JSON.parse(saved);
      const row = state.c.seasons[state.c.seasons.length - 1];
      if (state.c.seasons.length !== startSeasons + 1) { tried.push(`${seed}: no season played`); await S.ctx.close(); continue; }
      tried.push(`${seed}: ${row.teamResult}`);
      if (bind.results.includes(row.teamResult)) got = { S, seed, state, row }; else await S.ctx.close();
    }
    check(!!got, `${tag}: a playoff season was played within 16 seeded presses (${tried.join(' | ')})`);
    if (!got) continue;
    lastSeed[slug] = got.seed;
    const { S, state, row } = got;
    const p = S.page;
    await p.waitForTimeout(reduced ? 300 : 900);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1-kickoff.png`) });
    const y0 = await p.evaluate(() => window.scrollY);
    const went = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-season-centre] button')].find(x => (x.textContent ?? '').includes('Straight to the season review')); if (!b) return false; b.click(); return true; });
    check(went, `${tag}: the kick off offers Straight to the season review`);
    await p.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(150);
    const running = await p.evaluate(() => { const v = document.querySelector('[data-season-centre]'); return document.getAnimations().filter(a => a.playState === 'running' && v && v.contains(a.effect && a.effect.target)).length; });
    if (reduced) check(running === 0, `${tag}: no animation is running in the viewer 150 ms after the review arrives (${running})`);
    else console.log(`info ${tag}: ${running} animations running 150 ms after the review arrives`);
    await p.waitForTimeout(reduced ? 200 : 1800);
    await p.screenshot({ path: path.join(SHOTS, `${name}-2-review-top.png`) });
    await p.evaluate(() => { const el = document.querySelector('[data-playoff-path]'); if (el) el.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, `${name}-3-review-list.png`) });
    const seen = await p.evaluate(() => {
      const box = document.querySelector('[data-playoff-path]');
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const rows = [...box.querySelectorAll('[data-playoff-round]')].map(li => {
        const sp = [...li.children]; const rr = li.getBoundingClientRect();
        return { wl: li.getAttribute('data-playoff-round'), pill: (sp[0] && sp[0].textContent) || '', label: (sp[1] && sp[1].textContent) || '', text: (sp[2] && sp[2].textContent) || '', left: Math.round(rr.left), right: Math.round(rr.right), h: Math.round(rr.height), spans: sp.map(x => { const q = x.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)]; }) };
      });
      const sizes = [...box.querySelectorAll('*')].filter(el => el.children.length === 0 && (el.textContent || '').trim()).map(el => parseFloat(getComputedStyle(el).fontSize));
      const line = box.querySelector('[data-playoff-line]');
      const fin = document.querySelector('[data-review-finish]');
      return { head: (box.firstElementChild && box.firstElementChild.textContent) || '', rows, line: line ? line.textContent : null, left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, docW: document.documentElement.scrollWidth, finish: fin ? fin.textContent : '', scrollY: window.scrollY, minFont: Math.min(...sizes) };
    });
    check(!!seen, `${tag}: the review holds a playoff list`);
    if (seen) {
      const b = M.buildUsSeason(bind, state.c, row, SB.teamLabelOf);
      const want = b.ok ? M.usPlayoffPath(bind, row, b.ctx, b.key) : null;
      const unnamed = bind.view.words.unnamed;
      const wantRows = want ? want.steps.map(st => `${st.won ? 'W' : 'L'}|${st.round}|${st.won ? 'beat' : 'lost to'} ${st.opp === unnamed ? unnamed : `the ${st.opp}`}${st.score ? ` ${st.score}` : ''}`) : [];
      const gotRows = seen.rows.map(x => `${x.pill}|${x.label}|${x.text}`);
      check(!!want && JSON.stringify(gotRows) === JSON.stringify(wantRows), `${tag}: the list on screen is this tree's usPlayoffPath for the saved line (screen: ${gotRows.join(' ; ')} || node: ${wantRows.join(' ; ')})`);
      const depth = bind.results.indexOf(row.teamResult);
      const rounds = Math.min(bind.rounds.length, depth + 1);
      const champion = depth === bind.results.length - 1;
      check(seen.rows.length === rounds, `${tag}: ${seen.rows.length} rounds on screen for "${row.teamResult}" (${rounds})`);
      check(seen.rows.every((x, i) => x.wl === (i < rounds - 1 || champion ? 'W' : 'L') && x.pill === x.wl), `${tag}: every round but the last is a W, and the last is ${champion ? 'a W (a title)' : 'an L'}`);
      check(seen.finish.includes(row.teamResult), `${tag}: the finish line says the saved result (${seen.finish})`);
      if (bind.series) {
        const scores = seen.rows.map(x => (/(\d+)-(\d+)$/.exec(x.text) || []).slice(1).map(Number));
        const total = scores.reduce((a, s) => a + (s[0] ?? NaN) + (s[1] ?? NaN), 0);
        check(total === row.poGames, `${tag}: the series scores on screen add up to the ${row.poGames} playoff games on the save (${scores.map(s => s.join('-')).join(', ')})`);
        check(scores.every((s, i) => (i < rounds - 1 || champion ? s[0] === 4 && s[1] >= 0 && s[1] <= 3 : s[1] === 4 && s[0] >= 0 && s[0] <= 3)), `${tag}: every series score is a best of seven's, his wins first`);
      } else {
        check(seen.rows.every(x => !/\d+-\d+/.test(x.text)), `${tag}: a one game round prints no score`);
        check(row.poGames === rounds, `${tag}: the save holds ${row.poGames} playoff games for ${rounds} rounds`);
      }
      check(seen.line === null || seen.line.startsWith('Your playoffs: '), `${tag}: the line under the list is the save's own playoff line (${seen.line})`);
      check(seen.docW <= seen.vw && seen.left >= 0 && seen.right <= seen.vw && seen.rows.every(x => x.left >= 0 && x.right <= seen.vw && x.spans.every(sp => sp[1] <= seen.vw + 1)), `${tag}: nothing of the list runs off the screen (list ${seen.left} to ${seen.right} of ${seen.vw}, page ${seen.docW})`);
      check(seen.minFont >= 11, `${tag}: no text of the list is under 11 px (${seen.minFont})`);
      check(seen.scrollY === y0, `${tag}: the page behind did not move (${y0} to ${seen.scrollY})`);
      const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
      check(!DASH.test(JSON.stringify(seen)), `${tag}: no dash of the forbidden kinds in the list`);
      summary.push(`${tag}: seed ${got.seed}; "${row.teamResult}", poGames ${row.poGames}; ${gotRows.join(' ; ')}; ${seen.line}`);
    }
    check(S.errors.length === 0, `${tag}: no page error (${S.errors.slice(0, 2).join(' | ')})`);
    await S.ctx.close();
  }
}
await browser.close();
console.log('');
for (const s of summary) console.log(`SEEN ${s}`);
fs.writeFileSync(path.join(SHOTS, 'walk-summary.txt'), `${summary.join('\n')}\n`);
console.log(`${aborted} requests to the database host aborted, none let through`);
console.log(`review-run-walk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
