/* Round 1574 probe (not committed), proofs 3.8 items 2 and 3, run on a runner from the repo root:
     node .rc/x/probe-proofs.mjs <base tree>        (git worktree add /tmp/base <base sha> first)
   Item 2: every verdict the checkers give on the FILE boards (every group against every man on its board, all three
   sports) is the same at the base and at the head, byte for byte; the head's harness dump (US_CONN_DUMP) filtered
   to file ids is the same bytes too.
   Item 3: every man the base NFL and NHL records hold is in the head's record with every field equal.
   PROBE_CONTROL=verdict flips one file verdict at the head in memory (item 2 must differ);
   PROBE_CONTROL=record changes one existing career total at the head in memory (item 3 must name it). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = path.resolve('.');
const BASE = path.resolve(process.argv[2] ?? '/tmp/base');
const CONTROL = process.env.PROBE_CONTROL ?? '';
let bad = 0;
const fail = m => { bad += 1; console.error('  FAIL: ' + m); };

async function verdicts(root) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1574-'));
  const R = root.split(path.sep).join('/');
  fs.writeFileSync(path.join(tmp, 'e.mjs'), ['baseball', 'nfl', 'nhl'].map(s => `export { ${s}ConnectionsPuzzles as ${s} } from '${R}/src/data/${s}ConnectionsPuzzles.ts';`).join('\n'));
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(root, 'src') } });
  const data = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  const us = await import(pathToFileURL(path.join(root, 'scripts/lib/usConnectionsCheck.mjs')).href);
  const lines = [];
  for (const s of ['baseball', 'nfl', 'nhl']) {
    const { checker } = us.makeUsChecker(root, s);
    for (const b of data[s]) for (const g of b.groups) {
      const c = checker.criterion(g.theme);
      for (const p of b.groups.flatMap(x => x.players)) lines.push(`${s}\t${b.id}\t${g.theme}\t${p}\t${c ? String(checker.fits(p, c)) : 'unjudged'}`);
    }
  }
  return lines.sort();
}

console.log('item 2: the file boards\' verdicts, base against head');
const base = await verdicts(BASE);
const head = await verdicts(HEAD);
if (CONTROL === 'verdict') {
  const i = head.findIndex(l => l.endsWith('\ttrue'));
  head[i] = head[i].replace(/\ttrue$/, '\tfalse');
  console.log(`PROBE_CONTROL=verdict: flipped ${head[i].split('\t').slice(0, 4).join(' | ')}`);
}
const a = base.join('\n'), b = head.join('\n');
console.log(`   base ${base.length} verdicts, head ${head.length}: ${a === b ? 'IDENTICAL' : 'DIFFERENT'}`);
if (a !== b) { const k = base.findIndex((l, i) => l !== head[i]); fail(`first difference: base "${base[k]}" head "${head[k]}"`); }
/* the head's harness dump, filtered to the file boards' ids, is the same lines */
const out = path.join(os.tmpdir(), 'dump1574.tsv');
execFileSync('node', ['scripts/simUsConnectionsFacts.mjs'], { cwd: HEAD, env: { ...process.env, US_CONN_DUMP: out }, stdio: 'ignore' });
const fileIds = new Set(head.map(l => l.split('\t')[1]));
const dumped = fs.readFileSync(out, 'utf8').trim().split('\n').filter(l => fileIds.has(l.split('\t')[1]));
console.log(`   the harness dump holds ${dumped.length} file verdicts: ${dumped.join('\n') === b ? 'IDENTICAL to the head\'s' : 'DIFFERENT'}`);
if (CONTROL !== 'verdict' && dumped.join('\n') !== b) fail('the harness dump is not the probe\'s head verdicts');

console.log('item 3: every man and field of the base records is in the head\'s');
for (const s of ['nfl', 'nhl']) {
  const rb = JSON.parse(fs.readFileSync(path.join(BASE, `scripts/data/${s}ConnectionsRecord-2026-10.json`), 'utf8')).men;
  const rh = JSON.parse(fs.readFileSync(path.join(HEAD, `scripts/data/${s}ConnectionsRecord-2026-10.json`), 'utf8')).men;
  if (CONTROL === 'record' && s === 'nhl') { const n = Object.keys(rh).find(x => rh[x].career && rb[x]); rh[n] = { ...rh[n], career: { ...rh[n].career, P: rh[n].career.P + 1 } }; console.log(`PROBE_CONTROL=record: ${n}'s career points moved by one`); }
  let diff = 0;
  for (const [n, m] of Object.entries(rb)) for (const [k, v] of Object.entries(m)) {
    if (JSON.stringify(rh[n]?.[k]) !== JSON.stringify(v)) { diff += 1; fail(`${s} ${n}.${k} changed`); }
  }
  console.log(`   ${s}: ${Object.keys(rb).length} base men, ${Object.keys(rh).length} head men, ${diff} differences on the base's fields`);
}
if (bad) { console.error(`probe-proofs: ${bad} failure(s)`); process.exit(1); }
console.log('probe-proofs: green. The file boards\' verdicts are byte for byte the base\'s, and the records only grew.');
