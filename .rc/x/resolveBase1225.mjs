// Release AV scratch (sent to the runner as .rc/x/resolveBase1225.mjs, never committed). Run inside a THROWAWAY
// worktree of the head in which `git revert -m 1 --no-commit 3247a167` (Round 1225's merge) has just stopped on
// conflicts. It builds the base Round 1229's closing check names for the fixture harnesses: the train with the
// league book and WITHOUT Round 1225. Only the engine matters to those harnesses (they archive src and bundle the
// engine), so the two files that are not the engine take the head's text, and the engine's one hunk (two import
// lines that Rounds 1218 and 1225 both edited) takes the line before Round 1225 for the fixtures import and the
// head's line for the other.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const unmerged = [...new Set(git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean))];
console.log(`unmerged after the revert: ${unmerged.join(', ') || 'none'}`);
const ENGINE = 'src/lib/clubManager.ts';
const HEADS = new Set(['src/components/club-manager/ClubManagerHelp.tsx', 'src/pages/WhatsNew.tsx']);
for (const f of unmerged) {
  if (f === ENGINE) continue;
  if (!HEADS.has(f)) { console.error(`resolveBase1225: ${f} is unmerged and I have no rule for it`); process.exit(2); }
  git('checkout', 'HEAD', '--', f);
  console.log(`${f}: the head's text (not the engine)`);
}
if (unmerged.includes(ENGINE)) {
  const lines = fs.readFileSync(ENGINE, 'utf8').split('\n');
  const out = [];
  let ours = null, theirs = null, hunks = 0;
  for (const l of lines) {
    if (l.startsWith('<<<<<<< ')) { ours = []; theirs = null; continue; }
    if (ours && theirs === null && l.startsWith('||||||| ')) { console.error('resolveBase1225: a diff3 hunk, not handled'); process.exit(2); }
    if (ours && theirs === null && l === '=======') { theirs = []; continue; }
    if (ours && theirs && l.startsWith('>>>>>>> ')) {
      if (ours.length !== theirs.length) { console.error(`resolveBase1225: the hunk has ${ours.length} lines of the head and ${theirs.length} of the side before Round 1225`); process.exit(2); }
      ours.forEach((o, i) => {
        const fixtures = o.includes("'@/lib/clubManagerFixtures'") || theirs[i].includes("'@/lib/clubManagerFixtures'");
        out.push(fixtures ? theirs[i] : o);
        console.log(`  engine hunk line ${i + 1}: ${fixtures ? 'the line before Round 1225' : "the head's line"}: ${(fixtures ? theirs[i] : o).slice(0, 110)}`);
      });
      ours = null; theirs = null; hunks += 1; continue;
    }
    if (theirs) theirs.push(l); else if (ours) ours.push(l); else out.push(l);
  }
  if (hunks !== 1) { console.error(`resolveBase1225: ${hunks} hunks in the engine, wanted exactly 1`); process.exit(2); }
  fs.writeFileSync(ENGINE, out.join('\n'));
  git('add', ENGINE);
}
const left = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
if (left.length) { console.error(`resolveBase1225: still unmerged: ${left.join(', ')}`); process.exit(2); }
const text = fs.readFileSync(ENGINE, 'utf8');
const marks = ['<<<<<<<', '>>>>>>>'].filter(m => text.includes(m)).length;
console.log(`engine: ${marks} conflict marks left; names the premier only key: ${text.includes('REAL_PREMIER_FIXTURE_KEY')}; names the ten league key: ${text.includes('realLeagueFixtureKeyForStart')}; keeps the league book: ${text.includes('leagueBook')}`);
if (marks || !text.includes('REAL_PREMIER_FIXTURE_KEY') || text.includes('realLeagueFixtureKeyForStart') || !text.includes('leagueBook')) { console.error('resolveBase1225: the engine is not the train without Round 1225'); process.exit(2); }
console.log('resolveBase1225: resolved');
