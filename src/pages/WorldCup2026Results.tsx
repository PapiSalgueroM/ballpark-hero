import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import NotFound from '@/pages/NotFound';
import { WC2026_AWARDS, WC2026_GROUPS, WC2026_KNOCKOUT, type Wc2026Match, type Wc2026Round } from '@/data/wc2026Results';

/**
 * Round 656: the 2026 World Cup as it was played, on a page of its own.
 *
 * WHY. src/data/wc2026Results.ts has been two source verified since Round 395
 * (ESPN's scoreboard feed against Wikipedia's tournament articles, every
 * knockout score agreeing), but the only thing that printed it was the panel
 * under the bracket game, and only its knockout half, behind a button. So a
 * search for "2026 World Cup results" had nothing on this site to land on.
 *
 * WHAT IS TYPED AND WHAT IS READ. Typed here: headings, column names, the
 * award names and the sentences around the data. Read from the results file
 * at render: every team, every score, every date, every position, how every
 * tie was decided, how far every team got, every award winner and every count.
 * The file holds finishing positions and not points, so the group section says
 * standings and prints positions only.
 *
 * Nothing reads the clock and nothing is fetched, so the saved page stays true
 * as long as the file does. scripts/simWc2026ResultsPage.mjs recomputes the
 * final, the group order and every match from the file and compares them with
 * the saved page.
 */

const PATH = '/world-cup-2026-results';
const SITE = 'https://douknowball.com';
const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';
const CELL = 'px-3 py-1.5 text-muted-foreground';
const HEAD = 'px-3 py-2 font-semibold text-foreground';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '2026-07-19' reads as 'July 19'. Split, never parsed into a Date, so no clock and no time zone. */
const dayOf = (iso: string): string => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

/** The five rounds that get a section of their own; the final heads the page. */
const ROUNDS: { round: Wc2026Round; heading: string }[] = [
  { round: 'r32', heading: 'Round of 32' },
  { round: 'r16', heading: 'Round of 16' },
  { round: 'qf', heading: 'Quarter-finals' },
  { round: 'sf', heading: 'Semi-finals' },
  { round: 'tp', heading: 'Third place' },
];
const OUT_IN: Partial<Record<Wc2026Round, string>> = {
  r32: 'Out in the round of 32',
  r16: 'Out in the round of 16',
  qf: 'Out in the quarter-finals',
};
const POSITIONS = ['1st', '2nd', '3rd', '4th'];
const AWARDS: { key: keyof typeof WC2026_AWARDS; name: string }[] = [
  { key: 'goldenBall', name: 'Golden Ball' },
  { key: 'goldenBoot', name: 'Golden Boot' },
  { key: 'goldenGlove', name: 'Golden Glove' },
  { key: 'youngPlayer', name: 'Best Young Player' },
];

const loserOf = (m: Wc2026Match): string => (m.winner === m.team1 ? m.team2 : m.team1);
const goalsOf = (m: Wc2026Match, team: string): number => (team === m.team1 ? m.score1 : m.score2);
/** The file writes a shootout team1 first; a reader wants the winner's tally first. */
const shootoutOf = (m: Wc2026Match): string => {
  const [a, b] = (m.penalties ?? '').split('-');
  return m.winner === m.team1 ? `${a}-${b}` : `${b}-${a}`;
};
const decidedBy = (m: Wc2026Match): string =>
  m.penalties
    ? `Level after extra time, ${m.winner} won ${shootoutOf(m)} on penalties`
    : m.extraTime
      ? `${m.winner} won after extra time`
      : `${m.winner} won in normal time`;
/** "Spain 1-0 Argentina after extra time", in the order the file lists the teams. */
const finalLine = (m: Wc2026Match): string =>
  `${m.team1} ${m.score1}-${m.score2} ${m.team2}` +
  (m.penalties ? `, ${m.winner} won ${shootoutOf(m)} on penalties` : m.extraTime ? ' after extra time' : '');
