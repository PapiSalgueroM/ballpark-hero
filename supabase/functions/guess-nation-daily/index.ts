import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Select daily puzzle for tomorrow
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    // Check if already exists
    const { data: existing } = await supabase
      .from('guess_nation_daily')
      .select('id')
      .eq('puzzle_date', dateStr)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Already set', date: dateStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get recent country IDs to avoid repeats
    const { data: recent } = await supabase
      .from('guess_nation_daily')
      .select('country_id')
      .order('puzzle_date', { ascending: false })
      .limit(20);

    const recentIds = new Set((recent ?? []).map((r: any) => r.country_id));

    // Get all countries
    const { data: countries } = await supabase
      .from('guess_nation_countries')
      .select('id, difficulty');

    if (!countries || countries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No countries found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pickRandom = (pool: any[]) => pool[Math.floor(Math.random() * pool.length)];

    // Pick an easy country for daily
    const easyPool = countries.filter((c: any) => c.difficulty === 'easy' && !recentIds.has(c.id));
    const pool = easyPool.length > 0 ? easyPool : countries.filter((c: any) => !recentIds.has(c.id));
    const finalPool = pool.length > 0 ? pool : countries;

    const selected = pickRandom(finalPool);

    await supabase.from('guess_nation_daily').insert({
      puzzle_date: dateStr,
      country_id: selected.id,
      difficulty: selected.difficulty,
    });

    return new Response(
      JSON.stringify({ message: 'Daily set', date: dateStr, country_id: selected.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
