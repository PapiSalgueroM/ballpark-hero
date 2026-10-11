// Review (run lens) of Round 1212: MLB My Career's Week by week, played the way a player would.
// Runs on a GitHub runner against a served build (BASE), saves made by the real binding in node, every
// request that is not the local server aborted. Screenshots and walk-data.json go to RC_OUT. No assertion
// stops it: it prints what it sees, and PROBLEM lines for what looks wrong.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'review-run-out');
fs.mkdirSync(OUT, { recursive: true });
const data = { problems: [], scenarios: {} };
const problem = msg => { console.log(`PROBLEM ${msg}`); data.problems.push(msg); };
const note = msg => console.log(`     ${msg}`);

/* the real binding, bundled the way scripts/playUsSeasonCentre.mjs does it */
const BUNDLE = path.join(os.tmpdir(), `review-run-walk-${process.pid}.mjs`);
await build({
  stdin: { contents: "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';\nexport { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __rq } from 'node:module'; const require = __rq(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(BUNDLE).href);
const SB = M.MLB_CAREER_SPORT;
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const heldOf = (c, year = c.year, team = c.team) => SB.seasonCentreHeld?.(year, c.eraId, { pos: c.pos, team }) ?? null;

/** A career on the hub after `seasons` seasons, played with the binding's own calls (the fleet's loop). */
function career(seed, pos, eraId, seasons, year = null) {
  const rng = mulberry32(seed);
  const real = Math.random;
  Math.random = rng;
  try {
    const c = SB.startCareer('Review Runner', pos, SB.create.archetypes[pos][seed % SB.create.archetypes[pos].length], rng, null, eraId);
    if (year !== null) c.year = year;
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < seasons && !c.retired; i += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); continue; }
      if (c.contractYears <= 0) {
        const fa = SB.buildFaWindow(c, tq, rng);
        const offer = fa.offers.find(o => !o.gone) ?? fa.offers[0];
        if (offer) { M.applyFaSigning(c, offer); SB.campBattle(c, offer.quality, rng); tq = offer.quality; }
      }
      SB.campBattle(c, tq, rng);
      SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      if (SB.shouldRetire(c)) { c.retired = true; break; }
      tq = SB.rollTeamQuality(tq, rng);
    }
    return { c, tq };
  } finally { Math.random = real; }
}
const saveOf = ({ c, tq }) => ({ key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) });
/** The first seed whose career passes `want`, or null. */
function find(want, pos, eraId, seasons, year = null, from = 1, tries = 400) {
  for (let s = from; s < from + tries; s += 1) {
    const got = career(s, pos, eraId, seasons, year);
    if (!got.c.retired && want(got.c)) return { ...got, seed: s };
  }
  return null;
}
const last = c => c.seasons[c.seasons.length - 1];

let browser = null;
const VIEWS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];

