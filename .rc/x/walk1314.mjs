// Round 1314 reviewer (run lens): play what the round's walks guard, the way a player would, at 390x844 and
// 1280x900 with reduced motion on and off: the hub and its Manager tile, the country's offer and the job card,
// and the sacking with the wilderness and its first offer. Blocks the database host. Shots go to RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rcout';
fs.mkdirSync(OUT, { recursive: true });
const findings = [];
const note = (cfg, m) => { findings.push(`${cfg}: ${m}`); console.log(`  FINDING ${cfg}: ${m}`); };
const CONFIGS = [
  { name: '390-reduce', w: 390, h: 844, rm: 'reduce' },
  { name: '390-motion', w: 390, h: 844, rm: 'no-preference' },
  { name: '1280-reduce', w: 1280, h: 900, rm: 'reduce' },
  { name: '1280-motion', w: 1280, h: 900, rm: 'no-preference' },
];
const KEY = 'dukb-club-manager-save';

/* Sideways scroll of the page, and any element of a card that sticks out of the viewport or is clipped. */
async function layout(page, cfg, where, sel) {
  const r = await page.evaluate(s => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const bad = [];
    const root = s ? document.querySelector(s) : null;
    const els = root ? [root, ...root.querySelectorAll('*')] : [];
    for (const el of els) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const txt = (el.innerText || '').replace(/\s+/g, ' ').slice(0, 50);
      if (b.right > vw + 1 || b.left < -1) bad.push(`${el.tagName} "${txt}" spans x ${Math.round(b.left)} to ${Math.round(b.right)} in a ${vw} viewport`);
      const cs = getComputedStyle(el);
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible') bad.push(`${el.tagName} "${txt}" is cut off (${el.scrollWidth} wide in ${el.clientWidth})`);
    }
    return { vw, sw, found: !!root, bad: bad.slice(0, 6) };
  }, sel);
  console.log(`  ${cfg} ${where}: viewport ${r.vw}, page width ${r.sw}${sel ? `, ${sel} ${r.found ? 'found' : 'MISSING'}` : ''}, layout problems ${r.bad.length}`);
  if (r.sw > r.vw + 1) note(cfg, `${where}: the page scrolls sideways (${r.sw} wide in ${r.vw})`);
  if (sel && !r.found) note(cfg, `${where}: ${sel} is not on the screen`);
  for (const b of r.bad) note(cfg, `${where}: ${b}`);
}
const shot = (page, file) => page.screenshot({ path: path.join(OUT, file) }).catch(e => console.log(`  shot ${file} failed: ${e.message}`));
async function doctor(ctx, fn, arg) {
  const helper = await ctx.newPage();
  await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const ok = await helper.evaluate(([k, kind]) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const c = JSON.parse(raw);
    if (kind === 'record') {
      c.trophies = [1, 2, 3].map(i => ({ season: 2026 + i, name: 'Premier League', emoji: '🏆' }));
      c.history = [1, 2, 3, 4, 5].map(i => ({ season: 2026 + i, club: c.clubName, position: 1, points: 90, trophies: ['Premier League'] }));
      c.careerStats = { ...(c.careerStats ?? {}), played: 200, wins: 130, draws: 30, losses: 40 };
    } else if (kind === 'floor') {
      c.boardConfidence = 0.4;
      for (const p of c.squad ?? []) p.ovr = 45;
    }
    localStorage.setItem(k, JSON.stringify(c));
    return true;
  }, [KEY, fn]);
  await helper.close();
  return ok;
}
async function startCareer(page, club) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Premier League")').first().click();
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${club}")`).first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  await page.locator('text=Take the job').click();
  await page.getByRole('button', { name: 'Skip: just manage', exact: true }).click();
}
const managerTile = p => p.locator('button').filter({ has: p.locator('div.uppercase', { hasText: /^\s*Manager\s*$/ }) });
async function resume(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const r = page.locator('button:has-text("Resume Career")');
  if (await r.count()) { await r.first().click(); await page.waitForTimeout(1200); }
}

