/* fixer scratch: count the served control needles in a built Season Centre chunk */
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const centre = files.filter(f => fs.readFileSync(path.join(dir, f), 'utf8').includes('Straight to the final table'));
console.log('centre chunks:', centre.join(' '));
const text = fs.readFileSync(path.join(dir, centre[0]), 'utf8');
const NEEDLES = {
  held: /=>\(([\w$]+)\|\|([\w$]+)\)&&([\w$]+)\?/g,
  otherplace: /(\.key\))===([\w$]+)(&&[\w$]+\([\w$]+\)\)\})/g,
  pitchgone: /return\{gone:!0\}/g,
  chipword: /,round:[\w$]+\.round\}/g,
};
for (const [name, re] of Object.entries(NEEDLES)) {
  const all = [...text.matchAll(re)];
  console.log(name, all.length, all.map(m => text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30)).join('\n   '));
}
const chip = files.filter(f => f.startsWith('SeasonResumeChip'));
for (const f of chip) { const t = fs.readFileSync(path.join(dir, f), 'utf8'); console.log(f, t.length, 'bytes;', t.slice(0, 700)); }
