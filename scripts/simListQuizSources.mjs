/**
 * Round 233 harness (number 97): every List Quiz answer list is audited
 * against the record, because one of them was teaching wrong history.
 *
 * Round 232 found cfb_national_champions was a corrupted scrape (losing
 * scores as records, runners-up as champions, half the winners missing)
 * and the List Quiz had been serving it as "every school with a national
 * title in our records". That table is rebuilt; this harness asks the
 * obvious next question about the OTHER 26 lists the quiz serves, and
 * asks it permanently.
 *
 * Three layers, run through the quiz's own real fetch closures:
 *   1. THE QUIZ'S OWN BAR: every category must return at least its
 *      declared minAnswers after the game's own cleaning, or the shipped
 *      quiz is a broken list.
 *   2. THE CORRUPTION SNIFF: no cleaned answer may look like the
 *      cfb-style column shift: scorelines, bare ranks ("1st"), class
 *      years (Senior, Junior), or position words standing alone.
 *   3. THE PINS, against the tables directly with their year columns:
 *      facts verified outside the database. The champions decided after
 *      January 2026 were verified against news sources on 2026-08-20
 *      (Super Bowl LX: Seahawks 29-13 over the Patriots; 2026 NBA Finals:
 *      the Knicks' first title since 1973, five games over the Spurs,
 *      Brunson MVP; 2026 Stanley Cup: the Hurricanes over Vegas in six;
 *      2026 NCAA basketball: Michigan 69-63 over UConn; 2025-26 Premier
 *      League: Arsenal). A year row that exists with the WRONG winner
 *      fails; a missing recent year is reported loudly as a freshness
 *      note, never silently (no name-the-team quiz needs a brand new
 *      name from those years, every 2026 winner had won before).
 *   4. THE SHAPE FENCES on the four finals-series tables. The first run
 *      of this harness found all four carrying the cfb-style shifted
 *      scrape in their unconsumed columns: scores sitting in loser,
 *      coaches sitting in series_result, the true WNBA runners-up
 *      sitting in finals_mvp, and nba_finals scores whose direction
 *      depended on whose franchise page the scrape read (Boston's 1959
 *      sweep stored as 0-4, Jason Kidd stored as the 2024 winning coach
 *      when Joe Mazzulla's Celtics won). The 2026-08-20 migration
 *      repaired the shape: every cell moved to the column that means it,
 *      corroborated against the record, or went honestly to NULL. These
 *      fences keep it repaired: a loser never starts with a digit, a
 *      series result is winner-first games and nothing else, and the
 *      person columns never carry digits.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simListQuizSources.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/listquiz-entry.mjs";
const OUT = "/tmp/listquiz.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lq = await import('${ROOT}/src/lib/listQuiz.ts');
export const client = await import('${ROOT}/src/integrations/supabase/client.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { lq, client } = await import(pathToFileURL(OUT).href);
const supabase = client.supabase;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };
const fold = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* -------------------------------------------- 1 + 2: the lists themselves */
console.log(`1) the ${lq.LIST_PUZZLES.length} live lists, fetched the quiz's own way`);
let reachable = true;
const listsById = new Map();
for (const p of lq.LIST_PUZZLES) {
  let raw = null;
  try {
    raw = await Promise.race([
      p.fetch(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000)),
    ]);
  } catch { raw = null; }
  if (raw === null) {
    console.log(`   ${p.id}: SKIPPED, SUPABASE UNREACHABLE. THIS LIST WAS NOT CHECKED.`);
    reachable = false;
    continue;
  }
  const answers = lq.cleanAnswers(raw);
  listsById.set(p.id, answers.map(fold));
  if (answers.length < p.minAnswers) {
    fail(`${p.id}: ${answers.length} answers after cleaning, the quiz promises at least ${p.minAnswers}`);
  }
  const SNIFF = [
    [/^[0-9]+\s*[\u2013\u2014-]\s*[0-9]+$/, "a scoreline"],
    [/^[0-9]+(st|nd|rd|th)$/i, "a bare rank"],
    [/^(senior|junior|sophomore|freshman|jr\.?|sr\.?)$/i, "a class year"],
    [/^(quarterback|running back|linebacker|defensive (back|end|tackle|line)|wide receiver|tight end|cornerback|safety|guard|tackle|center|end|halfback|fullback|punter|kicker)$/i, "a position"],
  ];
  for (const a of answers) {
    for (const [re, what] of SNIFF) {
      if (re.test(a.trim())) fail(`${p.id}: answer ${JSON.stringify(a)} is ${what}, the cfb-style column shift`);
    }
  }
}
if (reachable) console.log(`   ${listsById.size} lists fetched and sniffed`);

