/* Round 1524 run reviewer: one plausible mutation of the owner tail, applied in place on a runner checkout.
   Usage: node .rc/x/mut1524.mjs <name>. Exits 3 when the string it mutates is not in its file exactly once,
   so an abort can never pass for a mutation that went unseen. The caller restores with git checkout. */
import fs from 'node:fs';

const OWNER = 'src/lib/soccerCareerOwner.ts';
const LEAGUE = 'src/lib/soccerCareerLeague.ts';
const MUTS = {
  /* off by one: third place promotes */
  promo3: [[OWNER, '  const promoted = tier > 1 && me.pos <= 2;', '  const promoted = tier > 1 && me.pos <= 3;']],
  /* off by one: the bottom four go down */
  releg4: [[OWNER, '  const relegated = me.pos >= leagueSize - 2 && tier < 4;', '  const relegated = me.pos >= leagueSize - 3 && tier < 4;']],
  /* stale key: the season number dropped from the season's key, so every season replays one draw */
  stalekey: [[OWNER, '|${own.club}|${season}`', '|${own.club}`']],
  /* the academy counted this season, against the tile's own words */
  youthnow: [[OWNER, '  const playing: OwnerState = { ...os, squad, debt, academy: lv.academy, stadium: lv.stadium };',
    '  const playing: OwnerState = { ...os, squad, debt, academy: plan === "youth" ? Math.min(e.maxLevel, lv.academy + 1) : lv.academy, stadium: lv.stadium };']],
  /* the call is never cleared, so next season replays it without asking */
  plankeep: [[OWNER, '  delete os.plan;\n', '\n']],
  /* stale constant: every tier pays like tier 4 */
  revenue4: [[OWNER, '  const u = ownerRevenue(prev);', '  const u = ownerRevenue({ clubTier: 4 });']],
  /* swapped tie break in the shared table: on equal points he goes below */
  tiebreak: [[LEAGUE, '  rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));', '  rows.sort((a, b) => b.pts - a.pts || (a.you ? 1 : -1));']],
  /* the debt drag sign flipped: a club in debt plays better */
  dragsign: [[OWNER, ' - OWNER_EFFECTS.debtDrag * (lv.debt / ownerRevenue(os));', ' + OWNER_EFFECTS.debtDrag * (lv.debt / ownerRevenue(os));']],
};
const name = process.argv[2];
if (!MUTS[name]) { console.error(`MUTATION ABORT: unknown mutation ${name}`); process.exit(3); }
for (const [file, from, to] of MUTS[name]) {
  const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION ABORT: ${name}: the string is in ${file} ${n} times, not once`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, () => to));
}
console.log(`MUTATION ${name} applied`);
