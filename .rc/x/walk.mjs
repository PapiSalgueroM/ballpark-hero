/* Reviewer's browser walk for Round 1226: the MLB and NHL careers, played the
   way a player plays them, at 390x844 and 1280x900, reduced motion on and off.
   Reads BASE; writes screenshots and walk.json into RC_OUT. Seeds base made
   saves from .rc/x/base-save-*.json (written by probe2 on the base engine). */
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? './walk-out';
mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(new URL(import.meta.url).pathname);
const seedOf = name => { const f = path.join(HERE, `base-save-${name}.json`); return existsSync(f) ? readFileSync(f, 'utf8') : null; };

let checks = 0; let failures = 0; const report = [];
const say = (ok, what) => { checks += 1; if (!ok) failures += 1; console.log((ok ? '  PASS  ' : '  FAIL  ') + what); report.push({ ok, what }); };
const note = what => { console.log(`  NOTE  ${what}`); report.push({ note: what }); };

const KEYS = { nhl: 'nhl-my-career-save-v1', mlb: 'mlb-my-career-save-v1' };
const ROUTES = { nhl: '/nhl-my-career', mlb: '/mlb-my-career' };
const OWN = { nhl: 82, mlb: 162 };

const browser = await chromium.launch();

async function open(profile, sport, seed) {
  const context = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, reducedMotion: profile.rm, deviceScaleFactor: 1 });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.addInitScript(([route, key, value]) => {
    localStorage.setItem(`rules-gate-seen:${route}`, '1');
    if (value && !localStorage.getItem('r1226-seeded')) { localStorage.setItem(key, value); localStorage.setItem('r1226-seeded', '1'); }
  }, [ROUTES[sport], KEYS[sport], seed]);
  await page.goto(`${BASE}${ROUTES[sport]}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  /* The consent strip covers the foot of every shot: take the private choice, as a careful visitor would. */
  const essential = page.getByRole('button', { name: 'Essential only' });
  if (await essential.count()) { await essential.first().click(); await page.waitForTimeout(400); }
  return { context, page, errors };
}
const tag = p => `${p.w}${p.rm === 'reduce' ? '-rm' : ''}`;
async function shot(page, name, full = false) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  say(wide <= 2, `${name}: no sideways scroll (the page is ${wide} px wider than the window)`);
}
const saveOf = (page, sport) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), KEYS[sport]);
const patch = (page, sport, fields, tq) => page.evaluate(([k, f, q]) => { const s = JSON.parse(localStorage.getItem(k)); Object.assign(s.c, f); if (q !== null) s.teamQuality = q; localStorage.setItem(k, JSON.stringify(s)); }, [KEYS[sport], fields, tq ?? null]);

async function finishOffseason(page) {
  for (let i = 0; i < 16; i += 1) {
    const cont = page.locator('[data-decision-continue]');
    if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(450); continue; }
    const opt = page.locator('[data-career-decision-option]');
    if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(450); continue; }
    const riv = page.locator('[data-rivalry-event] button:has-text("Continue")');
    if (await riv.count()) { await riv.click(); await page.waitForTimeout(600); continue; }
    const choice = page.locator('[data-rivalry-choice]');
    if (await choice.count()) {
      const o = choice.locator('[data-rivalry-option]'); if (await o.count()) { await o.first().click(); await page.waitForTimeout(500); }
      const c = page.locator('[data-rivalry-choice] button:has-text("Continue")'); if (await c.count()) { await c.click(); await page.waitForTimeout(600); }
      continue;
    }
    const fa = page.locator('[data-fa-window] button:has-text("Sign")');
    if (await fa.count()) { await fa.first().click(); await page.waitForTimeout(800); continue; }
    if (await page.locator('button:has-text("Play the")').count()) return true;
    /* The retirement talk of an older player ("Is it time?"): one more year. */
    const more = page.locator('button:has-text("One more year")');
    if (await more.count()) { await more.first().click(); await page.waitForTimeout(700); continue; }
    const any = page.locator('main button:has-text("Continue")');
    if (await any.count()) { await any.first().click(); await page.waitForTimeout(500); continue; }
    await page.waitForTimeout(400);
  }
  return await page.locator('button:has-text("Play the")').count() > 0;
}
/* Play one season from the hub. Returns the reveal's words and the line the save now ends on. */
async function playOne(page, sport, name) {
  if (!(await finishOffseason(page))) {
    const words = (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    say(false, `${name}: the hub's Play button is not on screen. Words: ${words}`);
    await page.screenshot({ path: path.join(OUT, `${name}-STUCK.png`) });
    return null;
  }
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(1100);
  const reveal = page.locator('[data-season-reveal]');
  /* An expired deal opens the market, not a season: sign the first offer and press Play again. */
  for (let i = 0; i < 3 && !(await reveal.count()); i += 1) {
    const fa = page.locator('[data-fa-window] button:has-text("Sign")');
    if (!(await fa.count())) { await page.waitForTimeout(900); continue; }
    note(`${name}: the deal had run out, the market opened; signed the first offer`);
    await page.screenshot({ path: path.join(OUT, `${name}-market.png`) });
    await fa.first().click(); await page.waitForTimeout(900);
    if (!(await finishOffseason(page))) break;
    await page.locator('button:has-text("Play the")').first().click();
    await page.waitForTimeout(1100);
  }
  const up = await reveal.count() === 1;
  /* The card is staged: wait for its Continue so the shot and the words hold every line. */
  if (up) await reveal.locator('button:has-text("Continue")').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
  const words = up ? (await reveal.innerText()).replace(/\s+/g, ' ') : '';
  const s = await saveOf(page, sport);
  const line = s?.c?.seasons?.[s.c.seasons.length - 1] ?? null;
  return { up, words, line, save: s, reveal };
}
async function closeReveal(page) {
  const c = page.locator('[data-season-reveal] button:has-text("Continue")');
  if (await c.count()) { await c.click(); await page.waitForTimeout(700); }
}
/* Open the Career Log, the tile of season `index`, read its games; leaves the review open. */
async function reviewGames(page, index, name, pickerShot) {
  const opener = page.getByRole('button', { name: /Career Log/ });
  if (!(await opener.count())) { note(`${name}: no Career Log button on this screen`); return null; }
  await opener.first().click(); await page.waitForTimeout(900);
  const tile = page.locator(`[data-season-tile="${index}"]`);
  if (!(await tile.count())) { note(`${name}: no tile for season ${index}`); return null; }
  if (pickerShot) { await tile.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(OUT, `${pickerShot}.png`) }); note(`${name}: the Career Log tiles read: ${(await page.locator('[data-season-tile]').allInnerTexts()).map(t => t.replace(/\s+/g, ' ')).slice(-4).join(' || ').slice(0, 420)}`); }
  await tile.click(); await page.waitForTimeout(900);
  const games = await page.locator('[data-season-games]').first().innerText().catch(() => null);
  return games;
}
async function backToHub(page) {
  for (let i = 0; i < 5; i += 1) {
    if (await page.locator('button:has-text("Play the")').count()) return true;
    /* Never the site's own "Back" at the top of the page: that one leaves the game. */
    const seasons = page.getByRole('button', { name: 'Back to seasons' });
    if (await seasons.count()) { await seasons.first().click(); await page.waitForTimeout(600); continue; }
    const b = page.getByRole('button', { name: 'Back to career' });
    if (await b.count()) { await b.first().click(); await page.waitForTimeout(600); continue; }
    break;
  }
  return await page.locator('button:has-text("Play the")').count() > 0;
}
const lineBits = l => (l ? `${l.year} ${l.team}: ${l.games} games, slate ${l.slate ?? 'none'}, ${l.teamResult}${l.poGames !== undefined ? `, October ${l.poGames} games "${l.poLine}"` : ''}` : 'no line');

