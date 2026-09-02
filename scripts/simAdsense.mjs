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
 * Anything the code controls is a hard failure. Round 400 connected the real
 * responsive unit from the AdSense account, so a missing or placeholder slot
 * is a hard failure too.
 *
 * Run: node scripts/simAdsense.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const failureMessages = [];
const fail = m => { failures += 1; failureMessages.push(m); console.error('  FAIL: ' + m); };
const read = p => readFileSync(path.join(ROOT, p), 'utf8');
const CONTROL = process.env.SIM_ADSENSE_CONTROL || '';
const CONTROL_FAILURES = {
  'same-page-consent': ['CookieConsent stores the answer but does not notify already mounted ad slots in the same tab'],
  'stale-player-photos': ['the privacy policy still claims a Wikipedia player-photo integration that the site does not use'],
  'fact-clarity': [
    'the terms do not distinguish fictional simulation estimates from real sports facts',
    'the terms still dismiss all game statistics as approximations, contradicting the verified-data promise',
  ],
  'script-without-slot': ['loadAdSense does not refuse pages with no explicit manual ad slot'],
  'noindex-guard': ['loadAdSense does not refuse a deliberate slot when the page is noindexed'],
  'slot-before-consent': ['AdBanner renders or starts its timeout before the visitor explicitly accepts consent'],
  'loader-result': [
    'AdBanner no longer collapses when the guarded loader refuses the page',
    'AdBanner ignores the loader result and may push on an ineligible page',
  ],
  'noindex-ad': ['ResetPassword.tsx is noindexed but still renders AdBanner'],
  'ad-status-behavior': ['AdBanner does not read and watch data-ad-status, so it cannot know whether an ad ever arrived'],
  'snapshot-loader': ['public/privacy/index.html contains an executable adsbygoogle.js loader'],
  'placeholder-slot': ['src/pages/Footle.tsx uses AdBanner slot 1234567890 instead of 7540487748'],
  'missing-slot': ['found 74 source AdBanner callers, expected exactly 75'],
  'privacy-npa-bridge': ["the privacy policy does not distinguish Google's general disclosure from this site's non-personalized ad request"],
  'delayed-consent': ['AdBanner does not read stored consent before its first render'],
};
if (CONTROL && !Object.hasOwn(CONTROL_FAILURES, CONTROL)) {
  console.error(`SIM_ADSENSE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const mutateOnce = (source, needle, replacement, name) => {
  if (CONTROL !== name) return source;
  const matches = source.split(needle).length - 1;
  if (matches !== 1) throw new Error(`${name} control expected one exact target, found ${matches}`);
  console.log(`   CONTROL ${name}: exact target changed in memory`);
  return source.replace(needle, replacement);
};
const codeOnly = source => source
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/[^\n]*/gm, ' ');
const executableScripts = source => [...source.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)]
  .filter(([, attrs]) => {
    const type = attrs.match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
    return !type || type === 'module' || /(?:java|ecma)script/.test(type);
  })
  .map(match => codeOnly(match[0]))
  .join('\n');
const PRIVACY_NPA_BRIDGE = "The first two bullets below are Google's general publisher disclosure. The prior-visit and cross-site personalization described in them are not the ad-selection mode this Site requests. Before Google's advertising script loads, this Site sets Google's non-personalized ads flag. Google may still use cookies and identifiers for frequency capping, aggregate reporting, fraud prevention, and similar purposes.";

/* ── 1: the publisher id is one id, in every place it appears ─────────── */
console.log('1) one publisher id, everywhere');
const indexHtml = read('index.html');
const adsTxt = existsSync(path.join(ROOT, 'public/ads.txt')) ? read('public/ads.txt') : '';
let banner = read('src/components/ads/AdBanner.tsx');
let consent = read('src/components/CookieConsent.tsx');
let privacySource = read('src/pages/PrivacyPolicy.tsx');
let termsSource = read('src/pages/TermsOfService.tsx');

/* Round 285: the banner no longer carries the id itself, it calls
   src/lib/consentedScripts.ts, which is where both gated scripts live now. */
let consented = read('src/lib/consentedScripts.ts');

consent = mutateOnce(
  consent,
  'window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));',
  'void CONSENT_CHANGED_EVENT;',
  'same-page-consent',
);
privacySource = mutateOnce(
  privacySource,
  'We use the following third-party services:',
  'We use the following third-party services: Wikipedia REST API fetches player photographs.',
  'stale-player-photos',
);
privacySource = mutateOnce(
  privacySource,
  PRIVACY_NPA_BRIDGE,
  '',
  'privacy-npa-bridge',
);
termsSource = mutateOnce(
  termsSource,
  'Fictional simulation outputs such as ratings, future seasons, finances, and generated results are entertainment estimates, not records of real events.',
  'Player statistics and data presented in the games are approximations for entertainment purposes and may not reflect exact real-world figures.',
  'fact-clarity',
);
consented = mutateOnce(
  consented,
  "if (!document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]')) return false;",
  "void document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]');",
  'script-without-slot',
);
consented = mutateOnce(
  consented,
  'if (document.querySelector(\'meta[name="robots"][content*="noindex"]\')) return false;',
  'void document.querySelector(\'meta[name="robots"][content*="noindex"]\');',
  'noindex-guard',
);
banner = mutateOnce(
  banner,
  "if (consent !== 'accepted') return null;",
  "if (consent === 'essential') return null;",
  'slot-before-consent',
);
banner = mutateOnce(
  banner,
  'if (!loadAdSense()) {',
  'loadAdSense();\n    if (false) {',
  'loader-result',
);
banner = mutateOnce(
  banner,
  "const status = el.getAttribute('data-ad-status');",
  'const status = null;',
  'ad-status-behavior',
);
banner = mutateOnce(
  banner,
  'const [consent, setConsent] = useState<string | null>(readStoredConsent);',
  'const [consent, setConsent] = useState<string | null>(null);',
  'delayed-consent',
);
const ids = new Set();
for (const src of [indexHtml, adsTxt, banner, consented]) {
  for (const m of src.matchAll(/(?:ca-)?pub-(\d{10,20})/g)) ids.add(m[1]);
}
if (ids.size === 0) fail('no AdSense publisher id anywhere, so nothing can be verified or paid');
if (ids.size > 1) fail(`${ids.size} different publisher ids in the repo: ${[...ids].join(', ')}. One of them is wrong.`);
if (!/pub-\d{10,20}/.test(consented)) fail('src/lib/consentedScripts.ts carries no publisher id, so the banner cannot start ads in the session somebody accepts');
if (!/loadConsentedScripts\(\)/.test(consent)) fail('CookieConsent does not call loadConsentedScripts on accept, so ads and analytics wait for the next page load');
console.log(`   publisher id pub-${[...ids][0] ?? 'MISSING'} in index.html, ads.txt, AdBanner and consentedScripts.ts`);

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
const snapshotFiles = [];
const collectSnapshots = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSnapshots(file);
    else if (entry.name === 'index.html') snapshotFiles.push(file);
  }
};
collectSnapshots(snapDir);
let withMeta = 0, snaps = 0, stubs = 0;
for (const f of snapshotFiles) {
  const relative = path.relative(snapDir, f).split(path.sep).join('/');
  let html = readFileSync(f, 'utf8');
  if (relative === 'privacy/index.html') {
    html = mutateOnce(
      html,
      '</head>',
      '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n</head>',
      'snapshot-loader',
    );
  }
  if (/adsbygoogle\.js/i.test(executableScripts(html))) {
    fail(`public/${relative} contains an executable adsbygoogle.js loader`);
  }
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
/* ROUND 285 REWROTE THIS SECTION TWICE OVER.

   WHAT IT READS. It used to read src/pages/PrivacyPolicy.tsx, and two of its
   four checks were being satisfied by the comment explaining why they had been
   added: prose about the code is the one place the string a guard looks for is
   guaranteed to appear. It now reads the SHIPPED document, public/privacy/
   index.html reduced to the words a reviewer's crawler gets, with comments,
   scripts and markup gone, plus the link targets in it. What the source says
   is not the question; what the page says is.

   WHAT IT ASKS FOR. Four things were checked and Google's "Required content"
   page for AdSense asks for more than that. Measured on 2026-08-25 the policy
   said Google AdSense serves ads, that cookies are used, that ads can be
   personalised and where Google's ads settings are, and did not say that third
   party vendors including Google use cookies based on prior visits, that other
   vendors and ad networks may serve ads too, where the industry opt-out lives
   (aboutads.info), or where Google explains what it does with the data
   (policies.google.com/technologies/partner-sites). Roughly two thirds of the
   list. All of it is on the page now and all of it is held here, as the shape
   of the sentence rather than one word from it, so a policy that mentions
   cookies once in passing cannot pass a check about advertising cookies. */
console.log('5) the advertising disclosures, as shipped');
{
  const f = path.join(ROOT, 'public/privacy/index.html');
  if (!existsSync(f)) {
    fail('public/privacy/index.html is missing, so the disclosures a reviewer would read cannot be checked');
  } else {
    const html = readFileSync(f, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const words = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const MUST_SAY = [
      [/Google AdSense/i, 'that Google AdSense serves the ads'],
      [/third[ -]party vendors, including Google, use cookies to serve ads based on/i, 'that third party vendors including Google use cookies to serve ads based on prior visits'],
      [/advertising cookies enables it and its partners to serve ads/i, "that Google's advertising cookies let it and its partners serve ads across sites"],
      [/web beacons[\s\S]{0,80}IP addresses[\s\S]{0,80}other identifiers/i, 'that ad serving may use web beacons, IP addresses, and other identifiers'],
      [/opt out of personali[sz]ed advertising/i, 'how to opt out of personalised advertising'],
      [/other third[ -]party vendors and ad networks may also serve ads/i, 'that other vendors and ad networks may serve ads on the site'],
      [/Essential only/, 'what the Essential only choice on the banner does'],
      [/Cookie choices/, 'that consent can be withdrawn from the footer'],
      [/Google Analytics/, 'that Google Analytics is used and behind the same consent'],
    ];
    for (const [re, what] of MUST_SAY) {
      if (!re.test(words)) fail(`the shipped privacy policy does not state ${what}`);
    }
    const MUST_LINK = [
      [/google\.com\/settings\/ads|adssettings\.google\.com/, "Google's ads settings"],
      [/aboutads\.info/, 'the aboutads.info opt-out'],
      [/policies\.google\.com\/technologies\/partner-sites/, "Google's partner sites explanation"],
    ];
    for (const [re, what] of MUST_LINK) {
      if (!hrefs.some(h => re.test(h))) fail(`the shipped privacy policy does not link to ${what}`);
    }
    console.log(`   ${MUST_SAY.length} statements and ${MUST_LINK.length} links, all present in the shipped document (${words.length} readable characters)`);
  }
  /* The withdrawal link the policy promises has to exist and has to do the
     one thing that makes it a withdrawal: forget the stored answer. Read as
     code, not as a comment: the call itself. */
  const footer = read('src/components/game/Footer.tsx').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
  if (!/localStorage\.removeItem\(\s*'cookie-consent'\s*\)/.test(footer)) {
    fail("the footer has no control that removes the stored 'cookie-consent' answer, so the withdrawal the policy promises does not exist");
  }
  if (!/Cookie choices/.test(footer)) fail('the footer does not offer the Cookie choices control the policy names');

  if (/Wikipedia REST API[\s\S]{0,100}player photographs/i.test(codeOnly(privacySource))) {
    fail('the privacy policy still claims a Wikipedia player-photo integration that the site does not use');
  }
  const privacyWords = codeOnly(privacySource).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!privacyWords.includes(PRIVACY_NPA_BRIDGE)) {
    fail("the privacy policy does not distinguish Google's general disclosure from this site's non-personalized ad request");
  }

  const termsWords = codeOnly(termsSource).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!/real trivia and historical data accurate/i.test(termsWords)) {
    fail('the terms do not say that real trivia and historical data are kept accurate');
  }
  if (!/fictional simulation outputs such as ratings, future seasons, finances, and generated results are entertainment estimates/i.test(termsWords)) {
    fail('the terms do not distinguish fictional simulation estimates from real sports facts');
  }
  if (/Player statistics and data presented in the games are approximations/i.test(termsWords)) {
    fail('the terms still dismiss all game statistics as approximations, contradicting the verified-data promise');
  }
}

/* ── 5b: analytics rides on the same consent gate as the ads ──────────── */
/* Round 285 wired Google Analytics (G-KZQK2G68YC, from the owner on
   2026-08-25). It loads in exactly the two places the ad script loads, behind
   exactly the same check, and this holds three things: the id is one id in
   both copies, the tag is never a static script element in the template, and
   every mention of either script URL in index.html sits inside the consent
   branch. The branch is found by matching braces from the consent check, so a
   copy of the URL pasted above it, which is how the vendor's snippet arrives,
   fails here rather than quietly tracking everyone. */
console.log('5b) analytics loads only behind the same consent as the ads');
{
  const gaIds = new Set();
  for (const src of [indexHtml, consented]) {
    for (const m of src.matchAll(/\bG-[A-Z0-9]{6,12}\b/g)) gaIds.add(m[0]);
  }
  if (gaIds.size === 0) fail('no GA4 measurement id in index.html or consentedScripts.ts');
  if (gaIds.size > 1) fail(`${gaIds.size} different GA4 ids: ${[...gaIds].join(', ')}`);
  if (!/G-[A-Z0-9]{6,12}/.test(consented)) fail('consentedScripts.ts has no measurement id, so accepting the banner never starts analytics');
  if (/<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js/i.test(indexHtml)) {
    fail('index.html loads gtag.js as a plain script tag, which runs for every visitor whether they accepted or not');
  }
  const gate = indexHtml.indexOf("localStorage.getItem('cookie-consent') === 'accepted'");
  if (gate < 0) {
    fail('index.html has no consent gate, so nothing can be behind it');
  } else {
    const open = indexHtml.indexOf('{', gate);
    let depth = 0, close = -1;
    for (let i = open; i < indexHtml.length; i++) {
      if (indexHtml[i] === '{') depth += 1;
      else if (indexHtml[i] === '}') { depth -= 1; if (depth === 0) { close = i; break; } }
    }
    const inside = indexHtml.slice(open, close);
    /* whole line comments only: a URL contains a double slash too */
    const stripped = indexHtml.replace(/<!--[\s\S]*?-->/g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');
    for (const url of ['googletagmanager.com/gtag/js']) {
      const all = (stripped.match(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const gated = (inside.match(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (all === 0) fail(`index.html never loads ${url} at all`);
      if (all !== gated) fail(`${url} appears ${all} time(s) in index.html code and only ${gated} inside the consent branch`);
    }
    if (/adsbygoogle\.js/.test(codeOnly(indexHtml))) {
      fail('index.html loads AdSense globally, which can make private, reset, fallback, and no-content routes eligible for Auto Ads');
    }
  }
  if (!/adsbygoogle\.js/.test(codeOnly(consented))) {
    fail('consentedScripts.ts has no on-demand AdSense loader for real ad slots');
  }
  console.log(`   measurement id ${[...gaIds][0] ?? 'MISSING'}, analytics stays gated globally and ads load only beside a real slot`);
}

/* ── 6: an empty ad slot is not labelled as an advertisement ──────────── */
console.log('6) the ad component never labels an empty box');
const bannerBehavior = codeOnly(banner);
if (!/getAttribute\(\s*['"]data-ad-status['"]\s*\)/.test(bannerBehavior)
    || !/new MutationObserver\(read\)/.test(bannerBehavior)
    || !/attributeFilter:\s*\[\s*['"]data-ad-status['"]\s*\]/.test(bannerBehavior)) {
  fail('AdBanner does not read and watch data-ad-status, so it cannot know whether an ad ever arrived');
}
if (!/state === 'filled'/.test(bannerBehavior)) {
  fail('AdBanner does not gate the Advertisement label on a filled slot, so an empty box calls itself an advertisement');
}
if (!/if\s*\(\s*!loadAdSense\(\)\s*\)/.test(bannerBehavior)) {
  fail('AdBanner no longer collapses when the guarded loader refuses the page');
}
console.log('   collapses when ineligible or unfilled, labels only what filled');

/* ── 6b: accepting consent wakes an ad already mounted on this page ───── */
console.log('6b) same-page consent reaches an already mounted ad');
{
  const consentCode = codeOnly(consent);
  const bannerCode = codeOnly(banner);
  const sharedCode = codeOnly(consented);
  if (!/useState(?:<[^>]+>)?\(\s*(?:readStoredConsent|\(\s*\)\s*=>\s*readStoredConsent\(\s*\))\s*\)/.test(bannerCode)) {
    fail('AdBanner does not read stored consent before its first render');
  }
  if (!/export const CONSENT_CHANGED_EVENT\s*=\s*'[^']+'/.test(sharedCode)) {
    fail('consentedScripts.ts does not export one event name for same-page consent changes');
  }
  if (!/window\.dispatchEvent\(new Event\(CONSENT_CHANGED_EVENT\)\)/.test(consentCode)) {
    fail('CookieConsent stores the answer but does not notify already mounted ad slots in the same tab');
  }
  if (!/addEventListener\(CONSENT_CHANGED_EVENT/.test(bannerCode) || !/removeEventListener\(CONSENT_CHANGED_EVENT/.test(bannerCode)) {
    fail('AdBanner does not subscribe and unsubscribe from the same-page consent event');
  }
  if (!/if\s*\(\s*consent\s*!==\s*['"]accepted['"]\s*\)\s*return null/.test(bannerCode)) {
    fail('AdBanner renders or starts its timeout before the visitor explicitly accepts consent');
  }
  console.log('   either choice notifies the current page, and an ad exists only after Accept');
}

/* ── 6c: the AdSense script exists only beside a deliberate ad slot ───── */
console.log('6c) no global Auto Ads eligibility on non-content routes');
{
  const bannerCode = codeOnly(banner);
  const sharedCode = codeOnly(consented);
  const noindexGuard = sharedCode.indexOf('meta[name="robots"][content*="noindex"]');
  const slotGuard = sharedCode.indexOf('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]');
  const existingScript = sharedCode.indexOf('script[src*="adsbygoogle.js"]');
  if (!/if\s*\(\s*!document\.querySelector\(\s*['"]\[data-dukb-manual-ad\] ins\.adsbygoogle\[data-ad-slot\]['"]\s*\)\s*\)\s*return false/.test(sharedCode)) {
    fail('loadAdSense does not refuse pages with no explicit manual ad slot');
  }
  if (!/querySelector\(\s*['"]meta\[name=[\\'"]robots[\\'"]\]\[content\*=[\\'"]noindex[\\'"]\]['"]\s*\)\s*\)\s*return false/.test(sharedCode)) {
    fail('loadAdSense does not refuse a deliberate slot when the page is noindexed');
  }
  if (noindexGuard < 0 || slotGuard < 0 || existingScript < 0 || !(noindexGuard < slotGuard && slotGuard < existingScript)) {
    fail('loadAdSense does not fail closed before reusing an existing script');
  }
  if (!/data-dukb-manual-ad/.test(bannerCode)) {
    fail('AdBanner does not mark its wrapper as a deliberate manual ad slot');
  }
  if (!/if\s*\(\s*!loadAdSense\(\)\s*\)\s*\{/.test(bannerCode)) {
    fail('AdBanner ignores the loader result and may push on an ineligible page');
  }
  const pagesDir = path.join(ROOT, 'src/pages');
  for (const name of readdirSync(pagesDir)) {
    if (!name.endsWith('.tsx')) continue;
    let page = readFileSync(path.join(pagesDir, name), 'utf8');
    if (name === 'ResetPassword.tsx') {
      page = mutateOnce(page, '<PageSeo', '<AdBanner slot="123" /><PageSeo', 'noindex-ad');
    }
    const pageCode = codeOnly(page);
    if (/\bnoindex\b/.test(pageCode) && /<AdBanner\b/.test(pageCode)) {
      fail(`${name} is noindexed but still renders AdBanner`);
    }
  }
  console.log('   the verification meta stays global, but the ad script is limited to pages with an AdBanner');
}

/* ── 7: every manual ad uses the real display unit ────────────────────── */
console.log('7) one production slot on every AdBanner caller');
const EXPECTED_SLOT = '7540487748';
const EXPECTED_CALLERS = 75;
const srcDir = path.join(ROOT, 'src');
const adCallers = [];
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.tsx?$/.test(e.name)) continue;
    const relative = `src/${path.relative(srcDir, p).split(path.sep).join('/')}`;
    let source = readFileSync(p, 'utf8');
    if (relative === 'src/pages/Footle.tsx') {
      source = mutateOnce(
        source,
        `<AdBanner slot="${EXPECTED_SLOT}" format="horizontal" className="mt-8" />`,
        '',
        'missing-slot',
      );
      source = mutateOnce(source, `slot="${EXPECTED_SLOT}"`, 'slot="1234567890"', 'placeholder-slot');
    }
    for (const match of codeOnly(source).matchAll(/<AdBanner\b[\s\S]*?>/g)) {
      const slot = match[0].match(/\bslot\s*=\s*"([^"]+)"/)?.[1] ?? '(missing or dynamic)';
      adCallers.push({ relative, slot });
    }
  }
};
walk(srcDir);
if (adCallers.length === 0) fail('no shipped AdBanner callers exist');
if (adCallers.length !== EXPECTED_CALLERS) {
  fail(`found ${adCallers.length} source AdBanner callers, expected exactly ${EXPECTED_CALLERS}`);
}
const wrongSlotCallers = adCallers.filter(caller => caller.slot !== EXPECTED_SLOT);
for (const caller of wrongSlotCallers) {
  fail(`${caller.relative} uses AdBanner slot ${caller.slot} instead of ${EXPECTED_SLOT}`);
}
console.log(`   ${adCallers.length} callers scanned against slot ${EXPECTED_SLOT}, ${wrongSlotCallers.length} mismatch${wrongSlotCallers.length === 1 ? '' : 'es'}`);

console.log('');
if (CONTROL) {
  const expected = [...CONTROL_FAILURES[CONTROL]].sort();
  const actual = [...failureMessages].sort();
  const exact = actual.length === expected.length && actual.every((message, i) => message === expected[i]);
  if (exact) {
    console.log(`simAdsense control: green. ${CONTROL} caused exactly ${expected.length} owned failure${expected.length === 1 ? '' : 's'}.`);
    process.exit(0);
  }
  console.error(`simAdsense control: RED. ${CONTROL} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simAdsense: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simAdsense: green. Verification, ads.txt, the policy pages and the ad component are all review ready.');
