// node .rc/x/mutfx.mjs <name>: apply one named mutation to the tree, asserting its anchor stands exactly once.
import fs from 'node:fs';
const MUTS = {
  /* The placer reads entry TYPES for a Saturday instead of DATES (the critic's correction 12 defect). */
  type: ['src/lib/worldNights.ts',
    '  const seq: Slot[] = calendar.map((e, i) => ({ type: e.type, sat: saturday(dates[i]), night: false }));',
    "  const seq: Slot[] = calendar.map(e => ({ type: e.type, sat: e.type === 'league' || e.type === 'window', night: false }));"],
  /* The placer takes a gap without checking that every date stays. */
  keep: ['src/lib/worldNights.ts', '    if (!redate) return true;', '    if (redate || !redate) return true;'],
  /* Two nights may share a gap (a night placed earlier no longer counts as a midweek). */
  share: ['src/lib/worldNights.ts', "    seq.splice(gap, 0, { type: 'night', sat: false, night: true });", "    seq.splice(gap, 0, { type: 'night', sat: true, night: false });"],
};
for (const name of process.argv.slice(2)) {
  const [file, from, to] = MUTS[name] ?? [];
  if (!file) { console.log(`mutfx: unknown mutation ${name}`); process.exit(2); }
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`mutfx: ${name}: anchor stands ${n} times in ${file}`); process.exit(2); }
  fs.writeFileSync(file, text.replace(from, to));
  console.log(`mutfx: ${name} applied to ${file}`);
}