const browser = await chromium.launch();
for (const cfg of CONFIGS) {
  console.log(`== ${cfg.name}`);
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, reducedMotion: cfg.rm });
  await ctx.route(/supabase\.co/, r => r.abort());
  const errors = [];
  let page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  try {
    await startCareer(page, 'Manchester City');
    await managerTile(page).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1500);
    const tiles = await managerTile(page).count();
    if (tiles !== 1) note(cfg.name, `the hub has ${tiles} tiles titled Manager`);
    await shot(page, `hub-${cfg.name}.png`);
    await layout(page, cfg.name, 'hub', null);
    await page.close();
    const ok = await doctor(ctx, 'record');
    if (!ok) note(cfg.name, 'no save to give a record');
    page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await resume(page);
    const tile = managerTile(page);
    await tile.first().waitFor({ state: 'visible', timeout: 20000 });
    const tileText = (await tile.first().innerText()).replace(/\s+/g, ' ');
    console.log(`  tile: ${tileText}`);
    if (!/country is calling/i.test(tileText)) note(cfg.name, `the Manager tile does not say the country is calling (${tileText})`);
    await tile.first().click();
    const offer = page.locator('[data-nation-offer]');
    await offer.waitFor({ state: 'visible', timeout: 15000 });
    await offer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const offerText = (await offer.innerText()).replace(/\s+/g, ' ');
    console.log(`  offer: ${offerText.slice(0, 220)}`);
    if (!/England/.test(offerText)) note(cfg.name, `the offer does not name England (${offerText.slice(0, 80)})`);
    await shot(page, `offer-${cfg.name}.png`);
    await layout(page, cfg.name, 'offer', '[data-nation-offer]');
    await offer.locator('button').first().click();
    const job = page.locator('[data-nation-job]');
    await job.waitFor({ state: 'visible', timeout: 15000 });
    await job.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    console.log(`  job: ${(await job.innerText()).replace(/\s+/g, ' ').slice(0, 220)}`);
    await shot(page, `job-${cfg.name}.png`);
    await layout(page, cfg.name, 'job', '[data-nation-job]');
    await page.close();
  } catch (e) { note(cfg.name, `the nation job walk stopped: ${String(e.message || e).split('\n')[0]}`); await page.close().catch(() => {}); }

  /* The sacking and the wilderness, on a fresh context: Newcastle, a floored board, a 45 rated squad. */
  const ctx2 = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, reducedMotion: cfg.rm });
  await ctx2.route(/supabase\.co/, r => r.abort());
  page = await ctx2.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  try {
    await startCareer(page, 'Newcastle');
    await page.locator('button:has-text("Finances")').first().waitFor({ timeout: 20000 });
    await page.close();
    if (!(await doctor(ctx2, 'floor'))) note(cfg.name, 'no save to floor');
    page = await ctx2.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await resume(page);
    const clickExact = async name => {
      const b = page.getByRole('button', { name, exact: true });
      if (!(await b.count())) return false;
      await b.first().click({ timeout: 4000 }).catch(() => {});
      return true;
    };
    const homeTab = async () => {
      const t = page.getByRole('tab', { name: 'Home', exact: true });
      if (await t.count()) await t.first().click({ timeout: 4000 }).catch(() => {});
    };
    let step = 0;
    for (; step < 80; step++) {
      if (await page.locator('[data-wilderness]').count()) break;
      if (await clickExact('⚡ Quick Sim')) { await page.waitForTimeout(600); continue; }
      if (await clickExact('Open the Window')) { await page.waitForTimeout(600); await homeTab(); await page.waitForTimeout(400); continue; }
      const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
      if (await onward.count()) { await onward.first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
      await homeTab();
      await page.waitForTimeout(400);
    }
    const wild = page.locator('[data-wilderness]');
    if (!(await wild.count())) note(cfg.name, `not sacked after ${step} steps`);
    else {
      console.log(`  sacked after ${step} steps`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);
      await shot(page, `sacked-top-${cfg.name}.png`);
      await layout(page, cfg.name, 'sacked', null);
      await wild.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await shot(page, `wilderness-${cfg.name}.png`);
      await layout(page, cfg.name, 'wilderness', '[data-wilderness]');
      let waits = 0;
      while (waits < 14 && !(await page.locator('[data-wilderness-offer]').count())) {
        await page.locator('[data-wait-week]').click();
        waits += 1;
        await page.waitForTimeout(450);
      }
      const offers = await page.locator('[data-wilderness-offer]').count();
      console.log(`  ${offers} offer(s) after ${waits} wait(s)`);
      if (!offers) note(cfg.name, 'no club called in 14 waits');
      else {
        await page.locator('[data-wilderness-offer]').first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(1500);
        console.log(`  wilderness: ${(await wild.innerText()).replace(/\s+/g, ' ').slice(0, 260)}`);
        await shot(page, `wild-offer-${cfg.name}.png`);
        await layout(page, cfg.name, 'wilderness offer', '[data-wilderness]');
      }
    }
  } catch (e) { note(cfg.name, `the wilderness walk stopped: ${String(e.message || e).split('\n')[0]}`); }
  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  if (real.length) note(cfg.name, `page errors: ${real[0]}`);
  await ctx.close();
  await ctx2.close();
}
await browser.close();
console.log('');
console.log(findings.length ? `walk1314: ${findings.length} finding(s)\n${findings.join('\n')}` : 'walk1314: no findings');
process.exit(findings.length ? 1 : 0);
