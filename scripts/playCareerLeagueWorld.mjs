/**
 * Round 1100: every league a real league, in a real browser.
 *
 * A save recorded on main two seasons into Twente (scripts/data/
 * careerLeagueWorldSaves1100.json, the engine's own bytes) is handed to the
 * page through the game's own storage key, the next season is played with
 * 📺 Week by week, and the page must show what the round promises for a plain
 * league from 2026-27:
 *   1. the Season Centre opens and the page does not move (window.scrollY);
 *   2. the kick off card says 18 clubs and 34 matchdays;
 *   3. the table has 18 rows and none reads "another club" (a phone shows
 *      the compact table, a window of rows around his own: none unnamed);
 *   4. the season review prints a position "of 18" ("7th of 18", or "top
 *      of 18" in a title season; at least one of the four seasons walked
 *      must be an ordinary finish);
 *   5. the Season Summary card prints the same position "of 18";
 *   6. no sideways scroll, before and after, and no page error;
 *   7. (review fix) on the FINAL table no row reads "another club", 1st
 *      place least of all;
 *   8. (review fix) on a desktop the last row of the table can be brought
 *      whole into view inside its column (a 24 club table is taller than the
 *      window: the column scrolls, nothing is lost under the bottom bar).
 *
 * PLAY_LEAGUE_WORLD_SAVE=cha walks the recorded Norwich City save instead:
 * the Championship, 24 clubs and 46 matchdays, one of the four leagues the
 * phone's world runs no title race for. Before the review fix its table read
 * "another club" in 1st place every season he did not win it and left a real
 * club off; the Eredivisie, which the world does crown, could not show that.
 * At 390 by 844 and 1280 by 900, with motion on and reduced. The live database
 * is unreachable (every request to supabase.co is aborted).
 *
 * Control: PLAY_LEAGUE_WORLD_CONTROL=odd runs the same walk on the recorded
 * Hearts save. The Scottish Premiership splits in two, so the page must say
 * Results only, and the run exits 0 only if checks 2, 3 and 4 FAILED at every
 * size: that proves they read the page and not a constant.
 *
 * NOT walked here: the dugout's final table in an odd league (its row count
 * and sentence are held by simCareerLeagueWorld sections D3 and E and by
 * src/lib/soccerCareerLeague.test.ts).
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playCareerLeagueWorld.mjs
 * (BASE=http://host:port uses a server that is already up). Green is the
 * closing "playCareerLeagueWorld: N checks, 0 failed" line and exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4561);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.PLAY_LEAGUE_WORLD_CONTROL ?? '';
if (CONTROL && CONTROL !== 'odd') throw new Error(`unknown PLAY_LEAGUE_WORLD_CONTROL ${CONTROL}`);
const SHOTS = process.env.RC_OUT || path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');

let checks = 0, failed = 0;
const failedIds = [];
const check = (ok, id, label) => { checks += 1; if (ok) console.log(`ok   ${id} ${label}`); else { failed += 1; failedIds.push(id); console.log(`FAIL ${id} ${label}`); } return ok; };

const saves = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves;
const SAVE_ID = process.env.PLAY_LEAGUE_WORLD_SAVE || 'ere';
const SHAPES = { ere: [18, 34], cha: [24, 46] };
if (!SHAPES[SAVE_ID]) throw new Error(`unknown PLAY_LEAGUE_WORLD_SAVE ${SAVE_ID} (${Object.keys(SHAPES).join(', ')})`);
const want = CONTROL === 'odd' ? 'sco' : SAVE_ID;
const save = saves.find(s => s.id === want);
if (!save || save.kind !== 'player') { console.log(`the recorded saves hold no player save "${want}"`); process.exit(2); }
const SAVE = JSON.stringify(save.state);
const [SIZE, MATCHDAYS] = SHAPES[SAVE_ID];
console.log(`save "${want}": ${save.club}, ${save.state.seasons.length} seasons, phase ${save.state.phase}${CONTROL ? ' (CONTROL odd: the table checks must fail)' : ''}`);

let server = null;
if (!process.env.BASE) {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('dist/index.html is missing: run npm run build first. NOT CHECKED.'); process.exit(1); }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
}
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const stop = code => { try { server?.kill(); } catch { /* gone */ } process.exit(code); };

const clickText = async (page, text) => {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, text);
  await page.waitForTimeout(300);
  return ok;
};

