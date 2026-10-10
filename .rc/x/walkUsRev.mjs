/* Reviewer walk, US careers, Release AU (us-careers lens). Sent to a runner as .rc/x/walkUsRev.mjs, never committed.
   Plays the four US My Careers the way a player would at 390x844 and 1280x900: quick start, the season programme
   panel (help first, six sections, rules behind the ?), a season with a plan, the reveal curtain back to the hub,
   the Trophy Case. Screenshots and a findings log go to $RC_OUT. The database host is blocked. */
import fs from 'node:fs'; import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.tmp-fx/walk-out'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = (process.env.WALK_SPORTS ?? 'nfl,nba,mlb,nhl').split(',');
const VIEWS = (process.env.WALK_VIEWS ?? '390x844,1280x900').split(',').map(v => v.split('x').map(Number));
const SECTIONS = ['workload', 'tactics', 'expectation', 'partnership', 'bonus', 'reinvention'];
const log = []; let bad = 0;
const say = (ok, msg) => { if (!ok) bad += 1; const l = (ok ? '  ok   ' : '  FAIL ') + msg; log.push(l); console.log(l); };
const info = msg => { log.push('  ..   ' + msg); console.log('  ..   ' + msg); };
const shot = async (page, name, full = false) => { try { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full }); } catch (e) { info('no shot ' + name + ': ' + e.message); } };
const hubIsUp = async page => await page.locator('button:has-text("Play the")').count() > 0;

async function clearSummer(page, tag) {
  for (let i = 0; i < 30; i += 1) {
    if (await page.locator('[data-season-reveal]').count()) { await page.locator('[data-season-reveal] button:has-text("Continue")').first().click(); await page.waitForTimeout(500); continue; }
    const cont = page.locator('[data-decision-continue]');
    if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(400); continue; }
    const opt = page.locator('[data-career-decision-option]');
    if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(400); continue; }
    const riv = page.locator('[data-rivalry-event] button:has-text("Continue")');
    if (await riv.count()) { await shot(page, tag + '-rivalry-card'); await riv.first().click(); await page.waitForTimeout(500); continue; }
    const choice = page.locator('[data-rivalry-choice]');
    if (await choice.count()) {
      const o = choice.locator('[data-rivalry-option]');
      if (await o.count()) { await o.first().click(); await page.waitForTimeout(400); }
      const c2 = choice.locator('button:has-text("Continue")');
      if (await c2.count()) { await c2.first().click(); await page.waitForTimeout(500); continue; }
    }
    if (await hubIsUp(page)) return i;
    await page.waitForTimeout(400);
  }
  return -1;
}

/* What is cut or off screen inside the open dialog. */
const measureDialog = page => page.evaluate(() => {
  const d = document.querySelector('[data-us-programme="dialog"]');
  if (!d) return null;
  const r = d.getBoundingClientRect(), cut = [], small = [];
  for (const el of d.querySelectorAll('button, p, h3, h2, span')) {
    const b = el.getBoundingClientRect();
    if (b.width === 0) continue;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') cut.push((el.textContent ?? '').trim().slice(0, 40));
    if (el.tagName === 'BUTTON' && (b.height < 43.5 || b.width < 43.5)) small.push((el.textContent ?? '').trim().slice(0, 30) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    if (b.right > innerWidth + 1 || b.left < -1) cut.push('OFF SCREEN: ' + (el.textContent ?? '').trim().slice(0, 40));
  }
  const body = d.querySelector('[data-us-programme-scroll]');
  return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight, cut, small, scrolls: body ? body.scrollHeight - body.clientHeight : 0, pageWider: document.documentElement.scrollWidth - innerWidth };
});

