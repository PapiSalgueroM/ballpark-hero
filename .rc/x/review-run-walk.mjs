/* Review run lens, Round 1540: play the NBA Front Office's earned draft the way a player does, from a fresh
   franchise through a whole season to lottery night, at 390 by 844 and 1280 by 900, with reduced motion on and off,
   and play saves made by the BASE build (7a8750ba merged with 8cca3b31 and e3deb2cb) on the head build.
   BASE (head build) and OLD_BASE (base build) are served URLs. Supabase is aborted. Screenshots go to RC_OUT.
   It prints NOTE lines (what a player sees) and BAD lines (something broken); exit 1 when any BAD line printed. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const HEAD = process.env.BASE || 'http://localhost:4173';
const OLD = process.env.OLD_BASE || '';
const OUT = process.env.RC_OUT || '/tmp/review-walk';
const KEY = 'nba-front-office-save-v1';
const ONLY = process.env.WALK_ONLY || '';
fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
const note = (...a) => console.log('NOTE', ...a);
const fail = (...a) => { bad += 1; console.log('BAD', ...a); };
const browser = await chromium.launch();

async function open(url, size, { reduced = false, seed = 7, save = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  if (save) {
    await page.goto(`${url}/robots.txt`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(([k, v]) => { localStorage.setItem(k, v); }, [KEY, save]);
  }
  await page.goto(`${url}/nba-front-office`, { waitUntil: 'networkidle', timeout: 60000 });
  await answerConsent(page);
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const shotFull = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }); };
const saved = page => page.evaluate(k => localStorage.getItem(k), KEY);
const text = async (page, sel) => (await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '';
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const domClick = async (page, sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'attached', timeout: 15000 }); await el.evaluate(n => n.click()); await page.waitForTimeout(400); };
const ord = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

/* The page's own layout checks: no sideways scroll, every button of the earned screen 44 px tall or more. */
async function layout(page, tag) {
  const r = await page.evaluate(() => {
    const out = { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, short: [], small: [] };
    const root = document.querySelector('[data-gm-earned-draft]');
    if (root) {
      for (const b of root.querySelectorAll('button')) {
        const box = b.getBoundingClientRect();
        if (box.height > 0 && box.height < 43.5 && !b.closest('[data-lottery-reveal]') && !b.closest('[data-draft-night]')) out.short.push(`${(b.innerText || b.getAttribute('aria-label') || '').slice(0, 30)}=${Math.round(box.height)}`);
      }
      for (const el of root.querySelectorAll('p, span, div, button, li')) {
        if (el.closest('[data-lottery-reveal]') || el.closest('[data-draft-night]') || el.closest('[data-gm-panel-loading]')) continue;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!own) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12 && el.getBoundingClientRect().height > 0) out.small.push(`${el.textContent.trim().slice(0, 30)}=${fs}`);
      }
    }
    return out;
  });
  if (r.wide > 0) fail(`${tag}: the page scrolls sideways by ${r.wide} px`);
  if (r.short.length) fail(`${tag}: buttons under 44 px: ${r.short.slice(0, 4).join(' | ')}`);
  if (r.small.length) fail(`${tag}: own text under 12 px: ${r.small.slice(0, 4).join(' | ')}`);
}

/* A fresh franchise from the team grid (or the save as it stands), played to the recap's "Go to the draft". */
async function toDraftButton(page, tag, teamIndex = null) {
  if (teamIndex != null) {
    await page.locator('.grid button').nth(teamIndex).click();
    await page.waitForTimeout(900);
  }
  for (let i = 0; i < 260; i += 1) {
    if (await has(page, 'button:has-text("Go to the draft")')) return true;
    if (await has(page, '[data-gm-press] button')) { await page.locator('[data-gm-press] button').first().click(); await page.waitForTimeout(400); continue; }
    const round = page.locator('button:has-text("Play Round"), button:has-text("Final stretch")');
    if (await round.count()) { await round.first().click(); await page.waitForTimeout(180); continue; }
    if (await has(page, 'button:has-text("Continue to the hub")')) { await page.locator('button:has-text("Continue to the hub")').first().click(); await page.waitForTimeout(500); continue; }
    const play = page.getByText('Play', { exact: true });
    if (await play.count()) { await play.first().click(); await page.waitForTimeout(400); continue; }
    break;
  }
  fail(`${tag}: never reached "Go to the draft"`);
  await shotFull(page, `${tag}-stuck`);
  return false;
}

