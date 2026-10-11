// Reviewer sc-screens, Release AW part one: plays Soccer Career's new screens on the served build at three sizes.
// Runs on a GitHub runner as .rc/x/walk.mjs. Reads BASE, RC_OUT, FIXTURES. Blocks supabase.co. Writes shots and
// walk-report.json into RC_OUT. It never asserts to exit: every miss is recorded and the walk carries on.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/review-out');
fs.mkdirSync(OUT, { recursive: true });
const FIX = JSON.parse(fs.readFileSync(process.env.FIXTURES || path.join(OUT, 'fixtures.json'), 'utf8')).fixtures;
const KEY = 'soccerCareerSave';
const pickW = process.env.ONLY_W ? process.env.ONLY_W.split(',') : null;
const pickS = process.env.ONLY_S ? process.env.ONLY_S.split(',') : null;
const VIEWS = [[320, 568], [390, 844], [1280, 900]].filter(v => !pickW || pickW.includes(String(v[0])));
const report = { base: BASE, cases: [] };
const flush = () => fs.writeFileSync(path.join(OUT, (process.env.REPORT || 'walk-report') + '.json'), JSON.stringify(report, null, 1));
const browser = await pw.chromium.launch({ headless: true });

const AUDIT = sel => {
  const root = document.querySelector(sel); if (!root) return null;
  const vw = innerWidth, vh = innerHeight, rr = root.getBoundingClientRect();
  const small = [], tiny = [], off = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) continue;
    const size = parseFloat(cs.fontSize);
    if (size < 12) small.push({ t: t.slice(0, 48), size });
    if (r.right > vw + 1 || r.left < -1) off.push({ t: t.slice(0, 48), l: Math.round(r.left), r: Math.round(r.right) });
  }
  for (const b of root.querySelectorAll('button, a[href], [role="button"], select, input')) {
    const r = b.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.width < 43.5 || r.height < 43.5) tiny.push({ t: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 44), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const scrollers = [...root.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => ({ cls: String(e.className).slice(0, 50), sh: e.scrollHeight, ch: e.clientHeight }));
  return { rect: { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) }, vw, vh,
    inside: rr.left >= -1 && rr.right <= vw + 1 && rr.top >= -1 && rr.bottom <= vh + 1, small, tiny, off, scrollers,
    docOverflowX: document.documentElement.scrollWidth > vw + 1 };
};

