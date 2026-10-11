// Review (run lens), Round 1212: one small plausible mutation, applied in place on the runner's checkout.
// Usage: node .rc/x/review-run-mut.mjs <name>. Exits 3 (and edits nothing) unless the text is there exactly once.
import { readFileSync, writeFileSync } from 'node:fs';

const MUT = {
  // a stale rounding rule in the helper the generator AND the bind's own check share
  round: { file: 'src/lib/season/mlb.ts', from: 'const thousandths = (v: number): number => Math.round(v * 1000);', to: 'const thousandths = (v: number): number => Math.floor(v * 1000);' },
  // off by one in the seam: the first season of the path's own format loses its path
  pathfrom: { file: 'src/lib/season/us.ts', from: 'if (bind.pathFrom !== undefined && row.year < bind.pathFrom) return null;', to: 'if (bind.pathFrom !== undefined && row.year <= bind.pathFrom) return null;' },
  // a dropped argument: the hub asks about his club without the era
  era: { file: 'src/lib/mlbSeasonHeld.ts', from: 'return mlbHeldPos(who?.pos) ?? mlbHeldLine(year, who?.team, eraId);', to: 'return mlbHeldPos(who?.pos) ?? mlbHeldLine(year, who?.team);' },
  // a swapped argument: Watch again asks about the club he is at today, not the club of the season
  watch: { file: 'src/components/us-career/season/UsSeasonCentreEntry.tsx', from: 'sport.seasonCentreHeld?.(last.year, career.eraId, { pos: career.pos, team: last.team })', to: 'sport.seasonCentreHeld?.(last.year, career.eraId, { pos: career.pos, team: career.team })' },
  // a stale constant: the divisions are read from a year later, so every 2026 season plays unnamed teams
  shape: { file: 'src/lib/season/mlb.ts', from: 'const SHAPE_FROM = 2026;', to: 'const SHAPE_FROM = 2027;' },
  // a dropped filter: a line the engine played on another length is laid out as 162
  slate: { file: 'src/lib/season/mlb.ts', from: "  if (num(row.slate) !== null && row.slate !== mlbViewGames()) return false;\n", to: '' },
  // off by one in the held gate: a club one game short is let through
  short: { file: 'src/lib/mlbSeasonHeld.ts', from: '  if (real === full) return null;', to: '  if (real === full || real === full - 1) return null;' },
  // the fleet compare's own control: one more draw at the top of the engine's season
  draw: { file: 'src/lib/mlbMyCareer.ts', from: "): { line: MlbSeasonLine; notes: string[] } {\n  const notes: string[] = [];\n", to: "): { line: MlbSeasonLine; notes: string[] } {\n  const notes: string[] = []; rng();\n" },
  // the hub's upcoming season asks about last year (off by one year)
  hubyear: { file: 'src/components/us-career/season/UsSeasonCentreEntry.tsx', from: 'sport.seasonCentreHeld?.(career.year, career.eraId, { pos: career.pos, team: career.team })', to: 'sport.seasonCentreHeld?.(career.year - 1, career.eraId, { pos: career.pos, team: career.team })' },
};

const name = process.argv[2];
const m = MUT[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(3); }
const src = readFileSync(m.file, 'utf8');
const n = src.split(m.from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} ABORTED: the text is in ${m.file} ${n} times, not once`); process.exit(3); }
writeFileSync(m.file, src.replace(m.from, m.to));
console.log(`MUTATION ${name} APPLIED to ${m.file}`);
