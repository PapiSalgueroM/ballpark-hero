/* QA hunt helpers for the GM games walk (qa-gm). Sent as .rc/x/gmlib.mjs. Not a repo file. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

export const { chromium } = pw;
export const BASE = process.env.BASE || 'http://localhost:4173';
export const OUT = process.env.RC_OUT || path.resolve('rc-out');
fs.mkdirSync(OUT, { recursive: true });

export const SIZES = [
  { tag: 'p', width: 390, height: 844 },
  { tag: 'd', width: 1280, height: 900 },
];

export function makeLog(game) {
  const rows = [];
  const file = path.join(OUT, `${game}.json`);
  const log = (kind, data) => {
    const row = { t: new Date().toISOString().slice(11, 19), kind, ...data };
    rows.push(row);
    const s = JSON.stringify(row);
    console.log(s.length > 400 ? s.slice(0, 400) + '...' : s);
    try { fs.writeFileSync(file, JSON.stringify(rows, null, 1)); } catch { /* keep going */ }
  };
  return log;
}

let shotCount = 0;
export async function shot(page, name, opts = {}) {
  shotCount += 1;
  if (shotCount > 70 && !opts.force) return null;
  const file = `${name}.jpg`;
  try {
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 55, fullPage: !!opts.full, timeout: 15000 });
  } catch (e) { return `shot failed: ${String(e).slice(0, 80)}`; }
  return file;
}

export async function newPage(browser, size, log) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, hasTouch: size.width < 700, isMobile: false });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googletagmanager|google-analytics|googlesyndication|doubleclick|adsbygoogle/, r => r.abort());
  page.on('pageerror', e => log('pageerror', { msg: String(e).slice(0, 300) }));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    if (/supabase|Failed to load resource|ERR_FAILED|net::|googletag|adsbygoogle|fetch/i.test(txt)) return;
    log('console', { msg: txt.slice(0, 300) });
  });
  return { ctx, page };
}

export async function settle(page, ms = 500) { await page.waitForTimeout(ms); }

/* First visit: the how to play dialog opens on its own. Shoot it, then close it with Escape. Consent: Essential only. */
export async function firstVisit(page, game, size, log) {
  await page.waitForTimeout(1500);
  const dialog = page.locator('[role="dialog"]');
  const n = await dialog.count();
  if (n) {
    await shot(page, `${game}-${size.tag}-00-help`);
    const helpText = (await dialog.first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    log('help', { open: true, text: helpText });
    const lets = page.locator('[role="dialog"] button:has-text("Let\'s Play")');
    if (await lets.count()) await lets.first().click().catch(() => {});
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    log('help', { open: false });
  }
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  if (await page.locator('[role="dialog"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
}

/* Every visible button in the board and any open dialog, tagged so it can be clicked by index. */
export async function buttons(page) {
  return page.evaluate(() => {
    const vis = el => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };
    const roots = [...document.querySelectorAll('#dukb-main, [role="dialog"]')];
    const list = [];
    let i = 0;
    for (const root of roots) {
      for (const b of root.querySelectorAll('button, [role="button"]')) {
        if (!vis(b)) continue;
        if (b.closest('footer, nav')) continue;
        const t = (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        b.setAttribute('data-qa', String(i));
        list.push({ i, t, dis: !!b.disabled || b.getAttribute('aria-disabled') === 'true' });
        i += 1;
      }
    }
    return list;
  });
}

/* Click the first enabled button matching the first rule that matches anything. rules: [[name, regex, within?]] */
export async function clickRule(page, rules, log, opts = {}) {
  const list = await buttons(page);
  for (const [name, re, within] of rules) {
    let cands = list.filter(b => !b.dis && re.test(b.t));
    if (within) {
      const inside = await page.evaluate(sel => [...document.querySelectorAll(`${sel} [data-qa]`)].map(e => Number(e.getAttribute('data-qa'))), within);
      cands = cands.filter(b => inside.includes(b.i));
    }
    if (!cands.length) continue;
    const pick = opts.pickLast ? cands[cands.length - 1] : cands[0];
    try {
      await page.locator(`[data-qa="${pick.i}"]`).first().click({ timeout: 6000 });
    } catch (e) {
      log('clickfail', { rule: name, text: pick.t.slice(0, 80), err: String(e).slice(0, 160) });
      return { name: 'clickfail', text: pick.t };
    }
    return { name, text: pick.t };
  }
  return null;
}

export async function mainText(page, max = 700) {
  const t = await page.locator('#dukb-main').innerText().catch(() => '');
  return t.replace(/\s+/g, ' ').slice(0, max);
}

/* Layout and text audit of what is drawn now. */
export async function audit(page, where, log, opts = {}) {
  const r = await page.evaluate(({ deep }) => {
    const W = window.innerWidth;
    const de = document.documentElement;
    const res = { overflowX: de.scrollWidth - W, wide: [], leaks: [], tinyTap: [], tap44: 0, tinyText: 0, tinyTextSample: [], text10: 0 };
    const clipped = el => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= W + 1) return true;
        }
      }
      return false;
    };
    const desc = el => {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      return `${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').slice(0, 3).join('.')} "${t}"`;
    };
    const roots = [...document.querySelectorAll('#dukb-main, [role="dialog"]')];
    for (const root of roots) {
      const all = root.querySelectorAll('*');
      for (const el of all) {
        const rc = el.getBoundingClientRect();
        if (rc.width < 1 || rc.height < 1) continue;
        if (rc.right > W + 1 && res.wide.length < 6 && !clipped(el)) res.wide.push({ el: desc(el), right: Math.round(rc.right) });
        if (el.matches('button, a[href], [role="button"], input, select')) {
          if (el.closest('footer, nav, [data-dukb-snapshot]')) continue;
          if (rc.height < 24 || rc.width < 24) { if (res.tinyTap.length < 8) res.tinyTap.push({ el: desc(el), w: Math.round(rc.width), h: Math.round(rc.height) }); }
          else if (rc.height < 44) res.tap44 += 1;
        }
        if (deep) {
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
          if (own) {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 10) { res.tinyText += 1; if (res.tinyTextSample.length < 4) res.tinyTextSample.push(`${fs}px ${desc(el)}`); }
            else if (fs < 11) res.text10 += 1;
          }
        }
      }
      const txt = root.innerText || '';
      const re = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b|\bnull\b|\$-\d|--\d/g;
      let m;
      while ((m = re.exec(txt)) && res.leaks.length < 6) res.leaks.push(txt.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\s+/g, ' '));
    }
    return res;
  }, { deep: !!opts.deep });
  const bad = r.overflowX > 1 || r.wide.length || r.leaks.length || r.tinyTap.length || r.tinyText;
  if (bad || opts.always) log('audit', { where, ...r });
  return r;
}

export function stamp() { return Date.now(); }
