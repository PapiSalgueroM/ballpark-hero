import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------------------------------------------------------------------------
// MLB Connect 4 validator (task #22, 2026-07-22) — attribute-pair contract
// {playerName, columnAttribute, rowAttribute}, cloned from the FIXED
// nba-connect4-validate / football-connect4-validate pattern. Definitions
// below cover every attribute string used in src/data/mlbConnect4Boards.ts.
// ---------------------------------------------------------------------------

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "mlb-connect4";
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
              content: `You are an MLB expert verifier with comprehensive, verified knowledge through the 2025 season.

TASK: Determine if a given MLB player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

NAME RULE: The user MUST provide a full first and last name (e.g. "Babe Ruth", "Derek Jeter"). If they only provide a first name or a nickname without a last name, return {"valid": false, "reason": "Please enter the player's full first and last name (e.g. 'Derek Jeter')", "fullName": null}. Resolve well-known spellings and suffixes (e.g. "Griffey" alone is not enough, but "Ken Griffey Jr" = Ken Griffey Jr.).

INCLUSIVE ACCEPTANCE POLICY:
- Team attributes accept ANY player who appeared for that franchise in ANY era — stars, role players, September call-ups, brief stints (regular season or postseason).
- Account for franchise lineage and relocations: Brooklyn Dodgers → Los Angeles Dodgers, New York Giants → San Francisco Giants, Philadelphia/Kansas City Athletics → Oakland Athletics, Boston/Milwaukee Braves → Atlanta Braves, Washington Senators → Minnesota Twins (original) and → Texas Rangers (expansion), Montreal Expos → Washington Nationals, St. Louis Browns → Baltimore Orioles, Seattle Pilots → Milwaukee Brewers, Cleveland Indians → Guardians, Tampa Bay Devil Rays → Rays, Florida Marlins → Miami Marlins, California/Anaheim Angels → Los Angeles Angels.
- When in doubt about a lesser-known player's stint, lean toward accepting if plausible; but NEVER accept a player who simply never played for the franchise.

ATTRIBUTE DEFINITIONS:
- Team names ("Yankees", "Red Sox", "Dodgers", "Giants", "Cubs", "Cardinals", "Braves", "Mets", "Phillies", "Astros", "Rangers", "Tigers", "White Sox", "Athletics", "Pirates", "Reds", "Blue Jays", "Mariners", "Padres", "Nationals", "Orioles", "Royals", "Brewers", "Twins", "Guardians", "Angels", "Rays", "Marlins", "Rockies", "Diamondbacks") = played for that franchise at any point (see lineage rules; "Nationals" includes Expos years, "Guardians" includes Indians years).
- "MVP Winner" = won an AL or NL Most Valuable Player award.
- "Cy Young Winner" = won a Cy Young Award.
- "Rookie of the Year" = won an AL or NL Rookie of the Year award.
- "World Series Champion" = was on a World Series-winning roster.
- "World Series MVP" = won a World Series MVP award.
- "All-Star" = selected to at least one MLB All-Star Game.
- "Gold Glove Winner" = won at least one Gold Glove.
- "Silver Slugger Winner" = won at least one Silver Slugger.
- "Hall of Famer" = inducted into the National Baseball Hall of Fame (as a player).
- "Batting Champion" = led the AL or NL in batting average in a season.
- "3000+ Career Hits" / "2500+ Career Hits" = career regular-season hit total at or above the number.
- "500+ Career Home Runs" / "400+ Career Home Runs" = career regular-season home run total at or above the number.
- "300+ Career Wins" = 300 or more career pitching wins.
- "3000+ Career Strikeouts" = 3,000+ career strikeouts as a PITCHER.
- "300+ Career Saves" = 300 or more career saves.
- ".300+ Career Average" = career regular-season batting average of .300 or higher (minimum ~3,000 plate appearances).
- "40+ HR Season" / "50+ HR Season" = hit that many home runs in a single regular season at least once.
- "200+ Hit Season" = recorded 200+ hits in a single regular season.
- "20+ Win Season" = won 20+ games as a pitcher in a single season.
- "30/30 Season" = 30+ home runs AND 30+ stolen bases in the same season.
- "No-Hitter Thrown" = threw an official no-hitter (or perfect game) in MLB.
- "Left-Handed Pitcher" = a pitcher who throws left-handed.
- "Switch Hitter" = batted from both sides of the plate.
- "Catcher" / "Shortstop" = the player's primary position for most of their career.
- "Born Outside the USA" = born outside the United States (Puerto Rico counts as USA-born for this game: treat Puerto Rico-born players as NOT matching "Born Outside the USA").
- "Played in the 1990s" / "Played in the 2010s" = appeared in at least one MLB game in that decade.
- "Only One MLB Team" = spent their ENTIRE MLB career with a single franchise (e.g. Derek Jeter, Tony Gwynn). Any second franchise disqualifies.
- "Played 20+ Seasons" = appeared in 20 or more MLB seasons.

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}`,
            },
            {
              role: "user",
              content: `Does the MLB player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
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
    console.error("mlb-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now — please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
