// Reviewer walk for Round 1561 (runner only, #!serve #!playwright): node .rc/x/walk.mjs
// The NHL Front Office played the way a player does, Supabase aborted. Walk P: a whole honest season at 390 then the
// career boxes and the "?" on season two. Walk F: a doomed season to the firing, the out of work screen, its three
// boxes, a seat taken, the arrival recap, its draft, at 390 and 1280, reduced motion on and off. Walk Y: a year out.
// Screenshots and a findings log go to RC_OUT. Exit 1 on any hard failure (a page error, overflow, a stuck screen).
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk-out';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'nhl-front-office-save-v1';
const ROUTE = '/nhl-front-office';
const ASK = 'Win the Stanley Cup. Anything less is a failed season upstairs.';
const wait = ms => new Promise(r => setTimeout(r, ms));
const notes = [];
let hard = 0;
const note = (ok, msg) => { notes.push(`${ok ? 'ok  ' : 'BAD '} ${msg}`); if (!ok) hard += 1; console.log(`${ok ? 'ok  ' : 'BAD '} ${msg}`); };
const info = msg => { notes.push(`info ${msg}`); console.log(`info ${msg}`); };

const browser = await chromium.launch();

async function openPage(w, h, reduce) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const writeSave = (page, s) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
const shot = async (page, name) => {
  const [w, h] = await page.evaluate(() => [window.innerWidth, Math.min(2200, document.documentElement.scrollHeight)]);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, clip: { x: 0, y: 0, width: w, height: h } });
};
/** Wide pages, overlapping visible text leaves inside the game column, and animations still running. */
async function looks(page, at) {
  const r = await page.evaluate(() => {
    const wide = document.documentElement.scrollWidth - window.innerWidth;
    const main = document.querySelector('#dukb-main') || document.body;
    const leaves = [...main.querySelectorAll('*')].filter(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
    }).slice(0, 400);
    const over = [];
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
      const x = Math.min(p.right, q.right) - Math.max(p.left, q.left), y = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (x > 4 && y > 4) over.push(`"${a.textContent.trim().slice(0, 24)}" x "${b.textContent.trim().slice(0, 24)}" ${Math.round(x)}x${Math.round(y)}`);
    }
    const anim = [...main.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el);
      return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.02 && cs.animationPlayState === 'running';
    }).map(el => `${getComputedStyle(el).animationName}@${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ').filter(c => c.startsWith('cm-') || c.startsWith('animate')).join('.') || el.tagName}`);
    const cut = [...main.querySelectorAll('p, span, button, h1, h2, h3, div')].filter(el => {
      const cs = getComputedStyle(el);
      return (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim().length > 0 && el.clientWidth > 0;
    }).map(el => el.textContent.trim().slice(0, 30));
    return { wide, over: over.slice(0, 6), anim: [...new Set(anim)].slice(0, 12), cut: cut.slice(0, 6) };
  });
  note(r.wide <= 0, `${at}: nothing wider than the screen (${r.wide}px over)`);
  note(r.over.length === 0, `${at}: no overlapping text (${r.over.join('; ') || 'none'})`);
  if (r.cut.length) info(`${at}: clipped text candidates: ${r.cut.join(' | ')}`);
  return r;
}
const tile = (page, title) => page.locator(`button:has(div.uppercase:text-is("${title}"))`).first();
const hubBack = async page => { const b = page.getByRole('button', { name: 'Hub', exact: true }).first(); if (await b.count()) { await b.click(); await wait(300); } };
async function waiveToFit(page) {
  for (let n = 0; n < 8 && await page.locator('[data-roster-limit]').count(); n++) {
    await hubBack(page);
    await tile(page, 'Roster').click(); await wait(400);
    const arms = page.locator('button:not([disabled])').filter({ hasText: /^Waive, \$/ });
    if (!(await arms.count())) break;
    await arms.last().click(); await wait(200);
    await page.locator('button:has-text("Waive him")').first().click(); await wait(400);
  }
  await hubBack(page);
}
async function start(page) {
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('.grid button').first().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', KEY, { timeout: 30000 });
  await wait(700);
}
const answerPress = async page => { const b = page.locator('[data-gm-press] button').first(); if (await b.count()) { await b.click(); await wait(500); return true; } return false; };
/** Every period of the season through the Play box, the last press playing the playoffs, until the recap. */
async function playSeason(page, tag) {
  await waiveToFit(page);
  await tile(page, 'Play').click(); await wait(400);
  for (let guard = 0; guard < 30; guard++) {
    const s = await readSave(page);
    if (s.phase !== 'hub') return true;
    const fin = page.locator('button:has-text("Final stretch + playoffs")');
    if (await fin.count()) {
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Final stretch') && !b.disabled), null, { timeout: 30000 }).catch(() => {});
      await fin.last().click(); await wait(1500); continue;
    }
    const press = page.locator(`button:has-text("Play Round ${s.league.round}")`).last();
    if (!(await press.count())) { note(false, `${tag}: no Play Round ${s.league.round} button`); return false; }
    if (await press.isDisabled()) { note(false, `${tag}: Play Round ${s.league.round} is disabled`); await shot(page, `${tag}-stuck`); return false; }
    await press.click(); await wait(250);
  }
  note(false, `${tag}: the season did not close in 30 presses`);
  return false;
}
async function draftToHub(page, tag) {
  await page.locator('button:has-text("Go to the draft")').first().click(); await wait(700);
  for (let n = 0; n < 30 && (await readSave(page)).phase === 'draft'; n++) {
    const pick = page.getByText(/· age \d+/).first();
    if (await pick.count()) { await pick.click(); await wait(400); continue; }
    const fin = page.locator('button').filter({ hasText: /Finish the draft/i }).first();
    if (!(await fin.count())) break;
    await fin.click(); await wait(600);
  }
  const cont = page.locator('button:has-text("Continue")').first();
  if (await cont.count()) { await cont.click(); await wait(500); }
  note((await readSave(page)).phase === 'hub', `${tag}: the draft runs to the hub`);
}
/** Doomed: trust 5 under a title ask, his men at 60, the last round; one press fires him. */
async function doom(page) {
  const s = await readSave(page);
  s.trust = 5;
  s.mandate = { tier: 'title', text: ASK, winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  s.league.round = 20;
  await writeSave(page, s);
  await page.reload({ waitUntil: 'networkidle' }); await wait(900);
  await answerConsent(page);
  await waiveToFit(page);
  await tile(page, 'Play').click(); await wait(400);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Final stretch') && !b.disabled), null, { timeout: 30000 });
  await page.locator('button:has-text("Final stretch + playoffs")').last().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, KEY, { timeout: 30000 });
  await wait(1600);
  return s.myTeam;
}

