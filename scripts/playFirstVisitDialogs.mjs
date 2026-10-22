/**
 * ROUND 1536 BROWSER WALK: no game's first visit dialog hides its own button under the cookie banner.
 *
 * Round 1442 rebuilt the cookie banner taller, and its pending rule in src/index.css gives every [role=dialog] a
 * max height and a top while the banner is unanswered. A Radix dialog is centred above the banner by that rule, but a
 * hand made one is not: a static box in a centred fixed overlay keeps its bottom under the banner, and a [role=dialog]
 * that IS the fixed overlay is pushed down into it. On a first visit Stadium Tycoon's "Let's go" and Idle Arena's
 * close button sat under the banner, so a stranger who did not answer the banner first could not start either game
 * (Release BO triage, section 8.1; board note 7633c474).
 *
 * WHAT THIS WALKS: every game route in src/data/gameRegistry.ts (uncommented rows, so a game is walked the day it is
 * added) at 320x640, 390x844 and 1280x900, each in a fresh browser context (a true first visit: no stored consent, no
 * save), with the banner LEFT UNANSWERED and the database aborted. Where a first visit dialog opens (a visible
 * role=dialog, role=alertdialog or aria-modal element, or a fixed overlay over most of the screen), it picks the
 * dialog's OWN primary button (never a banner control), scrolls it to the middle of its own scroll box, and asks
 * elementFromPoint what sits at the button's centre. Only when the button itself is there does it tap that point,
 * and then the dialog must close and the screen must be usable (no modal or scrim left over the middle of the free
 * area). A route with no first visit dialog is listed as such. The banner is never answered or tapped.
 *
 * The banner is read by its label, "Cookie choices". Round 1535's scripts/lib/answerConsent.mjs exports the same
 * selector as CONSENT_REGION; that branch had not merged when this walk was written, so swap the constant for the
 * import once it has.
 *
 * EXPECTED_SITE_RED: a route and width that is red today because of the SITE's pending rule, on a dialog this lane
 * may not edit, is listed with the board note that hands the rule to the other lane. Such a line is printed as
 * EXPECTED and does not fail the walk, and it FAILS the walk the day it turns green (a ratchet, like playCorruptSaves'
 * OFFLINE_ONLY), so the list empties itself when the rule is fixed.
 *
 * NEGATIVE CONTROL: PLAYFIRST_CONTROL=cover injects a fixed element over every picked button's centre before the hit
 * test. Every route that opened a dialog must then go red. Its last line says FIRED (exit 1), did NOT fire (exit 3),
 * or ABORTED when no route in the run opened a dialog (exit 2). PLAYFIRST_CONTROL=ratchet lists every walked route
 * width in EXPECTED_SITE_RED, and every green or dialog free one must then fail: FIRED (exit 1), NOT (3), ABORTED (2).
 * Measured 2026-10-22 on runners (Round 1536): 399 route widths over 133 routes, 41 routes open a first visit dialog;
 * before the Round 1536 hardening 9 were red (Stadium Tycoon, Idle Arena, Wonderkid Factory at all three widths),
 * after it 0, every button at least 37 px above a pending banner; the cover fired on 123 of 123 dialog buttons.
 *
 * Run: BASE=http://localhost:4173 node scripts/playFirstVisitDialogs.mjs   (a served build, see scripts/lib/hostLikeServer.mjs)
 *      ONLY=/stadium-tycoon,/idle-arena scopes it; PLAYFIRST_SHARD=1/3 runs a third of the routes;
 *      PLAYFIRST_JSON=<file> writes every measurement as JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAYFIRST_CONTROL || '';
if (CONTROL && CONTROL !== 'cover' && CONTROL !== 'ratchet') { console.error(`PLAYFIRST_CONTROL=${CONTROL} is not a control this walk knows (cover, ratchet)`); process.exit(2); }
const WIDTHS = [[320, 640], [390, 844], [1280, 900]];
const BANNER = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';

/* route@width -> the board note that hands the cause to the other lane. Empty means every first visit dialog on the
   site can be started with the banner unanswered. */
const EXPECTED_SITE_RED = {};

