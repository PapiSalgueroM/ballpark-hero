/**
 * Round 1104 browser walk: NFL My Career tells the truth, on the page.
 *
 * simNflTruth and simUsCareerBank prove the engine. This proves the same
 * rules reach a person through the real board, at 390 by 844 and 1280 by 900:
 *   1  A 2005 throwback kicker, quick start: the draft card shows round four
 *      or later (pick 97 on) or an undrafted signing, the hub's contract chip
 *      is the salary the save holds and it is slot money (under $1M a year in
 *      2005 money, where the old rule could hand a kicker first pick money),
 *      and the played seasons are never longer than 16 games, with every one
 *      the season curtain did not call hurt exactly 16 (the walk plays on,
 *      seven seasons at the most, until it has seen one).
 *   2  The bank on load. A played save (it carries the summer marker) sitting
 *      at -0.4M opens on a Bank tile of $0M, and opening it again changes
 *      nothing. The same save with no marker (one last opened before the
 *      summers existed) is rebuilt the way Round 422 promised: $4.2M.
 *   3  An edge rusher in today's league: every sack total on a played season
 *      is a whole or a half, and every season the curtain called neither
 *      hurt nor a bench year is exactly 17 games.
 *   4  No sideways scroll on the hub at either width, and no page error.
 *
 * Assertions read the save the board wrote (the engine's own words) and the
 * text a person sees, never a number this file computed for itself.
 *
 * NOT WALKED HERE: the Rams, Chargers and Raiders moving. The franchise
 * ledger shipped as data only in this round, so there is no screen to walk.
 *
 * The live database is never reached: the host is blocked before any page
 * opens. Serve a fresh dist with scripts/lib/hostLikeServer.mjs, then
 *      ENGINES=chromium node scripts/playNflTruth.mjs
 * (runAllSims files it as a browser harness, it imports playwright.)
 *
 * NEGATIVE CONTROL: NFL_TRUTH_WALK_CONTROL=seventeen rewrites the season
 * length ledger in the served code so 2005 to 2020 read 17 games again. The
 * two schedule checks of section 1 must then fail and nothing else may, and
 * the run refuses to count if the rewrite matched nothing.
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const KEY = 'nfl-my-career-save-v1';
const CONTROL = process.env.NFL_TRUTH_WALK_CONTROL || '';
if (CONTROL && CONTROL !== 'seventeen') {
  console.error(`NFL_TRUTH_WALK_CONTROL=${CONTROL} is not a control this harness knows (seventeen)`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
const errors = [];
const browser = await chromium.launch();

/** A clean visitor at one width: nothing saved, the database host blocked, the rules gate already seen. */
async function open(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route(/supabase\.co/, r => r.abort());
  if (CONTROL) {
    await installServedCodeControl(context, [
      { label: 'ledger2005', find: /from:2005,to:2020,games:16/g, replace: 'from:2005,to:2020,games:17' },
    ], proof);
  }
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
  return { context, page };
}

const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const bodyText = page => page.locator('body').innerText();

/** The create screen, filled the way a person fills it, then the quick start. */
async function quickStart(page, { throwback, pos, name }) {
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill(name);
  if (throwback) await page.locator('button:has-text("2005 throwback")').first().click();
  await page.locator('button', { hasText: new RegExp(`^${pos}$`) }).first().click();
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1000);
}

/** A career that lasts the walk: a late pick can be cut after a year (rated 64 or under is retired), and this
    walk is about schedules and stat lines, not about making the roster. Nothing here touches pay, the pick, the
    year or the era. */
