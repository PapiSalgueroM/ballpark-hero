// Round 1337 attribution: put the Season Centre help's two old intro strings back in <root>'s copy, nothing else.
// Usage: node introBack.mjs <root>. Exits 1 unless each new string is found exactly once and the result is the base file.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = process.argv[2];
const file = path.join(root, 'src/components/soccer-career/SoccerSeasonCentre.tsx');
const pairs = [
  [`    'Your season was played the moment you pressed Next Season or 📺 Week by week. Here you watch it one matchday at a time, and the final table and your season totals end where your season summary has them.',`,
    `    'Your season was played the moment you pressed Next Season. This is that same season, match by match: the final table and your season totals are settled, and nothing here can change them.',`],
  [`    "Earlier seasons use the league's real clubs and competition rules where the game has them checked. From 2026-27, a season with a saved league world runs on your career's simulated clubs, with promotion and relegation between two divisions. Every score, every other club's result and every minute are your career's own.",`,
    `    "Earlier-season tables use verified league membership and competition rules. From 2026-27, saved league worlds use your career's simulated clubs and direct promotion and relegation between two divisions. The review marks the available Spanish lower-division club pool. Every score, every other club's result and every minute are your career's own.",`],
];
let text = fs.readFileSync(file, 'utf8');
for (const [now, old] of pairs) {
  const n = text.split(now).length - 1;
  if (n !== 1) { console.log(`introBack: found ${n} copies of a new intro string`); process.exit(1); }
  text = text.replace(now, old);
}
fs.writeFileSync(file, text);
console.log(`introBack: wrote the old intro back, sha ${createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16)}`);
