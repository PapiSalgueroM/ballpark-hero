// keeper-libs reviewer (Release AU): where the three libraries and the keeper land in a build of the merged head,
// and which pages download them. Needs dist/ (a plain vite build) and Chromium. Reads no network.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const DIST = path.resolve(process.env.KL_DIST || path.join(ROOT, 'dist'));
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/kl-out');
fs.mkdirSync(OUT, { recursive: true });
const TAG = process.env.KL_TAG || 'head';
const lines = [];
const say = s => { console.log(s); lines.push(s); };

/* A string of each library that a minifier keeps whole. `absentOk`: nothing mounts it, so it may be in no chunk. */
const MARKS = {
  'keeper (saveKeeper.ts)': ['dukb-save-pending'],
  'keeper card (BrokenSaveRestore.tsx)': ['Put that save back'],
  'law score+story (gameLaws)': [' The kick after is no good.', 'Q1 15:00'],
  'presenter (LotteryReveal.tsx)': ['data-lottery-continue'],
  'presenter lib (lotteryReveal.ts)': ['lr-face'],
  'draft order rules (data/gmDraftOrder/rules.ts)': ['Drawings decide the first four picks.', 'Clubs with identical records are put in order by random drawings.'],
  'lottery night (gmLotteryNight.ts)': ['This night was drawn on its own chances:'],
  'GM lottery card (GmLotteryCard.tsx)': ['data-gm-lottery'],
  'GM draft night (gmDraftNight.ts)': ['Every pick of the draft is in.'],
  'desk host (gmDeskHost.ts)': ['Next year hangs on your old club', 'This desk does not pay XP yet.'],
  'draft night mount (DraftNightSequence.tsx, Round 1220)': ['data-night-board'],
};
const assets = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.js'));
const text = Object.fromEntries(assets.map(f => [f, fs.readFileSync(path.join(DIST, 'assets', f), 'utf8')]));
const gz = f => zlib.gzipSync(Buffer.from(text[f]), { level: 9 }).length;
say('[' + TAG + '] ' + assets.length + ' js chunks in ' + DIST);
const home = {};
for (const [what, marks] of Object.entries(MARKS)) {
  const hits = assets.filter(f => marks.some(m => text[f].includes(m)));
  home[what] = hits;
  say('  ' + what + ': ' + (hits.length ? hits.map(f => f + ' (' + (gz(f) / 1024).toFixed(1) + 'K gz, ' + (text[f].length / 1024).toFixed(0) + 'K raw)').join(', ') : 'IN NO CHUNK'));
}
const watched = [...new Set(Object.values(home).flat())];

const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const port = await freePort();
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('server did not start')), 20000); server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } }); });
const SITE = 'http://127.0.0.1:' + port;
const ROUTES = ['/', '/front-office', '/nba-front-office', '/mlb-front-office', '/nhl-front-office', '/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career', '/soccer-career', '/club-manager', '/stadium-tycoon', '/minefield'];
const browser = await chromium.launch();
const table = {};
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => (r.request().url().startsWith(SITE) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const got = new Set();
  page.on('response', r => { const u = r.url(); if (u.startsWith(SITE + '/assets/') && u.endsWith('.js')) got.add(u.slice((SITE + '/assets/').length)); });
  await page.goto(SITE + '/robots.txt');
  await page.evaluate(() => localStorage.setItem('cookie-consent', 'essential'));
  await page.goto(SITE + route, { waitUntil: 'load' });
  await page.waitForTimeout(4500);
  const list = [...got].filter(f => text[f] !== undefined);
  const total = list.reduce((n, f) => n + gz(f), 0);
  table[route] = { total, n: list.length, watched: watched.filter(f => got.has(f)) };
  say('  ' + route.padEnd(20) + (total / 1024).toFixed(1).padStart(7) + 'K gz in ' + String(list.length).padStart(3) + ' chunks; of the watched chunks it downloads: ' + (table[route].watched.join(', ') || 'none'));
  await ctx.close();
}
await browser.close(); server.kill();
say('  which library each page got: ');
for (const [what, hits] of Object.entries(home)) say('    ' + what + ': ' + (ROUTES.filter(r => hits.some(f => table[r].watched.includes(f))).join(' ') || 'no page of the list'));
fs.writeFileSync(path.join(OUT, 'kl-chunks-' + TAG + '.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'kl-chunks-' + TAG + '.json'), JSON.stringify({ home, table }, null, 1));
process.exit(0);
