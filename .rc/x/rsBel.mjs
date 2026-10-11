/* Reviewer walk (screens, Release AX): the 2025/26 Belgian replay with real club names, at 320x568, 390x844 and 1280x900.
   Sent as .rc/x/rsBel.mjs. Reads BASE, RC_OUT and LABELS (the folder the pure stage of scripts/simSoccerOpponentLabels.mjs
   wrote: its witness save, a genuine 2025 Anderlecht summary). Blocks supabase.co. Reduced motion, as the other lane's
   own journey, so a match is over at once: the subject here is the words on the fixture list, the scoreboard and the results line. */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rs-out';
const LABELS = process.env.LABELS || '/tmp/labels-proof';
fs.mkdirSync(OUT, { recursive: true });
const read = id => JSON.parse(gunzipSync(fs.readFileSync(path.join(LABELS, `objects/${id}.json.gz`))).toString('utf8'));
const fx = JSON.parse(fs.readFileSync(path.join(LABELS, 'fixtures.json'), 'utf8'));
const save = read(fx.save);
if (save.chanceWheel && typeof save.chanceWheel === 'object' && save.chanceWheel.seen === false) save.chanceWheel = { ...save.chanceWheel, seen: true };
const log = [];
const say = (tag, obj) => { const line = `${tag} ${typeof obj === 'string' ? obj : JSON.stringify(obj)}`; console.log(line.slice(0, 2600)); log.push({ tag, obj }); };
say('bel witness', { club: save.currentClub, age: save.age, era: save.era, phase: save.phase, summary: save.pendingSummary && `${save.pendingSummary.year} ${save.pendingSummary.club} ${save.pendingSummary.league || ''}`, names: fx.names });
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 60 }); } catch (e) { say('SHOTFAIL', name); } };

const spans = (page, sel) => page.evaluate(q => [...document.querySelectorAll(q)].map(e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
  return { t: (e.textContent || '').trim(), w: Math.round(b.width), cut: e.scrollWidth > e.clientWidth + 1, clientW: e.clientWidth, scrollW: e.scrollWidth, fs: cs.fontSize, style: cs.fontStyle, weight: cs.fontWeight }; }), sel);

