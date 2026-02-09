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
    const { formation, players } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const playerList = players
      .map(
        (p: any, i: number) =>
          `${i + 1}. ${p.label} – ${p.playerName} (from ${p.assignedTeam}, ${p.isNation ? "national team" : "club"})`
      )
      .join("\n");

    const systemPrompt = `You are a football expert and pundit with knowledge up to February 2026 (the current 2025-26 season). The user has built a starting XI using a ${formation} formation. Each player was assigned a random club or national team they had to pick a player from.

Your job: Evaluate how good this team would realistically perform over a full season in 2025-26. Consider:
- Player quality and current form in the 2025-26 season
- Positional fit (are they playing in their natural position?)
- Team balance (defense, midfield, attack)
- Chemistry and playing style compatibility
- Recent transfers and loan moves (e.g. Osimhen at Galatasaray, etc.)

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

IMPORTANT: If any player names seem completely made up or don't exist in football, be harsh and call it out. Also check if the player has actually played for the club/nation they were assigned. Use your knowledge of the 2025-26 season.

Respond with ONLY a JSON object with these fields:
- "rating": The verdict from the list above
- "headline": A punchy one-liner about the team (max 10 words)
- "analysis": A 3-4 sentence detailed analysis explaining your verdict`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here is my ${formation} starting XI:\n\n${playerList}\n\nEvaluate this team.`,
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

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = {
        rating: "Mid-Table 😐",
        headline: "Interesting squad choices",
        analysis: content,
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
        analysis: e instanceof Error ? e.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