/* SCENE A: a new present day career through the real create screen. */
async function sceneNew(profile, sport) {
  const name = `${sport}-new-${tag(profile)}`;
  console.log(`== ${name}`);
  const { context, page, errors } = await open(profile, sport, null);
  try {
    await page.locator('input[placeholder*="name"]').first().fill('Slate Walker');
    await page.locator('button:has-text("Enter the draft")').click();
    await page.waitForTimeout(1200);
    await finishOffseason(page);
    await shot(page, `${name}-1-hub`);
    const r = await playOne(page, sport, name);
    if (!r) return;
    say(r.up, `${name}: the season reveal is up after Play`);
    await shot(page, `${name}-2-reveal`);
    note(`${name}: reveal says: ${r.words.slice(0, 420)}`);
    note(`${name}: saved line: ${lineBits(r.line)}`);
    if (sport === 'nhl') {
      say(r.line && r.line.slate === 84, `${name}: a new 2026-27 NHL line carries slate 84 (it carries ${r.line?.slate})`);
      say(r.line && r.line.games <= 84, `${name}: the line holds ${r.line?.games} games, no more than 84`);
    } else {
      const ok = r.line && (r.line.slate === undefined || r.line.slate === 161);
      say(ok, `${name}: a new 2026 MLB line carries no slate, or 161 for the Orioles and the Yankees (team ${r.line?.team}, slate ${r.line?.slate})`);
      say(r.line && r.line.games <= (r.line.slate ?? 162), `${name}: the line holds ${r.line?.games} games, no more than its season`);
    }
    /* The reveal is transient: reload in the middle of it and the season is already a saved line. */
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    const after = await saveOf(page, sport);
    say(JSON.stringify(after.c.seasons) === JSON.stringify(r.save.c.seasons), `${name}: a reload with the reveal open leaves the saved line as it was`);
    await finishOffseason(page);
    const games = await reviewGames(page, 0, name);
    await shot(page, `${name}-3-review`);
    say(games !== null && Number(games) === r.line.games, `${name}: the season review prints ${games} games, the saved line holds ${r.line.games}`);
    say(errors.length === 0, `${name}: no page errors (${errors[0] ?? 'clean'})`);
  } catch (e) { say(false, `${name}: the scene threw: ${String(e).slice(0, 240)}`); await page.screenshot({ path: path.join(OUT, `${name}-THREW.png`) }).catch(() => {}); }
  finally { await context.close(); }
}

