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

    // Check if already exists
    const { data: existing } = await supabase
      .from("cbb_daily")
      .select("id")
      .eq("puzzle_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: "Already set", date: today }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent daily IDs to avoid repeats
    const { data: recent } = await supabase
      .from("cbb_daily")
      .select("program_id")
      .order("puzzle_date", { ascending: false })
      .limit(15);

    const recentIds = (recent ?? []).map((r: any) => r.program_id);

    // Pick a random program not recently used
    const { data: programs } = await supabase
      .from("cbb_programs")
      .select("id")
      .not("id", "in", `(${recentIds.length > 0 ? recentIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);

    let pool = programs ?? [];
    if (pool.length === 0) {
      const { data: all } = await supabase.from("cbb_programs").select("id");
      pool = all ?? [];
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const { error } = await supabase.from("cbb_daily").insert({
      puzzle_date: today,
      program_id: chosen.id,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Daily set", date: today, program_id: chosen.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to set daily puzzle" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
