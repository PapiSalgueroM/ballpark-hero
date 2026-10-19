/**
 * Club Manager's difficulty levels on the screens (Round 1501, five levels and the change between matches since
 * Round 1512), at 320 by 640, 390 by 844 and 1280 by 900.
 *
 *   (d) The Dugout step's Career options card offers Very Easy, Easy, Medium, Hard and Impossible with Medium
 *       pressed. Skip starts a Medium career: its save carries no level and no easy mark and it wears no level
 *       pill. In Options its Difficulty row reads Medium with scores on; one tap on Easy only arms it (the save
 *       is unchanged and the tile is marked armed), and one tap on Hard switches (a harder level never asks).
 *   (a) Pressing every tile in turn (Very Easy, Easy, Hard, Impossible, Medium, Easy) moves nothing (scrollY and
 *       the document height the same after every press); every tile is at least 44 px tall and nothing in the
 *       card is under 12 px; the page is no wider than the screen. Skip starts an Easy career: the save holds
 *       'easy' and the easy mark of season 1, the hub wears the Easy pill, nothing in the header overlaps.
 *   (e) At PLAY_WIDTHS only (390 and 1280): two matches played on Easy; Options reads Easy with scores off;
 *       one tap on Impossible switches (the career already posts nothing, so nothing asks); one more match
 *       played; a reload keeps Impossible and the easy mark, the hub wears the Impossible pill and Options still
 *       says scores off.
 *   (c) The Managers screen's card names the level the career is on now.
 *
 * The database host is blocked; the page plays on a seeded stream (DIFF_SEED, scripts/lib/pageSeed.mjs).
 * Pictures of each step go to $RC_OUT when it is set; look at them.
 *
 * CONTROLS patch the SERVED chunk (scripts/lib/servedCodeControl.mjs), never src, and exit 0 only when every
 * check aimed at them went red:
 *   PLAY_DIFF_CONTROL=nopill renames the level pill's marker: the pill checks go red at every width.
 *   PLAY_DIFF_CONTROL=jump drops the Dugout blurbs that are not pressed out of their shared grid cell, so the box
 *     is as tall as the pressed one only: the tile press check goes red at 320 (the control is aimed at 320 alone
 *     and refuses to run without it).
 *   PLAY_DIFF_CONTROL=nolevel makes the Options row's change call do nothing (Round 1512): the change checks go
 *     red at every play width.
 *
 *   #!serve then: node scripts/playCmDifficulty.mjs        WIDTHS=390 PLAY_DIFF_CONTROL=nopill node scripts/playCmDifficulty.mjs
 *                 WIDTHS=320 PLAY_DIFF_CONTROL=jump node scripts/playCmDifficulty.mjs
 *                 WIDTHS=390 PLAY_DIFF_CONTROL=nolevel node scripts/playCmDifficulty.mjs
 */
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const CONTROL = process.env.PLAY_DIFF_CONTROL || '';
if (CONTROL && !['nopill', 'jump', 'nolevel'].includes(CONTROL)) { console.error(`PLAY_DIFF_CONTROL=${CONTROL} is not a control this walk knows (nopill, jump, nolevel)`); process.exit(2); }
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.DIFF_SEED); } catch (e) { console.error(`DIFF_SEED: ${e.message}`); process.exit(2); }
const HEIGHTS = { 320: 640, 390: 844, 1280: 900 };
const WIDTHS = (process.env.WIDTHS || '320,390,1280').split(',').map(Number);
const PLAY_WIDTHS = (process.env.PLAY_WIDTHS || '390,1280').split(',').map(Number);
if (CONTROL === 'jump' && !WIDTHS.includes(320)) { console.error('PLAY_DIFF_CONTROL=jump is aimed at 320; run it with WIDTHS=320'); process.exit(2); }
if (CONTROL === 'nolevel' && !WIDTHS.some(w => PLAY_WIDTHS.includes(w))) { console.error('PLAY_DIFF_CONTROL=nolevel needs a play width'); process.exit(2); }
console.log(`playCmDifficulty: seed ${SEED} (replay with DIFF_SEED=${SEED}), widths ${WIDTHS.join(', ')}, play widths ${PLAY_WIDTHS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}`);
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
const KEY = 'dukb-club-manager-save';
const errors = [];
const WORD = { veryeasy: 'Very Easy', easy: 'Easy', normal: 'Medium', hard: 'Hard', legend: 'Impossible' };
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const pause = (page, ms) => page.waitForTimeout(ms);
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { level: c.startOptions?.difficulty ?? null, easySince: c.startOptions?.easySince ?? null, played: c.careerStats?.played ?? null, week: c.week, sacked: !!c.sacked };
}, KEY).catch(() => null);
const sizes = (page, sel) => page.evaluate(s => {
  let font = Infinity, button = Infinity;
  for (const root of document.querySelectorAll(s)) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasText) font = Math.min(font, parseFloat(getComputedStyle(el).fontSize));
      if (el.tagName === 'BUTTON') button = Math.min(button, el.getBoundingClientRect().height);
    }
  }
  return { font, button };
}, sel);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
/** The header row holding the season pill: its height, and whether any two of its children overlap. */
const header = page => page.evaluate(() => {
  const pill = [...document.querySelectorAll('span')].find(e => /· Season \d/.test(e.textContent || ''));
  const row = pill?.parentElement;
  if (!row) return null;
  const boxes = [...row.children].map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5) overlaps += 1;
  }
  return { height: Math.round(row.getBoundingClientRect().height * 10) / 10, overlaps, right: Math.max(...boxes.map(b => b.right)) };
});
const pillOf = async page => ((await page.locator('[data-cm-level-pill]').innerText().catch(() => '')) || '').trim();
/* setDifficulty's last line, return { ...state, startOptions: optionsAtLevel(state, level) }, as the build writes
   it; the control hands the state back with its old block, so a tap changes nothing. */
