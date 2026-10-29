/* Round 1569 (never committed): put this round's COPY changes back to main's words on a runner checkout, so a
   recording of the result shows whether everything else the round added is invisible to the parity replay.
   Reverts: the playoff note rule (careerVariance.ts clutchNote, the old body, level ignored), the press scrum
   sentence (usCareerPress.ts) and the last season words on the extension card (ExtensionCard.tsx).
   Keeps: Start over, the market retire choice, the no offer reason block. Refuses unless every anchor is found. */
import fs from 'node:fs';

const swap = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(from)) { console.log(`mut1569 ABORT: anchor not in ${file}: ${from.slice(0, 60)}`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
};
const cv = 'src/lib/careerVariance.ts';
const src = fs.readFileSync(cv, 'utf8');
const at = src.indexOf('export function clutchNote(');
if (at < 0) { console.log('mut1569 ABORT: clutchNote not found'); process.exit(2); }
fs.writeFileSync(cv, src.slice(0, at) + `export function clutchNote(swing: number, depth: number, sport: 'mlb' | 'nba' | 'nfl' | 'nhl', _level: number): string | null {
  if (depth < 0) return null;
  if (swing >= 7) {
    return sport === 'mlb' ? '🧊 Ice in October. You were a different hitter once the lights came on.'
      : sport === 'nba' ? '🧊 Playoff riser. Everything got harder and you got better.'
      : sport === 'nfl' ? '🧊 January football suited you. You were the best player on the field.'
      : '🧊 Playoff performer. Sixteen wins is a different sport and you were built for it.';
  }
  if (swing <= -7) {
    return sport === 'mlb' ? '😬 You could not buy a hit in October. It will follow you all winter.'
      : sport === 'nba' ? '😬 You disappeared when it mattered. The talk shows had a field day.'
      : sport === 'nfl' ? '😬 You were not the same player in January and everyone saw it.'
      : '😬 You went quiet in the playoffs. The room noticed.';
  }
  return null;
}
`);
swap('src/lib/usCareerPress.ts', 'a front row of reporters with hard questions about the season. Somebody has to answer them, and the cameras picked you.', 'a front row of reporters who counted every miss. Somebody has to answer for the season, and the cameras picked you.');
swap('src/components/us-career/ExtensionCard.tsx', '{!o && lastSeason ? (', '{false ? (');
swap('src/components/us-career/ExtensionCard.tsx', '{!o && lastSeason && !talk.pulled ?', '{false ?');
console.log('mut1569 applied: the copy is main\'s again, the additive controls stay');
