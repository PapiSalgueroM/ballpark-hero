// Round 1542 weight probe (sent to a runner as .rc/x/weightFo.mjs): every JavaScript file /front-office fetches, gzipped,
// on the page load and then on the screens that load on demand (This week's tile, Standings' This season face). The
// database host is blocked. Usage: BASE=http://localhost:4173 LABEL=head node .rc/x/weightFo.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const LABEL = process.env.LABEL || 'build';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route(/supabase\.co/, r => r.abort());
await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
let phase = 'load';
const seen = new Map();
page.on('response', async r => {
  const url = r.url();
  if (!/\.js(\?|$)/.test(url) || seen.has(url)) return;
  seen.set(url, null);
  try { const body = await r.body(); seen.set(url, { phase, file: path.basename(url.split('?')[0]), raw: body.length, gz: zlib.gzipSync(body).length }); } catch { /* aborted */ }
});
await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
phase = 'start a franchise';
const consent = page.locator('button:has-text("Reject"), button:has-text("Decline"), button:has-text("Only necessary")');
if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
await page.locator('.grid button').first().click();
await page.waitForTimeout(2500);
phase = 'This week (the tile)';
await page.locator('button:has-text("This week")').first().click();
await page.waitForTimeout(2500);
phase = 'Play Week 1';
await page.locator('[data-press="week"]').first().click();
await page.waitForTimeout(2500);
phase = 'Standings, This season';
const hub = page.locator('button:has-text("Hub")').first();
if (await hub.count()) { await hub.click(); await page.waitForTimeout(400); }
await page.locator('button:has-text("Standings")').first().click();
await page.waitForTimeout(800);
await page.locator('[data-standings-faces] button:has-text("This season")').click().catch(() => {});
await page.waitForTimeout(2500);
await browser.close();
const rows = [...seen.values()].filter(Boolean);
const k = n => (n / 1024).toFixed(1);
const out = [];
for (const ph of [...new Set(rows.map(r => r.phase))]) {
  const list = rows.filter(r => r.phase === ph).sort((a, b) => b.gz - a.gz);
  out.push(`${LABEL} | ${ph}: ${list.length} files, ${k(list.reduce((a, r) => a + r.gz, 0))}K gz`);
  for (const r of list) out.push(`${LABEL} |   ${r.file} ${k(r.gz)}K gz (${k(r.raw)}K raw)`);
}
console.log(out.join('\n'));
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `weight-${LABEL}.txt`), out.join('\n') + '\n');
const load = rows.filter(r => r.phase === 'load').reduce((a, r) => a + r.gz, 0);
console.log(`weightFo ${LABEL}: /front-office load ${k(load)}K gz over ${rows.filter(r => r.phase === 'load').length} files`);
