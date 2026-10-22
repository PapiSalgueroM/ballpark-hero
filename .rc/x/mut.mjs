/* Reviewer mutation kit for Round 1523 (run lens). Usage: node .rc/x/mut.mjs <ID>
   Applies ONE mutation to the runner's checkout, asserting its needle occurs exactly once (else ABORT, exit 2).
   The request line restores with git checkout -- src scripts. Never committed. */
import fs from 'node:fs';

const M = {
  /* C: the hub line forgets the phone (a dropped argument): the cap is then never shown */
  C: ['src/pages/SoccerCareer.tsx',
    'soccerMoraleLine(career.morale, phoneAppsSwing(career))',
    'soccerMoraleLine(career.morale, 0)'],
  /* D: the rating reads the morale after the texts (a stale read), the games still read the pressed one */
  D: ['src/lib/soccerCareerEngine.ts',
    'fx.ratingDelta + soccerMoraleRating(moraleAtPress(state))',
    'fx.ratingDelta + soccerMoraleRating(state.morale)'],
  /* F: off by one in the Puskas year (> for >=): 2008-09 loses the award Ronaldo won */
  F: ['src/lib/soccerWorldTruth.ts',
    'return seasonYear >= PUSKAS_FIRST_SEASON;',
    'return seasonYear > PUSKAS_FIRST_SEASON;'],
  /* G: the gate short circuits the draw (the Round 1329 rule broken: an early season skips a Math.random) */
  G: ['src/lib/soccerCareerEngine.ts',
    'const puskasDrawn = season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08;',
    'const puskasDrawn = puskasAwardExists(thisYear) && season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08;'],
  /* H: the plan's expected games forget the morale share (the sheet lines keep it) */
  H: ['src/lib/soccerClubSquad.ts',
    'let expected = clampN((band.min + band.max) / 2 + swing + moraleGames + form.swing + roleSwing, 0, 38);',
    'let expected = clampN((band.min + band.max) / 2 + swing + form.swing + roleSwing, 0, 38);'],
  /* I: a swapped key in the NFL engine (copy paste from the NBA line) */
  I: ['src/lib/nflMyCareer.ts',
    "moraleForm('nfl', c.morale)",
    "moraleForm('nba', c.morale)"],
  /* J: stale constant: the soccer neutral copied from the US careers (60) */
  J: ['src/lib/careerForm.ts',
    'soccer: { per: 15, neutral: 81 },',
    'soccer: { per: 15, neutral: 60 },'],
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`ABORT: unknown mutation ${id}`); process.exit(2); }
const [file, needle, repl] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(needle).length - 1;
if (n !== 1) { console.log(`ABORT: mutation ${id}: needle occurs ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, text.replace(needle, repl));
console.log(`MUTATION ${id} applied to ${file}`);
