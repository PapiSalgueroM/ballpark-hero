/* Round 1337: Soccer Career's screens say true things, in a real browser.
 *
 * A vite build served by scripts/lib/hostLikeServer.mjs (never npx serve -s), Chromium, the database
 * blocked (every context aborts supabase.co), saves from scripts/data/careerLeagueWorldSaves1100.json
 * written to localStorage before the page loads. Every section reads the save bytes before and after:
 * they must be equal (W4 lets the night's own reveal mark it seen, nothing else; W6 lets
 * soccerSquad:help be added, a key of its own).
 *
 *  W4  the Ballon d'Or night: while it counts down Full attributes is disabled with the night line, a press
 *      writes nothing, the nominee rows keep rising (never back to 0) and the result arrives once; once
 *      shown, Full attributes opens and Back finds the card complete. Every other hub control drawn during
 *      the countdown is pressed on a fresh load and any that unmounts the card is REPORTED (not a failure:
 *      the lead rules on those).
 *  W4r with reduced motion the card completes at mount and Full attributes is enabled. A no regression
 *      half: it passes on the base too.
 *  W5  Week by week: the 📺 button's aria-label holds "watch" and not "live"; the Season Centre help, on
 *      its first open through 📺 Season replays, has neither "Spanish" nor "nothing here can change" and
 *      names Next Season and Week by week.
 *  W6  the Squad sheet: the first open with the flag cleared lands on home with the one line hint, the hint
 *      and the first tile at the same y in the first frame and one second later; ? opens the help; the next
 *      open has no hint.
 *  W7  Training: the menu's rules block is one paragraph with its example, the first drill tile is in view
 *      at 390 without scrolling the panel, ? expands it to three paragraphs.
 *  W8  the attributes screen: a long name is whole in the title at 320, and every keeper label holds its
 *      whole text at 1280 and 320 (scrollWidth not above clientWidth, no ellipsis).
 *
 * THE BASE ARM IS EACH SECTION'S CONTROL. SCREEN_TRUTHS_BASE_DIST=<a plain vite build of the base> runs the
 * same walk against it: W4, W5, W6, W7 and W8 must each fail there, W4r must pass there, and the head must
 * pass every section. Without a base dist the head runs alone and the closing line says it is no proof.
 *
 * Run: npm run build, then [SCREEN_TRUTHS_BASE_DIST=<base dist>] ENGINES=chromium node scripts/playSoccerScreenTruths.mjs
 * Env: PORT (4631), BASE_PORT (4632), SECTIONS (W4,W4r,W5,W6,W7,W8), SHOTS (.tmp-fx/shots-1337), BASE or
 * SWEEP_BASE (a head server already running).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots-1337');
const BASE_DIST = process.env.SCREEN_TRUTHS_BASE_DIST ? path.resolve(process.env.SCREEN_TRUTHS_BASE_DIST) : null;
const ALL = ['W4', 'W4r', 'W5', 'W6', 'W7', 'W8'];
const SECTIONS = (process.env.SECTIONS || ALL.join(',')).split(',').map(s => s.trim()).filter(Boolean);
const BASE_MUST_FAIL = ['W4', 'W5', 'W6', 'W7', 'W8'];
const SAVE_KEY = 'soccerCareerSave';
const HINT_KEY = 'soccerSquad:help';
for (const s of SECTIONS) if (!ALL.includes(s)) { console.error(`unknown section ${s}`); process.exit(2); }

const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
function recordedSave(id) {
  const found = recorded.saves.find(save => save.id === id && save.kind === 'player')?.state;
  if (!found) throw new Error(`fixture refused: recorded ${id} career is absent`);
  return structuredClone(found);
}

/* ---------- servers ---------- */
const spawned = [];
async function answers(url) {
  for (let i = 0; i < 80; i++) {
    if (await fetch(url).then(r => r.ok).catch(() => false)) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}
async function serve(dir, port) {
  const url = `http://127.0.0.1:${port}`;
  if (await fetch(url + '/').then(r => r.ok).catch(() => false)) { console.error(`port ${port} already answers, refusing to test an unknown server`); process.exit(2); }
  spawned.push(spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), dir, String(port)], { stdio: 'ignore' }));
  if (!await answers(url + '/')) { console.error(`nothing answered at ${url}`); for (const s of spawned) s.kill(); process.exit(2); }
  return url;
}
const SUPPLIED = process.env.SWEEP_BASE || process.env.BASE || null;
const URLS = { head: SUPPLIED ? SUPPLIED.replace(/\/$/, '') : await serve(path.join(ROOT, 'dist'), Number(process.env.PORT || 4631)) };
if (BASE_DIST) URLS.base = await serve(BASE_DIST, Number(process.env.BASE_PORT || 4632));
if (!await answers(URLS.head + '/')) { console.error(`nothing answered at ${URLS.head}`); process.exit(2); }

