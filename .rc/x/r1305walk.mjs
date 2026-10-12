/* REVIEWER'S WALK for Round 1305 (never committed). Run on a runner with #!serve and #!playwright:
     walk: node .rc/x/r1305walk.mjs
   It plays the NFL front office the way a player would, at 390x844 and 1280x900, with reduced motion off and on,
   blocks supabase.co, and saves screenshots and walk.json into $RC_OUT. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
let failures = 0;
const report = { runs: {} };
const say = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`); if (!ok) failures += 1; return ok; };
const note = msg => console.log(`note  ${msg}`);

const RUNS = [
  { id: 'p390', width: 390, height: 844, reduced: false, full: true },
  { id: 'd1280', width: 1280, height: 900, reduced: false, full: true },
  { id: 'p390r', width: 390, height: 844, reduced: true, full: false },
  { id: 'd1280r', width: 1280, height: 900, reduced: true, full: false },
];

const browser = await chromium.launch();

async function readSave(page) {
  const raw = await page.evaluate(k => localStorage.getItem(k), KEY);
  return raw ? JSON.parse(raw) : null;
}
async function gridRows(page) {
  return page.evaluate(() => [...document.querySelectorAll('div.grid.max-h-56 > div')].map(row => {
    const spans = [...row.querySelectorAll('span')].map(s => (s.textContent || '').trim());
    return { home: spans[0], away: spans[2], mine: row.className.includes('border-gold') };
  }));
}
const finalsOf = rows => rows.map(r => {
  const h = r.home.split(' '), a = r.away.split(' ');
  return { home: h[0], hs: Number(h[h.length - 1]), as: Number(a[0]), away: a[a.length - 1], mine: r.mine };
});
async function overflowX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function shot(page, run, name, fullPage = false) {
  try { await page.screenshot({ path: path.join(OUT, `${run.id}-${name}.png`), fullPage }); } catch (e) { note(`screenshot ${name} failed: ${String(e).slice(0, 100)}`); }
}
async function answerPresser(page) {
  const card = page.locator('[data-gm-press]');
  if (await card.count() > 0) { await card.locator('button').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500); return true; }
  return false;
}
async function openWeek(page) {
  const play = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")');
  if (await play.count() > 0) return true;
  const box = page.locator('button:has-text("This week")');
  if (await box.count() > 0) { await box.first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(350); }
  return (await play.count()) > 0;
}
async function cutDown(page, run) {
  /* the board's own two tap Cut, as the round's abandon test does it */
  for (let k = 0; k < 14; k += 1) {
    const s = await readSave(page);
    if (!s || s.league.teams[s.myTeam].players.length <= 53) return true;
    if (k === 0) {
      const back = page.locator('button:has-text("Hub")');
      if (await back.count() > 0) await back.first().click().catch(() => {});
      await page.locator('button:has-text("Roster")').first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    const groups = page.locator('[data-roster-group]');
    const n = await groups.count();
    let opened = false;
    for (let i = 0; i < n; i += 1) {
      const g = await groups.nth(i).getAttribute('data-roster-group');
      if (/DB|LB|WR/.test(g || '')) { await groups.nth(i).click().catch(() => {}); opened = true; break; }
    }
    if (!opened) return false;
    await page.waitForTimeout(250);
    const rows = page.locator('[data-roster-row]');
    const rn = await rows.count();
    if (rn === 0) return false;
    await rows.nth(rn - 1).locator('button').first().click().catch(() => {});
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Cut him")').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(250);
    await page.locator('button:has-text("Groups")').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await shot(page, run, 'cutdown-gave-up');
  return false;
}
/** One press of the week's button. Returns what the press showed, or null when it could not be pressed. */
async function pressWeek(page, run) {
  if (!(await openWeek(page))) return null;
  const play = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")').first();
  if (await play.isDisabled()) {
    note('the play button is disabled (roster over the limit): cutting down the board\'s own way');
    await shot(page, run, 'over-limit');
    const ok = await cutDown(page, run);
    const back = page.locator('button:has-text("Hub")');
    if (await back.count() > 0) await back.first().click().catch(() => {});
    await page.waitForTimeout(250);
    if (!ok || !(await openWeek(page))) return null;
  }
  const before = await readSave(page);
  const y0 = await page.evaluate(() => window.scrollY);
  const label = (await play.innerText()).trim();
  await play.click({ timeout: 5000 });
  await page.waitForTimeout(450);
  const after = await readSave(page);
  const y1 = await page.evaluate(() => window.scrollY);
  return { label, before, after, rows: finalsOf(await gridRows(page)), y0, y1 };
}

for (const run of RUNS) {
  console.log(`\n===== run ${run.id}: ${run.width}x${run.height}, reduced motion ${run.reduced ? 'ON' : 'off'} =====`);
  const R = { errors: [], weeks: [], lowest: 99, highest: 0 };
  report.runs[run.id] = R;
  const context = await browser.newContext({ viewport: { width: run.width, height: run.height }, reducedMotion: run.reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => R.errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED|Failed to load resource|ERR_CONNECTION|net::/i.test(m.text())) R.errors.push(`console: ${m.text().slice(0, 300)}`); });
  try {
    await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await shot(page, run, '01-pick-a-club');
    await page.locator('.grid button').first().click({ timeout: 8000 });
    for (let k = 0; k < 40 && !(await readSave(page)); k += 1) await page.waitForTimeout(250);
    let s = await readSave(page);
    say(!!s, `${run.id}: a new franchise is saved`);
    if (!s) throw new Error('no save after picking a club');
    const team = s.myTeam;
    say(!('gameLog' in s), `${run.id}: a new franchise holds no gameLog key`);
    R.team = team; R.deskOn = 'gm' in s; R.rosterAtStart = s.league.teams[team].players.length;
    note(`${run.id}: his club is ${team}, desk ${R.deskOn ? 'on' : 'off'}, roster ${R.rosterAtStart}, season ${s.league.season}`);
    await page.waitForTimeout(700);
    await shot(page, run, '02-hub-new-franchise');
    await answerPresser(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await openWeek(page);
    await shot(page, run, '03-week1-before');

    /* Week 1 */
    let p = await pressWeek(page, run);
    say(!!p && p.after.league.week === 2, `${run.id}: "${p ? p.label : '?'}" played Week 1 (the save is on week ${p ? p.after.league.week : '?'})`);
    if (!p) throw new Error('week 1 could not be pressed');
    await shot(page, run, '04-week1-played');
    const check = (pp, w) => {
      const log = pp.after.gameLog;
      const last = log && log.games[log.games.length - 1];
      const mine = pp.rows.find(r => r.mine);
      const okRow = !!last && !!mine && mine.home === last.home && mine.away === last.away && mine.hs === last.homeScore && mine.as === last.awayScore;
      const level = pp.rows.filter(r => r.hs === r.as).length;
      for (const r of pp.rows) { R.lowest = Math.min(R.lowest, r.hs, r.as); R.highest = Math.max(R.highest, r.hs, r.as); }
      R.weeks.push({ w, rows: pp.rows.length, mine: mine ? `${mine.home} ${mine.hs}-${mine.as} ${mine.away}` : null, logN: log ? log.games.length : 0, last: last ? last.where : null, scrollMoved: pp.y1 - pp.y0 });
      return { okRow, level, log, last, mine };
    };
    let c = check(p, 1);
    say(p.rows.length === 16, `${run.id}: the week's grid shows sixteen finals (saw ${p.rows.length})`);
    say(c.okRow, `${run.id}: his row on the grid is the game the save's log holds (${c.mine ? `${c.mine.home} ${c.mine.hs}, ${c.mine.away} ${c.mine.as}` : 'no row'}; log ${c.last ? `${c.last.home} ${c.last.homeScore}-${c.last.awayScore} ${c.last.away} at ${c.last.where}` : 'none'})`);
    say(c.level === 0, `${run.id}: no final on the grid is level`);
    say(!!c.log && c.log.v === 1 && c.log.season === p.after.league.season && c.log.games.length === 1 && c.last.where === 'w1', `${run.id}: the log is one game, w1, of this season`);
    say(p.y1 === p.y0, `${run.id}: the page did not jump on the press (scrollY ${p.y0} to ${p.y1})`);
    say((await overflowX(page)) <= 0, `${run.id}: nothing overflows sideways on the week panel`);
    const btnBox = await page.locator('button:has-text("Play Week")').first().boundingBox();
    say(!!btnBox && btnBox.y >= 0 && btnBox.y + btnBox.height <= run.height, `${run.id}: the next press button is inside the viewport after the press (y ${btnBox ? Math.round(btnBox.y) : '?'})`);

    /* the hub's last result */
    const back = page.locator('button:has-text("Hub")');
    if (await back.count() > 0) await back.first().click().catch(() => {});
    await page.waitForTimeout(350);
    await shot(page, run, '05-hub-after-week1');
    const hubText = await page.locator('body').innerText();
    const us = c.last.home === team ? c.last.homeScore : c.last.awayScore;
    const them = c.last.home === team ? c.last.awayScore : c.last.homeScore;
    R.hubHasLast = hubText.includes(`${us}-${them}`);
    say(R.hubHasLast, `${run.id}: the hub shows his last result with the told score ${us}-${them}`);
    const beforeReload = await page.evaluate(k => localStorage.getItem(k), KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await shot(page, run, '06-hub-after-reload');
    say((await page.evaluate(k => localStorage.getItem(k), KEY)) === beforeReload, `${run.id}: a reload writes nothing and keeps the log`);
    R.hubHasLastAfterReload = (await page.locator('body').innerText()).includes(`${us}-${them}`);
    note(`${run.id}: after a reload the hub ${R.hubHasLastAfterReload ? 'still shows' : 'no longer shows'} the last result (the builder says it is empty as before)`);

    if (run.full) {
      let rawW9 = null;
      for (let w = 2; w <= 16; w += 1) {
        p = await pressWeek(page, run);
        if (!p) { say(false, `${run.id}: week ${w} could not be pressed`); break; }
        c = check(p, w);
        if (!c.okRow || c.level || !c.log || c.log.games.length !== w || p.rows.length !== 16) say(false, `${run.id}: week ${w}: row ok ${c.okRow}, level ${c.level}, log games ${c.log ? c.log.games.length : 0}, rows ${p.rows.length}`);
        if (w === 9) { rawW9 = JSON.stringify(p.after); await shot(page, run, '07-week9-played'); }
      }
      s = await readSave(page);
      const club = s.league.teams[team];
      const logW = s.gameLog ? s.gameLog.games.filter(g => g.winner === team).length : -1;
      say(!!s.gameLog && s.gameLog.games.length === 16 && logW === club.wins, `${run.id}: after sixteen weeks the log holds sixteen games and its wins (${logW}) are the club's (${club.wins}-${club.losses})`);
      say(R.lowest < 16, `${run.id}: over sixteen weeks a side scored under 16, which the old scores never did (lowest ${R.lowest}, highest ${R.highest})`);

      /* the final week and the playoffs, one press */
      p = await pressWeek(page, run);
      await page.waitForTimeout(2600);
      await shot(page, run, '08-recap', true);
      await shot(page, run, '08b-recap-viewport');
      s = await readSave(page);
      say(!!s.postseason && s.postseason.rounds.flatMap(r => r.games).length === 13, `${run.id}: the recap save holds thirteen playoff games (phase ${s.phase})`);
      const body = await page.locator('body').innerText();
      const games = s.postseason ? s.postseason.rounds.flatMap(r => r.games.map(g => ({ r: r.name, g }))) : [];
      const missing = games.filter(x => !body.includes(`${Math.max(x.g.homeScore, x.g.awayScore)}-${Math.min(x.g.homeScore, x.g.awayScore)}`));
      say(missing.length === 0, `${run.id}: every saved playoff score is printed on the recap (${games.length - missing.length} of ${games.length})`);
      R.playoffScores = games.map(x => `${x.r}: ${x.g.home} ${x.g.homeScore}-${x.g.awayScore} ${x.g.away}`);
      const his = games.filter(x => x.g.home === team || x.g.away === team);
      const wheres = s.gameLog ? s.gameLog.games.map(g => g.where) : [];
      say(wheres.length === 17 + his.length && wheres[16] === 'w17' && his.every((x, k) => wheres[17 + k] === x.r), `${run.id}: the log is seventeen weeks and then his ${his.length} playoff game(s) (${wheres.slice(15).join(', ')})`);
      say(s.league.teams[team].wins + s.league.teams[team].losses === 17, `${run.id}: his record is seventeen games (${s.league.teams[team].wins}-${s.league.teams[team].losses})`);
      R.ending = { phase: s.phase, champion: s.postseason && s.postseason.champion, fired: s.fired, trust: s.trust };
      const recapLog = JSON.stringify(s.gameLog);

      if (s.phase !== 'fired') {
        await answerPresser(page);
        await page.locator('button:has-text("Go to the draft")').first().click({ timeout: 8000 });
        await page.waitForTimeout(700);
        await shot(page, run, '09-draft');
        s = await readSave(page);
        say(s.phase === 'draft' && JSON.stringify(s.gameLog) === recapLog, `${run.id}: the finished season rides into the draft with its log unchanged`);
        for (let k = 0; k < 14; k += 1) {
          s = await readSave(page);
          if (s.phase !== 'draft') break;
          const row = page.locator('button:has-text("· age")').first();
          if (await row.count() === 0) break;
          await row.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(450);
        }
        await page.waitForTimeout(600);
        await shot(page, run, '10-draft-night-or-hub');
        const cont = page.locator('button:has-text("Continue to the hub")');
        if (await cont.count() > 0) { await cont.first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500); }
        s = await readSave(page);
        say(s.phase === 'hub' && s.league.week === 1 && !('gameLog' in s), `${run.id}: the next season's hub (phase ${s.phase}, season ${s.league.season}, week ${s.league.week}) holds no gameLog key`);
        await answerPresser(page);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        await shot(page, run, '11-hub-season2');
        p = await pressWeek(page, run);
        if (p) {
          const lg = p.after.gameLog;
          say(!!lg && lg.games.length === 1 && lg.season === p.after.league.season && lg.games[0].where === 'w1', `${run.id}: the new season's first press starts a fresh log of one game (season ${lg ? lg.season : '?'})`);
          await shot(page, run, '12-season2-week1');
        } else say(false, `${run.id}: the new season's Week 1 could not be pressed`);
      }

      /* a save from before the round (no gameLog) at week 10, and a damaged log */
      if (rawW9) {
        const old = JSON.parse(rawW9); delete old.gameLog;
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(old)]);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        p = await pressWeek(page, run);
        say(!!p && p.after.league.week === 11 && !!p.after.gameLog && p.after.gameLog.games.map(g => g.where).join() === 'w10', `${run.id}: a save with no log at week 10 loads, plays, and its log starts at w10`);
        await shot(page, run, '13-old-save-week10');
        const bad = JSON.parse(rawW9); bad.gameLog.games[2].homeScore = 'x';
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(bad)]);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        const hub = (await page.locator('button:has-text("This week")').count()) > 0;
        say(hub, `${run.id}: a save with a damaged log opens on the hub, not on the save error screen`);
        await shot(page, run, '14-damaged-log-hub');
        p = await pressWeek(page, run);
        say(!!p && !!p.after.gameLog && p.after.gameLog.games.map(g => g.where).join() === 'w10', `${run.id}: after a damaged log the next press starts a fresh one (w10 alone)`);
      }

      /* abandon and start again */
      const back2 = page.locator('button:has-text("Hub")');
      if (await back2.count() > 0) await back2.first().click().catch(() => {});
      await page.waitForTimeout(300);
      const abandon = page.locator('button:has-text("Abandon franchise and restart")');
      if (await abandon.count() > 0) {
        await abandon.first().scrollIntoViewIfNeeded().catch(() => {});
        await shot(page, run, '15-abandon-button');
        await abandon.first().click({ timeout: 5000 });
        await page.waitForTimeout(600);
        say((await readSave(page)) === null, `${run.id}: Abandon removes the save`);
        await page.locator('.grid button').nth(3).click({ timeout: 8000 });
        for (let k = 0; k < 40 && !(await readSave(page)); k += 1) await page.waitForTimeout(250);
        s = await readSave(page);
        say(!!s && !('gameLog' in s) && s.myTeam !== team, `${run.id}: the next franchise (${s ? s.myTeam : '?'}) holds no gameLog key`);
        await answerPresser(page);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        p = await pressWeek(page, run);
        say(!!p && !!p.after.gameLog && p.after.gameLog.games.length === 1 && [p.after.gameLog.games[0].home, p.after.gameLog.games[0].away].includes(s.myTeam), `${run.id}: its first press logs one game of the new club`);
        await shot(page, run, '16-new-franchise-week1');
      } else say(false, `${run.id}: no Abandon button on the hub`);
    }
  } catch (e) {
    say(false, `${run.id}: the walk stopped: ${String(e).slice(0, 300)}`);
    await shot(page, run, 'stopped', true);
  }
  say(R.errors.length === 0, `${run.id}: no page error and no console error (${R.errors.length ? R.errors[0] : 'clean'})`);
  await context.close();
}

/* What's New: the entry is on the page */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const text = await page.locator('body').innerText();
  say(text.includes('scores that read like football'), 'the What\'s New page carries the entry');
  await page.screenshot({ path: path.join(OUT, 'whatsnew-390.png') });
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(report, null, 1));
console.log(`\nr1305walk: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
