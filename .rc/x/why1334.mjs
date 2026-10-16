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
  for (const o of v.pendingOffers || []) if (!record(o) || !record(o.club) || !['name', 'country', 'color', 'league'].every(f => text(o.club[f])) || !num(o.club.tier) || !num(o.contractYears) || !num(o.wage)) return `pendingOffers ${JSON.stringify(o).slice(0, 160)}`;
  for (const n of v.pendingNews || []) if (!record(n) || !['newspaper', 'headline', 'body'].every(f => text(n[f]))) return `pendingNews ${JSON.stringify(n).slice(0, 160)}`;
  for (const a of v.awards || []) if (!record(a) || !num(a.year) || !text(a.name) || !text(a.emoji)) return `awards ${JSON.stringify(a).slice(0, 160)}`;
  if (!Array.isArray(v.properties) || !v.properties.every(text)) return 'properties';
  if (!Array.isArray(v.investments) || !v.investments.every(text)) return 'investments';
  if (!num(v.family.children) || typeof v.family.isMarried !== 'boolean' || typeof v.family.isDivorced !== 'boolean') return `family ${JSON.stringify(v.family).slice(0, 120)}`;
  if (!['caps', 'goals', 'assists'].every(f => num(v.intStats[f]))) return `intStats ${JSON.stringify(v.intStats)}`;
  if (v.legacy != null) return `legacy ${JSON.stringify(v.legacy).slice(0, 120)}`;
  return `tail states (manager ${!!v.managerState}, owner ${!!v.ownerState}, pundit ${!!v.punditState})`;
}