/** One round's matches, earliest first, ties on a date kept in the file's order. */
const matchesIn = (round: Wc2026Round): Wc2026Match[] =>
  WC2026_KNOCKOUT.filter(m => m.round === round).slice().sort((a, b) => a.date.localeCompare(b.date));

const MatchTable = ({ matches }: { matches: Wc2026Match[] }) => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-secondary/50 text-left">
          <th className={HEAD}>Date</th>
          <th className={HEAD}>Match</th>
          <th className={HEAD}>Score</th>
          <th className={HEAD}>How it was decided</th>
        </tr>
      </thead>
      <tbody>
        {matches.map(m => (
          <tr key={`${m.round}-${m.team1}-${m.team2}`} className="border-t border-border/60">
            <td className={`${CELL} whitespace-nowrap`}>{dayOf(m.date)}</td>
            <td className="px-3 py-1.5 font-medium text-foreground">{m.team1} v {m.team2}</td>
            <td className={`${CELL} whitespace-nowrap`}>{m.score1}-{m.score2}</td>
            <td className={CELL}>{decidedBy(m)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const WorldCup2026Results = () => {
  const final = WC2026_KNOCKOUT.find(m => m.round === 'f');
  const third = WC2026_KNOCKOUT.find(m => m.round === 'tp');
  if (!final || !third) return <NotFound />;

  const champion = final.winner;
  const runnerUp = loserOf(final);
  const dates = WC2026_KNOCKOUT.map(m => m.date).sort();
  const thirdsThrough = WC2026_GROUPS.filter(g => g.thirdQualified).length;
  const year = final.date.slice(0, 4);

  /** How far a team got, read off the knockout rows. */
  const finishOf = (team: string): string => {
    if (team === champion) return 'Champions';
    if (team === runnerUp) return 'Runners-up';
    if (team === third.winner) return 'Third place';
    if (team === loserOf(third)) return 'Fourth place';
    /* A semi final loser who is somehow not in the third place row is still a semi finalist,
       never out in the group stage (release G review of Round 656). */
    if (WC2026_KNOCKOUT.some(m => m.round === 'sf' && (m.team1 === team || m.team2 === team) && m.winner !== team)) return 'Semi-finalists';
    const beaten = WC2026_KNOCKOUT.find(m => (m.team1 === team || m.team2 === team) && m.winner !== team && OUT_IN[m.round]);
    return beaten ? (OUT_IN[beaten.round] as string) : 'Out in the group stage';
  };

  const h1 = `${year} World Cup results`;
  const description =
    `Every ${year} World Cup result: ${champion} beat ${runnerUp} ${goalsOf(final, champion)}-${goalsOf(final, runnerUp)}${final.extraTime ? ' after extra time' : ''} in the final, ` +
    `all ${WC2026_GROUPS.length} groups in finishing order, every knockout score and the awards.`;

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title={`${year} World Cup Results: Every Score and Final Standings | DoUKnowBall`} description={description} path={PATH} />
      {/* The breadcrumb follows RecordPage: its own Helmet, mounted once with its final content. */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'DoUKnowBall', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Soccer Games', item: `${SITE}/soccer` },
            { '@type': 'ListItem', position: 3, name: h1, item: `${SITE}${PATH}` },
          ],
        })}</script>
      </Helmet>
      <Link
        to="/soccer"
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the soccer games
      </Link>

      <h1 className="text-3xl font-bold mb-2">{h1}</h1>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
        {champion} won the {year} World Cup, beating {runnerUp} {goalsOf(final, champion)}-{goalsOf(final, runnerUp)}{final.extraTime ? ' after extra time' : ''} in the final on {dayOf(final.date)}, {year}.
        {' '}{third.winner} beat {loserOf(third)} {goalsOf(third, third.winner)}-{goalsOf(third, loserOf(third))} for third place.
      </p>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        The knockout rounds ran from {dayOf(dates[0])} to {dayOf(dates[dates.length - 1])}, {year}. Below are all {WC2026_KNOCKOUT.length} knockout scores, how each one was settled, where all {WC2026_GROUPS.length} groups finished and who took the individual awards.
      </p>

      <section className="space-y-3" aria-labelledby="wc-final">
        <h2 id="wc-final" className="text-xl font-semibold text-foreground">The final: {finalLine(final)}</h2>
        <MatchTable matches={[final]} />
      </section>

      <section className="mt-10 space-y-6" aria-labelledby="wc-groups">
        <div className="space-y-2">
          <h2 id="wc-groups" className="text-xl font-semibold text-foreground">Final group standings</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Where every team finished in its group, first to fourth, and how far it got after that. These are finishing positions only, so there are no points or goal difference here.
            The top two in each group went through to the round of 32, along with the {thirdsThrough} best third placed teams.
          </p>
        </div>
        {WC2026_GROUPS.map(g => (
          <div key={g.letter}>
            <h3 className="text-base font-semibold text-foreground mb-2">Group {g.letter}</h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className={HEAD}>Position</th>
                    <th className={HEAD}>Team</th>
                    <th className={HEAD}>How far they got</th>
                  </tr>
                </thead>
                <tbody>
                  {g.teams.map((team, i) => (
                    <tr key={team} className="border-t border-border/60">
                      <td className={CELL}>{POSITIONS[i]}</td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{team}</td>
                      <td className={CELL}>{finishOf(team)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {ROUNDS.map(r => (
        <section key={r.round} className="mt-10 space-y-3" aria-labelledby={`wc-${r.round}`}>
          <h2 id={`wc-${r.round}`} className="text-xl font-semibold text-foreground">{r.heading}</h2>
          <MatchTable matches={matchesIn(r.round)} />
        </section>
      ))}

      <section className="mt-10 space-y-3" aria-labelledby="wc-awards">
        <h2 id="wc-awards" className="text-xl font-semibold text-foreground">{year} World Cup awards</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-left">
                <th className={HEAD}>Award</th>
                <th className={HEAD}>Player</th>
                <th className={HEAD}>Nation</th>
              </tr>
            </thead>
            <tbody>
              {AWARDS.map(a => {
                const won = WC2026_AWARDS[a.key];
                return (
                  <tr key={a.key} className="border-t border-border/60">
                    <td className={CELL}>{a.name}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{won.player}{'goals' in won ? `, ${won.goals} goals` : ''}</td>
                    <td className={CELL}>{won.nation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 space-y-2" aria-labelledby="wc-play">
        <h2 id="wc-play" className="text-lg font-semibold text-foreground">Play with this history</h2>
        <ul className="text-sm space-y-1">
          <li><Link to="/world-cup-bracket" className={`${LINK} font-semibold`}>World Cup 2026 Bracket</Link>: fill in a bracket and it gets scored against these results.</li>
          <li><Link to="/guess-the-nation" className={`${LINK} font-semibold`}>Guess The Nation</Link>: work out the mystery sporting nation from its clues.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3 text-sm text-muted-foreground leading-relaxed" aria-labelledby="wc-source">
        <h2 id="wc-source" className="text-lg font-semibold text-foreground">Where this comes from</h2>
        <p>
          Every result here was checked against two independent sources before it went in: ESPN's scoreboard feed and Wikipedia's tournament pages, compared match by match, and all {WC2026_KNOCKOUT.length} knockout scores and winners agreed.
          Group positions come from the list of qualified teams and from standings worked out from every group game, and the two agreed in every group.
          The awards were checked against Wikipedia, plus The Athletic and FOX Sports. Spot something that looks wrong anyway? The Report a bug button below lands straight in our inbox.
        </p>
      </section>

      <nav className="mt-10 space-y-2" aria-labelledby="wc-more">
        <h2 id="wc-more" className="text-lg font-semibold text-foreground">More soccer</h2>
        <ul className="text-sm space-y-1">
          <li><Link to="/soccer" className={LINK}>Every soccer game on the site</Link></li>
          <li><Link to="/champions-league-format-history" className={LINK}>Champions League format history</Link></li>
          <li><Link to="/records" className={LINK}>The Record Books, champions by year for every competition we keep</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default WorldCup2026Results;
