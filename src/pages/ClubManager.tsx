import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Play, ChevronRight, ChevronLeft, Trophy, Briefcase, ShieldAlert, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubManager } from '@/hooks/useClubManager';
import type { HubTab } from '@/hooks/useClubManager';
import {
  TIER_INFO, clubDefFor, clubPreviewRating, careerLeagueOf, money,
  isAvailable, xiAverageRating, sortedTable,
  NATIONS, REAL_LEAGUES, playableClubs, objectiveStatuses, CM_ROSTER_META, isPartialClub,
  isHistoricEra, eraLeaguesFor, eraPlayableClubs, boardWantLabel,
  developingPlayers, INTENSITY_INFO, FOCUS_INFO,
  brokenPromises, CM_ERAS, DEFAULT_ERA_ID, eraById, projectedXIAvg, CM_BASE_YEAR,
  worldSeasonLabel, pressOf, pressHeadline, preMatchRead,
  TICKET_TIERS, groundUpgradeCost, gatePricePerFan, sponsorOffers, nationOfferFor,
} from '@/lib/clubManager';
import type { NationDef, ObjectiveStatus, CupRound, CustomClubSpec, ManagerSpec } from '@/lib/clubManager';
import { MANAGER_BACKGROUNDS, CLUB_IDENTITIES } from '@/lib/clubManager';
import { ManagerForm } from '@/components/club-manager/ManagerForm';
import { eraRealShareLabel, eraHonestyLine } from '@/lib/clubManagerEras';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ConfettiBurst } from '@/components/club-manager/Celebration';
import { CustomClubForm, CrestBadge } from '@/components/club-manager/CustomClubForm';
import { WorldTablesCard } from '@/components/club-manager/WorldTablesCard';
import { MetersStrip } from '@/components/club-manager/MetersStrip';
import { UclBracketCard } from '@/components/club-manager/UclBracketCard';
import { UclGroupsCard } from '@/components/club-manager/UclGroupsCard';
import { CupBracketCard } from '@/components/club-manager/CupBracketCard';
import { StatsScreen } from '@/components/club-manager/StatsScreen';
import { CalendarScreen } from '@/components/club-manager/CalendarScreen';
import { InboxCard } from '@/components/club-manager/InboxCard';
import { ClubDetailScreen } from '@/components/club-manager/ClubDetailScreen';
import { SquadScreen } from '@/components/club-manager/SquadScreen';
import { ContractsCard } from '@/components/club-manager/ContractsCard';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { HalftimeScreen } from '@/components/club-manager/HalftimeScreen';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { AcademyScreen } from '@/components/club-manager/AcademyScreen';
import { TrainingScreen } from '@/components/club-manager/TrainingScreen';
import { RolesScreen } from '@/components/club-manager/RolesScreen';
import { PressScreen } from '@/components/club-manager/PressScreen';
import { MatchCentre } from '@/components/club-manager/MatchCentre';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

// Round 70: board objective status chips.
const OBJ_CHIP: Record<ObjectiveStatus, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  onTrack: { label: 'On track', cls: 'bg-secondary text-muted-foreground border-border' },
  behind: { label: 'Behind', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40' },
  failed: { label: 'Failed', cls: 'bg-red-500/10 text-red-400 border-red-500/40' },
};

/** Round 74: one hub box (the tile rule). Tap it, it becomes its own screen. */
function HubTile({ icon, title, value, sub, accent, onClick }: {
  icon: string; title: string; value: string; sub?: string; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all bg-card hover:border-primary hover:-translate-y-0.5',
        accent ? 'border-gold/50' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base leading-none">{icon}</span>
        {accent && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-sm font-bold font-display text-foreground truncate">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground truncate mt-0.5">{sub}</div>}
    </button>
  );
}

type HubPanel = 'board' | 'inbox' | 'calendar' | 'manager' | 'treatment' | 'cups' | 'trophies' | 'academy' | 'training' | 'roles' | 'press' | 'matchCentre' | 'stats' | 'finance';

