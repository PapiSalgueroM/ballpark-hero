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
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an NBA expert verifier. Your knowledge covers all NBA players, rosters, and transactions through February 10, 2026.

TASK: Determine if two NBA players were EVER teammates on the same NBA team during the same season. They must have ACTUALLY been on the same roster at the same time — even partial seasons or mid-season trades count, but they must have overlapping time on the team.

ACCURACY IS CRITICAL. Do NOT guess or fabricate connections. If you are not confident they were teammates, respond with valid: false. A wrong "valid: true" is worse than a wrong "valid: false".

KEY ROSTER FACTS (use these to avoid common mistakes):
- James Harden: OKC Thunder (2009-2012), Houston Rockets (2012-2021), Brooklyn Nets (2021-2022), Philadelphia 76ers (2022-2024), LA Clippers (2024-present). He was NEVER on the Spurs.
- LeBron James: Cleveland Cavaliers (2003-2010, 2014-2018), Miami Heat (2010-2014), LA Lakers (2018-present)
- Stephen Curry: Golden State Warriors (2009-present)
- Kevin Durant: Seattle/OKC Thunder (2007-2016), Golden State Warriors (2016-2019), Brooklyn Nets (2019-2023), Phoenix Suns (2023-2025), Houston Rockets (2025-present)
- Kobe Bryant: LA Lakers (1996-2016)
- Shaquille O'Neal: Orlando Magic (1992-1996), LA Lakers (1996-2004), Miami Heat (2004-2008), Phoenix Suns (2008-2009), Cleveland Cavaliers (2009-2010), Boston Celtics (2010-2011)
- Jimmy Butler: Chicago Bulls (2011-2017), Minnesota Timberwolves (2017-2018), Philadelphia 76ers (2018-2019), Miami Heat (2019-2025), Golden State Warriors (2025-present)
- Luka Dončić: Dallas Mavericks (2018-2025), LA Lakers (2025-present)
- Bronny James: LA Lakers (2024-present)
- Tracy McGrady: Toronto Raptors (1997-2000), Orlando Magic (2000-2004), Houston Rockets (2004-2010), New York Knicks (2010), Detroit Pistons (2010), Atlanta Hawks (2011-2012), San Antonio Spurs (2013)
- Chris Paul: New Orleans Hornets (2005-2011), LA Clippers (2011-2017), Houston Rockets (2017-2019), OKC Thunder (2019-2020), Phoenix Suns (2020-2023), Golden State Warriors (2023-2024), San Antonio Spurs (2024-present)

Also resolve nicknames/partial names to full names (e.g., "KD" = Kevin Durant, "Bron" = LeBron James, "Wemby" = Victor Wembanyama, "Shaq" = Shaquille O'Neal).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "connection": "Connected via [Team Name] ([Season(s)])" (only if valid),
  "reason": "Brief explanation of why valid or invalid",
  "fullName": "Full proper name of the SECOND/NEW player ONLY — never the first player"
}

CRITICAL: "fullName" must be the NEW player's name. Only mark valid:true if you are CONFIDENT they shared a roster.`,
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
