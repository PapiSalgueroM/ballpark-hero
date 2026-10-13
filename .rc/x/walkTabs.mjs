/* Club Manager QA: two tabs on one save (lost progress, replayed results) and damaged saves loaded for real. */
import { openWalk, audit, startCareer, toHub, tile, quickSim, bodyText, saveSummary, readSave, h1, KEY, BASE, ensureGame } from './cmlib.mjs';

const E = process.env;
const w = await openWalk(E.TAG || 'tabs', Number(E.W || 390), Number(E.H || 844));
const { page, log, step, find, shot } = w;
log.cases = [];

async function newTab() {
  const p = await w.ctx.newPage();
  await p.route(/supabase\.co/, r => r.abort());
  p.on('pageerror', e => log.errors.push({ kind: 'pageerror-tab2', m: String(e).slice(0, 200) }));
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const r = p.getByRole('button', { name: 'Resume Career', exact: true });
  if (await r.count()) { await r.first().click().catch(() => {}); await p.waitForTimeout(2500); }
  return p;
}
async function quick(p) {
  const before = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const fx = (await p.locator('[data-cm-way="quick"]').first().evaluate(b => b.closest('.rounded-2xl')?.innerText || '').catch(() => '')).replace(/\s+/g, ' ').slice(0, 90);
  await p.locator('[data-cm-way="quick"]').first().click({ timeout: 5000 }).catch(() => {});
  await p.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
  const rep = (await p.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const score = (rep.match(/(VICTORY|DEFEAT|DRAW|WIN|LOSS)?\s*([A-Z][A-Za-z .'&-]+?) (\d+) - (\d+) ([A-Z][A-Za-z .'&-]+?) /) || [])[0] || rep.slice(0, 120);
  await p.getByRole('button', { name: /^Continue$/i }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  return { fx, score, weekBefore: before?.week };
}
const disk = () => page.evaluate(k => { const c = JSON.parse(localStorage.getItem(k) || 'null'); return c && { week: c.week, results: (c.resultLog || []).map(r => `${r.week}:${r.opp}:${r.score}`) }; }, KEY);

try {
  const ok = await startCareer(w, { era: /2026-27/, nation: /England/, league: /Premier/, club: /Brighton/ });
  if (!ok) throw new Error('no start');
  await quick(page);
  // ---- A: the stale tab replays a match the other tab already played ----
  step('replay: tab B plays, stale tab A plays the same fixture');
  log.replay = [];
  for (let i = 0; i < 3; i++) {
    const b = await newTab();
    await page.bringToFront();
    const aBefore = (await saveSummary(page))?.week;
    const rb = await quick(b);
    const afterB = await disk();
    await page.bringToFront();
    const ra = await quick(page); // tab A never reloaded, still shows the fixture B just played
    const afterA = await disk();
    await b.close();
    log.replay.push({ aBefore, rb, afterB, ra, afterA });
    console.log(`REPLAY ${i}: B ${rb.fx} -> ${rb.score} | A ${ra.fx} -> ${ra.score} | disk after B week ${afterB.week} last ${afterB.results.slice(-1)} | after A week ${afterA.week} last ${afterA.results.slice(-2).join(' , ')}`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); await ensureGame(w);
  }
  await shot('after-replays', { full: true, maxH: 1800 });
  // ---- B: progress made in tab B is wiped when the stale tab A navigates away ----
  step('clobber: B plays three, stale A leaves the page');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); await ensureGame(w);
  const startWeek = (await disk()).week;
  const b = await newTab();
  for (let i = 0; i < 3; i++) await quick(b);
  const afterB = await disk();
  await page.bringToFront();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); // tab A leaves: pagehide
  await page.waitForTimeout(1500);
  const afterLeave = await b.evaluate(k => { const c = JSON.parse(localStorage.getItem(k) || 'null'); return c && { week: c.week, results: (c.resultLog || []).length }; }, KEY);
  log.clobber = { startWeek, afterB: { week: afterB.week, results: afterB.results.length }, afterLeave };
  console.log('CLOBBER ' + JSON.stringify(log.clobber));
  if (afterLeave && afterLeave.week < afterB.week) find('blocker', 'closing or leaving a stale second tab wipes the matches played in the other tab', JSON.stringify(log.clobber));
  await b.reload({ waitUntil: 'domcontentloaded' }); await b.waitForTimeout(2500);
  const r2 = b.getByRole('button', { name: 'Resume Career', exact: true });
  if (await r2.count()) { await r2.first().click().catch(() => {}); await b.waitForTimeout(2500); }
  await b.screenshot({ path: `${process.env.RC_OUT}/${E.TAG || 'tabs'}-clobber-tabB-after-reload.jpg`, type: 'jpeg', quality: 40 }).catch(() => {});
  log.clobber.tabBHub = (await b.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
  await b.close();

  // ---- C: damaged saves, written from a page that is not the game ----
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); await ensureGame(w);
  await quick(page);
  const good = await page.evaluate(k => localStorage.getItem(k), KEY);
  const cases = [
    ['truncated', (o, raw) => raw.slice(0, Math.floor(raw.length / 2))],
    ['budget-text', o => JSON.stringify({ ...o, budget: 'lots' })],
    ['budget-negative', o => JSON.stringify({ ...o, budget: -250 })],
    ['week-past-end', o => JSON.stringify({ ...o, week: o.calendar.length + 5 })],
    ['squad-five', o => JSON.stringify({ ...o, squad: o.squad.slice(0, 5) })],
    ['xi-missing', o => JSON.stringify({ ...o, xiIds: ['nobody-1', 'nobody-2'] })],
    ['inbox-spam', o => JSON.stringify({ ...o, inbox: Array.from({ length: 400 }, (_, i) => ({ id: 'x' + i, playerName: 'Nobody', playerId: 'zz', kind: 'praise', text: 'Spam ' + i, options: [], week: 1 })) })],
    ['unknown-club', o => JSON.stringify({ ...o, clubName: 'Atlantis Wanderers' })],
    ['board-zero', o => JSON.stringify({ ...o, boardConfidence: 0 })],
    ['fitness-nan', o => JSON.stringify({ ...o, squad: o.squad.map(p => ({ ...p, fitness: 'x', morale: null })) })],
  ];
  for (const [label, mut] of cases) {
    step('case ' + label);
    const e0 = log.errors.length;
    await page.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: KEY, v: mut(JSON.parse(good), good) });
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await shot('case-' + label + '-open', { full: true, maxH: 1800 });
    const slotsText = (await bodyText(page)).slice(0, 400);
    const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
    const hadResume = await resume.count();
    if (hadResume) { await resume.first().click().catch(() => {}); await page.waitForTimeout(2500); }
    await shot('case-' + label, { full: true, maxH: 2200 });
    const hub = await page.getByRole('tab', { name: /^Home$/ }).count();
    let played = null, tiles = [];
    if (hub) {
      for (const tl of ['Finances', 'Board', 'Inbox', 'Dressing room']) { await toHub(w); if (await tile(page, tl).count()) { await tile(page, tl).first().click().catch(() => {}); await page.waitForTimeout(700); tiles.push(tl + ':' + ((await bodyText(page)).length)); } }
      await toHub(w);
      const q = await quick(page);
      played = q.score;
    }
    const c = { label, hadResume: !!hadResume, hub: !!hub, h1: await h1(page), slotsText: slotsText.replace(/\s+/g, ' '), text: (await bodyText(page)).slice(0, 400).replace(/\s+/g, ' '), played, tiles, errors: log.errors.slice(e0).map(e => e.m).slice(0, 4), saveAfter: await saveSummary(page) };
    log.cases.push(c);
    console.log(`CASE ${label}: hub=${c.hub} resume=${c.hadResume} h1=${c.h1} played=${String(played).slice(0, 60)} errors=${c.errors.length} ${c.errors[0] || ''} save=${JSON.stringify(c.saveAfter)}`.slice(0, 420));
    await audit(w, 'case-' + label, 'body');
  }
} catch (e) {
  find('note', 'walk threw', String(e).slice(0, 300));
  await shot('threw', { full: true }).catch(() => {});
}
step('end');
console.log(`TABS done: ${log.findings.length} findings, ${log.errors.length} errors, ${log.elapsedS}s`);
await w.browser.close();
