// Release BO triage, runner only, SCRATCH: rewrite the old cookie banner answer in the named walk files of the
// runner's own throwaway checkout, so a walk can get past the Round 1442 banner ("Essential only" became
// "Reject all", "Accept" became "Accept all", the choice moved from cookie-consent to cookie-consent-v2).
// Every rewrite matches BOTH labels, so the same patched walk runs on a tree before or after 1442.
// This is never committed: Round 1535 (session J) owns the real helper.
//   node .rc/x/consentPatch.mjs scripts/playX.mjs [scripts/lib/y.mjs ...]
// A named file with no old form in it and no mark of an earlier patch is refused (exit 2): a patch that
// changes nothing must not let a walk run as though it had been answered.
import fs from 'node:fs';
const MARK = '/* consentPatch BO triage */';
const RULES = [
  [/\{\s*name:\s*'Essential only',\s*exact:\s*true\s*\}/g, "{ name: /^(Essential only|Reject all)$/ }"],
  [/\{ name: \/\^essential only\$\/i \}/g, '{ name: /^(essential only|reject all)$/i }'],
  [/'\^Essential only\$'/g, "'^(Essential only|Reject all)$'"],
  [/'button:has-text\("Essential only"\)'/g, `'button:has-text("Essential only"), button:has-text("Reject all")'`],
  [/\{ hasText: 'Essential only' \}/g, '{ hasText: /^\\s*(Essential only|Reject all)\\s*$/ }'],
  [/choice === 'accept' \? 'Accept' : 'Essential only'/g, "choice === 'accept' ? 'Accept all' : 'Reject all'"],
  [/localStorage\.getItem\('cookie-consent'\)/g, "(localStorage.getItem('cookie-consent') ?? (JSON.parse(localStorage.getItem('cookie-consent-v2') || 'null')?.advertising === false ? 'essential' : null))"],
];
// --preanswer: for a walk that never answers the banner (playSessionMarks), every phone page it opens answers it
// before any page code runs, the way a returning visitor's device does (the legacy key, which 1442 migrates).
const PRE = [
  [/await browser\.newPage\(\{ viewport: \{ width: 390, height: 844 \} \}\)/g,
    "await browser.newPage({ viewport: { width: 390, height: 844 } }).then(async p => { await p.addInitScript(() => { try { if (!localStorage.getItem('cookie-consent-v2')) localStorage.setItem('cookie-consent', 'essential'); } catch {} }); return p; })"],
];
const args = process.argv.slice(2);
if (args[0] === '--preanswer') { args.shift(); RULES.splice(0, RULES.length, ...PRE); }
let bad = 0;
for (const f of args) {
  const src = fs.readFileSync(f, 'utf8');
  if (src.startsWith(MARK)) { console.log(`consentPatch: ${f} already patched`); continue; }
  let out = src, n = 0;
  for (const [rx, to] of RULES) out = out.replace(rx, () => { n++; return to; });
  if (!n) { console.log(`consentPatch: REFUSED ${f}: no old banner form in it`); bad++; continue; }
  const tmp = `${f}.cp${process.pid}`;
  fs.writeFileSync(tmp, MARK + '\n' + out.replace(/^#!.*\n/, ''));
  fs.renameSync(tmp, f);
  console.log(`consentPatch: ${f}: ${n} rewrite(s)`);
}
if (bad) process.exit(2);
