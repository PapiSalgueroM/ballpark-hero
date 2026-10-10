/* Reviewer's walk for Round 1227 (runner only, on a served build): what a player sees of the NFL rival.
   BASE=http://localhost:4173 RV_BASE=<commit> node .rc/x/rvwalk.mjs
   It walks the two size and motion pairs the builder's walk did not (390 by 844 with REDUCED motion, 1280 by
   900 with motion ON), on saves built by the base code (old saves) and by this tree, and saves a screenshot of
   every state into $RC_OUT for the reviewer to look at. The live database's host is aborted. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { bundleHead, bundleAt, clone, POS, shapeOf, printedScore } from './rvlib.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const ROUTE = '/nfl-my-career'; const KEY = 'nfl-my-career-save-v1';
const SHOTS = process.env.RC_OUT || path.join(process.cwd(), '.tmp-fx', 'rv-shots');
mkdirSync(SHOTS, { recursive: true });
let checks = 0; let failed = 0; const seenLines = [];
const say = (ok, msg) => { checks += 1; if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const see = msg => { seenLines.push(msg); console.log(`  seen ${msg}`); };

const H = await bundleHead('walk'); const B = await bundleAt(process.env.RV_BASE, 'walkbase');
const SH = H.NFL_CAREER_SPORT; const SB = B.mod.NFL_CAREER_SPORT;
const quiet = c => !c.retired && c.rival && !c.pendingRivalryEvent && !c.pendingRivalryChoice && (c.suspendedSeasons ?? 0) === 0 && c.contractYears > 0 && !c.summer;
/** A mid career save with nothing waiting, built by the code of module M. */
function midSave(M, S, pos, seasons, want = () => true) {
  for (let i = 0; i < 400; i += 1) {
    const c = JSON.parse(M.drive.driveCareer(S, { key: `rvw-${pos}-${seasons}-${i}`, pos, arch: i, seasons }).json);
    if (c.seasons.length === seasons && quiet(c) && want(c)) return c;
  }
  return null;
}
/** Saves caught sitting on a rivalry card (the moment the board would answer it), by the key `kind` gives. */
function sittingSaves(M, S, kind, wanted, limit) {
  const found = {};
  const catching = { ...S, dismissRivalryEvent: c => { const k = kind(c.pendingRivalryEvent, c); if (k && !found[k]) found[k] = clone(c); return S.dismissRivalryEvent(c); } };
  for (let i = 0; i < limit && !wanted.every(k => found[k]); i += 1) M.drive.driveCareer(catching, { key: `rvc-${i}`, pos: POS[i % 8], arch: i, seasons: 40 });
  return found;
}

const browser = await chromium.launch();
async function open(width, height, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const w = { ctx, page, errors: [], reached: 0, tag: `${width}${reduced ? 'r' : 'm'}`, width, height };
  page.on('pageerror', e => w.errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) w.reached += 1; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  return w;
}
async function load(w, c) {
  await w.page.evaluate(([key, career]) => localStorage.setItem(key, JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null })), [KEY, c]);
  await w.page.reload({ waitUntil: 'networkidle' });
  await w.page.waitForTimeout(1200);
}
const shot = (w, name, fullPage = false) => w.page.screenshot({ path: path.join(SHOTS, `${name}-${w.tag}.png`), fullPage }).catch(() => {});
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const saveOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
const mainText = async page => (await page.locator('main').innerText()).replace(/\s+/g, ' ');
async function step(page, leaveTheCard = false) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return leaveTheCard ? false : lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hubBack = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hubBack.count()) { await hubBack.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page) {
  for (let i = 0; i < 40; i += 1) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
/** The Rival screen of the News box: its text and where its last season line sits. Leaves the screen open. */
async function rivalScreen(w, name) {
  const { page } = w;
  await page.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first().click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: /^\s*\S+ Rival\s*$/ }).first().click();
  await page.waitForTimeout(600);
  const text = await page.locator('main').innerText();
  const m = /Last season he went (.+)[.]\s*$/m.exec(text);
  const box = await page.evaluate(() => {
    const all = [...document.querySelectorAll('main *')].filter(e => (e.textContent ?? '').includes('Last season he went'));
    const el = all[all.length - 1]; if (!el) return null;
    const card = el.closest('[class*="rounded-2xl"]') ?? el.parentElement;
    const a = el.getBoundingClientRect(); const b = card.getBoundingClientRect();
    return { cut: el.scrollWidth > el.clientWidth + 1, left: Math.round(a.left), right: Math.round(a.right), cardLeft: Math.round(b.left), cardRight: Math.round(b.right) };
  });
  await shot(w, name);
  const over = await sideways(page);
  await page.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click();
  await page.waitForTimeout(400);
  return { line: m ? m[1] : null, box, over, text: text.replace(/\s+/g, ' ') };
}

