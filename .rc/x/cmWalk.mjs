/* Reviewer cm, Release AV: a player's first weeks of Club Manager in two leagues, at 390x844 and 1280x900.
 * usage (on a runner, served build): BASE=http://localhost:4173 RC_OUT=<dir> [ALT_DIST=<a build of origin/main>] node .rc/x/cmWalk.mjs
 * Each walk: the picker, the hub, the Stats screen, the Match Centre, a Quick Sim, a live match (the viewer early,
 * at half time, at full time, the report), two more matches, the Stats screen again. It blocks supabase.co,
 * collects page errors, reads the save the page wrote (the league book, its first law, any video review) and
 * saves screenshots. With ALT_DIST the save each walk ends on is opened by main's build too and the Stats
 * screen's text is compared. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const ALT_DIST = process.env.ALT_DIST || '';
const ALT = 'http://127.0.0.1:4180';
const KEY = 'dukb-club-manager-save';
const WALKS = [
  { tag: 'pl-390', w: 390, h: 844, reduce: false, country: /England/i, league: /Premier League/i, clubs: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ },
  { tag: 'bl-1280', w: 1280, h: 900, reduce: true, country: /Germany/i, league: /Bundesliga/i, clubs: /Freiburg|Mainz|Augsburg|Union Berlin|Werder Bremen|Hoffenheim|Wolfsburg|Stuttgart/ },
  { tag: 'bl-390', w: 390, h: 844, reduce: true, country: /Germany/i, league: /Bundesliga/i, clubs: /Freiburg|Mainz|Augsburg|Union Berlin|Werder Bremen|Hoffenheim|Wolfsburg|Stuttgart/ },
  { tag: 'pl-1280', w: 1280, h: 900, reduce: false, country: /England/i, league: /Premier League/i, clubs: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ },
];
const findings = []; const lines = [];
const say = m => { lines.push(m); console.log(m); };
const note = (tag, m) => { findings.push(`${tag}: ${m}`); console.log(`  FINDING ${tag}: ${m}`); };

let altServer = null;
if (ALT_DIST) {
  altServer = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', ALT_DIST, '4180'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
}
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--no-proxy-server'] });

async function open(walk, base) {
  const ctx = await browser.newContext({ viewport: { width: walk.w, height: walk.h }, reducedMotion: walk.reduce ? 'reduce' : 'no-preference', ignoreHTTPSErrors: true });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(/googletagmanager|google-analytics|googlesyndication|doubleclick/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 200)));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED|ERR_CONNECTION|ERR_BLOCKED/i.test(t)) errs.push(t.slice(0, 200)); });
  const h = {
    ctx, page, errs, base,
    text: async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    heading: async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase(),
    tap: async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); },
    tapText: async rx => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); },
    shot: async name => { await page.screenshot({ path: path.join(OUT, `${walk.tag}-${name}.png`), fullPage: false }).catch(() => {}); },
    clearRoom: async () => {
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
      for (let i = 0; i < 3; i += 1) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
    },
    overflow: async () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })).catch(() => ({ sw: 0, cw: 0 })),
    save: async () => page.evaluate(k => localStorage.getItem(k), KEY).catch(() => null),
  };
  return h;
}

/* What the save the page wrote says about the book and the video referee. */
function readSave(raw) {
  if (!raw) return null;
  let s; try { s = JSON.parse(raw); } catch { return null; }
  const out = { club: s.clubName, week: s.week, season: s.season, hasBook: !!s.leagueBook, stamp: s.leagueBook?.s ?? null, clubsInBook: 0, lawChecked: 0, lawBad: [], bookBytes: s.leagueBook ? JSON.stringify(s.leagueBook).length : 0, saveBytes: raw.length, varLines: (raw.match(/"kind":"var"/g) || []).length, reviewWord: (raw.match(/"review":/g) || []).length, played: 0 };
  if (s.leagueBook && Array.isArray(s.table)) {
    out.clubsInBook = Object.keys(s.leagueBook.c ?? {}).length;
    for (const row of s.table) {
      if (row.club === s.clubName) { out.played = row.w + row.d + row.l; continue; }
      const e = s.leagueBook.c[row.club]; const got = e ? Object.values(e.m).reduce((x, m) => x + m[0], 0) + e.og + e.u : 0;
      out.lawChecked += 1; if (got !== row.gf) out.lawBad.push(`${row.club} book ${got} table ${row.gf}`);
    }
  }
  return out;
}

