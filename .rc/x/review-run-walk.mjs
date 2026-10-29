// Review of Round 1579 (runner lens): play Sports Millionaire's Swap Question the way a player does and check the
// promise against the ladder the page actually holds (read from the React fiber of the board, debug only). Never
// committed. supabase.co is answered in the browser from committed fixture files (the market slice of
// scripts/data/alphabetSprintPool.json with positions by hash, the Ballon d'Or rows of
// scripts/data/ballonDorVerified2026-09.json, shirt numbers a 500); every other foreign host is aborted, so nothing
// reaches the live database. Math.random is seeded, the clock fixed at 17:00 UTC of PLAY_DATE.
//   P1 at 390x844 and 1280x900, reduced motion on and off: the rules sheet on a first visit with the sentence, then
//      Swap at question 1: the new question is not on the ladder, the other 14 rungs do not move, the difficulty
//      stays, the board shows it, Swap is disabled, the page does not move or scroll sideways.
//   P2 the rules sheet's own worked example: answer 11 right on the daily, Swap at question 12.
//   P3 a fleet: SWAPS_AT_1 Unlimited ladders swapped at question 1 and one swapped at each of DEEP rungs.
// WALK_EXPECT=base runs against the base build (5f9303bf8): P3 must find a repeat, or the walk is blind (exit 3).
// Exit 0 green, 1 red (or the base control fired), 2 could not run, 3 the base control did not fire.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const HEAD = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const DATE = process.env.PLAY_DATE || '2026-11-02';
const EXPECT_BASE = process.env.WALK_EXPECT === 'base';
const OUT = path.join(process.env.RC_OUT || path.resolve('walk-out'), EXPECT_BASE ? 'base' : 'head');
const SWAPS_AT_1 = Number(process.env.SWAPS_AT_1 || 30);
const DEEP = [3, 6, 9, 12, 15];
fs.mkdirSync(OUT, { recursive: true });
const issues = [];
const stats = { swaps: 0, repeats: 0, back: 0, moved: 0 };
const say = s => console.log(s);
const couldNot = m => { console.log(`review-run-walk: could not run: ${m}`); process.exit(2); };
const SENTENCE = "It never deals a question that's already on your ladder";

const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const POS = ['Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward'];
const market = J('scripts/data/alphabetSprintPool.json').rows
  .filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd), position: POS[fnv(r.player_name) % POS.length] }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballon = J('scripts/data/ballonDorVerified2026-09.json').rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }));

async function serve(route) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const table = url.pathname.split('/').pop();
  if (req.method() === 'GET' && url.pathname.includes('/rest/v1/')) {
    if (table === 'player_market_values_dedup') {
      const off = Number(url.searchParams.get('offset') || 0), lim = Number(url.searchParams.get('limit') || 1000);
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(market.slice(off, off + lim)) });
    }
    if (table === 'ballon_dor') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(ballon) });
    if (table === 'shirt_number_puzzles') return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"review walk: fails on purpose"}' });
  }
  return route.abort();
}

/* the board (rung label, question text, Swap button, scroll) and the ladder the page holds (its useState array) */
const READ = () => {
  const label = [...document.querySelectorAll('span')].find(s => /^Question \d+ of \d+/.test((s.textContent || '').trim()));
  const p = label && label.parentElement && label.parentElement.parentElement ? label.parentElement.parentElement.querySelector('p') : null;
  const swap = [...document.querySelectorAll('button')].find(b => /^Swap$/.test((b.textContent || '').trim()));
  let ladder = null;
  if (label) {
    const key = Object.keys(label).find(k => k.startsWith('__reactFiber$'));
    for (let f = key ? label[key] : null; f && !ladder; f = f.return) {
      for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) {
        const v = h.memoizedState;
        if (Array.isArray(v) && v.length === 15 && v.every(q => q && typeof q.question === 'string' && Array.isArray(q.options))) { ladder = v.map(q => ({ question: q.question, options: q.options, correctIndex: q.correctIndex, difficulty: q.difficulty })); break; }
      }
    }
  }
  return {
    rung: label ? Number(/^Question (\d+)/.exec(label.textContent.trim())[1]) : null, question: p ? (p.textContent || '').trim() : null,
    swapDisabled: swap ? swap.disabled : null, scrollX: Math.round(window.scrollX), scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > window.innerWidth + 1, ladder,
  };
};

async function open(browser, viewport, motion, seed) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: motion });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith(HEAD)) return route.continue(); if (/supabase\.co/.test(u)) return serve(route); return route.abort(); });
  await ctx.addInitScript(s => {
    try { localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() })); } catch {}
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0]));
  await page.clock.setFixedTime(new Date(`${DATE}T17:00:00Z`));
  await page.goto(`${HEAD}/sports-millionaire`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}
