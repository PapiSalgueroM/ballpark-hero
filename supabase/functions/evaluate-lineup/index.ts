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

// Simple in-memory rate limiter: max 10 requests per IP per 60 seconds (stricter for expensive evaluation)
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
    const { formation, players } = body;

    // Input validation
    if (!formation || typeof formation !== "string" || formation.length > 20) {
      return new Response(JSON.stringify({ error: "Invalid formation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(players) || players.length === 0 || players.length > 15) {
      return new Response(JSON.stringify({ error: "Invalid players" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const p of players) {
      if (
        typeof p !== "object" || !p ||
        typeof p.label !== "string" || p.label.length > 50 ||
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
        (p: { label: string; playerName: string; assignedTeam: string; isNation?: boolean }, i: number) =>
          `${i + 1}. ${p.label} – ${p.playerName} (from ${p.assignedTeam}, ${p.isNation ? "national team" : "club"})`
      )
      .join("\n");

    const systemPrompt = `You are a soccer expert and pundit. The user has built a starting XI using a ${formation} formation. Each player was assigned a random club or national team they had to pick a player from.

CRITICAL RULE: Every player in this lineup should be evaluated AS IF THEY ARE IN THEIR PRIME, regardless of whether they are retired or currently active. Do NOT penalise or comment on players being retired, old, or inactive. Treat Buffon, Maradona, Pelé, etc. the same as current stars — judge them by their peak ability.

Your job: Evaluate how good this team would realistically perform if every player was at their peak. Consider:
- Player quality at their prime / peak ability
- Positional fit (are they playing in their natural position?)
- Team balance (defense, midfield, attack)
- Chemistry and playing style compatibility

Give ONE of these verdicts (pick the most fitting):
- "Treble Winners 🏆🏆🏆" – World-class XI, could win everything
- "Champions League Winners 🏆" – Elite squad, title contenders
- "League Champions 🥇" – Very strong, domestic dominance
- "Top 4 Finish 📈" – Solid squad, CL qualification
- "Europa League Level 🌍" – Good but not great
- "Mid-Table 😐" – Average, nothing special
- "Relegation Battle 😰" – Weak squad, struggling
- "Relegated ⬇️" – Not a competitive team at all
- "Sunday League 😂" – Made-up or non-existent players

IMPORTANT: If any player names seem completely made up or don't exist in soccer, be harsh and call it out. But do NOT penalise retired legends — they are judged in their prime.

Respond with ONLY a JSON object with these fields:
- "rating": The verdict from the list above
- "headline": A punchy one-liner about the team (max 10 words)
- "analysis": A 3-4 sentence detailed analysis explaining your verdict`;

    let aiResponse;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      aiResponse = await fetch(
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
                content: `Here is my ${formation} starting XI:\n\n${playerList}\n\nEvaluate this team. Respond with ONLY valid JSON, no markdown fences.`,
              },
            ],
          }),
        }
      );

      if (aiResponse.ok) break;

      if (aiResponse.status === 429) {
        if (retries < maxRetries) {
          retries++;
          console.log(`Rate limited, retry ${retries}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, 2000 * retries));
          continue;
        }
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      if (retries < maxRetries) {
        retries++;
        console.log(`AI error, retry ${retries}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 1500 * retries));
        continue;
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const data = await aiResponse!.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI raw response:", content.substring(0, 500));

    let parsed;
    try {
      // Try to extract JSON from various formats
      let jsonStr = content;
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      } else {
        // Try to find a JSON object directly
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse failed:", parseErr, "Raw:", content.substring(0, 300));
      // Fallback: extract what we can
      parsed = {
        rating: "Top 4 Finish 📈",
        headline: "Interesting squad choices",
        analysis: content.replace(/```json|```/g, '').trim() || "Your squad has been evaluated but we couldn't parse the detailed analysis.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-lineup error:", e);
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
