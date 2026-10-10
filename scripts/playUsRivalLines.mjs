/* playUsRivalLines.mjs (Round 1227). The NFL rival's line, on the real screens of a served build.

   scripts/simUsRivalSense.mjs proves the engine: the rival plays the player's position on the player's own stat
   line and the verdict is read off the two printed lines. This walk reads what a PLAYER sees, in Chromium, with
   the live database's host aborted. The stretch that plays seasons (new) runs at all four pairs: 390 by 844 and
   1280 by 900, each with motion on and with reduced motion. The old saves and the roster cards are walked at
   390 with motion on and at 1280 with reduced motion.

   new    for each of the eight positions, a career built by this tree's own code (two seasons driven the way
          the board drives them) is put in localStorage and two more seasons are played through the real UI.
          On each season card the rival's note is read: his line is in the position's own shape, and what the
          note says about the year is what the two printed lines say (the season score of the printed parts,
          typed here from careerAwards.ts, a back's catches at 8 yards). Then the News box's Rival screen: its
          "Last season he went" line is the same line. Measured rectangles: the note and that line end inside
          their cards and are not cut, and nothing scrolls sideways.
   old    the five saves of src/test/fixtures/usRivalOldSaves.json (built by the code before the round): a save
          sitting on a card that release dealt shows that card, Continue is above the fold, and the tap
          moves exactly what the chip says (read back from the save); a corner's and a kicker's old shape line
          shows on the Rival screen until a season is played and is the new shape after it.
   cards  a roster card of each kind this tree deals (only you, only him, and both when the search finds one),
          from saves caught at the moment the board would answer the card: the card reads its words, Continue
          is above the fold, and the tap moves what the chip says.

   Run on a served build:  BASE=http://localhost:4173 node scripts/playUsRivalLines.mjs
   RIVAL_WALK_POS=CB,K plays a subset; RIVAL_WALK_STRETCH=new|old|cards one stretch. Screenshots go to $RC_OUT
   (or .tmp-fx/walk-shots). It ends "playUsRivalLines: N checks, F failed" and exits by F.

   Controls (PLAY_US_RIVAL_CONTROL), each reading side only, each must turn only its own checks red:
     rivalflip   the note is judged with the two printed lines the wrong way round
     oldline     an old save's rival line, before any season is played, is held to the new shape (it is the
                 old linebacker's or kicker's line, so the shape check must refuse it) */

import { build } from 'esbuild';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTE = '/nfl-my-career';
const KEY = 'nfl-my-career-save-v1';
const CONTROL = process.env.PLAY_US_RIVAL_CONTROL || '';
if (CONTROL && !['rivalflip', 'oldline'].includes(CONTROL)) { console.error(`PLAY_US_RIVAL_CONTROL=${CONTROL} is not a control this walk knows`); process.exit(2); }
const STRETCH = CONTROL === 'oldline' ? 'old' : CONTROL === 'rivalflip' ? 'new' : process.env.RIVAL_WALK_STRETCH || 'all';
const ALL_POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
const POS = (process.env.RIVAL_WALK_POS || '').split(',').filter(p => ALL_POS.includes(p));
const WALK_POS = POS.length ? POS : ALL_POS;
const SHOTS = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk-shots');
mkdirSync(SHOTS, { recursive: true });

/* The position's own printed shape (src/lib/usCareerStatLine.ts, nflStatLine), the parts in order, and the
   season score of those parts (src/lib/careerAwards.ts, nflSeasonScore). Typed here, never imported. */
