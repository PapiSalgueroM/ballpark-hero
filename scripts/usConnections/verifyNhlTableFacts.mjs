/**
 * Round 1574: the second host for every fact the NHL table rows rest on.
 *
 * The record (scripts/data/nhlConnectionsRecord-2026-10.json) is the league's own service, api-web.nhle.com. The
 * second host is hockey-reference.com: one player page per man carries his NHL clubs and goals season by season,
 * his career games, goals and goalie wins, his awards ("1996-97 NHL Vezina Trophy"), his championships ("2002
 * Detroit Red Wings"), his draft line, his position, his birthplace and the Hall of Fame. Pages are read one at a
 * time, five seconds apart (scripts/usConnections/sportsRef.mjs), and cached in a work folder.
 *
 *   node scripts/usConnections/verifyNhlTableFacts.mjs pages <work>          (MAX pages a run, default 24)
 *   node scripts/usConnections/verifyNhlTableFacts.mjs facts <work> <out.json>
 *
 * Who is read: every member of every NHL table group (scripts/data/nhlConnectionsTable-2026-10.json, the decided
 * board), every man the round moved (the ledger's tableMoves) and every man the ledger's watchLine reads. A man's page is his only if its career games agree
 * with the record's (equal for a retired man, within 15 for one still playing); otherwise the next id is tried.
 * `facts` writes, for each member and each moved man, the claim on both hosts; a claim the two hosts do not agree
 * on is printed and never written. Never used by a harness: the harness reads only what the ledger recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { page, rows, text } from './sportsRef.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/hrwork-1574');
const MAX = Number(process.env.MAX ?? 24);
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const plain = s => String(s).normalize('NFD').replace(/\p{M}/gu, '');
const undated = l => String(l).replace(/ \(as of [^)]+\)$/, '');

/* hockey-reference ids where the plain rule (five letters of the surname, two of the given name, 01) misses */
export const HR_ID = {
  'Marc-Andre Fleury': 'fleurma01', 'Ryan Nugent-Hopkins': 'nugenry01',
  'Alexis Lafreniere': 'lafreal01', 'Jakub Voráček': 'voracja01', 'Nicklas Bäckström': 'backsni02', 'Tim Stutzle': 'stuetti02',
  'Juraj Slafkovsky': 'slafkju01', 'Mikhail Sergachev': 'sergami01', 'Billy Smith': 'smithbi01',
  'Nicklas Lidstrom': 'lidstni01', 'Jaromir Jagr': 'jagrja01', 'Steve Yzerman': 'yzermst01', 'Teemu Selanne': 'selante01',
};
const hrIds = name => {
  if (HR_ID[name]) return [HR_ID[name]];
  const [first, ...rest] = plain(name).toLowerCase().replace(/[^a-z ]/g, '').split(' ');
  const base = `${rest.join('').slice(0, 5)}${first.slice(0, 2)}`;
  return ['01', '02', '03'].map(n => base + n);
};
export const hrUrl = id => `https://www.hockey-reference.com/players/${id[0]}/${id}.html`;

const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsRecord-2026-10.json'), 'utf8')).men;
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsVerified-2026-10.json'), 'utf8'));
const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nhlConnectionsTable-2026-10.json'), 'utf8'));