const reg = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
const ALL_ROUTES = [...reg.matchAll(/^\s*\{ path:\s*'([^']+)'/gm)].map(m => m[1]);
if (ALL_ROUTES.length < 100) { console.error(`playFirstVisitDialogs: read only ${ALL_ROUTES.length} routes from the registry, refusing to walk`); process.exit(2); }
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
let routes = ONLY ? ALL_ROUTES.filter(r => ONLY.includes(r)) : ALL_ROUTES;
const SHARD = (process.env.PLAYFIRST_SHARD || '').match(/^(\d+)\/(\d+)$/);
if (SHARD) routes = routes.filter((_, i) => i % Number(SHARD[2]) === Number(SHARD[1]) - 1);
if (routes.length === 0) { console.error('playFirstVisitDialogs: no routes matched'); process.exit(2); }

/* Runs in the page. Finds the open first visit dialog, picks its own primary button, scrolls that into the middle of
   its own scroll box and reports what sits at its centre. Marks both so the tap and the close check find them again. */
function measureInPage({ BANNER, control }) {
  const W = innerWidth, H = innerHeight;
  const banner = document.querySelector(BANNER);
  const bannerFixed = !!banner && getComputedStyle(banner).position === 'fixed';
  const box = r => ({ top: Math.round(r.top), bottom: Math.round(r.bottom) });
  const vis = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  };
  const inBanner = el => !!banner && banner.contains(el);
  const roleDialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].filter(d => vis(d) && !inBanner(d));
  const overlays = [...document.querySelectorAll('body *')].filter(el => {
    if (inBanner(el) || getComputedStyle(el).position !== 'fixed' || !vis(el)) return false;
    const r = el.getBoundingClientRect();
    const seen = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    return seen >= 0.6 * W * H;
  });
  const cands = [...new Set([...roleDialogs, ...overlays])];
  const groups = cands.filter(c => !cands.some(o => o !== c && o.contains(c)));
  const out = { banner: banner ? box(banner.getBoundingClientRect()) : null, bannerFixed, pending: document.body.dataset.consentPending || null, dialogs: groups.length };
  if (!groups.length) return out;
  const onTop = groups.filter(g => { const r = g.getBoundingClientRect(); const el = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2))); return el && g.contains(el); });
  const g = (onTop.length ? onTop : groups)[(onTop.length ? onTop : groups).length - 1];
  const inner = [g, ...g.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].filter(d => d.matches('[role="dialog"],[role="alertdialog"],[aria-modal="true"]') && !inBanner(d)).pop() || g;
  const ref = inner.getAttribute('aria-labelledby') && document.getElementById(inner.getAttribute('aria-labelledby'));
  const head = inner.querySelector('h1,h2,h3,[class*="DialogTitle"]');
  out.name = (inner.getAttribute('aria-label') || (ref && ref.textContent) || (head && head.textContent) || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  out.kind = inner === g && !g.matches('[role="dialog"],[role="alertdialog"],[aria-modal="true"]') ? 'overlay' : 'dialog';
  out.position = getComputedStyle(inner).position;
  out.bannerInside = !!banner && g.contains(banner);
  out.dialogBox = box(inner.getBoundingClientRect());
  g.setAttribute('data-playfirst-dialog', '');
  const label = b => ((b.textContent || '').trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30);
  const btns = [...g.querySelectorAll('button,[role="button"]')].filter(b => vis(b) && !inBanner(b) && !b.disabled);
  const GO = /^(let'?s (go|play|start|do (it|this))|play|start|got it|continue|begin|ok|okay|i'?m ready|ready|kick ?off|go|done|enter)\b/i;
  let pick = btns.find(b => GO.test(label(b))), how = 'its go label';
  if (!pick) { pick = btns.find(b => /\bbg-primary\b/.test(String(b.className))); how = 'its primary style'; }
  if (!pick) { pick = btns.find(b => /close|dismiss/i.test(label(b))); how = 'its close label'; }
  if (!pick) { pick = btns[btns.length - 1]; how = 'the last button'; }
  if (!pick) return out;
  pick.setAttribute('data-playfirst-button', '');
  pick.scrollIntoView({ block: 'center', inline: 'nearest' });
  const r = pick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (control === 'cover') {
    const c = document.createElement('div');
    c.setAttribute('data-playfirst-cover', '');
    /* pointer-events auto on purpose: a modal Radix dialog sets pointer-events none on the body, which the cover
       would inherit, and elementFromPoint skips such an element (the first cover run passed 12 Radix buttons). */
    Object.assign(c.style, { position: 'fixed', left: `${cx - 20}px`, top: `${cy - 20}px`, width: '40px', height: '40px', zIndex: '2147483647', pointerEvents: 'auto' });
    document.body.appendChild(c);
  }
  const onScreen = cx >= 0 && cx < W && cy >= 0 && cy < H;
  const hit = onScreen ? document.elementFromPoint(cx, cy) : null;
  const describe = el => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  out.at = !onScreen ? 'off screen' : !hit ? 'nothing' : pick.contains(hit) ? 'tappable' : inBanner(hit) ? 'the banner'
    : hit.hasAttribute('data-playfirst-cover') ? 'the control' : `covered by ${describe(hit)}`;
  const bb = banner && bannerFixed ? banner.getBoundingClientRect() : null;
  out.overlap = bb && r.right > bb.left && r.left < bb.right ? Math.max(0, Math.round(Math.min(r.bottom, bb.bottom) - Math.max(r.top, bb.top))) : 0;
  out.depth = out.overlap ? Math.round(r.bottom - bb.top) : 0;
  out.clear = bb && !out.overlap ? Math.round(bb.top - r.bottom) : null;
  Object.assign(out, { button: label(pick), how, buttonBox: box(r), cx: Math.round(cx), cy: Math.round(cy), whole: r.top >= -1 && r.bottom <= H + 1 && r.left >= -1 && r.right <= W + 1 });
  return out;
}

