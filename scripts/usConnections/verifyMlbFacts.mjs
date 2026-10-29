/**
 * Round 1558: the second host for every baseball fact the round owes two.
 *
 * The record (scripts/data/baseballConnectionsRecord-2026-10.json) is one
 * host: the league's data service for each man, and one documented page for
 * each closed list. This reads a second, independent host for each fact the
 * round rests on (every member of a group the checker flagged, and the fact
 * behind every finding), and writes the pair into the ledger
 * scripts/data/baseballConnectionsVerified-2026-10.json. A fact the two hosts
 * do not agree on is printed and never written as agreed.
 *
 * Second hosts: baseball-reference.com (award, leader, birthplace, franchise
 * register and player pages), baseball-almanac.com (no-hitters, the Triple
 * Crown), ESPN (the 2023 World Baseball Classic final box), and, for the
 * schools, the league's own person record (independent of the school pages
 * of baseball-reference, which are the record's host for those lists).
 *
 *   node scripts/usConnections/verifyMlbFacts.mjs pages <work> <needs.json>     fetch what is missing (MAX a run, paced)
 *   node scripts/usConnections/verifyMlbFacts.mjs facts <work> <needs.json> <out.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page, rows, text, meta } from './sportsRef.mjs';
import { SHARE_FITS, SHARE_OUT } from '../lib/usConnectionsCheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, needsArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/verify');
const MAX = Number(process.env.MAX ?? 25);
const BR = 'https://www.baseball-reference.com';
export const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');

export const CLUB_CODES = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC', 113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KCR', 119: 'LAD', 120: 'WSN', 121: 'NYM', 133: 'OAK', 134: 'PIT', 135: 'SDP', 136: 'SEA', 137: 'SFG', 138: 'STL',
  139: 'TBR', 140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI', 144: 'ATL', 145: 'CHW', 146: 'FLA', 147: 'NYY', 158: 'MIL',
};
export const COUNTRY_PAGES = {
  dominicanrepublic: 'Dominican-Republic', venezuela: 'Venezuela', puertorico: 'Puerto-Rico', cuba: 'Cuba', japan: 'Japan',
  mexico: 'Mexico', panama: 'Panama', curacao: 'Curacao', colombia: 'Colombia', southkorea: 'South-Korea', australia: 'Australia',
  canada: 'Canada',
};
export const LIST_PAGES = {
  mvp: `${BR}/awards/mvp.shtml`, cya: `${BR}/awards/cya.shtml`, roy: `${BR}/awards/roy.shtml`, postmvp: `${BR}/awards/postmvp.shtml`,
  asmvp: `${BR}/awards/asmvp.shtml`, ggal: `${BR}/awards/gold_glove_al.shtml`, ggnl: `${BR}/awards/gold_glove_nl.shtml`,
  ssal: `${BR}/awards/silver_slugger_al.shtml`, ssnl: `${BR}/awards/silver_slugger_nl.shtml`, hof: `${BR}/awards/hof.shtml`,
  hofbat: `${BR}/awards/hof_batting.shtml`, hofpitch: `${BR}/awards/hof_pitching.shtml`, titles: `${BR}/awards/batting-titles.shtml`,
  hrcar: `${BR}/leaders/HR_career.shtml`, hcar: `${BR}/leaders/H_career.shtml`, wcar: `${BR}/leaders/W_career.shtml`,
  socar: `${BR}/leaders/SO_p_career.shtml`, svcar: `${BR}/leaders/SV_career.shtml`, bacar: `${BR}/leaders/batting_avg_career.shtml`,
  hrseason: `${BR}/leaders/HR_season.shtml`, sbseason: `${BR}/leaders/SB_season.shtml`, ws2024: `${BR}/postseason/2024_WS.shtml`,
  almNoHitAL: 'https://www.baseball-almanac.com/pitching/pinohit1.shtml', almNoHitNL: 'https://www.baseball-almanac.com/pitching/pinohit2.shtml',
  almTripleCrown: 'https://www.baseball-almanac.com/awards/aw_triph.shtml',
  almPitchingTripleCrown: 'https://www.baseball-almanac.com/awards/pitrip.shtml',
};
export const ESPN_WBC_FINAL = 'https://site.api.espn.com/apis/site/v2/sports/baseball/world-baseball-classic/summary?event=401507523';

const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/baseballConnectionsRecord-2026-10.json'), 'utf8'));
const manOf = name => record.men[name] ?? Object.entries(record.men).find(([n]) => fold(n) === fold(name))?.[1] ?? null;
export const playerUrl = id => `${BR}/players/${id[0]}/${id}.shtml`;

/** The kinds a man's own page answers on the second host. */
const NEEDS_PLAYER_PAGE = new Set(['bats', 'firstPick', 'undrafted', 'starter', 'posEra', 'hofPos', 'hofPitcher', 'wsClubs', 'season', 'born']);

