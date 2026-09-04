/**
 * Round 435: bake the 66 Rebuild clubs and their real squads to a fixture, so
 * scripts/simRebuildEconomy.mjs can walk every club without touching the network.
 *
 * WHY A FIXTURE AND NOT A LIVE PULL. The opening-rating law only misbehaves on
 * a club whose real squad cannot fill a 4-3-3, and which clubs those are is a
 * fact about the data, not about the code. A synthetic fixture would let me
 * choose the answer; a live pull would make a sim flaky and slow. So the rows
 * are pulled once, committed, and the harness reads them offline.
 *
 * The pull mirrors src/lib/fetchRebuild.ts exactly: year 2026, the clubs in the
 * rebuild_clubs view, ordered by market value descending, first row per player
 * name wins. The position string is baked RAW so the harness runs the shipped
 * normalizePosition over it rather than a copy of that map.
 *
 * Re-run it when the market data moves: node scripts/bakeRebuildSquads.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9._-]+/);
if (!urlMatch || !keyMatch) {
  console.error('could not read the Supabase url and key out of client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

const { data: clubRows, error: clubErr } = await supabase
  .from('rebuild_clubs')
  .select('club, squad_size, squad_value_m, tier')
  .order('squad_value_m', { ascending: false });
if (clubErr || !clubRows?.length) {
  console.error('rebuild_clubs came back empty', clubErr);
  process.exit(1);
}

const out = { pulled: new Date().toISOString().slice(0, 10), clubs: [] };
for (const c of clubRows) {
  const { data, error } = await supabase
    .from('player_market_values')
    .select('player_name, position, age, market_value_usd')
    .eq('year', 2026)
    .eq('club', c.club)
    .order('market_value_usd', { ascending: false });
  if (error || !data) {
    console.error(`squad pull failed for ${c.club}`, error);
    process.exit(1);
  }
  const seen = new Set();
  const squad = [];
  for (const row of data) {
    if (!row.player_name || seen.has(row.player_name)) continue;
    seen.add(row.player_name);
    squad.push([row.player_name, row.position || '', row.age ?? 0, row.market_value_usd ?? 0]);
  }
  out.clubs.push({ club: c.club, tier: c.tier || 'modest', squad });
  console.log(`${c.club}: ${squad.length}`);
}

const dest = path.join(ROOT, 'scripts/data/rebuildSquads.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`\nwrote ${out.clubs.length} clubs to ${dest}`);
