import assert from 'node:assert/strict';

/* Exact additive UI spans only. The roster proof still reconstructs its whole historical source. */
const spans = [
  ["import { useMemo } from 'react';", "import { useMemo, useState } from 'react';\nimport { clubLeagueFixtures } from '@/lib/clubDetailFixtures';"],
  ['export function ClubDetailScreen({ clubName, career, onBack }: ClubDetailScreenProps) {',
    'export function ClubDetailScreen({ clubName, career, onBack }: ClubDetailScreenProps) {\n  const [fixturesClub, setFixturesClub] = useState<string | null>(null);'],
  ['  return (\n    <div>', `  if (fixturesClub === clubName) {
    const fixtures = clubLeagueFixtures(career, clubName);
    return <section aria-label="Club league fixtures" className="space-y-3">
      <button type="button" onClick={() => setFixturesClub(null)} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <div><h2 className="text-lg font-bold">{clubName} fixtures</h2>
        {fixtures && <p className="text-xs text-muted-foreground">{fixtures.leagueName} · {worldSeasonLabel(career)}</p>}
      </div>
      {fixtures ? <ul className="max-h-[48vh] overflow-y-auto overscroll-contain space-y-2 pr-1">
        {fixtures.rows.map(row => <li key={\`\${row.round}-\${row.home}-\${row.away}\`} data-club-fixture={row.round} className="rounded-xl border border-border p-3">
          <p className="text-[10px] text-muted-foreground">Matchday {row.round + 1}</p>
          <p className="break-words text-sm font-semibold">{row.home} vs {row.away}</p>
          <p className="text-sm">{row.status === 'recorded' ? \`\${row.homeGoals} - \${row.awayGoals}\` : row.status === 'upcoming' ? 'Upcoming' : 'Result not recorded'}</p>
        </li>)}
      </ul> : <p className="text-sm text-muted-foreground">League fixtures are not available for this club in this save.</p>}
    </section>;
  }

  return (
    <div>`],
  ['          Board wants: <span className="text-foreground font-semibold">{boardWant}</span> · transfer budget around {money(def.budget)}\n        </div>',
    '          Board wants: <span className="text-foreground font-semibold">{boardWant}</span> · transfer budget around {money(def.budget)}\n        </div>\n        <button type="button" onClick={() => setFixturesClub(clubName)} className="mt-2 min-h-11 rounded-lg border border-border px-3 text-sm font-semibold">Fixtures</button>'],
];
function replace(source, inverse) {
  for (const [before, after] of inverse ? [...spans].reverse() : spans) {
    const anchor = inverse ? after : before, replacement = inverse ? before : after;
    assert.equal(source.split(anchor).length - 1, 1, 'Each fixtures source join span must occur exactly once');
    source = source.replace(anchor, replacement);
  }
  return source;
}
export function withoutClubDetailFixtures(source) {
  const markers = ['clubLeagueFixtures', 'fixturesClub', 'Club league fixtures', '>Fixtures</button>'];
  if (!markers.some(marker => source.includes(marker))) return source;
  const historical = replace(source, true);
  assert.notEqual(historical, source); assert(!markers.some(marker => historical.includes(marker)), 'No partial fixtures join may remain');
  assert.equal(replace(historical, false), source, 'The complete fixtures inverse must restore actual current bytes');
  return historical;
}
