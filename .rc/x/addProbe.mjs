// Round 1600 fix3 probe: writes scripts/cvProbe-<tag>.mjs, a copy of simCustomClubValues with candidate year grain
// statistics printed in section 1 (measurement only, never committed). Usage: node addProbe.mjs <tag>
import fs from 'node:fs';
const tag = process.argv[2];
let src = fs.readFileSync('scripts/simCustomClubValues.mjs', 'utf8').replaceAll('\r\n', '\n');
const A1 = '            if (sameAge.length >= 8) manByAge.push(p.value / median(sameAge));\n';
const A2 = '  if (manByAge.length < 3000) fail(';
if (src.split(A1).length !== 2 || src.split(A2).length !== 2) { console.error('probe anchors missing'); process.exit(2); }
src = src.replace(A1, A1 + `            {
              const P = (globalThis.__probe ??= { S1: [], S2: [], S3: [], S4: [], m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, moved: 0 });
              const moved = p.value !== cm.customFounderValue(p.rating, era, p.age);
              if (moved) P.moved++;
              if (sameAge.length >= 8 && moved) P.m0++;
              if (sameAge.length >= 3) { P.S1.push(p.value / median(sameAge)); if (moved) P.m1++; }
              const r1 = [-1, 0, 1].flatMap(d => realByRating.get(era + '|' + (p.rating + d) + '|a' + p.age) ?? []);
              const pool2 = sameAge.length >= 8 ? sameAge : r1;
              if (pool2.length >= 8) { P.S2.push(p.value / median(pool2)); if (moved) P.m2++; }
              const pool3 = sameAge.length >= 8 ? sameAge : (r1.length >= 3 ? r1 : []);
              if (pool3.length >= 3) { P.S3.push(p.value / median(pool3)); if (moved) P.m3++; }
              if (p.rating > 80 && r1.length >= 3) { P.S4.push(p.value / median(r1)); if (moved) P.m4++; }
            }
`);
src = src.replace(A2, `  {
    const P = globalThis.__probe;
    const q = (k, m) => console.log('   PROBE ' + k + ' n ' + P[k].length + ' moved in it ' + P[m] + ': p10 ' + f2(pct(P[k], 0.1)) + ', p50 ' + f2(median(P[k])) + ', p90 ' + f2(pct(P[k], 0.9)));
    console.log('   PROBE founders moved off customFounderValue ' + P.moved + ', of them in the year grain (8+) ' + P.m0);
    q('S1', 'm1'); q('S2', 'm2'); q('S3', 'm3'); q('S4', 'm4');
  }
` + A2);
fs.writeFileSync(`scripts/cvProbe-${tag}.mjs`, src);
console.log('probe written');
