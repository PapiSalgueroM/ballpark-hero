/* Release AT: the door to the browser walk of Rounds 1193 and 1194 (compare two seasons, availability).
 * The walk itself lives in scripts/qa, and scripts/runAllSims.mjs only looks in scripts/, so a run of the
 * browser group skipped it without a word (the same trap as a harness named test). The runner files a
 * harness with the browser group when it imports the Playwright loader, which is why that import is here.
 * Its engine half is scripts/simSoccerSeasonHistory.mjs, which must be green first: the walk reads the
 * outcomes that sim writes. Remote CI only, like the walk. */
import './lib/playwrightLoader.mjs';
import './qa/playSeasonHistory1193.mjs';