async function steady(page, { ovr = 80, pot = 88 } = {}) {
  await page.evaluate(([k, o, p]) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.c.ovr = o; s.c.pot = p; s.c.role = 'starter'; s.c.health = 100; s.c.contractYears = 9;
    localStorage.setItem(k, JSON.stringify(s));
  }, [KEY, ovr, pot]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

/* WHY THE WALK READS THE CURTAIN (the fix pass of 2026-10-08). The first cut asserted "some season of three is
   a full one" on the bare games column, and it went red on 2 of 6 plain runs of an unchanged head: every season
   press runs the camp battle first, a starter rated more than 5 under the man the club brought in is benched,
   and a bench year is 8 to 10 games. A season is also cut short by an injury. Neither is on the saved season
   line, but the engine SAYS both on the season curtain, in its own words, so the walk reads them there and
   holds the schedule only on the seasons the engine itself called neither. */
const HURT = /Missed \d+ games? hurt/;
const BENCH = /A backup season:/;
const BANNED = /suspended list/;
/** What the engine said about the season just played: the curtain's whole text, or null when no curtain is up. */
async function curtainText(page) {
  const el = page.locator('[data-season-reveal]');
  if (!(await el.count())) return null;
  return (await el.first().textContent()) ?? '';
}
const cutShort = t => (t == null ? 'no curtain' : HURT.test(t) ? 'hurt' : BENCH.test(t) ? 'bench' : BANNED.test(t) ? 'banned' : '');
/** The seasons the engine called neither hurt, nor a bench year, nor a ban, by the curtain that came with each. */
const fullSeasons = (lines, told) => lines.filter((_, i) => cutShort(told[i]) === '');
const tellOf = (lines, told) => lines.map((s, i) => `${s.games}${cutShort(told[i]) ? ` ${cutShort(told[i])}` : ''}`).join(', ');

/** Play `n` seasons and answer whatever comes between them, the way playCareerPress does. The board saves
    inside the press, so the walk returns on the n-th press and never has to finish that summer. `told` gains
    the curtain's text for every season pressed here, in order. */
async function playSeasons(page, n, told = []) {
  const between = [
    '[data-season-reveal] button:has-text("Continue")',
    '[data-rivalry-event] button:has-text("Continue")',
    '[data-rivalry-choice] button:has-text("Continue")',
    '[data-rivalry-option]',
    '[data-decision-continue]',
    '[data-extension-talk] button:has-text("year out")',
    'button:has-text("One more year")',
    '[data-career-decision-option]',
  ];
  let played = 0;
  for (let step = 0; step < 140; step += 1) {
    let clicked = false;
    for (const sel of between) {
      const el = page.locator(sel);
      if (await el.count()) { await el.first().click(); await page.waitForTimeout(600); clicked = true; break; }
    }
    if (clicked) continue;
    /* The season button by its whole label: the extension talk has a "Play the year out" of its own. */
    const play = page.locator('button', { hasText: /Play the \d{4} season/ });
    if (await play.count()) {
      played += 1;
      await play.first().click();
      await page.waitForTimeout(1000);
      /* Filed under the season line this press wrote, so a press that opened a contract talk and played
         nothing can never shift the curtains against the seasons. */
      const now = ((await readSave(page))?.c?.seasons ?? []).length;
      if (now > 0 && told[now - 1] === undefined) told[now - 1] = await curtainText(page);
      if (played >= n) return played;
      continue;
    }
    /* Some other crossroads is up: answer its first option and play on. */
    const opt = page.locator('div.grid.gap-1\\.5 > button').first();
    if (await opt.count()) await opt.click();
    await page.waitForTimeout(600);
  }
  console.log(`  (the walk stopped after ${played} of ${n} seasons on a screen it does not know: ${(await bodyText(page)).replace(/\s+/g, ' ').slice(0, 220)})`);
  return played;
}

/** Three seasons, then one more at a time (seven at the most) until the engine has called one of them a full
    year. An unlucky run of injuries costs the walk a few more presses and never its verdict. */
async function playToAFullSeason(page, told, most = 7) {
  let played = await playSeasons(page, 3, told);
  while (played >= 3 && played < most) {
    const lines = (await readSave(page))?.c?.seasons ?? [];
    if (lines.length !== played || fullSeasons(lines, told).length) break;
    const more = await playSeasons(page, 1, told);
    if (!more) break;
    played += more;
  }
  return played;
}

const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
/** The Bank tile's value as the hub prints it ("$0M", "$4.2M", "-$0.4M"), or null when the tile is not there. */
async function bankTile(page) {
  const hub = page.locator('[data-career-hub-buttons]');
  if (!(await hub.count())) return null;
  /* The tile prints its title, then its value. The title is upper cased by
     CSS and innerText reads it that way, so the match ignores case. A debt
     is written "-$0.4M", minus first. */
  const m = (await hub.first().innerText()).match(/the bank\s*(-?\$[0-9.]+M)/i);
  return m ? m[1] : null;
}

const WIDTHS = [[390, 844], [1280, 900]];

for (const [w, h] of WIDTHS) {
  console.log(`1) a 2005 throwback kicker, quick start, at ${w} by ${h}`);
  const { context, page } = await open(w, h);
  await quickStart(page, { throwback: true, pos: 'K', name: 'Toe Probe' });
  const first = await readSave(page);
  const c0 = first?.c;
  say(!!c0 && c0.pos === 'K' && c0.eraId === 'y2005', `the save is a throwback kicker (${c0 ? `${c0.pos}, ${c0.eraId}, pick ${c0.draftPick}, $${c0.salary}M a year` : 'no save'})`);
  if (c0) {
    const text = await bodyText(page);
    const shown = text.match(/With pick (\d+)/);
    say(c0.draftPick === 0 || c0.draftPick >= 97, `no kicker goes before round four: pick ${c0.draftPick}`);
    say(c0.draftPick === 0 ? text.includes('undrafted signing') : !!shown && Number(shown[1]) === c0.draftPick,
      `the draft card names the pick the save holds (${shown ? `pick ${shown[1]}` : c0.draftPick === 0 ? 'undrafted' : 'no pick line on the page'})`);
    say(text.includes(`$${c0.salary}M x4`), `the hub's contract chip reads $${c0.salary}M x4`);
    say(c0.salary > 0 && c0.salary < 1, `a late pick is paid slot money in 2005 dollars: $${c0.salary}M a year`);
    say(await noSideScroll(page), `no sideways scroll on the hub at ${w} wide`);
    await steady(page);
    const told = [];
    const played = await playToAFullSeason(page, told);
    const lines = (await readSave(page))?.c?.seasons ?? [];
    const games = lines.map(s => s.games);
    const full = fullSeasons(lines, told);
    say(played >= 3 && lines.length === played, `three seasons or more were played (${played} presses, ${lines.length} season lines: ${lines.map(s => s.year).join(', ')})`);
    say(games.length > 0 && games.every(g => g <= 16), `no throwback season is longer than 16 games (${games.join(', ')})`, true);
    say(full.length > 0 && full.every(s => s.games === 16), `every throwback season the engine did not call hurt is exactly 16 games, and there is one (${tellOf(lines, told)})`, true);
  }
  await context.close();
}

for (const [w, h] of WIDTHS) {
  console.log(`2) the bank on load, at ${w} by ${h}`);
  const { context, page } = await open(w, h);
  await quickStart(page, { throwback: false, pos: 'QB', name: 'Bank Probe' });
  const doctor = marker => page.evaluate(([k, withMarker]) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.c.netWorth = -0.4; s.c.earnings = 9.4; s.c.purchased = []; s.c.yearlyCosts = 0;
    delete s.c.money; delete s.c.eventLastFired; delete s.c.summerSalt; delete s.c.summer;
    if (withMarker) s.c.eventLastFired = { walk_card: s.c.year };
    localStorage.setItem(k, JSON.stringify(s));
  }, [KEY, marker]);
  const reopen = async () => { await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200); return bankTile(page); };
  await doctor(true);
  const once = await reopen();
  say(once === '$0M', `a played save at -0.4M opens on a Bank tile of $0M (it reads ${once})`);
  const twice = await reopen();
  say(twice === '$0M', `opening it again changes nothing (it reads ${twice})`);
  await doctor(false);
  const old = await reopen();
  say(old === '$4.2M', `the same save with no summer marker is rebuilt the Round 422 way, $4.2M (it reads ${old})`);
  say(await noSideScroll(page), `no sideways scroll on the hub at ${w} wide`);
  await context.close();
}

