/* Round 1569 (never committed): what moved between two US board fixtures.
   Usage: node .rc/x/fixdiff.mjs <old.json> <new.json>
   Prints, per sport: clicks, saves and screens that differ on the path and on the fixed saves, and for every
   screen that differs the first words where the two readings part. */
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const where = (x, y) => { let i = 0; while (i < x.length && x[i] === y[i]) i++; return i; };
let saveMoves = 0, clickMoves = 0, screenMoves = 0, coverageMoves = 0;
const reasons = new Map();
function steps(label, old, now) {
  if (old.length !== now.length) { console.log(`${label}: ${old.length} steps, now ${now.length}`); clickMoves++; }
  for (let i = 0; i < Math.min(old.length, now.length); i++) {
    const o = old[i], n = now[i];
    if (o.a !== n.a) { clickMoves++; console.log(`${label} step ${i}: pressed "${o.a}", now "${n.a}"`); return; }
    if (o.s !== n.s) { saveMoves++; console.log(`${label} step ${i}: the save differs`); return; }
    if (o.m !== n.m || o.t !== n.t) {
      screenMoves++;
      const at = where(o.t, n.t);
      const was = o.t.slice(Math.max(0, at - 30), at + 110), is = n.t.slice(Math.max(0, at - 30), at + 110);
      const key = /held up your end|A tough|playoff run|January was|reporters with hard questions|whatever happens/.exec(is)?.[0] ?? (o.t === n.t ? '(markup only)' : 'other');
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
      if ((reasons.get(key) ?? 0) <= 2 || key === 'other' || key === '(markup only)') console.log(`${label} step ${i} (${n.a}): was "...${was}" | now "...${is}"`);
    }
  }
}
for (const slug of Object.keys(a.sports)) {
  const o = a.sports[slug], n = b.sports[slug];
  if (JSON.stringify(o.coverage) !== JSON.stringify(n.coverage)) { coverageMoves++; console.log(`${slug} coverage: ${JSON.stringify(o.coverage)} now ${JSON.stringify(n.coverage)}`); }
  if (o.ssrCreate.m !== n.ssrCreate.m) console.log(`${slug} ssrCreate differs`);
  steps(`${slug} path`, o.path, n.path);
  for (const k of Object.keys(o.screens)) steps(`${slug} save "${k}"`, o.screens[k], n.screens[k] ?? []);
  for (const k of Object.keys(o.saves)) if (JSON.stringify(o.saves[k]) !== JSON.stringify(n.saves[k])) { saveMoves++; console.log(`${slug} fixed save "${k}" differs`); }
}
console.log(`reasons: ${JSON.stringify(Object.fromEntries(reasons))}`);
console.log(`fixdiff: clicks moved ${clickMoves}, saves moved ${saveMoves}, coverage moved ${coverageMoves}, screens moved ${screenMoves}`);
