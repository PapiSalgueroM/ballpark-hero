import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
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
    const { currentPlayer, guessedPlayer } = body;

    if (
      !currentPlayer || typeof currentPlayer !== "string" || currentPlayer.length > 100 ||
      !guessedPlayer || typeof guessedPlayer !== "string" || guessedPlayer.length > 100
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
              content: `You are a strict tennis Grand Slam results verifier. You must determine if the GUESSED player ever beat the CURRENT player at a Grand Slam tournament (Australian Open, French Open / Roland Garros, Wimbledon, or US Open) in any round, in singles, from 1970 to March 2026 (including the 2026 Australian Open).

CRITICAL RULES:
1. ONLY mark valid:true if you are 100% CERTAIN the guessed player defeated the current player at a Grand Slam in singles.
2. A wrong "valid: true" is MUCH worse than a wrong "valid: false". Be conservative.
3. Both ATP and WTA matches count, but they must be SINGLES Grand Slam matches.
4. The guessed player must have BEATEN the current player, not just played them.
5. Do NOT confuse "lost to" with "beat". The guessed player must be the WINNER.
6. Do NOT hallucinate results. If you cannot recall a specific Grand Slam match between them, say false.
7. Cross-gender matches don't exist in Grand Slams. If one is ATP and the other WTA, it's always invalid.

Resolve nicknames: "Fed" = Roger Federer, "Rafa" = Rafael Nadal, "Nole"/"Djoker" = Novak Djokovic, "Serena" = Serena Williams, etc.

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "connection": "Beat at [Slam Name] [Year] ([Round])" (only if valid, e.g. "Beat at Wimbledon 2008 (Final)"),
  "reason": "Brief explanation",
  "fullName": "Full proper name of the GUESSED player"
}`,
            },
            {
              role: "user",
              content: `Did "${guessedPlayer}" ever beat "${currentPlayer}" at a Grand Slam tournament in singles? Think carefully about specific matches before answering.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: true, reason: "Could not verify, allowing.", fullName: guessedPlayer }),
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
      parsed = { valid: true, reason: "Could not parse response.", fullName: guessedPlayer };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tennis-chain-validate error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing.", fullName: "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