const atRung = (page, n) => page.waitForFunction(k => [...document.querySelectorAll('span')].some(s => new RegExp(`^Question ${k} of 15`).test((s.textContent || '').trim())), n, { timeout: 15000 }).then(() => true).catch(() => false);
async function clickButton(page, re) {
  return page.evaluate(src => { const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test((x.textContent || '').trim()) && !x.disabled); if (b) b.click(); return !!b; }, re);
}
async function answerUpTo(page, rung, tag) {
  for (let r = 1; r < rung; r++) {
    const s = await page.evaluate(READ);
    if (s.rung !== r || !s.ladder) { issues.push(`${tag}: expected question ${r}, the board shows ${s.rung}`); return false; }
    const q = s.ladder[r - 1];
    const want = String.fromCharCode(65 + q.correctIndex) + q.options[q.correctIndex];
    const ok = await page.evaluate(w => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === w); if (b) b.click(); return !!b; }, want);
    if (!ok) { issues.push(`${tag}: no option button reads ${want}`); return false; }
    if (!(await atRung(page, r + 1))) { issues.push(`${tag}: the right answer to question ${r} did not move the board on`); return false; }
    await page.waitForTimeout(150);
  }
  return true;
}
/* one swap on the question on screen, checked against the ladder the page held just before it */
async function swapAndCheck(page, tag, shot) {
  await page.waitForTimeout(200);
  const before = await page.evaluate(READ);
  if (!before.ladder || !before.rung) { issues.push(`${tag}: could not read the ladder before the swap`); return null; }
  if (before.swapDisabled !== false) { issues.push(`${tag}: Swap is not enabled at question ${before.rung}`); return null; }
  if (shot) await page.screenshot({ path: path.join(OUT, `${shot}-before.png`) });
  await clickButton(page, '^Swap$');
  await page.waitForTimeout(400);
  const after = await page.evaluate(READ);
  if (shot) await page.screenshot({ path: path.join(OUT, `${shot}-after.png`) });
  const i = before.rung - 1;
  const was = before.ladder[i], now = after.ladder ? after.ladder[i] : null;
  stats.swaps += 1;
  if (!now) { issues.push(`${tag}: could not read the ladder after the swap`); return null; }
  const texts = before.ladder.map(q => q.question);
  if (now.question === was.question) { stats.back += 1; say(`  ${tag}: the swap handed back question ${before.rung}`); }
  else if (texts.includes(now.question)) { stats.repeats += 1; issues.push(`${tag}: the swap at question ${before.rung} dealt "${now.question}", already rung ${texts.indexOf(now.question) + 1} of the ladder`); }
  const others = after.ladder.filter((q, k) => k !== i).map(q => q.question).join('|') === before.ladder.filter((q, k) => k !== i).map(q => q.question).join('|');
  if (!others) { stats.moved += 1; issues.push(`${tag}: the swap moved another rung of the ladder`); }
  if (now.difficulty !== was.difficulty) issues.push(`${tag}: the difficulty moved ${was.difficulty} to ${now.difficulty}`);
  if (after.question !== now.question) issues.push(`${tag}: the board shows "${after.question}" but the ladder holds "${now.question}"`);
  if (after.rung !== before.rung) issues.push(`${tag}: the rung moved ${before.rung} to ${after.rung}`);
  if (after.swapDisabled !== true) issues.push(`${tag}: Swap is still enabled after the swap`);
  if (after.scrollX !== before.scrollX || after.scrollY !== before.scrollY) issues.push(`${tag}: the page moved (${before.scrollX},${before.scrollY} to ${after.scrollX},${after.scrollY})`);
  if (after.sideways) issues.push(`${tag}: the page scrolls sideways`);
  return { before, after, was, now };
}

