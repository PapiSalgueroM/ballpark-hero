#!/usr/bin/env node
/*
 * simNflCareerPathFacts: NFL Career Path's 78 clue rows are pinned to a verified record (Round 922).
 *
 * WHY
 *   src/data/nflCareerPlayers.ts held a typed fact for every player with no source behind it, and
 *   several were false or stale on 2026-10-02: Steve Young "6 NFL rushing TDs in a Super Bowl" (it was
 *   six touchdown passes), Jaxon Smith-Njigba "1,000+ receiving yards in rookie season" and #1 (he
 *   wears 11), Ed Reed "9 interception return TDs, all-time record" (7), Randy Moss "156 receiving TDs,
 *   all-time record" (Jerry Rice has 197) with his clubs out of order, Matthew Stafford with a Seattle
 *   stint he never had, and every active player whose club changed after the list was typed.
 *   Round 922 re-read every row on 2026-10-03 into scripts/data/nflCareerPathVerified2026-10.json
 *   (each fact with two or more hosts, the value each showed, the read date) and rewrote the rows from it.
 *
 * WHAT IT CHECKS (reads files only: no network, no database)
 *   1. Order and length: the shipped file and the record carry the same 78 names in the same order.
 *      The daily pick is date mod length (src/hooks/useNFLCareer.ts), so a removed or moved row
 *      changes which player a day deals.
 *   2. Every shipped field (draft round and year, college, first team, career stat, teams, jersey)
 *      equals the record.
 *   3. The record holds up: every fact has sources on two or more different hosts, each with an
 *      https url, a read date and what it showed. Facts too thin for two hosts are listed under
 *      "thin" with a reason, and that list is a ratchet: it may shrink, never grow (baseline 1,
 *      Reggie White's 1984 supplemental draft, which only the nflverse players table shows).
 *   4. The career stat text says what its sources say: the number in the text (and its "+") must
 *      satisfy every source value the record kept, so "250+ TD passes" fails if the sources show 240.
 *   5. Shape: first team is the first club of the path, every club name is a real NFL club name in
 *      some era, jersey numbers are a clean comma list with no repeats, no em or en dash anywhere.
 *   6. Active players: every row whose Pro Football Reference id is in the committed 2026 roster
 *      file (scripts/data/nflRosters2026.json, week 4, read only) must end its path at that club,
 *      and the record's roster note must match the file. Measured 2026-10-03: 37 of 78 rows join.
 *      The floor is 30, so a join that silently matches nothing cannot pass.
 *   7. Controls, run every time: each control plants one defect in an in-memory copy and the
 *      section it targets must go red. A control whose target string is missing refuses to run.
 *   8. The rules card examples on the page (src/pages/NFLCareer.tsx) are clues too: each one names a
 *      player in the record and must show his draft round, college, clubs and career stat as the
 *      record has them. They used to say things no row said (Travis Kelce "All-time TE receiving
 *      leader", Justin Jefferson "3x Pro Bowl").
 *
 * NEGATIVE CONTROLS (also runnable alone: SIM_NFLCP_CONTROL=<name>, the run must then exit 1)
 *   seattle    puts Seattle back on Matthew Stafford's path                 sections 2, 6
 *   jersey     gives Jaxon Smith-Njigba #1 again                             section 2
 *   claim      "250+ TD passes" becomes "300+" in both file and record      section 4
 *   onesource  strips a fact down to one host in the record                section 3
 *   roster     moves Aaron Rodgers to the Jets in the roster file copy      section 6
 *   order      swaps the first two rows                                     section 1
 *   thin       adds a second thin fact to the record                       section 3
 *   example    puts "7x Super Bowl Champion" back on the Tom Brady example     section 8
 *
 *   node scripts/simNflCareerPathFacts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src/data/nflCareerPlayers.ts');
const RECORD = path.join(ROOT, 'scripts/data/nflCareerPathVerified2026-10.json');
const ROSTER = path.join(ROOT, 'scripts/data/nflRosters2026.json');
const PAGE = path.join(ROOT, 'src/pages/NFLCareer.tsx');
const THIN_BASELINE = 1;
const JOIN_FLOOR = 30;

// Read the code, not the comments: drop block and line comments before matching rows.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
}
export function parseRows(src) {
  const rows = [];
  for (const m of stripComments(src).matchAll(/^\s*(\{ name: .*\}),?\s*$/gm)) {
    const json = m[1].replace(/([{,]\s*)([A-Za-z]+):/g, '$1"$2":');
    rows.push(JSON.parse(json));
  }
  return rows;
}

const CLUBS = {
  ARI: ['Arizona Cardinals'], ATL: ['Atlanta Falcons'], BAL: ['Baltimore Ravens'], BUF: ['Buffalo Bills'],
  CAR: ['Carolina Panthers'], CHI: ['Chicago Bears'], CIN: ['Cincinnati Bengals'], CLE: ['Cleveland Browns'],
  DAL: ['Dallas Cowboys'], DEN: ['Denver Broncos'], DET: ['Detroit Lions'], GB: ['Green Bay Packers'],
  HOU: ['Houston Texans'], IND: ['Indianapolis Colts'], JAX: ['Jacksonville Jaguars'], KC: ['Kansas City Chiefs'],
  LV: ['Las Vegas Raiders', 'Oakland Raiders'], LAC: ['Los Angeles Chargers', 'San Diego Chargers'],
  LA: ['Los Angeles Rams', 'St. Louis Rams'], MIA: ['Miami Dolphins'], MIN: ['Minnesota Vikings'],
  NE: ['New England Patriots'], NO: ['New Orleans Saints'], NYG: ['New York Giants'], NYJ: ['New York Jets'],
  PHI: ['Philadelphia Eagles'], PIT: ['Pittsburgh Steelers'], SF: ['San Francisco 49ers'], SEA: ['Seattle Seahawks'],
  TB: ['Tampa Bay Buccaneers'], TEN: ['Tennessee Titans'], WAS: ['Washington', 'Washington Commanders'],
};
const CLUB_OF = new Map(Object.entries(CLUBS).flatMap(([k, names]) => names.map(n => [n, k])));
const FIELDS = ['draftRound', 'draftYear', 'college', 'firstTeam', 'careerStat', 'teams', 'jerseyNumbers'];
const num = s => parseFloat(String(s).replace(/,/g, ''));

export function check({ rows, record, roster, page }) {
  const fail = []; const bad = (sec, msg) => fail.push({ sec, msg });
  const rec = record.rows;
  // 1. order and length
  if (rows.length !== rec.length) bad(1, `the file has ${rows.length} rows, the record ${rec.length}`);
  for (let i = 0; i < Math.min(rows.length, rec.length); i++) if (rows[i].name !== rec[i].name) bad(1, `row ${i}: file ${rows[i].name}, record ${rec[i].name}`);
  // 2. every field equals the record
  for (let i = 0; i < Math.min(rows.length, rec.length); i++) {
    for (const k of FIELDS) {
      const a = JSON.stringify(rows[i][k]); const b = JSON.stringify(rec[i][k] && rec[i][k].value);
      if (a !== b) bad(2, `${rows[i].name} ${k}: file ${a}, record ${b}`);
    }
  }
  // 3. the record holds up
  let thinCount = 0;
  for (const r of rec) {
    const thinFields = new Set((r.thin || []).map(t => t.field));
    for (const t of r.thin || []) { thinCount++; if (!t.why || t.why.length < 40) bad(3, `${r.name} thin ${t.field} has no reason`); }
    for (const k of FIELDS) {
      const f = r[k];
      if (!f || !Array.isArray(f.sources)) { bad(3, `${r.name} ${k} has no sources`); continue; }
      for (const s of f.sources) if (!/^https:\/\//.test(s.url || '') || !/^\d{4}-\d\d-\d\d$/.test(s.read || '') || !s.saw) bad(3, `${r.name} ${k}: a source lacks url, read date or what it showed`);
      const hosts = new Set(f.sources.map(s => s.host));
      const isThin = (k === 'draftRound' || k === 'draftYear') && thinFields.has('draft');
      if (!isThin && hosts.size < 2) bad(3, `${r.name} ${k} rests on ${hosts.size} host(s): ${[...hosts].join(', ')}`);
    }
  }
  if (thinCount > THIN_BASELINE) bad(3, `${thinCount} thin facts, the baseline is ${THIN_BASELINE} (it may shrink, never grow)`);
  // 4. the career stat text says what its sources say
  for (const r of rec) {
    const text = r.careerStat.value; const claim = r.careerStat.claim || {};
    const parts = claim.kind === 'multi' ? claim.parts : [claim];
    for (const p of parts) {
      if (p.kind === 'total' || p.kind === 'season') {
        // "250+" and "a 2,000-yard season" are floors; a bare number is exact
        const nums = (text.match(/\d[\d,]*(?:\.\d+)?(?:\+|-yard)?/g) || []).map(t => ({ n: num(t), plus: /(\+|-yard)$/.test(t) }));
        const hit = nums.find(x => x.n === p.n);
        if (!hit) { bad(4, `${r.name}: "${text}" does not carry the claimed ${p.n}`); continue; }
        if ((p.op === '>=') !== hit.plus) bad(4, `${r.name}: "${text}" and claim ${p.op} ${p.n} disagree on the plus`);
        const label = p.kind === 'total' ? `career ${p.stat} ` : `${p.year} ${p.stat} `;
        const seen = r.careerStat.sources.filter(s => s.saw.startsWith(label)).map(s => num(s.saw.slice(label.length)));
        if (new Set(r.careerStat.sources.filter(s => s.saw.startsWith(label)).map(s => s.host)).size < 2) bad(4, `${r.name}: fewer than two hosts show ${label.trim()}`);
        for (const v of seen) if (p.op === '>=' ? !(v >= p.n) : Math.abs(v - p.n) > 1e-9) bad(4, `${r.name}: "${text}" but a source shows ${label}${v}`);
      } else if (p.kind === 'allpro' || p.kind === 'probowl') {
        if (!text.includes(`${p.n}x`)) bad(4, `${r.name}: "${text}" does not say ${p.n}x`);
      } else if (p.kind === 'lastpick') {
        if (!/last pick/.test(text) || !text.includes(String(p.year))) bad(4, `${r.name}: "${text}" does not say last pick of ${p.year}`);
      } else bad(4, `${r.name}: unknown claim kind ${p.kind}`);
    }
  }
  // 5. shape
  for (const r of rows) {
    if (!Array.isArray(r.teams) || !r.teams.length) { bad(5, `${r.name} has no teams`); continue; }
    if (r.firstTeam !== r.teams[0]) bad(5, `${r.name}: first team ${r.firstTeam} is not the first club of the path ${r.teams[0]}`);
    for (const t of r.teams) if (!CLUB_OF.has(t)) bad(5, `${r.name}: "${t}" is not an NFL club name`);
    const js = String(r.jerseyNumbers).split(', ');
    if (!js.every(j => /^\d{1,2}$/.test(j))) bad(5, `${r.name}: jersey "${r.jerseyNumbers}" is not a clean comma list`);
    if (new Set(js).size !== js.length) bad(5, `${r.name}: jersey "${r.jerseyNumbers}" repeats a number`);
    for (const k of ['college', 'careerStat', 'firstTeam']) if (/[\u2013\u2014]/.test(r[k])) bad(5, `${r.name} ${k} has a long dash`);
  }
  // 6. active players end at their 2026 club
  const byPfr = new Map(roster.roster.filter(x => x[9]).map(x => [x[9], x]));
  let joined = 0;
  for (let i = 0; i < Math.min(rows.length, rec.length); i++) {
    const r = rec[i]; const hit = r.pfr_id && byPfr.get(r.pfr_id);
    if (!hit) { if (r.roster2026) bad(6, `${r.name}: the record has a 2026 club but the roster file has no row for ${r.pfr_id}`); continue; }
    joined++;
    const last = rows[i].teams[rows[i].teams.length - 1];
    if (CLUB_OF.get(last) !== hit[0]) bad(6, `${r.name}: path ends at ${last} but the 2026 roster file has ${hit[0]}`);
    if (!r.roster2026 || r.roster2026.team !== hit[0]) bad(6, `${r.name}: the record's 2026 club ${r.roster2026 && r.roster2026.team} is not the roster file's ${hit[0]}`);
  }
  if (joined < JOIN_FLOOR) bad(6, `only ${joined} rows join the 2026 roster file (floor ${JOIN_FLOOR}, measured 37)`);
  // 8. the rules card examples are clues too
  const block = (page || '').match(/examples=\{\[([\s\S]*?)\]\}/);
  const examples = block ? [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
  if (examples.length < 4) bad(8, `found ${examples.length} rules card examples on the page, expected at least 4`);
  const ORD = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const nick = t => t.split(' ').slice(-1)[0];
  for (const ex of examples) {
    const [who, rest] = ex.split(': ');
    const r = rec.find(x => x.name === who);
    if (!r || !rest) { bad(8, `example "${ex}" names nobody in the record`); continue; }
    const parts = rest.split(', ');
    const [rd, college, clubs, ...stat] = parts;
    if (rd !== `${ORD(r.draftRound.value)} Round`) bad(8, `${who} example says "${rd}", the record has round ${r.draftRound.value}`);
    if (college !== r.college.value) bad(8, `${who} example says college "${college}", the record has "${r.college.value}"`);
    const shown = (clubs || '').split(' → ');
    const want = r.teams.value;
    if (shown.length !== want.length || shown.some((c, i) => c !== want[i] && c !== nick(want[i]))) bad(8, `${who} example says clubs "${clubs}", the record has ${want.join(' > ')}`);
    if (stat.join(', ') !== r.careerStat.value) bad(8, `${who} example says "${stat.join(', ')}", the record's career stat is "${r.careerStat.value}"`);
  }
  return { fail, joined, thinCount };
}

function load() {
  return {
    src: fs.readFileSync(DATA, 'utf8'),
    page: fs.readFileSync(PAGE, 'utf8'),
    record: JSON.parse(fs.readFileSync(RECORD, 'utf8')),
    roster: JSON.parse(fs.readFileSync(ROSTER, 'utf8')),
  };
}
const clone = o => JSON.parse(JSON.stringify(o));
function must(cond, why) { if (!cond) throw new Error(`control refuses to run: ${why}`); }

// Each control plants one defect in a copy and names the section that must go red.
const CONTROLS = {
  seattle: { secs: [2, 6], plant(c) {
    const from = 'teams: ["Detroit Lions", "Los Angeles Rams"]';
    must(c.src.includes(from), 'Stafford path string missing');
    c.src = c.src.replace(from, 'teams: ["Detroit Lions", "Los Angeles Rams", "Seattle Seahawks"]');
  } },
  jersey: { secs: [2], plant(c) {
    const from = 'teams: ["Seattle Seahawks"], jerseyNumbers: "11"';
    must(c.src.includes(from), 'Smith-Njigba jersey string missing');
    c.src = c.src.replace(from, 'teams: ["Seattle Seahawks"], jerseyNumbers: "1"');
  } },
  claim: { secs: [4], plant(c) {
    must(c.src.includes('careerStat: "250+ TD passes"'), 'Mahomes claim string missing');
    c.src = c.src.replace('careerStat: "250+ TD passes"', 'careerStat: "300+ TD passes"');
    const r = c.record.rows.find(x => x.name === 'Patrick Mahomes');
    must(r && r.careerStat.value === '250+ TD passes', 'Mahomes record claim missing');
    r.careerStat.value = '300+ TD passes'; r.careerStat.claim.n = 300;
  } },
  onesource: { secs: [3], plant(c) {
    const r = c.record.rows.find(x => x.name === 'Randy Moss');
    must(r && r.teams.sources.length >= 2, 'Moss team sources missing');
    r.teams.sources = r.teams.sources.slice(0, 1);
  } },
  roster: { secs: [6], plant(c) {
    const row = c.roster.roster.find(x => x[9] === 'RodgAa00');
    must(row && row[0] === 'PIT', 'Rodgers roster row missing or not PIT');
    row[0] = 'NYJ';
  } },
  order: { secs: [1], plant(c) {
    const a = c.src.indexOf('  { name: "Patrick Mahomes"'); const b = c.src.indexOf('  { name: "Tom Brady"');
    must(a >= 0 && b > a, 'first two rows missing');
    const la = c.src.slice(a, c.src.indexOf('\n', a)); const lb = c.src.slice(b, c.src.indexOf('\n', b));
    c.src = c.src.replace(la, '@@A@@').replace(lb, la).replace('@@A@@', lb);
  } },
  example: { secs: [8], plant(c) {
    const from = 'Tom Brady: 6th Round, Michigan, Patriots → Buccaneers, 649 TD passes';
    must(c.page.includes(from), 'Brady example string missing');
    c.page = c.page.replace(from, 'Tom Brady: 6th Round, Michigan, Patriots → Buccaneers, 7x Super Bowl Champion');
  } },
  thin: { secs: [3], plant(c) {
    const r = c.record.rows.find(x => x.name === 'Tom Brady');
    must(r && !r.thin, 'Brady already thin');
    r.thin = [{ field: 'draft', why: 'planted by the control: a second thin fact must break the ratchet baseline', sources: [] }];
  } },
};

function run(c) { return check({ rows: parseRows(c.src), record: c.record, roster: c.roster, page: c.page }); }

const SECTIONS = { 1: 'order and length', 2: 'every field equals the record', 3: 'the record holds up', 4: 'career stat text matches its sources', 5: 'shape', 6: 'active players end at their 2026 club', 8: 'the rules card examples match the record' };
const base = load();
const only = process.env.SIM_NFLCP_CONTROL;
if (only) {
  must(CONTROLS[only], `unknown control ${only} (known: ${Object.keys(CONTROLS).join(', ')})`);
  CONTROLS[only].plant(base);
  console.log(`CONTROL ${only} planted: this run must exit 1 with section ${CONTROLS[only].secs.join(' and ')} red`);
}
const res = run(base);
const rowCount = parseRows(base.src).length;
console.log(`simNflCareerPathFacts: ${rowCount} rows in the file, ${base.record.rows.length} in the record, ${res.joined} join the 2026 roster file, ${res.thinCount} thin fact(s)`);
let failed = 0;
for (const [sec, title] of Object.entries(SECTIONS)) {
  const f = res.fail.filter(x => x.sec === +sec);
  console.log(`${f.length ? 'FAIL' : 'ok  '} ${sec}. ${title}${f.length ? ` (${f.length})` : ''}`);
  for (const x of f.slice(0, 6)) console.log(`       ${x.msg}`);
  failed += f.length;
}
// 7. controls: each must turn its own section red on a copy
let ctrlBad = 0;
if (!only) {
  for (const [name, ctl] of Object.entries(CONTROLS)) {
    const c = clone({ src: base.src, page: base.page, record: base.record, roster: base.roster });
    try { ctl.plant(c); } catch (e) { console.log(`FAIL 7. control ${name}: ${e.message}`); ctrlBad++; continue; }
    const r = run(c);
    const hit = ctl.secs.filter(s => r.fail.some(x => x.sec === s));
    const fired = hit.length === ctl.secs.length;
    if (!fired) ctrlBad++;
    console.log(`${fired ? 'ok  ' : 'FAIL'} 7. control ${name}: sections ${ctl.secs.join(', ')} went ${fired ? 'red' : 'green only on ' + ctl.secs.filter(s => !hit.includes(s)).join(', ')} (${r.fail.length} finding(s))`);
  }
}
const total = failed + ctrlBad;
console.log(`simNflCareerPathFacts: ${total === 0 ? 'PASS' : 'FAIL'} (${failed} finding(s), ${ctrlBad} control(s) that did not fire)`);
process.exit(total === 0 ? 0 : 1);