/** One page on the MLB hub with that save in its store. */
async function open(save, vp, { reduced = false, help = true, throttle = 0 } = {}) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(u => !u.href.startsWith(BASE) && !u.href.startsWith('data:') && !u.href.startsWith('blob:'), r => r.abort());
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([k, v, seen]) => {
    let t = 1212;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('review-run')) {
        sessionStorage.setItem('review-run', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(k, v);
        if (seen) localStorage.setItem('seasonCentre:help:mlb', '1');
      }
    } catch { /* private mode */ }
  }, [save.key, save.value, help]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  if (throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  await page.goto(`${BASE}/mlb-my-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-season-centre-entry]', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
const tagOf = (vp, reduced) => `${vp.width}${reduced ? '-rm' : ''}`;
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.offsetParent !== null && (x.textContent ?? '').includes(t));
  if (!b) return false;
  b.click();
  return true;
}, text);
/** What sticks out of the viewport or is cut off inside the viewer (or the whole page when it is closed). */
const layoutOf = page => page.evaluate(() => {
  const root = document.querySelector('[data-season-centre]') ?? document.body;
  const out = { sideways: document.documentElement.scrollWidth > innerWidth + 1, cut: [], over: [] };
  for (const el of root.querySelectorAll('.truncate')) if (el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1) out.cut.push((el.textContent ?? '').slice(0, 40));
  for (const el of root.querySelectorAll('button, [data-review-tile], [data-record-chip], [data-score-bug], [data-kickoff] *')) {
    if (el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) out.over.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  out.cut = [...new Set(out.cut)].slice(0, 8); out.over = [...new Set(out.over)].slice(0, 8);
  return out;
});
async function lay(page, where) {
  const l = await layoutOf(page);
  if (l.sideways) problem(`${where}: the page scrolls sideways`);
  if (l.cut.length) problem(`${where}: cut off text: ${l.cut.join(' | ')}`);
  if (l.over.length) problem(`${where}: outside the viewport: ${l.over.join(' | ')}`);
}

/** The game log as the viewer prints it (opened on a phone), every row's five cells. */
async function readLog(page, phone) {
  if (phone) { await page.evaluate(() => document.querySelector('[data-game-log-open]')?.click()); await page.waitForTimeout(200); }
  const log = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('[data-record-panel]')].find(el => el.offsetParent !== null);
    const rows = panel ? [...panel.querySelectorAll('[data-game-log] li[data-log-row]')] : [];
    return {
      record: panel?.dataset.record ?? '', chip: panel?.querySelector('[data-record-chip]')?.textContent ?? '', panel: (panel?.textContent ?? '').slice(0, 400),
      wrapped: rows.filter(li => li.getBoundingClientRect().height > 24).map(li => li.textContent).slice(0, 4),
      rows: rows.map(li => [...li.children].map(ch => (ch.textContent ?? '').trim())),
    };
  });
  return log;
}
/** Adds up the game log's lines: games played, at bats, hits, home runs, RBI, doubles, steals, wins, losses. */
function addUp(rows) {
  const t = { games: rows.length, played: 0, ab: 0, h: 0, hr: 0, rbi: 0, d: 0, sb: 0, w: 0, l: 0, other: 0, odd: [] };
  for (const r of rows) {
    const res = r[3] ?? '';
    if (res.startsWith('W')) t.w += 1; else if (res.startsWith('L')) t.l += 1; else t.other += 1;
    const line = r[4] ?? '';
    if (line === 'Did not play') continue;
    const m = /^(\d+)-(\d+)(.*)$/.exec(line);
    if (!m) { t.odd.push(r.join(' ')); continue; }
    t.played += 1; t.h += Number(m[1]); t.ab += Number(m[2]);
    const rest = m[3];
    const n = (re) => { const x = re.exec(rest); return x ? (x[1] ? Number(x[1]) : 1) : 0; };
    t.hr += n(/(?:^|\s)(\d+)? ?HR/); t.rbi += n(/(\d+) RBI/); t.d += n(/(?:^|\s)(\d+)? ?2B/); t.sb += n(/(?:^|\s)(\d+)? ?SB/);
  }
  return t;
}
/** The saved line against the log's sums: the sum rule, read off the screen. */
function sumRule(where, line, t) {
  const avg = t.ab > 0 ? Math.round((t.h / t.ab) * 1000) / 1000 : null;
  const pairs = [['games played', line.games, t.played], ['home runs', line.hr, t.hr], ['RBI', line.rbi, t.rbi], ['steals', line.sb, t.sb], ['average', line.avg, avg]];
  if (typeof line.doubles === 'number') pairs.push(['doubles', line.doubles, t.d]);
  for (const [what, saved, shown] of pairs) if (saved !== shown) problem(`${where}: the log's ${what} add up to ${shown}, the season card says ${saved}`);
  if (t.odd.length) problem(`${where}: log rows this walk cannot read: ${t.odd.slice(0, 3).join(' | ')}`);
  if (t.other) problem(`${where}: ${t.other} log rows are neither a win nor a loss`);
  note(`${where}: log ${t.games} rows, ${t.played} played, ${t.h} for ${t.ab} (${avg}), ${t.hr} HR, ${t.rbi} RBI, ${t.d} 2B, ${t.sb} SB, ${t.w}-${t.l}; card ${JSON.stringify({ games: line.games, avg: line.avg, hr: line.hr, rbi: line.rbi, doubles: line.doubles, sb: line.sb, result: line.teamResult, awards: line.awards, po: line.poGames })}`);
}
const savedCareer = page => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null')?.c ?? null; } catch { return null; } }, SB.saveKey);
const reviewOf = page => page.evaluate(() => ({
  tiles: [...document.querySelectorAll('[data-review-tile]')].map(el => (el.textContent ?? '').trim()),
  path: [...document.querySelectorAll('[data-playoff-path] *')].filter(el => el.children.length === 0).map(el => (el.textContent ?? '').trim()).filter(Boolean),
  pathText: document.querySelector('[data-playoff-path]')?.textContent ?? null,
  text: (document.querySelector('[data-review]')?.textContent ?? '').slice(0, 1200),
}));

/** Scenario 1: a rookie center fielder presses Week by week and watches his first season. */
async function watchFirstSeason(got, vp, reduced, help) {
  const tag = `first-${tagOf(vp, reduced)}`;
  const phone = vp.width < 700;
  const rec = (data.scenarios[tag] = { seed: got.seed, team: got.c.team, year: got.c.year, pos: got.c.pos });
  const S = await open(saveOf(got), vp, { reduced, help });
  const p = S.page;
  rec.hub = await p.evaluate(() => ({ button: document.querySelector('[data-week-by-week]')?.textContent ?? null, held: document.querySelector('[data-season-centre-held]')?.textContent ?? null, h: Math.round(document.querySelector('[data-week-by-week]')?.getBoundingClientRect().height ?? 0) }));
  await p.evaluate(() => document.querySelector('[data-season-centre-entry]')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(150);
  await shot(p, `${tag}-1-hub`);
  await lay(p, `${tag} hub`);
  if (!rec.hub.button) { problem(`${tag}: no Week by week button on the hub (held: ${rec.hub.held})`); await S.ctx.close(); return; }
  const t0 = Date.now();
  await p.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  await p.waitForSelector('[data-season-help], [data-season-centre] [data-kickoff], [data-centre-tile]', { timeout: 30000 }).catch(() => {});
  rec.pressMs = Date.now() - t0;
  if (!help) {
    rec.help = await p.evaluate(() => (document.querySelector('[data-season-help]')?.textContent ?? '').slice(0, 4000));
    if (!rec.help) problem(`${tag}: the first open did not show the help sheet`);
    await shot(p, `${tag}-2-help-top`);
    await p.evaluate(() => { const d = document.querySelector('[role="dialog"][aria-modal="true"]'); if (d) d.scrollTop = d.scrollHeight; });
    await p.waitForTimeout(150);
    await shot(p, `${tag}-2-help-bottom`);
    await lay(p, `${tag} help`);
    await clickText(p, 'Got it');
    await p.waitForTimeout(200);
  }
  await p.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 15000 }).catch(() => {});
  rec.kickoff = await p.evaluate(() => (document.querySelector('[data-kickoff]')?.textContent ?? '').slice(0, 500));
  if (!rec.kickoff) problem(`${tag}: no first card after the press`);
  await shot(p, `${tag}-3-first-card`);
  await lay(p, `${tag} first card`);
  const line = last((await savedCareer(p)) ?? { seasons: [null] });
  rec.line = line;
  if (!line) problem(`${tag}: the save holds no season after the press`);
  /* one game at the clock's own speed */
  await clickText(p, 'Play ball');
  const t1 = Date.now();
  await p.waitForSelector('[data-full-time]', { timeout: 60000 }).catch(() => {});
  rec.gameMs = Date.now() - t1;
  rec.game = await p.evaluate(() => ({ clock: (document.querySelector('[data-match-clock]')?.textContent ?? '').slice(0, 700), full: !!document.querySelector('[data-full-time]'), his: document.querySelector('[data-his-line]')?.textContent ?? null }));
  if (!rec.game.full) problem(`${tag}: the first game did not reach its final inside a minute`);
  await shot(p, `${tag}-4-game-final`);
  await lay(p, `${tag} game final`);
  /* six more at Results, then the log */
  await clickText(p, 'Results');
  for (let i = 0; i < 6; i += 1) { await clickText(p, '▶ Game'); await p.waitForTimeout(150); }
  await shot(p, `${tag}-5-game-7`);
  let log = await readLog(p, phone);
  await shot(p, `${tag}-6-log-7`);
  rec.log7 = { record: log.record, rows: log.rows.slice(0, 7) };
  if (log.wrapped.length) problem(`${tag}: game log rows wrap after seven games: ${log.wrapped.join(' | ')}`);
  if (phone) { await clickText(p, '← Back'); await p.waitForTimeout(150); }
  /* the halfway poster */
  await clickText(p, 'To the next big game');
  await p.waitForSelector('[data-poster]', { timeout: 8000 }).catch(() => {});
  rec.poster = await p.evaluate(() => (document.querySelector('[data-poster]')?.textContent ?? '').slice(0, 600));
  if (!rec.poster) problem(`${tag}: no poster after "To the next big game"`);
  await shot(p, `${tag}-7-poster`);
  await lay(p, `${tag} poster`);
  /* the review */
  await clickText(p, 'Sim the rest');
  await p.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(reduced ? 150 : 700);
  rec.review = await reviewOf(p);
  await shot(p, `${tag}-8-review-top`);
  await p.evaluate(() => { const s = document.querySelector('[data-centre-stage]'); if (s) s.scrollTop = s.scrollHeight; });
  await p.waitForTimeout(200);
  await shot(p, `${tag}-8-review-bottom`);
  await lay(p, `${tag} review`);
  log = await readLog(p, phone);
  await shot(p, `${tag}-9-log-full`);
  rec.record = log.record; rec.panel = log.panel;
  if (log.wrapped.length) problem(`${tag}: game log rows wrap over the season: ${log.wrapped.join(' | ')}`);
  if (line) {
    const t = addUp(log.rows);
    rec.sums = t;
    sumRule(tag, line, t);
    if (t.games !== 162) problem(`${tag}: the log holds ${t.games} games, not 162`);
    if (log.record !== `${t.w}-${t.l}`) problem(`${tag}: the record chip says ${log.record}, the log counts ${t.w}-${t.l}`);
  }
  rec.sampleRows = [...log.rows.slice(0, 4), ...log.rows.slice(-3)];
  if (phone) { await clickText(p, '← Back'); await p.waitForTimeout(150); }
  await p.evaluate(() => document.querySelector('[data-centre-exit]')?.click());
  await p.waitForTimeout(500);
  rec.after = await p.evaluate(() => ({ overlay: !!document.querySelector('[data-season-centre], [data-us-centre-cover]'), curtain: (document.querySelector('[data-season-reveal]')?.textContent ?? '').slice(0, 500) }));
  if (rec.after.overlay) problem(`${tag}: the viewer is still up after its exit button`);
  await shot(p, `${tag}-10-after-exit`);
  rec.errors = S.errors.slice(0, 5);
  if (S.errors.length) problem(`${tag}: ${S.errors.length} page or console errors: ${S.errors.slice(0, 2).join(' | ')}`);
  note(`${tag}: press to first screen ${rec.pressMs} ms; first game ${rec.gameMs} ms; record ${rec.record}; tiles ${rec.review.tiles.join(', ')}; path ${rec.review.pathText}`);
  await S.ctx.close();
}