/* Every man's own page on the second host: it carries his birthplace, bats and throws, draft, relatives, his
   clubs, positions, awards and totals season by season, and his career line, so one page answers every
   per man fact; the list pages answer the lists. */
function pagesFor(needs) {
  const want = new Map();
  for (const [k, u] of Object.entries(LIST_PAGES)) want.set(k, u);
  for (const n of needs) {
    const m = manOf(n.name);
    if (m?.bbref) want.set(`p_${m.bbref}`, playerUrl(m.bbref));
  }
  return want;
}

if (step === 'refetch') {
  /* a page cut short (a full disk once wrote 31 bytes) is read again over itself */
  for (const f of fs.readdirSync(WORK)) {
    if (!f.endsWith('.html') || fs.statSync(path.join(WORK, f)).size >= 5000) continue;
    const key = f.slice(0, -5);
    const url = fs.existsSync(path.join(WORK, key + '.url')) ? fs.readFileSync(path.join(WORK, key + '.url'), 'utf8')
      : key.startsWith('p_') ? playerUrl(key.slice(2)) : (LIST_PAGES[key] ?? null);
    if (!url) continue;
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const t = await r.text();
    if (r.status === 200 && t.length >= 5000) fs.writeFileSync(path.join(WORK, f), t);
    console.log(key, r.status, t.length);
  }
}