for (const [w, h] of [[320, 568], [390, 844], [1280, 900]]) {
  const tag = `bel ${w}x${h}:`; const id = `bel-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await ctx.addInitScript(([bytes]) => { if (!sessionStorage.getItem('rs-seeded')) { sessionStorage.setItem('rs-seeded', '1'); localStorage.setItem('soccerCareerSave', bytes); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('seasonCentre:help', '1'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); } }, [JSON.stringify(save)]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-watch-week-by-week]').waitFor({ state: 'visible', timeout: 40000 });
    await page.locator('[data-watch-week-by-week]').click(); await page.locator('[data-centre-header]').waitFor({ state: 'visible', timeout: 30000 }); await page.waitForTimeout(500);
    const why = await page.evaluate(() => { const e = document.querySelector('[data-results-why]'); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { text: e.textContent, box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], fs: cs.fontSize, lines: Math.round(b.height / parseFloat(cs.lineHeight)) }; });
    const header = await page.evaluate(() => { const e = document.querySelector('[data-centre-header]'); const b = e.getBoundingClientRect(); return { text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500), box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], innerH: innerHeight, overflowX: document.documentElement.scrollWidth - innerWidth }; });
    say(tag + ' centre open', { header, why });
    await shot(page, id + '-centre-open');
    const arrive = async md => { for (let turn = 0; turn < 16; turn += 1) {
      await page.waitForFunction(m => !!document.querySelector(`[data-matchday="${m}"] [data-full-time]`) || !!document.querySelector('[data-moment-pass]') || Array.from(document.querySelectorAll('[data-centre-bar] button')).some(b => b.textContent.trim() === `▶ League game ${m}`), md, { timeout: 30000 });
      if (await page.locator('[data-moment-pass]').isVisible()) await page.locator('[data-moment-pass]').click();
      else if (await page.locator(`[data-matchday="${md}"] [data-full-time]`).isVisible()) return;
      else await page.getByRole('button', { name: `▶ League game ${md}`, exact: true }).click();
    } throw new Error('match arrival bound'); };
    await page.getByRole('button', { name: '▶ Kick off', exact: true }).click(); await arrive(1);
    await page.getByRole('button', { name: '▶ League game 2', exact: true }).click(); await arrive(2); await page.waitForTimeout(400);
    say(tag + ' game 2 scoreboard', { spans: await spans(page, '[data-matchday="2"] [data-score-bar] span'), events: (await page.locator('[data-matchday="2"] [data-clock-events] li').allTextContents()).slice(0, 6) });
    await shot(page, id + '-game2');
    if (w < 500) await page.locator('[data-centre-fixtures]').click();
    const listSel = w < 500 ? '[data-centre-stage] [data-fixture-name]' : 'aside[aria-label="Fixtures"] [data-fixture-name]';
    await page.locator(listSel).first().waitFor({ state: 'visible', timeout: 15000 }); await page.waitForTimeout(300);
    const names = await spans(page, listSel);
    const cups = await page.evaluate(() => [...document.querySelectorAll('[data-fixture-cup]')].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)));
    say(tag + ' fixture list', { rows: names.length, cut: names.filter(n => n.cut).map(n => `${n.t} (${n.clientW} of ${n.scrollW})`), unrecorded: names.filter(n => n.t === 'Opponent not recorded').map(n => `${n.style} ${n.weight} ${n.fs}`), italicRows: names.filter(n => n.style === 'italic').map(n => n.t), distinct: [...new Set(names.map(n => n.t))], cups });
    await shot(page, id + '-fixtures-top');
    const firstU = await page.evaluate(q => { const all = [...document.querySelectorAll(q)]; const e = all.find(x => x.textContent.trim() === 'Opponent not recorded'); if (!e) return null; e.scrollIntoView({ block: 'center' }); return e.closest('[data-fixture-row]').getAttribute('data-fixture-row'); }, listSel);
    await page.waitForTimeout(250); await shot(page, id + '-fixtures-unrecorded');
    const cupAt = await page.evaluate(() => { const e = document.querySelector('[data-fixture-cup]'); if (!e) return null; e.scrollIntoView({ block: 'center' }); return e.getAttribute('data-cup-after-league'); });
    await page.waitForTimeout(250); if (cupAt !== null) await shot(page, id + '-fixtures-cup');
    say(tag + ' first unrecorded row and first cup row', { firstUnrecordedMatchday: firstU, firstCupAfterLeague: cupAt });
    if (w < 500) await page.locator('[data-centre-stage]').getByRole('button', { name: '← Back', exact: true }).click().catch(() => {});
    /* play on to the first match against an unrecorded opponent, to read the scoreboard there */
    if (firstU) {
      const target = Number(firstU); let turns = 0, bars = [];
      while (turns < 220 && !(await page.locator(`[data-matchday="${target}"] [data-full-time]`).isVisible().catch(() => false))) {
        turns += 1;
        if (await page.locator('[data-moment-pass]').isVisible().catch(() => false)) { await page.locator('[data-moment-pass]').click(); continue; }
        const b = page.locator('[data-centre-bar] button').filter({ hasText: /^▶/ }).first();
        if (await b.isVisible().catch(() => false)) { const t = (await b.textContent()).trim(); if (bars.length < 12 || !bars.includes(t)) bars.push(t); await b.click(); await page.waitForTimeout(60); continue; }
        const any = page.locator('[data-centre-stage] button:not([disabled])').first();
        if (await any.isVisible().catch(() => false)) { const t = 'stage: ' + (await any.textContent()).trim().slice(0, 30); if (!bars.includes(t)) bars.push(t); await any.click(); await page.waitForTimeout(60); continue; }
        await page.waitForTimeout(150);
      }
      const reached = await page.locator(`[data-matchday="${target}"] [data-full-time]`).isVisible().catch(() => false);
      say(tag + ' unrecorded opponent match', { target, turns, reached, pressed: bars.slice(0, 30), spans: reached ? await spans(page, `[data-matchday="${target}"] [data-score-bar] span`) : null, events: reached ? (await page.locator(`[data-matchday="${target}"] [data-clock-events] li`).allTextContents()).slice(0, 8) : null });
      await shot(page, id + '-unrecorded-game');
    }
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 500)); await shot(page, id + '-crash'); }
  say(tag + ' errors', errors); await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'bel-log.json'), JSON.stringify(log));
console.log(`rsBel: done, ${log.length} lines`);
