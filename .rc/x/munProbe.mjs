// Release BV probe (never committed): make simCmMadeUpNations say, for each scouted boy it tries to sign back from the
// pool the season after next, whether he is still in the pool, whether he can be signed, and where the market lists
// him. Run from the checkout's root; restore with git checkout -- scripts.
import fs from 'node:fs';
const f = 'scripts/simCmMadeUpNations.mjs';
const s = fs.readFileSync(f, 'utf8');
const from = '      if (!(t.freeAgents ?? []).some(f => f.name === name)) continue;';
if (s.split(from).length !== 2) { console.log(`munProbe: the anchor stands ${s.split(from).length - 1} times, refusing`); process.exit(2); }
const to = [
  '      { const inPool = (t.freeAgents ?? []).find(f => f.name === name);',
  "        const signable = inPool ? !!mm.cm.signFreeAgent({ ...t, budget: 9999, wageCap: 9999 }, name) : null;",
  "        const listed = mm.cm.buildMarket(t).filter(l => l.name === name).map(l => l.club);",
  "        const kept = (t.squad ?? []).some(p => p.name === name);",
  "        console.log(`PROBE ${name} (${want}): in the pool ${!!inPool}${inPool ? ` age ${inPool.age} rating ${inPool.rating} wage ${inPool.wage} signable ${signable}` : ''}; in my squad ${kept}; listed at ${JSON.stringify(listed)}; pool size ${(t.freeAgents ?? []).length}, my squad ${(t.squad ?? []).length}, season ${t.season}`); }",
  from,
].join('\n');
fs.writeFileSync(f, s.replace(from, to));
console.log('munProbe: planted');
