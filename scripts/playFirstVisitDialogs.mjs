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
 * A centre that can be tapped is not enough on its own (Round 1536 review: a box with no height cap passed with its
 * top 32 px above the screen and 11 of its button's 48 px under the banner). The line is also red when any part of
 * the button sits under a pending banner or off screen, when the dialog's top is above the screen on arrival (its
 * heading and close out of reach), or when a dialog's own box runs under a pending banner (which is also what a
 * [role=dialog] put back on a fixed overlay looks like: the pending rule pushes that overlay down into the banner).
 * The banner must be on screen for a line to count: a line where it never appeared measured nothing, and the walk
 * refuses it (ABORTED, exit 2) rather than calling it green.
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
 * PLAYFIRST_CONTROL=expected covers every button AND lists every route width that opened a dialog, so each must print
 * EXPECTED and none may fail the walk (the other half of the ratchet). PLAYFIRST_CONTROL=edge slides each dialog down
 * until its button's bottom sits 8 px under a pending banner with its centre still clear: every such line must go red
 * for the button AND for the box under the banner while its centre still reads tappable. PLAYFIRST_CONTROL=lift slides
 * each dialog up until its top is 20 px above the screen: every dialog line must go red for its top. PLAYFIRST_CONTROL=
 * nobanner hides the banner: every line must be refused as measuring nothing. Each says FIRED (exit 1), did NOT fire
 * (exit 3) or ABORTED when it had nothing to act on (exit 2).
 * Measured 2026-10-22 on runners (Round 1536): 399 route widths over 133 routes, 41 routes open a first visit dialog;
 * before the Round 1536 hardening 9 were red (Stadium Tycoon, Idle Arena, Wonderkid Factory at all three widths),
 * after it 0, every button at least 37 px above a pending banner; the cover fired on 123 of 123 dialog buttons.
 * Headroom of the whole button and box checks, measured on the same 123 passing lines before they were added: no dialog
 * top above the screen, no button partly off screen, and on all 57 lines with a pending banner outside the dialog its
 * box ends at least 12 px above the banner (the Radix dialogs exactly 12) and its button at least 37 px above. They
 * turned two mutations the centre test passed red: the box without its 100% cap (7 of 9 hardened route widths red,
 * was 4; the two still green keep their whole box on screen above the banner) and Idle Arena's role put back on its
 * overlay (red at all three widths, its box 165 to 233 px under the banner; it was green). Controls on 8 routes
 * (24 route widths, 21 dialogs): edge 18 of 18, lift 21 of 21, nobanner 24 of 24, expected 21 of 21.
 *
 * SEEDED SCENES (Round 1539): a dialog no first visit opens is walked from a planted save (the SCENES table). Today one,
 * Stadium Tycoon's "While you were away" card at its largest: a ten club season's leftover friendly plus 17 away
 * matchdays, with its milestones, gems and table lines, built in node from the lib's own functions and checked there
 * over 200 seeded streams before any page opens. It is walked at the three widths with the banner pending and judged by
 * the same checks, and it also FAILS when no dialog opens, when the top dialog is not "While you were away", when the
 * picked button is not "Back to work", and when scrollY or the document height move between the card measured and the
 * card closed. A card that draws less than its full content ABORTS the run (exit 2). The answered banner case is not a
 * line here (the walk refuses a line with no banner on screen); Round 1536's probe measured it once, box 214 to 630 at
 * 390 by 844. PLAYFIRST_CONTROL=stale plants the scenes' saves fresh, so no card can open, and every seeded line must
 * fail as "opened no card". PLAYFIRST_CONTROL=jump makes the scene's button also push the page 40 px, and every tapped
 * seeded line must fail for the jump. Each says FIRED (exit 1), did NOT fire (exit 3) or ABORTED when the run holds no
 * seeded line (exit 2). The other controls take the seeded lines with every other line.
 *
 * Run: BASE=http://localhost:4173 node scripts/playFirstVisitDialogs.mjs   (a served build, see scripts/lib/hostLikeServer.mjs)
 *      ONLY=/stadium-tycoon,/idle-arena scopes it; PLAYFIRST_SHARD=1/3 runs a third of the routes;
 *      PLAYFIRST_JSON=<file> writes every measurement as JSON.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAYFIRST_CONTROL || '';
