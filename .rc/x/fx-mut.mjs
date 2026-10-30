/* Round 1605 fixer mutations (never committed). node .rc/x/fx-mut.mjs <m1|m3|m6|m7>
   Each asserts its needle is in the file exactly once first and refuses (exit 2) otherwise, then writes the mutant.
   m1 (review run m1): Take the job's lift loses its pending condition, so it stays lifted once the banner is answered.
   m3 (review run m3): Training's lift loses its sm: prefix, so below 640 the in flow button is shoved up.
   m6: the kept aside save card loses this round's lift (the shell before the fix).
   m7: the footer lift stops counting the pending banner (useFooterLift before the fix). */
import fs from 'node:fs';

const which = process.argv[2];
const M = {
  m1: ['src/pages/ClubManager.tsx',
    'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm [body[data-consent-pending]_&]:bottom-[var(--dukb-consent-height,230px)]',
    'fixed left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm bottom-[var(--dukb-consent-height,230px)]'],
  m3: ['src/pages/SoccerCareer.tsx',
    'sm:[body[data-consent-pending]_&]:bottom-[calc(var(--dukb-consent-height,230px)_+_5.5rem)]',
    '[body[data-consent-pending]_&]:bottom-[calc(var(--dukb-consent-height,230px)_+_5.5rem)]'],
  m6: ['src/components/BrokenSaveRestore.tsx',
    "'fixed bottom-4 [body[data-consent-pending]_&]:bottom-[calc(var(--dukb-consent-height,230px)_+_1rem)] left-4",
    "'fixed bottom-4 left-4"],
  m7: ['src/pages/SoccerCareer.tsx',
    "const banner = pending ? (height ? parseFloat(height) || 0 : 230) : 0;",
    'const banner = 0;'],
};
const m = M[which];
if (!m) { console.log(`mutation ABORTED: unknown ${which}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutation ABORTED: ${which} needle found ${n} times in ${file}, want 1`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATED ${which} in ${file}`);
