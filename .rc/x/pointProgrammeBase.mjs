// Release AU, an ATTRIBUTION ARM for a runner's throwaway checkout only (never commit what it writes):
// scripts/simCareerProgramme.mjs compiles its "original" engine from the commit PR216 was cut from (a131ed71, main
// before Release AS). On the release line that is no longer the engine PR216 lands on. This points the harness
// (and the base named in its recorded chance actions) at the tree just before PR216's own merge, the way Release
// AT's ruling R4 pointed the other lane's six base pinned harnesses. Nothing else is touched: no assertion, no
// count, no recorded action.
// usage: node .rc/x/pointProgrammeBase.mjs <commit>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const sha = execFileSync('git', ['rev-parse', process.argv[2]], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['rev-parse', sha + '^{tree}'], { encoding: 'utf8' }).trim();
const OLD = 'a131ed713d65e844aa8d86c92dbb8be396ba55af';
const OLD_TREE = 'ebd03b225527047d52a97ccbc9bf594edea536e1';
for (const f of ['scripts/simCareerProgramme.mjs', 'scripts/data/careerChanceActions1197.json']) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.split(OLD).length !== 2 || s.split(OLD_TREE).length !== 2) throw new Error(`the old base and its tree must each be in ${f} exactly once`);
  fs.writeFileSync(f, s.replace(OLD, sha).replace(OLD_TREE, tree));
}
console.log(`pointProgrammeBase: base ${sha}, tree ${tree}`);
