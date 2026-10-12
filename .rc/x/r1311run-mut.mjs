// Review of Round 1311 (run lens): apply ONE small plausible mutation to the checkout on the runner.
// Usage: node .rc/x/r1311run-mut.mjs <name>. Exits 2 (and changes nothing) when the anchor is not there exactly once.
import fs from 'node:fs';

const BOARDS = 'src/lib/clubManagerLeagueBoards.ts';
const ENGINE = 'src/lib/clubManager.ts';
const CARD = 'src/components/club-manager/LeagueLeadersCard.tsx';
const SUMMARY = 'src/components/club-manager/ClubManagerSeasonSummary.tsx';

const MUTATIONS = {
  // m1 an off by one on the ruled floor: a share of exactly 73 no longer decides
  floorgt: [BOARDS, 'bookShare(input.book, input.clubs).share >= AWARD_FLOOR;', 'bookShare(input.book, input.clubs).share > AWARD_FLOOR;'],
  // m2 a swapped comparator: keepTeams keeps the team on the OLDEST five records
  keepoldest: [ENGINE, '.sort((a, b) => b - a).slice(0, TEAMS_KEPT)', '.sort((a, b) => a - b).slice(0, TEAMS_KEPT)'],
  // m3 a swapped comparator: the team's keeper is the one with the FEWEST clean sheets (over nought)
  keeperfew: [BOARDS, 'b.sheets - a.sheets || a.place - b.place || b.rating - a.rating', 'a.sheets - b.sheets || a.place - b.place || b.rating - a.rating'],
  // m4 swapped arguments on the data path: my men's league goals and assists trade places at the door
  mineswap: [ENGINE, 'goals: p.comp?.league?.goals ?? 0, assists: p.comp?.league?.assists ?? 0, ...(p.generated', 'goals: p.comp?.league?.assists ?? 0, assists: p.comp?.league?.goals ?? 0, ...(p.generated'],
  // m5 a dropped filter: a late book is no longer told apart in bookAwardsState
  nolatestate: [ENGINE, "  if (boards.from !== null) return { by: 'late', share: boards.share };", ''],
  // m6 a stale constant: the Stats card draws the honest line under the award floor instead of 95
  thinfloor: [CARD, '{lb.share < BOOK_FULL_SHARE && <p data-cm-leaders-thin', '{lb.share < AWARD_FLOOR && <p data-cm-leaders-thin'],
  // m7 the same stale constant on the season review's honest line
  sumthinfloor: [SUMMARY, 'awards && awards.cov < BOOK_FULL_SHARE &&', 'awards && awards.cov < 73 &&'],
};

const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.log(`mutation: unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutation ${name}: anchor found ${n} times in ${file}, NOT APPLIED`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.log(`mutation ${name}: no change`); process.exit(2); }
fs.writeFileSync(file, out);
console.log(`mutation ${name}: APPLIED in ${file}`);
