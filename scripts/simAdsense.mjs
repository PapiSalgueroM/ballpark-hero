/**
 * Round 274: everything the site needs to be reviewable for ads, checked here
 * so it cannot quietly rot between reviews.
 *
 * CONTEXT. AdSense turned this site down once for "low value content", and the
 * real cause was that every page served a crawler an empty JavaScript shell
 * with about 43 characters of readable text (Round 256, fixed in 257 and live).
 * That blocker is gone. This harness exists so the OTHER things a review needs
 * stay true: the verification tag, ads.txt, the policy pages a reviewer looks
 * for, and the ad component behaving like something worth approving.
 *
 * The rule this one is written to is that a board light must be actionable.
 * Anything the code controls is a hard failure. The one thing it does not
 * control, that every ad slot id in the repo is still a placeholder because
 * real ones can only be created inside Anthony's AdSense account, is REPORTED
 * as a number and never fails, because a red that nobody in this repo can
 * clear teaches everyone to ignore the board.
 *
 * Run: node scripts/simAdsense.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => readFileSync(path.join(ROOT, p), 'utf8');

/* ── 1: the publisher id is one id, in every place it appears ─────────── */
console.log('1) one publisher id, everywhere');
const indexHtml = read('index.html');
const adsTxt = existsSync(path.join(ROOT, 'public/ads.txt')) ? read('public/ads.txt') : '';
const banner = read('src/components/ads/AdBanner.tsx');
const consent = read('src/components/CookieConsent.tsx');

const ids = new Set();
for (const src of [indexHtml, adsTxt, banner, consent]) {
  for (const m of src.matchAll(/(?:ca-)?pub-(\d{10,20})/g)) ids.add(m[1]);
}
if (ids.size === 0) fail('no AdSense publisher id anywhere, so nothing can be verified or paid');
if (ids.size > 1) fail(`${ids.size} different publisher ids in the repo: ${[...ids].join(', ')}. One of them is wrong.`);
console.log(`   publisher id pub-${[...ids][0] ?? 'MISSING'} in index.html, ads.txt, AdBanner and the consent banner`);

/* ── 2: verification does not depend on a click ───────────────────────── */
/* The AdSense script itself is loaded only after a visitor accepts cookies,
   which is a deliberate privacy choice and is NOT changed here. It does mean
   a verifier that never clicks Accept will not see the script, so the meta tag
   is what has to carry verification. It is in the template, unconditional, and
   every prerendered snapshot copies the head, so it is on all 126 documents. */
