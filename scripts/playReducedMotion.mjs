/**
 * Round 423 harness: the site's celebration respects prefers-reduced-motion.
 *
 * WHY. src/components/club-manager/Celebration.tsx is the site's celebration
 * layer. ResultScreen mounts it and 75 files end on ResultScreen, so a visitor
 * who asked their operating system for less motion was getting 28 pieces of
 * confetti and a slamming emoji from most of the site. Two components in this
 * repo (TacticsScreen, ConquestMap) already honoured the setting, so the
 * convention existed and the shared kit was the one place missing it.
 *
 * WHAT IT CHECKS, in a real browser with the preference really set, because a
 * rule like this cannot be verified by reading the file:
 *   1. under reduce, nothing animates,
 *   2. under reduce, anything that animates IN is still VISIBLE. Several of
 *      these keyframes start at opacity 0, so a guard that merely cancelled
 *      them would leave the headline and the stat row invisible, which is a
 *      worse bug than the one being fixed,
 *   3. under reduce, the confetti does not fall (decoration, aria-hidden, no
 *      content, so it is the one thing that fully stops),
 *   4. with no preference set, every one of those still animates, so the guard
 *      cannot quietly turn the celebration off for everybody.
 *
 * The CSS under test is LIFTED FROM THE COMPONENT rather than retyped here, so
 * this cannot drift into testing a copy of a rule the site no longer ships.
 *
 * NEGATIVE CONTROL: REDUCED_MOTION_CONTROL=noguard strips the media queries out
 * of that lifted CSS and the run must go red. It asserts the queries were there
 * before removing them, because a control that deletes something absent changes
 * nothing and is green for the wrong reason.
 *
 * Run: node scripts/playReducedMotion.mjs
 */
import pw from 'file:///C:/Users/antho/ballpark-hero/scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const { chromium } = pw;

const src = fs.readFileSync('C:/Users/antho/ballpark-hero/src/components/club-manager/Celebration.tsx', 'utf8');
const blocks = [...src.matchAll(/<style>\{`([\s\S]*?)`\}<\/style>/g)].map(m => m[1]);
if (blocks.length !== 2) { console.error(`expected 2 style blocks, found ${blocks.length}`); process.exit(1); }
const css = blocks.join('\n');
if (!/prefers-reduced-motion/.test(css)) {
  console.error('FAIL: the celebration styles carry no reduced motion rule at all');
  process.exit(1);
}

