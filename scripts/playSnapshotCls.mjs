/**
 * Round 360 harness: where the layout shift on a prerendered page actually
 * comes from, measured rather than assumed.
 *
 * THE ITEM THIS SETTLES. The board carried "SNAPSHOT SWAP CLS" from Round 348
 * through 351, on the premise that the prerendered snapshot lives inside #root,
 * so when React mounts it clears it and shifts whatever the visitor could
 * already see. Measured on the real build across eight routes at 390px on a
 * throttled connection, that premise is no longer true: the swap contributes
 * 0.0000. Round 351 moved the global Footer inside the Suspense boundary, and
 * with nothing rendering below the swapping region there is nothing left for
 * the swap to push. It is replaced in place.
 *
 * WHAT THE SHIFT ACTUALLY IS, and it was hiding behind that premise. The
 * snapshot's 158KB stylesheet is deliberately not render blocking: vite.config
 * injects it as media="print" with an onload swap to "all", a trade made with
 * measurements in an earlier round because a blocking link pushed first
 * contentful paint from 740ms to 2860ms. The cost of that trade was never
 * measured. It is this: the page paints its text nearly unstyled, the sheet
 * lands, media flips to all, and the text relays out. Attributed by watching
 * for that exact load event, it accounts for essentially the whole number:
 * 0.1997 of 0.1997 on soccer-career, 0.1373 of 0.1460 on ball-iq, 0.0618 of
 * 0.0618 on club-manager.
 *
 * So this harness holds the invariant that was won, and reports the one that
 * was bought, instead of pretending the second does not exist.
 *
 *   1. THE SWAP STAYS FREE. Shifts in the window around React clearing the
 *      snapshot must stay at or under 0.02. This is Round 351's win and the
 *      thing a future change could silently undo, for instance by rendering
 *      anything below the Suspense boundary again.
 *   2. THE SNAPSHOT IS REALLY THERE. A route whose snapshot never appears
 *      would pass check 1 for the wrong reason, so its presence and its height
 *      at first paint are asserted before anything is attributed.
 *   3. THE STYLESHEET COST IS REPORTED AND CAPPED. Not failed at today's value,
 *      which would freeze a known trade-off as correct, but capped well above
 *      it so a real regression is still caught.
 *
 * NEGATIVE CONTROL: SNAPCLS_CONTROL=belowroot puts a visible block immediately
 * after #root, which is exactly the pre-Round-351 shape, so the swap has
 * something to push again. Check 1 must go red. The control asserts the block
 * is really in the document before the run counts.
 *
 * Run: node scripts/playSnapshotCls.mjs   (needs dist/ from npm run build)
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SNAPCLS_PORT || 4332);
const CONTROL = process.env.SNAPCLS_CONTROL || '';
if (CONTROL && CONTROL !== 'belowroot') {
  console.error(`SNAPCLS_CONTROL=${CONTROL} is not a control this harness knows (belowroot)`);
  process.exit(1);
}

/* A spread rather than the whole site: two heavyweights, a grid, a hub, a
   short page and a new game, which is enough shapes for the invariant. */
const ROUTES = (process.env.SNAPCLS_ROUTES || '/soccer-career,/club-manager,/football-grid,/soccer,/ball-iq,/conquest-soccer').split(',');

/* The swap is only worth measuring where the snapshot is on screen long enough
   to be seen, which is a slow connection, which is also where real phones are.
   42 percent of this site's clicks are mobile. */
const THROTTLE = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

const SWAP_CEILING = 0.02;   // measured 0.0000 on every route
const CSS_CEILING = 0.35;    // measured 0.0618 to 0.1997; a cap, not a target

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

console.log('playSnapshotCls: where a prerendered page\'s layout shift comes from');
if (CONTROL) console.log(`  CONTROL ACTIVE: ${CONTROL} (this run is expected to fail)`);

