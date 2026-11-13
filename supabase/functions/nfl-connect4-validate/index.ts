import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------------------------------------------------------------------------
// NFL Connect 4 validator (task #22 follow-on, 2026-07-22), attribute-pair
// contract {playerName, columnAttribute, rowAttribute}, cloned from the
// fixed nba-connect4-validate / mlb-connect4-validate pattern. Definitions
// below cover every attribute string used in src/data/nflConnect4Boards.ts.
// ---------------------------------------------------------------------------

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "nfl-connect4";
const cacheKeyOf = (p: string, row: string, col: string) =>
  `${p}|${row}|${col}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/* ROUND 380: THE CACHE REMEMBERS ONE ATTRIBUTE AT A TIME, NOT ONE PAIR.
   The same change Round 379 made for soccer, for the same reason. A pair
   verdict answers exactly one square and is thrown away for every other square
   asking about the same player, so a free AI quota buys one cell at a time. A
   single attribute answer is reusable on every board that uses that attribute.
   On the soccer boards that turned 105 answered cells into 590 for the same
   spend, and this game's facts are already backfilled from its own true
   verdicts. A guess costs no more than before: one call still answers a miss,
   it is just asked to report the two attributes separately. */
const attrNorm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const attrKeyOf = (player: string, attribute: string) => `attr|${attrNorm(player)}|${attrNorm(attribute)}`;

/* ROUND 703: A STORED "NO" NEVER OUTRANKS OUR OWN RECORDS.
   The same fix as nba-connect4-validate, for the same reason: the cache keeps
   every verdict forever and a wrong "never played for" in it was final. The
   2026-09-19 audit found Isaac TeSlaa refused for the Lions while
   nfl_grid_players has him at DET in 2025, the table the NFL Grid reads.
   So a team attribute is checked against that table BEFORE any stored refusal
   is believed. CONFIRM ONLY: a hit proves the half, a miss proves nothing (the
   table starts in 1970) and falls through to the cache and the model exactly
   as before.
   The codes are nflverse franchise codes, already folded across moves (the
   Oilers are TEN, the Oakland and LA Raiders are LV, the St. Louis Rams are
   LA), so each label needs one code. The Browns stay in Cleveland and the
   Ravens start in 1996, which is what the prompt below says too.
   The lookup reads the plain name column, not display_name and not the indexed
   name_norm: 1,584 rows share a name with another player, and both of those
   columns carry the years that tell namesakes apart ("mike williams 1989
   1995"), so an equality on either would hide every one of them. The imatch
   prefilter over name is the price of seeing them. */
const RECORDS_TABLE = "nfl_grid_players";
const RECORDS_NAME = "name";
const RECORDS_TEAMS = "teams";
const TEAM_CODES: Record<string, string[]> = {
  "49ers": ["SF"],
  "bears": ["CHI"],
  "bengals": ["CIN"],
  "bills": ["BUF"],
  "broncos": ["DEN"],
  "browns": ["CLE"],
  "buccaneers": ["TB"],
  "cardinals": ["ARI"],
  "chargers": ["LAC"],
  "chiefs": ["KC"],
  "colts": ["IND"],
  "commanders": ["WAS"],
  "cowboys": ["DAL"],
  "dolphins": ["MIA"],
  "eagles": ["PHI"],
  "falcons": ["ATL"],
  "giants": ["NYG"],
  "jaguars": ["JAX"],
  "jets": ["NYJ"],
  "lions": ["DET"],
  "packers": ["GB"],
  "panthers": ["CAR"],
  "patriots": ["NE"],
  "raiders": ["LV"],
  "rams": ["LA"],
  "ravens": ["BAL"],
  "saints": ["NO"],
  "seahawks": ["SEA"],
  "steelers": ["PIT"],
  "texans": ["HOU"],
  "titans": ["TEN"],
  "vikings": ["MIN"],
};

/* The same fold the other validators use (Round 486 and Round 498): lowercase,
   unaccented, punctuation flattened. Letters with no canonical decomposition
   are transliterated first, or "Ömer Aşık" can never be reached. */
const TRANSLIT: Record<string, string> = {
  "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d",
};
const foldName = (s: string) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();

/* This table has no folded name column, so "Nikola Jokic" would never reach
   "Nikola Jokić" by an equality. The prefilter lets every letter carry any
   accent and lets a space be any run of spaces, dots, hyphens or apostrophes.
   It is ONLY a prefilter: a row it returns counts only when its stored name
   folds to exactly the typed one. */
const LETTER_VARIANTS: Record<string, string> = {
  a: "aáàâäãåāăą", c: "cçćč", d: "dďđ", e: "eéèêëēėęě", g: "gğģ", i: "iíìîïīįı",
  k: "kķ", l: "lĺļľł", n: "nñńņň", o: "oóòôöõøōő", r: "rŕř", s: "sśşšș",
  t: "tţťț", u: "uúùûüūůűų", y: "yýÿ", z: "zźżž",
};
const namePattern = (folded: string) =>
  "^[ .'’-]*" + [...folded].map((ch) => {
    if (ch === " ") return "[ .'’-]+";
    const v = LETTER_VARIANTS[ch];
    return v ? `[${v}${v.toUpperCase()}]` : ch;
  }).join("") + "[ .'’-]*$";

/* Returns the stored name when our table PROVES the player played for the
   franchise the attribute names, and null in every other case including every
   error. Null means "ask the cache and the model", never "no". */
async function confirmTeamAttribute(playerName: string, attribute: string): Promise<string | null> {
  const want = TEAM_CODES[attrNorm(attribute)];
  if (!want) return null;
  const folded = foldName(playerName);
  if (!folded) return null;
  try {
    const { data } = await sb.from(RECORDS_TABLE).select(`${RECORDS_NAME}, ${RECORDS_TEAMS}`)
      .filter(RECORDS_NAME, "imatch", namePattern(folded)).limit(50);
    /* A full page may not be every row, and "every row" is the whole rule. */
    if ((data ?? []).length >= 50) return null;
    const rows = ((data ?? []) as Record<string, unknown>[])
      .filter((r) => foldName(String(r[RECORDS_NAME] ?? "")) === folded);
    if (rows.length === 0) return null;
    /* One name can be two people. Only when EVERY row the name reaches carries
       the franchise is the answer a yes whoever was meant. */
    const played = (r: Record<string, unknown>) => {
      const raw = r[RECORDS_TEAMS];
      const codes = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(",");
      return codes.some((c) => want.includes(c.trim().toUpperCase()));
    };
    return rows.every(played) ? String(rows[0][RECORDS_NAME]) : null;
  } catch { return null; }
}

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://id-preview--d69b1c20-4988-43ae-947e-7c6feb3ed683.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  if (origin.endsWith(".lovable.app")) return true;
  return false;
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
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { playerName, columnAttribute, rowAttribute } = body;

    if (
      !playerName || typeof playerName !== "string" || playerName.length > 100 ||
      !columnAttribute || typeof columnAttribute !== "string" || columnAttribute.length > 200 ||
      !rowAttribute || typeof rowAttribute !== "string" || rowAttribute.length > 200
    ) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = cacheKeyOf(playerName, rowAttribute, columnAttribute);
    const rowKey = attrKeyOf(playerName, rowAttribute);
    const colKey = attrKeyOf(playerName, columnAttribute);

    /* The pair verdict is still read first. A stored YES answers at once, as it
       always did. A stored NO is HELD rather than returned (Round 703): our own
       records get their say before it is believed. */
    let pairRefusal: Record<string, unknown> | null = null;
    try {
      const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
        .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
      if (hit?.verdict) {
        const stored = hit.verdict as Record<string, unknown>;
        if (stored.valid === true) {
          return new Response(JSON.stringify({ ...stored, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        pairRefusal = stored;
      }
    } catch { /* cache down -> fall through to AI */ }

    /* Then the two single attribute facts. If BOTH halves end up known this
       answers with no AI call at all, which is the whole point. */
    let rowKnown: boolean | null = null;
    let colKnown: boolean | null = null;
    let knownFullName = playerName;
    try {
      const { data: facts } = await sb.from("ai_validation_cache").select("cache_key, verdict")
        .eq("game", CACHE_GAME).in("cache_key", [rowKey, colKey]);
      const byKey = new Map((facts ?? []).map((f: { cache_key: string; verdict: unknown }) => [f.cache_key, f.verdict as Record<string, unknown>]));
      const rowFact = byKey.get(rowKey);
      const colFact = byKey.get(colKey);
      if (rowFact) rowKnown = rowFact.match === true;
      if (colFact) colKnown = colFact.match === true;
      knownFullName = (rowFact?.fullName as string) || (colFact?.fullName as string) || playerName;
    } catch { /* cache down -> fall through to AI */ }

    /* ROUND 703: our records, before any stored "no" is believed. A half the
       facts already call a yes needs no check, unless a stored pair refusal is
       waiting, because that refusal may rest on exactly the half a record
       overturns. */
    const recheck = (known: boolean | null) => pairRefusal !== null || known !== true;
    const rowProved = recheck(rowKnown) ? await confirmTeamAttribute(playerName, rowAttribute) : null;
    const colProved = recheck(colKnown) ? await confirmTeamAttribute(playerName, columnAttribute) : null;
    if (pairRefusal && !rowProved && !colProved) {
      /* A refusal our records do not touch is kept, exactly as before. */
      return new Response(JSON.stringify({ ...pairRefusal, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const determined: Array<{ game: string; cache_key: string; verdict: unknown }> = [];
    if (rowProved) {
      if (rowKnown !== true) determined.push({ game: CACHE_GAME, cache_key: rowKey, verdict: { match: true, fullName: rowProved } });
      rowKnown = true;
      knownFullName = rowProved;
    }
    if (colProved) {
      if (colKnown !== true) determined.push({ game: CACHE_GAME, cache_key: colKey, verdict: { match: true, fullName: colProved } });
      colKnown = true;
      knownFullName = colProved;
    }
    if (pairRefusal) {
      /* The refusal can now only stand on a half the records did not overturn.
         Its own per-half answers fill whatever the facts do not know. */
      if (rowKnown === null && typeof pairRefusal.matchesRow === "boolean") rowKnown = pairRefusal.matchesRow;
      if (colKnown === null && typeof pairRefusal.matchesColumn === "boolean") colKnown = pairRefusal.matchesColumn;
    }
    if (determined.length > 0) {
      try { await sb.from("ai_validation_cache").upsert(determined); } catch { /* non-fatal */ }
    }
    if (rowKnown !== null && colKnown !== null) {
      const fromRecords = rowProved !== null || colProved !== null;
      const halfReason = (proved: string | null, known: boolean) =>
        proved ? "Verified from our own records." : known ? "Verified previously." : "This player does not match this attribute.";
      return new Response(JSON.stringify({
        valid: rowKnown && colKnown,
        reason: {
          [rowAttribute]: halfReason(rowProved, rowKnown),
          [columnAttribute]: halfReason(colProved, colKnown),
        },
        fullName: knownFullName,
        ...(fromRecords ? { source: "records" } : { cached: true }),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const AI_KEY = __GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_KEY) throw new Error("No AI key configured");

    const callAI = () => fetch(
      __AI_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: (__GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash-lite"),
          messages: [
            {
              role: "system",
              content: `You are an NFL expert verifier with comprehensive, verified knowledge through the 2025 season.