/* --------------------------------------------------- 3: the pinned facts */
console.log("2) pins that live outside the database");
if (!reachable && listsById.size === 0) {
  console.log("   SKIPPED WITH THE FETCHES ABOVE.");
} else {
  const has = (id, needle) => {
    const l = listsById.get(id);
    return l ? l.some(v => v.includes(needle)) : null;
  };
  const MUST_CONTAIN = [
    ["sb-winners", "seahawks"], ["sb-winners", "chiefs"], ["sb-winners", "eagles"],
    ["sb-mvps", "brady"], ["sb-mvps", "mahomes"],
    ["nba-champs", "celtics"], ["nba-champs", "lakers"], ["nba-champs", "bulls"],
    ["nba-fmvps", "jordan"],
    ["ws-winners", "yankees"], ["ws-winners", "dodgers"],
    ["cup-winners", "canadiens"], ["cup-winners", "panthers"],
    ["f1-champs", "verstappen"], ["f1-champs", "hamilton"], ["f1-champs", "schumacher"], ["f1-champs", "norris"],
    ["epl-champs", "arsenal"], ["epl-champs", "liverpool"], ["epl-champs", "manchester united"],
    ["wimbledon-champs", "federer"], ["wimbledon-champs", "djokovic"],
    ["masters-champs", "nicklaus"], ["masters-champs", "woods"],
    ["nascar-champs", "larson"],
    ["cfb-champs", "texas"], ["cfb-champs", "indiana"], ["cfb-champs", "penn state"],
    ["cbb-champs", "ucla"], ["cbb-champs", "duke"], ["cbb-champs", "florida"],
    ["wnba-champs", "aces"],
    ["afl-premiers", "collingwood"], ["afl-premiers", "brisbane lions"],
    ["afl-premiers", "west coast"], ["afl-premiers", "st kilda"], ["afl-premiers", "footscray"],
    ["nrl-premiers", "south sydney"], ["nrl-premiers", "penrith"],
    ["nrl-premiers", "north sydney"], ["nrl-premiers", "newtown"], ["nrl-premiers", "st george illawarra"],
    ["ballon-dor-winners", "messi"], ["ballon-dor-winners", "rodri"], ["ballon-dor-winners", "dembele"],
    ["heisman-winners", "travis hunter"], ["heisman-winners", "mendoza"],
  ];
  for (const [id, needle] of MUST_CONTAIN) {
    const v = has(id, needle);
    if (v === null) continue; /* list skipped above */
    if (!v) fail(`${id}: the verified answer "${needle}" is missing from the list`);
  }

  /* year-conditional: when the row for a decided season exists, its winner
     must be the real one. A missing year is a loud freshness note. */
  const yearPin = async (table, yearCol, year, winCol, needle, extra) => {
    try {
      let q = supabase.from(table).select(`${yearCol}, ${winCol}`).eq(yearCol, year);
      if (extra) q = extra(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        console.log(`   FRESHNESS: ${table} has no ${year} row yet (real winner: ${needle}); the name-the-team quizzes need no new name from it`);
        return;
      }
      if (!data.some(r => fold(r[winCol]).includes(needle))) {
        fail(`${table} ${year}: winner is ${JSON.stringify(data.map(r => r[winCol]))}, the verified champion is "${needle}"`);
      }
    } catch {
      console.log(`   ${table}: UNREACHABLE FOR THE ${year} PIN, NOT CHECKED.`);
      reachable = false;
    }
  };
  await yearPin("super_bowls", "year", 2026, "winner", "seahawks");
  await yearPin("nba_finals", "year", 2025, "winner", "thunder");
  await yearPin("nba_finals", "year", 2026, "winner", "knicks");
  await yearPin("stanley_cup_finals_v2", "year", 2025, "winner", "panthers");
  await yearPin("stanley_cup_finals_v2", "year", 2026, "winner", "hurricanes");
  await yearPin("world_series_v2", "year", 2025, "winner", "dodgers");
  await yearPin("ncaa_basketball_champions", "year", 2025, "champion", "florida");
  await yearPin("ncaa_basketball_champions", "year", 2026, "champion", "michigan");
  await yearPin("f1_driver_standings", "season", 2025, "driver_name", "norris", q => q.eq("position", 1));
  await yearPin("ballon_dor", "year", 2024, "player_name", "rodri", q => q.eq("rank", 1).eq("award_type", "Men"));
  await yearPin("ballon_dor", "year", 2025, "player_name", "dembele", q => q.eq("rank", 1).eq("award_type", "Men"));
  await yearPin("cfb_heisman_winners", "year", 2024, "winner", "travis hunter");
  await yearPin("cfb_heisman_winners", "year", 2025, "winner", "mendoza");
  await yearPin("afl_premiers", "year", 2025, "premier", "brisbane");
  await yearPin("nrl_premiers", "year", 2025, "premier", "brisbane broncos");
  console.log("   pins done");

  /* the NRL premiers roll is a Round 236 build, two-source verified
     (Wikipedia's premiers roll against Topend Sports, 2026-08-20,
     agreeing on every year). Exact ratchet: 117 rows covering 1908 to
     2025, with 1997 twice (ARL and Super League premiers are both
     real), 2007 and 2009 ABSENT FOREVER (Melbourne's stripped titles
     stay vacant, so the table must never teach them), 20 canonical
     names, and the famous counts. When the 2026 grand final is played,
     the new row and these numbers move together, on purpose. */
  try {
    const { data, error } = await supabase.from("nrl_premiers").select("year, premier");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length !== 117) fail(`nrl_premiers: ${rows.length} rows, the verified roll is exactly 117`);
    const byYear = new Map();
    for (const r of rows) byYear.set(r.year, (byYear.get(r.year) ?? 0) + 1);
    for (let y = 1908; y <= 2025; y++) {
      const want = y === 1997 ? 2 : (y === 2007 || y === 2009 ? 0 : 1);
      if ((byYear.get(y) ?? 0) !== want) {
        fail(`nrl_premiers: season ${y} has ${byYear.get(y) ?? 0} rows, the record says ${want}${want === 0 ? " (stripped title, must stay vacant)" : ""}`);
      }
    }
    const counts = new Map();
    for (const r of rows) counts.set(r.premier, (counts.get(r.premier) ?? 0) + 1);
    if (counts.size !== 20) fail(`nrl_premiers: ${counts.size} distinct names, the roll has 20`);
    const FLAGS = [
      ["South Sydney Rabbitohs", 21], ["St George", 15],
      ["Eastern Suburbs", 11], ["Balmain", 11],
      ["Canterbury-Bankstown Bulldogs", 8], ["Manly-Warringah Sea Eagles", 8],
      ["Brisbane Broncos", 7], ["Penrith Panthers", 6],
      ["Melbourne Storm", 4], ["Sydney Roosters", 4],
      ["North Sydney", 2], ["St George Illawarra Dragons", 1],
    ];
    for (const [club, n] of FLAGS) {
      if ((counts.get(club) ?? 0) !== n) fail(`nrl_premiers: ${club} shows ${counts.get(club) ?? 0} premierships, the record says ${n}`);
    }
    console.log("   nrl_premiers: 117 rows, 20 names, stripped years vacant, famous counts hold");
  } catch {
    console.log("   nrl_premiers: UNREACHABLE, NOT CHECKED.");
    reachable = false;
  }

  /* the AFL premiers roll is a Round 234 build, two-source verified
     (afl.com.au against aflonline.com.au, 2026-08-20, agreeing on every
     year). Exact ratchet: 129 seasons 1897 through 2025, each year once,
     18 names because clubs are recorded as they were at the time, and
     the famous flag counts. When the 2026 grand final is played, the new
     row and these numbers move together, on purpose. */
  try {
    const { data, error } = await supabase.from("afl_premiers").select("year, premier");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length !== 129) fail(`afl_premiers: ${rows.length} rows, the verified roll is exactly 129 (1897 to 2025)`);
    const years = new Set(rows.map(r => r.year));
    if (years.size !== rows.length) fail("afl_premiers: a season appears twice");
    for (let y = 1897; y <= 2025; y++) if (!years.has(y)) fail(`afl_premiers: season ${y} is missing`);
    const counts = new Map();
    for (const r of rows) counts.set(r.premier, (counts.get(r.premier) ?? 0) + 1);
    if (counts.size !== 18) fail(`afl_premiers: ${counts.size} distinct names, the roll has 18`);
    const FLAGS = [
      ["Essendon", 16], ["Carlton", 16], ["Collingwood", 16],
      ["Richmond", 13], ["Hawthorn", 13], ["Melbourne", 13],
      ["Geelong", 10], ["Fitzroy", 8], ["St Kilda", 1], ["Western Bulldogs", 1],
    ];
    for (const [club, n] of FLAGS) {
      if ((counts.get(club) ?? 0) !== n) fail(`afl_premiers: ${club} shows ${counts.get(club) ?? 0} flags, the record says ${n}`);
    }
    console.log("   afl_premiers: 129 seasons, 18 names, famous counts hold");
  } catch {
    console.log("   afl_premiers: UNREACHABLE, NOT CHECKED.");
    reachable = false;
  }

  /* ------------------------------------ 4: the finals-table shape fences */
  console.log("3) shape fences on the finals-series tables");
  /* [table, person column that must never carry digits, row floor, floor
     of rows with a real named loser]. Floors sit at roughly half to two
     thirds of what the repaired tables measure (110/27, 121/20, 29/29,
     80/16), so they catch a truncation without flapping. */
  const SHAPES = [
    ["stanley_cup_finals_v2", null, 100, 20],
    ["world_series_v2", null, 110, 15],
    ["wnba_finals", "finals_mvp", 25, 25],
    ["nba_finals", "winning_coach", 70, 70], /* loser floor raised R239: all 80 finals carry the beaten finalist */
  ];
  const SCOREISH = /^[0-9]/;
  const SERIES = /^([0-9]+)-([0-9]+)(-[0-9]+)?$/;
  for (const [table, personCol, rowFloor, loserFloor] of SHAPES) {
    try {
      const cols = "year, loser, series_result" + (personCol ? ", " + personCol : "");
      const { data, error } = await supabase.from(table).select(cols);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (rows.length < rowFloor) fail(`${table}: ${rows.length} rows, the floor is ${rowFloor}, the table shrank`);
      let named = 0;
      for (const r of rows) {
        if (r.loser != null) {
          if (SCOREISH.test(String(r.loser).trim())) {
            fail(`${table} ${r.year}: loser ${JSON.stringify(r.loser)} starts with a digit, the shifted scrape is back`);
          } else {
            named += 1;
          }
        }
        if (r.series_result != null) {
          const m = String(r.series_result).match(SERIES);
          if (!m) fail(`${table} ${r.year}: series_result ${JSON.stringify(r.series_result)} is not winner-first games`);
          else if (Number(m[1]) <= Number(m[2])) fail(`${table} ${r.year}: series_result ${JSON.stringify(r.series_result)} reads loser-first`);
        }
        if (personCol && r[personCol] != null && /[0-9]/.test(String(r[personCol]))) {
          fail(`${table} ${r.year}: ${personCol} ${JSON.stringify(r[personCol])} carries digits, that column is a person`);
        }
      }
      if (named < loserFloor) fail(`${table}: only ${named} named losers, the floor is ${loserFloor}, recovered losers went missing`);
      console.log(`   ${table}: ${rows.length} rows, ${named} named losers, shape clean`);
    } catch {
      console.log(`   ${table}: SHAPE CHECK UNREACHABLE, NOT CHECKED.`);
      reachable = false;
    }
  }
}

if (!reachable) console.log("   AT LEAST ONE SECTION DID NOT RUN. Re-run from a sandbox that reaches Supabase before trusting the lists.");

console.log("");
if (failures > 0) {
  console.error(`simListQuizSources: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simListQuizSources: green. Every list the quiz serves matches the record.");