const CONTROLS = ['cover', 'ratchet', 'expected', 'edge', 'lift', 'nobanner', 'stale', 'jump'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`PLAYFIRST_CONTROL=${CONTROL} is not a control this walk knows (${CONTROLS.join(', ')})`); process.exit(2); }
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

/* Round 1539: SEEDED SCENES. A dialog a first visit never opens, walked from a planted save in a fresh context with
   the banner pending, and judged by the same measureInPage and afterTapInPage as every registry line. A scene runs
   whenever its route is walked (so in that route's shard and under ONLY), and its plant (which may bundle a game's lib)
   is built only then. On top of the usual checks a scene line FAILS when no dialog opens ("the planted save opened no
   card"), when the top dialog is not its label, when the picked button is not its button, and when the page jumps
   (scrollY or the document height differ between the card measured and the card closed). A card that opens but draws
   less than its full content (its `full` table) ABORTS the run (exit 2): the line would measure a smaller card. */
const SCENES = [
  {
    key: '/stadium-tycoon#away', route: '/stadium-tycoon', label: 'While you were away', button: 'Back to work', plant: plantTycoonAway,
    full: {
      count: '[data-away-results] [role="img"]',
      lines: ['The faded result was a friendly', 'Milestones reached on the road', 'Away wins earned', 'the final matchday is waiting for you'],
    },
  },
];
const sceneRuns = SCENES.filter(sc => routes.includes(sc.route));

