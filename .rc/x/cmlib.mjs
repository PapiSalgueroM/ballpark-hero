/* QA hunt helpers for Club Manager walks (runner only). Not a harness of the repo. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;

export const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
export const OUT = process.env.RC_OUT || path.resolve('qa-out');
fs.mkdirSync(OUT, { recursive: true });
export const KEY = 'dukb-club-manager-save';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function openWalk(tag, width, height) {
  const t0 = Date.now();
  const log = { tag, width, height, started: new Date().toISOString(), steps: [], findings: [], errors: [], shots: [], audits: [] };
  let shotBytes = 0;
  const SHOT_BUDGET = Number(process.env.SHOT_BUDGET || 7_000_000);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: width < 768,
    isMobile: false,
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googletagmanager|google-analytics|googlesyndication|doubleclick|adservice|fundingchoices/, r => r.abort());
  page.on('pageerror', e => { const m = String(e).split('\n')[0].slice(0, 300); log.errors.push({ kind: 'pageerror', at: cur.where, m }); console.log(`PAGEERROR @${cur.where}: ${m}`); });
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const t = m.text();
    if (/supabase|ERR_FAILED|Failed to load resource|ERR_BLOCKED|net::|CORS|googletag|adsbygoogle|gtag|ERR_NAME/i.test(t)) return;
    log.errors.push({ kind: 'console.' + m.type(), at: cur.where, m: t.slice(0, 300) });
    if (m.type() === 'error') console.log(`CONSOLE.ERROR @${cur.where}: ${t.slice(0, 200)}`);
  });
  const cur = { where: 'start' };
  const save = () => { log.elapsedS = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(path.join(OUT, `${tag}-log.json`), JSON.stringify(log, null, 1)); };
  const step = (what, extra) => { cur.where = what; log.steps.push({ s: Math.round((Date.now() - t0) / 1000), what, ...(extra || {}) }); save(); };
  const find = (sev, what, detail) => { log.findings.push({ sev, what, detail, at: cur.where }); console.log(`FIND [${sev}] ${what} :: ${String(detail ?? '').slice(0, 220)}`); save(); };
  let shotN = 0;
  async function shot(name, { full = false, maxH = 2400 } = {}) {
    shotN++;
    const file = `${tag}-${String(shotN).padStart(3, '0')}-${name.replace(/[^A-Za-z0-9.-]+/g, '_').slice(0, 40)}.jpg`;
    if (shotBytes > SHOT_BUDGET) { log.shots.push({ file, skipped: 'budget' }); return null; }
    try {
      let opts = { path: path.join(OUT, file), type: 'jpeg', quality: width > 800 ? 32 : 40 };
      if (full) {
        const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => height);
        opts = { ...opts, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(h, maxH) } };
      }
      await page.screenshot(opts);
      const b = fs.statSync(path.join(OUT, file)).size; shotBytes += b;
      log.shots.push({ file, at: cur.where, bytes: b });
      return file;
    } catch (e) { log.shots.push({ file, error: String(e).slice(0, 120) }); return null; }
  }
  return { browser, ctx, page, log, save, step, find, shot, cur };
}

/* In page measurement: overflow, cut text, overlapping text, leaks. */
export async function audit(w, label, scopeSel = 'main') {
  const r = await w.page.evaluate(({ scopeSel }) => {
    const W = window.innerWidth;
    const scope = document.querySelector(scopeSel) || document.body;
    const out = { docOverflow: document.documentElement.scrollWidth - W, bodyOverflow: document.body.scrollWidth - W, offRight: [], clipped: [], overlaps: [], leaks: [], tinyTaps: [] };
    const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const ownText = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    const desc = e => { const t = (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 70); return `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).slice(0, 3).join('.') : ''} "${t}"`; };
    const clipAncestor = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX !== 'visible') return p; } return null; };
    const all = [...scope.querySelectorAll('*')].filter(vis);
    const leaves = [];
    for (const e of all) {
      const rc = e.getBoundingClientRect();
      const txt = ownText(e);
      if (txt) leaves.push({ e, rc, txt });
      if (txt && rc.right > W + 1 && !clipAncestor(e) && out.offRight.length < 15) out.offRight.push(`${desc(e)} right=${Math.round(rc.right)} W=${W}`);
      if (txt && txt.length > 2) {
        const s = getComputedStyle(e);
        if ((s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2 && out.clipped.length < 40) {
          out.clipped.push(`"${(e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90)}" shown ${e.clientWidth}px of ${e.scrollWidth}px`);
        }
      }
      if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || e.tagName === 'A') && (rc.height < 24 || rc.width < 24) && rc.top < 3000 && out.tinyTaps.length < 25) {
        out.tinyTaps.push(`${desc(e)} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
      }
    }
    // overlapping text: leaf text boxes (measured by their text, not their box) that both show and intersect, screen by screen
    const textRect = e => { const rg = document.createRange(); const rs = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) rs.push(r); } return rs; };
    const shows = (e, r) => { const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1); const hit = document.elementFromPoint(x, y); return !!hit && (hit === e || e.contains(hit) || hit.contains(e)); };
    const y0 = window.scrollY;
    const seen = new Set();
    const screens = Math.min(5, Math.ceil(Math.min(document.documentElement.scrollHeight, (scope.getBoundingClientRect().bottom + window.scrollY)) / window.innerHeight));
    for (let sI = 0; sI < Math.max(1, screens) && out.overlaps.length < 15; sI++) {
      window.scrollTo(0, sI * window.innerHeight);
      const L = [];
      for (const l of leaves) {
        for (const r of textRect(l.e)) {
          if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= W) continue;
          if (!shows(l.e, r)) continue;
          L.push({ e: l.e, r, txt: l.txt });
        }
      }
      for (let i = 0; i < L.length && out.overlaps.length < 15; i++) {
        for (let j = i + 1; j < L.length; j++) {
          const a = L[i], b = L[j];
          if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
          const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (x <= 3 || y <= 3) continue;
          const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
          if ((x * y) / small < 0.2) continue;
          const k = a.txt.slice(0, 30) + '|' + b.txt.slice(0, 30);
          if (seen.has(k)) continue; seen.add(k);
          out.overlaps.push(`"${a.txt.slice(0, 40)}" x "${b.txt.slice(0, 40)}" (${Math.round(x)}x${Math.round(y)} at ${Math.round(Math.max(a.r.left, b.r.left))},${Math.round(Math.max(a.r.top, b.r.top) + window.scrollY)})`);
          if (out.overlaps.length >= 15) break;
        }
      }
    }
    window.scrollTo(0, y0);
    const txt = (scope.innerText || '');
    const LEAKS = [[/\bundefined\b/, 'undefined'], [/\bNaN\b/, 'NaN'], [/\[object Object\]/, 'object'], [/\bInfinity\b/, 'Infinity'], [/[–—]/, 'dash'], [/\{\{|\}\}/, 'braces'], [/£-|-£0\b|\(-0\)/, 'negative money shape']];
    for (const [rx, k] of LEAKS) { const m = txt.match(rx); if (m) out.leaks.push(`${k}: "${txt.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, ' ')}"`); }
    out.scrollY = window.scrollY; out.docH = document.documentElement.scrollHeight;
    return out;
  }, { scopeSel: scopeSel === 'main' ? (await w.page.locator('main').count() ? 'main' : 'body') : scopeSel }).catch(e => ({ error: String(e).slice(0, 200) }));
  r.label = label;
  w.log.audits.push(r);
  const bad = [];
  if (r.docOverflow > 1) bad.push(`page scrolls sideways by ${r.docOverflow}px`);
  if (r.offRight?.length) bad.push(`${r.offRight.length} text boxes past the right edge: ${r.offRight[0]}`);
  if (r.overlaps?.length) bad.push(`${r.overlaps.length} overlapping text pairs: ${r.overlaps[0]}`);
  if (r.leaks?.length) bad.push(`leak ${r.leaks.join(' | ')}`);
  if (bad.length) console.log(`AUDIT ${label}: ${bad.join(' ;; ')}`.slice(0, 400));
  w.save();
  return r;
}

export async function bodyText(page) {
  return ((await page.locator('main').first().innerText().catch(() => '')) || (await page.locator('body').innerText().catch(() => ''))).replace(/[ \t]+/g, ' ');
}
export async function h1(page) { return ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase(); }

export async function readSave(page) {
  return page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return 'BAD'; } }, KEY).catch(() => null);
}
export async function saveSummary(page) {
  return page.evaluate(k => {
    try {
      const c = JSON.parse(localStorage.getItem(k) || 'null'); if (!c) return null;
      return { club: c.clubName, season: c.season, week: c.week, cal: c.calendar?.length, budget: c.budget, squad: c.squad?.length, inbox: (c.inbox || []).length, form: (c.form || []).join(''), results: (c.resultLog || []).length, live: !!c.live, window: c.transferWindow };
    } catch (e) { return { err: String(e) }; }
  }, KEY).catch(() => null);
}

export async function click(w, locator, label, wait = 600) {
  const n = await locator.count().catch(() => 0);
  if (!n) { return false; }
  const el = locator.first();
  if (await el.isDisabled().catch(() => false)) return false;
  const ok = await el.click({ timeout: 5000 }).then(() => true).catch(e => { w.log.steps.push({ clickFail: label, e: String(e).slice(0, 120) }); return false; });
  if (ok) await w.page.waitForTimeout(wait);
  return ok;
}
export const btn = (page, rx) => page.locator('button:visible').filter({ hasText: rx });
export const role = (page, rx) => page.getByRole('button', { name: rx });

/* Start a career through the picker. opts: era (regex), nation (regex), league (regex or index), club (regex or 'first'/'last'), managerName, entry (Autumn|New year|The run-in) */
export async function startCareer(w, o) {
  const { page } = w;
  w.step('open /club-manager');
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  await w.shot('picker-era');
  await audit(w, 'picker-era');
  if (!await click(w, btn(page, o.era || /2026-27/), 'era', 1500)) { w.find('blocker', 'could not press the era tile', String(o.era)); return false; }
  w.step('era picked');
  await btn(page, o.nation).first().waitFor({ timeout: 15000 }).catch(() => {});
  await w.shot('picker-nation');
  if (!await click(w, btn(page, o.nation), 'nation', 1200)) { w.find('blocker', 'could not press the nation', String(o.nation)); return false; }
  w.step('nation picked');
  await page.waitForTimeout(1500);
  await w.shot('picker-league');
  await audit(w, 'picker-league');
  const lg = typeof o.league === 'number' ? page.locator('button:visible').filter({ hasText: /clubs ·/ }).nth(o.league) : btn(page, o.league);
  if (!await click(w, lg, 'league', 1500)) { w.find('blocker', 'could not press the league', String(o.league)); return false; }
  w.step('league picked');
  await page.waitForTimeout(1500);
  const clubs = page.locator('button:visible').filter({ hasText: /Board wants/ });
  await clubs.first().waitFor({ timeout: 20000 }).catch(() => {});
  const nClubs = await clubs.count();
  w.log.clubList = [];
  for (let i = 0; i < nClubs; i++) w.log.clubList.push((await clubs.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120));
  await w.shot('picker-team', { full: true, maxH: 3000 });
  await audit(w, 'picker-team');
  let pick;
  if (o.club === 'last') pick = clubs.nth(nClubs - 1);
  else if (o.club === 'first') pick = clubs.first();
  else pick = clubs.filter({ hasText: o.club });
  if (!await click(w, pick, 'club', 900)) { w.find('blocker', 'could not press the club', `${o.club} of ${nClubs}`); return false; }
  await w.shot('picker-confirm-bar');
  w.step('club picked');
  if (!await click(w, role(page, /take the job/i), 'take the job bar', 1500)) { w.find('blocker', 'no Take the job on the confirm bar', ''); return false; }
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => {});
  await w.shot('manager-form', { full: true });
  await audit(w, 'manager-form');
  if (o.entry) await click(w, btn(page, new RegExp('^' + o.entry)), 'entry ' + o.entry, 400);
  if (o.managerName) {
    await page.getByPlaceholder(/Sam Calloway/).fill(o.managerName).catch(() => {});
    await w.shot('manager-form-filled', { full: true });
    await click(w, role(page, /take the job/i).last(), 'take the job (form)', 3000);
  } else {
    await click(w, role(page, /skip: just manage/i), 'skip', 3000);
  }
  for (let i = 0; i < 40; i++) { if (await page.getByRole('tab', { name: /^Home$/ }).count()) break; await page.waitForTimeout(1000); }
  const ok = await page.getByRole('tab', { name: /^Home$/ }).count();
  w.step('hub reached', { ok: !!ok, save: await saveSummary(page) });
  if (!ok) { await w.shot('no-hub', { full: true }); w.find('blocker', 'the hub never appeared after taking the job', (await bodyText(page)).slice(0, 300)); return false; }
  return true;
}

export async function ensureGame(w) {
  const { page } = w;
  if (await page.getByRole('tab', { name: /^Home$/ }).count()) return true;
  if (!/\/club-manager/.test(page.url())) {
    w.log.steps.push({ recover: 'left the game', url: page.url() });
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
  if (await resume.count()) { await resume.first().click().catch(() => {}); await page.waitForTimeout(2500); }
  if (!(await page.getByRole('tab', { name: /^Home$/ }).count())) {
    // a club page or another drill-in: its own Back, never the navbar one
    const hit = await page.evaluate(() => { const b = [...document.querySelectorAll('main button, #dukb-main button')].find(x => (x.innerText || '').trim() === 'Back' && !x.closest('header, nav')); if (b) { b.click(); return true; } return false; }).catch(() => false);
    if (hit) { w.log.steps.push({ recover: 'in-page Back' }); await page.waitForTimeout(900); }
  }
  return !!(await page.getByRole('tab', { name: /^Home$/ }).count());
}

export async function toHub(w) {
  const { page } = w;
  await ensureGame(w);
  if (await page.getByRole('tab', { name: /^Home$/ }).count()) {
    const hit = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === 'Club home'); if (b) { b.click(); return true; } return false; }).catch(() => false);
    if (hit) await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /^Home$/ }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

export const TILES = ['Board', 'Inbox', 'Calendar', 'League', 'Cups', 'Stats', 'Finances', 'Facilities', 'Staff', 'Skills', 'Options', 'Manager', 'Treatment', 'Rival watch', 'Press room', 'Dressing room', 'Academy', 'Training', 'Market', 'Cabinet'];
export const tile = (page, title) => page.locator('button:visible').filter({ has: page.locator('div.uppercase', { hasText: new RegExp('^\\s*' + title + '\\s*$', 'i') }) });

const SKIP = /new career|start new|start again|resign|delete|retire|quit|reset|leave the club|take the job|take over|your managers|club home|^home$|^squad$|^tactics$|^table$|^market$|report a bug|how to play|^back$|play live|quick sim|resume match|open the window|see season review|apply|walk away|sign out|log in|sign in|sign up|track stats|track your stats|^report|resume career|accept the offer|join now|^yes, |manage .*nation|privacy|terms/i;

/* Press every safe control in the open panel once, recording which ones change nothing. */
export async function fuzzPanel(w, panelName, reopen, { max = 22 } = {}) {
  const { page } = w;
  const tried = new Set();
  const dead = [];
  for (let k = 0; k < max; k++) {
    if (!/\/club-manager/.test(page.url())) { w.log.steps.push({ fuzzLeft: panelName, url: page.url() }); await ensureGame(w); if (reopen) await reopen(); }
    const list = await page.evaluate(() => {
      const anchor = [...document.querySelectorAll('button')].find(b => (b.innerText || '').trim() === 'Club home');
      const scope = anchor ? anchor.parentElement : document.querySelector('[role="tabpanel"][data-state="active"]');
      if (!scope) return [];
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      return [...scope.querySelectorAll('button')].filter(b => vis(b) && !b.disabled).map(b => (b.innerText || b.getAttribute('aria-label') || b.title || '').replace(/\s+/g, ' ').trim().slice(0, 80));
    }).catch(() => []);
    const next = list.find(l => l && !tried.has(l) && !SKIP.test(l));
    if (!next) break;
    tried.add(next);
    const before = await page.evaluate(k => { const anchor = [...document.querySelectorAll('button')].find(b => /Club home/.test(b.innerText)); const scope = anchor ? anchor.parentElement : (document.querySelector('[role="tabpanel"][data-state="active"]') || document.querySelector('main')); return { html: scope.outerHTML.length + ':' + scope.innerText, save: localStorage.getItem(k), y: window.scrollY, dlg: document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length }; }, KEY).catch(() => null);
    w.cur.where = `${panelName} > ${next}`;
    const target = page.locator('button:visible').filter({ hasText: next }).first();
    let ok = await target.click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (!ok) { const t2 = page.getByRole('button', { name: next, exact: true }).first(); ok = await t2.click({ timeout: 3000 }).then(() => true).catch(() => false); }
    if (!ok) continue;
    await page.waitForTimeout(700);
    const after = await page.evaluate(k => { const anchor = [...document.querySelectorAll('button')].find(b => /Club home/.test(b.innerText)); const scope = anchor ? anchor.parentElement : (document.querySelector('[role="tabpanel"][data-state="active"]') || document.querySelector('main')); return { html: scope.outerHTML.length + ':' + scope.innerText, save: localStorage.getItem(k), y: window.scrollY, dlg: document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length }; }, KEY).catch(() => null);
    if (before && after) {
      const sameHtml = before.html === after.html;
      if (sameHtml && before.save === after.save && before.dlg === after.dlg) dead.push(next);
      if (Math.abs(after.y - before.y) > 250) w.log.steps.push({ jump: `${panelName} > ${next}`, from: before.y, to: after.y });
      if (after.dlg > before.dlg) { await w.shot(`${panelName}-dlg`); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
    }
    // left the panel? come back
    const still = await page.evaluate(() => [...document.querySelectorAll('button')].some(x => (x.innerText || '').trim() === 'Club home')).catch(() => false);
    if (!still && reopen) { await toHub(w); await reopen(); }
  }
  w.log.steps.push({ fuzz: panelName, tried: [...tried], dead });
  if (dead.length) console.log(`DEAD? ${panelName}: ${dead.join(' | ').slice(0, 300)}`);
  w.save();
  return { tried: [...tried], dead };
}

/* Play the next fixture live: skip to the break, one sub, second half, skip, full report, continue. */
export async function playLive(w, label, { sub = true, watchSecs = 0 } = {}) {
  const { page } = w;
  w.step(`live ${label}`);
  if (!await click(w, page.locator('[data-cm-way="live"]'), 'play live', 1200)) return { ok: false, why: 'no play live' };
  const res = { ok: true, vars: 0, goalsSeen: 0 };
  await page.locator('[data-cm-live-stagebox], [data-cm-live-stage]').first().waitFor({ timeout: 10000 }).catch(() => {});
  await w.shot(`${label}-live-kickoff`);
  await audit(w, `${label}-live-kickoff`, 'body');
  await click(w, page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }), '4x', 300);
  if (watchSecs) {
    const end = Date.now() + watchSecs * 1000;
    while (Date.now() < end) {
      if (await page.locator('[data-cm-var]').count()) { res.vars++; await w.shot(`${label}-var`); await page.waitForTimeout(2500); }
      if (await page.locator('[data-cm-goal-card]').count()) { res.goalsSeen++; await page.waitForTimeout(1500); }
      if (await page.locator('[data-cm-live-stage="interval"]').count()) break;
      await page.waitForTimeout(400);
    }
  }
  // first half: skip to interval
  for (let i = 0; i < 4 && !(await page.locator('[data-cm-live-stage="interval"]').count()); i++) {
    await click(w, page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }), 'skip', 1200);
  }
  if (!(await page.locator('[data-cm-live-stage="interval"]').count())) { await w.shot(`${label}-no-interval`); w.find('major', 'skip did not reach the interval', label); }
  await w.shot(`${label}-interval`, { full: true, maxH: 2600 });
  await audit(w, `${label}-interval`, 'body');
  if (sub) {
    const rows = page.locator('button').filter({ hasText: /rated .* fit/ });
    const before = await rows.count().catch(() => 0);
    res.subRowsAtBreak = before;
    if (before > 0) {
      await rows.first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      const n2 = await page.locator('button').filter({ hasText: /rated .* fit/ }).count();
      if (n2 > before) { await page.locator('button').filter({ hasText: /rated .* fit/ }).nth(before).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(600); res.sub = /ON AT THE BREAK/i.test(await bodyText(page)); await w.shot(`${label}-after-sub`, { full: true, maxH: 2600 }); }
    }
  }
  if (!await click(w, role(page, /^Second half$/), 'second half', 1200)) { w.find('major', 'no second half button', label); return res; }
  // second half: tap a player dot for a live change at some point
  if (sub) {
    await page.waitForTimeout(1500);
    const dot = page.locator('[data-cm-dot]').nth(6);
    if (await dot.count()) {
      await dot.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      const sheet = page.locator('[data-cm-live-sheet]');
      if (await sheet.count()) {
        await w.shot(`${label}-live-sheet`);
        await audit(w, `${label}-live-sheet`, 'body');
        const bench = page.locator('[data-cm-live-bench]');
        res.benchOffered = await bench.count();
        if (res.benchOffered) { await bench.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(800); res.liveSub = true; await w.shot(`${label}-after-live-sub`); }
        else await page.keyboard.press('Escape').catch(() => {});
      } else res.sheet = 'did not open';
    }
  }
  for (let i = 0; i < 5 && !(await role(page, /^Full report$/).count()); i++) {
    if (await role(page, /extra time/i).count()) { await click(w, role(page, /extra time/i), 'extra time', 1000); }
    await click(w, page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }), 'skip 2', 1200);
  }
  await w.shot(`${label}-fulltime-pitch`);
  if (!await click(w, role(page, /^Full report$/), 'full report', 1200)) { w.find('major', 'live match never reached Full report', label); await w.shot(`${label}-stuck`, { full: true }); return res; }
  await w.shot(`${label}-report`, { full: true, maxH: 3200 });
  await audit(w, `${label}-report`, 'body');
  res.reportText = (await bodyText(page)).slice(0, 1800);
  await click(w, role(page, /^Continue$/i), 'continue', 1500);
  w.step(`live ${label} done`, { res: { ...res, reportText: undefined }, save: await saveSummary(page) });
  return res;
}

export async function quickSim(w, label) {
  const { page } = w;
  if (!await click(w, page.locator('[data-cm-way="quick"]'), 'quick sim', 1500)) return false;
  await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ timeout: 10000 }).catch(() => {});
  await w.shot(`${label}-quick-report`, { full: true, maxH: 3200 });
  await audit(w, `${label}-quick-report`, 'body');
  const txt = (await bodyText(page)).slice(0, 1500);
  await click(w, role(page, /^Continue$/i), 'continue', 1500);
  return txt;
}

/* Fast forward through the calendar tile. which: 'Next match' | 'About a month' | 'To the window' | 'Rest of season' */
export async function fastForward(w, which) {
  const { page } = w;
  await toHub(w);
  if (!await click(w, tile(page, 'Calendar'), 'calendar tile', 900)) return 'no calendar tile';
  const b = page.locator('button:visible').filter({ has: page.locator('span', { hasText: new RegExp('^' + which + '$') }) });
  if (!await click(w, b, 'ff ' + which, 2500)) return 'no ff button ' + which;
  for (let i = 0; i < 60; i++) {
    const hd = await h1(page);
    if (hd === 'FULL TIME' || /SEASON \d+ COMPLETE|SACKED/.test(hd)) break;
    if (await page.getByRole('tab', { name: /^Home$/ }).count() && i > 3) break;
    await page.waitForTimeout(1000);
  }
  return await h1(page);
}
