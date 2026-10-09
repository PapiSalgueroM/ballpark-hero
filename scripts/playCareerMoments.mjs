/* Round 1107: the two career scenes Soccer Career mounts, walked in Chromium
   on the BUILT site (needs `npm run build`; dist is served the way the host
   serves it, by scripts/lib/hostLikeServer.mjs, on port 4577). Every request
   to supabase.co is refused and counted, the cookie banner is answered
   "essential" before the page runs, and the built files are never written.

   The saves come from the real engine in node (scripts/lib/careerMomentSaves.mjs)
   and are handed over through localStorage once per tab, so a reload keeps
   the page's own save:
     signing   seed 1107: a career on its first contract offers, with a look.
               The first offer is Liverpool, 3 years.
     trophy    seed 1 (the first seed tried): Brazil win the Copa América in
               2028 and he finishes 20th in the award vote. The save sits on
               the awards night, ONE press before the tournament card, so
               this walk leans on Round 1107's settle rule by design: a save
               that holds a pending tournament but is not on its card must
               still play it. If 300 seeds give no such save the harness
               fails with that sentence.

   Two walks, each at 390 by 844 with touch and at 1280 by 900:
     S  the signing. "Review contract with <club>", then "Sign contract".
     T  the trophy. The awards card's one "Continue →"; the tournament card
        must then be on the page.

   CHECKS (ids print as <walk><width>:<check>, for example T390:P1)
     served  each of the two bind ids is in the built JavaScript exactly once.
     P1 it mounts and plays. The scene is there under its bind id and goes
        live within 20 seconds (many builders share a machine: a timeout is
        not a red, run it again alone). T also: one cup whose lift is 0.9 s
        long (a still card reports 0.001 ms) and has really started (read
        on the first frame, from the third to the sixtieth after the scene
        went live, on which the lift has moved off zero).
     P2 the facts are the save's, the one the page wrote after the press. S:
        the title, the terms line and the scene's number are the save's club,
        years and wage (formatted in node by the same engine), and the scene
        holds one avatar whose shirt is the save's club colour, which is also
        the scene's colour. T: the title is the pending tournament's name and
        year, on a save that says Winner and sits on the card.
     P3 it holds. Six seconds on: the same words, the same rectangle, and
        nothing in the scene still running (playState "running"; a finished
        slam keeps its name for as long as it is mounted, so the reduced
        motion measure would call every healthy scene a failure here).
     P4 once. S: the attributes screen and Back, the scene is there and
        still; a reload, no slip and no scene. T: the Your Games tile and
        Back, still with no confetti; a reload, the card is back (the save
        sits on it), still, no confetti, nothing running.
     P5 the save is byte equal. From 500 ms after the scene appeared (the
        page's own write for the press has landed) to the end of P4's Back:
        no write to soccerCareerSave and the same string. A write to another
        key in that window is printed by name and counted as nothing.
     P6 no jump, in four measurements, none about the page's own reveal
        scroll (it is smooth and starts two frames after the card lands, and
        the walk scrolls to a button before pressing it): (a) the reference
        is taken only once scrollY has been the same for 10 frames and the
        scene is live; (b) 2.5 s later scrollY, the page's height and the
        scene's rectangle are the same; (c) on every frame from the first one
        the scene exists until it is at rest its own width and height never
        change; (d) the page is never wider than its window and the scene
        sits inside the window's width.
     P7 clean. No console error and no page error. Resources that did not
        load (refused requests) are printed and not counted.

   CONTROLS, PLAY_CAREER_MOMENTS_CONTROL=<name>. Each is applied to what is
   SERVED or inside the page, never to a built file, and refuses to run when
   it could not fire. A control run exits 0 ONLY when exactly its own check
   went red, at both sizes of every walk it names, and its fault really
   fired there. In a list of control runs every line should read exit 0.
     unbind-signing  "sc-signing" is served as "sc-signing-x"        S: P1
     unbind-trophy   "sc-intl-trophy" is served as "...-x"           T: P1
     wrongfact       one digit of the scene's number (S) or of its
                     title (T) is rewritten before P2 reads it        P2
     vanish          the scene is hidden (display none) before P3's
                     wait. Hidden, never detached: React owns the node
                     and would throw on its next render of that card  P3
     replayed        after Back the scene's state is set to live      P4
     savewrite       one second after the scene appears the save is
                     written back with a space on the end             P5
     jump            one second into P6's window the page is
                     scrolled by 40 px                                P6
     noisy           one console.error after the scene appears        P7
   Closing line: "playCareerMoments: <n> checks, <f> failed".
   Seen on 2026-10-08 on the GitHub runner, on the build of 269bfecd: clean,
   34 checks and 0 failed, three runs; each of the eight controls red on its
   own check at both sizes of every walk it names and green everywhere else,
   its fault counted twice per walk (once per size).

   CAREER_MOMENTS_SHOTS=<folder> also saves a screenshot of each scene mid
   play and at rest at both sizes, and every run prints the at rest
   rectangles of the card, the art and the number pill. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { loadEngine, signingSave, wonTournamentSave, MAX_SEEDS } from './lib/careerMomentSaves.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');
const PORT = Number(process.env.PORT || 4577);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.CAREER_MOMENTS_SHOTS ? path.resolve(process.env.CAREER_MOMENTS_SHOTS) : '';
const SAVE_KEY = 'soccerCareerSave';
const WAIT = 20000;

/* Each control: the check it must turn red, and the walks it must turn it red in. */
const CONTROLS = {
  'unbind-signing': { check: 'P1', walks: ['S'] },
  'unbind-trophy': { check: 'P1', walks: ['T'] },
  wrongfact: { check: 'P2', walks: ['S', 'T'] },
  vanish: { check: 'P3', walks: ['S', 'T'] },
  replayed: { check: 'P4', walks: ['S', 'T'] },
  savewrite: { check: 'P5', walks: ['S', 'T'] },
  jump: { check: 'P6', walks: ['S', 'T'] },
  noisy: { check: 'P7', walks: ['S', 'T'] },
};
const CONTROL = process.env.PLAY_CAREER_MOMENTS_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.log(`playCareerMoments: unknown control "${CONTROL}". Known: ${Object.keys(CONTROLS).join(', ')}`);
  process.exit(2);
}

