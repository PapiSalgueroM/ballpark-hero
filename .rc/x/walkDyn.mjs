/* QA hunt: play a college dynasty through a season, recruiting and into season two, at 390x844 and 1280x900.
   node .rc/x/walkDyn.mjs cfb|cbb */
import { chromium, BASE, SIZES, makeLog, shot, newPage, firstVisit, buttons, clickRule, mainText, audit } from './gmlib.mjs';

const CFG = {
  cfb: { route: '/cfb-dynasty', key: 'cfb-dynasty-save-v1', standings: /^Conferences$/i, max: 16 },
  cbb: { route: '/cbb-dynasty', key: 'cbb-dynasty-save-v1', standings: /^Leagues$/i, max: 24 },
};
const sport = process.argv[2];
const cfg = CFG[sport];
if (!cfg) { console.log('usage: walkDyn.mjs cfb|cbb'); process.exit(2); }
const only = process.env.QA_SIZE;
const PLAY = [['play', /^Play (Week|Round) \d+$/i], ['final', /^Final (week|round) \+/i]];
const browser = await chromium.launch();

async function tabs(page, G, label, log, deep) {
  for (const [name, re] of [['roster', /^Roster$/i], ['schedule', /^Schedule$/i], ['top25', /^Top 25$/i], ['standings', cfg.standings]]) {
    const r = await clickRule(page, [[name, re]], log);
    if (!r) { log('note', { msg: `no tab ${name}`, label }); continue; }
    await page.waitForTimeout(700);
    await shot(page, `${G}-${label}-tab-${name}`);
    await audit(page, `${label} tab ${name}`, log, { deep });
    log('tab', { label, name, text: await mainText(page, 900) });
  }
  await clickRule(page, [['playtab', /^Play$/i]], log);
  await page.waitForTimeout(500);
}

