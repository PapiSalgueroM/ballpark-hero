/* Chromium journey through the actual Season Summary. The full save and
   goal totals come from an engine-recorded career. Copies deliberately set
   the selected cradle celebration and saved family facts, then move the
   recorded playing row through a birth year and later summary years.
   These are simulation fixtures, never historical sports results.
   Run after a completed build: node scripts/playSoccerCareerFamily.mjs
   BASE uses an existing host; SHOTS selects the screenshot directory.
   simSeasonFamilySummary proves both repeated-copy defects fail outcomes. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4578);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const original = recorded.saves.find(save => save.id === 'ere' && save.kind === 'player')?.state;
const played = original?.seasons.findLast(row => row.type === 'playing' && row.apps > 0 && row.goals > 0);
if (!original || !played) throw new Error('fixture refused: recorded ere save has no scoring playing row');
const birth = '👶 Your child is born. Congratulations! (1 total) Morale +10, Legacy +5';
const cases = [
  { id: 'birth', offset: 0, expected: 'A new baby joined your family this season.' },
  { id: 'later', offset: 4, expected: '4 seasons since you welcomed a child.' },
  { id: 'next', offset: 5, expected: '5 seasons since you welcomed a child.' },
  { id: 'legacy', offset: 4, legacy: true },
  { id: 'legacy-next', offset: 5, legacy: true },
];
function fixture(test) {
  const save = structuredClone(original);
  const row = structuredClone(played);
  row.year += test.offset;
  row.age += test.offset;
  save.seasons = save.seasons.filter(season => season.year < played.year).concat(row);
  Object.assign(save, { age: row.age, phase: 'season_summary', pendingSummary: row, pendingBallonDor: null });
  save.appearance = { skinTone: 'olive', hairstyle: 'fade', hairColor: 'black', facialHair: 'none', boots: 'vortex_strike', accessory: 'none', ...save.appearance, celebration: 'cradle' };
  save.family = { ...save.family, children: 1 };
  save.pregnancyAnnounced = false;
  save.events = test.id === 'birth' ? [birth] : [];
  save.story = test.legacy ? [] : [{ year: played.year, age: played.age, club: played.club, lines: [birth] }];
  return save;
}

let checks = 0, failed = 0, browser = null, server = null;
const check = (ok, label) => {
  checks += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
};
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
async function journey(test, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const label = `${width}x${height} ${test.id}`;
  try {
    await context.addInitScript(serialized => {
      if (!sessionStorage.getItem('career-family-harness')) {
        sessionStorage.setItem('career-family-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', serialized);
      }
    }, JSON.stringify(fixture(test)));
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const paragraph = page.locator('[data-summary-celebration]');
    await paragraph.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(600);
    const bytes = await saved(page);
    const copy = await paragraph.innerText();
    const goals = played.goals === 1 ? 'One goal this season.' : `${played.goals} goals this season.`;
    check(copy.startsWith(`👶 ${goals}`), `${label}: actual recorded goal total appears in the family paragraph`);
    if (test.expected) check(copy.includes(test.expected), `${label}: summary matches the saved birth timing`);
    if (test.id !== 'birth') check(!/new baby|new arrival|newest member/i.test(copy), `${label}: later family copy does not keep announcing a newborn`);
    if (test.legacy) check(!/since you welcomed|years? old/i.test(copy), `${label}: missing old birth history does not invent an age`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(!overflow, `${label}: no horizontal overflow`);
    if (test.id === 'later') await page.screenshot({ path: path.join(SHOTS, `soccer-career-family-${width}-later.png`), fullPage: false });
    check(await saved(page) === bytes, `${label}: viewing summary leaves career save bytes unchanged`);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await paragraph.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(600);
    check(await paragraph.innerText() === copy && await saved(page) === bytes, `${label}: reload preserves yearly copy and exact career bytes`);
    check(errors.length === 0, `${label}: no page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
    return copy;
  } finally { await context.close(); }
}

try {
  if (!process.env.BASE) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html is missing; finish the build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const copies = {};
    for (const test of cases) {
      try { copies[test.id] = await journey(test, width, height); }
      catch (error) { check(false, `${width}x${height} ${test.id} journey threw: ${String(error.stack || error).slice(0, 400)}`); }
    }
    check(!!copies.later && !!copies.next && copies.later !== copies.next, `${width}x${height}: adjacent years change recorded family progression`);
    check(!!copies.legacy && !!copies['legacy-next'] && copies.legacy !== copies['legacy-next'], `${width}x${height}: adjacent old-save years change family wording`);
  }
} catch (error) {
  check(false, String(error.stack || error).slice(0, 400));
} finally {
  await browser?.close();
  server?.kill();
}
console.log(`playSoccerCareerFamily: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
