// Scratch, not committed: pick one Wikidata item per career player and pull every P54 statement.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [snapFile, candFile, outFile] = process.argv.slice(2);
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const cands = JSON.parse(fs.readFileSync(candFile, 'utf8'));
/* ambiguous or unresolved names, picked by the famous player's birth date */
const OVERRIDE = {
  'David Silva': 'Q161069', Adriano: 'Q170452', Cafu: 'Q178683', 'Diego Costa': 'Q459707', 'Bruno Fernandes': 'Q4979316',
  Fernandinho: 'Q459356', Ederson: 'Q17074511', 'Frank Lampard': 'Q41533', 'João Félix': 'Q27049064', 'Enzo Fernández': 'Q96105248',
  Marquinhos: 'Q39230', Marcelo: 'Q38136', 'Luis Díaz': 'Q28531111', 'Mohamed Salah': 'Q1354960', 'Luis Suárez': 'Q26517',
  'Patrick Vieira': 'Q46347', 'Nemanja Vidić': 'Q163564', 'Kaká': 'Q203258', Koke: 'Q276091', 'Kylian Mbappé': 'Q21621995',
  'Romário': 'Q178649', 'Roberto Carlos': 'Q429039', Rodri: 'Q20994118', Robinho: 'Q58441', Pedro: 'Q179773',
  'Thiago Silva': 'Q210453', Pepe: 'Q485697', Vitinha: 'Q66818509',
  'Andrew Robertson': 'Q15915040', 'Angel Di María': 'Q251683', 'Arda Güler': 'Q108159340', 'Claude Makélélé': 'Q184362',
  'Cristian Pulisic': 'Q22279773', 'David Beckham': 'Q10520', 'Dusan Vlahović': 'Q23762815', 'Estêvão': 'Q115332579',
  'Jadon Sancho': 'Q30148558', 'Sergio Ramos': 'Q483309',
};
const pick = new Map();
for (const p of snap.players) {
  const name = p.player_name;
  if (OVERRIDE[name]) { pick.set(name, OVERRIDE[name]); continue; }
  const c = [...new Set(cands.filter(x => x.name === name).map(x => x.item))];
  if (c.length === 1) pick.set(name, c[0]);
}
console.log('picked', pick.size, 'of', snap.players.length, 'missing:', snap.players.map(p => p.player_name).filter(n => !pick.has(n)));
function sparql(query) {
  const tmp = outFile + '.rq';
  fs.writeFileSync(tmp, query);
  const body = execFileSync('curl', ['-s', '-m', '120', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', `query@${tmp}`,
    '-H', 'Accept: application/sparql-results+json', '-H', 'User-Agent: DoUKnowBallAudit/1.0 (douknowball1@gmail.com) round709'], { maxBuffer: 1 << 28 }).toString();
  return JSON.parse(body).results.bindings;
}
const items = [...new Set(pick.values())];
const statements = [];
for (let i = 0; i < items.length; i += 50) {
  const chunk = items.slice(i, i + 50);
  const q = `SELECT ?item ?st ?team ?teamLabel ?start ?startPrec ?end ?endPrec ?loan ?national ?youth ?country WHERE {
  VALUES ?item { ${chunk.map(x => 'wd:' + x).join(' ')} }
  ?item p:P54 ?st. ?st ps:P54 ?team.
  OPTIONAL { ?st pqv:P580 ?sv. ?sv wikibase:timeValue ?start; wikibase:timePrecision ?startPrec }
  OPTIONAL { ?st pqv:P582 ?ev. ?ev wikibase:timeValue ?end; wikibase:timePrecision ?endPrec }
  OPTIONAL { ?st pq:P1642 ?loan }
  OPTIONAL { ?team wdt:P31 ?nt. FILTER(?nt IN (wd:Q6979593, wd:Q1194951, wd:Q23847779)) BIND(true AS ?national) }
  OPTIONAL { ?team wdt:P17 ?c. ?c rdfs:label ?country. FILTER(lang(?country) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
  const b = sparql(q);
  for (const x of b) statements.push({
    item: x.item.value.split('/').pop(), st: x.st.value.split('/').pop(), team: x.team.value.split('/').pop(), teamLabel: x.teamLabel?.value,
    start: x.start?.value?.slice(0, 10) ?? null, startPrec: x.startPrec ? Number(x.startPrec.value) : null,
    end: x.end?.value?.slice(0, 10) ?? null, endPrec: x.endPrec ? Number(x.endPrec.value) : null,
    loan: x.loan ? x.loan.value.split('/').pop() : null, national: !!x.national, country: x.country?.value ?? null,
  });
  console.log(`chunk ${i}: ${b.length} statement rows`);
}
fs.writeFileSync(outFile, JSON.stringify({ retrieved: new Date().toISOString(), picks: Object.fromEntries(pick), statements }, null, 1));
