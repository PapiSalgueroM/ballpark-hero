// Round 1515 review (run lens): the kept aside card across Club Manager's slots, played the way a player would.
// An OLD unmarked copy (as the base code leaves one) and a slot 1 copy, marked as the branch marks it, sit beside a
// real career. Slot 1 offers its own copy; slot 2 (in place, then after a reload) offers only the old unmarked one;
// leaving that aside clears slot 2; slot 1 offers its copy again; putting it back works and marks the career it
// replaced with slot 1; slot 2 then offers nothing. Another game's copy is offered as before and writes no mark.
// At 390x844 and 1280x900, reduced motion on and off. The database host is blocked. Screenshots go to RC_OUT.
import path from 'node:path';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const KEY = 'dukb-club-manager-save', IDX = 'dukb-cm-slots', MARKS = 'dukb-set-aside-slot', BM = '.broken-';
const OLD = `${KEY}${BM}2026-10-01T09-00-00`;
const S1K = `${KEY}${BM}2026-10-15T09-00-00`;
const SC = `soccerCareerSave${BM}2026-10-02T09-00-00`;
const COMBOS = (process.env.COMBOS || '390:reduce,390:no-preference,1280:reduce,1280:no-preference').split(',');
let failures = 0;
const errors = [];
const check = (ok, msg) => { if (!ok) { failures += 1; console.log(`  FAIL: ${msg}`); } else console.log(`  ok: ${msg}`); return ok; };
const pause = (page, ms) => page.waitForTimeout(ms);
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const ls = (page, k) => page.evaluate(k => localStorage.getItem(k), k).catch(() => null);
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const card = page => page.locator('[data-dukb-set-aside]', { hasText: 'kept aside' });
const cardText = async page => ((await visible(card(page))) ? (await card(page).first().textContent().catch(() => '')) : '') || '';
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1).catch(() => false);
const cardInView = page => card(page).first().evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1; }).catch(() => false);

