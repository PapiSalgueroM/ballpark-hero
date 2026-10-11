/* Round 1302 review (run lens): build src/test/reviewRunProbe3.test.tsx on the RUNNER from the repo's own screen
 * test (its helpers) plus the reviewer's cases 2 and 3. Never committed. */
import fs from 'node:fs';
const unix = text => text.split(String.fromCharCode(13)).join('');
const src = unix(fs.readFileSync('src/test/clubManagerVarScreen.test.tsx', 'utf8'));
const cases = unix(['.rc/x/rrProbeCases2.txt', '.rc/x/rrProbeCases3.txt'].map(f => fs.readFileSync(f, 'utf8')).join('\n'));
const end = src.lastIndexOf('\n});');
if (end < 0) { console.log('rrProbe3: ABORT, the describe block has no end'); process.exit(7); }
fs.writeFileSync('src/test/reviewRunProbe3.test.tsx', src.slice(0, end) + '\n' + cases + src.slice(end));
console.log(`rrProbe3: wrote src/test/reviewRunProbe3.test.tsx (${src.length} + ${cases.length} characters)`);