const N = String.raw`\d{1,3}(?:,\d{3})*`;
const H = String.raw`\d{1,3}(?:\.5)?`;
const SHAPE = {
  QB: `(${N}) yds, (${N}) TD, (${N}) INT`,
  RB: `(${N}) rush yds, (${N}) TD, (${N}) rec`,
  WR: `(${N}) rec, (${N}) yds, (${N}) TD`,
  TE: `(${N}) rec, (${N}) yds, (${N}) TD`,
  LB: `(${N}) tackles?, (${H}) sacks?, (${N}) INT`,
  CB: `(${N}) INT, (${N}) pass(?:es)? defended, (${N}) tackles?`,
  EDGE: `(${H}) sacks?, (${N}) tackles?, (${N}) forced fumbles?`,
  K: `(${N}) of ${N} FG, long of (${N})`,
};
const SCORE = {
  QB: v => v[0] / 48 + v[1] * 2.4 - v[2],
  RB: v => (v[0] + v[2] * 8) / 16 + v[1] * 3,
  WR: v => v[1] / 14 + v[2] * 3,
  TE: v => v[1] / 14 + v[2] * 3 + 12,
  LB: v => v[0] / 1.15 + v[1] * 5 + v[2] * 9,
  CB: v => v[0] * 15 + v[1] * 3.2 + v[2] / 2,
  EDGE: v => v[0] * 8.5 + v[1] / 1.6 + v[2] * 6,
  K: v => v[0] * 3.4 + (v[1] - 45) * 1.6,
};
const whole = pos => new RegExp(`^${SHAPE[pos]}$`);
const numbersOf = (pos, text) => { const m = whole(pos).exec(text); return m ? m.slice(1).map(x => Number(x.replace(/,/g, ''))) : null; };
/** The rival's line inside a season note: what follows "went", up to the sentence that judges the year. */
const lineInNote = note => { const m = / went (.+?)(?:[.] Nothing in it again| and had the better year of the two of you|[.] You had the better year)/.exec(note); return m ? m[1] : null; };

let checks = 0; let failed = 0; const controlRed = [];
function say(ok, msg, tag = '') {
  checks += 1;
  if (ok) console.log(`  ok   ${msg}`);
  else { failed += 1; controlRed.push(tag || 'untagged'); console.log(`  FAIL ${msg}`); }
}