TASK: Determine if a given NFL player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

NAME RULE: The user MUST provide a full first and last name (e.g. "Tom Brady", "Jerry Rice"). If they only provide a first name or a nickname without a last name, return {"valid": false, "reason": "Please enter the player's full first and last name (e.g. 'Tom Brady')", "fullName": null}.

INCLUSIVE ACCEPTANCE POLICY:
- Team attributes accept ANY player who appeared for that franchise in ANY era, stars, backups, special-teamers, brief stints (regular season or postseason).
- Account for franchise lineage and relocations: Oakland/Los Angeles Raiders → Las Vegas Raiders, San Diego Chargers → Los Angeles Chargers, St. Louis/Los Angeles Rams are one franchise, Houston Oilers → Tennessee Titans, Washington Redskins/Football Team → Commanders, Baltimore Colts → Indianapolis Colts, Boston Patriots → New England Patriots, Phoenix/St. Louis/Chicago Cardinals → Arizona Cardinals. NOTE: the Cleveland Browns' history stayed in Cleveland, the Baltimore Ravens are a SEPARATE franchise that began in 1996 (a 1995 Brown did not play "for the Ravens").
- When in doubt about a lesser-known player's stint, lean toward accepting if plausible; but NEVER accept a player who simply never played for the franchise.

