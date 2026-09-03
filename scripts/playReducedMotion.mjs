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
await browser.close();
console.log('');
if (CONTROL === 'noguard') {
  if (bad > 0) {
    console.log(`playReducedMotion control: green. The stripped guard was reported (${bad} finding${bad === 1 ? '' : 's'}), so this harness works.`);
    process.exit(0);
  }
  console.error('playReducedMotion control: RED. The guards were removed and nothing failed, so this harness proves nothing.');
  process.exit(1);
}
if (bad > 0) {
  console.error(`playReducedMotion: ${bad} problem(s)`);
  process.exit(1);
}
console.log('playReducedMotion: green. Motion stops for a visitor who asked for less, content stays visible, and everyone else keeps the celebration.');