function mulberry(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* The LARGEST "While you were away" card Stadium Tycoon can draw, built and round tripped in node from the lib's own
   functions (never hand written JSON): a ten club division at its first matchday with a leftover friendly (an opponent
   name the loader keeps), the Away Day Deal at its top level, Squad far over the division's par, each goal and win
   counter one under the lowest milestone that counts it (found by probing the hit functions, so a new ladder moves it
   too), and `ach` and `claimed` exactly what that state already earns, so only the trip's own firsts fire. The page
   writes it 13 hours old and pins Math.random to a seeded stream for 5,000 calls (the trip), then 0.999 (no goal, no
   whistle behind the card). Before any page opens, 200 seeded streams must each draw the full card in node. */
async function plantTycoonAway() {
  const { build } = await import('esbuild');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'playfirst-tycoon-'));
  const out = path.join(tmp, 'tycoon.mjs');
  const lib = path.join(ROOT, 'src/lib/stadiumTycoon.ts').split(path.sep).join('/');
  await build({
    stdin: { contents: `export * as T from ${JSON.stringify(lib)};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  });
  const { T } = await import(pathToFileURL(out).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const fail = why => { throw new Error(`the Stadium Tycoon plant: ${why}`); };
  const division = T.DIVISIONS.findIndex((_, d) => T.leagueShape(d).clubs === 10);
  if (division < 0) fail('no ten club division');
  const shape = T.leagueShape(division);
  const f = T.newTycoon(0);
  const reach = Math.ceil(20 / T.SQUAD_POINTS);
  const par = Math.round(T.DIVISIONS[division].rivalStrength / T.SQUAD_POINTS);
  const squad = Math.min(T.TRACKS.find(t => t.id === 'squad').maxLevel, par + 3 * reach);
  const awayTop = T.LEGACY_PERKS.find(p => p.id === 'away').costs.length;
  let s = { ...f, levels: { ...f.levels, squad }, league: T.newLeague(f.rep, division, 0), bestDivision: division, legacyPerks: { ...f.legacyPerks, away: awayTop } };
  s.league = { ...s.league, carryover: T.legacyOpponentName(s) };
  const hits = st => T.MILESTONES.filter(m => m.hit(st)).length;
  const oneUnder = field => {
    for (let k = 1; k <= 100000; k += 1) if (hits({ ...s, [field]: k }) > hits({ ...s, [field]: k - 1 })) return k - 1;
    return fail(`no milestone counts ${field}`);
  };
  s = { ...s, totalWins: oneUnder('totalWins'), totalGoals: oneUnder('totalGoals'), streak: 0, ach: [], claimed: [] };
  T.settleFirsts(s, []);
  const t0 = Date.UTC(2026, 9, 22);
  const awayMs = 13 * 3600e3;
  const loaded = T.deserializeTycoon(T.serializeTycoon(s, t0), t0);
  const same = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());
  if (!loaded || loaded.league.division !== division || loaded.league.matchday !== 0) fail('the save does not load at its division\'s first matchday');
  if (loaded.league.carryover !== s.league.carryover) fail(`the loader dropped the leftover friendly "${s.league.carryover}"`);
  if (!same(loaded.ach, s.ach) || !same(loaded.claimed, s.claimed)) fail('the loader changed ach or claimed');
  if (T.offlineCapHoursOf(loaded) * 3600e3 >= awayMs) fail('the top away cap is not under the 13 hours away, so the trip is not capped');
  const want = T.awayMatchdaysPlayable(loaded, 1e6);
  if (want !== shape.matchdays) fail(`the trip may play ${want}, not the friendly plus ${shape.matchdays - 1}`);
  const count = Math.floor(T.awaySecondsOf(loaded, t0 + awayMs) / T.AWAY_MATCHDAY_SEC);
  if (count < want) fail(`a capped trip counts ${count} matchdays, fewer than the ${want} the season holds`);
  let short = 0;
  for (let k = 1; k <= 200; k += 1) {
    const r = T.playAwayMatchdays({ ...loaded, savedAt: t0 + awayMs }, count, mulberry(k));
    const lg = r.state.league;
    const full = r.results.length === want && r.results[0]?.friendly && r.results.some(m => m.result === 'W')
      && r.events.some(e => e.kind === 'milestone' && (e.amount ?? 0) > 0) && shape.matchdays - lg.matchday <= 1;
    if (!full) short += 1;
  }
  if (short) fail(`${short} of 200 seeded streams draw less than the full card`);
  return { key: T.TYCOON_SAVE_KEY, save: T.serializeTycoon(s, t0), awayMs, seed: 1539, count: want };
}
for (const sc of sceneRuns) {
  try { sc.seed = await sc.plant(); } catch (e) { console.log(`playFirstVisitDialogs ABORTED: ${String(e.message || e)}`); process.exit(2); }
}
if (['stale', 'jump'].includes(CONTROL) && !sceneRuns.length) { console.log(`playFirstVisitDialogs control ABORTED: PLAYFIRST_CONTROL=${CONTROL} acts on seeded scenes and none is in this run`); process.exit(2); }
const SHOTS = process.env.RC_OUT || '';

/* Runs in the page. Finds the open first visit dialog, picks its own primary button, scrolls that into the middle of
   its own scroll box and reports what sits at its centre. Marks both so the tap and the close check find them again. */
function measureInPage({ BANNER, control }) {
  const W = innerWidth, H = innerHeight;
  const box = r => ({ top: Math.round(r.top), bottom: Math.round(r.bottom) });
  const vis = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  };
  /* only a banner that is on screen counts: one that is in the page but hidden measures nothing */
  const banner = [...document.querySelectorAll(BANNER)].find(vis) || null;
  const bannerFixed = !!banner && getComputedStyle(banner).position === 'fixed';
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
  /* PLAYFIRST_CONTROL=lift and edge move the dialog with the CSS translate property, which adds to a dialog's own
     transform rather than replacing it, with transitions off: a Radix dialog's duration-200 would otherwise animate
     the move and the reads that follow would still see it where it was (the first edge run moved no Radix dialog). */
  const slide = px => { Object.assign(g.style, { transition: 'none', translate: `0px ${px}px` }); out.controlApplied = true; };
  if (control === 'lift') slide(-Math.round(inner.getBoundingClientRect().top + 20));
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
  const bb = banner && bannerFixed ? banner.getBoundingClientRect() : null;
  if (control === 'edge' && bb && !out.bannerInside) {
    const shift = Math.round(bb.top + 8 - pick.getBoundingClientRect().bottom);
    if (shift > 0) slide(shift);
  }
  const r = pick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  /* where the dialog's own box ends once its button is in view, against a pending banner outside it */
  out.boxUnder = bb && out.kind === 'dialog' && !out.bannerInside ? Math.round(inner.getBoundingClientRect().bottom - bb.top) : null;
  if (control === 'cover' || control === 'expected') {
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

/* Runs in the page before any of its scripts (a seeded scene): writes the planted save `awayMs` old (or fresh, under
   PLAYFIRST_CONTROL=stale, so no away settle can open the card) and pins Math.random to the seeded stream for 5,000
   calls, then 0.999 so nothing behind the card scores or offers a whistle. */
function plantInPage({ key, save, awayMs, seed, stale }) {
  try { const s = JSON.parse(save); s.savedAt = Date.now() - (stale ? 0 : awayMs); localStorage.setItem(key, JSON.stringify(s)); } catch { /* the line then opens no card and fails */ }
  let a = seed | 0, n = 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = () => (n++ < 5000 ? next() : 0.999);
}

/* Runs in the page: what the scene's card drew, against its `full` table. */
function cardFactsInPage({ label, full }) {
  const card = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].find(d => d.getAttribute('aria-label') === label);
  if (!card) return { open: false };
  const text = card.textContent || '';
  return { open: true, count: card.querySelectorAll(full.count).length, missing: full.lines.filter(l => !text.includes(l)) };
}

const span = b => (b ? `${b.top} to ${b.bottom}` : 'none');
const results = [];
const lines = [];
for (const route of routes) for (const [w, h] of WIDTHS) lines.push({ route, w, h, key: `${route}@${w}`, scene: null });
for (const sc of sceneRuns) for (const [w, h] of WIDTHS) lines.push({ route: sc.route, w, h, key: `${sc.key}@${w}`, scene: sc });
const sceneAborted = [];
const browser = await chromium.launch();
for (const { route, w, h, key, scene } of lines) {
  const res = { route, width: w, height: h, key };
  if (scene) Object.assign(res, { scene: scene.key, sceneLabel: scene.label, sceneButton: scene.button });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  try {
    if (scene) await page.addInitScript(plantInPage, { ...scene.seed, stale: CONTROL === 'stale' });
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (CONTROL === 'nobanner') await page.addStyleTag({ content: '[aria-label="Cookie choices"] { display: none !important; }' });
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, null, { timeout: 15000 }).catch(() => {});
    await page.waitForSelector(BANNER, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (scene) {
      res.card = await page.evaluate(cardFactsInPage, { label: scene.label, full: scene.full });
      if (res.card.open && (res.card.count !== scene.seed.count || res.card.missing.length)) {
        sceneAborted.push(`${scene.key} ${w}x${h} (${res.card.count} of ${scene.seed.count} drawn${res.card.missing.length ? `, missing "${res.card.missing.join('", "')}"` : ''})`);
      }
    }
    Object.assign(res, await page.evaluate(measureInPage, { BANNER, control: CONTROL }));
    /* the page must not jump: read after measureInPage (its scrollIntoView may scroll the root) and after the close */
    const where = () => page.evaluate(() => ({ y: Math.round(scrollY), h: document.documentElement.scrollHeight }));
    if (scene && res.dialogs) {
      res.before = await where();
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `playfirst-${scene.key.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-${w}${CONTROL ? `-${CONTROL}` : ''}.png`) });
      /* PLAYFIRST_CONTROL=jump: the picked button's click also pushes the page down 40 px, so the jump check must fire */
      if (CONTROL === 'jump') {
        res.controlApplied = await page.evaluate(() => {
          const b = document.querySelector('[data-playfirst-button]');
          if (!b) return false;
          b.addEventListener('click', () => { const d = document.createElement('div'); d.style.height = '40px'; document.body.prepend(d); }, { once: true });
          return true;
        });
      }
    }
    if (res.dialogs && res.at === 'tappable') {
      await page.mouse.click(res.cx, res.cy);
      let after = null;
      for (let i = 0; i < 10; i += 1) {
        await page.waitForTimeout(200);
        after = await page.evaluate(afterTapInPage, { BANNER });
        if (after.closed && !after.blocker) break;
      }
      Object.assign(res, after);
      if (scene) res.after = await where();
    }
  } catch (e) {
    res.error = String(e.message || e).split('\n')[0].slice(0, 120);
  }
  await ctx.close();
  results.push(res);
}
await browser.close();

/* PLAYFIRST_CONTROL=ratchet lists every walked route width as an expected site red, so every green or dialog free
   line must fail with "remove it from the list": proof the ratchet empties the list rather than hiding a fix. */
if (CONTROL === 'ratchet') for (const r of results) EXPECTED_SITE_RED[r.key] = 'control';
/* PLAYFIRST_CONTROL=expected covers every button and lists every route width that opened one, so each must print
   EXPECTED and none may fail: proof a listed red is held without failing the walk. */
if (CONTROL === 'expected') for (const r of results) if (r.button) EXPECTED_SITE_RED[r.key] = 'control';
const failures = [], noBanner = [];
let expected = 0, none = 0, passed = 0, fired = 0, withButton = 0, ratcheted = 0;
for (const r of results) {
  const where = `${r.scene ?? r.route} ${r.width}x${r.height}`;
  const bannerNote = `banner ${span(r.banner)}${r.bannerInside ? ' (inside the dialog)' : r.pending ? ' (pending)' : ''}`;
  let state, why;
  if (r.error) { state = 'FAIL'; why = `the page did not load: ${r.error}`; }
  else if (!r.banner) { state = 'NOBANNER'; why = 'the cookie banner never came on screen, so this line measured nothing'; noBanner.push(where); }
  else if (!r.dialogs && r.scene) { state = 'FAIL'; why = `the planted save opened no card, ${bannerNote}`; r.problems = ['nocard']; }
  else if (!r.dialogs) { state = 'NONE'; why = `no first visit dialog, ${bannerNote}`; }
  else {
    const head = `${r.kind} "${r.name}" (${r.position}) ${span(r.dialogBox)}`;
    if (!r.button) { state = 'FAIL'; why = `${head} has no button of its own, ${bannerNote}`; }
    else {
      withButton += 1;
      if (r.at === 'the control') fired += 1;
      const btn = `"${r.button}" (${r.how}) ${span(r.buttonBox)}`;
      const problems = [];
      if (r.at !== 'tappable') problems.push(['centre', `is not tappable: at its centre ${r.at}`]);
      if (r.overlap) problems.push(['under', `has ${r.overlap} of its ${r.buttonBox.bottom - r.buttonBox.top} px under the banner (its bottom ${r.depth} px below the banner's top)`]);
      if (!r.whole) problems.push(['offscreen', 'is partly off screen']);
      if (r.dialogBox.top < -1) problems.push(['top', `sits in a dialog whose top is ${-r.dialogBox.top} px above the screen, so its heading and close are out of reach`]);
      if (r.boxUnder > 1) problems.push(['boxunder', `sits in a dialog whose own box runs ${r.boxUnder} px under the banner`]);
      if (r.at === 'tappable' && !r.closed) problems.push(['close', 'was tapped but the dialog did not close']);
      if (r.at === 'tappable' && r.closed && r.blocker) problems.push(['blocker', `was tapped and the dialog closed, but ${r.blocker} still covers the screen`]);
      if (r.scene && r.name !== r.sceneLabel) problems.push(['scene', `is not in the planted card: the top dialog is "${r.name}", not "${r.sceneLabel}"`]);
      if (r.scene && r.button !== r.sceneButton) problems.push(['scenebutton', `is not the card's own "${r.sceneButton}"`]);
      if (r.scene && r.before && r.after && (r.before.y !== r.after.y || r.before.h !== r.after.h)) {
        problems.push(['jump', `made the page jump: scrollY ${r.before.y} to ${r.after.y}, height ${r.before.h} to ${r.after.h} between the card open and closed`]);
      }
      r.problems = problems.map(p => p[0]);
      if (problems.length) { state = 'FAIL'; why = `${head}, ${btn} ${problems.map(p => p[1]).join('; ')}, ${bannerNote}`; }
      else {
        state = 'PASS';
        why = `${head}, ${btn} tappable${r.clear !== null ? ` (${r.clear} px above the banner)` : ''}, ${bannerNote}; tapped, closed, screen usable`;
        if (r.scene) why += `; the full card (${r.card?.count} results) drawn, the page held at scrollY ${r.after?.y}, height ${r.after?.h}`;
      }
    }
  }
  const note = EXPECTED_SITE_RED[r.key];
  if (note && !r.error && state !== 'NOBANNER') {
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
const seeded = results.filter(r => r.scene);
console.log(`${results.length} route widths walked over ${routes.length} routes${seeded.length ? ` and ${sceneRuns.length} seeded scene${sceneRuns.length === 1 ? '' : 's'} (${seeded.length} of the lines)` : ''}: ${passed} dialogs tapped and closed, ${expected} expected site reds, ${none} without a first visit dialog, ${failures.length} red`);
if (sceneAborted.length) {
  console.log(`playFirstVisitDialogs ABORTED: the planted trip did not draw the full card on ${sceneAborted.length} line${sceneAborted.length === 1 ? '' : 's'}, so they would measure a smaller card: ${sceneAborted.join('; ')}`);
  process.exit(2);
}
/* PLAYFIRST_CONTROL=stale plants every scene's save fresh, so no away settle can open its card: every seeded line must
   then fail as "the planted save opened no card", proof a scene cannot pass by measuring nothing. */
if (CONTROL === 'stale') {
  const judged = seeded.filter(r => !r.error && r.state !== 'NOBANNER');
  if (judged.length === 0) { console.log('playFirstVisitDialogs control ABORTED: PLAYFIRST_CONTROL=stale had no seeded line that loaded with the banner on screen'); process.exit(2); }
  const caught = judged.filter(r => r.state === 'FAIL' && r.problems?.includes('nocard'));
  if (caught.length === judged.length) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=stale FIRED. ${caught.length} of ${judged.length} seeded lines with a fresh save opened no card and failed the walk`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=stale did NOT fire on ${judged.length - caught.length} of ${judged.length} seeded lines: ${judged.filter(r => !caught.includes(r)).map(r => r.key).join(', ')}`);
  process.exit(3);
}
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
if (CONTROL === 'expected') {
  if (withButton === 0) { console.log('playFirstVisitDialogs control ABORTED: no route in this run opened a dialog with a button, so nothing was listed'); process.exit(2); }
  if (expected === withButton && failures.length === 0) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=expected FIRED. ${expected} of ${withButton} covered route widths listed in EXPECTED_SITE_RED printed EXPECTED and none failed the walk`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=expected did NOT fire: ${expected} of ${withButton} printed EXPECTED, ${failures.length} failed the walk`);
  process.exit(3);
}
/* edge and lift: each line the control moved must be red for the check it targets. For edge the centre must still
   read tappable, so the red comes from the whole button and box checks, not from the centre test that was already there. */
const hits = {
  edge: r => r.at === 'tappable' && r.problems.includes('under') && (r.kind !== 'dialog' || r.problems.includes('boxunder')),
  lift: r => r.problems.includes('top'),
  /* Round 1539: the seeded lines whose button pushes the page 40 px must each read red for the jump */
  jump: r => r.problems.includes('jump'),
};
if (hits[CONTROL]) {
  const moved = results.filter(r => r.controlApplied && r.button && r.problems);
  if (moved.length === 0) { console.log(`playFirstVisitDialogs control ABORTED: PLAYFIRST_CONTROL=${CONTROL} moved no dialog in this run`); process.exit(2); }
  const escaped = moved.filter(r => !hits[CONTROL](r));
  if (escaped.length === 0) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=${CONTROL} FIRED. ${moved.length} of ${moved.length} moved dialogs read red for the check it targets`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=${CONTROL} did NOT fire on ${escaped.length} of ${moved.length} moved dialogs: ${escaped.map(r => r.key).join(', ')}`);
  process.exit(3);
}
if (CONTROL === 'nobanner') {
  const judged = results.filter(r => !r.error).length;
  if (judged === 0) { console.log('playFirstVisitDialogs control ABORTED: no route width loaded'); process.exit(2); }
  if (noBanner.length === judged) { console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=nobanner FIRED. ${judged} of ${judged} route widths with the banner hidden were refused as measuring nothing`); process.exit(1); }
  console.log(`playFirstVisitDialogs: PLAYFIRST_CONTROL=nobanner did NOT fire: ${judged - noBanner.length} of ${judged} route widths still saw the banner on screen`);
  process.exit(3);
}
if (failures.length) {
  console.log(`playFirstVisitDialogs: RED. ${failures.length} route widths: ${failures.map(f => f.split(':')[0]).join(', ')}`);
  process.exit(1);
}
if (noBanner.length) {
  console.log(`playFirstVisitDialogs ABORTED: the cookie banner never came on screen on ${noBanner.length} route widths, so they measured nothing: ${noBanner.join(', ')}`);
  process.exit(2);
}
console.log('playFirstVisitDialogs: green. Every first visit dialog can be started with the cookie banner unanswered.');
