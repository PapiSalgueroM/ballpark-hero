/* Review walk (shootout review, Release AM). Never committed.
   Builds, with the tree's own engine, a Club Manager save paused in a cup tie
   against a THIN side (names but no eleven) with a shootout order set and
   extra time already drawn level, then opens the built site, resumes the
   career the way a player would and finishes the tie both ways (Quick Sim and
   the live viewer) at 390x844 and 1280x900. Supabase is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, OUT, bundleEngine, withSeed, reachCup, cupOppOf, classOf, storage, FIXED_NOW } from './sholib.mjs';

const BASE = process.env.BASE || 'http://localhost:4384';
const SHOTS = (process.env.RC_OUT || process.env.SHOTS || OUT).replaceAll('\\', '/');
fs.mkdirSync(SHOTS, { recursive: true });
const KEY = 'dukb-club-manager-save';
const cm = (await bundleEngine(ROOT, 'walk')).cm;
const log = [];
const say = m => { console.log(m); log.push(m); };
const problems = [];
const problem = m => { problems.push(m); say('  PROBLEM: ' + m); };

function findBase(keeperless) {
  for (const club of ['Real Madrid', 'Barcelona', 'Getafe']) {
    for (let k = 0; k < 60; k++) {
      let s;
      try { s = withSeed(782_001 + k, () => cm.startCareer(club)); } catch { break; }
      const opp = s.cupDraw?.[s.calendar.find(e => e.type === 'cup')?.cupRound];
      const r = opp ? cm.oppRosterFor(s, opp) : [];
      if (classOf(r) !== 'thin') continue;
      if (keeperless !== r.some(p => p.p === 'GK')) return { club, seed: 782_001 + k };
    }
  }
  return null;
}
function buildFixture(base, label) {
  const at = reachCup(cm, base.club, base.seed);
  const opp = cupOppOf(at);
  const roster = cm.oppRosterFor(at, opp);
  const oppS = cm.strengthOf(at, opp);
  const ids = cm.resolveXI(at).filter(Boolean).filter(p => p.position !== 'GK').slice(0, 5).map(p => p.id);
  const ordered = cm.setShootoutOrder(at, ids);
  if (!ordered) throw new Error('setShootoutOrder refused');
  for (let K = 0; K < 600; K++) {
    const h = withSeed(50_000 + K, () => cm.playNextEntry(ordered));
    if (h.kind !== 'halftime') continue;
    /* The domestic cup plays no extra time (only a Champions League decider
       does), so the save is paused with the second half drawn and level: the
       live viewer's whistle then goes to penalties whatever it draws, and
       the Quick Sim (whose coach can change the half) does on the seed found. */
    const s3 = withSeed(60_000 + K, () => cm.startSecondHalf(h.state));
    if (!s3) continue;
    let liveAll = true;
    for (let F = 0; F < 8 && liveAll; F++) {
      const r = withSeed(80_000 + F, () => cm.resumeMatch(s3));
      if (r.kind !== 'match' || r.report.decidedBy !== 'pens' || !r.report.shootout) liveAll = false;
    }
    if (!liveAll) continue;
    let best = null; let quickPens = 0;
    for (let F = 0; F < 40; F++) {
      const r = withSeed(90_000 + F, () => cm.playNextEntry(s3, { skipHalftime: true }));
      if (r.kind !== 'match' || r.report.decidedBy !== 'pens' || !r.report.shootout) continue;
      quickPens += 1;
      const n = r.report.shootout.kicks.length;
      if (!best || n > best.n) best = { F: 90_000 + F, n, report: r.report };
    }
    if (!best) continue;
    storage.load({});
    const saved = cm.saveCareer(s3) ? storage.dump()[KEY] : null;
    say(`${label}: ${base.club} (career seed ${base.seed}) v ${opp}, ${roster.length} on their roster (${roster.map(p => `${p.p} ${p.r}${p.g ? ' made up' : ''}`).join(', ')}), club strength ${oppS}; kick off seed ${50_000 + K}, live minute ${s3.live?.minute}, score ${s3.live?.myGoals}-${s3.live?.oppGoals} at the break; the whistle goes to penalties on 8 of 8 seeds, the Quick Sim on ${quickPens} of 40; finish seed ${best.F} gives ${best.n} kicks`);
    return { label, opp, roster, oppS, paused: s3, raw: saved ?? JSON.stringify(s3), finishSeed: best.F, expected: best.report, order: ids.map(id => at.squad.find(p => p.id === id)?.name) };
  }
  throw new Error(`${label}: no kick off seed in 600 leaves the tie level at ninety with the second half drawn`);
}

