// Reviewer walk for Round 1337 (runs on a runner only, never committed). BASE is the served build.
// Plays the five screens the way a player meets them, at phone and desktop sizes, motion on and off,
// prints MEASURE lines and a FAIL line for anything cut, overlapping, untrue or broken, and saves pictures.
import fs from 'node:fs';
import path from 'node:path';
import pw from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.SHOTS || process.env.RC_OUT || '.tmp-fx/run-shots');
fs.mkdirSync(OUT, { recursive: true });
const recorded = JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8'));
const rec = id => structuredClone(recorded.saves.find(s => s.id === id && s.kind === 'player').state);
let checks = 0, failed = 0; const fails = [];
const check = (ok, label) => { checks++; if (!ok) { failed++; fails.push(label); } console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };
const measure = (label, v) => console.log(`MEASURE ${label} ${typeof v === 'string' ? v : JSON.stringify(v)}`);
let browser;
async function open(save, { width = 390, height = 844, reduced = false, extra = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([s, more]) => {
    if (sessionStorage.getItem('run-seeded')) return;
    sessionStorage.setItem('run-seeded', '1');
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('rules-gate-seen:/soccer-career', '1');
    localStorage.setItem('soccerCareerSave', s);
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [JSON.stringify(save), extra]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors };
}
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
const saveBytes = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));

/* Words of an element that the browser broke across two lines, with | where it broke. */
const brokenWords = (page, selector) => page.evaluate(sel => {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent || '';
      for (const m of text.matchAll(/\S+/g)) {
        let lastTop = null, split = -1;
        for (let i = 0; i < m[0].length; i++) {
          const r = document.createRange(); r.setStart(n, m.index + i); r.setEnd(n, m.index + i + 1);
          const rect = r.getClientRects()[0]; if (!rect) continue;
          const top = Math.round(rect.top);
          if (lastTop !== null && Math.abs(top - lastTop) > 3) { split = i; break; }
          lastTop = top;
        }
        if (split > 0) out.push(m[0].slice(0, split) + '|' + m[0].slice(split));
      }
    }
  }
  return out;
}, selector);

