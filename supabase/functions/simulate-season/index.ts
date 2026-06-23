import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userTeam, aiTeam } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!userTeam?.length || !aiTeam?.length) {
      throw new Error("Both teams must have players");
    }

    const formatTeam = (team: any[], label: string) =>
      `${label}:\n${team.map((p: any) => `- ${p.name} (${p.position}, ${p.nationality}, £${p.market_value_millions}M)`).join("\n")}`;

    const prompt = `Here are two fantasy football teams that were drafted:

${formatTeam(userTeam, "Team A (User's Team)")}

${formatTeam(aiTeam, "Team B (AI's Team)")}

Write a fun, dramatic football season story for these two teams. Include injuries, suspensions, trophy wins, individual awards like Ballon d'Or or Golden Boot, transfer rumours, rivalries, and season highlights like goals and assists. Make it feel like a real season narrative. Write 2 separate paragraphs — one for each team. Keep it under 300 words total. Start Team A's paragraph with "TEAM_A:" and Team B's paragraph with "TEAM_B:" so I can split them.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a football pundit writing entertaining season recaps. Be vivid, dramatic, and fun." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Split into two team stories
    let teamAStory = "";
    let teamBStory = "";

    if (content.includes("TEAM_A:") && content.includes("TEAM_B:")) {
      const parts = content.split("TEAM_B:");
      teamAStory = parts[0].replace("TEAM_A:", "").trim();
      teamBStory = parts[1].trim();
    } else {
      // Fallback: split in half by paragraphs
      const paragraphs = content.split("\n\n").filter((p: string) => p.trim());
      const mid = Math.ceil(paragraphs.length / 2);
      teamAStory = paragraphs.slice(0, mid).join("\n\n");
      teamBStory = paragraphs.slice(mid).join("\n\n");
    }

    return new Response(JSON.stringify({ teamAStory, teamBStory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-season error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
