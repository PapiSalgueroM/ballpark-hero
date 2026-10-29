/* Round 1566 walk controls: node .rc/x/mutCard.mjs <nocue|shortbox|oldbadge>. Rewrites one source file in place on the
   runner (the request line restores it with git checkout), and refuses when its anchor is missing. Never committed. */
import fs from 'node:fs';
const which = process.argv[2];
const SWAPS = {
  nocue: ['src/components/front-office-shared/FoSeasonStatsCard.tsx', ' border-t border-border/60 text-xs text-foreground sm:grid-cols-[1fr_auto] sm:border-t-0', ' text-xs text-foreground sm:grid-cols-[1fr_auto]'],
  shortbox: ['src/components/front-office-shared/FoSeasonStatsCard.tsx', 'mt-2 max-h-[27rem] overflow-y-auto', 'mt-2 max-h-56 overflow-y-auto'],
  oldbadge: ['src/components/front-office-shared/FoAwardBadge.tsx', 'className="block break-words text-xs text-gold"', 'className="block truncate text-[10px] text-gold"'],
};
const s = SWAPS[which];
if (!s) { console.error(`mutCard: unknown ${which}`); process.exit(2); }
const [file, from, to] = s;
const text = fs.readFileSync(file, 'utf8');
if (!text.includes(from)) { console.error(`mutCard ${which}: anchor not in ${file}`); process.exit(2); }
fs.writeFileSync(file, text.split(from).join(to));
console.log(`mutCard ${which}: ${file} rewritten`);