let checks = 0;
const red = [];
/** One check: id is "<walk><width>:<P>", for example "S390:P2". */
function check(id, ok, label) {
  checks += 1;
  if (ok) console.log(`ok   ${id} ${label}`);
  else { red.push(id); console.log(`FAIL ${id} ${label}`); }
  return ok;
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('playCareerMoments: dist/index.html is missing, run npm run build first. NOT CHECKED.');
  process.exit(1);
}
/* The two bind ids, each exactly once in everything the build serves. A
   control that rewrites one refuses to run on any other count. */
const jsFiles = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const holders = id => jsFiles.map(f => [f, fs.readFileSync(path.join(ASSETS, f), 'utf8').split(`"${id}"`).length - 1]).filter(([, n]) => n > 0);
const swaps = new Map();
for (const [id, control] of [['sc-signing', 'unbind-signing'], ['sc-intl-trophy', 'unbind-trophy']]) {
  const held = holders(id);
  const total = held.reduce((n, [, c]) => n + c, 0);
  check(`served:${id}`, total === 1, `the bind id "${id}" is in the served JavaScript ${total} time(s), in ${held.map(([f]) => f).join(', ') || 'no chunk'} (the walk finds its scene by it, so it must be there exactly once)`);
  if (CONTROL !== control) continue;
  if (total !== 1) { console.log(`playCareerMoments: control ${CONTROL} refused, "${id}" must be in the served JavaScript exactly once`); process.exit(2); }
  const file = held[0][0];
  swaps.set(file, fs.readFileSync(path.join(ASSETS, file), 'utf8').split(`"${id}"`).join(`"${id}-x"`));
  console.log(`CONTROL ${CONTROL}: ${file} is served with "${id}" written as "${id}-x"`);
}

/* The saves, from the real engine. */
const SB = await loadEngine(ROOT);
const sc = SB.soccer;
const signing = signingSave(SB);
const won = wonTournamentSave(SB);
if (!signing) { console.log('playCareerMoments: FAIL, the engine gave no career on its first contract offers'); process.exit(1); }
if (!won.save) { console.log(`playCareerMoments: FAIL, ${MAX_SEEDS} seeds give no save one press before a won tournament card`); process.exit(1); }
console.log(`saves: signing seed ${signing.seed}, first offer ${signing.club} (${signing.after.years} years at ${signing.after.wage}); won tournament seed ${won.seed} of ${won.tried} tried, ${won.name} ${won.year} with ${won.nation}, award rank ${won.rank}`);

