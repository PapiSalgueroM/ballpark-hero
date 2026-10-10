/* Reviewer's page (run lens), never committed: mounts the unmounted lottery card of Round 1222 on REAL orders built
   by the real modules, so a browser can look at it. Sent to the runner as .rc/x/r1222page.tsx and bundled there. */
import { createRoot } from 'react-dom/client';
import GmLotteryCard from '@/components/front-office-shared/GmLotteryCard';
import DraftNightCard from '@/components/front-office-shared/DraftNightCard';
import { buildDraftOrder, draftRulesFor, ownSlots } from '@/lib/gmDraftOrder';
import type { DraftSeason, SavedDraftOrder } from '@/lib/gmDraftOrder';
import { advanceDraftNight, draftRunReveal, openDraftNight } from '@/lib/gmDraftNight';
import { NBA_PICK_RULES } from '@/lib/gmPicks';

const FULL = ['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls', 'Cleveland Cavaliers',
  'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves',
  'New Orleans Pelicans', 'New York Knicks', 'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
  'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'];
const ABBR = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN',
  'NOP', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'];

function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 30 clubs, records from a narrow range so level records turn up, the best `made` records in the playoffs. */
function season(seed: number, made = 16): DraftSeason {
  const rng = rngOf(seed);
  const rows = ABBR.map(id => { const wins = 18 + Math.floor(rng() * 44); return { id, wins, losses: 82 - wins, made: false }; });
  [...rows].sort((a, b) => b.wins - a.wins || (a.id < b.id ? -1 : 1)).slice(0, made).forEach(r => { r.made = true; });
  return { sport: 'nba', draftYear: 2027, rows };
}

const q = new URLSearchParams(location.search);
const scenario = q.get('s') || 'up';
const labels = q.get('label') === 'abbr' ? ABBR : FULL;
const labelOf = (id: string) => labels[ABBR.indexOf(id)] ?? id;
const rules = draftRulesFor('nba', 2027);

interface Found { order: SavedDraftOrder; me: string; seed: number; season: DraftSeason }
function find(want: (o: SavedDraftOrder, s: DraftSeason) => string | null, made = 16): Found {
  for (let seed = 1; seed < 4000; seed += 1) {
    const s = season(seed, made);
    const order = buildDraftOrder(s, rules!, NBA_PICK_RULES);
    const me = want(order, s);
    if (me) return { order, me, seed, season: s };
  }
  throw new Error(`no season found for ${scenario}`);
}
const seedIn = (o: SavedDraftOrder, club: string) => o.lottery?.field.find(f => f.club === club)?.seed ?? 0;
const SCENARIOS: Record<string, () => Found> = {
  /* his club was drawn and climbed at least three places */
  up: () => find(o => o.lottery?.wins.find(w => w.seed - w.slot >= 3)?.club ?? null),
  /* his club had the worst record and fell */
  down: () => find(o => (o.lottery && o.first.indexOf(o.lottery.field[0].club) >= 3 ? o.lottery.field[0].club : null)),
  /* his club is a playoff club */
  notin: () => find(o => (o.lottery ? o.first[21] : null)),
  /* a field that is not the table's size: no drawing */
  plain: () => find(o => (o.lottery === null ? o.first[11] : null), 12),
  /* level lottery clubs, his is one of them */
  level: () => find(o => (o.lottery && o.level.some(g => g.length >= 3 && seedIn(o, g[0]) > 0) ? o.level.find(g => g.length >= 3 && seedIn(o, g[0]) > 0)![1] : null)),
};

const w = window as unknown as Record<string, unknown>;
w.__continues = 0;

function App() {
  if (scenario === 'run') {
    /* A toy night through the real loop: eleven rivals pick, he is on the clock at 12. The existing card draws it. */
    const order = buildDraftOrder(season(7), rules!, NBA_PICK_RULES);
    const me = order.first[11];
    const pool = Array.from({ length: 64 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, name: `Prospect ${i + 1}`, pos: ['G', 'F', 'C'][i % 3], read: 90 - i * 0.4 }));
    const host = {
      consume: () => true, sign: () => undefined, need: () => ({}), needWeight: 0,
      read: (p: typeof pool[number]) => p.read, shown: (p: typeof pool[number]) => p.read - 1,
      pos: (p: typeof pool[number]) => p.pos, id: (p: typeof pool[number]) => p.id, name: (p: typeof pool[number]) => p.name,
    };
    const night = openDraftNight(order, ownSlots(order.first, 1).concat(ownSlots(order.later, 1).map((s, i) => ({ ...s, round: 2, overall: 31 + i }))), 2026);
    const ran = advanceDraftNight(host, {}, night, me, pool);
    const reveal = draftRunReveal(ran.steps.map(s => ({ ...s, team: labelOf(s.team) })), ran.onClock);
    w.__info = { headline: reveal.headline, hidden: reveal.hidden, made: ran.steps.length, onClock: ran.onClock?.overall, rows: reveal.night.picks.map(p => p.overall) };
    return (
      <div>
        <p id="lift-headline" className="mb-2 text-sm font-bold text-foreground">{reveal.headline}</p>
        <DraftNightCard night={reveal.night} />
      </div>
    );
  }
  const found = (SCENARIOS[scenario] ?? SCENARIOS.up)();
  const { order, me } = found;
  w.__info = {
    scenario, me, meLabel: labelOf(me), seed: found.seed, plain: order.plain, first: order.first.slice(0, 14),
    field: order.lottery?.field ?? null, wins: order.lottery?.wins ?? null, level: order.level,
    records: Object.fromEntries(found.season.rows.map(r => [r.id, `${r.wins}-${r.losses}${r.made ? ' x' : ''}`])),
  };
  return (
    <GmLotteryCard
      order={order}
      myClub={me}
      labelOf={labelOf}
      rules={q.get('norules') === '1' ? null : rules}
      lottery={NBA_PICK_RULES.lottery}
      seen={q.get('seen') === '1'}
      onContinue={() => { w.__continues = (w.__continues as number) + 1; }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-background p-4 text-foreground">
    <div className="mx-auto max-w-2xl">
      <p id="above" className="mb-2 text-xs text-muted-foreground">2027 draft (reviewer's page, not the site)</p>
      <div id="card"><App /></div>
      <p id="below" className="mt-3 text-xs text-muted-foreground">BELOW THE CARD: this line must not move.</p>
    </div>
  </div>,
);
