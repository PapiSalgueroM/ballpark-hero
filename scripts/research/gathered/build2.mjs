// Round 1052 research tooling, second half: rules 8, 9 and 10, then the file.
import fs from 'node:fs';
import path from 'node:path';
const { fold, baked, aleague, freeAgents, nowNat, foldedIndex, LEAGUE, CLUBS, FACTS, READ, TM, ESPN, FOTMOB, buildClub } = globalThis.__ctx;

const shippedExact = new Map();   // name -> club slug, inside the round
const shippedFold = new Map();    // folded name -> { name, slug, birthDate }
const clubsOut = [];
const diag = { natDisagree: new Map(), groupOut: 0, oneSource: 0, ageOne: 0, already: [], foldedNamesakes: [], tmSeasons: new Set(), espnSeasons: new Set() };

for (const c of CLUBS) {
  if (!fs.existsSync(path.join(LEAGUE.raw, `tm-${c.slug}.html`)) || !fs.existsSync(path.join(LEAGUE.raw, `espn-${c.slug}.json`)) || !fs.existsSync(path.join(LEAGUE.raw, `fotmob-${c.slug}.json`))) { console.log(`SKIP ${c.slug}: not read yet`); continue; }
  const b = buildClub(c);
  diag.tmSeasons.add(b.tm.season); diag.espnSeasons.add(b.es.season); diag.fotSeasons = diag.fotSeasons || new Set(); diag.fotSeasons.add(b.fo.season);
  const rows = []; const leftOut = [...b.leftOut];
  for (const r of b.rows) {
    const f = fold(r.name);
    const out = (reason, proof) => { leftOut.push({ name: r.name, seenOn: r.hosts, ids: r.ids, reason, proof }); };
    const GROUP_OF = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD' };
    const POS = { 'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB', 'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM', 'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW', 'Centre-Forward': 'ST', 'Second Striker': 'CF' };
    /* the baked files print an age and a position, never a birth date: the verdict is by those two */
    const sameMan0 = (a, p) => Math.abs(r.age - a) <= 1 && (GROUP_OF[p] === r.group || GROUP_OF[p] === GROUP_OF[POS[r.tmPosition]]);
    const sameMan = () => { throw new Error('use sameMan0'); };
    if (baked.has(r.name)) {
      const at = baked.get(r.name);
      const x = at[0];
      out(`also baked at ${at.map(y => y.club).join(', ')}`, `${sameMan0(x.a, x.p) ? 'same man' : 'namesake'}: the baked row is ${x.p}, age ${x.a}; this man is ${r.tmPosition}, born ${r.birthDate} (age ${r.age} on ${READ})`);
      diag.already.push(`${r.name} | ${c.engine} | baked ${at.map(y => y.club).join(', ')} | ${sameMan0(x.a, x.p) ? 'same man' : 'NAMESAKE'} | baked ${x.p} ${x.a}, here ${r.tmPosition} ${r.birthDate} (${r.age})`);
      continue;
    }
    if (aleague.has(r.name)) { const x = aleague.get(r.name)[0]; out(`also baked at ${x.club}`, `${sameMan0(x.a, x.p) ? 'same man' : 'namesake'}: the A-League row is ${x.p}, age ${x.a}; this man was born ${r.birthDate} (age ${r.age})`); diag.already.push(`${r.name} | ${c.engine} | A-League ${x.club}`); continue; }
    if (freeAgents.has(r.name)) { const x = freeAgents.get(r.name); out('in the free agent pool', `${sameMan0(x.a, x.p) ? 'same man' : 'namesake'}: the free agent row is ${x.p}, age ${x.a}; this man was born ${r.birthDate} (age ${r.age})`); diag.already.push(`${r.name} | ${c.engine} | free agent pool`); continue; }
    const hits = (foldedIndex.get(f) || []).filter(h => h.n !== r.name);
    if (hits.length) {
      const h = hits[0];
      if (sameMan0(h.where.a, h.where.p)) { out(h.where.file === 'freeAgents' ? 'in the free agent pool' : `also baked at ${h.where.club}`, `same man under another spelling ("${h.n}"): that row is ${h.where.p}, age ${h.where.a}; this man is ${r.tmPosition}, born ${r.birthDate} (age ${r.age} on ${READ})`); diag.already.push(`${r.name} | ${c.engine} | folded same man as "${h.n}" at ${h.where.club}`); continue; }
      r.notes = [r.notes, `namesake by fold of "${h.n}" (${h.where.club ?? 'free agent pool'}, ${h.where.p}, age ${h.where.a}); this man was born ${r.birthDate}, age ${r.age}`].filter(Boolean).join('; ');
      r.foldedNamesake = { of: h.n, at: h.where.club ?? 'free agent pool', theirAge: h.where.a, verdict: 'namesake' };
      diag.foldedNamesakes.push(`${r.name} | ${c.engine} | vs "${h.n}" at ${h.where.club} (age ${h.where.a} vs ${r.age})`);
    }
    if (nowNat.has(r.name) && nowNat.get(r.name) !== r.nationality) {
      out('namesake in the nationality map', `the modern map holds this name as ${nowNat.get(r.name)}; the two hosts here ${r.nationality ? 'agree on ' + r.nationality : 'did not agree on a nationality'}, so the flag the game would show is not proven his`);
      diag.already.push(`${r.name} | ${c.engine} | nationality map says ${nowNat.get(r.name)}, here ${r.nationality}`);
      continue;
    }
    if (shippedExact.has(r.name)) { out('namesake inside the round', `the name already ships at ${shippedExact.get(r.name)} in this round`); continue; }
    if (shippedFold.has(f)) { const o = shippedFold.get(f); out('namesake inside the round', `folds to the same name as "${o.name}" at ${o.slug} (born ${o.birthDate}); this man was born ${r.birthDate}`); continue; }
    shippedExact.set(r.name, c.slug); shippedFold.set(f, { name: r.name, slug: c.slug, birthDate: r.birthDate });
    rows.push(r);
  }
  for (const l of leftOut) { if (l.reason === 'one source only') diag.oneSource++; if (l.reason === 'no position group agreed') diag.groupOut++; if (l.reason === 'age on one host') diag.ageOne++; }
  for (const r of rows) if (!r.nationality) { const m = r.notes.match(/first nationality not agreed: [^;]*/); const k = m ? m[0].replace('first nationality not agreed: ', '') : '?'; diag.natDisagree.set(k, (diag.natDisagree.get(k) || 0) + 1); }
  rows.sort((a, b) => (b.valueEur ?? -1) - (a.valueEur ?? -1) || a.name.localeCompare(b.name));
  const noValue = rows.filter(r => !(r.valueEur > 0)).length;
  const partial = rows.length < 8 || noValue * 2 > rows.length;
  const html = fs.readFileSync(path.join(LEAGUE.raw, `tm-${c.slug}.html`), 'utf8');
  const tmName = ((html.match(/<title>([^<]*?) - Detailed squad/) || [])[1] || '').trim() || null;
  clubsOut.push({
    slug: c.slug, engine: c.engine, zone: c.zone, names: { espn: b.es.team, tm: tmName }, ids: { espn: c.espn, tm: c.tm[1] },
    ownSite: c.ownSite || FACTS.ownSiteDefault,
    sources: [
      { host: TM, kind: 'squad list ' + b.tm.season + ', detailed view', url: b.log.tmUrl, read: b.log.tmRead, seasonOnPage: b.tm.season, listed: b.tm.printed },
      { host: ESPN, kind: 'roster feed', url: b.log.espnUrl, read: b.log.espnRead, seasonOnPage: b.es.season, listed: b.es.rows.length },
      { host: FOTMOB, kind: 'squad page', url: b.fo.url, read: b.fo.read, seasonOnPage: b.fo.season, listed: b.fo.rows.length },
    ],
    valueSource: { host: TM, url: b.log.tmUrl, read: b.log.tmRead },
    colours: { [ESPN]: b.es.colour, shipped: null, why: 'one host only; a colour ships only where two hosts agree (the Round 1035 rule)' },
    partial, counts: { tmListed: b.tm.printed, espnListed: b.es.rows.length, fotmobListed: b.fo.rows.length, rows: rows.length, noValue, leftOut: leftOut.length },
    rows, leftOut,
  });
}

