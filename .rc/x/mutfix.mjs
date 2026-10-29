/* Round 1557 fix: one mutation applied to a tree copy (never the checkout). The anchor must be in its file exactly
   once, or the mutation refuses (exit 2), so a result afterwards can never come from a no-op edit.
   Usage: node mutfix.mjs <tree dir> <id> */
import fs from 'node:fs';
import path from 'node:path';

const [dir, id] = process.argv.slice(2);
const M = {
  nocurtain: ['src/components/us-career/UsCareerBoard.tsx', ":${reveal ? 'curtain' : ''}", ''],
  noclose: ['src/components/us-career/UsCareerBoard.tsx', "useEffect(() => { if (panel !== 'trophies') setIntlOpen(false); }, [panel]);", ''],
  /* attribution, not a mutation: the three new badges taken out again (NBA_BADGES back to 23) */
  no3badges: ['src/lib/careerBadges.ts', 'function intlBadges<F extends { intl?: IntlBadgeFacts }>(medalBlurb: string, olympicBlurb: string, worldLabel: string, worldBlurb: string): BadgeDef<F>[] {', 'function intlBadges<F extends { intl?: IntlBadgeFacts }>(medalBlurb: string, olympicBlurb: string, worldLabel: string, worldBlurb: string): BadgeDef<F>[] {\n  if (worldBlurb) return [];'],
  /* the bar for the national team's call lowered, so planted saves meet calls they never met (correction 9's prints) */
  lowcall: ['src/lib/nbaCareerIntlGate.ts', 'export const INTL_CALL_UP_OVR = 87;', 'export const INTL_CALL_UP_OVR = 40;'],
};
if (!M[id]) { console.error(`MUT ${id}: unknown`); process.exit(2); }
const [file, from, to] = M[id];
const abs = path.join(dir, file);
const src = fs.readFileSync(abs, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`MUT ${id}: ${file} holds the anchor ${hits} times, not once. Refusing.`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`MUT ${id}: nothing changed. Refusing.`); process.exit(2); }
fs.writeFileSync(abs, out);
console.log(`MUT ${id} applied to ${file}`);
