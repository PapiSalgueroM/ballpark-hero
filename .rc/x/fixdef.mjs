// One off: make each Round BII helper default to the branch head a remote check request commit names, so a synthetic
// base never carries the request's .rc/ files and runner workflow (wfrun moves HEAD back to that branch head).
import fs from 'node:fs';
const DEF = [
  '# On a remote check HEAD is the throwaway "rc request <name> for <sha>" commit (it adds .rc/ and the runner\'s',
  '# workflow); the default ref is the branch head it names, so the base never carries those two.',
  'DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)',
  'case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac',
];
for (const [file, arg] of [['minus284.sh', 1], ['minus296.sh', 1], ['minus287.sh', 1], ['minus301.sh', 1], ['lifeMinus.sh', 2], ['phoneMinus.sh', 2]]) {
  const p = new URL(file, import.meta.url);
  let s = fs.readFileSync(p, 'utf8');
  const old = `R=$(git rev-parse "\${${arg}:-HEAD}^{commit}")`;
  if (s.split(old).length !== 2) throw new Error(file + ': anchor not once');
  s = s.replace(old, DEF.join('\n') + '\n' + `R=$(git rev-parse "\${${arg}:-$DEF}^{commit}")`);
  fs.writeFileSync(p, s);
  console.log('fixed', file);
}
