/* QA hunt, targeted checks for the GM games. node .rc/x/walkT.mjs nfl|cfb|cm|back */
import { chromium, BASE, makeLog, shot, newPage, firstVisit, buttons, clickRule, mainText, audit } from './gmlib.mjs';

const which = process.argv[2];
const size = { tag: 't', width: 390, height: 844 };
const G = `t-${which}`;
const log = makeLog(G);
const browser = await chromium.launch();
const { ctx, page } = await newPage(browser, size, log);

const tileClick = async src => page.evaluate(s => {
  const re = new RegExp(s, 'i');
  const t = [...document.querySelectorAll('#dukb-main button')].find(b => b.querySelector('div.uppercase') && re.test(b.innerText.replace(/\s+/g, ' ').trim().replace(/^[^A-Za-z#]+/, '')));
  if (t) { t.click(); return true; }
  return false;
}, src);

/* Where the page is, and where the top of the game's own header sits, after a screen change. */
async function where(label, chipRe) {
  const r = await page.evaluate(src => {
    const re = new RegExp(src);
    const h1 = document.querySelector('#dukb-main h1');
    const chip = [...document.querySelectorAll('#dukb-main span, #dukb-main div, #dukb-main p')].find(e => e.children.length === 0 && re.test(e.textContent || ''));
    return {
      scrollY: Math.round(window.scrollY), innerHeight: window.innerHeight, docHeight: document.documentElement.scrollHeight,
      h1Top: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
      chip: chip ? (chip.textContent || '').trim().slice(0, 40) : null,
      chipTop: chip ? Math.round(chip.getBoundingClientRect().top) : null,
    };
  }, chipRe);
  log('where', { label, ...r, chipInView: r.chipTop !== null && r.chipTop >= 0 && r.chipTop < r.innerHeight });
  return r;
}

async function nfl() {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' });
  await firstVisit(page, 'nfl', size, log);
  await page.locator('#dukb-main .grid button').first().click();
  await page.waitForTimeout(1500);
  await clickRule(page, [['press', /.+/, '[data-gm-press]']], log);
  await tileClick('^this week');
  await page.waitForTimeout(600);
  /* a watch, on a phone */
  const w = await clickRule(page, [['watch', /^Watch Week \d+$/i]], log);
  if (w) {
    await page.waitForTimeout(2000); await shot(page, `${G}-watch-2s`, { force: true });
    await page.waitForTimeout(3000); await shot(page, `${G}-watch-5s`, { force: true });
    for (let i = 0; i < 40; i += 1) { const l = await buttons(page); if (l.some(b => /^Play Week/i.test(b.t) && !b.dis)) break; await page.waitForTimeout(1000); }
    await shot(page, `${G}-watch-end`, { force: true });
    await audit(page, 'after watch', log, { deep: true, always: true });
  }
  for (let i = 0; i < 20; i += 1) {
    const r = await clickRule(page, [['play', /^Play Week \d+$/i], ['final', /^Play the final week/i]], log);
    if (!r) break;
    await page.waitForTimeout(r.name === 'final' ? 3000 : 500);
  }
  await clickRule(page, [['draft', /Go to the draft/i]], log);
  await page.waitForTimeout(1200);
  for (let i = 0; i < 12; i += 1) {
    const l = await buttons(page);
    if (l.some(b => /^Continue to the hub$/i.test(b.t))) break;
    await clickRule(page, [['finish', /^(Run the league draft|Finish the draft)/i], ['prospect', /· age \d+/i]], log);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(2500);
  await where('draft done, before Continue', 'Week \\d+/17');
  await clickRule(page, [['continue', /^Continue to the hub$/i]], log);
  await page.waitForTimeout(1500);
  await where('season 2 hub, after Continue', 'Week 1/17');
  await shot(page, `${G}-after-continue`, { force: true });
  /* the cut down, the way a player does it */
  for (let k = 0; k < 3; k += 1) {
    const over = /over the limit/i.test(await mainText(page, 3000));
    if (!over) break;
    await clickRule(page, [['hub', /^Hub$/i]], log); await page.waitForTimeout(400);
    await tileClick('^roster'); await page.waitForTimeout(600);
    if (k === 0) await shot(page, `${G}-roster-groups`, { force: true });
    await clickRule(page, [['group', /^DB · \d+/i], ['group2', /^LB · \d+/i]], log); await page.waitForTimeout(500);
    const c = await clickRule(page, [['cut', /^Cut, \$/i]], log, { pickLast: true }); await page.waitForTimeout(400);
    if (k === 0) await shot(page, `${G}-cut-confirm`, { force: true });
    const ok = await clickRule(page, [['cuthim', /^Cut him$/i]], log); await page.waitForTimeout(600);
    log('cut', { k, armed: c && c.text, done: !!ok, text: (await mainText(page, 500)).slice(-300) });
  }
  await clickRule(page, [['hub', /^Hub$/i]], log); await page.waitForTimeout(400);
  await tileClick('^this week'); await page.waitForTimeout(600);
  const p = await clickRule(page, [['play', /^Play Week \d+$/i]], log);
  await page.waitForTimeout(800);
  log('season2', { played: p && p.text, text: await mainText(page, 400) });
  await shot(page, `${G}-s2-week1`, { force: true });
}

async function cfb() {
  await page.goto(`${BASE}/cfb-dynasty`, { waitUntil: 'domcontentloaded' });
  await firstVisit(page, 'cfb', size, log);
  await page.locator('#dukb-main .grid button').first().click();
  await page.waitForTimeout(1500);
  await clickRule(page, [['playtab', /^Play$/i]], log);
  for (let i = 0; i < 14; i += 1) {
    const r = await clickRule(page, [['play', /^Play Week \d+$/i], ['final', /^Final week \+/i]], log);
    if (!r) break;
    await page.waitForTimeout(r.name === 'final' ? 3500 : 500);
  }
  await where('recap', 'natty');
  await clickRule(page, [['trail', /Hit the recruiting trail/i]], log);
  await page.waitForTimeout(1200);
  await where('recruiting, after the trail button', 'class');
  const signed = [];
  for (let i = 0; i < 2; i += 1) {
    const r = await clickRule(page, [['sign', /scouted .* Sign$/i]], log, { pickLast: true });
    if (r) signed.push(r.text.replace(/^[^A-Za-z]+/, '').split(' ').slice(0, 2).join(' '));
    await page.waitForTimeout(500);
  }
  log('signed', { signed });
  await page.locator('button:has-text("Close the class")').scrollIntoViewIfNeeded().catch(() => {});
  await where('before Close the class', 'Close the class');
  await clickRule(page, [['close', /Close the class/i]], log);
  await page.waitForTimeout(1500);
  await where('season 2 hub, after Close the class', '· Week 1/12');
  await shot(page, `${G}-after-close`, { force: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await clickRule(page, [['roster', /^Roster$/i]], log);
  await page.waitForTimeout(500);
  /* find each signed man's row and show it */
  for (const name of signed) {
    const row = page.locator('#dukb-main div, #dukb-main li').filter({ hasText: name }).last();
    const txt = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
    log('recruitRow', { name, txt: txt.slice(0, 120) });
  }
  const all = await page.evaluate(names => {
    const t = (document.querySelector('#dukb-main') || document.body).innerText.replace(/\s+/g, ' ');
    return names.map(n => { const i = t.indexOf(n); return i < 0 ? `${n}: not on the two-deep` : t.slice(i, i + 50); });
  }, signed);
  log('recruitYears', { all });
  if (signed[0]) {
    await page.getByText(signed[0]).first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, `${G}-recruit-year`, { force: true });
  }
}

async function cm() {
  const sizes = () => page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); o[k] = (localStorage.getItem(k) || '').length; }
    return o;
  });
  await page.goto(`${BASE}/manager-hot-seat`, { waitUntil: 'domcontentloaded' });
  await firstVisit(page, 'hotseat', size, log);
  const runOnce = async how => {
    await clickRule(page, [how], log);
    for (let i = 0; i < 30; i += 1) { await page.waitForTimeout(1000); if ((await buttons(page)).some(b => /^Take the job$/i.test(b.t))) break; }
    await clickRule(page, [['take', /^Take the job$/i]], log);
    await page.waitForTimeout(800);
    for (let s = 0; s < 40; s += 1) {
      const q = await clickRule(page, [['press', /.+/, '[data-testid="hot-seat-press"]']], log);
      if (q) { await page.waitForTimeout(400); continue; }
      const k = await clickRule(page, [['kick', /^Kick off$/i], ['next', /^Next match$/i]], log);
      if (!k) break;
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(2000);
    const t = await mainText(page, 500);
    log('runDone', { how: how[0], text: t });
    return t;
  };
  await runOnce(['daily', /^Take today's job$/i]);
  log('storage', { when: 'after hot seat run', keys: await sizes() });
  const c = await clickRule(page, [['carry', /^Carry on in Club Manager$/i]], log);
  if (!c) { log('note', { msg: 'no carry on offer (sacked?)' }); await shot(page, `${G}-nocarry`, { force: true }); return; }
  for (let i = 0; i < 20; i += 1) { await page.waitForTimeout(1000); if (page.url().includes('/club-manager')) break; }
  await page.waitForTimeout(3000);
  log('storage', { when: 'after carry on', keys: await sizes() });
  const r = await clickRule(page, [['resume', /Resume Career/i]], log);
  await page.waitForTimeout(4000);
  if (await page.locator('[role="dialog"]').count()) { await shot(page, `${G}-cm-dialog`, { force: true }); await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  await shot(page, `${G}-cm-resumed`, { force: true });
  log('cmResumed', { resumed: r && r.text, url: page.url(), text: await mainText(page, 900) });
  log('storage', { when: 'after resume', keys: await sizes() });
  /* a second run, now that a Club Manager career exists: the game must ask before replacing it */
  await page.goto(`${BASE}/manager-hot-seat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await runOnce(['random', /^Random$/i]);
  const c2 = await clickRule(page, [['carry', /^Carry on in Club Manager$/i]], log);
  await page.waitForTimeout(1500);
  await shot(page, `${G}-second-carry`, { force: true });
  log('secondCarry', { offered: !!c2, url: page.url(), text: await mainText(page, 900), buttons: (await buttons(page)).map(b => b.t.slice(0, 40)) });
}

async function back() {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' });
  await firstVisit(page, 'nfl', size, log);
  await page.locator('#dukb-main .grid button').first().click();
  await page.waitForTimeout(1500);
  await clickRule(page, [['press', /.+/, '[data-gm-press]']], log);
  await tileClick('^this week'); await page.waitForTimeout(500);
  for (let i = 0; i < 2; i += 1) { await clickRule(page, [['play', /^Play Week \d+$/i]], log); await page.waitForTimeout(600); }
  const before = await mainText(page, 260);
  await page.goBack(); await page.waitForTimeout(2000);
  log('back', { url: page.url(), text: (await mainText(page, 200)) });
  await shot(page, `${G}-after-back`, { force: true });
  await page.goForward(); await page.waitForTimeout(2500);
  const after = await mainText(page, 260);
  log('forward', { url: page.url(), same: before === after, before, after });
  await shot(page, `${G}-after-forward`, { force: true });
  /* two tabs on one save: play a week in each and see which one wins */
  const p2 = await ctx.newPage();
  await p2.route(/supabase\.co/, r => r.abort());
  await p2.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2500);
  const t2 = (await p2.locator('#dukb-main').innerText()).replace(/\s+/g, ' ').slice(0, 260);
  await tileClick('^this week'); await page.waitForTimeout(400);
  await clickRule(page, [['play', /^Play Week \d+$/i]], log); await page.waitForTimeout(600);
  const t1 = await mainText(page, 260);
  await p2.evaluate(() => {
    const re = /^this week/i;
    const t = [...document.querySelectorAll('#dukb-main button')].find(b => b.querySelector('div.uppercase') && re.test(b.innerText.replace(/\s+/g, ' ').trim().replace(/^[^A-Za-z#]+/, '')));
    if (t) t.click();
  });
  await p2.waitForTimeout(500);
  const b2 = p2.locator('button').filter({ hasText: /^\s*Play Week \d+\s*$/ }).first();
  const label2 = (await b2.innerText().catch(() => '')).trim();
  await b2.click().catch(() => {});
  await p2.waitForTimeout(800);
  const t2b = (await p2.locator('#dukb-main').innerText()).replace(/\s+/g, ' ').slice(0, 260);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  log('twoTabs', { tab2Opened: t2, tab1AfterPlay: t1, tab2Pressed: label2, tab2After: t2b, tab1Reloaded: await mainText(page, 260) });
}

try {
  if (which === 'nfl') await nfl();
  else if (which === 'cfb') await cfb();
  else if (which === 'cm') await cm();
  else if (which === 'back') await back();
} catch (e) {
  log('EXCEPTION', { msg: String(e).slice(0, 400) });
  await shot(page, `${G}-EXC`, { force: true });
}
await ctx.close();
await browser.close();
console.log('WALK FINISHED', which);
