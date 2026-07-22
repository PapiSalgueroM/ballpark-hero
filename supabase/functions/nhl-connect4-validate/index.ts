import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------------------------------------------------------------------------
// NHL Connect 4 validator (task #22 follow-on, 2026-07-22) — attribute-pair
// contract {playerName, columnAttribute, rowAttribute}, cloned from the
// fixed nba/mlb/nfl-connect4-validate pattern. Definitions below cover
// every attribute string used in src/data/nhlConnect4Boards.ts.
// ---------------------------------------------------------------------------

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "nhl-connect4";
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
              content: `You are an NHL expert verifier with comprehensive, verified knowledge through the 2024-25 season.

TASK: Determine if a given NHL player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

NAME RULE: The user MUST provide a full first and last name (e.g. "Wayne Gretzky", "Sidney Crosby"). If they only provide a first name or a nickname without a last name, return {"valid": false, "reason": "Please enter the player's full first and last name (e.g. 'Wayne Gretzky')", "fullName": null}.

INCLUSIVE ACCEPTANCE POLICY:
- Team attributes accept ANY player who appeared for that franchise in ANY era — stars, role players, brief stints (regular season or playoffs).
- Account for franchise lineage and relocations: Quebec Nordiques → Colorado Avalanche, Hartford Whalers → Carolina Hurricanes, Minnesota North Stars → Dallas Stars, Atlanta Flames → Calgary Flames, Atlanta Thrashers → the current Winnipeg Jets, Colorado Rockies (NHL) → New Jersey Devils, Kansas City Scouts → Rockies → Devils, the ORIGINAL Winnipeg Jets → Arizona/Phoenix Coyotes → Utah (a different franchise from today's Jets), Mighty Ducks of Anaheim → Anaheim Ducks.
- When in doubt about a lesser-known player's stint, lean toward accepting if plausible; but NEVER accept a player who simply never played for the franchise.

ATTRIBUTE DEFINITIONS:
- Team names ("Maple Leafs", "Canadiens", "Bruins", "Rangers", "Blackhawks", "Red Wings", "Penguins", "Oilers", "Flames", "Capitals", "Lightning", "Avalanche", "Devils", "Islanders", "Flyers", "Blues", "Stars", "Kings", "Sharks", "Ducks", "Canucks", "Senators", "Jets", "Wild", "Predators", "Hurricanes", "Panthers", "Golden Knights", "Sabres", "Blue Jackets") = played for that franchise at any point (see lineage rules; "Avalanche" includes Nordiques years, "Hurricanes" includes Whalers years, "Stars" includes North Stars years, "Jets" means the current franchise incl. Thrashers years).
- "Stanley Cup Champion" = was on a Stanley Cup-winning roster (name engraved or on the playoff roster).
- "Hart Trophy Winner" = won the Hart Memorial Trophy (league MVP).
- "Conn Smythe Winner" = won the Conn Smythe Trophy (playoff MVP).
- "Art Ross Winner" = led the league in points to win the Art Ross Trophy.
- "Norris Trophy Winner" = won the Norris Trophy (best defenseman).
- "Vezina Trophy Winner" = won the Vezina Trophy (best goaltender).
- "Calder Trophy Winner" = won the Calder Trophy (rookie of the year).
- "Rocket Richard Winner" = led the league in goals to win the Maurice Richard Trophy (awarded since 1999).
- "All-Star" = played in at least one NHL All-Star Game.
- "Hall of Famer" = inducted into the Hockey Hall of Fame as a player.
- "500+ Career Goals" = 500 or more career regular-season goals.
- "1,000+ Career Points" = 1,000 or more career regular-season points.
- "50-Goal Season" = scored 50+ goals in a single regular season at least once.
- "100-Point Season" = recorded 100+ points in a single regular season at least once.
- "Goaltender" = the player is a goaltender.
- "Born in Canada" / "Born in the USA" / "Born in Sweden" / "Born in Russia" / "Born in Finland" = born in that country (for Russia, include players born in the Soviet Union on Russian territory).
- "Born in Czechia or Slovakia" = born in the Czech Republic, Slovakia, or the former Czechoslovakia.
- "#1 Overall Draft Pick" = selected first overall in an NHL Entry Draft.
- "Undrafted" = never selected in an NHL draft.
- "Played in the 2010s" = appeared in at least one NHL game between the 2009-10 and 2018-19 seasons inclusive.
- "Only One NHL Team" = spent their ENTIRE NHL career with a single franchise (e.g. Steve Yzerman). Any second franchise disqualifies.

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}`,
            },
            {
              role: "user",
              content: `Does the NHL player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
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
        JSON.stringify({ valid: true, reason: "Could not verify, allowing." }),
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
      parsed = { valid: true, reason: "Could not parse validation response." };
    }

    // cache VERIFIED verdicts only — never the fail-open fallbacks
    if (aiVerdict && parsed && typeof parsed === "object") {
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict: parsed }); } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nhl-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
