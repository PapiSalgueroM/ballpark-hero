// Fix review of Round 1314: real tree mutations for the rewritten checks. Run from the repo root on a
// runner, then restore with git checkout. Refuses (exit 3) when the text it rewrites is not there.
import fs from 'node:fs';

const name = process.argv[2];
const edit = (file, from, to) => {
  const t = fs.readFileSync(file, 'utf8');
  const n = t.split(from).length - 1;
  if (n !== 1) { console.error(`mut ${name}: ${file} holds ${n} copies of the anchor, expected 1. Refusing.`); process.exit(3); }
  fs.writeFileSync(file, t.replace(from, to));
  console.log(`mut ${name}: applied to ${file}`);
};
const append = (file, text) => { fs.appendFileSync(file, text); console.log(`mut ${name}: appended to ${file}`); };

const CSS = 'src/components/club-manager/LiveSimMotion.css';
const SC = 'src/pages/SoccerCareer.tsx';
switch (name) {
  case 'css-customprop':
    edit(CSS, 'height:100vh;height:100dvh;', '--cm-stage-height:100vh;height:var(--cm-stage-height);');
    break;
  case 'css-customprop-fixed':
    edit(CSS, 'height:100vh;height:100dvh;', '--cm-stage-height:100vh;--cm-stage-height:100dvh;height:var(--cm-stage-height);');
    break;
  case 'css-lvh':
    edit(CSS, 'height:100vh;height:100dvh;', 'height:100vh;height:100lvh;');
    break;
  case 'css-svh':
    edit(CSS, 'height:100vh;height:100dvh;', 'height:100vh;height:100svh;');
    break;
  case 'act-second-dotted':
    append(SC, '\nexport function controlSecondAdvance(s: any, clubs: any) { return advanceProSeason(s.career, clubs); }\n');
    break;
  default:
    console.error(`mut: unknown mutation ${name}`);
    process.exit(3);
}