const ClubManager = () => {
  const g = useClubManager();
  // Round 65: the owner's no scroll rule. Full time and season end screens are
  // what you were waiting for after pressing Play, so they pull themselves into
  // view rather than rendering below where your thumb just was.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.career?.week ?? 0}`);
  // Round 70: the nation -> league -> team picker. Each step change pulls the
  // new step into view (skipFirst so landing on the page stays put).
  // Round 72: nations can hold more than one league (England, the USA).
  /* Round 132: the era comes first, because it decides what every later screen
     is looking at: which squads, which players, how good each club is. Same
     idea as the era choice on the My Career create screen, laid out as tiles
     because this game is tiles. */
  const [pickStep, setPickStep] = useState<'era' | 'nation' | 'league' | 'team' | 'custom' | 'manager'>('era');
  const [pickEra, setPickEra] = useState<string>(DEFAULT_ERA_ID);
  const [pickNation, setPickNation] = useState<NationDef | null>(null);
  const [pickLeagueId, setPickLeagueId] = useState<string | null>(null);
  /* Round 303: a founded club waits here while the dugout step runs, so the
     manager spec and the club spec land in startCareer together. */
  const [pendingCustomSpec, setPendingCustomSpec] = useState<CustomClubSpec | null>(null);
  const pickRef = useRevealScroll<HTMLDivElement>(`pick:${pickStep}:${pickEra}:${pickNation?.id ?? ''}:${pickLeagueId ?? ''}`, { skipFirst: true });
  const era = eraById(pickEra);
  const eraYearsOn = Math.max(0, era.startYear - CM_BASE_YEAR);
  // Round 74: the tile rule. Boxes on the home screen open their own
  // screens, and any club anywhere opens the rival viewer.
  const [hubPanel, setHubPanel] = useState<HubPanel | null>(null);
  const [clubView, setClubView] = useState<string | null>(null);
  /* Round 158: watching the match live instead of jumping between screens.
     While this is on, the halftime and full time phases render inside the
     animated viewer; turning it off drops back to the classic screens. */
  const [watchMode, setWatchMode] = useState(false);
  const panelRef = useRevealScroll<HTMLDivElement>(`hub:${hubPanel ?? ''}:${clubView ?? ''}`, { skipFirst: true });

  /* Round 154: clubDefFor, not clubByName, because a custom club has no
     entry in any static table and resolves through the save's registered
     spec instead (color, tier, expectation all correct, never null). */
  const club = g.career ? clubDefFor(g.career.clubName) : null;
  const unavailable = useMemo(
    () => (g.career ? g.career.squad.filter(p => !isAvailable(p)) : []),
    [g.career],
  );
  // Round 116: the academy and the training ground feed their own hub tiles.
  const academy = g.career?.academy ?? null;
  const prospectCount = academy ? academy.prospects.length : 0;
  const growingCount = useMemo(
    () => (g.career ? developingPlayers(g.career).length : 0),
    [g.career],
  );
  const trainingLabel = g.career?.training
    ? `${INTENSITY_INFO[g.career.training.intensity].label} · ${FOCUS_INFO[g.career.training.focus].label}`
    : 'Not set';
  // Round 127: who you are letting down, and who has already asked to go.
  const letDown = useMemo(
    () => (g.career ? brokenPromises(g.career) : []),
    [g.career],
  );
  const wantAway = useMemo(
    () => (g.career ? g.career.squad.filter(p => p.wantsOut) : []),
    [g.career],
  );
  // Round 135: the press room and the team talk.
  const press = g.career ? pressOf(g.career) : null;
  const matchRead = useMemo(
    () => (g.career && !g.career.live ? preMatchRead(g.career) : null),
    [g.career],
  );

  const shell = (inner: ReactNode) => (
    <>
      <PageSeo
        title="Club Manager: Football Management Sim | DoUKnowBall"
        description="Pick a real club, set your tactics, work the transfer market and survive the sack race across full 38-game seasons, cup runs and the Champions League."
        path="/club-manager"
      />
      <GameShell
        help="none"
        width="wide"
        showReportQuestion
        reportGameType="club-manager"
      >
        <div className="relative">
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right">
            <div className="space-y-3 text-left">
              <p>🌍 <span className="font-semibold text-foreground">Pick any club in 20 real leagues.</span> The big five (2026-27 lineups with promotions and relegations applied), the EFL Championship and the 2. Bundesliga, the Primeira Liga, the Scottish Premiership, the Süper Lig, the Belgian Pro League, the Austrian Bundesliga, the Super League Greece, the Danish Superliga, the Swiss Super League, Croatia's SuperSport HNL, the Saudi Pro League, both MLS conferences and the Eredivisie: 330 clubs and over 3,600 real players, each squad at its real market values as of August 2026, after the summer window. Giants get huge budgets and zero patience; underdogs get small budgets and a low bar.</p>
              <p>📅 <span className="font-semibold text-foreground">Pick when you start.</span> 2026-27 is the real thing, every name and every value. Or go back: 2015-16 is the season Leicester won at 5000 to 1, with Vardy, Mahrez and Kante at their real pre-title values, MSN at Barcelona, De Bruyne newly at City and, since the Serie A joined the era, Juventus chasing a fifth straight Scudetto with Dybala newly arrived from Palermo; 2010-11 is prime Messi, Mourinho's Madrid and Rooney's United; 2005-06 is Ronaldinho's Ballon d'Or Barcelona with a 17 year old Messi on the bench, Mourinho's back to back Chelsea, Henry's Arsenal and Gerrard's Istanbul champions, back when the second European prize was still called the UEFA Cup, and the boards say so. Each past season is the real top flight football of its year: 2015-16 runs the Premier League, La Liga and Serie A, all 60 clubs, while 2010-11 and 2005-06 run the Premier League and La Liga, 40 each, hundreds of real players at their real ages and values from that year, with the famous summer moves applied. Each era's giants rate like the legends they are, above anyone in the current generation, with the whole era scaled around them. Every era is a sealed world, so no 2026 player can leak into your past market, and there is no Conference League back there because it did not exist yet. We only offer a past we hold real data for, and we never invent one: 2005-06 is the floor of the records, so there is no 2000 era. As your save runs deep, players age, retire and get replaced; anyone the game makes up is marked MADE UP wherever he appears, so you always know who is real.</p>
              <p>✨ <span className="font-semibold text-foreground">Or create your own club.</span> Any league, either era: name it, build the crest (shape, pattern, your colors, your initials), name your stadium, and choose your backing. Your club takes the league place of the division's weakest side and starts with 24 generated players, all marked as made up. Every real player stays real, and the market is where you sign them. The board reads your squad, not your wallet: big money in a smaller league gets told to win it, the same money in the Premier League gets told to survive first.</p>
              <p>👟 <span className="font-semibold text-foreground">Players age and they stop playing.</span> A thirty year old slips a point a season, a thirty five year old slips three or four, and how fast depends on where he plays: keepers last for years, wingers and full backs go first. Somewhere around thirty four to thirty seven most of them retire for good. Sign the young ones early, get your kids in, or your best XI will quietly rot underneath you.</p>
              <p>📋 <span className="font-semibold text-foreground">The board names the actual prize</span>: win the league, qualify for the Champions League or Europa League, reach the top half, or stay up, plus a cup target, a rival to finish above, and squad mandates. Hit them and your stock rises; miss them and the confidence meter drains.</p>
              <p>🗓️ <span className="font-semibold text-foreground">Play a full season in your club's REAL league</span>, at its real length, against its real clubs, plus the domestic cup and the Champions League if you qualify, while every other league in the world plays out alongside yours. In Europe you can watch all eight groups, and a projected knockout bracket tracks the leaders until the real draw locks in after matchday 6.</p>
              <p>📆 <span className="font-semibold text-foreground">The calendar is the season laid out month by month, and you can tap any day and sim to it.</span> Match days name the opponent, home or away, with the competition, and wear a result once played. The summer window is open from kickoff and the January window opens on the first Saturday of the new year; each one closes at the final whistle of its deadline day, marked with a padlock, after four of your matches in the summer and three in January. Tap a day, read what it holds, and hit Sim to play everything up to it in one go: a match day plays that match, a quiet day plays everything before it and stops. The four fast forwards (next match, about a month, to the window, rest of season) are the same tap on a chosen day. Every run stops early for the things that need you: a window opening, the season review, the sack, or a club's approach landing.</p>
              <p>🧠 <span className="font-semibold text-foreground">Set tactics before each match:</span> formation, mentality and your starting XI. Form, morale, fatigue, injuries and home advantage all matter.</p>
              <p>📊 <span className="font-semibold text-foreground">Play it your way.</span> Quick Sim gives you the full result in one tap: scorers, cards, injuries, possession, shots, expected goals, momentum and every player's rating. Watch Live plays the match as moving circles on a pitch at 0.5x to 4x speed, with goals, cards and subs landing at their real minutes and the dressing room at the break. Play Match skips the theatre and stops at half time. The Match Centre shows both clubs' form, your past meetings and the engine's own win odds before you commit.</p>
              <p>📈 <span className="font-semibold text-foreground">The stats centre keeps the season's numbers.</span> The club's record split by league, cup and Europe, the top scorer, the assist king, the best average rating and the most carded man, plus every player's full line (apps, goals, assists, cards, average rating), sortable by any column and filterable by competition. Above it all run the award races: the league's golden boot board, a player of the season watch scored by one formula for everyone, and the Ballon d'Or conversation, all settled with the season and named in your season review.</p>
              <p>🤝 <span className="font-semibold text-foreground">Tell every player what he is</span>: star man, key first teamer, rotation option, backup or one for the future. Each rung is a promise about minutes, and the dressing room keeps score over your last ten matches. Keep your word and they play for you. Break it and they sulk, drag the room down and hand in transfer requests. You can buy your way out of a promise, but it costs six weeks of his wages a rung.</p>
              <p>🎙️ <span className="font-semibold text-foreground">Front up to the press, and talk to your players.</span> The reporters only turn up when something has happened: a losing run, a man you have stopped picking, a club circling one of your stars, a derby, or the bookmakers making you favourite for the sack. Every answer spends one thing to buy another, so backing your players costs you with the board and calling them out costs you the dressing room, and talking big before a derby puts your words on the other lot's wall. Before every match and again at half time you pick a tone: calm them, fire them up, demand more, or the hairdryer. Read the afternoon right and they play above themselves. Read it wrong and you lose them, and the wrong one hurts more than the right one helps.</p>
              <p>💰 <span className="font-semibold text-foreground">Buy and sell in the summer and January windows.</span> Over 3,600 real players are on the market at their real values, each one wearing his real nationality's flag, and the deep filters go all the way down: position group or exact position, age, price, selling league, nationality (132 real nations, drawn from your world's own market) and four sorts. Stay under budget and keep at least 14 players.</p>
              <p>📝 <span className="font-semibold text-foreground">Every player is on a real deal.</span> Wages sit on a curve, and the board sets a weekly ceiling taken off the squad they handed you on day one. It moves with the club's season after that, up a bit when you beat what they asked for and further for a trophy, back down after a bad one, and it never moves with your own wage bill, so signing big does not talk them into paying for it. Contracts tick down: a man you never sit down with walks for free in the summer, with his sale value already collapsed. The contracts desk on the Squad tab re-signs anyone in his final year, two ways: the full-wage deal, or 12 percent cheaper with a release clause written in at 1.5 times his value that day. The clause is a real exit door. Any club can pay it, it cannot be rejected or blocked, an unanswered one executes itself on deadline day, and the only way to delete it is a full price renewal later. Grow a star past his own clause and the phone will ring.</p>
              <p>🤝 <span className="font-semibold text-foreground">Sponsors pay the other half of the bills.</span> The Finances desk puts three shirt sponsor offers on the table whenever the club has no deal, and they are three different shapes: the most guaranteed money, less money with a real bonus for winning the league, or the smallest cheque locked in for four seasons with a little for a top half finish. The money lands in the same kitty as everything else, once a season, and the bonus lands at the season end that earns it. The offers grow as the club does: stature, the league, Europe and the trophy cabinet all count. Leave the club and the deal stays behind, because it was the club's and not yours.</p>
              <p>🎟️ <span className="font-semibold text-foreground">The club earns while you manage.</span> Every home crowd pays a gate into the transfer kitty: attendance times your ticket prices. The Finances desk sets the policy (fair prices fill the ground for less a head, premium squeezes more from fewer) and expands the ground up to three times, each one growing your crowds from the next home game. The board reads ambition into a bigger ground, and it is all one kitty: gates in, transfers, scouts, the academy and the builders out. Whatever you did not spend comes with you into the summer. The board still writes its own cheque every August and your balance rolls on top of it, up to one more season's worth, so a quiet year can open a window with double the board's money. You cannot bank five quiet seasons into one giant one though: anything past that gets taken back. Leave the club and the balance stays behind, the same as the sponsor deal and the ground you built, because it was always the club's money.</p>
              <p>🌐 <span className="font-semibold text-foreground">Win enough and your country calls.</span> A national federation can offer you the international job alongside your club. Club football does not change at all: the country plays between seasons, in the real tournaments, with the real qualifying groups and the slot counts each confederation actually gets. A good manager makes his country more likely to win one, but the players still decide most of it. Win a tournament and it goes in the same cabinet as a league title. Miss one your country should have reached and the federation moves on.</p>
              <p>🧳 <span className="font-semibold text-foreground">And if they do sack you, that is not the end.</span> You go out of work with your record intact and clubs start calling: real clubs from the real pyramid, with the job they are actually offering written out. Trophies and title finishes open doors, relegations shut them. Every week you wait for a better job cools the market a little, and somebody always takes a chance on you in the end. Take one and you start next season there.</p>
              <p>📉 <span className="font-semibold text-foreground">Two meters sit under the club name on every tab: the board and the fans.</span> Tap either one to swap its words for the number out of 100. The board meter is the sack race itself, nothing prettier: it opens at 60 in your first season and anywhere from 35 to 82 after that depending on how the last one went, a win adds about 4, a defeat takes about 4.5 (more at a giant, more again when the papers have turned on you), the table against what the club expects moves it a little every league week, a cup exit or a promise to the press you broke costs extra, and at zero you are sacked. Safe is 60 and above. Under pressure is 10 to 59. Under 10 it reads One bad week from the sack, and it means it: a single week has been measured taking more than 10 off, because a defeat, the table, a cup exit and a promise to the press broken can all land in the same seven days. Between matches nothing can sack you: a press answer or a handshake with another club can drain the board to its last point, and the next result decides. The fan meter is read off what fans actually feel: this season's results weighted towards the recent ones (the biggest term, worth 34 points either way), your league position against the club's own expectation (2.5 a place, capped at 15), the ticket policy on the Finances desk (fair prices +4, premium -5) and every trophy lifted this season (+8 each, up to 16), all on top of a base of 55. Singing is 65 and above, Grumbling is 40 to 64, Turning is under 40, and Hopeful is what they are before a ball is kicked. Overachieve and bigger clubs come calling, from any league in the game, and some of them call MID-SEASON: an approach lands in the Manager panel, and committing to it is a summer pre-agreement your current board will hear about on the radio. They can even walk away again if your season collapses after the handshake.</p>
              <p>🏆 <span className="font-semibold text-foreground">Season score</span> = league points + 10 per trophy (max 130). Careers span multiple seasons; your save is kept on this device.</p>
            </div>
          </HowToPlayPopover>
          {inner}
        </div>
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1
          title="Club Manager: Football Management Sim"
          description="A full club-management sim in your browser: 330 clubs across 20 real leagues, from the Premier League, the 2. Bundesliga and the Scottish Premiership to the Saudi Pro League, MLS, Croatia, Denmark, Switzerland, Austria and Greece, each with its real squad and market values as of August 2026. Manage today or in a real past season: 2015-16 with Leicester at 5000 to 1, 2010-11 with prime Messi, or 2005-06 with Ronaldinho's Barcelona. Or create your own club with its own crest and stadium. Negotiate transfers, survive bidding wars, hit the board's named objectives, and chase titles season after season."
          howToPlay={[
            'Pick your era: 2026-27 with real squads, or the real 2015-16, 2010-11 or 2005-06 Premier League and La Liga.',
            'Pick your nation, league and club (330 clubs across 20 real leagues), or create your own club with its own crest, stadium and budget.',
            'Read the board\'s objectives: league finish, cup run, Europe where it applies, beating your rival, and a goals quota.',
            'Set your formation, mentality and XI, then play through the full season week by week.',
            'Work the market: negotiate fees, pay release clauses, take loans, and field bids for your own stars, with deep filters down to exact position, age, price, league and nationality, every player under his real flag.',
            'Run the contracts desk: re-sign expiring players at full wage, or cheaper with a release clause any club can trigger, and delete a bargain clause with a full price renewal before the phone rings.',
            'Run the money: gate receipts from every home crowd, a ticket policy, three ground expansions, and a shirt sponsor chosen from three real shapes (the biggest cheque, a title bonus, or four locked in seasons).',
            'Win enough and manage your country as well: real tournaments between seasons, real qualifying groups, and a place in the cabinet if you lift one.',
            'Handle the press when they come for you, and pick your team talk before kick off and again at half time.',
            'Win trophies, keep the board happy, and build a managerial career that can cross leagues and continents.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );

  /* ================= BOOT ================= */
  if (g.phase === 'boot') {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }

  /* ================= RESUME PROMPT ================= */
  if (g.phase === 'resume' && g.career) {
    const c = g.career;
    return shell(
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm">A saved career was found on this device.</p>
        </header>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-xl font-bold font-display text-foreground">{c.clubName}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {worldSeasonLabel(c)} · Season {c.season} · Week {Math.min(c.week + 1, c.calendar.length)} of {c.calendar.length} · Board {Math.round(c.boardConfidence)}/100
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">🏆 {c.trophies.length} trophies won so far</div>
          <div className="flex gap-3 mt-5">
            <button onClick={g.resume} className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
              Resume Career
            </button>
            <button onClick={g.startNew} className="flex-1 px-5 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors">
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= CLUB SELECT (Round 70: nation -> league -> team) ================= */
  if (g.phase === 'clubSelect' || (g.phase === 'resume' && !g.career)) {
    /* Round 303: the dugout step hands in null (skip) or a manager spec, and
       either way the picker resets for the next career. */
    const confirmAndReset = (manager: ManagerSpec | null) => {
      if (pendingCustomSpec) g.confirmCustomClub(pickEra, pendingCustomSpec, manager ?? undefined);
      else g.confirmClub(pickEra, manager ?? undefined);
      setPickStep('era');
      setPickEra(DEFAULT_ERA_ID);
      setPickNation(null);
      setPickLeagueId(null);
      setPendingCustomSpec(null);
    };
    /* Round 146: a historic era swaps the whole picker world: its nations,
       its leagues, its clubs, its stature. The modern path is untouched. */
    const historicPick = isHistoricEra(pickEra);
    const league = pickLeagueId
      ? (historicPick ? eraLeaguesFor(pickEra) : REAL_LEAGUES).find(l => l.id === pickLeagueId)
      : null;
    const teams = league
      ? (historicPick ? eraPlayableClubs(pickEra, league.id) : playableClubs(league.id))
      : [];

    return shell(
      <div ref={pickRef}>
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            {REAL_LEAGUES.length} real league tables and {REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0)} clubs today, squads as of {CM_ROSTER_META.asOf}, plus three real past seasons: 2015-16, 2010-11 and 2005-06. Pick when you start, then your nation, your league, your club.
          </p>
        </header>

        {/* Step breadcrumb */}
        <div className="flex items-center justify-center gap-1.5 mb-5 text-[10px] font-bold flex-wrap">
          {(['era', 'nation', 'league', 'team', 'manager'] as const).map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              <span className={cn(
                'px-2.5 py-1 rounded-full border',
                pickStep === s ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground',
              )}>
                {i + 1}. {s === 'era' ? 'When' : s === 'nation' ? 'Nation' : s === 'league' ? 'League' : s === 'team' ? 'Team' : 'Dugout'}
              </span>
            </span>
          ))}
        </div>

        {/* -------- Step 0 (Round 132): when do you start -------- */}
        {pickStep === 'era' && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CM_ERAS.map(e => (
                <button
                  key={e.id}
                  onClick={() => { setPickEra(e.id); setPickStep('nation'); }}
                  className="rounded-xl border bg-card border-border hover:border-primary px-4 py-3 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{e.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-base font-bold font-display text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">{e.blurb}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  {/* Kept to one line on purpose: at 390x844 all four tiles
                      have to sit above the fold, and the full measured wording
                      is one tap away on the team step. */}
                  {/* Round 146: the past is REAL DATA too, because it comes off
                      its own bake. Only a future would be a projection, and we
                      do not offer futures. */}
                  <div className={cn(
                    'mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border',
                    /* Round 347: token inks so light mode can answer them; the
                       tinted borders and fills read fine on both themes. */
                    e.startYear <= CM_BASE_YEAR
                      ? 'text-[hsl(var(--wc-green-ink))] border-emerald-500/50 bg-emerald-500/10'
                      : 'text-gold border-yellow-500/50 bg-yellow-500/10',
                  )}>
                    {e.startYear <= CM_BASE_YEAR ? 'REAL DATA' : 'PROJECTION'} · {eraRealShareLabel(e)}
                  </div>
                </button>
              ))}
            </div>
            {/* The honest note about what is NOT here, which matters more than
                what is. Round 139 removed the future starts on the owner's call
                (nobody knows the future). Round 146 delivered the first real
                past season from real historical records. */}
            <p className="text-[9px] text-muted-foreground text-center mt-2.5 leading-snug max-w-lg mx-auto">
              No future eras, ever: nobody knows the future and we will not pretend to. The 2015-16, 2010-11 and 2005-06
              seasons are built from real market data records, real squads with their real ages and values from those
              years, not recreations. 2005-06 is as far back as the records honestly reach, so there is no 2000 era and
              there will not be an invented one. No made up name ever appears on a teamsheet unmarked.
            </p>
          </div>
        )}

        {/* -------- Step 1: nation -------- */}
        {pickStep === 'nation' && (
          <div className="max-w-2xl mx-auto mb-2.5">
            <button
              onClick={() => setPickStep('era')}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {era.emoji} Starting {era.label}
            </button>
          </div>
        )}
        {pickStep === 'nation' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
            {NATIONS.filter(n => !historicPick || eraLeaguesFor(pickEra, n).length > 0).map(n => {
              /* Round 146: in a historic era a nation offers its era leagues,
                 so 2010 England is the 20 club Premier League and the other
                 ten nations are simply not on the board. */
              const leagues = historicPick
                ? eraLeaguesFor(pickEra, n)
                : n.leagueIds
                  .map(id => REAL_LEAGUES.find(l => l.id === id))
                  .filter((l): l is typeof REAL_LEAGUES[number] => !!l);
              const clubCount = leagues.reduce((s, l) => s + l.clubs.length, 0);
              // Round 106: his note, in his words: "dont be saying teams. just
              // the leagues". A nation card is a nation and what you can manage
              // in it, so it names the leagues rather than three arbitrary clubs.
              const top = leagues.map(l => l.name).join(' · ');
              return (
                <button
                  key={n.id}
                  onClick={() => { setPickNation(n); setPickLeagueId(null); setPickStep('league'); }}
                  className="rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={n.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">{n.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {leagues.length > 1 ? `${leagues.length} leagues` : '1 league'} · {clubCount} clubs
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">{top}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 2: league -------- */}
        {pickStep === 'league' && pickNation && (
          <div className="max-w-2xl mx-auto space-y-2.5">
            <button
              onClick={() => { setPickStep('nation'); setPickNation(null); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> All nations
            </button>
            {(historicPick
              ? eraLeaguesFor(pickEra, pickNation).map(l => l.id)
              : pickNation.leagueIds
            ).map(id => {
              const lg = (historicPick ? eraLeaguesFor(pickEra) : REAL_LEAGUES).find(l => l.id === id);
              if (!lg) return null;
              const lgTeams = historicPick ? eraPlayableClubs(pickEra, lg.id) : playableClubs(lg.id);
              return (
                <button
                  key={lg.id}
                  onClick={() => { setPickLeagueId(lg.id); setPickStep('team'); }}
                  className="w-full rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={pickNation.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground">{lg.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {lg.clubs.length} clubs · domestic cup: {lg.cupName}{lg.euro ? ' · Champions League spots' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">
                    Strongest sides: {lgTeams.slice(0, 4).map(c => c.name).join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 3: team -------- */}
        {pickStep === 'team' && pickNation && league && (
          <div className={cn(g.pendingClub && 'pb-24')}>
            <button
              onClick={() => { g.chooseClub(''); setPickStep('league'); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> <FlagImg name={pickNation.name} size={14} /> {league.name}
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {teams.map(c => {
                const sel = g.pendingClub === c.name;
                const partial = isPartialClub(c.name, historicPick ? pickEra : undefined);
                return (
                  <button
                    key={c.name}
                    onClick={() => g.chooseClub(c.name)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {/* Round 106: flags run all the way through the picker now. */}
                      <FlagImg name={pickNation.name} size={12} />
                      <span className={cn('text-xs font-bold truncate', sel ? 'text-primary' : 'text-foreground')}>{c.name}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {TIER_INFO[c.tier].emoji} {TIER_INFO[c.tier].label}
                      {partial && <span className="ml-1 text-yellow-500/80" title="The market data covers only part of this squad; the rest is filled with youth players.">· partial data</span>}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">Squad</span>
                      {/* Round 132: the squad number is the squad in the era you
                          picked, not the 2026 one, or the tile would be lying
                          about the team you are about to take over. */}
                      <span className="text-sm font-bold font-display text-foreground">
                        {Math.round(projectedXIAvg(c.name, eraYearsOn, pickEra) ?? clubPreviewRating(c.name))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Budget</span>
                      <span className="text-xs font-bold text-gold">{money(c.budget)}</span>
                    </div>
                    {/* Round 145: this line said "Top 20" at a rank 20 club,
                        which is exactly the phrasing he told us to stop using.
                        It now quotes the board's actual named demand. */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0">Board wants</span>
                      <span className="text-[10px] font-bold text-foreground truncate" title={boardWantLabel(c.name, historicPick ? pickEra : undefined)}>
                        {boardWantLabel(c.name, historicPick ? pickEra : undefined)}
                      </span>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => { g.chooseClub(''); setPickStep('custom'); }}
                className="rounded-xl border border-dashed border-primary/50 p-3 text-left transition-all bg-card hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">✨</span>
                  <span className="text-xs font-bold text-primary truncate">Create your own club</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  Your name, your crest, your stadium, your money. It takes the place of the league's weakest side.
                </div>
                <div className="text-[10px] font-bold text-foreground mt-1.5">Full customization →</div>
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-3">
              {historicPick ? (
                <>{eraHonestyLine(era)}</>
              ) : (
                <>Squads, ratings and values from market data plus the verified summer window: {CM_ROSTER_META.players} players as of {CM_ROSTER_META.asOf}, refreshed {CM_ROSTER_META.generated}.</>
              )}
              {eraYearsOn > 0 && (
                <> Starting {era.label}, so those squads have been aged {eraYearsOn} years: {eraHonestyLine(era)}</>
              )}
            </p>

            {/* Round 70: no scrolling to confirm. The confirm bar pins to the
                bottom of the screen the moment a club is picked. */}
            {g.pendingClub && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Your club</div>
                    <div className="text-sm font-bold text-foreground truncate">{g.pendingClub}</div>
                  </div>
                  <button
                    onClick={() => { setPendingCustomSpec(null); setPickStep('manager'); }}
                    className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Briefcase className="w-4 h-4" /> Take the job
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------- Step 4 (optional): found your own club (Round 154) -------- */}
        {pickStep === 'custom' && pickNation && league && (
          <CustomClubForm
            leagueName={league.name}
            leagueId={league.id}
            eraId={historicPick ? pickEra : undefined}
            onBack={() => setPickStep('team')}
            onCreate={spec => { setPendingCustomSpec(spec); setPickStep('manager'); }}
          />
        )}

        {/* -------- Step 5 (Round 303): who is in the dugout -------- */}
        {pickStep === 'manager' && (
          <ManagerForm
            clubName={pendingCustomSpec?.name || g.pendingClub || 'Back'}
            defaultNation={pickNation?.name ?? 'England'}
            onBack={() => {
              /* Backing out of the dugout drops the stashed club spec too, so
                 a later real club confirm can never pick up a stale founding. */
              const target = pendingCustomSpec ? 'custom' : 'team';
              setPendingCustomSpec(null);
              setPickStep(target);
            }}
            onConfirm={confirmAndReset}
          />
        )}
      </div>
    );
  }

  /* ================= MATCH RESULT ================= */
  /* ================= LIVE SIM (Round 158) ================= */
  /* The animated viewer owns both match phases while watch mode is on: the
     first half plays out, the interval is the real dressing room embedded,
     the second half replays the report's own timeline, and Full report
     hands over to the classic full time card. */
  if (watchMode && g.career && (g.phase === 'halftime' || g.phase === 'matchResult')) {
    const liveClub = clubDefFor(g.career.clubName);
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">MATCH LIVE</h1>
        </header>
        <LiveSimScreen
          career={g.career}
          live={g.career.live ?? null}
          report={g.phase === 'matchResult' ? g.report : null}
          clubColor={liveClub.color}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onTalk={g.halftimeTalk}
          onSecondHalf={g.secondHalf}
          onExit={() => setWatchMode(false)}
        />
      </div>
    );
  }

  /* ================= HALF TIME (Round 119) ================= */
  if (g.phase === 'halftime' && g.career?.live) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">HALF TIME</h1>
        </header>
        <HalftimeScreen
          career={g.career}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onTalk={g.halftimeTalk}
          onSecondHalf={g.secondHalf}
        />
      </div>
    );
  }

  if (g.phase === 'matchResult' && g.report && g.career) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">FULL TIME</h1>
        </header>
        <MatchReportCard report={g.report} clubName={g.career.clubName} onContinue={g.continueFromReport} />
      </div>
    );
  }

  /* ================= SEASON END ================= */
  if (g.phase === 'seasonEnd' && g.summary && g.career) {
    const sm = g.summary;
    const trophyLine = sm.trophies.length ? sm.trophies.map(() => '🏆').join('') : '-';
    // Round 66: same treatment as full time. Only one phase screen renders at a
    // time, so the shared ref is safe here too.
    return shell(
      <div ref={revealRef} className="text-center relative">
        {/* Round 147: a season that ends with silverware rains on the summary. */}
        {sm.trophies.length > 0 && <ConfettiBurst seed={sm.season * 13 + sm.trophies.length} count={40} />}
        <h1 className="text-3xl md:text-5xl font-bold text-primary font-display mb-1">SEASON {sm.season} COMPLETE</h1>
        <p className="text-muted-foreground text-sm mb-5">{sm.club} · finished <span className="text-foreground font-bold">#{sm.position}</span> with {sm.points} pts</p>
        <ResultScreen
          won={sm.verdictGrade === 'A' || sm.verdictGrade === 'B' ? true : sm.verdictGrade === 'C' ? undefined : false}
          outcomeEmoji={sm.trophies.length > 0 ? '🏆' : sm.position <= 4 ? '🥈' : sm.verdictGrade === 'F' ? '😬' : '⚽'}
          headline={`Board verdict: ${sm.verdictGrade}`}
          statLine={`${sm.wins}W ${sm.draws}D ${sm.losses}L · GF ${sm.gf} GA ${sm.ga}`}
          funFact={sm.verdict}
          statRow={[
            { label: 'Finish', value: `#${sm.position}` },
            { label: 'Points', value: sm.points },
            { label: 'Season Score', value: sm.seasonScore },
          ]}
          emojiGrid={`🏟️ S${sm.season} · #${sm.position} · ${sm.points}pts · ${trophyLine}`}
          share={{
            score: `#${sm.position} (${sm.points} pts, ${sm.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={() => g.nextSeason()}
          playAgainLabel={`Continue to Season ${sm.season + 1}`}
          playNext={
            <div className="space-y-3">
              {sm.offers.length > 0 && (
                <div className="text-left bg-surface-2 border border-border/60 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">📞 Job offers on the table</div>
                  {sm.offers.map(o => (
                    <button
                      key={o.club}
                      onClick={() => g.nextSeason(o.club)}
                      className="w-full mb-2 last:mb-0 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-left hover:bg-primary/15 transition-colors"
                    >
                      <div className="text-sm font-bold text-primary">{o.club} want you as manager</div>
                      <div className="text-[10px] text-muted-foreground">{o.blurb}</div>
                    </button>
                  ))}
                  <p className="text-[9px] text-muted-foreground">Accepting an offer moves you there for Season {sm.season + 1}.</p>
                </div>
              )}
              <button onClick={g.startNew} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Retire and start a new career
              </button>
            </div>
          }
        >
          <div className="text-left space-y-1.5 mb-2">
            <p className="text-sm text-foreground flex items-start gap-2">
              <Trophy className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              Champions: <span className="font-bold">{sm.champion}</span>
            </p>
            {sm.trophies.map(t => (
              <p key={t} className="text-sm text-foreground flex items-start gap-2">
                <Trophy className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />You won the <span className="font-bold">{t}</span>!
              </p>
            ))}
            {sm.topScorer && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">⚽</span>Top scorer: {sm.topScorer.name} ({sm.topScorer.goals} goals)
              </p>
            )}
            {sm.topAssister && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">🎯</span>Most assists: {sm.topAssister.name} ({sm.topAssister.assists})
              </p>
            )}
            {/* Round 165: the season's individual honours. */}
            {sm.goldenBoot && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">👟</span>Golden boot: <span className="font-bold">{sm.goldenBoot.name}</span> ({sm.goldenBoot.club}, {sm.goldenBoot.goals} goals)
              </p>
            )}
            {sm.playerOfSeason && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">🎖️</span>Player of the season: <span className="font-bold">{sm.playerOfSeason.name}</span> ({sm.playerOfSeason.club})
              </p>
            )}
            {sm.ballonDor && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">🌍</span>Ballon d'Or: <span className="font-bold">{sm.ballonDor.name}</span> ({sm.ballonDor.club})
              </p>
            )}
            {sm.qualifiedUcl && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">⭐</span>Qualified for next season's Champions League
              </p>
            )}
            {sm.objectives && sm.objectives.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Board objectives</div>
                {sm.objectives.map((o, i) => (
                  <p key={i} className={cn('text-xs', o.hit ? 'text-emerald-400' : 'text-red-400')}>
                    {o.hit ? '✓' : '✗'} <span className="text-foreground">{o.label}</span>
                  </p>
                ))}
              </div>
            )}
            {sm.signings.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Transfer business</div>
                {sm.signings.slice(0, 8).map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {t.dir === 'in' ? '🟢 IN' : '🔴 OUT'} {t.name} ({money(t.fee)})
                  </p>
                ))}
              </div>
            )}
          </div>
        </ResultScreen>
      </div>
    );
  }

  /* ================= SACKED ================= */
  if (g.phase === 'sacked' && g.career) {
    const c = g.career;
    return shell(
      <div className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-destructive font-display mb-5">SACKED!</h1>
        <ResultScreen
          won={false}
          outcomeEmoji="🚪"
          headline="You've been sacked"
          statLine={`The ${c.clubName} board ran out of patience in Season ${c.season}.`}
          statRow={[
            { label: 'Seasons', value: c.season },
            { label: 'Win %', value: `${c.careerStats.played ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%` },
            { label: 'Trophies', value: c.trophies.length },
          ]}
          emojiGrid={`🚪 Sacked in S${c.season} · ${c.careerStats.wins}W ${c.careerStats.draws}D ${c.careerStats.losses}L · 🏆×${c.trophies.length}`}
          share={{
            score: `Sacked after ${c.season} season${c.season > 1 ? 's' : ''} (${c.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={g.startNew}
          playAgainLabel="Start New Career"
        >
          {/* Round 201: the wilderness. A sacking used to end the save here,
              which is the one moment in a manager's life that should not end
              anything. Your record follows you and decides who calls. */}
          <div data-wilderness className="text-left rounded-xl border border-border bg-card p-3 mb-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🧳 Out of work</div>
            <p className="text-xs text-foreground">
              {(c.wilderness?.weeksOut ?? 0) === 0
                ? 'You are between jobs. Clubs will call, but the longer you sit out the quieter the phone gets.'
                : `${c.wilderness?.weeksOut} week${c.wilderness?.weeksOut === 1 ? '' : 's'} without a club. ${(c.wilderness?.offers.length ?? 0) > 0 ? 'The phone has rung.' : 'Nobody has called yet.'}`}
            </p>
            <div className="mt-2 space-y-1.5">
              {(c.wilderness?.offers ?? []).map(o => (
                <div key={o.club} data-wilderness-offer={o.club} className="rounded-lg border border-border bg-background/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-foreground truncate">{o.club}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{o.league}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{o.reason}</p>
                  <p className="text-[9px] text-foreground mt-0.5 leading-snug"><span className="text-muted-foreground">The brief:</span> {o.brief}</p>
                  <button
                    onClick={() => g.takeJob(o.club)}
                    className="mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Take the {o.club} job
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={g.waitAWeek}
              data-wait-week
              className="mt-2 w-full py-2 rounded-lg text-xs font-bold bg-secondary text-foreground hover:opacity-90 transition-opacity"
            >
              ⏭️ Wait a week for the phone to ring
            </button>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Trophies and promotions open doors; relegations shut them. Waiting costs you standing, so the job you hold out for may not be there when you finally say yes. Somebody always needs a manager in the end.
            </p>
          </div>
          <div className="text-left space-y-1.5 mb-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Career record</div>
            {c.history.length === 0 && <p className="text-xs text-muted-foreground">Sacked before finishing a single season. Brutal.</p>}
            {c.history.map(h => (
              <p key={h.season} className="text-xs text-foreground">
                S{h.season} · {h.club} · #{h.position} ({h.points} pts){h.trophies.length ? ` · 🏆 ${h.trophies.join(', ')}` : ''}
              </p>
            ))}
            {c.trophies.length > 0 && (
              <p className="text-xs text-foreground pt-1">
                Cabinet: {c.trophies.map(t => `${t.emoji} ${t.name} (S${t.season})`).join(' · ')}
              </p>
            )}
          </div>
        </ResultScreen>
      </div>
    );
  }

  /* ================= HUB ================= */
  if (!g.career || !club) {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }
  const c = g.career;
  /* Round 202: does a federation want him this season? Recomputed on every
     render because it depends on the record, which moves every week. */
  const nationOffer = nationOfferFor(c);
  const fx = g.nextFx;
  const objStatuses = objectiveStatuses(c);
  // Round 74: tile summaries.
  const objBehind = objStatuses.filter(s => s.status === 'behind' || s.status === 'failed').length;
  const objDone = objStatuses.filter(s => s.status === 'done').length;
  const unreadCount = (c.inbox ?? []).filter(m => !m.resolved).length;
  const latestMsg = (c.inbox ?? [])[0];
  const lastRes = (c.resultLog ?? []).slice(-1)[0];
  const rivalName = c.boardObjectives?.find(o => o.id === 'rival')?.rivalName ?? null;
  const rivalIdx = rivalName ? g.tableRows.findIndex(r => r.club === rivalName) : -1;
  const bidsCount = (c.incomingBids ?? []).length;
  const cupAlive = c.cupRound !== 'out' && c.cupRound !== 'won';
  const uclAlive = (c.uclGroup !== null && c.uclKoRound === null) || (!!c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won');

  /* ---- Round 74: the rival viewer takes over the whole screen ---- */
  if (clubView) {
    return shell(
      <div ref={panelRef}>
        <ClubDetailScreen clubName={clubView} career={c} onBack={() => setClubView(null)} />
      </div>
    );
  }

  return shell(
    <div>
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          {/* Round 154: a club you founded wears its crest where every other
              club wears its color dot. */}
          {c.customClub && c.customClub.name === c.clubName
            ? <CrestBadge crest={c.customClub.crest} size={22} />
            : <span className="w-3 h-3 rounded-full" style={{ backgroundColor: club.color }} />}
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">{c.clubName}</h1>
          {/* Round 132: the save now knows what year it is, so it says so, next
              to the season count it has always shown. */}
          <span className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
            {worldSeasonLabel(c)} · Season {c.season}
          </span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          {/* Round 99: found by playing it. Before a ball is kicked every
              club is on zero points, so the "position" was just wherever the
              shuffled table happened to put you: a brand new Manchester City
              save opened on "#15 in league", which reads as broken. */}
          <span>{c.week === 0 ? 'Season not started' : `#${g.myPosition || '-'} in league`}</span>
          {c.customClub && c.customClub.name === c.clubName && (
            <span className="inline-flex items-center gap-1">
              🏟 {c.customClub.stadium}{c.customClub.capacity ? ` (${Math.round(c.customClub.capacity / 1000)}k)` : ''}
            </span>
          )}
          <span className="text-gold font-semibold">{money(c.budget)}</span>
          <span className="inline-flex items-center gap-1">
            {c.form.length === 0 && <span>No matches yet</span>}
            {c.form.map((f, i) => (
              <span key={i} className={cn('w-2 h-2 rounded-full', FORM_TONE[f])} />
            ))}
          </span>
          {c.trophies.length > 0 && <span>🏆×{c.trophies.length}</span>}
        </div>
        {/* Round 465: the board and the fans, on every tab, words by default
            and the number on tap. */}
        <MetersStrip career={c} />
      </header>

      <Tabs value={g.activeTab} onValueChange={(v) => g.setActiveTab(v as HubTab)}>
        <TabsList className="grid grid-cols-5 w-full mb-4">
          <TabsTrigger value="overview" className="text-[10px] md:text-xs">Home</TabsTrigger>
          <TabsTrigger value="squad" className="text-[10px] md:text-xs">Squad</TabsTrigger>
          <TabsTrigger value="tactics" className="text-[10px] md:text-xs">Tactics</TabsTrigger>
          <TabsTrigger value="table" className="text-[10px] md:text-xs">Table</TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] md:text-xs">Market</TabsTrigger>
        </TabsList>

        {/* -------- Overview -------- */}
        <TabsContent value="overview" className="space-y-4">
          {/* Round 157: the Match Centre takes the whole overview when open:
              facts, form, head to head, engine odds, the optional team talk,
              and both ways to play. */}
          {hubPanel === 'matchCentre' && g.facts ? (
            <div ref={panelRef}>
              <MatchCentre
                career={c}
                facts={g.facts}
                clubColor={club.color}
                tone={c.teamTalk ?? null}
                onTone={g.talk}
                talkRead={matchRead}
                talkStale={!!press && press.lastTone === c.teamTalk && press.toneRun >= 3}
                onQuickSim={() => { setHubPanel(null); g.quickPlay(); }}
                onWatch={() => { setHubPanel(null); setWatchMode(true); g.play(); }}
                onPlay={() => { setHubPanel(null); g.play(); }}
                onBack={() => setHubPanel(null)}
              />
            </div>
          ) : (
          <>
          {/* Round 132: who stopped playing over the summer. It sits at the top
              of the first screen of the new season because losing a thirty
              seven year old you have had since day one is the biggest thing
              that happened between May and August, and until this round it was
              a thing that could never happen at all. */}
          {c.week === 0 && (c.retiredLastSummer ?? []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">👟 Hung up their boots</div>
              <div className="text-xs text-foreground">
                {(c.retiredLastSummer ?? []).map(r => `${r.name} (${r.age}, rated ${r.rating})`).join(' · ')}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">That is the end of their careers. You will need to replace them.</div>
            </div>
          )}
          {c.transferWindow !== null && (
            <button
              onClick={() => g.setActiveTab('transfers')}
              className="w-full rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {c.transferWindow === 'summer' ? '☀️' : '❄️'} Transfer window open. Tap to do business before your next match
            </button>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            {fx && fx.kind === 'match' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{fx.compLabel}</div>
                <div className="text-lg font-bold font-display text-foreground">
                  {fx.home === null ? '🏟️ ' : ''}{c.clubName} <span className="text-muted-foreground text-sm">vs</span> {fx.opponent}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fx.home === null ? 'Neutral venue' : fx.home ? 'Home' : 'Away'} · their strength ~{fx.oppStrength} · your XI avg {xiAverageRating(c)}
                </div>
                {/* Round 157: the team talk moved into the Match Centre, because
                    the owner said it was being pushed on him before every match.
                    The hub keeps the two ways to play: quick sim the result, or
                    play it with the half time stop. Facts, form, head-to-head
                    and the talk all live one tap away. */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 max-w-sm mx-auto">
                  <button
                    onClick={g.quickPlay}
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-secondary text-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-secondary/70 transition-colors"
                  >
                    ⚡ Quick Sim
                  </button>
                  {/* Round 158: the little circles. Watch the match play out. */}
                  <button
                    onClick={() => { setWatchMode(true); g.play(); }}
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                  >
                    📺 Watch Live
                  </button>
                  <button
                    onClick={g.play}
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-secondary text-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-secondary/70 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Play Match
                  </button>
                </div>
                <button
                  onClick={() => setHubPanel('matchCentre')}
                  className="mt-2 text-[11px] font-bold text-primary hover:underline"
                >
                  📊 Match Centre: form, head to head, odds, team talk
                </button>
              </>
            )}
            {fx && fx.kind === 'window' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Mid-season break</div>
                <div className="text-lg font-bold font-display text-foreground">❄️ January transfer window</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Open the Window <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {fx && fx.kind === 'seasonOver' && (
              <>
                <div className="text-lg font-bold font-display text-foreground">Season complete!</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  See Season Review <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Round 74: the tile rule. Everything below the next match is a
              box; tapping one opens its own screen instead of one long page
              (his words: "make it smaller and with boxes and when they open
              it takes u to see something different"). */}
          {hubPanel === null && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <HubTile
                icon="📋" title="Board" accent={objBehind > 0}
                value={objBehind > 0 ? `${objBehind} behind` : `${objDone}/${objStatuses.length} done`}
                sub={TIER_INFO[club.tier].label + ' patience'}
                onClick={() => setHubPanel('board')}
              />
              <HubTile
                icon="📩" title="Inbox" accent={unreadCount > 0}
                value={unreadCount > 0 ? `${unreadCount} new` : 'All quiet'}
                sub={latestMsg ? latestMsg.playerName : 'No messages yet'}
                onClick={() => setHubPanel('inbox')}
              />
              <HubTile
                icon="📅" title="Calendar"
                value={lastRes ? `${lastRes.res} ${lastRes.score}` : 'Season start'}
                sub={fx && fx.kind === 'match' ? `Next: ${fx.opponent}` : 'See the schedule'}
                onClick={() => setHubPanel('calendar')}
              />
              <HubTile
                icon="🏆" title="League"
                value={`#${g.myPosition || '-'}`}
                sub={c.form.length ? `Form: ${c.form.join(' ')}` : careerLeagueOf(c).name}
                onClick={() => g.setActiveTab('table')}
              />
              <HubTile
                icon="🏅" title="Cups" accent={cupAlive && !!c.cupDraw[c.cupRound as CupRound]}
                value={cupAlive ? 'Still alive' : c.cupRound === 'won' ? 'CUP WINNERS' : 'Knocked out'}
                sub={uclAlive ? 'UCL alive too' : careerLeagueOf(c).cupName}
                onClick={() => setHubPanel('cups')}
              />
              <HubTile
                icon="📊" title="Stats"
                value={`${c.squad.reduce((n, p) => n + p.seasonGoals, 0)} goals`}
                sub={(() => {
                  const ts = [...c.squad].sort((a, b) => b.seasonGoals - a.seasonGoals)[0];
                  return ts && ts.seasonGoals > 0 ? `${ts.name} leads with ${ts.seasonGoals}` : 'Goals, assists, ratings';
                })()}
                onClick={() => setHubPanel('stats')}
              />
              <HubTile
                icon="💰" title="Finances"
                value={c.finance?.lastGate ? `Gate ${money(c.finance.lastGate)}` : money(c.budget)}
                sub={c.finance?.seasonGate ? `${money(c.finance.seasonGate)} gate money this season` : 'Tickets, the gate, the ground'}
                onClick={() => setHubPanel('finance')}
              />
              <HubTile
                icon="🧢" title="Manager" accent={!!c.approach || !!nationOffer}
                value={c.approach ? '📞 A club is calling' : nationOffer ? '🌐 Your country is calling' : `${c.careerStats.wins}W ${c.careerStats.losses}L`}
                sub={c.approach
                  ? `${c.approach.club} want you`
                  : nationOffer
                    ? `${nationOffer.nation} want you for the summer`
                    : c.nationJob
                      ? `${c.nationJob.nation} manager · ${c.careerStats.wins}W ${c.careerStats.losses}L`
                      : c.careerStats.played > 0 ? `${Math.round((c.careerStats.wins / c.careerStats.played) * 100)}% win rate` : 'New in the job'}
                onClick={() => setHubPanel('manager')}
              />
              <HubTile
                icon="🏥" title="Treatment" accent={unavailable.length > 0}
                value={unavailable.length ? `${unavailable.length} out` : 'All fit'}
                sub={unavailable[0] ? unavailable[0].name : 'No injuries or bans'}
                onClick={() => setHubPanel('treatment')}
              />
              <HubTile
                icon="🕵️" title="Rival watch"
                value={rivalName ?? 'Scout clubs'}
                sub={rivalName && rivalIdx >= 0 ? `They sit #${rivalIdx + 1}` : 'Tap any club in the table'}
                onClick={rivalName ? () => setClubView(rivalName) : () => g.setActiveTab('table')}
              />
              {/* Round 135: the microphone. Accented when somebody actually
                  wants a word, which is nothing like every week. */}
              <HubTile
                icon="🎙️" title="Press room" accent={!!press?.pending}
                value={pressHeadline(c)}
                sub={press?.pending ? 'One question, one tap' : `${press?.answered ?? 0} fronted up this career`}
                onClick={() => setHubPanel('press')}
              />
              {/* Round 127: what you told each of them he was, and whether you
                  have kept your word. */}
              <HubTile
                icon="🤝" title="Dressing room" accent={wantAway.length > 0 || letDown.length > 2}
                value={wantAway.length > 0
                  ? `${wantAway.length} want${wantAway.length === 1 ? 's' : ''} out`
                  : letDown.length > 0 ? `${letDown.length} unhappy` : 'Word kept'}
                sub={wantAway[0] ? wantAway[0].name : letDown[0] ? letDown[0].name : 'Set everyone a role'}
                onClick={() => setHubPanel('roles')}
              />
              {/* Round 116: the academy and the training ground, the two
                  things every real manager sim has and this one did not. */}
              <HubTile
                icon="🎓" title="Academy" accent={prospectCount > 0}
                value={prospectCount > 0 ? `${prospectCount} on the books` : 'Nobody yet'}
                sub={academy ? `Recruitment ${academy.recruitment}/20 · ${academy.scouts.length} scouting` : 'Build a youth setup'}
                onClick={() => setHubPanel('academy')}
              />
              <HubTile
                icon="🏋️" title="Training"
                value={trainingLabel}
                sub={growingCount > 0 ? `${growingCount} player${growingCount === 1 ? '' : 's'} still improving` : 'Nobody left to develop'}
                onClick={() => setHubPanel('training')}
              />
              <HubTile
                icon="🛒" title="Market" accent={c.transferWindow !== null}
                value={c.transferWindow !== null ? 'Window OPEN' : 'Window shut'}
                sub={bidsCount > 0 ? `${bidsCount} bid${bidsCount > 1 ? 's' : ''} for your players` : 'Latest transfers inside'}
                onClick={() => g.setActiveTab('transfers')}
              />
              {c.trophies.length > 0 && (
                <HubTile
                  icon="✨" title="Cabinet"
                  value={`${c.trophies.length} troph${c.trophies.length > 1 ? 'ies' : 'y'}`}
                  sub={c.trophies[c.trophies.length - 1].name}
                  onClick={() => setHubPanel('trophies')}
                />
              )}
            </div>
          )}

          {/* Round 74: drill-in screens, one per box. */}
          {hubPanel !== null && (
            <div ref={panelRef} className="space-y-3">
              <button
                onClick={() => setHubPanel(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Club home
              </button>

              {hubPanel === 'board' && objStatuses.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> Board expectations · {TIER_INFO[club.tier].blurb}
                  </div>
                  <div className="space-y-1.5">
                    {objStatuses.map(({ objective, status }) => (
                      <div key={objective.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground min-w-0 truncate">{objective.label}</span>
                        <span className={cn('shrink-0 text-[9px] font-bold border rounded-full px-2 py-0.5', OBJ_CHIP[status].cls)}>
                          {OBJ_CHIP[status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'inbox' && <InboxCard career={c} onAnswer={g.answer} />}
              {hubPanel === 'inbox' && (c.inbox ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nobody has texted you yet. Play some matches, the drama finds you.</p>
              )}

              {/* Round 158: the season as a real month calendar, with training
                  cones, window markers and the long fast forward. Round 466:
                  any day can be tapped and simmed to, through the same loop
                  the fast forwards use. */}
              {hubPanel === 'calendar' && (
                <CalendarScreen career={c} onSimTo={g.simToWeek} onSetTraining={g.setTraining} />
              )}

              {hubPanel === 'academy' && (
                <AcademyScreen
                  career={c}
                  onUpgrade={g.upgradeFacility}
                  onHire={g.sendScout}
                  onRecall={g.callScoutHome}
                  onPromote={g.promote}
                  onRelease={g.release}
                />
              )}

              {hubPanel === 'training' && <TrainingScreen career={c} onSetPlan={g.setTraining} />}

              {hubPanel === 'roles' && <RolesScreen career={c} onSetRole={g.setRole} />}

              {hubPanel === 'press' && (
                <PressScreen career={c} onAnswer={g.sayIt} onDuck={g.sendAssistant} />
              )}

              {hubPanel === 'treatment' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Treatment room
                  </div>
                  {unavailable.length === 0 && <p className="text-xs text-muted-foreground">Everyone is fit and available. Enjoy it while it lasts.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {unavailable.map(p => (
                      <span key={p.id} className="text-[10px] bg-secondary rounded-full px-2 py-1 text-foreground">
                        {p.injuryWeeks > 0 ? `🩹 ${p.name} (${p.injuryWeeks}w)` : `🟥 ${p.name} (${p.suspendedMatches})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'cups' && (
                <div className="space-y-2">
                  {/* Round 312: two clearly separated competitions. The old
                      panel put the UCL groups straight under the domestic cup
                      line, which read as the cup showing the wrong table, and
                      the domestic bracket card had never been mounted at all. */}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">
                    🏅 {careerLeagueOf(c).cupName}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                    {cupAlive ? (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: still alive. Next up, the <span className="font-bold">{c.cupRound === 'F' ? 'final' : c.cupRound === 'SF' ? 'semi-final' : c.cupRound === 'QF' ? 'quarter-final' : 'Round of 16'}</span> against <span className="font-bold">{c.cupDraw[c.cupRound as CupRound] ?? 'a club to be drawn'}</span>.</>
                    ) : c.cupRound === 'won' ? (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: WON. It is in the cabinet.</>
                    ) : (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: out{c.cupExit ? ` at the ${c.cupExit === 'F' ? 'final' : c.cupExit === 'SF' ? 'semi-final' : c.cupExit === 'QF' ? 'quarter-final' : 'Round of 16'}` : ''}. Next year.</>
                    )}
                  </div>
                  {/* Round 102 built this bracket; Round 312 finally mounts it. */}
                  <CupBracketCard career={c} onClubClick={setClubView} />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 pt-1">
                    ⭐ Champions League
                  </div>
                  {/* Round 163: every group in the draw, not just mine, plus
                      the projected bracket that locks in after matchday 6. */}
                  <UclGroupsCard career={c} onClubClick={setClubView} />
                  {c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won' && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                      ⭐ Alive in the Champions League. Next knockout round: <span className="font-bold">{c.uclKoRound === 'F' ? 'Final' : c.uclKoRound === 'SF' ? 'Semi-final' : c.uclKoRound === 'QF' ? 'Quarter-final' : 'Round of 16'}</span>
                    </div>
                  )}
                  {c.uclKoRound === 'won' && (
                    <div className="bg-card border border-gold/40 rounded-xl p-3 text-xs text-gold font-bold">⭐ CHAMPIONS OF EUROPE.</div>
                  )}
                  {/* Round 95: the knockout stage as a real bracket. */}
                  <UclBracketCard career={c} onClubClick={setClubView} />
                  {!uclAlive && c.uclKoRound !== 'won' && c.uclGroup === null && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">No European football this season{careerLeagueOf(c).euro ? '. Reach the Champions League places to change that' : ' in this league'}.</div>
                  )}
                </div>
              )}

              {hubPanel === 'finance' && (
                <div className="space-y-2">
                  {/* Round 171: the finance desk, his CM-8. */}
                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💰 The books</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-sm font-bold font-display text-foreground">{money(c.budget)}</div>
                        <div className="text-[9px] text-muted-foreground">Transfer kitty</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold font-display text-emerald-400">{c.finance?.seasonGate ? money(c.finance.seasonGate) : money(0)}</div>
                        <div className="text-[9px] text-muted-foreground">Gate money this season</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold font-display text-foreground">{c.finance?.lastGate ? money(c.finance.lastGate) : '-'}</div>
                        <div className="text-[9px] text-muted-foreground">Last home gate</div>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1.5">Every home crowd pays the kitty: attendance times about {gatePricePerFan(c) > 0 ? `£${gatePricePerFan(c)}` : ''} a head at your prices. Scouts and the academy spend from the same kitty in their own tabs. What you have left in August rolls into next season on top of the board's new cheque, up to one more season's worth of it.</p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🎟️ Ticket policy</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TICKET_TIERS.map((tt, i) => (
                        <button
                          key={tt.label}
                          onClick={() => g.setTickets(i as 0 | 1 | 2)}
                          className={cn(
                            'rounded-lg border p-2 text-left transition-colors',
                            (c.finance?.ticketTier ?? 1) === i ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary',
                          )}
                        >
                          <div className="text-base">{tt.emoji}</div>
                          <div className="text-[11px] font-bold text-foreground">{tt.label}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{tt.blurb}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1.5">Cheaper seats pull a bigger, louder crowd for less money a head. Premium squeezes more from fewer. Change it any week.</p>
                  </div>

                  {/* Round 200: the commercial desk, the last line of his
                      Club Manager list. Three shapes, not three numbers. */}
                  <div data-sponsor-desk className="bg-card border border-border rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🤝 Shirt sponsor</div>
                    {c.sponsor ? (
                      <>
                        <p className="text-xs text-foreground">
                          <span className="font-bold">{c.sponsor.brand}</span> pay {money(c.sponsor.perSeason)} a season.
                          {c.sponsor.bonus > 0 && c.sponsor.bonusFor
                            ? ` Plus ${money(c.sponsor.bonus)} for ${c.sponsor.bonusFor === 'title' ? 'winning the league' : c.sponsor.bonusFor === 'europe' ? 'reaching Europe' : 'a top half finish'}.`
                            : ' No bonuses, just the cheque.'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {c.sponsor.yearsLeft === 1 ? 'Final season of the deal.' : `${c.sponsor.yearsLeft} seasons left.`} Paid so far: <span className="font-bold text-foreground">{money(c.sponsor.paid)}</span>.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Three offers on the table. The money lands in the same kitty as everything else, this season and every season the deal runs.
                        </p>
                        <div className="space-y-1.5">
                          {sponsorOffers(c).map(o => (
                            <div key={o.id} data-sponsor-offer={o.id} className="rounded-lg border border-border bg-background/40 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-foreground truncate">{o.brand}</span>
                                <span className="text-[11px] font-bold text-gold tabular-nums shrink-0">{money(o.perSeason)}/season</span>
                              </div>
                              <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                                {o.pitch} {o.years} season{o.years === 1 ? '' : 's'}.
                                {o.bonus > 0 && o.bonusFor ? ` Bonus ${money(o.bonus)} for ${o.bonusFor === 'title' ? 'the title' : o.bonusFor === 'europe' ? 'Europe' : 'a top half finish'}.` : ''}
                              </p>
                              <button
                                onClick={() => g.takeSponsor(o.id)}
                                className="mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                              >
                                Sign with {o.brand.split(' ')[0]}
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🏗️ The ground</div>
                    <p className="text-xs text-foreground mb-1.5">
                      Expansions bought here: <span className="font-bold">{c.finance?.groundUpgrades ?? 0} of 3</span>.
                      {c.customClub && c.clubName === c.customClub.name && c.customClub.capacity
                        ? ` ${c.customClub.stadium} holds ${(c.customClub.capacity + (c.finance?.groundUpgrades ?? 0) * 6000).toLocaleString()} now.`
                        : ' Each one grows your home crowds about 12 percent, from the very next home game.'}
                    </p>
                    {groundUpgradeCost(c) !== null ? (
                      <button
                        onClick={g.expandStadium}
                        disabled={c.budget < (groundUpgradeCost(c) ?? Infinity)}
                        className={cn(
                          'w-full py-2 rounded-lg text-xs font-bold transition-colors',
                          c.budget >= (groundUpgradeCost(c) ?? Infinity)
                            ? 'bg-primary text-primary-foreground hover:opacity-90'
                            : 'bg-secondary text-muted-foreground cursor-not-allowed',
                        )}
                      >
                        🏗️ Expand the ground for {money(groundUpgradeCost(c) ?? 0)}
                      </button>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">The ground is as big as this club can build it. The board is very proud of the brochure.</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-1.5">Paid from the transfer kitty. The board reads ambition into it. Expansions belong to the club: move on and the new job starts at their ground, as it is.</p>
                  </div>
                </div>
              )}

              {hubPanel === 'stats' && <StatsScreen career={c} />}

              {hubPanel === 'trophies' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Trophy cabinet</div>
                  {c.trophies.length === 0 && <p className="text-xs text-muted-foreground">Empty. For now.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {c.trophies.map((t, i) => (
                      <span key={i} className="text-[10px] bg-gold/10 border border-gold/30 text-gold rounded-full px-2 py-1 font-semibold">
                        {t.emoji} {t.name} · S{t.season}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'manager' && (
                <>
                {/* Round 202: the international job. Club football is
                    unchanged; the country only plays in the summer. */}
                {c.nationJob ? (
                  <div data-nation-job className="bg-card border border-primary/40 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">🌐 {c.nationJob.nation} manager</div>
                    <p className="text-xs text-foreground">
                      In charge since season {c.nationJob.since}. {c.nationJob.played === 0
                        ? 'Your first tournament summer is still to come.'
                        : `${c.nationJob.played} tournament${c.nationJob.played === 1 ? '' : 's'} taken charge of, ${c.nationJob.won} won.`}
                    </p>
                    {c.nationJob.lastResult && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last summer ({c.nationJob.lastYear}): {c.nationJob.lastResult}.
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tournaments run between club seasons. Miss one your country should have reached and the federation will not wait around.
                    </p>
                    <button
                      onClick={g.resignNation}
                      className="mt-2 w-full py-2 rounded-lg bg-secondary text-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Step down from the national team
                    </button>
                  </div>
                ) : nationOffer ? (
                  <div data-nation-offer className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">🌐 Your country is calling</div>
                    <p className="text-sm text-foreground font-bold mb-0.5">{nationOffer.nation} want you.</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{nationOffer.blurb}</p>
                    <button
                      onClick={g.acceptNation}
                      className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      🌐 Take the {nationOffer.nation} job as well
                    </button>
                  </div>
                ) : null}
                {/* Round 168: mid-season approaches land here, his CM-10. */}
                {c.approach && (
                  <div className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">📞 An approach has come in</div>
                    <p className="text-sm text-foreground font-bold mb-0.5">{c.approach.club} want you as their manager.</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{c.approach.blurb}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Commit and it becomes a summer pre-agreement: the move happens when the season ends, the news breaks today, and your current board will not love it. Ignore it and they move on in a few weeks.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => g.answerApproach(true)}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        🤝 Shake hands for the summer
                      </button>
                      <button
                        onClick={() => g.answerApproach(false)}
                        className="flex-1 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary transition-colors"
                      >
                        Turn them down
                      </button>
                    </div>
                  </div>
                )}
                {c.pendingMove && (
                  <div className="bg-card border border-gold/40 rounded-xl p-3 mb-2 text-xs text-foreground">
                    🤝 <span className="font-bold">Pre-agreement signed:</span> you take over at <span className="font-bold">{c.pendingMove.club}</span> when the season ends. Finish the job here first.
                  </div>
                )}
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💼 Manager career</div>
                  {/* Round 303: the created manager's card line. Absent spec, the
                      panel reads exactly as it always has. */}
                  {c.manager && (
                    <div className="flex items-center gap-2 mb-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
                      <FlagImg name={c.manager.nationality} size={14} />
                      <span className="text-xs font-bold text-foreground truncate">{c.manager.name}</span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {MANAGER_BACKGROUNDS[c.manager.background]?.emoji} {MANAGER_BACKGROUNDS[c.manager.background]?.label}
                        {' · '}{CLUB_IDENTITIES[c.manager.style]?.emoji} {CLUB_IDENTITIES[c.manager.style]?.label}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.wins}W {c.careerStats.draws}D {c.careerStats.losses}L</div>
                      <div className="text-[9px] text-muted-foreground">Record</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.played > 0 ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%</div>
                      <div className="text-[9px] text-muted-foreground">Win rate</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.trophies.length}</div>
                      <div className="text-[9px] text-muted-foreground">Trophies</div>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    {c.careerStats.biggestWin && (
                      <p>🎉 Biggest win: <span className="text-foreground font-semibold">{c.careerStats.biggestWin.score}</span> vs {c.careerStats.biggestWin.opp}</p>
                    )}
                    {c.careerStats.biggestDefeat && (
                      <p>💀 Worst defeat: <span className="text-foreground font-semibold">{c.careerStats.biggestDefeat.score}</span> vs {c.careerStats.biggestDefeat.opp}</p>
                    )}
                    {c.careerStats.mostExpensiveBuy && (
                      <p>💸 Priciest buy: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveBuy.name}</span> ({money(c.careerStats.mostExpensiveBuy.fee)})</p>
                    )}
                    {c.careerStats.mostExpensiveSale && (
                      <p>🤑 Best sale: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveSale.name}</span> ({money(c.careerStats.mostExpensiveSale.fee)})</p>
                    )}
                    {(c.careerStats.clubsManaged?.length ?? 0) > 1 && (
                      <p>🧳 Clubs managed: <span className="text-foreground">{c.careerStats.clubsManaged!.join(', ')}</span></p>
                    )}
                    {c.careerStats.played === 0 && <p>Take charge of your first match and the numbers start here.</p>}
                  </div>
                </div>
                </>
              )}
            </div>
          )}
          </>
          )}
        </TabsContent>

        {/* -------- Squad -------- */}
        <TabsContent value="squad">
          <div className="space-y-3">
            <SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} />
            {/* Round 193: the contracts desk, built in Round 105 and never
               mounted until now, so renewals were unreachable for 88 rounds.
               Plain renewal or the cheaper clause deal, and every clause you
               have granted stays in view with its bargain warning. */}
            <ContractsCard career={c} onRenew={g.renew} onRenewWithClause={g.renewWithClause} />
          </div>
        </TabsContent>

        {/* -------- Tactics -------- */}
        <TabsContent value="tactics">
          <TacticsScreen
            career={c}
            onFormation={g.setFormationIndex}
            onMentality={g.setMentality}
            onSlot={g.setXiSlot}
            onSwap={g.swapXiSlots}
            onAutoPick={g.autoPick}
          />
        </TabsContent>

        {/* -------- Table -------- */}
        <TabsContent value="table">
          {/* Round 95: every league in the world, not just mine. */}
          <WorldTablesCard career={c} myRows={g.tableRows} onClubClick={setClubView} />
        </TabsContent>

        {/* -------- Transfers -------- */}
        <TabsContent value="transfers">
          <TransferScreen
            career={c}
            market={g.market}
            onNegotiate={g.negotiate}
            onOffer={g.offer}
            onWalk={g.walk}
            onDismissNegotiation={g.dismissNegotiation}
            onClause={g.clause}
            onLoan={g.loan}
            onAcceptBid={g.acceptIncomingBid}
            onRejectBid={g.rejectIncomingBid}
            onSetStatus={g.setStatus}
            onLoanOut={g.loanOut}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubManager;