async function start(w, h, fixtureId, scen, opts = {}) {
  const f = FIX.find(x => x.id === fixtureId);
  const row = { id: `${scen}-${w}${opts.reduced ? '-rm' : ''}`, scen, w, h, fixture: fixtureId, facts: f?.facts ?? null, steps: [], fails: [], errors: [], console: [], shots: [], m: {} };
  report.cases.push(row);
  if (!f) { row.fails.push('fixture missing: ' + fixtureId); flush(); return null; }
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem('rev-seeded')) { localStorage.setItem(key, value); localStorage.setItem('cookie-consent', 'essential'); sessionStorage.setItem('rev-seeded', '1'); }
  }, { key: KEY, value: JSON.stringify(f.state) });
  context.setDefaultTimeout(12000);
  const page = await context.newPage();
  page.on('pageerror', e => row.errors.push(String(e).slice(0, 400)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED|ERR_CONNECTION|Failed to load resource/.test(m.text())) row.console.push(m.text().slice(0, 240)); });
  const T = { page, row, f, context };
  T.save = async () => JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY));
  T.raw = () => page.evaluate(k => localStorage.getItem(k), KEY);
  T.y = () => page.evaluate(() => Math.round(scrollY));
  T.shot = async (name, full = false) => {
    const file = `${row.id}-${name}.png`;
    try { await page.screenshot({ path: path.join(OUT, file), fullPage: full }); row.shots.push(file); } catch (e) { row.fails.push('shot ' + name + ': ' + String(e).slice(0, 120)); }
  };
  T.expect = (cond, label, detail) => { if (!cond) row.fails.push('EXPECT ' + label + (detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 400) : '')); return !!cond; };
  T.step = async (name, fn) => {
    try { const v = await fn(); row.steps.push({ name, ok: true, v: v ?? null }); return v; }
    catch (e) { row.steps.push({ name, ok: false, err: String(e).slice(0, 300) }); row.fails.push('STEP ' + name + ': ' + String(e).slice(0, 220)); await T.shot('FAIL-' + name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)); return undefined; }
    finally { flush(); }
  };
  T.audit = sel => page.evaluate(AUDIT, sel);
  T.top = async () => { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150); };
  T.centre = async sel => { await page.locator(sel).first().evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(150); };
  T.openDialog = async (openSel, dlgSel) => {
    await T.centre(openSel);
    const y0 = await T.y();
    await page.locator(openSel).first().click();
    await page.locator(dlgSel).waitFor({ state: 'visible', timeout: 6000 });
    await page.waitForTimeout(450);
    const y1 = await T.y();
    const focusIn = await page.evaluate(s => !!document.querySelector(s)?.contains(document.activeElement), dlgSel);
    return { y0, y1, focusIn };
  };
  T.closeDialog = async (how, openSel, dlgSel, backSel) => {
    const dlg = page.locator(dlgSel);
    if (how === 'escape') await page.keyboard.press('Escape');
    else if (how === 'x') await dlg.getByRole('button', { name: 'Close', exact: true }).click();
    else await dlg.locator(backSel).click();
    await dlg.waitFor({ state: 'hidden', timeout: 6000 });
    await page.waitForTimeout(300);
    return { how, y: await T.y(), focus: await page.evaluate(s => document.querySelector(s) === document.activeElement, openSel),
      body: await page.evaluate(() => ({ overflow: getComputedStyle(document.body).overflow, pe: getComputedStyle(document.body).pointerEvents })) };
  };
  T.dialogTrial = async (name, openSel, dlgSel, backSel) => {
    const out = { closes: [] };
    for (const how of ['escape', 'back', 'x']) {
      const o = await T.openDialog(openSel, dlgSel);
      if (how === 'escape') { await T.shot(name + '-help'); out.audit = await T.audit(dlgSel); }
      const c = await T.closeDialog(how, openSel, dlgSel, backSel);
      out.closes.push({ ...c, y0: o.y0, y1: o.y1, focusIn: o.focusIn });
      T.expect(o.y0 === o.y1, name + ': page does not move when it opens (' + how + ')', o);
      T.expect(c.y === o.y0, name + ': scroll is back after ' + how, { y0: o.y0, y: c.y });
      T.expect(c.focus, name + ': focus is back on the opener after ' + how);
      T.expect(o.focusIn, name + ': focus moved into the dialog (' + how + ')');
      T.expect(c.body.overflow !== 'hidden' && c.body.pe !== 'none', name + ': body unlocked after ' + how, c.body);
    }
    const a = out.audit;
    T.expect(a?.inside, name + ': dialog inside the viewport', a?.rect);
    T.expect(a && !a.small.length, name + ': dialog text under 12px', a?.small);
    T.expect(a && !a.tiny.length, name + ': dialog targets under 44px', a?.tiny);
    T.expect(a && !a.off.length, name + ': dialog text cut off at the side', a?.off);
    return out;
  };
  T.wheel = async tag => {
    const w = page.locator('[data-career-chance-wheel]');
    if (!(await w.count())) return null;
    await page.waitForTimeout(400);
    await T.shot(tag + '-wheel-ready');
    const audit = await T.audit('[data-career-chance-wheel]');
    await w.locator('[data-wheel-skip]').click();
    await page.waitForTimeout(300);
    const result = await w.locator('[data-wheel-result]').textContent();
    await T.shot(tag + '-wheel-result');
    await w.locator('[data-wheel-continue]').click();
    await w.waitFor({ state: 'hidden', timeout: 5000 });
    return { result, audit };
  };
  await page.goto(BASE + '/soccer-career', { waitUntil: 'load' });
  try { await page.waitForSelector('[data-career-action-bar]', { timeout: 45000 }); } catch (e) { row.fails.push('career screen did not open: ' + String(e).slice(0, 160)); await T.shot('FAIL-open'); }
  await page.waitForTimeout(1000);
  return T;
}

// The first draw after arming is the coin; every later draw comes from a seeded generator (a constant would hang a pick loop).
const ARM = first => {
  window.__revRandom = Math.random; let n = 20261011, used = false; window.__revDraws = 0;
  Math.random = () => { window.__revDraws++; if (!used) { used = true; return first; } n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
const UTIL = () => [...document.querySelectorAll('button')].filter(b => /training|phone/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent)).map(b => {
  const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
  return { label: b.getAttribute('aria-label'), text: b.textContent.trim().slice(0, 30), util: b.dataset.careerUtility || null, x: Math.round(r.x), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), pos: cs.position };
});
async function utilities(T, tag) {
  const list = (await T.page.evaluate(UTIL)).filter(b => b.w > 0 && b.h > 0);
  T.row.m['utilities-' + tag] = list;
  const marked = list.filter(b => b.util);
  T.expect(marked.filter(b => b.util === 'training').length <= 1 && marked.filter(b => b.util === 'phone').length === 1, tag + ': one phone and at most one training utility', marked);
  T.expect(list.filter(b => /training ground/i.test(b.label || '')).length <= 1, tag + ': no second training button', list);
  T.expect(list.filter(b => /open your phone/i.test(b.label || '')).length === 1, tag + ': no second phone button', list);
  T.expect(await T.page.locator('[data-career-utilities]').count() === 1, tag + ': one utilities wrapper');
  return list;
}