async function programme(page, tag, slug, wide) {
  const panel = page.locator('section[data-us-programme-panel]');
  say(await panel.count() === 1, tag + ': the season programme panel is on the hub');
  if (!(await panel.count())) return;
  const y0 = await page.evaluate(() => scrollY);
  await page.locator('[data-us-programme-open]').click(); await page.waitForTimeout(500);
  const dlg = page.locator('[data-us-programme="dialog"]');
  say(await dlg.count() === 1, tag + ': Plan your season opens the dialog');
  say(/How your programme works/.test(await dlg.innerText()), tag + ': it opens on its rules first');
  await shot(page, tag + '-p1-help');
  let m = await measureDialog(page);
  info(tag + ' help view: box ' + JSON.stringify(m?.box) + ' of ' + m?.vw + 'x' + m?.vh + ', body scrolls ' + m?.scrolls + ' px, cut ' + JSON.stringify(m?.cut) + ', small ' + JSON.stringify(m?.small));
  say(!!m && m.box[0] >= 0 && m.box[0] + m.box[2] <= m.vw + 1 && m.box[1] >= 0 && m.box[1] + m.box[3] <= m.vh + 1, tag + ': the help view is inside the screen');
  await page.locator('[data-us-programme-start]').click(); await page.waitForTimeout(300);
  const tiles = await page.locator('[data-us-programme-tile]').count();
  say(tiles === 6, tag + ': six plans on the menu (' + tiles + ')');
  await shot(page, tag + '-p2-menu');
  m = await measureDialog(page);
  say(!!m && m.cut.length === 0, tag + ': nothing cut on the menu ' + JSON.stringify(m?.cut));
  say(!!m && m.small.length === 0, tag + ': every menu button is a full touch target ' + JSON.stringify(m?.small));
  for (const id of SECTIONS) {
    await page.locator('[data-us-programme-tile="' + id + '"]').click(); await page.waitForTimeout(250);
    const words = (await dlg.locator('[data-us-programme-scroll]').innerText()).replace(/\s+/g, ' ');
    info(tag + ' ' + id + ': ' + words.slice(0, 700));
    say(!words.includes(String.fromCharCode(0x2013)) && !words.includes(String.fromCharCode(0x2014)), tag + ' ' + id + ': no long dash in the copy');
    m = await measureDialog(page);
    say(!!m && m.cut.length === 0 && m.pageWider <= 0, tag + ' ' + id + ': nothing cut ' + JSON.stringify(m?.cut));
    if (!wide || id === 'tactics' || id === 'bonus') await shot(page, tag + '-p3-' + id);
    /* the rules behind the ? and back to the same section */
    if (id === 'tactics') {
      await page.locator('[data-us-programme-help]').click(); await page.waitForTimeout(200);
      say(/How your programme works/.test(await dlg.innerText()), tag + ': the ? opens the rules from inside a plan');
      await page.locator('[data-us-programme-back]').click(); await page.waitForTimeout(200);
      say(await page.locator('[data-us-programme-choice^="tactics:"]').count() >= 3, tag + ': Back from the rules returns to the same plan');
    }
    await page.locator('[data-us-programme-back]').click(); await page.waitForTimeout(200);
  }
  /* choose four plans the way a player would */
  for (const pick of ['workload:recover', 'tactics:support', 'expectation:steady', 'bonus:steady']) {
    const [sec] = pick.split(':');
    await page.locator('[data-us-programme-tile="' + sec + '"]').click(); await page.waitForTimeout(200);
    await page.locator('[data-us-programme-choice="' + pick + '"]').click(); await page.waitForTimeout(250);
    say(await page.locator('[data-us-programme-choice="' + pick + '"][aria-pressed="true"]').count() === 1, tag + ': ' + pick + ' shows as chosen');
    await page.locator('[data-us-programme-back]').click(); await page.waitForTimeout(200);
  }
  await shot(page, tag + '-p4-menu-chosen');
  await page.locator('[data-us-programme-close]').click(); await page.waitForTimeout(400);
  const y1 = await page.evaluate(() => scrollY);
  say(Math.abs(y1 - y0) <= 2, tag + ': the page did not move across the dialog (' + y0 + ' then ' + y1 + ')');
  say(/Programme saved for \d{4} at /.test(await panel.innerText()), tag + ': the hub says the programme is saved: ' + (await panel.innerText()).replace(/\s+/g, ' ').slice(0, 120));
}

