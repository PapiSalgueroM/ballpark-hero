// Fetch baseball-reference player pages (cached, paced at one every 4 s, at most MAX per run).
import fs from 'node:fs';
import { WORK } from './paths.mjs';
import { ALL } from './players.mjs';
export const BBREF = {
  'bc-001': 'troutmi01', 'bc-002': 'kershcl01', 'bc-003': 'jeterde01', 'bc-004': 'pujolal01', 'bc-005': 'ohtansh01',
  'bc-006': 'riverma01', 'bc-007': 'bettsmo01', 'bc-008': 'martipe02', 'bc-009': 'suzukic01', 'bc-010': 'judgeaa01',
  'bc-011': 'verlaju01', 'bc-012': 'ortizda01', 'bc-013': 'scherma01', 'bc-014': 'harpebr03', 'bc-015': 'griffke02',
  'bc-016': 'sotoju01', 'bc-017': 'acunaro01', 'bc-018': 'freemfr01', 'bc-019': 'turnetr01', 'bc-020': 'seageco01',
  'bc-021': 'ruthba01', 'bc-022': 'mayswi01', 'bc-023': 'aaronha01', 'bc-024': 'willite01', 'bc-025': 'mantlmi01',
  'bc-026': 'koufasa01', 'bc-027': 'maddugr01', 'bc-030': 'johnsra05', 'bc-031': 'ryanno01', 'bc-033': 'clemero01',
  'bc-034': 'ripkeca01', 'bc-035': 'berrayo01', 'bc-036': 'gehrilo01', 'bc-037': 'robinja02', 'bc-038': 'musiast01',
  'bc-039': 'dimagjo01', 'bc-040': 'gwynnto01', 'bc-041': 'henderi01', 'bc-042': 'jonesch06', 'bc-043': 'cabremi01',
  'bc-044': 'beltrad01', 'bc-045': 'poseybu01', 'bc-046': 'vottojo01', 'bc-047': 'hallaro01', 'bc-048': 'benchjo01',
  'bc-049': 'gibsobo01', 'bc-050': 'altuvjo01', 'bc-051': 'goldspa01', 'bc-052': 'colege01', 'bc-053': 'degroja01',
  'bc-054': 'guerrvl02', 'bc-055': 'lindofr01', 'bc-056': 'machama01', 'bc-057': 'arenano01', 'bc-058': 'alonspe01',
  'bc-059': 'wittbo02', 'bc-060': 'rodriju01', 'bc-061': 'schwaky01', 'bc-062': 'alvaryo01', 'bc-063': 'tatisfe02',
};
export const bbrefUrl = (b) => `https://www.baseball-reference.com/players/${b[0]}/${b}.shtml`;
const MAX = Number(process.env.MAX || 30);
if (process.argv[1] && process.argv[1].endsWith('fetchBbref.mjs')) {
  let n = 0;
  for (const [id, name] of ALL) {
    const b = BBREF[id];
    const f = new URL(`raw/bb_${b}.html`, WORK);
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    const r = await fetch(bbrefUrl(b), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const t = await r.text();
    if (r.status === 200) fs.writeFileSync(f, t);
    const h1 = (t.match(/<h1[^>]*>\s*<span>([^<]+)<\/span>/) || [])[1];
    const debut = (t.match(/<strong>\s*<a[^>]*>Debut<\/a>:?\s*<\/strong>\s*<a[^>]*>([^<]+)<\/a>/) || t.match(/Debut:?<\/a>:?<\/strong>[\s\S]{0,200}?>([A-Z][a-z]+ \d+, \d{4})</) || [])[1];
    console.log(id, name, b, r.status, h1 || '?', debut || '?');
    await new Promise((res) => setTimeout(res, 4000));
  }
}
