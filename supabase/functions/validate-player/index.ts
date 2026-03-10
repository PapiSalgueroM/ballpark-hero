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

// Simple in-memory rate limiter: max 15 requests per IP per 60 seconds
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

  // Rate limiting by IP
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
    const { playerName, teamName, isNation } = body;

    // Input validation
    if (!playerName || typeof playerName !== "string" || playerName.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid playerName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!teamName || typeof teamName !== "string" || teamName.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid teamName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const teamType = isNation ? "national team" : "club";

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
              content: `You are a soccer database with knowledge up to March 2026. Answer ONLY with a JSON object: {"valid": true/false, "reason": "short explanation", "fullName": "Player's Full First and Last Name"}.
The "fullName" field MUST always contain the player's commonly known full name (first name and last name). For example: "Messi" → "Lionel Messi", "James" → "James Rodríguez", "CR7" or "Ronaldo" → "Cristiano Ronaldo", "Neymar" → "Neymar Jr", "Vini" → "Vinícius Júnior".
A player is valid if they have EVER played for the given ${teamType} in a competitive match at senior level, including the current 2025-26 season. Youth/academy doesn't count unless they also played for the senior team. Include loan spells. Be accurate but give benefit of the doubt for recent transfers.

RETIREMENT RULES (CRITICAL):
- A player is ONLY retired if they have fully retired from ALL club football (no club contract anywhere).
- International retirement does NOT count as full retirement. A player who retired from their national team but still plays club football is ACTIVE.
- Examples: Lionel Messi (active at Inter Miami), Cristiano Ronaldo (active at Al Nassr), Neymar (active at Santos after returning in 2025), Luis Suárez (active at Inter Miami), Antoine Griezmann (active, retired from France NT only), Toni Kroos (FULLY RETIRED from all football in 2024), Gerard Piqué (FULLY RETIRED).

VERIFIED TRANSFERS & CLUBS (January 2026 window / 2025-26 season):
- Viktor Gyökeres → Arsenal (2025)
- Estêvão → Chelsea (2025)
- Alexander Isak → Liverpool (Jan 2026)
- Kevin De Bruyne → Al-Ittihad (2025)
- Omar Marmoush → Manchester City (Jan 2026)
- Florian Wirtz → Bayern Munich (2025)
- Alejandro Garnacho → Chelsea (Jan 2026)
- Xavi Simons → Tottenham (2025)
- Jonathan David → Juventus (2025)
- Leroy Sané → Galatasaray (2025)
- Jonathan Tah → Bayern Munich (2025)
- Trent Alexander-Arnold → Real Madrid (2025)
- Marcus Rashford → Aston Villa (Jan 2026)
- Neymar → Santos (returned 2025)
- Moussa Diaby → Al-Ittihad (2025)
- Endrick → Lyon (loan from Real Madrid)
- Alphonso Davies → Bayern Munich (renewed)
- Juan Musso → Atlético Madrid (backup GK, Argentina international)
- Luis Suárez → Inter Miami (active)
- Lamine Yamal → Barcelona
- Jude Bellingham → Real Madrid
- Erling Haaland → Manchester City
- Kylian Mbappé → Real Madrid (2024)`,
            },
            {
              role: "user",
              content: `Has "${playerName}" ever played for ${teamName} (${teamType})?`,
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
      parsed = { valid: true, reason: "Could not parse validation response." };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-player error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
