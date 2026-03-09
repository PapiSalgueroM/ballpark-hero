import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRITERIA_LIST = [
  "Budget Cap: Max £1 Billion squad value",
  "Left Foot Only: All outfield players must be left-footed",
  "One Nation: Max 3 players from the same country",
  "Golden Era: Players from the 1990s-2000s only",
  "Premier League Only: All players must have played in the PL",
  "Under 25s: All players must be 25 or younger",
];

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function deterministicIndex(dateStr: string, listLength: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % listLength;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = getTodayString();

    // Try to read today's criteria
    const { data: existing } = await supabase
      .from("fantasy_draft_daily")
      .select("criteria")
      .eq("puzzle_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ criteria: existing.criteria, date: today }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create today's criteria deterministically
    const idx = deterministicIndex(today, CRITERIA_LIST.length);
    const criteria = CRITERIA_LIST[idx];

    await supabase.from("fantasy_draft_daily").insert({ puzzle_date: today, criteria });

    return new Response(JSON.stringify({ criteria, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to load daily criteria" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
