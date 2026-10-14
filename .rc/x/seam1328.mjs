// Round 1326 fix pass 2: the seam edits a join of Round 1326 with Round 1328 owes (closing check majors 1 and 2),
// and one negative control for the joined walk. Run at the root of a tree that holds both rounds.
//   node seam1328.mjs seam     the desk takes its kitty change from kittyChange (kittyView goes) and
//                              playCmHubLanding reads the desk's Kitty change row instead of the old result row
//   node seam1328.mjs tilectl  control: the hub tile prints the old resultProjected again (the walk must go red)
// Every anchor must stand exactly once or nothing is written (exit 2).
import fs from 'node:fs';

const mode = process.argv[2];
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const edits = [];
function swap(file, from, to) {
  const text = edits.find(e => e.file === file)?.text ?? read(file);
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`seam1328: anchor in ${file} stands ${n} times, it must be once: ${from.slice(0, 80)}`); process.exit(2); }
  const next = text.replace(from, () => to);
  const e = edits.find(x => x.file === file);
  if (e) e.text = next; else edits.push({ file, text: next });
}

const DESK = 'src/components/club-manager/FinancesScreen.tsx';
const WALK = 'scripts/playCmHubLanding.mjs';
const HUB = 'src/pages/ClubManager.tsx';

if (mode === 'seam') {
  swap(DESK, "import { fanMeter } from '@/lib/clubManagerMeters';\n",
    "import { fanMeter } from '@/lib/clubManagerMeters';\nimport { kittyChange } from '@/lib/clubManagerHubLines';\n");
  const start = read(DESK).indexOf('/* Round 1326: what the board covers and what that leaves the kitty.');
  const endMark = '    kittyProjected: r2(p.resultProjected + coverProjected),\n  };\n}\n\n';
  const end = read(DESK).indexOf(endMark);
  if (start < 0 || end < start) { console.error('seam1328: kittyView block not found'); process.exit(2); }
  swap(DESK, read(DESK).slice(start, end + endMark.length), '');
  swap(DESK, '  const k = kittyView(p);\n', [
    '  /* Round 1326 and Round 1328 joined: what the board covers and what that',
    '     leaves the kitty. The kitty change is kittyChange, the one place the',
    "     hub's Finances tile reads too, so the tile and this desk cannot",
    '     disagree. The cover row sums the running costs the board pays, each',
    "     spend line counted by its own kitty flag, never by its id. */",
    '  const kitty = kittyChange(p);',
    "  const cover = (pick: 'actual' | 'projected') => Math.round(p.spend.filter(l => l.kitty === false).reduce((n, l) => n + l[pick], 0) * 100) / 100;",
    "  const k = { coverActual: cover('actual'), coverProjected: cover('projected'), kittyActual: kitty.actual, kittyProjected: kitty.projected };",
    '',
  ].join('\n'));
  swap(WALK, `      await page.locator('[data-projection-total="result"]').waitFor({ timeout: 10000 }).catch(() => {});
      const desk = await page.evaluate(() => {
        const cell = s => document.querySelector(\`\${s} td:last-child\`)?.textContent ?? null;
        return { result: cell('[data-projection-total="result"]'), wages: cell('[data-projection-line="playerWages"]'), staff: cell('[data-projection-line="staffWages"]'), travel: cell('[data-projection-line="travel"]') };
      });
`, `      await page.locator('[data-projection-total="kitty"]').waitFor({ timeout: 10000 }).catch(() => {});
      const desk = await page.evaluate(() => document.querySelector('[data-projection-total="kitty"] td:last-child')?.textContent ?? null);
`);
  swap(WALK, `      const parts = [desk.result, desk.wages, desk.staff, desk.travel].map(toMillions);
      const tile = toMillions(tiles.Finances.value);
      const want = parts.every(v => v !== null) ? parts.reduce((a, b) => a + b, 0) : null;
      /* The desk prints each line rounded to a tenth, so four rounded terms can
         drift 0.2 from the tile's own rounding of the exact sum. */
      check(section, want !== null && tile !== null && Math.abs(tile - want) <= 0.25, \`\${tag}: the Finances tile's \${tiles.Finances.value} is the kitty change of the desk's own lines (result \${desk.result} plus wages \${desk.wages}, staff \${desk.staff}, travel \${desk.travel} = \${want === null ? '?' : want.toFixed(2)})\`);
`, `      const want = toMillions(desk);
      const tile = toMillions(tiles.Finances.value);
      /* Round 1326 and 1328 joined: the desk prints the kitty change itself
         (its Kitty change row), from the same kittyChange the tile reads and
         through the same formatter, so the two figures are the same number. */
      check(section, want !== null && tile !== null && Math.abs(tile - want) <= 0.001, \`\${tag}: the Finances tile's \${tiles.Finances.value} is the desk's Kitty change row (\${desk})\`);
`);
} else if (mode === 'tilectl') {
  swap(HUB, '                  const k = kittyChange(projectFinances(c)).projected;\n',
    '                  const k = projectFinances(c).resultProjected;\n');
} else {
  console.error('seam1328: say seam or tilectl'); process.exit(2);
}
for (const e of edits) fs.writeFileSync(e.file, e.text);
console.log(`seam1328 ${mode}: wrote ${edits.map(e => e.file).join(', ')}`);