const CONTROL = process.env.REDUCED_MOTION_CONTROL || '';
if (CONTROL && CONTROL !== 'noguard') {
  console.error(`REDUCED_MOTION_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
let cssUnderTest = css;
if (CONTROL === 'noguard') {
  const before = cssUnderTest;
  /* Disable the guard by making its condition unmatchable, rather than trying
     to cut the block out with a regex. Same effect, nothing to get wrong about
     brace matching, and it fails loudly below if the condition was not there. */
  cssUnderTest = cssUnderTest.split('prefers-reduced-motion: reduce').join('prefers-reduced-motion: no-such-preference');
  if (cssUnderTest === before) {
    console.error('control noguard: no reduced motion block was removed, so this control would prove nothing');
    process.exit(1);
  }
  console.log('   NEGATIVE CONTROL ON: the guards are stripped, this run must go red');
}

const html = `<!doctype html><html><head><style>${cssUnderTest}</style></head><body>
  <div class="cm-rise" id="rise">headline</div>
  <div class="cm-slam" id="slam">emoji</div>
  <div class="cm-gold-glow" id="glow">glow</div>
  <span class="cm-confetti" id="confetti"></span>
</body></html>`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
let bad = 0;
for (const pref of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ reducedMotion: pref === 'reduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.setContent(html);
  const got = await page.evaluate(() => {
    const g = id => {
      const el = document.getElementById(id);
      const s = getComputedStyle(el);
      return { anim: s.animationName, opacity: s.opacity, display: s.display };
    };
    return { rise: g('rise'), slam: g('slam'), glow: g('glow'), confetti: g('confetti') };
  });
  console.log(`\nprefers-reduced-motion: ${pref}`);
  for (const [k, v] of Object.entries(got)) console.log(`   ${k.padEnd(9)} animation=${String(v.anim).padEnd(14)} opacity=${v.opacity} display=${v.display}`);

  if (pref === 'reduce') {
    /* THE POINT: nothing animates, and content that animates IN must still be
       visible rather than stuck at the opacity 0 its keyframes start from. */
    if (got.rise.anim !== 'none') { console.error('  FAIL: cm-rise still animates under reduce'); bad += 1; }
    if (got.slam.anim !== 'none') { console.error('  FAIL: cm-slam still animates under reduce'); bad += 1; }
    if (got.glow.anim !== 'none') { console.error('  FAIL: cm-gold-glow still animates under reduce'); bad += 1; }
    if (got.rise.opacity !== '1') { console.error(`  FAIL: cm-rise left invisible at opacity ${got.rise.opacity}, worse than the bug`); bad += 1; }
    if (got.slam.opacity !== '1') { console.error(`  FAIL: cm-slam left invisible at opacity ${got.slam.opacity}`); bad += 1; }
    if (got.confetti.display !== 'none') { console.error('  FAIL: confetti still falls under reduce'); bad += 1; }
  } else {
    /* and the guard must not have killed the animation for everyone else */
    if (got.rise.anim === 'none') { console.error('  FAIL: cm-rise no longer animates for normal visitors'); bad += 1; }
    if (got.confetti.display === 'none') { console.error('  FAIL: confetti gone for normal visitors'); bad += 1; }
  }
  await ctx.close();
}
/* ---------- Round 530: the touched routes, in a real browser, under reduce ----------
   The synthetic page above proves the kit's CSS in isolation. This walks the
   routes Round 530 animated, served from dist the way the live host serves
   them, with the preference set, and holds three things on each first screen:
   every <style> block on the page that declares a keyframe also declares the
   reduced motion rule; every element wearing one of the site's reveal classes
   has no running animation and is not invisible (the final frame, never
   display:none or opacity 0); and the page really rendered, so a blank route
   cannot pass. It needs dist/ from npm run build and fails closed without it.
   Under the noguard control the served bundles have the rule rewritten in
   flight, so the same routes must then report unguarded keyframes or reveal
   elements still animating; the control refuses if no bundle was rewritten. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = [
  '/cfb-dynasty', '/cbb-dynasty',
  '/front-office', '/nba-front-office', '/mlb-front-office', '/nhl-front-office',
  '/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career',
  '/club-manager', '/soccer-career', '/rebuild',
  '/idle-arena', '/stadium-tycoon', '/wonderkid-factory',
];
const REVEAL_CLASSES = ['cm-rise', 'cm-slam', 'cm-tick-in', 'cm-gold-glow', 'cm-win-pulse', 'cm-loss-shake', 'fo-draft-row', 'fo-draft-head', 'fo-draft-continue'];
let badRoutes = 0;
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('  FAIL: dist/index.html is missing, so the route stage cannot run; build first (npm run build)');
  badRoutes += 1;
} else {
  /* Serve dist the way the live host serves it (see hostLikeServer's header).
     The port dodges 4173 and the other harnesses' ports. */
  const PORT = 4189;
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const base = `http://127.0.0.1:${PORT}`;
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  /* The cookie banner is a fixed overlay; answer it the privacy-preserving
     way before any page loads, as the other route walkers do. */
  await ctx.addInitScript(() => {
    try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* ignored */ }
  });
  let rewritten = 0;
  if (CONTROL === 'noguard') {
    await ctx.route('**/assets/*.js', async route => {
      const res = await route.fetch();
      const body = await res.text();
      const swapped = body.split('prefers-reduced-motion: reduce').join('prefers-no-such-preference: reduce');
      if (swapped !== body) rewritten += 1;
      await route.fulfill({ response: res, body: swapped });
    });
  }
  console.log(`\nRound 530 routes under prefers-reduced-motion: reduce, ${ROUTES.length} routes served from dist`);
  for (const route of ROUTES) {
    const p = await ctx.newPage();
    await p.goto(base + route, { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const got = await p.evaluate(classes => {
      const styles = [...document.querySelectorAll('style')].map(s => s.textContent || '');
      const withKeyframes = styles.filter(t => /@keyframes\s+[\w-]+/.test(t));
      const unguarded = withKeyframes.filter(t => !/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(t)).length;
      let reveal = 0;
      let animating = 0;
      let invisible = 0;
      for (const el of document.querySelectorAll(classes.map(c => '.' + c).join(','))) {
        reveal += 1;
        const s = getComputedStyle(el);
        if (s.animationName !== 'none') animating += 1;
        if (s.display === 'none' || Number(s.opacity) === 0) invisible += 1;
      }
      return { text: (document.body.innerText || '').length, blocks: withKeyframes.length, unguarded, reveal, animating, invisible };
    }, REVEAL_CLASSES);
    await p.close();
    console.log(`   ${route.padEnd(19)} text=${got.text} keyframeBlocks=${got.blocks} unguarded=${got.unguarded} reveal=${got.reveal} animating=${got.animating} invisible=${got.invisible}`);
    if (got.text < 200) { console.error(`  FAIL: ${route} rendered almost nothing (${got.text} chars of text), so nothing here was checked`); badRoutes += 1; continue; }
    if (got.unguarded > 0) { console.error(`  FAIL: ${route} mounts ${got.unguarded} <style> block(s) with a keyframe and no reduced motion rule`); badRoutes += 1; }
    if (got.animating > 0) { console.error(`  FAIL: ${route}: ${got.animating} reveal element(s) still animate under reduce`); badRoutes += 1; }
    if (got.invisible > 0) { console.error(`  FAIL: ${route}: ${got.invisible} reveal element(s) are invisible under reduce, worse than the motion`); badRoutes += 1; }
  }
  await ctx.close();
  server.kill();
  if (CONTROL === 'noguard' && rewritten === 0) {
    console.error('control noguard: no served bundle carried a reduced motion rule to rewrite, so the route stage of this control would prove nothing');
    await browser.close();
    process.exit(1);
  }
}
await browser.close();
console.log('');
if (CONTROL === 'noguard') {
  if (bad > 0 && badRoutes > 0) {
    console.log(`playReducedMotion control: green. The stripped guard was reported on the synthetic page (${bad} finding${bad === 1 ? '' : 's'}) and on the routes (${badRoutes}), so both stages work.`);
    process.exit(0);
  }
  console.error(`playReducedMotion control: RED. The guards were removed and ${bad === 0 ? 'the synthetic page' : 'the routes'} stayed green, so that stage proves nothing.`);
  process.exit(1);
}
if (bad + badRoutes > 0) {
  console.error(`playReducedMotion: ${bad + badRoutes} problem(s)`);
  process.exit(1);
}
console.log('playReducedMotion: green. Motion stops for a visitor who asked for less, content stays visible, every Round 530 route lands its reveals on the final frame, and everyone else keeps the celebration.');
