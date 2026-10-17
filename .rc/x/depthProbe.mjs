// Release BI triage, runner only: a copy of playClubManagerDecisionDepth.mjs that prints which saved keys the boot
// changed outside the desk (the harness only says that it did). Writes scripts/playDepthProbe.mjs; never touches the
// harness itself. usage: node .rc/x/depthProbe.mjs && <env> node scripts/playDepthProbe.mjs
import fs from 'node:fs';
const SRC = 'scripts/playClubManagerDecisionDepth.mjs';
const OUT = 'scripts/playDepthProbe.mjs';
const text = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
const anchor = '    const before = JSON.parse(beforeRaw);\n    check(JSON.stringify(withoutDesk(before))';
if (text.split(anchor).length !== 2) { console.error('depthProbe: anchor not found exactly once'); process.exit(3); }
const probe = '    const before = JSON.parse(beforeRaw);\n' + `    { const a = withoutDesk(before), b = withoutDesk(E.trimCareer(prepared));
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      if (keys.length) {
        console.log('PROBE ' + row.id + ' keys differ: ' + keys.join(', '));
        for (const k of keys) {
          const x = a[k], y = b[k];
          if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) {
            const sub = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(s => JSON.stringify(x[s]) !== JSON.stringify(y[s]));
            console.log('PROBE   ' + k + ' subkeys differ: ' + sub.join(', '));
            for (const s of sub.slice(0, 4)) console.log('PROBE     ' + k + '.' + s + ' boot=' + JSON.stringify(x[s]).slice(0, 600) + ' prepared=' + JSON.stringify(y[s]).slice(0, 600));
          } else {
            console.log('PROBE   ' + k + ' boot=' + JSON.stringify(x).slice(0, 900));
            console.log('PROBE   ' + k + ' prepared=' + JSON.stringify(y).slice(0, 900));
          }
        }
      }
    }
`;
fs.writeFileSync(OUT, text.replace(anchor, probe + '    check(JSON.stringify(withoutDesk(before))'));
console.log('depthProbe: wrote ' + OUT);