/* SCENE B: a save made by the base engine, loaded on this build and played on. */
async function sceneOld(profile, sport, seedName, expectSlate, expectGamesMax) {
  const name = `${sport}-old-${seedName}-${tag(profile)}`;
  console.log(`== ${name}`);
  const seed = seedOf(seedName);
  if (!seed) { say(false, `${name}: no base made save base-save-${seedName}.json was sent`); return; }
  const before = JSON.parse(seed);
  const { context, page, errors } = await open(profile, sport, seed);
  try {
    const hubUp = await finishOffseason(page);
    say(hubUp, `${name}: the old save opens on the hub`);
    await shot(page, `${name}-1-hub`);
    const loaded = await saveOf(page, sport);
    say(JSON.stringify(loaded.c.seasons) === JSON.stringify(before.c.seasons), `${name}: loading did not touch the ${before.c.seasons.length} saved lines`);
    const lastIdx = before.c.seasons.length - 1;
    const oldGames = await reviewGames(page, lastIdx, name);
    await shot(page, `${name}-2-old-review`);
    say(oldGames !== null && Number(oldGames) === before.c.seasons[lastIdx].games, `${name}: the review of the old ${before.c.seasons[lastIdx].year} season prints ${oldGames} games, the save holds ${before.c.seasons[lastIdx].games}`);
    await backToHub(page);
    const r = await playOne(page, sport, name);
    if (!r) return;
    await shot(page, `${name}-3-next-reveal`);
    note(`${name}: reveal says: ${r.words.slice(0, 420)}`);
    note(`${name}: new line: ${lineBits(r.line)}`);
    const kept = JSON.stringify(r.save.c.seasons.slice(0, before.c.seasons.length)) === JSON.stringify(before.c.seasons);
    say(kept, `${name}: after playing on, the ${before.c.seasons.length} old lines are byte for byte what the base engine saved`);
    say(r.save.c.seasons.length === before.c.seasons.length + 1, `${name}: one new line was added`);
    if (expectSlate !== null) say(expectSlate.includes(r.line?.slate), `${name}: the new ${r.line?.year} line carries slate ${r.line?.slate} (expected one of ${expectSlate.join(', ')})`);
    say(r.line && r.line.games <= expectGamesMax, `${name}: the new line holds ${r.line?.games} games, no more than ${expectGamesMax}`);
    const cost = /cost [^.]*? (\d+) games/i.exec(r.words);
    if (cost) say(Number(cost[1]) <= expectGamesMax, `${name}: the reveal says an injury cost ${cost[1]} games in a season of at most ${expectGamesMax}`);
    await closeReveal(page);
    await finishOffseason(page);
    const newGames = await reviewGames(page, before.c.seasons.length, name, `${name}-4a-log`);
    await shot(page, `${name}-4-new-review`);
    say(newGames !== null && Number(newGames) === r.line.games, `${name}: the review of the new season prints ${newGames} games, the save holds ${r.line.games}`);
    await backToHub(page);
    await shot(page, `${name}-5-hub-after`, true);
    say(errors.length === 0, `${name}: no page errors (${errors[0] ?? 'clean'})`);
  } catch (e) { say(false, `${name}: the scene threw: ${String(e).slice(0, 240)}`); await page.screenshot({ path: path.join(OUT, `${name}-THREW.png`) }).catch(() => {}); }
  finally { await context.close(); }
}

