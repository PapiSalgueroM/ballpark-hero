// Probe for finding 13 (Release AW part one, second fix pass). Not committed, sent as .rc/x/probeEsc.mjs.
// Question: when the farewell dialog is opened and Escape is pressed straight after, as line 96 of
// scripts/playSoccerFarewell.mjs does, is the Escape ever ignored, and by what?
// It measures and asserts nothing: the last line is a summary and the exit code is 0 unless the probe breaks.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const NOW = 1791658800000;
const N = Number(process.env.PROBE_N || 20);
const fixtures = JSON.parse(fs.readFileSync('soccer-farewell-artifacts/native-fixtures.json', 'utf8'));
const fixture = fixtures.find(f => f.id === 'normal');
if (!fixture) throw Error('no normal fixture');

const rows = [];
const browser = await pw.chromium.launch({ headless: true });

async function setup(width) {
  const phone = width < 1000;
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: phone, isMobile: phone });
  const page = await context.newPage();
  await context.route('**/*', async route => {
    const req = route.request(), url = req.url();
    if (url.startsWith(BASE + '/')) return route.continue();
    if (url.startsWith('data:')) return route.continue();
    if (req.method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.includes('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.abort();
  });
  await context.addInitScript(({ key, input, now }) => {
    if (!sessionStorage.getItem('probe-fixture')) {
      localStorage.setItem(key, JSON.stringify(input));
      localStorage.setItem('dukb-guest-handle', 'CornerCaptain');
      sessionStorage.setItem('probe-fixture', '1');
    }
    Date.now = () => now;
    const desc = e => (e ? e.tagName + (e.id ? '#' + e.id : '') + (e.hasAttribute && e.hasAttribute('data-farewell-title') ? '[farewell-title]' : '') + (e.hasAttribute && e.hasAttribute('data-farewell-open') ? '[farewell-open]' : '') : null);
    const layers = () => ({
      tooltips: document.querySelectorAll('[role=tooltip]').length,
      poppers: document.querySelectorAll('[data-radix-popper-content-wrapper]').length,
      sonner: document.querySelectorAll('[data-sonner-toast]').length,
      radixToasts: document.querySelectorAll('li[role=status][data-state=open]').length,
      dialogs: document.querySelectorAll('[role=dialog]').length,
      alertDialogs: document.querySelectorAll('[role=alertdialog]').length,
      menus: document.querySelectorAll('[role=menu],[role=listbox]').length,
    });
    window.__probe = { log: [], layers, desc };
    window.addEventListener('keydown', e => {
      const d = document.querySelector('[data-farewell-dialog]');
      window.__probe.log.push({ at: 'capture', key: e.key, t: performance.now(), prevented: e.defaultPrevented, dialog: !!d, state: d ? d.getAttribute('data-state') : null, pe: d ? d.style.pointerEvents : null, active: desc(document.activeElement), layers: layers() });
    }, true);
    window.addEventListener('keydown', e => {
      window.__probe.log.push({ at: 'bubble', key: e.key, t: performance.now(), prevented: e.defaultPrevented });
    }, false);
    document.addEventListener('click', e => {
      window.__probe.log.push({ at: 'click', t: performance.now(), target: desc(e.target) });
    }, true);
  }, { key: fixture.key, input: fixture.input, now: NOW });
  await page.goto(BASE + '/soccer-career', { waitUntil: 'networkidle' });
  const consent = page.getByRole('region', { name: 'Cookie choices', exact: true });
  try { await consent.waitFor({ timeout: 8000 }); await consent.getByRole('button', { name: 'Essential only', exact: true }).click(); await consent.waitFor({ state: 'hidden' }); } catch { /* no banner */ }
  await page.locator('[data-farewell-open]').waitFor();
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp, phone };
}

const bodyState = page => page.evaluate(() => ({ y: scrollY, computed: getComputedStyle(document.body).overflow }));