/** A hub that must say why there is no game by game view, and offer no button. */
async function heldHub(name, got, vp, says) {
  const tag = `held-${name}-${vp.width}`;
  const S = await open(saveOf(got), vp, {});
  const p = S.page;
  const hub = await p.evaluate(() => {
    const el = document.querySelector('[data-season-centre-held]');
    const r = el?.getBoundingClientRect();
    return { line: el?.textContent ?? null, button: !!document.querySelector('[data-week-by-week]'), watch: !!document.querySelector('[data-watch-last]'), right: r ? Math.round(r.right) : null, height: r ? Math.round(r.height) : null, play: [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.textContent ?? '').trim()).filter(t => /Play/.test(t)).slice(0, 3) };
  });
  data.scenarios[tag] = { seed: got.seed, team: got.c.team, year: got.c.year, pos: got.c.pos, era: got.c.eraId ?? 'now', ...hub };
  await p.evaluate(() => document.querySelector('[data-season-centre-entry]')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(150);
  await shot(p, tag);
  await lay(p, tag);
  if (hub.button) problem(`${tag}: the hub offers Week by week for ${got.c.pos} ${got.c.team} ${got.c.year}`);
  if (!hub.line || !hub.line.includes(says)) problem(`${tag}: the held line is "${hub.line}", expected it to say "${says}"`);
  if (hub.right !== null && hub.right > vp.width + 1) problem(`${tag}: the held line runs to x=${hub.right} on a ${vp.width} wide screen`);
  note(`${tag}: "${hub.line}" (button ${hub.button}, ${hub.height}px tall); play buttons: ${hub.play.join(' / ')}`);
  /* and the season still plays in one press */
  if (await clickText(p, 'Play the')) {
    await p.waitForTimeout(900);
    const c = await savedCareer(p);
    const overlay = await p.evaluate(() => !!document.querySelector('[data-season-centre]'));
    data.scenarios[tag].afterPlay = { seasons: c?.seasons?.length ?? null, overlay };
    if (overlay) problem(`${tag}: pressing Play opened the viewer on a held season`);
    if ((c?.seasons?.length ?? 0) !== got.c.seasons.length + 1) problem(`${tag}: Play did not add a season (${c?.seasons?.length} against ${got.c.seasons.length})`);
    await shot(p, `${tag}-after-play`);
  }
  if (S.errors.length) problem(`${tag}: errors: ${S.errors.slice(0, 2).join(' | ')}`);
  await S.ctx.close();
}

