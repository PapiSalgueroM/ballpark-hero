// Scratch, not committed: resolve career player names to Wikidata footballer items (label or alias, English).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outFile = process.argv[3];
const names = snap.players.map(p => p.player_name);
const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
function sparql(query) {
  const tmp = outFile + '.rq';
  fs.writeFileSync(tmp, query);
  const body = execFileSync('curl', ['-s', '-m', '90', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', `query@${tmp}`,
    '-H', 'Accept: application/sparql-results+json', '-H', 'User-Agent: DoUKnowBallAudit/1.0 (douknowball1@gmail.com) round709'], { maxBuffer: 1 << 28 }).toString();
  return JSON.parse(body).results.bindings;
}
const rows = [];
for (let i = 0; i < names.length; i += 60) {
  const chunk = names.slice(i, i + 60);
  const q = `SELECT ?name ?item ?itemLabel ?birth ?teams WHERE {
  VALUES ?name { ${chunk.map(n => `"${esc(n)}"@en`).join(' ')} }
  { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
  ?item wdt:P106 wd:Q937857.
  OPTIONAL { ?item wdt:P569 ?birth }
  { SELECT ?item (COUNT(?t) AS ?teams) WHERE { ?item wdt:P54 ?t } GROUP BY ?item }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
  const b = sparql(q);
  for (const x of b) rows.push({ name: x.name.value, item: x.item.value.split('/').pop(), label: x.itemLabel?.value, birth: x.birth?.value?.slice(0, 10), teams: Number(x.teams?.value ?? 0) });
  console.log(`chunk ${i}: ${b.length} candidate rows`);
}
fs.writeFileSync(outFile, JSON.stringify(rows, null, 1));
const found = new Set(rows.map(r => r.name));
console.log('unresolved:', names.filter(n => !found.has(n)));
