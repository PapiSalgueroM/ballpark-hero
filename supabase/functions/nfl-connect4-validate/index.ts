import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------------------------------------------------------------------------
// NFL Connect 4 validator (task #22 follow-on, 2026-07-22) — attribute-pair
// contract {playerName, columnAttribute, rowAttribute}, cloned from the
// fixed nba-connect4-validate / mlb-connect4-validate pattern. Definitions
// below cover every attribute string used in src/data/nflConnect4Boards.ts.
// ---------------------------------------------------------------------------

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "nfl-connect4";
const cacheKeyOf = (p: string, row: string, col: string) =>
  `${p}|${row}|${col}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

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
- Team attributes accept ANY player who appeared for that franchise in ANY era — stars, backups, special-teamers, brief stints (regular season or postseason).
- Account for franchise lineage and relocations: Oakland/Los Angeles Raiders → Las Vegas Raiders, San Diego Chargers → Los Angeles Chargers, St. Louis/Los Angeles Rams are one franchise, Houston Oilers → Tennessee Titans, Washington Redskins/Football Team → Commanders, Baltimore Colts → Indianapolis Colts, Boston Patriots → New England Patriots, Phoenix/St. Louis/Chicago Cardinals → Arizona Cardinals. NOTE: the Cleveland Browns' history stayed in Cleveland — the Baltimore Ravens are a SEPARATE franchise that began in 1996 (a 1995 Brown did not play "for the Ravens").
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
- "Only One NFL Team" = spent their ENTIRE NFL career with a single franchise (e.g. Tom Brady does NOT qualify — Patriots and Buccaneers).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}`,
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
      return new Response(
        JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now — please try again." }),
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
      parsed = { valid: false, unverified: true, reason: "Couldn't verify your answer right now — please try again." };
    }

    // cache VERIFIED verdicts only — never the fail-open fallbacks
    if (aiVerdict && parsed && typeof parsed === "object") {
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict: parsed }); } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nfl-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now — please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
