/**
 * ROUND 321 BROWSER HARNESS: every game offers its rules from the screen the
 * player actually sees.
 *
 * The house rule, held since the early rounds and re-asked in the owner's
 * 2026-08-28 review ("the how-to-play popup audit across every game"): every
 * game shows instructions, rules and a worked example before play,
 * re-openable from a "?" button. Round 321 mounted a standard GameHelp "?"
 * in GameShell, but a third of the site draws its own layout, and a source
 * grep cannot judge what a visitor can actually see: four different rounds
 * of this repo's history say a check that reads code finds the shape it was
 * told about and nothing else. So this one asks the rendered page.
 *
 * ROUND 335 TIGHTENS IT TWICE, because as written it was green for the wrong
 * reason on most of the site.
 *
 * The first hole was the prose verdict. It admitted any short visible element
 * whose text opens with "how to play", and GameSeoContent renders exactly
 * that ("How to play {game}") in the SEO block at the BOTTOM of every game
 * page. So a page with no rules control anywhere still passed, on boilerplate
 * that sits under the game, teaches nobody mid-move and reopens nothing. The
 * prose verdict now refuses anything inside [data-seo-content], which is that
 * block's own marker, so it can only be satisfied by rules the game itself
 * puts on the setup screen.
 *
 * The second hole was the word "re-openable", which the harness had never
 * actually asked about. Prose on a setup screen is gone the moment you press
 * Start, and a control that unmounts with the setup screen is gone with it.
 * So section 2 drives each game one press into play, proves the screen really
 * changed, and then requires a CONTROL, never prose: rules you have already
 * scrolled past are not rules you can reopen.
 *
 * WHAT COUNTS as a rules affordance, most specific first:
 *   1. a visible control whose aria-label or text names the rules ("How to
 *      play", "Rules", "Instructions");
 *   2. a visible button whose entire text is a question mark;
 *   3. a lucide help-circle icon inside a visible button;
 *   4. a visible heading or section that already SHOWS the rules pre-play
 *      (a "How to play" heading on a setup screen counts, the point is the
 *      player can read the rules before their first move). SECTION 1 ONLY,
 *      and never from inside the SEO block.
 *
 * The database is aborted (no egress in the sandbox), which is fine on
 * purpose: the affordance must live at the shell or setup layer, not behind
 * a data load. A page that only explains itself after the data arrives has
 * the bug this harness exists to catch.
 *
 * HONESTY ABOUT SECTION 2. A game the harness cannot drive is reported as a
 * skip and named in the output, never counted as a pass. The skip list is
 * printed in full on every run so it stays auditable: a game that quietly
 * became undrivable is a thing to notice, not a thing to average away.
 *
 * NEGATIVE CONTROLS, both of which must change something or the run refuses:
 *   HOWTO_CONTROL=blind swaps the matcher for one that can match nothing and
 *     every route must then flag, proving the matcher is what passes pages
 *     rather than the harness structure.
 *   HOWTO_CONTROL=seo restores the old permissive prose verdict, re-admitting
 *     the SEO block. Routes that fail section 1 today must pass under it. If
 *     none flips, the control did not fire, the exclusion is proving nothing,
 *     and the harness says so and exits red rather than reporting a green it
 *     did not earn.
 *
 * Run: BASE=http://127.0.0.1:4173 node scripts/playHowTo.mjs
 *      ONLY=/footle,/world-xi scopes it while iterating.
 *      SECTION=1 runs the landing check alone (fast), SECTION=2 the play check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.HOWTO_CONTROL || '';
if (CONTROL && !['blind', 'seo', 'twin'].includes(CONTROL)) { console.error(`HOWTO_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const SECTION = process.env.SECTION || '';
if (SECTION && !['1', '2', '3'].includes(SECTION)) { console.error(`SECTION=${SECTION} is not a section this harness knows`); process.exit(1); }
const RUN_1 = !SECTION || SECTION === '1';
const RUN_2 = (!SECTION || SECTION === '2') && CONTROL !== 'seo' && CONTROL !== 'twin';
const RUN_3 = (!SECTION || SECTION === '3') && CONTROL !== 'seo' && CONTROL !== 'blind';

/* The game list comes from the registry file itself, uncommented rows only,
   so a retired game cannot keep a dead entry alive here. */
