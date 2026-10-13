/* QA hunt: Manager Hot Seat and Deadline Day, played start to finish, at 390x844 and 1280x900.
   node .rc/x/walkShort.mjs hotseat|deadline */
import { chromium, BASE, SIZES, makeLog, shot, newPage, firstVisit, buttons, clickRule, mainText, audit } from './gmlib.mjs';

const game = process.argv[2];
const only = process.env.QA_SIZE;
const browser = await chromium.launch();

async function pickFree(page, log, size) {
  const r = await clickRule(page, [['pickclub', /^Pick a club$/i]], log);
  if (!r) return null;
  await page.waitForTimeout(800);
  await shot(page, `${game}-${size.tag}-02-clubpicker`);
  await audit(page, 'club picker', log, { deep: true, always: true });
  const list = await buttons(page);
  const clubs = list.filter(b => !b.dis && !/^(Back|Menu|Random|Pick a club)$/i.test(b.t) && b.t.length > 2);
  log('clubs', { n: clubs.length, sample: clubs.slice(0, 12).map(b => b.t.slice(0, 40)) });
  const pick = clubs[Math.min(7, clubs.length - 1)];
  if (!pick) return null;
  await page.locator(`[data-qa="${pick.i}"]`).click();
  return pick.t;
}

async function hotseat(page, size, log) {
  const G = `hotseat-${size.tag}`;
  await shot(page, `${G}-01-menu`);
  await audit(page, 'menu', log, { deep: true, always: true });
  log('menu', { text: await mainText(page, 900) });
  let started;
  if (size.tag === 'p') started = await clickRule(page, [['daily', /^Take today's job$/i]], log);
  else started = { text: await pickFree(page, log, size) };
  log('start', { how: started && started.text });
  for (let i = 0; i < 30; i += 1) { await page.waitForTimeout(1000); if ((await buttons(page)).some(b => /^Take the job$/i.test(b.t))) break; }
  await shot(page, `${G}-03-brief`);
  await audit(page, 'brief', log, { deep: true, always: true });
  log('brief', { text: await mainText(page, 1500) });
  await clickRule(page, [['take', /^Take the job$/i]], log);
  await page.waitForTimeout(1000);
  const shapes = [/^Defensive/i, /^Balanced/i, /^Attacking/i];
  let matches = 0;
  for (let step = 0; step < 40; step += 1) {
    if (await page.locator('[role="dialog"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    const pressed = await clickRule(page, [['press', /.+/, '[data-testid="hot-seat-press"]']], log);
    if (pressed) { log('press', { answered: pressed.text.slice(0, 90) }); await page.waitForTimeout(500); continue; }
    const list = await buttons(page);
    if (list.some(b => /^Kick off$/i.test(b.t))) {
      if (matches === 0) { await shot(page, `${G}-04-match1`); await audit(page, 'match screen', log, { deep: true, always: true }); log('matchscreen', { text: await mainText(page, 1200), buttons: list.map(b => b.t.slice(0, 30)) }); }
      await clickRule(page, [['shape', shapes[matches % 3]]], log);
      const talks = list.filter(b => !b.dis && /./.test(b.t)).map(b => b.t);
      log('options', { talks: talks.slice(0, 16).map(t => t.slice(0, 30)) });
      await clickRule(page, [['kick', /^Kick off$/i]], log);
      matches += 1;
      await page.waitForTimeout(1500);
      await shot(page, `${G}-05-result${matches}`);
      await audit(page, `result ${matches}`, log, { deep: matches === 1 });
      log('result', { n: matches, text: await mainText(page, 900) });
      if (matches === 2) {
        const before = await mainText(page, 400);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        await firstVisit(page, game, size, log);
        const mid = await mainText(page, 400);
        await shot(page, `${G}-06-reload-midrun`);
        const resumed = await clickRule(page, [['resume', /^(Back to the dugout|Resume|Carry on)/i]], log);
        await page.waitForTimeout(1500);
        log('reloadMid', { before, mid, resumed: resumed && resumed.text, after: await mainText(page, 400) });
        await shot(page, `${G}-06b-resumed`);
      }
      continue;
    }
    const next = await clickRule(page, [['next', /^Next match$/i]], log);
    if (next) { await page.waitForTimeout(700); continue; }
    break;
  }
  await page.waitForTimeout(2500);
  await shot(page, `${G}-07-done`);
  await shot(page, `${G}-07-done-full`, { full: true });
  await audit(page, 'done', log, { deep: true, always: true });
  log('done-screen', { matches, text: await mainText(page, 1800), buttons: (await buttons(page)).map(b => b.t.slice(0, 40)) });
  const carry = await clickRule(page, [['carry', /^Carry on in Club Manager$/i]], log);
  if (carry) {
    for (let i = 0; i < 20; i += 1) { await page.waitForTimeout(1000); if (page.url().includes('/club-manager')) break; }
    await page.waitForTimeout(3000);
    if (await page.locator('[role="dialog"]').count()) { await shot(page, `${G}-08-cm-dialog`); await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    await shot(page, `${G}-08-clubmanager`);
    await audit(page, 'club manager after carry on', log, { deep: true, always: true });
    log('carry', { url: page.url(), text: await mainText(page, 1500) });
  }
}

async function deadline(page, size, log) {
  const G = `deadline-${size.tag}`;
  await shot(page, `${G}-01-menu`);
  await audit(page, 'menu', log, { deep: true, always: true });
  log('menu', { text: await mainText(page, 900) });
  let started;
  if (size.tag === 'p') started = await clickRule(page, [['daily', /^Open today's window$/i]], log);
  else started = { text: await pickFree(page, log, size) };
  log('start', { how: started && started.text });
  for (let i = 0; i < 30; i += 1) { await page.waitForTimeout(1000); if (await page.locator('[data-testid="deadline-target"]').count()) break; }
  await page.waitForTimeout(800);
  await shot(page, `${G}-03-desk`);
  await audit(page, 'desk', log, { deep: true, always: true });
  log('desk', { text: await mainText(page, 1800) });
  const nT = await page.locator('[data-testid="deadline-target"]').count();
  log('targets', { n: nT });
  for (let k = 0; k < Math.min(3, nT); k += 1) {
    const tgt = page.locator('[data-testid="deadline-target"]').nth(k);
    await tgt.click().catch(e => log('clickfail', { k, err: String(e).slice(0, 100) }));
    await page.waitForTimeout(700);
    if (k === 0) { await shot(page, `${G}-04-deal`); await audit(page, 'deal', log, { deep: true, always: true }); }
    log('deal', { k, text: await mainText(page, 900) });
    for (let s = 0; s < 14; s += 1) {
      const r = await clickRule(page, [['call', /^Call .+\(free\)$/i], ['terms', /^Offer terms/i], ['bid', /^Bid .+\d.*\(1 hour\)$/i]], log);
      if (r) {
        await page.waitForTimeout(900);
        log('dealstep', { k, did: r.text.slice(0, 50), text: (await mainText(page, 500)) });
        if (s === 1 && k === 0) await shot(page, `${G}-05-talks`);
        continue;
      }
      const chip = await clickRule(page, [['meet', /^(Meet the ask|Beat them)/i], ['haggle', /^Haggle/i]], log);
      if (chip) { await page.waitForTimeout(300); continue; }
      break;
    }
    await shot(page, `${G}-06-deal${k}-end`);
    await clickRule(page, [['back', /^Back to the desk$/i]], log);
    await page.waitForTimeout(600);
  }
  /* sell one */
  const sales = page.locator('#dukb-main button').filter({ hasText: /sell|sales|offload/i }).first();
  if (await sales.count()) {
    await sales.click().catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, `${G}-07-sales`);
    await audit(page, 'sales', log, { deep: true });
    const s = await clickRule(page, [['sell', /^Sell \(1 hour\)$/i]], log);
    await page.waitForTimeout(800);
    log('sell', { did: !!s, text: await mainText(page, 700) });
    await clickRule(page, [['back', /^Back to the desk$/i]], log);
    await page.waitForTimeout(500);
  }
  const before = await mainText(page, 400);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await firstVisit(page, game, size, log);
  await shot(page, `${G}-08-reload`);
  const resumed = await clickRule(page, [['resume', /^Back on the phones|^Resume/i]], log);
  await page.waitForTimeout(1500);
  log('reloadMid', { before, resumed: resumed && resumed.text, after: await mainText(page, 400) });
  await clickRule(page, [['done', /^I am done, shut the window$/i]], log);
  await page.waitForTimeout(500);
  await shot(page, `${G}-09-confirm`);
  await clickRule(page, [['shut', /^Shut it$/i]], log);
  await page.waitForTimeout(3000);
  await shot(page, `${G}-10-result`);
  await shot(page, `${G}-10-result-full`, { full: true });
  await audit(page, 'result', log, { deep: true, always: true });
  log('result', { text: await mainText(page, 2000) });
}

for (const size of SIZES) {
  if (only && only !== size.tag) continue;
  const log = makeLog(`${game}-${size.tag}`);
  const { ctx, page } = await newPage(browser, size, log);
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/${game === 'hotseat' ? 'manager-hot-seat' : 'deadline-day'}`, { waitUntil: 'domcontentloaded' });
    await firstVisit(page, game, size, log);
    if (game === 'hotseat') await hotseat(page, size, log); else await deadline(page, size, log);
  } catch (e) {
    log('EXCEPTION', { msg: String(e).slice(0, 400) });
    await shot(page, `${game}-${size.tag}-EXC`, { force: true });
  }
  log('done', { secs: Math.round((Date.now() - t0) / 1000) });
  await ctx.close();
}
await browser.close();
console.log('WALK FINISHED', game);