async function open(width, height, reduced, seed) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('league-world-harness')) {
        sessionStorage.setItem('league-world-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, [SAVE, seed]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-week-by-week]', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

const ORDINALS = [];
async function walk(width, height, reduced, first) {
  const tag = `${width}x${height}${reduced ? ' reduced motion' : ''}:`;
  /* a season cut short by a severe injury has no table by design: take the next seed */
  for (const seed of [first, first + 1, first + 2, first + 3]) {
    const { ctx, page, errors } = await open(width, height, reduced, seed);
    const y0 = await page.evaluate(() => window.scrollY);
    const hub = await page.$('[data-week-by-week]');
    if (!hub) { check(false, '1', `${tag} the hub shows 📺 Week by week`); await ctx.close(); return; }
    await page.click('[data-week-by-week]');
    const opened = await page.waitForSelector('[data-kickoff]', { timeout: 30000 }).then(() => true).catch(() => false);
    const why = opened ? await page.evaluate(() => document.querySelector('[data-results-why]')?.textContent.trim() ?? null) : null;
    if (opened && why && /cut short/.test(why) && seed !== first + 3) { console.log(`   ${tag} seed ${seed}: a season cut short, next seed`); await ctx.close(); continue; }
    const y1 = await page.evaluate(() => window.scrollY);
    check(opened && y1 === y0, '1', `${tag} the Season Centre opens and the page does not move (scrollY ${y0} then ${y1})`);
    const at = await page.evaluate(() => ({
      frame: document.querySelector('[data-frame-line]')?.textContent.trim() ?? null,
      why: document.querySelector('[data-results-why]')?.textContent.trim() ?? null,
      rows: document.querySelectorAll('[data-centre-table] [data-club]').length,
      unnamed: [...document.querySelectorAll('[data-centre-table] [data-club]')].filter(r => /another club/.test(r.textContent)).length,
      names: [...document.querySelectorAll('[data-centre-table] [data-club]')].slice(0, 4).map(r => r.getAttribute('data-club')),
      sw: document.documentElement.scrollWidth,
    }));
    check(!!at.frame && at.frame.includes(`${SIZE} clubs`) && at.frame.includes(`${MATCHDAYS} matchdays`), '2', `${tag} the kick off card says ${SIZE} clubs and ${MATCHDAYS} matchdays ("${at.frame ?? at.why ?? 'nothing'}")`);
    /* a phone shows the compact table, a window of rows around his own; the whole table is the desktop's */
    const whole = width >= 768;
    check((whole ? at.rows === SIZE : at.rows >= 3) && at.unnamed === 0, '3', `${tag} ${whole ? `the table has ${SIZE} rows` : 'the compact table shows its rows'} and none reads "another club" (${at.rows} rows, ${at.unnamed} unnamed; first ${at.names.join(', ')})`);
    check(at.sw <= width + 1, '6', `${tag} no sideways scroll on the kick off card (${at.sw})`);
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOTS, `league-world-${want}-${width}${reduced ? '-reduced' : ''}-kickoff.png`) });
    if (!(await clickText(page, '⏭ Straight to the final table'))) await clickText(page, '⏭ Straight to the season review');
    await page.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
    const finish = await page.evaluate(() => document.querySelector('[data-review-finish]')?.textContent.trim() ?? null);
    const pos = finish ? (/(\d+)(?:st|nd|rd|th) of (\d+)/.exec(finish) ?? /top of (\d+)/.exec(finish)) : null;
    check(!!pos && Number(pos[pos.length - 1]) === SIZE, '4', `${tag} the season review prints a position of ${SIZE} ("${finish ?? 'nothing'}")`);
    if (pos && pos.length === 3) ORDINALS.push(`${pos[0]} at ${width}`);
    await page.screenshot({ path: path.join(SHOTS, `league-world-${want}-${width}${reduced ? '-reduced' : ''}-review.png`) });
    /* 7 and 8: the final table as it stands at the review */
    const fin = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-centre-table] [data-club]')];
      const last = rows[rows.length - 1];
      let fit = null;
      if (last) {
        last.scrollIntoView({ block: 'end' });
        const r = last.getBoundingClientRect();
        const col = last.closest('aside');
        const c = col ? col.getBoundingClientRect() : null;
        fit = { top: Math.round(r.top), bottom: Math.round(r.bottom), colTop: c ? Math.round(c.top) : null, colBottom: c ? Math.round(c.bottom) : null, scrolls: col ? col.scrollHeight > col.clientHeight : null };
      }
      return { n: rows.length, first: rows[0] ? rows[0].getAttribute('data-club') ?? rows[0].textContent.trim() : null, unnamed: rows.filter(r => /another club/.test(r.textContent)).length, fit };
    });
    check((whole ? fin.n === SIZE : fin.n >= 3) && fin.unnamed === 0 && !!fin.first && !/another club/.test(fin.first), '7', `${tag} the final table names every row it shows, 1st place included (${fin.n} rows, ${fin.unnamed} unnamed, top row ${fin.first ?? 'none'})`);
    if (whole) check(!!fin.fit && fin.fit.colBottom !== null && fin.fit.top >= fin.fit.colTop - 1 && fin.fit.bottom <= fin.fit.colBottom + 1, '8', `${tag} the last row of the table comes whole into view inside its column (row ${fin.fit ? `${fin.fit.top} to ${fin.fit.bottom}` : 'missing'}, column ${fin.fit ? `${fin.fit.colTop} to ${fin.fit.colBottom}` : 'missing'}${fin.fit && fin.fit.scrolls ? ', the column scrolls' : ''})`);
    await page.screenshot({ path: path.join(SHOTS, `league-world-${want}-${width}${reduced ? '-reduced' : ''}-final-table.png`) });
    await page.click('[data-centre-exit]').catch(() => {});
    await page.waitForTimeout(700);
    const y2 = await page.evaluate(() => window.scrollY);
    const closed = !(await page.$('[data-season-centre]'));
    check(closed && y2 === y0, '1', `${tag} leaving closes the Season Centre and the page has not moved (scrollY ${y2})`);
    /* the papers, then the Season Summary card */
    let card = null;
    for (let i = 0; i < 6 && !card; i += 1) {
      card = await page.evaluate(() => {
        const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Season Summary');
        const box = h ? h.closest('div.relative') ?? h.parentElement : null;
        /* the finish line is its own paragraph on the card (playSeasonCentre reads it the same way) */
        const line = box ? [...box.querySelectorAll('p')].map(p => p.textContent.replace(/\s+/g, ' ').trim()).find(t => /\d+(?:st|nd|rd|th) of \d+|top of \d+/.test(t)) : null;
        return box ? (line ?? 'no position on the card') : null;
      });
      if (!card && !(await clickText(page, 'Continue to Season Summary'))) await page.waitForTimeout(500);
    }
    const cardPos = card ? (/(\d+)(?:st|nd|rd|th) of (\d+)/.exec(card) ?? /top of (\d+)/.exec(card)) : null;
    if (!CONTROL) check(!!cardPos && Number(cardPos[cardPos.length - 1]) === SIZE && (!pos || !cardPos[2] || cardPos[1] === pos[1]), '5', `${tag} the Season Summary card prints the same position of ${SIZE} (${cardPos ? cardPos[0] : card ? 'no position on the card' : 'the card did not show'})`);
    const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
    check(sw2 <= width + 1 && errors.length === 0, '6', `${tag} no sideways scroll on the summary (${sw2}) and no page error${errors.length ? `: ${errors[0]}` : ''}`);
    await ctx.close();
    return;
  }
}

