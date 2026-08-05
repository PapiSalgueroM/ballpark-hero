import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Owner 2026-08-05: every criterion here is ENFORCEABLE against the columns
// fantasy_draft_players actually has (age, market_value_millions,
// nationality, position). The old list included Golden Era / Premier League
// Only / Left Foot Only, which the data cannot verify (and the left-foot
// pool was 10 players for a 22-pick draft) - those produced rules the game
// silently ignored, like Under 25s accepting Bernardo Silva. Labels must
// stay in sync with CRITERIA_RULES in src/lib/fantasyCriteria.ts.
const CRITERIA_LIST = [
  "Under 25s: Every player must be 25 or younger",
  "Budget Cap: Your XI must total £1B or less",
  "One Nation Rule: Max 3 players from any one country",
  "Bargain Hunt: Every player must cost £60M or less",
  "Wonderkids: Every outfield player must be 21 or younger",
  "Galacticos Only: Every outfield player must be worth £80M+",
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

    const { data: existing } = await supabase
      .from("fantasy_draft_daily")
      .select("criteria")
      .eq("puzzle_date", today)
      .maybeSingle();

    // Reuse today's stored criteria only if it is still in the enforceable
    // list; legacy rows fall through and get replaced.
    if (existing && CRITERIA_LIST.includes(existing.criteria)) {
      return new Response(JSON.stringify({ criteria: existing.criteria, date: today }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idx = deterministicIndex(today, CRITERIA_LIST.length);
    const criteria = CRITERIA_LIST[idx];

    await supabase
      .from("fantasy_draft_daily")
      .upsert({ puzzle_date: today, criteria }, { onConflict: "puzzle_date" });

    return new Response(JSON.stringify({ criteria, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Failed to load daily criteria" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
