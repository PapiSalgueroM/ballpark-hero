#!/usr/bin/env node
/**
 * simMlbCareerPathFacts (Round 924): MLB Career Path (/baseball-career) shows only what two sources say.
 *
 * The record is scripts/data/mlbCareerPathVerified2026-10.json: every line the game shows a player, read on
 * 2026-10-03 from the league's own data service (statsapi.mlb.com) and from baseball-reference.com, kept only
 * where the two agree. This harness holds src/data/baseballCareerPlayers.ts to that record and the record to
 * itself. It reads files only: no network, no database.
 *
 *   1. Pool shape: one row per record row, ids unique, NAMES unique (accents and case folded), surnames unique
 *      (the game accepts a surname guess), no em or en dash anywhere in the data file. Names and surnames use
 *      the game's own rule, src/lib/careerGuess.ts, bundled in with esbuild so the two cannot drift apart.
 *   2. Every shown line equals the record: position, draft, first team, teams, stats, awards, word for word,
 *      and the franchise count the result screen's "suited up for N franchises" reads.
 *   3. The record holds together: two sources on two hosts (one of them the league's), both sides of every line
 *      equal, each line's text rebuilt from its evidence by the rule in the record, a floor at or under the
 *      value and less than one rounding step below it, asOf on every active row and on its rate stats.
 *      baseball-reference's clubs are the league's clubs by name, not just by count, and the league's team ids
 *      group a card's clubs into franchises exactly as baseball-reference's franchise pages do (Brooklyn and
 *      Los Angeles Dodgers one franchise, Milwaukee Braves and Milwaukee Brewers two).
 *   4. Teammates agree on titles: for every World Series title a pool player holds with a club, every other
 *      pool player on that club that season holds it too, or the record lists him in titleExceptions with
 *      both sources' counts. A listed exception that no longer applies fails as well. Every card that shows
 *      a title line shows exactly the record's titles.
 *   5. Current clubs: every active player's last club is the club scripts/data/mlbRosters2026.json (the 40 man
 *      rosters on 2026-09-27) lists him under, and his card's teams include it. A row classed retired must have
 *      no 2026 season and no place on those rosters, so a current player cannot slip out of his floors that way.
 *   6. The read is still current: today (Eastern time) is on or before the record's rereadBy, the day after the
 *      November 2026 awards, and every active row, award and total is dated to the read or the season's end.
 *      This one is a clock on purpose: the 2026 World Series and the awards can make an exact line on an active
 *      player stale while every file stays the same, and the card shows no date. From the day after rereadBy
 *      it stays red until the chain in scripts/mlbCareerPath/ is rerun on fresh pages and the date moves on.
 *
 * Baseline (the file on main at 5f2622fd, before this round): 35 rows of which 3 were second copies (Griffey,
 * Rivera, Pedro Martinez), so 32 players; measured against this record, 145 of the 396 lines it showed for
 * those 32 differ (50 stat lines, 65 award lines, 18 draft lines, 6 positions, 6 team lines; format changes
 * such as K to SO count too, the wrong ones include totals frozen years ago, a 2022 title Harper never won,
 * 2 Cy Youngs for Verlander's 3, and Freeman and Kershaw out of step with their 2025 teammates). After: 60
 * players, 717 shown lines, 0 differing. Nothing here is
 * statistical, so there are no bands: a floor's tolerance is the rounding step the record's rule states
 * (10 at 100 and up, 5 under 100), the same for every row.
 *
 * Negative controls, one per check, each asserting the string it mutates exists first (exit 2 if it does not,
 * or if the section it aims at stays green; exit 1 means the control fired, the expected result):
 *   SIM_MLBCP_CONTROL=dup              a second Ken Griffey Jr. row                       -> section 1
 *   SIM_MLBCP_CONTROL=harper2022       Harper's card claims the 2022 World Series         -> section 2
 *   SIM_MLBCP_CONTROL=verlander2cy     Verlander's card says 2x AL Cy Young               -> section 2
 *   SIM_MLBCP_CONTROL=maysfranchises   Mays's card counts 4 club names as 4 franchises    -> section 2
 *   SIM_MLBCP_CONTROL=floor            Trout's HR floor raised above his total, card and record together -> section 3
 *   SIM_MLBCP_CONTROL=onehost          Trout's two sources both on baseball-reference     -> section 3
 *   SIM_MLBCP_CONTROL=bbrefteam        Judge's baseball-reference club NYY becomes NYM (same count) -> section 3
 *   SIM_MLBCP_CONTROL=franchisesplit   baseball-reference puts Koufax's two Dodgers clubs on two franchises -> section 3
 *   SIM_MLBCP_CONTROL=freeman2025      Freeman's 2025 title dropped from card and record together -> section 4
 *   SIM_MLBCP_CONTROL=missingexception Kershaw's needed 2024 exception deleted            -> section 4
 *   SIM_MLBCP_CONTROL=staleexception   Judge given a 2009 exception no teammate's title needs -> section 4
 *   SIM_MLBCP_CONTROL=exccount         Kershaw's 2024 exception carries a count neither source gives -> section 4
 *   SIM_MLBCP_CONTROL=roster           Judge's record says his 2026 club is the Mets       -> section 5
 *   SIM_MLBCP_CONTROL=retiredjudge     Judge classed retired with exact totals, no asOf, card and record -> section 5
 *   SIM_MLBCP_CONTROL=stale            the clock moved to the day after rereadBy          -> section 6
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src/data/baseballCareerPlayers.ts');
const RECORD = path.join(ROOT, 'scripts/data/mlbCareerPathVerified2026-10.json');
const ROSTERS = path.join(ROOT, 'scripts/data/mlbRosters2026.json');
const CONTROL = process.env.SIM_MLBCP_CONTROL || '';
const CONTROL_SECTION = {
  dup: 1, harper2022: 2, verlander2cy: 2, maysfranchises: 2, floor: 3, onehost: 3, bbrefteam: 3, franchisesplit: 3,
  freeman2025: 4, missingexception: 4, staleexception: 4, exccount: 4, roster: 5, retiredjudge: 5, stale: 6,
};
// the harness's own clock, in Eastern time like the site's daily; the stale control moves it past rereadBy
let TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
if (CONTROL && !CONTROL_SECTION[CONTROL]) { console.log(`unknown control ${CONTROL}`); process.exit(2); }

const src = fs.readFileSync(DATA, 'utf8');
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const rosters = JSON.parse(fs.readFileSync(ROSTERS, 'utf8'));

// The data file is one array literal after its type annotation; evaluate just that literal.
function parsePool(text) {
  const start = text.indexOf('export const baseballCareerPuzzles: BaseballCareerPuzzle[] = [');
  if (start < 0) throw new Error('data file: export not found');
  const lit = text.slice(text.indexOf('[', text.indexOf('= ', start)), text.lastIndexOf('];') + 1);
  return new Function(`return ${lit};`)();
}
const pool = parsePool(src);

function mustHave(cond, what) {
  if (!cond) { console.log(`CONTROL ${CONTROL} DID NOT FIRE: ${what} not found, so the control changes nothing`); process.exit(2); }
}
const byId = (list, id) => list.find((x) => x.id === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- negative controls: mutate the parsed copies only, never the files ----
if (CONTROL === 'dup') {
  const g = byId(pool, 'bc-015'); mustHave(g && g.player.name === 'Ken Griffey Jr.', 'row bc-015 Ken Griffey Jr.');
  pool.push({ id: 'bc-028', player: JSON.parse(JSON.stringify(g.player)) });
  const r = byId(record.players, 'bc-015'); record.players.push({ ...JSON.parse(JSON.stringify(r)), id: 'bc-028' });
}
if (CONTROL === 'harper2022') {
  const h = byId(pool, 'bc-014'); mustHave(h && h.player.name === 'Bryce Harper' && h.player.awards.length >= 2, 'Harper card with awards');
  h.player.awards[1] = '2022 World Series Champion';
}
if (CONTROL === 'verlander2cy') {
  const v = byId(pool, 'bc-011'); const i = v ? v.player.awards.indexOf('3× AL Cy Young') : -1;
  mustHave(i >= 0, "Verlander's '3× AL Cy Young' line");
  v.player.awards[i] = '2× AL Cy Young';
}
if (CONTROL === 'floor') {
  const t = byId(pool, 'bc-001'); const r = byId(record.players, 'bc-001');
  const i = t ? t.player.stats.findIndex((s) => / HR$/.test(s)) : -1;
  mustHave(i >= 0 && r.stats[i].key === 'hr' && r.stats[i].floor != null, "Trout's HR floor");
  const raised = r.stats[i].value + 4; // above the total: not a floor any more
  t.player.stats[i] = `${raised}+ HR`; r.stats[i].floor = raised; r.stats[i].text = `${raised}+ HR`;
}
if (CONTROL === 'onehost') {
  const r = byId(record.players, 'bc-001'); mustHave(r && r.src.some((u) => u.includes('statsapi.mlb.com')), "Trout's league source");
  r.src = [r.src[1], r.src[1].replace('troutmi01', 'troutmi01#bling')];
}
if (CONTROL === 'freeman2025') {
  const f = byId(pool, 'bc-018'); const r = byId(record.players, 'bc-018');
  const i = f ? f.player.awards.findIndex((a) => a.includes('World Series Champion (2021, 2024, 2025)')) : -1;
  mustHave(i >= 0 && r.wsTitles.some((t) => t.year === 2025), "Freeman's 2025 title");
  f.player.awards[i] = '2× World Series Champion (2021, 2024)';
  const a = r.awards.find((x) => x.key === 'ws'); a.text = f.player.awards[i]; a.n = 2; a.years = ['2021', '2024']; a.bbref = 2;
  r.wsTitles = r.wsTitles.filter((t) => t.year !== 2025);
}
if (CONTROL === 'missingexception') {
  const r = byId(record.players, 'bc-002'); mustHave(r && (r.titleExceptions || []).some((x) => x.year === 2024), "Kershaw's 2024 exception");
  r.titleExceptions = r.titleExceptions.filter((x) => x.year !== 2024);
}
if (CONTROL === 'staleexception') {
  const r = byId(record.players, 'bc-010'); mustHave(r && r.name === 'Aaron Judge' && !(r.titleExceptions || []).length && !r.seasons.some(([y]) => y === 2009), 'Judge with no exceptions and no 2009 season');
  r.titleExceptions = [{ year: 2009, team: 'New York Yankees', mlbYears: [], bbrefCount: 0, why: 'control' }];
}
if (CONTROL === 'exccount') {
  const r = byId(record.players, 'bc-002'); const x = r && (r.titleExceptions || []).find((e) => e.year === 2024);
  mustHave(x && r.wsTitles && x.bbrefCount === r.wsTitles.length, "Kershaw's 2024 exception with both sources' count");
  x.bbrefCount += 1;
}
if (CONTROL === 'maysfranchises') {
  const m = byId(pool, 'bc-022'); mustHave(m && m.player.name === 'Willie Mays' && m.player.franchiseCount === 3 && m.player.teams.length === 4, "Mays's card: 4 club names, 3 franchises");
  m.player.franchiseCount = m.player.teams.length; // the count main showed: club names, not franchises
}
if (CONTROL === 'bbrefteam') {
  const r = byId(record.players, 'bc-010'); mustHave(r && same(r.teams.bbref, ['NYY']) && record.bbrefAbbreviations.NYM === 'New York Mets', "Judge's baseball-reference club NYY");
  r.teams.bbref = ['NYM']; // the right count, the wrong club
}
if (CONTROL === 'franchisesplit') {
  const r = byId(record.players, 'bc-026'); mustHave(r && same(r.teams.bbrefFranchise, ['LAD', 'LAD']) && same(r.teams.bbref, ['BRO', 'LAD']), "Koufax's two Dodgers clubs on one franchise page");
  r.teams.bbrefFranchise = ['BRO', 'LAD'];
}
if (CONTROL === 'retiredjudge') {
  // the reviewer's case: still playing in 2026 but classed retired, so his totals read exact with no asOf
  const r = byId(record.players, 'bc-010'); const c = byId(pool, 'bc-010');
  mustHave(r && r.status === 'active' && r.asOf && c && r.stats.some((s) => s.floor != null), "Judge active with floors");
  r.status = 'retired'; delete r.asOf; delete r.currentTeam;
  r.stats.forEach((s, i) => {
    delete s.asOf;
    if (s.floor != null) { delete s.floor; s.text = s.text.replace(/^[\d,]+\+/, Number(s.mlb).toLocaleString('en-US')); }
    c.player.stats[i] = s.text;
  });
  for (const a of r.awards) delete a.asOf;
}
if (CONTROL === 'stale') {
  mustHave(/^\d{4}-\d{2}-\d{2}$/.test(record.rereadBy || ''), 'the record\'s rereadBy date');
  TODAY = new Date(Date.parse(`${record.rereadBy}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}
if (CONTROL === 'roster') {
  const r = byId(record.players, 'bc-010'); mustHave(r && r.currentTeam && r.currentTeam.team === 'New York Yankees', "Judge's 2026 club");
  r.currentTeam.team = 'New York Mets';
}

// ---- the checks ----
const results = {};
const section = (n, title, fn) => { const bad = []; fn((msg) => bad.push(msg)); results[n] = { title, bad }; };
// the game's own guess rule (src/lib/careerGuess.ts), bundled here so this check and the hook cannot drift apart
const { foldName: fold, surnameOf: surname } = await (async () => {
  const out = await build({ entryPoints: [path.join(ROOT, 'src/lib/careerGuess.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
})();
const fmt = (n) => Number(n).toLocaleString('en-US');

section(1, 'pool shape: one row per record row, unique ids, names and surnames, no dashes', (fail) => {
  if (pool.length !== record.players.length) fail(`data has ${pool.length} rows, record ${record.players.length}`);
  for (const [what, key] of [['id', (p) => p.id], ['name', (p) => fold(p.player.name)], ['surname', (p) => surname(p.player.name)]]) {
    const seen = new Map();
    for (const p of pool) { const k = key(p); if (seen.has(k)) fail(`duplicate ${what} "${k}": ${seen.get(k)} and ${p.id}`); else seen.set(k, p.id); }
  }
  const dash = src.match(/[\u2013\u2014]/g); if (dash) fail(`${dash.length} em or en dashes in the data file`);
});

section(2, 'every shown line equals the record', (fail) => {
  for (const p of pool) {
    const r = byId(record.players, p.id);
    if (!r) { fail(`${p.id} ${p.player.name}: no record row`); continue; }
    const want = {
      name: r.name, position: r.position.text, draftInfo: r.draftInfo.text, firstTeam: r.firstTeam.text,
      teams: r.teams.text, stats: r.stats.map((s) => s.text), awards: r.awards.map((a) => a.text),
      franchiseCount: r.teams.franchises,
    };
    for (const [k, v] of Object.entries(want)) if (!same(p.player[k], v)) fail(`${p.id} ${p.player.name} ${k}: shows ${JSON.stringify(p.player[k])}, record ${JSON.stringify(v)}`);
  }
  for (const r of record.players) if (!byId(pool, r.id)) fail(`record row ${r.id} ${r.name} is not in the game`);
});

// The record's own rules, restated so a line can be rebuilt from its evidence.
const ord = (n) => { n = Number(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const floorOf = (n) => (n >= 100 ? Math.floor(n / 10) * 10 : n >= 10 ? Math.floor(n / 5) * 5 : n);
const LABEL = { avg: 'AVG', hr: 'HR', rbi: 'RBI', h: 'Hits', w: 'W', era: 'ERA', so: 'SO', sv: 'SV' };
const POS = { Centerfielder: 'Center Fielder', Rightfielder: 'Right Fielder', Leftfielder: 'Left Fielder' };
function awardText(k, n, years, ids) {
  const lg = ids.length === 1 && /^(AL|NL)/.test(ids[0]) ? ids[0].slice(0, 2) + ' ' : '';
  const many = (one, label) => (n === 1 ? one : `${n}× ${label}`);
  switch (k) {
    case 'mvp': return many(`${lg}MVP (${years[0]})`, `${lg}MVP`);
    case 'cy': return many(`${lg}Cy Young (${years[0]})`, `${lg}Cy Young`);
    case 'roy': return `${lg}Rookie of the Year (${years[0]})`;
    case 'ws': return n === 1 ? `${years[0]} World Series Champion` : n <= 4 ? `${n}× World Series Champion (${years.join(', ')})` : `${n}× World Series Champion`;
    case 'wsMvp': return many(`${years[0]} World Series MVP`, 'World Series MVP');
    case 'hof': return `Hall of Fame (${years[0]})`;
    case 'allStar': return many(`All-Star (${years[0]})`, 'All-Star');
    case 'goldGlove': return many(`Gold Glove (${years[0]})`, 'Gold Glove');
    case 'silverSlugger': return many(`Silver Slugger (${years[0]})`, 'Silver Slugger');
  }
  return null;
}

section(3, 'the record holds together: two hosts, both sides equal, every text rebuilt from its evidence', (fail) => {
  for (const [code, pg] of Object.entries(record.bbrefFranchisePages || {})) {
    let host = ''; try { host = new URL(pg.url).host; } catch { /* fails below */ }
    if (host !== 'www.baseball-reference.com' || !/^\d{4}-\d{2}-\d{2}$/.test(pg.on || '')) fail(`franchise page ${code}: ${pg.url} read ${pg.on} is not a dated baseball-reference page`);
  }
  for (const r of record.players) {
    const tag = `${r.id} ${r.name}`;
    const hosts = (r.src || []).map((u) => { try { return new URL(u).host; } catch { return ''; } });
    if (hosts.length !== 2 || hosts[0] === hosts[1] || !hosts.includes('statsapi.mlb.com') || !hosts.includes('www.baseball-reference.com')) fail(`${tag}: sources ${JSON.stringify(r.src)} are not the league data plus baseball-reference`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.on || '')) fail(`${tag}: no read date`);
    const active = r.status === 'active';
    if (active && !r.asOf) fail(`${tag}: active with no asOf`);
    // position
    const first = (r.position.bbref || '').split(/, | and /)[0];
    const base = POS[first] || first;
    if (base === 'Pitcher') {
      const want = r.position.mlb.gs / r.position.mlb.g >= 0.5 ? 'Starting Pitcher' : 'Relief Pitcher';
      if (r.position.text !== want) fail(`${tag}: position ${r.position.text}, starts say ${want}`);
    } else if (!r.position.text.startsWith(base)) fail(`${tag}: position ${r.position.text}, baseball-reference lists ${first} first`);
    // draft
    const firstSeason = r.seasons[0][0];
    const d = r.draftInfo.mlb;
    let wantDraft;
    if (d && d.round) {
      const pickShown = typeof r.draftInfo.bbref === 'string' && r.draftInfo.bbref.includes(`in the ${ord(d.round)} round (${ord(d.pick)}) of the ${d.year}`);
      if (!r.draftInfo.bbref.includes(`in the ${ord(d.round)} round`) || !r.draftInfo.bbref.includes(`of the ${d.year} `)) fail(`${tag}: draft round or year not on baseball-reference's line`);
      wantDraft = pickShown ? `${ord(d.round)} Round, ${ord(d.pick)} Pick (${d.year})` : `${ord(d.round)} Round (${d.year})`;
    } else {
      wantDraft = `${firstSeason < 1965 ? 'Before the draft' : 'Not drafted'} (first season ${firstSeason})`;
      if (r.draftInfo.bbref.draftLine !== null || r.draftInfo.mlb.drafts.length) fail(`${tag}: a draft in one source but the card says none`);
    }
    if (r.draftInfo.text !== wantDraft) fail(`${tag}: draft ${r.draftInfo.text}, evidence says ${wantDraft}`);
    // teams
    const seq = []; for (const [, t] of r.seasons) if (!seq.includes(t)) seq.push(t);
    if (!same(r.teams.text, seq)) fail(`${tag}: teams ${JSON.stringify(r.teams.text)}, seasons give ${JSON.stringify(seq)}`);
    const bbNamed = (r.teams.bbref || []).map((ab) => record.bbrefAbbreviations[ab] || `unknown code ${ab}`);
    if (!same(bbNamed, seq)) fail(`${tag}: baseball-reference's clubs ${JSON.stringify(r.teams.bbref)} read ${JSON.stringify(bbNamed)}, the league ${JSON.stringify(seq)}`);
    // franchises: the league's team ids and baseball-reference's franchise pages group the clubs the same way
    const ids = r.teams.mlbIds || []; const fr = r.teams.bbrefFranchise || [];
    if (ids.length !== seq.length || fr.length !== seq.length) fail(`${tag}: ${ids.length} league team ids and ${fr.length} franchise codes for ${seq.length} clubs`);
    for (const [i, code] of fr.entries()) if (code !== (r.teams.bbref || [])[i] && !(record.bbrefFranchisePages || {})[code]) fail(`${tag}: ${seq[i]} is put on franchise ${code}, a page the record never read`);
    for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) {
      if ((ids[i] === ids[j]) !== (fr[i] === fr[j])) fail(`${tag}: the league ${ids[i] === ids[j] ? 'joins' : 'splits'} ${seq[i]} and ${seq[j]}, baseball-reference does not`);
    }
    if (r.teams.franchises !== new Set(ids).size) fail(`${tag}: franchises ${r.teams.franchises}, the league's team ids give ${new Set(ids).size}`);
    if (r.firstTeam.text !== seq[0]) fail(`${tag}: first team ${r.firstTeam.text}, seasons start with ${seq[0]}`);
    // stats
    for (const s of r.stats) {
      if (String(s.mlb) !== String(s.bbref)) fail(`${tag}: ${s.key} league ${s.mlb}, baseball-reference ${s.bbref}`);
      const label = LABEL[s.key];
      if (s.key === 'avg' || s.key === 'era') {
        if (s.text !== `${s.mlb} ${label}`) fail(`${tag}: ${s.text} is not ${s.mlb} ${label}`);
        if (active && !s.asOf) fail(`${tag}: ${s.text} is a rate on an active player with no asOf`);
      } else if (active) {
        if (s.value !== Number(s.mlb) || s.floor !== floorOf(s.value) || s.floor > s.value) fail(`${tag}: ${s.text} floor ${s.floor} for a total of ${s.value}, the rule gives ${floorOf(s.value)}`);
        if (s.text !== `${fmt(s.floor)}+ ${label}`) fail(`${tag}: ${s.text} is not ${fmt(s.floor)}+ ${label}`);
      } else if (s.text !== `${fmt(s.mlb)} ${label}`) fail(`${tag}: ${s.text} is not ${fmt(s.mlb)} ${label}`);
    }
    // awards
    for (const a of r.awards) {
      if (a.key === 'hof' ? !String(a.bbref).includes(`in ${a.years[0]}.`) : a.n !== a.bbref) fail(`${tag}: ${a.text} league ${a.n}, baseball-reference ${a.bbref}`);
      if (a.key !== 'allStar' && a.n !== a.years.length) fail(`${tag}: ${a.text} counts ${a.n} but lists ${a.years.length} years`);
      const want = awardText(a.key, a.n, a.years, a.mlbIds);
      if (a.text !== want) fail(`${tag}: award ${a.text}, evidence says ${want}`);
      if (active && !a.asOf) fail(`${tag}: ${a.text} on an active player with no asOf`);
    }
    for (const h of r.held || []) if (!h.fact || !h.why) fail(`${tag}: a held fact with no reason`);
  }
});

