/* Review mutations for Round 1569 (never committed). Usage: node .rc/x/mutR.mjs <name>
   Each one is a small plausible slip in the round's core rule, applied to the runner checkout only.
   titlecredit  the credit note also lands on a title season ("ended short of the title" to a champion)
   lastearly    seasonAheadIsLast looks two years ahead (calls a season last one year too early)
   lastnoseason seasonAheadIsLast forgets the season about to be played (misses a length limit)
   creditlow    the credit threshold slips to the poor band (credit on a middling 70 to 76 line)
   rookieretire the market's retire choice shows from season one (the six season gate dropped)
   startprospect Start over hidden on the road to the draft (phase prospect)
   whyage       the reason reads the age one year young (a stale input to noOfferWhy) */
import fs from 'node:fs';

const V = 'src/lib/careerVariance.ts', N = 'src/lib/usCareerNoOffer.ts', B = 'src/components/us-career/UsCareerBoard.tsx';
const SWAPS = {
  titlecredit: [V, 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (depth <= 4 && level >= JANUARY_STRONG) {'],
  lastearly: [N, 'age: c.age + 1, seasons:', 'age: c.age + 2, seasons:'],
  lastnoseason: [N, 'seasons: [...c.seasons, last ?? c.seasons[0]] }', 'seasons: [...c.seasons] }'],
  creditlow: [V, 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (depth < 4 && level >= JANUARY_POOR) {'],
  rookieretire: [B, '(!career || career.seasons.length < 6) ? null', '(!career || career.seasons.length < 1) ? null'],
  startprospect: [B, "(!!career || (phase === 'prospect' && !!prospect))", '(!!career)'],
  whyage: [B, 'noOfferWhy({ age: career.age, ovr:', 'noOfferWhy({ age: career.age - 1, ovr:'],
};
const [file, from, to] = SWAPS[process.argv[2]] ?? [];
if (!file) { console.log(`mutR ABORT: no mutation ${process.argv[2]}`); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
if (src.split(from).length !== 2) { console.log(`mutR ABORT: anchor for ${process.argv[2]} not found exactly once in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mutR applied ${process.argv[2]} in ${file}`);
