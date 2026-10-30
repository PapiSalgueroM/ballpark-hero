/* Round 1605 review mutations (run lens, never committed). node .rc/x/review-run-mut.mjs <m1|m3|m4>
   Each asserts its needle is in the file first and refuses (exit 2) otherwise, then writes the mutant.
   m1 DROPPED FILTER: Take the job's lift loses its pending condition (always lifted, bottom-0 gone), so once the
      banner is answered the var is gone and the bar floats at the 230px fallback.
   m3 DROPPED VARIANT: Training's lift loses its sm: prefix, so below 640 the in-flow (relative) button is shoved up.
   m4 SITE SIDE: the banner stops writing --dukb-consent-height, so every lift falls back to 230px. */
import fs from 'node:fs';

const which = process.argv[2];
const M = {
  m1: ['src/pages/ClubManager.tsx',
    'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm [body[data-consent-pending]_&]:bottom-[var(--dukb-consent-height,230px)]',
    'fixed left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm bottom-[var(--dukb-consent-height,230px)]'],
  m3: ['src/pages/SoccerCareer.tsx',
    'sm:[body[data-consent-pending]_&]:bottom-[calc(var(--dukb-consent-height,230px)_+_5.5rem)]',
    '[body[data-consent-pending]_&]:bottom-[calc(var(--dukb-consent-height,230px)_+_5.5rem)]'],
  m4: ['src/components/CookieConsent.tsx',
    "document.body.style.setProperty('--dukb-consent-height', ",
    'void ('],
  /* m5: the control's own needle gone from SoccerCareer.tsx, so CONSENT_BAR_CONTROL=nolift must refuse (exit 2) */
  m5: ['src/pages/SoccerCareer.tsx',
    '[body[data-consent-pending]_&]:bottom-[var(--dukb-consent-height,230px)]',
    '[body[data-consent-pending]_&]:bottom-[var(--dukb-consent-height,231px)]'],
};
const m = M[which];
if (!m) { console.log(`mutation ABORTED: unknown ${which}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutation ABORTED: ${which} needle found ${n} times in ${file}, want 1`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATED ${which} in ${file}`);
