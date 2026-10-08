/* Round 1130 browser walk: one rating per man, on the screens that print it.

   scripts/simFoRatingOrder.mjs proves the committed files agree with each
   other. This proves the number in the file is the number a player SEES, in
   the two games this branch unifies:
     1  /front-office: start a franchise as the Las Vegas Raiders, open the
        Roster box and its running backs. Every name, number and limited
        evidence mark on the shelf equals the committed files; Ashton Jeanty
        is the first row; Connor Heyward (a fullback two roster pages confirm)
        is on the shelf with the "e" mark; the legend is on screen; the page
        is no wider than the viewport.
     3  /nfl-gauntlet-draft: every card of every deal of a draft (seven deals
        of five) is a name, position and number the starters file holds.
   (Page 2, NFL Conquest, belongs to the second branch of the round.)
   At 390 by 844 and 1280 by 900. Every request to a host other than the
   local server is aborted before it leaves (the database among them), and
   the walk fails on an uncaught page error.

   CONTROL, FO_WALK_CONTROL=expect: one is added to the number the walk
   EXPECTS for one man on each page (Ashton Jeanty on the roster shelf, the
   first card dealt in the draft). The walk must then go red on exactly that
   row on each page at each size, and it exits 0 only when it did.

   Run: npm run build, serve dist with scripts/lib/hostLikeServer.mjs on 4173,
        then ENGINES=chromium node scripts/playFoOneRating.mjs
   Screenshots go to $RC_OUT, or .tmp-fx/shots when that is not set. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.FO_WALK_CONTROL || '';
if (CONTROL && CONTROL !== 'expect') { console.error(`unknown control ${CONTROL}`); process.exit(1); }
const SHOTS = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const CLUB = 'LV', CLUB_NAME = 'Las Vegas Raiders', LEAD = 'Ashton Jeanty', FULLBACK = 'Connor Heyward';

/* ---- what the committed files say (comments stripped: a guard reads the code) ---- */
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const unq = s => s.replace(/\\(.)/g, '$1');
const ROW_RE = new RegExp(`^\\s*\\{ name: ${STR}, pos: '(\\w+)', age: \\d+, ovr: (\\d+), `);
const MARK_RE = new RegExp(`^\\s*${STR}: \\{ modelVersion: .*partial: (true|false), `);
const starters = new Map();   // club -> rows
{
  let club = null;
  for (const line of read('src/data/frontOfficePlayers.ts').split('\n')) {
    const t = line.match(new RegExp(`^  \\{ abbr: ${STR}, `));
    if (t) { club = unq(t[1]); starters.set(club, []); continue; }
    const r = line.match(ROW_RE);
    if (r && club) starters.get(club).push({ name: unq(r[1]), pos: r[2], ovr: Number(r[3]) });
  }
}
const bench = [], marked = new Set();   // the club's bench rows, and its men who carry the mark (name|pos)
{
  let club = null, part = null;
  for (const line of read('src/data/frontOfficeDepth.ts').split('\n')) {
    const c = line.match(/^  ([A-Z]{2,3}): \{$/);
    if (c) { club = c[1]; part = null; continue; }
    const p = line.match(/^    (bench|practice|ratingEvidence): [[{]$/);
    if (p) { part = p[1]; continue; }
    if (club !== CLUB) continue;
    if (part === 'bench') { const r = line.match(ROW_RE); if (r) bench.push({ name: unq(r[1]), pos: r[2], ovr: Number(r[3]) }); }
    if (part === 'ratingEvidence') { const m = line.match(MARK_RE); if (m && m[2] === 'true') marked.add(unq(m[1])); }
  }
}
const shelf = [...(starters.get(CLUB) ?? []), ...bench].filter(p => p.pos === 'RB').map(p => ({ ...p, mark: marked.has(`${p.name}|${p.pos}`) }));
const pool = new Map([...starters.values()].flat().map(p => [`${p.name}|${p.pos}`, p.ovr]));
if (starters.size !== 32 || shelf.length < 3 || !shelf.some(p => p.name === LEAD) || !shelf.some(p => p.name === FULLBACK && p.mark) || pool.size < 400) {
  console.error(`FAIL: the committed files did not parse (clubs ${starters.size}, ${CLUB} backs ${shelf.length}, pool ${pool.size}), so the walk would compare against nothing`);
  process.exit(1);
}
const expectedShelf = new Map(shelf.map(p => [p.name, { ovr: p.ovr + (CONTROL === 'expect' && p.name === LEAD ? 1 : 0), mark: p.mark }]));

let failures = 0;
const controlHits = [];
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
/** A list of men whose screen number is not the expected one: empty in a plain run, exactly the control's man under the control. */
const judge = (where, wrong, controlMan) => {
  if (CONTROL === 'expect') {
    const fired = wrong.length === 1 && wrong[0].name === controlMan;
    controlHits.push(fired);
    console.log(`  ${fired ? 'PASS' : 'FAIL'}  ${where}: under the control the walk went red on exactly ${controlMan} (${wrong.map(w => `${w.name} screen ${w.seen} expected ${w.want}`).join(', ') || 'nobody'})`);
    if (!fired) failures += 1;
  } else say(wrong.length === 0, `${where}: every name and number on screen is the committed file's (${wrong.map(w => `${w.name} screen ${w.seen} file ${w.want}`).join(', ') || 'all agree'})`);
};

const browser = await chromium.launch();
const origin = new URL(BASE).origin;
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const size = `${viewport.width} wide`;
  console.log(`at ${viewport.width} by ${viewport.height}`);
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [], away = new Set();
  let reached = 0;
  page.on('pageerror', e => errors.push(String(e)));
  /* nothing leaves the local server: the database, the ad and font hosts are all cut before the request is sent */
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    away.add(url.host);
    return route.abort();
  });
  page.on('response', r => { if (new URL(r.url()).origin !== origin && !/^(data|blob):/.test(r.url())) reached += 1; });
  const settle = async () => {
    await page.waitForTimeout(900);
    const consent = page.locator('button:has-text("Essential only")');
    if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* ---- 1. the roster shelf ---- */
  await page.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.locator('.grid button').filter({ hasText: CLUB_NAME }).first().click();
  const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /roster/i }).first();
  await tile.waitFor({ state: 'visible', timeout: 30000 });
  await tile.click();
  await page.locator('[data-roster-group="RB"]').click();
  await page.locator('[data-roster-group-open="RB"]').waitFor({ state: 'visible', timeout: 10000 });
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-roster-group-open="RB"] [data-roster-row]')).map(row => {
    const b = row.querySelector('b');
    const mark = !!b?.querySelector('sup[data-rating-partial]');
    const number = Number(Array.from(b?.childNodes ?? []).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim());
    return { name: (row.querySelector('span.font-bold')?.textContent ?? '').replace(/\(out \d+w\)/, '').trim(), number, mark };
  }));
  say(rows.length === expectedShelf.size && rows.every(r => expectedShelf.has(r.name)), `${size}: the running back shelf shows the ${expectedShelf.size} backs the files hold for ${CLUB_NAME} (saw ${rows.length}: ${rows.map(r => `${r.name} ${r.number}${r.mark ? 'e' : ''}`).join(', ')})`);
  judge(`${size}, roster shelf`, rows.filter(r => expectedShelf.has(r.name) && expectedShelf.get(r.name).ovr !== r.number).map(r => ({ name: r.name, seen: r.number, want: expectedShelf.get(r.name).ovr })), LEAD);
  say(rows.every(r => !expectedShelf.has(r.name) || expectedShelf.get(r.name).mark === r.mark), `${size}: the limited evidence mark is on exactly the backs the files mark`);
  say(rows[0]?.name === LEAD, `${size}: ${LEAD} is the first row of the shelf (first is ${rows[0]?.name})`);
  const fb = rows.find(r => r.name === FULLBACK);
  say(!!fb && fb.mark && rows.indexOf(fb) >= 2, `${size}: ${FULLBACK} is on the shelf with the mark and outside its top two (${fb ? `${fb.number}${fb.mark ? 'e' : ''}, row ${rows.indexOf(fb) + 1} of ${rows.length}` : 'missing'})`);
  say(await page.locator('[data-rating-legend]').first().isVisible().catch(() => false), `${size}: the rating legend is on screen`);
  const wide1 = await overflow();
  say(wide1 <= 2, `${size}: the shelf fits the viewport (${wide1}px of horizontal overflow)`);
  await page.screenshot({ path: path.join(SHOTS, `fo-backs-${viewport.width}.png`) });

  /* ---- 3. the draft cards ---- */
  await page.goto(`${BASE}/nfl-gauntlet-draft`, { waitUntil: 'domcontentloaded' });
  await settle();
  await page.locator('button').filter({ hasText: 'Unlimited' }).first().click();
  const expectedCard = new Map(pool);
  const wrong = [], strangers = [];
  let cards = 0, controlMan = null;
  for (let pick = 1; pick <= 7; pick += 1) {
    await page.locator('p', { hasText: `Pick ${pick} of 7` }).first().waitFor({ state: 'visible', timeout: 10000 });
    const dealt = await page.evaluate(() => Array.from(document.querySelectorAll('div.grid > button')).map(b => Array.from(b.querySelectorAll(':scope > span')).map(s => (s.textContent ?? '').trim())).filter(s => s.length === 4));
    if (pick === 1) {
      await page.screenshot({ path: path.join(SHOTS, `gauntlet-first-deal-${viewport.width}.png`) });
      if (CONTROL === 'expect' && dealt[0]) { controlMan = dealt[0][2]; const key = `${dealt[0][2]}|${dealt[0][1]}`; if (expectedCard.has(key)) expectedCard.set(key, expectedCard.get(key) + 1); }
    }
    for (const [number, pos, name] of dealt) {
      cards += 1;
      const want = expectedCard.get(`${name}|${pos}`);
      if (want == null) strangers.push(`${name} ${pos}`);
      else if (want !== Number(number)) wrong.push({ name, seen: Number(number), want });
    }
    if (!dealt.length) break;
    /* keep the first card of the deal, by his name, so no other grid on the page can take the tap */
    if (pick < 7) await page.locator('div.grid > button').filter({ hasText: dealt[0][2] }).first().click();
  }
  say(cards === 35 && strangers.length === 0, `${size}: seven deals of five cards, every one a man and position the starters file holds (${cards} cards${strangers.length ? ', not in the file: ' + strangers.join(', ') : ''})`);
  judge(`${size}, draft cards`, wrong, controlMan);
  const wide3 = await overflow();
  say(wide3 <= 2, `${size}: the draft fits the viewport (${wide3}px of horizontal overflow)`);
  say(errors.length === 0, `${size}: no uncaught page error (${errors.slice(0, 2).join(' | ') || 'none'})`);
  say(reached === 0, `${size}: no request reached another host (${away.size} hosts asked for and cut: ${[...away].sort().join(', ') || 'none'})`);
  await ctx.close();
}
await browser.close();

if (CONTROL === 'expect') {
  const fired = controlHits.length === 4 && controlHits.every(Boolean) && failures === 0;
  console.log(`control expect ${fired ? 'fired' : 'DID NOT fire as designed'}: ${controlHits.filter(Boolean).length} of 4 comparisons went red on exactly the one man`);
  process.exit(fired ? 0 : 1);
}
console.log(failures ? `playFoOneRating: ${failures} FAILURE(S)` : `playFoOneRating: green. The roster shelf and the draft cards print the committed files' numbers at both sizes.`);
process.exit(failures ? 1 : 0);
