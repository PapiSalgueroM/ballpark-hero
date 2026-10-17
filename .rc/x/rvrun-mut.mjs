// Reviewer mutations (round 1340, runner lens). Applied on the runner's checkout only, restored by the request line
// with git checkout -- src scripts. Each mutation asserts its anchor is present exactly once before it edits.
// Usage: node .rc/x/rvrun-mut.mjs m1 [m2 ...]
import fs from 'node:fs';
const MUTS = {
  /* m1, an off by one in the particle rule: the first word may now be a particle ("Ben Davies" keeps his first name). */
  m1: ['src/lib/cmMatchDisplay.ts', 'while (i > 1 && PARTICLES', 'while (i > 0 && PARTICLES'],
  /* m2, a dropped pair on the report: StatBar's two bar segments stay in the old order while its numbers move. */
  m2: ['src/components/club-manager/MatchReportCard.tsx', 'const [barFirst, barSecond] = inFixtureOrder(mineFirst,', 'const [barFirst, barSecond] = inFixtureOrder(true,'],
  /* m3, a stale reading of the venue in the live viewer: only a true home is mine first (a neutral final, or a live
     match saved before the field existed, puts my club second). */
  m3: ['src/components/club-manager/LiveSimScreen.tsx', 'const mineFirst = liveNow ? myClubFirst(liveNow.home) :', 'const mineFirst = liveNow ? liveNow.home === true :'],
  /* m4, the colour left behind on the dressing room's card: the first name is always green, the second never. */
  m4: ['src/components/club-manager/HalftimeScreen.tsx', "mineFirst ? 'text-primary' : 'text-muted-foreground')}>{nameFirst}", "'text-primary')}>{nameFirst}"],
  m4b: ['src/components/club-manager/HalftimeScreen.tsx', "mineFirst ? 'text-muted-foreground' : 'text-primary')}>{nameSecond}", "'text-muted-foreground')}>{nameSecond}"],
  /* m6, m2's twin on the live viewer: LiveStats' possession bar segments stay in the old order. */
  m6: ['src/components/club-manager/LiveSimScreen.tsx', 'const [barFirst, barSecond] = inFixtureOrder(mineFirst,', 'const [barFirst, barSecond] = inFixtureOrder(true,'],
  /* m5, the same stale venue reading on the hub's next match card. */
  m5: ['src/pages/ClubManager.tsx', '{myClubFirst(fx.home)', '{fx.home === true'],
};
const ids = process.argv.slice(2);
if (!ids.length) { console.error('no mutation named'); process.exit(2); }
for (const id of ids) {
  const m = MUTS[id];
  if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
  const [file, from, to] = m;
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION ${id} ANCHOR FOUND ${n} TIMES in ${file}: not applied`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`MUTATION ${id} APPLIED in ${file}`);
}
