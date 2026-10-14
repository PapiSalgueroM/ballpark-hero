// Remote check helper for Round 1331 (never committed): the oldcap control's tree, matchRuleOf answering three everywhere.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'src/lib/clubManager.ts';
const s = readFileSync(f, 'utf8');
const from = '  return subsRuleFor(subsLeagueBase(careerLeagueOf(career).id), worldYear(career));';
if (s.split(from).length - 1 !== 1) { console.log('oldcap anchor missing'); process.exit(2); }
writeFileSync(f, s.replace(from, '  return { subs: MAX_SUBS, stops: null, partial: false };'));
console.log('oldcap patched');
