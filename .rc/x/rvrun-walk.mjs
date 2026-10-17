// Reviewer walk (round 1340, runner lens): a fresh Liverpool 2026-27 career played the way a player would, through
// the picker, the hub, the Match Centre, Play Live, the interval, half time and the report, at five sizes.
// Liverpool's real first fixture is away at Newcastle (the hunt's own case), its second at home to Forest.
// Reads base URL from BASE; supabase.co and every host but BASE and the font hosts are aborted.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.join(process.env.RC_OUT || '/tmp/rvrun', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const CONFIGS = [
  { id: '390', w: 390, h: 844, touch: true, rm: false },
  { id: '390rm', w: 390, h: 844, touch: true, rm: true },
  { id: '1280', w: 1280, h: 900, touch: false, rm: false },
  { id: '1280rm', w: 1280, h: 900, touch: false, rm: true },
  { id: '320', w: 320, h: 640, touch: true, rm: false },
];
const findings = [];
const notes = [];
const flag = (id, what) => { findings.push(`${id}: ${what}`); console.log(`  FINDING ${id}: ${what}`); };
const say = (id, what) => { notes.push(`${id}: ${what}`); console.log(`  ${id}: ${what}`); };
const browser = await chromium.launch();

async function open(c) {
  const context = await browser.newContext({
    viewport: { width: c.w, height: c.h }, hasTouch: c.touch, isMobile: c.touch,
    reducedMotion: c.rm ? 'reduce' : 'no-preference', colorScheme: 'dark', serviceWorkers: 'block',
  });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === BASE || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return r.continue();
    return r.abort('blockedbyclient');
  });
  await context.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch {} });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const press = async loc => { await loc.waitFor({ timeout: 30000 }); if (c.touch) await loc.tap(); else await loc.click(); await page.waitForTimeout(400); };
  return { context, page, errors, press };
}
const shot = (page, id, name, full = false) => page.screenshot({ path: path.join(OUT, `${id}-${name}.png`), fullPage: full }).catch(e => console.log(`  shot ${name} failed ${e.message}`));
const btn = (page, rx) => page.locator('button:visible').filter({ hasText: rx }).first();

/** The hub's next match card: its two names in order, which is mine, and the venue word under it. */
const readCard = page => page.evaluate(() => {
  const card = document.querySelector('[data-cm-next-match]');
  if (!card) return null;
  const sides = [...card.querySelectorAll('[data-cm-next-side]')];
  const box = card.parentElement;
  return {
    text: card.textContent.replace(/\s+/g, ' ').trim(),
    sides: sides.map(s => s.getAttribute('data-cm-next-side')),
    names: sides.map(s => s.textContent.trim()),
    greenIsMine: sides.every(s => (s.getAttribute('data-cm-next-side') === 'me') === s.className.includes('text-primary')),
    around: (box?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
  };
});
/** Every dot label on the pitch: text, cut or not, a leading digit. */
const readLabels = page => page.evaluate(() => [...document.querySelectorAll('.cm-dot-label')].filter(l => l.offsetParent !== null).map(l => ({
  t: l.textContent.trim(), cut: l.scrollWidth > l.clientWidth + 1, digit: /^\d/.test(l.textContent.trim()) || /^\d+$/.test(l.textContent.trim()),
})));
/** Overflow sideways at this size. */
const wide = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
/** Every visible text node under 12 px inside a root, counted (printed, never asserted here). */
const small = (page, sel) => page.evaluate(s => {
  const root = document.querySelector(s) ?? document.body;
  let n = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const el = w.currentNode.parentElement; if (!w.currentNode.textContent.trim() || !el || el.offsetParent === null) continue; if (parseFloat(getComputedStyle(el).fontSize) < 12) n += 1; }
  return n;
}, sel);