/** A season already on the save, opened with Watch again and taken straight to the poster and the review. */
async function watchAgain(name, got, vp, reduced, expect) {
  const tag = `again-${name}-${tagOf(vp, reduced)}`;
  const phone = vp.width < 700;
  const line = last(got.c);
  const rec = (data.scenarios[tag] = { seed: got.seed, team: line.team, year: line.year, pos: got.c.pos, era: got.c.eraId ?? 'now', line });
  const S = await open(saveOf(got), vp, { reduced });
  const p = S.page;
  await p.evaluate(() => document.querySelector('[data-season-centre-entry]')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(150);
  await shot(p, `${tag}-1-hub`);
  rec.hub = await p.evaluate(() => ({ watch: document.querySelector('[data-watch-last]')?.textContent ?? null, held: document.querySelector('[data-season-centre-held]')?.textContent ?? null, button: !!document.querySelector('[data-week-by-week]') }));
  if (!rec.hub.watch) { problem(`${tag}: no Watch again button for the ${line.year} season of ${line.team} (held line: ${rec.hub.held})`); await S.ctx.close(); return; }
  await p.evaluate(() => document.querySelector('[data-watch-last]')?.click());
  await p.waitForSelector('[data-season-centre] [data-kickoff], [data-centre-tile]', { timeout: 30000 }).catch(() => {});
  rec.kickoff = await p.evaluate(() => (document.querySelector('[data-kickoff]')?.textContent ?? document.querySelector('[data-centre-tile]')?.textContent ?? '').slice(0, 500));
  await shot(p, `${tag}-2-first-card`);
  await clickText(p, 'Results');
  await clickText(p, 'Play ball');
  await p.waitForTimeout(300);
  await shot(p, `${tag}-3-game-1`);
  await lay(p, `${tag} game 1`);
  await clickText(p, 'To the next big game');
  await p.waitForSelector('[data-poster]', { timeout: 8000 }).catch(() => {});
  rec.poster = await p.evaluate(() => (document.querySelector('[data-poster]')?.textContent ?? '').slice(0, 600));
  await shot(p, `${tag}-4-poster`);
  await lay(p, `${tag} poster`);
  if (expect.star !== undefined && rec.poster.includes('You are an All-Star this year.') !== expect.star) problem(`${tag}: the halfway poster ${expect.star ? 'does not say' : 'says'} All-Star for a season whose awards are ${JSON.stringify(line.awards)}: "${rec.poster}"`);
  await clickText(p, 'Sim the rest');
  await p.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(reduced ? 150 : 700);
  rec.review = await reviewOf(p);
  await shot(p, `${tag}-5-review-top`);
  await p.evaluate(() => { const s = document.querySelector('[data-centre-stage]'); if (s) s.scrollTop = s.scrollHeight; });
  await p.waitForTimeout(200);
  await shot(p, `${tag}-5-review-bottom`);
  await lay(p, `${tag} review`);
  if (expect.path !== undefined && (rec.review.pathText !== null) !== expect.path) problem(`${tag}: ${expect.path ? 'no playoff path' : 'a playoff path'} for "${line.teamResult}" in ${line.year} with ${line.poGames} playoff games: ${rec.review.pathText}`);
  if (expect.says && !rec.review.text.includes(expect.says)) problem(`${tag}: the review does not say "${expect.says}"`);
  const log = await readLog(p, phone);
  await shot(p, `${tag}-6-log`);
  rec.record = log.record;
  const t = addUp(log.rows);
  rec.sums = t;
  sumRule(tag, line, t);
  if (log.record !== `${t.w}-${t.l}`) problem(`${tag}: the record chip says ${log.record}, the log counts ${t.w}-${t.l}`);
  if (log.wrapped.length) problem(`${tag}: game log rows wrap: ${log.wrapped.join(' | ')}`);
  rec.sampleRows = [...log.rows.slice(0, 5), ...log.rows.slice(-3)];
  if (expect.unnamed !== undefined) {
    const named = log.rows.filter(r => r[2] !== 'another team').length;
    if ((named === 0) !== expect.unnamed) problem(`${tag}: ${named} of ${log.rows.length} log rows name an opponent, expected ${expect.unnamed ? 'none' : 'all'}`);
  }
  if (S.errors.length) problem(`${tag}: errors: ${S.errors.slice(0, 2).join(' | ')}`);
  note(`${tag}: poster "${rec.poster.slice(0, 160)}"; tiles ${rec.review.tiles.join(', ')}; path ${rec.review.pathText}; record ${rec.record}`);
  await S.ctx.close();
}

/** Measured, never asserted: the press to the first card on a phone four times slower. */
async function pressTiming(got, vp, throttle) {
  const S = await open(saveOf(got), vp, { throttle });
  const t0 = Date.now();
  await S.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  await S.page.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 60000 }).catch(() => {});
  const ms = Date.now() - t0;
  data.scenarios[`timing-${vp.width}-x${throttle}`] = { ms };
  note(`press to first card at ${vp.width} wide under a ${throttle}x CPU throttle: ${ms} ms`);
  await S.ctx.close();
}

