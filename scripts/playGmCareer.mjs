/* Round 1533: a GM's career on a front office board, walked in a real browser
 * over the served build (dist on BASE, the host like server of the runner's
 * #!serve). A route table keyed by sport; this round fills the /front-office
 * row and the next bind adds its boards as rows.
 *
 * Walk A, a doomed save: the last week of a season he cannot survive, the
 * recap's "See who is calling", the out of work screen, the Job market box (on
 * a throttled connection: the holding box, then the panel, the page not
 * moving), an offer opened, armed and taken, the arrival recap (no confetti,
 * the arrival line), the presser, the new club's re-sign box, its draft, the
 * hub with its Career and GM level boxes, one week played, and a point spent.
 * Walk B, a market with next year open: the year out armed and taken, the new
 * card. Walk C, a closed market: no stay out button, the two tap restart.
 * Walk D: the "?" of each of the three career boxes, and the GM level panel's
 * height on a phone. Each walk runs at 320 by 640, 390 by 844 and 1280 by 900.
 * Walk E (Round 1550, 390 and 1280): the career kit on a slow line. The pick
 * screen and a season being played never ask for it; the last week's press
 * waits for it and then closes the season; a reload on the fired screen holds
 * and then draws where the box stood; the market and a seat taken; the new
 * hub's boxes drawn without it, and the GM level box holding until it lands.
 * Round 1561 (closing check): then the hub reloaded once more and the Career
 * box opened before the kit, both of its holding stages read frame by frame.
 *
 * Round 1561: the NHL Front Office joins as a second row (the board bound to
 * the career on the same shared pieces). A row carries its own season shape
 * (last, mid, period: the NFL's week 17 and 9, the NHL's round 20 and 9), its
 * one press (Play Week, Play Round), its pick screen's words and how it gets
 * under its roster limit (cut to 53, waive to 15). PLAY_GM_CAREER_SPORT=nhl
 * (or nfl) walks one row.
 *
 * On every screen: nothing wider than the screen, every control of the out of
 * work screen and the career panels at least 44 px tall, no text under 12 px
 * on the out of work card and link or under 11 px in the panels, no console
 * error. The panels' chunks are asked for only after a box is tapped.
 * Pictures of each screen at each size go to $RC_OUT (or PLAY_GM_CAREER_OUT).
 *
 * Controls (PLAY_GM_CAREER_CONTROL, through scripts/lib/servedCodeControl.mjs,
 * the served chunks rewritten, never a rebuild):
 *   wipebutton  the fired recap's button deletes the save again (Walk A red)
 *   nofallback  the holding box loses its minimum height (the jump check red;
 *               Round 1561: also the 390 checks, Walk A's Job market and
 *               Walk E's GM level before the kit and Career box). Run it with
 *               PLAY_GM_CAREER_WALKS=A for a clean verdict: under Walk E the
 *               served copy also loses its stylesheet and its kit delay, so
 *               four unrelated checks go red beside the aimed one (r1561-g5:
 *               "3/3 guarded checks fired ... 4 unrelated failure(s)", the
 *               aimed E check CAUGHT at 19px for 336px).
 *   eagerpanel  the Job market chunk is asked for when the board loads (the
 *               chunk check red)
 *   eagerkit    the career kit's chunk is asked for when the board loads (Walk
 *               E's pick screen check red; run with PLAY_GM_CAREER_WALKS=E)
 * Supabase is aborted: production is never touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAY_GM_CAREER_CONTROL || '';
const OUT = process.env.PLAY_GM_CAREER_OUT || process.env.RC_OUT || '';
const ONLY_SIZE = process.env.PLAY_GM_CAREER_SIZE || '';

const ONLY_SPORT = process.env.PLAY_GM_CAREER_SPORT || '';
const ROUTES = [
  {
    sport: 'nfl', route: '/front-office', key: 'front-office-save-v1', play: 'This week', final: 'Play the final week',
    ask: 'Win the Super Bowl. Anything less is a failed season upstairs.', chunks: ['GmJobMarketPanel', 'GmCareerPanel', 'GmXpDeskPanel'], kit: 'nflCareerKit',
    /* Round 1561: the row's season shape, its one press, its pick screen and its roster limit */
    last: s => { s.league.week = 17; }, mid: s => { s.league.week = 9; }, period: s => s.league.week, one: 'Play Week', unit: 'week',
    picker: 'Take over a front office', trim: (page, row) => cutToFit(page, row),
  },
  {
    sport: 'nhl', route: '/nhl-front-office', key: 'nhl-front-office-save-v1', play: 'Play', tile: 'Play', final: 'Final stretch + playoffs',
    ask: 'Win the Stanley Cup. Anything less is a failed season upstairs.', chunks: ['GmJobMarketPanel', 'GmCareerPanel', 'GmXpDeskPanel'], kit: 'nhlCareerKit',
    last: s => { s.league.round = 20; }, mid: s => { s.league.round = 9; }, period: s => s.league.round, one: 'Play Round', unit: 'round',
    picker: 'Take over an NHL front office', trim: page => waiveToFit(page),
  },
].filter(r => !ONLY_SPORT || r.sport === ONLY_SPORT);
const SIZES = [[320, 640], [390, 844], [1280, 900]].filter(([w]) => !ONLY_SIZE || String(w) === ONLY_SIZE);

