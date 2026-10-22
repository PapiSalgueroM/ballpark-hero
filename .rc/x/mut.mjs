// Round 1535 review (run lens), runner only: apply ONE mutation to scripts/lib/answerConsent.mjs.
// The request line restores the file with git checkout -- scripts in the same line.
// The line a mutation replaces must exist first, or it aborts with exit 3 (a mutation that changes nothing proves nothing).
import fs from 'node:fs';

const FILE = 'scripts/lib/answerConsent.mjs';
const M = {
  // swapped argument: the reject choice walks the accept labels (presses "Accept all" and still says 'rejected')
  swapLists: [
    "for (const label of choice === 'accept' ? ACCEPT_LABELS : REJECT_LABELS) {",
    "for (const label of choice === 'accept' ? REJECT_LABELS : ACCEPT_LABELS) {",
  ],
  // stale constant: storedConsent reads only the pre 1442 key
  staleKey: [
    "const v2 = local.getItem('cookie-consent-v2');",
    'const v2 = null;',
  ],
  // inverted mapping: a stored v2 answer reads the wrong way round
  invertMap: [
    "return value.advertising || value.analytics ? 'accepted' : 'rejected';",
    "return value.advertising || value.analytics ? 'rejected' : 'accepted';",
  ],
  // dropped settle: no wait for the banner to go or for data-consent-pending to clear
  noSettle: [
    "  await banner.waitFor({ state: 'hidden', timeout });\n  await page.waitForFunction(() => !document.body.hasAttribute('data-consent-pending'), null, { timeout });\n",
    '',
  ],
  // dropped filter: the banner selector loses the region (the shape the banner actually has), so it is never found
  dialogOnly: [
    `export const CONSENT_REGION = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';`,
    `export const CONSENT_REGION = '[role="dialog"][aria-label="Cookie choices"]';`,
  ],
};

const name = process.argv[2];
if (!M[name]) { console.log(`MUTATION ${name} ABORTED: no such mutation`); process.exit(3); }
const [from, to] = M[name];
const src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(from)) { console.log(`MUTATION ${name} ABORTED: the line is not in ${FILE}`); process.exit(3); }
const next = src.replace(from, to);
if (next === src) { console.log(`MUTATION ${name} ABORTED: nothing changed`); process.exit(3); }
fs.writeFileSync(FILE, next);
console.log(`MUTATION ${name} applied to ${FILE}`);