/* ---------- R1 the Ballon d'Or night holds Full attributes ---------- */
function nightSave() {
  const save = rec('ere');
  save.playerName = 'Night Fixture';
  const row = save.seasons.findLast(s => s.type === 'playing' && s.apps > 0);
  const nominees = Array.from({ length: 10 }, (_, i) => ({ name: i === 2 ? save.playerName : `Fixture Candidate ${i + 1}`,
    points: 300 - i * 20, isPlayer: i === 2, nationality: save.nationality, club: i === 2 ? save.currentClub : 'Fixture FC',
    position: i === 2 ? save.position : 'ST', goals: 12, trophies: [] }));
  Object.assign(save, { phase: 'ballon_dor', pendingSummary: row,
    pendingBallonDor: { year: row.year, nominees, playerRank: 3, playerPoints: 260, playerNominated: true, moved: '' } });
  return save;
}
const CARD = '[data-award-night="ballon_dor"]';
const attrButtonInfo = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /^Full attributes/.test((x.textContent || '').trim()));
  if (!b) return null;
  const line = b.querySelectorAll('span span')[1] || b.querySelector('span span:last-child');
  const r = b.getBoundingClientRect();
  return { disabled: b.disabled, line: line?.textContent, lineCut: line ? line.scrollWidth > line.clientWidth : null,
    lineW: line?.clientWidth, lineSW: line?.scrollWidth, left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth,
    opacity: getComputedStyle(b).opacity, cursor: getComputedStyle(b).cursor };
});
async function r1(width, height, full) {
  const { ctx, page, errors } = await open(nightSave(), { width, height });
  try {
    await page.locator(CARD).waitFor({ timeout: 45000 });
    const result0 = await page.locator(CARD).getAttribute('data-award-result');
    const info = await attrButtonInfo(page);
    measure(`R1 ${width} countdown (${result0}) button`, info);
    check(result0 === 'waiting' && info?.disabled === true, `R1 ${width}: during the countdown Full attributes is disabled`);
    check(info && info.lineCut === false, `R1 ${width}: the held line "${info?.line}" is whole (box ${info?.lineW}px, text ${info?.lineSW}px)`);
    check(info && info.right <= info.vw && info.left >= 0, `R1 ${width}: the button sits inside the screen (${info?.left} to ${info?.right} of ${info?.vw})`);
    const btn = page.getByRole('button', { name: /^Full attributes/ });
    await btn.scrollIntoViewIfNeeded();
    await shot(page, `R1-countdown-${width}`);
    if (full) {
      const before = await saveBytes(page);
      await btn.click({ force: true }).catch(() => {});
      await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const opened = await page.evaluate(() => [...document.querySelectorAll('h1')].some(h => /full attributes$/.test(h.textContent || '')));
      check(!opened && (await saveBytes(page)) === before, `R1 ${width}: a forced click and a Tab then Enter open nothing and write nothing`);
      await page.locator(`${CARD}[data-award-result="revealed"]`).waitFor({ timeout: 30000 });
      await page.waitForTimeout(500);
      const after = await attrButtonInfo(page);
      measure(`R1 ${width} revealed button`, after);
      check(after?.disabled === false && /cm/.test(after?.line || ''), `R1 ${width}: once revealed the button opens again and its line is the body line ("${after?.line}")`);
      await shot(page, `R1-revealed-${width}`);
    }
    check(errors.length === 0, `R1 ${width}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- R1r reduced motion: the card is complete at mount, the button open ---------- */
async function r1r() {
  const { ctx, page, errors } = await open(nightSave(), { width: 390, height: 844, reduced: true });
  try {
    await page.locator(CARD).waitFor({ timeout: 45000 });
    await page.waitForTimeout(600);
    const result = await page.locator(CARD).getAttribute('data-award-result');
    const info = await attrButtonInfo(page);
    measure('R1r 390 reduced', { result, info });
    check(result === 'revealed' && info?.disabled === false, 'R1r 390: with reduced motion the night is complete and Full attributes opens');
    await page.getByRole('button', { name: /^Full attributes/ }).scrollIntoViewIfNeeded();
    await shot(page, 'R1r-reduced-390');
    check(errors.length === 0, `R1r: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- R2 Week by week: the label, and the help on the live door ---------- */
async function r2(width, height) {
  const { ctx, page, errors } = await open(rec('cha'), { width, height });
  try {
    const watch = page.locator('[data-week-by-week]');
    await watch.waitFor({ timeout: 45000 });
    const label = await watch.getAttribute('aria-label');
    measure(`R2 ${width} label`, label);
    check(/^Week by week/.test(label || '') && /watch/.test(label || '') && !/live/.test(label || ''), `R2 ${width}: the button says watch ("${label}")`);
    await watch.click();
    const help = page.getByRole('dialog', { name: 'How the Season Centre works' });
    const shown = await help.waitFor({ timeout: 20000 }).then(() => true, () => false);
    check(shown, `R2 ${width}: Week by week opens the Season Centre with its help on the first open`);
    if (shown) {
      const paras = await help.locator('p').allInnerTexts();
      measure(`R2 ${width} help first two paragraphs`, paras.slice(0, 3));
      const text = await help.innerText();
      check(!/Spanish/.test(text) && !/nothing here can change/.test(text), `R2 ${width}: the help names no Spanish pool and no "nothing here can change"`);
      const box = await help.evaluate(d => { const r = d.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, scrollH: d.scrollHeight, clientH: d.clientHeight }; });
      measure(`R2 ${width} help box`, box);
      await shot(page, `R2-help-${width}`);
    }
    check(errors.length === 0, `R2 ${width}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- R3 the Squad sheet ---------- */
function squadSave() {
  const save = rec('ere');
  Object.assign(save, { phase: 'playing', retired: false, currentClub: 'Arsenal', currentClubCountry: 'England', currentClubTier: 1, position: 'CM', overall: 85 });
  save.seasons[save.seasons.length - 1].year = 2025;
  return save;
}
async function r3(width, height, extra = {}, tag = '') {
  const { ctx, page, errors } = await open(squadSave(), { width, height, extra });
  try {
    const tile = page.locator('[data-squad-tile]');
    await tile.waitFor({ timeout: 45000 });
    await tile.click();
    await page.locator('[data-squad-sheet] [data-squad-screen]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const sheet = document.querySelector('[data-squad-sheet]');
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
      const hint = sheet.querySelector('[data-squad-first-hint]');
      const body = sheet.querySelector('[data-squad-body]');
      const tiles = [...sheet.querySelectorAll('[data-squad-open]')];
      return { screen: sheet.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen'), hint: rect(hint), hintText: hint?.textContent,
        body: rect(body), bodyScroll: body ? { sh: body.scrollHeight, ch: body.clientHeight } : null,
        firstTile: rect(tiles[0]), lastTile: rect(tiles.at(-1)), tiles: tiles.length, vh: innerHeight, vw: innerWidth };
    });
    measure(`R3 ${width}${tag} first open`, m);
    if (!tag) {
      check(m.screen === 'home' && !!m.hint, `R3 ${width}: the first open is home with the pointer`);
      check(!!m.hint && !!m.body && m.hint.top >= m.body.top && m.hint.bottom <= m.body.bottom && m.hint.right <= m.vw, `R3 ${width}: the pointer is whole inside the sheet's body`);
      check(!!m.firstTile && m.firstTile.bottom <= Math.min(m.body.bottom, m.vh), `R3 ${width}: the first tile is in view without scrolling`);
    } else {
      check(m.screen === 'home' && !m.hint, `R3 ${width}${tag}: a viewer who already holds the flag lands on home with no pointer`);
    }
    await shot(page, `R3-first-open-${width}${tag}`);
    if (!tag) {
      await page.getByRole('button', { name: 'How the squad works', exact: true }).click();
      await page.locator('[data-squad-sheet] [data-squad-screen="help"]').waitFor({ timeout: 8000 });
      const first = await page.locator('[data-squad-help] li').first().innerText();
      measure(`R3 ${width} help rule 1`, first);
      await shot(page, `R3-help-${width}`);
    }
    check(errors.length === 0, `R3 ${width}${tag}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- R4 Training's menu ---------- */
async function r4(width, height, reduced, keeper) {
  const save = rec('ere'); if (keeper) save.position = 'GK';
  const { ctx, page, errors } = await open(save, { width, height, reduced });
  const tag = `${width}${reduced ? '-reduced' : ''}${keeper ? '-gk' : ''}`;
  try {
    const opener = page.locator('[data-career-utility="training"]');
    await opener.waitFor({ timeout: 45000 });
    const before = await saveBytes(page);
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Training ground' });
    await dialog.waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="Training ground"]');
      const paras = [...(d.querySelector('[data-practice-rules]')?.querySelectorAll('p') ?? [])].map(p => p.textContent);
      const tiles = [...d.querySelectorAll('button')].filter(x => (x.textContent || '').includes('drill. Trains'));
      const r = tiles[0]?.getBoundingClientRect(), dr = d.getBoundingClientRect();
      const q = d.querySelector('button[aria-label="Practice rules"]');
      return { paras, tiles: tiles.length, firstTileBottom: r ? Math.round(r.bottom) : null, panelBottom: Math.round(dr.bottom), vh: innerHeight,
        scrollTop: d.scrollTop, panelScroll: { sh: d.scrollHeight, ch: d.clientHeight }, expanded: q?.getAttribute('aria-expanded'),
        keeperLine: !!d.querySelector('[data-training-keeper-rule]') };
    });
    measure(`R4 ${tag} menu`, m);
    check(m.paras.length === 1 && /Example/.test(m.paras[0] || ''), `R4 ${tag}: one rules paragraph with its example on the menu`);
    check(m.firstTileBottom !== null && m.firstTileBottom <= Math.min(m.panelBottom, m.vh), `R4 ${tag}: the first drill tile is in view without scrolling (${m.firstTileBottom} of ${Math.min(m.panelBottom, m.vh)})`);
    await shot(page, `R4-menu-${tag}`);
    await dialog.getByRole('button', { name: 'Practice rules', exact: true }).click();
    await page.waitForTimeout(300);
    const all = await dialog.locator('[data-practice-rules] p').allInnerTexts();
    check(all.length === 3, `R4 ${tag}: ? shows three paragraphs (${all.length})`);
    await shot(page, `R4-rules-${tag}`);
    check((await saveBytes(page)) === before, `R4 ${tag}: the save is unchanged`);
    check(errors.length === 0, `R4 ${tag}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- R5 the attributes screen with the QA's long name, as a keeper ---------- */
async function r5(width, height, name) {
  const save = rec('ere'); Object.assign(save, { playerName: name, position: 'GK' });
  const { ctx, page, errors } = await open(save, { width, height });
  try {
    const button = page.getByRole('button', { name: /^Full attributes/ });
    await button.waitFor({ timeout: 45000 });
    await button.click();
    await page.waitForFunction(() => [...document.querySelectorAll('h1')].some(h => (h.textContent || '').endsWith('full attributes')), null, { timeout: 15000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const title = [...document.querySelectorAll('h1')].find(h => (h.textContent || '').endsWith('full attributes'));
      const lh = parseFloat(getComputedStyle(title).lineHeight) || 24;
      const labels = [...document.querySelectorAll('span')].filter(s => (s.className || '').includes('w-[6.5rem]'));
      const two = labels.filter(s => s.getBoundingClientRect().height > parseFloat(getComputedStyle(s).lineHeight || '14') * 1.5).map(s => s.textContent);
      const over = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.getClientRects().length).map(e => e.tagName + ':' + (e.textContent || '').slice(0, 30)).slice(0, 5);
      return { titleLines: Math.round(title.getBoundingClientRect().height / lh), titleRight: Math.round(title.getBoundingClientRect().right), vw: innerWidth,
        labels: labels.length, twoLine: two, cut: labels.filter(s => s.scrollWidth > s.clientWidth).map(s => s.textContent), pageWide: document.documentElement.scrollWidth, over };
    });
    const tb = await brokenWords(page, 'h1');
    const lb = await brokenWords(page, 'span[class*="w-[6.5rem]"]');
    measure(`R5 ${width} "${name}"`, { ...m, titleBroken: tb, labelBroken: lb });
    check(m.cut.length === 0 && m.titleRight <= m.vw, `R5 ${width}: the title and every label are whole`);
    check(lb.length === 0, `R5 ${width}: no keeper label is broken inside a word (${lb.join(', ') || 'none'})`);
    check(tb.filter(w => !w.includes('-|')).length === 0, `R5 ${width}: the title breaks only between words or at a hyphen (${tb.join(', ') || 'none'})`);
    check(m.pageWide <= m.vw, `R5 ${width}: the page does not scroll sideways (${m.pageWide} of ${m.vw})`);
    await shot(page, `R5-top-${width}`);
    await shot(page, `R5-full-${width}`, { fullPage: true });
    check(errors.length === 0, `R5 ${width}: no page error (${errors[0] || 'none'})`);
  } finally { await ctx.close(); }
}

/* ---------- the run ---------- */
const steps = [
  ['R1 390', () => r1(390, 844, true)], ['R1 320', () => r1(320, 640, false)], ['R1 360', () => r1(360, 740, false)], ['R1 1280', () => r1(1280, 900, true)],
  ['R1r', () => r1r()],
  ['R2 390', () => r2(390, 844)], ['R2 1280', () => r2(1280, 900)],
  ['R3 320', () => r3(320, 640)], ['R3 390', () => r3(390, 844)], ['R3 1280', () => r3(1280, 900)], ['R3 old', () => r3(390, 844, { 'soccerSquad:help': '1' }, '-old-viewer')],
  ['R4 320', () => r4(320, 640, false, false)], ['R4 390', () => r4(390, 844, false, false)], ['R4 390r', () => r4(390, 844, true, true)], ['R4 1280', () => r4(1280, 900, false, true)],
  ['R5 320', () => r5(320, 640, 'Danny Okafor-Whitfield')], ['R5 390', () => r5(390, 844, 'Danny Okafor-Whitfield')], ['R5 1280', () => r5(1280, 900, 'Danny Okafor-Whitfield')],
  ['R5 320 long', () => r5(320, 640, 'Bartholomew Fixture-Longname')],
];
const only = (process.env.ONLY_STEPS || '').split(',').filter(Boolean);
browser = await pw.chromium.launch({ headless: true });
try {
  for (const [name, fn] of steps) {
    if (only.length && !only.some(o => name.startsWith(o))) continue;
    try { await fn(); } catch (e) { check(false, `${name}: the step stopped: ${String(e).split('\n')[0].slice(0, 200)}`); }
  }
} finally { await browser.close(); }
console.log(`walk1337run: ${checks} checks, ${failed} failed`);
for (const f of fails) console.log(`  failed: ${f}`);
process.exit(failed ? 1 : 0);