async function startCareer(h, walk) {
  const { page } = h;
  await page.goto(`${h.base}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await h.clearRoom();
  await h.shot('0-picker');
  await h.tap(/2026-27/i);
  await page.getByRole('button', { name: walk.country }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await h.tap(walk.country);
  await page.getByRole('button', { name: walk.league }).first().waitFor({ timeout: 8000 }).catch(() => {});
  /* the top division, not the second one: the first button whose name matches */
  await h.tap(walk.league);
  const clubBtn = page.locator('button').filter({ hasText: walk.clubs }).first();
  await clubBtn.waitFor({ timeout: 8000 }).catch(() => {});
  if (await clubBtn.count().catch(() => 0) > 0) await clubBtn.click({ timeout: 5000 }).catch(() => {});
  await h.shot('0b-club-picked');
  await h.tap(/take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await h.tap(/skip: just manage/i);
  await page.waitForTimeout(1200);
  const t = await h.text();
  return /Season 1/i.test(t);
}

async function buttons(h) {
  const bs = h.page.locator('button:visible'); const labels = [];
  for (let k = 0; k < Math.min(await bs.count().catch(() => 0), 24); k += 1) { const lb = ((await bs.nth(k).innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' '); if (lb) labels.push(lb.slice(0, 26)); }
  return labels.join(' | ');
}

async function walkOne(walk) {
  const h = await open(walk, BASE); const { page } = h;
  const res = { tag: walk.tag, started: false, quick: 0, live: 0, halves: 0, fullTimes: 0, stats: [], liveChange: null, varWordSeen: [], sideways: [], steps: 0 };
  try {
    res.started = await startCareer(h, walk);
    res.scrollAfterJob = await page.evaluate(() => ({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight })).catch(() => null);
    await h.shot('1-hub-as-landed');
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.waitForTimeout(300);
    await h.shot('1-hub');
    if (!res.started) { note(walk.tag, `BLOCKED at the picker: "${(await h.text()).slice(0, 220)}" buttons: ${await buttons(h)}`); return res; }
    const plan = ['stats', 'quick', 'live', 'quick', 'quick', 'stats'];
    let inMatch = null, liveStage = 0, halfShot = false, centreShot = false; const seenWhere = new Set();
    while (plan.length && res.steps++ < 110) {
      const t = await h.text(); const where = await h.heading();
      if (h.errs.length) { note(walk.tag, `THROWS: ${h.errs[0]}`); await h.shot('throw'); break; }
      if (t.length < 60) { note(walk.tag, `BLANK screen at step ${res.steps}`); await h.shot('blank'); break; }
      if (/This page broke/i.test(t)) { note(walk.tag, 'the error boundary is on screen'); await h.shot('boundary'); break; }
      if (!seenWhere.has(where)) { seenWhere.add(where); const ov = await h.overflow(); if (ov.sw > ov.cw + 1) res.sideways.push(`${where} ${ov.sw}>${ov.cw}`); }
      if (/\bVAR\b/.test(t) && where !== '') res.varWordSeen.push(where);
      if (where === 'HALF TIME' || (where === 'MATCH LIVE' && /Second half/i.test(t))) {
        res.halves += 1; if (!halfShot) { await h.shot('5-half-time'); halfShot = true; }
        if (!await h.tap(/Second half/i)) { note(walk.tag, `no way out of half time. buttons: ${await buttons(h)}`); break; }
        await page.waitForTimeout(900); if (liveStage === 1) { await page.waitForTimeout(1800); await h.shot('6-live-second-half'); liveStage = 2; }
        continue;
      }
      if (where === 'MATCH LIVE') {
        if (liveStage === 0) {
          await page.waitForTimeout(2600); await h.shot('3-live-early');
          res.liveChange = await page.locator('button:visible').filter({ hasText: /change|sub|tactic|shape/i }).count().catch(() => -1);
          res.liveButtons = await buttons(h);
          /* can a change be made while the half is being played? tap one of my men, the bench must open */
          const mine = page.locator('button:visible:not([disabled])').filter({ hasText: /^\s*(2|3|4|5)\s/ }).first();
          if (await mine.count().catch(() => 0)) {
            const before = (await h.text()).length;
            await mine.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(900);
            res.liveTapGrew = (await h.text()).length - before;
            res.liveTapDialog = await page.locator('[role="dialog"]:visible').count().catch(() => 0);
            await h.shot('3b-live-player-tapped');
            await page.keyboard.press('Escape').catch(() => {});
            await page.waitForTimeout(400);
          } else res.liveTapGrew = null;
          await h.tapText(/^4x$/); await page.waitForTimeout(3600); await h.shot('4-live-later'); liveStage = 1;
        }
        if (await h.tap(/full report/i)) { await page.waitForTimeout(700); continue; }
        if (/FULL TIME/.test(t) && liveStage === 2) { await h.shot('7-live-full-time'); liveStage = 3; }
        if (await h.tap(/skip/i)) { await page.waitForTimeout(900); continue; }
        note(walk.tag, `the live viewer offered neither a skip nor a way out. buttons: ${await buttons(h)}`); await h.shot('live-stuck'); break;
      }
      if (where === 'FULL TIME') {
        res.fullTimes += 1; if (res.fullTimes <= 2) await h.shot(`8-report-${inMatch ?? 'x'}-${res.fullTimes}`);
        if (!/Match stats/i.test(t)) note(walk.tag, 'a full time report with no stats block');
        if (!await h.tap(/continue|next|carry on|ok/i)) { note(walk.tag, `the full time report had no way forward. buttons: ${await buttons(h)}`); break; }
        await page.waitForTimeout(700);
        if (inMatch) { if (inMatch === 'quick') res.quick += 1; else res.live += 1; plan.shift(); inMatch = null; }
        continue;
      }
      if (inMatch) { /* a screen between the kick off and the report that this walk does not know */
        if (await h.tap(/continue|next|carry on|ok|back to club|club home/i)) { await page.waitForTimeout(600); continue; }
      }
      const intent = plan[0];
      if (intent === 'stats') {
        if (await h.tapText(/stats\s*\d+ goals/i)) {
          await page.waitForTimeout(1200); await h.shot(`2-stats-${res.stats.length}`);
          res.stats.push((await h.text()).slice(0, 2400)); plan.shift();
          if (!await h.tap(/Club home/i)) await h.tap(/back/i);
          await page.waitForTimeout(500); continue;
        }
      }
      if (/Open the Window/i.test(t) && await h.tap(/Open the Window/i)) {
        await page.waitForTimeout(700); await h.shot('window');
        if (!await h.tapText(/^Home$/) && !await h.tap(/close the window|shut the window|done|finish|back to club|continue/i)) { note(walk.tag, `the window opened and would not close. buttons: ${await buttons(h)}`); break; }
        await page.waitForTimeout(500); continue;
      }
      if (intent === 'quick') {
        if (await h.tapText(/Match Centre/i)) {
          await page.waitForTimeout(900); if (!centreShot) { await h.shot('2b-match-centre'); centreShot = true; }
          if (await h.tapText(/Quick Sim/i)) { inMatch = 'quick'; await page.waitForTimeout(1500); continue; }
          note(walk.tag, `the match centre offered no quick sim. buttons: ${await buttons(h)}`);
        }
      }
      if (intent === 'live' && await h.tapText(/Play Live/i)) { inMatch = 'live'; await page.waitForTimeout(1200); continue; }
      if (await h.tap(/play live|play match|play next|^play$|next fixture/i)) { inMatch = inMatch ?? 'live'; await page.waitForTimeout(900); continue; }
      if (await h.tap(/back to club|club home|hub|home/i)) { await page.waitForTimeout(500); continue; }
      if (await h.tap(/continue|next/i)) { await page.waitForTimeout(500); continue; }
      note(walk.tag, `STUCK at step ${res.steps} wanting ${intent}: "${t.slice(0, 140)}" buttons: ${await buttons(h)}`); await h.shot('stuck'); break;
    }
    if (plan.length) note(walk.tag, `the walk ended with ${plan.join(', ')} still to do after ${res.steps} steps`);
    await h.shot('9-end');
    res.raw = await h.save(); res.save = readSave(res.raw);
    if (res.raw) fs.writeFileSync(path.join(OUT, `save-${walk.tag}.json`), res.raw);
  } catch (e) { note(walk.tag, `the walk itself threw: ${String(e).slice(0, 240)}`); await h.shot('walk-threw'); }
  finally { await h.ctx.close().catch(() => {}); }
  return res;
}

/* The hub and the Stats screen of one saved career on one build: text and a screenshot each. */
async function statsOf(walk, base, raw, name) {
  const ctx = await browser.newContext({ viewport: { width: walk.w, height: walk.h }, reducedMotion: 'reduce', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(/googletagmanager|google-analytics|googlesyndication|doubleclick/, r => r.abort());
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 200)));
  const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const out = { hub: '', stats: '', errs, resumed: false };
  try {
    await page.goto(`${base}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const resume = page.getByRole('button', { name: /Resume Career/i }).first();
    if (await resume.count().catch(() => 0)) { out.resumed = await resume.click({ timeout: 5000 }).then(() => true).catch(() => false); await page.waitForTimeout(1500); }
    out.hub = await text();
    await page.screenshot({ path: path.join(OUT, `${walk.tag}-cmp-${name}-hub.png`) }).catch(() => {});
    out.scrollAtHub = await page.evaluate(() => Math.round(window.scrollY)).catch(() => -1);
    const tile = page.locator('button:visible').filter({ hasText: /stats\s*\d+ goals/i }).first();
    out.tileFound = await tile.count().catch(() => 0);
    if (await tile.count().catch(() => 0)) { await tile.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500); }
    out.stats = await text();
    await page.screenshot({ path: path.join(OUT, `${walk.tag}-cmp-${name}-stats.png`), fullPage: true }).catch(() => {});
    out.after = await page.evaluate(k => localStorage.getItem(k), KEY).catch(() => null);
  } catch (e) { errs.push(`statsOf threw: ${String(e).slice(0, 200)}`); }
  finally { await ctx.close().catch(() => {}); }
  return out;
}
const firstDiff = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i += 1; return i >= a.length && i >= b.length ? '' : `at ${i}: head "${a.slice(Math.max(0, i - 40), i + 60)}" main "${b.slice(Math.max(0, i - 40), i + 60)}"`; };