const readSave = (page, KEY) => page.evaluate(k => { const c = JSON.parse(localStorage.getItem(k)).c; return { health: c.health, morale: c.morale, dur: c.archetype ? c.archetype.durability : null, year: c.year, arch: c.archetype ? c.archetype.id : null, pos: c.pos, plan: c.programme ?? null, results: c.programmeResults ?? null, partner: c.programmePartnership ?? null, net: c.netWorth, earn: c.earnings }; }, KEY);

async function oneCareer(browser, slug, w, h, reduced) {
  const tag = slug + '-' + w + (reduced ? '-reduced' : '');
  console.log('== ' + tag);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const KEY = slug + '-my-career-save-v1';
  try {
    await page.addInitScript(route => localStorage.setItem('rules-gate-seen:' + route, '1'), '/' + slug + '-my-career');
    await page.goto(BASE + '/' + slug + '-my-career', { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    await page.locator('input[placeholder*="name"]').first().fill('Review Probe');
    await page.locator('button:has-text("Enter the draft")').click(); await page.waitForTimeout(900);
    say(await hubIsUp(page), tag + ': quick start reaches the hub');
    await shot(page, tag + '-h1-hub', true);
    const fold = await page.evaluate(() => {
      const r = el => el ? Math.round(el.getBoundingClientRect().top + scrollY) + '..' + Math.round(el.getBoundingClientRect().bottom + scrollY) : 'none';
      const b = [...document.querySelectorAll('button')].find(x => /Play the/.test(x.textContent ?? ''));
      return 'play ' + r(b) + ', programme panel ' + r(document.querySelector('section[data-us-programme-panel]')) + ', practice ' + r(document.querySelector('section[data-career-practice]')) + ', hub tiles ' + r(document.querySelector('[data-career-hub-buttons]')) + ', page ' + document.documentElement.scrollHeight + ' high, screen ' + innerHeight;
    });
    info(tag + ' hub layout (page px): ' + fold);
    await programme(page, tag, slug, w >= 1000);
    await shot(page, tag + '-h2-hub-saved', true);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    const before = await readSave(page, KEY);
    say(!!before.plan && before.plan.workload === 'recover' && /Programme saved for/.test(await page.locator('section[data-us-programme-panel]').innerText()), tag + ': the plan survives a reload: ' + JSON.stringify(before.plan));
    await page.locator('button:has-text("Play the")').first().click(); await page.waitForTimeout(900);
    say(await page.locator('[data-season-reveal]').count() === 1, tag + ': Play raises the season reveal');
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    info(tag + ' reveal: ' + running + ' animation(s) running 0.9 s after the press' + (reduced ? ' (reduced motion asked)' : ''));
    if (reduced) say(running === 0, tag + ': with reduced motion asked nothing is still moving on the reveal');
    await shot(page, tag + '-s1-reveal');
    const steps = await clearSummer(page, tag);
    say(steps >= 0, tag + ': the curtain, the rivalry card and the summer all lead back to the hub (' + steps + ' presses)');
    if (steps < 0) { info(tag + ' STUCK on: ' + (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); await shot(page, tag + '-STUCK', true); }
    const after = await readSave(page, KEY);
    info(tag + ' save before the season ' + JSON.stringify(before).slice(0, 400) + ' and after ' + JSON.stringify(after).slice(0, 900));
    say(after.plan === null && Array.isArray(after.results) && after.results.length === 1, tag + ': one result row, the plan is off the save');
    say(after.dur === before.dur, tag + ': durability is back to ' + before.dur + ' after the season');
    const panel = page.locator('section[data-us-programme-panel]');
    if (await panel.count()) { await panel.scrollIntoViewIfNeeded(); info(tag + ' result block: ' + (await panel.innerText()).replace(/\s+/g, ' ').slice(0, 500)); await shot(page, tag + '-s2-result'); }
    const trophy = page.locator('[data-career-hub-buttons] button:has-text("Troph")');
    if (await trophy.count()) {
      await trophy.first().click(); await page.waitForTimeout(500);
      say(await page.locator('[data-trophy-case]').count() === 1, tag + ': the Trophy Case opens from its tile');
      await shot(page, tag + '-t1-trophy');
      const back = page.locator('button:has-text("Back")');
      if (await back.count()) { await back.first().click(); await page.waitForTimeout(300); }
      say(await hubIsUp(page), tag + ': Back from the Trophy Case returns to the hub');
    } else say(false, tag + ': no Trophy Case tile on the hub');
    if (!reduced && w < 1000) await planted(page, tag, KEY);
  } catch (e) { say(false, tag + ': the walk stopped: ' + String(e).split(String.fromCharCode(10))[0].slice(0, 220)); await shot(page, tag + '-ERROR', true); }
  say(errors.length === 0, tag + ': no page error (' + errors.join(' | ').slice(0, 300) + ')');
  await ctx.close();
}

/* What a paid bonus reads like, and a damaged record: planted on the save, as a reload would find them. */
async function planted(page, tag, KEY) {
  await page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem(k)), c = s.c;
    c.programmeResults = [{ sport: k.slice(0, 3), year: c.year - 1, team: c.team, outcome: 'completed', bonusGross: 0.0165, bonusNet: 0.0074, partnershipProgress: 1, decisions: [
      { section: 'expectation', label: 'Steady availability', outcome: 'completed', target: 10, actual: 16, unit: 'games' },
      { section: 'bonus', label: 'Match the benchmark', outcome: 'completed', target: 20, actual: 24, unit: 'passing touchdowns' },
      { section: 'partnership', label: 'Work with your receivers', outcome: 'completed', target: 10, actual: 16, unit: 'games' }] }];
    localStorage.setItem(k, JSON.stringify(s));
  }, KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  const p2 = page.locator('section[data-us-programme-panel]');
  if (await p2.count()) { await p2.scrollIntoViewIfNeeded(); info(tag + ' a paid bonus reads: ' + (await p2.innerText()).replace(/\s+/g, ' ').slice(0, 400)); await shot(page, tag + '-s3-bonus-paid'); }
  else info(tag + ' no programme panel after the plant (the hub is ' + (await hubIsUp(page) ? 'up' : 'NOT up') + ')');
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.c.programmeResults = [{}]; s.c.programme = 'x'; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  say(await hubIsUp(page), tag + ': a save with a damaged programme record still opens on the hub');
  if (await page.locator('[data-us-programme-open]').count()) {
    await page.locator('[data-us-programme-open]').click(); await page.waitForTimeout(300);
    await page.locator('[data-us-programme-start]').click(); await page.waitForTimeout(200);
    await page.locator('[data-us-programme-tile="workload"]').click(); await page.waitForTimeout(200);
    const dis = await page.locator('[data-us-programme-choice]:disabled').count();
    info(tag + ' damaged record: ' + dis + ' choices disabled; the dialog ends: ' + (await page.locator('[data-us-programme-scroll]').innerText()).replace(/\s+/g, ' ').slice(-200));
    await shot(page, tag + '-s4-damaged');
    await page.locator('[data-us-programme-close]').click(); await page.waitForTimeout(200);
  }
  if (await hubIsUp(page)) {
    await page.locator('button:has-text("Play the")').first().click(); await page.waitForTimeout(900);
    say(await page.locator('[data-season-reveal]').count() === 1, tag + ': and the next season still plays with the damaged record on the save');
  }
}

const browser = await chromium.launch();
for (const slug of ONLY) for (const [w, h] of VIEWS) await oneCareer(browser, slug, w, h, false);
if (!process.env.WALK_NO_REDUCED) { await oneCareer(browser, 'nba', 390, 844, true); await oneCareer(browser, 'nfl', 1280, 900, true); }
await browser.close();
fs.writeFileSync(path.join(OUT, 'walkUsRev-log.txt'), log.join(String.fromCharCode(10)));
console.log('walkUsRev: ' + log.filter(l => l.startsWith('  ok')).length + ' ok, ' + bad + ' FAILED, over ' + ONLY.length + ' sports at ' + VIEWS.length + ' widths plus two reduced motion careers');
process.exit(bad ? 1 : 0);
