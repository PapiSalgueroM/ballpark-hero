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

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { userTeam, aiTeam } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (
      !Array.isArray(userTeam) || !userTeam.length || userTeam.length > 50 ||
      !Array.isArray(aiTeam) || !aiTeam.length || aiTeam.length > 50
    ) {
      throw new Error("Both teams must have players");
    }

    const formatTeam = (team: any[], label: string) =>
      `${label}:\n${team.map((p: any) => `- ${p.name} (${p.position}, ${p.nationality}, £${p.market_value_millions}M, ${p.dominant_foot} foot)`).join("\n")}`;

    const prompt = `Analyze these two fantasy football squads:

${formatTeam(userTeam, "Team A (User's Team)")}

${formatTeam(aiTeam, "Team B (AI's Team)")}

For EACH team, list exactly 3 strengths and 2 weaknesses based on the actual players drafted. Consider position balance, squad depth, player quality, nationalities, foot preferences, and market value.

Respond in this exact format (no markdown, no extra text):
TEAM_A_STRENGTHS:
1. [strength]
2. [strength]
3. [strength]
TEAM_A_WEAKNESSES:
1. [weakness]
2. [weakness]
TEAM_B_STRENGTHS:
1. [strength]
2. [strength]
3. [strength]
TEAM_B_WEAKNESSES:
1. [weakness]
2. [weakness]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a football tactical analyst. Be specific about actual players in your analysis." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse structured response
    const parseList = (text: string, marker: string): string[] => {
      const section = text.split(marker)[1];
      if (!section) return [];
      const lines = section.split("\n").filter(l => l.trim().match(/^\d+\./));
      return lines.slice(0, marker.includes("WEAKNESS") ? 2 : 3).map(l => l.replace(/^\d+\.\s*/, "").trim());
    };

    const result = {
      teamA: {
        strengths: parseList(content, "TEAM_A_STRENGTHS:"),
        weaknesses: parseList(content, "TEAM_A_WEAKNESSES:"),
      },
      teamB: {
        strengths: parseList(content, "TEAM_B_STRENGTHS:"),
        weaknesses: parseList(content, "TEAM_B_WEAKNESSES:"),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-squads error:", e);
    return new Response(
      JSON.stringify({ error: "Unable to analyze squads" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
