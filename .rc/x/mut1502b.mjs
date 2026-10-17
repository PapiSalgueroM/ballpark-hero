/* Review of Round 1502 (runs lens), second set: a swapped argument in the watched match, applied to a COPY of the
   tree (a git worktree on the runner), never to the branch. Usage: node mut1502b.mjs <name> <dir>. The `from` must
   stand exactly once or it exits 2 (not applied, so nothing it proves). */
import fs from 'node:fs';
import path from 'node:path';

const CM = 'src/lib/clubManager.ts';
const LINE = 'const bind: WorldCompBind = { sim: (strH, strA, scale, rand) => simScore(strH, strA, 0.2, -0.08, scale, rand), tie };';
const MUT = {
  /* the two strengths swapped: the home side plays with the away club's strength and the other way round. */
  swaphome: [CM, LINE, LINE.replace('simScore(strH, strA, 0.2', 'simScore(strA, strH, 0.2')],
  /* the two edges swapped: the away side gets the home edge (+0.2) and the home side the away one (-0.08). */
  edgeswap: [CM, LINE, LINE.replace('0.2, -0.08, scale', '-0.08, 0.2, scale')],
};

const [name, dir] = process.argv.slice(2);
if (!MUT[name] || !dir) { console.log(`mut1502b: unknown mutation ${name} or no dir`); process.exit(2); }
const [file, from, to] = MUT[name];
if (from === to) { console.log(`mut1502b: ${name} changes nothing: NOT APPLIED`); process.exit(2); }
const p = path.join(dir, file);
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
const text = crlf ? raw.split('\r\n').join('\n') : raw;
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut1502b: ${name}: the line stands ${n} times in ${file}, must be once: NOT APPLIED`); process.exit(2); }
const out = text.replace(from, to);
fs.writeFileSync(p, crlf ? out.split('\n').join('\r\n') : out);
console.log(`mut1502b: ${name} APPLIED to ${p}`);
