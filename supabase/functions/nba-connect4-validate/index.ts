import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// FAIL CLOSED (2026-07-22): when the AI backend can't verify (quota/parse/error),
// do NOT accept. Return {valid:false, unverified:true} so the client shows
// "couldn't verify, try again" instead of silently accepting an unchecked answer.

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "nba-connect4";
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
    try {
      const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
        .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
      if (hit?.verdict) {
        return new Response(JSON.stringify({ ...(hit.verdict as Record<string, unknown>), cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch { /* cache down -> fall through to AI */ }

    const rowKey = attrKeyOf(playerName, rowAttribute);
    const colKey = attrKeyOf(playerName, columnAttribute);
    /* Then the two single attribute facts. If BOTH are known this answers with
       no AI call at all, which is the whole point. */
    try {
      const { data: facts } = await sb.from("ai_validation_cache").select("cache_key, verdict")
        .eq("game", CACHE_GAME).in("cache_key", [rowKey, colKey]);
      const byKey = new Map((facts ?? []).map((f: { cache_key: string; verdict: unknown }) => [f.cache_key, f.verdict as Record<string, unknown>]));
      const rowFact = byKey.get(rowKey);
      const colFact = byKey.get(colKey);
      if (rowFact && colFact) {
        const rowOk = rowFact.match === true;
        const colOk = colFact.match === true;
        return new Response(JSON.stringify({
          valid: rowOk && colOk,
          reason: {
            [rowAttribute]: rowOk ? "Verified previously." : "This player does not match this attribute.",
            [columnAttribute]: colOk ? "Verified previously." : "This player does not match this attribute.",
          },
          fullName: (rowFact.fullName as string) || (colFact.fullName as string) || playerName,
          cached: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch { /* cache down -> fall through to AI */ }

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
              content: `You are an NBA expert verifier with comprehensive, verified knowledge through March 2026.

GROUND TRUTH, 2025-26 SEASON ROSTER UPDATES (use these over any older data):
- Luka Dončić: Los Angeles Lakers (traded Feb 2025 from Dallas Mavericks).
- Kevin Durant: Houston Rockets (traded 2025 from Phoenix Suns).
- Jimmy Butler: Golden State Warriors (traded 2024-25 from Miami Heat).
- Klay Thompson: Dallas Mavericks (signed 2024 free agency from Golden State Warriors).
- Paul George: Philadelphia 76ers (signed 2024 free agency from LA Clippers).
- DeMar DeRozan: Sacramento Kings (signed 2024 from Chicago Bulls).
- Mikal Bridges: New York Knicks (traded 2024 from Brooklyn Nets).
- Karl-Anthony Towns: New York Knicks (traded 2024 from Minnesota Timberwolves).
- Russell Westbrook: Denver Nuggets (signed Feb 2024).
- Victor Wembanyama: San Antonio Spurs (drafted 2023).

TASK: Determine if a given NBA player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

NAME RULE: The user MUST provide a full first and last name (e.g. "LeBron James"). If they only provide a first name or a nickname without a last name, return {"valid": false, "reason": "Please enter the player's full first and last name (e.g. 'LeBron James')", "fullName": null}. Do resolve well-known spellings (e.g. "Steph Curry" = Stephen Curry).

INCLUSIVE ACCEPTANCE POLICY:
- Team attributes accept ANY player who appeared for that franchise in ANY era, stars, role players, end-of-bench players, even brief stints (regular season or playoffs).
- Account for franchise lineage and relocations: Seattle SuperSonics → Oklahoma City Thunder, New Jersey Nets → Brooklyn Nets, Charlotte Bobcats → Charlotte Hornets, Vancouver → Memphis Grizzlies, San Diego → Los Angeles Clippers, Washington Bullets → Wizards, Kansas City Kings → Sacramento Kings.
- When in doubt about a lesser-known player's stint, lean toward accepting if it's plausible; but NEVER accept a player who simply never played for the team (e.g. "LeBron James" + "Celtics" is false).

ATTRIBUTE DEFINITIONS:
- Team names ("Lakers", "Celtics", "Bulls", "Warriors", "Heat", "Spurs", "Nets", "Rockets", "76ers", "Knicks", "Bucks", "Nuggets", "Mavericks", "Cavaliers", "Raptors", "Thunder", "Clippers", "Suns", "Pacers", "Timberwolves", "Hawks", "Trail Blazers", "Kings", "Pistons", "Wizards", "Grizzlies") = played for that franchise at any point (see lineage rules).
- "MVP Winner" = won a regular-season NBA MVP award.
- "DPOY Winner" = won Defensive Player of the Year.
- "Finals MVP" = won an NBA Finals MVP award.
- "6th Man of the Year" = won the Sixth Man of the Year award.
- "Most Improved" = won Most Improved Player.
- "Rookie of the Year" = won Rookie of the Year.
- "All-Star MVP" = won an All-Star Game MVP award.
- "Champion" = won an NBA championship as a player (on the roster).
- "All-Star" = selected to at least one NBA All-Star Game.
- "15+ PPG Career" / "20+ PPG Career" / "25+ PPG Career" = career regular-season scoring AVERAGE at or above that number.
- "10+ RPG Career" = career rebounding average of 10.0 or higher.
- "7+ APG Career" = career assists average of 7.0 or higher.
- "2+ SPG Career" = career steals average of 2.0 or higher.
- "2+ BPG Career" = career blocks average of 2.0 or higher.
- "1500+ 3PM Career" = 1,500 or more career made three-pointers.
- "1000+ Games Played" = 1,000+ career regular-season games.
- "20000+ Career Points" / "10000+ Career Rebounds" / "5000+ Career Assists" / "500+ Career Blocks" / "1000+ Career Steals" = career regular-season totals at or above the number.
- "30+ PPG Season" = averaged 30+ points per game in at least one regular season.
- "#1 Overall Pick" = selected first overall in the NBA draft.
- "Top 5 Pick" = selected among the first five picks of an NBA draft.
- "Undrafted" = never selected in an NBA draft.
- "International Player" = born outside the United States or represents a non-US national team.
- "Played with LeBron" = was an NBA teammate of LeBron James (same team, same time: Cavaliers 2003-10 or 2014-18, Heat 2010-14, Lakers 2018-present).
- "Played with Kobe" = was a Lakers teammate of Kobe Bryant between 1996 and 2016.
- "Played in 2010s" = appeared in at least one NBA game between the 2009-10 and 2018-19 seasons inclusive.
- "Only One NBA Team" = spent their ENTIRE NBA career with a single franchise (e.g. Dirk Nowitzki, Tim Duncan). Any second franchise disqualifies.
- "Traded Mid-Season" = was traded during an NBA season (not an offseason move) at least once.

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
              content: `Does the NBA player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
            },
          ],
        }),
      }
    );
    let response = await callAI();
    if (response.status === 429) {
      // free-tier RPM hit: wait once and retry before failing closed
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

    // cache VERIFIED verdicts only, never the fail-closed fallbacks
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
    console.error("nba-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
