/* Round 1302 review (run lens): build src/test/reviewRunProbe.test.tsx on the RUNNER from the repo's own screen
 * test (its helpers) plus the reviewer's cases (.rc/x/rrProbeCases.txt). Never committed. */
import fs from 'node:fs';
const src = fs.readFileSync('src/test/clubManagerVarScreen.test.tsx', 'utf8').replaceAll('\r\n', '\n');
const cases = fs.readFileSync('.rc/x/rrProbeCases.txt', 'utf8').replaceAll('\r\n', '\n');
const end = src.lastIndexOf('\n});');
if (end < 0) { console.log('rrProbe: ABORT, the describe block has no end'); process.exit(7); }
fs.writeFileSync('src/test/reviewRunProbe.test.tsx', src.slice(0, end) + '\n' + cases + src.slice(end));
console.log(`rrProbe: wrote src/test/reviewRunProbe.test.tsx (${src.length} + ${cases.length} characters)`);
