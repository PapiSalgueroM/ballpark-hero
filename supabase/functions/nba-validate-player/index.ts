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
    const { playerName, teamName, position, challengeStat } = body;

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

    const positionCheck = position ? `\n3. Is "${position}" a valid/primary position for this player? A player's position is valid if they primarily played that position during their career. PG=Point Guard, SG=Shooting Guard, SF=Small Forward, PF=Power Forward, C=Center. Some players may qualify for adjacent positions (e.g. a SG/SF can play either).` : '';
    const positionField = position ? ', "validPosition": true/false' : '';

    const statLookup = challengeStat ? `\n4. Look up this player's career ${challengeStat}. For per-game stats use career averages. For counting stats (3PM, Games Played, Championships) use career totals. For Height use inches, Weight use lbs.` : '';
    const statField = challengeStat ? ', "statValue": <number or null if unknown>' : '';

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
              content: `You are an NBA database with comprehensive knowledge up to February 2026. Answer ONLY with a JSON object.

IMPORTANT RULES:
1. The user MUST provide a full first and last name (e.g. "LeBron James", "Stephen Curry"). If they only provide a first name (e.g. "LeBron", "Steph", "Kobe") or a nickname without a last name, return {"valid": false, "reason": "Please enter the player's full first and last name (e.g. 'LeBron James')", "fullName": null}. Single-word names are NOT acceptable.

2. You MUST verify the player actually played for the specified team. This is CRITICAL. If the player NEVER played for that team (regular season or playoffs), you MUST return valid: false. Do NOT return valid: true unless you are certain the player played for that specific team. Account for team name changes (e.g., Seattle SuperSonics → Oklahoma City Thunder, New Jersey Nets → Brooklyn Nets, Charlotte Bobcats → Charlotte Hornets).

For example:
- "LeBron James" + "Boston Celtics" → valid: false (he never played for the Celtics)
- "Stephen Curry" + "Chicago Bulls" → valid: false (he never played for the Bulls)
- "LeBron James" + "Los Angeles Lakers" → valid: true (he plays for the Lakers)

Tasks:
1. Check if the player name is a real NBA player (must be full first and last name).
2. Check if they have EVER played for the given NBA team. If NOT, return valid: false with reason explaining they never played for that team.${positionCheck}${statLookup}

Response format: {"valid": true/false, "reason": "short explanation", "fullName": "Player Full First and Last Name"${positionField}${statField}}
- If the player never played for the team, set valid to false and reason to "[Player] never played for the [Team]."
- The "fullName" field MUST always contain the player's commonly known full name (first and last).`,
            },
            {
              role: "user",
              content: `Player: "${playerName}", Team: "${teamName}"${position ? `, Position: "${position}"` : ''}${challengeStat ? `, Stat: "${challengeStat}"` : ''}`,
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

    // If player is valid for team but not for position, override
    if (parsed.valid && position && parsed.validPosition === false) {
      parsed.valid = false;
      parsed.reason = `${playerName} did not primarily play ${position}. Try a different position.`;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nba-validate-player error:", e);
    return new Response(
      JSON.stringify({ valid: true, reason: "Validation error, allowing." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