const server = spawn('node', [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), 'dist', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const rows = [];

try {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', THROTTLE);

    await page.addInitScript(({ control }) => {
      window.__shifts = [];
      window.__marks = {};
      window.__cssApplied = null;
      window.__controlPlanted = false;

      new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__shifts.push({ value: e.value, t: e.startTime });
        }
      }).observe({ type: 'layout-shift', buffered: true });

      /* the deferred stylesheet announces itself by loading; that is the
         moment media flips to all and the page relays out */
      const watchCss = () => {
        const l = [...document.querySelectorAll('link[rel="stylesheet"][media="print"]')][0];
        if (l) { l.addEventListener('load', () => { window.__cssApplied = performance.now(); }); return; }
        setTimeout(watchCss, 20);
      };
      watchCss();

      const tick = () => {
        const snap = document.getElementById('dukb-snapshot');
        if (snap) {
          /* the height it actually HAD while on screen, kept up to date every
             frame. Reading it once on the first frame measures the document
             before layout has settled and reported 51px for pages that really
             showed 800, which would have made the "is there a snapshot at all"
             check pass or fail for reasons that had nothing to do with it. */
          window.__marks.snapHeight = snap.getBoundingClientRect().height;
        }
        if (snap && window.__marks.snapSeen === undefined) {
          window.__marks.snapSeen = performance.now();
          if (control === 'belowroot') {
            /* the pre-Round-351 shape: something visible below the region that
               is about to be replaced, so the swap has content to move */
            const root = document.getElementById('root');
            if (root && root.parentNode) {
              const d = document.createElement('div');
              d.id = 'dukb-control-belowroot';
              d.textContent = 'control block';
              d.style.cssText = 'height:120px;background:#333;color:#fff';
              root.parentNode.insertBefore(d, root.nextSibling);
              window.__controlPlanted = !!document.getElementById('dukb-control-belowroot');
            }
          }
        }
        if (!snap && window.__marks.snapSeen !== undefined && window.__marks.snapGone === undefined) {
          window.__marks.snapGone = performance.now();
        }
        if (window.__marks.snapGone === undefined) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { control: CONTROL });

    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(6500);

    const out = await page.evaluate(() => ({
      shifts: window.__shifts,
      marks: window.__marks,
      cssApplied: window.__cssApplied,
      controlPlanted: window.__controlPlanted,
    }));
    await ctx.close();

    const m = out.marks;
    const total = out.shifts.reduce((s, x) => s + x.value, 0);
    const swap = m.snapGone === undefined ? null
      : out.shifts.filter(s => s.t >= m.snapGone - 20 && s.t <= m.snapGone + 150).reduce((s, x) => s + x.value, 0);
    const css = out.cssApplied == null ? null
      : out.shifts.filter(s => s.t >= out.cssApplied - 60 && s.t <= out.cssApplied + 400).reduce((s, x) => s + x.value, 0);

    rows.push({ route, total, swap, css, snapH: m.snapHeight, seen: m.snapSeen !== undefined, gone: m.snapGone !== undefined, controlPlanted: out.controlPlanted });
    console.log(
      `  ${route.padEnd(18)} total ${total.toFixed(4)}  swap ${swap === null ? '  n/a ' : swap.toFixed(4)}` +
      `  stylesheet ${css === null ? '  n/a ' : css.toFixed(4)}  snapshot ${Math.round(m.snapHeight ?? 0)}px`,
    );
  }
} finally {
  await browser.close();
  server.kill('SIGKILL');
}

console.log('');

/* ---- 2 first: a route with no snapshot would pass check 1 for the wrong reason ---- */
const noSnap = rows.filter(r => !r.seen);
if (noSnap.length) fail(`${noSnap.length} route(s) never showed a snapshot at all (${noSnap.map(r => r.route).join(', ')}), so nothing here measured what it claims to`);
else ok(`all ${rows.length} routes painted their snapshot before the app booted`);

const tiny = rows.filter(r => r.seen && (r.snapH ?? 0) < 40);
if (tiny.length) fail(`${tiny.length} route(s) painted a snapshot under 40px tall (${tiny.map(r => r.route).join(', ')}); that is not a document, and a swap of nothing shifts nothing`);

const neverGone = rows.filter(r => r.seen && !r.gone);
if (neverGone.length) fail(`${neverGone.length} route(s) never replaced their snapshot (${neverGone.map(r => r.route).join(', ')}), so the app did not boot and the swap was never exercised`);

/* ---- 1: the swap stays free ---- */
if (CONTROL === 'belowroot') {
  const planted = rows.filter(r => r.controlPlanted).length;
  if (!planted) {
    console.error('CONTROL REFUSED: the block was never planted below #root, so this run proves nothing.');
    process.exit(2);
  }
  console.log(`  control: a visible block was planted below #root on ${planted} route(s)`);
}
const swapped = rows.filter(r => r.swap !== null);
const worstSwap = swapped.sort((a, b) => b.swap - a.swap)[0];
if (!swapped.length) fail('no route produced a measurable swap, so check 1 asserted nothing');
else if (worstSwap.swap > SWAP_CEILING) {
  fail(`the snapshot swap shifted the page on ${worstSwap.route} by ${worstSwap.swap.toFixed(4)}, over the ${SWAP_CEILING} ceiling. Something is rendering below the region React replaces, which is the Round 351 bug returning.`);
} else {
  ok(`the swap costs nothing on all ${swapped.length} routes, worst ${worstSwap.swap.toFixed(4)} (ceiling ${SWAP_CEILING})`);
}

/* ---- 3: the stylesheet cost is reported, and capped well above what it is ---- */
const withCss = rows.filter(r => r.css !== null);
if (withCss.length) {
  const worstCss = [...withCss].sort((a, b) => b.css - a.css)[0];
  console.log(`  note: applying the deferred stylesheet costs ${worstCss.css.toFixed(4)} on ${worstCss.route}, the worst of ${withCss.length} routes.`);
  console.log('        That is the FCP trade recorded in vite.config, not a defect, and it is the bulk of this site\'s CLS.');
  if (worstCss.css > CSS_CEILING) {
    fail(`the stylesheet swap now costs ${worstCss.css.toFixed(4)} on ${worstCss.route}, over the ${CSS_CEILING} cap; the trade has got materially worse`);
  } else {
    ok(`the stylesheet swap stays under its ${CSS_CEILING} cap (worst ${worstCss.css.toFixed(4)})`);
  }
}

console.log('');
if (failures) {
  console.error(`playSnapshotCls: ${failures} failure(s).`);
  if (CONTROL) console.error('The control fired, which is what it is for. Run without SNAPCLS_CONTROL for the real result.');
  process.exit(1);
}
if (CONTROL) {
  console.error(`playSnapshotCls: CONTROL ${CONTROL} was active and NOTHING failed. The check is not looking at what it claims to look at.`);
  process.exit(1);
}
console.log('playSnapshotCls: PASS. The swap is free; the stylesheet is where the shift lives.');
