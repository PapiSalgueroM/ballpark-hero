/* Round 1530 probe (never committed): what /hall-of-champions shows with each
   broken save of scripts/playCorruptSaves.mjs and the database aborted, and
   where every button on it comes from. Run from the repo root after a build:
   node .rc/x/probeHall.mjs */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const port = await new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port: p } = s.address(); s.close(() => res(p)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no server')), 20000); server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); res(); } }); });
const SAVE_KEY = (/SAVE_KEY\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'src/lib/hallOfChampions.ts'), 'utf8')) || [])[1];
console.log(`save key read from src/lib/hallOfChampions.ts: ${SAVE_KEY}`);
/* The two shapes playCorruptSaves writes for this row of continueSaves.ts (count at openWings), and no save at all. */
const saves = { shell: JSON.stringify({ openWings: 3 }), wrongtype: JSON.stringify({ openWings: {} }), none: null };
const browser = await pw.chromium.launch();
for (const [variant, raw] of Object.entries(saves)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const blocked = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); blocked.push(new URL(u).host); return r.abort(); });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  if (raw) await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, raw]);
  await page.goto(`${BASE}/hall-of-champions`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /couldn'?t load/i.test(document.body?.innerText ?? '') || document.querySelectorAll('#root button').length > 8, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const pathOf = el => { const out = []; for (let e = el; e && e.id !== 'root'; e = e.parentElement) { const a = [...e.attributes].filter(x => x.name.startsWith('data-') || x.name === 'id' || x.name === 'role').map(x => `${x.name}${x.value ? `=${x.value.slice(0, 20)}` : ''}`); out.push(`${e.tagName.toLowerCase()}${a.length ? `[${a.join(',')}]` : ''}`); } return out.reverse().join(' > '); };
    const buttons = [...document.querySelectorAll('#root button')].map(b => ({ text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), title: b.getAttribute('title'), aria: b.getAttribute('aria-label'), attrs: [...b.attributes].map(a => a.name).filter(n => n !== 'class'), visible: vis(b), disabled: b.disabled, chrome: !!b.closest('header,footer,nav,[role="dialog"],[role="alertdialog"]'), path: pathOf(b) }));
    const text = document.body?.innerText ?? '';
    const i = text.search(/couldn'?t load/i);
    return { errorLine: i >= 0 ? text.slice(i, i + 80) : null, buttons };
  });
  console.log(`\n== ${variant}: error line ${JSON.stringify(info.errorLine)}; hosts aborted ${[...new Set(blocked)].join(', ') || 'none'}`);
  for (const b of info.buttons) console.log(`  button ${JSON.stringify(b.text)} title=${JSON.stringify(b.title)} aria=${JSON.stringify(b.aria)} visible=${b.visible} disabled=${b.disabled} chrome=${b.chrome} attrs=[${b.attrs.join(',')}]\n     ${b.path}`);
  await page.screenshot({ path: path.join(OUT, `hall-${variant}.png`), fullPage: false });
  await ctx.close();
}
await browser.close();
server.kill();
console.log('\nprobeHall: done');