section(4, 'teammates agree on every World Series title', (fail) => {
  const P = record.players;
  const holds = (q, y) => (q.wsTitles || []).some((t) => t.year === y);
  const excused = (q, y) => (q.titleExceptions || []).some((x) => x.year === y);
  const needed = new Set();
  for (const p of P) for (const t of p.wsTitles || []) for (const q of P) {
    if (q === p || !q.seasons.some(([y, c]) => y === t.year && c === t.team)) continue;
    if (holds(q, t.year)) continue;
    needed.add(`${q.id}:${t.year}`);
    if (!excused(q, t.year)) fail(`${p.name} won the ${t.year} World Series with the ${t.team}; teammate ${q.name} was on that club that season and neither holds it nor is listed as an exception`);
  }
  for (const q of P) for (const x of q.titleExceptions || []) {
    if (!needed.has(`${q.id}:${x.year}`)) fail(`${q.name}: exception for ${x.year} no longer matches any teammate's title`);
    if (q.wsTitles && (!Array.isArray(x.mlbYears) || x.mlbYears.includes(String(x.year)) || x.bbrefCount !== q.wsTitles.length)) fail(`${q.name}: exception for ${x.year} is not what both sources say`);
  }
  // the cards: a title line shows exactly the record's titles
  for (const p of pool) {
    const r = byId(record.players, p.id); if (!r) continue;
    for (const line of p.player.awards.filter((a) => /World Series Champion/.test(a))) {
      const years = r.wsTitles ? r.wsTitles.map((t) => t.year) : null;
      if (!years) { fail(`${p.player.name}: shows "${line}" while the record holds his titles back`); continue; }
      const listed = (line.match(/\b(18|19|20)\d\d\b/g) || []).map(Number);
      const count = Number((line.match(/^(\d+)×/) || [, 1])[1]);
      if (count !== years.length || (listed.length && !same(listed, years))) fail(`${p.player.name}: shows "${line}", the record has ${years.join(', ')}`);
    }
  }
});

