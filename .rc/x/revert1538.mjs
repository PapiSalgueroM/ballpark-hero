// Runner only, for attribution: put one part of Round 1538 back as it was (brand, corr or skill) in the working tree.
// The caller restores the tree with git checkout in the same request line.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const part = process.argv[2];
const SPORTS = ['nba', 'nfl', 'mlb', 'nhl'];
const BASE = '1c7205d059cbcb380ebacaef99ba6751e8c641df';
const show = rel => execFileSync('git', ['show', `${BASE}:${rel}`], { maxBuffer: 64e6 }).toString('utf8').replaceAll('\r\n', '\n');
const read = rel => fs.readFileSync(rel, 'utf8').replaceAll('\r\n', '\n');
/* A line of the engine that holds `needle` now goes back to BASE's line holding `old`. */
function lineBack(rel, needle, old) {
  const now = read(rel).split('\n'), was = show(rel).split('\n');
  const at = now.flatMap((l, i) => (l.includes(needle) ? [i] : [])), from = was.filter(l => l.includes(old));
  if (at.length !== 1 || from.length !== 1) throw new Error(`${rel}: ${needle} ${at.length} now, ${old} ${from.length} then`);
  now[at[0]] = from[0];
  fs.writeFileSync(rel, now.join('\n'));
  console.log(`${rel}: put back the line holding ${old}`);
}
const BRAND = { nba: "label: 'Build the brand'", nfl: "label: 'Brand work'", mlb: "label: 'The commercial circuit'", nhl: "label: 'The content summer'" };
const SKILL = { nba: "label: 'Skill grind'", nfl: "label: 'Skill work'", mlb: "'New pitch lab' : 'Swing rebuild'", nhl: "label: 'Skills coach'" };
if (part === 'brand') for (const s of SPORTS) lineBack(`src/lib/${s}MyCareer.ts`, BRAND[s], BRAND[s]);
else if (part === 'skill') for (const s of SPORTS) lineBack(`src/lib/${s}MyCareer.ts`, SKILL[s], SKILL[s]);
else if (part === 'corr') for (const s of SPORTS) { const rel = `src/lib/${s}CareerCorruption.ts`; fs.writeFileSync(rel, show(rel)); console.log(`${rel}: as on ${BASE.slice(0, 8)}`); }
else throw new Error(`unknown part ${part}`);
