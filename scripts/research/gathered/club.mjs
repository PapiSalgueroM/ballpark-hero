// Round 1052 research tooling: one club, three lists. Transfermarkt's 26/27 squad list is the spine (the
// shipped spelling, the detailed position and the value are its), and a man ships only when a second
// independent list (ESPN's roster feed or FotMob's squad) carries him too, matched by birth date.
import fs from 'node:fs';
import path from 'node:path';
const L = globalThis.__lib;
const { sim, parseTm, parseEspn, ageOn, LEAGUE, READ, TM, ESPN, natTm } = L;
const FOTMOB = 'fotmob.com';
const FOT_GROUP = { keepers: 'GK', defenders: 'DEF', midfielders: 'MID', attackers: 'FWD' };

function parseFotmob(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = [];
  for (const g of (j.squad.squad || [])) {
    const group = FOT_GROUP[g.title]; if (!group) continue;
    for (const m of g.members) rows.push({ id: m.id, name: m.name, number: Number.isInteger(m.shirtNumber) ? m.shirtNumber : null, group, groupText: g.title, birthDate: m.dateOfBirth || null, nationality: m.cname || null });
  }
  if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error(file + ': an id twice in the squad');
  return { team: j.details.name, season: j.details.latestSeason, url: j.url, read: j.read.slice(0, 10), rows };
}

const fetchLog = fs.readFileSync(path.join(LEAGUE.raw, '_fetchlog.txt'), 'utf8').split('\n');
function logOf(slug) {
  const lines = fetchLog.filter(l => l.includes(' ' + slug + ' espn['));
  const first = (host) => lines.find(l => new RegExp(host + '\\[200 ').test(l));
  const e = first('espn'); const t = first('tm');
  return {
    espnUrl: e.match(/espn\[[^\]]*\] (\S+)/)[1], espnRead: e.slice(0, 10),
    tmUrl: t.match(/tm\[[^\]]*\] (\S+)/)[1], tmRead: t.slice(0, 10),
  };
}

/** The other list's row for this Transfermarkt man: same birth date with the shirt number or the spelling
 *  as a second witness; failing that, the same shirt and spelling, or a near identical spelling. */
function findIn(t, rows, used) {
  const free = rows.filter(r => !used.has(r.id));
  const score = r => ({ r, num: t.number != null && t.number === r.number, s: sim(t.name, r.name) });
  const byDate = free.filter(r => r.birthDate && r.birthDate === t.birthDate).map(score).sort((a, b) => (b.num - a.num) || (b.s - a.s));
  if (byDate.length && (byDate[0].num || byDate[0].s >= 0.3)) return { row: byDate[0].r, dateAgrees: true, by: byDate[0].num ? 'birth date and shirt number' : 'birth date' };
  const byName = free.map(score).filter(x => (x.num && x.s >= 0.45) || x.s >= 0.8).sort((a, b) => b.s - a.s);
  if (byName.length) return { row: byName[0].r, dateAgrees: false, by: 'shirt number and spelling' };
  return null;
}

const idsOf = (t, me, mf) => ({ tm: t.id, ...(me ? { espn: me.row.id } : {}), ...(mf ? { fotmob: mf.row.id } : {}) });

