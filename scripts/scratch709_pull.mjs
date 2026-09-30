// Scratch, not committed: snapshot the live career tables and puzzles for the Round 709 audit.
import fs from 'node:fs';
import { supabaseFromClientTs } from './bakeCareerPlayers.mjs';

const out = process.argv[2];
const supabase = supabaseFromClientTs();
async function pageAll(page) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}
const players = await pageAll((f, t) => supabase.from('career_players').select('id, player_name, nationality, position').order('player_name').range(f, t));
const seasons = await pageAll((f, t) => supabase.from('career_seasons').select('id, player_id, season, club, goals, assists, appearances, market_value, sort_order').order('player_id').order('sort_order').range(f, t));
const puzzles = await pageAll((f, t) => supabase.from('transfer_path_puzzles').select('puzzle_id, player_a, player_b, min_steps, hint, active_min_steps, active_hint, europe_min_steps, europe_hint, sort_order').order('puzzle_id').range(f, t));
fs.writeFileSync(out, JSON.stringify({ pulledAt: new Date().toISOString(), players, seasons, puzzles }, null, 1));
console.log(`players ${players.length}, seasons ${seasons.length}, puzzles ${puzzles.length} -> ${out}`);