const fixtures = [];
const b1 = findBase(false);
if (!b1) throw new Error('no career draws a thin side with a keeper');
fixtures.push(buildFixture(b1, 'thin-with-keeper'));
const b2 = findBase(true);
if (b2) fixtures.push(buildFixture(b2, 'thin-no-keeper')); else say('no career in the search draws a thin side WITHOUT a keeper, so the made up keeper is not walked');
fs.writeFileSync(`${SHOTS}/walk-fixtures.json`, JSON.stringify(fixtures.map(f => ({ label: f.label, opp: f.opp, roster: f.roster, oppS: f.oppS, finishSeed: f.finishSeed, order: f.order, expectedKicks: f.expected.shootout.kicks })), null, 1));

const browser = await chromium.launch({ headless: true });
const VPS = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];

async function readKicks(page, scope) {
  return page.locator(`${scope} [data-cm-pen-kick]`).evaluateAll(els => els.map(li => {
    const spans = li.querySelectorAll(':scope > span');
    const name = spans[2];
    const tag = name?.querySelector('span');
    const lr = li.getBoundingClientRect();
    const tr = tag?.getBoundingClientRect();
    const nr = name?.getBoundingClientRect();
    return {
      n: Number(li.getAttribute('data-cm-pen-kick')), side: li.getAttribute('data-cm-pen-side'), result: li.getAttribute('data-cm-pen-result'),
      club: spans[1]?.textContent?.trim(), taker: (name?.childNodes[0]?.textContent ?? '').trim(), madeUp: !!tag, tagTitle: tag?.getAttribute('title') ?? null,
      nameCut: name ? name.scrollWidth > name.clientWidth + 1 : null,
      tagInside: tr && nr ? tr.right <= nr.right + 0.5 && tr.left >= nr.left - 0.5 : null,
      rowW: Math.round(lr.width), rowH: Math.round(lr.height), score: spans[4]?.textContent?.trim(),
    };
  }));
}
function judge(kicks, f, where) {
  const theirs = kicks.filter(k => k.side === 'opp');
  const first11 = theirs.slice(0, 11).map(k => k.taker);
  if (new Set(first11).size !== first11.length) problem(`${where}: a man of theirs kicked twice inside their first eleven: ${first11.join(', ')}`);
  const real = new Map(f.roster.map(p => [p.n, p]));
  for (const k of theirs) {
    const onRoster = real.get(k.taker);
    if (onRoster ? !!onRoster.g !== k.madeUp : !k.madeUp) problem(`${where}: ${k.taker} carries the wrong made up tag (${k.madeUp})`);
  }
  for (const k of kicks) {
    if (k.nameCut) problem(`${where}: kick ${k.n}, the taker's name is cut off (${k.taker})`);
    if (k.madeUp && k.tagInside === false) problem(`${where}: kick ${k.n}, the made up tag falls outside the name cell`);
  }
  return `${kicks.length} kicks, theirs ${theirs.length} (${theirs.filter(k => k.madeUp).length} tagged made up): ${theirs.map(k => `${k.taker}${k.madeUp ? '*' : ''}`).join(', ')}`;
}

async function open(vp, f, pass) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, isMobile: vp.touch, hasTouch: vp.touch, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: f.raw }, { name: 'cookie-consent', value: 'essential' }] }] },
  });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route(/googletagmanager|googlesyndication|doubleclick|google-analytics/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  if (pass === 'quick') {
    await page.addInitScript(({ now, seed }) => {
      const OldDate = Date;
      window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      document.addEventListener('click', event => {
        if (!event.target.closest?.('[data-cm-way="quick"]')) return;
        let a = seed >>> 0;
        Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      }, true);
    }, { now: FIXED_NOW, seed: f.finishSeed });
  }
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const resume = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
  await resume.waitFor();
  await resume.click();
  await page.locator('[data-cm-way="quick"]').waitFor();
  return { context, page, errors };
}
const shot = async (page, name, opts = {}) => { await page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts }); say(`   shot ${name}.png`); };