/* Lottery night as a player sees it: the card turning, the heading, then Continue. Returns what was read. */
async function lottery(page, tag, { reduced = false, reload = false } = {}) {
  await domClick(page, 'button:has-text("Go to the draft")');
  const stage0 = await page.evaluate(() => document.querySelector('[data-gm-earned-draft]')?.getAttribute('data-gm-earned-draft') ?? null);
  if (stage0 !== 'lottery') { fail(`${tag}: Go to the draft drew stage ${stage0}, not the lottery`); await shotFull(page, `${tag}-nolottery`); return null; }
  await page.locator('[data-gm-lottery]').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(150);
  await shot(page, `${tag}-card-t0`);
  const settled0 = await has(page, '[data-lottery-settled]');
  const op0 = await page.evaluate(() => { const h = document.querySelector('[data-lottery-headline]'); return h ? getComputedStyle(h).opacity : 'none'; });
  note(`${tag}: frame one settled=${settled0} headline opacity=${op0} (reduced=${reduced})`);
  if (reduced && !settled0) fail(`${tag}: reduced motion, but the card is not on its last frame at frame one`);
  if (!reduced && settled0) fail(`${tag}: motion on, but the card drew settled at once (no reveal played)`);
  const heading = await text(page, '[data-gm-draft-heading]');
  const chances = await text(page, '[data-gm-draft-chances]');
  note(`${tag}: heading before Continue: ${heading}`);
  const hasHelpOnCard = await has(page, '[data-gm-draft-help]');
  if (hasHelpOnCard) fail(`${tag}: the heading "?" is there while the lottery card is up`);
  if (!reduced) { await page.waitForTimeout(2500); await shot(page, `${tag}-card-mid`); }
  for (let i = 0; i < 40 && !(await has(page, '[data-lottery-settled]')); i += 1) await page.waitForTimeout(500);
  await page.waitForTimeout(600);
  await shot(page, `${tag}-card-end`);
  const tiles = await page.locator('[data-lottery-slot]').allInnerTexts();
  const mine = await page.locator('[data-lottery-mine]').allInnerTexts();
  note(`${tag}: tiles ${tiles.length}, his tile(s): ${mine.map(t => t.replace(/\s+/g, ' ')).join(' / ')}`);
  note(`${tag}: closing line: ${await text(page, '[data-lottery-headline]')}`);
  await layout(page, `${tag} card`);
  if (reload) {
    const before = tiles.join('|');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await shot(page, `${tag}-card-reload`);
    const st = await page.evaluate(() => document.querySelector('[data-gm-earned-draft]')?.getAttribute('data-gm-earned-draft') ?? null);
    const after = (await page.locator('[data-lottery-slot]').allInnerTexts()).join('|');
    if (st !== 'lottery') fail(`${tag}: a reload at the card drew stage ${st}`);
    if (!(await has(page, '[data-lottery-settled]'))) fail(`${tag}: a reload at the card replays the lottery (not settled)`);
    if (after !== before) fail(`${tag}: a reload at the card shows another draw`);
    note(`${tag}: reload at the card: stage ${st}, settled ${await has(page, '[data-lottery-settled]')}, same tiles ${after === before}`);
  }
  const y0 = await page.evaluate(() => window.scrollY);
  await domClick(page, '[data-lottery-continue]');
  await page.waitForTimeout(reduced ? 600 : 2500);
  const lines = await text(page, '[data-gm-draft-lines]');
  note(`${tag}: after Continue (scrollY ${y0} -> ${await page.evaluate(() => window.scrollY)}): ${lines}`);
  note(`${tag}: run card: ${await text(page, '[data-draft-night]')}`.slice(0, 400));
  const at = /on the clock at (\d+)/i.exec(lines);
  const picks = [...lines.matchAll(/(\d+)(?:st|nd|rd|th)/g)].map(m => Number(m[1]));
  for (const n of new Set([...(at ? [Number(at[1])] : []), ...picks])) {
    const outside = heading.replace(chances, '');
    if (new RegExp(`\\b${ord(n)}\\b|\\bat ${n}\\b|\\bpick ${n}\\b`, 'i').test(outside)) fail(`${tag}: the heading named his slot ${n} before Continue: ${outside}`);
  }
  return { heading, chances, lines };
}

const stageOf = page => page.evaluate(() => document.querySelector('[data-gm-earned-draft]')?.getAttribute('data-gm-earned-draft') ?? null);