ATTRIBUTE DEFINITIONS:
- Team names ("Patriots", "Steelers", "Cowboys", "49ers", "Packers", "Giants", "Chiefs", "Colts", "Broncos", "Saints", "Chargers", "Buccaneers", "Bears", "Rams", "Titans", "Vikings", "Lions", "Cardinals", "Bengals", "Raiders", "Ravens", "Seahawks", "Eagles", "Bills", "Texans", "Jaguars", "Jets", "Dolphins", "Falcons", "Panthers", "Browns", "Commanders") = played for that franchise at any point (see lineage rules; "Titans" includes Oilers years, "Commanders" includes Redskins years).
- "Super Bowl Champion" = was on a Super Bowl-winning roster.
- "Super Bowl MVP" = won a Super Bowl MVP award.
- "League MVP" = won an AP NFL Most Valuable Player award.
- "Defensive Player of the Year" = won AP Defensive Player of the Year.
- "Rookie of the Year" = won AP Offensive OR Defensive Rookie of the Year.
- "Pro Bowler" = selected to at least one Pro Bowl.
- "All-Pro" = named AP First-Team All-Pro at least once.
- "Hall of Famer" = inducted into the Pro Football Hall of Fame.
- "40,000+ Career Passing Yards" = career regular-season passing yards at or above 40,000.
- "10,000+ Career Rushing Yards" = career regular-season rushing yards at or above 10,000.
- "10,000+ Career Receiving Yards" = career regular-season receiving yards at or above 10,000.
- "1,000+ Career Receptions" = 1,000 or more career receptions.
- "100+ Career Sacks" = 100+ career sacks (official stat since 1982).
- "50+ Career Interceptions" = 50+ career interceptions as a defender.
- "100+ Receiving TDs" = 100 or more career receiving touchdowns.
- "4,000-Yard Passing Season" = threw for 4,000+ yards in a single regular season at least once.
- "1,500-Yard Rushing Season" = rushed for 1,500+ yards in a single regular season at least once.
- "#1 Overall Draft Pick" = selected first overall in an NFL draft.
- "Undrafted" = never selected in an NFL draft.
- "Played in the 2010s" = appeared in at least one NFL game between the 2010 and 2019 seasons inclusive.
- "Only One NFL Team" = spent their ENTIRE NFL career with a single franchise (e.g. Tom Brady does NOT qualify, Patriots and Buccaneers).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "matchesRow": true or false,
  "matchesColumn": true or false,
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}

