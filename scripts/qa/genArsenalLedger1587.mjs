// Round 1587: builds scripts/data/clubNamesakes1584/arsenalLedger.json from two committed files and nothing else:
//   the lead's Q2 export (arsenalMarket-2026-10-29.json, every "Arsenal FC" market row with its guard hash) and
//   arsenalRosterPages-2026-10-29.txt (every squad or player page read for this round, one line a page, with the
//   names that page lists). No network, no database. Run: node scripts/qa/genArsenalLedger1587.mjs [--check]
// Who gets judged (critic 1584 advice 11 to 13 and the lead's R1): every man behind a Q2 row whose nationality carries
// a CONMEBOL token, or is empty, or whose club has "Arsenal FC" as the middle part of a three part split (the
// TRIPWIRE), plus every man whose name is on a fetched Arsenal de Sarandí roster whatever his nationality (the ROSTER
// NET: it found Joel Soñora, stored as "United States", and Nicolás Giménez, stored as "United Arab Emirates").
// At the apply: node scripts/qa/genArsenalLedger1587.mjs --market <fresh Q2.json> --check (exit 1 means the fresh
// export would judge a different set: stop and extend the ledger first).
// A man is a name_folded plus a birth year (year minus age); a jump of 3 or more years in birth year is another man.
// A verdict is derived, never typed: sarandi when two hosts put him on Arsenal de Sarandí and no fetched London page
// lists him; london the other way round; held when pages of both clubs list him; pending when fewer than two hosts.
// A page marked noisy, mixed or with a wrong season label proves club membership only: it counts as a host, never
// as a season, so it never moves a span.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584');
export const MARKET_FILE = 'arsenalMarket-2026-10-29.json';
export const PAGES_FILE = 'arsenalRosterPages-2026-10-29.txt';
export const LEDGER_FILE = 'arsenalLedger.json';
export const STORED = 'Arsenal FC';
export const NAMESAKE = 'Arsenal de Sarandí';
export const CONMEBOL = ['Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Paraguay', 'Peru', 'Uruguay', 'Venezuela'];
// Names a page spells differently from the table, read by hand off the pages (key: the table's folded name).
export const ALIASES = {
  'papu gomez': ['alejandro gomez'],
  'cristian diaz': ['christian diaz'],
  'josimar mosquera': ['jossimar mosquera'],
  'gabriel': ['gabriel magalhaes'],
};

export const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const SEASON_ONLY = new Set(['sarandi', 'london', 'sarandi-player', 'london-player']);
const CLUB_ONLY = new Set(['sarandi-noisy', 'london-mixed', 'sarandi-club', 'london-club']);
const sideOf = (kind) => (kind.startsWith('sarandi') ? 'sarandi' : kind.startsWith('london') ? 'london' : null);

export function tripwireKind(r) {
  const nat = r.nationality == null ? '' : String(r.nationality).trim();
  if (nat === '') return 'nonat';
  if (nat.split(/\s*\/\s*/).some((t) => CONMEBOL.includes(t.trim()))) return 'conmebol';
  const parts = String(r.club).split(' / ');
  const i = parts.indexOf(STORED);
  if (parts.length >= 3 && i > 0 && i < parts.length - 1) return 'middle';
  return null;
}

export function parsePages(text) {
  return text.split(/\r?\n/).filter((l) => l.startsWith('SRC|')).map((l) => {
    const [, host, url, read, kind, season, rawNames, says] = l.split('|');
    const m = /^(\d{4})-(\d{2,4})$/.exec(season);
    const a = m ? Number(m[1]) : null;
    const b = m ? (m[2].length === 2 ? Math.floor(a / 100) * 100 + Number(m[2]) : Number(m[2])) : null;
    const note = /^[A-Z ]+:/.test(rawNames) ? rawNames.split(' Names: ')[0] : null;
    const list = rawNames.includes(' Names: ') ? rawNames.split(' Names: ')[1] : note ? '' : rawNames;
    const names = list.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
      const d = /\((\d{4})-(\d{2})-(\d{2})\)/.exec(s);
      const name = s.replace(/\(.*?\)/, '').trim();
      return { name, f: fold(name), dobYear: d ? Number(d[1]) : null, dob: d ? d[0].slice(1, -1) : null };
    });
    return { host, url, read, kind, side: sideOf(kind), season, a, b, note, says: says || null, names };
  });
}

function nameMatches(manF, entryF) {
  if (manF === entryF) return true;
  if ((ALIASES[manF] || []).includes(entryF)) return true;
  const T = manF.split(' '), R = entryF.split(' ');
  if (T.length < 2 || R.length < 2) return false;
  return T.every((t) => R.includes(t)) || R.every((t) => T.includes(t));
}