async function trial(env, label, mode, rate, i) {
  const { page, phone } = env;
  const trigger = page.locator('[data-farewell-open]');
  const dialog = page.locator('[data-farewell-dialog]');
  await trigger.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { window.__probe.log = []; });
  const row = { label, mode, rate, i, phone };
  if (phone) await trigger.tap(); else { await trigger.focus(); await trigger.press('Enter'); }
  if (mode !== 'fast') {
    // The walk's own steps between the open and the Escape of its line 96, in its order.
    await dialog.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-farewell-dialog]')?.contains(document.activeElement), null, { timeout: 2000 });
    await bodyState(page); await bodyState(page);
    await dialog.textContent();
    await dialog.locator('[data-farewell-confirm]').count();
  }
  if (mode === 'ready') {
    try { await page.waitForFunction(() => document.querySelector('[data-farewell-dialog]')?.style.pointerEvents === 'auto', null, { timeout: 2000 }); row.signal = true; } catch { row.signal = false; }
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  await page.keyboard.press('Escape');
  let closed = true;
  try { await dialog.waitFor({ state: 'hidden', timeout: 1500 }); } catch { closed = false; }
  row.closed = closed;
  const log = await page.evaluate(() => window.__probe.log);
  const open = log.find(v => (v.at === 'capture' && v.key === 'Enter') || (v.at === 'click' && String(v.target).includes('farewell-open')));
  const escCap = log.find(v => v.at === 'capture' && v.key === 'Escape');
  const escBub = log.find(v => v.at === 'bubble' && v.key === 'Escape');
  row.gapMs = open && escCap ? Math.round((escCap.t - open.t) * 10) / 10 : null;
  row.escDialogMounted = escCap ? escCap.dialog : null;
  row.escPointerEvents = escCap ? escCap.pe : null;
  row.escActive = escCap ? escCap.active : null;
  row.escLayers = escCap ? escCap.layers : null;
  row.escPreventedAtWindowCapture = escCap ? escCap.prevented : null;
  row.escPreventedAtWindowBubble = escBub ? escBub.prevented : null;
  if (!closed) {
    row.stuck = await page.evaluate(() => { const d = document.querySelector('[data-farewell-dialog]'); return { state: d?.getAttribute('data-state'), pe: d?.style.pointerEvents, active: window.__probe.desc(document.activeElement), layers: window.__probe.layers() }; });
    if (!rows.some(v => v.shot)) { row.shot = 'probe-esc-stuck-' + label + '-' + mode + '-r' + rate + '.png'; await page.screenshot({ path: path.join(OUT, row.shot) }); }
    await page.keyboard.press('Escape');
    let second = true;
    try { await dialog.waitFor({ state: 'hidden', timeout: 1500 }); } catch { second = false; }
    row.secondEscapeCloses = second;
    if (!second) { await dialog.locator('[data-farewell-cancel]').click(); await dialog.waitFor({ state: 'hidden' }); }
  }
  await page.waitForTimeout(120);
  rows.push(row);
}

async function block(env, label, mode, rate) {
  await env.cdp.send('Emulation.setCPUThrottlingRate', { rate });
  for (let i = 0; i < N; i++) await trial(env, label, mode, rate, i);
  await env.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}

try {
  const desk = await setup(1280);
  for (const rate of [1, 4]) for (const mode of ['walk', 'fast', 'ready']) await block(desk, '1280-available', mode, rate);
  // Announce through the real buttons, then reload: the state line 96 of the walk is in.
  {
    const { page } = desk, trigger = page.locator('[data-farewell-open]'), dialog = page.locator('[data-farewell-dialog]');
    await trigger.focus(); await trigger.press('Enter'); await dialog.waitFor();
    await dialog.locator('[data-farewell-review-open]').click();
    await dialog.locator('[data-farewell-confirm]').click();
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(key => { try { return !!JSON.parse(localStorage.getItem(key)).farewellSeason; } catch { return false; } }, fixture.key, { timeout: 5000 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-farewell-open]').waitFor();
    desk.planText = await page.locator('[data-farewell-plan]').getAttribute('data-farewell-plan');
  }
  for (const rate of [1, 4]) for (const mode of ['walk', 'ready']) await block(desk, '1280-announced', mode, rate);
  await desk.context.close();
  const phone = await setup(390);
  for (const rate of [1, 4]) for (const mode of ['walk', 'ready']) await block(phone, '390-available', mode, rate);
  await phone.context.close();
  const groups = new Map();
  for (const r of rows) { const k = r.label + ' ' + r.mode + ' rate' + r.rate; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const summary = [];
  for (const [k, list] of groups) {
    const stuck = list.filter(r => !r.closed), gaps = list.map(r => r.gapMs).filter(v => v !== null).sort((a, b) => a - b);
    const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
    const line = { group: k, trials: list.length, ignored: stuck.length, gapMedianMs: med, gapMinMs: gaps[0] ?? null,
      ignoredWithStylePending: stuck.filter(r => r.escPointerEvents !== 'auto').length,
      ignoredWithOtherLayer: stuck.filter(r => r.escLayers && (r.escLayers.tooltips + r.escLayers.poppers + r.escLayers.radixToasts + r.escLayers.alertDialogs + r.escLayers.menus > 0 || r.escLayers.dialogs > 1)).length,
      ignoredPreventedByOther: stuck.filter(r => r.escPreventedAtWindowBubble === true).length,
      ignoredSecondEscapeCloses: stuck.filter(r => r.secondEscapeCloses === true).length,
      closedWithStylePending: list.filter(r => r.closed && r.escPointerEvents !== 'auto').length,
      readySignalMissing: list.filter(r => r.signal === false).length };
    summary.push(line);
    console.log(JSON.stringify(line));
  }
  fs.writeFileSync(path.join(OUT, 'probe-esc.json'), JSON.stringify({ base: BASE, n: N, planAfterAnnounce: desk.planText, summary, rows }, null, 1));
  const total = rows.length, ignored = rows.filter(r => !r.closed).length;
  console.log('probeEsc: ' + total + ' trials, ' + ignored + ' Escapes ignored, plan after announce ' + desk.planText);
} finally { await browser.close(); }
