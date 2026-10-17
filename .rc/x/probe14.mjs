// Fix2 of Round 1508 (the closing check's finding 2): which men does simCmWorldMoves section 14 skip from its door
// check, and why. Patches the runner's checkout of scripts/simCmWorldMoves.mjs to print one DIAG14 line per skipped
// man and a tally at exit; the request line restores the file. Exit 2 when an anchor is not there exactly once.
import fs from 'node:fs';

const FILE = 'scripts/simCmWorldMoves.mjs';
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const edits = [
  ['    if (adopted) s = adoptedStart(M, s);\n',
    '    if (adopted) { globalThis.__pre = new Set((s.transferLog ?? []).map(l => `${l.name}|${l.from}|${l.to}|${l.season}`)); s = adoptedStart(M, s); }\n', 2],
  ['      if (owned.length !== 1 || !owned[0].owner || owned[0].owner === to) { t3.notOwned += 1; continue; }',
    '      if (owned.length !== 1 || !owned[0].owner || owned[0].owner === to) { globalThis.__diag({ tag, name, to, joined, departed, screen, carried, runLines, owned, j, adopted }); t3.notOwned += 1; continue; }', 1],
];
for (const [from, to, want] of edits) {
  const n = src.split(from).length - 1;
  if (n !== want) { console.log(`probe14: ABORT, anchor found ${n} times (wanted ${want}): ${from.slice(0, 60)}`); process.exit(2); }
  src = src.split(from).join(to);
}
const head = `
const __tally = new Map();
const __bump = k => __tally.set(k, (__tally.get(k) ?? 0) + 1);
globalThis.__diag = ({ tag, name, to, joined, departed, screen, carried, runLines, owned, j, adopted }) => {
  const reason = owned.length === 0 ? 'none' : owned.length > 1 ? 'multi' : !owned[0].owner ? 'noowner' : 'mine';
  const cl = carried.find(t => t.name === name), rl = runLines.find(t => t.name === name);
  const line = cl ?? rl;
  const pre = line && globalThis.__pre ? globalThis.__pre.has(\`\${line.name}|\${line.from}|\${line.to}|\${line.season}\`) : null;
  const when = tag.includes('season two') ? 'second' : tag.includes('before January') ? 'before' : 'after';
  const recs = list => list.filter(r => r.player.name === name).map(r => \`\${r.key}:\${r.status}:\${r.owner ?? '-'}\`).join(',') || 'no record';
  const rows = screen.filter(p => p.name === name).map(p => \`\${p.club}:\${p.joinedThisSeason === true ? 'joined' : 'plain'}\`).join(',') || 'not listed';
  const gone = (j.goneNames ?? []).includes(name);
  __bump(\`reason=\${reason}\`); __bump(\`src=\${cl ? 'carried' : 'runin'}\`); __bump(\`pre=\${pre}\`); __bump(\`when=\${when}\`);
  __bump(\`wk=\${line ? line.week : '?'}\`); __bump(\`gone=\${gone}\`); __bump(\`listed=\${rows === 'not listed' ? 'no' : 'yes'}\`);
  __bump(\`reason=\${reason}|pre=\${pre}|src=\${cl ? 'carried' : 'runin'}\`);
  console.log(\`DIAG14 \${tag} | \${name} | \${reason} | \${cl ? 'carried' : 'runin'} | \${line ? \`\${line.from}>\${line.to} s\${line.season} w\${line.week}\` : '?'} | preAdopt=\${pre} | gone=\${gone} | joined: \${recs(joined)} | departed: \${recs(departed)} | screen: \${rows}\`);
};
process.on('exit', () => { console.log('DIAG14 TALLY ' + [...__tally].sort().map(([k, v]) => \`\${k} \${v}\`).join('; ')); });
`;
const at = src.indexOf('\nconst SECTIONS = ');
if (at < 0) { console.log('probe14: ABORT, no SECTIONS line'); process.exit(2); }
src = src.slice(0, at) + head + src.slice(at);
fs.writeFileSync(FILE, src);
console.log('probe14: applied');
