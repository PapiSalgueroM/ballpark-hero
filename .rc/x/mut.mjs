/* Review run 1525: apply one named mutation to the checkout (runner only). Exit 2 when the text is not there once. */
import fs from 'node:fs';
const AW = 'src/lib/soccerSeasonAwards.ts';
const EN = 'src/lib/soccerCareerEngine.ts';
const M = {
  // a stale constant: the Player of the Year pool typed as 4
  pool: [AW, "'Player of the Year': [40, 'vote'", "'Player of the Year': [4, 'vote'"],
  // a dropped key component: every award of a season shares one stream
  key: [EN, '|${season.year}|award|${award}`', '|${season.year}|award`'],
  // a swapped comparison: Comeback after a GOOD season
  comeback: [AW, 's.prevRating !== null && s.prevRating <= 6.5', 's.prevRating !== null && s.prevRating >= 6.5'],
  // a sign slip: the Young grade made harder instead of easier
  young: [AW, 's.age < 23 && s.apps >= 20, -1.1]', 's.age < 23 && s.apps >= 20, 1.1]'],
  // a swapped argument: level read as if every club were elite
  level: [EN, 'level: seasonLevel(season.rating, season.clubTier)', 'level: seasonLevel(season.rating, 1)'],
  // a dropped filter: the Golden Boot at any tier
  tier: [AW, "'Golden Boot': [20, 'goals', s => s.clubTier <= 2 && s.goals > 0]", "'Golden Boot': [20, 'goals', s => s.goals > 0]"],
  // a stale constant: the vote grade for keepers and defenders typed as 2.0 (defenders never win a vote)
  grade: [AW, '{ GK: 0.2, CB: 0.2, LB: 0.2, RB: 0.2, CM: 0.1, CDM: 0.1 }', '{ GK: 2.0, CB: 2.0, LB: 2.0, RB: 2.0, CM: 0.1, CDM: 0.1 }'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`MUTATION ABORT: unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
if (text.split(from).length !== 2) { console.log(`MUTATION ABORT: ${name}: ${file} does not hold the text once`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log(`MUTATION ${name} applied to ${file}`);