const results = [];
for (const walk of WALKS) { say(`== ${walk.tag} (${walk.w}x${walk.h}, reduced motion ${walk.reduce ? 'on' : 'off'})`); results.push(await walkOne(walk)); }
for (const r of results) {
  const { raw, stats, ...rest } = r;
  say(`${r.tag}: ${JSON.stringify(rest)}`);
  (stats ?? []).forEach((s, i) => say(`${r.tag} stats ${i}: ${s.slice(0, 700)}`));
  if (!r.save) { note(r.tag, 'no save was read at the end of the walk'); continue; }
  if (!r.save.hasBook) note(r.tag, 'a career started on this build holds no league book');
  if (r.save.lawBad.length) note(r.tag, `the first law fails in the page's own save: ${r.save.lawBad.slice(0, 4).join('; ')}`);
  if (r.save.varLines || r.varWordSeen.length) note(r.tag, `a video review reached a managed match with the switch off: ${r.save.varLines} var lines in the save, the word VAR on ${r.varWordSeen.join(', ')}`);
  if (r.sideways.length) note(r.tag, `the page scrolls sideways: ${r.sideways.join('; ')}`);
  if (r.quick < 3 || r.live < 1) note(r.tag, `the walk played ${r.quick} quick sims and ${r.live} live matches, it wanted 3 and 1`);
  if (!raw) continue;
  const walk = WALKS.find(w => w.tag === r.tag);
  const a = await statsOf(walk, BASE, raw, 'head');
  say(`${r.tag} compare head: resumed ${a.resumed}, hub ${a.hub.length} chars, stats ${a.stats.length} chars, errors ${a.errs.length}${a.errs.length ? ' ' + a.errs[0] : ''}`);
  if (a.errs.length) note(r.tag, `the head threw opening its own save: ${a.errs[0]}`);
  if (!ALT_DIST) continue;
  const b = await statsOf(walk, ALT, raw, 'main');
  const clock = /\d{1,2}:\d{2}:\d{2}/g;   /* the footer's countdown to the next daily puzzle */
  for (const o of [a, b]) { o.hub = o.hub.replace(clock, 'HH:MM:SS'); o.stats = o.stats.replace(clock, 'HH:MM:SS'); }
  fs.writeFileSync(path.join(OUT, `${r.tag}-stats-head.txt`), a.stats);
  fs.writeFileSync(path.join(OUT, `${r.tag}-stats-main.txt`), b.stats);
  say(`${r.tag} the Stats tile: found ${a.tileFound} on the head, ${b.tileFound} on main; scroll at the hub after Resume: head ${a.scrollAtHub}, main ${b.scrollAtHub}`);
  if (!a.tileFound || !b.tileFound) note(r.tag, 'the Stats tile was not found on one of the builds, so the comparison below is of the hub twice');
  if (!/golden boot|top scorer|goals/i.test(a.stats)) note(r.tag, 'the Stats screen text names no goals board');
  if (r.tag.startsWith('pl')) {
    const m = await open(walk, ALT);
    try { const ok = await startCareer(m, walk); const sc = await m.page.evaluate(() => ({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight })).catch(() => null); await m.shot('1-hub-as-landed-MAIN'); say(`${r.tag} after taking the job on MAIN's build: started ${ok}, scroll ${JSON.stringify(sc)}; on the head: ${JSON.stringify(r.scrollAfterJob)}`); }
    catch (e) { say(`${r.tag} main picker threw: ${String(e).slice(0, 160)}`); }
    finally { await m.ctx.close().catch(() => {}); }
  }
  say(`${r.tag} compare main: resumed ${b.resumed}, hub ${b.hub.length} chars, stats ${b.stats.length} chars, errors ${b.errs.length}${b.errs.length ? ' ' + b.errs[0] : ''}`);
  const dh = firstDiff(a.hub, b.hub), ds = firstDiff(a.stats, b.stats);
  say(`${r.tag} hub text ${dh ? 'DIFFERS ' + dh : 'is the same on both builds'}`);
  say(`${r.tag} Stats text ${ds ? 'DIFFERS ' + ds : 'is the same on both builds'}`);
  if (ds) note(r.tag, `the Stats screen reads differently on main's build for the same save: ${ds}`);
  if (dh) note(r.tag, `the hub reads differently on main's build for the same save: ${dh}`);
  if (b.errs.length) note(r.tag, `main's build threw on a save this build wrote (the rollback direction): ${b.errs[0]}`);
  const kept = b.after ? JSON.parse(b.after).leagueBook : undefined;
  say(`${r.tag} main's build, after opening the head's save: the book is ${kept === undefined ? 'gone from the save' : 'still in the save'}`);
}
await browser.close();
if (altServer) altServer.kill();
fs.writeFileSync(path.join(OUT, 'cmWalk-log.txt'), lines.join('\n') + '\n' + findings.map(f => `FINDING ${f}`).join('\n') + '\n');
console.log(findings.length ? `cmWalk: ${findings.length} finding(s)` : `cmWalk: clean. ${results.length} walks, no finding.`);
process.exit(findings.length ? 1 : 0);