section(5, 'every active player is on the club the 2026 rosters list him under, and no retired one is on them', (fail) => {
  const clubOf = new Map();
  for (const t of Object.values(rosters.teams)) for (const x of t.players || []) clubOf.set(x.name, t.club);
  for (const r of record.players) {
    if (r.status !== 'active') {
      // a row classed retired must not still be playing: his totals would show exact, with no floor and no asOf
      const last = r.seasons[r.seasons.length - 1];
      if (last[0] >= 2026) fail(`${r.name}: classed retired but his seasons run to ${last.join(' ')}`);
      if (clubOf.has(r.mlbName)) fail(`${r.name}: classed retired but the 2026 rosters list him under ${clubOf.get(r.mlbName)}`);
      if (r.currentTeam || r.asOf) fail(`${r.name}: classed retired but carries a current club or an asOf`);
      continue;
    }
    const c = r.currentTeam;
    if (!c) { fail(`${r.name}: active with no current club`); continue; }
    const listed = clubOf.get(r.mlbName);
    if (c.team !== listed) fail(`${r.name}: record says ${c.team}, the 2026 rosters list him under ${listed || 'no club'}`);
    const last = r.seasons[r.seasons.length - 1];
    if (last[0] !== 2026 || last[1] !== c.team) fail(`${r.name}: last season ${last.join(' ')} is not ${c.team} in 2026`);
    const card = byId(pool, r.id);
    if (card && !card.player.teams.includes(c.team)) fail(`${r.name}: card teams leave out his current club ${c.team}`);
  }
});

