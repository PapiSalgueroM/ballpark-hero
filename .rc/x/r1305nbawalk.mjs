/* REVIEWER'S WALK for Round 1305, Round P (never committed): the NBA front office's draft night card, reached the
   way a player reaches it. A new franchise, a whole season by presses, the recap, the draft, one pick, the card.
   Run on a runner with #!serve and #!playwright:   nbawalk: node .rc/x/r1305nbawalk.mjs */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'nba-front-office-save-v1';
let failures = 0;
const say = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`); if (!ok) failures += 1; return ok; };
const note = msg => console.log(`note  ${msg}`);
const RUNS = [
  { id: 'nba390', width: 390, height: 844, reduced: false },
  { id: 'nba1280r', width: 1280, height: 900, reduced: true },
];
const browser = await chromium.launch();
const readSave = async page => { const raw = await page.evaluate(k => localStorage.getItem(k), KEY); return raw ? JSON.parse(raw) : null; };
const shot = async (page, run, name, fullPage = false) => { try { await page.screenshot({ path: path.join(OUT, `${run.id}-${name}.png`), fullPage }); } catch (e) { note(`screenshot ${name}: ${String(e).slice(0, 80)}`); } };
async function answerPresser(page) {
  const card = page.locator('[data-gm-press]');
  if (await card.count() > 0) { await card.locator('button').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500); }
}
const PLAY = 'button:has-text("Play Round"), button:has-text("Final stretch")';
async function openPlay(page) {
  if (await page.locator(PLAY).count() > 0) return true;
  /* the hub box whose label line is "Play" */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').split('\n').map(s => s.trim().toLowerCase()).includes('play'));
    if (b) b.click();
  });
  await page.waitForTimeout(400);
  return (await page.locator(PLAY).count()) > 0;
}

for (const run of RUNS) {
  console.log(`\n===== run ${run.id}: ${run.width}x${run.height}, reduced motion ${run.reduced ? 'ON' : 'off'} =====`);
  const errors = [];
  const context = await browser.newContext({ viewport: { width: run.width, height: run.height }, reducedMotion: run.reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  try {
    await page.goto(`${BASE}/nba-front-office`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('.grid button').first().click({ timeout: 8000 });
    for (let k = 0; k < 40 && !(await readSave(page)); k += 1) await page.waitForTimeout(250);
    let s = await readSave(page);
    if (!say(!!s, `${run.id}: a new NBA franchise is saved`)) throw new Error('no save');
    const team = s.myTeam;
    note(`${run.id}: his club is ${team}, desk ${'gm' in s ? 'on' : 'off'}, roster ${s.league.teams[team].players.length}`);
    await answerPresser(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    let presses = 0;
    for (let k = 0; k < 60; k += 1) {
      s = await readSave(page);
      if (!s || s.phase !== 'hub') break;
      if (!(await openPlay(page))) { note(`${run.id}: no play button after ${presses} presses`); await shot(page, run, 'no-play-button'); break; }
      const btn = page.locator(PLAY).first();
      if (await btn.isDisabled()) { note(`${run.id}: the play button is disabled after ${presses} presses`); await shot(page, run, 'play-disabled'); break; }
      const before = JSON.stringify(s.league.round) + s.phase;
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(350);
      const a = await readSave(page);
      if (JSON.stringify(a.league.round) + a.phase === before) { note(`${run.id}: a press did not move the save at round ${s.league.round}`); await shot(page, run, 'press-stuck'); break; }
      presses += 1;
    }
    s = await readSave(page);
    say(s.phase === 'recap' || s.phase === 'fired', `${run.id}: the season closed after ${presses} presses (phase ${s.phase})`);
    if (s.phase !== 'recap') throw new Error(`phase ${s.phase}, no draft to walk`);
    await page.waitForTimeout(1500);
    await answerPresser(page);
    await page.locator('button:has-text("Go to the draft")').first().click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const before = await readSave(page);
    say(before.phase === 'draft' && Array.isArray(before.draftClass), `${run.id}: the draft is open with ${before.draftClass ? before.draftClass.length : 0} prospects and ${before.picksLeft} pick(s) left`);
    await shot(page, run, '01-draft-screen');
    const prospects = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => (b.innerText || '').includes('· age')).map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()));
    if (prospects.length === 0) throw new Error('no prospect on the draft screen (a club with no pick?)');
    const pressed = prospects[0];
    await page.locator('button:has-text("· age")').first().click({ timeout: 5000 });
    await page.waitForTimeout(500);
    await shot(page, run, '02-card-first-frame');
    await page.waitForTimeout(4500);
    await shot(page, run, '03-card-settled');
    const card = page.locator('[data-draft-night]');
    say(await card.count() === 1, `${run.id}: the draft night card is on screen after his pick`);
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-draft-night] ol li')].map(li => {
      const spans = [...li.querySelectorAll(':scope > span')];
      const head = (spans[0]?.querySelector('span')?.innerText || '').replace(/\s+/g, ' ').trim();
      const grade = (spans[1]?.innerText || '').trim();
      const r = li.getBoundingClientRect();
      return { head, grade, mine: li.className.includes('border-gold'), top: Math.round(r.top), right: Math.round(r.right), opacity: getComputedStyle(li).opacity };
    }));
    console.log(`note  ${run.id}: rows: ${rows.map(r => `${r.head} [${r.grade}]`).join(' | ')}`);
    const after = await readSave(page);
    const mineRows = rows.filter(r => r.mine);
    say(mineRows.length === 1 && pressed.includes(mineRows[0].head.split(' select ')[1] || '###'), `${run.id}: exactly one row is his and it is the man he pressed (${mineRows[0] ? mineRows[0].head : 'none'})`);
    const rivals = rows.filter(r => !r.mine).map(r => { const m = r.head.match(/^[0-9]+\. (\S+) take (.+)$/); return m ? { team: m[1], name: m[2], grade: r.grade } : { team: '?', name: r.head, grade: r.grade }; });
    say(rivals.length >= 1, `${run.id}: the card shows ${rivals.length} rival pick(s)`);
    if (after.phase === 'draft' && Array.isArray(after.draftClass)) {
      const left = new Set(after.draftClass.map(p => p.name));
      const myName = (mineRows[0] ? mineRows[0].head.split(' select ')[1] : '');
      const engine = before.draftClass.map(p => p.name).filter(n => !left.has(n) && n !== myName);
      const shown = rivals.map(r => r.name);
      const want = engine.slice(0, 8);
      say(engine.length >= 1 && shown.length === want.length && want.every(n => shown.includes(n)), `${run.id}: the rival rows are the men the engine took from the class (engine took ${engine.length}: ${engine.join(', ')}; card shows ${shown.join(', ')})`);
    } else note(`${run.id}: the first press closed the draft (phase ${after.phase}), so the class cannot be compared; rosters are checked instead`);
    const beforeIds = new Set(Object.values(before.league.teams).flatMap(t => t.players.map(p => p.name)));
    const onClub = rivals.filter(r => after.league.teams[r.team] && after.league.teams[r.team].players.some(p => p.name === r.name));
    const fresh = rivals.filter(r => !beforeIds.has(r.name));
    say(onClub.length === rivals.length, `${run.id}: every rival row's man is on the roster of the club the row names in the save (${onClub.length} of ${rivals.length})`);
    say(fresh.length === rivals.length, `${run.id}: none of them was on any roster before the press (${fresh.length} of ${rivals.length})`);
    const graded = rivals.filter(r => { const p = prospects.find(t => t.includes(r.name)); return p && new RegExp(`(^|[^0-9])${r.grade}([^0-9]|$)`).test(p); });
    say(graded.length === rivals.length, `${run.id}: every rival row's grade is a number the draft screen printed for that prospect before the press (${graded.length} of ${rivals.length})`);
    const off = rows.filter(r => r.right > run.width + 1);
    say(off.length === 0, `${run.id}: no row of the card runs off the right edge`);
    say(rows.every(r => r.opacity === '1'), `${run.id}: every row is fully drawn once the card has settled`);
  } catch (e) {
    say(false, `${run.id}: the walk stopped: ${String(e).slice(0, 300)}`);
    await shot(page, run, 'stopped', true);
  }
  say(errors.length === 0, `${run.id}: no page error (${errors.length ? errors[0] : 'clean'})`);
  await context.close();
}
await browser.close();
console.log(`\nr1305nbawalk: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
