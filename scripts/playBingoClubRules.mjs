/* Player Bingo club squares in the built page (Round 1571). Remote CI only.

   Serves a built dist with scripts/lib/hostLikeServer.mjs and answers the
   page's Supabase REST reads from the committed fixture of its own reads
   (scripts/data/bingoPoolHistory-2026-10-29.json); world_cup_players and
   ballon_dor answer with no rows and every other host is aborted, so nothing
   reaches production. At 390 by 844 and 1280 by 900:
     a. the "?" opens before play and holds the Club squares section, word for
        word, with no horizontal overflow (a screenshot of it in $RC_OUT);
     b. a seeded Math.random: seeds 1 to 60 are searched for a board with
        Played for 4+ clubs, then the walk skips until Tyler Morton is dealt
        and taps that square: it locks with his name, the strikes stay where
        they were, and scrollY and the document height do not move.
     c. the window case (Round 1576): seeds 1 to 200 are searched for a board
        with WINDOW_TILE, the walk skips until WINDOW_MAN is dealt and taps
        it, with the same checks. Marcus Rashford spent 2025-26 on loan at
        Barcelona, a club the 2026 overlay wrote over; Round 1576 put it back.
     d. /whats-new shows Round 1576's entry word for word, its link goes to
        /player-bingo, and the page does not scroll sideways (a screenshot).
   Controls (each must make the walk red, and print what it changed):
     PLAY_BINGO_CLUBS_CONTROL=wrongtile  tap a From <nation> square that is
                                         not England in both cases: the
                                         strike check red.
     PLAY_BINGO_CLUBS_CONTROL=base       PLAY_BINGO_BUILD is a dist built
                                         from BASE (692590145): the Morton tap
                                         strikes, red. Only part b is checked.
     PLAY_BINGO_CLUBS_CONTROL=base1571   PLAY_BINGO_BUILD is a dist built
                                         from Round 1571's closed head
                                         (32baab916): the window tap strikes,
                                         red. Only part c is checked.
   Exit 0 green, 1 red or a control that fired, 2 could not run.
   Run: CI=1 SIM_NETWORK=offline node scripts/playBingoClubRules.mjs (after a build) */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_BINGO_CLUBS_CONTROL || '';
const build = path.resolve(root, process.env.PLAY_BINGO_BUILD || 'dist');
const port = Number(process.env.PLAY_BINGO_PORT || 4198);
const base = 'http://127.0.0.1:' + port;
const out = process.env.RC_OUT || path.join(root, '.sim-artifacts', 'play-bingo-club-rules');
mkdirSync(out, { recursive: true });
const rows = JSON.parse(readFileSync(path.join(root, 'scripts/data/bingoPoolHistory-2026-10-29.json'), 'utf8')).rows;
const SECTION = [
  'Club squares',
  'Played for (a club), One-club man and Played for 4+ clubs count senior first teams only, and loans count. A club counts once however many times he went back. Youth, academy and B teams do not count.',
  'Example: Tyler Morton came through Liverpool, went on loan to Blackburn Rovers and then Hull City, and joined Lyon. That is four clubs, so he fits Played for 4+ clubs, and he is not a One-club man.',
  "Some players' early clubs and loans are still missing from our lists, so now and then the board can say no to a club he really played for. If it does, use Report a problem.",
];
const WINDOW_MAN = 'Marcus Rashford';
const WINDOW_TILE = 'Played for Barcelona';
const ENTRY_TITLE = "Player Bingo: last season's clubs are back for 13 players.";
const ENTRY_TEXT = `${ENTRY_TITLE} When players moved in 2026 we wrote their new club over the old one, and for some of them that wiped out where they played in 2025-26. We've now checked 23 of those players one by one, their whole careers on two sources, and put back the clubs they were missing, so Marcus Rashford now fits Played for Barcelona on the board.`;
const CASES = [
  { key: 'morton', man: 'Tyler Morton', tile: 'Played for 4+ clubs', seeds: 60, shot: 'morton-tap' },
  { key: 'window', man: WINDOW_MAN, tile: WINDOW_TILE, seeds: 200, shot: 'window-tap' },
].filter(c => (CONTROL === 'base' ? c.key === 'morton' : CONTROL === 'base1571' ? c.key === 'window' : true));
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* The page's PostgREST reads, answered as the server would (ties by id, 1,000 rows a response). */
function marketRead(url) {
  const q = url.searchParams;
  let list = [...rows];
  const inMatch = /^in\.\((.*)\)$/.exec(q.get('player_name') ?? '');
  if (q.has('player_name')) {
    if (!inMatch) throw new Error('unexpected player_name filter ' + q.get('player_name'));
    const names = new Set([...inMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)].map(m => (m[1] ?? m[2]).replace(/\\(.)/g, '$1')));
    list = list.filter(r => names.has(r.player_name));
  }
  const num = (key, op) => {
    const v = q.get(key);
    if (v == null) return;
    const [kind, ...rest] = v.split('.');
    const arg = rest.join('.');
    if (kind === 'gte') list = list.filter(r => r[key] != null && Number(r[key]) >= Number(arg));
    else if (kind === 'gt') list = list.filter(r => r[key] != null && Number(r[key]) > Number(arg));
    else if (kind === 'not' && arg === 'is.null') list = list.filter(r => r[key] != null);
    else throw new Error(`unexpected ${op} filter ${key}=${v}`);
  };
  num('year', 'year'); num('market_value_usd', 'value'); num('age', 'age');
  const orders = (q.get('order') || '').split(',').filter(Boolean).map(o => o.split('.'));
  list.sort((a, b) => {
    for (const [field, dir] of orders) {
      const d = (dir === 'desc' ? -1 : 1) * (Number(a[field]) - Number(b[field]));
      if (d) return d;
    }
    return a.id - b.id;
  });
  const offset = Number(q.get('offset') || 0);
  list = list.slice(offset, offset + Math.min(Number(q.get('limit') || 1000), 1000));
  const columns = (q.get('select') || '').split(',');
  return list.map(r => Object.fromEntries(columns.map(c => [c, r[c] ?? null])));
}

