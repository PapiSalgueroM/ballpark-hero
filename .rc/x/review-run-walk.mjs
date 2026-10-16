/* Review of Round 1338 (run lens): play the stale chunk wait the way a player meets it.
   Head is served at process.env.BASE (the #!serve build); the base build (origin/main) is served from dist-base
   by scripts/lib/hostLikeServer.mjs on a port of its own. Every other host is aborted (supabase.co included).
   The failed file is answered the way the real host answers a file that is gone after a deploy: index.html with
   a 200 (hostLikeServer does the same), not a 404. The reload's document request is held HOLD ms.
   S1 tap: / , then the Soccer Career tile is tapped while its route chunk is gone. head and base.
   S2 cold: /soccer-career loaded with its route chunk gone. head and base.
   S3 tap away: as S1, then 800 ms into the hold the player taps ANOTHER tile (a client side link) before the
      fresh page arrives. Does the reload still land? If it does not, the page flag stays up with no reload
      coming, and a later failure is probed with history.back() to the Soccer Career route. head only.
   Sizes 390x844 (touch) and 1280x900; reduced motion reduce and no-preference for S1 and S2.
   Pictures (jpg) and report.json go to RC_OUT. Exit 0 always unless it could not run (2): this walk records,
   the reviewer reads. */
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'review-walk');
fs.mkdirSync(OUT, { recursive: true });
const HOLD = 3000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SIZES = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const MOTIONS = ['reduce', 'no-preference'];

async function serveDir(dir) {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => e ? reject(e) : resolve(p)); });
  });
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), dir, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = ''; const t = setTimeout(() => reject(new Error('host did not start: ' + log)), 15000);
    server.stdout.on('data', d => { log += d; if (String(d).includes('host-like server:')) { clearTimeout(t); resolve(); } });
    server.stderr.on('data', d => { log += d; });
  });
  return { server, base: `http://127.0.0.1:${port}` };
}
function chunk(dir, re) {
  const m = fs.readdirSync(path.join(dir, 'assets')).filter(f => re.test(f));
  if (m.length !== 1) { console.error(`${m.length} files match ${re} in ${dir}`); process.exit(2); }
  return '/assets/' + m[0];
}

const SNAP = () => {
  const q = s => document.querySelector(s);
  let flag = null; try { flag = sessionStorage.getItem('dukb-reloaded-stale-chunk'); } catch { flag = 'blocked'; }
  return { path: location.pathname, doc: window.__docId, broke: document.body.innerText.includes('This page broke'),
    loading: !!q('[aria-label="Loading"]'), tiles: document.querySelectorAll('section[data-sport]').length,
    h1: (q('h1')?.textContent ?? '').trim().slice(0, 50), mainText: (q('#dukb-main') ?? document.body).innerText.length,
    flag, scrollY: Math.round(window.scrollY) };
};