if (step === 'pages') {
  const needs = JSON.parse(fs.readFileSync(needsArg, 'utf8')).needs;
  const want = pagesFor(needs);
  /* PLAYERS_ONLY=1 (Round 1567): only the men's own pages, for needs whose kinds read nothing else (a position
     share, seasons with a club, a birthplace), so a run does not spend two minutes on 24 list pages it never reads */
  if (process.env.PLAYERS_ONLY) for (const k of [...want.keys()]) if (!k.startsWith('p_')) want.delete(k);
  let n = 0;
  let missing = 0;
  for (const [k, u] of want) {
    if (fs.existsSync(path.join(WORK, k + '.html'))) continue;
    missing += 1;
    if (n >= MAX) continue;
    n += 1;
    const p = await page(WORK, k, u);
    if (!p) console.log('FAILED', k, u);
  }
  const espn = path.join(WORK, 'espn_wbc_final.json');
  if (!fs.existsSync(espn)) {
    const r = await fetch(ESPN_WBC_FINAL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (r.ok) fs.writeFileSync(espn, await r.text());
  }
  console.log(`pages: ${want.size} wanted, ${missing - n} still missing after fetching ${n}`);
}

/* ---------------------------------------------------------------- */
/* the second host, read                                             */
/* ---------------------------------------------------------------- */

/* baseball-reference team abbreviations -> the record's club ids (moves folded into the franchise) */
export const BR_CLUBS = {
  ANA: 108, CAL: 108, LAA: 108, ARI: 109, BAL: 110, SLB: 110, MLA: 110, BOS: 111, CHC: 112, CIN: 113, CLE: 114, COL: 115,
  DET: 116, HOU: 117, KCR: 118, LAD: 119, BRO: 119, MON: 120, WSN: 120, NYM: 121, OAK: 133, PHA: 133, KCA: 133, ATH: 133,
  PIT: 134, SDP: 135, SEA: 136, SFG: 137, NYG: 137, STL: 138, TBD: 139, TBR: 139, TEX: 140, WSA: 140, TOR: 141, MIN: 142,
  WSH: 142, PHI: 143, ATL: 144, BSN: 144, MLN: 144, CHW: 145, FLA: 146, MIA: 146, NYY: 147, NYH: 147, BLA: 147, MIL: 158,
  SEP: 158,
};
const POS_DIGIT = { 1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF', D: 'DH', O: 'OF' };
/* the two letter country mark after a birthplace -> the checker's folded country */
const BORN_CODES = { us: 'usa', do: 'dominicanrepublic', ve: 'venezuela', pr: 'puertorico', cu: 'cuba', jp: 'japan', mx: 'mexico',
  pa: 'panama', cw: 'curacao', co: 'colombia', kr: 'southkorea', au: 'australia', ca: 'canada', aw: 'aruba', jm: 'jamaica' };

/** A player page of baseball-reference, read into the facts the round needs. */
export function parsePlayerPage(html) {
  const mt = meta(html).replace(/&bull;/g, ' ');
  const out = { meta: mt };
  /* the place ends in a two letter country mark, then the next field of the block ("San Pedro de Macoris"
     holds a two letter word of its own, so the mark is the one a field label follows) */
  const NEXT = '(?=\\s+(?:Draft|High School|College|Schools?|Debut|Died|Buried|Relatives|Rookie Status|Last Game|Hall of Fame|Full Name|Nicknames|Agents|National Team|Team|Name Note|View|Pronunciation|Instagram|Twitter|More bio)\\b|\\s*$)';
  const bm = mt.match(new RegExp(`Born:\\s*(.+?\\d{4}\\s+in\\s+.+?)\\s([a-z]{2})${NEXT}`));
  out.born = bm ? `${bm[1]} ${bm[2]}` : null;
  out.bornCode = bm ? bm[2] : null;
  out.bats = (mt.match(/Bats:\s*(Left|Right|Both)/) ?? [])[1] ?? null;
  out.throws = (mt.match(/Throws:\s*(Left|Right)/) ?? [])[1] ?? null;
  out.positions = (mt.match(/Positions?:\s*(.+?)\s+Bats:/) ?? [])[1] ?? null;
  out.drafts = [...mt.matchAll(/Drafted by the (.+?) in the (\d+)(?:st|nd|rd|th) round(?: \((\d+)(?:st|nd|rd|th)\))? of the (\d{4}) (.+? Draft)/g)]
    .map(m => ({ team: m[1], round: Number(m[2]), pick: m[3] ? Number(m[3]) : null, year: Number(m[4]), kind: m[5] }));
  out.relatives = (mt.match(/Relatives\s*:\s*(.+?)(?=\s+More bio|\s+(?:Debut|Last Game|Hall of Fame|Rookie Status|Agents|National Team|Full Name|Nicknames|High School|College|Schools)\b|$)/) ?? [])[1] ?? null;
  out.hof = (mt.match(/Hall of Fame\s*:\s*Inducted as Player in (\d{4})/) ?? [])[1] ?? null;
  out.last = (mt.match(/Last Game:\s*\w+ \d+, (\d{4})/) ?? [])[1] ?? null;
  const bi = html.indexOf('id="bling"');
  out.bling = bi >= 0 ? text(html.slice(bi, bi + 4000).split('</ul>')[0]).replace(/\s+/g, ' ') : '';
  const seasons = {};
  const seen = new Set();
  const ws = new Set();
  let career = null;
  let pcareer = null;
  for (const r of rows(html)) {
    const y = r.year_id ?? '';
    if (r.series_result !== undefined) {
      if (/^\d{4}$/.test(y) && r.ps_round === 'WS' && /^W/.test(r.series_result)) ws.add(`${y}|${r.team_name_abbr}`);
      continue;
    }
    if (r.date !== undefined) continue;
    if (/^\d+ Yrs$/.test(y)) {
      if (r.b_h !== undefined && r.b_hr !== undefined && !career) career = { H: Number(r.b_h), HR: Number(r.b_hr), SB: Number(r.b_sb), PA: Number(r.b_pa), AVG: r.b_batting_avg };
      if (r.p_w !== undefined && r.p_gs !== undefined && !pcareer) pcareer = { G: Number(r.p_g), GS: Number(r.p_gs), W: Number(r.p_w), SO: Number(r.p_so), SV: Number(r.p_sv) };
      /* the appearances table: his career games at each position */
      if (r.games_at_c !== undefined && !out.games) {
        const n = k => Number(r[`games_at_${k}`] || 0);
        out.games = { P: n('p'), C: n('c'), '1B': n('1b'), '2B': n('2b'), '3B': n('3b'), SS: n('ss'), LF: n('lf'), CF: n('cf'), RF: n('rf'), OF: n('of'), DH: n('dh') };
      }
      continue;
    }
    if (!/^\d{4}$/.test(y) || !r.team_name_abbr || r.comp_name_abbr === undefined) continue;
    const isBat = r.b_hr !== undefined && r.b_rbi !== undefined;
    const isPitch = r.p_gs !== undefined && r.p_w !== undefined;
    if (!isBat && !isPitch) continue;
    const key = `${isBat ? 'b' : 'p'}|${y}|${r.team_name_abbr}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = (seasons[y] ??= { teams: new Set(), awards: new Set(), lg: new Set() });
    const total = /^\d+TM$/.test(r.team_name_abbr);
    if (!total) { s.teams.add(r.team_name_abbr); s.lg.add(r.comp_name_abbr); }
    for (const a of String(r.awards ?? '').split(',')) if (a.trim()) s.awards.add(a.trim());
    if (isBat && (total || s.hr === undefined)) {
      Object.assign(s, { hr: Number(r.b_hr || 0), sb: Number(r.b_sb || 0), rbi: Number(r.b_rbi || 0) });
      const pos = String(r.pos ?? '').replace(/^\*/, '');
      const first = pos.match(/^([1-9DO])/);
      if (first) s.pos = POS_DIGIT[first[1]];
    }
    if (isPitch && (total || s.gs === undefined)) Object.assign(s, { gs: Number(r.p_gs || 0), g: Number(r.p_g || 0), w: Number(r.p_w || 0) });
  }
  out.seasons = seasons;
  out.career = career;
  out.pcareer = pcareer;
  out.wsWins = [...ws].map(k => k.split('|'));
  return out;
}

/** Links to player pages in a list page, with the text of the row each sits in. */
function pageRows(html) {
  const src = html.replace(/<!--|-->/g, ' ');
  const out = [];
  for (const m of src.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const ids = [...m[1].matchAll(/href="\/players\/[a-z]\/([a-z0-9.]+)\.shtml"/g)].map(x => x[1]);
    if (ids.length) out.push({ ids, text: text(m[1]) });
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* the facts step: both hosts, one verdict each                      */
/* ---------------------------------------------------------------- */

const POS_WORDS = { C: 'Catcher', '1B': 'First Baseman', '2B': 'Second Baseman', '3B': 'Third Baseman', SS: 'Shortstop',
  LF: 'Leftfielder', CF: 'Centerfielder', RF: 'Rightfielder', OF: 'Outfielder', DH: 'Designated Hitter', P: 'Pitcher' };
const AWARD_PAGE = { ALMVP: 'mvp', NLMVP: 'mvp', ALCY: 'cya', NLCY: 'cya', ALROY: 'roy', NLROY: 'roy', WSMVP: 'postmvp', ASMVP: 'asmvp' };
const hostOf = u => new URL(u).hostname.replace(/^www\./, '');

function listWinners(work, key) {
  const html = fs.readFileSync(path.join(work, key + '.html'), 'utf8');
  if (key === 'postmvp') {
    /* the World Series column: a player link followed by a series link ending _WS */
    const out = [];
    for (const m of html.replace(/<!--|-->/g, ' ').matchAll(/href="\/players\/[a-z]\/([a-z0-9.]+)\.shtml">[^<]*<\/a>(?:&nbsp;|\s)*<a title="series summary" href="\/postseason\/(\d{4})_WS\.shtml"/g)) out.push({ id: m[1], year: Number(m[2]), lg: 'WS' });
    return out;
  }
  return rows(html).filter(r => r._id && /^\d{4}$/.test(r.year_ID ?? '')).map(r => ({ id: r._id, year: Number(r.year_ID), lg: r.lg_ID }));
}

/** Share of a man's career games in the field at these positions, from the second host's appearances table. */
function shareBR(P, pos) {
  const g = P.games;
  if (!g) return null;
  const all = g.C + g['1B'] + g['2B'] + g['3B'] + g.SS + g.OF + g.DH;
  if (!all) return null;
  const at = pos.includes('OF') ? g.OF : pos.reduce((t, p) => t + (g[p] ?? 0), 0);
  return at / all;
}

function host2(work, n, m, P) {
  const c = n.crit;
  const page = m?.bbref ? playerUrl(m.bbref) : null;
  const need = (v, says, url = page) => ({ v, says, url });
  if (c.kind === 'recordList') {
    const key = c.keys.join('+');
    if (key === 'noHitters') {
      const t = text(fs.readFileSync(path.join(work, 'almNoHitAL.html'), 'utf8') + fs.readFileSync(path.join(work, 'almNoHitNL.html'), 'utf8'));
      const on = fold(t).includes(fold(n.name));
      return need(on, on ? `${n.name} is in Baseball Almanac's American or National League no-hitter list` : `${n.name} is in neither league's no-hitter list`, LIST_PAGES.almNoHitAL);
    }
    if (key === 'tripleCrownBatting') {
      const t = text(fs.readFileSync(path.join(work, 'almTripleCrown.html'), 'utf8'));
      const on = fold(t).includes(fold(n.name));
      return need(on, on ? `${n.name} is in Baseball Almanac's batting Triple Crown list` : `${n.name} is not in the batting Triple Crown list`, LIST_PAGES.almTripleCrown);
    }
    if (key === 'tripleCrownBatting+tripleCrownPitching') {
      const t = text(fs.readFileSync(path.join(work, 'almTripleCrown.html'), 'utf8') + fs.readFileSync(path.join(work, 'almPitchingTripleCrown.html'), 'utf8'));
      const on = fold(t).includes(fold(n.name));
      return need(on, on ? `${n.name} is in Baseball Almanac's batting or pitching Triple Crown list` : `${n.name} is in neither Triple Crown list`, LIST_PAGES.almPitchingTripleCrown);
    }
    if (key === 'battingTitles') {
      const titles = rows(fs.readFileSync(path.join(work, 'titles.html'), 'utf8'));
      const src = fs.readFileSync(path.join(work, 'titles.html'), 'utf8').replace(/<!--|-->/g, ' ');
      const years = [];
      let year = null;
      for (const r of src.matchAll(/<tr>\s*<td>([^<]*)<\/td>\s*<td><a href="\/leagues\/(AL|NL)\/(\d{4})\.shtml">[^<]*<\/td>\s*<td><a href="\/players\/[a-z]\/([a-z0-9.]+)\.shtml">/g)) {
        year = Number(r[3]);
        if (r[4] === m?.bbref) years.push(`${r[2]} ${year}`);
      }
      void titles;
      const recent = years.filter(y => Number(y.slice(3)) >= 2010);
      return need(recent.length > 0, recent.length ? `batting title ${recent.join(', ')}` : `no batting title from 2010 on${years.length ? ` (earlier: ${years.join(', ')})` : ''}`, LIST_PAGES.titles);
    }
    if (key === 'vanderbilt' || key === 'lsu') {
      const raw = JSON.parse(fs.readFileSync(path.join(ROOT, '.tmp-fx/mlbwork/person', `${m.id}.json`), 'utf8')).people[0];
      const schools = [...(raw.education?.colleges ?? []).map(x => x.name), ...(raw.drafts ?? []).map(d => d.school?.name).filter(Boolean)];
      const re = key === 'lsu' ? /louisiana state|\blsu\b/i : /vanderbilt/i;
      const on = schools.some(s => re.test(s));
      return need(on, `the league's person record names ${schools.length ? schools.join('; ') : 'no college'}`, `https://statsapi.mlb.com/api/v1/people/${m.id}?hydrate=education,draft`);
    }
    if (key === 'wbc2023Final') {
      const j = JSON.parse(fs.readFileSync(path.join(work, 'espn_wbc_final.json'), 'utf8'));
      const names = [];
      for (const t of j.boxscore?.players ?? []) for (const st of t.statistics ?? []) for (const a of st.athletes ?? []) names.push(a.athlete?.displayName);
      const on = names.some(x => fold(x) === fold(n.name));
      return need(on, on ? `${n.name} is in ESPN's box score of the final` : `${n.name} is not in ESPN's box score of the final`, ESPN_WBC_FINAL);
    }
    if (key === 'fatherSon') {
      if (!P) return null;
      const on = /\b(Son|Father) of\b/.test(P.relatives ?? '');
      return need(on, P.relatives ? `Relatives: ${P.relatives}` : 'his page lists no relatives');
    }
    return null;
  }
  if (['award', 'mvpBoth', 'mvpRun'].includes(c.kind)) {
    const codes = c.kind === 'award' ? c.codes : ['ALMVP', 'NLMVP'];
    const pages = [...new Set(codes.map(k => AWARD_PAGE[k]))];
    const wins = pages.flatMap(k => listWinners(work, k)).filter(w => w.id === m?.bbref);
    const ys = wins.map(w => w.year);
    let v;
    if (c.kind === 'mvpBoth') v = wins.some(w => w.lg === 'AL') && wins.some(w => w.lg === 'NL');
    else if (c.kind === 'mvpRun') v = ys.some(y => ys.includes(y + 1));
    else v = ys.some(y => (c.from === undefined || y >= c.from) && (c.to === undefined || y <= c.to));
    return need(v, wins.length ? `${pages.join(', ')} list: ${wins.map(w => `${w.lg} ${w.year}`).join(', ')}` : `not on the ${pages.join(', ')} list`, LIST_PAGES[pages[0]]);
  }
  if (!P) return null;
  const seasons = Object.entries(P.seasons);
  switch (c.kind) {
    case 'born': {
      const at = BORN_CODES[P.bornCode] ?? P.bornCode;
      return need(at === c.country || (c.country === 'panama' && /Canal Zone|Panama/.test(P.born ?? '')), `Born: ${P.born}`);
    }
    case 'club': {
      const yrs = seasons.filter(([, s]) => [...s.teams].some(t => BR_CLUBS[t] === c.id)).map(([y]) => y);
      const v = c.legend ? (yrs.length >= 5 ? true : yrs.length === 0 ? false : null) : yrs.length > 0;
      return need(v, yrs.length ? `seasons with the club: ${yrs.length} (${yrs[0]} to ${yrs[yrs.length - 1]})` : 'no season with the club');
    }
    case 'wsClubs': {
      const clubs = new Set(P.wsWins.map(([, t]) => BR_CLUBS[t] ?? t));
      return need(clubs.size >= c.min, P.wsWins.length ? `won the World Series ${P.wsWins.map(([y, t]) => `${y} ${t}`).join(', ')}` : 'never on a World Series winner in a World Series game');
    }
    case 'wsWith': {
      const v = P.wsWins.some(([y, t]) => Number(y) === c.season && BR_CLUBS[t] === c.club);
      return need(v, P.wsWins.length ? `won the World Series ${P.wsWins.map(([y, t]) => `${y} ${t}`).join(', ')}` : 'no World Series won');
    }
    case 'awardAt': {
      const tag = c.codes[0].endsWith('GG') ? 'GG' : 'SS';
      const set = new Set(c.pos);
      const won = seasons.filter(([, s]) => s.awards.has(tag));
      const v = won.some(([, s]) => set.has(s.pos));
      return need(v, won.length ? `${tag === 'GG' ? 'Gold Glove' : 'Silver Slugger'} seasons, with that season's most played position: ${won.map(([y, s]) => `${y} ${s.pos}`).join(', ')}` : `no ${tag === 'GG' ? 'Gold Glove' : 'Silver Slugger'}`);
    }
    case 'career': {
      const val = ['W', 'SO', 'SV'].includes(c.stat) ? P.pcareer?.[c.stat] : P.career?.[c.stat];
      if (c.pitcher && !P.pcareer) return need(false, 'never pitched');
      return need((val ?? 0) >= c.min, `career ${c.stat} ${val ?? 0}`);
    }
    case 'avg300': {
      const last = P.last ? Number(P.last) : 9999;
      const v = (P.career?.PA ?? 0) >= 3000 && last >= c.since && Number(P.career?.AVG) >= 0.2995;
      return need(v, `career ${P.career?.AVG} in ${P.career?.PA} PA, last game ${P.last ?? 'still playing'}`);
    }
    case 'season': {
      const stat = ['hr', 'sb', 'rbi'][c.i];
      const hits = seasons.filter(([y, s]) => (c.from === undefined || Number(y) >= c.from) && (c.to === undefined || Number(y) <= c.to) && (s[stat] ?? 0) >= c.min && (!c.at || s.pos === c.at));
      return need(hits.length >= (c.count ?? 1), hits.length ? `seasons: ${hits.map(([y, s]) => `${y} ${s[stat]}${c.at ? ` (${s.pos})` : ''}`).join(', ')}` : `no season of ${c.min} ${stat}${c.at ? ` at ${c.at}` : ''}`);
    }
    case 'bats': {
      const side = P.bats === 'Both' ? 'S' : P.bats === 'Left' ? 'L' : 'R';
      const shp = c.pos ? shareBR(P, c.pos) : 1;
      const posOk = !c.pos || (shp !== null && shp >= SHARE_FITS);
      return need(side === c.side && posOk, `Bats: ${P.bats}; Positions: ${P.positions}`);
    }
    case 'starter': {
      const g = P.pcareer?.G ?? 0;
      const r = g ? P.pcareer.GS / g : 0;
      const hand = P.throws === 'Left' ? 'L' : 'R';
      return need(hand === c.hand && r >= 0.5, `Throws: ${P.throws}; ${P.pcareer?.GS ?? 0} starts in ${g} games`);
    }
    case 'firstPick': {
      const v = P.drafts.some(d => d.round === 1 && d.pick === 1 && /Amateur/.test(d.kind));
      return need(v, P.drafts.length ? P.drafts.map(d => `${d.year} ${d.kind}, round ${d.round}${d.pick ? ` (${d.pick})` : ''}, ${d.team}`).join('; ') : 'no draft line');
    }
    case 'undrafted': {
      const am = P.drafts.filter(d => /Amateur/.test(d.kind));
      const v = am.length === 0 && (!c.allStar || /All-Star/.test(P.bling));
      return need(v, am.length ? `Draft: ${am.map(d => `${d.year} round ${d.round}, ${d.team}`).join('; ')}` : `no amateur draft line${c.allStar ? `; ${/All-Star/.test(P.bling) ? 'an All-Star' : 'never an All-Star'}` : ''}`);
    }
    case 'hofPos': {
      /* the share rule on the second host's own games by position (the appearances table): 35 percent of his
         games there fits (30 before Round 1567), under a tenth does not, between is unknown, as the record judges it */
      const sh = shareBR(P, c.pos);
      const v = !P.hof ? false : sh === null ? null : sh >= SHARE_FITS ? true : sh < SHARE_OUT ? false : null;
      return need(v, `${P.hof ? `Hall of Fame ${P.hof}` : 'not in the Hall of Fame'}; Positions: ${P.positions}; share of games at ${c.pos.join('/')}: ${sh === null ? 'unknown' : sh.toFixed(2)}`);
    }
    case 'hofPitcher': {
      const g = P.pcareer?.G ?? 0;
      const r = g ? P.pcareer.GS / g : 0;
      const hand = P.throws === 'Left' ? 'L' : 'R';
      let v = !!P.hof && /Pitcher/.test(P.positions ?? '') && (!c.hand || hand === c.hand);
      if (v && c.role === 'start') v = r >= 0.5;
      if (v && c.role === 'relief') v = r <= 0.2 || (P.pcareer?.SV ?? 0) >= 150;
      return need(v, `${P.hof ? `Hall of Fame ${P.hof}` : 'not in the Hall of Fame'}; Throws: ${P.throws}; ${P.pcareer?.GS ?? 0} starts in ${g} games, ${P.pcareer?.SV ?? 0} saves`);
    }
    case 'posEra': {
      const last = P.last ? Number(P.last) : 9999;
      const sh = shareBR(P, c.pos);
      const v = last < c.since || /^Pitcher/.test(P.positions ?? '') ? false : sh === null ? null : sh >= SHARE_FITS ? true : sh < SHARE_OUT ? false : null;
      return need(v, `Positions: ${P.positions}; share of games at ${c.pos.join('/')}: ${sh === null ? 'unknown' : sh.toFixed(2)}; last game ${P.last ?? 'still playing'}`);
    }
    default: return null;
  }
}

if (step === 'facts') {
  const us = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs')).href);
  const { checker } = us.makeUsChecker(ROOT, 'baseball');
  const needs = JSON.parse(fs.readFileSync(needsArg, 'utf8')).needs;
  const facts = [];
  const problems = [];
  const pages = new Map();
  for (const n of needs) {
    const m = manOf(n.name);
    if (!n.crit) { problems.push(`${n.id} ${n.name} "${n.label}": no criterion`); continue; }
    const v1 = checker.fits(n.name, n.crit);
    let P = null;
    if (m?.bbref) {
      if (!pages.has(m.bbref)) {
        const f = path.join(WORK, `p_${m.bbref}.html`);
        pages.set(m.bbref, fs.existsSync(f) ? parsePlayerPage(fs.readFileSync(f, 'utf8')) : null);
      }
      P = pages.get(m.bbref);
    }
    const e2 = host2(WORK, n, m, P);
    const h1url = n.crit.kind === 'recordList' ? record.lists[n.crit.keys[0]].source : `https://statsapi.mlb.com/api/v1/people/${m?.id}`;
    const e1 = { host: hostOf(h1url), url: h1url, says: says1(n, m) };
    if (!e2) { problems.push(`${n.id} ${n.name} "${n.label}": no second host page`); continue; }
    if (v1 !== n.expect || e2.v !== n.expect) {
      problems.push(`${n.id} ${n.name} "${n.label}" expect ${n.expect}: record ${v1}, second host ${e2.v} (${e2.says})`);
      continue;
    }
    facts.push({ id: n.id, label: n.label, name: n.name, holds: n.expect, why: n.why, ...(n.key ? { finding: n.key } : {}),
      sources: [e1, { host: hostOf(e2.url), url: e2.url, says: e2.says }] });
  }
  fs.writeFileSync(outArg, JSON.stringify(facts, null, 1));
  console.log(`facts: ${facts.length} agreed on two hosts, ${problems.length} not`);
  for (const p of problems) console.log('  ' + p);
}

/*
 * Round 1567: the pairs the record could not judge (a man between the share lines beside a position group, one to
 * four seasons beside a legends group), read on both hosts and written as they stand, agreed or not. A pair that
 * either host leaves between its lines, or that the two decide apart, is a coin toss on the record: the round took
 * the man off that board, and the ledger keeps both readings under grayPairs.
 *   node scripts/usConnections/verifyMlbFacts.mjs gray <work> <needs.json> <out.json>
 */
if (step === 'gray') {
  const us = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs')).href);
  const { checker } = us.makeUsChecker(ROOT, 'baseball');
  const needs = JSON.parse(fs.readFileSync(needsArg, 'utf8')).needs;
  const out = [];
  const problems = [];
  for (const n of needs) {
    const m = manOf(n.name);
    const f = m?.bbref ? path.join(WORK, `p_${m.bbref}.html`) : null;
    const P = f && fs.existsSync(f) ? parsePlayerPage(fs.readFileSync(f, 'utf8')) : null;
    const e2 = host2(WORK, n, m, P);
    if (!m || !e2) { problems.push(`${n.id} ${n.name} "${n.label}": ${m ? 'no second host page' : 'no record'}`); continue; }
    const v1 = checker.fits(n.name, n.crit);
    out.push({ id: n.id, label: n.label, name: n.name, listedUnder: n.listedUnder, sources: [
      { host: 'statsapi.mlb.com', url: `https://statsapi.mlb.com/api/v1/people/${m.id}`, says: says1(n, m), verdict: v1 ?? null },
      { host: hostOf(e2.url), url: e2.url, says: e2.says, verdict: e2.v ?? null },
    ] });
  }
  fs.writeFileSync(outArg, JSON.stringify(out, null, 1));
  console.log(`gray: ${out.length} pairs read on both hosts, ${problems.length} not`);
  for (const p of problems) console.log('  ' + p);
}

/** What the record (the first host) says, in a line. */
function says1(n, m) {
  const c = n.crit;
  if (c.kind === 'recordList') return `${n.expect ? 'on' : 'not on'} the list (${c.keys.join(' + ')})`;
  if (!m) return 'no record';
  const aw = codes => codes.map(k => `${k} ${(m.aw?.[k] ?? []).map(x => x[0]).join(' ') || 'none'}`).join('; ');
  switch (c.kind) {
    case 'born': return `birthCountry ${m.country}`;
    case 'club': return `seasons with club ${c.id}: ${m.fr?.[c.id] ?? 0}`;
    case 'mvpBoth': case 'mvpRun': return aw(['ALMVP', 'NLMVP']);
    case 'award': return aw(c.codes);
    case 'awardAt': return `${aw(c.codes)}; most played position those seasons: ${c.codes.flatMap(k => (m.aw?.[k] ?? []).map(x => `${x[0]} ${m.ss?.[x[0]]?.[3] ?? '?'}`)).join(', ') || 'none'}`;
    case 'wsClubs': case 'wsWith': return `WSCHAMP ${(m.aw?.WSCHAMP ?? []).map(x => `${x[0]} club ${x[1]}`).join(', ') || 'none'}`;
    case 'career': return `career ${c.stat} ${m.car?.[c.stat] ?? 0}`;
    case 'avg300': return `career AVG ${m.car?.AVG} in ${m.car?.PA} PA, last ${m.last ?? 'active'}`;
    case 'season': return `seasons at ${c.min}+: ${Object.entries(m.ss ?? {}).filter(([y, r]) => (r[c.i] ?? 0) >= c.min && (c.from === undefined || Number(y) >= c.from) && (c.to === undefined || Number(y) <= c.to) && (!c.at || r[3] === c.at)).map(([y, r]) => `${y} ${r[c.i]}`).join(', ') || 'none'}`;
    case 'bats': return `batSide ${m.bats}; games by position ${JSON.stringify(m.posG)}`;
    case 'starter': return `pitchHand ${m.throws}; ${m.car?.GS} starts in ${m.car?.pG} games`;
    case 'firstPick': case 'undrafted': return `drafts ${(m.dr ?? []).map(d => `${d[0]} ${d[1]} round ${d[2]} pick ${d[3]}`).join('; ') || 'none'}${c.allStar ? `; All-Star ${aw(['ALAS', 'NLAS'])}` : ''}`;
    case 'hofPos': case 'posEra': return `MLBHOF ${(m.aw?.MLBHOF ?? []).map(x => x[0]).join(' ') || 'none'}; games by position ${JSON.stringify(m.posG)}; last ${m.last ?? 'active'}`;
    case 'hofPitcher': return `MLBHOF ${(m.aw?.MLBHOF ?? []).map(x => x[0]).join(' ') || 'none'}; pitchHand ${m.throws}; ${m.car?.GS} starts in ${m.car?.pG} games, ${m.car?.SV} saves`;
    default: return '';
  }
}
