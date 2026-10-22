// Round 1547 run-lens review walk 2: open the REAL Sign a Player dialog on NFL and NBA Conquest Arcade.
// NBA power ups are almost unreachable in play (2 neutral states), so the walk hands the board a pending
// free_agent offer through React's own state queue (the hook's pendingPowerup and phase), then clicks the
// real "Use Now": the list on screen is the real hook's buildFreeAgentList. Once at kick off, once after
// three clubs fall (played on Playwright's fake clock). 390x844 and 1280x900, reduced motion on and off.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(process.cwd(), '.tmp-fx');
fs.mkdirSync(OUT, { recursive: true });

const srcPu = fs.readFileSync('src/data/conquestPowerups.ts', 'utf8');
const srcNba = fs.readFileSync('src/data/conquestDataNba.ts', 'utf8');
const srcNfl = fs.readFileSync('src/data/conquestData.ts', 'utf8');
const block = (src, start, end) => { const i = src.indexOf(start); return i < 0 ? '' : src.slice(i, src.indexOf(end, i)); };
const rows = (txt) => [...txt.matchAll(/name: (['"])(.+?)\1, position: '([^']+)', overall: (\d+)(?:, lastSeason: '([^']+)')?/g)].map(m => ({ name: m[2], pos: m[3], ovr: +m[4], last: m[5] }));
const GREATS = { nfl: rows(block(srcPu, 'export const RETIRED_GREATS_NFL', '\n];')), nba: rows(block(srcPu, 'export const RETIRED_GREATS_NBA', '\n];')) };
const LEGENDS = { nfl: rows(block(srcPu, 'export const TEAM_LEGENDS: Record', '\n};')).map(r => r.name), nba: rows(block(srcNba, 'export const TEAM_LEGENDS_NBA: Record', '\n};')).map(r => r.name) };
const TABLES = { nfl: new Set(rows(block(srcNfl, 'export const NFL_TEAMS', '\n];')).map(r => r.name)), nba: new Set(rows(block(srcNba, 'export const NBA_TEAMS', '\n];')).map(r => r.name)) };
const DECEASED = ['Demaryius Thomas'];
const OLD_FA = ['Odell Beckham', 'Ndamukong Suh', 'Earl Thomas', 'Eric Berry', 'Dez Bryant', 'Josh Norman', 'Michael Crabtree', 'Cordarrelle Patterson', 'Golden Tate', 'Danny Amendola', 'Pierre Garcon', 'Torrey Smith', 'Justin Simmons'];
console.log(`parsed greats nfl ${GREATS.nfl.length} nba ${GREATS.nba.length}, legends ${LEGENDS.nfl.length}/${LEGENDS.nba.length}, tables ${TABLES.nfl.size}/${TABLES.nba.size}`);
if (GREATS.nfl.length < 8 || GREATS.nba.length < 8 || TABLES.nfl.size < 300 || TABLES.nba.size < 250) { console.log('WALK ABORTED: could not parse the lists'); process.exit(2); }

let red = 0;
const bad = m => { red++; console.log(`RED ${m}`); };
const vis = loc => loc.first().isVisible().catch(() => false);
const settle = async (page, ms = 300) => { await page.clock.runFor(ms); await page.waitForTimeout(350); };
const summary = [];
const browser = await chromium.launch();
const VPS = [
  { tag: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { tag: '1280', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
];

/* Hand the board a pending free_agent offer through the hook's own state queue. Finds the hook list by the
   territories object (60 state ids including CA_N and TX_S), then phase at +4 and pendingPowerup at +17, the
   order both hooks declare them in; refuses unless every neighbour has the expected shape. */
async function injectOffer(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Start Conquest|Next Battle/.test(b.textContent || ''));
    if (!btn) return { err: 'no Start or Next button' };
    const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
    for (let f = btn[key]; f; f = f.return) {
      const list = [];
      for (let h = f.memoizedState, i = 0; h && i < 400; h = h.next, i++) list.push(h);
      const t = list.findIndex(x => x && x.memoizedState && typeof x.memoizedState === 'object' && !Array.isArray(x.memoizedState) && 'CA_N' in x.memoizedState && 'TX_S' in x.memoizedState);
      if (t < 0) continue;
      const ok = list[t + 4]?.memoizedState === 'ready' && list[t + 12]?.memoizedState instanceof Set && list[t + 17]?.memoizedState === null
        && list[t + 18]?.memoizedState === null && Array.isArray(list[t + 19]?.memoizedState);
      if (!ok) return { err: `hook shape differs at ${t}: phase ${list[t + 4]?.memoizedState}` };
      const terr = list[t].memoizedState;
      const team = Object.values(terr).find(Boolean);
      list[t + 17].queue.dispatch({ teamId: team, powerup: { id: 'free_agent', label: 'Sign a Player', icon: String.fromCodePoint(0x270d), description: 'injected by the review walk' } });
      list[t + 4].queue.dispatch('powerup_received');
      return { team };
    }
    return { err: 'territories hook not found' };
  });
}

async function openSign(page, tag, sport, when) {
  const inj = await injectOffer(page);
  if (inj.err) { bad(`${tag} ${when}: could not inject the offer: ${inj.err}`); return null; }
  await settle(page);
  const pu = page.locator('[role="dialog"]').filter({ hasText: 'Power-Up Found' });
  if (!(await vis(pu))) { bad(`${tag} ${when}: the injected offer did not show`); return null; }
  await pu.locator('button', { hasText: 'Use Now' }).first().click({ timeout: 5000 });
  await settle(page, 400);
  return readSign(page, tag, sport, when);
}

for (const route of ['/conquest-nba']) for (const vp of VPS) for (const motion of (vp.tag === '390' ? ['reduce'] : ['no-preference'])) {
  const sport = route === '/conquest' ? 'nfl' : 'nba';
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
  await page.getByRole('button', { name: /Reject all/ }).first().click({ timeout: 3000 }).catch(() => {});
  await page.getByRole('button', { name: /Arcade/ }).first().click({ timeout: 15000 });
  await settle(page, 800);
  for (let k = 0; k < 6 && await page.locator('[role="dialog"]').count(); k++) { await page.keyboard.press('Escape'); await settle(page, 500); }
  await page.locator('summary', { hasText: 'Free Agency' }).first().click().catch(() => {});
  await page.locator('select[aria-label="Pick your team"]').selectOption({ index: 1 }).catch(() => {});
  const rec = { tag, kick: null, battles: 0, mid: null, market: null, errors };
  if (rec.kick && rec.kick.labelled !== GREATS[sport].length) bad(`${tag} kickoff: ${rec.kick.labelled} labelled greats, expected all ${GREATS[sport].length}`);
  if (rec.kick && rec.kick.rows.length !== GREATS[sport].length) bad(`${tag} kickoff: ${rec.kick.rows.length} rows, expected the ${GREATS[sport].length} greats only`);
  const t0 = Date.now();
  let elim = 0;
  for (let i = 0; i < 700; i++) {
    if (await vis(page.getByRole('button', { name: /Start Conquest|Next Battle/ }))) {
      elim = Number(((await page.locator('body').innerText().catch(() => '')).match(/(\d+) eliminated/) || [])[1] || 0);
      if (elim >= 3 || Date.now() - t0 > 240000) break;
    }
    if (await playStep(page, tag)) rec.battles++;
  }
  console.log(`${tag}: ${elim} eliminated after ${rec.battles} battles`);
  if (elim >= 1) {
    rec.mid = await openSign(page, tag, sport, `mid(${elim} fallen)`);
    rec.market = await readMarket(page, tag, sport);
  } else console.log(`NOTE ${tag}: no club fell inside the time cap, mid-run dialog not read`);
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (sw[0] > sw[1] + 1) bad(`${tag}: sideways scroll ${sw[0]} > ${sw[1]}`);
  if (errors.length) bad(`${tag}: ${errors.length} page errors, first: ${errors[0]}`);
  await page.screenshot({ path: path.join(OUT, `end-${tag}.png`) });
  summary.push({ tag, kick: rec.kick && rec.kick.rows.length, mid: rec.mid && rec.mid.rows.length, midLabelled: rec.mid && rec.mid.labelled, market: rec.market && rec.market.rows, battles: rec.battles, errors: errors.length });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
console.log(red ? `walkInject1547: ${red} red` : 'walkInjectNba1547: green');
process.exit(red ? 1 : 0);

async function playStep(page, tag) {
  const dlgs = page.locator('[role="dialog"]');
  const pu = dlgs.filter({ hasText: 'Power-Up Found' });
  if (await vis(pu)) {
    const save = pu.locator('button', { hasText: 'Save for Later' });
    if (await vis(save)) await save.first().click({ timeout: 3000 }).catch(() => {});
    await settle(page); return false;
  }
  const steal = dlgs.filter({ hasText: 'Steal a Player' });
  if (await vis(steal)) {
    const b = steal.first().locator('button').filter({ hasText: 'OVR' });
    if (await vis(b)) await b.first().click({ timeout: 3000 }).catch(() => {});
    await settle(page); return false;
  }
  const other = dlgs.filter({ hasText: /Territory Steal|Upgrade|Sign a Player/ });
  if (await vis(other)) { await other.first().locator('button').last().click({ timeout: 3000 }).catch(() => {}); await settle(page); return false; }
  for (const re of [/Choose Your Player/, /^Continue/, /Skip to result/, /Start Conquest|Next Battle/]) {
    const b = page.getByRole('button', { name: re });
    if (await vis(b)) { await b.first().click({ timeout: 3000 }).catch(() => {}); await page.clock.runFor(1500); return /Next/.test(re.source); }
  }
  await page.clock.runFor(2500);
  return false;
}

async function readSign(page, tag, sport, when) {
  const other = sport === 'nfl' ? 'nba' : 'nfl';
  const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Sign a Player' }).first();
  if (!(await vis(dlg))) { bad(`${tag} ${when}: Use Now did not open the Sign a Player dialog`); return null; }
  const title = await dlg.locator('h2').first().innerText().catch(() => '');
  if (!/Sign a Player/.test(title)) bad(`${tag} ${when}: dialog title "${title}"`);
  const intro = await dlg.locator('p').first().innerText().catch(() => '');
  const btns = dlg.locator('button').filter({ hasText: 'OVR' });
  const out = await btns.evaluateAll(bs => bs.map(el => {
    const spans = el.querySelectorAll(':scope > span');
    const left = spans[0];
    const nameEl = left ? left.querySelector('.font-medium') : null;
    const inner = left ? left.querySelectorAll('span') : [];
    return { name: nameEl ? nameEl.textContent : '', label: inner[1] ? inner[1].textContent : '', right: spans[1] ? spans[1].textContent : '',
      over: el.scrollWidth > el.clientWidth + 1, nameCut: nameEl ? nameEl.scrollWidth > nameEl.clientWidth + 1 : false };
  }));
  const greats = new Map(GREATS[sport].map(g => [g.name, g]));
  const otherGreats = new Set(GREATS[other].map(g => g.name));
  let labelled = 0, prev = 1000;
  for (const r of out) {
    if (DECEASED.includes(r.name) || OLD_FA.includes(r.name)) bad(`${tag} ${when}: the dialog deals ${r.name}`);
    if (otherGreats.has(r.name)) bad(`${tag} ${when}: the dialog deals ${r.name}, the other sport's retired great`);
    const g = greats.get(r.name);
    if (r.label) {
      labelled++;
      const m = r.label.match(/^Retired, last played (.+)$/);
      if (!m || !g || g.last !== m[1]) bad(`${tag} ${when}: label "${r.label}" on ${r.name} (list says ${g ? g.last : 'not a retired great'})`);
    } else if (g) bad(`${tag} ${when}: retired great ${r.name} dealt without his label`);
    else if (!TABLES[sport].has(r.name)) bad(`${tag} ${when}: ${r.name} dealt unlabelled but is on no ${sport} table (a legend?)`);
    const ovr = Number((r.right.match(/(\d+) OVR/) || [])[1]);
    if (!(ovr <= prev)) bad(`${tag} ${when}: not best first at ${r.name} (${ovr} after ${prev})`);
    prev = ovr;
    if (r.over) bad(`${tag} ${when}: row ${r.name} overflows its button`);
    if (r.nameCut) console.log(`NOTE ${tag} ${when}: name cut off: ${r.name}`);
  }
  const box = await dlg.boundingBox();
  const vp = page.viewportSize();
  if (box && (box.x < -1 || box.y < -1 || box.x + box.width > vp.width + 1 || box.y + box.height > vp.height + 1)) bad(`${tag} ${when}: the dialog leaves the viewport ${JSON.stringify(box)}`);
  const shot = `sign-${when.startsWith('mid') ? 'mid' : 'kick'}-${tag}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  console.log(`${tag} ${when} SIGN ${out.length} rows, ${labelled} labelled, intro "${intro.replace(/\s+/g, ' ')}": ${out.slice(0, 14).map(r => `${r.name} [${r.right}]${r.label ? ' {' + r.label + '}' : ''}`).join('; ')}`);
  const pick = out.findIndex(r => r.label);
  await btns.nth(pick >= 0 ? pick : 0).click({ timeout: 5000 }).catch(e => console.log(`${tag}: sign click failed ${String(e).slice(0, 100)}`));
  await settle(page);
  return { rows: out, labelled };
}

async function readMarket(page, tag, sport) {
  const panel = page.locator('details', { hasText: 'Free Agency' }).first();
  const txt = await panel.innerText().catch(() => '');
  const retiredLegends = LEGENDS[sport].filter(n => !TABLES[sport].has(n));
  for (const n of [...GREATS[sport].map(g => g.name), ...retiredLegends, ...DECEASED, ...OLD_FA]) if (txt.includes(n)) bad(`${tag}: the Free Agency market offers ${n}`);
  const blurbs = (txt.match(/Hit the market when the [^\n]+ fell/g) || []).length;
  if (!blurbs) bad(`${tag}: the market shows no fallen team's player after a club fell`);
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await panel.screenshot({ path: path.join(OUT, `market-${tag}.png`) }).catch(() => {});
  console.log(`${tag} MARKET ${blurbs} rows: ${txt.replace(/\s+/g, ' ').slice(0, 260)}`);
  return { rows: blurbs };
}
