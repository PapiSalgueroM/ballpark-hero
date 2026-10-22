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
 *   nofallback  the holding box loses its minimum height (the jump check red)
 *   eagerpanel  the Job market chunk is asked for when the board loads (the
 *               chunk check red)
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

const ROUTES = [
  {
    sport: 'nfl', route: '/front-office', key: 'front-office-save-v1', play: 'This week', final: 'Play the final week',
    ask: 'Win the Super Bowl. Anything less is a failed season upstairs.', chunks: ['GmJobMarketPanel', 'GmCareerPanel', 'GmXpDeskPanel'],
  },
];
const SIZES = [[320, 640], [390, 844], [1280, 900]].filter(([w]) => !ONLY_SIZE || String(w) === ONLY_SIZE);

const MUTATIONS = {
  wipebutton: [{ label: 'wipebutton', find: /onClick:\(\)=>[\w$]+\("fired"\)/g, replace: 'onClick:()=>{localStorage.removeItem("front-office-save-v1")}' }],
  nofallback: [{ label: 'nofallback', find: /"data-gm-panel-loading":!0,style:\{minHeight:/g, replace: '"data-gm-panel-loading":!0,style:{minHeightOff:' }],
  eagerpanel: [{ label: 'eagerpanel', find: /^([\s\S]*?)(import\("(\.\/GmJobMarketPanel-[\w-]+\.js)"\))/, replace: (all, pre, imp, file) => `import("${file}");${pre}${imp}` }],
};
if (CONTROL && !MUTATIONS[CONTROL]) { console.error(`PLAY_GM_CAREER_CONTROL=${CONTROL} is not a control of this walk (${Object.keys(MUTATIONS).join(', ')})`); process.exit(2); }
const { say, verdict } = controlledChecks(CONTROL);
/** A check is aimed at one control: under that control it must go red, under any other it must stay green. */
const aimed = name => CONTROL === name;
const WALKS = (process.env.PLAY_GM_CAREER_WALKS || 'ABCD').toUpperCase();
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
  s.league.week = 17;
  await writeSave(page, row.key, s);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(row.play, 'i') }).first().click();
  await wait(400);
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
    const skip = page.locator('button').filter({ hasText: /no picks|without/i }).first();
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
  await shot(page, `${row.sport}-${w}-career`);
  await screenChecks(page, `${tag} career`);
  await back(page);
  await spendAPoint(page, row, tag, w);
  const before = (await readSave(page, row.key)).league.week;
  await page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(row.play, 'i') }).first().click();
  await wait(400);
  await page.locator('button:has-text("Play Week")').last().click();
  await wait(900);
  say((await readSave(page, row.key)).league.week === before + 1, `${tag}: a week plays at the new club`);
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
  say(!(await readSave(page, row.key)) && (await bodyText(page)).includes('Take over a front office'), `${tag}: the second tap deletes the save and opens the picker`);
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

for (const row of ROUTES) {
  for (const [w, h] of SIZES) {
    console.log(`${row.route} at ${w} by ${h}`);
    for (const walk of [walkA, walkB, walkC, walkD].filter(fn => WALKS.includes(fn.name.slice(-1)))) {
      try { await walk(row, w, h); } catch (e) { say(false, `${row.sport} ${w}x${h} ${walk.name}: the walk could not finish (${String(e).split('\n')[0].slice(0, 160)})`); }
    }
  }
}
await browser.close();
const code = verdict('playGmCareer', CONTROL ? proof : undefined, { minGuarded: 1 });
if (code === 0 && !CONTROL) console.log(`playGmCareer: green. ${ROUTES.length} board, ${SIZES.length} sizes, four walks each.`);
process.exit(code);
