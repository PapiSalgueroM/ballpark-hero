// Reviewer sc-screens, Release AT. RUNNER ONLY, never committed. Points three of the other lane's harnesses at the
// merge commit just before their own pull request on release-at-int, so their "engine baseline" group compares like
// with like and the fixtures their browser walks need get written. Refuses unless each old pin is found exactly once.
import fs from 'node:fs';
const EDITS = [
  ['scripts/simCareerTrophyRuns.mjs',
    ['fa24b3848d99e29367486489b081a483dc544206', '2ee41bd6de85e07161522e83b7249a7fe071d58c'],
    ['d9175fa74fc5784ba6acfd1a62f4592cb106f22f', 'bc65f852d6f069c8c6ea0d6b999e40454432205b']],
  ['scripts/qa/seasonHistory1193.mjs',
    ['fa24b3848d99e29367486489b081a483dc544206', 'f57763a68d304f52fb7f5f5df7e0eef457be74e4'],
    ['d9175fa74fc5784ba6acfd1a62f4592cb106f22f', '6d7c9a8bc09eabb7f09af75a9e73247bea433291']],
  ['scripts/qa/derbyHistory1195.mjs',
    ['48790763e65446b75c7699498b806637dc5c0111', '3df03db11f3d3415a938f9dadabf8a6130e88c2f'],
    ['24c2d492736512dce864095bf763be208516caa6', '9020b1e50d91bea18ea730d40cb617c1c6f49f8c']],
];
for (const [file, ...pairs] of EDITS) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count !== 1) { console.error(`REFUSED: ${file} holds ${from} ${count} times, wanted exactly 1`); process.exit(2); }
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log(`repinned ${file}`);
}
console.log('scRepin: three harness base pins moved on the runner copy only');
