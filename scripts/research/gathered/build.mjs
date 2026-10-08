// Round 1052 research tooling. Turns the three squad lists read for each club (fetch.mjs) into the research
// file a gathered league is generated from: rows that pass the rules, and a leftOut list with the reason.
//   GATHERED_RAW=<folder of saved host answers> node scripts/research/gathered/build.mjs
//     scripts/research/gathered/clubs-ru.mjs scripts/research/gathered/facts-ru.json . [readDate]   (one line)
// It reads no network: fetch.mjs does, once, and keeps each answer. Committed since the review of Round 1052
// found that the first cut dropped fifty real squad members and nothing in the repo could show it.
// build.mjs holds the folds and the three parsers, club.mjs matches one club's three lists, build2.mjs
// applies the rules about names the game already holds and writes the file.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { LEAGUE, CLUBS } = mod;
const FACTS = JSON.parse(fs.readFileSync(path.resolve(process.argv[3]), 'utf8'));
const REPO = path.resolve(process.argv[4]);
const READ = process.argv[5] || FACTS.read;
const TM = 'transfermarkt.com';
const ESPN = 'site.api.espn.com';

/* ---------- folding and similarity ---------- */
const SPECIALS = { 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd', 'ł': 'l', 'Ł': 'l', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'ß': 'ss', 'þ': 'th', 'Þ': 'th', 'ħ': 'h', 'Ħ': 'h', 'ı': 'i', 'İ': 'i', 'ŋ': 'n', 'Ŋ': 'n' };
const fold = s => [...(s || '')].map(ch => SPECIALS[ch] ?? ch).join('').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const bigrams = s => { const t = fold(s).replace(/ /g, ''); const out = new Map(); for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); out.set(b, (out.get(b) || 0) + 1); } return out; };
function dice(a, b) {
  const A = bigrams(a), B = bigrams(b); let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v; for (const v of B.values()) nb += v;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0);
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}
const lastTok = s => fold(s).split(' ').pop();
const sim = (a, b) => Math.max(dice(a, b), dice(lastTok(a), lastTok(b)) * 0.95);