try {
  /* four different seasons, so the walk meets a title ("top of 18") and an ordinary finish ("7th of 18") */
  let n = 0;
  for (const [w, h] of [[390, 844], [1280, 900]]) for (const reduced of [false, true]) { await walk(w, h, reduced, 1100 + 101 * n); n += 1; }
  if (!CONTROL) check(ORDINALS.length > 0, '4', `at least one of the four seasons ended with an ordinal position of ${SIZE} (${ORDINALS.join('; ') || 'none: every season was a title'})`);
} catch (e) {
  check(false, '0', `the walk threw: ${String(e && e.stack ? e.stack : e).slice(0, 300)}`);
}
await browser.close();
if (CONTROL === 'odd') {
  /* 7 fails there too (no table at all); it is not part of the control's proof */
  const table = ['2', '3', '4'];
  const fired = table.every(id => failedIds.filter(x => x === id).length === 4);
  console.log(fired
    ? `playCareerLeagueWorld control odd: checks 2, 3 and 4 failed at all four sizes on a league with no table, as they must (${failed} of ${checks} failed)`
    : `playCareerLeagueWorld control odd: DID NOT FIRE (failed: ${failedIds.join(' ') || 'none'})`);
  stop(fired ? 0 : 1);
}
console.log(`playCareerLeagueWorld: ${checks} checks, ${failed} failed`);
stop(failed ? 1 : 0);