/* On the clock: the "?" opened and closed, his scout's best taken, a reload between picks. */
async function clock(page, tag, { help = false, pick = true, reload = false } = {}) {
  await shot(page, `${tag}-clock`);
  await layout(page, `${tag} clock`);
  if (help && await has(page, '[data-gm-draft-help]')) {
    const y0 = await page.evaluate(() => window.scrollY);
    const b0 = await page.locator('[data-gm-draft-stage]').boundingBox();
    await domClick(page, '[data-gm-draft-help]');
    await shot(page, `${tag}-help-open`);
    note(`${tag}: help panel: ${(await text(page, '[data-gm-draft-help-panel]')).slice(0, 900)}`);
    const b1 = await page.locator('[data-gm-draft-stage]').boundingBox();
    const close = await page.locator('[data-gm-draft-help-close]').boundingBox().catch(() => null);
    const vh = page.viewportSize().height;
    if (close) note(`${tag}: the panel's own close button at y ${Math.round(close.y)} to ${Math.round(close.y + close.height)} of a ${vh} px view`);
    if (b0 && b1 && (Math.abs(b0.height - b1.height) > 1 || Math.abs(b0.y - b1.y) > 1)) fail(`${tag}: the "?" moved the stage (${JSON.stringify(b0)} -> ${JSON.stringify(b1)})`);
    await domClick(page, '[data-gm-draft-help]');
    const y1 = await page.evaluate(() => window.scrollY);
    if (y1 !== y0) fail(`${tag}: the "?" open and close moved scrollY ${y0} -> ${y1}`);
  }
  if (pick && await has(page, '[data-gm-draft-choice]')) {
    const who = await text(page, '[data-gm-draft-choice]');
    await domClick(page, '[data-gm-draft-choice]');
    await page.waitForTimeout(2500);
    note(`${tag}: picked "${who}"; now stage ${await stageOf(page)}: ${await text(page, '[data-gm-draft-lines]')}`);
    await shot(page, `${tag}-after-pick`);
    await layout(page, `${tag} after pick`);
  }
  if (reload && (await stageOf(page)) === 'clock') {
    const before = await text(page, '[data-gm-draft-lines]');
    const cls = await page.locator('[data-gm-draft-choice]').allInnerTexts();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const after = await text(page, '[data-gm-draft-lines]');
    const cls2 = await page.locator('[data-gm-draft-choice]').allInnerTexts();
    await shot(page, `${tag}-clock-reload`);
    if ((await stageOf(page)) !== 'clock' || before !== after || cls.join('|') !== cls2.join('|')) fail(`${tag}: a reload on the clock changed the night: "${before}" -> "${after}", board same ${cls.join('|') === cls2.join('|')}`);
    else note(`${tag}: reload on the clock kept the slot and the board`);
  }
}

/* The rest of the night by his staff (or the finish button), the closing screen, the hub. */
async function finish(page, tag, seasonBefore) {
  if (await has(page, '[data-gm-draft-staff]')) { note(`${tag}: staff button "${await text(page, '[data-gm-draft-staff]')}"`); await domClick(page, '[data-gm-draft-staff]'); }
  else if (await has(page, '[data-gm-draft-finish]')) await domClick(page, '[data-gm-draft-finish]');
  await page.waitForTimeout(3500);
  const st = await stageOf(page);
  await shot(page, `${tag}-over`);
  await layout(page, `${tag} over`);
  note(`${tag}: after the staff: stage ${st}: ${await text(page, '[data-gm-draft-lines]')} | done: ${await text(page, '[data-gm-draft-done]')}`.slice(0, 600));
  if (st !== 'over') fail(`${tag}: the night did not reach the closing screen (stage ${st})`);
  const out = page.locator('[data-gm-draft-leave], [data-draft-continue]');
  if (!(await out.count())) { fail(`${tag}: no way out of the closing screen`); return; }
  await out.first().evaluate(n => n.click());
  await page.waitForTimeout(1200);
  await shot(page, `${tag}-hub`);
  const s = JSON.parse(await saved(page));
  note(`${tag}: after leaving: phase ${s.phase}, season ${s.league?.season} (was ${seasonBefore}), round ${s.league?.round}`);
  if (s.phase !== 'hub' || s.league?.season !== seasonBefore + 1) fail(`${tag}: did not land on the next season's hub`);
}