async function toHub(page) {
  for (let i = 0; i < 8 && !(await visible(page.locator('[data-cm-meters]'))); i += 1) {
    const resume = page.locator('[data-cm-slot-open="resume"]');
    const home = page.locator('button', { hasText: 'Club home' });
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await visible(resume)) await resume.first().click({ timeout: 4000 }).catch(() => {});
    else if (await visible(home)) await home.first().click({ timeout: 4000 }).catch(() => {});
    else if (await visible(onward)) await onward.first().click({ timeout: 4000 }).catch(() => {});
    await pause(page, 600);
  }
}
async function playOne(page) {
  const played = async () => page.evaluate(k => { const r = localStorage.getItem(k); return r ? (JSON.parse(r).careerStats?.played ?? 0) : 0; }, KEY).catch(() => 0);
  const start = await played();
  for (let steps = 0; steps < 40 && (await played()) < start + 1; steps += 1) {
    const quick = page.getByRole('button', { name: '⚡ Quick Sim', exact: true });
    if (await visible(quick)) { await quick.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 800); continue; }
    await toHub(page);
    await pause(page, 300);
  }
  await toHub(page);
  return (await played()) - start;
}
async function startCareer(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
}
async function toSlots(page) {
  await page.locator('[data-testid="cm-show-slots"]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 800);
}

const browser = await chromium.launch();
for (const combo of COMBOS) {
  const [w, motion] = combo.split(':');
  const W = Number(w), tag = `${W}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  console.log(`\n== ${W} wide, reduced motion ${motion}`);
  const ctx = await browser.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${tag}: ${String(e)}`));
  await startCareer(page);
  const s0 = await ls(page, KEY);
  check(!!s0, "a fresh career is saved before its first match");
  check(await playOne(page) >= 1, 'a first match played in slot 1');
  const s1 = await ls(page, KEY);
  check(!!s1, 'slot 1 holds a career');
  /* The old copy as the base code leaves it (no mark), and slot 1's copy as the branch marks it. */
  await page.evaluate(([OLD, S1K, MARKS, s1, s0]) => {
    localStorage.setItem(OLD, s1 + ' ');
    localStorage.setItem(S1K, s0 + '  ');
    localStorage.setItem(MARKS, JSON.stringify({ [S1K]: 1 }));
  }, [OLD, S1K, MARKS, s1, s0]);
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  const t1 = await cardText(page);
  check(/Oct 15/.test(t1), `slot 1 offers its own copy, the newest (card: ${t1.slice(0, 90)})`);
  check(await cardInView(page), 'the card sits inside the screen');
  check(await fits(page), 'the page is no wider than the screen');
  await shot(page, `s1-offer-${tag}.png`);

  /* Slot 2 in place: only the old unmarked copy may be offered, never slot 1's. */
  await toSlots(page);
  await page.locator('[data-testid="cm-slot-2"] button', { hasText: 'New manager' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1200);
  check(/"active":2/.test((await ls(page, IDX)) || ''), `slot 2 is active (${await ls(page, IDX)})`);
  const t2 = await cardText(page);
  check(/Oct 1\b/.test(t2) && !/Oct 15/.test(t2), `in place in slot 2 the card offers the old unmarked copy, not slot 1's (card: ${t2.slice(0, 90)})`);
  check(await fits(page), 'slot 2: the page is no wider than the screen');
  await shot(page, `s2-inplace-${tag}.png`);
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  const t3 = await cardText(page);
  check(/Oct 1\b/.test(t3) && !/Oct 15/.test(t3), `after a reload in slot 2, the same (card: ${t3.slice(0, 90)})`);
  await shot(page, `s2-reload-${tag}.png`);
  await page.locator('[data-dukb-set-aside] button', { hasText: 'Leave it aside' }).first().click({ timeout: 4000 }).catch(() => {});
  await pause(page, 500);
  check(!(await visible(card(page))), 'left aside, slot 2 offers nothing (slot 1\'s copy stays hidden)');
  await shot(page, `s2-clear-${tag}.png`);

  /* Back to slot 1: its copy is offered again; put it back. */
  await page.locator('[data-testid="cm-slot-1"] [data-cm-slot-open="resume"]').first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1500);
  const t4 = await cardText(page);
  check(/Oct 15/.test(t4), `back in slot 1 the card offers its copy again (card: ${t4.slice(0, 90)})`);
  await shot(page, `s1-back-${tag}.png`);
  const before = await ls(page, KEY);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    page.locator('[data-dukb-set-aside] button', { hasText: 'Put that save back' }).first().click({ timeout: 5000 }).catch(() => {}),
  ]);
  await pause(page, 1500);
  const after = await ls(page, KEY);
  /* The page re-saves the career it opens, so the bytes are the game's own; compare what the career says. */
  /* Slot 1's copy is the career before its first match (played 0); the one it replaces has played 1. */
  const playedOf = r => { try { return JSON.parse(r).careerStats?.played ?? null; } catch { return null; } };
  console.log(`  info: played after ${playedOf(after)}, copy ${playedOf(s0)}, replaced ${playedOf(before)}; lengths after ${after?.length} copy ${s0.length} replaced ${before?.length}`);
  check(after !== null && playedOf(after) === playedOf(s0) && playedOf(before) === playedOf(s1) && playedOf(s0) !== playedOf(s1), `the put back holds slot 1's copy (played ${playedOf(after)}, the copy ${playedOf(s0)}, the career it replaced ${playedOf(before)})`);
  const marks = JSON.parse((await ls(page, MARKS)) || '{}');
  const keptKey = Object.keys(marks).find(k => k !== S1K && k.startsWith(`${KEY}${BM}`));
  const keptBytes = keptKey ? await ls(page, keptKey) : null;
  check(!!keptKey && marks[keptKey] === 1 && keptBytes === before, `the career it replaced is kept aside and marked slot 1 (${JSON.stringify(marks).slice(0, 160)})`);
  const outcome = page.locator('[data-dukb-put-back]');
  check(await visible(outcome), `the put back card says what happened (${((await outcome.first().textContent().catch(() => '')) || '').slice(0, 90)})`);
  await shot(page, `s1-putback-${tag}.png`);
  await page.locator('[data-dukb-put-back] button', { hasText: 'OK' }).first().click({ timeout: 4000 }).catch(() => {});
  await toHub(page);
  await toSlots(page);
  await page.locator('[data-testid="cm-slot-2"] button', { hasText: 'New manager' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1200);
  const t5 = await cardText(page);
  check(/"active":2/.test((await ls(page, IDX)) || '') && !t5, `slot 2 again: nothing of slot 1's after the put back (card: ${t5.slice(0, 90)})`);
  await shot(page, `s2-after-putback-${tag}.png`);

  /* Another game: its copy is offered as before and nothing writes a mark for it. */
  const marksBefore = await ls(page, MARKS);
  await page.evaluate(SC => localStorage.setItem(SC, '{"currentClub":"Kept Town","age":24}'), SC);
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const t6 = await cardText(page);
  check(/Oct 2\b/.test(t6), `Soccer Career offers its own copy as before (card: ${t6.slice(0, 90)})`);
  check((await ls(page, MARKS)) === marksBefore, 'Soccer Career wrote no slot mark');
  await shot(page, `soccer-offer-${tag}.png`);
  await ctx.close();
}
/* The help's worked example: the opponent line reads the new edges, on screen, inside the width. */
for (const W of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`help ${W}: ${String(e)}`));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  await page.getByRole('button', { name: 'How to play' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 1500);
  const ex = page.locator('p', { hasText: 'An opponent of 80 plays you at' }).first();
  await ex.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const text = (await ex.textContent({ timeout: 5000 }).catch(() => '')) || '';
  check(text.includes('An opponent of 80 plays you at 82.5, 84.3, 78.5 and 77.'), `help ${W}: the example's opponent line is the new table's (${text.length} chars)`);
  check(await fits(page), `help ${W}: the page is no wider than the screen`);
  await shot(page, `help-example-${W}.png`);
  await ctx.close();
}
/* What's New: the round's entry is the newest, reads whole, and fits. */
for (const W of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`whatsnew ${W}: ${String(e)}`));
  await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
  await pause(page, 1200);
  const li = page.locator('li', { hasText: 'Hard and Impossible are harder again' }).first();
  await li.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const t = (await li.textContent({ timeout: 5000 }).catch(() => '')) || '';
  const first = (await page.locator('li').filter({ hasText: 'Club Manager:' }).first().textContent().catch(() => '')) || '';
  check(t.includes('18 percent') && t.includes('26 percent') && t.includes('slot it came from'), `whatsnew ${W}: the entry reads whole (${t.length} chars)`);
  check(first.includes('Hard and Impossible are harder again'), `whatsnew ${W}: the round's entry is the newest Club Manager one`);
  check(![0x2013, 0x2014].some(c => t.includes(String.fromCharCode(c))), `whatsnew ${W}: no dash in the entry`);
  check(await fits(page), `whatsnew ${W}: the page is no wider than the screen`);
  await shot(page, `whatsnew-${W}.png`);
  await ctx.close();
}
await browser.close();
for (const e of errors) console.log(`  page error: ${e}`);
const total = failures + errors.length;
console.log(total ? `walk1515: FAIL, ${failures} check(s) and ${errors.length} page error(s)` : `walk1515: OK at ${COMBOS.join(' ')}`);
process.exit(total ? 1 : 0);