async function run(browser, build, scen, size, motion) {
  const tag = `${scen}-${build.name}-${size.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const rec = { tag, docs: [], files: [], pageErrors: [], consoleErrors: [], live: [], notes: [] };
  const indexHtml = await (await fetch(build.base + '/')).text();
  const context = await browser.newContext({ viewport: size, isMobile: size.width < 1000, hasTouch: size.width < 1000, reducedMotion: motion,
    serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: build.base, localStorage: [{ name: 'cookie-consent', value: 'essential' }] }] } });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const t0 = Date.now(); let failing = scen === 'S2'; let held = null;
  await context.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin !== build.base) return route.abort('blockedbyclient');
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      const d = { n: rec.docs.length + 1, path: url.pathname, at: Date.now() - t0 }; rec.docs.push(d);
      if (d.n === 2 && !held) {
        failing = false; held = { start: Date.now() };
        await sleep(HOLD); held.end = Date.now();
        try { await route.continue(); d.continued = true; } catch (e) { d.continued = false; d.err = String(e).slice(0, 120); }
        return;
      }
      return route.continue();
    }
    if (url.pathname === build.career) {
      rec.files.push({ at: Date.now() - t0, action: failing ? 'html200' : 'served' });
      if (failing) return route.fulfill({ status: 200, contentType: 'text/html', body: indexHtml });
    }
    return route.continue();
  });
  page.on('pageerror', e => rec.pageErrors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') rec.consoleErrors.push(m.text().slice(0, 200)); });
  await context.exposeBinding('__rvSample', (source, s) => { if (source.frame === page.mainFrame()) rec.live.push({ ...s, t: Date.now() - t0 }); });
  await context.addInitScript({ content: `window.__docId = Math.random().toString(36).slice(2, 8); setInterval(() => { try { if (document.body) window.__rvSample((${SNAP.toString()})()); } catch (e) {} }, 100);` });
  const cdp = await context.newCDPSession(page);
  const shot = async name => {
    try { const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }); fs.writeFileSync(path.join(OUT, `${tag}-${name}.jpg`), Buffer.from(data, 'base64')); rec[name] = `${tag}-${name}.jpg`; }
    catch (e) { rec.notes.push('shot ' + name + ' failed ' + String(e).slice(0, 80)); }
  };
  return { rec, context, page, cdp, shot, t0, getHeld: () => held, setFailing: v => { failing = v; } };
}

async function waitHeld(h, ms = 15000) { const until = Date.now() + ms; while (!h.getHeld() && Date.now() < until) await sleep(50); return h.getHeld(); }
async function at(h, ms) { const w = h.getHeld().start + ms - Date.now(); if (w > 0) await sleep(w); }

async function scenario(browser, build, scen, size, motion) {
  const h = await run(browser, build, scen, size, motion); const { rec, page } = h;
  try {
    if (scen === 'S2') {
      await page.goto(build.base + '/soccer-career', { waitUntil: 'commit' });
    } else {
      await page.goto(build.base + '/', { waitUntil: 'load' });
      const tile = page.locator('section[data-sport] a[href="/soccer-career"]:visible').first();
      await tile.waitFor({ state: 'visible' }); await tile.scrollIntoViewIfNeeded(); await sleep(400);
      rec.before = await page.evaluate(SNAP);
      if (scen === 'S3') {
        rec.other = await page.evaluate(() => {
          const sc = document.querySelector('section[data-sport] a[href="/soccer-career"]').getBoundingClientRect();
          const c = [...document.querySelectorAll('section[data-sport] a[href^="/"]')].filter(a => a.getAttribute('href') !== '/soccer-career').map(a => ({ a, r: a.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 20 && r.top > 60 && r.bottom < innerHeight - 10 && r.left >= 0 && r.right <= innerWidth)
            .map(({ a, r }) => ({ href: a.getAttribute('href'), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), d: Math.hypot(r.top - sc.top, r.left - sc.left) }))
            .sort((p, q) => p.d - q.d);
          return c[0] ?? null;
        });
        if (!rec.other) rec.notes.push('no other tile in view');
      }
      h.setFailing(true); const docsBefore = rec.docs.length;
      if (size.width < 1000) await tile.tap(); else await tile.click();
      rec.tapDocs = rec.docs.length - docsBefore;
    }
    const held = await waitHeld(h);
    if (!held) { rec.notes.push('no reload document within 15 s'); await h.shot('noreload'); }
    else {
      if (scen === 'S3' && rec.other) { await at(h, 800); await page.mouse.click(rec.other.x, rec.other.y); rec.notes.push('tapped ' + rec.other.href + ' at ' + (Date.now() - held.start) + ' ms into the hold'); }
      await at(h, 1500); await h.shot('hold');
      if (scen === 'S3') { await sleep(HOLD + 4000 - 1500); }
      else await page.waitForEvent('load', { timeout: 20000 }).catch(e => rec.notes.push('no load ' + String(e).slice(0, 80)));
      await sleep(1500);
      rec.final = await page.evaluate(SNAP).catch(e => ({ err: String(e).slice(0, 80) }));
      await h.shot('after');
      const inHold = rec.live.filter(s => s.t >= held.start - h.t0 && s.t <= (held.end ?? Date.now()) - h.t0);
      rec.holdBroke = inHold.some(s => s.broke); rec.holdSamples = inHold.length;
      rec.holdStates = [...new Set(inHold.map(s => `${s.path}|tiles=${s.tiles}|loading=${s.loading}|broke=${s.broke}|y=${s.scrollY}`))].slice(0, 6);
      const docIds = [...new Set(rec.live.map(s => s.doc))]; rec.docIds = docIds;
      rec.reloaded = docIds.length >= 2;
      rec.waitMs = held.end ? held.end - h.t0 - (rec.files.find(f => f.action === 'html200')?.at ?? 0) : null;
      if (scen === 'S3' && !rec.reloaded) {
        /* the reload never landed: the page flag is up with no reload coming. A later failure: go back to the career route. */
        h.setFailing(true); const n0 = rec.docs.length; const c0 = rec.files.length;
        await page.evaluate(() => history.back()); await sleep(5000);
        rec.followup = { snap: await page.evaluate(SNAP).catch(e => ({ err: String(e).slice(0, 80) })), docs: rec.docs.length - n0, fileRequests: rec.files.length - c0 };
        await h.shot('followup');
        await page.evaluate(() => history.back()); await sleep(1500);
        await page.evaluate(() => { const a = document.querySelector('section[data-sport] a[href="/soccer-career"]'); if (a) a.click(); }); await sleep(5000);
        rec.followup2 = { snap: await page.evaluate(SNAP).catch(e => ({ err: String(e).slice(0, 80) })), docs: rec.docs.length - n0 };
        await h.shot('followup2');
      }
    }
  } catch (e) { rec.notes.push('stopped: ' + String(e).slice(0, 200)); }
  finally { await h.context.close(); }
  return rec;
}

const head = { name: 'head', base: (process.env.BASE || '').replace(/\/$/, ''), dir: path.join(ROOT, 'dist') };
if (!head.base) { console.error('no BASE'); process.exit(2); }
head.career = chunk(head.dir, /^SoccerCareer-[\w-]{8}\.js$/);
const builds = [head];
let baseServer = null;
if (fs.existsSync(path.join(ROOT, 'dist-base', 'assets'))) {
  const s = await serveDir(path.join(ROOT, 'dist-base')); baseServer = s.server;
  builds.push({ name: 'base', base: s.base, dir: path.join(ROOT, 'dist-base'), career: chunk(path.join(ROOT, 'dist-base'), /^SoccerCareer-[\w-]{8}\.js$/) });
} else console.log('no dist-base: base runs skipped');
const browser = await pw.chromium.launch();
const all = [];
try {
  for (const b of builds) for (const scen of ['S1', 'S2', 'S3']) {
    if (scen === 'S3' && b.name !== 'head') continue;
    for (const size of SIZES) for (const motion of (scen === 'S3' ? ['reduce'] : MOTIONS)) {
      const r = await scenario(browser, b, scen, size, motion); all.push(r);
      const pe = r.pageErrors.filter(t => !/Failed to fetch dynamically imported module/.test(t));
      console.log(`${r.tag}: docs=${r.docs.map(d => d.path + (d.continued === false ? '(cancelled)' : '')).join(' ')} reloaded=${r.reloaded} holdBroke=${r.holdBroke} samples=${r.holdSamples} pageErrors=${pe.length}${pe[0] ? ' [' + pe[0].slice(0, 90) + ']' : ''} wait=${r.waitMs} final=${r.final?.path}|tiles=${r.final?.tiles}|broke=${r.final?.broke}|h1=${r.final?.h1}`);
      if (r.holdStates?.length) console.log('   hold: ' + r.holdStates.join(' ; '));
      if (r.notes.length) console.log('   notes: ' + r.notes.join(' | '));
      if (r.followup) console.log('   followup back: ' + JSON.stringify(r.followup).slice(0, 300));
      if (r.followup2) console.log('   followup tile: ' + JSON.stringify(r.followup2).slice(0, 300));
    }
  }
} finally { await browser.close(); if (baseServer) baseServer.kill(); }
fs.writeFileSync(path.join(OUT, 'review-walk.json'), JSON.stringify(all.map(r => ({ ...r, live: r.live.length })), null, 1));
console.log(`review walk: ${all.length} runs recorded`);
process.exit(0);