/* This tree's own engine, to build the saves the walk starts from (never the network, never a file written). */
const out = path.join(os.tmpdir(), `us-rival-walk-${process.pid}.mjs`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({
  stdin: { contents: "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';\nexport * as drive from './src/test/helpers/usCareerDrive.ts';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, outfile: out,
});
const E = await import(pathToFileURL(out).href);
try { unlinkSync(out); } catch { /* best effort */ }
const S = E.NFL_CAREER_SPORT;
/** A career of this tree's code after two driven seasons, with no card waiting and seasons left to play. */
function headSave(pos) {
  for (let i = 0; i < 60; i += 1) {
    const c = JSON.parse(E.drive.driveCareer(S, { key: `walk-${pos}-${i}`, pos, arch: i, seasons: 2 }).json);
    if (c.seasons.length === 2 && !c.retired && c.rival && !c.rival.retired && !c.pendingRivalryEvent && !c.pendingRivalryChoice && (c.suspendedSeasons ?? 0) === 0 && c.contractYears > 0) return c;
  }
  return null;
}
/** Saves of this tree's code caught sitting on a roster card of each kind (the moment the board would answer it). */
function rosterCardSaves(limit) {
  const found = {};
  const kindOf = e => (e.consequence === 'Fanbase +3' ? 'both' : e.consequence === 'Morale +5' ? 'onlyYou' : e.consequence === 'Morale -5' ? 'onlyHim' : null);
  const catching = { ...S, dismissRivalryEvent: c => { const e = c.pendingRivalryEvent; const k = e?.id === 206 ? kindOf(e) : null; if (k && !found[k]) found[k] = JSON.parse(JSON.stringify(c)); return S.dismissRivalryEvent(c); } };
  for (let i = 0; i < limit && !(found.both && found.onlyYou && found.onlyHim); i += 1) E.drive.driveCareer(catching, { key: `cards-${i}`, pos: ['WR', 'CB', 'EDGE', 'LB', 'QB', 'RB', 'TE', 'K'][i % 8], arch: i, seasons: 40 });
  return found;
}

const browser = await chromium.launch();
async function open(width, height, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const seen = { errors: [], reached: 0 };
  page.on('pageerror', e => seen.errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) seen.reached += 1; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  return { ctx, page, seen, width, label: `${width} wide, ${reduced ? 'reduced motion' : 'motion on'}` };
}
/** Put a career on the save the page just made and load it, the way a returning player's save loads. */
async function load(page, c) {
  const wrote = await page.evaluate(([key, career]) => { const s = JSON.parse(localStorage.getItem(key) ?? 'null'); if (!s) return false; s.c = career; s.phase = 'season'; localStorage.setItem(key, JSON.stringify(s)); return true; }, [KEY, c]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return wrote;
}
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
/* One move the way a player would make it, by what is on the screen (the board fixture's walker, shortened). */
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
async function toHub(page, what) {
  for (let i = 0; i < 40; i += 1) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  say(false, `${what}: the walk got back to the hub (it is lost on "${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 140)}")`);
  return false;
}
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const saveOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
/** The innermost element that holds `text`: is it cut, and does it end inside the card around it? */
const boxOf = (page, text) => page.evaluate(t => {
  const all = [...document.querySelectorAll('main *')].filter(e => (e.textContent ?? '').includes(t));
  const el = all[all.length - 1];
  if (!el) return null;
  const card = el.closest('[class*="rounded-2xl"]') ?? el.parentElement;
  const a = el.getBoundingClientRect(); const b = card.getBoundingClientRect();
  return { cut: el.scrollWidth > el.clientWidth + 1, right: Math.round(a.right), cardRight: Math.round(b.right), left: Math.round(a.left), cardLeft: Math.round(b.left) };
}, text);
const fits = box => !!box && !box.cut && box.right <= box.cardRight + 0.5 && box.left >= box.cardLeft - 0.5;
/** The Rival screen of the News box: its "Last season he went" line, measured, then back to the hub. */
async function rivalScreen(page, what) {
  await page.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first().click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: /^\s*\S+ Rival\s*$/ }).first().click();
  await page.waitForTimeout(500);
  const text = await page.locator('main').innerText();
  const m = /Last season he went (.+)[.]\s*$/m.exec(text);
  const box = await boxOf(page, 'Last season he went');
  const over = await sideways(page);
  await page.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click();
  await page.waitForTimeout(400);
  if (!m) { say(false, `${what}: the Rival screen prints his last season ("${text.replace(/\s+/g, ' ').slice(0, 120)}")`); return null; }
  return { line: m[1], box, over };
}
/** Play one season through the UI and read the rival's note off the season card. */
let notesRead = 0;
async function playOne(page, pos, what) {
  await playButton(page).first().click();
  /* The season does not always start at once: an extension talk or a free agency window can stand in front of
     it (a rookie deal runs out in the walk's third season). Answer what is there, never the season card. */
  for (let i = 0; i < 30 && !(await page.locator('[data-season-reveal]').count()); i += 1) {
    await page.waitForTimeout(500);
    if (await page.locator('[data-season-reveal]').count()) break;
    if (await step(page, true)) continue;
    if (await playButton(page).count()) await playButton(page).first().click();
  }
  await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
  await page.waitForTimeout(2600);
  const card = await page.locator('[data-season-reveal]').innerText();
  const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
  const mineText = lines.find(l => whole(pos).test(l));
  const note = lines.find(l => / went /.test(l) && /head to head/i.test(l));
  if (!note) { console.log(`  note ${what}: no rival note on this card (he has retired)`); return null; }
  notesRead += 1;
  const hisText = lineInNote(note);
  const his = hisText ? numbersOf(pos, hisText) : null; const mine = mineText ? numbersOf(pos, mineText) : null;
  say(!!his, `${what}: the rival's line is a ${pos}'s own shape ("${hisText ?? note.slice(0, 90)}")`);
  say(!!mine, `${what}: the season card prints my own line in that shape ("${mineText ?? 'not found'}")`);
  if (his && mine) {
    const [a, b] = CONTROL === 'rivalflip' ? [SCORE[pos](his), SCORE[pos](mine)] : [SCORE[pos](mine), SCORE[pos](his)];
    const tie = /Nothing in it again[.] (?:You lead the head to head (\d+)-(\d+)|He leads the head to head (\d+)-(\d+)|The head to head is level at (\d+)-(\d+))[.]/.exec(note);
    let ok; let says;
    if (/Nothing in it/.test(note)) { says = 'a near tie'; ok = !!tie && Math.abs(a - b) < b * 0.06 && (tie[1] ? Number(tie[1]) > Number(tie[2]) : tie[3] ? Number(tie[3]) > Number(tie[4]) : tie[5] === tie[6]); }
    else if (/You had the better year/.test(note)) { says = 'I had the better year'; ok = a > b; }
    else if (/had the better year of the two of you/.test(note)) { says = 'he had the better year'; ok = !(a > b); }
    else { says = 'nothing this walk can read'; ok = false; }
    say(ok, `${what}: the note says ${says}, and the two printed lines agree (mine ${mineText}; his ${hisText})`, 'rivalflip');
  }
  const box = await boxOf(page, ' went ');
  say(fits(box), `${what}: the rival's note ends inside the season card and is not cut (${box ? `${box.left} to ${box.right} in ${box.cardLeft} to ${box.cardRight}` : 'not found'})`);
  say((await sideways(page)) <= 1, `${what}: nothing scrolls sideways on the season card (${await sideways(page)} pixels over)`);
  return hisText;
}
async function close(w, what) {
  const real = w.seen.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${what}: no page errors (${real[0] ?? 'clean'})`);
  say(w.seen.reached === 0, `${what}: no request to the live database finished (${w.seen.reached})`);
  await w.ctx.close();
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) }).catch(() => {});

/* Every size with motion on AND reduced for the stretch that plays seasons (the brief names all four pairs; the
   first walk held two, 390 with motion on and 1280 reduced, and the run reviewer walked the other two by hand).
   The old saves and the roster cards are walked at both widths, one motion setting each (SIDE_SIZES). */
const SIZES = [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]];
const SIDE_SIZES = [[390, 844, false], [1280, 900, true]];
const tagOf = (wd, reduced) => `${wd}${reduced ? 'r' : 'm'}`;
if (STRETCH === 'all' || STRETCH === 'new') {
  for (const [wd, ht, reduced] of SIZES) {
    for (const pos of WALK_POS) {
      const c = headSave(pos);
      const w = await open(wd, ht, reduced); const { page } = w; const what = `new ${pos}, ${w.label}`;
      console.log(what);
      say(!!c && await load(page, c), `${what}: a career of this tree's code after two seasons is on the save`);
      if (c && await toHub(page, what)) {
        for (let n = 1; n <= 2; n += 1) {
          const hisText = await playOne(page, pos, `${what}, season ${n}`);
          if (n === 1) await shot(page, `new-${pos}-${tagOf(wd, reduced)}-card`);
          if (!(await toHub(page, `${what}, season ${n}`))) break;
          if (!hisText) continue;
          const r = await rivalScreen(page, `${what}, season ${n}`);
          if (!r) continue;
          say(r.line === hisText, `${what}, season ${n}: the Rival screen's last season line is the note's line ("${r.line}")`);
          say(fits(r.box), `${what}, season ${n}: that line ends inside its card and is not cut (${r.box ? `${r.box.left} to ${r.box.right} in ${r.box.cardLeft} to ${r.box.cardRight}` : 'not found'})`);
          say(r.over <= 1, `${what}, season ${n}: nothing scrolls sideways on the Rival screen (${r.over} pixels over)`);
        }
      }
      await close(w, what);
    }
  }
  const playedCards = WALK_POS.length * SIZES.length * 2;
  say(notesRead >= playedCards / 2, `the walk read the rival's note on ${notesRead} season cards (floor ${playedCards / 2}: half of the ${playedCards} it played)`);
}