const MUTATIONS = {
  /* Round 1561: the copy deletes either board's save, so the one mutation fires on both rows */
  wipebutton: [{ label: 'wipebutton', find: /onClick:\(\)=>[\w$]+\("fired"\)/g, replace: 'onClick:()=>{localStorage.removeItem("front-office-save-v1");localStorage.removeItem("nhl-front-office-save-v1")}' }],
  nofallback: [{ label: 'nofallback', find: /"data-gm-panel-loading":!0,style:\{minHeight:/g, replace: '"data-gm-panel-loading":!0,style:{minHeightOff:' }],
  eagerpanel: [{ label: 'eagerpanel', find: /^([\s\S]*?)(import\("(\.\/GmJobMarketPanel-[\w-]+\.js)"\))/, replace: (all, pre, imp, file) => `import("${file}");${pre}${imp}` }],
  /* Round 1550: the career kit's chunk asked for the moment the board loads (Walk E's pick screen check red) */
  eagerkit: [{ label: 'eagerkit', find: /^([\s\S]*?)(import\("(\.\/(?:nfl|nhl)CareerKit-[\w-]+\.js)"\))/, replace: (all, pre, imp, file) => `import("${file}");${pre}${imp}` }],
};
if (CONTROL && !MUTATIONS[CONTROL]) { console.error(`PLAY_GM_CAREER_CONTROL=${CONTROL} is not a control of this walk (${Object.keys(MUTATIONS).join(', ')})`); process.exit(2); }
const { say, verdict } = controlledChecks(CONTROL);
/** A check is aimed at one control: under that control it must go red, under any other it must stay green. */
const aimed = name => CONTROL === name;
const WALKS = (process.env.PLAY_GM_CAREER_WALKS || 'ABCDE').toUpperCase();
const proof = {};
if (OUT) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const wait = ms => new Promise(r => setTimeout(r, ms));

/** A fresh page at one size, the database aborted, errors and asset requests counted, the control installed. */
async function openPage(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [], assets = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (r.url().includes('/assets/')) assets.push(r.url()); });
  if (CONTROL) await installServedCodeControl(page, MUTATIONS[CONTROL], proof);
  return { ctx, page, errors, assets };
}

const readSave = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
const writeSave = (page, key, s) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, s]);
/* The top of the page, the game part (the guide below it is not this round's), so the pictures stay small. */
const shot = async (page, name) => {
  if (!OUT) return;
  const [w, h] = await page.evaluate(() => [window.innerWidth, Math.min(1500, document.documentElement.scrollHeight)]);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, clip: { x: 0, y: 0, width: w, height: h } });
};

/** Nothing wider than the screen; every control of this round's screens at least 44 px; no text under its floor. */
async function screenChecks(page, at) {
  const r = await page.evaluate(() => {
    const wide = document.documentElement.scrollWidth - window.innerWidth;
    const scope = ['[data-gm-out-of-work] [data-gm-out-card]', '[data-gm-new-front-office]', '[data-gm-market]', '[data-gm-desk="panel"]'];
    const shown = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const short = [], small = [];
    for (const sel of scope) {
      for (const root of document.querySelectorAll(sel)) {
        const floor = sel.includes('out-card') || sel.includes('new-front-office') ? 12 : 11;
        for (const b of root.querySelectorAll('button')) {
          if (!shown(b)) continue;
          if (b.textContent.trim() === 'Hub') continue; /* the shared back bar, not this round's */
          if (b.getBoundingClientRect().height < 43.5) short.push(`${b.textContent.trim().slice(0, 30)} ${Math.round(b.getBoundingClientRect().height)}px`);
        }
        for (const el of root.querySelectorAll('*')) {
          if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < floor) small.push(`${el.textContent.trim().slice(0, 30)} ${px}px`);
        }
      }
    }
    return { wide, short, small };
  });
  say(r.wide <= 0, `${at}: nothing wider than the screen (${r.wide}px over)`);
  say(r.short.length === 0, `${at}: every control at least 44 px tall (${r.short.slice(0, 3).join('; ') || 'all'})`);
  say(r.small.length === 0, `${at}: no text under its floor (${r.small.slice(0, 3).join('; ') || 'none'})`);
}

