// Round 1308 review (run lens): apply one plausible mutation on the runner's checkout. Exit 2 when the string is not there exactly once.
import fs from 'node:fs';
const MUTS = {
  edges: { file: 'src/lib/frontOfficePostseason.ts', from: "const g = simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, rng, edges);", to: "const g = simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, rng);" },
  confs: { file: 'src/lib/frontOfficePostseason.ts', from: "return seeds.every((id, i) => conferenceOf(id) === (i < 7 ? 'AFC' : 'NFC'));", to: 'return true;' },
  version: { file: 'src/lib/gmPostseason.ts', from: 'known = isRecord(block) && block.v === 1 ? block : undefined;', to: 'known = isRecord(block) ? block : undefined;' },
  sidescore: { file: 'src/lib/gmBracketView.ts', from: 'score: one ? (k === 0 ? one.homeScore : one.awayScore) : null', to: 'score: one ? (k === 0 ? one.awayScore : one.homeScore) : null' },
  outfirst: { file: 'src/lib/gmBracketView.ts', from: 'const lost = [...format.ties].reverse().find(t => done[t.id]?.loser === club);', to: 'const lost = [...format.ties].find(t => done[t.id]?.loser === club);' },
  opponent: { file: 'src/lib/gmBracketView.ts', from: 'const other = pair ? (pair.homeId === club ? pair.awayId : pair.homeId) : null;', to: 'const other = pair ? (pair.homeId === club ? pair.homeId : pair.awayId) : null;' },
  period: { file: 'src/lib/gmPostseason.ts', from: "return at.phase === 'hub' && at.period === bracketPeriod && at.seasonHasChampion !== true;", to: "return at.phase === 'hub' && at.period >= bracketPeriod && at.seasonHasChampion !== true;" },
  wclabel: { file: 'src/components/front-office/NflBracket.tsx', from: 'NFL_WEEKS[week - 1] ?? String(week)', to: 'NFL_WEEKS[week] ?? String(week)' },
  seedi: { file: 'src/components/front-office/NflBracket.tsx', from: 'return i < 7 ? i + 1 : i - 6;', to: 'return i < 7 ? i + 1 : i - 7;' },
  tellfirst: { file: 'src/lib/frontOfficePostseason.ts', from: '    teams[g.winner].wins -= 1;\n    teams[g.winner === g.home ? g.away : g.home].losses -= 1;\n    const t = nflTell(g, teams, season, tie.round, edges);', to: '    const t = nflTell(g, teams, season, tie.round, edges);\n    teams[g.winner].wins -= 1;\n    teams[g.winner === g.home ? g.away : g.home].losses -= 1;' },
  seedlen: { file: 'src/lib/frontOfficePostseason.ts', from: 'seeds.length !== 14 || new Set(seeds).size !== 14', to: 'seeds.length < 14 || new Set(seeds).size < 14' },
};
const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.log(`MUT ${id}: unknown`); process.exit(2); }
const src = fs.readFileSync(m.file, 'utf8');
if (src.split(m.from).length !== 2) { console.log(`MUT ${id} ABORT: the string is not exactly once in ${m.file}`); process.exit(2); }
fs.writeFileSync(m.file, src.replace(m.from, () => m.to));
console.log(`MUT ${id} applied to ${m.file}`);
