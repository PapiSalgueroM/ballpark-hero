// Reviewer probe: the builder's proposed one line fix of playCmRealFixtures, written to a copy on the runner only.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'scripts/playCmRealFixtures.mjs';
const src = readFileSync(f, 'utf8');
const needle = "await coverage.locator('a').first().focus(); await captureVisible(coverage, 'calendar-sources');";
if (!src.includes(needle)) { console.log('PATCH ABORTED: needle not found'); process.exit(3); }
writeFileSync('scripts/playCmRealFixturesRv.mjs', src.replace(needle, "await coverage.locator('a').first().focus(); await coverage.scrollIntoViewIfNeeded(); await captureVisible(coverage, 'calendar-sources');"));
console.log('PATCH APPLIED: scripts/playCmRealFixturesRv.mjs');
