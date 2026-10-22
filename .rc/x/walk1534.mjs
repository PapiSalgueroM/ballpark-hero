/* Round 1534 review walk (the runner lens). Plays the US My Career shop the way a player would, in all four
   sports, at 390x844 (touch) and 1280x900 (mouse), reduced motion on and off. Reads BASE (a served dist),
   blocks supabase.co, writes screenshots and measure.json into RC_OUT. Never part of the branch. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.resolve(process.env.RC_OUT || '.tmp-fx/review-walk-out');
fs.mkdirSync(OUT, { recursive: true });
const fixture = JSON.parse(fs.readFileSync('scripts/data/usBoardFixture.json', 'utf8'));
const SPORTS = [
  { id: 'nba', route: '/nba-my-career', key: 'nba-my-career-save-v1', index: 'index_nba', crypto: 'crypto_nba', office: 'family_office_nba', lawyer: 'nshady_lawyer', camp: 'Free Summer Camp', stake: 'restaurant_group' },
  { id: 'nfl', route: '/nfl-my-career', key: 'nfl-my-career-save-v1', index: 'index_fund', crypto: 'crypto_punt', office: 'family_office', lawyer: 'shady_lawyer', camp: null, stake: 'wing_franchise' },
  { id: 'mlb', route: '/mlb-my-career', key: 'mlb-my-career-save-v1', index: 'index_mlb', crypto: 'crypto_mlb', office: 'family_office_mlb', lawyer: 'mshady_lawyer', camp: 'Free Youth Baseball Camp', stake: 'restaurant_group' },
  { id: 'nhl', route: '/nhl-my-career', key: 'nhl-my-career-save-v1', index: 'index_nhl', crypto: 'crypto_nhl', office: 'family_office_nhl', lawyer: 'hshady_lawyer', camp: 'Free Youth Hockey Camp', stake: 'restaurant_group' },
];
const SIZES = [{ w: 390, h: 844, touch: true }, { w: 1280, h: 900, touch: false }];
const MOTIONS = ['reduce', 'no-preference'];
const results = [];
let problems = 0;
const problem = (r, msg) => { problems += 1; r.problems.push(msg); console.log(`  PROBLEM ${r.tag}: ${msg}`); };

async function layoutCheck(page, r, where) {
  const m = await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth, iw = innerWidth;
    const cut = [];
    for (const el of document.querySelectorAll('p, span, button, li, h1, h2, h3')) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (b.right > iw + 1 || b.left < -1) cut.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 50)}" ${Math.round(b.left)}..${Math.round(b.right)}`);
    }
    return { sw, iw, cut: cut.slice(0, 6) };
  });
  if (m.sw > m.iw) problem(r, `${where}: sideways scroll ${m.sw} on ${m.iw}`);
  if (m.cut.length) problem(r, `${where}: off screen ${m.cut.join(' | ')}`);
}

async function open(browser, sport, size, motion, save) {
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: motion, serviceWorkers: 'block',
  });
  await context.addInitScript(([k, v, route]) => {
    try {
      if (!sessionStorage.getItem('seeded1534')) {
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(`rules-gate-seen:${route}`, '1');
        localStorage.setItem(k, v);
        sessionStorage.setItem('seeded1534', '1');
      }
    } catch { /* ignore */ }
  }, [sport.key, JSON.stringify(save), sport.route]);
  await context.route(/supabase\.co/, r => r.abort());
  await context.route(/googlesyndication|doubleclick|googletagmanager|google-analytics/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}${sport.route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}

const r1 = v => Math.round(v * 10) / 10;
const saveOf = async (page, key) => JSON.parse(await page.evaluate(k => localStorage.getItem(k), key));
const REMOVED = ['Protects your money', 'The retirement plan', 'real royalties', 'Hides money', 'heat +3 a year', 'heat +5 a year'];
const WANT = ['Adds 2 percent to your cash every season', 'Heat cools twice as fast', 'Washes 4M, heat +3', 'Heat +6', 'Steady 7 percent'];

