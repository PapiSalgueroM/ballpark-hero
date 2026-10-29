/* Release BS fix BS-mix-3 walk (kit, not committed): every Player Bingo label, put in a real tile of the
   built board, keeps every word on one line at 320, 360, 375, 390 and 412, with the site font (Inter from
   Google Fonts, which the runner can reach) loaded. Offline fictional rows; supabase is answered locally.
   Usage: node walkBingoWords.mjs <build dir> <name>. Exit 1 when any word breaks or Inter did not load. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pw = (await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { answerConsent } = await import(pathToFileURL(path.join(root, 'scripts/lib/answerConsent.mjs')).href);
const build = path.resolve(root, process.argv[2] || 'dist'), name = process.argv[3] || 'head';
const port = 4199, base = 'http://127.0.0.1:' + port;
const out = path.join(process.env.RC_OUT || path.join(root, '.sim-artifacts'), 'bingo-words-' + name);
mkdirSync(out, { recursive: true });
const src = readFileSync(path.join(root, 'src/lib/playerBingo.ts'), 'utf8');
const clubs = [...src.matchAll(/^\s*\{ label: '([^']*)', keys:/gm)].map(m => 'Played for ' + m[1]);
/* nationality tiles are drawn from the pool (top 500 by value since 2024) and only a nation with
   MIN_TILE_SUPPORT players in it can reach a board. The committed market rows are the top 600 by value,
   a superset of that pool, so a nation is reachable here when it has at least HALF the support in them
   (a margin for drift). Every other nation is still walked and reported, apart, as unreachable. */
const minSupport = Number(/export const MIN_TILE_SUPPORT = (\d+);/.exec(src)?.[1]);
if (!(minSupport > 0)) throw new Error('MIN_TILE_SUPPORT not found in src/lib/playerBingo.ts');
const natCount = new Map();
for (const r of JSON.parse(readFileSync(path.join(root, 'scripts/data/auctionMarketRows.json'), 'utf8'))) {
  const n = String(r.nationality || '').split(/[/,]/)[0].trim(); if (n) natCount.set(n, (natCount.get(n) || 0) + 1);
}
const reach = Math.ceil(minSupport / 2);
const nations = [...natCount].filter(([, c]) => c >= reach).map(([n]) => 'From ' + n);
const unreachable = [...natCount].filter(([, c]) => c < reach).map(([n, c]) => ['From ' + n, c]);
const unreachCount = new Map(unreachable);
console.log('nations: ' + natCount.size + ' in the committed rows, ' + nations.length + ' reachable (>= ' + reach + ' of ' + minSupport + '), ' + unreachable.length + ' walked apart');
const labels = [...new Set([...src.matchAll(/label: '([^']*)'|label: "([^"]*)"/g)].map(m => m[1] ?? m[2]).concat(clubs, nations))];
const apart = unreachable.map(([l]) => l);
if (labels.length < 60) throw new Error('label list too short: ' + labels.length);
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
const report = { name, build, labels: labels.length, widths: [] };
let browser, failures = 0;
try {
  for (let i = 0; i < 50 && !log.includes('host-like server'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await pw.chromium.launch();
  for (const [width, height] of [[320, 780], [360, 780], [375, 812], [390, 844], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.fallback();
      const cors = { 'access-control-allow-origin': base, 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (url.hostname.endsWith('supabase.co') && route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (url.hostname.endsWith('supabase.co') && url.pathname === '/rest/v1/player_market_values') return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(marketRead(url)) });
      if (url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, headers: cors, body: '[]' });
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(base + '/player-bingo', { waitUntil: 'domcontentloaded' });
    await answerConsent(page);
    await page.getByRole('button', { name: "Let's Play!", exact: true }).click();
    await page.locator('div.grid-cols-5 > button[title]').first().waitFor({ timeout: 30000 });
    const inter = await page.evaluate(async () => { await document.fonts.ready; await document.fonts.load('600 9px Inter'); await document.fonts.load('600 8px Inter'); return document.fonts.check('600 9px Inter'); });
    const row = await page.evaluate(([labels, apart]) => {
      const grid = [...document.querySelectorAll('div.grid-cols-5')].find(g => g.querySelector(':scope > button[title]'));
      const buttons = [...grid.querySelectorAll(':scope > button[title]')];
      const spans = buttons.map(b => b.querySelector(':scope > span:nth-of-type(2)'));
      const splitIn = span => {
        const t = span.firstChild, words = []; if (!t || t.nodeType !== 3) return words;
        const re = /[^\s-]+-?/g;
        for (let m; (m = re.exec(t.textContent));) {
          const a = document.createRange(), b = document.createRange();
          a.setStart(t, m.index); a.setEnd(t, m.index + 1); b.setStart(t, m.index + m[0].length - 1); b.setEnd(t, m.index + m[0].length);
          if (Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) > 2) words.push(m[0]);
        }
        return words;
      };
      const board = spans.flatMap(splitIn);
      const held = spans[0].textContent, library = [];
      for (const label of labels) { spans[0].textContent = label; const w = splitIn(spans[0]); if (w.length) library.push(label + ': ' + w.join(' ')); }
      const apartSplit = [];
      for (const label of apart) { spans[0].textContent = label; const w = splitIn(spans[0]); if (w.length) apartSplit.push(label); }
      spans[0].textContent = held;
      const b = buttons[0].getBoundingClientRect();
      return { room: spans[0].clientWidth, tile: Math.round(b.width * 10) / 10, maxTileH: Math.max(...buttons.map(x => x.getBoundingClientRect().height)),
        fontSize: getComputedStyle(spans[0]).fontSize, board, library, apartSplit, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, [labels, apart]);
    report.widths.push({ width, inter, ...row });
    await page.locator('div.grid-cols-5').first().screenshot({ path: path.join(out, 'board-' + width + '.png') }).catch(() => {});
    const bad = !inter || row.board.length || row.library.length || row.overflow > 1;
    failures += bad ? 1 : 0;
    console.log((bad ? 'FAIL ' : 'ok   ') + width + ': Inter ' + inter + ', ' + row.fontSize + ', room ' + row.room + ' of tile ' + row.tile + ', tallest tile ' + row.maxTileH
      + ', board splits ' + JSON.stringify(row.board) + ', library labels split ' + row.library.length + (row.library.length ? ' ' + JSON.stringify(row.library.slice(0, 6)) : '')
      + ' | unreachable nations split ' + JSON.stringify(row.apartSplit.map(l => l + ' (' + unreachCount.get(l) + ' of 600)')));
    await context.close();
  }
} finally {
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  server.kill();
}
console.log('walkBingoWords ' + name + ': ' + (failures ? 'RED, ' + failures + ' width(s) break a word' : 'green, every word of all ' + labels.length + ' labels whole at 320, 360, 375, 390 and 412'));
process.exit(failures ? 1 : 0);
