/* Round 1557 closing check: a join preview with Round 1569, built in a tree of its own (never the checkout), sent
   to a runner as an extra file and never committed. Usage: node joinPrep.mjs <dir> <1569 sha>
   git merge-tree on the PC (2026-10-29) reported one conflict only, src/pages/WhatsNew.tsx, where both rounds add
   entries at the top of October. It is resolved here by keeping both sides (1557's entry first, then 1569's).
   Any other conflict, or a conflict that is not exactly one marker set, refuses with exit 2. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const [dir, sha] = process.argv.slice(2);
const sh = c => execSync(c, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
const refuse = m => { console.error(`JOIN refused: ${m}`); process.exit(2); };
const root = process.cwd();
try { sh(`git cat-file -e ${sha}^{commit}`); } catch {
  sh('git fetch -q origin r1569-nba-career-reports');
  try { sh(`git cat-file -e ${sha}^{commit}`); } catch { refuse(`${sha} not reachable`); }
}
sh(`git worktree add -q ${dir} HEAD`);
fs.symlinkSync(`${root}/node_modules`, `${dir}/node_modules`);
const g = `git -C ${dir} -c user.name=rc -c user.email=rc@example.invalid`;
let clean = true;
try { sh(`${g} merge -q --no-edit ${sha}`); } catch { clean = false; }
const WN = 'src/pages/WhatsNew.tsx';
if (!clean) {
  const un = sh(`git -C ${dir} diff --name-only --diff-filter=U`).trim().split('\n').filter(Boolean);
  if (un.join() !== WN) refuse(`unexpected conflicts: ${un.join(', ') || '(none listed)'}`);
  const f = `${dir}/${WN}`;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const isMark = l => /^(<<<<<<< |\|\|\|\|\|\|\| |=======\r?$|>>>>>>> )/.test(l);
  const marks = lines.filter(isMark).length;
  if (marks !== 3) refuse(`${WN} holds ${marks} marker lines, not 3`);
  fs.writeFileSync(f, lines.filter(l => !isMark(l)).join('\n'));
  sh(`${g} add ${WN}`);
  sh(`${g} commit -q --no-edit`);
}
const wn = fs.readFileSync(`${dir}/${WN}`, 'utf8');
const titles = ['NBA My Career: the national team calls.', 'My Career: start over from anywhere.',
  'My Career: no extension offer now tells you why.', 'My Career: playoff notes follow how you actually played.',
  'My Career: the fans stop calling you a villain for a quiet year.'];
const counts = titles.map(t => wn.split(t).length - 1);
if (counts.some(n => n !== 1)) refuse(`What's New entry counts ${counts.join(',')} (each must be 1)`);
console.log(`JOIN ${sh(`git -C ${dir} log --format=%h -1`).trim()} = HEAD + ${sha.slice(0, 9)} (${clean ? 'clean' : 'WhatsNew kept both sides'}); What's New entries 1557+1569 each once: ${counts.join(',')}`);