L.buildClub = function buildClub(c) {
  const tm = parseTm(path.join(LEAGUE.raw, `tm-${c.slug}.html`));
  const es = parseEspn(path.join(LEAGUE.raw, `espn-${c.slug}.json`));
  const fo = parseFotmob(path.join(LEAGUE.raw, `fotmob-${c.slug}.json`));
  const log = logOf(c.slug);
  const usedE = new Set(); const usedF = new Set(); const rows = []; const leftOut = [];
  for (const t of tm.rows) {
    const me = findIn(t, es.rows, usedE); if (me) usedE.add(me.row.id);
    const mf = findIn(t, fo.rows, usedF); if (mf) usedF.add(mf.row.id);
    const seen = [TM, ...(me ? [ESPN] : []), ...(mf ? [FOTMOB] : [])];
    if (seen.length < 2) { leftOut.push({ name: t.name, seenOn: [TM], ids: { tm: t.id }, reason: 'one source only', proof: `in ${TM}'s ${LEAGUE.season} squad list (id ${t.id}, born ${t.birthDate}); not on ${ESPN}'s roster and not in ${FOTMOB}'s squad` }); continue; }
    const dateHosts = [TM, ...(me?.dateAgrees ? [ESPN] : []), ...(mf?.dateAgrees ? [FOTMOB] : [])];
    if (!t.birthDate || dateHosts.length < 2) {
      leftOut.push({ name: t.name, seenOn: seen, ids: idsOf(t, me, mf), reason: 'age on one host', proof: `birth date: ${TM} ${t.birthDate ?? 'none'}${me ? `, ${ESPN} ${me.row.birthDate ?? 'none'} (as ${me.row.name})` : ''}${mf ? `, ${FOTMOB} ${mf.row.birthDate ?? 'none'} (as ${mf.row.name})` : ''}` });
      continue;
    }
    const votes = [[TM, t.group], ...(me ? [[ESPN, me.row.group]] : []), ...(mf ? [[FOTMOB, mf.row.group]] : [])].filter(v => v[1]);
    const tally = {}; for (const [h, g] of votes) (tally[g] = tally[g] || []).push(h);
    const agreed = Object.entries(tally).filter(([, hs]) => hs.length >= 2).sort((a, b) => b[1].length - a[1].length)[0];
    const groupText = `${TM}: ${t.groupText} (${t.tmPosition})${me ? `; ${ESPN}: ${me.row.groupText}` : ''}${mf ? `; ${FOTMOB}: ${mf.row.groupText}` : ''}`;
    if (!agreed) { leftOut.push({ name: t.name, seenOn: seen, ids: idsOf(t, me, mf), reason: 'no position group agreed', proof: groupText }); continue; }
    const natVotes = [...(me && natTm(me.row.nationality) === t.nationality ? [ESPN] : []), ...(mf && natTm(mf.row.nationality) === t.nationality ? [FOTMOB] : [])];
    const natOk = t.nationality && natVotes.length >= 1;
    const age = ageOn(t.birthDate, READ);
    const notes = [];
    if (agreed[0] !== t.group) notes.push(`group by two hosts against the third: ${groupText}`);
    else if (agreed[1].length < votes.length) notes.push(`one host differs on the group: ${groupText}`);
    if (!natOk) notes.push(`first nationality not agreed: ${TM} ${t.nationality ?? 'none'}${me ? `, ${ESPN} ${me.row.nationality ?? 'none'}` : ''}${mf ? `, ${FOTMOB} ${mf.row.nationality ?? 'none'}` : ''}`);
    if (t.agePrinted !== age) notes.push(`${TM} prints age ${t.agePrinted}`);
    for (const m of t.marks) notes.push(`${TM}: ${m}`);
    const alias = [...new Set([me?.row.name, mf?.row.name].filter(n => n && n !== t.name))];
    rows.push({
      name: t.name, alias, group: agreed[0], groupHosts: agreed[1], tmPosition: t.tmPosition, birthDate: t.birthDate, age, ageHosts: dateHosts,
      nationality: natOk ? t.nationality : null, nationalityHosts: natOk ? [TM, ...natVotes] : [],
      valueEur: t.valueEur, hosts: seen, ids: idsOf(t, me, mf), notes: notes.join('; '),
    });
  }
  /* men the spine does not carry: never shipped, listed with where they were seen */
  const restE = es.rows.filter(r => !usedE.has(r.id)); const restF = fo.rows.filter(r => !usedF.has(r.id)); const pairedF = new Set();
  for (const e of restE) {
    const f = restF.find(x => !pairedF.has(x.id) && ((x.birthDate && x.birthDate === e.birthDate) || sim(x.name, e.name) >= 0.8));
    if (f) { pairedF.add(f.id); leftOut.push({ name: e.name, seenOn: [ESPN, FOTMOB], ids: { espn: e.id, fotmob: f.id }, reason: 'not on the squad list the name and value come from', proof: `on ${ESPN}'s roster (id ${e.id}, born ${e.birthDate ?? 'no date'}) and in ${FOTMOB}'s squad (as ${f.name}), not in ${TM}'s ${LEAGUE.season} squad list on ${log.tmRead}` }); }
    else leftOut.push({ name: e.name, seenOn: [ESPN], ids: { espn: e.id }, reason: 'one source only', proof: `on ${ESPN}'s ${es.season} roster (id ${e.id}${e.birthDate ? ', born ' + e.birthDate : ', no birth date'}) only` });
  }
  for (const f of restF.filter(x => !pairedF.has(x.id))) leftOut.push({ name: f.name, seenOn: [FOTMOB], ids: { fotmob: f.id }, reason: 'one source only', proof: `in ${FOTMOB}'s squad (id ${f.id}${f.birthDate ? ', born ' + f.birthDate : ''}) only` });
  return { c, tm, es, fo, log, rows, leftOut };
};
L.FOTMOB = FOTMOB;
