// fix-1583 copy of the review-run 1583 mutation driver (15 NBA controls) (runner only, never committed). Usage: node .rc/x/rmut.mjs <name>
// Applies one mutation to a source file (asserts the old text is there exactly once), runs the plain harness and
// every NBA control, restores the file in finally, and prints one line per run plus a verdict line last.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const LIB = 'scripts/lib/usConnectionsCheck.mjs';
const M = {
  'agree-silent': [LIB,
    'const agree = (a, b) => (a === null || a === undefined || b === null || b === undefined || a !== b ? null : a);',
    'const agree = (a, b) => (a === null || a === undefined ? (b ?? null) : b === null || b === undefined ? a : a !== b ? null : a);'],
  'agree-record-first': [LIB,
    'const agree = (a, b) => (a === null || a === undefined || b === null || b === undefined || a !== b ? null : a);',
    'const agree = (a, b) => (a ?? b ?? null);'],
  'asof-offbyone': [LIB,
    'if (c.asOf !== undefined && Number(s.slice(0, 4)) > c.asOf) continue;',
    'if (c.asOf !== undefined && Number(s.slice(0, 4)) >= c.asOf) continue;'],
  'lineage-kin-drop': [LIB,
    "else if ((!frOf.has(t) && !closed) || frOf.get(t) === c.franchise) kin = true;",
    "else if ((!frOf.has(t) && !closed)) kin = true;"],
  'aba-drop': [LIB,
    'return [nbaClubVerdict(m.seasons, c.names, NBA_NAME_FR, c), aba ? null : v2];',
    'return [nbaClubVerdict(m.seasons, c.names, NBA_NAME_FR, c), v2];'],
  'watch-espn-flag': [LIB,
    "if (!m || fits(name, c) !== false || !m.active) return null;",
    "if (!m || fits(name, c) !== false || !m.espnActive) return null;"],
  'espn-closed': [LIB,
    'return [nbaClubVerdict(m.seasons, c.names, NBA_NAME_FR, c), aba ? null : v2];',
    'return [nbaClubVerdict(m.seasons, c.names, NBA_NAME_FR, c, true), aba ? null : v2];'],
  'born-guess': [LIB,
    'return NBA_COUNTRY_NAMES[last] ?? null;',
    'return NBA_COUNTRY_NAMES[last] ?? last;'],
  'continent-no': [LIB,
    'const at = x => (!x ? null : c.yes.has(x) ? true : c.no.has(x) ? false : null);',
    'const at = x => (!x ? null : c.yes.has(x) ? true : false);'],
};
const CONTROLS = ['nbaundate', 'nbayear', 'nbaafter', 'parker', 'kareem', 'cousins', 'nbawatch', 'nbaclub', 'nbaborn', 'nbalineage', 'nbaaba', 'nbaespn', 'nbacontinent', 'nbabornrecord', 'nbacontinentgap'];

const name = process.argv[2];
const spec = M[name];
if (!spec) { console.log(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = spec;
const orig = fs.readFileSync(file, 'utf8');
const n = orig.split(from).length - 1;
if (n !== 1) { console.log(`MUT ${name} ABORTED: old text found ${n} times in ${file}`); process.exit(2); }

function run(env) {
  const r = spawnSync('node', ['scripts/simUsConnectionsFacts.mjs'], { env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = `${r.stdout}\n${r.stderr}`.trim().split('\n').filter(Boolean);
  return { code: r.status, last: (out[out.length - 1] ?? '').slice(0, 220) };
}

async function probe(tag) {
  const mod = await import(pathToFileURL(path.resolve(LIB)).href + `?v=${tag}`);
  const out = [];
  for (const [who, label] of [['Larry Bird', 'Played for the Boston Celtics (as of 2025-26)'], ['Dikembe Mutombo', 'Born in Africa'], ['Kareem Abdul-Jabbar', '14,000+ career rebounds']]) {
    const { record, second, ledger } = mod.loadUsConnectionsRecord(process.cwd(), 'nba');
    const l = structuredClone(ledger);
    delete l.overlay?.[who];
    const ch = mod.makeNbaChecker({ record, second, ledger: l });
    out.push(`${who} overlay removed: fits=${ch.fits(who, ch.criterion(label))} hosts=${JSON.stringify(ch.both(who, ch.criterion(label)))}`);
  }
  return out.join('; ');
}

let verdict = '';
try {
  const before = await probe('orig');
  fs.writeFileSync(file, orig.replace(from, to));
  const after = await probe('mut');
  console.log(`probe original: ${before}`);
  console.log(`probe mutated:  ${after}`);
  const plain = run({});
  console.log(`plain exit=${plain.code} | ${plain.last}`);
  let caught = [];
  for (const c of CONTROLS) {
    const r = run({ US_CONN_CONTROL: c });
    const own = /fired its own rule/.test(r.last);
    if (!own) caught.push(c);
    console.log(`  c-${c} exit=${r.code} ${own ? 'FIRED' : 'NOT-FIRED'} | ${r.last}`);
  }
  const detected = plain.code !== 0 || caught.length > 0;
  verdict = `MUT ${name}: plain exit=${plain.code}; controls that stopped firing: ${caught.join(',') || 'none'} -> ${detected ? 'DETECTED' : 'UNDETECTED (everything green)'}`;
} finally {
  fs.writeFileSync(file, orig);
}
console.log(verdict);
