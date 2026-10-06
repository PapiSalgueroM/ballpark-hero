// Compare the two sources fact by fact; print one compact block per player, disagreements marked !!
import fs from 'node:fs';
import { WORK } from './paths.mjs';
const F = JSON.parse(fs.readFileSync(new URL('facts.json', WORK), 'utf8'));
const MON = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
export function bbDate(s) { const m = s.match(/([A-Z][a-z]+) (\d+), (\d{4})/); return m ? `${m[3]}-${String(MON[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; }
export function blingCount(bling, re) {
  for (const raw of bling) { const t = raw.replace(/^.*">/, ''); const m = t.match(new RegExp(`^(?:(\\d+)x |\\d{4} )?${re}$`)); if (m) return m[1] ? Number(m[1]) : 1; }
  return 0;
}
export const BLING = { mvp: 'MVP', cy: 'Cy Young', roy: 'Rookie of the Year', allStar: 'All-Star', goldGlove: 'Gold Glove', silverSlugger: 'Silver Slugger', ws: 'World Series', wsMvp: 'WS MVP', hof: 'Hall of Fame', asMvp: 'AS MVP' };
export function bbDrafts(s) { return [...s.matchAll(/(?:Drafted by|and) the ([A-Z][\w .]+?) in the (\d+)\w\w round(?: \((\d+)\w\w\))? of the (\d{4})/g)].map((m) => ({ team: m[1], round: m[2], pick: m[3] ? Number(m[3]) : null, year: m[4], unsigned: false })); }
const only = process.argv[2];
const MAIN = process.argv[1] && process.argv[1].endsWith('compare.mjs');
for (const [id, { name, api: a, bb: b }] of MAIN ? Object.entries(F) : []) {
  if (only && !only.split(',').includes(id)) continue;
  const L = [];
  const bad = (cond, msg) => L.push((cond ? '   ' : '!! ') + msg);
  bad(b.name.replace(/[íé]/g, (c) => ({ í: 'i', é: 'e' })[c]).includes(name.replace(' Jr.', '').split(' ').pop()) || name === 'Hank Aaron', `name api=${a.full} bb=${b.name}`);
  bad(bbDate(b.debut) === a.debut, `debut api=${a.debut} bb=${b.debut}`);
  const bd = bbDrafts(b.draft);
  bad(JSON.stringify(a.drafts.map((d) => [d.year, d.round])) === JSON.stringify(bd.map((d) => [d.year, d.round])), `drafts api=${JSON.stringify(a.drafts.map((d) => [d.year, d.round, d.pick, d.team, d.signed]))} bb=${JSON.stringify(bd.map((d) => [d.year, d.round, d.pick, d.team, d.unsigned]))}`);
  if (a.hit && b.hit && (Number(a.hit.g) > 300)) bad(a.hit.avg === b.hit.avg && String(a.hit.hr) === b.hit.hr && String(a.hit.rbi) === b.hit.rbi && String(a.hit.h) === b.hit.h && String(a.hit.sb) === b.hit.sb, `hit api=${JSON.stringify(a.hit)} bb=${JSON.stringify(b.hit)}`);
  if (a.pit && b.pit && Number(a.pit.g) > 50) bad(String(a.pit.w) === b.pit.w && a.pit.era === b.pit.era && String(a.pit.so) === b.pit.so && String(a.pit.sv) === b.pit.sv, `pit api=${JSON.stringify(a.pit)} bb=${JSON.stringify(b.pit)}`);
  const ay = [...new Set(a.seasons.map((s) => s[0]))]; const by = [...new Set(b.seasons.map((s) => s[0]))];
  bad(JSON.stringify(ay) === JSON.stringify(by) && a.seasons.length === b.seasons.length, `seasons api=${a.seasons.length}/${ay.length}y bb=${b.seasons.length}/${by.length}y`);
  const seqA = []; for (const s of a.seasons) if (seqA[seqA.length - 1] !== s[1]) seqA.push(s[1]);
  const seqB = []; for (const s of b.seasons) if (seqB[seqB.length - 1] !== s[1]) seqB.push(s[1]);
  L.push(`   teams api=${seqA.join(' > ')} | bb=${seqB.join('>')}`);
  const aw = [];
  for (const [k, re] of Object.entries(BLING)) { const an = a.awards[k].n; const bn = blingCount(b.bling, re); if (an || bn) aw.push(`${an === bn ? '' : '!!'}${k}=${an}/${bn}${a.awards[k].years.length && ['mvp', 'cy', 'roy', 'ws', 'wsMvp', 'hof'].includes(k) ? '(' + a.awards[k].years.join(',') + ')' : ''}`); }
  L.push('   awards ' + aw.join(' '));
  L.push(`   pos api=${a.pos} fld=${JSON.stringify(a.fielding)} bb=${b.positions} active=${a.active} last=${a.last}`);
  console.log(`${id} ${name}`); for (const l of L) console.log(l.slice(0, 400));
}