/** Start a club, then the last week of a season he cannot survive (trust 5 under a title ask, his roster gutted), one press. */
async function doomed(page, row) {
  await page.goto(`${BASE}${row.route}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('.grid button').first().click();
  /* The rosters are a chunk of their own, fetched on the tap: wait for the save, not a clock. */
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', row.key, { timeout: 30000 });
  await wait(600);
  const s = await readSave(page, row.key);
  s.trust = 5;
  s.mandate = { tier: 'title', text: row.ask, winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  row.last(s);
  await writeSave(page, row.key, s);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  /* Round 1561: a roster over the limit holds the press (the NHL's waivers): get under it first, as a player must */
  await row.trim(page, row);
  await playBox(page, row).click();
  await wait(400);
  /* the last period's press waits for the career kit (useGmCareerKit): click it once it is live */
  await page.waitForFunction(t => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes(t) && !b.disabled), row.final, { timeout: 30000 });
  await page.locator(`button:has-text("${row.final}")`).last().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, row.key, { timeout: 30000 });
  await wait(1600);
  return s.myTeam;
}

/** A career box on the out of work screen or the hub, by its title. */
const careerBox = (page, title) => page.locator(`[data-gm-desk="tiles"] button:has(div.uppercase:text-is("${title}"))`).first();
const back = async page => { const b = page.locator('[data-gm-desk="panel"] button:has-text("Hub")').first(); if (await b.count()) await b.click(); await wait(300); };
const chunkAsked = (assets, row) => assets.filter(u => row.chunks.some(c => u.includes(`/${c}-`)));
const bodyText = page => page.locator('body').innerText();
/** The hub box that holds the season's press: by its exact title where the row names one (the NHL's "Play"). */
const playBox = (page, row) => row.tile
  ? page.locator(`button:has(div.uppercase:text-is("${row.tile}"))`).first()
  : page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(row.play, 'i') }).first();

/** The NFL board holds Play past 53 until he cuts (its own rule): cut through the Roster box the way a player does,
    the biggest group's last man, two taps. */
async function cutToFit(page, row) {
  for (let n = 0; n < 8; n++) {
    const s = await readSave(page, row.key);
    if (s.league.teams[s.myTeam].players.length <= 53) break;
    const hub = page.locator('button:has-text("Hub")').first();
    if (await hub.count()) { await hub.click(); await wait(300); }
    await page.locator('button:has(div.uppercase:text-is("Roster"))').first().click();
    await wait(400);
    const groups = page.locator('[data-roster-group]:not([data-roster-group="practice"])');
    const sizes = await groups.evaluateAll(gs => gs.map(g => Number((/· (\d+)/.exec(g.textContent || '') || [])[1] || 0)));
    if (sizes.length) { await groups.nth(sizes.indexOf(Math.max(...sizes))).click(); await wait(300); }
    const arms = page.locator('button:not([disabled])').filter({ hasText: /^Cut, \$/ });
    if (!(await arms.count())) break;
    await arms.last().click();
    await wait(200);
    await page.locator('button:has-text("Cut him")').first().click();
    await wait(400);
  }
}
/** Round 1561: the NHL board holds Play over 15 until he waives (the line above the boxes says so): the Roster box's
    last man, two taps, until the line goes. */
async function waiveToFit(page) {
  for (let n = 0; n < 8 && await page.locator('[data-roster-limit]').count(); n++) {
    const hub = page.getByRole('button', { name: 'Hub', exact: true }).first();
    if (await hub.count()) { await hub.click(); await wait(300); }
    await page.locator('button:has(div.uppercase:text-is("Roster"))').first().click();
    await wait(400);
    const arms = page.locator('button:not([disabled])').filter({ hasText: /^Waive, \$/ });
    if (!(await arms.count())) break;
    await arms.last().click();
    await wait(200);
    await page.locator('button:has-text("Waive him")').first().click();
    await wait(400);
  }
  const hub = page.getByRole('button', { name: 'Hub', exact: true }).first();
  if (await hub.count()) { await hub.click(); await wait(300); }
}

/** The room on the arrival recap, the new club's re-sign box, then its draft, to the hub. */
async function answerAndDraft(page, row, tag) {
  const press = page.locator('[data-gm-press] button').first();
  if (await press.count()) { await press.click(); await wait(500); }
  const resign = page.locator('[data-gm-desk="tiles"] button:has(div.uppercase:text-is("Re-sign desk"))').first();
  say(await resign.count() === 1, `${tag}: the arrival recap holds the re-sign box`);
  if (await resign.count()) {
    await resign.click();
    const opened = await page.locator('[data-gm-desk="panel"]').first().waitFor({ timeout: 20000 }).then(() => true, () => false);
    say(opened, `${tag}: the new club's re-sign box opens`);
    await back(page);
  }
  await page.locator('button:has-text("Go to the draft")').first().click();
  await wait(700);
  for (let n = 0; n < 30 && (await readSave(page, row.key)).phase === 'draft'; n++) {
    const pick = page.getByText(/· age \d+/).first();
    if (await pick.count()) { await pick.click(); await wait(450); continue; }
    /* Round 1561: the NHL board's "Finish the draft and offseason" when no pick is left */
    const skip = page.locator('button').filter({ hasText: /no picks|without|Finish the draft/i }).first();
    if (!(await skip.count())) break;
    await skip.click(); await wait(600);
  }
  const cont = page.locator('button:has-text("Continue")').first();
  if (await cont.count()) { await cont.click(); await wait(600); }
  say((await readSave(page, row.key)).phase === 'hub', `${tag}: the new club's draft runs to the hub`);
}

/** A point into Ownership on a planted XP block (the GM level box), kept through a reload. */
async function spendAPoint(page, row, tag, w) {
  const s = await readSave(page, row.key);
  const xp = s.gm?.blocks?.xp;
  if (!xp) { say(false, `${tag}: the desk has no XP block after a graded season`); return; }
  s.gm.blocks.xp = { ...xp, xp: Math.max(xp.xp, 2000) };
  const had = xp.points.ownership ?? 0;
  await writeSave(page, row.key, s);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await careerBox(page, 'GM level').click();
  const tree = t => page.locator(`[data-gm-tree="${t}"] button`).first();
  await tree('ownership').waitFor({ timeout: 20000 });
  await wait(400);
  const panel = await page.locator('[data-gm-desk="panel"]').first().boundingBox();
  console.log(`  MEASURED ${tag}: the GM level panel is ${panel ? Math.round(panel.height) : 'no'} px tall at ${w}`);
  const xpH = await page.evaluate(() => { const el = document.querySelector('[data-gm-xp-desk]'); return el ? Math.round(el.getBoundingClientRect().height) : null; });
  console.log(`  MEASURED ${tag}: the GM level screen is ${xpH ?? 'no'} px tall at ${w}`);
  if (w === 390) say(!!panel && panel.height <= 1.5 * 844, `${tag}: the GM level panel fits one and a half screens at 390 (${panel ? Math.round(panel.height) : 0}px)`);
  await shot(page, `${row.sport}-${w}-gm-level`);
  await screenChecks(page, `${tag} GM level`);
  say(await tree('scouting').isDisabled(), `${tag}: a tree off the live list sells nothing`);
  await tree('ownership').click();
  await wait(400);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  say(((await readSave(page, row.key)).gm.blocks.xp.points.ownership ?? 0) === had + 1, `${tag}: a point spent in Ownership is in the save after a reload`);
}

