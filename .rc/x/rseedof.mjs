/* Reviewer (run lens), Round 1215: what pageSeedOf makes of the things a person might put in LIVE_FIT_SEED. */
import { pageSeedOf, hashName } from '../../scripts/lib/pageSeed.mjs';
const here = process.argv[2] || 'file:///x/scripts/playLiveMatchFit.mjs';
const tries = [undefined, '0', '7', ' 7 ', '007', '1e3', '0x10', '4294967295', '4294967296', '-1', '-0', '1.5', '', ' ', 'fresh', 'Fresh', 'fresh ', 'abc', 'NaN', 'Infinity', '12345678901'];
for (const raw of tries) {
  let got;
  try { got = pageSeedOf(here, raw); } catch (e) { got = 'THROWS'; }
  console.log(`${raw === undefined ? 'undefined' : JSON.stringify(raw)} -> ${got}`);
}
console.log(`own seed by file url ${pageSeedOf('file:///C:/a/b/scripts/playLiveMatchFit.mjs', undefined)}, by plain path ${pageSeedOf('scripts/playLiveMatchFit.mjs', undefined)}, hash of the bare name ${hashName('playLiveMatchFit.mjs')}`);
const a = pageSeedOf(here, 'fresh');
const b = pageSeedOf(here, 'fresh');
console.log(`fresh twice in one process: ${a}, ${b} (whole numbers in range: ${[a, b].every(n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff)})`);