const reg = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
const ALL_ROUTES = [...reg.matchAll(/^\s*\{ path:\s*'([^']+)'/gm)].map(m => m[1]);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
const routes = ONLY ? ALL_ROUTES.filter(r => ONLY.includes(r)) : ALL_ROUTES;
if (routes.length === 0) { console.error('no routes matched'); process.exit(1); }

/* Borrowed from playGames, same reasons, same wording. Quitting is not
   progress, and "how to play" matches /play/, so the play words are anchored
   behind a lookahead or the rules button becomes the single most attractive
   control on the site and section 2 would drive itself into the dialog it is
   supposed to be looking for. */
const SURRENDER = /^(give up|quit|forfeit|surrender|abandon|yes,? reveal|reveal the answer|show (the )?answer|see the answer|play again|new game|restart|start over)/i;
const WANT = /^(?!how to\b).*(play now|start|continue|next|confirm|submit|take the job|sim|advance|begin|new career|pick|choose|select|draft|accept offer|roll|attack|invade|guess|reveal|spin|deal)/i;
/* Round 122's rule, and section 2 depends on it completely: a ticking clock
   makes every screen look new, so "the screen changed" would be true on a
   page where nothing happened and the drive would claim a play state it
   never reached. Only clock shaped tokens are masked, never bare digits,
   because a score going 0 to 1 is a real change. */
const CLOCK = /\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d+\s?(?:ms|s) (?:left|remaining)\b/gi;
const screenId = s => s.replace(CLOCK, '<clock>');

/* The page function, serialized into the browser, so it carries its own
   helpers. mode 'play' drops the prose verdict entirely. allowSeo is the
   old permissive behaviour, reachable only through HOWTO_CONTROL=seo. */
function readAffordance({ mode, allowSeo, blind, controlsBlind }) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  };
  if (blind) return null;
  /* controlsBlind hides verdicts 1 to 3 only, leaving the prose verdict
     standing. It is how the seo control manufactures the exact page this
     round was written about: one with no rules control anywhere, whose only
     "How to play" text is the SEO block at the bottom. */
  const controls = controlsBlind ? [] : [...document.querySelectorAll('button, a, [role="button"]')].filter(visible);
  for (const el of controls) {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = (el.textContent || '').trim().toLowerCase();
    if (/how to play|rules|instructions/.test(label) || /^(how to play|rules|instructions)\b/.test(text)) return 'labelled control';
    if (text === '?') return 'question mark button';
    if (el.querySelector('svg.lucide-help-circle, svg.lucide-circle-help')) return 'help icon button';
  }
  /* Once play has started, prose is not an answer. The setup screen that
     carried it is behind the player now and nothing brings it back. */
  if (mode === 'play') return null;
  for (const el of [...document.querySelectorAll('h1,h2,h3,h4,p,li,span,div')]) {
    if (!visible(el)) continue;
    /* The SEO block is the same boilerplate under all 130 games, below the
       game itself. It is why this verdict passed pages that had nothing. */
    if (!allowSeo && el.closest('[data-seo-content]')) continue;
    const t = (el.textContent || '').trim().toLowerCase();
    if (t.length < 120 && /^(how to play|how it works|the rules)\b/.test(t)) return 'rules shown pre-play';
  }
  return null;
}

/**
 * ROUND 348, section 3: how many ways in are there, exactly?
 *
 * GameShell's own doc comment has promised since Round 321 that "no page ever
 * shows two question marks", and nothing checked it. Round 335 measured 25
 * routes carrying two, wrote the finding down and deliberately did not act on
 * it, because the probe it measured with counted any control whose aria named
 * the rules, which also caught a dialog's own "Close the rules" button. A list
 * that mixes real duplicates with false ones is not a list you edit twenty
 * files from.
 *
 * So the counting rule is narrower than the finding rule, and the difference
 * is the whole point: a TRIGGER is a way INTO the rules. A control sitting
 * inside an open dialog is part of the rules panel already, so it is not a
 * second way in and is not counted. Everything else that would satisfy
 * verdicts 1 to 3 is.
 *
 * plantTwin is the negative control (HOWTO_CONTROL=twin): it clones the page's
 * real trigger and appends the copy, so the check must go red on every route
 * that had one. If the clone finds nothing to copy the run refuses rather than
 * reporting a green it did not earn.
 */
