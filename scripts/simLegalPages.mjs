/* The legal surface runs on guards now, not prose.

   Round 304, off the owner's 2026-08-27 instruction ("make sure we have
   nothing that we can get sued from") and the audit it triggered. The audit's
   sharpest structural finding: this repo's whole culture is guard backed
   rules, and the legal pages were the one load bearing area running on prose.
   The footer disclaimer could have been deleted and every harness stayed
   green. These five owner decisions from docs/LEGAL_REVIEW.md become checks:

   1. the footer disclaimer names every body the site touches and carries the
      independent fan project sentence;
   2. the Terms name the individual DBA entity and Massachusetts law;
   3. one single contact address everywhere: privacy, terms, contact, about,
      and the report relay all agree, and the deletion promise with its 30
      day answer stands next to it;
   4. disclosure completeness as a MACHINE: every external service host the
      shipped code actually talks to must be named in Privacy Section 4, so
      the next SDK cannot ship without its disclosure (the audit found two
      that did);
   5. the ads consent claims match the code: the pages must not promise
      personalized ads while the slot-driven loader requests non personalized,
      and the executable template must never start AdSense globally.

   Negative controls:
     SIM_LEGAL_CONTROL=strip deletes the disclaimer sentence;
     SIM_LEGAL_CONTROL=npa removes non personalized treatment from the
     slot-driven loader;
     SIM_LEGAL_CONTROL=npaorder swaps the treatment assignment with the
     script append;
     SIM_LEGAL_CONTROL=globalads injects an executable global AdSense loader
     into the template.
   Every mutation must find exactly one target and must cause exactly its own
   named failure.

   Run: node scripts/simLegalPages.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const failureMessages = [];
const fail = m => { failures += 1; failureMessages.push(m); console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_LEGAL_CONTROL ?? '';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const replaceExactlyOnce = (src, needle, replacement, label) => {
  const hits = src.split(needle).length - 1;
  if (hits !== 1) {
    console.error(`control run: ${label} expected exactly one mutation target, found ${hits}`);
    process.exit(1);
  }
  return src.replace(needle, replacement);
};

/* Strip comments so a guard can never be satisfied by prose about itself,
   the four-in-one-day lesson from the verification doctrine. */
const stripComments = s => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

let footer = stripComments(read('src/components/game/Footer.tsx'));
if (CONTROL === 'strip') {
  const needle = 'independent fan project';
  footer = replaceExactlyOnce(footer, needle, '', 'footer disclaimer control');
}
const privacy = stripComments(read('src/pages/PrivacyPolicy.tsx'));
const terms = stripComments(read('src/pages/TermsOfService.tsx'));
const contact = stripComments(read('src/pages/Contact.tsx'));
const about = stripComments(read('src/pages/About.tsx'));
const relay = stripComments(read('supabase/functions/report-relay/index.ts'));

console.log('1) the footer disclaimer stands, whole');
{
  if (!footer.includes('independent fan project')) fail('the independent fan project sentence is gone from the footer');
  /* The governing body pair is checked as the exact run the disclaimer
     prints, "MLB, FIFA, UEFA", which is also the shape the rival names
     allowlist recognizes as disclaimer context; a bare quoted string here
     would (rightly) trip that guard. */
  if (!footer.includes('MLB, FIFA, UEFA')) fail('the footer disclaimer no longer carries the MLB, FIFA, UEFA governing body run');
  for (const org of ['NFL', 'NBA', 'UFC', 'NHL', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'MLS', 'Saudi Pro League', 'IOC', 'NCAA', 'NASCAR', 'ATP', 'WTA']) {
    if (!footer.includes(org)) fail(`the footer disclaimer no longer names ${org}`);
  }
  if (!footer.includes('identification and commentary only')) fail('the player names and statistics sentence is gone');
  console.log('   the disclaimer names every body and keeps both load bearing sentences');
}

console.log('2) the Terms keep their entity and their law');
{
  if (!/individual/i.test(terms)) fail('the Terms no longer disclose the individual DBA entity');
  if (!terms.includes('Massachusetts')) fail('the Terms no longer name Massachusetts law');
  if (/[Bb]y using the Site, you agree to the display of these ads/.test(terms)) {
    fail('the Terms claim consent-by-use for ads, which the cookie banner contradicts and EEA law forbids');
  }
  console.log('   individual DBA and Massachusetts both present, no consent-by-use ads claim');
}

console.log('3) one contact address everywhere, with the deletion promise beside it');
{
  const ADDR = 'douknowball1@gmail.com';
  for (const [name, src] of [['privacy', privacy], ['terms', terms], ['contact', contact], ['about', about], ['report relay', relay]]) {
    if (!src.includes(ADDR)) fail(`${name} does not carry ${ADDR}`);
    const others = [...src.matchAll(/[\w.+-]+@gmail\.com/g)].map(m => m[0]).filter(a => a !== ADDR);
    if (others.length) fail(`${name} carries a second address: ${[...new Set(others)].join(', ')}`);
  }
  if (!/within 30 days/.test(privacy)) fail('the 30 day answer promise is gone from the privacy policy');
  if (!/delete/.test(privacy)) fail('the deletion right is gone from the privacy policy');
  console.log(`   ${ADDR} in all five places, no strays, the 30 day promise stands`);
}

