/* Round 1557 probe (sent to a runner as an extra file, never committed): what moved between two US board
   fixtures. Usage: node fxdiff.mjs <old.json> <new.json>. For every sport and every list of steps (the click
   path and each fixed save's screens) it counts the steps whose action, phase, save hash or save digests moved
   (none may, for this round) and the steps whose screen moved, and says whether each moved screen's excerpt
   differs from the old one ONLY by the badge count ("of 23" to "of 26"). Exit 0 when the only change is that,
   in the NBA alone; 1 otherwise. */
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let bad = 0;
for (const slug of Object.keys(a.sports)) {
  const lists = [['path', a.sports[slug].path, b.sports[slug]?.path]];
  for (const k of Object.keys(a.sports[slug].screens)) lists.push([`screens.${k}`, a.sports[slug].screens[k], b.sports[slug]?.screens?.[k]]);
  let steps = 0; let saveMoved = 0; let screenMoved = 0; let onlyCount = 0; let lengthMoved = 0;
  const other = [];
  for (const [name, x, y] of lists) {
    if (!y || x.length !== y.length) { lengthMoved += 1; other.push(`${name}: ${x.length} steps, now ${y?.length}`); continue; }
    for (let i = 0; i < x.length; i += 1) {
      steps += 1;
      const p = x[i]; const q = y[i];
      if (p.a !== q.a || p.p !== q.p || p.n !== q.n || p.s !== q.s || JSON.stringify(p.d) !== JSON.stringify(q.d)) { saveMoved += 1; if (other.length < 6) other.push(`${name} ${i}: the action or the save moved`); }
      if (p.m !== q.m || p.t !== q.t) {
        screenMoved += 1;
        if (slug === 'nba' && typeof p.t === 'string' && p.t.replace(/Badges(\d+) of 23/, 'Badges$1 of 26') === q.t) onlyCount += 1;
        else if (other.length < 6) other.push(`${name} ${i}: "${String(p.t).slice(0, 90)}" now "${String(q.t).slice(0, 90)}"`);
      }
    }
  }
  const ok = slug === 'nba' ? saveMoved === 0 && lengthMoved === 0 && screenMoved === onlyCount && screenMoved > 0 : saveMoved + screenMoved + lengthMoved === 0;
  if (!ok) bad += 1;
  console.log(`${slug}: ${steps} steps over ${lists.length} lists; ${saveMoved} with a moved action or save, ${screenMoved} with a moved screen (${onlyCount} of them the badge count alone), ${lengthMoved} lists of another length ${ok ? 'OK' : 'NOT OK'}`);
  for (const o of other) console.log(`   ${o}`);
}
console.log(bad ? `fxdiff: ${bad} sports moved more than the badge count` : 'fxdiff: the only change is the NBA case\'s badge count, 23 to 26');
process.exit(bad ? 1 : 0);
