/* Probe, not committed: how wide is every Player Bingo label word against the room a tile label has,
   at 320 and 390, for the current tile classes and a few candidates. Offline fictional rows only. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pw = (await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { answerConsent } = await import(pathToFileURL(path.join(root, 'scripts/lib/answerConsent.mjs')).href);
const build = path.join(root, 'dist');
const port = 4198, base = 'http://127.0.0.1:' + port;
const out = process.env.RC_OUT || path.join(root, '.sim-artifacts/probe-bingo');
mkdirSync(out, { recursive: true });
const src = readFileSync(path.join(root, 'src/lib/playerBingo.ts'), 'utf8');
const labels = [...src.matchAll(/label: '([^']*)'|label: "([^"]*)"/g)].map(m => m[1] ?? m[2]);
const words = [...new Set(labels.flatMap(l => l.split(/\s+/).flatMap(w => w.match(/[^-]+-?/g) ?? [])))];
const market = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, player_name: 'FixturePlayer' + String(i).padStart(3, '0'),
  nationality: ['Spain', 'France', 'Brazil', 'England'][i % 4], position: ['Goalkeeper', 'Centre-Back', 'Left Winger', 'Centre-Forward'][i % 4],
  club: ['Real Madrid', 'Manchester United', 'Liverpool FC', 'Chelsea FC'][Math.floor(i / 7) % 4], market_value_usd: [25e6, 40e6, 75e6, 120e6][i % 4],
  age: 18 + i % 18, year: 2026, goals: 10, assists: 5, matches: 40, yellow_cards: 2, red_cards: 0 }));
function marketRead(url) {
  const q = url.searchParams; let rows = [...market];
  if (q.has('player_name')) { const names = new Set(/^in\.\((.*)\)$/.exec(q.get('player_name'))[1].split(',').map(n => n.replace(/^"|"$/g, ''))); rows = rows.filter(p => names.has(p.player_name)); }
  const offset = Number(q.get('offset') || 0); rows = rows.slice(offset, offset + Number(q.get('limit') || 1000));
  const cols = (q.get('select') || '').split(',');
  return rows.map(p => Object.fromEntries(cols.map(k => [k, p[k]])));
}
const server = spawn(process.execPath, [path.join(root, 'scripts/lib/hostLikeServer.mjs'), build, String(port)], { cwd: root });
let log = ''; server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
const report = { words: words.length, labels: labels.length, viewports: [] };
let browser;
try {
  for (let i = 0; i < 50 && !log.includes('host-like server'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await pw.chromium.launch();
  for (const [width, height] of [[320, 780], [360, 780], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base) return route.fallback();
      if (url.hostname.endsWith('supabase.co') && url.pathname === '/rest/v1/player_market_values') {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': base, 'access-control-allow-headers': '*' }, body: '' });
        return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': base, 'content-type': 'application/json' }, body: JSON.stringify(marketRead(url)) });
      }
      if (url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': base, 'content-type': 'application/json' }, body: '[]' });
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(base + '/player-bingo', { waitUntil: 'domcontentloaded' });
    await answerConsent(page);
    await page.getByRole('button', { name: "Let's Play!", exact: true }).click();
    await page.locator('div.grid-cols-5 > button[title]').first().waitFor({ timeout: 30000 });
    const row = await page.evaluate(({ words }) => {
      const grid = [...document.querySelectorAll('div.grid-cols-5')].find(g => g.querySelector(':scope > button[title]'));
      const buttons = [...grid.querySelectorAll(':scope > button[title]')];
      const spans = buttons.map(b => b.querySelector(':scope > span:nth-of-type(2)'));
      const held = { grid: grid.className, button: buttons.map(b => b.className), span: spans.map(s => s.className) };
      const font = getComputedStyle(spans[0]);
      const measure = size => {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:' + font.fontFamily + ';font-weight:' + font.fontWeight + ';font-size:' + size + 'px';
        document.body.appendChild(probe);
        const w = words.map(word => { probe.textContent = word; return [word, Math.ceil(probe.getBoundingClientRect().width * 10) / 10]; });
        probe.remove(); return w.sort((a, b) => b[1] - a[1]);
      };
      const split = () => spans.reduce((n, s) => {
        const t = s.firstChild; if (!t || t.nodeType !== 3) return n;
        const text = t.textContent; let m; const re = /[^\s-]+-?/g;
        while ((m = re.exec(text))) {
          const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + 1);
          const r2 = document.createRange(); r2.setStart(t, m.index + m[0].length - 1); r2.setEnd(t, m.index + m[0].length);
          if (Math.abs(r.getBoundingClientRect().top - r2.getBoundingClientRect().top) > 2) n.push(m[0]);
        }
        return n;
      }, []);
      const candidates = {
        current: [null, null, null],
        px05: [null, b => b.replace(' p-1.5 ', ' px-0.5 py-1.5 '), null],
        px05gap1: [g => g.replace('gap-1.5', 'gap-1'), b => b.replace(' p-1.5 ', ' px-0.5 py-1.5 '), null],
        px05t8: [null, b => b.replace(' p-1.5 ', ' px-0.5 py-1.5 '), s => s.replace('text-[9px]', 'text-[8px]')],
        px05gap1t8: [g => g.replace('gap-1.5', 'gap-1'), b => b.replace(' p-1.5 ', ' px-0.5 py-1.5 '), s => s.replace('text-[9px]', 'text-[8px]')],
        hyph: [null, null, s => s + ' hyphens-auto'],
      };
      const result = { font: font.fontFamily + ' ' + font.fontWeight + ' ' + font.fontSize, w9: measure(9).slice(0, 14), w8: measure(8).slice(0, 14), cands: {} };
      document.documentElement.lang = document.documentElement.lang || 'en';
      for (const [name, [g, b, s]] of Object.entries(candidates)) {
        if (g) grid.className = g(held.grid);
        buttons.forEach((el, i) => { if (b) el.className = b(held.button[i]); });
        spans.forEach((el, i) => { if (s) el.className = s(held.span[i]); if (name === 'hyph') el.style.hyphens = 'auto'; });
        const room = Math.min(...spans.map(el => el.clientWidth));
        const heights = buttons.map(el => el.getBoundingClientRect().height);
        result.cands[name] = { room, tileW: Math.round(buttons[0].getBoundingClientRect().width * 10) / 10, maxTileH: Math.max(...heights), split: split(), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        grid.className = held.grid; buttons.forEach((el, i) => { el.className = held.button[i]; }); spans.forEach((el, i) => { el.className = held.span[i]; el.style.hyphens = ''; });
      }
      return result;
    }, { words });
    report.viewports.push({ width, ...row });
    await page.locator('div.grid-cols-5').first().screenshot({ path: path.join(out, 'board-' + width + '.png') }).catch(() => {});
    console.log(width + ': font ' + row.font + ' | widest at 9px ' + row.w9.slice(0, 6).map(([w, n]) => w + ' ' + n).join(', '));
    console.log(width + ': widest at 8px ' + row.w8.slice(0, 6).map(([w, n]) => w + ' ' + n).join(', '));
    for (const [name, c] of Object.entries(row.cands)) console.log(width + ' ' + name + ': room ' + c.room + ' tile ' + c.tileW + ' maxH ' + c.maxTileH + ' overflow ' + c.overflow + ' split ' + JSON.stringify(c.split));
    await context.close();
  }
  writeFileSync(path.join(out, 'probe-bingo.json'), JSON.stringify(report, null, 2));
  console.log('probe-bingo: done, ' + words.length + ' words from ' + labels.length + ' labels');
} finally {
  if (browser) await browser.close();
  server.kill();
}