const keep = got => { got.c.contractYears = Math.max(3, got.c.contractYears ?? 0); return got; };
const isPlayoff = l => !!l && typeof l.teamResult === 'string' && l.teamResult !== 'Missed October' && l.teamResult !== 'SUSPENDED';
const openLast = c => { const l = last(c); return !!l && l.games > 0 && heldOf(c, l.year, l.team) === null; };
const run = async (name, fn) => { try { await fn(); } catch (e) { problem(`${name}: the walk itself threw: ${String(e && e.message ? e.message : e).slice(0, 300)}`); } };

/* ─── the saves ─── */
const rookie = find(c => c.role !== 'backup' && heldOf(c) === null, 'CF', 'now', 0);
const pitcher = find(() => true, 'SP', 'now', 0);
const oriole = find(c => ['BAL', 'NYY'].includes(c.team), 'CF', 'now', 0);
const y2020 = find(c => !['STL', 'DET'].includes(c.team), 'SS', 'y2004', 0, 2020);
const y2004short = find(c => ['PIT', 'MIL', 'TBD', 'TOR'].includes(c.team), 'CF', 'y2004', 0);
const japan = find(c => heldOf(c) === null, 'RF', 'now', 0, null, 50);
if (japan) japan.c.team = 'Yomiuri Giants';
let star = null; let plain = null; let throwback = null; let hurt = null;
for (let k = 1; k <= 9 && !(star && plain && hurt); k += 1) {
  star ??= find(c => { const l = last(c); return openLast(c) && isPlayoff(l) && Array.isArray(l.awards) && l.awards.includes('All-Star') && Number.isInteger(l.poGames); }, 'SS', 'now', k, null, 1, 120);
  plain ??= find(c => { const l = last(c); return openLast(c) && l.teamResult === 'Missed October' && !(l.awards ?? []).includes('All-Star') && l.games > 150; }, '1B', 'now', k, null, 1, 60);
  hurt ??= find(c => { const l = last(c); return openLast(c) && l.games < 100; }, 'C', 'now', k, null, 1, 120);
}
for (let k = 1; k <= 9 && !throwback; k += 1) throwback = find(c => { const l = last(c); return openLast(c) && isPlayoff(l) && l.year < 2022; }, 'LF', 'y2004', k, null, 1, 120);
/* a line as an older build saved it: no doubles and no on base percentage (before Round 58) */
const older = star ? JSON.parse(JSON.stringify({ c: star.c, tq: star.tq, seed: star.seed })) : null;
if (older) { const l = last(older.c); delete l.doubles; delete l.obp; delete l.slate; }
/* a line whose playoff games cannot fit the rounds it says he played (a save from before October was held to them) */
let misfit = null;
for (let k = 1; k <= 9 && !misfit; k += 1) misfit = find(c => { const l = last(c); return openLast(c) && l.teamResult === 'Lost the Wild Card series' && l.year >= 2022; }, '3B', 'now', k, null, 1, 200);
if (misfit) last(misfit.c).poGames = 5;
for (const [name, got] of Object.entries({ rookie, pitcher, oriole, y2020, y2004short, japan, star, plain, throwback, hurt, older, misfit })) {
  if (!got) { problem(`no save found for the ${name} scenario`); continue; }
  keep(got);
  const l = last(got.c);
  note(`save ${name}: seed ${got.seed}, ${got.c.pos} ${got.c.team} ${got.c.year} (${got.c.eraId ?? 'now'}), ${got.c.seasons.length} seasons${l ? `, last ${l.year} ${l.team} ${l.games} games "${l.teamResult}" po ${l.poGames} awards ${JSON.stringify(l.awards ?? [])}` : ''}; hub line: ${heldOf(got.c)}`);
}

