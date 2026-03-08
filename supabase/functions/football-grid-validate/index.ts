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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Too many requests' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
    );
  }

  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();

    if (!playerName || !rowAttribute || !colAttribute) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitized = {
      player: playerName.slice(0, 80).replace(/[\n\r]/g, ''),
      row: rowAttribute.slice(0, 100).replace(/[\n\r]/g, ''),
      col: colAttribute.slice(0, 100).replace(/[\n\r]/g, ''),
    };

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const prompt = `You are a pro football (NFL/American football) trivia expert. Determine if the player "${sanitized.player}" satisfies BOTH of these criteria:

1. Row attribute: "${sanitized.row}"
2. Column attribute: "${sanitized.col}"

Consider the player's entire NFL career including all teams played for, college attended, draft status, awards won, Pro Bowl selections, Super Bowl appearances and wins, and statistical achievements.

For team criteria like "Played for Patriots", the player must have been on that team's roster at some point in their career (including practice squad or mid-season trades).

For "Undrafted", the player was not selected in the NFL Draft.
For "Top 10 Pick" or "Top 5 Pick" or "1st Overall Pick", check their actual draft position.
For "First Round Pick", they were selected in the 1st round of the NFL Draft.
For college criteria, the player attended that college.
For position criteria, the player played that position during their NFL career.
For award criteria like "NFL MVP", "Defensive Player of the Year", "Super Bowl MVP", "Offensive/Defensive Rookie of the Year", the player won that specific award.
For "Won Super Bowl", the player was on a Super Bowl winning roster.
For "2+ Super Bowl Wins", the player won 2 or more Super Bowls.
For Pro Bowl criteria like "3+ Pro Bowls", "5+ Pro Bowls", "10+ Pro Bowls", the player was selected to that many Pro Bowls.

Respond with ONLY a JSON object: {"valid": true} or {"valid": false, "reason": "brief explanation"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Could not validate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ valid: !!result.valid, reason: result.reason || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
