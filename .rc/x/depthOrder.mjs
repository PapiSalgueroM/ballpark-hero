// Release BK triage, runner only: a copy of playClubManagerDecisionDepth.mjs that prints, when the boot changed the
// context outside the desk, which keys differ by VALUE and, when none does, where the KEY ORDER parts (top level and
// one level down). BI's depthProbe printed values only, and on this head it prints nothing. Writes
// scripts/playDepthOrder.mjs; never touches the harness. usage: node .rc/x/depthOrder.mjs && <env> node scripts/playDepthOrder.mjs
import fs from 'node:fs';
const SRC = 'scripts/playClubManagerDecisionDepth.mjs';
const OUT = 'scripts/playDepthOrder.mjs';
const text = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
const anchor = '    const before = JSON.parse(beforeRaw);\n    check(JSON.stringify(withoutDesk(before))';
if (text.split(anchor).length !== 2) { console.error('depthOrder: anchor not found exactly once'); process.exit(3); }
const probe = '    const before = JSON.parse(beforeRaw);\n' + `    { const a = withoutDesk(before), b = withoutDesk(E.trimCareer(prepared));
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        const J = v => JSON.stringify(v);
        const val = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => J(a[k]) !== J(b[k]));
        const ka = Object.keys(a), kb = Object.keys(b), i = ka.findIndex((k, j) => k !== kb[j]);
        console.log('PROBE ' + row.id + ' club ' + (b.clubName ?? '?') + ' uclGroup ' + !!b.uclGroup + ': value keys differ [' + val.join(', ') + ']; top order parts at '
          + i + ' of ' + kb.length + ': boot ' + ka.slice(i, i + 3).join(',') + ' prepared ' + kb.slice(i, i + 3).join(',')
          + '; worldComps at boot ' + ka.indexOf('worldComps') + ' prepared ' + kb.indexOf('worldComps') + ' keys ' + Object.keys(b.worldComps ?? {}).join(','));
      }
    }
`;
fs.writeFileSync(OUT, text.replace(anchor, probe + '    check(JSON.stringify(withoutDesk(before))'));
console.log('depthOrder: wrote ' + OUT);
