// Reviewer mutations of Round 1562 (run on the runner only; the request line restores src after the walk).
// node .rc/x/mutR.mjs <name>. Refuses (exit 2) unless every anchor is in its file exactly the expected number of times.
import fs from 'node:fs';
const CARD = 'src/components/front-office-shared/FoSeasonStatsCard.tsx';
const BADGE = 'src/components/front-office-shared/FoAwardBadge.tsx';
const MUTS = {
  // the tabs lose their 44 px floor (a plausible drop of one class)
  tabs44: [[CARD, "'min-h-[44px] rounded-full border px-2 py-1 text-xs font-bold'", "'rounded-full border px-2 py-1 text-xs font-bold'", 1]],
  // the award rule line back to 9 px (a line that lives on the Awards tab only, not the control's line)
  rulesmall: [[CARD, '<p className="text-xs text-muted-foreground">Rule: {a.rule}.</p>', '<p className="text-[9px] text-muted-foreground">Rule: {a.rule}.</p>', 1]],
  // the club lines do not stack on a phone (the round's own layout decision undone, the wrap kept)
  nostack: [
    [CARD, 'grid grid-cols-1 gap-x-2 text-xs text-foreground sm:grid-cols-[1fr_auto]', 'grid grid-cols-[1fr_auto] gap-x-2 text-xs text-foreground', 1],
    [CARD, 'grid grid-cols-1 gap-x-2 text-xs font-bold uppercase text-muted-foreground sm:grid-cols-[1fr_auto]', 'grid grid-cols-[1fr_auto] gap-x-2 text-xs font-bold uppercase text-muted-foreground', 1],
  ],
  // a leader name held on one line without the truncate class (overflows instead of an ellipsis)
  nowrap: [[CARD, '<span className="min-w-0 break-words">{i + 1}. {r.name}', '<span className="min-w-0 whitespace-nowrap">{i + 1}. {r.name}', 1]],
  // the shared roster badge back to what it was (10 px, cut)
  badge: [[BADGE, 'className="block break-words text-xs text-gold"', 'className="block truncate text-[10px] text-gold"', 1]],
  // the qualifying line back to 9 px (on every tab, under the tabs)
  // a tab press that nudges the page (sabotage, to prove the still point can fail)
  jump: [[CARD, 'onClick={() => setTab(k)}', 'onClick={() => { setTab(k); requestAnimationFrame(() => window.scrollBy(0, 30)); }}', 1]],
  // the card wider than a phone (sabotage, to prove the page point can fail)
  wide: [[CARD, '<div data-season-stats className="rounded-2xl border border-border bg-card p-3 text-left">', '<div data-season-stats className="min-w-[420px] rounded-2xl border border-border bg-card p-3 text-left">', 1]],
  qualsmall: [[CARD, '<p className="mt-1.5 text-center text-xs text-muted-foreground">{props.qualifyLine}</p>', '<p className="mt-1.5 text-center text-[9px] text-muted-foreground">{props.qualifyLine}</p>', 1]],
};
const name = process.argv[2];
const plan = MUTS[name];
if (!plan) { console.error(`mutR: unknown mutation ${name}`); process.exit(2); }
const files = {};
for (const [f, from, , n] of plan) {
  files[f] ??= fs.readFileSync(f, 'utf8');
  const count = files[f].split(from).length - 1;
  if (count !== n) { console.error(`mutR ${name}: anchor seen ${count} times in ${f}, expected ${n}: ${from}`); process.exit(2); }
}
for (const [f, from, to] of plan) files[f] = files[f].split(from).join(to);
for (const [f, s] of Object.entries(files)) fs.writeFileSync(f, s);
console.log(`mutR ${name}: applied (${plan.length} edit${plan.length > 1 ? 's' : ''})`);