/** Play one season through the UI from the hub. Returns the season card's text, and how the page moved. */
async function playOne(w, name) {
  const { page } = w;
  const y0 = await page.evaluate(() => window.scrollY);
  await playButton(page).first().click();
  for (let i = 0; i < 30 && !(await page.locator('[data-season-reveal]').count()); i += 1) {
    await page.waitForTimeout(500);
    if (await page.locator('[data-season-reveal]').count()) break;
    if (await step(page, true)) continue;
    if (await playButton(page).count()) await playButton(page).first().click();
  }
  await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
  await page.waitForTimeout(2800);
  const card = await page.locator('[data-season-reveal]').innerText();
  const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
  const note = lines.find(l => / went /.test(l) && /head to head/i.test(l)) ?? null;
  const geo = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-season-reveal] *')].filter(e => (e.textContent ?? '').includes(' went '));
    const el = all[all.length - 1]; const card = document.querySelector('[data-season-reveal]');
    const a = el ? el.getBoundingClientRect() : null; const b = card.getBoundingClientRect();
    return { y: window.scrollY, cardTop: Math.round(b.top), over: document.scrollingElement.scrollWidth - window.innerWidth,
      note: a ? { left: Math.round(a.left), right: Math.round(a.right), cut: el.scrollWidth > el.clientWidth + 1 } : null, cardLeft: Math.round(b.left), cardRight: Math.round(b.right) };
  });
  await shot(w, `${name}-season`);
  await shot(w, `${name}-season-full`, true);
  return { lines, note, geo, y0 };
}
const lineInNote = note => { const m = / went (.+?)(?:[.] Nothing in it again| and had the better year of the two of you|[.] You had the better year)/.exec(note ?? ''); return m ? m[1] : null; };
/** A season played from a loaded save: the note, the two lines, the Rival screen before and after. */
async function seasonScene(w, c, name, old) {
  const pos = c.pos; const { page } = w;
  await load(w, c);
  if (!(await toHub(page))) { say(false, `${name} ${w.tag}: the save opens on the hub ("${(await mainText(page)).slice(0, 120)}")`); return; }
  await shot(w, `${name}-hub`);
  const before = await rivalScreen(w, `${name}-rival-before`);
  see(`${name} ${w.tag}: before the season the Rival screen reads "${(before.text.match(/Last season he went [^.]*(?:[.]\d[^.]*)*[.]/) ?? [before.line])[0]}"`);
  if (old) say(before.line === c.rival.lastLine, `${name} ${w.tag}: the old save's own last line is printed as saved ("${before.line}")`);
  const s = await playOne(w, name);
  const his = lineInNote(s.note); const mine = s.lines.find(l => shapeOf(pos).test(l)) ?? null;
  see(`${name} ${w.tag}: season card, mine "${mine}", note "${s.note}"`);
  say(!!his && shapeOf(pos).test(his), `${name} ${w.tag}: the rival's line on the season card is a ${pos}'s own shape ("${his}")`);
  if (his && mine) {
    const a = printedScore(pos, mine); const b = printedScore(pos, his);
    const ok = /Nothing in it/.test(s.note) ? Math.abs(a - b) < b * 0.06 : /You had the better year/.test(s.note) ? a > b : !(a > b);
    say(ok, `${name} ${w.tag}: what the note says about the year is what the two printed lines say (mine ${a.toFixed(2)}, his ${b.toFixed(2)})`);
  }
  say(!!s.geo.note && !s.geo.note.cut && s.geo.note.right <= s.geo.cardRight + 1 && s.geo.note.left >= s.geo.cardLeft - 1, `${name} ${w.tag}: the note sits inside the season card and is not cut (${JSON.stringify(s.geo.note)} in ${s.geo.cardLeft} to ${s.geo.cardRight})`);
  say(s.geo.over <= 1, `${name} ${w.tag}: nothing scrolls sideways on the season card (${s.geo.over})`);
  see(`${name} ${w.tag}: scroll before Play ${s.y0}, with the season card up ${s.geo.y}, card top at ${s.geo.cardTop}`);
  if (!(await toHub(page))) { say(false, `${name} ${w.tag}: back at the hub after the season`); return; }
  const after = await rivalScreen(w, `${name}-rival-after`);
  say(after.line === his, `${name} ${w.tag}: the Rival screen's last season line is the note's line ("${after.line}")`);
  say(!!after.box && !after.box.cut && after.box.right <= after.box.cardRight + 1 && after.over <= 1, `${name} ${w.tag}: that line is inside its card, not cut, nothing sideways (${JSON.stringify(after.box)}, over ${after.over})`);
  const r = (await saveOf(page))?.c?.rival;
  say(!!r && r.myYears + r.hisYears === c.rival.myYears + c.rival.hisYears + 1, `${name} ${w.tag}: the tally kept its record and added one year (${c.rival.myYears}-${c.rival.hisYears} to ${r?.myYears}-${r?.hisYears})`);
}
/** A save sitting on a rivalry card: the card as a player sees it, then the tap. */
async function cardScene(w, save, name, moves) {
  const { page } = w; const e = save.pendingRivalryEvent;
  await load(w, save);
  const card = page.locator('[data-rivalry-event]');
  if (!(await card.count())) { say(false, `${name} ${w.tag}: the pending card is on the screen ("${(await mainText(page)).slice(0, 120)}")`); return; }
  const text = (await card.innerText()).replace(/\s+/g, ' ');
  see(`${name} ${w.tag}: the card reads "${text}"`);
  say(text.includes(e.title) && text.includes(e.consequence) && text.includes(e.description), `${name} ${w.tag}: the card shows its saved title, words and chip`);
  const button = card.locator('button:not([disabled])').last();
  const fold = await button.evaluate(el => ({ bottom: Math.round(el.getBoundingClientRect().bottom), height: window.innerHeight }));
  say(fold.bottom <= fold.height && (await sideways(page)) <= 1, `${name} ${w.tag}: Continue is above the fold and nothing scrolls sideways (bottom ${fold.bottom} of ${fold.height})`);
  await shot(w, `${name}-card`);
  await button.click();
  await page.waitForTimeout(900);
  await shot(w, `${name}-after`);
  const after = (await saveOf(page))?.c; const cap = v => Math.max(0, Math.min(100, v));
  say(!!after && !after.pendingRivalryEvent && after.morale === cap(save.morale + (moves.morale ?? 0)) && after.fanbase === cap(save.fanbase + (moves.fanbase ?? 0)), `${name} ${w.tag}: the tap moved what the chip says (morale ${save.morale} to ${after?.morale}, fanbase ${save.fanbase} to ${after?.fanbase})`);
  const feed = (after?.feed ?? after?.socialFeed ?? after?.news ?? []);
  see(`${name} ${w.tag}: after the tap the screen reads "${(await mainText(page)).slice(0, 260)}"; newest feed entries on the save: ${JSON.stringify((Array.isArray(feed) ? feed : []).slice(-2)).slice(0, 300)}`);
}

