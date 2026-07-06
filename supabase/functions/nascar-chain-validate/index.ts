import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { currentDriver, guessedDriver } = body;

    if (
      !currentDriver || typeof currentDriver !== "string" || currentDriver.length > 100 ||
      !guessedDriver || typeof guessedDriver !== "string" || guessedDriver.length > 100
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
              content: `You are a strict NASCAR Cup Series championship results verifier. You must determine if the GUESSED driver won the NASCAR Cup Series championship in a season where the CURRENT driver was also a championship contender (i.e., the guessed driver "beat" the current driver to that year's title).

CRITICAL RULES:
1. ONLY mark valid:true if you are 100% CERTAIN the guessed driver won the NASCAR Cup Series championship in a year where the current driver was competing in the Cup Series.
2. The guessed driver must have WON the Cup Series championship that season, effectively beating the current driver to the title.
3. Both drivers must have been active Cup Series drivers in that same season.
4. A wrong "valid: true" is MUCH worse than a wrong "valid: false". Be conservative.
5. Do NOT hallucinate results. If you cannot recall specific championship results, say false.
6. Cover NASCAR Cup Series (including Winston Cup, Nextel Cup, Sprint Cup eras) from 1970 to 2025.

Known NASCAR Cup Champions for reference:
- 2025: Tyler Reddick
- 2024: Joey Logano
- 2023: Ryan Blaney
- 2022: Joey Logano
- 2021: Kyle Larson
- 2020: Chase Elliott
- 2019: Kyle Busch
- 2018: Joey Logano
- 2017: Martin Truex Jr.
- 2016: Jimmie Johnson
- 2015: Kyle Busch
- 2014: Kevin Harvick
- 2013: Jimmie Johnson
- 2012: Brad Keselowski
- 2011: Tony Stewart
- 2010: Jimmie Johnson
- 2009: Jimmie Johnson
- 2008: Jimmie Johnson
- 2007: Jimmie Johnson
- 2006: Jimmie Johnson
- 2005: Tony Stewart
- 2004: Kurt Busch
- 2003: Matt Kenseth
- 2002: Tony Stewart
- 2001: Jeff Gordon
- 2000: Bobby Labonte
- 1999: Dale Jarrett
- 1998: Jeff Gordon
- 1997: Jeff Gordon
- 1996: Terry Labonte
- 1995: Jeff Gordon
- 1994: Dale Earnhardt
- 1993: Dale Earnhardt
- 1992: Alan Kulwicki
- 1991: Dale Earnhardt
- 1990: Dale Earnhardt
- 1989: Rusty Wallace
- 1988: Bill Elliott
- 1987: Dale Earnhardt
- 1986: Dale Earnhardt
- 1985: Darrell Waltrip
- 1984: Terry Labonte
- 1983: Bobby Allison
- 1982: Darrell Waltrip
- 1981: Darrell Waltrip
- 1980: Dale Earnhardt
- 1979: Richard Petty
- 1978: Cale Yarborough
- 1977: Cale Yarborough
- 1976: Cale Yarborough
- 1975: Richard Petty
- 1974: Richard Petty
- 1973: Benny Parsons
- 1972: Richard Petty
- 1971: Richard Petty
- 1970: Bobby Isaac

Resolve nicknames: "The Intimidator" = Dale Earnhardt, "Junior"/"Dale Jr" = Dale Earnhardt Jr., "JJ" = Jimmie Johnson, "The King" = Richard Petty, "Smoke" = Tony Stewart, "Rowdy" = Kyle Busch, etc.

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "connection": "Won [Year] Cup championship" (only if valid, e.g. "Won 2001 Cup championship"),
  "reason": "Brief explanation",
  "fullName": "Full proper name of the GUESSED driver"
}`,
            },
            {
              role: "user",
              content: `Did "${guessedDriver}" ever win the NASCAR Cup Series championship in a season where "${currentDriver}" was also competing? Think carefully about specific championship results before answering.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, allowing.", fullName: guessedDriver }),
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
      parsed = { valid: true, reason: "Could not parse response.", fullName: guessedDriver };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("nascar-chain-validate error:", err);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing.", fullName: "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
