// fix2-1567 runner probe (never committed): edits Honus Wagner's near-line fact in the baseball ledger.
//   strip  keeps only the league record's source (one host: section 3 must fire one-host for him)
//   nohof  drops only the Hall of Fame page (still two hosts: section 3 must stay green)
// Asserts the fact it edits exists and changed, else exits 3. The caller restores the file.
import fs from 'node:fs';

const FILE = 'scripts/data/baseballConnectionsVerified-2026-10.json';
const mode = process.argv[2];
const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const f = j.facts.find(x => x.why === 'near-line' && x.name === 'Honus Wagner' && x.label === 'Hall of Fame first basemen');
if (!f || f.sources.length !== 3) { console.log('MUT ABORTED: the near-line fact for Honus Wagner is not in the ledger'); process.exit(3); }
const before = f.sources.length;
if (mode === 'strip') f.sources = f.sources.filter(s => s.host === 'statsapi.mlb.com');
else if (mode === 'nohof') f.sources = f.sources.filter(s => s.host !== 'baseballhall.org');
else { console.log(`MUT ABORTED: unknown mode ${mode}`); process.exit(3); }
if (f.sources.length === before) { console.log('MUT ABORTED: nothing changed'); process.exit(3); }
fs.writeFileSync(FILE, JSON.stringify(j, null, 1) + '\n');
console.log(`MUT ${mode}: Honus Wagner near-line fact now on ${f.sources.length} source(s)`);