"matchesRow" is whether the player matches the ROW attribute ALONE, ignoring
the column entirely. "matchesColumn" is whether they match the COLUMN attribute
ALONE, ignoring the row. "valid" must equal matchesRow AND matchesColumn. Judge
each attribute on its own before combining them: the two answers are stored
separately and reused for other squares, so a wrong single answer is wrong many
times over.`,
            },
            {
              role: "user",
              content: `Does the NFL player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
            },
          ],
        }),
      }
    );
    let response = await callAI();
    if (response.status === 429) {
      // free-tier RPM hit: wait once and retry before falling back
      await new Promise((r) => setTimeout(r, 1200));
      response = await callAI();
    }

    if (!response.ok) {
      /* ROUND 380: a 429 that survives the retry is the DAY's quota, not a blip.
         Round 378 measured that a retry three seconds later recovers none of them,
         so "try again" invites the player to click into a wall. Fail closed exactly
         as before, which is the July 2026 rule, but say which failure it is. */
      const exhausted = response.status === 429;
      return new Response(
        JSON.stringify({
          valid: false,
          unverified: true,
          quotaExhausted: exhausted,
          reason: exhausted
            ? "The answer checker has hit its limit for today, so this guess can't be checked. Squares you've already seen still work, and it resets tomorrow."
            : "Couldn't verify your answer right now, please try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    let aiVerdict = false;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
      aiVerdict = true;
    } catch {
      parsed = { valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." };
    }

    /* ROUND 703: the model never outvotes our records on a half they proved. */
    if (aiVerdict && (rowProved || colProved) && parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      if (rowProved) rec.matchesRow = true;
      if (colProved) rec.matchesColumn = true;
      if (typeof rec.matchesRow === "boolean" && typeof rec.matchesColumn === "boolean") {
        rec.valid = rec.matchesRow && rec.matchesColumn;
        rec.reason = {
          [rowAttribute]: rowProved ? "Verified from our own records." : rec.matchesRow ? "Verified." : "This player does not match this attribute.",
          [columnAttribute]: colProved ? "Verified from our own records." : rec.matchesColumn ? "Verified." : "This player does not match this attribute.",
        };
      } else if (rec.valid !== true) {
        /* A bare "no" that never says which half it meant cannot be read
           against a half our records proved. Fail closed: unverified, and
           nothing is cached. */
        aiVerdict = false;
        parsed = { valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." };
      }
    }

    // cache VERIFIED verdicts only, never the fail-open fallbacks
    if (aiVerdict && parsed && typeof parsed === "object") {
      const rows: Array<{ game: string; cache_key: string; verdict: unknown }> = [
        { game: CACHE_GAME, cache_key: cacheKey, verdict: parsed },
      ];
      /* ROUND 380: keep the two halves separately, which is the whole change. Only
         written when the model answered each attribute on its own: a `valid: false`
         says one of the two failed and never which, so it decomposes into nothing
         and guessing would poison the cache with facts nothing verified. */
      const rec = parsed as Record<string, unknown>;
      const fullName = typeof rec.fullName === "string" ? rec.fullName : playerName;
      if (typeof rec.matchesRow === "boolean") rows.push({ game: CACHE_GAME, cache_key: rowKey, verdict: { match: rec.matchesRow, fullName } });
      if (typeof rec.matchesColumn === "boolean") rows.push({ game: CACHE_GAME, cache_key: colKey, verdict: { match: rec.matchesColumn, fullName } });
      try { await sb.from("ai_validation_cache").upsert(rows); } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nfl-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
