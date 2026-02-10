import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  "https://footyfein.lovable.app",
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
const RATE_LIMIT_MAX = 20;
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

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
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
      !columnAttribute || typeof columnAttribute !== "string" || columnAttribute.length > 100 ||
      !rowAttribute || typeof rowAttribute !== "string" || rowAttribute.length > 100
    ) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are an NBA expert database with comprehensive, fully up-to-date knowledge of all NBA players in history through February 10, 2026.

CRITICAL: You MUST account for ALL recent trades and roster moves through February 2026. Notable recent moves include but are not limited to:
- Kevin Durant was traded to the Houston Rockets (2025)
- Jimmy Butler trade situations (2025)
- Any other mid-season trades, buyouts, or signings through Feb 2026

When checking if a player "played for" a team, include ANY stint — even partial seasons, mid-season trades, or recent acquisitions. A player counts for a team if they appeared in even one game or were on the active roster.

You need to verify if a player satisfies BOTH of two attributes simultaneously.

Attribute types and what they mean:
- Team names (e.g. "Lakers", "Celtics"): Player has played at least one regular season or playoff game for that franchise at ANY point including the current 2025-26 season. Account for name changes (SuperSonics→Thunder, Nets relocations, etc.) and ALL recent trades.
- "MVP Winner": Won at least one regular season NBA MVP award.
- "DPOY Winner": Won Defensive Player of the Year at least once.
- "Finals MVP": Won Finals MVP at least once.
- "6th Man of the Year": Won the award at least once.
- "Most Improved": Won Most Improved Player at least once.
- "Rookie of the Year": Won ROY at least once.
- "All-Star MVP": Won All-Star Game MVP at least once.
- "Champion": Won at least one NBA championship.
- "All-Star": Selected to at least one NBA All-Star game.
- "#1 Overall Pick" or "Top 5 Pick": Drafted at that position.
- "20+ PPG Career", "25+ PPG Career", "30+ PPG Season", etc.: Career average or season average meets threshold.
- "10+ RPG Career": Career rebounding average meets threshold.
- "7+ APG Career": Career assist average meets threshold.
- "2+ SPG Career", "2+ BPG Career": Career average meets threshold.
- "1500+ 3PM Career", "1000+ 3PM Career": Career three-pointers made total.
- "1000+ Games Played": Career games played total.
- "International Player": Born outside the United States.
- "Only One NBA Team": Played their entire NBA career for one franchise.
- "Played with LeBron": Was a teammate of LeBron James on the same roster for at least part of a season.
- "Played with Kobe": Was a teammate of Kobe Bryant.
- "Played in 2010s", "Played in 1990s", "Played in 2020s": Played at least one game in that decade.
- "Traded Mid-Season": Was traded during a season at least once.
- "20000+ Career Points", "10000+ Career Rebounds", "5000+ Career Assists": Career totals.
- "500+ Career Blocks", "1000+ Career Steals": Career totals.

Respond with ONLY a JSON object: {"valid": true/false, "reason": "brief explanation of why they do or don't match BOTH attributes"}`,
            },
            {
              role: "user",
              content: `Does "${playerName}" satisfy BOTH of these attributes?\n1. ${columnAttribute}\n2. ${rowAttribute}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, allowing." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { valid: true, reason: "Could not parse response." };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nba-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
