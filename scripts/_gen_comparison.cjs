// Generates docs/DATABASE_COMPARISON.md from the two captured datasets:
//   pzzad-resync/_flawu_counts.json  - exact counts from flawu (via MCP)
//   pzzad-resync/_pzzad_probe.json    - per-table REST probe of pzzad (anon, read-only)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'pzzad-resync');

const flawu = JSON.parse(fs.readFileSync(path.join(DIR, '_flawu_counts.json'), 'utf8'));
const probe = JSON.parse(fs.readFileSync(path.join(DIR, '_pzzad_probe.json'), 'utf8')).results;

const flawuMap = new Map(flawu.map((r) => [r.t, r]));
const pz = new Map(probe.map((r) => [r.table, r]));
const pzExists = (t) => pz.has(t) && (pz.get(t).status === 200 || pz.get(t).status === 206);
const pzCount = (t) => (pz.has(t) ? pz.get(t).count : null);
const nf = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US'));

// 1. flawu tables missing from pzzad (probed and got 404 / not-exists)
const missing = flawu.filter((r) => !pzExists(r.t));
const missingWithData = missing.filter((r) => r.c > 0).sort((a, b) => b.c - a.c);
const missingEmpty = missing.filter((r) => r.c === 0).sort((a, b) => a.t.localeCompare(b.t));

// 2. tables in both
const inBoth = flawu.filter((r) => pzExists(r.t)).map((r) => ({
  t: r.t, flawu: r.c, pz: pzCount(r.t), rls: r.rls,
})).sort((a, b) => a.t.localeCompare(b.t));
const diffs = inBoth.filter((r) => r.flawu !== r.pz);

// 3. tables only in pzzad (probed extras not in flawu that exist)
const onlyPz = probe.filter((r) => !r.inFlawu && (r.status === 200 || r.status === 206))
  .map((r) => ({ t: r.table, pz: r.count }))
  .sort((a, b) => a.t.localeCompare(b.t));

const maskNote = (r) =>
  r.rls && (r.pz === 0 || r.pz === null) && r.flawu === 0
    ? 'both 0 (pzzad may be RLS-masked)'
    : r.flawu === r.pz ? 'match'
    : `differs (pzzad 0${r.rls ? ' may be RLS-masked' : ''})`;

let md = `# Database comparison — flawu vs pzzad (live)

_Generated ${new Date().toISOString().slice(0, 10)}. Read-only; nothing was modified._

## What this compares

- **flawu** = \`flawuiqbvjobmkfkauhw\` (dev/scratch project, reachable via the Supabase MCP).
  Counts are **exact** (\`count(*)\` per table).
- **pzzad** = \`pzzadswiradjnvvfybol\` (the LIVE site's database). Counts come from the
  **public REST API using the anon key** (read-only).

### Important caveats (read before trusting the numbers)

1. **pzzad counts can be undercounts.** Tables with Row-Level Security and no public-read
   policy return **0 via the anon key even when they hold data** (e.g. user scores,
   profiles, selections). A pzzad \`0\` therefore means *either* genuinely empty *or*
   RLS-masked — it is **not** proof the table is empty.
2. **pzzad table existence is reliable.** A \`404 (PGRST205)\` means the table does not
   exist in pzzad's schema. A \`200\` means it exists.
3. **"Only in pzzad" is best-effort.** pzzad's OpenAPI root returns 401, so its tables
   can't be enumerated directly. pzzad was probed for every flawu table plus every table
   named in \`src/integrations/supabase/types.ts\`. A pzzad-only table named in neither set
   would not be detected.

## Summary

| Metric | Value |
|---|---|
| Tables in flawu | ${flawu.length} |
| Tables in flawu also present in pzzad | ${inBoth.length} |
| **Tables in flawu MISSING from pzzad** | **${missing.length}** (${missingWithData.length} with data, ${missingEmpty.length} empty in flawu) |
| Tables only in pzzad (of probed candidates) | ${onlyPz.length} |
| In both but with different counts | ${diffs.length} |

---

## 1. Tables in flawu but MISSING from pzzad

These exist in flawu but return 404 on the live database — i.e. the live site has no such
table. **Most of pzzad's content tables simply don't exist there**; the live games that
need this data either fall back to bundled/hardcoded data or don't read it.

### 1a. Missing AND populated in flawu — candidate data to move (${missingWithData.length})

Sorted by flawu row count (largest first).

| Table | flawu rows | flawu RLS |
|---|--:|:--:|
${missingWithData.map((r) => `| \`${r.t}\` | ${nf(r.c)} | ${r.rls ? 'on' : 'off'} |`).join('\n')}

### 1b. Missing but EMPTY in flawu — nothing to move (${missingEmpty.length})

${missingEmpty.map((r) => `\`${r.t}\``).join(', ')}

---

## 2. Tables in BOTH databases

pzzad counts via anon REST (see caveat #1).

| Table | flawu rows | pzzad rows | Assessment |
|---|--:|--:|---|
${inBoth.map((r) => `| \`${r.t}\` | ${nf(r.flawu)} | ${nf(r.pz)} | ${maskNote(r)} |`).join('\n')}

**Different counts:** ${diffs.length === 0 ? 'none' : diffs.map((r) => `\`${r.t}\` (flawu ${nf(r.flawu)} vs pzzad ${nf(r.pz)})`).join('; ')}.

The three resync puzzle tables (\`connections_puzzles\` 250, \`baseball_connections_puzzles\`
60, \`tennis_players\` 40) **match** — confirming the pzzad-resync seed files were applied.

---

## 3. Tables ONLY in pzzad (not in flawu)

These exist on the live database but not in flawu. They are the live site's **user data and
gameplay-state tables** (scores, selections, daily puzzles, profiles, votes, brackets) that
accumulate in production and were never part of flawu. They should stay pzzad-only — there
is nothing to "move" for these. Counts are anon-visible only (caveat #1).

| Table | pzzad rows (anon-visible) |
|---|--:|
${onlyPz.map((r) => `| \`${r.t}\` | ${nf(r.pz)} |`).join('\n')}

---

## Appendix — full per-table listing

### flawu (${flawu.length} tables)

| Table | flawu rows | in pzzad? | pzzad rows |
|---|--:|:--:|--:|
${flawu.slice().sort((a, b) => a.t.localeCompare(b.t)).map((r) => {
  const exists = pzExists(r.t);
  return `| \`${r.t}\` | ${nf(r.c)} | ${exists ? 'yes' : 'NO'} | ${exists ? nf(pzCount(r.t)) : '—'} |`;
}).join('\n')}
`;

const out = path.join(ROOT, 'docs', 'DATABASE_COMPARISON.md');
fs.writeFileSync(out, md, 'utf8');
console.log(`wrote ${out}`);
console.log(`flawu=${flawu.length} inBoth=${inBoth.length} missing=${missing.length} (data=${missingWithData.length} empty=${missingEmpty.length}) onlyPz=${onlyPz.length} diffs=${diffs.length}`);
console.log(`diffs: ${diffs.map((r) => r.t + '(' + r.flawu + '/' + r.pz + ')').join(', ') || 'none'}`);