const browser = await chromium.launch();
try {
  /* P1: first visit, the rules sheet, a swap at question 1, two widths, reduced motion on and off */
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const motion of ['reduce', 'no-preference']) {
      const tag = `P1 ${viewport.width} ${motion}`;
      const { ctx, page, errors } = await open(browser, viewport, motion, 1579 + viewport.width);
      const dialog = page.getByRole('dialog');
      const opened = await dialog.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
      if (!opened) issues.push(`${tag}: the rules sheet did not open on a first visit`);
      else {
        await page.waitForTimeout(500);
        const text = (await dialog.textContent()) || '';
        if (!text.includes(SENTENCE)) issues.push(`${tag}: the rules sheet lacks the Swap sentence`);
        const play = page.getByRole('button', { name: "Let's Play!" });
        const box = await play.boundingBox();
        const dbox = await dialog.boundingBox();
        say(`  ${tag}: sheet ${dbox ? `${Math.round(dbox.x)},${Math.round(dbox.y)} ${Math.round(dbox.width)}x${Math.round(dbox.height)}` : 'none'}; Let's Play ${box ? `at y ${Math.round(box.y)} h ${Math.round(box.height)}` : 'none'}; sentence ${text.includes(SENTENCE)}`);
        if (dbox && (dbox.x < 0 || dbox.x + dbox.width > viewport.width + 1)) issues.push(`${tag}: the rules sheet is wider than the screen`);
        await page.screenshot({ path: path.join(OUT, `rules-${viewport.width}-${motion}.png`) });
        await play.click();
        await dialog.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
      }
      if (!(await atRung(page, 1))) couldNot(`${tag}: question 1 never showed`);
      const r = await swapAndCheck(page, tag, `swap1-${viewport.width}-${motion}`);
      if (r) say(`  ${tag}: "${r.was.question}" swapped for "${r.now.question}" (difficulty ${r.now.difficulty})`);
      if (errors.length) issues.push(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
      await ctx.close();
    }
  }
  /* P2: the worked example of the rules sheet, question 12 of the daily */
  for (const [viewport, motion] of [[{ width: 390, height: 844 }, 'no-preference'], [{ width: 1280, height: 900 }, 'reduce']]) {
    const tag = `P2 ${viewport.width} ${motion}`;
    const { ctx, page, errors } = await open(browser, viewport, motion, 12);
    await page.getByRole('dialog').waitFor({ timeout: 20000 }).catch(() => {});
    await page.getByRole('button', { name: "Let's Play!" }).click().catch(() => {});
    if (!(await atRung(page, 1))) couldNot(`${tag}: question 1 never showed`);
    if (await answerUpTo(page, 12, tag)) {
      const r = await swapAndCheck(page, tag, `swap12-${viewport.width}-${motion}`);
      if (r) say(`  ${tag}: question 12 "${r.was.question}" (difficulty ${r.was.difficulty}) swapped for "${r.now.question}" (difficulty ${r.now.difficulty}); ladder texts ${r.before.ladder.map(q => q.question.slice(0, 40)).join(' / ')}`);
    }
    if (errors.length) issues.push(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  /* P3: the fleet, Unlimited ladders dealt by the Daily and Unlimited toggles */
  {
    const tag = 'P3 1280 reduce';
    const { ctx, page, errors } = await open(browser, { width: 1280, height: 900 }, 'reduce', 777);
    await page.getByRole('dialog').waitFor({ timeout: 20000 }).catch(() => {});
    await page.getByRole('button', { name: "Let's Play!" }).click().catch(() => {});
    if (!(await atRung(page, 1))) couldNot(`${tag}: question 1 never showed`);
    const plan = [...Array.from({ length: SWAPS_AT_1 }, () => 1), ...DEEP];
    for (const [n, rung] of plan.entries()) {
      if (!(await clickButton(page, 'Unlimited$'))) { issues.push(`${tag}: no Unlimited toggle`); break; }
      if (!(await atRung(page, 1))) { issues.push(`${tag} #${n}: an Unlimited ladder never reached question 1`); break; }
      if (rung > 1 && !(await answerUpTo(page, rung, `${tag} #${n}`))) break;
      await swapAndCheck(page, `${tag} #${n} q${rung}`, n === SWAPS_AT_1 + DEEP.length - 1 ? 'swap15-1280-reduce' : '');
      if (!(await clickButton(page, 'Daily$'))) { issues.push(`${tag}: no Daily toggle`); break; }
      await page.waitForTimeout(200);
    }
    if (errors.length) issues.push(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
say(`review-run-walk ${EXPECT_BASE ? 'BASE' : 'HEAD'}: swaps ${stats.swaps}, repeats ${stats.repeats}, handed back ${stats.back}, other rungs moved ${stats.moved}`);
for (const m of issues) console.log(`  RED: ${m}`);
if (EXPECT_BASE) {
  const fired = stats.repeats > 0;
  console.log(fired ? `review-run-walk: control base fired (${stats.repeats} repeat(s) in ${stats.swaps} swaps)` : `review-run-walk: control base did NOT fire (0 repeats in ${stats.swaps} swaps)`);
  process.exit(fired ? 1 : 3);
}
console.log(issues.length ? `review-run-walk: ${issues.length} red line(s)` : 'review-run-walk: green');
process.exit(issues.length ? 1 : 0);
