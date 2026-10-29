/* Review 1557 (run lens): one plausible mutation applied to a tree copy (never the checkout). Each anchor must be
   in its file exactly once, or the mutation refuses (exit 2), so a green afterwards can never be a no-op edit.
   Usage: node mut.mjs <tree dir> <id> */
import fs from 'node:fs';
import path from 'node:path';

const [dir, id] = process.argv.slice(2);
const M = {
  compidx: ['src/lib/careerBadges.ts', "const comp = s.edition.split('-')[0];", "const comp = s.edition.split('-')[1];"],
  offbyone: ['src/lib/nbaCareerSport.ts', '...(medals > 0 ? [', '...(medals > 1 ? ['],
  nobronze: ['src/lib/careerBadges.ts', "const INTL_MEDAL_PLACES = ['gold', 'silver', 'bronze'];", "const INTL_MEDAL_PLACES = ['gold', 'silver'];"],
  noclose: ['src/components/us-career/UsCareerBoard.tsx', "useEffect(() => { if (panel !== 'trophies') setIntlOpen(false); }, [panel]);", ''],
  norows: ['src/components/us-career/TrophyCase.tsx', 'const rows = extra && extra.length > 0 ? [...lines, ...extra] : lines;', 'const rows = lines;'],
  countmedals: ['src/components/us-career/TrophyCase.tsx', 'const total = lines.reduce((n, l) => n + l.n, 0);', 'const total = [...lines, ...(extra ?? [])].reduce((n, l) => n + l.n, 0);'],
  nocurtain: ['src/components/us-career/UsCareerBoard.tsx', ":${reveal ? 'curtain' : ''}", ''],
  wronggold: ['src/lib/careerBadges.ts', "test: f => (f.intl?.golds.wc ?? 0) >= 1 }", "test: f => (f.intl?.golds.oly ?? 0) >= 1 }"],
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