/* ---------- what runs inside the page, before any page code ---------- */
/* Hands the save over once per tab (a reload keeps the page's own save),
   answers the cookie banner, then keeps four ledgers on window.__cmo: every
   localStorage write with its time, the scene's size on every frame while
   sampling is on, the widest the page ever was against its window, and what
   the cup was doing on the frames the scene went live. The faults of the
   control runs live here too, each counting that it really fired. */
const instrument = ({ save, saveKey, control }) => {
  try {
    if (!sessionStorage.getItem('cmo-walk')) {
      sessionStorage.setItem('cmo-walk', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(saveKey, save);
    }
  } catch { /* private mode: the walk fails on its first check */ }
  const log = { writes: [], sceneAt: null, sampling: true, sizes: [], frames: 0, widest: 0, live: null, fired: 0 };
  window.__cmo = log;
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const real = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      if (this === window.localStorage) log.writes.push({ t: performance.now(), method, key: method === 'clear' ? '*' : String(args[0]) });
      return real.apply(this, args);
    };
  }
  const scene = () => document.querySelector('[data-career-moment]');
  let liveFrames = 0;
  const frame = () => {
    const el = document.documentElement ? scene() : null;
    if (document.documentElement) log.widest = Math.max(log.widest, document.documentElement.scrollWidth - window.innerWidth);
    if (el) {
      if (log.sceneAt === null) {
        log.sceneAt = performance.now();
        if (control === 'savewrite') {
          setTimeout(() => {
            const value = localStorage.getItem(saveKey);
            if (value !== null) { localStorage.setItem(saveKey, `${value} `); log.fired += 1; }
          }, 1000);
        }
        if (control === 'noisy') { console.error('playCareerMoments control: one console error after the scene appeared'); log.fired += 1; }
      }
      if (log.sampling) {
        const r = el.getBoundingClientRect();
        const size = `${r.width.toFixed(2)}x${r.height.toFixed(2)}`;
        if (log.sizes[log.sizes.length - 1] !== size) log.sizes.push(size);
        log.frames += 1;
      }
      if (log.live === null && el.getAttribute('data-cmo-state') === 'live') {
        const cup = el.querySelector('.victory-cup');
        log.live = { at: performance.now(), cupDuration: cup ? getComputedStyle(cup).animationDuration : null, cup: null };
        liveFrames = 0;
      }
      if (log.live && log.live.cup === null) {
        /* Read once the lift has moved off zero, three frames in at the
           earliest and sixty at the latest. A fixed frame count read 0 ms on
           a loaded machine once; a cup that never starts still reads 0 here. */
        liveFrames += 1;
        const cup = el.querySelector('.victory-cup');
        const now = cup ? cup.getAnimations().map(a => ({ state: a.playState, time: Number(a.currentTime) })) : [];
        if (liveFrames >= 3 && (!cup || now.some(a => a.time > 0) || liveFrames >= 60)) { log.live.cup = now; log.live.frames = liveFrames; }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  /* The faults a control run arms at the moment its own check is about to read. */
  log.fault = name => {
    const el = scene();
    if (name !== control || !el) return;
    if (name === 'wrongfact') {
      const target = el.querySelector('[data-cmo-number-final]') || el.querySelector('h3');
      const before = target.textContent;
      target.textContent = before.replace(/\d/, d => String((Number(d) + 1) % 10));
      if (target.textContent !== before) log.fired += 1;
    }
    if (name === 'vanish') {
      /* Hidden, not detached: React still owns this node, and taking a node
         it owns out of the page makes its next render of that card throw,
         which would turn the rest of the walk red for the wrong reason. */
      el.style.display = 'none';
      log.fired += 1;
    }
    if (name === 'replayed') { el.setAttribute('data-cmo-state', 'live'); log.fired += 1; }
    if (name === 'jump') {
      setTimeout(() => {
        const y = window.scrollY;
        window.scrollTo({ top: y + 40, behavior: 'instant' });
        if (window.scrollY === y) window.scrollTo({ top: y - 40, behavior: 'instant' });
        if (window.scrollY !== y) log.fired += 1;
      }, 1000);
    }
  };
};

/* ---------- the served site ---------- */
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
let up = false;
for (let i = 0; i < 60 && !up; i += 1) {
  await new Promise(r => setTimeout(r, 500));
  up = await new Promise(done => { const q = http.get(`${BASE}/`, res => { res.resume(); done(true); }); q.on('error', () => done(false)); q.setTimeout(2000, () => { q.destroy(); done(false); }); });
}
if (!up) { console.log('playCareerMoments: the local server never answered. NOT CHECKED.'); try { server.kill(); } catch { /* gone */ } process.exit(1); }
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

const VIEWPORTS = [{ width: 390, height: 844, hasTouch: true }, { width: 1280, height: 900, hasTouch: false }];
let blocked = 0;
const fired = { S: 0, T: 0 };

async function open(save, view) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, hasTouch: view.hasTouch, reducedMotion: 'no-preference' });
  await ctx.addInitScript(instrument, { save, saveKey: SAVE_KEY, control: CONTROL });
  await ctx.route('**://*.supabase.co/**', r => { blocked += 1; return r.abort(); });
  for (const [file, text] of swaps) await ctx.route(`**/assets/${file}`, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: text }));
  const page = await ctx.newPage();
  page.setDefaultTimeout(WAIT);
  const trouble = [];
  let unloaded = 0;
  page.on('pageerror', e => trouble.push(`page error: ${String(e).slice(0, 160)}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) { unloaded += 1; return; }
    trouble.push(`console error: ${m.text().slice(0, 160)}`);
  });
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return { ctx, page, trouble, unloaded: () => unloaded };
}
/* Small readers, all on the scene the selector names. */
const sceneInfo = (page, selector) => page.evaluate(sel => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const copy = el.cloneNode(true);
  copy.querySelectorAll('style, svg, [data-cmo-number-old]').forEach(n => n.remove());
  const r = el.getBoundingClientRect();
  const box = n => { if (!n) return null; const b = n.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  return {
    state: el.getAttribute('data-cmo-state'),
    text: (copy.textContent || '').replace(/\s+/g, ' ').trim(),
    title: el.querySelector('h3')?.textContent ?? '',
    line: el.querySelector('[data-cmo-beat="line"]')?.textContent ?? '',
    number: el.querySelector('[data-cmo-number-final]')?.textContent ?? '',
    rect: [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100).join(','),
    left: r.left, right: r.right,
    running: el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length,
    cups: el.querySelectorAll('.victory-cup').length,
    avatars: el.querySelectorAll('svg[aria-label="Player avatar"]').length,
    shirt: el.querySelector('svg[aria-label="Player avatar"] path')?.getAttribute('fill') ?? '',
    ink: el.style.getPropertyValue('--cmo-ink'),
    boxes: { card: box(el), art: box(el.querySelector('[data-cmo-beat="art"]') || el.querySelector('.victory-art')), pill: box(el.querySelector('[data-cmo-number]')) },
    scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight, innerWidth: window.innerWidth,
    confetti: document.querySelectorAll('.animate-confetti-fall').length,
  };
}, selector);
const stateSoon = async (page, selector, state) => {
  await page.locator(`${selector}[data-cmo-state="${state}"]`).first().waitFor({ timeout: WAIT }).catch(() => undefined);
  return (await sceneInfo(page, selector))?.state ?? 'no scene';
};
/* The page has stopped scrolling (the same scrollY on 10 frames in a row,
   100 frames at most) and the scene is live. The page's own reveal scroll is
   smooth and starts two frames after the card lands, so nothing about the
   page's position is measured before this. */
const stillAndLive = (page, selector) => page.evaluate(sel => new Promise(resolve => {
  let frames = 0, stable = 0, last = window.scrollY;
  const tick = () => {
    const el = document.querySelector(sel);
    const live = !!el && el.getAttribute('data-cmo-state') === 'live';
    stable = Math.abs(last - window.scrollY) < 0.1 ? stable + 1 : 0;
    last = window.scrollY;
    frames += 1;
    if (frames >= 100 || (stable >= 10 && live)) resolve({ frames, stable, live });
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), selector);
const atRest = async (page, selector) => {
  for (let i = 0; i < 40; i += 1) {
    const info = await sceneInfo(page, selector);
    if (info && info.running === 0) return true;
    await page.waitForTimeout(200);
  }
  return false;
};
const arm = (page, name) => (CONTROL === name ? page.evaluate(n => window.__cmo.fault(n), name) : Promise.resolve());

/* ---------- one walk at one viewport ---------- */
async function runWalk(w, view) {
  const id = p => `${w.key}${view.width}:${p}`;
  const { ctx, page, trouble, unloaded } = await open(w.save, view);
  try {
    /* P1. It mounts, and it plays. */
    const stuck = await w.reach(page);
    const mounted = !stuck && await page.locator(w.selector).first().waitFor({ timeout: WAIT }).then(() => true, () => false);
    const state = mounted ? await stateSoon(page, w.selector, 'live') : 'no scene';
    if (mounted) await page.waitForFunction(() => window.__cmo.live && window.__cmo.live.cup !== null, null, { timeout: 5000 }).catch(() => undefined);
    const live = mounted ? await page.evaluate(() => window.__cmo.live) : null;
    const first = mounted ? await sceneInfo(page, w.selector) : null;
    const p1 = w.p1(first, live);
    if (!check(id('P1'), mounted && state === 'live' && p1.ok, stuck || `the scene is on the page as ${w.selector} and went ${state}; ${p1.label}`)) {
      console.log(`     ${id('P2')} to P7 not walked: there is no played scene to walk`);
      return;
    }
    if (SHOTS) {
      /* Mid play: a little over half a second after the scene went live. */
      await page.waitForFunction(() => performance.now() - window.__cmo.live.at >= 550, null, { timeout: 5000 }).catch(() => undefined);
      await page.screenshot({ path: path.join(SHOTS, `${w.name}-${view.width}-mid.png`) });
    }
    await page.waitForFunction(() => performance.now() - window.__cmo.sceneAt >= 500, null, { timeout: 5000 });
    const from = await page.evaluate(key => ({ t: performance.now(), save: localStorage.getItem(key) }), SAVE_KEY);

    /* P6. No jump. Nothing here is about the page's own reveal scroll: the
       reference is taken once that scroll has ended. */
    const calm = await stillAndLive(page, w.selector);
    const ref = await sceneInfo(page, w.selector);
    await arm(page, 'jump');
    await page.waitForTimeout(2500);
    const later = await sceneInfo(page, w.selector);
    const rested = await atRest(page, w.selector);
    const sampled = await page.evaluate(() => { window.__cmo.sampling = false; return { sizes: window.__cmo.sizes, frames: window.__cmo.frames, widest: window.__cmo.widest }; });
    const held = !!ref && !!later && later.scrollY === ref.scrollY && later.scrollHeight === ref.scrollHeight && later.rect === ref.rect;
    const sized = sampled.sizes.length === 1 && sampled.frames >= 10;
    const fits = !!later && sampled.widest <= 0 && later.left >= 0 && later.right <= later.innerWidth;
    check(id('P6'), calm.live && rested && held && sized && fits,
      `no jump: 2.5 s after the page settled (frame ${calm.frames}) scrollY ${ref?.scrollY} then ${later?.scrollY}, page height ${ref?.scrollHeight} then ${later?.scrollHeight}, scene ${ref?.rect} then ${later?.rect}; its size over ${sampled.frames} frames of play: ${sampled.sizes.join(' then ')}; the page was at most ${sampled.widest} px wider than its window`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${w.name}-${view.width}-rest.png`) });
    if (later) console.log(`     ${id('boxes')} at rest, x y w h: card ${later.boxes.card}, art ${later.boxes.art}, pill ${later.boxes.pill}`);

    /* P2. The facts are the save's: the one the page wrote after the press. */
    await arm(page, 'wrongfact');
    const saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY));
    const p2 = w.p2(await sceneInfo(page, w.selector), saved);
    check(id('P2'), p2.ok, p2.label);

    /* P3. It holds: six seconds on, the same node with the same words in the
       same place, and nothing in it still running. */
    const before = await sceneInfo(page, w.selector);
    await arm(page, 'vanish');
    await page.waitForTimeout(6000);
    const after = await sceneInfo(page, w.selector);
    check(id('P3'), !!before && !!after && after.text === before.text && after.rect === before.rect && after.running === 0,
      `it holds: six seconds on the scene is ${after ? `there with ${after.running} animation(s) running, the ${after.text === before?.text ? 'same' : 'CHANGED'} words and rect ${before?.rect} then ${after.rect}` : 'GONE'}`);

    /* P4, first half. Another screen and Back: there, and still. */
    await w.back(page);
    await page.locator(w.selector).first().waitFor({ timeout: WAIT }).catch(() => undefined);
    await page.waitForTimeout(400);
    await arm(page, 'replayed');
    const back = await sceneInfo(page, w.selector);
    check(id('P4'), !!back && back.state === 'still' && (w.key === 'S' || back.confetti === 0), `once: after ${w.away} and Back the scene is ${back ? `${back.state} with ${back.confetti} confetti piece(s) on the page` : 'not there'}`);

    /* P5. The save is byte equal from half a second after the scene appeared
       (the page's own write for the press has landed) to here. */
    const to = await page.evaluate(key => ({ t: performance.now(), save: localStorage.getItem(key), sceneAt: window.__cmo.sceneAt, writes: window.__cmo.writes, fired: window.__cmo.fired }), SAVE_KEY);
    const inWindow = to.writes.filter(x => x.t >= to.sceneAt + 500 && x.t <= to.t);
    const mine = inWindow.filter(x => x.key === SAVE_KEY || x.key === '*');
    const others = [...new Set(inWindow.filter(x => x.key !== SAVE_KEY && x.key !== '*').map(x => x.key))];
    check(id('P5'), mine.length === 0 && to.save === from.save && typeof to.save === 'string' && to.save.length > 1000,
      `the save is byte equal: ${mine.length} write(s) to ${SAVE_KEY} in the window, ${to.save === from.save ? 'the same' : 'A DIFFERENT'} string of ${to.save?.length} characters`);
    if (others.length) console.log(`     ${id('info')} other keys written in that window (a screen's own flag, not counted): ${others.join(', ')}`);
    fired[w.key] += to.fired;

    /* P4, second half. A reload. */
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const reloaded = await w.afterReload(page);
    check(id('P4'), reloaded.ok, reloaded.label);

    /* P7. Clean. */
    check(id('P7'), trouble.length === 0, `clean: ${trouble.length} console or page error(s)${trouble.length ? `: ${trouble.slice(0, 2).join(' | ')}` : ''}`);
    if (unloaded()) console.log(`     ${id('info')} ${unloaded()} resource(s) did not load (refused requests, not counted)`);
  } catch (e) {
    check(id('walk'), false, `the walk threw: ${String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

/* ---------- walk S, the signing ---------- */
const S_SCENE = '[data-signed-slip] [data-career-moment="signing"][data-cmo-bind="sc-signing"]';
const walkS = {
  key: 'S', name: 'signing', save: signing.save, selector: S_SCENE, away: 'the attributes screen',
  reach: async page => {
    const review = page.getByRole('button', { name: `Review contract with ${signing.club}`, exact: true });
    const n = await review.count();
    if (n !== 1) return `the page shows ${n} "Review contract with ${signing.club}" button(s), expected one`;
    await review.click();
    await page.getByRole('button', { name: 'Sign contract', exact: true }).click();
    return '';
  },
  p1: info => ({ ok: !!info, label: 'the slip is the signing scene' }),
  p2: (info, saved) => {
    const wage = sc.formatWage(saved.weeklyWage);
    const years = saved.contractYearsLeft;
    const line = `${years} year${years === 1 ? '' : 's'} at ${wage}`;
    const colour = String(saved.currentClubColor || '');
    const ok = !!info && info.title.endsWith(`Signed with ${saved.currentClub}`) && info.line === line && info.number === wage
      && info.avatars === 1 && info.shirt === colour && info.ink === colour.toLowerCase() && colour.length === 7;
    return { ok, label: `the facts are the save's: "${info?.title}", "${info?.line}", the number ${info?.number} (the save: ${saved.currentClub}, ${line}, ${wage}); ${info?.avatars} avatar(s), shirt ${info?.shirt}, scene colour ${info?.ink} (the save: ${colour})` };
  },
  back: async page => {
    await page.locator('button', { hasText: 'Full attributes' }).first().click();
    await page.locator(S_SCENE).first().waitFor({ state: 'detached', timeout: WAIT }).catch(() => undefined);
    await page.getByRole('button', { name: '← Back', exact: true }).first().click();
  },
  afterReload: async page => {
    const slips = await page.locator('[data-signed-slip]').count();
    const scenes = await page.locator('[data-career-moment]').count();
    return { ok: slips === 0 && scenes === 0, label: `once: after a reload the page holds ${slips} slip(s) and ${scenes} scene(s), expected none` };
  },
};

