// READ ONLY: names per confederation over the stored soccer_player_club_stints.nationality strings (nationalities.json, 2026-09-15)
import fs from 'node:fs';
const nats = JSON.parse(fs.readFileSync('C:/Users/antho/AppData/Local/Temp/claude/r613/nationalities.json','utf8'));
const CAF = ["Morocco","Nigeria","Senegal","Ghana","Cote d'Ivoire","Cameroon","Algeria","DR Congo","Tunisia","Mali","South Africa","Egypt","Guinea","Cape Verde","Angola","Burkina Faso","The Gambia","Guinea-Bissau","Gabon","Togo","Congo","Benin","Zimbabwe","Sierra Leone","Comoros","Zambia","Kenya","Equatorial Guinea","Liberia","Libya","Mozambique","Burundi","Madagascar","Central African Republic","Uganda","Niger","Namibia","Mauritania","Rwanda","Tanzania","Somalia","Malawi","Botswana","Chad","Sudan","Seychelles","Mauritius","Eswatini","Sao Tome and Principe","Réunion","Eritrea","Southern Sudan"];
const AFC = ["Japan","Korea, South","Saudi Arabia","China","Uzbekistan","Iran","Australia","United Arab Emirates","Iraq","Vietnam","Qatar","Indonesia","Syria","India","Malaysia","Philippines","Kyrgyzstan","Oman","Lebanon","Korea, North","Jordan","Thailand","Tajikistan","Turkmenistan","Palestine","Hongkong","Myanmar","Bahrain","Bangladesh","Pakistan","Cambodia","Guam","Chinese Taipei","Singapore","Yemen","Timor-Leste","Laos"];
const CONCACAF = ["Mexico","United States","Canada","Jamaica","Costa Rica","Suriname","Martinique","Curacao","Honduras","Guadeloupe","Trinidad and Tobago","Haiti","Panama","Guatemala","El Salvador","Dominican Republic","French Guiana","Grenada","Cuba","Guyana","Bermuda","Barbados","St. Kitts & Nevis","Antigua and Barbuda","Saint-Martin","Aruba","Nicaragua","Puerto Rico","American Virgin Islands"];
const m = new Map(nats);
for (const [k, list] of Object.entries({ CAF, AFC, CONCACAF })) {
  const miss = list.filter((s) => !m.has(s));
  console.log(k, 'strings', list.length, 'names', list.reduce((a, s) => a + (m.get(s) || 0), 0), 'unmatched', miss);
}
console.log('Australia names (AFC member, ambiguous for "Asian player")', m.get('Australia'));