async function scenVet(w, h, fixtureId, scen) {
  const T = await start(w, h, fixtureId, scen); if (!T) return null;
  const { page, row } = T;
  await T.step('first paint', async () => { await T.top(); await T.shot('top'); await T.shot('full', true); await utilities(T, 'playing'); });
  await T.step('stack', async () => {
    row.m.stack = await page.evaluate(() => {
      const doc = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
      const bar = document.querySelector('[data-career-action-bar]'), br = bar.getBoundingClientRect();
      const next = [...bar.querySelectorAll('button')].find(b => /Next Season/.test(b.textContent)), nr = next?.getBoundingClientRect();
      const sels = ['[data-farewell-plan]', '[data-agent-review-status]', '[data-international-return-status]'];
      const cards = Object.fromEntries(sels.map(s => [s, doc(s)]));
      const total = document.documentElement.scrollHeight;
      const els = sels.map(s => document.querySelector(s)).filter(Boolean), prev = els.map(e => e.style.display);
      els.forEach(e => { e.style.display = 'none'; });
      const without = document.documentElement.scrollHeight; els.forEach((e, i) => { e.style.display = prev[i]; });
      const buttons = [...bar.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; });
      return { vh: innerHeight, total, without, screens: +(total / innerHeight).toFixed(2), cards, buttons,
        bar: { mode: bar.dataset.careerActionBar, pos: getComputedStyle(bar).position, top: Math.round(br.top), bottom: Math.round(br.bottom) },
        next: nr ? { top: Math.round(nr.top), bottom: Math.round(nr.bottom), inView: nr.top >= 0 && nr.bottom <= innerHeight + 1 } : null };
    });
    T.expect(row.m.stack.next?.inView, 'Next Season is on screen at the top of the page', row.m.stack.next);
    T.expect(row.m.stack.bar.pos === 'fixed', 'the season bar is pinned', row.m.stack.bar);
  });
  for (const [name, sel] of [['farewell-card', '[data-farewell-plan]'], ['agent-card', '[data-agent-review-status]']]) {
    await T.step('audit ' + name, async () => {
      const a = await T.audit(sel); row.m[name] = a;
      if (!T.expect(!!a, name + ' is on the playing screen')) return;
      row.m[name + '-text'] = await page.locator(sel).first().innerText();
      T.expect(!a.small.length, name + ': text under 12px', a.small); T.expect(!a.tiny.length, name + ': targets under 44px', a.tiny); T.expect(!a.off.length, name + ': cut off', a.off);
    });
  }
  await T.step('agent dialog trial', async () => { row.m.agentTrial = await T.dialogTrial('agent', '[data-agent-review-open]', '[data-agent-review-dialog]', '[data-agent-review-cancel]'); });
  await T.step('agent switch', async () => {
    const before = await T.raw(), was = JSON.parse(before), target = was.agentId === 'shark' ? 'super' : 'shark';
    await T.openDialog('[data-agent-review-open]', '[data-agent-review-dialog]');
    const dlg = page.locator('[data-agent-review-dialog]');
    await dlg.locator('[data-agent-review-choices-open]').click(); await page.waitForTimeout(300);
    await T.shot('agent-choices'); row.m.agentChoices = await T.audit('[data-agent-review-dialog]');
    row.m.agentChoicesText = await dlg.innerText();
    await dlg.locator(`[data-agent-review-choice="${target}"]`).scrollIntoViewIfNeeded();
    await dlg.locator(`[data-agent-review-choice="${target}"]`).click(); await page.waitForTimeout(200);
    await T.shot('agent-choices-picked');
    await dlg.locator('[data-agent-review-review-open]').click(); await page.waitForTimeout(300);
    await T.shot('agent-review'); row.m.agentReview = await T.audit('[data-agent-review-dialog]');
    T.expect(await T.raw() === before, 'agent: nothing is saved before Make switch');
    await dlg.locator('[data-agent-review-confirm]').click();
    await dlg.waitFor({ state: 'hidden', timeout: 6000 }); await page.waitForTimeout(500);
    const s = await T.save();
    T.expect(s.agentId === target && s.agentReview?.toAgent === target, 'agent: the switch is saved', { agentId: s.agentId, part: s.agentReview });
    T.expect(s.weeklyWage === was.weeklyWage && s.netWorth === was.netWorth, 'agent: wage and savings unchanged', { wage: [was.weeklyWage, s.weeklyWage], net: [was.netWorth, s.netWorth] });
    await T.centre('[data-agent-review-status]'); await T.shot('agent-saved');
    row.m.agentSavedText = await page.locator('[data-agent-review-status]').innerText();
    for (const a of [row.m.agentChoices, row.m.agentReview]) { T.expect(a?.inside, 'agent screens inside the viewport', a?.rect); T.expect(a && !a.small.length, 'agent screens: text under 12px', a?.small); T.expect(a && !a.tiny.length, 'agent screens: targets under 44px', a?.tiny); T.expect(a && !a.off.length, 'agent screens: cut off', a?.off); }
  });
  await T.step('international retire shows the comeback card', async () => {
    const retire = page.getByRole('button', { name: /Retire from International Football/ });
    T.expect(await retire.count() === 1, 'one Retire from International button', await retire.count());
    await retire.first().evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(150);
    row.m.retireButton = await retire.first().evaluate(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
    await T.shot('intl-before-retire');
    await retire.first().click(); await page.waitForTimeout(600);
    const s = await T.save(); T.expect(s.intStats.isRetired === true && s.internationalCareer === false, 'retiring from internationals is saved', s.intStats);
    T.expect(await page.locator('[data-international-return-status="available"]').count() === 1, 'the comeback card shows once retired');
    await T.centre('[data-international-return-status]'); await T.shot('return-card');
    const a = await T.audit('[data-international-return-status]'); row.m.returnCard = a; row.m.returnCardText = await page.locator('[data-international-return-status]').innerText();
    T.expect(a && !a.small.length, 'return card: text under 12px', a?.small); T.expect(a && !a.tiny.length, 'return card: targets under 44px', a?.tiny);
  });
  await T.step('return dialog trial', async () => { row.m.returnTrial = await T.dialogTrial('return', '[data-international-return-open]', '[data-international-return-dialog]', '[data-international-return-cancel]'); });
  await T.step('return confirm', async () => {
    const was = await T.save();
    await T.openDialog('[data-international-return-open]', '[data-international-return-dialog]');
    const dlg = page.locator('[data-international-return-dialog]');
    await dlg.locator('[data-international-return-review-open]').click(); await page.waitForTimeout(300);
    await T.shot('return-review'); row.m.returnReview = await T.audit('[data-international-return-dialog]');
    await dlg.locator('[data-international-return-confirm]').click();
    await dlg.waitFor({ state: 'hidden', timeout: 6000 }); await page.waitForTimeout(500);
    const s = await T.save();
    T.expect(s.internationalCareer === true && s.intStats.isRetired === false && !!s.internationalReturn, 'comeback saved', { c: s.internationalCareer, r: s.intStats.isRetired, part: s.internationalReturn });
    T.expect(s.intStats.caps === was.intStats.caps && s.intStats.goals === was.intStats.goals && s.weeklyWage === was.weeklyWage && s.overall === was.overall, 'comeback gives no caps, money or rating', { caps: [was.intStats.caps, s.intStats.caps] });
    await T.centre('[data-international-return-status]'); await T.shot('return-saved');
    row.m.returnSavedText = await page.locator('[data-international-return-status]').innerText();
    const again = page.getByRole('button', { name: /Retire from International Football/ });
    if (await again.count()) {
      await again.first().click(); await page.waitForTimeout(500);
      await T.centre('[data-international-return-status]'); await T.shot('return-after-second-retire');
      row.m.returnAfterSecondRetire = await page.locator('[data-international-return-status]').innerText();
    }
  });
  return T;
}