/* ---------- walk T, the trophy ---------- */
const T_SCENE = '[data-intl-moment] [data-career-moment="trophy"][data-cmo-bind="sc-intl-trophy"]';
const walkT = {
  key: 'T', name: 'trophy', save: won.save, selector: T_SCENE, away: 'the Your Games tile',
  reach: async page => {
    /* The loaded save sits on the awards night, one press before the card. */
    const next = page.getByRole('button', { name: 'Continue →', exact: true });
    /* Release AQ (Round 1172): the night draws Continue only after its ranked list has come in, about three
       seconds with motion on. Wait for it, then hold the same count as before. */
    await next.first().waitFor({ timeout: 8000 }).catch(() => undefined);
    const n = await next.count();
    if (n !== 1) return `the awards card must show one "Continue →", the page shows ${n}`;
    await next.click();
    const card = await page.locator('[data-intl-moment]').first().waitFor({ timeout: WAIT }).then(() => true, () => false);
    return card ? '' : 'one press on the awards card did not reach the tournament card';
  },
  /* A played cup, told from a settled one: its lift runs for 0.9 s (a still
     card reports 0.001 ms) and has really started. */
  p1: (info, live) => {
    const lifting = !!live && live.cupDuration === '0.9s' && Array.isArray(live.cup) && live.cup.length === 1
      && ['running', 'finished'].includes(live.cup[0].state) && live.cup[0].time > 0;
    return { ok: !!info && info.cups === 1 && lifting, label: `${info?.cups ?? 0} cup(s), its lift ${live?.cupDuration} long and ${live?.cup?.[0] ? `${live.cup[0].state} at ${Math.round(live.cup[0].time)} ms` : 'not found'} ${live?.frames ?? '?'} frame(s) after it went live` };
  },
  p2: (info, saved) => {
    const t = saved.pendingTournament;
    const title = t ? `${t.name} ${t.year}` : '(the save holds no tournament)';
    return { ok: !!info && !!t && saved.phase === 'world_cup' && t.myResult === 'Winner' && info.title === title, label: `the facts are the save's: the title "${info?.title}" (the save: ${title}, ${t?.myResult}, phase ${saved.phase})` };
  },
  back: async page => {
    await page.locator('[data-intl-tile="matches"] button').click();
    await page.locator(T_SCENE).first().waitFor({ state: 'detached', timeout: WAIT }).catch(() => undefined);
    await page.getByRole('button', { name: '← Back', exact: true }).first().click();
  },
  afterReload: async page => {
    const cards = await page.locator('[data-intl-moment]').count();
    const info = await sceneInfo(page, T_SCENE);
    return { ok: cards === 1 && !!info && info.state === 'still' && info.confetti === 0 && info.running === 0, label: `once: after a reload the save sits on the card: ${cards} card(s), the scene ${info ? `${info.state} with ${info.confetti} confetti piece(s) and ${info.running} animation(s) running` : 'missing'}` };
  },
};

