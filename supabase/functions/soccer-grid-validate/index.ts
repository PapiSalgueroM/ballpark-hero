import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Soccer 3x3 grid validator, v24 (2026-09-15, Round 613).
 *
 * Resolution order:
 *   1. verified-verdict cache (Postgres), served first as before
 *   2. RECORDS PASS. Every label goes through a closed classifier (World Cup
 *      winner year, position, club, compound club, league, nationality, other)
 *      and only the kinds built for records get a records verdict. All judging
 *      lives in the pure block between the @judge markers: serve() does the
 *      reads, judge() asks for more when it needs them.
 *      a. clubs match exact stored strings from the generated CLUB_IDS block
 *         (scripts/genSoccerGridIds.mjs), never a substring. A club miss is
 *         never a no.
 *      b. nationality matches one exact stored string, and only says no when
 *         the full name is one man with one nationality that no shared
 *         citizenship and no World Cup squad row contradicts.
 *      c. "YYYY World Cup Winner" reads that year's complete winning squad.
 *         A name is a match when it equals a member, is his whole tokens, or
 *         his joined surname; extra tokens and near misses go to the model;
 *         only a name near nobody is a no.
 *      d. two facts off different rows count only for one person: a shared
 *         person_key, or market value birth years within 2 years.
 *   3. AI (free Gemini) only for what the records cannot settle
 *   4. FAIL CLOSED when the model can't verify: nothing unchecked is accepted.
 *
 * Every verdict this version caches carries rule: "v24", so a purge can tell
 * its rows from the ones v23 wrote.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "soccer-grid";
