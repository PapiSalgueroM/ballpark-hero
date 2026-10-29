/* Reviewer walk (Round 1584, run lens): play Soccer Grid in Chromium against the served build, with the board's
   puzzle fixed to one carrying "Played for Arsenal" and the validator call answered by the HEAD's real
   soccer-grid-validate handler (fake database rows, fake model saying no). Every other supabase.co request is
   aborted, so production is never reached. Screenshots go to $RC_OUT. Exit 1 on a broken expectation. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { transform } from 'esbuild';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });

/* ---- the head handler with a fake database ---- */
const st = (player_name, club, first_year, last_year, nationality, position, debut_year, debut_age) =>
  ({ player_name, club, first_year, last_year, seasons: last_year - first_year + 1, nationality, position, debut_year, debut_age, person_key: null });
const DB = {
  'artem dzyuba': [st('Artem Dzyuba', 'Spartak Moscow', 2011, 2014, 'Russia', 'Centre-Forward', 2011, 22),
    st('Artem Dzyuba', 'Arsenal Tula', 2018, 2018, 'Russia', 'Centre-Forward', 2011, 22),
    st('Artem Dzyuba', 'Zenit St. Petersburg', 2015, 2021, 'Russia', 'Centre-Forward', 2011, 22)],
  'bukayo saka': [st('Bukayo Saka', 'Arsenal FC', 2019, 2026, 'England', 'Right Winger', 2019, 17)],
};
let current = '';
const resolveCall = (call) => {
  const ops = call.ops.map(o => o[0]);
  let data = [];
  if (call.table === 'ai_validation_cache') data = ops.includes('maybeSingle') ? null : [];
  else if (call.table === 'soccer_player_club_stints') data = structuredClone(DB[current] ?? []);
  return Promise.resolve({ data, error: null });
};
const fakeClient = { from(table) {
  const call = { table, ops: [] };
  const b = new Proxy({}, { get(_, prop) {
    if (prop === 'then') return (res, rej) => resolveCall(call).then(res, rej);
    if (prop === 'maybeSingle' || prop === 'single') return () => { call.ops.push([prop]); return resolveCall(call); };
    return (...args) => { call.ops.push([prop, ...args]); return b; };
  } });
  return b;
} };
const fakeFetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ valid: false, reason: 'model says no' }) } }] }), { status: 200 });
const raw = fs.readFileSync('supabase/functions/soccer-grid-validate/index.ts', 'utf8').replace(/\r\n/g, '\n')
  .replace(/^import\s[^\n]*?from\s+"https:\/\/[^"]+";[ \t]*$/gm, '');
const { code } = await transform(raw, { loader: 'ts', target: 'es2022' });
let handler = null;
new Function('serve', 'createClient', 'Deno', 'fetch', 'setInterval', 'console', code)(
  h => { handler = h; }, () => fakeClient, { env: { get: k => ({ GEMINI_API_KEY: 'k', SUPABASE_URL: 'http://fake.local', SUPABASE_SERVICE_ROLE_KEY: 'f' })[k] } },
  fakeFetch, () => 0, { log() {}, error() {}, warn() {}, info() {} });

const PUZZLE = [{ puzzle_id: 'sg-r1584-review', rows_json: [
  { label: 'Played for Arsenal', type: 'club' }, { label: 'Played for Inter Milan', type: 'club' }, { label: 'Played for Manchester City', type: 'club' }],
  cols_json: [{ label: 'Forward (FWD)', type: 'position' }, { label: 'Played in Serie A', type: 'league' }, { label: 'Champions League Winner', type: 'champions_league' }] }];
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
const calls = [];

let bad = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'BAD '} ${msg}`); if (!cond) bad += 1; };
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const rm of ['reduce', 'no-preference']) {
    const tag = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
    await ctx.addInitScript(() => { try { localStorage.setItem('sg-rules-seen', '1'); } catch {} });
    await ctx.route(/supabase\.co/, async route => {
      const req = route.request();
      const u = req.url();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
      if (u.includes('/functions/v1/soccer-grid-validate')) {
        const body = JSON.parse(req.postData() || '{}');
        current = String(body.playerName || '').toLowerCase().trim();
        const r = await handler(new Request('http://fake.local/soccer-grid-validate', { method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://douknowball.com', 'x-forwarded-for': `10.8.0.${calls.length + 1}` },
          body: JSON.stringify(body) }));
        const text = await r.text();
        calls.push(`${tag} ${body.playerName} | ${body.rowAttribute} | ${body.colAttribute} -> ${text.slice(0, 120)}`);
        return route.fulfill({ status: 200, headers: CORS, body: text });
      }
      if (u.includes('/rest/v1/soccer_grid_puzzles')) return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(PUZZLE) });
      return route.abort();
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
    await page.goto(`${BASE}/soccer-grid`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForSelector('button[data-grid-cell-status]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `grid-${tag}-0-board.png`) });
    const labels = await page.evaluate(() => document.body.innerText.includes('Played for Arsenal') || document.body.innerText.includes('Arsenal'));
    check(labels, `${tag}: the board shows the Arsenal row`);
    const guess = async (name, step) => {
      await page.locator('button[data-grid-cell-status]').nth(0).click();
      const input = page.getByLabel('Search for a player');
      await input.fill(name);
      await input.press('Enter');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, `grid-${tag}-${step}.png`) });
      return page.locator('button[data-grid-cell-status]').nth(0).getAttribute('data-grid-cell-status');
    };
    const s1 = await guess('Artem Dzyuba', '1-dzyuba');
    check(s1 !== 'correct', `${tag}: Artem Dzyuba (Arsenal Tula only) is not accepted for Arsenal x FWD (cell status ${s1})`);
    const s2 = await guess('Bukayo Saka', '2-saka');
    check(s2 === 'correct', `${tag}: Bukayo Saka is accepted for Arsenal x FWD (cell status ${s2})`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${tag}: no horizontal overflow (${overflow}px)`);
    check(!errors.length, `${tag}: no page errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();
for (const c of calls) console.log('  call: ' + c);
console.log(bad ? `walkGrid: ${bad} expectation(s) failed` : 'walkGrid: green');
process.exit(bad ? 1 : 0);
