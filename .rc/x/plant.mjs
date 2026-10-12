// Round 1308 review (run lens): plant an import of a new file where section 6 of simGmGameDay must see it.
import fs from 'node:fs';
const P = {
  card: { file: 'src/pages/FrontOffice.tsx', text: "\nimport NflBracket from '@/components/front-office/NflBracket';\nexport const __r = NflBracket;\n" },
  postrel: { file: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', text: "\nimport { loadGmPostseason } from '../../lib/gmPostseason';\nexport const __r = loadGmPostseason;\n" },
  viewnfl: { file: 'src/components/front-office/FrontOfficeBoard.tsx', text: "\nimport { gmBracketPlace } from '@/lib/gmBracketView';\nexport const __r = gmBracketPlace;\n" },
  lazynba: { file: 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', text: "\nexport const __r = () => import('@/components/front-office/NflBracket');\n" },
  bindnhl: { file: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', text: "\nimport { nflPlayTie } from '@/lib/frontOfficePostseason';\nexport const __r = nflPlayTie;\n" },
};
const id = process.argv[2];
const p = P[id];
if (!p || !fs.existsSync(p.file)) { console.log(`PLANT ${id}: unknown or no such file`); process.exit(2); }
fs.appendFileSync(p.file, p.text);
console.log(`PLANT ${id} into ${p.file}`);
