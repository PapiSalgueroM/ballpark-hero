/* Release AL close, job 3, diagnostic only. Never committed, never part of the branch.
 *
 * scripts/playSoccerOfferReview1082.mjs stops at its first wage assertion because it expects the wage
 * ungrouped (57106) while the release's contract review prints it grouped (57,106) on purpose, commit
 * 7ef864fe. That leaves the question of whether anything ELSE in the proof is red behind that line.
 * This writes a throwaway copy beside the original, with only the three visible wage expectations
 * following the page's grouping, so the rest of the proof can run. The original file is not touched.
 */
import fs from 'node:fs';

const FROM = 'scripts/playSoccerOfferReview1082.mjs';
const TO = 'scripts/playSoccerOfferReview1082.grouped.mjs';
let text = fs.readFileSync(FROM, 'utf8');

function swap(from, to) {
  const count = text.split(from).length - 1;
  if (count !== 1) {
    console.error(`groupwages: expected exactly one ${JSON.stringify(from)}, found ${count}`);
    process.exit(3);
  }
  text = text.replace(from, () => to);
}

const ROOT_LINE = "const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
/* The same grouping src/lib/formatNumber.ts applies to a whole number. */
swap(ROOT_LINE, "const grp = n => String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');\n" + ROOT_LINE);
swap('`€${signed.weeklyWage}/wk`', '`€${grp(signed.weeklyWage)}/wk`');
swap('`€${before.weeklyWage}/wk`', '`€${grp(before.weeklyWage)}/wk`');
swap('`€${Math.abs(delta)}/wk ', '`€${grp(Math.abs(delta))}/wk ');
fs.writeFileSync(TO, text);
console.log(`groupwages: wrote ${TO} with three wage expectations grouped; ${FROM} is unchanged.`);
