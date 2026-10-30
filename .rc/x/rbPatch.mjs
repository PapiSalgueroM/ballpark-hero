// Fixer rollback probe, step 1 (runner only, restored by git checkout): the head's career test writes the saves it
// made after a seat taken (on the arrival recap, and at the new club's hub after its draft) and after a year out, one
// JSON file each into ROLLBACK_DIR, named <sport>-<moment>.json. Step 2 mounts them on BASE's board.
import fs from 'node:fs';

const file = 'src/components/front-office-shared/FrontOfficeGmCareer.test.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const dump = name => `      fs.writeFileSync(\`\${process.env.ROLLBACK_DIR}/\${row.sport}-${name}.json\`, localStorage.getItem(row.saveKey)!);\n`;
const anchors = [
  ["      expect(s.postseason.champion, 'the club he joined won the closed season').toBe(target);\n", 'seat-arrival'],
  ["      expect([after.phase, after.myTeam, JSON.stringify(after.mandate)]).toEqual(['hub', target, JSON.stringify(ask)]);\n", 'seat-hub'],
  ["      expect(outScreen()?.textContent ?? '', 'the card says the year').toContain('Out of work, 1 season');\n", 'year-out'],
];
for (const [a, name] of anchors) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error(`RB ABORT: anchor for ${name} occurs ${n} times`); process.exit(2); }
  src = src.replace(a, a + dump(name));
}
fs.writeFileSync(file, src);
console.log('RB PATCHED: three dumps');
