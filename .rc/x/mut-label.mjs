// fix2-1574 mutation (runner only, restored by git checkout in the same line): section 5's watch line keyed on the
// one hand listed label it had before fix2, in place of the kind aged 'season'. watchline60 must then NOT fire.
import fs from 'node:fs';
const f = 'scripts/simUsConnectionsFacts.mjs';
const t = fs.readFileSync(f, 'utf8');
const from = "if (!c || AGES[s][c.kind] !== 'season') continue;";
const to = "if (!c || g.theme !== 'Scored 70 goals in a season') continue;";
if (t.split(from).length !== 2) { console.error('mut-label: the line to mutate is not there exactly once'); process.exit(3); }
fs.writeFileSync(f, t.replace(from, to));
console.log('mut-label: section 5 now reads only "Scored 70 goals in a season"');
