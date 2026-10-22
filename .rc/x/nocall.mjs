// Runner only: remove the four engines' settle call (the walk's nocall control). Restored by git checkout in the same line.
import fs from 'node:fs';
for (const s of ['nba', 'nfl', 'mlb', 'nhl']) {
  const file = `src/lib/${s}MyCareer.ts`;
  const t = fs.readFileSync(file, 'utf8');
  const call = `  for (const line of settleUsCareerShop(c, ${s.toUpperCase()}_SPEND_ITEMS)) notes.push(line);\n`;
  if (t.split(call).length !== 2) throw new Error(`${file}: the settle call is not there once`);
  fs.writeFileSync(file, t.replace(call, () => ''));
  console.log(`${file}: settle call removed`);
}