function countTriggers({ plantTwin }) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  };
  const isTrigger = (el) => {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = (el.textContent || '').trim().toLowerCase();
    if (/how to play|rules|instructions/.test(label) || /^(how to play|rules|instructions)\b/.test(text)) return true;
    if (text === '?') return true;
    return !!el.querySelector('svg.lucide-help-circle, svg.lucide-circle-help');
  };
  /* A control inside an open dialog is the panel's own furniture, its close
     button or its "Let's Play!" button, not another door to the same room. */
  const inOpenDialog = (el) => !!el.closest('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="dialog"], [role="alertdialog"]');
  const find = () => [...document.querySelectorAll('button, a, [role="button"]')]
    .filter(visible).filter(isTrigger).filter(el => !inOpenDialog(el));

  if (plantTwin) {
    const real = find()[0];
    if (!real) return { planted: false, count: find().length, labels: [] };
    const twin = real.cloneNode(true);
    twin.setAttribute('data-howto-twin', '');
    real.parentElement.appendChild(twin);
  }
  const found = find();
  return {
    planted: !!plantTwin,
    count: found.length,
    labels: found.map(el => (el.getAttribute('aria-label') || (el.textContent || '').trim()).slice(0, 40)),
  };
}

/* playGames' clearOverlays, same reasoning: most games pop their how-to
   dialog on a first visit as a shadcn Dialog portalled to the end of body
   behind a full screen overlay, so every click underneath times out until
   the room is cleared. Section 2 needs this twice, once before reading the
   landing screen and once after the press. */