/* SCENE C: an October. A base made save, the player made strong on a strong club, played until October comes. */
async function sceneOctober(profile, seedName, wantNoWildCard, wildCardGame) {
  const name = `mlb-october-${seedName}-${tag(profile)}`;
  console.log(`== ${name}`);
  const seed = seedOf(seedName);
  if (!seed) { say(false, `${name}: no base made save base-save-${seedName}.json was sent`); return; }
  const s0 = JSON.parse(seed); const year = s0.c.year;
  s0.c.ovr = 96; s0.c.pot = Math.max(s0.c.pot ?? 96, 96); s0.c.health = 100; s0.c.contractYears = 9; s0.c.role = 'starter'; s0.teamQuality = 96;
  const { context, page, errors } = await open(profile, 'mlb', JSON.stringify(s0));
  try {
    let got = null; const seen = [];
    for (let n = 0; n < 9 && !got; n += 1) {
      /* The same year again each time, so the October of that year is the one that comes. */
      if (n > 0) { await closeReveal(page); await finishOffseason(page); await patch(page, 'mlb', { year, ovr: 96, health: 100, contractYears: 9, age: s0.c.age, retired: false, suspendedSeasons: 0 }, 96); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1100); }
      const r = await playOne(page, 'mlb', name);
      if (!r) return;
      seen.push(`${r.line?.teamResult}${r.line?.poGames !== undefined ? ` (${r.line.poGames})` : ''}`);
      if (r.line && r.line.year === year && r.line.poLine) got = r;
    }
    note(`${name}: results of the ${year} seasons played: ${seen.join(' | ')}`);
    if (wantNoWildCard) say(!seen.some(x => /Wild Card/i.test(x)), `${name}: no ${year} season ended in a wild card round`);
    if (!got) { note(`${name}: nine ${year} seasons and no October with a line; nothing to read`); return; }
    await shot(page, `${name}-1-reveal`);
    note(`${name}: reveal says: ${got.words.slice(0, 520)}`);
    note(`${name}: line: ${lineBits(got.line)}`);
    const m = /^(\d+) for (\d+) \((\.\d{3})\), (\d+) HR$/.exec(got.line.poLine);
    say(!!m, `${name}: the October line of a hitter has the shape "H for AB (.xxx), N HR": "${got.line.poLine}"`);
    if (m) {
      const want = `.${String(Math.round(1000 * Number(m[1]) / Number(m[2]))).padStart(3, '0')}`;
      say(m[3] === want, `${name}: ${m[1]} for ${m[2]} is ${want}, the card prints ${m[3]}`);
      say(Number(m[4]) <= Number(m[1]), `${name}: ${m[4]} home runs inside ${m[1]} hits`);
      say(got.words.includes(got.line.poLine), `${name}: the reveal shows the saved October line`);
    }
    if (wildCardGame && /Wild Card Game/.test(got.line.teamResult)) say(got.line.poGames === 1, `${name}: a lost Wild Card Game is one game (${got.line.poGames})`);
    await closeReveal(page); await finishOffseason(page);
    const sv = await saveOf(page, 'mlb');
    await reviewGames(page, sv.c.seasons.length - 1, name);
    const tab = page.locator('[data-season-tab]');
    const tabs = await tab.allInnerTexts();
    const post = tab.filter({ hasText: /Post/i });
    if (await post.count()) { await post.first().click(); await page.waitForTimeout(600); }
    await shot(page, `${name}-2-review-postseason`);
    note(`${name}: review tabs: ${tabs.join(' | ')}; review says: ${(await page.locator('[data-career-season-review]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)}`);
    say(errors.length === 0, `${name}: no page errors (${errors[0] ?? 'clean'})`);
  } catch (e) { say(false, `${name}: the scene threw: ${String(e).slice(0, 240)}`); await page.screenshot({ path: path.join(OUT, `${name}-THREW.png`) }).catch(() => {}); }
  finally { await context.close(); }
}

