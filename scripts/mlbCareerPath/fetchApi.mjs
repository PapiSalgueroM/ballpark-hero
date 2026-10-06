// Fetch the MLB Stats API person record for every chosen id into <work>/raw/api_<pid>.json (cached).
import fs from 'node:fs';
import { WORK } from './paths.mjs';
import { ALL } from './players.mjs';
const PICK = { 'bc-008': 118377, 'bc-030': 116615, 'bc-040': 115270, 'bc-049': 114756 };
const search = JSON.parse(fs.readFileSync(new URL('search.json', WORK), 'utf8'));
const ids = {};
for (const [id] of ALL) ids[id] = PICK[id] ?? search[id].cands[0].pid;
fs.writeFileSync(new URL('ids.json', WORK), JSON.stringify(ids, null, 1));
export const apiUrl = (pid) => `https://statsapi.mlb.com/api/v1/people/${pid}?hydrate=awards,draft,xrefId,stats(group=[hitting,pitching,fielding],type=[career,yearByYear])`;
for (const [id, name] of ALL) {
  const pid = ids[id];
  const f = new URL(`raw/api_${pid}.json`, WORK);
  if (fs.existsSync(f)) continue;
  const r = await fetch(apiUrl(pid));
  const t = await r.text();
  fs.writeFileSync(f, t);
  const p = JSON.parse(t).people[0];
  const bb = (p.xrefIds || []).find((x) => x.xrefType === 'bbref');
  console.log(id, name, pid, r.status, t.length, bb ? bb.xrefId : 'NO-BBREF');
}
