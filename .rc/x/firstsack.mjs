// Reviewer's fold for Round 1501: reads simCmDifficulty section 4 shard files (OUT_JSON rows) from the folders
// given and prints, per level and tier, the share of careers sacked inside their FIRST season (season 1 rows),
// the share of all seasons ending sacked, and the matches survived in a first season. Copies the rows to $RC_OUT.
import fs from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2).filter(d => fs.existsSync(d) && fs.statSync(d).isDirectory());
const rows = [];
for (const d of dirs) for (const f of fs.readdirSync(d).filter(x => x.endsWith('.json'))) rows.push(...JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
console.log(`firstsack: ${rows.length} rows from ${dirs.length} folders`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `rows-${process.env.TAG || 'x'}.json`), JSON.stringify(rows));
for (const level of ['normal', 'hard', 'legend']) for (const tier of ['big', 'mid', 'small']) {
  const all = rows.filter(r => r.level === level && r.tier === tier);
  const first = all.filter(r => r.season === 1);
  if (!all.length) continue;
  const fs1 = first.filter(r => r.sacked).length;
  const sk = all.filter(r => r.sacked).length;
  const m1 = first.length ? first.reduce((n, r) => n + (r.matches || 0), 0) / first.length : NaN;
  const titles = all.filter(r => r.title).length;
  console.log(`  ${level.padEnd(6)} ${tier.padEnd(5)} first season sacked ${fs1} of ${first.length} (${(fs1 / Math.max(1, first.length)).toFixed(2)}), matches in a first season ${m1.toFixed(1)}, seasons sacked ${sk} of ${all.length} (${(sk / all.length).toFixed(2)}), titles ${titles}`);
}
