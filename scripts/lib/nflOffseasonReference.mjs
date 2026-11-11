/** Keep archived NFL engine replays comparable after the contract departure aging fix. */
export function ageHistoricalNflDeparturesOnce(source) {
  const rules = [
    [
      '  const news: OffseasonNews = { retired: [], expired: [], developed: [], tagged: [] };',
      '  const news: OffseasonNews = { retired: [], expired: [], developed: [], tagged: [] }; const walked = new Set<string>();',
    ],
    [
      'league.freeAgents.push({ ...p, years: 1 });',
      'walked.add(p.id); league.freeAgents.push({ ...p, years: 1 });',
    ],
    [
      'for (const fa of league.freeAgents) { fa.age += 1;',
      'for (const fa of league.freeAgents) { if (walked.has(fa.id)) continue; fa.age += 1;',
    ],
  ];
  for (const [from, to] of rules) {
    if (source.split(from).length !== 2) throw new Error('Archived NFL offseason reference has changed: ' + from);
    source = source.replace(from, to);
  }
  return source;
}
