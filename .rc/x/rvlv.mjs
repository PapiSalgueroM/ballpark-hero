// Review of Round 1512 (run lens): section 2 of simCmDifficulty replays Medium careers against the base. This
// writes a copy of the harness, scripts/_rvLv.mjs, whose section 2 replays at RV_LEVEL instead (hard or legend),
// so Hard and Impossible careers set up on both trees are compared season end by season end and draw by draw.
// The "no key" check is off for the copy (a Hard career carries the key on both trees).
import fs from 'node:fs';

const src = fs.readFileSync('scripts/simCmDifficulty.mjs', 'utf8').replaceAll('\r\n', '\n');
const edits = [
  ["const a = await replay(HEAD, career, sd, coach, 'normal', seasons);", "const a = await replay(HEAD, career, sd, coach, process.env.RV_LEVEL || 'normal', seasons);"],
  ["const b = await replay(BASE, career, sd, coach, 'normal', seasons);", "const b = await replay(BASE, career, sd, coach, process.env.RV_LEVEL || 'normal', seasons);"],
  ['  if (keyed) fail(', '  if (keyed && !process.env.RV_LEVEL) fail('],
  /* The probe's own negative control: RV_CONTROL=1 moves the level's edge by 0.1 on this tree's bundle only. */
  ['  if (D && memEdit) memEdit(D);\n  return m;', "  if (D && memEdit) memEdit(D);\n  if (D && process.env.RV_CONTROL === '1' && b === HEAD) { D[process.env.RV_LEVEL].edge += 0.1; }\n  return m;"],
];
let out = src;
for (const [from, to] of edits) {
  const n = out.split(from).length - 1;
  if (n !== 1) { console.log(`rvlv: "${from.slice(0, 60)}" is in the harness ${n} times; NOT WRITTEN`); process.exit(2); }
  out = out.replace(from, to);
}
const dest = process.argv[2] || 'scripts/_rvLv.mjs';
fs.writeFileSync(dest, out);
console.log(`rvlv: wrote ${dest} (section 2 at RV_LEVEL=${process.env.RV_LEVEL ?? '(unset)'})`);