/* Runs in the page after the tap: is the marked dialog gone, and is the middle of the free area (above a fixed
   banner) the game rather than a modal or a scrim? */
function afterTapInPage({ BANNER }) {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 2 && r.height >= 2 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05; };
  const d = document.querySelector('[data-playfirst-dialog]');
  const banner = document.querySelector(BANNER);
  const bb = banner && getComputedStyle(banner).position === 'fixed' ? banner.getBoundingClientRect() : null;
  const freeBottom = bb ? Math.max(2, bb.top) : innerHeight;
  const el = document.elementFromPoint(innerWidth / 2, freeBottom / 2);
  let blocker = null;
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (banner && banner.contains(n)) break;
    if (n.matches('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')) { blocker = `dialog "${(n.getAttribute('aria-label') || '').slice(0, 30)}"`; break; }
    if (getComputedStyle(n).position === 'fixed') { const r = n.getBoundingClientRect(); if (r.width * r.height >= 0.6 * innerWidth * innerHeight) { blocker = `overlay ${n.tagName.toLowerCase()}.${String(n.className).slice(0, 40)}`; break; } }
  }
  return { closed: !d || !vis(d), blocker };
}

const span = b => (b ? `${b.top} to ${b.bottom}` : 'none');
const results = [];
const browser = await chromium.launch();
for (const route of routes) {
  for (const [w, h] of WIDTHS) {
    const key = `${route}@${w}`;
    const res = { route, width: w, height: h, key };
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, null, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector(BANNER, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1500);
      Object.assign(res, await page.evaluate(measureInPage, { BANNER, control: CONTROL }));
      if (res.dialogs && res.at === 'tappable') {
        await page.mouse.click(res.cx, res.cy);
        let after = null;
        for (let i = 0; i < 10; i += 1) {
          await page.waitForTimeout(200);
          after = await page.evaluate(afterTapInPage, { BANNER });
          if (after.closed && !after.blocker) break;
        }
        Object.assign(res, after);
      }
    } catch (e) {
      res.error = String(e.message || e).split('\n')[0].slice(0, 120);
    }
    await ctx.close();
    results.push(res);
  }
}
await browser.close();

/* PLAYFIRST_CONTROL=ratchet lists every walked route width as an expected site red, so every green or dialog free
   line must fail with "remove it from the list": proof the ratchet empties the list rather than hiding a fix. */