async function play(page, G, label, log, stopAfter) {
  let n = 0;
  while (n < cfg.max && n < stopAfter) {
    if (await page.locator('[role="dialog"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    const list = await buttons(page);
    if (list.some(b => /Hit the recruiting trail/i.test(b.t))) return { n, end: 'recap' };
    let r = await clickRule(page, PLAY, log);
    if (!r) {
      await clickRule(page, [['playtab', /^Play$/i]], log); await page.waitForTimeout(500);
      r = await clickRule(page, PLAY, log);
      if (!r) {
        log('STUCK', { label, n, buttons: list.map(b => `${b.dis ? '[x]' : ''}${b.t.slice(0, 40)}`).slice(0, 25), text: await mainText(page, 900) });
        await shot(page, `${G}-${label}-STUCK`, { force: true });
        return { n, end: 'stuck' };
      }
    }
    n += 1;
    await page.waitForTimeout(r.name === 'final' ? 3500 : 700);
    const a = await audit(page, `${label} press ${n} ${r.text}`, log);
    if (n % 5 === 1 || r.name === 'final' || a.overflowX > 1) {
      await shot(page, `${G}-${label}-press${String(n).padStart(2, '0')}`);
      log('week', { label, pressed: r.text, text: await mainText(page, 700) });
    }
  }
  const list = await buttons(page);
  if (list.some(b => /Hit the recruiting trail/i.test(b.t))) return { n, end: 'recap' };
  return { n, end: n >= stopAfter ? 'paused' : 'max' };
}

for (const size of SIZES) {
  if (only && only !== size.tag) continue;
  const G = `${sport}-${size.tag}`;
  const log = makeLog(G);
  const { ctx, page } = await newPage(browser, size, log);
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
    await firstVisit(page, sport, size, log);
    await shot(page, `${G}-01-pick`);
    await audit(page, 'pick', log, { deep: true, always: true });
    const schools = page.locator('#dukb-main .grid button');
    const count = await schools.count();
    const idx = size.tag === 'p' ? 0 : Math.min(20, count - 1);
    log('school', { count, idx, school: (await schools.nth(idx).innerText()).replace(/\s+/g, ' ') });
    await schools.nth(idx).click();
    await page.waitForTimeout(1500);
    await shot(page, `${G}-02-hub`);
    await audit(page, 'hub', log, { deep: true, always: true });
    log('hub', { text: await mainText(page, 1400) });
    await tabs(page, G, 's1', log, true);
    const a = await play(page, G, 's1a', log, Math.floor(cfg.max / 2));
    log('season', { part: 's1a', ...a });
    if (a.end === 'paused') {
      await tabs(page, G, 's1mid', log, false);
      const b = await play(page, G, 's1b', log, cfg.max);
      log('season', { part: 's1b', ...b, secs: Math.round((Date.now() - t0) / 1000) });
    }
    if ((await buttons(page)).some(b => /Hit the recruiting trail/i.test(b.t))) {
      await page.waitForTimeout(3500);
      await shot(page, `${G}-03-recap`);
      await shot(page, `${G}-03-recap-full`, { full: true });
      await audit(page, 'recap', log, { deep: true, always: true });
      log('recap', { text: await mainText(page, 1800) });
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000);
      log('recapReload', { trail: (await buttons(page)).some(b => /Hit the recruiting trail/i.test(b.t)), text: await mainText(page, 400) });
      await clickRule(page, [['trail', /Hit the recruiting trail/i]], log);
      await page.waitForTimeout(1200);
      await shot(page, `${G}-04-recruit`);
      await audit(page, 'recruit', log, { deep: true, always: true });
      log('recruit', { text: await mainText(page, 1500) });
      for (let i = 0; i < 4; i += 1) {
        const r = await clickRule(page, [['sign', /scouted .* Sign$/i]], log);
        await page.waitForTimeout(600);
        log('signed', { did: r ? r.text.slice(0, 70) : null });
      }
      const p = await clickRule(page, [['portal', /Sign$/i]], log, { pickLast: true });
      await page.waitForTimeout(600);
      log('portal', { did: p ? p.text.slice(0, 70) : null });
      const h = await clickRule(page, [['shop', /^(Hire|Shop)$/]], log);
      if (h) {
        await page.waitForTimeout(500);
        await shot(page, `${G}-05-staffmarket`);
        const hi = await clickRule(page, [['hire', /rated \d+ .* asks/i]], log);
        await page.waitForTimeout(600);
        log('hire', { did: hi ? hi.text.slice(0, 80) : null });
      }
      await shot(page, `${G}-05-recruit-after`);
      await audit(page, 'recruit after', log, { deep: true });
      log('recruitAfter', { text: await mainText(page, 1200) });
      await clickRule(page, [['close', /Close the class/i]], log);
      await page.waitForTimeout(1800);
      await shot(page, `${G}-06-s2hub`);
      await audit(page, 's2 hub', log, { deep: true, always: true });
      log('s2hub', { text: await mainText(page, 1500) });
      await tabs(page, G, 's2', log, false);
      const c = await play(page, G, 's2', log, 3);
      log('season', { part: 's2', ...c });
      const before = await mainText(page, 300);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
      log('reload', { before, after: await mainText(page, 300) });
      await shot(page, `${G}-07-reload`);
    }
    if (size.tag === 'p') {
      const raw = await page.evaluate(k => localStorage.getItem(k), cfg.key);
      log('save', { bytes: raw ? raw.length : 0 });
      if (raw) {
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [cfg.key, raw.slice(0, Math.floor(raw.length / 2))]);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        await shot(page, `${G}-08-hostile-half`);
        log('hostile', { kind: 'half', text: await mainText(page, 400) });
        const obj = JSON.parse(raw);
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [cfg.key, JSON.stringify({ ...obj, phase: 'recruit', recruits: null, portal: null })]);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        await shot(page, `${G}-09-hostile-recruit`);
        log('hostile', { kind: 'recruit-null', text: await mainText(page, 400), buttons: (await buttons(page)).map(b => b.t.slice(0, 40)).slice(0, 10) });
      }
    }
  } catch (e) {
    log('EXCEPTION', { msg: String(e).slice(0, 400) });
    await shot(page, `${G}-EXC`, { force: true });
  }
  log('done', { secs: Math.round((Date.now() - t0) / 1000) });
  await ctx.close();
}
await browser.close();
console.log('WALK FINISHED', sport);