section(6, 'the read is still current: today is on or before rereadBy, and every active line is dated to the read', (fail) => {
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!day.test(record.read || '') || !day.test(record.rereadBy || '') || !(record.rereadBy > record.read)) fail(`read ${record.read} and rereadBy ${record.rereadBy} are not two dates in order`);
  if (TODAY > record.rereadBy) fail(`today is ${TODAY}, past rereadBy ${record.rereadBy}: the 2026 World Series and the November awards may have made exact lines on active players stale. Rerun the chain in scripts/mlbCareerPath/ with fresh pages, then move rereadBy on.`);
  for (const r of record.players) {
    if (r.on !== record.read) fail(`${r.name}: read on ${r.on}, the record on ${record.read}`);
    if (r.status !== 'active') continue;
    // career totals run to the last day of the 2026 regular season; the row and its awards to the read
    for (const s of r.stats) if (s.asOf !== record.seasonEnd) fail(`${r.name}: ${s.text} is dated ${s.asOf}, not the season's end ${record.seasonEnd}`);
    for (const x of [r, ...r.awards]) if (x.asOf !== r.on) fail(`${r.name}: ${x.text || 'row'} is dated ${x.asOf}, not the read ${r.on}`);
  }
});

// ---- report ----
let failed = 0;
for (const [n, { title, bad }] of Object.entries(results)) {
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${n}. ${title}${bad.length ? ` (${bad.length})` : ''}`);
  for (const b of bad.slice(0, 8)) console.log(`       ${b}`);
  if (bad.length > 8) console.log(`       ...and ${bad.length - 8} more`);
  failed += bad.length ? 1 : 0;
}
const active = record.players.filter((r) => r.status === 'active').length;
console.log(`${pool.length} players (${active} active), ${pool.reduce((s, p) => s + 3 + p.player.teams.length + p.player.stats.length + p.player.awards.length, 0)} shown lines checked against ${record.players.length} record rows`);
if (CONTROL) {
  const target = CONTROL_SECTION[CONTROL];
  if (!results[target].bad.length) { console.log(`CONTROL ${CONTROL} DID NOT FIRE: section ${target} stayed green`); process.exit(2); }
  console.log(`CONTROL ${CONTROL} fired in section ${target} (exit 1 is the expected result)`);
  process.exit(1);
}
console.log(failed ? `simMlbCareerPathFacts: ${failed} section(s) FAILED` : `simMlbCareerPathFacts: all ${Object.keys(results).length} sections green`);
process.exit(failed ? 1 : 0);