console.log('2) site verification survives a visitor who never accepts cookies');
if (!/<meta\s+name="google-adsense-account"/.test(indexHtml)) {
  fail('index.html has no google-adsense-account meta tag, and the ad script is behind a consent click, so nothing verifies the site');
}
if (!/localStorage\.getItem\('cookie-consent'\)\s*===\s*'accepted'/.test(indexHtml)) {
  console.log('   note: the consent gate in index.html changed shape, re-read it before trusting this section');
}
const snapDir = path.join(ROOT, 'public');
let withMeta = 0, snaps = 0, stubs = 0;
for (const e of readdirSync(snapDir, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const f = path.join(snapDir, e.name, 'index.html');
  if (!existsSync(f)) continue;
  const html = readFileSync(f, 'utf8');
  /* Round 272's retired signposts and Round 278's noindex stubs are small
     documents whose only job is to declare one thing. Head furniture the page
     will never use is not missing from them, it was never wanted. Counted
     separately rather than excluded silently, so the number stays honest. */
  if (!html.includes('/prerender-boot.js') || /name="robots"[^>]*content="noindex/.test(html)) { stubs += 1; continue; }
  snaps += 1;
  if (html.includes('google-adsense-account')) withMeta += 1;
}
if (withMeta < snaps) {
  fail(`${snaps - withMeta} prerendered pages have no verification meta tag`);
}
console.log(`   meta tag in the template and on ${withMeta} of ${snaps} shipped documents (${stubs} redirect and noindex stubs excluded by design)`);

/* ── 3: ads.txt is exactly what Google reads ──────────────────────────── */
console.log('3) ads.txt');
const lines = adsTxt.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
if (!lines.length) fail('public/ads.txt is missing or empty, which shows up in AdSense as an earnings warning');
for (const l of lines) {
  const parts = l.split(',').map(s => s.trim());
  if (parts.length < 3) { fail(`ads.txt line is not a valid record: ${l}`); continue; }
  if (parts[0] !== 'google.com') fail(`ads.txt names ${parts[0]} rather than google.com`);
  if (!/^pub-\d{10,20}$/.test(parts[1])) fail(`ads.txt publisher field is malformed: ${parts[1]}`);
  if (!/^(DIRECT|RESELLER)$/.test(parts[2])) fail(`ads.txt relationship is ${parts[2]}, which is neither DIRECT nor RESELLER`);
}
console.log(`   ${lines.length} record(s), all well formed`);

/* ── 4: the pages a reviewer looks for are real pages ─────────────────── */
console.log('4) the policy pages exist, are submitted, and have real content on them');
const app = read('src/App.tsx');
const sitemap = existsSync(path.join(ROOT, 'public/sitemap.xml')) ? read('public/sitemap.xml') : '';
const REQUIRED = ['/privacy', '/terms', '/about', '/contact'];
for (const r of REQUIRED) {
  if (!app.includes(`path="${r}"`)) { fail(`${r} has no route in App.tsx`); continue; }
  if (!sitemap.includes(`<loc>https://douknowball.com${r}</loc>`)) fail(`${r} is not in the sitemap`);
  const f = path.join(ROOT, 'public', r.slice(1), 'index.html');
  if (!existsSync(f)) { fail(`${r} has no prerendered document, so a crawler gets the shell`); continue; }
  const html = readFileSync(f, 'utf8');
  const readable = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
  /* 1500 characters is a floor, not a target: the thinnest of these four is
     /contact and it measures far above it. A page that fell under this would
     be a stub, which is exactly what "low value content" means. */
  if (readable < 1500) fail(`${r} ships only ${readable} readable characters, which is a stub`);
}
console.log(`   ${REQUIRED.length} required pages, all routed, all submitted, all with real prerendered text`);

/* ── 5: the privacy policy says what Google requires it to say ────────── */
console.log('5) the advertising disclosures');
const privacy = read('src/pages/PrivacyPolicy.tsx');
const MUST_SAY = [
  [/Google AdSense/i, 'that Google AdSense serves the ads'],
  [/cookie/i, 'that cookies are used'],
  [/personali[sz]ed ads/i, 'that ads can be personalised'],
  [/google\.com\/settings\/ads|adssettings\.google/i, "a link to Google's own ads settings so a reader can opt out"],
];
for (const [re, what] of MUST_SAY) {
  if (!re.test(privacy)) fail(`the privacy policy does not state ${what}`);
}
console.log(`   all ${MUST_SAY.length} disclosures present`);

/* ── 6: an empty ad slot is not labelled as an advertisement ──────────── */
console.log('6) the ad component never labels an empty box');
if (!/data-ad-status/.test(banner)) {
  fail('AdBanner does not watch data-ad-status, so it cannot know whether an ad ever arrived');
}
if (!/state === 'filled'/.test(banner)) {
  fail('AdBanner does not gate the Advertisement label on a filled slot, so an empty box calls itself an advertisement');
}
if (!/script\[src\*="adsbygoogle\.js"\]/.test(banner)) {
  fail('AdBanner no longer checks whether the ad script is present, so with consent withheld it draws an empty box on every page');
}
console.log('   collapses with no script, collapses on unfilled, labels only what filled');

/* ── 7: reported, never failed ────────────────────────────────────────── */
console.log('7) ad slot ids');
const slots = new Set();
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.tsx?$/.test(e.name)) continue;
    for (const m of readFileSync(p, 'utf8').matchAll(/slot="(\d+)"/g)) slots.add(m[1]);
  }
};
walk(path.join(ROOT, 'src'));
/* The placeholder test is a RANGE, not a shape. A first attempt used a regex
   and reported 9 of 26, which was simply wrong: every id in the repo sits in
   one contiguous block starting at the canonical 1234567890, and a check that
   undercounts the problem it exists to report is worse than not having it. */
const placeholders = [...slots].filter(s => Number(s) >= 1234567890 && Number(s) <= 1234568000);
console.log(`   ${slots.size} distinct slot ids in use, ${placeholders.length} still placeholders`);
if (placeholders.length) {
  console.log('   NOT A FAILURE: real slot ids can only be created inside the AdSense account, so this');
  console.log('   is a line for the owner rather than a red light for anyone in this repo. Until they are');
  console.log('   real, every slot answers unfilled and section 6 is what keeps those boxes off the page.');
}

console.log('');
if (failures > 0) {
  console.error(`simAdsense: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simAdsense: green. Verification, ads.txt, the policy pages and the ad component are all review ready.');