/** Every (board, label, man) the round must hold on two hosts: members, and the men it moved with their reason. */
export function needs() {
  const out = [];
  for (const r of table.rows) for (const g of r.board) for (const p of g.players) out.push({ id: r.puzzle_id, label: g.theme, name: p, holds: true, why: 'member' });
  for (const m of ledger.tableMoves ?? []) out.push({ id: m.id, label: m.label, name: m.name, holds: m.holds, why: m.why });
  /* the findings this round's checker made on the rows as exported: each fixed finding has its fact */
  for (const m of ledger.exportFindings ?? []) out.push({ id: m.id, label: m.label, name: m.name, holds: m.holds, why: m.why });
  /* the review fix of 2026-10-29 (one rule since fix2): every man still playing beside a single season mark, each
     entry of the ledger's watchLine with its own label, read by his career best (moved at or over the line:
     watch-line; kept under it: watch-line-clear) */
  const wl = ledger.watchLine;
  for (const m of wl?.men ?? []) out.push({ id: m.id, label: m.label, name: m.name, holds: false, why: m.moved ? 'watch-line' : 'watch-line-clear' });
  const seen = new Set();
  return out.filter(n => { const k = `${fold(n.label)}|${fold(n.name)}|${n.holds}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** A hockey-reference player page, read: what the facts need. */
export function parseHr(html) {
  const r = rows(html);
  const title = (html.match(/<title>([^<]+)<\/title>/) ?? [])[1] ?? '';
  const metaAt = html.indexOf('id="meta"');
  const meta = metaAt < 0 ? '' : text(html.slice(metaAt, metaAt + 6000)).replace(/&bull;/g, ' ');
  const seasons = {};
  const sg = {};
  const teamGoals = {};
  let career = null;
  let goalieCareer = null;
  for (const x of r) {
    const nhl = x.comp_name_abbr === 'NHL' || x.lg_id === 'NHL';
    if (nhl && /^\d{4}-\d{2}$/.test(x.year_id ?? '') && x.team_name_abbr) {
      const y = x.year_id;
      const multi = /TOT|\dTM/.test(x.team_name_abbr);
      if (!multi) {
        (seasons[y] ??= new Set()).add(x.team_name_abbr);
        if (x.goals !== undefined && x.goals !== '') teamGoals[x.team_name_abbr] = (teamGoals[x.team_name_abbr] ?? 0) + Number(x.goals || 0);
      }
      if (x.goals !== undefined && x.goals !== '' && (multi || sg[y] === undefined)) sg[y] = Number(x.goals || 0);
    }
    if (/yrs|career/i.test(x.year_id ?? '') && (x.comp_name_abbr === 'NHL' || !x.comp_name_abbr)) {
      if (x.goalie_wins !== undefined || x.wins_goalie !== undefined) { if (!goalieCareer) goalieCareer = x; }
      else if (x.games !== undefined && !career) career = x;
    }
  }
  const lb = html.indexOf('id="leaderboard_awards"');
  /* the awards block ends where the honors block starts; the championships have a block of their own */
  const hb = html.indexOf('id="leaderboard_honors"', lb);
  const awardText = lb < 0 ? '' : text(html.slice(lb, hb > lb ? hb : lb + 20000));
  const awards = [...awardText.matchAll(/(\d{4}-\d{2}) NHL ([A-Z][A-Za-z.'" ]+?(?:Trophy|Award))/g)].map(m => [m[1], m[2].trim()]);
  const cb = html.indexOf('id="leaderboard_champs"');
  const ce = cb < 0 ? -1 : html.indexOf('id="leaderboard_', cb + 10);
  const champText = cb < 0 ? '' : text(html.slice(cb, ce > cb ? ce : cb + 4000));
  const cups = [...champText.matchAll(/(\d{4}) ([A-Z][A-Za-z. ]+?) \( NHL \)/g)].map(m => [Number(m[1]), m[2].trim()]);
  const draft = meta.match(/Draft\s*:\s*([A-Za-z. ]+?)\s*,\s*(\d+)\w*\s*round\s*\((\d+)\w*\s*overall\)\s*,\s*(\d{4})/);
  const born = meta.match(/Born:.*?\d{4}\s+in\s+([^,]+),\s*([A-Za-z .]+?)(?:\s+[a-z]{2}\s|\s+Draft|\s+Hall|\s+Pronunciation|\s+More|\s*$)/);
  const pos = (meta.match(/Position\s*:\s*([A-Z/]+)/) ?? [])[1] ?? null;
  const games = Number(goalieCareer?.goalie_games ?? goalieCareer?.games_goalie ?? career?.games ?? NaN);
  return {
    title, pos,
    seasons: Object.fromEntries(Object.entries(seasons).map(([y, s]) => [y, [...s]])),
    sg, teamGoals,
    games,
    goals: Number(career?.goals ?? goalieCareer?.goals ?? NaN),
    wins: goalieCareer ? Number(goalieCareer.goalie_wins ?? goalieCareer.wins_goalie) : null,
    awards, cups,
    draft: draft ? { team: draft[1].trim(), round: Number(draft[2]), overall: Number(draft[3]), year: Number(draft[4]) } : null,
    country: born ? born[2].trim() : null,
    hof: /Hall of Fame\s*:\s*Inducted as Player/.test(meta),
  };
}

const fileOf = name => path.join(WORK, `nhl_${fold(name)}`);
/** The page of the man the record means, by career games, or null. */
export function pageOf(name) {
  for (const id of hrIds(name)) {
    const f = path.join(WORK, `${id}.html`);
    if (!fs.existsSync(f)) continue;
    const p = parseHr(fs.readFileSync(f, 'utf8'));
    const m = record[name];
    const gp = m?.career?.GP;
    if (m && Number.isFinite(p.games) && (m.active ? Math.abs(p.games - gp) <= 15 : p.games === gp)) return { id, p };
  }
  return null;
}

/* one page, six seconds after the last; a 404 is remembered (<id>.miss), a network error is not (tried next run) */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastAt = 0;
async function getPage(id) {
  const wait = lastAt + 7000 - Date.now();
  if (wait > 0) await sleep(wait);
  lastAt = Date.now();
  try {
    const r = await fetch(hrUrl(id), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DoUKnowBall data check' } });
    if (r.status === 404) { fs.writeFileSync(path.join(WORK, `${id}.miss`), ''); return 'miss'; }
    if (r.status !== 200) { console.log('  status', r.status, id); return r.status === 429 ? 'stop' : 'error'; }
    fs.writeFileSync(path.join(WORK, `${id}.html`), await r.text());
    return 'ok';
  } catch (e) {
    /* node's fetch drops some of these pages mid-read ("fetch failed"); curl reads them whole */
    console.log('  error', e.message, id, '(trying curl)');
    try {
      await sleep(3000);
      const out = path.join(WORK, `${id}.part`);
      const code = execFileSync('curl', ['-s', '-L', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DoUKnowBall data check', '-o', out, '-w', '%{http_code}', hrUrl(id)], { encoding: 'utf8', timeout: 30000 }).trim();
      if (code === '404') { fs.writeFileSync(path.join(WORK, `${id}.miss`), ''); return 'miss'; }
      if (code !== '200') { console.log('  curl status', code, id); return code === '429' ? 'stop' : 'error'; }
      fs.renameSync(out, path.join(WORK, `${id}.html`));
      return 'ok';
    } catch (e2) {
      console.log('  curl failed too', e2.message, id);
      return 'error';
    }
  }
}

if (step === 'pages') {
  fs.mkdirSync(WORK, { recursive: true });
  const names = [...new Set(needs().map(n => n.name))].sort();
  let n = 0, done = 0;
  const unread = [];
  outer: for (const name of names) {
    if (pageOf(name)) { done += 1; continue; }
    for (const id of hrIds(name)) {
      if (fs.existsSync(path.join(WORK, `${id}.html`)) || fs.existsSync(path.join(WORK, `${id}.miss`))) continue;
      if (n >= MAX) break outer;
      n += 1;
      const got = await getPage(id);
      if (got === 'stop') { console.log('  the site asks us to slow down: stopping this run'); break outer; }
      if (got === 'error') break;
      if (pageOf(name)) break;
    }
    if (pageOf(name)) done += 1; else unread.push(name);
  }
  console.log(`pages: ${n} read this run; ${done} of ${names.length} men have their page${unread.length ? `; not yet: ${unread.slice(0, 12).join(', ')}` : ''}`);
  void fileOf; void page;
}

/* the league's club names -> hockey-reference's codes (a renamed club under both its names) */
const HR_CODES = {
  'Chicago Blackhawks': ['CHI', 'CBH'], 'Colorado Avalanche': ['COL'], 'Quebec Nordiques': ['QUE'], 'New York Islanders': ['NYI'],
  'Winnipeg Jets': ['WPG'], 'Winnipeg Jets (1979)': ['WIN'], 'Edmonton Oilers': ['EDM'], 'Montréal Canadiens': ['MTL'],
  'Boston Bruins': ['BOS'], 'Detroit Red Wings': ['DET'], 'Washington Capitals': ['WSH'], 'Philadelphia Flyers': ['PHI'],
  'New York Rangers': ['NYR'], 'St. Louis Blues': ['STL'], 'Dallas Stars': ['DAL'], 'San Jose Sharks': ['SJS'],
  'Buffalo Sabres': ['BUF'], 'Nashville Predators': ['NSH'], 'Vancouver Canucks': ['VAN'], 'Ottawa Senators': ['OTT'],
  'New Jersey Devils': ['NJD'], 'Hartford Whalers': ['HAR'], 'Toronto Maple Leafs': ['TOR'], 'Utah Hockey Club': ['UTA'],
  'Utah Mammoth': ['UTA'], 'Florida Panthers': ['FLA'], 'Anaheim Ducks': ['ANA', 'MDA'], 'Pittsburgh Penguins': ['PIT'],
};
/* hockey-reference's codes -> one key per franchise, for goals for one franchise */
const HR_FRANCHISE = { QUE: 'COL', WIN: 'ARI', PHX: 'ARI', UTA: 'ARI', ATL: 'WPG', MNS: 'DAL', HAR: 'CAR', CBH: 'CHI', MDA: 'ANA', CGS: 'CLE' };
const HR_TROPHY = t => (t.startsWith('Maurice ') ? 'Maurice Richard Trophy' : t);
const EUROPE_NAMES = /^(Sweden|Finland|Russia|USSR|Soviet Union|Czechoslovakia|Czech Republic|Czechia|Slovakia|Germany|West Germany|Switzerland|Latvia|Denmark|Norway|Austria|Slovenia|Belarus|Ukraine|Kazakhstan|France|United Kingdom|England|Scotland|Poland|Lithuania|Estonia|Italy|Netherlands)$/;
const DRAFT_TEAM = { BUF: 'Buffalo' };
/* a champion's name (hockey-reference's or the league's) -> one key per franchise */
const FRANCHISE_OF = t => ({ quebecnordiques: 'coloradoavalanche', minnesotanorthstars: 'dallasstars', hartfordwhalers: 'carolinahurricanes', atlantaflames: 'calgaryflames', coloradorockies: 'newjerseydevils' }[fold(t)] ?? fold(t));

/** The claim on hockey-reference's page: { v, says }. */
function hrVerdict(c, p) {
  const upTo = y => c.asOf === undefined || Number(y.slice(0, 4)) <= c.asOf;
  switch (c.kind) {
    case 'club': {
      const codes = c.names.flatMap(n => HR_CODES[n] ?? []);
      const hit = Object.entries(p.seasons).filter(([y, t]) => upTo(y) && t.some(x => codes.includes(x))).map(([y]) => y).sort();
      return { v: hit.length > 0, says: hit.length ? `NHL seasons with ${codes.join('/')}: ${hit[0]}${hit.length > 1 ? ` to ${hit[hit.length - 1]} (${hit.length})` : ''}` : `no NHL season with ${codes.join('/')}${c.asOf !== undefined ? ` up to ${c.asOf}-${String(c.asOf + 1).slice(2)}` : ''} (clubs: ${[...new Set(Object.values(p.seasons).flat())].join(', ')})` };
    }
    case 'career': {
      const have = c.stat === 'GP' ? p.games : p.goals;
      if (c.europe && !EUROPE_NAMES.test(p.country ?? '')) return { v: false, says: `born in ${p.country}` };
      return { v: have >= c.min, says: `career NHL ${c.stat === 'GP' ? 'games' : 'goals'} ${have}${c.europe ? `, born in ${p.country}` : ''}` };
    }
    case 'season': {
      const best = Object.entries(p.sg).sort((a, b) => b[1] - a[1])[0];
      return { v: !!best && best[1] >= c.min, says: best ? `most NHL goals in a season ${best[1]} (${best[0]})` : 'no NHL season' };
    }
    case 'clubGoals': {
      const by = {};
      for (const [t, g] of Object.entries(p.teamGoals)) by[HR_FRANCHISE[t] ?? t] = (by[HR_FRANCHISE[t] ?? t] ?? 0) + g;
      const best = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
      return { v: !!best && best[1] >= c.min, says: best ? `most NHL goals for one franchise ${best[1]} (${best[0]})` : 'no NHL goals' };
    }
    case 'wins': return { v: p.pos === 'G' && (p.wins ?? 0) >= c.min, says: p.pos === 'G' ? `career NHL goalie wins ${p.wins}` : `position ${p.pos}` };
    case 'goalieGoal': return { v: p.pos === 'G' && p.goals >= 1, says: `position ${p.pos}, career NHL goals ${p.goals}` };
    case 'pos': return { v: p.pos === c.pos, says: `position ${p.pos}` };
    case 'award': {
      const t = HR_TROPHY(c.trophy);
      if (c.pos && p.pos !== c.pos) return { v: false, says: `position ${p.pos}` };
      const won = p.awards.filter(([, a]) => a === t).map(([y]) => y).filter(y => c.before === undefined || Number(y.slice(0, 4)) + 1 < c.before);
      return { v: won.length > 0, says: won.length ? `${t}: ${won.join(', ')}${c.pos ? `; position ${p.pos}` : ''}` : `no ${t}${c.before !== undefined ? ` before ${c.before}` : ''} in the awards` };
    }
    case 'smytheLost': {
      const cups = new Set(p.cups.map(([y]) => y));
      const lost = p.awards.filter(([, a]) => a === 'Conn Smythe Trophy').map(([y]) => y).filter(y => !cups.has(Number(y.slice(0, 4)) + 1));
      return { v: lost.length > 0, says: lost.length ? `Conn Smythe ${lost.join(', ')}, no championship that spring` : 'no Conn Smythe without the Cup that spring' };
    }
    case 'cupClubs': {
      const fr = new Set(p.cups.map(([, t]) => FRANCHISE_OF(t)));
      return { v: fr.size >= c.min, says: `championships: ${p.cups.map(([y, t]) => `${y} ${t}`).join(', ') || 'none'} (${fr.size} franchises)` };
    }
    case 'cupWith': {
      const springs = c.seasons.map(s => Number(s.slice(0, 4)) + 1);
      const hit = p.cups.filter(([y, t]) => springs.includes(y) && c.names.some(n => fold(n) === fold(t)));
      return { v: hit.length > 0, says: hit.length ? `championships: ${hit.map(([y, t]) => `${y} ${t}`).join(', ')}` : `no championship with ${c.names.join('/')} in ${springs.join(', ')}` };
    }
    case 'hofClub': {
      const codes = c.names.flatMap(n => HR_CODES[n] ?? []);
      const played = Object.values(p.seasons).flat().some(t => codes.includes(t));
      return { v: p.hof && played, says: `${p.hof ? 'in the Hall of Fame as a player' : 'not in the Hall of Fame'}; ${played ? `played for ${codes.join('/')}` : `never played for ${codes.join('/')}`}` };
    }
    case 'draft': return { v: p.draft?.overall === c.overall, says: p.draft ? `drafted ${p.draft.overall} overall by ${p.draft.team}, ${p.draft.year}` : 'no draft line' };
    case 'draftBy': return { v: p.draft?.team === DRAFT_TEAM[c.team], says: p.draft ? `drafted by ${p.draft.team}, ${p.draft.year} (${p.draft.overall} overall)` : 'no draft line' };
    default: return { v: null, says: `kind ${c.kind} is not read here` };
  }
}

/** The record's own line for the claim. */
function recordSays(c, m) {
  const clubsTo = () => [...new Set(Object.entries(m.seasons ?? {}).filter(([y]) => c.asOf === undefined || Number(y.slice(0, 4)) <= c.asOf).flatMap(([, v]) => v))].join(', ');
  switch (c.kind) {
    case 'club': return `NHL clubs${c.asOf !== undefined ? ` to ${c.asOf}-${String(c.asOf + 1).slice(2)}` : ''}: ${clubsTo()}`;
    case 'career': return `career regular season ${c.stat === 'GP' ? 'games' : 'goals'} ${m.career?.[c.stat]}${c.europe ? `, born in ${m.country}` : ''}${m.active ? ', still playing' : ''}`;
    case 'season': { const b = Object.entries(m.sg ?? {}).sort((a, x) => x[1] - a[1])[0]; return `most regular season goals in a season ${b?.[1]} (${b?.[0]})`; }
    case 'clubGoals': return `regular season goals by club: ${Object.entries(m.cg ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, g]) => `${t} ${g}`).join(', ')}`;
    case 'wins': return `career regular season wins ${m.wins}`;
    case 'goalieGoal': return `position ${m.pos}, career regular season goals ${m.career?.G}`;
    case 'pos': return `position ${m.pos}`;
    case 'award': return `${c.trophy}: ${(m.aw?.[c.trophy] ?? []).join(', ') || 'none'}${c.pos ? `; position ${m.pos}` : ''}`;
    case 'smytheLost': return `Conn Smythe ${(m.aw?.['Conn Smythe Trophy'] ?? []).join(', ') || 'none'}; Stanley Cup ${(m.aw?.['Stanley Cup'] ?? []).join(', ') || 'none'}`;
    case 'cupClubs':
    case 'cupWith': return `Stanley Cup ${(m.aw?.['Stanley Cup'] ?? []).map(y => `${y} (${(m.pc?.[y] ?? ['no playoff game']).join('/')})`).join(', ') || 'none'}`;
    case 'hofClub': return `in the Hockey Hall of Fame: ${m.hhof ? 'yes' : 'no'}; NHL clubs: ${[...new Set(Object.values(m.seasons ?? {}).flat())].join(', ')}`;
    case 'draft':
    case 'draftBy': return m.draft ? `drafted ${m.draft[0]}, round ${m.draft[1]}, ${m.draft[2]} overall, by ${m.draft[3]}` : 'no draft line';
    default: return '';
  }
}

if (step === 'facts') {
  const us = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs')).href);
  const { checker } = us.makeUsChecker(ROOT, 'nhl');
  const facts = [];
  const problems = [];
  for (const n of needs()) {
    const c = checker.criterion(n.label);
    const m = record[n.name];
    const got = pageOf(n.name);
    if (!c || !m || !got) { problems.push(`${n.id} ${n.name} "${n.label}": ${!c ? 'label not judged' : !m ? 'not in the record' : 'no hockey-reference page'}`); continue; }
    const v1 = checker.fits(n.name, c);
    const h = hrVerdict(c, got.p);
    if (v1 !== n.holds || h.v !== n.holds) { problems.push(`${n.id} ${n.name} "${n.label}" expect ${n.holds}: record ${v1} (${recordSays(c, m)}), hockey-reference ${h.v} (${h.says})`); continue; }
    facts.push({ id: n.id, label: n.label, name: n.name, holds: n.holds, why: n.why, sources: [
      { host: 'api-web.nhle.com', url: `https://api-web.nhle.com/v1/player/${m.nhl}/landing`, says: recordSays(c, m) },
      { host: 'hockey-reference.com', url: hrUrl(got.id), says: h.says },
    ] });
  }
  fs.writeFileSync(outArg, JSON.stringify(facts, null, 1));
  console.log(`facts: ${facts.length} agreed on two hosts, ${problems.length} not`);
  for (const p of problems) console.log('  ' + p);
}
