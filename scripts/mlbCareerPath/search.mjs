// Find MLB Stats API person ids for every name; prints candidates with debut and last played date.
import fs from 'node:fs';
import { WORK } from './paths.mjs';
import { ALL } from './players.mjs';
const out = {};
for (const [id, name] of ALL) {
  const q = name.replace('Acuna', 'Acuña').replace('Julio Rodriguez', 'Julio Rodríguez').replace('Pedro Martinez', 'Pedro Martínez');
  const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}&sportIds=1`;
  const r = await fetch(url);
  const j = await r.json();
  const c = (j.people || []).filter((p) => p.mlbDebutDate).map((p) => ({ pid: p.id, full: p.fullName, debut: p.mlbDebutDate, last: p.lastPlayedDate || null, pos: p.primaryPosition?.abbreviation }));
  out[id] = { name, cands: c };
  console.log(id, name, '=>', c.map((x) => `${x.pid}:${x.full}:${x.debut}:${x.pos}`).join(' | '));
}
fs.writeFileSync(new URL('search.json', WORK), JSON.stringify(out, null, 1));