/* ─── the walk ─── */
if (process.env.WALK_DRY) { console.log('dry run: saves only'); process.exit(0); }
const { chromium } = await import('playwright');
browser = await chromium.launch();
const [PHONE, DESK] = VIEWS;
if (rookie) {
  await run('first 390', () => watchFirstSeason(rookie, PHONE, false, false));
  await run('first 390 rm', () => watchFirstSeason(rookie, PHONE, true, true));
  await run('first 1280', () => watchFirstSeason(rookie, DESK, false, true));
  await run('first 1280 rm', () => watchFirstSeason(rookie, DESK, true, false));
  await run('timing', () => pressTiming(rookie, PHONE, 4));
  await run('timing', () => pressTiming(rookie, PHONE, 1));
}
for (const vp of VIEWS) {
  if (pitcher) await run('held pitcher', () => heldHub('pitcher', pitcher, vp, 'for pitchers yet'));
  if (oriole) await run('held oriole', () => heldHub('club161', oriole, vp, 'the real 2026 season'));
  if (y2020) await run('held 2020', () => heldHub('y2020', y2020, vp, 'the real 2020 season had 60 games'));
  if (y2004short) await run('held 2004', () => heldHub('y2004club', y2004short, vp, 'the real 2004 season'));
  if (japan) await run('held japan', () => heldHub('japan', japan, vp, 'outside Major League Baseball'));
}
if (star) { await run('star', () => watchAgain('star', star, PHONE, false, { star: true, path: true, unnamed: false })); await run('star', () => watchAgain('star', star, DESK, true, { star: true, path: true, unnamed: false })); }
if (plain) await run('plain', () => watchAgain('plain', plain, PHONE, true, { star: false, path: false, unnamed: false }));
if (throwback) { await run('throwback', () => watchAgain('throwback', throwback, PHONE, false, { path: false, unnamed: true, says: 'The playoff path starts with the 2022 season' })); await run('throwback', () => watchAgain('throwback', throwback, DESK, false, { path: false, unnamed: true, says: 'The playoff path starts with the 2022 season' })); }
if (hurt) { await run('hurt', () => watchAgain('hurt', hurt, PHONE, false, {})); await run('hurt', () => watchAgain('hurt', hurt, DESK, false, {})); }
if (older) await run('older', () => watchAgain('older', older, PHONE, false, { star: true, path: true }));
if (misfit) await run('misfit', () => watchAgain('misfit', misfit, PHONE, false, { path: false, says: 'do not fit' }));

await browser.close();
try { fs.unlinkSync(BUNDLE); } catch { /* a copy */ }
fs.writeFileSync(path.join(OUT, 'walk-data.json'), JSON.stringify(data, null, 1));
console.log(`review-run-walk: ${Object.keys(data.scenarios).length} scenarios, ${data.problems.length} problems`);
