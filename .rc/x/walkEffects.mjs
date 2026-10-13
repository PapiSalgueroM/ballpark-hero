/* Club Manager QA: promised effects. Press the controls that promise something and diff the save. */
import { openWalk, audit, startCareer, toHub, tile, quickSim, bodyText, saveSummary, readSave, click, btn, role, h1, KEY, ensureGame } from './cmlib.mjs';

const E = process.env;
const w = await openWalk(E.TAG || 'fx', Number(E.W || 1280), Number(E.H || 900));
const { page, log, step, find, shot } = w;
log.effects = [];

function diffSave(a, b) {
  if (!a || !b || a === 'BAD' || b === 'BAD') return { err: 'no save' };
  const changed = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(k);
  return { changed, budget: [a.budget, b.budget] };
}
async function openTile(name) { await toHub(w); const t = tile(page, name); if (!(await t.count())) return false; await t.first().click().catch(() => {}); await page.waitForTimeout(1100); return true; }
async function press(where, rx, label, { nth = 0, expect } = {}) {
  step(`${where}: ${label}`);
  const b = page.locator('button:visible:not(header button):not(nav button)').filter({ hasText: rx }).filter({ hasNotText: /track stats|sign up|track your stats/i });
  const n = await b.count();
  if (!n) { log.effects.push({ where, label, result: 'no such control' }); console.log(`EFFECT ${where} ${label}: no such control`); return null; }
  const el = b.nth(Math.min(nth, n - 1));
  const text = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  const ctx = ((await el.evaluate(x => (x.closest('.rounded-xl, .rounded-2xl, .rounded-lg')?.innerText || '')).catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 300);
  const disabled = await el.isDisabled().catch(() => false);
  const s0 = await readSave(page);
  const t0 = await bodyText(page);
  await el.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  const dlg = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible');
  if (await dlg.count()) { await shot(`${where}-${label}-dialog`.replace(/\s+/g, '_')); await dlg.first().getByRole('button', { name: /^(Confirm|Yes|Do it|Agree|OK)/i }).first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(700); }
  const s1 = await readSave(page);
  const t1 = await bodyText(page);
  const d = diffSave(s0, s1);
  const rec = { where, label, text, ctx, disabled, diff: d, screenChanged: t0 !== t1 };
  if (expect) rec.check = expect(s0, s1, t0, t1);
  log.effects.push(rec);
  console.log(`EFFECT ${where} ${label}: btn="${text.slice(0, 60)}" disabled=${disabled} changed=${(d.changed || []).join(',')} budget ${d.budget?.join('->')} screen=${rec.screenChanged} ${rec.check ? 'CHECK ' + JSON.stringify(rec.check) : ''}`.slice(0, 600));
  await shot(`${where}-${label}`.replace(/\s+/g, '_'), { full: true, maxH: 2600 });
  w.save();
  return rec;
}

try {
  const ok = await startCareer(w, { era: /2026-27/, nation: /England/, league: /Premier/, club: new RegExp(E.CLUB || 'Aston Villa') });
  if (!ok) throw new Error('no start');
  const fac = s => s.facilities; const lvl = s => JSON.stringify(s.facilities || s.facilityLevels || null);
  // Facilities: the cheapest upgrade
  if (await openTile('Facilities')) {
    await shot('facilities-before', { full: true, maxH: 2400 });
    await press('facilities', /^Upgrade £/, 'upgrade first', { nth: 0, expect: (a, b) => ({ before: lvl(a), after: lvl(b) }) });
    await press('facilities', /^Upgrade £/, 'upgrade again', { nth: 0, expect: (a, b) => ({ before: lvl(a), after: lvl(b) }) });
  }
  // Finances: prices and a sponsor
  if (await openTile('Finances')) {
    await press('finances', /Premium/, 'premium tickets', { nth: 0, expect: (a, b) => ({ prices: [JSON.stringify(a.prices || a.ticketPrice || a.pricing || null), JSON.stringify(b.prices || b.ticketPrice || b.pricing || null)] }) });
    await press('finances', /Push for more/, 'push sponsor', { nth: 0 });
    await press('finances', /^Sign with/, 'sign sponsor', { nth: 0, expect: (a, b) => ({ sponsor: [JSON.stringify(a.sponsor || null).slice(0, 120), JSON.stringify(b.sponsor || null).slice(0, 120)] }) });
    await openTile('Finances'); await shot('finances-after', { full: true, maxH: 2600 });
    log.financesAfter = (await bodyText(page)).slice(0, 2500);
  }
  // Staff: pay one off, then look for a hire
  if (await openTile('Staff')) {
    await shot('staff-before', { full: true, maxH: 2600 });
    await press('staff', /^Pay off/, 'pay off coach', { nth: 0 });
    await press('staff', /^(Hire|Appoint|Sign)/, 'hire', { nth: 0 });
    await openTile('Staff'); await shot('staff-after', { full: true, maxH: 2600 });
    log.staffAfter = (await bodyText(page)).slice(0, 2500);
  }
  // Training
  if (await openTile('Training')) {
    await shot('training', { full: true, maxH: 2600 });
    log.trainingText = (await bodyText(page)).slice(0, 2500);
    await press('training', /Full training/, 'full training', { expect: (a, b) => ({ t: [JSON.stringify(a.training), JSON.stringify(b.training)] }) });
  }
  // Academy
  if (await openTile('Academy')) {
    await shot('academy', { full: true, maxH: 2600 });
    log.academyText = (await bodyText(page)).slice(0, 2500);
    await press('academy', /^(Send|Scout|Hire|Upgrade|Invest|Promote)/, 'academy action', { nth: 0 });
  }
  // Dressing room: give somebody a role
  if (await openTile('Dressing room')) {
    await shot('dressing', { full: true, maxH: 2600 });
    log.dressingText = (await bodyText(page)).slice(0, 2500);
  }
  // Press room
  if (await openTile('Press room')) {
    await shot('press', { full: true, maxH: 2600 });
    log.pressText = (await bodyText(page)).slice(0, 2000);
  }
  // Tactics: formation and mentality must stick
  await toHub(w);
  await page.getByRole('tab', { name: /^Tactics$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await shot('tactics', { full: true, maxH: 3600 });
  log.tacticsText = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3500);
  await press('tactics', /^4-4-2$/, 'formation 4-4-2', { expect: (a, b) => ({ f: [a.formation, b.formation] }) });
  await press('tactics', /Attacking|Gung ho|All out/, 'attacking mentality', { expect: (a, b) => ({ m: [a.mentality, b.mentality] }) });
  // Now play one match and make sure the shape is what was used
  await toHub(w);
  const q = await quickSim(w, 'fx-after-tactics');
  log.afterTacticsReport = String(q).slice(0, 1200);
  const sv = await readSave(page);
  log.afterMatch = { formation: sv?.formation, mentality: sv?.mentality, training: sv?.training, budget: sv?.budget };
  // Market: sell side. List a player and see whether bids arrive over a month
  await toHub(w);
  await page.getByRole('tab', { name: /^Market$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await press('market', /^\s*Sell/, 'sell tab', {});
  await shot('market-sell', { full: true, maxH: 3000 });
  log.sellText = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3000);
  await press('market', /^\s*Latest/, 'latest tab', {});
  await shot('market-latest', { full: true, maxH: 3000 });
  log.latestText = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3000);
  // a talk: open negotiations with a cheap player and make an offer
  await press('market', /^\s*Buy/, 'buy tab', {});
  await page.getByLabel('Sort players').first().selectOption('cheap', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  await press('market', /^\s*Talk ·/, 'open talks', { nth: 3 });
  await shot('negotiation', { full: true, maxH: 3000 });
  log.negText = (await bodyText(page)).slice(0, 2500);
  await press('market', /^(Split it|Meet them|Offer it|Their ask)/, 'offer', {});
  await shot('negotiation-after', { full: true, maxH: 3000 });
  log.negAfter = (await bodyText(page)).slice(0, 2500);
} catch (e) {
  find('note', 'walk threw', String(e).slice(0, 300));
  await shot('threw', { full: true }).catch(() => {});
}
step('end');
console.log(`EFFECTS done: ${log.findings.length} findings, ${log.errors.length} errors, ${log.elapsedS}s`);
await w.browser.close();
