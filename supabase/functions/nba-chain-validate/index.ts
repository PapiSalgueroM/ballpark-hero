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
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a strict NBA roster verifier. You must determine if two NBA players were EVER on the same NBA team roster at the same time during any season through February 10, 2026.

CRITICAL RULES:
1. ONLY mark valid:true if you are 100% CERTAIN they shared a roster. When in doubt, say false.
2. A wrong "valid: true" is MUCH worse than a wrong "valid: false". Be conservative.
3. Do NOT confuse "played against each other" with "were teammates."
4. Do NOT hallucinate connections. If you cannot recall a specific shared roster, say false.

VERIFIED CAREER HISTORIES (reference these to avoid mistakes):
- Nikola Jokić: Denver Nuggets (2015-present). ONLY TEAM EVER.
- Russell Westbrook: OKC Thunder (2008-2019), Houston Rockets (2019-2020), Washington Wizards (2020-2021), LA Lakers (2021-2022), LA Clippers (2022-2023), Denver Nuggets (2023-2024 — signed Feb 2024, waived). NEVER on same team as Jokić except briefly with Nuggets in 2023-24 if rosters overlapped.
- James Harden: OKC Thunder (2009-2012), Houston Rockets (2012-2021), Brooklyn Nets (2021-2022), Philadelphia 76ers (2022-2024), LA Clippers (2024-present). NEVER on the Spurs.
- LeBron James: Cleveland Cavaliers (2003-2010, 2014-2018), Miami Heat (2010-2014), LA Lakers (2018-present)
- Stephen Curry: Golden State Warriors (2009-present). ONLY TEAM EVER.
- Kevin Durant: Seattle/OKC Thunder (2007-2016), Golden State Warriors (2016-2019), Brooklyn Nets (2019-2023), Phoenix Suns (2023-2025), Houston Rockets (2025-present)
- Kobe Bryant: LA Lakers (1996-2016). ONLY TEAM EVER.
- Shaquille O'Neal: Orlando Magic (1992-1996), LA Lakers (1996-2004), Miami Heat (2004-2008), Phoenix Suns (2008-2009), Cleveland Cavaliers (2009-2010), Boston Celtics (2010-2011)
- Jimmy Butler: Chicago Bulls (2011-2017), Minnesota Timberwolves (2017-2018), Philadelphia 76ers (2018-2019), Miami Heat (2019-2025), Golden State Warriors (2025-present)
- Luka Dončić: Dallas Mavericks (2018-2025), LA Lakers (2025-present)
- Bronny James: LA Lakers (2024-present)
- Tracy McGrady: Toronto Raptors (1997-2000), Orlando Magic (2000-2004), Houston Rockets (2004-2010), New York Knicks (2010), Detroit Pistons (2010), Atlanta Hawks (2011-2012), San Antonio Spurs (2013)
- Chris Paul: New Orleans Hornets (2005-2011), LA Clippers (2011-2017), Houston Rockets (2017-2019), OKC Thunder (2019-2020), Phoenix Suns (2020-2023), Golden State Warriors (2023-2024), San Antonio Spurs (2024-present)
- Giannis Antetokounmpo: Milwaukee Bucks (2013-present). ONLY TEAM EVER.
- Tim Duncan: San Antonio Spurs (1997-2016). ONLY TEAM EVER.
- Damian Lillard: Portland Trail Blazers (2012-2023), Milwaukee Bucks (2023-present)
- Anthony Davis: New Orleans Pelicans (2012-2019), LA Lakers (2019-present)
- Kyrie Irving: Cleveland Cavaliers (2011-2017), Boston Celtics (2017-2019), Brooklyn Nets (2019-2023), Dallas Mavericks (2023-present)
- Carmelo Anthony: Denver Nuggets (2003-2011), New York Knicks (2011-2017), OKC Thunder (2017-2018), Houston Rockets (2018-2019), Portland Trail Blazers (2019-2021), LA Lakers (2021-2022)
- Dwight Howard: Orlando Magic (2004-2012), LA Lakers (2012-2013), Houston Rockets (2013-2016), Atlanta Hawks (2016-2017), Charlotte Hornets (2017-2018), Washington Wizards (2018-2019), LA Lakers (2019-2021), Philadelphia 76ers (2021-2022), Taoyuan Leopards (2022-present)
- Joel Embiid: Philadelphia 76ers (2014-present). ONLY TEAM EVER (through Feb 2026).
- Jayson Tatum: Boston Celtics (2017-present). ONLY TEAM EVER.

Also resolve nicknames/partial names (e.g., "KD" = Kevin Durant, "Bron" = LeBron James, "Wemby" = Victor Wembanyama, "Shaq" = Shaquille O'Neal, "AI" = Allen Iverson, "The Answer" = Allen Iverson).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "connection": "Connected via [Team Name] ([Season(s)])" (only if valid),
  "reason": "Brief explanation",
  "fullName": "Full proper name of the SECOND/NEW player ONLY"
}

CRITICAL: "fullName" must be the NEW player's name, never the previous player. Be CONSERVATIVE — only confirm connections you are certain about.`,
            },
            {
              role: "user",
              content: `Were "${previousPlayer}" and "${newPlayer}" ever teammates on the same NBA team? Think carefully about each player's full career history before answering.`,
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
