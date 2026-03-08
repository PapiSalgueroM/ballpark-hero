import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();

    if (!playerName || !rowAttribute || !colAttribute) {
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const prompt = `You are a college football (NCAA/FBS) trivia expert with knowledge from 2000 to 2026. Determine if the player "${sanitized.player}" satisfies BOTH of these criteria:

1. Row attribute: "${sanitized.row}"
2. Column attribute: "${sanitized.col}"

Consider the player's college football career including school attended, position played, awards won, draft status, and conference.

For school criteria like "Alabama", the player must have played college football at that school.
For conference criteria like "SEC Conference", "Big Ten Conference", "ACC Conference", "Pac-12 Conference", "Big 12 Conference", the player attended a school in that conference during their college career.
For "Heisman Winner", the player won the Heisman Trophy.
For "All-American", the player was named a consensus or unanimous All-American.
For "National Champion", the player was on a team that won the BCS or CFP National Championship.
For position criteria, the player played that position in college.
For "First Round Pick", the player was selected in the 1st round of the NFL Draft.
For "Top 10 Pick" or "Top 5 Pick", check their actual NFL Draft position.
For "1st Overall Pick", the player was the #1 overall pick.
For "Went Undrafted", the player was not selected in the NFL Draft.

Only consider players active in college football from 2000 to 2026.

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
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
