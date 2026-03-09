import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("tennis_daily")
      .select("id")
      .eq("puzzle_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: "Already set", date: today }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recent } = await supabase
      .from("tennis_daily")
      .select("player_id")
      .order("puzzle_date", { ascending: false })
      .limit(15);

    const recentIds = (recent ?? []).map((r: any) => r.player_id);

    const { data: players } = await supabase
      .from("tennis_players")
      .select("id")
      .not("id", "in", `(${recentIds.length > 0 ? recentIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);

    let pool = players ?? [];
    if (pool.length === 0) {
      const { data: all } = await supabase.from("tennis_players").select("id");
      pool = all ?? [];
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const { error } = await supabase.from("tennis_daily").insert({
      puzzle_date: today,
      player_id: chosen.id,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Daily set", date: today, player_id: chosen.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to set daily puzzle" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
