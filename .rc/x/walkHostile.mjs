/* Club Manager QA: hostile and damaged saves, back button, double tab. env TAG W H */
import { openWalk, audit, startCareer, toHub, tile, quickSim, bodyText, saveSummary, readSave, click, btn, role, h1, KEY, BASE, ensureGame } from './cmlib.mjs';

const E = process.env;
const TAG = E.TAG || 'hostile';
const w = await openWalk(TAG, Number(E.W || 390), Number(E.H || 844));
const { page, log, step, find, shot } = w;
log.cases = [];

async function load(label, mutate) {
  step('case ' + label);
  const good = log.good;
  const errsBefore = log.errors.length;
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: KEY, v: mutate(JSON.parse(good), good) });
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
  const hadResume = await resume.count();
  if (hadResume) { await resume.first().click().catch(() => {}); await page.waitForTimeout(2500); }
  await shot('case-' + label, { full: true, maxH: 2600 });
  const t = await bodyText(page);
  const hub = await page.getByRole('tab', { name: /^Home$/ }).count();
  let played = null;
  if (hub) {
    // try one match and two tiles to see whether it survives use
    for (const tl of ['Finances', 'Board']) { await toHub(w); if (await tile(page, tl).count()) { await tile(page, tl).first().click().catch(() => {}); await page.waitForTimeout(800); } }
    await toHub(w);
    const q = await quickSim(w, 'case-' + label);
    played = q ? String(q).slice(0, 300) : 'no quick sim';
    await shot('case-' + label + '-after');
  }
  const c = { label, hadResume: !!hadResume, hub: !!hub, h1: await h1(page), text: t.slice(0, 500), played, errors: log.errors.slice(errsBefore).map(e => e.m).slice(0, 5), saveAfter: await saveSummary(page) };
  log.cases.push(c);
  console.log(`CASE ${label}: hub=${c.hub} resume=${c.hadResume} h1=${c.h1} errors=${c.errors.length} ${c.errors[0] || ''}`.slice(0, 300));
  await audit(w, 'case-' + label, 'body');
  w.save();
}

try {
  const ok = await startCareer(w, { era: /2026-27/, nation: /England/, league: /Premier/, club: /Brighton/, managerName: '' });
  if (!ok) throw new Error('no start');
  await quickSim(w, 'base');
  log.good = await page.evaluate(k => localStorage.getItem(k), KEY);
  log.goodSize = log.good.length;
  log.allKeys = await page.evaluate(() => Object.keys(localStorage));
  // a second tab on the same save: play in tab 2, then act in tab 1
  step('two tabs');
  const p2 = await w.ctx.newPage();
  await p2.route(/supabase\.co/, r => r.abort());
  await p2.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(3000);
  const r2 = p2.getByRole('button', { name: 'Resume Career', exact: true });
  if (await r2.count()) { await r2.first().click().catch(() => {}); await p2.waitForTimeout(2000); }
  const wk0 = (await saveSummary(page))?.week;
  await p2.locator('[data-cm-way="quick"]').first().click().catch(() => {});
  await p2.waitForTimeout(2000);
  await p2.getByRole('button', { name: /^Continue$/i }).first().click().catch(() => {});
  await p2.waitForTimeout(1500);
  const wkAfterTab2 = (await saveSummary(page))?.week;
  // tab 1 still shows the old state; play from it
  await page.bringToFront();
  await toHub(w);
  const tab1Fixture = (await page.locator('[data-cm-way="quick"]').first().evaluate(b => b.closest('.rounded-2xl')?.innerText || '').catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
  await page.locator('[data-cm-way="quick"]').first().click().catch(() => {});
  await page.waitForTimeout(2000);
  await shot('two-tabs-tab1-report', { full: true, maxH: 2200 });
  await page.getByRole('button', { name: /^Continue$/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const sv = await readSave(page);
  log.twoTabs = { wk0, wkAfterTab2, tab1Fixture, after: await saveSummary(page), resultLog: (sv?.resultLog || []).slice(-4).map(r => JSON.stringify(r).slice(0, 140)) };
  console.log('TWO TABS ' + JSON.stringify(log.twoTabs).slice(0, 600));
  await p2.close();
  log.good = await page.evaluate(k => localStorage.getItem(k), KEY);

  // back button mid flow: start a live match, press browser back, come back
  step('back button mid match');
  await toHub(w);
  await page.locator('[data-cm-way="live"]').first().click().catch(() => {});
  await page.waitForTimeout(2500);
  const urlIn = page.url();
  await page.goBack().catch(() => {});
  await page.waitForTimeout(2500);
  const urlBack = page.url();
  await shot('after-back-in-match', { full: true, maxH: 2200 });
  await page.goForward().catch(() => {});
  await page.waitForTimeout(2500);
  await ensureGame(w);
  await shot('after-forward', { full: true, maxH: 2200 });
  log.back = { urlIn, urlBack, after: await saveSummary(page), h1: await h1(page), resumeBtn: await page.getByRole('button', { name: 'Resume match' }).count() };
  console.log('BACK ' + JSON.stringify(log.back));
  log.good = await page.evaluate(k => localStorage.getItem(k), KEY);

  await load('truncated', (o, raw) => raw.slice(0, Math.floor(raw.length / 2)));
  await load('budget-nan', o => JSON.stringify({ ...o, budget: 'lots' }));
  await load('budget-negative', o => JSON.stringify({ ...o, budget: -250 }));
  await load('week-past-end', o => JSON.stringify({ ...o, week: o.calendar.length + 5 }));
  await load('squad-five', o => JSON.stringify({ ...o, squad: o.squad.slice(0, 5) }));
  await load('xi-missing', o => JSON.stringify({ ...o, xiIds: ['nobody-1', 'nobody-2'] }));
  await load('inbox-spam', o => JSON.stringify({ ...o, inbox: Array.from({ length: 400 }, (_, i) => ({ id: 'x' + i, playerName: 'Nobody', playerId: 'zz', kind: 'praise', text: 'Spam ' + i, options: [], week: 1 })) }));
  await load('unknown-club', o => JSON.stringify({ ...o, clubName: 'Atlantis Wanderers' }));
  await load('old-version', o => JSON.stringify({ ...o, saveVersion: (o.saveVersion || 1) - 1 }));
  await load('good-again', (o, raw) => raw);
} catch (e) {
  find('note', 'walk threw', String(e).slice(0, 300));
  await shot('threw', { full: true }).catch(() => {});
}
step('end');
log.good = log.good ? log.good.length : 0;
console.log(`HOSTILE ${TAG} done: ${log.findings.length} findings, ${log.errors.length} errors, ${log.elapsedS}s`);
await w.browser.close();