const NOLEVEL_FIND = /return\{\.\.\.([\w$]+),startOptions:[\w$]+\(\1,[\w$]+\)\}/g;
const NOLEVEL_REPLACE = 'return{...$1}';

const browser = await chromium.launch();
async function newCtx(vp) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, SEED);
  if (CONTROL === 'nopill') await installServedCodeControl(ctx, [{ label: 'pill', find: /"data-cm-level-pill":/g, replace: '"data-cm-level-gone":' }], proof);
  /* The blurbs that are not pressed leave the grid cell (display none instead of visibility hidden), so the box
     is only as tall as the pressed one: the fixed box the review found jumping at 320. */
  if (CONTROL === 'jump') await installServedCodeControl(ctx, [{ label: 'blurb', find: /("col-start-1 row-start-1",[\w$]+!==?[\w$]+&&")invisible"/g, replace: '$1hidden"' }], proof);
  /* Round 1512: the Options row's tile calls its change handler through an optional call; the control turns
     that call into nothing, so a tap changes no level. */
  if (CONTROL === 'nolevel') await installServedCodeControl(ctx, [{ label: 'change', find: NOLEVEL_FIND, replace: NOLEVEL_REPLACE }], proof);
  return ctx;
}
/** A fresh start to the club picker: 2026-27, England, the Premier League, Brentford, to the Dugout step. */
async function toDugout(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
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
  return page;
}
const skip = async page => {
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
};
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
/** Back to the hub from a panel or a match screen. */
async function toHub(page) {
  for (let i = 0; i < 8 && !(await visible(page.locator('[data-cm-meters]'))); i += 1) {
    const home = page.locator('button', { hasText: 'Club home' });
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await visible(home)) await home.first().click({ timeout: 4000 }).catch(() => {});
    else if (await visible(onward)) await onward.first().click({ timeout: 4000 }).catch(() => {});
    else { const tab = page.getByRole('tab', { name: 'Home', exact: true }); if (await visible(tab)) await tab.first().click({ timeout: 4000 }).catch(() => {}); }
    await pause(page, 600);
  }
}
/** Plays on until the save counts n more matches of the career (Quick Sim, through windows and reports). */
async function playMatches(page, n) {
  const start = (await readSave(page))?.played ?? 0;
  let steps = 0;
  for (; steps < 60; steps += 1) {
    const s = await readSave(page);
    if (s && s.played >= start + n) break;
    const quick = page.getByRole('button', { name: '⚡ Quick Sim', exact: true });
    if (await visible(quick)) { await quick.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 800); continue; }
    const win = page.locator('button', { hasText: 'Open the Window' });
    if (await visible(win)) { await win.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 600); }
    await toHub(page);
    await pause(page, 300);
  }
  await toHub(page);
  const end = (await readSave(page))?.played ?? 0;
  console.log(`   played ${end - start} (wanted ${n}) in ${steps} steps`);
  return end - start;
}
async function openOptions(page) {
  await toHub(page);
  await page.locator('button', { hasText: /Currency, nation job, haggling|International job off/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('[data-cm-level-option]').waitFor({ timeout: 8000 }).catch(() => {});
}
const optionRow = async page => ({
  level: await page.locator('[data-cm-level-option]').getAttribute('data-cm-level-option').catch(() => null),
  scores: await page.locator('[data-cm-level-scores]').getAttribute('data-cm-level-scores').catch(() => null),
  text: ((await page.locator('[data-cm-level-option]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(),
});
const tapChoice = async (page, lv) => { await page.locator(`[data-cm-level-choice="${lv}"]`).click({ timeout: 5000 }).catch(() => {}); await pause(page, 400); };


for (const W of WIDTHS) {
  const vp = { width: W, height: HEIGHTS[W] ?? 900 };
  const plays = PLAY_WIDTHS.includes(W);
  console.log(`\n== ${vp.width} by ${vp.height}${plays ? ', with matches' : ''}`);

  /* (d) a Medium career: five tiles, Medium pressed, no key, no pill; in Options Easy asks and Hard does not. */
  const ctxD = await newCtx(vp);
  const pd = await toDugout(ctxD);
  const tilesD = await pd.locator('[data-cm-level-tile]').evaluateAll(els => els.map(e => [e.textContent, e.getAttribute('aria-checked')]));
  const wantD = [['Very Easy', 'false'], ['Easy', 'false'], ['Medium', 'true'], ['Hard', 'false'], ['Impossible', 'false']];
  say(JSON.stringify(tilesD) === JSON.stringify(wantD), `${W}: the Dugout step offers Very Easy, Easy, Medium, Hard and Impossible with Medium pressed (${JSON.stringify(tilesD)})`);
  await skip(pd);
  const sd = await readSave(pd);
  const normalHeader = await header(pd);
  say(!!sd && sd.level === null && sd.easySince === null && (await pd.locator('[data-cm-level-pill]').count()) === 0, `${W}: a Medium career carries no level and no easy mark and wears no level pill`);
  if (plays) {
    await openOptions(pd);
    const r0 = await optionRow(pd);
    say(r0.level === 'normal' && r0.scores === 'on', `${W}: Options reads Medium with scores on ("${r0.text.slice(0, 80)}")`);
    await tapChoice(pd, 'easy');
    const armed = await pd.locator('[data-cm-level-choice="easy"]').getAttribute('data-cm-level-armed').catch(() => null);
    const s1 = await readSave(pd);
    say(armed === 'yes' && !!s1 && s1.level === null && s1.easySince === null, `${W}: one tap on Easy only asks (armed ${armed}, saved level ${s1 && s1.level})`);
    await shot(pd, `diff-options-ask-${W}.png`);
    await tapChoice(pd, 'hard');
    await pause(pd, 400);
    const s2 = await readSave(pd);
    say(!!s2 && s2.level === 'hard' && s2.easySince === null, `${W}: one tap on Hard switches with no question (saved ${s2 && s2.level})`, CONTROL === 'nolevel');
  }
  await pd.close();
  await ctxD.close();

  /* (a) every tile in turn, ending on Easy, then Skip. */
  const ctxA = await newCtx(vp);
  const pa = await toDugout(ctxA);
  const easy = pa.locator('[data-cm-level-tile="easy"]');
  await pa.locator('[data-cm-level-tile="legend"]').scrollIntoViewIfNeeded().catch(() => {});
  const where = () => pa.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
  const steps = [['start', await where()]];
  for (const lv of ['veryeasy', 'easy', 'hard', 'legend', 'normal', 'easy']) {
    await pa.locator(`[data-cm-level-tile="${lv}"]`).click({ timeout: 5000 }).catch(() => {});
    await pause(pa, 250);
    steps.push([lv, await where()]);
  }
  say((await easy.getAttribute('aria-checked').catch(() => null)) === 'true', `${W}: Easy is pressed`);
  const moved = steps.filter(([, at]) => at.join() !== steps[0][1].join());
  say(moved.length === 0, `${W}: pressing every tile in turn moves nothing (${steps.map(([k, at]) => `${k} ${at[0]}/${at[1]}`).join(', ')})`, CONTROL === 'jump' && W === 320);
  const s = await sizes(pa, '[data-cm-career-options]');
  say(s.button >= 44 && s.font >= 12, `${W}: the card's shortest button is ${s.button.toFixed(1)} px and its smallest text ${s.font} px`);
  say(await fits(pa), `${W}: the Dugout step is no wider than the screen`);
  await shot(pa, `diff-dugout-${W}.png`);
  await skip(pa);
  say(await pa.locator('button:has-text("Finances")').count() > 0, `${W}: the Easy career is running`);
  const sa = await readSave(pa);
  say(!!sa && sa.level === 'easy' && sa.easySince === 1, `${W}: the save holds Easy and the easy mark of season 1 (${sa && sa.level}, ${sa && sa.easySince})`);
  say(await pillOf(pa) === 'Easy', `${W}: the hub wears the Easy pill ("${await pillOf(pa)}")`, CONTROL === 'nopill');
  const hA = await header(pa);
  say(!!hA && hA.overlaps === 0 && hA.right <= W + 1, `${W}: nothing in the header overlaps or runs off the page (${hA && hA.overlaps} overlaps)`);
  console.log(`   ${W}: header ${hA && hA.height} px on Easy, ${normalHeader && normalHeader.height} px on Medium`);
  await pa.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(pa, `diff-hub-${W}.png`);
  let now = 'easy';

  /* (e) two matches on Easy, Impossible from Options, one more match, a reload. */
  if (plays) {
    say(await playMatches(pa, 2) >= 2, `${W}: two matches played on Easy`);
    const tile = ((await pa.locator('button', { hasText: 'Currency, nation job, haggling' }).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    say(/Easy/.test(tile), `${W}: the Options tile reads "${tile.slice(0, 60)}"`);
    await openOptions(pa);
    const r1 = await optionRow(pa);
    say(r1.level === 'easy' && r1.scores === 'off', `${W}: Options reads Easy with scores off ("${r1.text.slice(0, 90)}")`);
    const before = await readSave(pa);
    await tapChoice(pa, 'legend');
    await pause(pa, 400);
    const r2 = await optionRow(pa);
    const after = await readSave(pa);
    say(r2.level === 'legend' && !!after && after.level === 'legend' && after.easySince === 1 && after.played === before?.played && after.week === before?.week,
      `${W}: one tap on Impossible switches between matches, the easy mark kept and nothing played moved (saved ${after && after.level}, mark ${after && after.easySince}, played ${before && before.played} then ${after && after.played})`, CONTROL === 'nolevel');
    say(await fits(pa), `${W}: Options is no wider than the screen`);
    await shot(pa, `diff-options-${W}.png`);
    say(await playMatches(pa, 1) >= 1, `${W}: one more match played`);
    const s3 = await readSave(pa);
    say(!!s3 && s3.level === 'legend' && s3.easySince === 1, `${W}: after that match the save is on Impossible with the easy mark (${s3 && s3.level}, ${s3 && s3.easySince})`, CONTROL === 'nolevel');
    /* The reload: the page opens on the saved career (or its Resume Career tile) on Impossible. */
    await pa.reload({ waitUntil: 'networkidle' });
    await pause(pa, 1500);
    if (!(await visible(pa.locator('[data-cm-meters]')))) {
      const resume = pa.getByRole('button', { name: /Resume Career/i });
      if (await visible(resume)) { await resume.first().click({ timeout: 5000 }).catch(() => {}); await pause(pa, 1500); }
    }
    const s4 = await readSave(pa);
    say(!!s4 && s4.level === 'legend' && s4.easySince === 1 && s4.played === s3?.played, `${W}: after a reload the save is still Impossible with the easy mark (${s4 && s4.level}, ${s4 && s4.easySince})`, CONTROL === 'nolevel');
    say(await pillOf(pa) === 'Impossible', `${W}: the hub wears the Impossible pill after the reload ("${await pillOf(pa)}")`, CONTROL === 'nopill' || CONTROL === 'nolevel');
    await openOptions(pa);
    const r3 = await optionRow(pa);
    say(r3.level === 'legend' && r3.scores === 'off', `${W}: Options after the reload reads Impossible with scores off`, CONTROL === 'nolevel');
    now = 'legend';
  }
  await pa.close();

  /* (c) the Managers screen's card names the level the career is on now. */
  const pc = await ctxA.newPage();
  pc.on('pageerror', e => errors.push(String(e)));
  await pc.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(pc, 1500);
  await pc.locator('[data-testid="cm-show-slots"]').click({ timeout: 6000 }).catch(() => {});
  await pc.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  const slot = ((await pc.locator('[data-testid="cm-slot-1"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  say(new RegExp(WORD[now]).test(slot), `${W}: the Managers card reads "${slot.slice(0, 90)}"`, CONTROL === 'nolevel' && plays);
  await shot(pc, `diff-slots-${W}.png`);
  await pc.close();
  await ctxA.close();
}
await browser.close();
say(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
const minGuarded = CONTROL === 'jump' ? WIDTHS.filter(w => w === 320).length
  : CONTROL === 'nolevel' ? 6 * WIDTHS.filter(w => PLAY_WIDTHS.includes(w)).length
    : WIDTHS.length + WIDTHS.filter(w => PLAY_WIDTHS.includes(w)).length;
process.exit(verdict('playCmDifficulty', proof, { minGuarded }));
