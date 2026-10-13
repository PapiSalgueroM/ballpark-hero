// Round 1325 QA probe (not committed): old and hostile saves through the four screens on the served build.
// Every case resumes a save, opens the Squad tab (list, a row, the desk, Show the other), the dressing room
// (every rung, a man, back with the browser's Back as well) and the Manager panel, and reads the page text for
// undefined, NaN, [object Object] and Infinity, the sideways scroll, page errors, and the label rules.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const KEY = 'dukb-club-manager-save';
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data', `${f}.json`), 'utf8'));
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'qa') : path.join(ROOT, '.tmp-fx', 'qa');
fs.mkdirSync(OUT, { recursive: true });

const cases = [];
const add = (name, size, save, expect) => cases.push({ name, size, save, expect });
add('everton as saved', [320, 640], read('cmBookSaveEvertonFixture'), { defeat: '1-5 vs Newcastle', real: true });
add('sevilla 1052 old save', [390, 844], read('cmOldSave1052Fixture'), { defeat: '0-3 vs Atlético Madrid', real: true });
add('valencia second tier old save', [768, 1024], read('cmSecondTierOldSaveFixture'), { defeat: '0-3 vs Real Madrid', real: true });
add('hertha book save', [1280, 900], read('cmBookSaveHerthaFixture'), { defeat: '2-3 vs Nürnberg', real: true });
{ const s = read('cmBookSaveEvertonFixture'); s.careerStats.biggestDefeat.score = 'abc'; add('hostile: defeat score abc', [320, 640], s, { defeat: 'abc vs Newcastle', real: true }); }
{ const s = read('cmBookSaveEvertonFixture'); s.careerStats.biggestDefeat.score = '10-2'; add('hostile: defeat 10-2', [390, 844], s, { defeat: '2-10 vs Newcastle', real: true }); }
{ const s = read('cmBookSaveEvertonFixture'); s.careerStats.biggestDefeat.score = '1-2-3'; add('hostile: defeat 1-2-3', [390, 844], s, { defeat: '1-2-3 vs Newcastle', real: true }); }
{ const s = read('cmBookSaveEvertonFixture'); s.squad = s.squad.map(p => ({ ...p, generated: true })); add('every man made up', [390, 844], s, { real: false }); }
{ const s = read('cmBookSaveEvertonFixture'); s.squad = s.squad.map((p, i) => { const q = { ...p }; if (i % 2) { delete q.wage; delete q.contractYears; } return q; }); add('hostile: wage and years missing on half', [320, 640], s, { real: true }); }
{ const s = read('cmBookSaveEvertonFixture'); s.squad = s.squad.map(p => ({ ...p, contractYears: 1 })); add('everybody in his final year', [320, 640], s, { real: true }); }

const BAD = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b/;
const fails = [];
const browser = await chromium.launch();
for (const c of cases) {
  const [w, h] = c.size;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([k, raw]) => { try { localStorage.setItem(k, raw); } catch { /* blocked */ } }, [KEY, JSON.stringify(c.save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  const seen = [];
  const bad = m => { fails.push(`${c.name} at ${w}: ${m}`); seen.push(`FAIL ${m}`); };
  const look = async where => {
    const t = await page.evaluate(() => document.body.innerText);
    const m = t.match(/.{0,40}(\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b).{0,40}/);
    if (m && BAD.test(m[0])) bad(`${where} draws "${m[0].replace(/\s+/g, ' ')}"`);
    const side = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (side > 1) bad(`${where} scrolls sideways by ${side}px`);
    return t;
  };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.locator('button:visible').filter({ hasText: /^Essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
    await page.locator('button:visible').filter({ hasText: /Resume Career/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1800);
    await page.getByRole('tab', { name: 'Squad', exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(900);
    await look('the squad list');
    const labels = await page.locator('[data-cm-deal-label]').count();
    const notes = await page.locator('[data-cm-deal-note]').count();
    await page.locator('[data-cm-squad-row] > button').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await look('an open squad row');
    const rowLabel = await page.locator('[data-cm-squad-detail] [data-cm-deal-label]').count();
    while (await page.locator('[data-cm-show-more]').count()) { await page.locator('[data-cm-show-more]').first().click({ timeout: 3000 }); await page.waitForTimeout(250); }
    await look('the desk, every list shown');
    const deskLabels = await page.locator('[data-contracts-desk] [data-cm-deal-label]').count();
    const deskNote = await page.locator('[data-cm-deal-note="desk"]').count();
    if (c.expect.real === false && (labels || notes || rowLabel || deskLabels || deskNote)) bad(`a squad of made up men shows ${labels} labels and ${notes} notes`);
    if (c.expect.real === true && !(rowLabel && deskNote)) bad(`a squad of real men shows the row label ${rowLabel} and the desk note ${deskNote} times`);
    await page.screenshot({ path: path.join(OUT, `${c.name.replace(/[^a-z0-9]+/gi, '-')}-${w}-squad.jpg`), type: 'jpeg', quality: 45, fullPage: true }).catch(() => {});
    await page.getByRole('tab', { name: 'Home', exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(600);
    await page.locator('button:visible').filter({ hasText: /^🤝\s*Dressing room/ }).first().click({ timeout: 3000 });
    await page.waitForTimeout(600);
    await look('the dressing room');
    const rungs = await page.locator('[data-cm-rung]').count();
    for (let i = 0; i < rungs; i++) {
      await page.locator('[data-cm-rung]').nth(i).click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      await look(`rung ${i + 1}`);
      const man = page.locator('[data-cm-roles="rung"] button').nth(1);
      if (await man.count()) {
        await man.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
        await look(`rung ${i + 1}, a man`);
        if (i === 0) {
          await page.goBack().catch(() => {});
          await page.waitForTimeout(800);
          await look('after the browser Back from a man');
          if (!(await page.locator('[data-cm-roles], [data-cm-way], [role="tab"]').count())) bad('the browser Back from a man leaves no Club Manager screen');
          break;
        }
        await page.locator('[data-cm-room-back="player"]').click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
      await page.locator('[data-cm-room-back="rung"]').click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.locator('button:visible').filter({ hasText: /Resume Career/i }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.locator('button:visible').filter({ hasText: /^🧢\s*Manager/ }).first().click({ timeout: 3000 });
    await page.waitForTimeout(700);
    await look('the manager panel');
    const defeat = (await page.locator('[data-cm-worst-defeat]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (c.expect.defeat && !defeat.includes(c.expect.defeat)) bad(`the worst defeat reads "${defeat}", wanted "${c.expect.defeat}"`);
    await page.screenshot({ path: path.join(OUT, `${c.name.replace(/[^a-z0-9]+/gi, '-')}-${w}-manager.jpg`), type: 'jpeg', quality: 45 }).catch(() => {});
    seen.push(`labels ${labels}, notes ${notes}, row label ${rowLabel}, desk labels ${deskLabels}, desk note ${deskNote}, rungs ${rungs}, defeat "${defeat}"`);
  } catch (e) {
    bad(`the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}`);
  }
  if (errors.length) bad(`page error ${errors[0]}`);
  console.log(`${c.name} at ${w}: ${seen.join('; ')}`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `QA1325: ${fails.length} findings` : `QA1325: green, ${cases.length} saves through the four screens`);
process.exit(fails.length ? 1 : 0);
