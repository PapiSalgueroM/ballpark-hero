import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Soccer 3x3 grid validator (2026-08-13 v13).
 *
 * Resolution order:
 *   1. verified-verdict cache (Postgres)
 *   2. DETERMINISTIC checks:
 *      a. "YYYY World Cup Winner" against public.world_cup_players squad rows
 *         (complete winner squads 1970-2026, era-correct nationality strings).
 *         The squad row also settles the paired POSITION criterion when the
 *         player is missing from the stints table (v13).
 *      b. club / nationality / position against public.soccer_player_club_stints
 *   3. AI (free Gemini) only for what the data cannot settle
 *   4. FAIL CLOSED when the model can't verify (2026-07-22): do NOT accept an
 *      unchecked answer.
 *
 * v12 fix (four user reports, sg-622/636/678/685): honours labels like
 * "2002 World Cup Winner" used to fall through parseCriterion into the
 * NATIONALITY matcher, which returned a hard cached FALSE. Roberto Carlos as
 * a 2002 winner was rejected by string comparison, not by football. Honours
 * now route to their own deterministic check (World Cup) or the AI, never to
 * the nationality matcher.
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

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const DEMONYM: Record<string, string> = {
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

/** Indisputable public record, nationality strings matching world_cup_players
 *  era naming exactly (West Germany through 1990, Germany from 1994). */
const WC_WINNER_BY_YEAR: Record<string, string> = {
  "1970": "Brazil", "1974": "West Germany", "1978": "Argentina", "1982": "Italy",
  "1986": "Argentina", "1990": "West Germany", "1994": "Brazil", "1998": "France",
  "2002": "Brazil", "2006": "Italy", "2010": "Spain", "2014": "Germany",
  "2018": "France", "2022": "Argentina", "2026": "Spain",
};

type Verdict = true | false | "unknown";
interface Stint {
  player_name: string; club: string; nationality: string | null; position: string | null;
  first_year: number; last_year: number; debut_year: number | null; debut_age: number | null;
}

interface Criterion { kind: "club" | "league" | "position" | "nationality" | "wc_winner" | "honour"; value: string }

function parseCriterion(label: string): Criterion {
  const l = label.trim();
  const club = l.match(/^played for\s+(.+)$/i);
  if (club) return { kind: "club", value: club[1] };
  const league = l.match(/^played in\s+(.+)$/i);
  if (league) return { kind: "league", value: league[1] };
  if (/goalkeeper|\(GK\)/i.test(l)) return { kind: "position", value: "gk" };
  if (/defender|\(DEF\)/i.test(l)) return { kind: "position", value: "def" };
  if (/midfield|\(MID\)/i.test(l)) return { kind: "position", value: "mid" };
  if (/forward|striker|winger|\(FWD\)/i.test(l)) return { kind: "position", value: "fwd" };
  // v12: honours must NEVER fall into the nationality matcher
  const wc = l.match(/^(\d{4})\s+world cup winner$/i);
  if (wc && WC_WINNER_BY_YEAR[wc[1]]) return { kind: "wc_winner", value: wc[1] };
  if (/world cup|champions league|ballon|golden boot|golden glove|100\+?\s*caps|winner|\bwon\b|champion|title|trophy|top scorer/i.test(l)) {
    return { kind: "honour", value: l };
  }
  return { kind: "nationality", value: l };
}

function positionBucket(pos: string | null): string | null {
  const p = norm(pos ?? "");
  if (!p) return null;
  if (p === "gk" || p.includes("keeper")) return "gk";
  if (p === "df" || p.includes("back") || p.includes("defend")) return "def";
  if (p === "mf" || p.includes("midfield")) return "mid";
  if (p === "fw" || p.includes("forward") || p.includes("winger") || p.includes("striker")) return "fwd";
  return null;
}

/* ROUND 489: five of the grid's own club labels could not be satisfied by
   ANYBODY, which is 87 of its 1,883 club cells, 4.6 percent of the board.
   Measured 2026-09-06 by running the live rule below over all 4,931 stored club
   strings and all 100 labels the 710 puzzles use:
     "PSG"              25 cells, stored as Paris Saint-Germain
     "Bayer Leverkusen" 21 cells, stored as Bayer 04 Leverkusen
     "Celta Vigo"       17 cells, stored as Celta de Vigo
     "Rennes"           17 cells, stored as Stade Rennais FC
     "LA Galaxy"         7 cells, stored as Los Angeles Galaxy
   Each fails for the same reason: the substring test cannot cross an inserted
   word. "bayer leverkusen" is not inside "bayer 04 leverkusen", and neither
   contains the other. A player dealt one of those rows could not fill it with
   any spelling of any player, and the game never said why.
   Build Your XI already knew three of these five: src/data/lineupTeams.ts has
   carried PSG and Bayer Leverkusen aliases since Round 442. The knowledge
   existed in one game and not in its neighbour.
   The aliases are EXACT and additive: they only ever add a match, so nothing
   that works today can break, and a reserve side stays out because
   "paris saint germain b" is not the alias. Tightening the loose rule so the
   Barcelona square stops accepting Espanyol is the other half and is specced
   separately, because a naive tightening kills 27 of the 100 labels. */
const CLUB_ALIASES: Record<string, string[]> = {
  "psg": ["Paris Saint-Germain"],
  "bayer leverkusen": ["Bayer 04 Leverkusen"],
  "celta vigo": ["Celta de Vigo"],
  "rennes": ["Stade Rennais FC"],
  "la galaxy": ["Los Angeles Galaxy"],
};

function clubMatches(stintClub: string, wanted: string): boolean {
  const b = norm(wanted);
  if (!b) return false;
  const aliases = (CLUB_ALIASES[b] ?? []).map(norm);
  /* A season split between two clubs is stored as "A / B", so each side is
     read on its own. That can only add matches: no label contains a slash. */
  return String(stintClub || "").split(" / ").some((part) => {
    const a = norm(part);
    if (!a) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    return aliases.includes(a);
  });
}

function evaluate(crit: Criterion, stints: Stint[], careerComplete: boolean): Verdict {
  if (crit.kind === "wc_winner" || crit.kind === "honour") return "unknown"; // resolved elsewhere
  if (stints.length === 0) return "unknown";
  if (crit.kind === "club") {
    if (stints.some((s) => clubMatches(s.club, crit.value))) return true;
    return careerComplete ? false : "unknown";
  }
  if (crit.kind === "nationality") {
    const want = DEMONYM[norm(crit.value)] ?? norm(crit.value);
    const have = stints.map((s) => norm(s.nationality ?? "")).filter(Boolean);
    if (have.length === 0) return "unknown";
    if (have.some((n) => n === want || n.includes(want) || want.includes(n))) return true;
    return false;
  }
  if (crit.kind === "position") {
    const buckets = stints.map((s) => positionBucket(s.position)).filter(Boolean) as string[];
    if (buckets.length === 0) return "unknown";
    return buckets.includes(crit.value) ? true : "unknown";
  }
  return "unknown";
}

/** Deterministic "YYYY World Cup Winner": squad membership in that year's
 *  winning squad. Squads in the table are complete (22-26 rows per winner),
 *  so "not in the squad" is a real false, not a data gap. Also returns the
 *  matched squad row's position so a paired position criterion can be settled
 *  even when the player is missing from the stints table (v13). */
async function checkWorldCupWinner(year: string, player: string): Promise<{ verdict: Verdict; properName: string | null; squadPos: string | null }> {
  const nation = WC_WINNER_BY_YEAR[year];
  if (!nation) return { verdict: "unknown", properName: null, squadPos: null };
  try {
    const { data, error } = await sb.from("world_cup_players")
      .select("player_name, position")
      .eq("world_cup_year", Number(year))
      .eq("nationality", nation)
      .limit(40);
    if (error) return { verdict: "unknown", properName: null, squadPos: null };
    const squad = (data ?? []) as { player_name: string; position: string | null }[];
    if (squad.length < 15) return { verdict: "unknown", properName: null, squadPos: null }; // incomplete squad, do not judge
    const guess = norm(player);
    const hit = squad.find((r) => {
      const nn = norm(r.player_name);
      return nn === guess || nn.includes(guess) || guess.includes(nn);
    });
    if (hit) return { verdict: true, properName: hit.player_name, squadPos: hit.position };
    return { verdict: false, properName: null, squadPos: null };
  } catch {
    return { verdict: "unknown", properName: null, squadPos: null };
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

  const COLS = "player_name, club, nationality, position, first_year, last_year, debut_year, debut_age";

  try {
    const { data } = await sb.from("soccer_player_club_stints").select(COLS)
      .ilike("player_name", sanitized.player).limit(60);
    let stints = (data ?? []) as Stint[];

    if (stints.length === 0 && sanitized.player.trim().split(/\s+/).length === 1) {
      const { data: bySurname } = await sb.from("soccer_player_club_stints").select(COLS)
        .ilike("player_name", `% ${sanitized.player.trim()}`).limit(60);
      const names = new Set((bySurname ?? []).map((r: { player_name: string }) => norm(r.player_name)));
      if (names.size === 1) stints = (bySurname ?? []) as Stint[];
    }

    const rowCrit = parseCriterion(sanitized.row);
    const colCrit = parseCriterion(sanitized.col);

    const debutYear = stints.length ? (stints[0].debut_year ?? Math.min(...stints.map((s) => s.first_year))) : 0;
    const debutAge = stints.length ? stints[0].debut_age : null;
    /* ROUND 489: A NAME IS NOT A PERSON, and careerComplete is what turns that
       into a wrong answer. It is read off stints[0] and it is the switch that
       lets a missing club become a definite NO rather than an honest "we do not
       know". When one name covers several men those rows are several careers,
       and one man's debut year then decides another man's verdict.
       Measured 2026-09-06: "Vitinha" is three men in this table, a Brazilian
       winger at Feirense in 2008 and two Portuguese players, and the PSG
       midfielder's move is not in the table at all. The grid answered "Vitinha
       does not satisfy Played for PSG" as a hard, cached NO, on the strength of
       a different man's debut year.
       So when the fetched rows carry more than one nationality they are more
       than one person, and nothing here is allowed to say a hard no. The
       criterion falls through as unknown, which is the fail-closed direction:
       the guess is not counted rather than wrongly refused and remembered. */
    const identities = new Set(stints.map((s) => norm(s.nationality ?? "")).filter(Boolean));
    const oneManOnly = identities.size <= 1;
    const careerComplete = oneManOnly && stints.length > 0 && (debutYear >= 2005 || (debutAge != null && debutAge <= 21));

    let rowV = evaluate(rowCrit, stints, careerComplete);
    let colV = evaluate(colCrit, stints, careerComplete);
    let properName = stints.length ? stints[0].player_name : null;

    // v12: deterministic World Cup winner resolution, independent of stints.
    // v13: the winner squad row also settles a paired position criterion when
    // the stints table has nothing on the player.
    let squadPos: string | null = null;
    if (rowCrit.kind === "wc_winner") {
      const r = await checkWorldCupWinner(rowCrit.value, sanitized.player);
      rowV = r.verdict;
      if (!properName && r.properName) properName = r.properName;
      if (r.squadPos) squadPos = r.squadPos;
    }
    if (colCrit.kind === "wc_winner") {
      const c = await checkWorldCupWinner(colCrit.value, sanitized.player);
      colV = c.verdict;
      if (!properName && c.properName) properName = c.properName;
      if (c.squadPos) squadPos = c.squadPos;
    }
    if (squadPos && stints.length === 0) {
      const bucket = positionBucket(squadPos);
      if (bucket) {
        if (rowCrit.kind === "position" && rowV === "unknown") rowV = rowCrit.value === bucket ? true : "unknown";
        if (colCrit.kind === "position" && colV === "unknown") colV = colCrit.value === bucket ? true : "unknown";
      }
    }

    if (rowV === true && colV === true) {
      const verdict = { valid: true, reason: "Verified from career records.", fullName: properName };
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
      return json(verdict);
    }
    if (rowV === false || colV === false) {
      const which = rowV === false ? sanitized.row : sanitized.col;
      const shown = properName ?? sanitized.player;
      const verdict = { valid: false, reason: `${shown} does not satisfy "${which}".`, fullName: properName };
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
      return json(verdict);
    }
  } catch { /* deterministic pass unavailable -> AI */ }

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
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 1200));
      resp = await callAI();
    }
    if (resp.status === 429) return unverified(true);
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
    const verdict = result.valid && !sameName
      ? { valid: false, reason: "That name did not match a player we could verify.", fullName: null }
      : { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch (err) {
    console.log(`ai threw: ${String(err).slice(0, 160)}`);
    return unverified();
  }
});
