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
 *      "thin" with a reason, and that list is a ratchet: it may shrink, never grow. Baseline 0 since the
 *      review fix: Reggie White's 1984 supplemental draft was thin (nflverse only) until drafthistory.com's
 *      1984 supplemental draft table gave it a second host. A source line may only say what its own
 *      site showed: a line that names another host is a borrowed value and fails (the first record
 *      credited Pro Football Archives with Tua Tagovailoa's 2026 club, which only nflverse showed).
 *   4. The career stat text says what its sources say: the number in the text (and its "+") must
 *      satisfy every source value the record kept, so "250+ TD passes" fails if the sources show 240,
 *      and the words after the number must name the stat the sources were read for ("232 TD passes",
 *      never "232 rushing TDs"). All-Pro and Pro Bowl counts must equal each host's own count, and the
 *      last pick line must show the pick number and the year on every source.
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
 *   9. Every value is what its sources showed. Sections 2 and 3 alone let a careless edit change a
 *      row and its record entry together, sources untouched, and stay green (the review proved it four
 *      times). This reads each source's own line and compares it with the value: draft round and year,
 *      college (spelling variants like "Ohio St." mapped), the first team, the path club by club (every
 *      place needs two hosts that show that club there; a site that has not caught up with the latest
 *      season backs the clubs it does show; two stints that start in the same season may swap), and the
 *      jersey number by number (exactly the numbers two hosts show, in the order first worn).
 *
 * NEGATIVE CONTROLS (also runnable alone: SIM_NFLCP_CONTROL=<name>, the run must then exit 1)
 *   seattle    puts Seattle back on Matthew Stafford's path                 sections 2, 6
 *   jersey     gives Jaxon Smith-Njigba #1 again                             section 2
 *   claim      "250+ TD passes" becomes "300+" in both file and record      section 4
 *   onesource  strips a fact down to one host in the record                section 3
 *   roster     moves Aaron Rodgers to the Jets in the roster file copy      section 6
 *   order      swaps the first two rows                                     section 1
 *   thin       adds a thin fact to the record (the baseline is 0)           section 3
 *   example    puts "7x Super Bowl Champion" back on the Tom Brady example     section 8
 *   The rest change the file and the record together and leave the sources alone:
 *   oakland    Oakland back on Antonio Brown's path                         section 9
 *   mossorder  Randy Moss's clubs in the old wrong order                    section 9
 *   mossjersey drops Moss's #81                                             section 9
 *   ricejersey Jerry Rice "80" becomes "80, 81"                             section 9
 *   riceorder  Rice's last two clubs swapped                                section 9
 *   draft      Tom Brady drafted in round 5                                 section 9
 *   draftyear  Reggie White drafted in 1985                                 section 9
 *   college    Tom Brady at Michigan State                                  section 9
 *   oneclub    drops the nflverse line from Tua's path, so Atlanta rests on one host   section 9
 *   borrowed   credits Pro Football Archives with nflverse's 2026 club again section 3
 *   statword   Steve Young "232 TD passes" becomes "232 rushing TDs"         section 4
 *   probowl    Patrick Willis 7x Pro Bowl becomes 8x                         section 4
 *   shape      Tom Brady's first team becomes Tampa Bay                      section 5
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
const THIN_BASELINE = 0;
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

// Section 9 reads what each source showed (its "saw" line), never the builder's own claim object.
// A franchise from any team string a source printed: a display name, an ESPN slug or a short code.
const NICK = { cardinals: 'ARI', falcons: 'ATL', ravens: 'BAL', bills: 'BUF', panthers: 'CAR', bears: 'CHI', bengals: 'CIN', browns: 'CLE', cowboys: 'DAL', broncos: 'DEN', lions: 'DET', packers: 'GB', texans: 'HOU', colts: 'IND', jaguars: 'JAX', chiefs: 'KC', raiders: 'LV', chargers: 'LAC', rams: 'LAR', dolphins: 'MIA', vikings: 'MIN', patriots: 'NE', saints: 'NO', giants: 'NYG', jets: 'NYJ', eagles: 'PHI', steelers: 'PIT', '49ers': 'SF', seahawks: 'SEA', buccaneers: 'TB', titans: 'TEN', oilers: 'TEN', redskins: 'WAS', commanders: 'WAS', washington: 'WAS', team: 'WAS' };
const ABBR = { ARZ: 'ARI', BLT: 'BAL', CLV: 'CLE', HST: 'HOU', SL: 'LAR', STL: 'LAR', LA: 'LAR', LARM: 'LAR', OAK: 'LV', SD: 'LAC', SDG: 'LAC', NWE: 'NE', SFO: 'SF', GNB: 'GB', KAN: 'KC', NOR: 'NO', TAM: 'TB', CHIB: 'CHI', WSH: 'WAS' };
const FRANCHISES = new Set(Object.values(NICK));
function franchise(s) {
  if (!s) return null;
  if (/^[A-Z]{2,4}$/.test(s)) return ABBR[s] || (FRANCHISES.has(s) ? s : null);
  return NICK[s.toLowerCase().split(/[\s-]+/).filter(Boolean).pop()] || null;
}
// "2013 New York Jets > 2017 NYG (a note)" -> [{ y: 2013, k: 'NYJ' }, { y: 2017, k: 'NYG' }], or null if unreadable
function stintsSeen(saw) {
  const out = [];
  for (const part of saw.replace(/ \([^()]*\)$/, '').split(' > ')) {
    const m = part.match(/^(\d{4}) (.+)$/); const k = m && franchise(m[2]);
    if (!k) return null;
    if (!out.length || out[out.length - 1].k !== k) out.push({ y: +m[1], k });
  }
  return out;
}
// A source backs the first clubs of the path when its stints are exactly those clubs in that order.
// It may stop early (a site that has not caught up with the latest season), and two stints that start
// in the same season may swap (a trade inside a season, which per-season tables cannot order).
function backsPath(path, st) {
  if (!st.length || st.length > path.length) return false;
  const ks = st.map(s => s.k); const same = c => c.every((k, i) => k === path[i]);
  if (same(ks)) return true;
  for (let i = 0; i + 1 < st.length; i++) if (st[i].y === st[i + 1].y) { const c = ks.slice(); [c[i], c[i + 1]] = [c[i + 1], c[i]]; if (same(c)) return true; }
  return false;
}
function draftSeen(saw) {
  let m;
  if ((m = saw.match(/^(\d{4}): Rd (\d+), Pk \d+/))) return { y: +m[1], rd: +m[2] };
  if ((m = saw.match(/^(\d+)(?:st|nd|rd|th) round \(\d+\w+ overall\) (\d{4}) /))) return { y: +m[2], rd: +m[1] };
  if ((m = saw.match(/^(?:draft_year )?(\d{4}) round (\d+) pick \d+/))) return { y: +m[1], rd: +m[2] };
  if ((m = saw.match(/number 1 draft pick in (\d{4})/))) return { y: +m[1], rd: 1 };
  if (/No\. 1 overall pick/.test(saw)) return { y: null, rd: 1 };
  return null;
}
const COLLEGE_ALIAS = { 'louisiana state': 'lsu', 'ole miss': 'mississippi', 'southern mississippi': 'southern miss', chattanooga: 'tennessee-chattanooga', 'miami (fl)': 'miami', 'miami (florida)': 'miami', 'brigham young': 'byu', 'texas christian': 'tcu', 'southern california': 'usc', 'mississippi valley state university': 'mississippi valley state', 'jackson state university': 'jackson state' };
const college = s => { const x = String(s).replace(/ \(last college played\)$/, '').toLowerCase().trim().replace(/ st\.$/, ' state'); return COLLEGE_ALIAS[x] || x; };
// the words that must follow the number in a career stat line, by the stat its sources were read for
const STAT_WORDS = { passTD: /^ TD passes\b/, rushYds: /^ rushing (?:yards|season)\b/, recYds: /^ receiving yards\b/, recTD: /^ receiving TDs\b/, rushTD: /^ rushing TDs\b/, sacks: /^ (?:career )?sacks\b/, ints: /^ (?:career )?interceptions\b/, scrimmage: /^ scrimmage yards\b/, rushAvg: /^ yards per carry\b/ };
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
      // a source line says only what its own site showed: a value borrowed from another host names that host
      for (const s of f.sources) for (const m of String(s.saw).matchAll(/nflverse|espn|nfl\.com|profootballarchives|pro football archives|drafthistory|profootballhof|hall of fame/gi)) {
        const named = m[0].toLowerCase().replace(/ /g, '').replace('halloffame', 'profootballhof');
        if (!s.host.toLowerCase().includes(named)) bad(3, `${r.name} ${k}: the ${s.host} line "${s.saw}" carries what ${m[0]} showed`);
      }
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
        const nums = [...text.matchAll(/\d[\d,]*(?:\.\d+)?(?:\+|-yard)?/g)].map(m => ({ n: num(m[0]), plus: /(\+|-yard)$/.test(m[0]), after: text.slice(m.index + m[0].length) }));
        const hit = nums.find(x => x.n === p.n);
        if (!hit) { bad(4, `${r.name}: "${text}" does not carry the claimed ${p.n}`); continue; }
        if ((p.op === '>=') !== hit.plus) bad(4, `${r.name}: "${text}" and claim ${p.op} ${p.n} disagree on the plus`);
        // the number has to be followed by the words for the stat its sources were read for
        if (!STAT_WORDS[p.stat] || !STAT_WORDS[p.stat].test(hit.after)) bad(4, `${r.name}: "${text}" does not name ${p.stat} after ${p.n}`);
        const years = text.match(/\b(?:19|20)\d\d\b/g) || [];
        if (p.kind === 'season' && years.some(y => +y !== p.year)) bad(4, `${r.name}: "${text}" names a season other than ${p.year}`);
        const label = p.kind === 'total' ? `career ${p.stat} ` : `${p.year} ${p.stat} `;
        const seen = r.careerStat.sources.filter(s => s.saw.startsWith(label)).map(s => num(s.saw.slice(label.length)));
        if (new Set(r.careerStat.sources.filter(s => s.saw.startsWith(label)).map(s => s.host)).size < 2) bad(4, `${r.name}: fewer than two hosts show ${label.trim()}`);
        for (const v of seen) if (p.op === '>=' ? !(v >= p.n) : Math.abs(v - p.n) > 1e-9) bad(4, `${r.name}: "${text}" but a source shows ${label}${v}`);
      } else if (p.kind === 'allpro' || p.kind === 'probowl') {
        const word = p.kind === 'allpro' ? 'All-Pro' : 'Pro Bowl';
        const m = text.match(new RegExp(`(\\d+)x ${word}`));
        if (!m || +m[1] !== p.n) { bad(4, `${r.name}: "${text}" does not say ${p.n}x ${word}`); continue; }
        // each host's own count: a stated total ("probowls 7", "Pro Bowls 7") or one line per season it listed
        const perHost = new Map();
        for (const s of r.careerStat.sources) {
          const t = s.saw.match(p.kind === 'allpro' ? /^allpro (\d+)\b/ : /^(?:probowls|Pro Bowls) (\d+)\b/);
          const y = p.kind === 'allpro' && s.saw.match(/^(\d{4}) Associated Press All-NFL$/);
          const h = perHost.get(s.host) || { total: null, years: new Set() };
          if (t) h.total = +t[1]; else if (y) h.years.add(y[1]); else { bad(4, `${r.name}: ${s.host} line "${s.saw}" shows no ${word} count`); continue; }
          perHost.set(s.host, h);
        }
        for (const [host, h] of perHost) { const v = h.total !== null ? h.total : h.years.size; if (v !== +m[1]) bad(4, `${r.name}: "${text}" but ${host} shows ${v}`); }
        if (perHost.size < 2) bad(4, `${r.name}: fewer than two hosts show a ${word} count`);
      } else if (p.kind === 'lastpick') {
        if (!/last pick/.test(text) || !text.includes(String(p.year))) bad(4, `${r.name}: "${text}" does not say last pick of ${p.year}`);
        // each source must show both the last pick number of that draft and the player at it
        const ok = r.careerStat.sources.filter(s => s.saw.includes(String(p.year)) && (s.saw.match(new RegExp(`\\b${p.overall}\\b`, 'g')) || []).length >= 2);
        if (ok.length !== r.careerStat.sources.length || new Set(ok.map(s => s.host)).size < 2) bad(4, `${r.name}: the sources do not all show pick ${p.overall} as the last of ${p.year} on two hosts`);
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
  // 9. every value is what its sources showed: read each source's own line and compare it with the value
  for (const r of rec) {
    const thinDraft = (r.thin || []).some(t => t.field === 'draft');
    for (const [k, part] of [['draftRound', 'rd'], ['draftYear', 'y']]) {
      const hosts = new Set();
      for (const s of r[k].sources) { const d = draftSeen(s.saw); if (!d || d[part] !== r[k].value) bad(9, `${r.name} ${k} ${r[k].value}: ${s.host} showed "${s.saw}"`); else hosts.add(s.host); }
      if (hosts.size < (thinDraft ? 1 : 2)) bad(9, `${r.name} ${k} ${r[k].value} is shown by ${hosts.size} host(s)`);
    }
    const ch = new Set();
    for (const s of r.college.sources) { if (college(s.saw) !== college(r.college.value)) bad(9, `${r.name} college ${r.college.value}: ${s.host} showed "${s.saw}"`); else ch.add(s.host); }
    if (ch.size < 2) bad(9, `${r.name} college ${r.college.value} is shown by ${ch.size} host(s)`);
    // teams, club by club: every place in the path needs two hosts that show that club there
    const names = r.teams.value.filter((t, i, a) => i === 0 || franchise(a[i - 1]) !== franchise(t));
    const path = names.map(franchise);
    if (path.some(k => !k)) { bad(9, `${r.name} teams: a club name no source could print`); continue; }
    const placed = path.map(() => new Set());
    for (const s of r.teams.sources) {
      const st = stintsSeen(s.saw);
      if (!st || !backsPath(path, st)) bad(9, `${r.name} teams ${r.teams.value.join(' > ')}: ${s.host} showed "${s.saw}"`);
      else st.forEach((_, j) => placed[j].add(s.host));
    }
    placed.forEach((h, j) => { if (h.size < 2) bad(9, `${r.name}: club ${j + 1} of the path (${names[j]}) is shown there by ${h.size} host(s)`); });
    const fh = new Set();
    for (const s of r.firstTeam.sources) { const st = stintsSeen(s.saw); if (!st || st[0].k !== franchise(r.firstTeam.value)) bad(9, `${r.name} first team ${r.firstTeam.value}: ${s.host} showed "${s.saw}"`); else fh.add(s.host); }
    if (fh.size < 2) bad(9, `${r.name} first team is shown by ${fh.size} host(s)`);
    // jersey, number by number: shipped numbers are exactly those two hosts show, in the order first worn
    const seen = new Map();
    for (const s of r.jerseyNumbers.sources) for (const note of s.saw.split('; ')) {
      const n = (note.match(/#(\d{1,2})\b/) || note.match(/^jersey (\d{1,2})\b/) || [])[1];
      if (!n) { bad(9, `${r.name} jersey: ${s.host} line "${note}" shows no number`); continue; }
      const e = seen.get(n) || { hosts: new Set(), first: Infinity }; e.hosts.add(s.host);
      const y = note.match(/^(\d{4}) /); if (y) e.first = Math.min(e.first, +y[1]);
      seen.set(n, e);
    }
    const shipped = String(r.jerseyNumbers.value).split(', ');
    for (const n of shipped) { const e = seen.get(n); if (!e || e.hosts.size < 2) bad(9, `${r.name} jersey #${n} is shown by ${e ? e.hosts.size : 0} host(s)`); }
    for (const [n, e] of seen) if (e.hosts.size >= 2 && !shipped.includes(n)) bad(9, `${r.name} jersey #${n} is shown by ${e.hosts.size} hosts but not shipped`);
    for (let j = 1; j < shipped.length; j++) { const a = seen.get(shipped[j - 1]), b = seen.get(shipped[j]); if (a && b && a.first > b.first) bad(9, `${r.name} jersey "${r.jerseyNumbers.value}" is not in the order first worn (#${shipped[j]} from ${b.first}, #${shipped[j - 1]} from ${a.first})`); }
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
// A careless edit changes a row and its record entry together and leaves the sources alone.
// This plants exactly that: the same new value in the file and in the record, sources untouched.
const lit = v => Array.isArray(v) ? `[${v.map(x => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v);
function plantBoth(c, name, field, from, to) {
  const line = c.src.split('\n').find(l => l.includes(`{ name: ${JSON.stringify(name)},`));
  must(line && line.includes(`${field}: ${lit(from)}`), `${name} ${field} is not ${lit(from)} in the file`);
  c.src = c.src.replace(line, line.replace(`${field}: ${lit(from)}`, `${field}: ${lit(to)}`));
  const r = c.record.rows.find(x => x.name === name);
  must(r && lit(r[field].value) === lit(from), `${name} ${field} is not ${lit(from)} in the record`);
  r[field].value = to;
  return r;
}

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
  // the review's mutations: each one changes the file and the record together, sources left alone
  oakland: { secs: [9], plant(c) {
    plantBoth(c, 'Antonio Brown', 'teams', ['Pittsburgh Steelers', 'New England Patriots', 'Tampa Bay Buccaneers'], ['Pittsburgh Steelers', 'Oakland Raiders', 'New England Patriots', 'Tampa Bay Buccaneers']);
  } },
  mossorder: { secs: [9], plant(c) {
    plantBoth(c, 'Randy Moss', 'teams', ['Minnesota Vikings', 'Oakland Raiders', 'New England Patriots', 'Minnesota Vikings', 'Tennessee Titans', 'San Francisco 49ers'], ['Minnesota Vikings', 'Oakland Raiders', 'New England Patriots', 'San Francisco 49ers', 'Tennessee Titans']);
  } },
  mossjersey: { secs: [9], plant(c) { plantBoth(c, 'Randy Moss', 'jerseyNumbers', '84, 18, 81', '84, 18'); } },
  ricejersey: { secs: [9], plant(c) { plantBoth(c, 'Jerry Rice', 'jerseyNumbers', '80', '80, 81'); } },
  riceorder: { secs: [9], plant(c) {
    plantBoth(c, 'Jerry Rice', 'teams', ['San Francisco 49ers', 'Oakland Raiders', 'Seattle Seahawks'], ['San Francisco 49ers', 'Seattle Seahawks', 'Oakland Raiders']);
  } },
  draft: { secs: [9], plant(c) { plantBoth(c, 'Tom Brady', 'draftRound', 6, 5); } },
  draftyear: { secs: [9], plant(c) { plantBoth(c, 'Reggie White', 'draftYear', 1984, 1985); } },
  college: { secs: [9], plant(c) { plantBoth(c, 'Tom Brady', 'college', 'Michigan', 'Michigan State'); } },
  oneclub: { secs: [9], plant(c) {
    const r = c.record.rows.find(x => x.name === 'Tua Tagovailoa');
    must(r && r.teams.sources.some(s => s.host === 'github.com/nflverse'), 'Tua nflverse teams source missing');
    r.teams.sources = r.teams.sources.filter(s => s.host !== 'github.com/nflverse');
  } },
  borrowed: { secs: [3], plant(c) {
    const r = c.record.rows.find(x => x.name === 'Tua Tagovailoa');
    const s = r && r.teams.sources.find(x => x.host === 'profootballarchives.com');
    must(s && s.saw === '2020 Miami Dolphins', 'Tua Pro Football Archives line is not "2020 Miami Dolphins"');
    s.saw = '2020 Miami Dolphins > 2026 ATL (2026, nflverse)';
  } },
  statword: { secs: [4], plant(c) {
    plantBoth(c, 'Steve Young', 'careerStat', '232 TD passes', '232 rushing TDs');
  } },
  probowl: { secs: [4], plant(c) {
    const r = plantBoth(c, 'Patrick Willis', 'careerStat', '7x Pro Bowl linebacker', '8x Pro Bowl linebacker');
    must(r.careerStat.claim.n === 7, 'Willis claim is not 7'); r.careerStat.claim.n = 8;
  } },
  shape: { secs: [5], plant(c) { plantBoth(c, 'Tom Brady', 'firstTeam', 'New England Patriots', 'Tampa Bay Buccaneers'); } },
  thin: { secs: [3], plant(c) {
    const r = c.record.rows.find(x => x.name === 'Tom Brady');
    must(r && !r.thin, 'Brady already thin');
    r.thin = [{ field: 'draft', why: 'planted by the control: one more thin fact than the baseline must break the ratchet', sources: [] }];
  } },
};

function run(c) { return check({ rows: parseRows(c.src), record: c.record, roster: c.roster, page: c.page }); }

const SECTIONS = { 1: 'order and length', 2: 'every field equals the record', 3: 'the record holds up', 4: 'career stat text matches its sources', 5: 'shape', 6: 'active players end at their 2026 club', 8: 'the rules card examples match the record', 9: 'every value is what its sources showed' };
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
