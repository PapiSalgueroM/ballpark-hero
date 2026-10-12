// Review probe b (runner lens, Round 1310). Second set of mutants, each paired with a data probe that shows whether
// the mutated line is the only thing that catches a real defect. Same method as mut1310.mjs: code mutants are a NEW
// file scripts/.mut-fence.mjs, data probes rewrite the tracked data file and receipt and restore them in a finally.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const FENCE = 'scripts/simCmLeagueBookFacts.mjs';
const MUT = 'scripts/.mut-fence.mjs';
const DATA = 'scripts/data/cmLeagueBookFacts.json';
const RECEIPT = 'scripts/data/cmLeagueBookFacts.receipt.json';
const src = fs.readFileSync(FENCE, 'utf8');
const origData = fs.readFileSync(DATA, 'utf8');
const origReceipt = fs.readFileSync(RECEIPT, 'utf8');
const CONTROLS = ['', 'wiki', 'bannedhost', 'figure', 'onesource', 'disagree', 'receipt', 'srcname', 'dash', 'length'];
const MUTANTS = {
  stale: ['ok(!named(comp, season, CORE), ', 'ok(true || !named(comp, season, CORE), '],
  keeperowed: ['else ok(named(comp, season, KEEPER), ', 'else ok(true || named(comp, season, KEEPER), '],
  boundary: ['ok(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(printed)', 'ok(printed.includes(String(value))'],
};
const run = (file, control) => {
  const env = { ...process.env };
  if (control) env.CM_FACTS_CONTROL = control; else delete env.CM_FACTS_CONTROL;
  const r = spawnSync('node', [file], { env, encoding: 'utf8' });
  const lines = (r.stdout || '').trim().split('\n');
  return { code: r.status, last: lines.at(-1) || '', firstFail: lines.find(l => l.startsWith('FAIL ')) || '' };
};
for (const [name, [from, to]] of Object.entries(MUTANTS)) {
  if (!src.includes(from)) { console.log(`MUTANT ${name}: ABORT, the string to mutate is not in the fence`); continue; }
  fs.writeFileSync(MUT, src.replace(from, to));
  const res = CONTROLS.map(c => ({ c: c || 'main', ...run(MUT, c) }));
  const survives = res[0].code === 0 && res.slice(1).every(x => x.code === 1 && /FIRED/.test(x.last));
  console.log(`MUTANT ${name}: ${survives ? 'SURVIVES (every line green)' : 'KILLED'} | ` + res.map(x => `${x.c}=${x.code}`).join(' '));
  for (const x of res) if (!(x.c === 'main' ? x.code === 0 : x.code === 1)) console.log(`   ${x.c}: ${x.last.slice(0, 200)} ${x.firstFail.slice(0, 200)}`);
}
fs.rmSync(MUT, { force: true });
const writeData = obj => {
  const body = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(DATA, body);
  const rec = JSON.parse(origReceipt);
  rec.sha256 = createHash('sha256').update(body).digest('hex');
  fs.writeFileSync(RECEIPT, JSON.stringify(rec, null, 2) + '\n');
};
const PROBES = {
  staleOwed: [d => { d.owed.push({ id: 'probe-stale', competition: 'Premier League', seasons: '2015-16', quantities: ['topScorerGoals'], lookedFor: 'a probe entry naming a cell that is USED' }); }, 'stale'],
  keeperOwedGone: [d => { d.owed = d.owed.filter(o => o.id !== 'bundesliga-keepers'); }, 'keeperowed'],
  digitInside: [d => { for (const id of ['plsite-pl-2015-16', 'mykhel-pl-2015-16']) d.rows.find(x => x.id === id).figures.topScorerGoals = 2; }, 'boundary'],
  noChange: [() => {}, null],
};
try {
  for (const [name, [edit, m]] of Object.entries(PROBES)) {
    const d = JSON.parse(origData); edit(d); writeData(d);
    const real = run(FENCE, '');
    let line = `PROBE ${name}: real fence exit ${real.code} | ${real.firstFail.slice(0, 200) || real.last.slice(0, 120)}`;
    if (m) { fs.writeFileSync(MUT, src.replace(MUTANTS[m][0], MUTANTS[m][1])); const mr = run(MUT, ''); line += ` || under mutant ${m}: exit ${mr.code} | ${mr.firstFail.slice(0, 160) || mr.last.slice(0, 100)}`; fs.rmSync(MUT, { force: true }); }
    console.log(line);
  }
} finally {
  fs.writeFileSync(DATA, origData); fs.writeFileSync(RECEIPT, origReceipt); fs.rmSync(MUT, { force: true });
}
const after = run(FENCE, '');
console.log(`== restored: real fence exit ${after.code} | ${after.last}`);
console.log('mut1310b: probe complete');