if (CONTROL === 'ratchet') for (const r of results) EXPECTED_SITE_RED[r.key] = 'control';
const failures = [];
let expected = 0, none = 0, passed = 0, fired = 0, withButton = 0, ratcheted = 0;
for (const r of results) {
  const where = `${r.route} ${r.width}x${r.height}`;
  const bannerNote = `banner ${span(r.banner)}${r.bannerInside ? ' (inside the dialog)' : r.pending ? ' (pending)' : ''}`;
  let state, why;
  if (r.error) { state = 'FAIL'; why = `the page did not load: ${r.error}`; }
  else if (!r.dialogs) { state = 'NONE'; why = `no first visit dialog, ${bannerNote}`; }
  else {
    const head = `${r.kind} "${r.name}" (${r.position}) ${span(r.dialogBox)}`;
    if (!r.button) { state = 'FAIL'; why = `${head} has no button of its own, ${bannerNote}`; }
    else {
      withButton += 1;
      if (r.at === 'the control') fired += 1;
      const btn = `"${r.button}" (${r.how}) ${span(r.buttonBox)}${r.whole ? '' : ' (partly off screen)'}`;
      if (r.at !== 'tappable') { state = 'FAIL'; why = `${head}, ${btn} is not tappable: at its centre ${r.at}${r.overlap ? `, ${r.overlap} of its ${r.buttonBox.bottom - r.buttonBox.top} px under the banner (its bottom ${r.depth} px below the banner's top)` : ''}, ${bannerNote}`; }
      else if (!r.closed) { state = 'FAIL'; why = `${head}, ${btn} tapped but the dialog did not close, ${bannerNote}`; }
      else if (r.blocker) { state = 'FAIL'; why = `${head}, ${btn} tapped and closed, but ${r.blocker} still covers the screen, ${bannerNote}`; }
      else { state = 'PASS'; why = `${head}, ${btn} tappable${r.clear !== null ? ` (${r.clear} px above the banner)` : ''}, ${bannerNote}; tapped, closed, screen usable`; }
    }
  }
  const note = EXPECTED_SITE_RED[r.key];
  if (note && !r.error) {
    if (state === 'FAIL') { state = 'EXPECTED'; why += ` (site rule, board note ${note})`; }
    else { why = `listed in EXPECTED_SITE_RED (${note}) but ${state === 'NONE' ? 'no dialog opens now' : 'green now'}: remove it from the list. ${why}`; state = 'FAIL'; ratcheted += 1; }
  }
  r.state = state;
  if (state === 'FAIL') failures.push(`${where}: ${why}`);
  if (state === 'EXPECTED') expected += 1;
  if (state === 'NONE') none += 1;
  if (state === 'PASS') passed += 1;
  console.log(`  ${state.padEnd(8)} ${where}: ${why}`);
}
if (process.env.PLAYFIRST_JSON) fs.writeFileSync(process.env.PLAYFIRST_JSON, JSON.stringify(results, null, 1));

console.log('');
console.log(`${results.length} route widths walked over ${routes.length} routes: ${passed} dialogs tapped and closed, ${expected} expected site reds, ${none} without a first visit dialog, ${failures.length} red`);
if (CONTROL === 'cover') {
  if (withButton === 0) { console.log('playFirstVisitDialogs control ABORTED: no route in this run opened a dialog with a button, so the cover had nothing to cover'); process.exit(2); }
  if (fired === withButton) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=cover FIRED. ${fired} of ${withButton} dialog buttons read as covered and the walk is red`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=cover did NOT fire on ${withButton - fired} of ${withButton} dialog buttons`);
  process.exit(3);
}
if (CONTROL === 'ratchet') {
  const judged = results.filter(r => !r.error).length;
  if (ratcheted === 0) { console.log('playFirstVisitDialogs control ABORTED: no walked route width was green or dialog free, so the ratchet had nothing to catch'); process.exit(2); }
  if (ratcheted + expected === judged) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=ratchet FIRED. ${ratcheted} green or dialog free route widths listed as expected reds each failed the walk`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=ratchet did NOT fire: ${judged - ratcheted - expected} of ${judged} route widths escaped it`);
  process.exit(3);
}
if (failures.length) {
  console.log(`playFirstVisitDialogs: RED. ${failures.length} route widths: ${failures.map(f => f.split(':')[0]).join(', ')}`);
  process.exit(1);
}
console.log('playFirstVisitDialogs: green. Every first visit dialog can be started with the cookie banner unanswered.');