export function groupMen(rows) {
  const byName = new Map();
  for (const r of rows) {
    const k = r.name_folded || fold(r.player_name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(r);
  }
  const men = [];
  for (const [k, list] of byName) {
    const withB = list.map((r) => ({ r, b: r.age == null ? null : r.year - r.age })).sort((x, y) => (x.b ?? 0) - (y.b ?? 0) || x.r.id - y.r.id);
    let cur = null;
    for (const x of withB) {
      if (!cur || (x.b != null && cur.lastB != null && x.b - cur.lastB >= 3)) { cur = { f: k, rows: [], lastB: x.b }; men.push(cur); }
      cur.rows.push(x.r);
      if (x.b != null) cur.lastB = x.b;
    }
  }
  return men;
}

export const NAME_SOURCES = [
  { host: 'statscrew.com', url: 'https://www.statscrew.com/worldfootball/roster/t-ARSSA760/y-2010', read: '2026-10-29', says: 'Roster pages headed "2010-11 Arsenal de Sarandí Roster", club in Argentina\'s Primera División.' },
  { host: 'sofascore.com', url: 'https://www.sofascore.com/team/football/arsenal-de-sarandi/3221', read: '2026-10-29', says: 'Team page titled Arsenal de Sarandí, listed in Argentina (read by Round 1584, gridNamesakes.json).' },
];

export function buildLedger(market, pages) {
  const trip = new Map();
  for (const r of market) { const k = tripwireKind(r); if (k) trip.set(r.id, k); }
  const sarNames = [];
  for (const p of pages) if (p.side === 'sarandi') for (const n of p.names) sarNames.push(n.f);
  const inNet = (r) => sarNames.some((f) => nameMatches(fold(r.player_name), f));
  const judged = market.filter((r) => trip.has(r.id) || inNet(r));
  const men = groupMen(judged).map((g) => {
    const births = g.rows.map((r) => (r.age == null ? null : r.year - r.age)).filter((b) => b != null);
    const bLo = births.length ? Math.min(...births) : null, bHi = births.length ? Math.max(...births) : null;
    const hits = [], dobMismatch = [];
    for (const p of pages) {
      if (!p.side) continue;
      for (const n of p.names) {
        if (!nameMatches(g.f, n.f)) continue;
        if (n.dobYear != null && bLo != null && (n.dobYear < bLo - 2 || n.dobYear > bHi + 2)) { dobMismatch.push(`${p.host} ${p.season} ${n.name} ${n.dob}`); continue; }
        hits.push({ p, n });
      }
    }
    const hostsOf = (side) => [...new Set(hits.filter((h) => h.p.side === side && (SEASON_ONLY.has(h.p.kind) || CLUB_ONLY.has(h.p.kind))).map((h) => h.p.host))];
    const sar = hostsOf('sarandi'), lon = hostsOf('london');
    const verdict = sar.length && lon.length ? 'held' : sar.length >= 2 ? 'sarandi' : lon.length >= 2 ? 'london' : 'pending';
    const side = verdict === 'sarandi' || verdict === 'london' ? verdict : null;
    const seasonHits = hits.filter((h) => side && h.p.side === side && SEASON_ONLY.has(h.p.kind));
    const span = seasonHits.length ? [Math.min(...seasonHits.map((h) => h.p.a)), Math.max(...seasonHits.map((h) => h.p.b))] : null;
    const rows = g.rows.slice().sort((x, y) => x.year - y.year || x.id - y.id);
    const nets = [...new Set(rows.map((r) => (trip.has(r.id) ? trip.get(r.id) : 'roster')))].sort();
    const clubName = side === 'london' ? 'Arsenal (London)' : NAMESAKE;
    const sources = [];
    for (const h of hits.filter((x) => x.p.side === side)) {
      if (sources.some((s) => s.url === h.p.url)) continue;
      const what = h.p.says ? h.p.says : `${h.p.season} ${clubName} squad lists ${h.n.name}${h.n.dob ? ` (born ${h.n.dob})` : ''}`;
      sources.push({ host: h.p.host, url: h.p.url, read: h.p.read, says: (CLUB_ONLY.has(h.p.kind) ? 'club only, season not trusted: ' : '') + what });
    }
    return {
      name: rows[0].player_name, nameFolded: g.f, birthYears: bLo == null ? [] : bLo === bHi ? [bLo] : [bLo, bHi],
      nat: [...new Set(rows.map((r) => r.nationality))].join(' | '), nets, verdict,
      rows: rows.map((r) => r.id), rowYears: rows.map((r) => r.year), span,
      yearsOutsideSpan: span ? [...new Set(rows.map((r) => r.year).filter((y) => y < span[0] || y > span[1]))] : [],
      hosts: { sarandi: sar, london: lon }, sources, dobMismatch,
    };
  }).sort((x, y) => x.rowYears[0] - y.rowYears[0] || x.nameFolded.localeCompare(y.nameFolded));
  return {
    round: 1587, storedName: STORED, namesake: NAMESAKE, nameSources: NAME_SOURCES, export: MARKET_FILE, pages: PAGES_FILE,
    conmebol: CONMEBOL,
    rule: 'Judged: every Q2 row with a CONMEBOL nationality token, an empty nationality or Arsenal FC as a middle part (tripwire), plus every row whose man is on a fetched Arsenal de Sarandí roster (roster net). A man is name_folded plus birth year; a jump of 3 or more is another man. sarandi: two hosts on Arsenal de Sarandí and no London page. london: the reverse. held: both. pending: under two hosts. A noisy page proves the club only and never moves a span.',
    counts: { judgedRows: judged.length, men: men.length, sarandi: men.filter((m) => m.verdict === 'sarandi').length, london: men.filter((m) => m.verdict === 'london').length, held: men.filter((m) => m.verdict === 'held').length, pending: men.filter((m) => m.verdict === 'pending').length, sarandiRows: men.filter((m) => m.verdict === 'sarandi').reduce((s, m) => s + m.rows.length, 0) },
    men,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // --market <fresh Q2.json> (the apply's step, with --check): the ledger a FRESH export would build must equal the
  // committed one, so a tripwire or roster net row that appeared since 10-29 (a man nobody judged) stops the apply.
  const mi = process.argv.indexOf('--market');
  if (mi > 0 && !process.argv.includes('--check')) { console.log('REFUSED: --market only checks (the ledger is built from the committed export)'); process.exit(2); }
  const market = JSON.parse(fs.readFileSync(mi > 0 ? path.resolve(process.argv[mi + 1]) : path.join(DATA, MARKET_FILE), 'utf8'));
  const pages = parsePages(fs.readFileSync(path.join(DATA, PAGES_FILE), 'utf8'));
  const ledger = buildLedger(market, pages);
  const text = JSON.stringify(ledger, null, 1) + '\n';
  const out = path.join(DATA, LEDGER_FILE);
  console.log(`pages ${pages.length}, judged rows ${ledger.counts.judgedRows}, men ${ledger.counts.men}: sarandi ${ledger.counts.sarandi} (${ledger.counts.sarandiRows} rows), london ${ledger.counts.london}, held ${ledger.counts.held}, pending ${ledger.counts.pending}`);
  for (const m of ledger.men) if (m.verdict === 'pending' || m.verdict === 'held' || m.dobMismatch.length) console.log(`  ${m.verdict} ${m.name} ${m.rowYears.join(',')} sar:${m.hosts.sarandi.join('+')} lon:${m.hosts.london.join('+')}${m.dobMismatch.length ? ' DOB? ' + m.dobMismatch.join('; ') : ''}`);
  if (mi > 0) {
    // review 1587 minor 5: no Sarandí squad page past 2024-25 was read, so the roster net is blind to a man who joined
    // later and is stored with a non CONMEBOL nationality. Every unjudged row from 2025 on is listed for the lead to
    // read by name (on 10-29 each was a London man: Saka, Rice, Raya and the rest).
    const judgedIds = new Set(ledger.men.flatMap((m) => m.rows));
    const late = market.filter((r) => r.year >= 2025 && !judgedIds.has(r.id));
    const byName = new Map();
    for (const r of late) byName.set(r.player_name, (byName.get(r.player_name) || []).concat([`${r.year} ${r.nationality}`]));
    console.log(`unjudged rows from 2025 on: ${late.length} rows, ${byName.size} names. Confirm each is a London Arsenal man before the write:`);
    console.log('  ' + [...byName].map(([n, ys]) => `${n} (${ys.join(', ')})`).join('; '));
  }
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text && mi > 0 && cur) {
      // review 1587 minor 11: name the men that differ, so the lead sees at once whether the change touches a sarandi
      // man (the payload) or only a london man's rows. The check still fails closed either way.
      const was = new Map(JSON.parse(cur).men.map((m) => [`${m.nameFolded} ${m.birthYears.join('-')}`, m]));
      const now = new Map(ledger.men.map((m) => [`${m.nameFolded} ${m.birthYears.join('-')}`, m]));
      for (const [k, m] of now) if (!was.has(k)) console.log(`  new man: ${m.name} (${m.verdict}) rows ${m.rowYears.join(',')}`);
      for (const [k, m] of was) if (!now.has(k)) console.log(`  man gone: ${m.name} (${m.verdict})`);
      for (const [k, m] of now) if (was.has(k) && JSON.stringify(was.get(k)) !== JSON.stringify(m)) console.log(`  man changed: ${m.name} (${was.get(k).verdict} to ${m.verdict}) rows ${was.get(k).rowYears.join(',')} to ${m.rowYears.join(',')}`);
    }
    if (cur !== text) { console.log(`FAIL: arsenalLedger.json is not what the generator writes from the committed pages and ${mi > 0 ? 'the export given' : 'the committed export'}${mi > 0 ? ': stop the apply' : ''}`); process.exit(1); }
    console.log('ok: the committed ledger equals the generator\'s output');
  } else { fs.writeFileSync(out, text); console.log('wrote ' + path.relative(ROOT, out)); }
}