/* SCENE D: What's New says it, and fits. */
async function sceneWhatsNew(profile) {
  const name = `whatsnew-${tag(profile)}`;
  console.log(`== ${name}`);
  const context = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, reducedMotion: profile.rm, deviceScaleFactor: 1 });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    const li = page.locator('li', { hasText: 'the season is as long as the real one' }).first();
    say(await li.count() === 1, `${name}: the entry is on the page`);
    await li.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await shot(page, `${name}`);
    const text = (await li.innerText()).replace(/\s+/g, ' ');
    note(`${name}: ${text}`);
    say(![String.fromCharCode(0x2013), String.fromCharCode(0x2014)].some(d => text.includes(d)), `${name}: no dash of either kind in the entry`);
  } catch (e) { say(false, `${name}: the scene threw: ${String(e).slice(0, 240)}`); }
  finally { await context.close(); }
}

const P = { phone: { w: 390, h: 844, rm: 'no-preference' }, phoneRm: { w: 390, h: 844, rm: 'reduce' }, desk: { w: 1280, h: 900, rm: 'no-preference' }, deskRm: { w: 1280, h: 900, rm: 'reduce' } };
const ONLY = process.env.WALK_ONLY ? process.env.WALK_ONLY.split(',') : null;
const run = async (id, f) => { if (!ONLY || ONLY.includes(id)) await f(); };
await run('new', async () => { for (const p of [P.phone, P.deskRm]) { await sceneNew(p, 'nhl'); await sceneNew(p, 'mlb'); } });
await run('old', async () => {
  for (const p of [P.phone, P.phoneRm, P.desk, P.deskRm]) await sceneOld(p, 'nhl', 'nhl', [84], 84);
  for (const p of [P.phone, P.desk]) await sceneOld(p, 'mlb', 'mlb', [undefined, 161], 162);
  for (const p of [P.phone, P.deskRm]) await sceneOld(p, 'nhl', 'nhl-2012', [48], 48);
  for (const p of [P.phone, P.deskRm]) await sceneOld(p, 'mlb', 'mlb-2020', [60, 58], 60);
});
await run('october', async () => {
  await sceneOctober(P.phone, 'mlb', false, false);
  await sceneOctober(P.desk, 'mlb-2008', true, false);
  await sceneOctober(P.phoneRm, 'mlb-2015', false, true);
});
await run('whatsnew', async () => { for (const p of [P.phone, P.desk]) await sceneWhatsNew(p); });
await browser.close();
writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1));
console.log(failures ? `walk1226: RED, ${failures} of ${checks} checks failed` : `walk1226: green, ${checks} checks`);
process.exit(failures ? 1 : 0);