async function walk(browser, sport, size, motion) {
  const tag = `${sport.id}-${size.w}-${motion === 'reduce' ? 'rm' : 'anim'}`;
  const r = { tag, problems: [], m: {} };
  results.push(r);
  const save = JSON.parse(fixture.sports[sport.id].saves.mid);
  const nfl = sport.id === 'nfl';
  save.c.netWorth = 30; save.c.heat = 40; save.c.dirtyMoney = 0;
  save.c.purchased = [...(save.c.purchased ?? []), sport.index, sport.index, sport.office, sport.lawyer, sport.stake];
  save.c.yearlyCosts = Math.round(((save.c.yearlyCosts ?? 0) + (nfl ? 0.15 + 0.4 : 0.18 + 0.45)) * 100) / 100;
  const { context, page, errors } = await open(browser, sport, size, motion, save);
  const tap = async loc => (size.touch ? loc.tap() : loc.click());
  let n = 0;
  const shot = async name => page.screenshot({ path: path.join(OUT, `${tag}-${String(++n).padStart(2, '0')}-${name}.png`) });
  try {
    const play = page.getByRole('button', { name: /^Play the \d{4} season$/ });
    await play.waitFor();
    await shot('hub');
    await tap(page.locator('[data-career-hub-buttons] button', { hasText: 'Bank' }).first());
    await tap(page.getByRole('button', { name: '🛒 Shop', exact: true }));
    const panel = page.locator('div.rounded-2xl', { hasText: '💰 Your money' }).last();
    await panel.waitFor();
    const seen = [];
    for (const [aisle, label] of [['invest', '📈 Invest'], ['flex', '💎 Flex'], ['family', '❤️ Family'], ['shady', '🕶️ Shady']]) {
      const btn = page.getByRole('button', { name: label, exact: true });
      if (!(await btn.count())) { problem(r, `aisle ${label} not shown`); continue; }
      await tap(btn.first());
      await page.waitForTimeout(250);
      const cards = (await panel.locator('div.rounded-lg.border').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
      seen.push(...cards);
      r.m[aisle] = cards.filter(t => /percent|chance|Fanbase \+1[02]|Washes 4M|Heat|Camp/.test(t)).map(t => t.slice(0, 170));
      await panel.screenshot({ path: path.join(OUT, `${tag}-aisle-${aisle}.png`) });
      await layoutCheck(page, r, `aisle ${aisle}`);
    }
    const all = seen.join(' || ');
    for (const gone of REMOVED) if (all.includes(gone)) problem(r, `a card still says "${gone}"`);
    for (const want of WANT) if (!all.includes(want)) problem(r, `no card says "${want}"`);
    let c0 = (await saveOf(page, sport.key)).c;
    if (sport.camp) {
      await tap(page.getByRole('button', { name: '❤️ Family', exact: true }).first());
      const card = panel.locator('div.rounded-lg.border', { hasText: sport.camp }).first();
      await tap(card.getByRole('button').first());
      await page.waitForTimeout(500);
      const c1 = (await saveOf(page, sport.key)).c;
      r.m.camp = { fanbase: [c0.fanbase, c1.fanbase], morale: [c0.morale, c1.morale], cash: [c0.netWorth, c1.netWorth], upkeep: [c0.yearlyCosts, c1.yearlyCosts] };
      const wantFan = Math.min(100, c0.fanbase + 8), wantMor = Math.min(100, c0.morale + 6);
      if (c1.fanbase !== wantFan || c1.morale !== wantMor) problem(r, `summer camp landed fanbase ${c1.fanbase} and morale ${c1.morale}, the card prints +8 and +6 from ${c0.fanbase} and ${c0.morale}`);
      r.m.campWant = `Fanbase +${wantFan - c0.fanbase}, morale +${wantMor - c0.morale}.`;
      await shot('after-camp');
      c0 = c1;
    }
    await tap(page.getByRole('button', { name: '📈 Invest', exact: true }).first());
    const crypto = panel.locator('div.rounded-lg.border', { hasText: 'Crypto Punt' }).first();
    await tap(crypto.getByRole('button').first());
    await page.waitForTimeout(400);
    const cBuy = (await saveOf(page, sport.key)).c;
    r.m.cryptoBuy = { cash: [c0.netWorth, cBuy.netWorth], held: cBuy.purchased.filter(id => id === sport.crypto).length };
    if (r1(c0.netWorth - 1) !== cBuy.netWorth || r.m.cryptoBuy.held !== 1) problem(r, `buying the crypto punt moved Cash ${c0.netWorth} to ${cBuy.netWorth}, held ${r.m.cryptoBuy.held}`);
    await panel.screenshot({ path: path.join(OUT, `${tag}-invest-after-buy.png`) });
    await tap(page.getByRole('button', { name: 'Hub', exact: true }).first());
    await play.waitFor();
    if (sport.camp) {
      const logLine = await page.getByText(/Two weeks, 400 kids, no fee\. Fanbase \+\d+, morale \+\d+\./).first().innerText({ timeout: 3000 }).catch(() => null);
      r.m.campLine = logLine;
      if (!logLine) problem(r, 'the summer camp buy printed no line the player can see on the hub');
      else if (!logLine.includes(r.m.campWant)) problem(r, `camp line "${logLine}" does not print what landed (${r.m.campWant})`);
      await shot('hub-after-buys');
    }
    const scrollBefore = await page.evaluate(() => scrollY);
    await tap(play);
    const money = page.getByText(/^💵 This season /).first();
    try { await money.waitFor({ timeout: 12000 }); } catch { problem(r, 'no returns line in the season feed'); }
    await page.waitForTimeout(motion === 'reduce' ? 800 : 4000);
    const reveal = page.locator('[data-season-reveal]').first();
    if (await reveal.count()) await reveal.screenshot({ path: path.join(OUT, `${tag}-curtain.png`) }).catch(() => {});
    await shot('season-played');
    await layoutCheck(page, r, 'season played');
    const lines = await page.getByText(/^(💵 This season|🎰 Your|💸 Your)/).allInnerTexts();
    r.m.lines = [...new Set(lines)];
    r.m.scroll = [scrollBefore, await page.evaluate(() => scrollY)];
    const c2 = (await saveOf(page, sport.key)).c;
    r.m.after = { cash: c2.netWorth, carry: c2.shopCarry, heat: [cBuy.heat, c2.heat], dirty: c2.dirtyMoney, held: c2.purchased.filter(id => [sport.crypto, sport.stake, sport.index, sport.office, sport.lawyer].includes(id)), year: [cBuy.year, c2.year], salary: [cBuy.salary, c2.salary], upkeep: c2.yearlyCosts };
    if (c2.purchased.includes(sport.crypto) || c2.purchased.includes(sport.stake)) problem(r, 'a stake is still held after its season end');
    const stakeLines = r.m.lines.filter(t => /^(🎰|💸)/.test(t));
    if (stakeLines.length !== 2) problem(r, `${stakeLines.length} stake lines in the feed, wanted 2`);
    const won = stakeLines.filter(t => t.startsWith('🎰')).map(t => Number((t.match(/\$([\d.]+)M back/) || [])[1]));
    const pay = r1(cBuy.netWorth + cBuy.salary * 0.45 - cBuy.yearlyCosts);
    const payouts = won.reduce((a, b) => a + b, 0), steady = 0.28;
    const exact = Math.round((steady + (pay + payouts + steady) * 0.02) * 10000), tenths = Math.floor(exact / 1000);
    r.m.expect = { pay, payouts, cash: r1(pay + payouts + tenths / 10), carry: (exact - tenths * 1000) / 10000 };
    if (r.m.expect.cash !== c2.netWorth || r.m.expect.carry !== c2.shopCarry) problem(r, `Cash ${c2.netWorth} carry ${c2.shopCarry}, the cards print ${r.m.expect.cash} carry ${r.m.expect.carry}`);
    if (c2.heat !== Math.max(0, cBuy.heat - 18)) problem(r, `heat ${cBuy.heat} went to ${c2.heat}, the lawyer prints twice as fast (18)`);
    await helpCheck(page, r, tap, tag);
  } catch (error) { problem(r, `crash: ${String(error.message || error).split('\n')[0].slice(0, 200)}`); await shot('crash').catch(() => {}); }
  if (errors.length) problem(r, `page errors: ${errors.join(' | ')}`);
  await context.close();
}

async function helpCheck(page, r, tap, tag) {
  const trigger = page.getByRole('button', { name: 'How to play' }).first();
  if (!(await trigger.count())) { problem(r, 'no How to play button'); return; }
  await page.keyboard.press('Escape').catch(() => {});
  await tap(trigger);
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor();
  const rule = dialog.getByText(/^The shop pays what its cards say/).first();
  if (!(await rule.count())) { problem(r, 'the How to play dialog has no shop rule'); return; }
  await rule.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const m = await rule.evaluate(el => {
    const b = el.getBoundingClientRect();
    let box = el.parentElement; while (box && getComputedStyle(box).overflowY === 'visible') box = box.parentElement;
    const d = box ? box.getBoundingClientRect() : { top: 0, bottom: innerHeight, left: 0, right: innerWidth };
    return { fs: parseFloat(getComputedStyle(el).fontSize), top: b.top, bottom: b.bottom, left: b.left, right: b.right, dTop: d.top, dBottom: d.bottom, iw: innerWidth, ih: innerHeight, text: el.textContent };
  });
  r.m.help = { fs: m.fs, box: [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)], vp: [m.iw, m.ih] };
  if (m.right > m.iw + 1 || m.left < -1) problem(r, 'the shop rule runs off the side of the dialog');
  if (m.fs < 12) problem(r, `the shop rule is ${m.fs}px`);
  await page.screenshot({ path: path.join(OUT, `${tag}-help.png`) });
}

const browser = await chromium.launch();
try {
  for (const sport of SPORTS) for (const size of SIZES) for (const motion of MOTIONS) {
    if (size.w === 1280 && motion === 'no-preference' && sport.id !== 'nba') continue;
    console.log(`walk ${sport.id} ${size.w} ${motion}`);
    await walk(browser, sport, size, motion);
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(`  ${r.tag}: ${JSON.stringify({ camp: r.m.camp, cryptoBuy: r.m.cryptoBuy, after: r.m.after, expect: r.m.expect, scroll: r.m.scroll, help: r.m.help })}`);
for (const r of results) console.log(`  ${r.tag} lines: ${JSON.stringify(r.m.lines)} camp: ${JSON.stringify(r.m.campLine)}`);
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length}`);
console.log(`walk1534: ${results.length} walks, ${problems} problems`);
process.exit(problems ? 1 : 0);