/* The old draft screen (no earned screen), picked through by its own buttons to the hub. */
async function oldDraft(page, tag, seasonBefore) {
  if (await has(page, '[data-gm-earned-draft]')) { fail(`${tag}: the earned screen drew where the old draft must run`); await shot(page, `${tag}-wrong`); return; }
  await shot(page, `${tag}-old`);
  for (let i = 0; i < 20 && !(await has(page, 'button:has-text("Continue to the hub")')); i += 1) {
    const b = page.locator('[data-nba-draft-choice], .grid button');
    if (!(await b.count())) break;
    await b.first().evaluate(n => n.click());
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(2500);
  await shot(page, `${tag}-old-done`);
  if (!(await has(page, 'button:has-text("Continue to the hub")'))) { fail(`${tag}: the old draft never finished`); return; }
  await page.locator('button:has-text("Continue to the hub")').first().evaluate(n => n.click());
  await page.waitForTimeout(1000);
  const s = JSON.parse(await saved(page));
  note(`${tag}: old draft done: phase ${s.phase}, season ${s.league?.season} (was ${seasonBefore})`);
  if (s.phase !== 'hub' || s.league?.season !== seasonBefore + 1) fail(`${tag}: the old draft did not land on the next season's hub`);
}

const season = async page => JSON.parse(await saved(page))?.league?.season;
const want = id => !ONLY || ONLY.split(',').includes(id);

/* W1 to W4: a fresh franchise, a whole season, lottery night, the clock, the staff, the hub. */
const PLAYS = [
  { id: 'w1', size: [390, 844], reduced: false, team: 0, seed: 7, full: true },
  { id: 'w2', size: [1280, 900], reduced: false, team: 29, seed: 11 },
  { id: 'w3', size: [390, 844], reduced: true, team: 12, seed: 23 },
  { id: 'w4', size: [1280, 900], reduced: true, team: 20, seed: 31 },
];
for (const p of PLAYS) {
  if (!want(p.id)) continue;
  console.log(`== ${p.id}: ${p.size.join('x')} reduced motion ${p.reduced ? 'on' : 'off'}, team tile ${p.team}`);
  const { ctx, page, errors } = await open(HEAD, p.size, { reduced: p.reduced, seed: p.seed });
  try {
    if (!(await toDraftButton(page, p.id, p.team))) continue;
    await shot(page, `${p.id}-recap`);
    const s0 = await season(page);
    if (!(await lottery(page, p.id, { reduced: p.reduced, reload: !!p.full }))) continue;
    await clock(page, p.id, { help: true, pick: true, reload: !!p.full });
    await finish(page, p.id, s0);
    if (p.full) {
      console.log(`== ${p.id}b: the same save's second season`);
      if (await toDraftButton(page, `${p.id}b`)) {
        const s1 = await season(page);
        if (await lottery(page, `${p.id}b`, {})) { await clock(page, `${p.id}b`, { pick: false }); await finish(page, `${p.id}b`, s1); }
      }
    }
  } catch (e) { fail(`${p.id}: the walk threw: ${String(e).split('\n')[0]}`); await shotFull(page, `${p.id}-threw`).catch(() => {}); }
  if (errors.length) fail(`${p.id}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/* O: saves made by the BASE build, played on the head build; and one head save on the clock taken back to BASE. */
if (OLD && want('o')) {
  console.log('== o: saves made by the base build');
  let recap = null; let opened = null; let mid = null; let s0 = null;
  {
    const { ctx, page, errors } = await open(OLD, [390, 844], { seed: 5 });
    if (await toDraftButton(page, 'o-base', 5)) {
      recap = await saved(page); s0 = await season(page);
      await shot(page, 'o-base-recap');
      await domClick(page, 'button:has-text("Go to the draft")');
      await page.waitForTimeout(1500);
      opened = await saved(page);
      await shot(page, 'o-base-draft-open');
      const b = page.locator('[data-nba-draft-choice], .grid button');
      if (await b.count()) { await b.first().evaluate(n => n.click()); await page.waitForTimeout(1500); mid = await saved(page); }
      note(`o-base: base saves taken: recap ${!!recap}, draft open ${!!opened} (phase ${JSON.parse(opened || '{}').phase}), after one pick ${!!mid}`);
    }
    if (errors.length) fail(`o-base: page errors on the base build: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  if (recap) {
    const { ctx, page, errors } = await open(HEAD, [390, 844], { save: recap, seed: 9 });
    await shot(page, 'o2-head-recap');
    if (await has(page, 'button:has-text("Go to the draft")')) {
      const l = await lottery(page, 'o2', {});
      if (l) {
        const clockSave = await saved(page);
        await clock(page, 'o2', { pick: false });
        await finish(page, 'o2', s0);
        if (clockSave) {
          const back = await open(OLD, [390, 844], { save: clockSave, seed: 13 });
          await shot(back.page, 'o5-base-loads-head-clock');
          note(`o5: the base build on a head save on the clock: ${(await back.page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`);
          await oldDraft(back.page, 'o5', s0);
          if (back.errors.length) fail(`o5: page errors: ${back.errors.slice(0, 3).join(' | ')}`);
          await back.ctx.close();
        }
      }
    } else fail('o2: a base recap save on the head build shows no "Go to the draft"');
    if (errors.length) fail(`o2: page errors: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  for (const [id, save] of [['o3', opened], ['o4', mid]]) {
    if (!save) { fail(`${id}: no base save to plant`); continue; }
    const { ctx, page, errors } = await open(HEAD, [390, 844], { save, seed: 17 });
    await oldDraft(page, id, s0);
    if (errors.length) fail(`${id}: page errors: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

await browser.close();
console.log(bad ? `review walk: ${bad} BAD line(s).` : 'review walk: no BAD lines.');
process.exit(bad ? 1 : 0);