/* ---------- the file: league facts first, then one club after another, a row a line ---------- */
const head = { league: FACTS.league, season: FACTS.season, round: 1052, read: READ, method: FACTS.method, membership: FACTS.membership, facts: FACTS.facts };
let text = JSON.stringify(head, null, 2).replace(/\n}$/, ',\n  "clubs": [\n');
text += clubsOut.map(c => {
  const { rows, leftOut, ...rest } = c;
  let s = '    ' + JSON.stringify(rest).replace(/}$/, ',');
  s += '\n      "rows": [\n' + rows.map(r => '        ' + JSON.stringify(r)).join(',\n') + '\n      ],';
  s += '\n      "leftOut": [\n' + leftOut.map(r => '        ' + JSON.stringify(r)).join(',\n') + '\n      ]\n    }';
  return s;
}).join(',\n') + '\n  ]\n}\n';
JSON.parse(text);
if (/[\u2013\u2014]/.test(text)) throw new Error('a dash that is not a hyphen is in the research text');
fs.writeFileSync(LEAGUE.out, text);

/* ---------- what a person should read before trusting it ---------- */
let total = 0; let totalNoValue = 0; let noNat = 0;
for (const c of clubsOut) {
  total += c.rows.length; totalNoValue += c.counts.noValue; noNat += c.rows.filter(r => !r.nationality).length;
  const g = k => c.rows.filter(r => r.group === k).length;
  const by = {}; for (const l of c.leftOut) by[l.reason.replace(/^also baked at .*/, 'also baked')] = (by[l.reason.replace(/^also baked at .*/, 'also baked')] || 0) + 1;
  console.log(`${c.engine.padEnd(20)} tm ${String(c.counts.tmListed).padStart(2)} espn ${String(c.counts.espnListed).padStart(2)} fot ${String(c.counts.fotmobListed).padStart(2)} ships ${String(c.rows.length).padStart(2)} (GK ${g('GK')} DEF ${g('DEF')} MID ${g('MID')} FWD ${g('FWD')}) noValue ${c.counts.noValue}${c.partial ? ' PARTIAL' : ''} | out ${JSON.stringify(by)}`);
}
console.log(`TOTAL ${clubsOut.length} clubs, ${total} men ship, ${totalNoValue} with no value, ${noNat} with no nationality; seasons on the pages: tm ${[...diag.tmSeasons]}, espn ${[...diag.espnSeasons]}, fotmob ${[...diag.fotSeasons]}`);
console.log('nationality not agreed (ships with no flag):'); for (const [k, v] of [...diag.natDisagree].sort((a, b) => b[1] - a[1])) console.log(`  ${v} x ${k}`);
console.log('already in the game:'); for (const a of diag.already) console.log('  ' + a);
console.log('folded namesakes that ship:'); for (const a of diag.foldedNamesakes) console.log('  ' + a);
console.log('wrote ' + LEAGUE.out);
