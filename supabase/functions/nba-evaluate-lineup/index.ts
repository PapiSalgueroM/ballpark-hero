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
const RATE_LIMIT_MAX = 10;
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
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { players, challenge } = body;

    // Input validation
    if (!challenge || typeof challenge !== "object" || !challenge.stat || !challenge.direction) {
      return new Response(JSON.stringify({ error: "Invalid challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(players) || players.length !== 5) {
      return new Response(JSON.stringify({ error: "Invalid players" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const p of players) {
      if (
        typeof p !== "object" || !p ||
        typeof p.label !== "string" || p.label.length > 10 ||
        typeof p.playerName !== "string" || p.playerName.length > 100 ||
        typeof p.assignedTeam !== "string" || p.assignedTeam.length > 100
      ) {
        return new Response(JSON.stringify({ error: "Invalid player data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const playerList = players
      .map(
        (p: { label: string; playerName: string; assignedTeam: string }, i: number) =>
          `${i + 1}. ${p.label} – ${p.playerName} (from ${p.assignedTeam})`
      )
      .join("\n");

    const directionWord = challenge.direction === "highest" ? "HIGHEST" : "LOWEST";
    const statName = challenge.stat;
    const unit = challenge.unit;

    const systemPrompt = `You are an NBA expert and statistician with comprehensive knowledge of all NBA players in history up to February 2026.

The user was challenged to build an NBA Starting 5 with the ${directionWord} combined ${statName} (${unit}).

Each player was assigned a random NBA team they had to pick a player from. The goal was to optimize for the ${directionWord} ${statName}.

Your job:
1. Look up each player's career ${statName} (use career averages for per-game stats, career totals for counting stats like 3PM/Games Played/Championships, and listed measurements for Height/Weight)
2. List each player's actual stat value
3. Calculate the team's combined total or average (use average for per-game stats, sum for counting stats)
4. Rate how well they optimized given the constraint of random teams

Give ONE of these verdicts:
- "GOAT Squad 🐐" – Absolutely perfect optimization, couldn't do much better
- "All-Star Starters ⭐" – Excellent picks, near-optimal
- "Playoff Contenders 🏆" – Very good selections overall
- "Solid Rotation 📈" – Good picks, above average
- "Regular Season 😐" – Average, room for improvement
- "Bench Warmers 📉" – Below average optimization
- "G-League Level 😰" – Poor picks for this challenge
- "Picked From the Stands 😂" – Made-up players or terrible optimization

IMPORTANT: If any player names seem completely made up or don't exist in NBA history, call it out harshly.

Respond with ONLY a JSON object:
- "rating": The verdict from the list above
- "headline": A punchy one-liner about the lineup (max 10 words)
- "analysis": A 4-5 sentence analysis. MUST include each player's ${statName} value and the team total/average. Explain your verdict.`;

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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Challenge: Find the ${directionWord} ${statName} (${unit})\n\nHere is my Starting 5:\n\n${playerList}\n\nEvaluate this lineup.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = {
        rating: "Regular Season 😐",
        headline: "Interesting squad choices",
        analysis: content,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nba-evaluate-lineup error:", e);
    return new Response(
      JSON.stringify({
        rating: "Error",
        headline: "Something went wrong",
        analysis: "Something went wrong. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