/** A save sitting on a rivalry card: the card is on the screen, Continue is above the fold, the tap pays the chip. */
async function cardPays(page, save, what, moves) {
  say(await load(page, save), `${what}: the save is loaded`);
  const card = page.locator('[data-rivalry-event]');
  if (!(await card.count())) { say(false, `${what}: the pending card is on the screen ("${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 120)}")`); return; }
  const text = (await card.innerText()).replace(/\s+/g, ' ');
  const e = save.pendingRivalryEvent;
  say(text.includes(e.title) && text.includes(e.consequence), `${what}: the card reads its own title and chip ("${e.title}", "${e.consequence}")`);
  const button = card.locator('button:not([disabled])').last();
  const fold = await button.evaluate(el => ({ bottom: Math.round(el.getBoundingClientRect().bottom), height: window.innerHeight }));
  say(fold.bottom <= fold.height, `${what}: Continue is above the fold (its bottom at ${fold.bottom} of ${fold.height})`);
  say((await sideways(page)) <= 1, `${what}: nothing scrolls sideways on the card (${await sideways(page)} pixels over)`);
  await shot(page, `card-${what.replace(/[^a-z0-9]+/gi, '-')}`);
  await button.click();
  await page.waitForTimeout(700);
  const after = (await saveOf(page))?.c;
  const cap = v => Math.max(0, Math.min(100, v));
  const ok = !!after && !after.pendingRivalryEvent && after.morale === cap(save.morale + (moves.morale ?? 0)) && after.fanbase === cap(save.fanbase + (moves.fanbase ?? 0));
  say(ok, `${what}: the tap moved exactly what the chip says (morale ${save.morale} to ${after?.morale}, fanbase ${save.fanbase} to ${after?.fanbase})`);
}
const MOVES = { 'Morale +5': { morale: 5 }, 'Morale -5': { morale: -5 }, 'Fanbase +3': { fanbase: 3 }, 'Fanbase +4, the feud softens': { fanbase: 4 } };