const results = [];
for (const f of fixtures) {
  for (const vp of VPS) {
    /* Quick Sim: the full time card. */
    {
      const where = `${f.label} ${vp.name} quick`;
      const { context, page, errors } = await open(vp, f, 'quick');
      try {
        await page.locator('[data-cm-way="quick"]').scrollIntoViewIfNeeded();
        if (f === fixtures[0]) await shot(page, `${f.label}-${vp.name}-1-hub`);
        await page.locator('[data-cm-way="quick"]').click();
        const box = page.locator('[data-cm-shootout]').first();
        await box.waitFor();
        await page.waitForTimeout(2500);
        await box.scrollIntoViewIfNeeded();
        await shot(page, `${f.label}-${vp.name}-2-quick-report`);
        await box.screenshot({ path: `${SHOTS}/${f.label}-${vp.name}-2-quick-kicks.png` });
        const kicks = await readKicks(page, '[data-cm-shootout]');
        const line = judge(kicks, f, where);
        const exp = f.expected.shootout.kicks;
        const sameAsNode = JSON.stringify(kicks.map(k => [k.side, k.taker, k.result])) === JSON.stringify(exp.map(k => [k.side, k.taker, k.result]));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) problem(`${where}: the page scrolls sideways by ${overflow}px`);
        say(`${where}: ${line}; equal to the engine's own replay of seed ${f.finishSeed}: ${sameAsNode}; count ${await box.getAttribute('data-cm-shootout')}; page errors ${errors.length}`);
        results.push({ where, kicks, sameAsNode, errors });
        if (errors.length) problem(`${where}: page errors: ${errors.join(' | ')}`);
      } catch (e) { problem(`${where}: ${String(e).slice(0, 300)}`); await shot(page, `${f.label}-${vp.name}-quick-FAILED`).catch(() => {}); }
      await context.close();
    }
    /* The live viewer: resume, skip to the whistle, the kicks on the live screen, then the full report. */
    {
      const where = `${f.label} ${vp.name} live`;
      const { context, page, errors } = await open(vp, f, 'live');
      try {
        await page.locator('[data-cm-way="live"]').click();
        let seen = false;
        for (let i = 0; i < 80 && !seen; i++) {
          if (await page.locator('[data-cm-shootout]').count()) { seen = true; break; }
          const second = page.getByRole('button', { name: 'Second half' });
          const skip = page.getByRole('button', { name: 'Skip' });
          if (await second.count()) await second.first().click().catch(() => {});
          else if (await skip.count()) await skip.first().click().catch(() => {});
          await page.waitForTimeout(600);
        }
        if (!seen) { problem(`${where}: the live viewer never showed the kicks (stage ${await page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-stage').catch(() => 'none')})`); await shot(page, `${f.label}-${vp.name}-live-FAILED`); }
        else {
          await page.waitForTimeout(1200);
          const box = page.locator('[data-cm-shootout]').first();
          await box.scrollIntoViewIfNeeded();
          await shot(page, `${f.label}-${vp.name}-3-live-whistle`);
          await shot(page, `${f.label}-${vp.name}-3-live-whistle-full`, { fullPage: true });
          const kicks = await readKicks(page, '[data-cm-shootout]');
          say(`${where}: ${judge(kicks, f, where)}; page errors ${errors.length}`);
          results.push({ where, kicks, errors });
          const full = page.getByRole('button', { name: 'Full report' });
          if (await full.count()) {
            await full.first().click();
            await page.locator('[data-cm-shootout]').first().waitFor();
            await page.waitForTimeout(2500);
            await page.locator('[data-cm-shootout]').first().scrollIntoViewIfNeeded();
            await shot(page, `${f.label}-${vp.name}-4-live-full-report`);
            const again = await readKicks(page, '[data-cm-shootout]');
            if (JSON.stringify(again.map(k => [k.side, k.taker, k.result])) !== JSON.stringify(kicks.map(k => [k.side, k.taker, k.result]))) problem(`${where}: the full report's kicks differ from the live screen's`);
          } else problem(`${where}: no Full report button at the whistle`);
          if (errors.length) problem(`${where}: page errors: ${errors.join(' | ')}`);
        }
      } catch (e) { problem(`${where}: ${String(e).slice(0, 300)}`); await shot(page, `${f.label}-${vp.name}-live-FAILED2`).catch(() => {}); }
      await context.close();
    }
  }
}
await browser.close();
fs.writeFileSync(`${SHOTS}/walk-results.json`, JSON.stringify({ results, problems, log }, null, 1));
console.log(`\nwalk: ${results.length} passes read, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
