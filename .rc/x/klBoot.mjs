// keeper-libs reviewer (Release AU): the ORDINARY BOOT in a real browser on the merged build. A real save of all 21
// long games is planted (the Soccer Career and US saves carry PR216's plan fields when klRealFix ran first), then a
// page that is no long game is opened and every stored save is compared BYTE FOR BYTE. Then each long game's own route
// is opened once: no OTHER game's save may change (the game's own save may be written again by its game; that is
// printed, not judged). Reads no network. Exit 1 when a save changed that its own game did not write.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { buildRealSaves } from '../../scripts/lib/realSaves.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/kl-out');
fs.mkdirSync(OUT, { recursive: true });
const lines = [];
const say = s => { console.log(s); lines.push(s); };
const listSrc = fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8');
const ENTRIES = [];
for (const line of listSrc.split('\n')) {
  const a = line.indexOf("{ path: '"); const b = line.indexOf("', saveKey: '");
  if (a < 0 || b < 0) continue;
  const p = line.slice(a + 9, b); const rest = line.slice(b + 13); const key = rest.slice(0, rest.indexOf("'"));
  ENTRIES.push({ path: p, saveKey: key });
}
if (ENTRIES.length < 21) { console.error('klBoot: read ' + ENTRIES.length + ' long games, expected 21'); process.exit(2); }

const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const port = await freePort();
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.resolve(process.env.KL_DIST || path.join(ROOT, 'dist')), String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('server did not start')), 20000); server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } }); });
const SITE = 'http://127.0.0.1:' + port;
const { fleet } = await buildRealSaves({ root: ROOT, tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), 'klBoot-')), seeds: [0] });
const planted = Object.fromEntries(ENTRIES.map(e => [e.saveKey, fleet[e.path][0]]));
say('klBoot: ' + ENTRIES.length + ' real saves planted, ' + Object.values(planted).reduce((n, v) => n + v.length, 0) + ' characters; soccer save holds programme: ' + planted.soccerCareerSave.includes('"programme"') + '; nfl save holds programme: ' + planted['nfl-my-career-save-v1'].includes('"programme"'));

const browser = await chromium.launch();
let wrong = 0;
async function visit(route, own) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => (r.request().url().startsWith(SITE) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(SITE + '/robots.txt');
  await page.evaluate(m => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); for (const [k, v] of Object.entries(m)) localStorage.setItem(k, v); }, planted);
  await page.goto(SITE + route, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const after = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  await ctx.close();
  const changed = Object.keys(planted).filter(k => after[k] !== planted[k]);
  const extra = Object.keys(after).filter(k => !(k in planted) && k !== 'cookie-consent');
  const aside = extra.filter(k => k.includes('.broken-') || k === 'dukb-save-pending' || k === 'dukb-set-aside-seen');
  const others = changed.filter(k => k !== own);
  if (others.length || aside.length) wrong += 1;
  say('  ' + route.padEnd(22) + (changed.length === 0 ? 'all 21 saves byte equal' : (others.length ? 'CHANGED another game: ' + others.join(', ') + '; ' : '') + (changed.includes(own) ? 'its own save was written again by the game' : '')) + (aside.length ? ' ; KEEPER KEYS APPEARED: ' + aside.join(', ') : '') + ' ; ' + extra.length + ' other new key(s)');
  return { changed, extra };
}
say('pages that are no long game:');
for (const r of ['/', '/whats-new', '/soccer-grid']) await visit(r, null);
say('each long game on its own route:');
for (const e of ENTRIES) await visit(e.path, e.saveKey);
await browser.close(); server.kill();
say(wrong === 0 ? 'klBoot: green. An ordinary visit changed no save but the visited game\'s own, and the keeper wrote nothing.' : 'klBoot: RED on ' + wrong + ' visit(s).');
fs.writeFileSync(path.join(OUT, 'kl-boot.txt'), lines.join('\n') + '\n');
process.exit(wrong === 0 ? 0 : 1);
