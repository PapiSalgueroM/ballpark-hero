// Release BR probe (never committed): make FrontOfficeGmCareer.test.tsx's digest set aside Round 1542's save
// additions (league.stats, league.awards, and every rookieSeason and awards key inside the league: rosters, practice squads, free agents), the way it already sets aside
// Round 1533's own blocks. Mode full strips all four; mode partial strips the league's two only (a control: the
// per man stamps alone must still turn the digest). Usage: node .rc/x/mutGmc.mjs full|partial (cwd = a checkout).
import fs from "node:fs";
const F = "src/components/front-office-shared/FrontOfficeGmCareer.test.tsx";
const mode = process.argv[2];
if (mode !== "full" && mode !== "partial") { console.error("mutGmc: ABORTED, mode full or partial"); process.exit(3); }
const src = fs.readFileSync(F, "utf8");
const A = "  if (s?.gm?.blocks) { delete s.gm.blocks.seat; delete s.gm.blocks.xp; }";
const n = src.split(A).length - 1;
if (n !== 1) { console.error(`mutGmc: ABORTED, anchor found ${n} times`); process.exit(3); }
const men = mode === "full"
  ? " const strip = (o: any): void => { if (!o || typeof o !== 'object') return; delete o.rookieSeason; delete o.awards; for (const v of Object.values(o)) strip(v); }; strip(lg);"
  : "";
const add = `\n  { const lg = s?.league; if (lg) { delete lg.stats; delete lg.awards;${men} } }`;
fs.writeFileSync(F, src.replace(A, A + add));
console.log(`mutGmc: applied (${mode})`);