const MOVES = { 'Morale +5': { morale: 5 }, 'Morale -5': { morale: -5 }, 'Fanbase +3': { fanbase: 3 }, 'Fanbase +4, the feud softens': { fanbase: 4 } };
const oldShape = pos => c => !c.rival.retired && !shapeOf(pos).test(c.rival.lastLine);
const live = c => !c.rival.retired;
const wide = await open(1280, 900, false); const phone = await open(390, 844, true);
const ONLY = (process.env.RV_SCENES || 'old,new,oldcards,cards,retired,whatsnew').split(',');

if (ONLY.includes('old')) {
  console.log('old saves (built by the base code), a season played on this tree');
  for (const [pos, w] of [['EDGE', phone], ['K', wide], ['CB', phone]]) {
    const c = midSave(B.mod, SB, pos, 5, oldShape(pos));
    if (!c) { say(false, `old ${pos}: a base built save with an old shape line was found`); continue; }
    await seasonScene(w, c, `old-${pos}`, true);
  }
}
if (ONLY.includes('new')) {
  console.log('saves of this tree, a season played');
  for (const [pos, w] of [['QB', phone], ['RB', wide], ['TE', phone], ['LB', wide], ['WR', phone]]) {
    const c = midSave(H, SH, pos, 2, live);
    if (!c) { say(false, `new ${pos}: a save of this tree was built`); continue; }
    await seasonScene(w, c, `new-${pos}`, false);
  }
}
if (ONLY.includes('oldcards')) {
  console.log('saves the base code left sitting on a card');
  const kind = e => (e.id === 206 && e.consequence === 'Morale +5' ? 'made' : e.id === 206 && e.consequence === 'Morale -5' ? 'dropped' : e.id === 221 ? 'old221' : null);
  const found = sittingSaves(B.mod, SB, kind, ['made', 'dropped', 'old221'], 3000);
  say(!!found.made && !!found.dropped && !!found.old221, `the base code left a save on each of its three cards (${Object.keys(found).join(', ') || 'none'})`);
  for (const [k, w] of [['old221', phone], ['made', wide], ['dropped', phone]]) if (found[k]) await cardScene(w, found[k], `oldcard-${k}`, MOVES[found[k].pendingRivalryEvent.consequence]);
}
if (ONLY.includes('cards')) {
  console.log('cards this tree deals');
  const kind = e => (e.id === 206 ? ({ 'Fanbase +3': 'both', 'Morale +5': 'onlyYou', 'Morale -5': 'onlyHim' }[e.consequence] ?? 'other206') : e.id === 221 ? 'new221' : null);
  const found = sittingSaves(H, SH, kind, ['both', 'onlyYou', 'onlyHim', 'new221'], 2500);
  say(!!found.onlyYou && !!found.onlyHim && !!found.new221 && !found.other206, `this tree dealt only you, only him and the new 221, and no other All-Pro card (${Object.keys(found).join(', ') || 'none'})`);
  if (!found.both) see('cards: no career in 2,500 was dealt the "both" card');
  for (const [k, w] of [['onlyYou', phone], ['onlyHim', wide], ['both', phone], ['new221', wide], ['onlyHim', phone], ['onlyYou', wide]]) if (found[k]) {
    const e = found[k].pendingRivalryEvent; const last = found[k].seasons[found[k].seasons.length - 1];
    const mine = last.awards.includes('All-Pro'); const his = found[k].rival.lastAllStar === true;
    if (k !== 'new221') say((k === 'both' ? mine && his : k === 'onlyYou' ? mine && !his : !mine && his) && found[k].rival.lastYear === last.year, `card ${k}: the save's two seasons support its words (mine ${mine}, his ${his}, ${found[k].pos}, "${e.description}")`);
    await cardScene(w, found[k], `card-${k}`, MOVES[e.consequence]);
  }
}
if (ONLY.includes('retired')) {
  console.log('an old save whose rival had already retired');
  let c = null;
  for (const [pos, n] of [['K', 17], ['QB', 16], ['K', 18]]) { c = midSave(B.mod, SB, pos, n, x => x.rival.retired && !shapeOf(pos).test(x.rival.lastLine)); if (c) break; }
  if (!c) see('retired: no base built save with a retired rival and an old shape line was found in the search');
  else {
    await load(phone, c);
    if (await toHub(phone.page)) { const r = await rivalScreen(phone, 'retired-old-rival'); see(`retired ${c.pos}: the Rival screen of an old save whose rival retired reads "${r.text.slice(0, 300)}"`); }
  }
}
if (ONLY.includes('whatsnew')) {
  for (const w of [phone, wide]) {
    await w.page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
    await w.page.waitForTimeout(900);
    const entry = await w.page.evaluate(() => { const li = [...document.querySelectorAll('li')].find(x => (x.textContent ?? '').includes('your rival finally plays your position')); if (!li) return null; li.scrollIntoView({ block: 'start' }); return li.textContent; });
    await w.page.waitForTimeout(300);
    await shot(w, 'whatsnew');
    say(!!entry && !entry.includes(String.fromCharCode(0x2013)) && !entry.includes(String.fromCharCode(0x2014)), `whats-new ${w.tag}: the entry is on the page and carries no dash`);
    if (entry && w === phone) see(`whats-new entry: "${entry}"`);
    say((await sideways(w.page)) <= 1, `whats-new ${w.tag}: nothing scrolls sideways`);
  }
}
for (const w of [phone, wide]) {
  const real = w.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${w.tag}: no page errors (${real[0] ?? 'clean'})`);
  say(w.reached === 0, `${w.tag}: no request to the live database finished (${w.reached})`);
  await w.ctx.close();
}
await browser.close();
writeFileSync(path.join(SHOTS, 'rv-seen.txt'), `${seenLines.join('\n')}\n`);
console.log(`rvwalk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