if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
for (const w of [walkS, walkT]) for (const view of VIEWPORTS) {
  console.log(`walk ${w.key} (${w.name}) at ${view.width} by ${view.height}${view.hasTouch ? ' with touch' : ''}`);
  await runWalk(w, view);
}
await browser.close();
console.log(`requests to supabase.co refused: ${blocked}`);

/* ---------- the verdict ---------- */
const failed = red.length;
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const expected = want.walks.flatMap(k => VIEWPORTS.map(v => `${k}${v.width}:${want.check}`)).sort();
  const got = [...new Set(red)].sort();
  const exact = got.length === expected.length && got.every((x, i) => x === expected[i]);
  const faults = CONTROL.startsWith('unbind-') ? true : want.walks.every(k => fired[k] >= VIEWPORTS.length);
  console.log(`playCareerMoments CONTROL ${CONTROL}: ${checks} checks, red on ${got.join(', ') || 'nothing'} (expected ${expected.join(', ')}); the fault fired ${CONTROL.startsWith('unbind-') ? 'in the served file' : `${fired.S} time(s) in walk S and ${fired.T} in walk T`}: ${exact && faults ? 'the control turned its own check red and left the others green' : 'NOT what this control must do'}`);
  stop(exact && faults ? 0 : 1);
}
console.log(`playCareerMoments: ${checks} checks, ${failed} failed`);
stop(failed === 0 ? 0 : 1);
