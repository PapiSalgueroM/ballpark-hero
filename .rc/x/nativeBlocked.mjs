// Scratch probe, sent to the runner as .rc/x/nativeBlocked.mjs (never committed).
// Does a REAL Chromium with site data blocked (the content setting, not a simulated getter)
// throw on window.localStorage, and does the site boot there with the seam?
// node .rc/x/nativeBlocked.mjs   (BASE from the environment)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const loader = pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href;
const { chromium } = (await import(loader)).default;
const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ?? '';
const results = [];

function probe({ raw }) {
  const d = Object.getOwnPropertyDescriptor(window, 'localStorage');
  let native = 'no throw';
  try { void window.localStorage; } catch (e) { native = `${e.name}: ${e.message}`; }
  let session = 'no throw';
  try { void window.sessionStorage; } catch (e) { session = `${e.name}: ${e.message}`; }
  window.__nativeProbe = { native, session, own: !!d, configurable: d ? d.configurable : null };
  if (raw) window.__DUKB_RAW_STORAGE__ = true;
}

for (const channel of [undefined, 'chromium']) {
  for (const raw of [false, true]) {
    for (const route of ['/soccer-career', '/footle', '/']) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-native-'));
      fs.mkdirSync(path.join(dir, 'Default'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'Default', 'Preferences'), JSON.stringify({
        profile: { default_content_setting_values: { cookies: 2 }, block_third_party_cookies: true, cookie_controls_mode: 1 },
      }));
      const row = { channel: channel || 'headless shell', raw, route };
      let ctx;
      try {
        ctx = await chromium.launchPersistentContext(dir, {
          headless: true,
          channel,
          viewport: { width: 390, height: 844 },
        });
        await ctx.addInitScript(probe, { raw });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0].slice(0, 160)));
        const origin = new URL(BASE).origin;
        await page.route('**/*', r => {
          let same = true;
          try { same = new URL(r.request().url()).origin === origin; } catch { same = true; }
          return same ? r.continue() : r.abort();
        });
        await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(6000);
        Object.assign(row, await page.evaluate(() => {
          const root = document.getElementById('root');
          const notice = document.querySelector('[data-dukb-storage-notice]');
          let now = 'no throw';
          try { now = Object.prototype.toString.call(window.localStorage); } catch (e) { now = `${e.name}`; }
          return {
            probe: window.__nativeProbe,
            buttons: root ? root.querySelectorAll('button').length : 0,
            snapshot: !!document.getElementById('dukb-snapshot'),
            boundary: [...document.querySelectorAll('h1,h2')].some(h => /This page broke/.test(h.textContent || '')),
            notice: notice ? notice.getAttribute('data-dukb-storage-notice') + ': ' + notice.textContent.trim() : null,
            storageNow: now,
            banner: !!document.querySelector('[role="region"][aria-label="Cookie choices"]'),
          };
        }));
        row.pageErrors = errors.slice(0, 3);
      } catch (e) {
        row.crash = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200);
      }
      if (ctx) await ctx.close().catch(() => {});
      results.push(row);
      console.log(JSON.stringify(row));
    }
  }
}
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'nativeBlocked.json'), JSON.stringify(results, null, 1)); }
const threw = results.filter(r => r.probe && /SecurityError/.test(r.probe.native)).length;
console.log(`nativeBlocked: ${results.length} loads, the real accessor threw SecurityError in ${threw}`);