async function reloadKeeps(T, tag) {
  const { page, row } = T;
  const before = await T.raw();
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-career-action-bar]', { timeout: 45000 }); await page.waitForTimeout(1000);
  const after = await T.raw();
  if (!T.expect(before === after, tag + ': a reload keeps every saved byte')) {
    const a = JSON.parse(before), b = JSON.parse(after);
    row.m[tag + '-reloadDiff'] = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  }
}

async function farewell(T) {
  const { page, row } = T;
  await T.step('farewell dialog trial', async () => { row.m.farewellTrial = await T.dialogTrial('farewell', '[data-farewell-open]', '[data-farewell-dialog]', '[data-farewell-cancel]'); });
  await T.step('farewell announce', async () => {
    const was = await T.save();
    await T.openDialog('[data-farewell-open]', '[data-farewell-dialog]');
    const dlg = page.locator('[data-farewell-dialog]');
    await dlg.locator('[data-farewell-review-open]').click(); await page.waitForTimeout(300);
    await T.shot('farewell-review'); row.m.farewellReview = await T.audit('[data-farewell-dialog]'); row.m.farewellReviewText = await dlg.innerText();
    await dlg.locator('[data-farewell-confirm]').click();
    await dlg.waitFor({ state: 'hidden', timeout: 6000 }); await page.waitForTimeout(500);
    const s = await T.save();
    T.expect(!!s.farewellSeason && s.seasons.length === was.seasons.length && s.age === was.age, 'farewell announced, no season played', { part: s.farewellSeason });
    await T.top(); await T.shot('farewell-announced-top');
    row.m.farewellAnnouncedText = await page.locator('[data-farewell-plan]').first().innerText();
    row.m.farewellCards = await page.locator('[data-farewell-plan]').count();
  });
  await T.step('reload keeps the three choices', async () => {
    await reloadKeeps(T, 'after choices');
    row.m.afterReload = await page.evaluate(() => ({
      farewell: [...document.querySelectorAll('[data-farewell-plan]')].map(e => e.dataset.farewellPlan + ' | ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)),
      agent: [...document.querySelectorAll('[data-agent-review-status]')].map(e => e.dataset.agentReviewStatus + ' | ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)),
      ret: [...document.querySelectorAll('[data-international-return-status]')].map(e => e.dataset.internationalReturnStatus + ' | ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)),
    }));
    await T.top(); await T.shot('after-reload-top'); await T.shot('after-reload-full', true);
    await utilities(T, 'after-reload');
  });
  await T.step('saved farewell help is read only', async () => {
    const before = await T.raw();
    await T.openDialog('[data-farewell-open]', '[data-farewell-dialog]');
    await T.shot('farewell-saved-help');
    row.m.farewellSavedConfirm = await page.locator('[data-farewell-confirm], [data-farewell-review-open]').count();
    await T.closeDialog('escape', '[data-farewell-open]', '[data-farewell-dialog]');
    T.expect(row.m.farewellSavedConfirm === 0, 'a saved farewell cannot be announced again');
    T.expect(await T.raw() === before, 'reading the saved farewell changes nothing');
  });
  await T.step('farewell season played to retirement', async () => {
    const bar = page.locator('[data-career-action-bar]');
    await T.top();
    await bar.getByRole('button', { name: 'Next Season', exact: true }).click();
    await page.waitForTimeout(1500);
    const trail = [];
    for (let i = 0; i < 18; i++) {
      const wheel = await T.wheel('fw-' + i); if (wheel) trail.push({ i, wheel: wheel.result });
      const s = await T.save();
      if (s.retired) break;
      await T.top();
      const control = s.phase === 'rehab_choice' ? page.getByRole('button', { name: /Follow the club's plan/ }) : page.getByRole('button', { name: /^Continue/ });
      try { await control.first().waitFor({ state: 'visible', timeout: 15000 }); } catch { /* recorded below */ }
      const info = await page.evaluate(() => {
        const c = document.querySelector('[data-farewell-plan]'), r = c?.getBoundingClientRect();
        const cont = [...document.querySelectorAll('button')].find(b => /^Continue/.test(b.textContent.trim()) || /Follow the club's plan/.test(b.textContent)), k = cont?.getBoundingClientRect();
        const u = [...document.querySelectorAll('[data-career-utility]')].map(b => { const q = b.getBoundingClientRect(); return { u: b.dataset.careerUtility, top: Math.round(q.top), bottom: Math.round(q.bottom), left: Math.round(q.left), right: Math.round(q.right), pos: getComputedStyle(b).position }; });
        return { card: r ? { top: Math.round(r.top), h: Math.round(r.height) } : null, cont: k ? { top: Math.round(k.top), bottom: Math.round(k.bottom), left: Math.round(k.left), right: Math.round(k.right), h: Math.round(k.height), label: cont.textContent.trim().slice(0, 40) } : null, vh: innerHeight, total: document.documentElement.scrollHeight, u, cards: document.querySelectorAll('[data-farewell-plan]').length };
      });
      trail.push({ i, phase: s.phase, ...info });
      await T.shot('fw-' + i + '-' + s.phase);
      if (!(await control.count())) { trail.push({ i, stuck: s.phase }); await T.shot('fw-' + i + '-full', true); break; }
      await control.first().click(); await page.waitForTimeout(1100);
    }
    row.m.farewellTrail = trail;
    const end = await T.save();
    T.expect(end.retired === true, 'the farewell season ends in retirement', { phase: end.phase, retired: end.retired, seasons: end.seasons.length });
    await T.top(); await T.shot('fw-end-top');
    row.m.endCounts = await page.evaluate(() => ({ farewell: document.querySelectorAll('[data-farewell-plan]').length, utilities: [...document.querySelectorAll('[data-career-utility]')].map(b => b.dataset.careerUtility), next: [...document.querySelectorAll('button')].filter(b => /Next Season/.test(b.textContent)).length }));
  });
}

async function scenOffer(w, h, fixtureId, scen) {
  const T = await start(w, h, fixtureId, scen); if (!T) return null;
  const { page, row } = T;
  await T.step('first paint', async () => { await T.top(); await T.shot('top'); await T.shot('full', true); await utilities(T, 'window'); });
  await T.step('window read', async () => {
    row.m.window = await page.evaluate(() => {
      const offers = [...document.querySelectorAll('[aria-label^="Review contract with"]')].map(b => b.parentElement.innerText.replace(/\s+/g, ' ').slice(0, 260));
      const ext = document.querySelector('[data-contract-extension-wage]');
      const small = [...document.querySelectorAll('main button')].map(b => { const r = b.getBoundingClientRect(); return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(b => b.w > 0 && (b.h < 43.5 || b.w < 43.5));
      return { offers, extension: ext ? ext.parentElement.innerText.replace(/\s+/g, ' ') : null, brief: document.querySelectorAll('[data-transfer-brief-selection]').length, request: document.querySelectorAll('[data-request-transfer]').length, small, docOverflowX: document.documentElement.scrollWidth > innerWidth + 1, total: document.documentElement.scrollHeight, vh: innerHeight };
    });
  });
  await T.step('offer review', async () => {
    const o = await T.openDialog('[aria-label^="Review contract with"]', '[data-soccer-offer-review]');
    const dlg = page.locator('[data-soccer-offer-review]');
    await T.shot('offer-review'); row.m.offerReview = await T.audit('[data-soccer-offer-review]');
    row.m.offerReviewText = (await dlg.innerText()).replace(/\s+/g, ' ');
    row.m.signedWageAttr = await dlg.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage');
    await dlg.getByRole('button', { name: 'Contract review help', exact: true }).click(); await page.waitForTimeout(250);
    await T.shot('offer-review-help'); row.m.offerHelpText = (await dlg.innerText()).replace(/\s+/g, ' ');
    const c = await T.closeDialog('escape', '[aria-label^="Review contract with"]', '[data-soccer-offer-review]');
    T.expect(o.y0 === o.y1 && c.y === o.y0, 'offer review does not move the page', { o, c });
    const want = T.f.facts.offers?.[0]?.signedWage;
    T.expect(String(want) === row.m.signedWageAttr, 'the review shows the wage the save holds', { want, shown: row.m.signedWageAttr });
  });
  return T;
}

async function scenBrief(w, h, fixtureId, scen, coin) {
  const T = await start(w, h, fixtureId, scen); if (!T) return null;
  const { page, row } = T;
  row.coin = coin;
  await T.step('first paint', async () => { await T.top(); await T.shot('top'); await T.shot('full', true); await utilities(T, 'window'); });
  await T.step('brief card', async () => {
    const a = await T.audit('[data-transfer-brief-selection]'); row.m.briefCard = a;
    if (!T.expect(!!a, 'the Brief your agent card is in the window')) return;
    row.m.briefCardText = await page.locator('[data-transfer-brief-selection]').innerText();
    row.m.order = await page.evaluate(() => { const y = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }; return { brief: y('[data-transfer-brief-open]'), request: y('[data-request-transfer]'), vh: innerHeight }; });
    T.expect(!a.small.length && !a.tiny.length && !a.off.length, 'brief card: small text, small targets or cut off', a);
  });
  await T.step('brief opens on its rules first', async () => {
    const o = await T.openDialog('[data-transfer-brief-open]', '[data-transfer-brief]');
    const dlg = page.locator('[data-transfer-brief]');
    T.expect(await dlg.locator('[data-transfer-brief-help]').count() === 1, 'first open shows the rules');
    await T.shot('brief-help'); row.m.briefHelp = await T.audit('[data-transfer-brief]'); row.m.briefHelpText = (await dlg.innerText()).replace(/\s+/g, ' ');
    await dlg.getByRole('button', { name: 'Choose a priority', exact: true }).click(); await page.waitForTimeout(300);
    await T.shot('brief-options'); row.m.briefOptions = await T.audit('[data-transfer-brief]'); row.m.briefOptionsText = (await dlg.innerText()).replace(/\s+/g, ' ');
    const c = await T.closeDialog('escape', '[data-transfer-brief-open]', '[data-transfer-brief]');
    T.expect(o.y0 === o.y1 && c.y === o.y0 && c.focus && o.focusIn, 'brief: no jump, focus in and back (Escape)', { o, c });
    for (const a of [row.m.briefHelp, row.m.briefOptions]) { T.expect(a?.inside, 'brief dialog inside the viewport', a?.rect); T.expect(a && !a.small.length, 'brief dialog: text under 12px', a?.small); T.expect(a && !a.tiny.length, 'brief dialog: targets under 44px', a?.tiny); T.expect(a && !a.off.length, 'brief dialog: cut off', a?.off); }
  });
  await T.step('brief rules reopen from the ?', async () => {
    const o = await T.openDialog('[data-transfer-brief-open]', '[data-transfer-brief]');
    const dlg = page.locator('[data-transfer-brief]');
    T.expect(await dlg.locator('[data-transfer-brief-help]').count() === 0, 'second open goes straight to the choices');
    await dlg.locator('[data-transfer-brief-help-open]').click(); await page.waitForTimeout(250);
    T.expect(await dlg.locator('[data-transfer-brief-help]').count() === 1, 'the ? brings the rules back');
    const c1 = await T.closeDialog('x', '[data-transfer-brief-open]', '[data-transfer-brief]');
    const o2 = await T.openDialog('[data-transfer-brief-open]', '[data-transfer-brief]');
    const c2 = await T.closeDialog('back', '[data-transfer-brief-open]', '[data-transfer-brief]', '[data-transfer-brief-back]');
    T.expect(c1.y === o.y0 && c1.focus && c2.y === o2.y0 && c2.focus, 'brief: Close and Back put scroll and focus back', { c1, c2 });
  });
  await T.step('save a brief, then request', async () => {
    const was = await T.raw();
    await T.openDialog('[data-transfer-brief-open]', '[data-transfer-brief]');
    const dlg = page.locator('[data-transfer-brief]');
    await dlg.locator('[data-transfer-priority="minutes"]').click(); await page.waitForTimeout(150);
    await T.shot('brief-picked');
    await dlg.locator('[data-transfer-brief-save]').click();
    await dlg.waitFor({ state: 'hidden', timeout: 6000 }); await page.waitForTimeout(400);
    const s1 = await T.save();
    T.expect(s1.transferBrief?.priority === 'minutes' && s1.phase === 'transfer_window' && JSON.stringify(s1.transferSituation) === JSON.stringify(JSON.parse(was).transferSituation), 'saving a brief requests nothing', s1.transferBrief);
    row.m.briefSavedText = await page.locator('[data-transfer-brief-selection]').innerText();
    await T.centre('[data-transfer-brief-selection]'); await T.shot('brief-saved');
    await page.evaluate(ARM, coin);
    await T.centre('[data-request-transfer]');
    const y0 = await T.y();
    await page.locator('[data-request-transfer]').first().click(); await page.waitForTimeout(700);
    await page.evaluate(() => { Math.random = window.__revRandom; });
    const s2 = await T.save();
    row.m.result = { status: s2.transferBrief?.result?.status ?? null, phase: s2.phase, situation: s2.transferSituation?.type ?? null, offer: s2.transferBrief?.result?.offer ? { club: s2.transferBrief.result.offer.club.name, wage: s2.transferBrief.result.offer.wage, years: s2.transferBrief.result.offer.contractYears } : null, projection: s2.transferBrief?.result?.projection ?? null, y0, y1: await T.y() };
    T.expect(await page.locator('[data-transfer-brief-result]').count() === 1, 'the answer is on screen', row.m.result);
    if (await page.locator('[data-transfer-brief-result]').count()) { await T.centre('[data-transfer-brief-result]'); row.m.resultText = (await page.locator('[data-transfer-brief-result]').innerText()).replace(/\s+/g, ' '); row.m.resultAudit = await T.audit('[data-transfer-brief-result]'); }
    await T.shot('brief-result'); await T.shot('brief-result-full', true);
    row.m.afterResult = await page.evaluate(() => ({ request: document.querySelectorAll('[data-request-transfer]').length, stay: [...document.querySelectorAll('button')].filter(b => /Stay/.test(b.textContent)).map(b => b.textContent.trim().slice(0, 50)), briefOpen: document.querySelectorAll('[data-transfer-brief-open]').length, toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.slice(0, 120)), main: document.querySelector('main').innerText.replace(/\s+/g, ' ').slice(0, 1500) }));
    const raw2 = await T.raw();
    if (await page.locator('[data-request-transfer]').count()) { await page.locator('[data-request-transfer]').first().click(); await page.waitForTimeout(500); T.expect(await T.raw() === raw2, 'a second request cannot roll the answer again'); row.m.secondRequestToasts = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.slice(0, 120))); }
    await reloadKeeps(T, 'brief result');
    T.expect(await page.locator('[data-transfer-brief-result]').count() === 1, 'the answer is still on screen after a reload');
    await T.centre('[data-transfer-brief-result]'); await T.shot('brief-result-reloaded');
  });
  await T.step('after the answer', async () => {
    if (await page.locator('[data-transfer-brief-open]').count()) {
      await T.openDialog('[data-transfer-brief-open]', '[data-transfer-brief]');
      await T.shot('brief-after-answer'); row.m.briefAfterAnswerText = (await page.locator('[data-transfer-brief]').innerText()).replace(/\s+/g, ' ');
      const raw = await T.raw();
      const other = page.locator('[data-transfer-priority="level"]');
      if (await other.count()) { await other.click(); const save = page.locator('[data-transfer-brief-save]'); row.m.saveAfterAnswerDisabled = await save.isDisabled(); if (!row.m.saveAfterAnswerDisabled) { await save.click(); await page.waitForTimeout(400); } }
      if (await page.locator('[data-transfer-brief]').count()) await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      row.m.briefChangedAfterAnswer = (await T.raw()) !== raw;
      row.m.briefCardAfterAnswer = await page.locator('[data-transfer-brief-selection]').innerText();
    }
    const offerBtn = page.locator('[aria-label^="Review contract with"]');
    if (await offerBtn.count()) {
      await T.openDialog('[aria-label^="Review contract with"]', '[data-soccer-offer-review]');
      await T.shot('brief-offer-review'); row.m.briefOfferReviewText = (await page.locator('[data-soccer-offer-review]').innerText()).replace(/\s+/g, ' ');
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    }
    const stay = page.locator('[data-transfer-brief-stay]');
    row.m.stayButtons = await stay.count();
    if (await stay.count()) { await stay.first().click(); await page.waitForTimeout(800); const s = await T.save(); row.m.afterStay = { phase: s.phase, brief: s.transferBrief ?? null }; await T.top(); await T.shot('brief-after-stay'); }
  });
  return T;
}

async function scenTalk(w, h, fixtureId, scen, reduced) {
  const T = await start(w, h, fixtureId, scen, { reduced }); if (!T) return null;
  const { page, row } = T;
  await T.step('first paint', async () => { await T.top(); await T.shot('top'); await utilities(T, 'event'); });
  await T.step('the money talk', async () => {
    const push = page.getByRole('button', { name: /Push for more money/ });
    if (!T.expect(await push.count() === 1, 'one Push for more money choice', await push.count())) return;
    await push.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(150);
    row.m.pushText = (await push.innerText()).replace(/\s+/g, ' ');
    row.m.pushAudit = await push.evaluate(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sizes: [...e.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim()).map(x => ({ t: x.textContent.trim().slice(0, 60), size: parseFloat(getComputedStyle(x).fontSize) })) }; });
    await T.shot('talk-card');
    const was = await T.save();
    await page.evaluate(ARM, 0.1);
    await push.click(); await page.waitForTimeout(700);
    await page.evaluate(() => { Math.random = window.__revRandom; });
    row.m.toasts = await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.slice(0, 160)));
    const s = await T.save();
    row.m.talk = { wageWas: was.weeklyWage, wageNow: s.weeklyWage, wheel: s.chanceWheel ?? null, want: T.f.facts.wageDemand };
    const wheel = page.locator('[data-career-chance-wheel]');
    if (!T.expect(await wheel.count() === 1, 'the wheel opens over the result')) return;
    await page.waitForTimeout(400); await T.shot('talk-wheel-ready');
    row.m.wheelAudit = await T.audit('[data-career-chance-wheel]');
    row.m.wheelText = (await wheel.innerText()).replace(/\s+/g, ' ');
    const t0 = Date.now();
    await wheel.locator('[data-wheel-spin]').click();
    await page.waitForTimeout(120);
    row.m.spin = await wheel.evaluate(e => { const d = e.querySelector('[data-wheel-disk]'), cs = getComputedStyle(d); return { transition: cs.transitionDuration, transform: cs.transform.slice(0, 60), continueNow: !!e.querySelector('[data-wheel-continue]'), running: d.getAnimations().length }; });
    await T.shot('talk-wheel-spinning');
    await wheel.locator('[data-wheel-continue]').waitFor({ state: 'visible', timeout: 12000 });
    row.m.spinMs = Date.now() - t0;
    row.m.wheelResult = await wheel.locator('[data-wheel-result]').innerText();
    await T.shot('talk-wheel-result'); row.m.wheelResultAudit = await T.audit('[data-career-chance-wheel]');
    await wheel.locator('[data-wheel-continue]').click(); await wheel.waitFor({ state: 'hidden', timeout: 6000 });
    await page.waitForTimeout(400); await T.top(); await T.shot('talk-after');
    if (reduced) T.expect(row.m.spinMs < 1500, 'reduced motion: the wheel does not make you wait', row.m.spinMs);
  });
  return T;
}