/* ---------- checks, kept per arm and per section ---------- */
const verdicts = {};
let arm = 'head', section = '';
const reports = [];
function check(ok, label) {
  const key = `${arm}/${section}`;
  verdicts[key] ??= { checks: 0, failed: 0 };
  verdicts[key].checks += 1;
  if (!ok) verdicts[key].failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${arm}] ${section} ${label}`);
}
const report = line => { reports.push(`[${arm}] ${section} ${line}`); console.log(`NOTE [${arm}] ${section} ${line}`); };
async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${arm}-${name}.png`) });
}

/* ---------- pages ---------- */
let browser = null;
async function open(save, { width = 390, height = 844, reduced = false, extra = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, route => route.abort());
  await ctx.addInitScript(([serialized, more]) => {
    if (sessionStorage.getItem('screen-truths-seeded')) return;
    sessionStorage.setItem('screen-truths-seeded', '1');
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('rules-gate-seen:/soccer-career', '1');
    localStorage.setItem('soccerCareerSave', serialized);
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [JSON.stringify(save), extra]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
  await page.goto(`${URLS[arm]}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors };
}
const saveBytes = page => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
const storedKeys = page => page.evaluate(() => Object.keys(localStorage).sort());
const unrevealed = serialized => { const s = JSON.parse(serialized); if (s.pendingBallonDor) delete s.pendingBallonDor.revealed; return JSON.stringify(s); };
const attributesOpen = page => page.evaluate(() => [...document.querySelectorAll('h1')].some(h => /full attributes$/.test(h.textContent || '')));

/* The night: ten fictional names, the player third, the list not yet shown. */
function nightSave() {
  const save = recordedSave('ere');
  save.playerName = 'Night Fixture';
  const row = save.seasons.findLast(season => season.type === 'playing' && season.apps > 0);
  if (!row) throw new Error('fixture refused: no recorded playing season');
  const nominees = Array.from({ length: 10 }, (_, i) => ({ name: i === 2 ? save.playerName : `Fixture Candidate ${i + 1}`,
    points: 300 - i * 20, isPlayer: i === 2, nationality: save.nationality, club: i === 2 ? save.currentClub : 'Fixture FC',
    position: i === 2 ? save.position : 'ST', goals: 12, trophies: [] }));
  Object.assign(save, { phase: 'ballon_dor', pendingSummary: row,
    pendingBallonDor: { year: row.year, nominees, playerRank: 3, playerPoints: 260, playerNominated: true, moved: '' } });
  return save;
}
const NIGHT_LINE = "Opens once the Ballon d'Or night is over";
const CARD = '[data-award-night="ballon_dor"]';
async function recordFrames(page) {
  await page.evaluate(card => {
    window.__nightFrames = [];
    const sample = () => {
      const el = document.querySelector(card);
      const frame = el ? { ranks: el.querySelectorAll('[data-award-rank]').length, result: el.getAttribute('data-award-result') } : { ranks: -1, result: 'gone' };
      const last = window.__nightFrames.at(-1);
      if (!last || last.ranks !== frame.ranks || last.result !== frame.result) window.__nightFrames.push(frame);
    };
    sample();
    new MutationObserver(sample).observe(document.body, { childList: true, subtree: true, attributes: true });
  }, CARD);
}
const frames = page => page.evaluate(() => window.__nightFrames);
const attributesButton = page => page.getByRole('button', { name: /^Full attributes/ });
const enabledSoon = page => page.waitForFunction(() => {
  const b = [...document.querySelectorAll('button')].find(x => /^Full attributes/.test((x.textContent || '').trim()));
  return !!b && !b.disabled;
}, null, { timeout: 8000 }).then(() => true, () => false);

/* ---------- W4: the night counts down once, and Full attributes waits for it ---------- */
async function w4() {
  section = 'W4';
  const { ctx, page, errors } = await open(nightSave());
  try {
    await page.locator(CARD).waitFor({ timeout: 45000 });
    await recordFrames(page);
    const before = await saveBytes(page);
    const button = attributesButton(page);
    check(await page.locator(CARD).getAttribute('data-award-result') === 'waiting', 'the night is counting down when the hub is up');
    check(await button.isDisabled(), 'during the countdown Full attributes is disabled');
    check((await button.innerText()).includes(NIGHT_LINE), `during the countdown its second line reads "${NIGHT_LINE}"`);
    await button.scrollIntoViewIfNeeded();
    await shot(page, 'W4-countdown-390');
    const box = await button.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);
    const opened = await attributesOpen(page);
    check(!opened, 'a press during the countdown does not open Full attributes');
    check(await saveBytes(page) === before, 'a press during the countdown writes nothing');
    if (opened) await page.getByRole('button', { name: '← Back', exact: true }).first().click();
    await page.locator(`${CARD}[data-award-result="revealed"]`).waitFor({ timeout: 30000 });
    const seen = await frames(page);
    const ranks = seen.map(f => f.ranks);
    const dropped = ranks.some((r, i) => i > 0 && r < ranks[i - 1]);
    check(!dropped && Math.max(...ranks) === 10, `the nominee rows only rise, to all ten (${ranks.join(' ')})`);
    const results = seen.map(f => f.result).filter((r, i, all) => i === 0 || r !== all[i - 1]);
    check(results.filter(r => r === 'revealed').length === 1 && results.at(-1) === 'revealed' && !results.includes('gone'),
      `the result arrives once and the card never leaves (${results.join(' > ')})`);
    check(await enabledSoon(page), 'once the night has been shown Full attributes is enabled');
    check(!(await button.innerText()).includes(NIGHT_LINE), 'and its second line is the usual one again');
    await button.click();
    check(await attributesOpen(page), 'it opens Full attributes');
    await shot(page, 'W4-attributes-390');
    await page.getByRole('button', { name: '← Back', exact: true }).first().click();
    await page.locator(CARD).waitFor();
    const back = await page.locator(CARD).evaluate(el => ({ ranks: el.querySelectorAll('[data-award-rank]').length, result: el.getAttribute('data-award-result') }));
    check(back.ranks === 10 && back.result === 'revealed', `Back finds the card complete (${back.ranks} rows, ${back.result})`);
    await shot(page, 'W4-back-390');
    check(unrevealed(await saveBytes(page)) === unrevealed(before), 'the save is unchanged but for the night being marked seen');
    check(errors.length === 0, `no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* Every other hub control drawn during the countdown, pressed on a fresh load: REPORTED, never failed. */
async function w4Others() {
  section = 'W4';
  const save = nightSave();
  let controls = [];
  {
    const { ctx, page } = await open(save);
    try {
      await page.locator(CARD).waitFor({ timeout: 45000 });
      controls = await page.evaluate(card => {
        const c = document.querySelector(card);
        return [...document.querySelectorAll('button')].map((b, i) => ({ i, name: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
          shown: !!(b.offsetWidth || b.offsetHeight), inCard: c.contains(b), off: b.disabled })).filter(b => b.shown && !b.inCard && !b.off);
      }, CARD);
    } finally { await ctx.close(); }
  }
  let unmounting = 0;
  for (const b of controls) {
    const { ctx, page } = await open(save);
    try {
      await page.locator(CARD).waitFor({ timeout: 45000 });
      await page.evaluate(card => { document.querySelector(card).dataset.probe = 'held'; }, CARD);
      const handle = (await page.$$('button'))[b.i];
      if (!handle) { report(`control ${b.i} "${b.name}" is not there on a fresh load`); continue; }
      await handle.click({ timeout: 3000 }).catch(e => report(`control "${b.name}" could not be pressed (${String(e).split('\n')[0].slice(0, 60)})`));
      await page.waitForTimeout(600);
      if (!await page.evaluate(card => !!document.querySelector(`${card}[data-probe="held"]`), CARD)) {
        unmounting += 1;
        report(`pressing "${b.name}" during the countdown unmounts the night's card (it would count down again)`);
      }
    } finally { await ctx.close(); }
  }
  report(`${controls.length} other hub controls pressed during the countdown, ${unmounting} of them unmount the card`);
}

/* ---------- W4r: reduced motion completes the card at mount (passes on the base too) ---------- */
async function w4r() {
  section = 'W4r';
  const { ctx, page, errors } = await open(nightSave(), { reduced: true });
  try {
    await page.locator(CARD).waitFor({ timeout: 45000 });
    const before = await saveBytes(page);
    const at = await page.locator(CARD).evaluate(el => ({ ranks: el.querySelectorAll('[data-award-rank]').length, result: el.getAttribute('data-award-result') }));
    check(at.ranks === 10 && at.result === 'revealed', `with reduced motion the card is complete at mount (${at.ranks} rows, ${at.result})`);
    check(await enabledSoon(page), 'and Full attributes is enabled');
    await attributesButton(page).click();
    check(await attributesOpen(page), 'it opens Full attributes');
    await page.getByRole('button', { name: '← Back', exact: true }).first().click();
    await page.locator(CARD).waitFor();
    const back = await page.locator(CARD).evaluate(el => ({ ranks: el.querySelectorAll('[data-award-rank]').length, result: el.getAttribute('data-award-result') }));
    check(back.ranks === 10 && back.result === 'revealed', `Back finds the card complete (${back.ranks} rows, ${back.result})`);
    check(unrevealed(await saveBytes(page)) === unrevealed(before), 'the save is unchanged but for the night being marked seen');
    check(errors.length === 0, `no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- W5: Week by week says it is a watch, and the help says what the sheet is ---------- */
async function w5(width, height) {
  section = 'W5';
  const { ctx, page, errors } = await open(recordedSave('cha'), { width, height });
  try {
    const watch = page.locator('[data-week-by-week]');
    await watch.waitFor({ timeout: 45000 });
    const label = (await watch.getAttribute('aria-label')) || '';
    check(label.startsWith('Week by week') && label.includes('watch') && !label.includes('live'), `${width}: the 📺 button says watch, not live ("${label}")`);
    const before = await saveBytes(page);
    await page.locator('[data-open-season-replays]').click();
    const pick = page.locator('[data-picker-list] button').first();
    await pick.waitFor({ timeout: 15000 });
    await pick.click();
    const help = page.getByRole('dialog', { name: 'How the Season Centre works' });
    await help.waitFor({ timeout: 15000 });
    const text = await help.innerText();
    check(!text.includes('Spanish'), `${width}: the help's first open has no Spanish pool sentence`);
    check(!text.includes('nothing here can change'), `${width}: the help's first open does not say "nothing here can change"`);
    check(text.includes('Next Season') && text.includes('Week by week'), `${width}: the help names Next Season and Week by week`);
    await shot(page, `W5-help-${width}`);
    check(await saveBytes(page) === before, `${width}: watching a past season writes nothing to the save`);
    check(errors.length === 0, `${width}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- W6: the Squad sheet opens on the squad, with a one line pointer to its ? ---------- */
function squadSave() {
  const save = recordedSave('ere');
  Object.assign(save, { phase: 'playing', retired: false, currentClub: 'Arsenal', currentClubCountry: 'England', currentClubTier: 1, position: 'CM', overall: 85 });
  save.seasons[save.seasons.length - 1].year = 2025;
  return save;
}
/* Where the pointer and the first tile sit, by layout (offsetTop), so the sheet's zoom in does not count as a move. */
const squadNow = page => page.evaluate(() => {
  const sheet = document.querySelector('[data-squad-sheet]');
  if (!sheet) return null;
  const top = el => { let t = 0; for (let e = el; e && e !== sheet; e = e.offsetParent) t += e.offsetTop; return t; };
  const hint = sheet.querySelector('[data-squad-first-hint]'), tile = sheet.querySelector('[data-squad-open]');
  return { screen: sheet.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen') ?? null,
    hintY: hint ? top(hint) : null, tileY: tile ? top(tile) : null };
});
async function w6(width, height) {
  section = 'W6';
  const { ctx, page, errors } = await open(squadSave(), { width, height });
  try {
    const tile = page.locator('[data-squad-tile]');
    await tile.waitFor({ timeout: 45000 });
    const before = await saveBytes(page);
    const keysBefore = await storedKeys(page);
    await page.evaluate(() => {
      window.__squadFirst = null;
      new MutationObserver(() => {
        const sheet = document.querySelector('[data-squad-sheet]');
        if (window.__squadFirst || !sheet?.querySelector('[data-squad-screen]')) return;
        const top = el => { let t = 0; for (let e = el; e && e !== sheet; e = e.offsetParent) t += e.offsetTop; return t; };
        const hint = sheet.querySelector('[data-squad-first-hint]'), first = sheet.querySelector('[data-squad-open]');
        window.__squadFirst = { screen: sheet.querySelector('[data-squad-screen]').getAttribute('data-squad-screen'),
          hintY: hint ? top(hint) : null, tileY: first ? top(first) : null };
      }).observe(document.body, { childList: true, subtree: true });
    });
    await tile.click();
    await page.locator('[data-squad-sheet] [data-squad-screen]').first().waitFor({ timeout: 15000 });
    const first = await page.evaluate(() => window.__squadFirst);
    await page.waitForTimeout(1000);
    const later = await squadNow(page);
    check(first?.screen === 'home' && first.hintY !== null, `${width}: the first frame of the first open is home with the pointer (${JSON.stringify(first)})`);
    check(later?.screen === 'home' && later.hintY !== null, `${width}: one second later it is still home with the pointer (${JSON.stringify(later)})`);
    check(!!first && !!later && first.hintY === later.hintY && first.tileY === later.tileY, `${width}: the pointer and the first tile have not moved`);
    await shot(page, `W6-first-open-${width}`);
    await page.getByRole('button', { name: 'How the squad works', exact: true }).click();
    const help = await page.locator('[data-squad-sheet] [data-squad-screen="help"]').waitFor({ timeout: 8000 }).then(() => true, () => false);
    check(help, `${width}: ? opens the help`);
    if (help) await shot(page, `W6-help-${width}`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('[data-squad-sheet]').waitFor({ state: 'detached', timeout: 8000 });
    await tile.click();
    await page.locator('[data-squad-sheet] [data-squad-screen]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    const next = await squadNow(page);
    check(next?.screen === 'home' && next.hintY === null, `${width}: the next open is home with no pointer (${JSON.stringify(next)})`);
    const added = (await storedKeys(page)).filter(k => !keysBefore.includes(k));
    check(await saveBytes(page) === before && added.length === 1 && added[0] === HINT_KEY, `${width}: the save is byte for byte the same and the only key added is ${HINT_KEY} (${added.join(', ') || 'none'})`);
    check(errors.length === 0, `${width}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- the run ---------- */
async function runArm(which) {
  arm = which;
  if (SECTIONS.includes('W4')) { await w4(); if (which === 'head') await w4Others(); }
  if (SECTIONS.includes('W4r')) await w4r();
  if (SECTIONS.includes('W5')) { await w5(390, 844); await w5(1280, 900); }
  if (SECTIONS.includes('W6')) { await w6(390, 844); await w6(320, 640); await w6(1280, 900); }
  if (SECTIONS.includes('W7')) { await w7(390, 844); await w7(1280, 900); }
  if (SECTIONS.includes('W8')) { await w8(320, 640); await w8(1280, 900); }
}
let exit = 0;
try {
  browser = await pw.chromium.launch({ headless: true });
  for (const which of BASE_DIST ? ['head', 'base'] : ['head']) {
    try { await runArm(which); } catch (error) { section = section || 'setup'; check(false, `the walk stopped: ${String(error).split('\n')[0].slice(0, 200)}`); }
  }
} finally {
  if (browser) await browser.close();
  for (const s of spawned) s.kill();
}
console.log('\nverdicts, section by section:');
for (const s of SECTIONS) {
  const head = verdicts[`head/${s}`], base = verdicts[`base/${s}`];
  const headOk = !!head && head.failed === 0;
  let line = `  ${s}: head ${head ? `${head.checks - head.failed}/${head.checks}` : 'not run'}`;
  if (!headOk) exit = 1;
  if (BASE_DIST) {
    const baseRed = !!base && base.failed > 0;
    const want = BASE_MUST_FAIL.includes(s) ? 'red' : 'green';
    const fine = want === 'red' ? baseRed : (!!base && !baseRed);
    line += `, base ${base ? `${base.checks - base.failed}/${base.checks}` : 'not run'} (${want} wanted: ${fine ? 'as it must' : 'WRONG'})`;
    if (!fine) exit = 1;
  }
  console.log(line);
}
for (const r of reports) console.log(`  report: ${r}`);
if (!BASE_DIST) console.log('playSoccerScreenTruths: no base arm (set SCREEN_TRUTHS_BASE_DIST); the head alone is not a proof');
console.log(exit === 0
  ? `playSoccerScreenTruths: green, ${SECTIONS.join(' ')} pass on the head${BASE_DIST ? ' and every control section is red on the base' : ''}`
  : 'playSoccerScreenTruths: RED');
process.exit(exit);
