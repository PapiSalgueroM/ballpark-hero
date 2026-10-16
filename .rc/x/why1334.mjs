// Round 1334 review: why a save fails isSoccerCareerSave (the first failing check, by name). Imported by the probe.
const record = v => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = v => typeof v === 'string';
const num = v => typeof v === 'number' && Number.isFinite(v);
const SEASON_TEXT = ['club', 'clubCountry', 'type'];
const SEASON_NUM = ['year', 'age', 'clubTier', 'apps', 'goals', 'assists', 'cleanSheets', 'yellowCards', 'redCards', 'rating'];
const TOP_TEXT = ['playerName', 'nationality', 'position', 'era', 'currentClub', 'currentClubCountry', 'currentClubColor', 'currentLeague', 'lifestyleLevel'];
const TOP_NUM = ['age', 'currentClubTier', 'contractYearsLeft', 'weeklyWage', 'marketValue', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes', 'overall', 'netWorth', 'socialMediaFollowers', 'popularity', 'morale'];
const seasonWhy = (r, where) => {
  if (!record(r)) return `${where} not a record`;
  for (const f of SEASON_TEXT) if (!text(r[f])) return `${where}.${f} = ${JSON.stringify(r[f])}`;
  for (const f of SEASON_NUM) if (!num(r[f])) return `${where}.${f} = ${JSON.stringify(r[f])}`;
  return null;
};
export function why(v) {
  for (const f of TOP_TEXT) if (!text(v[f])) return `${f} = ${JSON.stringify(v[f])}`;
  for (const f of TOP_NUM) if (!num(v[f])) return `${f} = ${JSON.stringify(v[f])}`;
  for (let i = 0; i < (v.seasons || []).length; i++) { const w = seasonWhy(v.seasons[i], `seasons[${i}]`); if (w) return w; }
  if (!Array.isArray(v.events) || !v.events.every(text)) return 'events';
  for (const e of v.pendingEvents || []) {
    if (!record(e) || !num(e.id) || !text(e.title) || !text(e.description)) return `pendingEvents id ${e?.id} shape`;
    if (!Array.isArray(e.choices) || e.choices.length === 0 || !e.choices.every(c => record(c) && text(c.label) && text(c.consequence))) return `pendingEvents id ${e.id} choices`;
  }
  if (v.pendingSummary != null) { const w = seasonWhy(v.pendingSummary, 'pendingSummary'); if (w) return w; }
  if (!record(v.family) || !record(v.intStats)) return 'family or intStats';
  return 'other';
}
