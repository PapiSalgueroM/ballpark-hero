// Scratch, not committed: rank players by puzzle weight on the live graph, and diff live vs the pull.
import fs from 'node:fs';
import { buildGraph, distances, expandCompactCareers } from './lib/transferPathHints.mjs';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byId = new Map(snap.players.map(p => [p.id, { name: p.player_name, nationality: p.nationality, position: p.position, career: [] }]));
for (const s of snap.seasons) byId.get(s.player_id).career.push({ season: s.season, club: s.club });
const players = [...byId.values()];
const graph = buildGraph(players);
const weight = new Map(players.map(p => [p.name, { endpoint: 0, onPath: 0 }]));
const cache = new Map();
const dist = n => cache.get(n) ?? cache.set(n, distances(graph, n)).get(n);
for (const z of snap.puzzles) {
  const da = dist(z.player_a), db = dist(z.player_b);
  const d = da.get(z.player_b);
  weight.get(z.player_a).endpoint += 1;
  weight.get(z.player_b).endpoint += 1;
  if (d === undefined) continue;
  for (const [m, x] of da) if (m !== z.player_a && m !== z.player_b && db.has(m) && x + db.get(m) === d) weight.get(m).onPath += 1;
}
const ranked = players.map(p => ({ name: p.name, ...weight.get(p.name), total: weight.get(p.name).endpoint + weight.get(p.name).onPath, seasons: p.career.length }))
  .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
fs.writeFileSync(process.argv[3], JSON.stringify(ranked, null, 1));
ranked.forEach((r, i) => { if (i < 130 || r.total === 0) console.log(`${i + 1}\t${r.name}\t${r.endpoint}\t${r.onPath}\t${r.total}\t${r.seasons}`); });

// live vs pull
const pull = expandCompactCareers(fs.readFileSync('scripts/data/transferPathPull/careers.txt', 'utf8'));
const key = (n, s) => `${n}|${s.club}|${s.season}`;
const liveKeys = new Set(players.flatMap(p => p.career.map(s => key(p.name, s))));
const pullKeys = new Set(pull.flatMap(p => p.career.map(s => key(p.name, s))));
console.log('live not in pull:', [...liveKeys].filter(k => !pullKeys.has(k)));
console.log('pull not in live:', [...pullKeys].filter(k => !liveKeys.has(k)));
