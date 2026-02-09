import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerName, teamName, isNation } = await req.json();

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
      // On error, allow the player through to not block gameplay
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
      // If parsing fails, allow the player
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