/* ---------- the two hosts' pages ---------- */
const TM_GROUP = { Torwart: 'GK', Abwehr: 'DEF', Mittelfeld: 'MID', Sturm: 'FWD' };
const ESPN_GROUP = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' };
const unescapeHtml = s => s.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
function parseValue(txt) {
  const m = txt.match(/€([0-9.]+)(m|k|bn)?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Math.round(n * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : m[2] === 'bn' ? 1e9 : 1));
}
function parseTm(file) {
  const html = fs.readFileSync(file, 'utf8');
  const season = (html.match(/<title>[^<]*Detailed squad (\d\d\/\d\d)/) || [])[1] || null;
  const start = html.indexOf('<table class="items">');
  if (start < 0) throw new Error('no squad table in ' + file);
  const end = html.indexOf('</table>\n', html.indexOf('<tfoot', start) > 0 ? html.indexOf('<tfoot', start) : start);
  const body = html.slice(start, html.indexOf('<div class="keys"', start) > 0 ? html.indexOf('<div class="keys"', start) : html.length);
  const rows = [];
  const parts = body.split(/<tr class="(?:odd|even)">/).slice(1);
  for (const part of parts) {
    const g = part.match(/rueckennummer bg_(\w+)" title="([^"]*)"/);
    const num = (part.match(/<div class=rn_nummer>([^<]*)<\/div>/) || [])[1];
    /* The name link may carry icons after the name (captain, injured, suspended, not eligible), each a
     * span with a title. The first cut of this parser wanted a link holding text only, so it silently
     * dropped every man with an icon: 50 of the 437 rows on the sixteen Russian pages, eleven club
     * captains among them, and the research then filed them as "not on this list". So: the name is the
     * text before the first tag, the icons are read as marks, and a row that does not parse stops the
     * build (see the throw below) instead of vanishing. */
    const link = part.match(/<a href="\/[^"]*\/profil\/spieler\/(\d+)">([\s\S]*?)<\/a>/);
    const nameText = link ? (link[2].match(/^\s*([^<]+?)\s*(?:<|$)/) || [])[1] : null;
    const who = link && nameText ? [link[0], link[1], nameText] : null;
    const icons = link ? [...link[2].matchAll(/<span title="([^"]*)"/g)].map(m => unescapeHtml(m[1]).replace(/\s+[\u2013\u2014]\s+/g, ', ')) : [];
    const pos =part.match(/<\/tr>\s*<tr>\s*<td>\s*([^<]+?)\s*<\/td>\s*<\/tr>\s*<\/table>/);
    const born = part.match(/<td class="zentriert">(\d\d)\/(\d\d)\/(\d{4}) \((\d+)\)<\/td>/);
    const afterBorn = born ? part.slice(part.indexOf(born[0])) : part;
    const nat = afterBorn.match(/<img src="[^"]*flagge[^"]*" title="([^"]+)"/);
    const valCell = part.match(/<td class="rechts hauptlink">([\s\S]*?)<\/td>/);
    const marks = [...part.matchAll(/<span class="(?:wechsel-kader-wappen|verletzt-table|ausfall-[0-9a-z-]+)[^"]*"[^>]*>\s*<a title="([^"]+)"/g)].map(m => unescapeHtml(m[1]));
    const loan = [...part.matchAll(/title="([^"]*(?:[Ll]oan)[^"]*)"/g)].map(m => unescapeHtml(m[1]));
    if (!who || !g) throw new Error(`a squad row of ${file} did not parse (name ${who ? 'ok' : 'missing'}, group ${g ? 'ok' : 'missing'}): ${part.slice(0, 200).replace(/\s+/g, ' ')}`);
    rows.push({
      id: Number(who[1]), name: unescapeHtml(who[2]), number: num && /^\d+$/.test(num) ? Number(num) : null,
      group: TM_GROUP[g[1]] || null, groupText: g[2], tmPosition: pos ? unescapeHtml(pos[1]) : null,
      birthDate: born ? `${born[3]}-${born[2]}-${born[1]}` : null, agePrinted: born ? Number(born[4]) : null,
      nationality: nat ? unescapeHtml(nat[1]) : null,
      valueEur: valCell ? parseValue(valCell[1].replace(/<[^>]+>/g, '')) : null,
      marks: [...new Set([...icons, ...marks, ...loan])],
    });
  }
  /* A second count that does not go through the row parser: every squad row prints one shirt number
   * cell. `printed` is what the research records as the list's size, and the two must agree. */
  const printed = (body.match(/<td class="zentriert rueckennummer bg_/g) || []).length;
  if (printed !== rows.length || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error(`${file}: ${printed} shirt number cells, ${rows.length} rows parsed, ${new Set(rows.map(r => r.id)).size} distinct ids`);
  return { season, rows, printed };
}
function parseEspn(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (j.athletes || []).map(a => ({
    id: Number(a.id), name: a.displayName || a.fullName, number: a.jersey && /^\d+$/.test(a.jersey) ? Number(a.jersey) : null,
    group: ESPN_GROUP[a.position?.abbreviation] || null, groupText: a.position?.name || null,
    birthDate: a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : null, agePrinted: a.age ?? null,
    nationality: a.citizenship || null, status: a.status?.name || null,
  }));
  return { team: j.team?.displayName, colour: j.team?.color ? '#' + j.team.color : null, season: j.season?.displayName || null, year: j.season?.year || null, rows };
}
const ageOn = (birth, on) => {
  const [y, m, d] = birth.split('-').map(Number); const [Y, M, D] = on.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
};

/* ---------- what the game already holds (rule 8) ---------- */
const readLF = f => fs.readFileSync(path.join(REPO, f), 'utf8').split('\r\n').join('\n');
function squadsOf(text) {
  const out = new Map();
  for (const b of text.matchAll(/^  '((?:[^'\\]|\\.)+)': \[\n([\s\S]*?)^  \],\n/gm)) {
    for (const m of b[2].matchAll(/\{ n: '((?:[^'\\]|\\.)*)', p: '(\w+)', a: (\d+)/g)) {
      const n = m[1].replace(/\\'/g, "'");
      if (!out.has(n)) out.set(n, []);
      out.get(n).push({ club: b[1].replace(/\\'/g, "'"), p: m[2], a: Number(m[3]) });
    }
  }
  return out;
}
const baked = squadsOf(readLF('src/data/clubManagerRosters.ts'));
const aleague = squadsOf(readLF('src/data/clubManagerALeague2026.ts'));
const freeAgents = new Map([...readLF('src/data/clubManagerFreeAgents2026.ts').matchAll(/\{ name: '((?:[^'\\]|\\.)*)', position: '(\w+)', age: (\d+)/g)].map(m => [m[1].replace(/\\'/g, "'"), { p: m[2], a: Number(m[3]) }]));
const natText = readLF('src/data/playerNationalities.ts');
const nowStart = natText.indexOf('\nnow: {'); const nowEnd = natText.indexOf('\n},', nowStart);
const nowNat = new Map([...natText.slice(nowStart, nowEnd).matchAll(/^  '((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)',$/gm)].map(m => [m[1].replace(/\\'/g, "'"), m[2].replace(/\\'/g, "'")]));
const foldedIndex = new Map();
const addFold = (n, where) => { const f = fold(n); if (!foldedIndex.has(f)) foldedIndex.set(f, []); foldedIndex.get(f).push({ n, where }); };
for (const [n, at] of baked) for (const x of at) addFold(n, { file: 'baked', ...x });
for (const [n, at] of aleague) for (const x of at) addFold(n, { file: 'aleague', ...x });
for (const [n, x] of freeAgents) addFold(n, { file: 'freeAgents', club: null, ...x });
for (const extra of (mod.OTHER_GENERATED || [])) {
  const t = fs.existsSync(path.join(REPO, extra)) ? squadsOf(readLF(extra)) : new Map();
  for (const [n, at] of t) for (const x of at) addFold(n, { file: 'generated', ...x });
}

/* ---------- nationality spellings: other hosts' -> Transfermarkt's (the house convention) ---------- */
const NAT_ALIAS = Object.assign({
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina', 'Congo DR': 'DR Congo', 'Republic of Ireland': 'Ireland',
  'South Korea': 'Korea, South', 'Korea Republic': 'Korea, South', 'South Sudan': 'Southern Sudan', USA: 'United States',
}, mod.NAT_ALIAS_EXTRA || {});
const natTm = s => (s == null ? null : (NAT_ALIAS[s] ?? s));

globalThis.__lib = { fold, sim, parseTm, parseEspn, ageOn, baked, aleague, freeAgents, nowNat, foldedIndex, LEAGUE, CLUBS, FACTS, READ, TM, ESPN, REPO, natTm, NAT_ALIAS };
const here = path.dirname(path.resolve(process.argv[1]));
await import(pathToFileURL(path.join(here, 'club.mjs')).href);
globalThis.__ctx = globalThis.__lib;
await import(pathToFileURL(path.join(here, 'build2.mjs')).href);