/* Walk P: an honest season at 390, the recap, the draft, season two's career boxes and the "?" */
async function walkP() {
  const tag = 'p390';
  const { ctx, page, errors } = await openPage(390, 844, false);
  await start(page);
  await shot(page, `${tag}-hub-start`);
  await looks(page, `${tag} hub start`);
  note(await answerPress(page), `${tag}: the introduction presser is there to answer`);
  if (await playSeason(page, `${tag} s1`)) {
    await wait(1200);
    await shot(page, `${tag}-recap`);
    await looks(page, `${tag} recap`);
    const txt = await page.locator('#dukb-main').innerText();
    info(`${tag} recap xp line: ${(await page.locator('[data-gm-xp-recap]').allInnerTexts()).join(' | ') || 'none'}`);
    note(/Stanley Cup/.test(txt), `${tag}: the recap names the Cup`);
    await answerPress(page);
    await draftToHub(page, tag);
    await answerPress(page);
    await shot(page, `${tag}-hub-s2`);
    for (const t of ['Career', 'GM level']) {
      await hubBack(page);
      const box = tile(page, t);
      note(await box.count() === 1, `${tag}: season two's hub has the ${t} box`);
      if (!(await box.count())) continue;
      await box.click(); await wait(1200);
      const playVisible = await tile(page, 'Play').isVisible().catch(() => false);
      note(!playVisible, `${tag}: the ${t} screen takes the hub (the board's Play box is not drawn under it)`);
      await shot(page, `${tag}-${t === 'Career' ? 'career' : 'gmlevel'}`);
      await looks(page, `${tag} ${t}`);
      await hubBack(page);
    }
    const help = page.getByRole('button', { name: 'How to play' }).first();
    if (await help.count()) {
      await help.click(); await wait(800);
      const ht = await page.locator('body').innerText();
      note(/Getting fired does not end the save/.test(ht), `${tag}: the ? panel carries the career rules`);
      note(/save goes on/.test(ht), `${tag}: the ? panel's hockey rule says the save goes on`);
      note(!/ends the save/i.test(ht.replace(/does not end the save/g, '')), `${tag}: no rule left saying firing ends the save`);
      await shot(page, `${tag}-help`);
      await page.keyboard.press('Escape'); await wait(300);
    } else note(false, `${tag}: no How to play button`);
  }
  note(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* Walk R: a season reloaded mid way (the kit not on the page), then played on: every round's press must be live */
async function walkR() {
  const tag = 'r390';
  const { ctx, page, errors } = await openPage(390, 844, false);
  await start(page);
  await answerPress(page);
  await waiveToFit(page);
  await tile(page, 'Play').click(); await wait(400);
  for (let i = 0; i < 3; i++) { const s = await readSave(page); await page.locator(`button:has-text("Play Round ${s.league.round}")`).last().click(); await wait(300); }
  const before = (await readSave(page)).league.round;
  await page.reload({ waitUntil: 'networkidle' }); await wait(900);
  await answerConsent(page);
  await waiveToFit(page);
  await tile(page, 'Play').click(); await wait(600);
  const press = page.locator(`button:has-text("Play Round ${before}")`).last();
  const live = (await press.count()) === 1 && !(await press.isDisabled());
  note(live, `${tag}: after a reload mid season the Play Round ${before} press is live`);
  if (live) { await press.click(); await wait(600); }
  note((await readSave(page)).league.round === before + 1, `${tag}: the round plays after the reload (${before} to ${(await readSave(page)).league.round})`);
  await shot(page, `${tag}-after-reload`);
  note(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

const careerTile = (page, t) => page.locator(`[data-gm-desk="tiles"] button:has(div.uppercase:text-is("${t}"))`).first();
const panelBack = async page => { const b = page.locator('[data-gm-desk="panel"] button:has-text("Hub")').first(); if (await b.count()) { await b.click(); await wait(400); } };

/* Walk F: fired, the out of work screen, its three boxes, a seat taken, the arrival recap, its draft */
async function walkF(w, h, reduce) {
  const tag = `f${w}${reduce ? '-rm' : ''}`;
  const { ctx, page, errors } = await openPage(w, h, reduce);
  await start(page);
  await answerPress(page);
  const old = await doom(page);
  await shot(page, `${tag}-recap-fired`);
  const r1 = await looks(page, `${tag} fired recap`);
  if (reduce) note(r1.anim.length === 0, `${tag}: reduced motion, nothing animates on the fired recap (${r1.anim.join(', ') || 'none'})`);
  else info(`${tag}: animations on the fired recap: ${r1.anim.join(', ') || 'none'}`);
  const see = page.locator('button:has-text("See who is calling")');
  note(await see.count() === 1, `${tag}: the fired recap offers See who is calling`);
  if (!(await see.count())) { await ctx.close(); return; }
  await see.click(); await wait(1500);
  note(await page.locator('[data-gm-out-of-work]').count() === 1, `${tag}: the out of work screen draws`);
  await shot(page, `${tag}-out-of-work`);
  const r2 = await looks(page, `${tag} out of work`);
  if (reduce) note(r2.anim.length === 0, `${tag}: reduced motion, nothing animates out of work (${r2.anim.join(', ') || 'none'})`);
  else info(`${tag}: animations out of work: ${r2.anim.join(', ') || 'none'}`);
  info(`${tag} out of work text: ${(await page.locator('[data-gm-out-of-work]').innerText()).replace(/\s+/g, ' ').slice(0, 400)}`);
  for (const t of ['Career', 'GM level', 'Job market']) {
    const b = careerTile(page, t);
    if (!(await b.count())) { note(false, `${tag}: no ${t} box out of work`); continue; }
    await b.click(); await wait(1200);
    await shot(page, `${tag}-${t.replace(' ', '').toLowerCase()}`);
    await looks(page, `${tag} ${t}`);
    if (t !== 'Job market') await panelBack(page);
  }
  info(`${tag} market: ${(await page.locator('[data-gm-market]').first().innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 300)}`);
  const offer = page.locator('[data-gm-offer]').first();
  if (!(await offer.count())) { note(false, `${tag}: no offer on the market`); await ctx.close(); return; }
  await offer.click(); await wait(500);
  const take = page.locator('[data-gm-take]').first();
  await take.click(); await wait(400);
  await shot(page, `${tag}-armed`);
  await take.click(); await wait(1500);
  const s = await readSave(page);
  note(s.myTeam !== old && s.phase === 'recap', `${tag}: the seat is taken (${old} to ${s.myTeam}, phase ${s.phase})`);
  await shot(page, `${tag}-arrival`);
  const r3 = await looks(page, `${tag} arrival`);
  if (reduce) note(r3.anim.length === 0, `${tag}: reduced motion, nothing animates on the arrival (${r3.anim.join(', ') || 'none'})`);
  info(`${tag} arrival text: ${(await page.locator('[data-verdict-reveal]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`);
  await answerPress(page);
  await draftToHub(page, tag);
  await shot(page, `${tag}-new-hub`);
  await looks(page, `${tag} new hub`);
  note(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

/* Walk Y: a year out, then a reload */
async function walkY() {
  const tag = 'y390';
  const { ctx, page, errors } = await openPage(390, 844, false);
  await start(page);
  await answerPress(page);
  await doom(page);
  await page.locator('button:has-text("See who is calling")').click(); await wait(1500);
  await careerTile(page, 'Job market').click(); await wait(1200);
  const sit = page.locator('[data-gm-sit-out]').first();
  if (!(await sit.count())) { note(false, `${tag}: no Stay out button`); await ctx.close(); return; }
  const before = await readSave(page);
  await sit.click(); await wait(400); await sit.click(); await wait(1800);
  const after = await readSave(page);
  note(after.league.season === before.league.season + 1, `${tag}: the league is a season on (${before.league.season} to ${after.league.season})`);
  note(after.seasonsPlayed === before.seasonsPlayed && after.phase === 'fired', `${tag}: his counters stay and he is still between seats`);
  await shot(page, `${tag}-after-year`);
  await looks(page, `${tag} after year out`);
  info(`${tag} feed: ${(await page.locator('#dukb-main').innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  await page.reload({ waitUntil: 'networkidle' }); await wait(1500);
  await answerConsent(page);
  note(await page.locator('[data-gm-out-of-work]').count() === 1, `${tag}: a reload lands out of work again`);
  note(JSON.stringify(await readSave(page)) === JSON.stringify(after), `${tag}: the reload writes nothing`);
  await shot(page, `${tag}-reloaded`);
  note(errors.length === 0, `${tag}: no console error (${errors[0] ?? 'clean'})`);
  await ctx.close();
}

const ONLY = (process.env.REVIEW_WALKS || 'PRFY').toUpperCase();
const run = async (name, fn) => { try { await fn(); } catch (e) { note(false, `${name} threw: ${String(e).slice(0, 300)}`); } };
if (ONLY.includes('R')) await run('walkR', walkR);
if (ONLY.includes('P')) await run('walkP', walkP);
if (ONLY.includes('F')) for (const [w, h] of [[390, 844], [1280, 900]]) for (const rm of [false, true]) await run(`walkF ${w} ${rm}`, () => walkF(w, h, rm));
if (ONLY.includes('Y')) await run('walkY', walkY);
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-notes.txt'), notes.join('\n') + '\n');
console.log(hard ? `REVIEW WALK: ${hard} bad line(s)` : 'REVIEW WALK: all lines ok');
process.exit(hard ? 1 : 0);
