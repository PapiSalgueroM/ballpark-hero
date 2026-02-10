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
    const { previousPlayer, newPlayer } = body;

    if (
      !previousPlayer || typeof previousPlayer !== "string" || previousPlayer.length > 100 ||
      !newPlayer || typeof newPlayer !== "string" || newPlayer.length > 100
    ) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid input" }), {
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
              content: `You are an NBA expert database with comprehensive, fully up-to-date knowledge of all NBA players through February 10, 2026.

CRITICAL: Account for ALL recent trades, draft picks, and roster moves through Feb 2026, including but not limited to:
- Jimmy Butler traded to the Golden State Warriors (2024-25 season)
- Bronny James was drafted by the Los Angeles Lakers (2024 NBA Draft) and is teammates with LeBron James on the Lakers in the 2024-25 and 2025-26 seasons
- Luka Dončić traded to Los Angeles Lakers (Feb 2025)
- Kevin Durant traded to Houston Rockets (2025)
- All other mid-season trades, draft picks, buyouts, signings through Feb 2026
- Include ALL rookies drafted in 2024 and 2025 on their respective teams

Your task: Determine if two NBA players have a valid connection — meaning they were teammates on the same NBA team during at least one season (regular season or playoffs). Even partial seasons, mid-season trades, or short stints count.

Also resolve nicknames and partial names to full names (e.g., "KD" = Kevin Durant, "Bron" = LeBron James, "Wemby" = Victor Wembanyama).

Respond with ONLY a JSON object:
{
  "valid": true/false,
  "connection": "Connected via [Team Name] ([Season/Years])" (only if valid),
  "reason": "Brief explanation",
  "fullName": "The SECOND player's (the new player's) full proper name with correct capitalization — NOT the first/previous player. E.g. if checking 'Tracy McGrady' and 'shaq', fullName must be 'Shaquille O\\'Neal', NOT 'Tracy McGrady'."
}

IMPORTANT: "fullName" must ALWAYS be the full name of the NEW/SECOND player being submitted, never the previous player.
If valid, provide the specific team and season(s) they shared. If multiple connections exist, pick the most notable one.`,
            },
            {
              role: "user",
              content: `Were "${previousPlayer}" and "${newPlayer}" ever teammates on the same NBA team?`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, allowing.", fullName: newPlayer }),
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
      parsed = { valid: true, reason: "Could not parse response.", fullName: newPlayer };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nba-chain-validate error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing.", fullName: "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