/* ------------------------------ Walk A ------------------------------ */
async function walkA(row, w, h) {
  const tag = `${row.sport} ${w}x${h} A`;
  const { ctx, page, errors, assets } = await openPage(w, h);
  const old = await doomed(page, row);
  say(await page.locator('button:has-text("Take another front office")').count() === 0, `${tag}: no button on the recap deletes the save`);
  const call = page.locator('button:has-text("See who is calling")');
  say(await call.count() === 1, `${tag}: the recap offers who is calling`);
  say(chunkAsked(assets, row).length === 0, `${tag}: no career panel chunk is asked for before a box is tapped (${chunkAsked(assets, row).length})`, aimed('eagerpanel'));
  await call.first().click();
  await wait(700);
  const kept = await readSave(page, row.key);
  say(!!kept && kept.fired === true && kept.phase === 'fired', `${tag}: the save survives the firing, fired, on the out of work screen`, aimed('wipebutton'));
  if (!kept) { await ctx.close(); return; }
  say(await page.locator('[data-gm-out-of-work]').count() === 1, `${tag}: the out of work screen`);
  await shot(page, `${row.sport}-${w}-out-of-work`);
  await screenChecks(page, `${tag} out of work`);

  /* The Job market box on a slow connection: the holding box, then the panel, and nothing above it moves. */
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
  const y0 = await page.evaluate(() => window.scrollY);
  /* Read in the page the moment it is drawn: the holding box can be gone again before a second round trip. */
  const holdNow = () => page.waitForFunction(() => {
    const el = document.querySelector('[data-gm-panel-loading]'), panel = document.querySelector('[data-gm-desk="panel"]');
    return el && panel ? { h: el.getBoundingClientRect().height, top: panel.getBoundingClientRect().top + window.scrollY } : null;
  }, null, { timeout: 4000, polling: 'raf' }).then(r => r.jsonValue(), () => null);
  const eager = chunkAsked(assets, row).length > 0;
  const [, hold] = await Promise.all([careerBox(page, 'Job market').click(), holdNow()]);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.locator('[data-gm-market]').first().waitFor({ timeout: 20000 });
  await wait(300);
  const landed = await page.evaluate(() => {
    const el = document.querySelector('[data-gm-market]'), panel = document.querySelector('[data-gm-desk="panel"]');
    return el && panel ? { h: el.getBoundingClientRect().height, top: panel.getBoundingClientRect().top + window.scrollY } : null;
  });
  const y1 = await page.evaluate(() => window.scrollY);
  console.log(`  MEASURED ${tag}: holding box ${hold ? Math.round(hold.h) : 'none'}px, landed panel ${landed ? Math.round(landed.h) : 'none'}px`);
  if (eager) console.log(`  SKIP  ${tag}: the chunk was fetched before the tap, so there is nothing to hold (the chunk check above is the one aimed at that)`);
  else {
    say(!!hold, `${tag}: on a slow connection the holding box shows while the panel loads`);
    say(!!hold && !!landed && hold.h >= Math.min(220, landed.h) - 2, `${tag}: the holding box keeps the panel's room (${hold ? Math.round(hold.h) : 0}px for ${landed ? Math.round(landed.h) : 0}px)`, aimed('nofallback'));
    /* Round 1561 (finding 9): on the owner's phone the holding box is the screen it holds for, to 8 px (the floor in
       gmCareerDesk.tsx, GM_CAREER_FLOORS, measured here); at 320 and 1280 the check above and the one below hold */
    if (w === 390) say(!!hold && !!landed && Math.abs(hold.h - landed.h) <= 8, `${tag}: at 390 the holding box is the Job market's own height (${hold ? Math.round(hold.h) : 0}px for ${landed ? Math.round(landed.h) : 0}px)`, aimed('nofallback'));
  }
  say(!hold || !landed || (hold.top === landed.top && y0 === y1), `${tag}: the page does not move when the panel lands (top ${hold?.top} to ${landed?.top}, scroll ${y0} to ${y1})`);
  say(chunkAsked(assets, row).length >= 1, `${tag}: the Job market chunk is asked for on the tap`);
  await shot(page, `${row.sport}-${w}-market`);
  await screenChecks(page, `${tag} market`);
  const ids = await page.locator('[data-gm-offer]').evaluateAll(bs => bs.map(b => b.getAttribute('data-gm-offer')));
  say(ids.length >= 1 && !ids.includes(old), `${tag}: somebody calls, and never the club that let him go (${ids.join(', ')})`);
  if (!ids.length) { await ctx.close(); return; }

  /* An offer opened, armed, taken. */
  await page.locator(`[data-gm-offer="${ids[0]}"]`).click();
  await wait(300);
  await page.locator('[data-gm-take]').click();
  await wait(300);
  say(await page.locator('[data-gm-arm="take"]').count() === 1 && (await readSave(page, row.key)).myTeam === old, `${tag}: one tap only arms the offer`);
  await shot(page, `${row.sport}-${w}-armed`);
  await page.locator('[data-gm-take]').click();
  await wait(1200);
  const took = await readSave(page, row.key);
  say(took.myTeam === ids[0] && took.trust === 60 && took.fired === false && took.phase === 'recap', `${tag}: the second tap takes the job (${took.myTeam}, trust ${took.trust}, ${took.phase})`);
  const recap = await bodyText(page);
  say(recap.includes('You take over the') && await page.locator('[data-verdict-reveal] .cm-confetti').count() === 0, `${tag}: the arrival recap says who he takes over, with no confetti`);
  await wait(1800); /* the verdict card and the room rise in over about 1.4 s */
  await shot(page, `${row.sport}-${w}-arrival`);
  await answerAndDraft(page, row, tag);
  await shot(page, `${row.sport}-${w}-hub`);
  for (const t of ['Career', 'GM level']) say(await careerBox(page, t).count() === 1, `${tag}: the hub has the ${t} box`);
  await careerBox(page, 'Career').click();
  await page.locator('[data-gm-desk="panel"]').first().waitFor({ timeout: 20000 });
  await wait(500);
  /* Round 1561 (finding 9): the landed screen's own height, the number its holding box's floor is set from */
  const careerH = await page.evaluate(() => { const el = document.querySelector('[data-gm-career]'); return el ? Math.round(el.getBoundingClientRect().height) : null; });
  console.log(`  MEASURED ${tag}: the Career screen is ${careerH ?? 'no'} px tall at ${w}`);
  await shot(page, `${row.sport}-${w}-career`);
  await screenChecks(page, `${tag} career`);
  await back(page);
  await spendAPoint(page, row, tag, w);
  /* His new club's draft can take it past the limit, and the board holds Play until he gets under it (its own
     rule): the row's own way, as a player does it (cutToFit, waiveToFit). */
  await row.trim(page, row);
  const hubBack = page.locator('button:has-text("Hub")').first();
  if (await hubBack.count()) { await hubBack.click(); await wait(300); }
  const before = row.period(await readSave(page, row.key));
  await playBox(page, row).click();
  await wait(400);
  await page.locator(`button:has-text("${row.one}")`).last().click();
  await wait(900);
  say(row.period(await readSave(page, row.key)) === before + 1, `${tag}: a ${row.unit} plays at the new club`);
  say(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/** A record planted on the fired save (the host's own block shape); true when the Job market then reads as `want`. */
async function plantUntil(page, row, want) {
  const s0 = await readSave(page, row.key);
  const season = s0.league.season;
  const tries = want === 'open'
    ? [['overachieved', 'met', 'missed'], ['met', 'met', 'missed'], ['title', 'met', 'missed']].flatMap(g => [1, 2, 3, 4].map(t => [g, t, 0]))
    : [['badly', 'badly', 'badly'], ['missed', 'badly'], ['badly']].flatMap(g => [1, 2, 3, 4].flatMap(t => [1, 2].map(o => [g, t, o])));
  for (const [grades, tier, out] of tries) {
    const s = await readSave(page, row.key);
    const stint = { team: s.myTeam, tier, from: season - out - grades.length + 1, grades, ended: 'fired' };
    s.gm = { ...(s.gm ?? { v: 1, blocks: {} }), blocks: { ...(s.gm?.blocks ?? {}), seat: { v: 1, career: { version: 1, stints: [stint], seasonsOut: out }, last: season - out } } };
    s.seasonsPlayed = grades.length;
    s.titles = grades.filter(g => g === 'title').length;
    await writeSave(page, row.key, s);
    await page.reload({ waitUntil: 'networkidle' });
    await wait(700);
    await careerBox(page, 'Job market').click();
    await page.locator('[data-gm-market]').first().waitFor({ timeout: 20000 });
    await wait(200);
    const hit = want === 'open' ? await page.locator('[data-gm-sit-out]').count() === 1 : await page.locator('[data-gm-market="closed"]').count() === 1;
    if (hit) return true;
  }
  return false;
}

/* ------------------------------ Walk B ------------------------------ */
async function walkB(row, w, h) {
  const tag = `${row.sport} ${w}x${h} B`;
  const { ctx, page, errors } = await openPage(w, h);
  await doomed(page, row);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(500);
  say(await plantUntil(page, row, 'open'), `${tag}: a record whose next year is open draws the stay out button`);
  const before = await readSave(page, row.key);
  await page.locator('[data-gm-sit-out]').click();
  await wait(300);
  say(await page.locator('[data-gm-arm="sit"]').count() === 1 && (await readSave(page, row.key)).league.season === before.league.season, `${tag}: one tap only arms the year out`);
  await shot(page, `${row.sport}-${w}-sit-armed`);
  const t0 = Date.now();
  await page.locator('[data-gm-sit-out]').click();
  await page.waitForFunction(([k, n]) => JSON.parse(localStorage.getItem(k) || '{}').league?.season === n, [row.key, before.league.season + 1], { timeout: 30000 });
  console.log(`  MEASURED ${tag}: the year out took ${Date.now() - t0} ms from the second tap to the save`);
  await wait(500);
  const s = await readSave(page, row.key);
  say(s.phase === 'fired' && s.fired === true && s.seasonsPlayed === before.seasonsPlayed && s.titles === before.titles
    && s.league.champions.length === before.league.champions.length + 1 && s.gm.blocks.seat.career.seasonsOut === before.gm.blocks.seat.career.seasonsOut + 1,
  `${tag}: the league is a season on with one more champion, his counters as they were, one more year out`);
  say((await bodyText(page)).includes('Out of work, 1 season'), `${tag}: the card says the year out`);
  await shot(page, `${row.sport}-${w}-year-out`);
  await screenChecks(page, `${tag} year out`);
  say(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* ------------------------------ Walk C ------------------------------ */
async function walkC(row, w, h) {
  const tag = `${row.sport} ${w}x${h} C`;
  const { ctx, page, errors } = await openPage(w, h);
  await doomed(page, row);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(500);
  say(await plantUntil(page, row, 'closed'), `${tag}: a closed market is found`);
  say(await page.locator('[data-gm-sit-out]').count() === 0, `${tag}: a closed market draws no stay out button`);
  await shot(page, `${row.sport}-${w}-closed`);
  await back(page);
  await answerConsent(page);
  const link = page.locator('button:has-text("Start a new front office")').first();
  await link.click();
  await wait(300);
  say(await page.locator('[data-gm-arm="restart"]').count() === 1 && !!(await readSave(page, row.key)), `${tag}: one tap on the new front office link only arms it`);
  await link.click();
  await wait(900);
  say(!(await readSave(page, row.key)) && (await bodyText(page)).includes(row.picker), `${tag}: the second tap deletes the save and opens the picker`);
  say(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* ------------------------------ Walk D ------------------------------ */
async function walkD(row, w, h) {
  const tag = `${row.sport} ${w}x${h} D`;
  const { ctx, page, errors } = await openPage(w, h);
  await doomed(page, row);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(500);
  for (const title of ['Job market', 'Career', 'GM level']) {
    await careerBox(page, title).click();
    const help = page.locator('[data-gm-desk="panel"] button[aria-label^="How"]').first();
    await help.waitFor({ timeout: 20000 });
    await help.click();
    await wait(300);
    say(await help.getAttribute('aria-expanded') === 'true', `${tag}: the ${title} box's ? opens its rules`);
    await screenChecks(page, `${tag} ${title} with its rules open`);
    await back(page);
  }
  say(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* ------------------------------ Walk E ------------------------------ */
/* Round 1550: the career kit (src/components/front-office/nflCareerKit.ts) on a slow connection. The pick screen and
   a season being played never ask for it; the last week asks, its press waits for it, then closes the season; a
   reload on the fired screen holds, then draws, the page not moving; the market and a seat taken; the hub's boxes
   drawn without it after a reload, and the GM level box then holding until it lands. The line is throttled as in
   Walk A and the kit's own chunk is held back a further 1.5 s, so each holding state is there to be seen rather
   than raced. 390 and 1280 (the brief's two sizes). */
async function walkE(row, w, h) {
  if (w === 320) return;
  const tag = `${row.sport} ${w}x${h} E`;
  const { ctx, page, errors, assets } = await openPage(w, h);
  const kitAsked = (from = 0) => assets.slice(from).filter(u => u.includes(`/${row.kit}-`)).length;
  let kitDelay = 0;
  await page.route(u => u.pathname.includes(`/${row.kit}-`), async r => { if (kitDelay) await wait(kitDelay); await r.fallback(); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const slow = on => cdp.send('Network.emulateNetworkConditions', on
    ? { offline: false, latency: 300, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 }
    : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  /* the pick screen, a first visit */
  await page.goto(`${BASE}${row.route}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  say(kitAsked() === 0, `${tag}: the pick screen does not ask for the career kit (${kitAsked()} asks)`, aimed('eagerkit'));
  /* Under eagerkit every later check of this walk reads the same eager fetch again (measured on r1550-s3w: four more
     went red for it, and two more for the stylesheet the mutated chunk's bare import never waits for), so the walk
     stops at the check aimed at it. */
  if (CONTROL === 'eagerkit') { await ctx.close(); return; }
  await page.locator('.grid button').first().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', row.key, { timeout: 30000 });
  await wait(600);
  say(kitAsked() >= 1, `${tag}: a new front office brings the kit with its league`);

  /* a season being played, reloaded: the hub and its career boxes, no kit */
  let s = await readSave(page, row.key);
  row.mid(s);
  await writeSave(page, row.key, s);
  let n0 = assets.length;
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  for (const t of ['Career', 'GM level']) say(await careerBox(page, t).count() === 1, `${tag}: mid season, the hub draws the ${t} box without the kit`);
  /* Round 1561: under the roster limit here, mid season, so the last round's press below waits for the kit alone */
  await row.trim(page, row);
  await playBox(page, row).click();
  await wait(600);
  say(kitAsked(n0) === 0, `${tag}: a season being played does not ask for the kit (${kitAsked(n0)} asks)`);

  /* the last week of a doomed season, on a slow line: the press waits for the kit, then closes the season */
  s = await readSave(page, row.key);
  s.trust = 5;
  s.mandate = { tier: 'title', text: row.ask, winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  row.last(s);
  await writeSave(page, row.key, s);
  await slow(true);
  kitDelay = 1500;
  n0 = assets.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await answerConsent(page);
  const playTile = playBox(page, row);
  await playTile.waitFor({ timeout: 90000 });
  await playTile.click();
  const final = page.locator(`button:has-text("${row.final}")`).last();
  await final.waitFor({ timeout: 60000 });
  const waited = await final.isDisabled();
  say(waited, `${tag}: on a slow line the last week's press waits for the kit`);
  await page.waitForFunction(t => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes(t) && !b.disabled), row.final, { timeout: 90000 });
  say(kitAsked(n0) >= 1, `${tag}: the last week asks for the kit`);
  await final.click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, row.key, { timeout: 60000 });
  await wait(1600);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(700);
  say((await readSave(page, row.key)).phase === 'fired', `${tag}: fired, on the out of work screen`);

  /* a reload on the fired screen: the holding box, then the screen where it stood (from the top, so the browser's
     own scroll restoring on a reload has nothing to restore) */
  await page.evaluate(() => window.scrollTo(0, 0));
  n0 = assets.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  const hold = await page.waitForFunction(() => {
    const el = document.querySelector('[data-gm-panel-loading]');
    return el && !document.querySelector('[data-gm-out-of-work]') ? { top: el.getBoundingClientRect().top + window.scrollY, h: el.getBoundingClientRect().height, y: window.scrollY } : null;
  }, null, { timeout: 90000, polling: 'raf' }).then(r => r.jsonValue(), () => null);
  say(!!hold, `${tag}: a reload on the fired screen holds while the kit is on its way`);
  await page.locator('[data-gm-out-of-work]').first().waitFor({ timeout: 90000 });
  await wait(300);
  const out = await page.evaluate(() => ({ top: document.querySelector('[data-gm-out-of-work]').getBoundingClientRect().top + window.scrollY, y: window.scrollY }));
  console.log(`  MEASURED ${tag}: fired reload holding box ${hold ? Math.round(hold.h) : 'none'}px at ${hold ? Math.round(hold.top) : '-'}, out of work screen at ${Math.round(out.top)}, scroll ${out.y}`);
  say(!!hold && Math.abs(hold.top - out.top) < 2 && out.y === hold.y,`${tag}: the out of work screen lands where the holding box stood, the page not moving`);
  say(kitAsked(n0) >= 1, `${tag}: the fired screen asks for the kit`);
  await shot(page, `${row.sport}-${w}-slow-out-of-work`);
  await screenChecks(page, `${tag} out of work`);

  /* the market and a seat taken, still on the slow line */
  await careerBox(page, 'Job market').click();
  await page.locator('[data-gm-market]').first().waitFor({ timeout: 90000 });
  await wait(300);
  const ids = await page.locator('[data-gm-offer]').evaluateAll(bs => bs.map(b => b.getAttribute('data-gm-offer')));
  say(ids.length >= 1, `${tag}: the market opens on the slow line, ${ids.length} offer(s)`);
  if (!ids.length) { await ctx.close(); return; }
  await page.locator(`[data-gm-offer="${ids[0]}"]`).click();
  await wait(300);
  await page.locator('[data-gm-take]').click();
  await wait(300);
  await page.locator('[data-gm-take]').click();
  await wait(1200);
  const took = await readSave(page, row.key);
  say(took.myTeam === ids[0] && took.phase === 'recap' && took.fired === false, `${tag}: a seat taken on the slow line (${took.myTeam}, ${took.phase})`);
  await answerAndDraft(page, row, tag);

  /* the new club's hub, reloaded: the boxes without the kit, then the GM level box holding until it lands */
  n0 = assets.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await careerBox(page, 'GM level').waitFor({ timeout: 90000 });
  await wait(600);
  say(kitAsked(n0) === 0, `${tag}: the new club's hub draws its boxes without asking for the kit`);
  const [, boxHold] = await Promise.all([careerBox(page, 'GM level').click(), page.waitForFunction(() => {
    const panel = document.querySelector('[data-gm-desk="panel"]');
    const held = panel && panel.querySelector('[data-gm-panel-loading]');
    return held ? { key: panel.getAttribute('data-gm-panel'), h: held.getBoundingClientRect().height } : null;
  }, null, { timeout: 8000, polling: 'raf' }).then(r => r.jsonValue(), () => null)]);
  say(boxHold?.key === 'xp', `${tag}: the GM level box holds, under its own header, while the kit is on its way (${boxHold?.key ?? null})`);
  await page.locator('[data-gm-tree="ownership"] button').first().waitFor({ timeout: 90000 });
  /* Round 1561 (finding 9): the board's own holding box (GmCareerKitHolding, before the kit) stands at the floor the
     panel's holding box reads, so on the owner's phone it is the GM level screen's height, to 8 px */
  const xpLanded = await page.evaluate(() => { const el = document.querySelector('[data-gm-xp-desk]'); return el ? el.getBoundingClientRect().height : null; });
  console.log(`  MEASURED ${tag}: the GM level holding box before the kit ${boxHold ? Math.round(boxHold.h) : 'none'}px, the landed screen ${xpLanded ? Math.round(xpLanded) : 'none'}px`);
  if (w === 390) say(!!boxHold && !!xpLanded && Math.abs(boxHold.h - xpLanded) <= 8, `${tag}: at 390 the holding box before the kit is the GM level screen's own height (${boxHold ? Math.round(boxHold.h) : 0}px for ${xpLanded ? Math.round(xpLanded) : 0}px)`, aimed('nofallback'));
  say(kitAsked(n0) >= 1, `${tag}: the GM level box asks for the kit`);
  await shot(page, `${row.sport}-${w}-slow-gm-level`);
  await screenChecks(page, `${tag} GM level`);

  /* Round 1561 (closing check, finding 10, critic 14): the Career box's two holding stages. The hub reloaded again on
     the slow line (from the top, as above; routing turns the browser's cache off, so the kit and the Career screen's
     chunk are both fetched anew), and the Career box opened before the kit: the board's own holding box
     (GmCareerKitHolding), then, once the kit is here, the screen's own holding box while its chunk loads (when the
     line is slow enough to show one), then the screen. Every frame is read in the page, so neither stage is raced;
     a stage is the panel element it stood in (the mount draws a new one when the kit lands). On the owner's phone
     every holding frame is the Career screen's own height to 8 px (GM_CAREER_FLOORS, career 184); at both sizes the
     screen lands where its holding box stood, and the last holding frame's scroll is the landed screen's (to 2 px). */
  await back(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  n0 = assets.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await careerBox(page, 'Career').waitFor({ timeout: 90000 });
  await wait(600);
  say(kitAsked(n0) === 0, `${tag}: reloaded again, the hub draws the Career box without asking for the kit`);
  await page.evaluate(() => {
    const seen = [], stageOf = new WeakMap();
    let panels = 0;
    window.__careerHolds = seen;
    const tick = () => {
      const panel = document.querySelector('[data-gm-desk="panel"]');
      if (panel && !stageOf.has(panel)) stageOf.set(panel, ++panels);
      const held = panel && panel.querySelector('[data-gm-panel-loading]');
      if (held) seen.push({ stage: stageOf.get(panel), key: panel.getAttribute('data-gm-panel'), h: held.getBoundingClientRect().height, top: panel.getBoundingClientRect().top + window.scrollY, y: window.scrollY });
      if (!document.querySelector('[data-gm-career]')) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await careerBox(page, 'Career').click();
  await page.locator('[data-gm-career]').first().waitFor({ timeout: 90000 });
  await wait(300);
  const { seen, landedC } = await page.evaluate(() => {
    const el = document.querySelector('[data-gm-career]'), panel = el && el.closest('[data-gm-desk="panel"]');
    return { seen: window.__careerHolds || [], landedC: el && panel ? { h: el.getBoundingClientRect().height, top: panel.getBoundingClientRect().top + window.scrollY, y: window.scrollY } : null };
  });
  const firstStage = seen.length ? seen[0].stage : null;
  const beforeKit = seen.filter(f => f.stage === firstStage), afterKit = seen.filter(f => f.stage !== firstStage);
  const span = fs => (fs.length ? `${Math.min(...fs.map(f => f.h)).toFixed(1)} to ${Math.max(...fs.map(f => f.h)).toFixed(1)}px over ${fs.length} frame(s)` : 'not seen');
  console.log(`  MEASURED ${tag}: the Career box before the kit ${span(beforeKit)}, its screen's own holding box ${span(afterKit)}, the landed screen ${landedC ? landedC.h.toFixed(1) : 'none'}px, scroll ${seen.length ? seen[seen.length - 1].y : '-'} to ${landedC?.y ?? '-'}`);
  say(beforeKit.length > 0 && beforeKit.every(f => f.key === 'career'), `${tag}: the Career box holds, under its own header, while the kit is on its way (${beforeKit.length} frame(s), ${beforeKit[0]?.key ?? null})`);
  if (w === 390) say(seen.length > 0 && !!landedC && seen.every(f => Math.abs(f.h - landedC.h) <= 8), `${tag}: at 390 every holding frame of the Career box is the Career screen's own height (${span(seen)} for ${landedC ? Math.round(landedC.h) : 0}px)`, aimed('nofallback'));
  const lastHold = seen[seen.length - 1];
  /* the scroll to 2 px, as the top: on r1561-fz2 the 390 rows went 202 to 201 and 184 to 183 with the top unmoved
     (443, 424). The landed screen is a fraction of a pixel under its whole pixel floor and, the page sitting mid way
     down, the browser's scroll anchoring takes that fraction off the scroll; at 1280 the page sits at the top, 0 to 0.
     Under nofallback the same check reads 64 to 269. */
  say(!!lastHold && !!landedC && seen.every(f => Math.abs(f.top - landedC.top) < 2) && Math.abs(lastHold.y - landedC.y) < 2, `${tag}: the Career screen lands where its holding box stood, the page not moving (top ${lastHold ? Math.round(lastHold.top) : '-'} to ${landedC ? Math.round(landedC.top) : '-'}, scroll ${lastHold?.y ?? '-'} to ${landedC?.y ?? '-'})`);
  say(kitAsked(n0) >= 1, `${tag}: the Career box asks for the kit`);
  await shot(page, `${row.sport}-${w}-slow-career`);
  await screenChecks(page, `${tag} Career`);
  await slow(false);
  say(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

for (const row of ROUTES) {
  for (const [w, h] of SIZES) {
    console.log(`${row.route} at ${w} by ${h}`);
    for (const walk of [walkA, walkB, walkC, walkD, walkE].filter(fn => WALKS.includes(fn.name.slice(-1)))) {
      try { await walk(row, w, h); } catch (e) { say(false, `${row.sport} ${w}x${h} ${walk.name}: the walk could not finish (${String(e).split('\n')[0].slice(0, 160)})`); }
    }
  }
}
await browser.close();
const code = verdict('playGmCareer', CONTROL ? proof : undefined, { minGuarded: 1 });
if (code === 0 && !CONTROL) console.log(`playGmCareer: green. ${ROUTES.length} board(s) (${ROUTES.map(r => r.sport).join(", ")}), ${SIZES.length} sizes, four walks each and the slow kit walk at 390 and 1280.`);
process.exit(code);
