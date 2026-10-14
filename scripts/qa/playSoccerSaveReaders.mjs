/* Release BE join (Round BEG), the lead's decision m8 (d): every reader of the Soccer Career save key reads a
   packed save. Readers on this tree (grep of the key 'soccerCareerSave' and of every CONTINUE_SAVES consumer):
     1. the game itself, src/pages/SoccerCareer.tsx (parseSoccerCareerSave), its Season Centre and records tiles
        through the page's own state;
     2. the home continue row, src/components/home/ContinueRow.tsx (describeSave);
     3. the sport hub resume line, src/components/hub/HubExperience.tsx on /soccer (describeSave);
     4. the profile careers card, src/components/profile/YourCareers.tsx (describeSave; signed in only, so its
        proof is the unit test src/test/soccerSavePackedReaders.test.tsx);
     5. key holders that copy or test the raw bytes and never parse the histories: FeaturedStage and homeFront
        (presence), brokenSaveRecovery and BrokenSaveRestore (presence and raw copies), saveKeeper (raw copies
        and a top level version read), saveFence (its own fence key only).
   This walk seeds a genuinely over-cap career, packed by the real serializer (fixtures written by
   scripts/simSoccerCareerSaveSize.mjs into SC_SAVE_OUT), and opens readers 1 to 3 at 390 and 1280, reloading each.
   Needs a served build at BASE (an rc #!serve request). Nothing reaches the database: every request off BASE is
   aborted. usage: SC_SAVE_OUT=<fixtures> BASE=http://localhost:4173 node scripts/qa/playSoccerSaveReaders.mjs */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const FIX = path.resolve(process.env.SC_SAVE_OUT || '');
const KEY = 'soccerCareerSave', LIMIT = 60000;
const report = JSON.parse(fs.readFileSync(path.join(FIX, 'report.json'), 'utf8'));
const held = report.rows.filter(row => row.original > LIMIT && row.phase === 'playing').sort((a, b) => b.original - a.original)[0];
if (!held) { console.log('playSoccerSaveReaders: SETUP no over-cap career in the fixtures'); process.exit(2); }
const packed = fs.readFileSync(path.join(FIX, `${held.id}-stored.json`), 'utf8');
const top = JSON.parse(packed);
if (packed.length > LIMIT || top.seasons?.format !== 'lz-string-utf16') {
  console.log('playSoccerSaveReaders: SETUP the fixture is not a packed save'); process.exit(2);
}
const club = String(top.currentClub ?? ''), age = top.age;
const failures = [];
let checks = 0;
const check = (ok, what) => { checks += 1; if (!ok) failures.push(what); };

const browser = await pw.chromium.launch();
for (const [width, height] of [[390, 844], [1280, 900]]) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
  await context.route('**/*', route => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, packed]);
  const tag = `${width}`;
  for (const pass of ['first', 'reload']) {
    /* 3. the sport hub */
    await page.goto(`${BASE}/soccer`, { waitUntil: 'domcontentloaded' });
    if (pass === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
    const hub = page.locator('[data-hub-game="/soccer-career"] [data-hub-resume]');
    await hub.first().waitFor();
    const hubLine = await hub.first().innerText();
    check(hubLine.includes(club) && hubLine.includes(`age ${age}`) && !hubLine.includes('Saved in this browser'),
      `${tag} ${pass}: hub resume line "${hubLine}" does not read the packed save (${club}, age ${age})`);
    /* 2. the home continue row */
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    if (pass === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
    const card = page.locator('[data-continue-card="/soccer-career"] [data-continue-line]');
    await card.first().waitFor();
    const homeLine = await card.first().innerText();
    check(homeLine.includes(club) && homeLine.includes(`age ${age}`), `${tag} ${pass}: home continue line "${homeLine}" does not read the packed save`);
    /* 1. the game */
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
    if (pass === 'reload') await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-career-records-tile]').waitFor();
    check(await page.getByText("We couldn't open this save").count() === 0, `${tag} ${pass}: the game refused the packed save`);
    const stored = await page.evaluate(k => localStorage.getItem(k), KEY);
    let format = null; try { format = JSON.parse(stored).seasons?.format ?? 'array'; } catch { format = 'unparsable'; }
    check(stored.length <= LIMIT && format === 'lz-string-utf16', `${tag} ${pass}: the game wrote ${stored.length} characters, seasons ${format}`);
  }
  check(errors.length === 0, `${tag}: page errors ${errors.join(' | ').slice(0, 300)}`);
  await context.close();
}
await browser.close();
for (const f of failures) console.log('FAIL ' + f);
console.log(`playSoccerSaveReaders: ${failures.length ? 'RED' : 'green'}, ${checks} checks at 390 and 1280 on career ${held.id} (${held.original} characters raw, ${packed.length} stored), ${failures.length} failures.`);
process.exit(failures.length ? 1 : 0);
