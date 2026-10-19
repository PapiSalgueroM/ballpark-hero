// Release BL probe (not committed): applies to the two frozen old Grid tests in the current checkout exactly the role
// adaptation PR346's own prover makes in its copies (scripts/qa/gridSearchAccessibility1432.mjs, roleTestCopy):
// on every line holding ByRole('textbox', { name: 'Search for a player' }, textbox becomes combobox. Fails closed unless
// the discovery test has exactly 3 such lines and the blur test exactly 4 (the prover's own edit counts).
import fs from 'node:fs';
const from = "ByRole('textbox', { name: 'Search for a player' }";
const to = "ByRole('combobox', { name: 'Search for a player' }";
for (const [file, want] of [['src/test/soccerGridSearchDiscovery.test.tsx', 3], ['src/test/soccerGridBlurOwnership.test.tsx', 4]]) {
  const body = fs.readFileSync(file, 'utf8');
  const n = body.split(from).length - 1;
  if (n !== want) { console.log(`gridRole: ${file} has ${n} selector lines, want ${want}`); process.exit(2); }
  fs.writeFileSync(file, body.split(from).join(to));
  console.log(`gridRole: ${file}: ${n} role selectors adapted`);
}
