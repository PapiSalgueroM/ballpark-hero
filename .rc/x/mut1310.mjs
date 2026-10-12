// Review probe (runner lens, Round 1310). Mutation and data probes of scripts/simCmLeagueBookFacts.mjs.
// Runs on a GitHub runner from the repo root. Code mutants are written as a NEW file scripts/.mut-fence.mjs (the
// tracked fence is never edited); data probes write the tracked data file and receipt and restore the original
// bytes in a finally (the request line also runs git checkout -- scripts afterwards).
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
  hostclause: ["publishers.length >= 2 && hosts.size >= 2 ? 'USED'", "publishers.length >= 2 ? 'USED'"],
  pubclause: ["publishers.length >= 2 && hosts.size >= 2 ? 'USED'", "hosts.size >= 2 ? 'USED'"],
  bothclauses: ["publishers.length >= 2 && hosts.size >= 2 ? 'USED'", "publishers.length >= 1 ? 'USED'"],
  seasonstrip: [".join(' | ').replace(SEASON_TOKEN, ' ');", ".join(' | ');"],
  pausedskip: ['if (seasons.length > 1 && season === PAUSED) continue;', ''],
  boundary: ['ok(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(printed)', 'ok(printed.includes(String(value))'],
  stale: ["if (c.state === 'USED') ok(!named(comp, season, CORE)", "if (false) ok(!named(comp, season, CORE)"],
  matchrule: ['f.matchesPerClub : 2 * (f.clubs - 1);', 'f.matchesPerClub : 2 * f.clubs;'],
};

const run = (file, control) => {
  const env = { ...process.env };
  if (control) env.CM_FACTS_CONTROL = control; else delete env.CM_FACTS_CONTROL;
  const r = spawnSync('node', [file], { env, encoding: 'utf8' });
  const lines = (r.stdout || '').trim().split('\n');
  const firstFail = lines.find(l => l.startsWith('FAIL ')) || '';
  return { code: r.status, last: lines.at(-1) || '', firstFail, means: lines.filter(l => /: top scorer /.test(l)).map(l => l.replace(/^simCmLeagueBookFacts: /, '').slice(0, 90)) };
};

console.log('== PART 1: code mutants (main run plus the nine controls; SURVIVES means main exit 0 and every control FIRED)');
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
  rec.sha256 = createHash('sha256').update(body.replaceAll('\r\n', '\n')).digest('hex');
  fs.writeFileSync(RECEIPT, JSON.stringify(rec, null, 2) + '\n');
};
const PROBES = {
  samehost: d => { d.publishers.plmirror = { name: 'A second publisher on the league host', host: 'premierleague.com', kind: 'probe kind' }; const r = d.rows.find(x => x.id === 'mykhel-pl-2015-16'); r.publisher = 'plmirror'; r.url = 'https://www.premierleague.com/en/news/probe'; },
  colswapOne: d => { d.rows.find(x => x.id === 'espnstats-ll-2022-23').figures.topScorerGoals = 34; },
  colswapBoth: d => { for (const id of ['espnstats-ll-2022-23', 'rsssftops-ll-2022-23']) d.rows.find(x => x.id === id).figures.topScorerGoals = 34; },
  staleOwed: d => { d.owed.push({ id: 'probe-stale', competition: 'Premier League', seasons: '2015-16', quantities: ['topScorerGoals'], lookedFor: 'a probe entry naming a cell that is USED' }); },
  pausedRowGone: d => { d.rows = d.rows.filter(x => x.id !== 'espn-pl-2019-20'); },
  seasonFigure: d => { for (const id of ['plsite-pl-2015-16', 'mykhel-pl-2015-16']) d.rows.find(x => x.id === id).figures.topScorerGoals = 16; },
};
const PAIRS = { samehost: 'hostclause', staleOwed: 'stale', pausedRowGone: 'pausedskip', seasonFigure: 'seasonstrip', colswapBoth: null, colswapOne: null };
const roundTrip = JSON.stringify(JSON.parse(origData), null, 2) + '\n';
console.log(`== PART 2: data probes (the data file rewritten through JSON.stringify(.., 2); round trip identical to disk: ${roundTrip === origData.replaceAll('\r\n', '\n')})`);
try {
  for (const [name, edit] of Object.entries(PROBES)) {
    const d = JSON.parse(origData); edit(d); writeData(d);
    const real = run(FENCE, '');
    let line = `PROBE ${name}: real fence exit ${real.code} | ${real.firstFail.slice(0, 220) || real.last.slice(0, 120)}`;
    const m = PAIRS[name];
    if (m) { fs.writeFileSync(MUT, src.replace(MUTANTS[m][0], MUTANTS[m][1])); const mr = run(MUT, ''); line += ` || under mutant ${m}: exit ${mr.code} | ${mr.firstFail.slice(0, 160) || mr.last.slice(0, 100)}`; fs.rmSync(MUT, { force: true }); }
    console.log(line);
    if (name.startsWith('colswap')) for (const mm of real.means.filter(x => x.startsWith('La Liga'))) console.log(`   ${mm}`);
  }
} finally {
  fs.writeFileSync(DATA, origData); fs.writeFileSync(RECEIPT, origReceipt); fs.rmSync(MUT, { force: true });
}
const after = run(FENCE, '');
console.log(`== restored: real fence exit ${after.code} | ${after.last}`);
console.log('mut1310: probe complete');
