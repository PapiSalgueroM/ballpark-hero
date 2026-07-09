import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// AI gateway shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret)
// over the Lovable gateway, whose credits ran out. Set GEMINI_API_KEY in
// Supabase Edge Function secrets to bring AI validation back to life.
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

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

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Too many requests' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
    );
  }

  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();

    if (
      !playerName || typeof playerName !== "string" || playerName.length > 80 ||
      !rowAttribute || typeof rowAttribute !== "string" || rowAttribute.length > 100 ||
      !colAttribute || typeof colAttribute !== "string" || colAttribute.length > 100
    ) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitized = {
      player: playerName.slice(0, 80).replace(/[\n\r]/g, ''),
      row: rowAttribute.slice(0, 100).replace(/[\n\r]/g, ''),
      col: colAttribute.slice(0, 100).replace(/[\n\r]/g, ''),
    };

    const apiKey = (__GEMINI_KEY || Deno.env.get('LOVABLE_API_KEY'));
    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const prompt = `You are a professional soccer/football trivia expert with knowledge through March 2026. Determine if the player "${sanitized.player}" satisfies BOTH of these criteria:

1. Row attribute: "${sanitized.row}"
2. Column attribute: "${sanitized.col}"

Consider the player's entire career including all clubs played for, nationality, international team, league appearances, and achievements.

For club criteria like "Played for Barcelona", the player must have been on that club's first team roster at some point (including loans).
For nationality criteria like "Brazilian", "French", "Argentine", etc., the player must be of that nationality.
For position criteria: GK = Goalkeeper, DEF = Defender/Centre-back/Full-back, MID = Midfielder, FWD = Forward/Striker/Winger.
For "Champions League Winner", the player won the UEFA Champions League (or European Cup).
For "World Cup Winner", the player was in the squad that won the FIFA World Cup.
For "Golden Boot Winner", the player won a league Golden Boot/top scorer award in a major European league OR the World Cup Golden Boot.
For "Played in Premier League/La Liga/Serie A/Bundesliga/Ligue 1", the player appeared in that league.
For "Over 100 International Caps", the player earned 100+ caps for their national team.
For "Played in MLS", the player appeared in Major League Soccer.

RETIREMENT RULES (CRITICAL):
- A player is ONLY retired if they have fully retired from ALL club football.
- International retirement does NOT count as full retirement.
- Active players (2025-26): Messi (Inter Miami), Ronaldo (Al Nassr), Neymar (Santos), Suárez (Inter Miami), Griezmann (still playing club football, retired from France NT only).
- Fully retired: Toni Kroos (2024), Gerard Piqué, Andrés Iniesta.

VERIFIED TRANSFERS (2025-26 season):
- Viktor Gyökeres → Arsenal, Estêvão → Chelsea, Alexander Isak → Liverpool (Jan 2026)
- Kevin De Bruyne → Al-Ittihad, Omar Marmoush → Manchester City (Jan 2026)
- Florian Wirtz → Bayern Munich, Alejandro Garnacho → Chelsea (Jan 2026)
- Xavi Simons → Tottenham, Jonathan David → Juventus, Leroy Sané → Galatasaray
- Trent Alexander-Arnold → Real Madrid, Marcus Rashford → Aston Villa (Jan 2026)
- Neymar → Santos (returned 2025), Kylian Mbappé → Real Madrid (2024)
- Moussa Diaby → Al-Ittihad, Endrick → Lyon (loan), Jonathan Tah → Bayern Munich

If valid, also return the player's full official name (first name and last name as commonly known in football, e.g. "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé"). For players known by a single name (e.g. "Pelé", "Ronaldinho", "Neymar"), return that single name.

Respond with ONLY a JSON object: {"valid": true, "fullName": "First Last"} or {"valid": false, "reason": "brief explanation"}`;

    const response = await fetch(__AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: (__GEMINI_KEY ? "gemini-2.0-flash" : "google/gemini-2.5-flash"),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Could not validate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