const cors = { 'access-control-allow-origin': base, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-expose-headers': 'content-range' };
const server = spawn(process.execPath, [path.join(root, 'scripts/lib/hostLikeServer.mjs'), build, String(port)], { cwd: root, windowsHide: true });
let serverLog = '';
server.stdout.on('data', b => { serverLog += b; });
server.stderr.on('data', b => { serverLog += b; });
let browser;
let controlFired = '';
try {
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = server.exitCode === null && await fetch(base + '/', { signal: AbortSignal.timeout(1000) }).then(r => r.ok, () => false);
    if (!ready) await new Promise(r => setTimeout(r, 150));
  }
  if (!ready) { console.error('COULD NOT RUN: the build is not served (' + serverLog.slice(0, 200) + ')'); process.exit(2); }
  browser = await pw.chromium.launch();
  const fixtureRoute = async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === base) return route.fallback();
    const table = url.pathname.match(/^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/)?.[1];
    if (/\.supabase\.co$/.test(url.hostname) && table && ['GET', 'OPTIONS'].includes(request.method())) {
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      const body = table === 'player_market_values' ? marketRead(url) : [];
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    }
    return route.abort();
  };
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    console.log(`viewport ${width}x${height}`);
    for (const c of CASES) {
    console.log(`  case ${c.key}: ${c.man} on ${c.tile}`);
    let found = null;
    for (let seed = 1; seed <= c.seeds && !found; seed++) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(s => {
        let state = s >>> 0;
        Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      }, seed);
      await context.route('**/*', fixtureRoute);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/player-bingo', { waitUntil: 'domcontentloaded' });
      await answerConsent(page);
      const play = page.getByRole('button', { name: "Let's Play!", exact: true });
      await play.waitFor({ timeout: 30000 });
      if (seed === 1 && c.key === 'morton' && CONTROL !== 'base') {
        const section = page.locator('section', { has: page.locator('h3', { hasText: 'Club squares' }) });
        const texts = (await section.locator('h3, p').allTextContents()).map(t => t.replace(/\s+/g, ' ').trim());
        if (JSON.stringify(texts) !== JSON.stringify(SECTION)) fail(`the Club squares section reads ${JSON.stringify(texts)}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) fail(`the page scrolls sideways by ${overflow} px with the ? open`);
        const box = await play.boundingBox();
        console.log(`   ? open: Club squares ${texts.length === SECTION.length ? 'present' : 'MISSING'}, sideways overflow ${overflow} px, Let's Play button ${Math.round(box?.height ?? 0)} px tall`);
        await section.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, `club-squares-${width}.png`) });
      }
      await play.click();
      const tiles = page.locator('div.grid-cols-5 > button[title]');
      await tiles.first().waitFor({ timeout: 30000 });
      const titles = await tiles.evaluateAll(list => list.map(b => b.getAttribute('title')));
      if (titles.includes(c.tile)) found = { context, page, seed, titles, errors };
      else await context.close();
    }
    if (!found) { fail(`no seed from 1 to ${c.seeds} dealt a board with ${c.tile} at ${width}`); continue; }
    const { context, page, seed, titles, errors } = found;
    const name = page.locator('div.text-2xl.font-bold');
    let skips = 0;
    while ((await name.textContent())?.trim() !== c.man && skips < 480) {
      await page.getByRole('button', { name: 'Skip player' }).click();
      skips += 1;
    }
    if ((await name.textContent())?.trim() !== c.man) { fail(`${c.man} was never dealt on seed ${seed} at ${width}`); await context.close(); continue; }
    let target = c.tile;
    if (CONTROL === 'wrongtile') {
      const other = titles.find(t => t.startsWith('From ') && t !== 'From England');
      if (other) { target = other; controlFired = `tapped ${other} for ${c.man}`; }
    }
    if (CONTROL === 'base') controlFired = 'the walk ran on a dist built from BASE';
    if (CONTROL === 'base1571') controlFired = 'the walk ran on a dist built from Round 1571\'s closed head';
    const strikes = () => page.locator('span[aria-label$="strikes used"]').getAttribute('aria-label');
    const before = { strikes: await strikes(), y: await page.evaluate(() => window.scrollY), h: await page.evaluate(() => document.documentElement.scrollHeight) };
    const tile = page.locator(`div.grid-cols-5 > button[title="${target}"]`);
    await tile.dispatchEvent('click');
    await page.waitForTimeout(600);
    const after = { strikes: await strikes(), y: await page.evaluate(() => window.scrollY), h: await page.evaluate(() => document.documentElement.scrollHeight) };
    const lockedText = (await tile.textContent()) ?? '';
    console.log(`   seed ${seed}: ${c.man} dealt after ${skips} skips; tapped ${target}; strikes ${before.strikes} -> ${after.strikes}; tile reads "${lockedText.replace(/\s+/g, ' ').trim()}"; scrollY ${before.y} -> ${after.y}; height ${before.h} -> ${after.h}`);
    if (after.strikes !== before.strikes) fail(`the tap on ${target} cost a strike at ${width}`);
    if (!lockedText.includes(c.man)) fail(`${target} did not lock with ${c.man} at ${width}`);
    if (after.y !== before.y || after.h !== before.h) fail(`the page moved on the tap at ${width}`);
    if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.screenshot({ path: path.join(out, `${c.shot}-${width}.png`) });
    await context.close();
    }
    if (CONTROL === 'base' || CONTROL === 'base1571') continue;
    /* d. Round 1576's What's New entry, word for word. */
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/*', fixtureRoute);
    const page = await context.newPage();
    await page.goto(base + '/whats-new', { waitUntil: 'domcontentloaded' });
    await answerConsent(page);
    const item = page.locator('li', { has: page.locator('strong', { hasText: ENTRY_TITLE }) });
    await item.first().waitFor({ timeout: 30000 }).catch(() => {});
    const count = await item.count();
    const text = count ? (await item.first().textContent()).replace(/\s+/g, ' ').trim() : '';
    const href = count ? await item.first().locator('a', { hasText: 'the board' }).getAttribute('href') : null;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`  part d: ${count} entry titled "${ENTRY_TITLE}", text ${text === ENTRY_TEXT ? 'word for word' : 'DIFFERENT'}, link ${href}, sideways overflow ${overflow} px`);
    if (count !== 1) fail(`/whats-new holds ${count} entries titled "${ENTRY_TITLE}" at ${width}`);
    else if (text !== ENTRY_TEXT) fail(`the entry reads "${text}" at ${width}`);
    if (href !== '/player-bingo') fail(`the entry's link goes to ${href} at ${width}`);
    if (overflow > 0) fail(`/whats-new scrolls sideways by ${overflow} px at ${width}`);
    if (count) await item.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `whats-new-${width}.png`) });
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
if (CONTROL) {
  if (!controlFired) { console.log(`playBingoClubRules: CONTROL=${CONTROL} DID NOT FIRE (it changed nothing)`); process.exit(2); }
  console.log(failures ? `playBingoClubRules: CONTROL=${CONTROL} FIRED (${controlFired}; ${failures} failures)` : `playBingoClubRules: CONTROL=${CONTROL} changed something (${controlFired}) but nothing went red`);
  process.exit(failures ? 1 : 3);
}
console.log(failures ? `playBingoClubRules: RED, ${failures} failures` : 'playBingoClubRules: GREEN, both viewports held');
process.exit(failures ? 1 : 0);
