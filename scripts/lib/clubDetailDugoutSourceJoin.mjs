import assert from 'node:assert/strict';

/* Round 1606: the exact UI spans the real dugouts added to ClubDetailScreen.tsx (the manager line reads dugoutOf,
   real and dated or made up with MADE UP). simClubDetailCurrentRoster and playClubDetailCurrentRoster rebuild that
   screen's whole historical source from their parent commit, so they take these spans off first, then the
   fixtures join (clubDetailFixturesSourceJoin.mjs) as before. Each pair is [before, after], copied byte for byte
   from the round's own diff; the inverse must rebuild the current bytes exactly or the join refuses. */
const spans = [
  ["  boardWantLabel, careerLeagueOf, eraClubDefFor,\n  managerOf, sellValue,\n} from '@/lib/clubManager';",
    "  boardWantLabel, careerLeagueOf, eraClubDefFor,\n  dugoutOf, sellValue,\n} from '@/lib/clubManager';"],
  ["import { ratingTint, MadeUpTag } from '@/components/club-manager/SquadScreen';\n",
    "import { ratingTint, MadeUpTag } from '@/components/club-manager/SquadScreen';\nimport { realDugoutSince, DUGOUT_MADE_UP_TITLE, DUGOUT_PARTIAL_TITLE } from '@/lib/realDugouts';\n"],
  ["  const league = careerLeagueOf({ clubName, eraId: career.eraId, customClub: career.customClub });\n  /* Round 132: the rival viewer shows the rival AS HE IS THIS SEASON. Before",
    "  const league = careerLeagueOf({ clubName, eraId: career.eraId, customClub: career.customClub });\n  /* Round 1606: who is in the other dugout, as a display slot reads it (real and dated, or made up). */\n  const dugout = clubName === career.clubName ? null : dugoutOf(career, clubName);\n  /* Round 132: the rival viewer shows the rival AS HE IS THIS SEASON. Before"],
  ["                shows your created manager if one exists, second person if\n                not, and rivals show the generated name and its tenure. */}\n            {clubName === career.clubName ? (\n              career.manager && (\n                <div className=\"text-[10px] text-muted-foreground\">Dugout: <span className=\"text-foreground font-semibold\">{career.manager.name}</span> (you)</div>\n              )\n            ) : (\n              managerOf(career, clubName) && (\n                <div className=\"text-[10px] text-muted-foreground\">\n                  Dugout: <span className=\"text-foreground font-semibold\">{managerOf(career, clubName)!.name}</span>\n                  {' '}since S{managerOf(career, clubName)!.since}\n                </div>",
    "                shows your created manager if one exists, second person if\n                not, and rivals show the generated name and its tenure.\n                Round 1606: a real opening day manager shows with the month\n                he took the job, and nothing else about him; every made up\n                one wears MADE UP so the page says which is which. */}\n            {clubName === career.clubName ? (\n              career.manager && (\n                <div className=\"text-[10px] text-muted-foreground\">Manager: <span className=\"text-foreground font-semibold\">{career.manager.name}</span> (you)</div>\n              )\n            ) : (\n              dugout && (\n                <div className=\"text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0\" data-cm-dugout={dugout.real ? 'real' : 'made-up'}>\n                  <span className=\"truncate max-w-full\">\n                    Manager: <span className=\"text-foreground font-semibold\">{dugout.name}</span>\n                    {dugout.real\n                      ? (realDugoutSince(dugout.appointed) ? ` · ${realDugoutSince(dugout.appointed)}` : '')\n                      : (dugout.since ? ` · since S${dugout.since}` : '')}\n                  </span>\n                  {!dugout.real && <MadeUpTag title={dugout.partial ? DUGOUT_PARTIAL_TITLE : DUGOUT_MADE_UP_TITLE} />}\n                </div>"],
];
function replace(source, inverse) {
  for (const [before, after] of inverse ? [...spans].reverse() : spans) {
    const anchor = inverse ? after : before, replacement = inverse ? before : after;
    assert.equal(source.split(anchor).length - 1, 1, 'Each dugout source join span must occur exactly once');
    source = source.replace(anchor, () => replacement);
  }
  return source;
}
export function withoutClubDetailDugout(source) {
  const markers = ['dugoutOf', 'data-cm-dugout', '@/lib/realDugouts'];
  if (!markers.some(marker => source.includes(marker))) return source;
  const historical = replace(source, true);
  assert.notEqual(historical, source); assert(!markers.some(marker => historical.includes(marker)), 'No partial dugout join may remain');
  assert.equal(replace(historical, false), source, 'The complete dugout inverse must restore actual current bytes');
  return historical;
}
