// Release BF join probe: why simSoccerWorldTruth section 2's lockstep parts sooner after Round 1350.
// Writes a patched copy scripts/zzProbeWT.mjs (never committed; runner only) that logs, at each career's divergence,
// the pending ids on both sides and the catalog ids that differ between the two previous states.
import fs from 'node:fs';
import assert from 'node:assert/strict';
let src = fs.readFileSync('scripts/simSoccerWorldTruth.mjs', 'utf8');
const a1 = '    const nh = run(h, () => step(h.M, sh, c.seed)), nb = run(b, () => step(b.M, sb, c.seed));';
const a2 = '      if (!same || !storiesAgree(sh, sb)) { out.diverged = true;';
assert.equal(src.split(a1).length, 2, 'anchor 1');
assert.equal(src.split(a2).length, 2, 'anchor 2');
src = src.replace(a1, '    const __ph = sh, __pb = sb;\n' + a1);
const log = `      if (!same && (globalThis.__probeN = (globalThis.__probeN || 0) + 1) <= 25) {
        const R = Math.random; Math.random = () => 0.5;
        let ih, ib; try { ih = h.M.getAllEvents(__ph).map(e => e.id); ib = b.M.getAllEvents(__pb).map(e => e.id); } finally { Math.random = R; }
        const onlyH = ih.filter(x => !ib.includes(x)), onlyB = ib.filter(x => !ih.includes(x));
        const f = k => JSON.stringify(__ph[k]) === JSON.stringify(__pb[k]) ? '' : k + ' ' + JSON.stringify(__ph[k]).slice(0, 60) + ' vs ' + JSON.stringify(__pb[k]).slice(0, 60) + '; ';
        console.log('PROBE career ' + c.seed + ' step ' + out.steps + ' phase ' + __ph.phase + ' pendH ' + (sh.pendingEvents || []).map(e => e.id).join(',') + ' pendB ' + (sb.pendingEvents || []).map(e => e.id).join(',')
          + ' | catalog only head ' + onlyH.join(',') + ' only base ' + onlyB.join(',') + ' | prev ' + ['morale', 'popularity', 'integrityBonus', 'lastEventId', 'socialMediaFollowers', 'netWorth', 'overall'].map(f).join('') + ' awardsN ' + (__ph.awards || []).length + '/' + (__pb.awards || []).length);
      }
`;
src = src.replace(a2, log + a2);
fs.writeFileSync('scripts/zzProbeWT.mjs', src);
console.log('probeWT: patched copy written');
