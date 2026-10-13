// Reviewer mutation kit for Round 1327 (runner only). Usage: node .rc/x/mut1327.mjs <name>
// Applies one small plausible mutation to a COPY on the runner checkout; the request line restores with git checkout.
import fs from 'node:fs';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const M = {
  // the deck's key loses the season (a stale key): the same career draws the same stream every season
  keyseason: [ENGINE, 'const picked = drawEventBatch(eligible, `${soccerDeckIdentity(state)}|${season}|deck`);', 'const picked = drawEventBatch(eligible, `${soccerDeckIdentity(state)}|deck`);'],
  // the paper's key loses the year: the same career draws the same story slot every season
  newsyear: [ENGINE, 'const rng = keyedRng(`${soccerDeckIdentity(s)}|${season.year}|news`);', 'const rng = keyedRng(`${soccerDeckIdentity(s)}|news`);'],
  // card 12 loses its club filter (a loan row he has left can deal it)
  loanclub: [ENGINE, 'case 12: return row.club === state.currentClub && typeof row.leagueFinish', 'case 12: return typeof row.leagueFinish'],
  // All stats +N next season assigns again (the old wipe)
  boostwipe: [ENGINE, 'out[k] = (out[k] || 0) + n;', 'out[k] = n;'],
  // card 11 names a hamstring again whatever the row holds
  injname: [ENGINE, 'if (id === 11 && row.injury) return `Your ${lowerFirst(row.injury)} this season has left its mark.`;', 'if (id === 11 && row.injury) return `Your hamstring injury this season has left its mark.`;'],
  // card 4 takes any earlier Player of the Month (off by a season)
  potmyear: [ENGINE, 'a.name === "Player of the Month" && a.year === row.year', 'a.name === "Player of the Month" && a.year <= row.year'],
  // INJURY BLOW loses its five week floor and names a random injury again
  injblow: [ENGINE, 'const injury = (season.injury ?? "").split(" ")', 'const injury = pick(["Hamstring Tear", "Knee Ligament Damage", "Broken Foot"]) || (season.injury ?? "").split(" ")'],
  // the paper's weighted walk is off by one slot (takes the story after the one the weight lands on)
  walkoff: [ENGINE, 'if (r < pool[i].weight) { at = i; break; }', 'if (r < pool[i].weight) { at = Math.min(i + 1, pool.length - 1); break; }'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`MUTATION ABORT: unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`MUTATION ABORT: ${name} text found ${hits} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, () => to));
console.log(`MUTATION APPLIED: ${name} in ${file}`);
