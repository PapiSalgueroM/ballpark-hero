// READ ONLY probe: replicates deployed soccer-grid-validate v23 parseCriterion / norm / DEMONYM / nationality evaluate,
// copied verbatim from get_edge_function output on 2026-09-15. No network.
import fs from 'node:fs';
const DIR = 'C:/Users/antho/AppData/Local/Temp/claude/r613/';
const labels = JSON.parse(fs.readFileSync(DIR + 'labels.json', 'utf8'));
const nats = JSON.parse(fs.readFileSync(DIR + 'nationalities.json', 'utf8'));

const TRANSLIT = { "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d" };
const norm = (s) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const DEMONYM = {
  dutch: "netherlands", french: "france", brazilian: "brazil", english: "england",
  spanish: "spain", german: "germany", italian: "italy", portuguese: "portugal",
  argentine: "argentina", argentinian: "argentina", belgian: "belgium", croatian: "croatia",
  serbian: "serbia", swedish: "sweden", norwegian: "norway", danish: "denmark",
  polish: "poland", turkish: "turkey", russian: "russia", ukrainian: "ukraine",
  scottish: "scotland", welsh: "wales", irish: "ireland", uruguayan: "uruguay",
  colombian: "colombia", chilean: "chile", mexican: "mexico", american: "united states",
  japanese: "japan", korean: "south korea", nigerian: "nigeria", ghanaian: "ghana",
  senegalese: "senegal", ivorian: "ivory coast", moroccan: "morocco", algerian: "algeria",
  egyptian: "egypt", cameroonian: "cameroon", swiss: "switzerland", austrian: "austria",
  greek: "greece", czech: "czech republic", slovak: "slovakia", romanian: "romania",
  hungarian: "hungary", finnish: "finland", icelandic: "iceland", australian: "australia",
  canadian: "canada", paraguayan: "paraguay", peruvian: "peru", ecuadorian: "ecuador",
  venezuelan: "venezuela", bosnian: "bosnia-herzegovina", slovenian: "slovenia",
  albanian: "albania", bulgarian: "bulgaria", israeli: "israel", iranian: "iran",
};
const WC_WINNER_BY_YEAR = { "1970": "Brazil", "1974": "West Germany", "1978": "Argentina", "1982": "Italy",
  "1986": "Argentina", "1990": "West Germany", "1994": "Brazil", "1998": "France",
  "2002": "Brazil", "2006": "Italy", "2010": "Spain", "2014": "Germany",
  "2018": "France", "2022": "Argentina", "2026": "Spain" };

function parseCriterion(label) {
  const l = label.trim();
  const club = l.match(/^played for\s+(.+)$/i);
  if (club) return { kind: "club", value: club[1] };
  const league = l.match(/^played in\s+(.+)$/i);
  if (league) return { kind: "league", value: league[1] };
  if (/goalkeeper|\(GK\)/i.test(l)) return { kind: "position", value: "gk" };
  if (/defender|\(DEF\)/i.test(l)) return { kind: "position", value: "def" };
  if (/midfield|\(MID\)/i.test(l)) return { kind: "position", value: "mid" };
  if (/forward|striker|winger|\(FWD\)/i.test(l)) return { kind: "position", value: "fwd" };
  const wc = l.match(/^(\d{4})\s+world cup winner$/i);
  if (wc && WC_WINNER_BY_YEAR[wc[1]]) return { kind: "wc_winner", value: wc[1] };
  if (/world cup|champions league|ballon|golden boot|golden glove|100\+?\s*caps|winner|\bwon\b|champion|title|trophy|top scorer/i.test(l)) {
    return { kind: "honour", value: l };
  }
  return { kind: "nationality", value: l };
}

// nationality evaluate, restricted to one stored nationality string (the per-name check uses any row)
function natMatch(label, stored) {
  const want = DEMONYM[norm(label)] ?? norm(label);
  const n = norm(stored);
  if (!n) return null;
  return n === want || n.includes(want) || want.includes(n);
}

const out = [];
const totalNames = nats.reduce((a, b) => a + b[1], 0);
for (const [label, typ, boards, e, n, h] of labels) {
  const c = parseCriterion(label);
  const row = { label, typ, boards, e, n, h, kind: c.kind, value: c.value };
  if (c.kind === 'nationality') {
    const want = DEMONYM[norm(label)] ?? norm(label);
    row.want = want;
    row.matched = nats.filter(([s]) => natMatch(label, s)).map(([s, k]) => `${s}(${k})`);
    row.matchedNames = nats.filter(([s]) => natMatch(label, s)).reduce((a, b) => a + b[1], 0);
    row.refusedNames = totalNames - row.matchedNames;
  }
  out.push(row);
}
const byKind = {};
for (const r of out) {
  byKind[r.kind] ??= { labels: 0, boards: 0, e: 0, n: 0, h: 0 };
  const k = byKind[r.kind]; k.labels++; k.boards += r.boards; k.e += r.e; k.n += r.n; k.h += r.h;
}
console.log('labels', out.length, 'totalNamesByNat', totalNames);
console.log(JSON.stringify(byKind, null, 1));
console.log('\n--- nationality-routed labels ---');
for (const r of out.filter((r) => r.kind === 'nationality')) {
  console.log(`${r.label} [${r.typ}] boards=${r.boards} (e${r.e}/n${r.n}/h${r.h}) want="${r.want}" matched=${r.matched.join(', ') || 'NONE'}`);
}
console.log('\n--- honour-routed ---');
for (const r of out.filter((r) => r.kind === 'honour')) console.log(`${r.label} [${r.typ}] boards=${r.boards} (e${r.e}/n${r.n}/h${r.h})`);
console.log('\n--- league-routed ---');
for (const r of out.filter((r) => r.kind === 'league')) console.log(`${r.label} [${r.typ}] boards=${r.boards} (e${r.e}/n${r.n}/h${r.h}) value="${r.value}"`);
console.log('\n--- position-routed ---');
for (const r of out.filter((r) => r.kind === 'position')) console.log(`${r.label} [${r.typ}] boards=${r.boards} (e${r.e}/n${r.n}/h${r.h}) value=${r.value}`);
console.log('\n--- wc_winner ---');
for (const r of out.filter((r) => r.kind === 'wc_winner')) console.log(`${r.label} boards=${r.boards} (e${r.e}/n${r.n}/h${r.h})`);
console.log('\n--- club-routed with type != club ---');
for (const r of out.filter((r) => r.kind === 'club' && r.typ !== 'club')) console.log(`${r.label} [${r.typ}] boards=${r.boards} value="${r.value}"`);
fs.writeFileSync(DIR + 'routes.json', JSON.stringify(out, null, 1));
