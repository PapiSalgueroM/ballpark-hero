/**
 * Round 1034 harness: the A-League Men 2026-27 squad ledgers are what they say they are.
 *
 * scripts/data/gatheredSquads/aleague2026/ holds research, not game data: one JSON per club,
 * one row per first team player, each fact on two hosts. A later round bakes it into Club
 * Manager. This fence reads only the committed files (no network, no raw pages) and fails
 * when a row stops being two sourced, when a value appears that no two hosts give, or when a
 * file's own count block stops describing its rows.
 *
 *   1. MEMBERSHIP. _membership.json names twelve clubs with distinct slugs, every one has
 *      its file, no club file sits outside the list, and each file names the club it is for.
 *   2. ROW SHAPE. A name, a group of GK, DEF, MID or FWD (or null), a real birth date between
 *      1975 and 2012 (or null), and minutes as a whole number of at least zero (or null).
 *   3. TWO HOSTS A ROW. Sources span two or more hosts: the first is the club's own site or
 *      the league's, and at least one is independent (ESPN, Transfermarkt, FotMob). Every
 *      source has an https URL on its own host and a read date no later than the file's.
 *   4. NO WIKI. No string anywhere in any file points at a wiki.
 *   5. FACTS. A fact's hosts are among the row's sources; a group has an independent host;
 *      a birth date has two distinct independent hosts, and no birth date has none.
 *   6. MINUTES ON TWO HOSTS. A minutes value has Transfermarkt in minutesSource and ESPN's
 *      season record in minutesSecondSource, no more than one minute an appearance apart
 *      (the hosts round substitutions their own way). A null has neither source.
 *   7. ONE MAN, ONE ROW. No name, ESPN id, Transfermarkt id or FotMob id twice in the league,
 *      no row also held out, and every held out entry gives its reason.
 *   8. THE COUNT BLOCK IS ARITHMETIC. rows, heldOut, twoHostRows, birthDateKnown,
 *      groupKnown and minutesKnown equal what the rows say.
 *   9. THE BRIEF'S BAND. 20 to 30 rows a club. ONE named exception, pinned exactly:
 *      Adelaide United at 31, because its club page lists 31 players that ESPN or
 *      Transfermarkt also carry and no rule found on the page separates one of them out
 *      (no youth, academy or loan heading). Whether to keep 31 is the lead's call. The
 *      pin is a ratchet: the file must disclose it in its notes, any other count fails,
 *      and once Adelaide is back in the band the exception must be deleted.
 *  10. NO LONG DASHES in any string (house rule).
 *  11. THE FOUR DUMP ROWS. Ryan Fraser, Jorrit Hendrix, Panashe Madanha and Juan Mata (the
 *      offline market dump's A-League rows) are each a row with marketRow, or carry a
 *      marketRecheck verdict.
 *  12. FLOORS AGAINST THE BASELINE. Measured on the committed ledgers (2026-10-06, head
 *      after the closing-check fix): 312 rows, birth date known 297 (95.2 percent), group
 *      known 310 (99.4), minutes known 222 (71.2), 16 held out. The data is fixed, so there
 *      are no seeds; the floors sit 5 to 11 points under those shares (birth date 90, group
 *      95, minutes 60) so a rebuild that silently drops a field goes red.
 *
 * Negative controls: ALEAGUE_SQUADS_CONTROL=<name> mutates the loaded data in memory (after
 * asserting its target exists) and the run must go red IN THAT SECTION: it exits 1 when the
 * control fired there and 3 when it did not. Names: member, shape, onehost, wiki, dob,
 * minutes, dupe, count, band, adelaide, dash, market, floor.
 *
 * Run: node scripts/simALeagueSquads.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'data', 'gatheredSquads', 'aleague2026');
const CONTROL = process.env.ALEAGUE_SQUADS_CONTROL || null;
const LEAGUE_HOST = 'aleagues.com.au';
const INDEPENDENT = new Set(['site.api.espn.com', 'transfermarkt.com', 'fotmob.com']);
const MINUTES_HOSTS = ['transfermarkt.com', 'sports.core.api.espn.com'];
const GROUPS = new Set(['GK', 'DEF', 'MID', 'FWD']);
const BAND = [20, 30];
const OVER_BAND = { 'adelaide-united': 31 };
const FLOORS = { birthDate: 0.9, group: 0.95, minutes: 0.6 };
const DUMP_ROWS = ['Ryan Fraser', 'Jorrit Hendrix', 'Panashe Madanha', 'Juan Mata'];

const read = (f) => JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));
const mem = read('_membership.json');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const docs = new Map(files.map((f) => [f.replace(/\.json$/, ''), read(f)]));
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const hostOf = (u) => new URL(u).host.replace(/^www\./, '');
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

// ---------- negative controls: each asserts its target exists, then breaks one thing ----------
const CONTROLS = {
  member: [1, () => { if (!mem.clubs.some((c) => c.slug === 'perth-glory')) throw new Error('member target missing'); mem.clubs = mem.clubs.filter((c) => c.slug !== 'perth-glory'); }],
  shape: [2, () => { const r = docs.get('sydney-fc').rows.find((x) => x.group === 'MID'); if (!r) throw new Error('shape target missing'); r.group = 'CM'; }],
  onehost: [3, () => { const r = docs.get('brisbane-roar').rows[0]; if (!r || r.sources.length < 2) throw new Error('onehost target missing'); r.sources = r.sources.slice(0, 1); r.facts.name = [r.sources[0].host]; }],
  wiki: [4, () => { const r = docs.get('auckland-fc').rows[0]; if (!r || !r.sources[1]) throw new Error('wiki target missing'); r.notes.push('see https://en.wikipedia.org/wiki/Auckland_FC'); }],
  dob: [5, () => { const r = docs.get('adelaide-united').rows.find((x) => x.name === 'Mitchell Smith'); if (!r || r.birthDate !== null) throw new Error('dob target missing'); r.birthDate = '2007-01-01'; }],
  minutes: [6, () => { const r = docs.get('perth-glory').rows.find((x) => x.name === 'Matt Sutton'); if (!r || r.minutes2025_26 !== null) throw new Error('minutes target missing'); r.minutes2025_26 = 2303; r.minutesSource = { host: 'transfermarkt.com', read: '2026-10-06' }; r.minutesSecondSource = { host: 'sports.core.api.espn.com', read: '2026-10-06', minutes: 2340, appearances: 26 }; }],
  dupe: [7, () => { const a = docs.get('melbourne-city').rows[0]; if (!a) throw new Error('dupe target missing'); docs.get('newcastle-jets').rows.push(JSON.parse(JSON.stringify(a))); }],
  count: [8, () => { const d = docs.get('macarthur-fc'); if (typeof d.count.groupKnown !== 'number') throw new Error('count target missing'); d.count.groupKnown += 1; }],
  band: [9, () => { const d = docs.get('wellington-phoenix'); if (d.rows.length < BAND[0]) throw new Error('band target missing'); d.rows = d.rows.slice(0, BAND[0] - 1); }],
  adelaide: [9, () => { const d = docs.get('adelaide-united'); if (d.rows.length !== OVER_BAND['adelaide-united']) throw new Error('adelaide target missing'); d.rows.pop(); }],
  dash: [10, () => { const d = docs.get('central-coast-mariners'); if (!d.notes.length) throw new Error('dash target missing'); d.notes[0] += ' \u2013 more'; }],
  market: [11, () => { const d = docs.get('melbourne-victory'); if (!(d.marketRecheck || []).some((x) => x.player_name === 'Juan Mata')) throw new Error('market target missing'); d.marketRecheck = d.marketRecheck.filter((x) => x.player_name !== 'Juan Mata'); }],
  floor: [12, () => { let n = 0; for (const d of docs.values()) for (const r of d.rows) if (r.birthDate && n++ % 5 === 0) r.birthDate = null; if (!n) throw new Error('floor target missing'); }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`simALeagueSquads: unknown control ${CONTROL}`); process.exit(2); }
if (CONTROL) CONTROLS[CONTROL][1]();

const fails = [];
const fail = (sec, msg) => fails.push([sec, msg]);
const clubs = mem.clubs;

// 1. membership
if (clubs.length !== 12) fail(1, `membership names ${clubs.length} clubs, not 12`);
if (new Set(clubs.map((c) => c.slug)).size !== clubs.length) fail(1, 'membership repeats a slug');
for (const c of clubs) {
  const d = docs.get(c.slug);
  if (!d) { fail(1, `${c.slug}: no file`); continue; }
  if (d.slug !== c.slug || d.club !== c.league) fail(1, `${c.slug}: file names ${d.slug} / ${d.club}`);
}
for (const slug of docs.keys()) if (!clubs.some((c) => c.slug === slug)) fail(1, `${slug}.json is not a member club`);

const live = clubs.filter((c) => docs.has(c.slug)).map((c) => [c, docs.get(c.slug)]);
for (const [c, d] of live) {
  const clubHost = hostOf(c.site);
  const officialHosts = new Set([clubHost, LEAGUE_HOST]);
  if (!isDate(d.read)) fail(2, `${c.slug}: file read date ${d.read}`);
  for (const r of d.rows) {
    const id = `${c.slug}/${r.name}`;
    // 2. row shape
    if (typeof r.name !== 'string' || !r.name.trim()) fail(2, `${id}: no name`);
    if (r.group !== null && !GROUPS.has(r.group)) fail(2, `${id}: group ${r.group}`);
    if (r.birthDate !== null && (!isDate(r.birthDate) || +r.birthDate.slice(0, 4) < 1975 || +r.birthDate.slice(0, 4) > 2012)) fail(2, `${id}: birth date ${r.birthDate}`);
    if (r.minutes2025_26 !== null && !(Number.isInteger(r.minutes2025_26) && r.minutes2025_26 >= 0)) fail(2, `${id}: minutes ${r.minutes2025_26}`);
    // 3. two hosts, official first, one independent, urls and read dates
    const hosts = (r.sources || []).map((s) => s.host);
    if (new Set(hosts).size < 2) fail(3, `${id}: sources on ${new Set(hosts).size} host`);
    if (!officialHosts.has(hosts[0])) fail(3, `${id}: first source ${hosts[0]} is neither the club's site nor the league's`);
    if (!hosts.some((h) => INDEPENDENT.has(h))) fail(3, `${id}: no independent host`);
    for (const s of r.sources || []) {
      let ok = false;
      try { ok = s.url.startsWith('https://') && hostOf(s.url) === s.host; } catch { ok = false; }
      if (!ok) fail(3, `${id}: source url ${s.url} not on host ${s.host}`);
      if (!isDate(s.read) || s.read > d.read) fail(3, `${id}: source read ${s.read} against file ${d.read}`);
    }
    // 5. facts
    const srcHosts = new Set(hosts);
    for (const [k, hs] of Object.entries(r.facts || {})) for (const h of hs) if (!srcHosts.has(h)) fail(5, `${id}: fact ${k} cites ${h}, not a source`);
    if (r.group && !(r.facts.group || []).some((h) => INDEPENDENT.has(h))) fail(5, `${id}: group ${r.group} without an independent host`);
    if (!r.group && (r.facts.group || []).length) fail(5, `${id}: group null but hosts cited`);
    const dobHosts = new Set((r.facts.birthDate || []).filter((h) => INDEPENDENT.has(h)));
    if (r.birthDate && dobHosts.size < 2) fail(5, `${id}: birth date ${r.birthDate} on ${dobHosts.size} independent host`);
    if (!r.birthDate && (r.facts.birthDate || []).length) fail(5, `${id}: birth date null but hosts cited`);
  }
}

// 4. no wiki, 10. no long dashes: every string in every file
const walk = (v, at, out) => {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`, out);
  return out;
};
for (const [name, d] of [['_membership', mem], ...docs]) {
  for (const [at, s] of walk(d, name, [])) {
    // a URL or a host naming a wiki; prose that merely says the word is not a source
    if (/https?:\/\/\S*wiki/i.test(s) || (/\.host$/.test(at) && /wiki/i.test(s))) fail(4, `${at}: ${s.slice(0, 80)}`);
    if (/[\u2013\u2014]/.test(s)) fail(10, `${at}: long dash in "${s.slice(0, 60)}"`);
  }
}

// 6. minutes on two hosts, within one minute an appearance
for (const [c, d] of live) {
  for (const r of d.rows) {
    const id = `${c.slug}/${r.name}`;
    const a = r.minutesSource, b = r.minutesSecondSource;
    if (r.minutes2025_26 === null) {
      if (a || b) fail(6, `${id}: minutes null but a minutes source is cited`);
      continue;
    }
    if (!a || !b || a.host !== MINUTES_HOSTS[0] || b.host !== MINUTES_HOSTS[1]) { fail(6, `${id}: minutes ${r.minutes2025_26} not on ${MINUTES_HOSTS.join(' and ')}`); continue; }
    if (!Number.isInteger(b.minutes) || !Number.isInteger(b.appearances)) { fail(6, `${id}: second source has no minutes or appearances`); continue; }
    if (Math.abs(r.minutes2025_26 - b.minutes) > b.appearances) fail(6, `${id}: Transfermarkt ${r.minutes2025_26} and ESPN ${b.minutes} are more than a minute an appearance apart (${b.appearances})`);
    for (const s of [a, b]) if (!isDate(s.read) || s.read > d.read) fail(6, `${id}: minutes source read ${s.read}`);
  }
}

// 7. one man, one row
const seenIds = { name: new Map(), espn: new Map(), tm: new Map(), fotmob: new Map() };
for (const [c, d] of live) {
  const held = new Set((d.heldOut || []).map((h) => norm(h.name)));
  for (const h of d.heldOut || []) if (typeof h.reason !== 'string' || h.reason.length < 20) fail(7, `${c.slug}: held out ${h.name} with no reason`);
  for (const r of d.rows) {
    const id = `${c.slug}/${r.name}`;
    if (held.has(norm(r.name))) fail(7, `${id}: a row and also held out`);
    const keys = [['name', norm(r.name)], ...['espn', 'tm', 'fotmob'].map((k) => [k, r.seen && r.seen[k] && !r.seen[k].otherMan ? String(r.seen[k].id) : null])];
    for (const [k, v] of keys) {
      if (!v) continue;
      if (seenIds[k].has(v)) fail(7, `${id}: ${k} ${v} also at ${seenIds[k].get(v)}`);
      else seenIds[k].set(v, id);
    }
  }
}

// 8. the count block is arithmetic
for (const [c, d] of live) {
  const rows = d.rows;
  const want = {
    rows: rows.length,
    heldOut: (d.heldOut || []).length,
    twoHostRows: rows.filter((r) => new Set(r.sources.map((s) => s.host)).size >= 2).length,
    birthDateKnown: rows.filter((r) => r.birthDate).length,
    groupKnown: rows.filter((r) => r.group).length,
    minutesKnown: rows.filter((r) => r.minutes2025_26 !== null).length,
  };
  for (const [k, v] of Object.entries(want)) if (d.count[k] !== v) fail(8, `${c.slug}: count.${k} ${d.count[k]} but the rows say ${v}`);
}

// 9. the brief's band, with the one pinned exception
for (const [c, d] of live) {
  const n = d.rows.length;
  const pin = OVER_BAND[c.slug];
  if (pin !== undefined) {
    if (n >= BAND[0] && n <= BAND[1]) fail(9, `${c.slug}: ${n} rows is back in the band, delete its OVER_BAND exception`);
    else if (n !== pin) fail(9, `${c.slug}: ${n} rows, the exception pins exactly ${pin}`);
    if (!d.notes.some((s) => s.includes(`${pin} rows`))) fail(9, `${c.slug}: the file's notes do not disclose its ${pin} rows`);
  } else if (n < BAND[0] || n > BAND[1]) fail(9, `${c.slug}: ${n} rows, outside ${BAND[0]} to ${BAND[1]}`);
}

// 11. the four dump rows are each accounted for
for (const who of DUMP_ROWS) {
  const asRow = live.some(([, d]) => d.rows.some((r) => norm(r.name) === norm(who) && r.marketRow && r.marketRow.length));
  const asCheck = live.some(([, d]) => (d.marketRecheck || []).some((x) => norm(x.player_name) === norm(who) && typeof x.verdict === 'string' && x.verdict.length > 20));
  if (!asRow && !asCheck) fail(11, `${who}: neither a row with marketRow nor a marketRecheck verdict`);
}

// 12. floors against the measured baseline
const all = live.flatMap(([, d]) => d.rows);
const share = (f) => all.filter(f).length / all.length;
const got = { birthDate: share((r) => r.birthDate), group: share((r) => r.group), minutes: share((r) => r.minutes2025_26 !== null) };
for (const [k, floor] of Object.entries(FLOORS)) if (!(got[k] >= floor)) fail(12, `${k} known on ${(got[k] * 100).toFixed(1)} percent of rows, floor ${floor * 100}`);

// ---------- verdict ----------
const bySec = new Map();
for (const [s, m] of fails) { if (!bySec.has(s)) bySec.set(s, []); bySec.get(s).push(m); }
for (const [s, ms] of [...bySec].sort((x, y) => x[0] - y[0])) {
  console.log(`  section ${s}: ${ms.length} failure${ms.length === 1 ? '' : 's'}`);
  for (const m of ms.slice(0, 8)) console.log(`    ${m}`);
}
const pct = (k) => (got[k] * 100).toFixed(1);
console.log(`  ${live.length} clubs, ${all.length} rows, birth date ${pct('birthDate')} percent, group ${pct('group')}, minutes on two hosts ${pct('minutes')}`);
if (CONTROL) {
  const sec = CONTROLS[CONTROL][0];
  if (bySec.has(sec)) { console.log(`simALeagueSquads: control ${CONTROL} fired in section ${sec} (red, as it must be).`); process.exit(1); }
  console.log(`simALeagueSquads: control ${CONTROL} DID NOT FIRE in section ${sec}.`);
  process.exit(3);
}
if (fails.length) { console.log(`simALeagueSquads: RED, ${fails.length} failure${fails.length === 1 ? '' : 's'}.`); process.exit(1); }
console.log('simALeagueSquads: green. Twelve clubs, every row on two hosts, every value two sourced or null, counts honest.');
