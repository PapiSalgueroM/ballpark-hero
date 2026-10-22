// Round 1547 run-lens review walk: play NFL and NBA Conquest Arcade on a served build until the
// Sign a Player power up dialog opens (the builder never saw it), then read and photograph it, the
// steal modal and the live Free Agency market. 390x844 and 1280x900, reduced motion on and off.
// Timers run on Playwright's fake clock so a whole run takes seconds. supabase.co is blocked.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(process.cwd(), '.tmp-fx');
fs.mkdirSync(OUT, { recursive: true });

const srcPu = fs.readFileSync('src/data/conquestPowerups.ts', 'utf8');
const srcNba = fs.readFileSync('src/data/conquestDataNba.ts', 'utf8');
const block = (src, start, end) => { const i = src.indexOf(start); return i < 0 ? '' : src.slice(i, src.indexOf(end, i)); };
const rows = (txt) => [...txt.matchAll(/name: '([^']+)', position: '([^']+)', overall: (\d+)(?:, lastSeason: '([^']+)')?/g)].map(m => ({ name: m[1], pos: m[2], ovr: +m[3], last: m[4] }));
const GREATS = { nfl: rows(block(srcPu, 'export const RETIRED_GREATS_NFL', '\n];')), nba: rows(block(srcPu, 'export const RETIRED_GREATS_NBA', '\n];')) };
const LEGENDS = { nfl: rows(block(srcPu, 'export const TEAM_LEGENDS: Record', '\n};')).map(r => r.name), nba: rows(block(srcNba, 'export const TEAM_LEGENDS_NBA: Record', '\n};')).map(r => r.name) };
const DECEASED = ['Demaryius Thomas'];
const OLD_FA = ['Odell Beckham', 'Ndamukong Suh', 'Adrian Peterson', 'Earl Thomas', 'Eric Berry', 'Dez Bryant', 'Josh Norman', 'Marshawn Lynch', 'Michael Crabtree', 'Cordarrelle Patterson', 'Golden Tate', 'Danny Amendola', 'Pierre Garcon', 'Torrey Smith', 'Justin Simmons', 'LeBron James'];
console.log(`parsed greats nfl ${GREATS.nfl.length} nba ${GREATS.nba.length}, legends nfl ${LEGENDS.nfl.length} nba ${LEGENDS.nba.length}`);
if (GREATS.nfl.length < 8 || GREATS.nba.length < 8 || LEGENDS.nfl.length < 20 || LEGENDS.nba.length < 20) { console.log('WALK ABORTED: could not parse the lists'); process.exit(2); }

let red = 0;
const bad = m => { red++; console.log(`RED ${m}`); };
const summary = [];
const browser = await chromium.launch();
const VPS = [
  { tag: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { tag: '1280', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
];
const vis = loc => loc.first().isVisible().catch(() => false);

for (const route of ['/conquest', '/conquest-nba']) for (const vp of VPS) for (const motion of ['reduce', 'no-preference']) {
  const sport = route === '/conquest' ? 'nfl' : 'nba';
  const other = sport === 'nfl' ? 'nba' : 'nfl';
  const tag = `${sport}-${vp.tag}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  const { tag: _t, ...ctxOpts } = vp;
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.clock.install();
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Arcade/ }).first().click();
  await page.clock.runFor(800);
  await page.keyboard.press('Escape');
  await page.clock.runFor(500);
  await page.locator('summary', { hasText: 'Free Agency' }).first().click().catch(() => {});
  await page.locator('select[aria-label="Pick your team"]').selectOption({ index: 1 }).catch(() => {});
  const rec = { tag, battles: 0, powerups: [], sign: null, steal: null, market: null, errors };
  const t0 = Date.now();
  let stealShot = false;
  for (let i = 0; i < 600 && Date.now() - t0 < 170000; i++) {
    const dlgs = page.locator('[role="dialog"]');
    const pu = dlgs.filter({ hasText: 'Power-Up Found' });
    if (await vis(pu)) {
      const txt = await pu.first().innerText();
      const label = (txt.match(/(Invincibility|Sign a Player|Upgrade|All-Time Great|Territory Steal|Free Agent[^\n]*)/) || ['?'])[0];
      rec.powerups.push(label);
      if (/Free Agent/.test(txt)) bad(`${tag}: the power up offer still says Free Agent`);
      if (label === 'Sign a Player' && !rec.sign) {
        await page.screenshot({ path: path.join(OUT, `offer-${tag}.png`) });
        await pu.getByRole('button', { name: /Use Now/ }).first().click();
        await page.clock.runFor(400);
        rec.sign = await readSign(page, tag, sport, other);
      } else {
        await pu.getByRole('button', { name: /Save for Later/ }).first().click();
      }
      await page.clock.runFor(300);
      continue;
    }
    const steal = dlgs.filter({ hasText: 'Steal a Player' });
    if (await vis(steal)) {
      if (!stealShot) { stealShot = true; rec.steal = await readSteal(page, steal.first(), tag, sport); }
      await steal.first().locator('button').filter({ hasText: 'OVR' }).first().click();
      await page.clock.runFor(300);
      continue;
    }
    const other1 = dlgs.filter({ hasText: /Territory Steal|Upgrade|Sign a Player/ });
    if (await vis(other1)) { await other1.first().locator('button').last().click().catch(() => {}); await page.clock.runFor(300); continue; }
    let clicked = false;
    for (const re of [/Choose Your Player/, /^Continue/, /Skip to result/, /Start Conquest|Next Battle/, /Play Again/]) {
      const b = page.getByRole('button', { name: re });
      if (await vis(b)) { if (/Next Battle|Start Conquest/.test(re.source)) rec.battles++; await b.first().click().catch(() => {}); clicked = true; break; }
    }
    await page.clock.runFor(clicked ? 1500 : 2500);
    if (rec.sign && !rec.market && i % 5 === 0) {
      const panelTxt = await page.locator('details', { hasText: 'Free Agency' }).first().innerText().catch(() => '');
      if (/Hit the market when the/.test(panelTxt)) rec.market = await readMarket(page, tag, sport);
    }
    if (rec.sign && rec.market && rec.steal) break;
  }
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (sw[0] > sw[1] + 1) bad(`${tag}: sideways scroll ${sw[0]} > ${sw[1]}`);
  if (errors.length) bad(`${tag}: ${errors.length} page errors, first: ${errors[0]}`);
  if (!rec.sign) console.log(`NOTE ${tag}: no Sign a Player offer in ${rec.battles} battles (power ups seen: ${rec.powerups.join(', ') || 'none'})`);
  await page.screenshot({ path: path.join(OUT, `end-${tag}.png`) });
  console.log(`${tag}: battles ${rec.battles}, powerups [${rec.powerups.join(', ')}], sign ${rec.sign ? rec.sign.rows.length + ' rows' : 'not reached'}, market ${rec.market ? rec.market.rows + ' rows' : 'not seen'}, steal ${rec.steal ? 'seen' : 'no'}`);
  summary.push(rec);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-summary.json'), JSON.stringify(summary, null, 1));
const reached = summary.filter(r => r.sign).length;
console.log(red ? `walkSign1547: ${red} red, Sign a Player reached in ${reached} of ${summary.length}` : `walkSign1547: green, Sign a Player reached in ${reached} of ${summary.length}`);
process.exit(red ? 1 : 0);

function onTables() {
  const nfl = fs.readFileSync('src/data/conquestData.ts', 'utf8');
  return new Set([...block(nfl, 'export const NFL_TEAMS', '\n];').matchAll(/\{ name: '([^']+)', position:/g), ...block(srcNba, 'export const NBA_TEAMS', '\n];').matchAll(/\{ name: '([^']+)', position:/g)].map(m => m[1]));
}

async function readSign(page, tag, sport, other) {
  const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Sign a Player' }).first();
  await dlg.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (!(await vis(dlg))) { bad(`${tag}: Use Now did not open the Sign a Player dialog`); return null; }
  const title = await dlg.locator('h2').first().innerText().catch(() => '');
  if (!/Sign a Player/.test(title)) bad(`${tag}: dialog title "${title}"`);
  const btns = dlg.locator('button').filter({ hasText: 'OVR' });
  const n = await btns.count();
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push(await btns.nth(k).evaluate(el => {
      const spans = el.querySelectorAll(':scope > span');
      const left = spans[0];
      const nameEl = left ? left.querySelector('.font-medium') : null;
      const inner = left ? left.querySelectorAll('span') : [];
      return {
        name: nameEl ? nameEl.textContent : '', label: inner[1] ? inner[1].textContent : '', right: spans[1] ? spans[1].textContent : '',
        over: el.scrollWidth > el.clientWidth + 1, nameCut: nameEl ? nameEl.scrollWidth > nameEl.clientWidth + 1 : false,
      };
    }));
  }
  const greats = new Map(GREATS[sport].map(g => [g.name, g]));
  const otherGreats = new Set(GREATS[other].map(g => g.name));
  let labelled = 0, prev = 1000;
  for (const r of out) {
    if (DECEASED.includes(r.name)) bad(`${tag}: the dialog deals ${r.name}, who died`);
    if (OLD_FA.includes(r.name)) bad(`${tag}: the dialog deals ${r.name} from the old free agent lists`);
    if (otherGreats.has(r.name)) bad(`${tag}: the dialog deals ${r.name}, the other sport's retired great`);
    const g = greats.get(r.name);
    if (r.label) {
      labelled++;
      const m = r.label.match(/^Retired, last played (.+)$/);
      if (!m || !g || g.last !== m[1]) bad(`${tag}: label "${r.label}" on ${r.name} does not match the list (${g ? g.last : 'not a retired great'})`);
    } else if (g) bad(`${tag}: retired great ${r.name} dealt without his label`);
    const ovr = Number((r.right.match(/(\d+) OVR/) || [])[1]);
    if (!(ovr <= prev)) bad(`${tag}: the list is not best first at ${r.name} (${ovr} after ${prev})`);
    prev = ovr;
    if (r.over) bad(`${tag}: row ${r.name} overflows its button`);
    if (r.nameCut) console.log(`NOTE ${tag}: name cut off in the dialog: ${r.name}`);
  }
  if (labelled === 0) bad(`${tag}: no retired great in the dialog`);
  const box = await dlg.boundingBox();
  const vp = page.viewportSize();
  if (box && (box.x < -1 || box.y < -1 || box.x + box.width > vp.width + 1 || box.y + box.height > vp.height + 1)) bad(`${tag}: the dialog leaves the viewport ${JSON.stringify(box)}`);
  await page.screenshot({ path: path.join(OUT, `sign-${tag}.png`) });
  console.log(`${tag} SIGN rows ${out.length}, labelled ${labelled}: ${out.slice(0, 12).map(r => `${r.name} [${r.right}]${r.label ? ' {' + r.label + '}' : ''}`).join('; ')}`);
  const pick = out.findIndex(r => r.label);
  await btns.nth(pick >= 0 ? pick : 0).click();
  return { rows: out, labelled };
}

async function readSteal(page, dlg, tag, sport) {
  const lines = await dlg.locator('button').filter({ hasText: 'OVR' }).evaluateAll(bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  for (const l of lines) {
    if (/·\s*$/.test(l)) bad(`${tag}: steal row ends in a dangling separator: "${l}"`);
    if (sport === 'nfl' && !/OVR( · 2025: [\d,]+ (pass|rush|rec) yds)?$/.test(l)) bad(`${tag}: steal row key stat is not a 2025 line or nothing: "${l}"`);
  }
  await page.screenshot({ path: path.join(OUT, `steal-${tag}.png`) });
  console.log(`${tag} STEAL ${lines.length} rows: ${lines.join(' | ')}`);
  return { rows: lines.length };
}

async function readMarket(page, tag, sport) {
  const panel = page.locator('details', { hasText: 'Free Agency' }).first();
  const txt = await panel.innerText();
  const tables = onTables();
  const retiredLegends = LEGENDS[sport].filter(n => !tables.has(n));
  for (const n of [...GREATS[sport].map(g => g.name), ...retiredLegends, ...DECEASED, ...OLD_FA]) if (txt.includes(n)) bad(`${tag}: the Free Agency market offers ${n}`);
  const blurbs = (txt.match(/Hit the market when the [^\n]+ fell/g) || []).length;
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await panel.screenshot({ path: path.join(OUT, `market-${tag}.png`) }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, `market-page-${tag}.png`) });
  console.log(`${tag} MARKET ${blurbs} blurbs: ${txt.replace(/\s+/g, ' ').slice(0, 300)}`);
  return { rows: blurbs };
}