if (STRETCH === 'all' || STRETCH === 'old') {
  const old = JSON.parse(readFileSync(path.join(ROOT, 'src/test/fixtures/usRivalOldSaves.json'), 'utf8')).saves;
  for (const [wd, ht, reduced] of SIDE_SIZES) {
    const w = await open(wd, ht, reduced); const { page } = w;
    console.log(`old saves, ${w.label}`);
    if (CONTROL !== 'oldline') {
      for (const key of ['nflMade', 'nflDropped', 'nfl221']) await cardPays(page, old[key], `old ${key}, ${w.label}`, MOVES[old[key].pendingRivalryEvent.consequence]);
    }
    for (const key of ['nflCB', 'nflK']) {
      const save = old[key]; const pos = save.pos; const what = `old ${key}, ${w.label}`;
      say(await load(page, save), `${what}: the save is loaded`);
      if (!(await toHub(page, what))) continue;
      const before = await rivalScreen(page, what);
      await shot(page, `old-${key}-${tagOf(wd, reduced)}-before`);
      if (CONTROL === 'oldline') { say(!!before && whole(pos).test(before.line), `${what}: (control) the line of the save from before the round is held to the new shape ("${before?.line}")`, 'oldline'); continue; }
      say(!!before && before.line === save.rival.lastLine && !whole(pos).test(before.line), `${what}: the Rival screen still prints the line the old code saved ("${before?.line}")`);
      const hisText = await playOne(page, pos, `${what}, one season on`);
      if (!(await toHub(page, what))) continue;
      const after = await rivalScreen(page, what);
      say(!!after && !!hisText && after.line === hisText && whole(pos).test(after.line), `${what}: after one season the Rival screen prints his position's own line ("${after?.line}")`);
      const tally = (await saveOf(page))?.c?.rival;
      say(!!tally && tally.myYears + tally.hisYears === save.rival.myYears + save.rival.hisYears + 1, `${what}: the head to head kept its record and added one year (${save.rival.myYears}-${save.rival.hisYears} to ${tally?.myYears}-${tally?.hisYears})`);
    }
    await close(w, `old saves, ${w.label}`);
  }
}

if (STRETCH === 'all' || STRETCH === 'cards') {
  const found = rosterCardSaves(Number(process.env.RIVAL_WALK_CARD_DRIVES || 2500));
  console.log(`roster cards of this tree: found ${Object.keys(found).join(', ') || 'none'}`);
  say(!!found.onlyYou && !!found.onlyHim, `a save sitting on "only you" and one on "only him" were built by this tree's code (${Object.keys(found).join(', ') || 'none'})`);
  if (!found.both) console.log('  note cards: no career in the search was dealt the "both" card (it needs both on a first team that names two or more): its words and its payment are held on fixtures by scripts/simCareerRivalryEvents.mjs');
  for (const [kind, save] of Object.entries(found)) {
    const says = { both: /are both on the first team[.]/, onlyYou: /You are on the first team and .+ is not[.]/, onlyHim: /is on the first team and you are not[.]/ }[kind];
    say(says.test(save.pendingRivalryEvent.description), `card ${kind}: the save's card reads the ${kind} words ("${save.pendingRivalryEvent.description}")`);
  }
  for (const [wd, ht, reduced] of SIDE_SIZES) {
    const w = await open(wd, ht, reduced);
    for (const [kind, save] of Object.entries(found)) await cardPays(w.page, save, `card ${kind} (${save.pos}), ${w.label}`, MOVES[save.pendingRivalryEvent.consequence]);
    await close(w, `roster cards, ${w.label}`);
  }
}
await browser.close();

if (CONTROL) {
  const fired = failed > 0 && controlRed.every(t => t === CONTROL);
  console.log(`\ncontrol ${CONTROL}: ${fired ? 'FIRED, its own checks went red and no other' : `DID NOT FIRE AS DESIGNED (${failed} failed, tagged ${controlRed.join(', ') || 'none'})`}`);
  console.log(`playUsRivalLines: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(fired ? 1 : 3);
}
console.log(`playUsRivalLines: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
