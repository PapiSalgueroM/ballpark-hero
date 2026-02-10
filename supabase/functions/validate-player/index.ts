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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authorization is handled via CORS origin restriction + input validation

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
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a football database with knowledge up to February 2026. Answer ONLY with a JSON object: {"valid": true/false, "reason": "short explanation"}.
A player is valid if they have EVER played for the given ${teamType} in a competitive match at senior level, including the current 2025-26 season. Youth/academy doesn't count unless they also played for the senior team. Include loan spells. For example, Victor Osimhen plays for Galatasaray (joined 2024 on loan from Napoli, then permanently). Be accurate but give benefit of the doubt for recent transfers.`,
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
