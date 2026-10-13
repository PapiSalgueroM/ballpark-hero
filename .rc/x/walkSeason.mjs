/* Club Manager QA season walk: play matches, deal in windows, fast forward, read every review, carry on.
   env: TAG W H ERA NATION LEAGUE CLUB NAME ENTRY SEASONS LIVE (live matches at the start of each season) */
import { openWalk, audit, startCareer, toHub, tile, playLive, quickSim, fastForward, bodyText, saveSummary, readSave, click, btn, role, h1, KEY } from './cmlib.mjs';

const E = process.env;
const TAG = E.TAG || 'season';
const W = Number(E.W || 390), H = Number(E.H || 844);
const SEASONS = Number(E.SEASONS || 2);
const LIVE = Number(E.LIVE || 2);
const rx = s => (s && s.startsWith('/') ? new RegExp(s.slice(1, s.lastIndexOf('/')), s.slice(s.lastIndexOf('/') + 1)) : s ? new RegExp(s) : null);
const w = await openWalk(TAG, W, H);
const { page, log, step, find, shot } = w;
const deadline = Date.now() + Number(E.MINUTES || 40) * 60000;
log.seasons = [];

async function dealInWindow(label) {
  step('window ' + label);
  await shot(label + '-market', { full: true, maxH: 3000 });
  await audit(w, label + '-market');
  const res = { signed: [], sold: [], bid: null };
  await page.getByLabel('Sort players').first().selectOption('cheap', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const clause = page.locator('button:visible[title^="Release clause"]:not([disabled])').first();
  if (await clause.count()) {
    const who = await clause.evaluate(b => { let row = b; for (let i = 0; i < 5 && row && !row.classList.contains('border-b'); i++) row = row.parentElement; const n = row && row.querySelector('span.text-xs.truncate'); return n ? n.textContent.trim() : ''; }).catch(() => '');
    const b0 = (await saveSummary(page))?.budget;
    await clause.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(900);
    await shot(label + '-after-clause');
    await click(w, role(page, /confirm|sign him|do it/i), 'confirm', 700);
    const sv = await readSave(page);
    const inSquad = sv && sv !== 'BAD' && sv.squad.some(p => p.name === who);
    res.signed.push({ who, inSquad, budgetBefore: b0, budgetAfter: sv?.budget });
    if (who && !inSquad) find('major', 'release clause press did not sign the player', who);
  } else res.signed.push('no affordable clause on show');
  // Try a normal bid: open the first player row and look for a bid / offer control
  const offer = page.locator('button:visible').filter({ hasText: /^(Bid|Make an offer|Offer|Approach)/i }).first();
  if (await offer.count()) {
    await offer.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    await shot(label + '-bid-open', { full: true, maxH: 2600 });
    await audit(w, label + '-bid-open', 'body');
    res.bid = (await bodyText(page)).slice(0, 600);
    await page.keyboard.press('Escape').catch(() => {});
  }
  log[label + '_deal'] = res;
  await page.getByRole('tab', { name: /^Home$/ }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  return res;
}

async function handleInterrupt(where) {
  // Something stopped a fast forward: a report, the window, a review, sack, an approach, a decision.
  for (let guard = 0; guard < 6; guard++) {
    const hd = await h1(page);
    if (hd === 'FULL TIME') { await click(w, role(page, /^Continue$/i), 'continue', 1500); continue; }
    if (hd === 'HALF TIME' || hd === 'MATCH LIVE') { await click(w, role(page, /^Second half$/), '2h', 1000); await click(w, role(page, /^Skip$/), 'skip', 1000); await click(w, role(page, /^Full report$/), 'report', 1000); continue; }
    if (/SEASON \d+ COMPLETE|SACKED/.test(hd)) return hd;
    if (await btn(page, /^Open the Window/).count()) {
      await click(w, btn(page, /^Open the Window/), 'open window', 1500);
      await dealInWindow(`s${(await saveSummary(page))?.season}-jan`);
      continue;
    }
    if (await btn(page, /See Season Review/).count()) { await click(w, btn(page, /See Season Review/), 'review', 2000); continue; }
    return hd || 'hub';
  }
  return 'guard';
}

try {
  const ok = await startCareer(w, {
    era: rx(E.ERA || '/2026-27/'), nation: rx(E.NATION || '/^\\s*England/'), league: E.LEAGUE && /^\d+$/.test(E.LEAGUE) ? Number(E.LEAGUE) : rx(E.LEAGUE || '/Premier League/'),
    club: E.CLUB === 'last' || E.CLUB === 'first' ? E.CLUB : rx(E.CLUB || '/Liverpool/'), managerName: E.NAME || '', entry: E.ENTRY || '',
  });
  if (!ok) throw new Error('could not start');
  await shot('hub-start', { full: true, maxH: 4200 });
  await audit(w, 'hub-start');
  for (let s = 1; s <= SEASONS && Date.now() < deadline; s++) {
    const S = { n: s, start: await saveSummary(page), live: [], ffs: [] };
    log.seasons.push(S);
    step(`season ${s} start`);
    // summer window if open
    if ((await saveSummary(page))?.window) {
      await page.getByRole('tab', { name: /^Market$/ }).first().click().catch(() => {});
      await page.waitForTimeout(1200);
      await dealInWindow(`s${s}-summer`);
    }
    for (let m = 0; m < LIVE && Date.now() < deadline; m++) {
      const r = await playLive(w, `s${s}m${m + 1}`, { sub: true, watchSecs: m === 0 ? 70 : 0 });
      S.live.push({ ...r, reportText: (r.reportText || '').slice(0, 900) });
      const hi = await handleInterrupt('after live');
      if (/COMPLETE|SACKED/.test(hi)) break;
    }
    const q = await quickSim(w, `s${s}q`);
    S.quick = String(q).slice(0, 900);
    await handleInterrupt('after quick');
    // the rest of the season by fast forward, stopping where the game stops
    let end = '';
    for (let k = 0; k < 14 && Date.now() < deadline; k++) {
      const r = await fastForward(w, k < 3 ? 'About a month' : 'Rest of season');
      const sv = await saveSummary(page);
      S.ffs.push({ k, r, sv });
      step(`s${s} ff ${k}`, { r, sv });
      if (k === 1) {
        // mid season: inbox and board and the table, as a fan would check
        await handleInterrupt('mid');
        await toHub(w);
        for (const tl of ['Inbox', 'Board', 'Finances', 'Press room', 'Dressing room']) {
          await toHub(w);
          if (await tile(page, tl).count()) { await tile(page, tl).first().click().catch(() => {}); await page.waitForTimeout(1000); await shot(`s${s}-mid-${tl}`, { full: true, maxH: 3000 }); await audit(w, `s${s}-mid-${tl}`); S['mid_' + tl] = (await bodyText(page)).slice(0, 2500); }
        }
        // reload in the middle of a season
        const b = await saveSummary(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
        if (await resume.count()) { await resume.first().click().catch(() => {}); await page.waitForTimeout(2500); }
        const a = await saveSummary(page);
        S.reload = { b, a };
        if (JSON.stringify(a) !== JSON.stringify(b)) find('major', 'reload changed the save', JSON.stringify({ b, a }));
      }
      if (r === 'no ff button Rest of season' || r === 'no ff button About a month' || r === 'no calendar tile') {
        end = await handleInterrupt('no ff');
        if (/COMPLETE|SACKED/.test(end)) break;
        await toHub(w);
        if (await btn(page, /See Season Review/).count()) { await click(w, btn(page, /See Season Review/), 'review', 2500); end = await h1(page); break; }
        await shot(`s${s}-ff-stuck-${k}`, { full: true });
        continue;
      }
      end = await handleInterrupt('ff');
      if (/COMPLETE|SACKED/.test(end)) break;
    }
    S.end = end;
    if (/SACKED/.test(end)) { await shot(`s${s}-sacked`, { full: true, maxH: 4000 }); S.sackedText = (await bodyText(page)).slice(0, 3000); find('note', 'sacked', `season ${s}`); break; }
    if (!/COMPLETE/.test(end)) { find('major', 'season did not reach its review', `season ${s} ended on "${end}"`); await shot(`s${s}-noreview`, { full: true }); break; }
    step(`season ${s} review`);
    await page.waitForTimeout(1500);
    await shot(`s${s}-review-top`);
    await shot(`s${s}-review-full`, { full: true, maxH: 6000 });
    await audit(w, `s${s}-review`, 'body');
    S.review = (await bodyText(page)).slice(0, 6000);
    S.endSave = await saveSummary(page);
    const sv = await readSave(page);
    if (sv && sv !== 'BAD') S.inboxDump = (sv.inbox || []).map(m => [m.week, (m.title || m.subject || m.text || '').slice(0, 100)]);
    if (s < SEASONS) {
      const next = btn(page, /^(Continue to Season|Start Season)/);
      if (!await click(w, next, 'next season', 3000)) { find('blocker', 'no way on from the season review', ''); break; }
      for (let i = 0; i < 20 && !(await page.getByRole('tab', { name: /^Home$/ }).count()); i++) await page.waitForTimeout(800);
      await shot(`s${s + 1}-preseason`, { full: true, maxH: 4200 });
      await audit(w, `s${s + 1}-preseason`);
      // pre-season checks a fan makes: inbox, squad (retirements, contracts), finances
      for (const tl of ['Inbox', 'Board', 'Finances', 'Academy', 'Staff']) {
        await toHub(w);
        if (await tile(page, tl).count()) { await tile(page, tl).first().click().catch(() => {}); await page.waitForTimeout(1000); await shot(`s${s + 1}-pre-${tl}`, { full: true, maxH: 3000 }); log[`s${s + 1}_pre_${tl}`] = (await bodyText(page)).slice(0, 2500); }
      }
      await toHub(w);
      await page.getByRole('tab', { name: /^Squad$/ }).first().click().catch(() => {});
      await page.waitForTimeout(1000);
      await shot(`s${s + 1}-pre-squad`, { full: true, maxH: 4000 });
      log[`s${s + 1}_pre_squad`] = (await page.locator('[role="tabpanel"][data-state="active"]').first().innerText().catch(() => '')).slice(0, 3500);
      await page.getByRole('tab', { name: /^Home$/ }).first().click().catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  const sv = await readSave(page);
  if (sv && sv !== 'BAD') { log.finalKeys = Object.keys(sv); log.finalInbox = (sv.inbox || []).map(m => [m.week, (m.title || m.subject || m.text || '').slice(0, 100)]); }
} catch (e) {
  find('note', 'walk threw', String(e).slice(0, 300));
  await shot('threw', { full: true }).catch(() => {});
}
step('end');
console.log(`SEASON ${TAG} done: ${log.findings.length} findings, ${log.errors.length} errors, ${log.shots.length} shots, ${log.elapsedS}s`);
await w.browser.close();
