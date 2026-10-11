/* Round 1302 review (run lens): build src/test/reviewRunProbe2.test.tsx on the RUNNER from the repo's own screen
 * test (its helpers) plus the reviewer's second set of cases (.rc/x/rrProbeCases2.txt). Never committed. */
import fs from 'node:fs';
const src = fs.readFileSync('src/test/clubManagerVarScreen.test.tsx', 'utf8').replaceAll('\r\n', '\n');
const cases = fs.readFileSync('.rc/x/rrProbeCases2.txt', 'utf8').replaceAll('\r\n', '\n');
const end = src.lastIndexOf('\n});');
if (end < 0) { console.log('rrProbe2: ABORT, the describe block has no end'); process.exit(7); }
fs.writeFileSync('src/test/reviewRunProbe2.test.tsx', src.slice(0, end) + '\n' + cases + src.slice(end));
console.log(`rrProbe2: wrote src/test/reviewRunProbe2.test.tsx (${src.length} + ${cases.length} characters)`);