async function journey(c) {
  const id = c.id;
  const s = await open(c);
  const { page, press } = s;
  let step = 'the picker';
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await press(page.getByRole('button', { name: /2026-27/ }).first());
    await press(page.getByRole('button', { name: /^England/ }).first());
    await press(page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: page.getByText('Premier League', { exact: true }) }).first());
    await press(page.getByRole('button').filter({ has: page.getByText('Liverpool', { exact: true }) }).first());
    await press(page.getByRole('button', { name: 'Take the job', exact: true }));
    await press(page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    step = 'the hub';
    await page.locator('[data-cm-next-match]').waitFor({ timeout: 45000 });
    await page.evaluate(() => { window.scrollTo(0, 0); return document.fonts.ready; });
    await page.waitForTimeout(600);
    const card = await readCard(page);
    say(id, `hub card "${card?.text}" sides ${card?.sides.join(' ')} green on mine ${card?.greenIsMine}; around: ${card?.around}`);
    if (!card || card.sides[0] !== 'opp' || card.names[0] !== 'Newcastle') flag(id, `the hub card for the opener away at Newcastle reads "${card?.text}"`);
    if (card && !card.greenIsMine) flag(id, 'the hub card does not pick my club out in green');
    if (await wide(page) > 1) flag(id, `the hub is ${await wide(page)} px wider than the screen`);
    await shot(page, id, '1-hub');

    step = 'the Match Centre';
    await press(btn(page, /Match Centre: form/));
    await page.locator('[data-cm-mc-side]').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    const mc = await page.evaluate(() => [...document.querySelectorAll('[data-cm-mc-side]')].map(n => `${n.getAttribute('data-cm-mc-side')}:${n.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}`));
    say(id, `Match Centre sides ${mc.join(' | ')}`);
    if (!mc[0]?.startsWith('opp:Newcastle')) flag(id, `the Match Centre's tie does not start with Newcastle: ${mc[0]}`);
    await shot(page, id, '2-centre', true);

    step = 'kick off';
    await press(page.locator('button:visible[data-cm-way="live"]').first());
    await page.waitForFunction(() => [...document.querySelectorAll('[data-cm-live-stage]')].some(e => e.getAttribute('data-cm-live-stage') === 'first'), null, { timeout: 45000 });
    await page.waitForTimeout(2500);
    const strip = await page.evaluate(() => {
      const st = document.querySelector('.cm-strip-score');
      return st ? st.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    const labels = await readLabels(page);
    say(id, `live strip "${strip}"; ${labels.length} labels, ${labels.filter(l => l.cut).length} cut: ${labels.map(l => l.t).join(', ').slice(0, 300)}`);
    if (!strip || !/^Newcastle\b/.test(strip)) flag(id, `the live strip reads "${strip}"`);
    const bad = labels.filter(l => l.digit || !l.t);
    if (bad.length) flag(id, `${bad.length} pitch labels are empty or begin with a digit: ${bad.slice(0, 5).map(l => l.t).join(', ')}`);
    if (await wide(page) > 1) flag(id, `the live screen is ${await wide(page)} px wider than the screen`);
    await shot(page, id, '3-live');
    await page.waitForTimeout(3000);
    const labels2 = await readLabels(page);
    say(id, `a few seconds on: ${labels2.length} labels: ${labels2.map(l => l.t).join(', ').slice(0, 300)}`);
    if (labels2.some(l => l.digit)) flag(id, `a pitch label begins with a digit later: ${labels2.filter(l => l.digit).map(l => l.t).join(', ')}`);
    await shot(page, id, '3b-live-later');
    step = 'the interval';
    await press(btn(page, /^\s*Skip\s*$/));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-cm-live-stage]')].some(e => e.getAttribute('data-cm-live-stage') === 'interval'), null, { timeout: 45000 });
    await page.waitForTimeout(900);
    const iv = await page.evaluate(() => {
      const stage = document.querySelector('[data-cm-live-stage="interval"]');
      const score = stage?.querySelector('[data-cm-live-score]');
      const big = stage ? [...stage.querySelectorAll('span')].find(x => x.className.includes('text-3xl')) : null;
      const row = big ? [...big.parentElement.children].map(x => ({ t: x.textContent.trim(), green: x.className.includes('text-primary') })) : [];
      return { score: score ? score.textContent.replace(/\s+/g, ' ').trim() : null, under: score?.nextElementSibling?.textContent.trim() ?? null, row };
    });
    say(id, `interval card "${iv.score}" / "${iv.under}"; dressing room ${iv.row.map(r => `${r.t}${r.green ? '(green)' : ''}`).join(' | ')}`);
    if (!/^Newcastle vs Liverpool$/.test(iv.under ?? '')) flag(id, `the interval card's names read "${iv.under}"`);
    if (iv.row.length !== 3 || iv.row[0].t !== 'Newcastle' || iv.row[2].t !== 'Liverpool' || !iv.row[2].green || iv.row[0].green) flag(id, `the dressing room's card reads ${JSON.stringify(iv.row)}`);
    await shot(page, id, '4-interval', true);

    step = 'the second half';
    await press(btn(page, /Second half/));
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (await page.locator('[data-cm-timeline]').count()) break;
      const rep = btn(page, /^\s*Full report\s*$/);
      if (await rep.count()) { await press(rep); await page.waitForTimeout(800); continue; }
      const sk = btn(page, /^\s*Skip\s*$/);
      if (await sk.count()) { await press(sk).catch(() => {}); await page.waitForTimeout(800); continue; }
      await page.waitForTimeout(700);
    }
    if (!(await page.locator('[data-cm-timeline]').count())) throw new Error('the report never came');
    step = 'the report';
    await page.waitForTimeout(4500);
    const rep = await page.evaluate(() => {
      const box = [...document.querySelectorAll('div')].find(d => d.className.includes('font-display') && d.className.includes('text-2xl') && /^\d+ - \d+$/.test(d.textContent.trim()));
      const order = n => [...document.querySelectorAll(`[${n}]`)].map(x => x.getAttribute(n));
      const names = [...document.querySelectorAll('[data-cm-tl-name]')].map(n => n.textContent.trim());
      const cutNames = [...document.querySelectorAll('[data-cm-tl-name]')].filter(n => { const b = n.closest('[data-cm-tl-entry]') ?? n; return b.scrollWidth > b.clientWidth + 1 || /\.\.\.|…/.test(n.textContent); }).map(n => n.textContent.trim());
      const board = [...document.querySelectorAll('div,span,p')].find(x => /^Board$/i.test(x.textContent.trim()));
      return {
        scoreline: box ? [box.previousElementSibling?.textContent.trim(), box.textContent.trim(), box.nextElementSibling?.textContent.trim()] : [],
        scorers: order('data-cm-scorer-col'), legend: order('data-cm-legend'), shots: order('data-cm-shots'), poss: order('data-cm-poss'),
        firstBars: [...document.querySelectorAll('[data-cm-stat]')].map(b => b.querySelector('[data-cm-stat-n]')?.getAttribute('data-cm-stat-n')),
        barGreenFirst: [...document.querySelectorAll('[data-cm-stat]')].map(b => b.querySelector('.h-1\\.5 > div')?.className.includes('bg-primary')),
        tlRows: [...document.querySelectorAll('li[data-cm-tl-side]')].map(li => `${li.getAttribute('data-cm-tl-side')}:${li.children[0]?.querySelector('[data-cm-tl-entry]') ? 'L' : 'R'}`),
        names, cutNames, boardText: board?.parentElement?.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) ?? null,
      };
    });
    say(id, `report ${rep.scoreline.join(' ')}; scorers ${rep.scorers.join(' ')}; legend ${rep.legend.join(' ')}; shots ${rep.shots.join(' ')}; poss ${rep.poss.join(' ')}; bars first ${[...new Set(rep.firstBars)].join(' ')}; bar green first ${[...new Set(rep.barGreenFirst)].join(' ')}; rows ${rep.tlRows.join(' ')}; board "${rep.boardText}"`);
    say(id, `timeline names: ${rep.names.join('; ')}`);
    if (rep.scoreline[0] !== 'Newcastle' || rep.scoreline[2] !== 'Liverpool') flag(id, `the scoreline reads ${rep.scoreline.join(' ')}`);
    if (rep.scorers.length && rep.scorers[0] !== 'theirs') flag(id, `the scorer columns read ${rep.scorers.join(' ')}`);
    if (rep.firstBars.some(x => x !== 'theirs')) flag(id, `a stat bar does not start with Newcastle's number: ${rep.firstBars.join(' ')}`);
    if (rep.barGreenFirst.some(x => x !== false)) flag(id, `a stat bar's green (my) segment is on the home side: ${rep.barGreenFirst.join(' ')}`);
    if (rep.tlRows.some(r => (r.startsWith('opp') ? !r.endsWith('L') : !r.endsWith('R')))) flag(id, `timeline rows in the wrong column: ${rep.tlRows.join(' ')}`);
    if (rep.cutNames.length) flag(id, `timeline names cut: ${rep.cutNames.join('; ')}`);
    if (c.rm) {
      const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => `${a.effect?.target?.tagName}.${String(a.effect?.target?.className).split(' ').slice(0, 2).join('.')} ${a.animationName ?? a.transitionProperty ?? ''}`));
      say(id, `reduced motion: ${running.length} animations running on the page after the verdict: ${running.slice(0, 4).join('; ')}`);
    }
    say(id, `text nodes under 12 px on the report: ${await small(page, '[data-cm-timeline]')} in the timeline, ${await small(page, 'main')} on the page`);
    if (await wide(page) > 1) flag(id, `the report is ${await wide(page)} px wider than the screen`);
    await shot(page, id, '5-report', true);
    const toggle = page.locator('[data-cm-tl-toggle]');
    if (await toggle.count()) {
      const h = await toggle.evaluate(t => t.getBoundingClientRect().height);
      if (h < 44) flag(id, `the timeline toggle is ${h} px tall`);
      const y0 = await page.evaluate(() => scrollY);
      await toggle.evaluate(t => t.click());
      await page.waitForTimeout(900);
      const y1 = await page.evaluate(() => scrollY);
      if (y0 !== y1) flag(id, `the timeline toggle moved the page ${y0} to ${y1}`);
      await page.locator('[data-cm-timeline]').screenshot({ path: path.join(OUT, `${id}-6-timeline.png`) }).catch(() => {});
    }
    step = 'back to the hub';
    await press(btn(page, /^\s*Continue\s*$/));
    for (let i = 0; i < 8 && !(await page.locator('[data-cm-next-match]').count()); i++) {
      const more = btn(page, /^\s*(Continue|Back to the hub|Done|Close|Got it|OK)\s*$/);
      if (await more.count()) await press(more).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.locator('[data-cm-next-match]').waitFor({ timeout: 30000 });
    await page.evaluate(() => { window.scrollTo(0, 0); return document.fonts.ready; });
    await page.waitForTimeout(600);
    const card2 = await readCard(page);
    say(id, `second hub card "${card2?.text}" sides ${card2?.sides.join(' ')} green on mine ${card2?.greenIsMine}`);
    if (!card2 || card2.sides[0] !== 'me' || card2.names[1] !== 'Nottingham Forest') flag(id, `the hub card for the home match with Forest reads "${card2?.text}"`);
    const tile = await page.evaluate(() => {
      for (const b of document.querySelectorAll('.grid > button')) {
        const divs = [...b.querySelectorAll(':scope > div')];
        const i = divs.findIndex(d => d.classList.contains('uppercase') && d.textContent.trim() === 'Stats');
        if (i < 0 || !divs[i + 2]) continue;
        const sub = divs[i + 2];
        const lh = parseFloat(getComputedStyle(sub).lineHeight) || 16;
        return { text: sub.textContent.trim(), lines: Math.round(sub.getBoundingClientRect().height / lh), all: b.textContent.replace(/\s+/g, ' ').trim() };
      }
      return null;
    });
    say(id, `Stats tile ${tile ? `"${tile.all}" (line "${tile.text}" on ${tile.lines} lines)` : 'not found'}`);
    if (tile && /\d/.test(tile.text.split(' leads')[0] ?? '')) flag(id, `the Stats tile's name holds a digit: ${tile.text}`);
    if (tile && tile.lines > 2) flag(id, `the Stats tile wraps to ${tile.lines} lines: ${tile.text}`);
    await shot(page, id, '7-hub-after', true);
  } catch (e) {
    flag(id, `the walk stopped at ${step}: ${String(e.message).split('\n')[0]}`);
    await shot(page, id, 'stuck', true);
  } finally {
    if (s.errors.length) flag(id, `page errors: ${s.errors.slice(0, 2).join(' | ')}`);
    await s.context.close();
  }
}

for (const c of CONFIGS) {
  console.log(`== ${c.id} (${c.w} by ${c.h}${c.rm ? ', reduced motion' : ''})`);
  await journey(c);
}
await browser.close();
console.log(`rvrun-walk: ${findings.length} findings over ${CONFIGS.length} journeys`);
for (const f of findings) console.log(`  - ${f}`);
process.exit(findings.length ? 1 : 0);
