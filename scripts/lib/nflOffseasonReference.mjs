/** Match the current winter rules in archived replays of the roster and opening-rating engines. */
export function alignArchivedNflWinter(source, withPractice = true) {
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
      /for \(const fa of league\.freeAgents\) \{ fa\.age \+= 1; fa\.ovr = fa\.age >= 31 \? (?:declined\(fa\.ovr, 1\)|Math\.max\(62, fa\.ovr - 1\)) : fa\.ovr; \}/g,
      'for (const fa of league.freeAgents) { if (!walked.has(fa.id)) fa.age += 1; }',
    ],
    [
      /      \/\/ development and decline\n[\s\S]*?(?=      \/\/ retirement)/g,
      '',
    ],
    ...(withPractice ? [[
      /        if \(p\.age <= 25 && p\.ovr < p\.pot\) p\.ovr = Math\.min\(p\.pot, p\.ovr \+ 1 \+ Math\.floor\(rng\(\) \* 2\)\);\n        else if \(p\.age >= 31\) p\.ovr = declined\(p\.ovr, 1 \+ Math\.floor\(rng\(\) \* 2\) \+ \(p\.age >= 34 \? 1 : 0\)\);\n/g,
      '',
    ]] : []),
  ];
  source = source.replaceAll('\r\n', '\n');
  for (const [from, to] of rules) {
    if (source.split(from).length !== 2) throw new Error('Archived NFL offseason reference has changed: ' + from);
    source = source.replace(from, to);
  }
  return source;
}
