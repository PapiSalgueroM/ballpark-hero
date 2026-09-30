// Scratch, not committed: pull player_market_values rows whose folded name matches a career player.
import fs from 'node:fs';
import { supabaseFromClientTs } from './bakeCareerPlayers.mjs';

const [snapFile, outFile] = process.argv.slice(2);
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l').trim();
const supabase = supabaseFromClientTs();
const names = [...new Set(snap.players.map(p => fold(p.player_name)))];
const rows = [];
for (let i = 0; i < names.length; i += 40) {
  const chunk = names.slice(i, i + 40);
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('player_market_values')
      .select('id, player_name, name_folded, position, age, nationality, club, year, matches, goals, assists')
      .in('name_folded', chunk).order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
}
fs.writeFileSync(outFile, JSON.stringify(rows, null, 1));
const hit = new Set(rows.map(r => r.name_folded));
console.log(`rows ${rows.length}, names hit ${hit.size} of ${names.length}`);
console.log('no rows:', names.filter(n => !hit.has(n)).join(', '));