const RUN = {
  vet: async (w, h) => { const T = await scenVet(w, h, 'vet', 'vet'); if (T) { await farewell(T); await T.context.close(); } },
  oldvet: async (w, h) => { const T = await scenVet(w, h, 'old-vet', 'oldvet'); if (T) { await farewell(T); await T.context.close(); } },
  offer: async (w, h) => { for (const id of ['twOffer', 'twCut', 'old-twOffer']) { const T = await scenOffer(w, h, id, id === 'twOffer' ? 'offer' : id === 'twCut' ? 'offercut' : 'oldoffer'); if (T) await T.context.close(); } },
  brief: async (w, h) => { for (const [coin, tag] of [[0.9, 'briefno'], [0.1, 'briefyes']]) { const T = await scenBrief(w, h, 'twNone', tag, coin); if (T) await T.context.close(); } },
  oldbrief: async (w, h) => { const T = await scenBrief(w, h, 'old-twNone', 'oldbriefyes', 0.1); if (T) await T.context.close(); },
  talk: async (w, h) => { for (const [id, tag, rm] of [['talk', 'talk', false], ['talk', 'talk', true], ['talkVet', 'talkvet', false], ['old-talk', 'oldtalk', false]]) { if (rm && w !== 390) continue; const T = await scenTalk(w, h, id, tag, rm); if (T) await T.context.close(); } },
  young: async (w, h) => { for (const id of ['young', 'old-young']) { const T = await start(w, h, id, id === 'young' ? 'young' : 'oldyoung'); if (!T) continue; await T.step('first paint', async () => { await T.top(); await T.shot('top'); await utilities(T, 'playing'); T.row.m.cards = await T.page.evaluate(() => ({ farewell: document.querySelectorAll('[data-farewell-plan]').length, agent: document.querySelectorAll('[data-agent-review-status]').length, ret: document.querySelectorAll('[data-international-return-status]').length })); T.expect(T.row.m.cards.farewell === 0, 'no farewell card at 24', T.row.m.cards); }); await T.context.close(); } },
};
try {
  for (const [w, h] of VIEWS) for (const name of Object.keys(RUN)) {
    if (pickS && !pickS.includes(name)) continue;
    try { await RUN[name](w, h); } catch (e) { report.cases.push({ id: name + '-' + w + '-CRASH', fails: ['scenario crashed: ' + String(e).slice(0, 400)] }); }
    flush();
  }
} finally { await browser.close(); flush(); }
const fails = report.cases.reduce((n, c) => n + (c.fails?.length ?? 0), 0), errors = report.cases.reduce((n, c) => n + (c.errors?.length ?? 0), 0);
for (const c of report.cases) console.log(c.id, 'steps', c.steps?.length ?? 0, 'fails', c.fails?.length ?? 0, 'pageerrors', c.errors?.length ?? 0, 'shots', c.shots?.length ?? 0);
for (const c of report.cases) for (const f of c.fails ?? []) console.log('MISS', c.id, f.slice(0, 300));
for (const c of report.cases) for (const f of c.errors ?? []) console.log('PAGEERROR', c.id, f.slice(0, 300));
console.log(`walk done: ${report.cases.length} cases, ${fails} misses, ${errors} page errors`);
