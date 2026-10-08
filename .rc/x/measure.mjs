/* Round 1141 step 1: record what Google's real translator does to text nodes, as MutationObserver records.
   Network: a local one page server plus Google's translate hosts. Nothing of the site is loaded at all.
   node .tmp-fx/measure/measure.mjs <out.json> */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(HERE, `records-${Date.now()}.json`);
const TARGET = process.env.TL || 'pt';
const PAGE_JS = fs.readFileSync(path.join(HERE, process.env.PAGE || 'page.js'), 'utf8');
const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Translate measurement</title></head>
<body><div id="root"></div><script>${PAGE_JS}</script></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/m')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(HTML); return; }
  res.writeHead(404); res.end('no');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const ALLOW = [/^127\.0\.0\.1$/, /^localhost$/, /^translate\.google\.com$/, /^translate\.googleapis\.com$/, /^translate-pa\.googleapis\.com$/, /^www\.gstatic\.com$/];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 900 }, locale: 'pt-BR' });
await ctx.addInitScript(tl => { try { document.cookie = `googtrans=/en/${tl}; path=/`; } catch (e) { /* nothing */ } }, TARGET);
const hosts = { allowed: new Set(), blocked: new Set() };
await ctx.route('**/*', route => {
  let host = '';
  try { host = new URL(route.request().url()).hostname; } catch { /* data: */ }
  if (!host) return route.continue();
  if (ALLOW.some(re => re.test(host))) { hosts.allowed.add(host); return route.continue(); }
  hosts.blocked.add(host);
  return route.abort();
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
await page.goto(BASE + '/m', { waitUntil: 'load', timeout: 30000 });

const result = { target: TARGET, phases: {}, timings: {} };
const phase = async name => { await page.evaluate(n => { window.__phase = n; }, name); };
const snap = async name => { result.phases[name] = await page.evaluate(() => window.__snap()); };
const sleep = ms => page.waitForTimeout(ms);

await snap('before');
await phase('translate');
await page.evaluate(() => {
  const holder = document.createElement('div');
  holder.id = 'google_translate_element';
  document.body.appendChild(holder);
  window.googleTranslateElementInit = () => { new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element'); };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);
});
let translated = false;
try { await page.waitForFunction(() => document.querySelectorAll('#root font').length > 5, null, { timeout: 40000 }); translated = true; } catch { /* reported */ }
await sleep(3000);
await snap('translated');
result.translated = translated;
result.hosts = { allowed: [...hosts.allowed], blocked: [...hosts.blocked] };
if (!translated) {
  result.records = await page.evaluate(() => window.__rec);
  result.errors = errors;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(`RESULT measure: COULD NOT TRANSLATE (blocked ${[...hosts.blocked].join(', ')}; errors ${errors.slice(0, 2).join(' || ')})`);
  await browser.close(); server.close(); process.exit(2);
}

/* Wait until the text node T[key] has left the document again (a new swap), or give up. Returns ms or -1. */
const waitDetached = (key, limit = 8000) => page.evaluate(async ([k, lim]) => {
  const t = performance.now();
  while (performance.now() - t < lim) { if (!window.__T[k].isConnected) return Math.round(performance.now() - t); await new Promise(r => setTimeout(r, 20)); }
  return -1;
}, [key, limit]);

if (await page.evaluate(() => typeof window.__run === 'function')) {
  result.run = await page.evaluate(() => window.__run());
  result.phases = { ...result.phases, ...result.run.phases };
  delete result.run.phases;
  result.records = await page.evaluate(() => window.__rec);
  result.errors = errors;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  const last = result.phases.after;
  console.log(`run: ${JSON.stringify(result.run)}`);
  console.log(`final stats ${JSON.stringify(last.stats)}; page errors ${errors.length}: ${errors.slice(0, 3).join(' || ')}`);
  console.log(`RESULT measure2: wrote ${OUT}`);
  await browser.close(); server.close();
  console.log('measure done');
  process.exit(0);
}

/* 1. text added later */
await phase('later');
await page.evaluate(() => { document.getElementById('later').appendChild(window.__T.later = document.createTextNode('Choose position')); });
result.timings.later = await waitDetached('later');
await sleep(1500);
await snap('later');

/* 2. a write to a swapped (detached) node: the screen should not change */
await phase('write-detached');
await page.evaluate(() => { window.__T.write.nodeValue = 'Season two'; });
await sleep(2000);
await snap('write-detached');

/* 3. put it back where the wrapper is: how many swaps follow? */
await phase('restore');
await page.evaluate(() => window.__restore('write', ['write']));
result.timings.restore = await waitDetached('write');
await sleep(3000);
await snap('restore');

/* 4. the adjacent pair: change the number, restore both */
await phase('adj-restore');
await page.evaluate(() => { window.__T.adjB.nodeValue = '17'; window.__restore('adj', ['adjA', 'adjB']); });
result.timings.adjRestoreA = await waitDetached('adjA');
await sleep(3000);
await snap('adj-restore');

/* 5. the page removes a wrapper */
await phase('rm-wrapper');
await page.evaluate(() => { const p = document.getElementById('rm'); while (p.firstChild) p.removeChild(p.firstChild); });
await sleep(3000);
await snap('rm-wrapper');

/* 6. the page replaces a wrapper with fresh text */
await phase('rep-wrapper');
await page.evaluate(() => { const p = document.getElementById('rep'); const t = (window.__T.rep2 = document.createTextNode('A brand new sentence here')); p.replaceChild(t, p.firstChild); });
result.timings.rep = await waitDetached('rep2');
await sleep(1500);
await snap('rep-wrapper');

/* 7. a new element goes before a wrapper */
await phase('ins-before-wrapper');
await page.evaluate(() => { const p = document.getElementById('ins'); const i = document.createElement('i'); i.textContent = 'NEW WORDS'; p.insertBefore(i, p.firstChild); });
await sleep(3000);
await snap('ins-before-wrapper');

/* 8. a slow loop: 20 updates 400 ms apart, each one written then restored when the node is detached */
await phase('loop');
result.loop = await page.evaluate(async () => {
  let restores = 0;
  for (let i = 2; i <= 21; i++) {
    const b = window.__T.loopB;
    b.nodeValue = String(i);
    if (!b.isConnected || !window.__T.loopA.isConnected) { window.__restore('loop', ['loopA', 'loopB']); restores++; }
    await new Promise(r => setTimeout(r, 400));
  }
  return { restores };
});
await sleep(5000);
await snap('loop');

/* 9. a fast loop: 40 updates 50 ms apart (faster than the translator answers) */
await phase('race');
result.race = await page.evaluate(async () => {
  let restores = 0;
  for (let i = 2; i <= 41; i++) {
    const b = window.__T.raceB;
    b.nodeValue = String(i);
    if (!b.isConnected || !window.__T.raceA.isConnected) { window.__restore('race', ['raceA', 'raceB']); restores++; }
    await new Promise(r => setTimeout(r, 50));
  }
  return { restores };
});
await sleep(6000);
await snap('race');

/* 10. a number the translator may have left alone: a plain write while connected */
await phase('num-write');
await page.evaluate(() => { window.__T.num.nodeValue = '17'; window.__T.numwB.nodeValue = '5'; });
await sleep(3000);
await snap('num-write');

result.records = await page.evaluate(() => window.__rec);
result.errors = errors;
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
const byPhase = {};
for (const r of result.records) byPhase[r.phase] = (byPhase[r.phase] || 0) + 1;
console.log(`records by phase: ${JSON.stringify(byPhase)}`);
console.log(`timings ms: ${JSON.stringify(result.timings)} loop=${JSON.stringify(result.loop)} race=${JSON.stringify(result.race)}`);
console.log(`hosts allowed: ${[...hosts.allowed].join(', ')}; blocked: ${[...hosts.blocked].join(', ')}; page errors: ${errors.length}`);
console.log(`RESULT measure: wrote ${OUT}`);
await browser.close();
server.close();
console.log('measure done');
