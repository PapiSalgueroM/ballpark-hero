// Round 1516 probe (runner only, never committed): simCmDifficulty section 2 against the base with season one's
// worldComps.usc (a slice of season 1) left out of THIS TREE's season end states, counting the careers whose season
// one differed from the base only by it. Every other key, every later season and the draw counts compare as before.
import fs from 'node:fs';
const F = 'scripts/simCmDifficulty.mjs';
let src = fs.readFileSync(F, 'utf8');
const A = "      if (a.snaps[i] !== b.snaps[i]) { fail(`${tag}: season ${i + 1} differs from the base, first at key ${firstDiff(a.snaps[i], b.snaps[i])}`); break; }";
const B = '  ok(`${compared} Normal careers compared with the base';
const once = (s, a) => s.split(a).length === 2;
if (!once(src, A) || !once(src, B)) { console.log('mutDiffUsc: ABORTED, an anchor is not there exactly once'); process.exit(2); }
const A2 = [
  "      const uscOne = j => { const o = JSON.parse(j); if (o.worldComps && o.worldComps.usc && o.worldComps.usc.s === 1) { delete o.worldComps.usc; if (!Object.keys(o.worldComps).length) delete o.worldComps; } return JSON.stringify(o); };",
  '      const raw = a.snaps[i] === b.snaps[i];',
  '      const sa = raw ? a.snaps[i] : uscOne(a.snaps[i]);',
  '      if (!raw && sa === b.snaps[i]) { globalThis.__uscOnly = globalThis.__uscOnly || new Map(); globalThis.__uscOnly.set(`${tag} season ${i + 1}`, 1); }',
  '      if (sa !== b.snaps[i]) { fail(`${tag}: season ${i + 1} differs from the base, first at key ${firstDiff(sa, b.snaps[i])}`); break; }',
].join('\n');
const B2 = "  { const m = globalThis.__uscOnly || new Map(); const keys = [...m.keys()]; console.log(`  usc1: ${keys.length} career seasons differed from the base only by season one's worldComps.usc (${keys.filter(k => / season 1$/.test(k)).length} of them season one): ${keys.slice(0, 40).join('; ')}`); }\n" + B;
src = src.split(A).join(A2).split(B).join(B2);
fs.writeFileSync(F, src);
console.log('mutDiffUsc: applied');