for (const [w, h] of WIDTHS) {
  console.log(`3) an edge rusher today, at ${w} by ${h}`);
  const { context, page } = await open(w, h);
  await quickStart(page, { throwback: false, pos: 'EDGE', name: 'Edge Probe' });
  /* Rated 94: the man a club brings to camp is rated at most one over the club (a club is 94 at the most,
     so 95), and a starter is benched only when he is more than 5 under that man, so this one keeps his job. The
     curtain is read all the same, and a bench year would be set aside like a hurt one, not read as a full one. */
  await steady(page, { ovr: 94, pot: 97 });
  const told = [];
  const played = await playToAFullSeason(page, told);
  const lines = (await readSave(page))?.c?.seasons ?? [];
  const sacks = lines.map(s => s.sacks);
  const full = fullSeasons(lines, told);
  say(played >= 3 && lines.length === played, `three seasons or more were played (${played} presses, ${lines.length} season lines)`);
  say(lines.length > 0 && lines.every(s => s.games <= 17), `no season today is longer than 17 games (${lines.map(s => s.games).join(', ')})`);
  say(full.length > 0 && full.every(s => s.games === 17), `every season today the engine did not call hurt or a bench year is exactly 17 games, and there is one (${tellOf(lines, told)})`);
  say(sacks.length > 0 && sacks.every(v => typeof v === 'number' && Number.isInteger(v * 2)), `every sack total is a whole or a half (${sacks.join(', ')})`);
  say(sacks.some(v => v > 0), 'and at least one season had a sack, so the check read something');
  await context.close();
}

console.log('4) the page itself');
/* The blocked database host can surface as a failed fetch; that one is the walk's own doing. */
const real = errors.filter(e => !/Failed to fetch|NetworkError|Load failed/i.test(e));
say(real.length === 0, `no page errors on the walk (${real.length ? real[0] : 'clean'}; ${errors.length - real.length} blocked request errors set aside)`);

await browser.close();
const code = verdict('playNflTruth', CONTROL ? proof : null, { minGuarded: 4 });
if (code || CONTROL) process.exit(code);
console.log('\nplayNflTruth: green. A kicker goes late and is paid his slot, throwback seasons are 16 games, the bank stops at zero on load, and sacks come in halves.');