async function clearOverlays(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first()
    .click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = page.locator('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if (await open.count().catch(() => 0) === 0) break;
    const closer = open.first().getByRole('button', { name: /^(close|got it|start|play|ok|done|let's go)/i });
    if (await closer.count().catch(() => 0) > 0) {
      await closer.first().click({ timeout: 1200 }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.waitForTimeout(250);
  }
}

/* Round 335, and it is worth a paragraph because it turned a 32 minute run
   into a 3 minute one AND made the check stricter at the same time.
 *
 * Every route was taking a flat 12.6 seconds inside page.goto, identical on
 * a heavy page and a light one, which is the shape of a hanging request
 * rather than the shape of work. The template's head carries a render
 * blocking Google Fonts stylesheet plus the ad and analytics tags, and the
 * sandbox has no egress, so each one sat there until the proxy gave up and
 * DOMContentLoaded waited on the stylesheet.
 *
 * The harness already aborted Supabase on exactly this reasoning ("the
 * affordance must live at the shell or setup layer, not behind a data
 * load"). The same sentence covers a font, an ad script and an analytics
 * tag: a rules button that only appears once a third party answers is a
 * rules button the player cannot rely on. So they are blocked by the same
 * rule rather than waited on, and what is left is the site's own code.
 *
 * The list is the template's own external hosts. flagcdn is deliberately
 * NOT here: it is the one permitted image host and a flag is site content. */
const OFFSITE = [
  '**://*.supabase.co/**',
  '**://fonts.googleapis.com/**',
  '**://fonts.gstatic.com/**',
  '**://pagead2.googlesyndication.com/**',
  '**://*.googletagmanager.com/**',
  '**://*.google-analytics.com/**',
];
async function blockOffsite(page) {
  for (const pattern of OFFSITE) await page.route(pattern, r => r.abort());
}

const CTRL_SEL = 'button, a, [role="button"]';

/** Visible controls with the index they hold in CTRL_SEL document order, so
 *  a choice made in the page can be clicked from the harness side. */
async function visibleControls(page) {
  return page.evaluate((sel) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    };
    return [...document.querySelectorAll(sel)]
      .map((el, i) => ({ i, vis: vis(el), text: (el.textContent || '').trim().slice(0, 80), aria: el.getAttribute('aria-label') || '' }))
      .filter(c => c.vis && (c.text || c.aria));
  }, CTRL_SEL);
}

/** One press into play. Returns the verdict string, or a reason it could not
 *  get there. Never presses the rules control itself (that would open the
 *  dialog and then find it, which proves nothing), never surrenders, and
 *  refuses any press that navigated off the game. */
async function enterPlay(page, route) {
  const before = screenId(await page.innerText('body').catch(() => ''));
  /* A control that navigated off the game is not play, and its label is the
     only stable handle on it once the reload has rebuilt the DOM, so the
     label is what gets struck off rather than the index. */
  const tried = new Set();
  for (let step = 0; step < 4; step++) {
    const cands = (await visibleControls(page).catch(() => []))
      .filter(c => {
        const t = c.text.toLowerCase();
        const a = c.aria.toLowerCase();
        if (tried.has(t)) return false;
        if (/how to play|rules|instructions/.test(a) || /^(how to play|rules|instructions)\b/.test(t)) return false;
        if (t === '?') return false;
        if (SURRENDER.test(t)) return false;
        return WANT.test(t);
      });
    if (cands.length === 0) return { skip: 'no control that starts play' };
    const pick = cands[0];
    await page.locator(CTRL_SEL).nth(pick.i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    if (!page.url().includes(route)) {
      /* It navigated away, so whatever that control was, it was not play.
         Strike the label, come back, and judge this game rather than another. */
      tried.add(pick.text.toLowerCase());
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
      await clearOverlays(page);
      continue;
    }
    await clearOverlays(page);
    await page.waitForTimeout(400);
    const after = screenId(await page.innerText('body').catch(() => ''));
    if (after !== before && after.trim().length > 0) return { entered: true };
  }
  return { skip: 'pressed every candidate control and the screen never changed' };
}

let browser = await chromium.launch();
let ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
let page = await ctx.newPage();
await blockOffsite(page);

const landing = new Map();
const playing = new Map();
const seoLoose = new Map();
const triggers = new Map();
const skips = [];

for (const route of routes) {
  let verdict = null;
  let reached = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if (CONTROL === 'seo') {
      /* Both readings of the same live page, so the only difference between
         them is the exclusion itself. Strict must refuse it, permissive must
         accept it, and the assertions at the end read both columns. */
      const strict = await page.evaluate(readAffordance, { mode: 'landing', allowSeo: false, blind: false, controlsBlind: true });
      const loose = await page.evaluate(readAffordance, { mode: 'landing', allowSeo: true, blind: false, controlsBlind: true });
      landing.set(route, strict);
      seoLoose.set(route, loose);
      console.log(`  ${route}: strict ${strict ?? 'NONE'}, SEO re-admitted ${loose ?? 'NONE'}`);
      continue;
    }
    if (RUN_1) {
      verdict = await page.evaluate(readAffordance, { mode: 'landing', allowSeo: false, blind: CONTROL === 'blind' });
    }
    if (RUN_3) {
      /* Clear the room first, so the first-visit how-to dialog is shut and
         the count reads the resting page a returning player sees. The dialog
         exclusion inside countTriggers is the second line of defence. */
      await clearOverlays(page);
      await page.waitForTimeout(300);
      const t = await page.evaluate(countTriggers, { plantTwin: CONTROL === 'twin' });
      triggers.set(route, t);
    }
    if (RUN_2) {
      await clearOverlays(page);
      await page.waitForTimeout(300);
      const step = await enterPlay(page, route);
      if (step.entered) {
        reached = await page.evaluate(readAffordance, { mode: 'play', allowSeo: false, blind: CONTROL === 'blind' });
        playing.set(route, reached);
      } else {
        skips.push(`${route} (${step.skip})`);
      }
    }
  } catch (e) {
    verdict = verdict ?? null;
  }
  if (RUN_1) landing.set(route, verdict);
  const parts = [];
  if (RUN_1) parts.push(verdict ? `landing: ${verdict}` : 'landing: NONE');
  if (RUN_2) parts.push(playing.has(route) ? (reached ? `in play: ${reached}` : 'in play: NONE') : 'in play: not driven');
  if (RUN_3) parts.push(`${triggers.get(route)?.count ?? 0} trigger(s)`);
  const bad = (RUN_1 && !verdict)
    || (RUN_2 && playing.has(route) && !playing.get(route))
    || (RUN_3 && CONTROL !== 'twin' && (triggers.get(route)?.count ?? 0) > 1);
  console.log(`  ${bad ? 'FAIL' : 'PASS'}  ${route}: ${parts.join(', ')}`);
}

await browser.close();

const miss1 = [...landing.entries()].filter(([, v]) => !v).map(([r]) => r);
const miss2 = [...playing.entries()].filter(([, v]) => !v).map(([r]) => r);

console.log('');
if (RUN_1 && CONTROL !== 'seo') console.log(`Section 1, the landing screen: ${routes.length} routes, ${routes.length - miss1.length} carry a rules affordance the visitor can see.`);
if (RUN_2) console.log(`Section 2, reopenable in play: ${playing.size} routes driven into play, ${playing.size - miss2.length} still offer a rules CONTROL. ${skips.length} could not be driven.`);
if (RUN_2 && skips.length) {
  console.log('  not driven, named so nobody has to average them away:');
  for (const s of skips) console.log(`    ${s}`);
}

const doubled = [...triggers.entries()].filter(([, t]) => t.count > 1);

if (RUN_3 && CONTROL !== 'twin') {
  console.log(`Section 3, one way in: ${triggers.size} routes, ${triggers.size - doubled.length} offer exactly one rules trigger.`);
}

if (CONTROL === 'twin') {
  /* The plant clones each page's real trigger, so every route that had one
     must now read two. A route with nothing to clone proves nothing and is
     reported rather than counted, and if the plant never landed anywhere the
     run refuses outright. */
  const planted = [...triggers.entries()].filter(([, t]) => t.planted && t.count > 1);
  const nothingToClone = [...triggers.entries()].filter(([, t]) => t.count === 0);
  console.log('');
  console.log(`playHowTo control twin: cloned the real trigger on ${planted.length} of ${triggers.size} route(s); ${nothingToClone.length} had none to clone.`);
  if (planted.length === 0) {
    console.error('playHowTo control twin: RED. The plant landed nowhere, so section 3 is proving nothing.');
    process.exit(1);
  }
  if (planted.length !== triggers.size - nothingToClone.length) {
    console.error('playHowTo control twin: RED. The plant did not double every route that had a trigger, so the count is not reading what it claims.');
    process.exit(1);
  }
  console.log('playHowTo control twin: green. Section 3 sees a second trigger wherever one is planted, so its green means one trigger and not a blind count.');
  process.exit(0);
}

if (CONTROL === 'blind') {
  const passed = [...landing.values()].filter(Boolean).length + [...playing.values()].filter(Boolean).length;
  if (passed === 0) { console.log('playHowTo control: green. Blinded, every route flags, so the matcher is what passes pages.'); process.exit(0); }
  console.error(`playHowTo control: RED. ${passed} route(s) still passed with the matcher blinded.`);
  process.exit(1);
}

if (CONTROL === 'seo') {
  /* The plant, and the reason it is built this way. An earlier draft of this
     control simply re-admitted the SEO block and demanded that some route be
     rescued by it, which can only ever fire on a tree that is already broken:
     once every game has a real control, the exclusion changes no verdict and
     the control would have gone red on healthy code, which is the coin toss
     Round 284 warned about.
   *
   * So it plants the defect instead. Both columns are read from the same live
   * page with the control verdicts blinded, which is exactly the page this
   * round was written about: a game with no rules control anywhere. What has
   * to be true is that the SEO block, and only the SEO block, is the
   * difference between the two columns on at least one route.
   *
   * Note what is deliberately NOT asserted: that strict refuses every route.
   * It does not, and it should not. A game whose first visit really does put
   * its rules on screen, Footle's opening dialog being the clearest one,
   * passes the strict prose verdict honestly, because that prose is the
   * game's own and not the footer's. Demanding zero would have made this
   * control fail on exactly the behaviour verdict 4 exists to reward. */
  const flipped = routes.filter(r => !landing.get(r) && seoLoose.get(r));
  const genuine = routes.filter(r => landing.get(r));
  console.log('');
  console.log(`playHowTo control seo: with no rules control on the page, ${flipped.length} of ${routes.length} route(s) pass ONLY once the SEO block is re-admitted. ${genuine.length} show real pre-play rules of their own and pass either way.`);
  if (flipped.length === 0) {
    console.error('playHowTo control seo: RED. The plant changed nothing, so the exclusion is proving nothing and the ordinary run must not be read as green.');
    process.exit(1);
  }
  console.log(`  rescued by the SEO block alone, among them: ${flipped.slice(0, 6).join(', ')}`);
  console.log('playHowTo control seo: green. The bottom of page SEO heading passes a control-less game under the old verdict and is refused under this one, so the exclusion is what does the work.');
  process.exit(0);
}

let red = false;
if (miss1.length > 0) {
  console.error(`playHowTo section 1: ${miss1.length} game(s) offer no visible way to learn the rules: ${miss1.join(', ')}`);
  red = true;
}
if (miss2.length > 0) {
  console.error(`playHowTo section 2: ${miss2.length} game(s) teach the rules before play and then take them away: ${miss2.join(', ')}`);
  red = true;
}
if (doubled.length > 0) {
  console.error(`playHowTo section 3: ${doubled.length} page(s) show more than one way into the rules, which GameShell's own contract says never happens:`);
  for (const [route, t] of doubled) console.error(`    ${route}: ${t.count} (${t.labels.join(' | ')})`);
  red = true;
}
if (red) process.exit(1);
console.log('playHowTo: green. Every game can teach a stranger before it tests them, and still answer the question once they have started.');