const cacheKeyOf = (p: string, r: string, c: string) =>
  `${p}|${r}|${c}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];
function isAllowedOrigin(o: string) {
  return allowedOrigins.includes(o) || o.endsWith(".lovableproject.com") || o.endsWith(".lovable.app");
}
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count++;
  return e.count > 30;
}

// @judge-begin
/* From here to @judge-end is pure: no reads, no env, no network. serve() does
   the reads and calls judge(); a node harness can bundle this block and call
   judge() with rows it read itself. */

/* ROUND 498: the transliteration step this fold was missing.
   Postgres unaccent folds the letters that have NO canonical decomposition
   (Turkish dotless i, German sharp s, Danish ae and slashed o, Polish barred
   l); NFD cannot touch them, because there is nothing to decompose. So without
   this table "Ömer Aşık" folds to "omer asik" in the database column and
   "omer as k" here, and no typed spelling could ever reach him. Round 486 hit
   exactly this on the NBA table and the ruling was that the DATABASE is right
   and the function is corrected to match. norm() does not build the cache key
   (cacheKeyOf does, separately), so correcting it orphans nothing. */
const TRANSLIT: Record<string, string> = {
  "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d",
};
const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Indisputable public record, nationality strings matching world_cup_players
 *  era naming exactly (West Germany through 1990, Germany from 1994). */
const WC_WINNER_BY_YEAR: Record<string, string> = {
  "1970": "Brazil", "1974": "West Germany", "1978": "Argentina", "1982": "Italy",
  "1986": "Argentina", "1990": "West Germany", "1994": "Brazil", "1998": "France",
  "2002": "Brazil", "2006": "Italy", "2010": "Spain", "2014": "Germany",
  "2018": "France", "2022": "Argentina", "2026": "Spain",
};

/* Citizenship law, same standing as the winners above: no table holds it.
   Key is the wanted stints nationality, values are stored strings whose
   holders share that citizenship, so they never get a hard no for the key.
   genSoccerGridIds.mjs fails if any of these stops being a stored string. */
const SHARED_CITIZENSHIP: Record<string, string[]> = {
  "France": ["Martinique", "Guadeloupe", "French Guiana", "New Caledonia", "Saint-Martin", "Tahiti", "Réunion"],
  "Netherlands": ["Curacao", "Aruba"],
  "Denmark": ["Faroe Islands"],
  "United States": ["Puerto Rico", "Guam", "American Virgin Islands"],
  "England": ["Gibraltar", "Jersey"],
  "Ireland": ["Northern Ireland"],
};

/* Written by scripts/genSoccerGridIds.mjs from the tables. Never edit it by
   hand: rerun the generator, and its --check catches a stale block. */
// @generated-ids-begin
const CLUB_IDS: Record<string, string[]> = {
  "ac milan": ["AC Milan"],
  "ajax": ["Ajax", "Ajax Amsterdam"],
  "al hilal": ["Al-Hilal SFC"],
  "al ittihad": ["Al-Ittihad Club"],
  "al nassr": ["Al-Nassr FC"],
  "anderlecht": ["RSC Anderlecht"],
  "arsenal": ["Arsenal FC"],
  "as roma": ["AS Roma"],
  "aston villa": ["Aston Villa"],
  "atalanta": ["Atalanta", "Atalanta BC"],
  "athletic bilbao": ["Athletic Bilbao"],
  "atletico madrid": ["Atlético Madrid", "Atlético de Madrid"],
  "atletico mineiro": ["Clube Atlético Mineiro"],
  "barcelona": ["Barcelona", "FC Barcelona"],
  "bayer leverkusen": ["Bayer 04 Leverkusen"],
  "bayern munich": ["Bayern Munich"],
  "benfica": ["SL Benfica"],
  "besiktas": ["Besiktas JK"],
  "boca juniors": ["CA Boca Juniors"],
  "bologna": ["Bologna", "Bologna FC 1909"],
  "bordeaux": ["FC Girondins Bordeaux"],
  "borussia dortmund": ["Borussia Dortmund"],
  "borussia monchengladbach": ["Borussia Mönchengladbach"],
  "celta vigo": ["Celta de Vigo"],
  "celtic": ["Celtic FC"],
  "chelsea": ["Chelsea FC"],
  "club brugge": ["Club Brugge KV"],
  "corinthians": ["Sport Club Corinthians Paulista"],
  "crystal palace": ["Crystal Palace"],
  "eintracht frankfurt": ["Eintracht Frankfurt"],
  "espanyol": ["RCD Espanyol Barcelona"],
  "everton": ["Everton FC"],
  "fc basel": ["FC Basel 1893"],
  "fenerbahce": ["Fenerbahce"],
  "feyenoord": ["Feyenoord Rotterdam"],
  "fiorentina": ["ACF Fiorentina"],
  "flamengo": ["CR Flamengo"],
  "fulham": ["Fulham FC"],
  "galatasaray": ["Galatasaray"],
  "genoa": ["Genoa", "Genoa CFC"],
  "gremio": ["Grêmio"],
  "hamburger sv": ["Hamburger SV"],
  "hoffenheim": ["TSG 1899 Hoffenheim"],
  "inter miami": ["Inter Miami", "Inter Miami CF"],
  "inter milan": ["Inter Milan"],
  "juventus": ["Juventus", "Juventus FC"],
  "la galaxy": ["Los Angeles Galaxy"],
  "lazio": ["Lazio", "SS Lazio"],
  "leeds united": ["Leeds United"],
  "leicester city": ["Leicester City"],
  "lille": ["LOSC Lille"],
  "liverpool": ["Liverpool", "Liverpool FC"],
  "lyon": ["Olympique Lyon"],
  "manchester city": ["Manchester City"],
  "manchester united": ["Manchester United"],
  "marseille": ["Olympique Marseille"],
  "monaco": ["AS Monaco"],
  "napoli": ["Napoli", "SSC Napoli"],
  "newcastle": ["Newcastle United"],
  "newcastle united": ["Newcastle United"],
  "nice": ["OGC Nice"],
  "olympiacos": ["Olympiacos Piraeus"],
  "palmeiras": ["SE Palmeiras", "Sociedade Esportiva Palmeiras"],
  "paris saint germain": ["Paris Saint-Germain"],
  "parma": ["Parma", "Parma Calcio 1913"],
  "porto": ["FC Porto"],
  "psg": ["Paris Saint-Germain"],
  "psv": ["PSV Eindhoven"],
  "rangers": ["Rangers FC"],
  "rb leipzig": ["RB Leipzig"],
  "real betis": ["Real Betis Balompié"],
  "real madrid": ["Real Madrid"],
  "real sociedad": ["Real Sociedad"],
  "red bull salzburg": ["Red Bull Salzburg"],
  "rennes": ["Stade Rennais FC"],
  "river plate": ["CA River Plate"],
  "roma": ["AS Roma", "Roma"],
  "saint etienne": ["AS Saint-Étienne"],
  "sampdoria": ["Sampdoria", "UC Sampdoria"],
  "sao paulo": ["São Paulo FC", "São Paulo Futebol Clube"],
  "schalke": ["FC Schalke 04"],
  "sevilla": ["Sevilla", "Sevilla FC"],
  "shakhtar donetsk": ["Shakhtar Donetsk"],
  "southampton": ["Southampton FC"],
  "sporting cp": ["Sporting CP"],
  "stuttgart": ["VfB Stuttgart"],
  "sunderland": ["Sunderland AFC"],
  "torino": ["Torino", "Torino FC"],
  "tottenham": ["Tottenham Hotspur"],
  "tottenham hotspur": ["Tottenham Hotspur"],
  "trabzonspor": ["Trabzonspor"],
  "udinese": ["Udinese", "Udinese Calcio"],
  "valencia": ["Valencia CF"],
  "villarreal": ["Villarreal CF"],
  "werder bremen": ["SV Werder Bremen"],
  "west ham": ["West Ham United"],
  "wolfsburg": ["VfL Wolfsburg"],
  "zenit st petersburg": ["Zenit St. Petersburg"],
};
const CLUB_COMPOUND: Record<string, { mode: "both" | "either"; parts: string[][] }> = {
  "boca juniors or river plate": { mode: "either", parts: [["CA Boca Juniors"], ["CA River Plate"]] },
  "both manchester united and manchester city": { mode: "both", parts: [["Manchester United"], ["Manchester City"]] },
  "both real madrid and atletico madrid": { mode: "both", parts: [["Real Madrid"], ["Atlético Madrid", "Atlético de Madrid"]] },
};
const NATION_IDS: Record<string, { label: string; stints: string; wc: string[] }> = {
  "algerian": { label: "Algerian", stints: "Algeria", wc: ["Algeria"] },
  "american": { label: "American", stints: "United States", wc: ["United States"] },
  "argentine": { label: "Argentine", stints: "Argentina", wc: ["Argentina"] },
  "belgian": { label: "Belgian", stints: "Belgium", wc: ["Belgium"] },
  "brazilian": { label: "Brazilian", stints: "Brazil", wc: ["Brazil"] },
  "cameroonian": { label: "Cameroonian", stints: "Cameroon", wc: ["Cameroon"] },
  "chilean": { label: "Chilean", stints: "Chile", wc: ["Chile"] },
  "colombian": { label: "Colombian", stints: "Colombia", wc: ["Colombia"] },
  "croatian": { label: "Croatian", stints: "Croatia", wc: ["Croatia"] },
  "czech": { label: "Czech", stints: "Czech Republic", wc: ["Czech Republic"] },
  "danish": { label: "Danish", stints: "Denmark", wc: ["Denmark"] },
  "dutch": { label: "Dutch", stints: "Netherlands", wc: ["Netherlands"] },
  "egyptian": { label: "Egyptian", stints: "Egypt", wc: ["Egypt"] },
  "english": { label: "English", stints: "England", wc: ["England"] },
  "french": { label: "French", stints: "France", wc: ["France"] },
  "german": { label: "German", stints: "Germany", wc: ["Germany"] },
  "greek": { label: "Greek", stints: "Greece", wc: ["Greece"] },
  "irish": { label: "Irish", stints: "Ireland", wc: ["Republic of Ireland"] },
  "italian": { label: "Italian", stints: "Italy", wc: ["Italy"] },
  "ivorian": { label: "Ivorian", stints: "Cote d'Ivoire", wc: ["Ivory Coast"] },
  "japanese": { label: "Japanese", stints: "Japan", wc: ["Japan"] },
  "mexican": { label: "Mexican", stints: "Mexico", wc: ["Mexico"] },
  "moroccan": { label: "Moroccan", stints: "Morocco", wc: ["Morocco"] },
  "nigerian": { label: "Nigerian", stints: "Nigeria", wc: ["Nigeria"] },
  "norwegian": { label: "Norwegian", stints: "Norway", wc: ["Norway"] },
  "polish": { label: "Polish", stints: "Poland", wc: ["Poland"] },
  "portuguese": { label: "Portuguese", stints: "Portugal", wc: ["Portugal"] },
  "scottish": { label: "Scottish", stints: "Scotland", wc: ["Scotland"] },
  "senegalese": { label: "Senegalese", stints: "Senegal", wc: ["Senegal"] },
  "serbian": { label: "Serbian", stints: "Serbia", wc: ["FR Yugoslavia", "Serbia", "Serbia and Montenegro"] },
  "south korean": { label: "South Korean", stints: "Korea, South", wc: ["South Korea"] },
  "spanish": { label: "Spanish", stints: "Spain", wc: ["Spain"] },
  "swedish": { label: "Swedish", stints: "Sweden", wc: ["Sweden"] },
  "swiss": { label: "Swiss", stints: "Switzerland", wc: ["Switzerland"] },
  "tunisian": { label: "Tunisian", stints: "Tunisia", wc: ["Tunisia"] },
  "uruguayan": { label: "Uruguayan", stints: "Uruguay", wc: ["Uruguay"] },
  "welsh": { label: "Welsh", stints: "Wales", wc: ["Wales"] },
};
// @generated-ids-end

interface Stint {
  player_name: string; name_folded: string | null; club: string; nationality: string | null;
  position: string | null; first_year: number; last_year: number; person_key: string | null;
}
interface SquadRow { player_name: string; position: string | null; date_of_birth: string | null; nationality: string | null }
interface MarketRow { club: string | null; year: number | null; age: number | null }
interface NationRead { stintsExists: boolean; wcNames: string[] }

/* undefined means not read yet, null means the read failed. A failed read only
   ever makes a criterion unknown, never true and never false. */
interface JudgeReads {
  stints: Stint[] | null;
  byFullName: boolean;
  squads: Record<string, SquadRow[] | null | undefined>;
  nations: Record<string, NationRead | null | undefined>;
  market: MarketRow[] | null | undefined;
}
type Need =
  | { read: "squad"; year: string }
  | { read: "nation"; key: string }
  | { read: "market"; nameFolded: string };
type JudgeResult =
  | { status: "need"; needs: Need[] }
  | { status: "yes"; fullName: string | null }
  | { status: "no"; side: "row" | "col"; fullName: string | null }
  | { status: "unknown" };

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function positionBucket(pos: string | null): string | null {
  const p = norm(pos ?? "");
  if (!p) return null;
  if (p === "gk" || p.includes("keeper")) return "gk";
  if (p === "df" || p.includes("back") || p.includes("defend")) return "def";
  if (p === "mf" || p.includes("midfield")) return "mid";
  if (p === "fw" || p.includes("forward") || p.includes("winger") || p.includes("striker")) return "fwd";
  return null;
}

type Kind = "wc_winner" | "position" | "club" | "compound" | "league" | "nationality" | "other";
interface Crit { kind: Kind; label: string; key: string }

const POSITION_LABELS: Record<string, string> = {
  "forward fwd": "fwd", "midfielder mid": "mid", "defender def": "def", "goalkeeper gk": "gk",
};

/* Closed routing, first match wins. League and other never get a records
   verdict, so no label lands in a matcher that was not built for it. */
function classify(label: string): Crit {
  const l = label.trim();
  const wc = l.match(/^(\d{4}) World Cup Winner$/);
  if (wc && has(WC_WINNER_BY_YEAR, wc[1])) return { kind: "wc_winner", label: l, key: wc[1] };
  const f = norm(l);
  if (has(POSITION_LABELS, f)) return { kind: "position", label: l, key: POSITION_LABELS[f] };
  const club = l.match(/^Played for (.+)$/);
  if (club) {
    const k = norm(club[1]);
    if (has(CLUB_IDS, k)) return { kind: "club", label: l, key: k };
    if (has(CLUB_COMPOUND, k)) return { kind: "compound", label: l, key: k };
    return { kind: "other", label: l, key: "" };
  }
  if (/^Played in /.test(l)) return { kind: "league", label: l, key: "" };
  if (has(NATION_IDS, f)) return { kind: "nationality", label: l, key: f };
  return { kind: "other", label: l, key: "" };
}

type RowTest = (r: Stint) => boolean;

const clubParts = (club: string) => String(club || "").split(" / ").map((p) => p.trim());
const hasClub = (r: Stint, ids: string[]) => clubParts(r.club).some((p) => ids.includes(p));

/* One test per row a criterion needs: a compound "both" needs a row per part,
   everything else needs one row. */
function rowTests(c: Crit): RowTest[] {
  if (c.kind === "club") { const ids = CLUB_IDS[c.key]; return [(r) => hasClub(r, ids)]; }
  if (c.kind === "compound") {
    const cc = CLUB_COMPOUND[c.key];
    if (cc.mode === "either") { const all = cc.parts.flat(); return [(r) => hasClub(r, all)]; }
    return cc.parts.map((ids) => (r: Stint) => hasClub(r, ids));
  }
  if (c.kind === "position") return [(r) => positionBucket(r.position) === c.key];
  if (c.kind === "nationality") { const want = NATION_IDS[c.key].stints; return [(r) => r.nationality === want]; }
  return [];
}
const clubType = (c: Crit) => c.kind === "club" || c.kind === "compound";
const bothParts = (c: Crit) => c.kind === "compound" && CLUB_COMPOUND[c.key].mode === "both";

/* Birth years off market value rows at the row's club (or a side of a split
   season) inside the row's years. Rows with no match have none. */
function birthYears(r: Stint, market: MarketRow[]): number[] {
  const clubs = new Set([r.club, ...clubParts(r.club)]);
  return market
    .filter((m) => m.club != null && clubs.has(m.club) && m.year != null && m.age != null && m.year >= r.first_year && m.year <= r.last_year)
    .map((m) => (m.year as number) - (m.age as number));
}

/* Edit distance where swapping two neighbouring letters is one edit, so a
   typed "busqeuts" sits as near Busquets as "busqets" does. */
function editDistance(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
    }
  }
  return d[a.length][b.length];
}
const nearEnough = (a: string, b: string) => editDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 6));
const spaceless = (s: string) => s.replace(/ /g, "");

type Band = "A" | "B" | "D" | "E" | "F" | "ambiguous";

/* A name against one year's complete winning squad. A: the name, B: whole
   tokens, a single token or a joined surname, of exactly one member. D (extra
   tokens) and E (near) are unknown. F, near nobody, is the only no. */
function wcBand(typed: string, squad: SquadRow[]): { band: Band; row: SquadRow | null } {
  const g = norm(typed);
  if (!g) return { band: "ambiguous", row: null };
  const gt = g.split(" ");
  const gn = spaceless(g);
  const members = squad
    .map((r) => { const f = norm(r.player_name); return { r, f, t: f ? f.split(" ") : [], n: spaceless(f) }; })
    .filter((m) => m.f);
  const runs = (t: string[], tailOnly: boolean) => {
    const out: string[] = [];
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 2; j <= t.length; j++) if (!tailOnly || j === t.length) out.push(t.slice(i, j).join(""));
    }
    return out;
  };
  const one = (hits: typeof members, band: Band) => hits.length === 1 ? { band, row: hits[0].r } : { band: "ambiguous" as Band, row: null };

  const a = members.filter((m) => m.f === g || m.n === gn);
  if (a.length) return one(a, "A");
  const b = members.filter((m) => gt.every((t) => m.t.includes(t)) || m.t.includes(gn) || runs(m.t, true).includes(gn));
  if (b.length) return one(b, "B");
  if (members.some((m) => m.t.every((t) => gt.includes(t)) && gt.some((t) => !m.t.includes(t)))) return { band: "D", row: null };
  const near = members.some((m) => {
    if (gt.some((t) => m.t.includes(t))) return true;
    if (gn.length >= 3 && (m.t.some((t) => t.startsWith(gn)) || m.n.startsWith(gn))) return true;
    if ([...m.t, ...runs(m.t, false), m.n].some((x) => nearEnough(gn, x))) return true;
    return gt.some((x) => x.length >= 4 && m.t.some((y) => y.length >= 4 && nearEnough(x, y)));
  });
  return { band: near ? "E" : "F", row: null };
}

/* The whole records verdict for one guess. Pure: it reads only what serve()
   hands in, and when it needs a read it has not got it says so and serve()
   calls it again with that read filled in. */
function judge(player: string, rowLabel: string, colLabel: string, reads: JudgeReads): JudgeResult {
  const crits = [classify(rowLabel), classify(colLabel)];
  const rows = reads.stints ?? [];
  const needs: Need[] = [];
  const unknown: JudgeResult = { status: "unknown" };
  const yes = (fullName: string | null): JudgeResult => ({ status: "yes", fullName });

  const wc = crits.map((c) => {
    if (c.kind !== "wc_winner") return null;
    const squad = reads.squads[c.key];
    if (squad === undefined) { needs.push({ read: "squad", year: c.key }); return { state: "pending" as const, row: null }; }
    if (squad === null || squad.length < 15) return { state: "unknown" as const, row: null };
    const hit = wcBand(player, squad);
    if (hit.row) return { state: true as const, row: hit.row };
    return { state: hit.band === "F" ? (false as const) : ("unknown" as const), row: null };
  });

  const natFalse = (c: Crit): false | "unknown" | "pending" => {
    if (!reads.stints || rows.length === 0 || !reads.byFullName) return "unknown";
    const id = NATION_IDS[c.key];
    if (new Set(rows.map((r) => r.nationality)).size !== 1) return "unknown";
    const held = rows[0].nationality;
    if (!held || held === id.stints) return "unknown";
    if (has(SHARED_CITIZENSHIP, id.stints) && SHARED_CITIZENSHIP[id.stints].includes(held)) return "unknown";
    const read = reads.nations[c.key];
    if (read === undefined) { needs.push({ read: "nation", key: c.key }); return "pending"; }
    if (read === null || !read.stintsExists) return "unknown";
    const name = norm(rows[0].player_name);
    if (read.wcNames.some((n) => norm(n) === name)) return "unknown";
    return false;
  };

  const falsity = crits.map((c, i) => {
    if (c.kind === "wc_winner") return wc[i]!.state === false ? false : wc[i]!.state === "pending" ? "pending" : "unknown";
    if (c.kind === "nationality") return natFalse(c);
    return "unknown";
  });
  if (needs.some((n) => n.read === "squad")) return { status: "need", needs };

  const squadName = wc.find((w) => w && w.row)?.row?.player_name ?? null;
  const shownName = squadName ?? rows[0]?.player_name ?? null;
  if (falsity[0] === false) return { status: "no", side: "row", fullName: shownName };
  if (falsity[0] === "pending") return { status: "need", needs };
  if (falsity[1] === false) return { status: "no", side: "col", fullName: shownName };
  if (falsity[1] === "pending") return { status: "need", needs };

  const [A, B] = crits;
  if (A.kind === "league" || A.kind === "other" || B.kind === "league" || B.kind === "other") return unknown;
  if ((wc[0] && wc[0].state !== true) || (wc[1] && wc[1].state !== true)) return unknown;

  const market = (): MarketRow[] | null | "need" => {
    if (reads.market !== undefined) return reads.market;
    needs.push({ read: "market", nameFolded: rows[0].name_folded ?? norm(rows[0].player_name) });
    return "need";
  };

  if (wc[0]?.row && wc[1]?.row) {
    const x = wc[0].row, y = wc[1].row;
    return norm(x.player_name) === norm(y.player_name) && x.date_of_birth != null && x.date_of_birth === y.date_of_birth ? yes(x.player_name) : unknown;
  }

  const squadRow = wc[0]?.row ?? wc[1]?.row ?? null;
  if (squadRow) {
    const other = wc[0]?.row ? B : A;
    if (other.kind === "position") return positionBucket(squadRow.position) === other.key ? yes(squadRow.player_name) : unknown;
    const born = squadRow.date_of_birth ? Number(String(squadRow.date_of_birth).slice(0, 4)) : NaN;
    const same = rows.filter((r) => norm(r.player_name) === norm(squadRow.player_name));
    const candidates = rowTests(other).map((test) => same.filter(test));
    if (!Number.isFinite(born) || candidates.length === 0 || candidates.some((c) => c.length === 0)) return unknown;
    const m = market();
    if (m === "need") return { status: "need", needs };
    if (m === null) return unknown;
    const fits = (r: Stint) => { const ys = birthYears(r, m); return ys.length > 0 && ys.every((y) => Math.abs(y - born) <= 2); };
    return candidates.every((c) => c.some(fits)) ? yes(squadRow.player_name) : unknown;
  }

  /* Rows used together must be one person: a shared person_key, or birth years
     on every row all within 2 of each other. "paired" must hold on one of them. */
  const onePerson = (tests: RowTest[], paired: RowTest | null): JudgeResult => {
    const candidates = tests.map((test) => rows.filter(test));
    if (candidates.length === 0 || candidates.some((c) => c.length === 0)) return unknown;
    if (paired && !candidates.some((c) => c.some(paired))) return unknown;
    const settled = (keep: RowTest) => {
      const mine = candidates.map((c) => c.filter(keep));
      return mine.every((c) => c.length > 0) && (!paired || mine.some((c) => c.some(paired)));
    };
    const keys = new Set(candidates.flat().map((r) => r.person_key).filter((k): k is string => !!k));
    for (const k of keys) if (settled((r) => r.person_key === k)) return yes(rows[0].player_name);
    const m = market();
    if (m === "need") return { status: "need", needs };
    if (m === null) return unknown;
    const years = new Map(candidates.flat().map((r) => [r, birthYears(r, m)] as const));
    const starts = new Set([...years.values()].filter((ys) => ys.length > 0).map((ys) => Math.min(...ys)));
    for (const s of starts) {
      if (settled((r) => { const ys = years.get(r) ?? []; return ys.length > 0 && ys.every((y) => y >= s && y <= s + 2); })) return yes(rows[0].player_name);
    }
    return unknown;
  };

  const testsA = rowTests(A), testsB = rowTests(B);
  if (clubType(A) && clubType(B)) return onePerson([...testsA, ...testsB], null);
  if (bothParts(A)) return onePerson(testsA, testsB[0]);
  if (bothParts(B)) return onePerson(testsB, testsA[0]);
  /* Round 482's rule from validate-player: both facts off one single row. */
  return rows.some((r) => testsA[0](r) && testsB[0](r)) ? yes(rows[0].player_name) : unknown;
}
// @judge-end

/* The reads judge() can ask for. Each returns null on any error, and a read
   that could have been cut short counts as failed. */
async function readSquad(year: string): Promise<SquadRow[] | null> {
  try {
    const { data, error } = await sb.from("world_cup_players")
      .select("player_name, position, date_of_birth, nationality")
      .eq("world_cup_year", Number(year))
      .eq("nationality", WC_WINNER_BY_YEAR[year])
      .limit(40);
    return error || !data ? null : (data as SquadRow[]);
  } catch {
    return null;
  }
}

async function readNation(key: string): Promise<NationRead | null> {
  const id = NATION_IDS[key];
  try {
    const held = await sb.from("soccer_player_club_stints").select("id").eq("nationality", id.stints).limit(1);
    if (held.error || !held.data) return null;
    let wcNames: string[] = [];
    if (id.wc.length > 0) {
      const w = await sb.from("world_cup_players").select("player_name").in("nationality", id.wc).limit(1000);
      if (w.error || !w.data || w.data.length >= 1000) return null;
      wcNames = (w.data as { player_name: string }[]).map((r) => r.player_name);
    }
    return { stintsExists: held.data.length > 0, wcNames };
  } catch {
    return null;
  }
}

async function readMarket(nameFolded: string): Promise<MarketRow[] | null> {
  try {
    const { data, error } = await sb.from("player_market_values").select("club, year, age")
      .eq("name_folded", nameFolded).limit(200);
    return error || !data || data.length >= 200 ? null : (data as MarketRow[]);
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, error: "Too many requests" }, 429);

  let sanitized = { player: "", row: "", col: "" };
  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();
    if (!playerName || !rowAttribute || !colAttribute) return json({ valid: false, error: "Missing required fields" });
    sanitized = {
      player: String(playerName).slice(0, 80).replace(/[\n\r]/g, ""),
      row: String(rowAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
      col: String(colAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
    };
  } catch {
    return json({ valid: false, error: "Bad request" }, 400);
  }

  // FAIL CLOSED: when the model can't verify, do NOT accept.
  /* Round 407: a refusal says which it was. A blip is worth a retry; the
     day's allowance (a 429 twice) is not, and the page stops inviting one.
     Still fail closed either way: nothing unverified is ever accepted. */
  const unverified = (exhausted = false) =>
    json({ valid: false, unverified: true, exhausted, reason: exhausted ? "Answer checking has used up its allowance for today, so this guess was not counted. Please come back tomorrow." : "Couldn't verify your answer right now, please try again.", fullName: null });

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true });
  } catch { /* cache down -> continue */ }

  const COLS = "player_name, name_folded, club, nationality, position, first_year, last_year, person_key";

  try {
    /* ROUND 498: matched on the folded column, not the raw one. Measured over
       all 80,586 rows: 6,270 of 27,851 distinct names (22.5 percent) could not
       be reached by any plain spelling, and it is not only accents, a hyphen
       does it too ("Aaron Wan-Bissaka"). */
    const { data, error } = await sb.from("soccer_player_club_stints").select(COLS)
      .eq("name_folded", norm(sanitized.player)).limit(60);
    let stints: Stint[] | null = error || !data ? null : (data as Stint[]);
    const byFullName = !!stints && stints.length > 0;

    if (stints && stints.length === 0 && sanitized.player.trim().split(/\s+/).length === 1) {
      const { data: bySurname, error: surnameError } = await sb.from("soccer_player_club_stints").select(COLS)
        .like("name_folded", `% ${norm(sanitized.player)}`).limit(60);
      if (surnameError || !bySurname) stints = null;
      else {
        const names = new Set(bySurname.map((r: { player_name: string }) => norm(r.player_name)));
        if (names.size === 1) stints = bySurname as Stint[];
      }
    }

    /* v24: judge() is pure and asks for what it needs; the loop fetches it and
       asks again. Three passes cover squad, nation and market reads. */
    const reads: JudgeReads = { stints, byFullName, squads: {}, nations: {}, market: undefined };
    for (let pass = 0; pass < 4; pass++) {
      const out = judge(sanitized.player, sanitized.row, sanitized.col, reads);
      if (out.status === "need") {
        await Promise.all(out.needs.map(async (n) => {
          if (n.read === "squad") reads.squads[n.year] = await readSquad(n.year);
          else if (n.read === "nation") reads.nations[n.key] = await readNation(n.key);
          else reads.market = await readMarket(n.nameFolded);
        }));
        continue;
      }
      if (out.status === "yes") {
        const verdict = { valid: true, reason: "Verified from career records.", fullName: out.fullName, rule: "v24" };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict);
      }
      if (out.status === "no") {
        const which = out.side === "row" ? sanitized.row : sanitized.col;
        const shown = out.fullName ?? sanitized.player;
        const verdict = { valid: false, reason: `${shown} does not satisfy "${which}".`, fullName: out.fullName, rule: "v24" };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict);
      }
      break;
    }
  } catch { /* records pass unavailable -> AI */ }

  if (!AI_KEY) return unverified();

  const prompt = `You are a football/soccer trivia expert (knowledge through 2026). Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"\nConsider all clubs (including loans), nationality, position (GK/DEF/MID/FWD), and honours (Champions League, World Cup, Ballon d'Or, league titles, Golden Boot, 100+ caps, leagues played in). Note: Spain won the 2026 World Cup, beating Argentina in the final. Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  /* Round 407: max_tokens was 150, and the logs showed the model answering
     200 with a body of {"valid": and nothing more: its own reasoning tokens
     spend the budget before the verdict, so every AI judged guess was refused
     as a blip. 800 leaves room for the thinking and the JSON. */
  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 800 }),
    });
    let resp = await callAI();
    /* ROUND 501 PORTS ROUND 485'S CORRECTION HERE, where it was always needed
       too. The free tier limits requests per MINUTE and per DAY and BOTH answer
       429, and this code assumed the day. So a player who hit a sixty second
       window was told to come back TOMORROW. Round 485's logs settled which it
       actually is: on 2026-09-06 the refusals arrived in bursts two seconds
       apart, which is the shape of a per-minute window and not of a spent day,
       and a short retry could never clear one. Read the body and believe it
       rather than guessing. */
    if (resp.status === 429) {
      const body1 = await resp.text().catch(() => "");
      const looksDaily = (s: string) => /per\s*day|perday|requests_per_day/i.test(s);
      if (looksDaily(body1)) {
        console.log(`ai refused 429 DAY: ${body1.slice(0, 200)}`);
        return unverified(true);
      }
      await new Promise((r) => setTimeout(r, 3000));
      resp = await callAI();
      if (resp.status === 429) {
        const body2 = await resp.text().catch(() => "");
        const day = looksDaily(body2);
        console.log(`ai refused 429 ${day ? "DAY" : "MINUTE-or-unknown"}: ${(body2 || body1).slice(0, 200)}`);
        return unverified(day);
      }
    }
    /* Round 407: the status of a refused AI call is the one fact the logs
       need to tell a dead key from a spent day; it carries no secret. */
    if (!resp.ok) { console.log(`ai refused: status ${resp.status}`); return unverified(); }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) { console.log(`ai no verdict: status ${resp.status} body ${content.slice(0, 160)}`); return unverified(); }
    const result = JSON.parse(m[0]);
    /* Round 407: the prompt asks the model to be lenient with spelling, and
       a probe with a nonsense name came back valid with a real player's
       name attached. A verdict only counts when the name the model settled
       on shares a token with the name the player typed; otherwise the guess
       is a miss, never a match handed to a stranger. */
    const guessTokens = norm(sanitized.player).split(" ").filter((t) => t.length > 2);
    const nameTokens = norm(String(result.fullName || "")).split(" ").filter((t) => t.length > 2);
    const sameName = nameTokens.length === 0 || nameTokens.some((t) => guessTokens.includes(t));
    /* ROUND 501: A NAME WE COULD NOT AGREE ON IS NOT A DEFINITE NO, AND IT MUST
       NOT BE REMEMBERED AS ONE.
       This branch fires when the model answered valid but settled on a name
       sharing no token with what the player typed, which is the Round 407 guard
       and is right to refuse the point. What was wrong is the SHAPE of the
       refusal: a hard valid:false, cached forever. Measured 2026-09-07 on
       "Vitinha" for Played for PSG: the stint table holds eight rows for that
       name and not one of them is PSG, so the records pass cannot settle it and
       it goes to the model, which trips this guard, and the hard no was then
       served from cache to every player afterwards. He really did play for PSG.
       Unverified is the honest answer, the grid hooks already treat it as a
       no-penalty retry, and it is NOT cached, because an unverified answer is a
       state of the world rather than a fact about the player. */
    if (result.valid && !sameName) {
      return json({ valid: false, unverified: true, reason: "That name did not match a player we could verify.", fullName: null });
    }
    const verdict = { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null, rule: "v24" };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch (err) {
    console.log(`ai threw: ${String(err).slice(0, 160)}`);
    return unverified();
  }
});