console.log('4) every external host the code talks to is disclosed in the privacy policy');
{
  /* Walk the shipped code for outbound hosts, then demand each one's
     disclosure. The map is host -> the name Section 4 must use. A new SDK
     adds a host here the moment its fetch lands in src or supabase, and
     this section goes red until the policy names it. */
  const DISCLOSE = {
    'supabase.co': 'Supabase',
    'formsubmit.co': 'FormSubmit',
    'ai.gateway.lovable.dev': 'Lovable',
    'generativelanguage.googleapis.com': 'Gemini',
    'wikipedia.org': 'Wikipedia',
    'googlesyndication.com': 'AdSense',
    'googletagmanager.com': 'Analytics',
  };
  const scan = [];
  const walk = dir => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name)) walk(path.join(dir, e.name)); continue; }
      if (/\.(ts|tsx|html)$/.test(e.name)) scan.push(path.join(dir, e.name));
    }
  };
  walk('src'); walk('supabase');
  scan.push('index.html');
  const found = new Set();
  for (const f of scan) {
    const s = stripComments(read(f));
    for (const host of Object.keys(DISCLOSE)) if (s.includes(host)) found.add(host);
  }
  if (found.size < 5) fail(`only ${found.size} known hosts found in the code, the scan is broken`);
  for (const host of found) {
    if (!privacy.includes(DISCLOSE[host])) fail(`the code talks to ${host} but the privacy policy never says "${DISCLOSE[host]}"`);
  }
  console.log(`   ${found.size} external hosts in shipped code, every one named in Section 4`);
}

console.log('5) the ads claims match the ads code');
{
  const adBanner = stripComments(read('src/components/ads/AdBanner.tsx'));
  let consented = stripComments(read('src/lib/consentedScripts.ts'));
  let template = stripComments(read('index.html'));
  if (CONTROL === 'npa') {
    consented = replaceExactlyOnce(
      consented,
      'w.adsbygoogle.requestNonPersonalizedAds = 1;',
      '',
      'non personalized treatment control',
    );
  }
  if (CONTROL === 'npaorder') {
    const flag = 'w.adsbygoogle.requestNonPersonalizedAds = 1;';
    const append = 'document.head.appendChild(s);';
    const marker = '__SIM_LEGAL_NPA_ORDER__';
    if (!(consented.indexOf(flag) < consented.indexOf(append))) {
      console.error('control run: the source flag is not before the script append, refusing an order control that starts red');
      process.exit(1);
    }
    if (consented.includes(marker)) {
      console.error('control run: the order swap marker already exists in source');
      process.exit(1);
    }
    consented = replaceExactlyOnce(consented, flag, marker, 'non personalized order flag control');
    consented = replaceExactlyOnce(consented, append, flag, 'non personalized order append control');
    consented = replaceExactlyOnce(consented, marker, append, 'non personalized order marker control');
    if (!(consented.indexOf(append) < consented.indexOf(flag))) {
      console.error('control run: the order swap changed no executable order');
      process.exit(1);
    }
  }
  if (CONTROL === 'globalads') {
    const globalLoader = `<script>
window.adsbygoogle = window.adsbygoogle || [];
window.adsbygoogle.requestNonPersonalizedAds = 1;
var adScript = document.createElement('script');
adScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
document.head.appendChild(adScript);
</script>
</head>`;
    template = replaceExactlyOnce(template, '</head>', globalLoader, 'global AdSense loader control');
  }

  const npaAssignment = /\.requestNonPersonalizedAds\s*=\s*1\b/.exec(consented);
  const adSenseAppend = /document\.head\.appendChild\(\s*s\s*\)/.exec(consented);
  if (!npaAssignment) {
    fail('the slot-driven AdSense loader no longer requests non personalized treatment');
  }
  if (npaAssignment && (!adSenseAppend || npaAssignment.index >= adSenseAppend.index)) {
    fail('the non personalized flag is not assigned before the AdSense script is appended');
  }
  if (!consented.includes('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]')) {
    fail('the AdSense loader no longer requires a deliberate page slot before loading');
  }
  if (/adsbygoogle\.js|pagead2\.googlesyndication\.com|requestNonPersonalizedAds/.test(template)) {
    fail('index.html executable code globally loads AdSense instead of waiting for a deliberate slot');
  }
  if (!/consent !== 'accepted'/.test(adBanner) && !/consent === 'accepted'/.test(adBanner)) {
    fail('AdBanner no longer gates explicitly on accepted consent');
  }
  /* The pages must not promise personalization the code refuses. The Google
     mandated Section 5 sentences describe what GOOGLE's cookies can do and
     keep the word, so the check is scoped to OUR claims: the phrase
     "including personalized ads" was the audit's marker for a first person
     promise, and it must stay gone. */
  for (const [name, src] of [['privacy', privacy], ['terms', terms]]) {
    if (src.includes('including personalized ads')) fail(`${name} still promises personalized ads in the first person`);
  }
  console.log('   slot-driven loader keeps non personalized treatment, template stays ad free, explicit consent gate stands');
}

if (CONTROL) {
  const expected = {
    strip: 'the independent fan project sentence is gone from the footer',
    npa: 'the slot-driven AdSense loader no longer requests non personalized treatment',
    npaorder: 'the non personalized flag is not assigned before the AdSense script is appended',
    globalads: 'index.html executable code globally loads AdSense instead of waiting for a deliberate slot',
  }[CONTROL];
  if (!expected) {
    console.error(`\ncontrol run: unknown SIM_LEGAL_CONTROL=${CONTROL}`);
    process.exit(1);
  }
  const owned = failureMessages.filter(m => m === expected).length;
  const unexpected = failureMessages.filter(m => m !== expected);
  if (owned === 1 && unexpected.length === 0) {
    console.log(`\ncontrol run: exact owned failure fired for ${CONTROL}`);
    process.exit(0);
  }
  console.error(`\ncontrol run: expected one owned failure for ${CONTROL}, got ${owned}; unexpected=${unexpected.length}`);
  process.exit(1);
}
console.log('   teeth: comment stripped sources, host scan walks the real code, single address regexed against strays');
if (failures > 0) { console.error(`\nsimLegalPages: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimLegalPages: all green');
