/* Club Manager QA tour: every hub tile and tab, pressed like a fan, at one size.
   env: TAG W H ERA NATION LEAGUE CLUB NAME ENTRY FUZZ(1/0) */
import { openWalk, audit, startCareer, toHub, TILES, tile, fuzzPanel, playLive, quickSim, fastForward, bodyText, saveSummary, readSave, click, btn, role, h1 } from './cmlib.mjs';

const E = process.env;
const TAG = E.TAG || 'tour';
const W = Number(E.W || 390), H = Number(E.H || 844);
const rx = s => (s && s.startsWith('/') ? new RegExp(s.slice(1, s.lastIndexOf('/')), s.slice(s.lastIndexOf('/') + 1)) : s ? new RegExp(s) : null);
const w = await openWalk(TAG, W, H);
const { page, log, step, find, shot } = w;
const FUZZ = E.FUZZ !== '0';
const deadline = Date.now() + Number(E.MINUTES || 25) * 60000;

try {
  const ok = await startCareer(w, {
    era: rx(E.ERA || '/2026-27/'), nation: rx(E.NATION || '/^\\s*England/'), league: E.LEAGUE && /^\d+$/.test(E.LEAGUE) ? Number(E.LEAGUE) : rx(E.LEAGUE || '/Premier League/'),
    club: E.CLUB === 'last' || E.CLUB === 'first' ? E.CLUB : rx(E.CLUB || '/Liverpool/'), managerName: E.NAME || '', entry: E.ENTRY || '',
  });
  if (!ok) throw new Error('could not start');
  log.startSave = await saveSummary(page);
  await shot('hub-top');
  await shot('hub-full', { full: true, maxH: 4200 });
  await audit(w, 'hub');
  log.hubText = (await bodyText(page)).slice(0, 4000);

  // tabs
  for (const t of ['Squad', 'Tactics', 'Table', 'Market']) {
    if (Date.now() > deadline) break;
    step('tab ' + t);
    await page.getByRole('tab', { name: new RegExp('^' + t + '$') }).first().click({ timeout: 4000 }).catch(() => find('major', 'tab not clickable', t));
    await page.waitForTimeout(1200);
    await shot('tab-' + t, { full: true, maxH: 3600 });
    await audit(w, 'tab-' + t);
    log['tab_' + t] = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3000);
    if (FUZZ) await fuzzPanel(w, 'tab-' + t, async () => { await page.getByRole('tab', { name: new RegExp('^' + t + '$') }).first().click().catch(() => {}); await page.waitForTimeout(800); }, { max: 18 });
    await shot('tab-' + t + '-after', { full: true, maxH: 2400 });
    await page.getByRole('tab', { name: /^Home$/ }).first().click().catch(() => {});
    await page.waitForTimeout(600);
  }

  // tiles
  log.tileText = {};
  log.tileValues = {};
  for (const name of TILES) {
    if (Date.now() > deadline) { find('note', 'tour ran out of time', name); break; }
    await toHub(w);
    const tl = tile(page, name);
    if (!(await tl.count())) { log.tileValues[name] = 'ABSENT'; continue; }
    log.tileValues[name] = (await tl.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    step('tile ' + name);
    const y0 = await page.evaluate(() => window.scrollY);
    await tl.first().click({ timeout: 4000 }).catch(() => find('major', 'tile not clickable', name));
    await page.waitForTimeout(1300);
    const y1 = await page.evaluate(() => window.scrollY);
    await shot('tile-' + name);
    await shot('tile-' + name + '-full', { full: true, maxH: 3600 });
    await audit(w, 'tile-' + name);
    log.tileText[name] = (await bodyText(page)).slice(0, 3500);
    log.steps.push({ tileScroll: name, y0, y1 });
    if (FUZZ && !['League', 'Market', 'Rival watch'].includes(name)) {
      await fuzzPanel(w, 'tile-' + name, async () => { await tile(page, name).first().click().catch(() => {}); await page.waitForTimeout(900); }, { max: 16 });
      await shot('tile-' + name + '-after', { full: true, maxH: 2400 });
    }
  }
  await toHub(w);

  // play: one live (watch a while for VAR), one quick sim
  if (Date.now() < deadline) {
    const r1 = await playLive(w, 'm1', { sub: true, watchSecs: 50 });
    log.m1 = { ...r1, reportText: (r1.reportText || '').slice(0, 1200) };
    const q = await quickSim(w, 'm2');
    log.m2 = String(q).slice(0, 1200);
  }
  // reload persistence
  step('reload test');
  const before = await saveSummary(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await shot('after-reload');
  const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
  if (await resume.count()) { await shot('slots', { full: true }); await audit(w, 'slots'); await resume.first().click().catch(() => {}); await page.waitForTimeout(2500); }
  const after = await saveSummary(page);
  log.reload = { before, after };
  if (JSON.stringify(before) !== JSON.stringify(after)) find('blocker?', 'save changed across a reload', JSON.stringify({ before, after }));
  if (!(await page.getByRole('tab', { name: /^Home$/ }).count())) find('major', 'reload did not come back to the hub', (await bodyText(page)).slice(0, 200));

  // a month on, then the tiles again without fuzz
  for (let i = 0; i < 3 && Date.now() < deadline; i++) {
    const r = await fastForward(w, 'About a month');
    step('ff month ' + i, { r, save: await saveSummary(page) });
    await shot('ff-month-' + i, { full: true, maxH: 3000 });
    if (r === 'FULL TIME') { await audit(w, 'ff-report-' + i, 'body'); await click(w, role(page, /^Continue$/i), 'continue', 1500); }
    if (await btn(page, /Open the Window/).count()) { await shot('window-card'); break; }
    if (/COMPLETE|SACKED/.test(await h1(page))) break;
  }
  log.midTileText = {};
  for (const name of TILES) {
    if (Date.now() > deadline) break;
    await toHub(w);
    const tl = tile(page, name);
    if (!(await tl.count())) continue;
    step('mid tile ' + name);
    await tl.first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1100);
    await shot('mid-' + name, { full: true, maxH: 3000 });
    await audit(w, 'mid-' + name);
    log.midTileText[name] = (await bodyText(page)).slice(0, 3500);
  }
  await toHub(w);
  for (const t of ['Squad', 'Table']) {
    await page.getByRole('tab', { name: new RegExp('^' + t + '$') }).first().click().catch(() => {});
    await page.waitForTimeout(1000);
    await shot('mid-tab-' + t, { full: true, maxH: 3600 });
    log['midtab_' + t] = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3000);
  }
  log.endSave = await saveSummary(page);
  const sv = await readSave(page);
  if (sv && sv !== 'BAD') {
    log.inboxDump = (sv.inbox || []).map(m => [m.week, m.from || m.sender || '', (m.title || m.subject || m.text || '').slice(0, 90)]).slice(0, 120);
    log.newsDump = (sv.news || sv.newsFeed || []).slice(0, 80);
    log.saveKeys = Object.keys(sv);
  }
} catch (e) {
  find('note', 'walk threw', String(e).slice(0, 300));
  await shot('threw', { full: true }).catch(() => {});
}
step('end');
console.log(`TOUR ${TAG} done: ${log.findings.length} findings, ${log.errors.length} errors, ${log.shots.length} shots, ${log.elapsedS}s`);
await w.browser.close();
