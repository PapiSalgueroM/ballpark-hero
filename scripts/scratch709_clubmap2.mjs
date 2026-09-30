// Scratch, not committed: add country and calendar style to the drafted club map and write it to the data dir.
import fs from 'node:fs';

const [draftFile, wdScratch, outFile] = process.argv.slice(2);
const draft = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
const wd = JSON.parse(fs.readFileSync(wdScratch, 'utf8'));
const countryOf = new Map();
for (const s of wd.statements) if (s.country && !countryOf.has(s.team)) countryOf.set(s.team, s.country);
const NAME = { 'United Kingdom': 'England', "People's Republic of China": 'China', 'United States': 'USA', 'United States of America': 'USA' };
const SCOTLAND = new Set(['Q19593', 'Q19597']);
const CALENDAR = new Set(['Brazil', 'USA', 'Canada', 'Japan', 'China', 'South Korea', 'Norway', 'Sweden', 'Colombia', 'Chile', 'Ecuador', 'India']);
const out = {};
for (const [club, m] of Object.entries(draft)) {
  const q = m.wikidata[0];
  let country = q ? countryOf.get(q) ?? null : null;
  if (country) country = NAME[country] ?? country;
  if (q && SCOTLAND.has(q)) country = 'Scotland';
  if (['Swansea City', 'Cardiff City'].includes(club)) country = 'Wales';
  out[club] = { wikidata: m.wikidata, reserve: m.reserve ?? [], marketValue: m.marketValue ?? [], country, calendar: CALENDAR.has(country) };
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log(Object.entries(out).filter(([, m]) => !m.country).map(([c]) => c).join(', '));
